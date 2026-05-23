import { listFlights, listVehicles } from '../api/client';
import type { SkydioAlert, SkydioFlight, SkydioVehicle } from '../types';

export interface PollSnapshot {
    vehicles: Map<string, SkydioVehicle>;
    flights: Map<string, SkydioFlight>;
}

export interface PollResult {
    alerts: SkydioAlert[];
    snapshot: PollSnapshot;
    error?: string;
}

export function createSnapshot(): PollSnapshot {
    return {
        vehicles: new Map(),
        flights: new Map(),
    };
}

function alertId(type: string, vehicleSerial: string, flightId?: string): string {
    return `${type}:${vehicleSerial}:${flightId ?? 'none'}:${Date.now()}`;
}

function detectVehicleAlerts(
    previous: Map<string, SkydioVehicle>,
    current: SkydioVehicle[],
): SkydioAlert[] {
    const alerts: SkydioAlert[] = [];
    const now = new Date().toISOString();

    for (const vehicle of current) {
        const prior = previous.get(vehicle.vehicle_serial);
        if (!prior) continue;

        if (!prior.is_online && vehicle.is_online) {
            alerts.push({
                id: alertId('device_online', vehicle.vehicle_serial),
                type: 'device_online',
                message: `${vehicle.name} came online`,
                vehicleSerial: vehicle.vehicle_serial,
                timestamp: now,
            });
        }

        if (prior.is_online && !vehicle.is_online) {
            alerts.push({
                id: alertId('device_offline', vehicle.vehicle_serial),
                type: 'device_offline',
                message: `${vehicle.name} went offline`,
                vehicleSerial: vehicle.vehicle_serial,
                timestamp: now,
            });
        }

        if (!prior.is_live_streaming && vehicle.is_live_streaming) {
            alerts.push({
                id: alertId('live_stream_started', vehicle.vehicle_serial),
                type: 'live_stream_started',
                message: `${vehicle.name} started live streaming`,
                vehicleSerial: vehicle.vehicle_serial,
                timestamp: now,
            });
        }

        if (prior.is_live_streaming && !vehicle.is_live_streaming) {
            alerts.push({
                id: alertId('live_stream_ended', vehicle.vehicle_serial),
                type: 'live_stream_ended',
                message: `${vehicle.name} ended live streaming`,
                vehicleSerial: vehicle.vehicle_serial,
                timestamp: now,
            });
        }
    }

    return alerts;
}

function detectFlightAlerts(
    previous: Map<string, SkydioFlight>,
    current: SkydioFlight[],
): SkydioAlert[] {
    const alerts: SkydioAlert[] = [];
    const now = new Date().toISOString();

    for (const flight of current) {
        const prior = previous.get(flight.flight_id);

        if (!prior) {
            alerts.push({
                id: alertId('flight_started', flight.vehicle_serial, flight.flight_id),
                type: 'flight_started',
                message: `Flight started on ${flight.vehicle_serial}`,
                vehicleSerial: flight.vehicle_serial,
                flightId: flight.flight_id,
                timestamp: flight.takeoff ?? now,
            });
            continue;
        }

        if (!prior.landing && flight.landing) {
            alerts.push({
                id: alertId('flight_ended', flight.vehicle_serial, flight.flight_id),
                type: 'flight_ended',
                message: `Flight ended on ${flight.vehicle_serial}`,
                vehicleSerial: flight.vehicle_serial,
                flightId: flight.flight_id,
                timestamp: flight.landing,
            });
        }

        if (!prior.has_telemetry && flight.has_telemetry) {
            alerts.push({
                id: alertId('telemetry_available', flight.vehicle_serial, flight.flight_id),
                type: 'telemetry_available',
                message: `Telemetry available for flight on ${flight.vehicle_serial}`,
                vehicleSerial: flight.vehicle_serial,
                flightId: flight.flight_id,
                timestamp: now,
            });
        }
    }

    return alerts;
}

function flightsSince(hours: number): string {
    const d = new Date(Date.now() - hours * 60 * 60 * 1000);
    return d.toISOString();
}

export async function pollOnce(
    apiKey: string,
    previous: PollSnapshot,
): Promise<PollResult> {
    const [vehicles, flights] = await Promise.all([
        listVehicles(apiKey),
        listFlights(apiKey, { takeoffSince: flightsSince(24) }),
    ]);

    const alerts = [
        ...detectVehicleAlerts(previous.vehicles, vehicles),
        ...detectFlightAlerts(previous.flights, flights),
    ];

    const snapshot: PollSnapshot = {
        vehicles: new Map(vehicles.map(v => [v.vehicle_serial, v])),
        flights: new Map(flights.map(f => [f.flight_id, f])),
    };

    return { alerts, snapshot };
}

export type AlertListener = (alert: SkydioAlert) => void;
export type ErrorListener = (error: string) => void;
export type StatusListener = (status: { lastPoll: string | null; polling: boolean }) => void;

export class AlertPoller {
    private intervalId: ReturnType<typeof setInterval> | null = null;
    private snapshot: PollSnapshot = createSnapshot();
    private apiKey = '';
    private intervalMs = 30_000;
    private onAlert: AlertListener;
    private onError: ErrorListener;
    private onStatus: StatusListener;
    private lastPoll: string | null = null;
    private initialized = false;

    constructor(opts: {
        onAlert: AlertListener;
        onError: ErrorListener;
        onStatus: StatusListener;
    }) {
        this.onAlert = opts.onAlert;
        this.onError = opts.onError;
        this.onStatus = opts.onStatus;
    }

    start(apiKey: string, intervalMs: number): void {
        this.stop();
        this.apiKey = apiKey;
        this.intervalMs = intervalMs;
        this.snapshot = createSnapshot();
        this.initialized = false;
        this.emitStatus(true);
        void this.tick();
        this.intervalId = setInterval(() => void this.tick(), intervalMs);
    }

    stop(): void {
        if (this.intervalId) {
            clearInterval(this.intervalId);
            this.intervalId = null;
        }
        this.emitStatus(false);
    }

    private emitStatus(polling: boolean): void {
        this.onStatus({ lastPoll: this.lastPoll, polling });
    }

    private async tick(): Promise<void> {
        if (!this.apiKey) return;

        try {
            const result = await pollOnce(this.apiKey, this.snapshot);
            this.snapshot = result.snapshot;
            this.lastPoll = new Date().toISOString();
            this.emitStatus(true);

            if (this.initialized) {
                for (const alert of result.alerts) {
                    this.onAlert(alert);
                }
            }

            this.initialized = true;
        } catch (err) {
            const message = err instanceof Error ? err.message : 'Polling failed';
            this.onError(message);
            this.emitStatus(Boolean(this.intervalId));
        }
    }
}

export const WEBHOOK_EVENT_TO_POLL_TYPE: Record<string, string> = {
    'Device online status changed': 'device_online / device_offline',
    'Flight status changed': 'flight_started / flight_ended',
    'Flight telemetry available': 'telemetry_available',
    'Live stream status changed': 'live_stream_started / live_stream_ended',
};
