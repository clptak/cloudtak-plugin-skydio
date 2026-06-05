<template>
    <svg
        xmlns='http://www.w3.org/2000/svg'
        width='18'
        height='18'
        viewBox='0 0 24 24'
        fill='none'
        stroke='currentColor'
        stroke-width='2'
        stroke-linecap='round'
        stroke-linejoin='round'
        :style='{ transition: "transform 0.2s", transform: open ? "rotate(180deg)" : "rotate(0deg)" }'
    >
        <polyline points='6 9 12 15 18 9' />
    </svg>
</template>

<script setup lang="ts">
defineProps<{
    open: boolean;
}>();
</script>
