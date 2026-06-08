import type { Map as MapLibreMap } from 'maplibre-gl';

let pluginMap: MapLibreMap | null = null;

/** Called once from the plugin install hook when a map handle is available. */
export function setPluginMap(map: MapLibreMap | null | undefined): void {
    pluginMap = map ?? null;
}

/** Raw MapLibre map for pick/draw helpers; null before install completes. */
export function getPluginMap(): MapLibreMap | null {
    return pluginMap;
}
