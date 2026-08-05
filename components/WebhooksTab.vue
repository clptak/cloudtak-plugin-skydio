<template>
    <div>
        <p class='text-muted mb-3'>
            Register Skydio webhooks to deliver alerts to the webhook server.
            The plugin receives events in real time via SSE when OAuth credentials
            are configured above.
        </p>

        <TablerInlineAlert
            v-if='!apiKey'
            severity='warning'
            title='API Key Required'
            description='Configure your API key in Settings first.'
        />

        <template v-else>
            <TablerInlineAlert
                v-if='!configuredWebhookUrl'
                class='mb-3'
                severity='warning'
                title='Webhook URL Required'
                description='Set Skydio Webhook URL in Settings before registering webhooks.'
            />

            <TablerInlineAlert
                v-else-if='showCreatePrompt'
                class='mb-3'
                severity='info'
                title='No Matching Webhook'
                :description='`No webhook points at ${configuredWebhookUrl}.`'
            />
            <div
                v-if='showCreatePrompt'
                class='mb-3'
            >
                <button
                    type='button'
                    class='btn btn-sm btn-primary'
                    :disabled='loading'
                    @click='createDefault'
                >
                    Create if missing
                </button>
            </div>

            <TablerBorder
                class='cloudtak-accent text-white mb-3'
                :fill-height='false'
                :shadow='false'
                gap='sm'
            >
                <template #label>
                    <p class='text-uppercase text-white-50 small mb-0'>
                        Create Webhook
                    </p>
                </template>

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
                    placeholder='https://webhook.example.com/api/skydio'
                    description='Register this URL in Skydio so events reach your webhook server and SSE stream.'
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
            </TablerBorder>

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

            <TablerInlineAlert
                v-if='success'
                class='mt-3'
                severity='success'
                title='Webhook Registered'
                :description='success'
            />

            <TablerBorder
                class='cloudtak-accent text-white mt-3'
                :fill-height='false'
                :shadow='false'
                gap='sm'
            >
                <template #label>
                    <div class='d-flex align-items-center justify-content-between w-100'>
                        <p class='text-uppercase text-white-50 small mb-0'>
                            Registered Webhooks
                        </p>
                        <button
                            type='button'
                            class='btn btn-sm btn-secondary'
                            :disabled='loading'
                            @click='refresh'
                        >
                            Refresh
                        </button>
                    </div>
                </template>

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
                        class='cloudtak-accent border rounded-3 text-white px-2 py-2 mb-2'
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
            </TablerBorder>
        </template>
    </div>
</template>

<script setup lang="ts">
import { computed, ref, reactive, watch, onMounted } from 'vue';
import {
    TablerBorder,
    TablerInput,
    TablerLoading,
    TablerAlert,
    TablerInlineAlert,
} from '@tak-ps/vue-tabler';
import { createWebhook, listWebhooks } from '../api/client';
import { ProxyError } from '../api/proxy';
import type { SkydioSettings, SkydioWebhook } from '../types';

const props = defineProps<{
    apiKey: string;
    settings: SkydioSettings;
}>();

const configuredWebhookUrl = computed(() => props.settings.skydioWebhookUrl.trim());
const webhooks = ref<SkydioWebhook[]>([]);
const loaded = ref(false);
const loading = ref(false);
const error = ref<Error | undefined>();
const success = ref<string | null>(null);
const form = reactive({
    name: 'CloudTAK webhook',
    url: '',
});

const canCreate = computed(() => Boolean(form.name.trim() && form.url.trim()));

const showCreatePrompt = computed(() => (
    Boolean(configuredWebhookUrl.value)
    && loaded.value
    && !loading.value
    && !webhooks.value.some((wh) => wh.url === configuredWebhookUrl.value)
));

function syncFormFromSettings(): void {
    const url = configuredWebhookUrl.value;
    if (url) form.url = url;
}

watch(() => props.settings.skydioWebhookUrl, syncFormFromSettings, { immediate: true });

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
    if (!configuredWebhookUrl.value) return;
    form.name = 'CloudTAK webhook';
    form.url = configuredWebhookUrl.value;
    await create();
}

watch(() => props.apiKey, () => void refresh());

onMounted(() => void refresh());
</script>
