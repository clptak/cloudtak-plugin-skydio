<template>
    <div>
        <TablerBorder
            class='cloudtak-accent text-white mb-3'
            :fill-height='false'
            :shadow='false'
            gap='sm'
        >
            <template #label>
                <div
                    class='d-flex align-items-center justify-content-between w-100'
                    style='cursor: pointer;'
                    @click='vehiclesOpen = !vehiclesOpen'
                >
                    <p class='text-uppercase text-white-50 small mb-0'>
                        Vehicles
                    </p>
                    <div class='d-flex align-items-center gap-2'>
                        <button
                            type='button'
                            class='btn btn-sm btn-primary'
                            :disabled='vehiclesLoading || !settings.apiKey.trim()'
                            @click.stop='emit("refreshVehicles")'
                        >
                            Refresh Vehicles
                        </button>
                        <CollapseChevron :open='vehiclesOpen' />
                    </div>
                </div>
            </template>

            <VehiclesTab
                v-if='vehiclesOpen'
                :api-key='settings.apiKey'
                :vehicles='vehicles'
                :loading='vehiclesLoading'
                :cached='vehiclesCached'
                :error='vehiclesError'
            />
        </TablerBorder>

        <TablerBorder
            class='cloudtak-accent text-white mb-3'
            :fill-height='false'
            :shadow='false'
            gap='sm'
        >
            <template #label>
                <p class='text-uppercase text-white-50 small mb-0'>
                    Skydio API Settings
                </p>
            </template>

            <TablerInput
                v-model='local.apiKey'
                label='API Key'
                type='password'
                placeholder='Skydio Cloud API token'
                description='Used for vehicles, flights, telemetry, and webhook registration. Stored per CloudTAK user in this browser. Requires Plugin Proxy with the Skydio Cloud API (api.skydio.com) whitelisted.'
            />

            <div class='d-flex align-items-center mt-3'>
                <button
                    type='button'
                    class='btn btn-primary'
                    :disabled='!local.apiKey.trim()'
                    @click='saveApiKey'
                >
                    Save API Key
                </button>
            </div>
        </TablerBorder>

        <TablerBorder
            class='cloudtak-accent text-white mb-3'
            :fill-height='false'
            :shadow='false'
            gap='sm'
        >
            <template #label>
                <p class='text-uppercase text-white-50 small mb-0'>
                    Webhook SSE (Authentik)
                </p>
            </template>

            <p class='text-muted'>
                Connect to the webhook server SSE stream for real-time Skydio alerts.
                Use credentials from the Authentik <code>webhook-sse</code> OAuth2 application.
            </p>

            <TablerInput
                v-model='local.authentikTokenUrl'
                label='Authentik Token URL'
                placeholder='https://auth.example.com/application/o/token/'
                description='Must end with /application/o/token/ (trailing slash). Whitelist this host in Plugin Proxy.'
            />
            <TablerInput
                v-model='local.oauthClientId'
                class='mt-3'
                label='Client ID'
                placeholder='Authentik OAuth2 client ID'
            />
            <TablerInput
                v-model='local.oauthClientSecret'
                class='mt-3'
                label='Client Secret'
                type='password'
                placeholder='Authentik OAuth2 client secret'
                description='Leave blank to keep the saved secret. Re-enter and save after rotating credentials in Authentik.'
            />
            <TablerInput
                v-model='local.skydioSseUrl'
                class='mt-3'
                label='Skydio SSE URL'
                placeholder='https://webhook.example.com/events/skydio'
                description='Full URL of your webhook server SSE stream. Whitelist this host in Plugin Proxy and allow CORS from your CloudTAK origin.'
            />
            <TablerInput
                v-model='local.skydioTelemetryRelayUrl'
                class='mt-3'
                label='Skydio Telemetry Relay URL'
                placeholder='https://webhook.example.com/events/skydio'
                description='Optional. If empty, the plugin uses your Skydio SSE URL base (e.g. https://webhook.example.com/events/skydio). Your webhook server must expose GET {base}/telemetry/{flightId} with CORS for this CloudTAK origin.'
            />
            <TablerInput
                v-model='local.skydioWebhookUrl'
                class='mt-3'
                label='Skydio Webhook URL'
                placeholder='https://webhook.example.com/api/skydio'
                description='URL Skydio Cloud should POST alerts to (used when registering webhooks below). Whitelist this host in Plugin Proxy.'
            />

            <TablerToggle
                v-model='local.sseEnabled'
                class='mt-3'
                label='Enable webhook SSE alerts'
            />

            <div class='d-flex align-items-center gap-2 mt-3'>
                <button
                    type='button'
                    class='btn btn-primary'
                    :disabled='!canSaveSse'
                    @click='saveSse'
                >
                    Save Webhook SSE Settings
                </button>
                <button
                    type='button'
                    class='btn btn-secondary'
                    :disabled='!canTestSse || testing'
                    @click='testConnection'
                >
                    {{ testing ? 'Testing…' : 'Test Authentik Token' }}
                </button>
            </div>

            <TablerInlineAlert
                v-if='testResult'
                class='mt-3'
                :severity='testResult.ok ? "success" : "danger"'
                :title='testResult.ok ? "Token OK" : "Token Failed"'
                :description='testResult.message'
            />
        </TablerBorder>

        <TablerBorder
            class='cloudtak-accent text-white mb-3'
            :fill-height='false'
            :shadow='false'
            gap='sm'
        >
            <template #label>
                <div
                    class='d-flex align-items-center justify-content-between w-100'
                    style='cursor: pointer;'
                    @click='webhooksOpen = !webhooksOpen'
                >
                    <p class='text-uppercase text-white-50 small mb-0'>
                        Webhooks
                    </p>
                    <CollapseChevron :open='webhooksOpen' />
                </div>
            </template>

            <WebhooksTab
                v-if='webhooksOpen'
                :api-key='settings.apiKey'
                :settings='settings'
            />
        </TablerBorder>

        <TablerInlineAlert
            v-if='saved'
            class='mt-3'
            severity='success'
            title='Saved'
            description='Settings saved for this CloudTAK user in this browser.'
        />
    </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import {
    TablerBorder,
    TablerInput,
    TablerToggle,
    TablerInlineAlert,
} from '@tak-ps/vue-tabler';
import { fetchClientCredentialsToken } from '../api/authentik';
import { mergeSkydioSettings } from '../storage/settings';
import type { SkydioSettings, SkydioVehicle } from '../types';
import CollapseChevron from './CollapseChevron.vue';
import VehiclesTab from './VehiclesTab.vue';
import WebhooksTab from './WebhooksTab.vue';

