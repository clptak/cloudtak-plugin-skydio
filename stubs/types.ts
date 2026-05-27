import type { Geometry } from 'geojson';

/** Minimal CloudTAK Feature stub for plugin typechecking outside the host app. */
export type Feature = {
    id: string;
    path: string;
    type: 'Feature';
    properties: {
        callsign: string;
        type: string;
        how: string;
        time: string;
        start: string;
        stale: string;
        center: number[];
        creator?: {
            callsign?: string;
            [key: string]: unknown;
        };
        [key: string]: unknown;
    };
    geometry: Geometry;
};
