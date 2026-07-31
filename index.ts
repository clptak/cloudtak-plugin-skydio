import type { App } from 'vue';
import { defineAsyncComponent, defineComponent, h, onMounted } from 'vue';
import type { PluginAPI, PluginInstance } from '@tak-ps/cloudtak';
import { useAppStore } from '@/stores/app.ts';
import MenuSkydio from './components/MenuSkydio.vue';
import {
    bindFloatPane,
    cleanupFloatPane,
    openDesktopPane,
} from './lib/floatPane.ts';
import { bindPopout, closePopout } from './lib/popout.ts';

const SkydioFloatShell = defineAsyncComponent(
    () => import('./components/SkydioFloatShell.vue')
);

const SKYDIO_ROUTE_NAME = 'home-menu-plugin-skydio';
const SKYDIO_MENU_KEY = 'skydio';
const SKYDIO_ROUTE_PARENT = 'home-menu';

function SkydioIcon() {
    return h('svg', {
        xmlns: 'http://www.w3.org/2000/svg',
        width: 32,
        height: 32,
        viewBox: '0 0 387 344',
        fill: 'currentColor',
    }, [
        h('g', { transform: 'matrix(1,0,0,1,-599.956519,-423.181025)' }, [
            h('g', { transform: 'matrix(1,0,0,1,-1.543481,-2.318975)' }, [
                h('g', { transform: 'matrix(1.00289,0,0,1,-2.742775,0)' }, [
                    h('path', {
                        d: 'M616.164,591.902L603,597L603,426L949,426L949,452.436C968.756,456.566 986.027,463.288 986.89,477C988.394,484.887 970.133,499.498 948.003,509C870.162,541.908 744.882,570.595 603.997,597L616.164,591.902Z',
                    }),
                ]),
                h('path', {
                    d: 'M949,550L949,769L658,769C632.344,766.671 612.678,758.531 613,731C613.698,671.286 758.255,606.882 949,550Z',
                }),
            ]),
        ]),
    ]);
}

export default class SkydioPlugin implements PluginInstance {
    api: PluginAPI;

    constructor(api: PluginAPI) {
        this.api = api;
    }

    static async install(
        _app: App,
        api: PluginAPI,
    ): Promise<PluginInstance> {
        return new SkydioPlugin(api);
    }

    async enable(): Promise<void> {
        const api = this.api;

        bindPopout(api);
        bindFloatPane({
            api,
            shell: SkydioFloatShell,
        });

        api.routes.add({
            path: 'plugin-skydio',
            name: SKYDIO_ROUTE_NAME,
            component: defineComponent({
                name: 'SkydioEntry',
                setup() {
                    const appStore = useAppStore();
                    onMounted(() => {
                        if (!appStore.isMobileDetected) {
                            openDesktopPane();
                            void api.router.replace({ name: 'home' });
                        }
                    });
                    return () => {
                        if (appStore.isMobileDetected) {
                            return h(MenuSkydio);
                        }
                        return null;
                    };
                },
            }),
        }, SKYDIO_ROUTE_PARENT);

        api.menu.add({
            key: SKYDIO_MENU_KEY,
            label: 'Skydio',
            route: SKYDIO_ROUTE_NAME,
            tooltip: 'Skydio Cloud integration',
            description: 'Flights, vehicles, missions, alerts, and webhooks',
            icon: SkydioIcon,
        });
    }

    async disable(): Promise<void> {
        this.api.menu.remove(SKYDIO_MENU_KEY);
        closePopout();
        cleanupFloatPane();
        if (this.api.router.hasRoute(SKYDIO_ROUTE_NAME)) {
            this.api.router.removeRoute(SKYDIO_ROUTE_NAME);
        }
    }
}
