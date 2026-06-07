// Query GeoJSON/vector overlay attributes at a point, for the PreFlight tab.
//
// Mechanism: project the point's lon/lat to a screen pixel, query a small box around it with
// map.queryRenderedFeatures(box), then read overlay features rendered there.
//
// Two hard-won rules baked in here (see docs/PATTERN-overlay-attribute-autofill.md):
//   1. Do NOT depend on the map store's `overlays` list — inside a plugin it can come back empty
//      even while the overlay layers are clearly rendered. Overlay layers are identified purely by
//      their id shape instead: anything matching `^\d+-` is an overlay layer (`${overlay.id}-…`).
//   2. The leading number in a layer id (`${overlay.id}-`) is reassigned on every restart and can
//      differ between users, so `1202-136-poly` may become `1530-136-poly`. We therefore match on
//      the STABLE suffix (strip a single leading `\d+-`), never the full runtime id.
//
// Only vector/geojson overlays that are toggled ON carry attributes; raster (MapServer image)
// overlays return nothing here.

import type { OverlayFieldMapping, PreflightAutofillField } from './overlay-field-map.ts';

type PixelBox = [[number, number], [number, number]];

interface RenderedFeature {
    layer: { id: string };
    source?: string;
    properties: Record<string, unknown> | null;
}

// Minimal structural map type so this module doesn't hard-depend on maplibre-gl.
export interface MapLike {
    project(lnglat: [number, number]): { x: number; y: number };
    queryRenderedFeatures(
        geometry?: { x: number; y: number } | PixelBox,
        options?: { layers?: string[] },
    ): RenderedFeature[];
}

/** Map plus the viewport helpers needed to render a point's tiles before querying. */
export type RecenterMap = MapLike & {
    jumpTo(opts: { center: [number, number] }): void;
    once(ev: string, cb: () => void): void;
};

/** Minimal overlay shape — only used for the optional debug dump. */
export interface OverlayLike {
    id: number;
    name: string;
    visible?: boolean;
    type?: string;
}

export interface InspectResult {
    /** Full runtime layer id, e.g. "1202-136-poly" (the leading number changes on restart). */
    layerId: string;
    /** Stable id to put in the mapping, e.g. "136-poly" (leading overlay number stripped). */
    stableLayerId: string;
    /** Overlay source id (the volatile leading number), for reference. */
    source: string;
    properties: Record<string, unknown>;
}

export interface DetectResult {
    formField: PreflightAutofillField;
    overlayLayerId: string;
    attribute: string;
    /** Translated value ready to write into the form, or null if nothing matched at the point. */
    value: string | null;
}

/** Diagnostics for when nothing matches — surfaced in the UI to debug mappings. */
export interface DetectDebug {
    totalFeaturesAtPoint: number;
    /** layer id + source for every rendered feature under the point (deduped, capped). */
    sampleLayers: Array<{ layerId: string; source: string }>;
    /** Whatever the map store reports (often empty in a plugin — informational only). */
    visibleOverlays: Array<{ id: number; name: string; type?: string }>;
}

const BOX_HALF = 4; // pixels — tolerates thin geometries / exact-pixel misses

/** Overlay layers look like `${overlay.id}-<original-id>`, e.g. "1202-136-poly". */
const OVERLAY_LAYER_RE = /^\d+-/;

function boxAround(map: MapLike, lonLat: [number, number]): PixelBox {
    const p = map.project(lonLat);
    return [[p.x - BOX_HALF, p.y - BOX_HALF], [p.x + BOX_HALF, p.y + BOX_HALF]];
}

/** Strip the volatile leading overlay-id prefix: "1202-136-poly" -> "136-poly". */
export function layerSuffix(id: string): string {
    return id.replace(OVERLAY_LAYER_RE, '');
}

/**
 * Does a runtime layer id refer to the same overlay layer as a configured id?
 * Tolerant of the volatile leading `${overlay.id}-` on either side, so the mapping keeps working
 * after the id is reassigned — and whether you stored the full id ("1202-136-poly") or just the
 * stable suffix ("136-poly").
 */
export function layerMatches(runtimeLayerId: string, configLayerId: string): boolean {
    if (runtimeLayerId === configLayerId) return true;
    const runtimeSuffix = layerSuffix(runtimeLayerId);
    if (runtimeSuffix === configLayerId) return true; // config stored the stable suffix
    if (runtimeSuffix === layerSuffix(configLayerId)) return true; // config stored a full id
    return false;
}

