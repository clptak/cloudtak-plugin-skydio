declare module '*.vue' {
    import type { DefineComponent } from 'vue';
    const component: DefineComponent<object, object, unknown>;
    export default component;
}

declare module '*.svg' {
    const src: string;
    export default src;
}

declare module '../../../src/stores/float.ts' {
    import type { Component } from 'vue';

    export type Pane = {
        uid: string;
        name?: string;
        component: Component;
        config: Record<string, unknown>;
        height: number;
        width: number;
        x: number;
        y: number;
    };

    export function useFloatStore(pinia?: unknown): {
        panes: Map<string, Pane>;
        add(opts: {
            uid: string;
            name?: string;
            component: Component;
            config?: Record<string, unknown>;
            height?: number;
            width?: number;
            x?: number;
            y?: number;
        }): Pane;
        delete(uid: string): void;
    };
}

declare module '@tak-ps/vue-tabler' {
    import type { DefineComponent } from 'vue';
    export const TablerPillGroup: DefineComponent<object, object, unknown>;
    export const TablerInput: DefineComponent<object, object, unknown>;
    export const TablerLoading: DefineComponent<object, object, unknown>;
    export const TablerAlert: DefineComponent<object, object, unknown>;
    export const TablerModal: DefineComponent<object, object, unknown>;
    export const TablerIconButton: DefineComponent<object, object, unknown>;
    export const TablerNone: DefineComponent<object, object, unknown>;
}

declare module '@tabler/icons-vue' {
    import type { DefineComponent } from 'vue';
    export const IconExternalLink: DefineComponent<object, object, unknown>;
    export const IconInfoCircle: DefineComponent<object, object, unknown>;
}