const props = defineProps<{
    settings: SkydioSettings;
    vehicles: SkydioVehicle[];
    vehiclesLoading: boolean;
    vehiclesCached: boolean;
    vehiclesError?: Error;
}>();

const emit = defineEmits<{
    save: [settings: SkydioSettings];
    refreshVehicles: [];
}>();

const local = reactive<SkydioSettings>({ ...props.settings });
const saved = ref(false);
const testing = ref(false);
const testResult = ref<{ ok: boolean; message: string } | null>(null);
const vehiclesOpen = ref(false);
const webhooksOpen = ref(false);

function effectiveSecret(): string {
    return local.oauthClientSecret.trim() || props.settings.oauthClientSecret.trim();
}

const canSaveSse = computed(() => Boolean(
    local.authentikTokenUrl.trim()
    && local.oauthClientId.trim()
    && effectiveSecret()
    && local.skydioSseUrl.trim()
    && local.skydioWebhookUrl.trim(),
));

const canTestSse = computed(() => canSaveSse.value);

watch(
    () => props.settings,
    (next) => {
        Object.assign(local, next);
    },
    { deep: true },
);

function mergedLocal(): SkydioSettings {
    return mergeSkydioSettings(local, props.settings);
}

function saveApiKey(): void {
    emit('save', mergedLocal());
    saved.value = true;
    testResult.value = null;
}

function saveSse(): void {
    emit('save', mergedLocal());
    saved.value = true;
    testResult.value = null;
}

async function testConnection(): Promise<void> {
    testing.value = true;
    testResult.value = null;

    const merged = mergedLocal();
    emit('save', merged);

    try {
        const token = await fetchClientCredentialsToken({
            tokenUrl: merged.authentikTokenUrl,
            clientId: merged.oauthClientId,
            clientSecret: merged.oauthClientSecret,
        });
        testResult.value = {
            ok: true,
            message: `Authentik token OK (${token.token_type}, expires in ${token.expires_in}s).`,
        };
    } catch (err) {
        testResult.value = {
            ok: false,
            message: err instanceof Error ? err.message : 'Authentik token test failed',
        };
    } finally {
        testing.value = false;
    }
}
</script>
