<template>
    <div class='floating-pane-stub'>
        <slot name='header' />
        <slot name='actions' />
        <slot />
    </div>
</template>

<script setup lang='ts'>
defineProps({
    uid: {
        type: String,
        required: true,
    },
});

defineEmits(['close']);
</script>
