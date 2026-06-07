import type { Feature } from './types.ts';

type PixelBox = [[number, number], [number, number]];

interface StubRenderedFeature {
    layer: { id: string };
    source?: string;
    properties: Record<string, unknown> | null;
}

/** Minimal map shape used by the overlay-detect helper (real MapLibre map satisfies it). */
interface StubMap {
    project(lnglat: [number, number]): { x: number; y: number };
    queryRenderedFeatures(
        geometry?: { x: number; y: number } | PixelBox,
        options?: { layers?: string[] },
    ): StubRenderedFeature[];
    jumpTo(opts: { center: [number, number] }): void;
    once(ev: string, cb: () => void): void;
}

interface StubOverlay {
    id: number;
    name: string;
    visible?: boolean;
    type?: string;
}

/** Stub for CloudTAK host map store when typechecking outside CloudTAK. */
export function useMapStore(): {
    mission?: { meta: { guid: string }; token?: string };
    toImport: Feature[];
    selected: Map<string, { as_feature?: () => Feature }>;
    map?: StubMap;
    overlays?: StubOverlay[];
} {
    return { toImport: [], selected: new Map() };
}