/**
 * Dump every rendered OVERLAY feature under the point — used to author the mapping.
 * Identifies overlay layers by the `^\d+-` id shape, so it works even when the store's
 * `overlays` list is empty.
 */
export function inspectAtPoint(map: MapLike, lonLat: [number, number]): InspectResult[] {
    const feats = map.queryRenderedFeatures(boxAround(map, lonLat));
    const out: InspectResult[] = [];
    const seen = new Set<string>();
    for (const f of feats) {
        if (!OVERLAY_LAYER_RE.test(f.layer.id)) continue; // overlay layers only (skip basemap)
        const key = `${layerSuffix(f.layer.id)}|${JSON.stringify(f.properties ?? {})}`;
        if (seen.has(key)) continue;
        seen.add(key);
        out.push({
            layerId: f.layer.id,
            stableLayerId: layerSuffix(f.layer.id),
            source: f.source ?? '',
            properties: (f.properties ?? {}) as Record<string, unknown>,
        });
    }
    return out;
}

/** Diagnostics: what's actually rendered under the point, regardless of overlay membership. */
export function debugAtPoint(
    map: MapLike,
    overlays: OverlayLike[],
    lonLat: [number, number],
): DetectDebug {
    const feats = map.queryRenderedFeatures(boxAround(map, lonLat));
    const seen = new Set<string>();
    const sampleLayers: Array<{ layerId: string; source: string }> = [];
    for (const f of feats) {
        const k = `${f.layer.id}|${f.source ?? ''}`;
        if (seen.has(k)) continue;
        seen.add(k);
        sampleLayers.push({ layerId: f.layer.id, source: f.source ?? '' });
        if (sampleLayers.length >= 40) break;
    }
    return {
        totalFeaturesAtPoint: feats.length,
        sampleLayers,
        visibleOverlays: overlays
            .filter((o) => o.visible !== false)
            .map((o) => ({ id: o.id, name: o.name, type: o.type })),
    };
}

/**
 * Recenter the map on the point and wait for its tiles to render, so queryRenderedFeatures
 * can see overlay features there even if the point was off-screen. Returns the map (or null).
 */
export async function recenterTo(
    map: RecenterMap | null | undefined,
    lonLat: [number, number],
): Promise<RecenterMap | null> {
    if (!map) return null;
    map.jumpTo({ center: lonLat });
    await new Promise<void>((resolve) => {
        let settled = false;
        const done = (): void => {
            if (!settled) {
                settled = true;
                resolve();
            }
        };
        map.once('idle', done);
        setTimeout(done, 4000); // fallback if 'idle' never fires
    });
    return map;
}

/** Apply the static mapping at the point: read each mapped attribute from its overlay layer. */
export function detectValues(
    map: MapLike,
    lonLat: [number, number],
    mapping: OverlayFieldMapping[],
): DetectResult[] {
    if (!mapping.length) return [];
    const feats = map
        .queryRenderedFeatures(boxAround(map, lonLat))
        .filter((f) => OVERLAY_LAYER_RE.test(f.layer.id));

    return mapping.map((m) => {
        let value: string | null = null;
        for (const f of feats) {
            if (!layerMatches(f.layer.id, m.overlayLayerId)) continue;
            const raw = (f.properties ?? {})[m.attribute];
            if (raw != null && raw !== '') {
                value = translateValue(String(raw), m.valueMap);
                break; // first matching feature wins
            }
        }
        return { formField: m.formField, overlayLayerId: m.overlayLayerId, attribute: m.attribute, value };
    });
}

/** Translate an overlay value to its form equivalent via the row's valueMap (normalized key match). */
export function translateValue(raw: string, valueMap?: Record<string, string>): string {
    if (!valueMap) return raw;
    const norm = normalizeLabel(raw);
    for (const [k, v] of Object.entries(valueMap)) {
        if (normalizeLabel(k) === norm) return v;
    }
    return raw; // unmapped → pass through (may still match an option directly)
}

/** Normalize for option-label matching: lowercase, trim, collapse internal whitespace. */
export function normalizeLabel(s: string): string {
    return s.toLowerCase().trim().replace(/\s+/g, ' ');
}
