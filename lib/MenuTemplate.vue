<!-- Fork of CloudTAK MenuTemplate with optional #title / #header slots (logo + label). -->
<template>
    <TablerModal
        v-if='isModal'
        size='xl'
    >
        <div
            class='main-menu-modal-frame w-100 px-0 d-flex flex-column overflow-hidden'
        >
            <div class='modal-header d-flex align-items-center py-2 px-2 flex-shrink-0'>
                <TablerIconButton
                    v-if='backType === "back"'
                    title='Back'
                    @click='routerBack'
                >
                    <IconCircleArrowLeft
                        :size='28'
                        stroke='1'
                    />
                </TablerIconButton>

                <div
                    v-if='hasCustomTitle'
                    class='flex-grow-1 d-flex align-items-center gap-2 px-1'
                    style='min-width: 0'
                >
                    <slot
                        v-if='$slots.header'
                        name='header'
                        :is-modal='true'
                    />
                    <slot
                        v-else
                        name='title'
                        :is-modal='true'
                    />
                </div>
                <div
                    v-else
                    class='modal-title flex-grow-1 text-break px-1'
                    style='min-width: 0'
                    v-text='name'
                />

                <div class='btn-list align-items-center flex-nowrap'>
                    <slot name='buttons' />

                    <TablerIconButton
                        title='Close Menu'
                        @click='router.push("/")'
                    >
                        <IconCircleX
                            :size='28'
                            stroke='1'
                        />
                    </TablerIconButton>
                </div>
            </div>

            <div
                class='d-flex flex-column overflow-x-hidden flex-grow-1 px-2'
                :class='scroll ? "overflow-y-auto" : "overflow-hidden"'
                style='min-height: 0'
            >
                <TablerLoading
                    v-if='loading'
                    :desc='`Loading ${name}`'
                />
                <TablerNone
                    v-else-if='none'
                    :label='name'
                    :create='false'
                />
                <slot v-else />
                <div
                    v-if='scroll'
                    class='menu-scroll-spacer flex-shrink-0'
                />
            </div>

            <slot name='footer' />
        </div>
    </TablerModal>
    <div
        v-else
        class='w-100 px-0 d-flex flex-column overflow-hidden'
        :class='standalone ? "" : "flex-grow-1"'
        :style='standalone ? "height: calc(100vh - 64px - var(--map-bottom-bar-size, 0px)); max-height: 100%;" : "min-height: 0"'
    >
        <div
            class='col-12 cloudtak-bg flex-shrink-0'
            :style='`z-index: ${zindex};`'
            style='
                border-radius: 0px;
            '
            :class='{
                "border-bottom border-light": border
            }'
        >
            <div class='card-header d-flex align-items-center py-2 px-0 mx-2 flex-wrap row-gap-2'>
                <div
                    class='d-flex align-items-center flex-grow-1'
                    style='min-width: 0'
                >
                    <TablerIconButton
                        v-if='backType === "back"'
                        title='Back'
                        icon='IconCircleArrowLeft'
                        @click='routerBack'
                    >
                        <IconCircleArrowLeft
                            :size='32'
                            stroke='1'
                        />
                    </TablerIconButton>
                    <div v-else />

                    <div
                        v-if='hasCustomTitle'
                        class='flex-grow-1 d-flex align-items-center gap-2 px-2'
                        style='min-width: 0'
                    >
                        <slot
                            v-if='$slots.header'
                            name='header'
                            :is-modal='false'
                        />
                        <slot
                            v-else
                            name='title'
                            :is-modal='false'
                        />
                    </div>
                    <div
                        v-else
                        class='strong user-select-none text-break px-2'
                        v-text='name'
                    />
                </div>
                <div class='col-auto btn-list align-items-center'>
                    <slot name='buttons' />
                </div>
            </div>
        </div>

        <div
            class='d-flex flex-column overflow-x-hidden flex-grow-1 px-2'
            :class='scroll ? "overflow-y-auto" : "overflow-hidden"'
            :style='standalone ? "" : "min-height: 0"'
        >
            <TablerLoading
                v-if='loading'
                :desc='`Loading ${name}`'
            />
            <TablerNone
                v-else-if='none'
                :label='name'
                :create='false'
            />
            <slot v-else />
            <div
                v-if='scroll'
                class='menu-scroll-spacer flex-shrink-0'
            />
        </div>

        <slot name='footer' />
    </div>
</template>

<script setup lang='ts'>
import {
    TablerNone,
    TablerModal,
    TablerLoading,
    TablerIconButton,
} from '@tak-ps/vue-tabler';
import {
    IconCircleX,
    IconCircleArrowLeft,
} from '@tabler/icons-vue';
import { useRouter } from 'vue-router';
import { computed, useSlots } from 'vue';
import { useAppStore } from '@/stores/app.ts';

const router = useRouter();
const appStore = useAppStore();
const slots = useSlots();

const props = defineProps({
    name: {
        type: String,
        default: '',
    },
    zindex: {
        type: Number,
        default: 1020,
    },
    border: {
        type: Boolean,
        default: true,
    },
    back: {
        type: Boolean,
        default: true,
    },
    loading: {
        type: Boolean,
        default: false,
    },
    none: {
        type: Boolean,
        default: false,
    },
    standalone: {
        type: Boolean,
        default: true,
    },
    scroll: {
        type: Boolean,
        default: true,
    },
});

const hasCustomTitle = computed(() => Boolean(slots.header || slots.title));

function routerBack(): void {
    if (!router.options.history.state.back || String(router.options.history.state.back).startsWith('/login')) {
        router.push('/');
    } else {
        router.back();
    }
}

const backType = computed(() => {
    if (!props.back) return 'none';

    if (
        !router.options.history.state.back
        || router.options.history.state.back === '/'
    ) {
        return 'close';
    }
    return 'back';
});

const isModal = computed(() => props.standalone && appStore.isMobileDetected);
</script>

<style scoped>
.main-menu-modal-frame {
    height: calc(100dvh - 2rem);
    max-height: calc(100dvh - 2rem);
}

.menu-scroll-spacer {
    height: calc(env(safe-area-inset-bottom, 0px) + 32px);
}
</style>
