<template>
    <FloatingPane
        :uid='uid'
        @close='emit("close")'
    >
        <template #header>
            <div
                class='mx-2 text-sm text-truncate d-flex align-items-center gap-2'
                style='max-width: calc(100% - 100px);'
            >
                <img
                    :src='skydioLogo'
                    alt=''
                    class='skydio-float-logo flex-shrink-0'
                    width='20'
                    height='20'
                >
                <span>Skydio</span>
            </div>
        </template>

        <template #actions>
            <PopoutPaneAction />
        </template>

        <div class='h-100 w-100 overflow-auto'>
            <SkydioPanel />
        </div>
    </FloatingPane>
</template>

<script setup lang='ts'>
import FloatingPane from '../../../src/components/CloudTAK/util/FloatingPane.vue';
import PopoutPaneAction from './PopoutPaneAction.vue';
import SkydioPanel from './SkydioPanel.vue';
import skydioLogo from './skydio_logo.svg';

defineProps({
    uid: {
        type: String,
        required: true,
    },
});

const emit = defineEmits(['close']);
</script>

<style scoped>
.skydio-float-logo {
    display: block;
    object-fit: contain;
}
</style>
