<template>
    <div class='col-12 py-3'>
        <div class='card mb-3'>
            <div class='card-body'>
                <p class='text-muted mb-0'>
                    Register Skydio webhooks to deliver alerts to the webhook server.
                    The plugin receives events in real time via SSE when OAuth credentials
                    are configured in Settings.
                </p>
            </div>
        </div>

        <div
            v-if='!apiKey'
            class='alert alert-warning'
        >
            Configure your API key in Settings first.
        </div>

        <template v-else>
            <div
                v-if='showCreatePrompt'
                class='alert alert-info'
            >
                No webhook points at {{ defaultWebhookUrl }}.
                <button
                    type='button'
                    class='btn btn-sm btn-primary ms-2'
                    :disabled='loading'
                    @click='createDefault'
                >
                    Create if missing
                </button>
            </div>

            <div class='card mb-3'>
                <div class='card-header'>
                    <div class='card-title'>
                        Create Webhook
                    </div>
                </div>
                <div class='card-body'>
                    <TablerInput
                        v-model='form.name'
                        label='Name'
                        placeholder='CloudTAK webhook'
                        description='Display name in Skydio Cloud (max 128 characters)'
                    />
                    <TablerInput
                        v-model='form.url'
                        class='mt-3'
                        label='URL'
                        placeholder='https://webhook.ccsosar.net/api/skydio'
                        description='Register this URL in Skydio so events reach the webhook server and SSE stream.'
                    />

                    <div class='d-flex align-items-center mt-3'>
                        <button
                            type='button'
                            class='btn btn-primary'
                            :disabled='loading || !canCreate'
                            @click='create'
                        >
                            Create Webhook
                        </button>
                    </div>
                </div>
            </div>

            <TablerLoading
                v-if='loading'
                :compact='true'
                desc='Contacting Skydio API…'
            />

            <TablerAlert
                v-if='error'
                class='mt-3'
                :err='error'
            />

            <div
                v-if='success'
                class='alert alert-success mt-3'
            >
                {{ success }}
            </div>

            <div class='card mt-3'>
                <div class='card-header'>
                    <div class='card-title'>
                        Registered Webhooks
                    </div>
                    <div class='card-actions'>
                        <button
                            type='button'
                            class='btn btn-sm btn-secondary'
                            :disabled='loading'
                            @click='refresh'
                        >
                            Refresh
                        </button>
                    </div>
                </div>
                <div class='card-body'>
                    <div
                        v-if='webhooks.length === 0 && !loading'
                        class='text-muted'
                    >
                        No webhooks registered.
                    </div>

                    <template v-else>
                        <div
                            v-for='wh in webhooks'
                            :key='wh.id'
                            class='border-bottom py-2'
                        >
                            <div class='fw-bold'>
                                {{ wh.name }}
                            </div>
                            <div class='small text-muted text-break'>
                                {{ wh.url }}
                            </div>
                            <div class='small font-monospace text-muted'>
                                {{ wh.id }}
                            </div>
                        </div>
                    </template>
                </div>
            </div>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, watch, onMounted } from 'vue';
import { TablerInput, TablerLoading, TablerAlert } from '@tak-ps/vue-tabler';
import { createWebhook, listWebhooks } from '../api/client';
import { ProxyError } from '../api/proxy';
import { DEFAULT_SKYDIO_WEBHOOK_URL } from '../types';
import type { SkydioWebhook } from '../types';

const props = defineProps<{
    apiKey: string;
}>();

const defaultWebhookUrl = DEFAULT_SKYDIO_WEBHOOK_URL;
const webhooks = ref<SkydioWebhook[]>([]);
const loaded = ref(false);
const loading = ref(false);
const error = ref<Error | undefined>();
const success = ref<string | null>(null);
const form = reactive({
    name: 'CloudTAK webhook',
    url: DEFAULT_SKYDIO_WEBHOOK_URL,
});

const canCreate = computed(() => Boolean(form.name.trim() && form.url.trim()));

const showCreatePrompt = computed(() => (
    loaded.value
    && !loading.value
    && !webhooks.value.some((wh) => wh.url === defaultWebhookUrl)
));

function toError(err: unknown, fallback: string): Error {
    if (err instanceof ProxyError || err instanceof Error) {
        return err;
    }
    return new Error(fallback);
}

async function refresh(): Promise<void> {
    if (!props.apiKey) return;

    loading.value = true;
    error.value = undefined;
    success.value = null;

    try {
        webhooks.value = await listWebhooks(props.apiKey);
    } catch (err) {
        error.value = toError(err, 'Failed to load webhooks');
    } finally {
        loading.value = false;
        loaded.value = true;
    }
}

async function create(): Promise<void> {
    if (!props.apiKey || !canCreate.value) return;

    loading.value = true;
    error.value = undefined;
    success.value = null;

    try {
        const created = await createWebhook(props.apiKey, form.name, form.url);
        webhooks.value = [created, ...webhooks.value.filter((w) => w.id !== created.id)];
        success.value = `${created.name} registered in Skydio Cloud.`;
    } catch (err) {
        error.value = toError(err, 'Failed to create webhook');
    } finally {
        loading.value = false;
    }
}

async function createDefault(): Promise<void> {
    form.name = 'CloudTAK webhook';
    form.url = defaultWebhookUrl;
    await create();
}

watch(() => props.apiKey, () => void refresh());

onMounted(() => void refresh());
</script>
