<template>
    <div
        ref='rootRef'
        class='label-info-popup position-relative d-inline-flex'
    >
        <button
            type='button'
            class='btn btn-link btn-sm p-0 text-muted lh-1 border-0'
            :aria-label='ariaLabel'
            @click.stop='open = !open'
        >
            <IconInfoCircle
                :size='16'
                stroke='1.5'
            />
        </button>
        <div
            v-if='open'
            class='position-absolute start-0 mt-1 p-2 bg-body border rounded shadow-sm small'
            style='z-index:1050; min-width:16rem; top:100%;'
            @click.stop
        >
            <slot />
        </div>
    </div>
</template>

<script setup lang="ts">
import { onMounted, onUnmounted, ref } from 'vue';
import { IconInfoCircle } from '@tabler/icons-vue';

defineProps<{
    ariaLabel: string;
}>();

const open = ref(false);
const rootRef = ref<HTMLElement | null>(null);

function onDocumentClick(event: MouseEvent): void {
    if (!open.value) return;
    const el = rootRef.value;
    if (el && !el.contains(event.target as Node)) {
        open.value = false;
    }
}

onMounted(() => {
    document.addEventListener('click', onDocumentClick);
});

onUnmounted(() => {
    document.removeEventListener('click', onDocumentClick);
});
</script>
