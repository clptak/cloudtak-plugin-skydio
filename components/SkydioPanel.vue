<template>
    <div class='skydio-pane px-3 py-3'>
        <TablerPillGroup
            v-model='activeTab'
            :options='tabOptions'
            name='skydio-tabs'
        >
            <template #option='{ option }'>
                <span :title='option.label'>
                    <img
                        v-if='tabImages[option.value]'
                        :src='tabImages[option.value]'
                        alt=''
                        class='skydio-tab-logo'
                    >
                    <component
                        :is='tabIcons[option.value]'
                        v-else
                        :size='32'
                        stroke='1'
                    />
                </span>
            </template>
        </TablerPillGroup>

        <SettingsTab
            v-if='activeTab === "settings"'
            class='mt-2'
            :settings='settings'
            :vehicles='vehicles'
            :vehicles-loading='vehiclesLoading'
            :vehicles-cached='vehiclesCached'
            :vehicles-error='vehiclesError'
            @save='onSaveSettings'
            @refresh-vehicles='refreshVehicles'
        />
        <PreFlightTab
            v-else-if='activeTab === "preflight"'
            class='mt-2'
            :mission-guid='mapStore.mission?.meta.guid'
            :mission-token='mapStore.mission?.missiontoken'
        />
        <GetFlightsTab
            v-else-if='activeTab === "flights"'
            class='mt-2'
            :api-key='settings.apiKey'
            :vehicles='vehicles'
            :telemetry-relay-url='settings.skydioTelemetryRelayUrl'
            :skydio-sse-url='settings.skydioSseUrl'
        />
        <AlertsTab
            v-else-if='activeTab === "alerts"'
            class='mt-2'
            :settings='settings'
            :alerts='alerts'
            :sse-status='sseStatus'
            :poll-status='pollStatus'
            :sse-configured='sseConfigured'
            :error='alertsError'
            :api-key-configured='Boolean(settings.apiKey)'
            @save='onSaveSettings'
        />
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted, onUnmounted, watch, type Component } from 'vue';
import {
    IconChecklist,
    IconMessageExclamation,
    IconSettings,
} from '@tabler/icons-vue';
import { TablerPillGroup } from '@tak-ps/vue-tabler';
import skydioLogo from './skydio_logo.svg';
import type { Map as MapLibreMap } from 'maplibre-gl';
import { useMapStore } from '../../../src/stores/map.ts';
import { setPluginMapResolver } from '../lib/plugin-map.ts';
import { std } from '../../../src/std.ts';
import PreFlightTab from './PreFlightTab.vue';
import GetFlightsTab from './GetFlightsTab.vue';
import SettingsTab from './SettingsTab.vue';
import AlertsTab from './AlertsTab.vue';
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

const tabOptions = [
    { value: 'preflight', label: 'Pre-Flight' },
    { value: 'flights', label: 'Skydio Cloud' },
    { value: 'alerts', label: 'Skydio Alerts' },
    { value: 'settings', label: 'Settings' },
];

const tabIcons: Record<string, Component> = {
    preflight: IconChecklist,
    alerts: IconMessageExclamation,
    settings: IconSettings,
};

const tabImages: Record<string, string> = {
    flights: skydioLogo,
};

const mapStore = useMapStore();
const activeTab = ref('preflight');
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
    setPluginMapResolver(() => {
        try {
            return (useMapStore() as unknown as { map: MapLibreMap }).map;
        } catch {
            return null;
        }
    });
    reloadForUser();
    applyAlerts();
    void refreshVehicles();
    window.addEventListener('focus', reloadForUser);
    window.addEventListener('storage', reloadForUser);
    userCheckTimer = setInterval(reloadForUser, 3000);
});

onUnmounted(() => {
    setPluginMapResolver(null);
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

<style scoped>
.skydio-pane {
    /* Match Mission Info insets; Tabler form surfaces are primary-tinted */
    --tabler-input-bg: var(--cloudtak-inset-bg);
    --tblr-bg-forms: var(--cloudtak-inset-bg);
}

.skydio-pane :deep(.cloudtak-bg),
.skydio-pane :deep(.card) {
    background-color: var(--cloudtak-inset-bg) !important;
    border-color: var(--cloudtak-inset-border);
}

.skydio-pane :deep(.card-header) {
    background-color: transparent !important;
}

.skydio-tab-logo {
    display: block;
    width: 32px;
    height: 32px;
    object-fit: contain;
}
</style>
