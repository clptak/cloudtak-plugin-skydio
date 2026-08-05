<template>
    <div>
        <TablerBorder
            v-if='sseConfigured'
            class='cloudtak-accent text-white mb-3'
            :fill-height='false'
            :shadow='false'
            gap='sm'
        >
            <template #label>
                <p class='text-uppercase text-white-50 small mb-0'>
                    Webhook SSE Connection
                </p>
            </template>

            <div class='d-flex align-items-center mb-3'>
                <span
                    class='status-dot me-2'
                    :class='sseDotClass'
                />
                <span v-if='sseStatus.connected'>SSE connected</span>
                <span v-else-if='sseStatus.reconnecting'>SSE reconnecting…</span>
                <span v-else>SSE disconnected</span>
                <template v-if='sseStatus.lastEvent'>
                    <span class='text-muted ms-1'>
                        — last event {{ formatTime(sseStatus.lastEvent) }}
                    </span>
                </template>
            </div>

            <TablerToggle
                v-model='local.flightStatusLogEnabled'
                label='Log flight start/end (FLIGHT_START / FLIGHT_END) to active mission'
                @update:model-value='saveAlertSettings'
            />
        </TablerBorder>

        <TablerBorder
            v-else
            class='cloudtak-accent text-white mb-3'
            :fill-height='false'
            :shadow='false'
            gap='sm'
        >
            <template #label>
                <p class='text-uppercase text-white-50 small mb-0'>
                    Polling Settings (fallback)
                </p>
            </template>

            <TablerInput
                v-model.number='intervalSeconds'
                label='Poll Interval (seconds)'
                type='number'
                description='Used when webhook SSE credentials are not configured.'
                @change='saveAlertSettings'
            />

            <TablerToggle
                v-model='local.pollingEnabled'
                class='mt-3'
                label='Enable polling-based alerts'
                @update:model-value='saveAlertSettings'
            />

            <div class='d-flex align-items-center mt-3'>
                <span
                    class='status-dot me-2'
                    :class='{ active: pollStatus.polling }'
                />
                <span v-if='pollStatus.polling'>
                    Polling active
                    <template v-if='pollStatus.lastPoll'>
                        — last poll {{ formatTime(pollStatus.lastPoll) }}
                    </template>
                </span>
                <span v-else>Polling stopped</span>
            </div>
        </TablerBorder>

        <TablerAlert
            v-if='error'
            :err='proxyError'
        />

        <TablerInlineAlert
            v-if='!sseConfigured && !apiKeyConfigured'
            class='mb-3'
            severity='warning'
            title='Alerts Not Configured'
            description='Configure webhook SSE credentials in Settings, or add a Skydio API key for polling fallback.'
        />

        <TablerInlineAlert
            v-else-if='sseConfigured && !apiKeyConfigured'
            class='mb-3'
            severity='warning'
            title='API Key Recommended'
            description='SSE alerts are configured. Add a Skydio API key in Settings to register webhooks below.'
        />

        <TablerInlineAlert
            v-else-if='!sseConfigured && apiKeyConfigured && !pollStatus.polling'
            class='mb-3'
            severity='warning'
            title='Polling Stopped'
            description='Configure webhook SSE credentials in Settings for real-time alerts, or enable polling above.'
        />

        <div
            v-if='alerts.length === 0 && (sseConfigured || apiKeyConfigured)'
            class='text-muted'
        >
            No alerts yet. Waiting for Skydio events…
        </div>

        <template v-else-if='alerts.length > 0'>
            <div
                v-for='alert in alerts'
                :key='alert.id'
                class='cloudtak-accent border rounded-3 text-white px-2 py-2 mb-2'
            >
                <div class='fw-bold text-capitalize'>
                    {{ formatType(alert.type) }}
                    <span class='small text-muted fw-normal'>({{ alert.source }})</span>
                </div>
                <div>{{ alert.message }}</div>
                <div class='small text-muted'>
                    {{ formatTime(alert.timestamp) }}
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import {
    TablerBorder,
    TablerInput,
    TablerAlert,
    TablerInlineAlert,
    TablerToggle,
} from '@tak-ps/vue-tabler';
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
