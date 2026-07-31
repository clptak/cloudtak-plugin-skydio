<template>
    <div class='skydio-popout d-flex flex-column'>
        <div
            class='d-flex align-items-center px-2 border-bottom flex-shrink-0'
            style='height: 50px;'
        >
            <img
                :src='skydioLogo'
                alt=''
                class='skydio-popout-logo flex-shrink-0'
                width='20'
                height='20'
            >
            <span class='ms-2 text-truncate'>Skydio</span>
        </div>
        <div class='flex-grow-1 min-height-0 overflow-hidden'>
            <SkydioPanel />
        </div>
    </div>
</template>

<script setup lang='ts'>
import SkydioPanel from '../SkydioPanel.vue';
import skydioLogo from '../skydio_logo.svg';
</script>

<style>
.skydio-popout {
    height: 100vh;
    background-color: var(--tblr-bg-surface, #182433);
    color: var(--tblr-body-color, #dce1e7);
}

.skydio-popout-logo {
    display: block;
    object-fit: contain;
}
</style>
