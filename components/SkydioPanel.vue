<template>
    <div class="skydio-panel">
        <nav class="skydio-tabs">
            <button
                v-for="tab in tabs"
                :key="tab.id"
                type="button"
                :class="{ active: activeTab === tab.id }"
                @click="activeTab = tab.id"
            >
                {{ tab.label }}
            </button>
        </nav>

        <GetFlightsTab
            v-if="activeTab === 'flights'"
            :api-key="settings.apiKey"
            :vehicles="vehicles"
        />
        <MissionPlanningTab v-else-if="activeTab === 'missions'" />
        <VehiclesTab
            v-else-if="activeTab === 'vehicles'"
            :api-key="settings.apiKey"
            :vehicles="vehicles"
            @update:vehicles="vehicles = $event"
        />
        <SettingsTab
            v-else-if="activeTab === 'settings'"
            :settings="settings"
            @save="onSaveSettings"
        />
        <AlertsTab
            v-else-if="activeTab === 'alerts'"
            :settings="settings"
            :alerts="alerts"
            :status="pollStatus"
            :error="pollError"
            :api-key-configured="Boolean(settings.apiKey)"
            @save="onSaveSettings"
        />
        <WebhooksTab
            v-else-if="activeTab === 'webhooks'"
            :api-key="settings.apiKey"
        />
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, onMounted, onUnmounted, watch } from 'vue';
import GetFlightsTab from './GetFlightsTab.vue';
import MissionPlanningTab from './MissionPlanningTab.vue';
import VehiclesTab from './VehiclesTab.vue';
import SettingsTab from './SettingsTab.vue';
import AlertsTab from './AlertsTab.vue';
import WebhooksTab from './WebhooksTab.vue';
import { loadSettings, saveSettings } from '../storage/settings';
import { AlertPoller } from '../alerts/polling';
import type { SkydioAlert, SkydioSettings, SkydioVehicle } from '../types';

const tabs = [
    { id: 'flights', label: 'Get Flights' },
    { id: 'missions', label: 'Mission Planning' },
    { id: 'vehicles', label: 'Vehicles' },
    { id: 'settings', label: 'Settings' },
    { id: 'alerts', label: 'Alerts' },
    { id: 'webhooks', label: 'Webhooks' },
] as const;

type TabId = typeof tabs[number]['id'];

const activeTab = ref<TabId>('flights');
const settings = reactive<SkydioSettings>(loadSettings());
const vehicles = ref<SkydioVehicle[]>([]);
const alerts = ref<SkydioAlert[]>([]);
const pollError = ref<string | null>(null);
const pollStatus = ref<{ lastPoll: string | null; polling: boolean }>({
    lastPoll: null,
    polling: false,
});

const poller = new AlertPoller({
    onAlert: (alert) => {
        alerts.value = [alert, ...alerts.value].slice(0, 100);
    },
    onError: (error) => {
        pollError.value = error;
    },
    onStatus: (status) => {
        pollStatus.value = status;
    },
});

function applyPolling(): void {
    poller.stop();
    pollError.value = null;

    if (settings.pollingEnabled && settings.apiKey) {
        poller.start(settings.apiKey, settings.pollIntervalMs);
    }
}

function onSaveSettings(next: SkydioSettings): void {
    Object.assign(settings, next);
    saveSettings(next);
    applyPolling();
}

onMounted(() => {
    applyPolling();
});

onUnmounted(() => {
    poller.stop();
});

watch(
    () => [settings.apiKey, settings.pollIntervalMs, settings.pollingEnabled],
    () => applyPolling(),
);
</script>

<style scoped>
.skydio-panel {
    padding: 12px;
    font-size: 14px;
    min-width: 360px;
    max-width: 640px;
}

.skydio-tabs {
    display: flex;
    flex-wrap: wrap;
    gap: 4px;
    margin-bottom: 12px;
    border-bottom: 1px solid var(--tblr-border-color, #dee2e6);
}

.skydio-tabs button {
    background: none;
    border: none;
    padding: 8px 10px;
    cursor: pointer;
    border-bottom: 2px solid transparent;
    color: inherit;
    font-size: 13px;
}

.skydio-tabs button.active {
    border-bottom-color: var(--tblr-primary, #206bc4);
    font-weight: 600;
}
</style>
