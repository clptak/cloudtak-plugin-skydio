import type { App, Plugin } from 'vue';

export type Pinia = Plugin & {
    install(app: App): void;
};

export function createPinia(): Pinia {
    const pinia = {
        install(app: App): void {
            void app;
        },
    };
    return pinia;
}
