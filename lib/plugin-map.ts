import type { Map as MapLibreMap } from 'maplibre-gl';

let pluginMap: MapLibreMap | null = null;

/** Called once from the plugin install hook with `api.map`. */
export function setPluginMap(map: MapLibreMap): void {
    pluginMap = map;
}

/** Raw MapLibre map for pick/draw helpers; null before install completes. */
export function getPluginMap(): MapLibreMap | null {
    return pluginMap;
}
