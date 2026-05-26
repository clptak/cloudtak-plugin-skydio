<template>
    <div class='col-12 py-3'>
        <div class='card mb-3'>
            <div class='card-header'>
                <div class='card-title'>
                    Skydio API Settings
                </div>
            </div>
            <div class='card-body'>
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
            </div>
        </div>

        <div class='card'>
            <div class='card-header'>
                <div class='card-title'>
                    Webhook SSE (Authentik)
                </div>
            </div>
            <div class='card-body'>
                <p class='text-muted'>
                    Connect to the webhook server SSE stream for real-time Skydio alerts.
                    Use credentials from the Authentik <code>webhook-sse</code> OAuth2 application.
                </p>

                <TablerInput
                    v-model='local.authentikTokenUrl'
                    label='Authentik Token URL'
                    placeholder='https://auth.example.com/application/o/token/'
                    description='OAuth2 token endpoint for client_credentials grant. Whitelist this host in Plugin Proxy.'
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
                    v-model='local.skydioWebhookUrl'
                    class='mt-3'
                    label='Skydio Webhook URL'
                    placeholder='https://webhook.example.com/api/skydio'
                    description='URL Skydio Cloud should POST alerts to (used on the Webhooks tab). Whitelist this host in Plugin Proxy.'
                />

                <label class='form-check mt-3'>
                    <input
                        v-model='local.sseEnabled'
                        class='form-check-input'
                        type='checkbox'
                    >
                    <span class='form-check-label'>Enable webhook SSE alerts</span>
                </label>

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

                <div
                    v-if='testResult'
                    class='alert mt-3'
                    :class='testResult.ok ? "alert-success" : "alert-danger"'
                >
                    {{ testResult.message }}
                </div>
            </div>
        </div>

        <div
            v-if='saved'
            class='alert alert-success mt-3'
        >
            Settings saved for this CloudTAK user in this browser.
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { TablerInput } from '@tak-ps/vue-tabler';
import { fetchClientCredentialsToken } from '../api/authentik';
import { mergeSkydioSettings } from '../storage/settings';
import type { SkydioSettings } from '../types';

const props = defineProps<{
    settings: SkydioSettings;
}>();

const emit = defineEmits<{
    save: [settings: SkydioSettings];
}>();

const local = reactive<SkydioSettings>({ ...props.settings });
const saved = ref(false);
const testing = ref(false);
const testResult = ref<{ ok: boolean; message: string } | null>(null);

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
