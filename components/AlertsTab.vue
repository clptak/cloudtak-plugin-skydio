<template>
    <div class="col-12 py-3">
        <div
            v-if="sseConfigured"
            class="card mb-3"
        >
            <div class="card-header">
                <div class="card-title">
                    Webhook SSE Connection
                </div>
            </div>
            <div class="card-body">
                <div class="d-flex align-items-center mb-3">
                    <span
                        class="status-dot me-2"
                        :class="sseDotClass"
                    />
                    <span v-if="sseStatus.connected">SSE connected</span>
                    <span v-else-if="sseStatus.reconnecting">SSE reconnecting…</span>
                    <span v-else>SSE disconnected</span>
                    <template v-if="sseStatus.lastEvent">
                        <span class="text-muted ms-1">
                            — last event {{ formatTime(sseStatus.lastEvent) }}
                        </span>
                    </template>
                </div>

                <label class="form-check">
                    <input
                        v-model="local.flightStatusLogEnabled"
                        class="form-check-input"
                        type="checkbox"
                        @change="saveAlertSettings"
                    >
                    <span class="form-check-label">Log FLIGHT_STATUS to active mission</span>
                </label>
            </div>
        </div>

        <div
            v-else
            class="card mb-3"
        >
            <div class="card-header">
                <div class="card-title">
                    Polling Settings (fallback)
                </div>
            </div>
            <div class="card-body">
                <TablerInput
                    v-model.number="intervalSeconds"
                    label="Poll interval (seconds)"
                    type="number"
                    description="Used when webhook SSE credentials are not configured."
                    @change="saveAlertSettings"
                />

                <label class="form-check mt-3">
                    <input
                        v-model="local.pollingEnabled"
                        class="form-check-input"
                        type="checkbox"
                        @change="saveAlertSettings"
                    >
                    <span class="form-check-label">Enable polling-based alerts</span>
                </label>

                <div class="d-flex align-items-center mt-3">
                    <span
                        class="status-dot me-2"
                        :class="{ active: pollStatus.polling }"
                    />
                    <span v-if="pollStatus.polling">
                        Polling active
                        <template v-if="pollStatus.lastPoll">
                            — last poll {{ formatTime(pollStatus.lastPoll) }}
                        </template>
                    </span>
                    <span v-else>Polling stopped</span>
                </div>
            </div>
        </div>

        <TablerAlert
            v-if="error"
            :err="proxyError"
        />

        <div
            v-if="!sseConfigured && !apiKeyConfigured"
            class="alert alert-warning"
        >
            Configure webhook SSE credentials in Settings, or add a Skydio API key for polling fallback.
        </div>

        <div
            v-else-if="sseConfigured && !apiKeyConfigured"
            class="alert alert-warning"
        >
            SSE alerts are configured. Add a Skydio API key in Settings to register webhooks in the Webhooks tab.
        </div>

        <div
            v-else-if="!sseConfigured && apiKeyConfigured && !pollStatus.polling"
            class="alert alert-warning"
        >
            Configure webhook SSE credentials in Settings for real-time alerts, or enable polling above.
        </div>

        <div
            v-if="alerts.length === 0 && (sseConfigured || apiKeyConfigured)"
            class="text-muted"
        >
            No alerts yet. Waiting for Skydio events…
        </div>

        <template v-else-if="alerts.length > 0">
            <div
                v-for="alert in alerts"
                :key="alert.id"
                class="border-bottom py-2"
            >
                <div class="fw-bold text-capitalize">
                    {{ formatType(alert.type) }}
                    <span class="small text-muted fw-normal">({{ alert.source }})</span>
                </div>
                <div>{{ alert.message }}</div>
                <div class="small text-muted">
                    {{ formatTime(alert.timestamp) }}
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { TablerInput, TablerAlert } from '@tak-ps/vue-tabler';
import type { SseStatus } from '../alerts/sse';
import type { SkydioAlert, SkydioSettings } from '../types';

const props = defineProps<{
    settings: SkydioSettings;
    alerts: SkydioAlert[];
    sseStatus: SseStatus;
    pollStatus: { lastPoll: string | null; polling: boolean };
    sseConfigured: boolean;
    error: string | null;
    apiKeyConfigured: boolean;
}>();

const emit = defineEmits<{
    save: [settings: SkydioSettings];
}>();

const local = reactive({
    pollingEnabled: props.settings.pollingEnabled,
    flightStatusLogEnabled: props.settings.flightStatusLogEnabled,
});
const intervalSeconds = ref(Math.round(props.settings.pollIntervalMs / 1000));

const proxyError = computed(() => (
    props.error ? new Error(props.error) : undefined
));

const sseDotClass = computed(() => ({
    active: props.sseStatus.connected,
    warning: !props.sseStatus.connected && props.sseStatus.reconnecting,
}));

watch(
    () => props.settings,
    (next) => {
        local.pollingEnabled = next.pollingEnabled;
        local.flightStatusLogEnabled = next.flightStatusLogEnabled;
        intervalSeconds.value = Math.round(next.pollIntervalMs / 1000);
    },
    { deep: true },
);

function saveAlertSettings(): void {
    emit('save', {
        ...props.settings,
        pollingEnabled: local.pollingEnabled,
        flightStatusLogEnabled: local.flightStatusLogEnabled,
        pollIntervalMs: Math.max(15, intervalSeconds.value) * 1000,
    });
}

function formatType(type: string): string {
    return type.replace(/_/g, ' ').toLowerCase();
}

function formatTime(iso: string): string {
    try {
        return new Date(iso).toLocaleString();
    } catch {
        return iso;
    }
}
</script>

<style scoped>
.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--tblr-secondary, #6c757d);
    display: inline-block;
}

.status-dot.active {
    background: var(--tblr-success, #2fb344);
}

.status-dot.warning {
    background: var(--tblr-warning, #f59f00);
}
</style>
