<template>
    <div class="skydio-tab">
        <p class="notice">
            Inbound Skydio webhooks cannot reach this browser plugin.
            Use this tab to register webhooks pointing at a public receiver
            (CloudTAK ETL layer on AWS or external middleware).
            <a
                href="https://support.skydio.com/hc/en-us/articles/19299707787035-How-to-configure-alerts-in-Skydio-Cloud"
                target="_blank"
                rel="noopener"
            >Configure Skydio Alerts</a>
        </p>

        <div
            v-if="!apiKey"
            class="hint"
        >
            Configure your API key in Settings first.
        </div>

        <template v-else>
            <section class="create-form">
                <h4>Create Webhook</h4>
                <label class="field">
                    <span>Name</span>
                    <input
                        v-model="form.name"
                        type="text"
                        maxlength="128"
                        placeholder="CloudTAK ETL"
                    >
                </label>
                <label class="field">
                    <span>URL</span>
                    <input
                        v-model="form.url"
                        type="url"
                        maxlength="512"
                        placeholder="https://webhooks.example.com/{layer-uuid}"
                    >
                </label>
                <button
                    type="button"
                    class="btn-primary"
                    :disabled="loading || !form.name || !form.url"
                    @click="create"
                >
                    Create
                </button>
            </section>

            <section class="webhook-list">
                <div class="list-header">
                    <h4>Registered Webhooks</h4>
                    <button
                        type="button"
                        class="btn-secondary"
                        :disabled="loading"
                        @click="refresh"
                    >
                        Refresh
                    </button>
                </div>

                <p
                    v-if="error"
                    class="error"
                >
                    {{ error }}
                </p>

                <table v-if="webhooks.length">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>URL</th>
                            <th>ID</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for="wh in webhooks"
                            :key="wh.id"
                        >
                            <td>{{ wh.name }}</td>
                            <td class="url">{{ wh.url }}</td>
                            <td class="id">{{ wh.id }}</td>
                        </tr>
                    </tbody>
                </table>

                <p
                    v-else-if="!loading"
                    class="empty"
                >
                    No webhooks registered.
                </p>
            </section>
        </template>
    </div>
</template>

<script setup lang="ts">
import { ref, reactive, watch, onMounted } from 'vue';
import { createWebhook, listWebhooks } from '../api/client';
import type { SkydioWebhook } from '../types';

const props = defineProps<{
    apiKey: string;
}>();

const webhooks = ref<SkydioWebhook[]>([]);
const loading = ref(false);
const error = ref<string | null>(null);
const form = reactive({ name: '', url: '' });

async function refresh(): Promise<void> {
    if (!props.apiKey) return;
    loading.value = true;
    error.value = null;
    try {
        webhooks.value = await listWebhooks(props.apiKey);
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to load webhooks';
    } finally {
        loading.value = false;
    }
}

async function create(): Promise<void> {
    if (!props.apiKey || !form.name || !form.url) return;
    loading.value = true;
    error.value = null;
    try {
        const created = await createWebhook(props.apiKey, form.name, form.url);
        webhooks.value = [created, ...webhooks.value.filter(w => w.id !== created.id)];
        form.name = '';
        form.url = '';
    } catch (err) {
        error.value = err instanceof Error ? err.message : 'Failed to create webhook';
    } finally {
        loading.value = false;
    }
}

watch(() => props.apiKey, () => void refresh());

onMounted(() => void refresh());
</script>

<style scoped>
.notice {
    font-size: 12px;
    background: var(--tblr-bg-surface-secondary, #f8f9fa);
    padding: 8px;
    border-radius: 4px;
    margin: 0 0 12px;
}

.create-form,
.webhook-list {
    margin-bottom: 16px;
}

.create-form h4,
.list-header h4 {
    margin: 0 0 8px;
    font-size: 14px;
}

.list-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 8px;
}

.field input {
    padding: 6px 8px;
    border: 1px solid var(--tblr-border-color, #dee2e6);
    border-radius: 4px;
    background: var(--tblr-bg-surface, #fff);
    color: inherit;
}

.btn-primary,
.btn-secondary {
    padding: 6px 12px;
    border-radius: 4px;
    cursor: pointer;
    border: 1px solid var(--tblr-border-color, #dee2e6);
    background: var(--tblr-bg-surface, #fff);
    color: inherit;
}

.btn-primary {
    background: var(--tblr-primary, #206bc4);
    color: #fff;
    border-color: transparent;
}

.btn-primary:disabled,
.btn-secondary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

table {
    width: 100%;
    border-collapse: collapse;
    font-size: 12px;
}

th, td {
    text-align: left;
    padding: 6px 4px;
    border-bottom: 1px solid var(--tblr-border-color, #dee2e6);
    vertical-align: top;
}

.url, .id {
    word-break: break-all;
    font-family: monospace;
    font-size: 11px;
}

.error {
    color: var(--tblr-danger, #d63939);
    font-size: 13px;
}

.hint, .empty {
    font-size: 13px;
    color: var(--tblr-secondary, #6c757d);
}
</style>
