<template>
    <div class="col-12 py-3">
        <div class="card">
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
                    description="Used for vehicles, flights, telemetry, webhooks, and polling. Stored per CloudTAK user in this browser. Requires Plugin Proxy with https://api.skydio.com whitelisted."
                />

                <div class="d-flex align-items-center mt-3">
                    <button
                        type="button"
                        class="btn btn-primary"
                        :disabled="!local.apiKey.trim()"
                        @click="save"
                    >
                        Submit
                    </button>
                </div>
            </div>
        </div>

        <div
            v-if="saved"
            class="alert alert-success mt-3"
        >
            Settings saved. Your Skydio API key is stored for this CloudTAK user in this browser.
        </div>
    </div>
</template>

<script setup lang="ts">
import { reactive, ref, watch } from 'vue';
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

watch(
    () => props.settings,
    (next) => {
        Object.assign(local, next);
    },
    { deep: true },
);

function save(): void {
    emit('save', {
        ...local,
        apiKey: local.apiKey.trim(),
    });
    saved.value = true;
}
</script>
