<template>
    <div class="col-12 py-3">
        <div class="card mb-3">
            <div class="card-header">
                <div class="card-title">
                    Skydio API Settings
                </div>
            </div>
            <div class="card-body">
                <TablerInput
                    v-model="local.apiKey"
                    label="API Key"
                    type="password"
                    placeholder="Skydio Cloud API token"
                    description="Used for vehicles, flights, telemetry, and webhook registration. Stored per CloudTAK user in this browser. Requires Plugin Proxy with https://api.skydio.com whitelisted."
                />

                <div class="d-flex align-items-center mt-3">
                    <button
                        type="button"
                        class="btn btn-primary"
                        :disabled="!local.apiKey.trim()"
                        @click="saveApiKey"
                    >
                        Save API Key
                    </button>
                </div>
            </div>
        </div>

        <div class="card">
            <div class="card-header">
                <div class="card-title">
                    Webhook SSE (Authentik)
                </div>
            </div>
            <div class="card-body">
                <p class="text-muted">
                    Connect to the webhook server SSE stream for real-time Skydio alerts.
                    Use credentials from the Authentik <code>webhook-sse</code> OAuth2 application.
                </p>

                <TablerInput
                    v-model="local.authentikTokenUrl"
                    label="Authentik Token URL"
                    placeholder="https://users.ccsosar.net/application/o/token/"
                    description="OAuth2 token endpoint for client_credentials grant."
                />
                <TablerInput
                    v-model="local.oauthClientId"
                    class="mt-3"
                    label="Client ID"
                    placeholder="Authentik OAuth2 client ID"
                />
                <TablerInput
                    v-model="local.oauthClientSecret"
                    class="mt-3"
                    label="Client Secret"
                    type="password"
                    placeholder="Authentik OAuth2 client secret"
                />
                <TablerInput
                    v-model="local.skydioSseUrl"
                    class="mt-3"
                    label="Skydio SSE URL"
                    placeholder="https://webhook.ccsosar.net/events/skydio"
                    description="Requires Plugin Proxy whitelist for https://webhook.ccsosar.net and CORS on the webhook server."
                />

                <label class="form-check mt-3">
                    <input
                        v-model="local.sseEnabled"
                        class="form-check-input"
                        type="checkbox"
                    >
                    <span class="form-check-label">Enable webhook SSE alerts</span>
                </label>

                <div class="d-flex align-items-center mt-3">
                    <button
                        type="button"
                        class="btn btn-primary"
                        :disabled="!canSaveSse"
                        @click="saveSse"
                    >
                        Save Webhook SSE Settings
                    </button>
                </div>
            </div>
        </div>

        <div
            v-if="saved"
            class="alert alert-success mt-3"
        >
            Settings saved for this CloudTAK user in this browser.
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue';
import { TablerInput } from '@tak-ps/vue-tabler';
import type { SkydioSettings } from '../types';

const props = defineProps<{
    settings: SkydioSettings;
}>();

const emit = defineEmits<{
    save: [settings: SkydioSettings];
}>();

const local = reactive<SkydioSettings>({ ...props.settings });
const saved = ref(false);

const canSaveSse = computed(() => Boolean(
    local.authentikTokenUrl.trim()
    && local.oauthClientId.trim()
    && local.oauthClientSecret.trim()
    && local.skydioSseUrl.trim(),
));

watch(
    () => props.settings,
    (next) => {
        Object.assign(local, next);
    },
    { deep: true },
);

function saveApiKey(): void {
    emit('save', {
        ...local,
        apiKey: local.apiKey.trim(),
    });
    saved.value = true;
}

function saveSse(): void {
    emit('save', {
        ...local,
        authentikTokenUrl: local.authentikTokenUrl.trim(),
        oauthClientId: local.oauthClientId.trim(),
        oauthClientSecret: local.oauthClientSecret.trim(),
        skydioSseUrl: local.skydioSseUrl.trim(),
    });
    saved.value = true;
}
</script>
