import type { Map as MapLibreMap } from 'maplibre-gl';

type MapResolver = () => MapLibreMap | null;

let resolveMap: MapResolver | null = null;

/**
 * Register how to reach the live MapLibre map (called from SkydioPanel once the UI mounts).
 * Do not read `api.map` during plugin install — that getter throws before the map initializes.
 */
export function setPluginMapResolver(resolver: MapResolver | null): void {
    resolveMap = resolver;
}

/** Raw MapLibre map for pick/draw/overlay helpers; null if the map is not ready yet. */
export function getPluginMap(): MapLibreMap | null {
    if (!resolveMap) return null;
    try {
        return resolveMap();
    } catch {
        return null;
    }
}
