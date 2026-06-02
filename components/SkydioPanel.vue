<template>
    <div class='col-12 py-3'>
        <TablerPillGroup
            v-model='activeTab'
            :options='tabs'
        />

        <PreFlightTab
            v-if='activeTab === "preflight"'
            :active-feature='activeMapFeature'
            :mission-guid='mapStore.mission?.meta.guid'
            :mission-token='mapStore.mission?.token'
        />
        <GetFlightsTab
            v-else-if='activeTab === "flights"'
            :api-key='settings.apiKey'
            :vehicles='vehicles'
            :telemetry-relay-url='settings.skydioTelemetryRelayUrl'
            :skydio-sse-url='settings.skydioSseUrl'
        />
        <MissionPlanningTab
            v-else-if='activeTab === "missions"'
            :active-feature='activeMapFeature'
            :api-key='settings.apiKey'
        />
        <VehiclesTab
            v-else-if='activeTab === "vehicles"'
            :api-key='settings.apiKey'
            :vehicles='vehicles'
            :loading='vehiclesLoading'
            :cached='vehiclesCached'
            :error='vehiclesError'
            @refresh='refreshVehicles'
        />
        <SettingsTab
            v-else-if='activeTab === "settings"'
            :settings='settings'
            @save='onSaveSettings'
        />
        <AlertsTab
            v-else-if='activeTab === "alerts"'
            :settings='settings'
            :alerts='alerts'
            :sse-status='sseStatus'
            :poll-status='pollStatus'
            :sse-configured='sseConfigured'
            :error='alertsError'
            :api-key-configured='Boolean(settings.apiKey)'
            @save='onSaveSettings'
        />
        <WebhooksTab
            v-else-if='activeTab === "webhooks"'
            :api-key='settings.apiKey'
            :settings='settings'
        />
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch } from 'vue';
import { TablerPillGroup } from '@tak-ps/vue-tabler';
import { useMapStore } from '../../../src/stores/map.ts';
import type { Feature } from '../../../src/types.ts';
import { std } from '../../../src/std.ts';
import PreFlightTab from './PreFlightTab.vue';
import GetFlightsTab from './GetFlightsTab.vue';
import MissionPlanningTab from './MissionPlanningTab.vue';
import VehiclesTab from './VehiclesTab.vue';
import SettingsTab from './SettingsTab.vue';
import AlertsTab from './AlertsTab.vue';
import WebhooksTab from './WebhooksTab.vue';
import { listVehicles } from '../api/client';
import { ProxyError } from '../api/proxy';
import { loadSettings, saveSettings, mergeSkydioSettings } from '../storage/settings';
import { loadVehicles, saveVehicles } from '../storage/vehicles';
import { getCurrentUserId } from '../storage/user';
import { AlertPoller } from '../alerts/polling';
import { SkydioSseClient, type SseStatus } from '../alerts/sse';
import { hasSseConfig, type SkydioAlert, type SkydioSettings, type SkydioVehicle, type SkydioWebhookAlert } from '../types';

async function logFlightStatusToMission(
    alert: SkydioWebhookAlert,
    message: string,
    missionGuid: string,
): Promise<void> {
    await std(`/api/marti/missions/${encodeURIComponent(missionGuid)}/log`, {
        method: 'POST',
        body: {
            content: `Skydio: ${message}`,
            dtg: alert.alert_time,
            keywords: ['skydio', alert.resource_type?.toLowerCase() || 'flight_status'],
        },
    });
}

const tabs = [
    { value: 'preflight', label: 'Pre-Flight' },
    { value: 'flights', label: 'Get Flights' },
    { value: 'missions', label: 'Mission Planning' },
    { value: 'vehicles', label: 'Vehicles' },
    { value: 'settings', label: 'Settings' },
    { value: 'alerts', label: 'Alerts' },
    { value: 'webhooks', label: 'Webhooks' },
];

const mapStore = useMapStore();
const activeTab = ref('preflight');

/**
 * The feature the user most recently interacted with on the map. A normal
 * single click opens the radial menu (mapStore.radial.cot); Ctrl+Click adds to
 * mapStore.selected; "View" sets mapStore.viewedFeature; and an ambiguous click
 * fills mapStore.select.feats. We capture the first usable feature from any of
 * these and keep the last one so it survives the radial menu closing.
 */
const activeMapFeature = ref<Feature | null>(null);

interface MapSelectionState {
    radial?: { mode?: string; cot?: unknown };
    viewedFeature?: unknown;
    select?: { feats?: unknown[] };
    selected: Map<string, unknown>;
}

function toMapFeature(value: unknown): Feature | null {
    if (value && typeof value === 'object') {
        const cot = value as { as_feature?: (opts?: { clone?: boolean }) => Feature };
        if (typeof cot.as_feature === 'function') {
            try {
                return cot.as_feature();
            } catch {
                return null;
            }
        }
        const feat = value as Feature;
        if (feat.geometry) return feat;
    }
    return null;
}

