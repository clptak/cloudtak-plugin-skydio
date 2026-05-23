<template>
    <div class="skydio-tab">
        <h4>Skydio API Settings</h4>

        <label class="field">
            <span>API Key</span>
            <input
                v-model="local.apiKey"
                type="password"
                placeholder="Skydio Cloud API token"
                autocomplete="off"
            >
        </label>

        <button
            type="button"
            class="btn-primary"
            @click="save"
        >
            Submit
        </button>
    </div>
</template>

<script setup lang="ts">
import { reactive, watch } from 'vue';
import type { SkydioSettings } from '../types';

const props = defineProps<{
    settings: SkydioSettings;
}>();

const emit = defineEmits<{
    save: [settings: SkydioSettings];
}>();

const local = reactive<SkydioSettings>({ ...props.settings });

watch(
    () => props.settings,
    (next) => {
        Object.assign(local, next);
    },
    { deep: true },
);

function save(): void {
    emit('save', { ...local });
}
</script>

<style scoped>
.skydio-tab h4 {
    margin: 0 0 12px;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 12px;
}

.field input[type="password"] {
    padding: 6px 8px;
    border: 1px solid var(--tblr-border-color, #dee2e6);
    border-radius: 4px;
    background: var(--tblr-bg-surface, #fff);
    color: inherit;
}

.btn-primary {
    padding: 6px 16px;
    background: var(--tblr-primary, #206bc4);
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
}
</style>
