import type { SkydioFlightTelemetryResponse } from '../types';

export function formatTakeoff(takeoff: string | undefined): string {
    if (!takeoff) return '';
    const match = takeoff.match(/^(\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2})/);
    return match ? match[1] : takeoff;
}

export function flightLabel(vehicleSerial: string, takeoff: string | undefined): string {
    return `${vehicleSerial} ${formatTakeoff(takeoff)}`.trim();
}

type GeoJsonPosition = [number, number, number];

export type TelemetryGeoJsonMode = 'line' | 'points' | 'both';

export interface GeoJsonFeatureCollection {
    type: 'FeatureCollection';
    features: GeoJsonFeature[];
}

export interface GeoJsonLineStringFeature {
    type: 'Feature';
    geometry: {
        type: 'LineString';
        coordinates: GeoJsonPosition[];
    };
    properties: {
        callsign: string;
        remarks: string;
        pointCount: number;
        startTime?: string;
        endTime?: string;
    };
}

export interface GeoJsonPointFeature {
    type: 'Feature';
    geometry: {
        type: 'Point';
        coordinates: GeoJsonPosition;
    };
    properties: {
        callsign: string;
        remarks: string;
        pointIndex: number;
        timestamp?: string;
        gpsAltitude?: number;
        heightAboveTakeoff?: number;
    };
}

export type GeoJsonFeature = GeoJsonLineStringFeature | GeoJsonPointFeature;

function lineStringCoordinates(positions: GeoJsonPosition[]): GeoJsonPosition[] {
    if (positions.length === 0) return [];
    if (positions.length === 1) return [positions[0], positions[0]];
    return positions;
}

export function telemetryToGeoJson(
    telemetry: SkydioFlightTelemetryResponse,
    mode: TelemetryGeoJsonMode = 'line',
): GeoJsonFeatureCollection {
    const flight = telemetry.data.flight;
    const points = telemetry.data.flight_telemetry?.aligned_telemetry ?? [];
    const callsign = flightLabel(flight.vehicle_serial, flight.takeoff);
    const remarks = flight.flight_id;

    const validPoints = points.filter(
        (point) => point.gps_latitude != null && point.gps_longitude != null,
    );

    if (validPoints.length === 0) {
        return { type: 'FeatureCollection', features: [] };
    }

    const positions = validPoints.map((point) => {
        const z = point.gps_altitude ?? point.height_above_takeoff ?? 0;
        return [point.gps_longitude!, point.gps_latitude!, z] as GeoJsonPosition;
    });

    const startTime = validPoints[0]?.timestamp;
    const endTime = validPoints[validPoints.length - 1]?.timestamp;
    const features: GeoJsonFeature[] = [];

    if (mode === 'line' || mode === 'both') {
        features.push({
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: lineStringCoordinates(positions),
            },
            properties: {
                callsign,
                remarks,
                pointCount: validPoints.length,
                startTime,
                endTime,
            },
        });
    }

    if (mode === 'points' || mode === 'both') {
        validPoints.forEach((point, pointIndex) => {
            features.push({
                type: 'Feature',
                geometry: {
                    type: 'Point',
                    coordinates: positions[pointIndex],
                },
                properties: {
                    callsign: `${callsign} #${pointIndex + 1}`,
                    remarks,
                    pointIndex,
                    timestamp: point.timestamp,
                    gpsAltitude: point.gps_altitude,
                    heightAboveTakeoff: point.height_above_takeoff,
                },
            });
        });
    }

    return {
        type: 'FeatureCollection',
        features,
    };
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
