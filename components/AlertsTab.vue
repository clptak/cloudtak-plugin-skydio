<template>
    <div class="skydio-tab">
        <section class="polling-settings">
            <h4>Polling Settings</h4>

            <label class="field">
                <span>Poll interval (seconds)</span>
                <input
                    v-model.number="intervalSeconds"
                    type="number"
                    min="15"
                    max="300"
                    @change="savePolling"
                >
            </label>

            <label class="field checkbox">
                <input
                    v-model="local.pollingEnabled"
                    type="checkbox"
                    @change="savePolling"
                >
                <span>Enable polling-based alerts</span>
            </label>

            <p class="hint">
                Polling is the primary alert path for Docker Compose and AWS.
                Requires Plugin Proxy enabled with <code>https://api.skydio.com</code> whitelisted.
            </p>
        </section>

        <div class="status-bar">
            <span
                class="status-dot"
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

        <p
            v-if="error"
            class="error"
        >
            {{ error }}
        </p>

        <p
            v-if="!apiKeyConfigured"
            class="hint"
        >
            Configure your API key in Settings to start polling.
        </p>

        <p class="hint">
            Detects vehicle online/offline, flight start/end, telemetry available,
            and live stream changes by polling Skydio APIs. Replaces inbound webhooks
            for Docker Compose and AWS map clients.
        </p>

        <div
            v-if="alerts.length === 0 && apiKeyConfigured"
            class="empty"
        >
            No alerts yet. Waiting for state changes…
        </div>

        <ul
            v-else
            class="alert-list"
        >
            <li
                v-for="alert in alerts"
                :key="alert.id"
                class="alert-item"
            >
                <span class="alert-type">{{ formatType(alert.type) }}</span>
                <span class="alert-message">{{ alert.message }}</span>
                <span class="alert-time">{{ formatTime(alert.timestamp) }}</span>
            </li>
        </ul>
    </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
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
.polling-settings {
    margin-bottom: 16px;
    padding-bottom: 12px;
    border-bottom: 1px solid var(--tblr-border-color, #dee2e6);
}

.polling-settings h4 {
    margin: 0 0 12px;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 12px;
}

.field.checkbox {
    flex-direction: row;
    align-items: center;
    gap: 8px;
}

.field input[type="number"] {
    padding: 6px 8px;
    border: 1px solid var(--tblr-border-color, #dee2e6);
    border-radius: 4px;
    background: var(--tblr-bg-surface, #fff);
    color: inherit;
    max-width: 120px;
}

.status-bar {
    display: flex;
    align-items: center;
    gap: 8px;
    margin-bottom: 12px;
    font-size: 13px;
}

.status-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    background: var(--tblr-secondary, #6c757d);
}

.status-dot.active {
    background: var(--tblr-success, #2fb344);
}

.error {
    color: var(--tblr-danger, #d63939);
    font-size: 13px;
    margin: 0 0 8px;
}

.hint {
    font-size: 12px;
    color: var(--tblr-secondary, #6c757d);
    margin: 0 0 12px;
}

.empty {
    font-size: 13px;
    color: var(--tblr-secondary, #6c757d);
    padding: 16px 0;
}

.alert-list {
    list-style: none;
    margin: 0;
    padding: 0;
    max-height: 320px;
    overflow-y: auto;
}

.alert-item {
    display: grid;
    grid-template-columns: 1fr;
    gap: 2px;
    padding: 8px 0;
    border-bottom: 1px solid var(--tblr-border-color, #dee2e6);
    font-size: 13px;
}

.alert-type {
    font-weight: 600;
    text-transform: capitalize;
}

.alert-time {
    font-size: 11px;
    color: var(--tblr-secondary, #6c757d);
}
</style>
