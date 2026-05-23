import type { SkydioFlightTelemetryResponse } from '../types';

export function formatTakeoff(takeoff: string | undefined): string {
    if (!takeoff) return '';
    const match = takeoff.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
    return match ? match[1] : takeoff;
}

export function flightLabel(vehicleSerial: string, takeoff: string | undefined): string {
    return `${vehicleSerial} ${formatTakeoff(takeoff)}`.trim();
}

export interface GeoJsonFeatureCollection {
    type: 'FeatureCollection';
    features: GeoJsonFeature[];
}

export interface GeoJsonFeature {
    type: 'Feature';
    geometry: {
        type: 'Point';
        coordinates: [number, number, number];
    };
    properties: {
        callsign: string;
        remarks: string;
        timestamp?: string;
    };
}

export function telemetryToGeoJson(
    telemetry: SkydioFlightTelemetryResponse,
): GeoJsonFeatureCollection {
    const flight = telemetry.data.flight;
    const points = telemetry.data.flight_telemetry?.aligned_telemetry ?? [];
    const callsign = flightLabel(flight.vehicle_serial, flight.takeoff);
    const remarks = flight.flight_id;

    const features: GeoJsonFeature[] = points
        .filter((point) => point.gps_latitude != null && point.gps_longitude != null)
        .map((point) => {
            const z = point.gps_altitude ?? point.height_above_takeoff ?? 0;
            return {
                type: 'Feature' as const,
                geometry: {
                    type: 'Point' as const,
                    coordinates: [point.gps_longitude!, point.gps_latitude!, z],
                },
                properties: {
                    callsign,
                    remarks,
                    timestamp: point.timestamp,
                },
            };
        });

    return { type: 'FeatureCollection', features };
}

export function downloadGeoJson(collection: GeoJsonFeatureCollection, filename: string): void {
    const blob = new Blob([JSON.stringify(collection, null, 2)], { type: 'application/geo+json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}
