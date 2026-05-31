<template>
    <div class='col-12 py-3'>
        <TablerPillGroup
            v-model='activeTab'
            :options='tabs'
        />

        <GetFlightsTab
            v-if='activeTab === "flights"'
            :api-key='settings.apiKey'
            :vehicles='vehicles'
            :telemetry-relay-url='settings.skydioTelemetryRelayUrl'
            :skydio-sse-url='settings.skydioSseUrl'
        />
        <MissionPlanningTab v-else-if='activeTab === "missions"' />
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
import { std } from '../../../src/std.ts';
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
    { value: 'flights', label: 'Get Flights' },
    { value: 'missions', label: 'Mission Planning' },
    { value: 'vehicles', label: 'Vehicles' },
    { value: 'settings', label: 'Settings' },
    { value: 'alerts', label: 'Alerts' },
    { value: 'webhooks', label: 'Webhooks' },
];

const mapStore = useMapStore();
const activeTab = ref('flights');
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

    // #region agent log
    {
        const m = mapStore as unknown as {
            selected?: { values?: () => Iterable<unknown>; size?: number };
            radial?: { mode?: unknown; cot?: unknown };
            viewedFeature?: unknown;
            select?: { feats?: unknown[] };
        };
        const geomType = (value: unknown): string | null => {
            if (value && typeof value === 'object') {
                const cot = value as { as_feature?: () => { geometry?: { type?: string } } };
                if (typeof cot.as_feature === 'function') {
                    try { return cot.as_feature().geometry?.type ?? 'no-geometry'; } catch { return 'as_feature-threw'; }
                }
                const feat = value as { geometry?: { type?: string } };
                if (feat.geometry) return feat.geometry.type ?? 'no-type';
            }
            return value == null ? null : 'non-feature';
        };
        const selectedEntries = Array.from(m.selected?.values?.() ?? []);
        fetch('http://127.0.0.1:7476/ingest/03b14338-79f6-4e2b-aa33-ecb1824b3829', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'f269f9' },
            body: JSON.stringify({
                sessionId: 'f269f9',
                runId: 'run1',
                hypothesisId: 'B,D,E',
                location: 'SkydioPanel.vue:onMounted',
                message: 'map selection state @ panel-mounted',
                data: {
                    where: 'panel-mounted',
                    href: typeof window !== 'undefined' ? window.location.href : null,
                    selectedSize: m.selected?.size ?? null,
                    selectedTypes: selectedEntries.map((e) => geomType(e)),
                    radialMode: m.radial?.mode ?? null,
                    radialCotType: geomType(m.radial?.cot),
                    viewedFeatureType: geomType(m.viewedFeature),
                    selectFeatsLen: Array.isArray(m.select?.feats) ? m.select?.feats.length : null,
                },
                timestamp: Date.now(),
            }),
        }).catch(() => {});
    }
    // #endregion
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
