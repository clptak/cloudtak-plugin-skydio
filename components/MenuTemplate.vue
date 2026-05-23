<template>
    <div
        class="skydio-menu-template"
        :style="{ zIndex: zindex }"
    >
        <div
            v-if="back"
            class="skydio-menu-header"
        >
            <button
                type="button"
                class="skydio-menu-back"
                @click="routerBack"
            >
                {{ backType === 'close' ? 'Close' : 'Back' }}
            </button>
            <span class="skydio-menu-title">{{ name }}</span>
        </div>

        <div class="skydio-menu-body">
            <slot />
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { useRouter } from 'vue-router';

const props = defineProps<{
    name: string;
    zindex?: number;
    back?: boolean;
}>();

const router = useRouter();

const backType = computed(() => {
    if (!props.back) return 'none';

    if (!router.options.history.state.back || router.options.history.state.back === '/') {
        return 'close';
    }

    return 'back';
});

function routerBack(): void {
    if (!router.options.history.state.back || String(router.options.history.state.back).startsWith('/login')) {
        router.push('/');
    } else {
        router.back();
    }
}
</script>

<style scoped>
.skydio-menu-template {
    display: flex;
    flex-direction: column;
    height: 100%;
    min-height: 0;
}

.skydio-menu-header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 12px;
    border-bottom: 1px solid var(--tblr-border-color, #dee2e6);
}

.skydio-menu-back {
    background: none;
    border: none;
    cursor: pointer;
    color: inherit;
    padding: 4px 8px;
}

.skydio-menu-title {
    font-weight: 600;
}

.skydio-menu-body {
    flex: 1;
    min-height: 0;
    overflow: auto;
}
</style>
