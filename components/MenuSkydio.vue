<template>
    <SkydioMenuTemplate name='Skydio'>
        <template #title>
            <div class='d-flex align-items-center gap-2 px-2'>
                <img
                    :src='skydioLogo'
                    alt=''
                    class='skydio-menu-logo flex-shrink-0'
                    width='28'
                    height='28'
                >
                <span class='strong user-select-none text-break'>Skydio</span>
            </div>
        </template>
        <SkydioPanel />
    </SkydioMenuTemplate>
</template>

<script setup lang="ts">
import SkydioMenuTemplate from './SkydioMenuTemplate.vue';
import SkydioPanel from './SkydioPanel.vue';
import skydioLogo from './skydio_logo.svg';
</script>

<style scoped>
.skydio-menu-logo {
    display: block;
    object-fit: contain;
}
</style>
