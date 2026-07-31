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

const panes = new Map<string, Pane>();

export function useFloatStore(...args: unknown[]) {
    void args;
    return {
        panes,
        add(opts: {
            uid: string;
            name?: string;
            component: Component;
            config?: Record<string, unknown>;
            height?: number;
            width?: number;
            x?: number;
            y?: number;
        }): Pane {
            const pane: Pane = {
                uid: opts.uid,
                name: opts.name,
                component: opts.component,
                config: opts.config || {},
                height: opts.height ?? 300,
                width: opts.width ?? 400,
                x: opts.x ?? 60,
                y: opts.y ?? 70,
            };
            panes.set(opts.uid, pane);
            return pane;
        },
        delete(uid: string): void {
            panes.delete(uid);
        },
    };
}