function captureActiveFeature(): void {
    const state = mapStore as unknown as MapSelectionState;

    const candidates: unknown[] = [];
    if (state.radial?.mode === 'cot' && state.radial.cot) candidates.push(state.radial.cot);
    if (state.selected.size >= 1) candidates.push(...state.selected.values());
    if (state.viewedFeature) candidates.push(state.viewedFeature);
    if (Array.isArray(state.select?.feats)) candidates.push(...state.select.feats);

    for (const candidate of candidates) {
        const feature = toMapFeature(candidate);
        if (feature && feature.geometry) {
            activeMapFeature.value = feature;
            return;
        }
    }
}

watch(
    () => {
        const state = mapStore as unknown as MapSelectionState;
        return [
            state.radial?.mode,
            state.radial?.cot,
            state.viewedFeature,
            mapStore.selected.size,
            state.select?.feats,
        ];
    },
    () => captureActiveFeature(),
);
const currentUserId = ref(getCurrentUserId());
const settings = reactive<SkydioSettings>(loadSettings());
const vehicles = ref<SkydioVehicle[]>(loadVehicles());
const vehiclesLoading = ref(false);
const vehiclesCached = ref(vehicles.value.length > 0);
const vehiclesError = ref<Error | undefined>();
const alerts = ref<SkydioAlert[]>([]);
const alertsError = ref<string | null>(null);
const pollStatus = ref<{ lastPoll: string | null; polling: boolean }>({
    lastPoll: null,
    polling: false,
});
const sseStatus = ref<SseStatus>({
    connected: false,
    reconnecting: false,
    lastEvent: null,
});

const sseConfigured = computed(() => hasSseConfig(settings) && settings.sseEnabled);

function pushAlert(alert: SkydioAlert): void {
    alerts.value = [alert, ...alerts.value].slice(0, 100);
}

const poller = new AlertPoller({
    onAlert: pushAlert,
    onError: (error) => {
        alertsError.value = error;
    },
    onStatus: (status) => {
        pollStatus.value = status;
    },
});

const sseClient = new SkydioSseClient({
    onAlert: pushAlert,
    onError: (error) => {
        alertsError.value = error;
    },
    onStatus: (status) => {
        sseStatus.value = status;
    },
    getMissionGuid: () => mapStore.mission?.meta.guid,
    onFlightStatusLog: logFlightStatusToMission,
});

function applyAlerts(): void {
    sseClient.stop();
    poller.stop();
    alertsError.value = null;

    if (sseConfigured.value) {
        sseClient.start(settings);
    } else if (settings.apiKey && settings.pollingEnabled) {
        poller.start(settings.apiKey, settings.pollIntervalMs);
    }
}

function setVehicles(next: SkydioVehicle[]): void {
    vehicles.value = next;
    saveVehicles(next);
    vehiclesCached.value = next.length > 0;
}

async function refreshVehicles(): Promise<void> {
    if (!settings.apiKey || vehiclesLoading.value) return;

    vehiclesLoading.value = true;
    vehiclesError.value = undefined;

    try {
        setVehicles(await listVehicles(settings.apiKey));
    } catch (err) {
        vehiclesError.value = err instanceof ProxyError || err instanceof Error
            ? err
            : new Error('Failed to load vehicles');
    } finally {
        vehiclesLoading.value = false;
    }
}

function onSaveSettings(next: SkydioSettings): void {
    const normalized = mergeSkydioSettings(next, settings);
    Object.assign(settings, normalized);
    saveSettings(normalized);
    applyAlerts();
    void refreshVehicles();
}

function reloadForUser(): void {
    const userId = getCurrentUserId();
    if (userId === currentUserId.value) return;

    currentUserId.value = userId;
    Object.assign(settings, loadSettings());
    vehicles.value = loadVehicles();
    vehiclesCached.value = vehicles.value.length > 0;
    vehiclesError.value = undefined;
    alerts.value = [];
    alertsError.value = null;
    applyAlerts();
    void refreshVehicles();
}

let userCheckTimer: ReturnType<typeof setInterval> | undefined;

onMounted(() => {
    reloadForUser();
    applyAlerts();
    void refreshVehicles();
    window.addEventListener('focus', reloadForUser);
    window.addEventListener('storage', reloadForUser);
    userCheckTimer = setInterval(reloadForUser, 3000);
    captureActiveFeature();
});

onUnmounted(() => {
    sseClient.stop();
    poller.stop();
    window.removeEventListener('focus', reloadForUser);
    window.removeEventListener('storage', reloadForUser);
    if (userCheckTimer) clearInterval(userCheckTimer);
});

watch(
    () => [
        settings.apiKey,
        settings.pollIntervalMs,
        settings.pollingEnabled,
        settings.oauthClientId,
        settings.oauthClientSecret,
        settings.authentikTokenUrl,
        settings.skydioSseUrl,
        settings.skydioWebhookUrl,
        settings.sseEnabled,
        settings.flightStatusLogEnabled,
    ],
    () => applyAlerts(),
);
</script>
