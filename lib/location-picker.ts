/**
 * location-picker.ts — self-contained map-location selection for CloudTAK plugins.
 *
 * Drop this file into your plugin. It depends ONLY on packages already bundled by
 * CloudTAK's web build (`maplibre-gl`, `terra-draw`, `terra-draw-maplibre-gl-adapter`),
 * so there are no extra installs and no coupling to CloudTAK core internals
 * (no useMapStore, no mapStore.draw, no DrawTool). That keeps it stable across
 * upstream CloudTAK updates.
 *
 * It exposes two helpers:
 *   pickPoint(map)            -> #2  user taps the map once, you get [lng, lat]
 *   drawGeometry(map, mode)   -> #3  user draws point/line/polygon, you get a GeoJSON Feature
 *
 * Both return a Promise, swap the cursor while active, clean up after themselves,
 * and reject on Escape so you can cancel cleanly.
 *
 * Resolve the map lazily at action time via `getPluginMap()` (never `api.map` during
 * install — it throws "Map has not yet initialized"). SkydioPanel registers the
 * resolver on mount; until then `getPluginMap()` returns null:
 *
 *   import { getPluginMap } from './plugin-map';
 *   import { pickPoint, drawGeometry } from './location-picker';
 *
 *   async function example() {
 *     const map = getPluginMap();
 *     if (!map) return;
 *     const [lng, lat] = await pickPoint(map);
 *     const poly = await drawGeometry(map, 'polygon');
 *   }
 */

import * as terraDraw from 'terra-draw';
import { TerraDrawMapLibreGLAdapter } from 'terra-draw-maplibre-gl-adapter';
import * as maplibregl from 'maplibre-gl';
import type { Map as MapLibreMap, MapMouseEvent } from 'maplibre-gl';
import type { Feature, Point, LineString, Polygon } from 'geojson';

/* ------------------------------------------------------------------ */
/* #2 — Tap the map once to select a location                          */
/* ------------------------------------------------------------------ */

export interface PickPointOptions {
    /** Cursor to show while waiting for the click. Default 'crosshair'. */
    cursor?: string;
    /** Allow Escape to cancel (rejects the promise). Default true. */
    cancellable?: boolean;
}

/**
 * Wait for a single map click and resolve with the clicked coordinate.
 * Resolves [lng, lat]. Rejects with 'cancelled' if Escape is pressed.
 */
export function pickPoint(
    map: MapLibreMap,
    opts: PickPointOptions = {},
): Promise<[number, number]> {
    const cursor = opts.cursor ?? 'crosshair';
    const cancellable = opts.cancellable ?? true;
    const canvas = map.getCanvas();
    const prevCursor = canvas.style.cursor;

    return new Promise((resolve, reject) => {
        const cleanup = () => {
            canvas.style.cursor = prevCursor;
            map.off('click', onClick);
            window.removeEventListener('keydown', onKey);
        };

        const onClick = (e: MapMouseEvent) => {
            cleanup();
            resolve([e.lngLat.lng, e.lngLat.lat]);
        };

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                cleanup();
                reject(new Error('cancelled'));
            }
        };

        canvas.style.cursor = cursor;
        map.on('click', onClick);
        if (cancellable) window.addEventListener('keydown', onKey);
    });
}

/* ------------------------------------------------------------------ */
/* #3 — Draw a point / line / polygon and get the geometry             */
/* ------------------------------------------------------------------ */

export type DrawMode = 'point' | 'linestring' | 'polygon';

type DrawnFeature<M extends DrawMode> =
    M extends 'point' ? Feature<Point> :
    M extends 'linestring' ? Feature<LineString> :
    Feature<Polygon>;

export interface DrawGeometryOptions {
    /** Allow Escape to cancel (rejects + clears the in-progress draw). Default true. */
    cancellable?: boolean;
}

/**
 * Let the user draw a single feature of the given mode on the map, then resolve
 * with the completed GeoJSON Feature. Unlike core's mapStore.draw, this does NOT
 * create a CoT marker or write to the database — you own the geometry and decide
 * what to do with it.
 *
 * A fresh TerraDraw instance is created on the supplied map and torn down on finish
 * or cancel, so it won't interfere with CloudTAK's own drawing tools.
 */
export function drawGeometry<M extends DrawMode>(
    map: MapLibreMap,
    mode: M,
    opts: DrawGeometryOptions = {},
): Promise<DrawnFeature<M>> {
    const cancellable = opts.cancellable ?? true;

    const draw = new terraDraw.TerraDraw({
        adapter: new TerraDrawMapLibreGLAdapter({
            map,
            // @ts-expect-error mirrors CloudTAK core: passing the maplibre lib
            lib: maplibregl,
        }),
        modes: [
            new terraDraw.TerraDrawPointMode(),
            new terraDraw.TerraDrawLineStringMode({ editable: true }),
            new terraDraw.TerraDrawPolygonMode({ editable: true }),
        ],
    });

    return new Promise((resolve, reject) => {
        const cleanup = () => {
            window.removeEventListener('keydown', onKey);
            try { draw.stop(); } catch { /* already stopped */ }
        };

        const onFinish = (id: string | number) => {
            // Grab the finished feature before tearing the instance down.
            const feature = draw.getSnapshot().find((f) => f.id === id);
            cleanup();
            if (feature) {
                resolve(feature as unknown as DrawnFeature<M>);
            } else {
                reject(new Error('no-feature'));
            }
        };

        const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape') {
                cleanup();
                reject(new Error('cancelled'));
            }
        };

        draw.on('finish', onFinish);
        draw.start();
        draw.setMode(mode);
        if (cancellable) window.addEventListener('keydown', onKey);
    });
}
