declare module '*.vue' {
    import type { DefineComponent } from 'vue';
    const component: DefineComponent<object, object, unknown>;
    export default component;
}

declare module '@/components/CloudTAK/util/MenuTemplate.vue' {
    import type { DefineComponent } from 'vue';
    const component: DefineComponent<object, object, unknown>;
    export default component;
}

declare module '@tak-ps/vue-tabler' {
    import type { DefineComponent } from 'vue';
    export const TablerPillGroup: DefineComponent<object, object, unknown>;
    export const TablerInput: DefineComponent<object, object, unknown>;
    export const TablerLoading: DefineComponent<object, object, unknown>;
    export const TablerAlert: DefineComponent<object, object, unknown>;
}
