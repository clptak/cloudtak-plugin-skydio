<template>
    <div class="col-12 py-3">
        <TablerPillGroup
            v-model="activeTab"
            :options="tabs"
        />

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
import { TablerPillGroup } from '@tak-ps/vue-tabler';
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
    { value: 'flights', label: 'Get Flights' },
    { value: 'missions', label: 'Mission Planning' },
    { value: 'vehicles', label: 'Vehicles' },
    { value: 'settings', label: 'Settings' },
    { value: 'alerts', label: 'Alerts' },
    { value: 'webhooks', label: 'Webhooks' },
];

const activeTab = ref('flights');
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
    const normalized = {
        ...next,
        apiKey: next.apiKey.trim(),
    };
    Object.assign(settings, normalized);
    saveSettings(normalized);
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
