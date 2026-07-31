import type { App, Plugin } from 'vue';

export type Pinia = Plugin & {
    install(app: App): void;
};

export function createPinia(): Pinia {
    const pinia = {
        install(_app: App): void {
            // stub
        },
    };
    return pinia;
}
