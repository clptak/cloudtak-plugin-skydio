<template>
    <div class="col-12 py-3">
        <div class="card mb-3">
            <div class="card-header">
                <div class="card-title">
                    Polling Settings
                </div>
            </div>
            <div class="card-body">
                <TablerInput
                    v-model.number="intervalSeconds"
                    label="Poll interval (seconds)"
                    type="number"
                    :description="'Polling uses the Skydio API via Plugin Proxy. Requires https://api.skydio.com whitelisted.'"
                    @change="savePolling"
                />

                <label class="form-check mt-3">
                    <input
                        v-model="local.pollingEnabled"
                        class="form-check-input"
                        type="checkbox"
                        @change="savePolling"
                    >
                    <span class="form-check-label">Enable polling-based alerts</span>
                </label>
            </div>
        </div>

        <div class="d-flex align-items-center mb-3">
            <span
                class="status-dot me-2"
                :class="{ active: status.polling }"
            />
            <span v-if="status.polling">
                Polling active
                <template v-if="status.lastPoll">
                    — last poll {{ formatTime(status.lastPoll) }}
                </template>
            </span>
            <span v-else>Polling stopped</span>
        </div>

        <TablerAlert
            v-if="error"
            :err="proxyError"
        />

        <div
            v-if="!apiKeyConfigured"
            class="alert alert-warning"
        >
            Configure your API key in Settings to start polling.
        </div>

        <div
            v-if="alerts.length === 0 && apiKeyConfigured"
            class="text-muted"
        >
            No alerts yet. Waiting for state changes…
        </div>

        <template v-else-if="alerts.length > 0">
            <div
                v-for="alert in alerts"
                :key="alert.id"
                class="border-bottom py-2"
            >
                <div class="fw-bold text-capitalize">
                    {{ formatType(alert.type) }}
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
import type { SkydioAlert, SkydioSettings } from '../types';

const props = defineProps<{
    settings: SkydioSettings;
    alerts: SkydioAlert[];
    status: { lastPoll: string | null; polling: boolean };
    error: string | null;
    apiKeyConfigured: boolean;
}>();

const emit = defineEmits<{
    save: [settings: SkydioSettings];
}>();

const local = reactive({
    pollingEnabled: props.settings.pollingEnabled,
});
const intervalSeconds = ref(Math.round(props.settings.pollIntervalMs / 1000));

const proxyError = computed(() => (
    props.error ? new Error(props.error) : undefined
));

watch(
    () => props.settings,
    (next) => {
        local.pollingEnabled = next.pollingEnabled;
        intervalSeconds.value = Math.round(next.pollIntervalMs / 1000);
    },
    { deep: true },
);

function savePolling(): void {
    emit('save', {
        ...props.settings,
        pollingEnabled: local.pollingEnabled,
        pollIntervalMs: Math.max(15, intervalSeconds.value) * 1000,
    });
}

function formatType(type: string): string {
    return type.replace(/_/g, ' ');
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
</style>
