import type { SkydioAlert, SkydioWebhookAlert, SkydioWebhookSseEvent } from '../types';

function vehicleLabel(alert: SkydioWebhookAlert): string {
    return alert.vehicle_serial?.trim() || 'unknown vehicle';
}

function flightLabel(alert: SkydioWebhookAlert): string {
    return alert.flight_id?.trim() || 'unknown flight';
}

/** Skydio cloud events use FLIGHT_STATE; legacy webhooks used FLIGHT_STATUS. */
const FLIGHT_STATUS_LOG_TYPES = new Set(['FLIGHT_STATUS', 'FLIGHT_STATE']);

function eventTypeOf(event: SkydioWebhookSseEvent): string {
    return event.eventType || event.alert.alert_type;
}

export function shouldLogFlightStatusToMission(event: SkydioWebhookSseEvent): boolean {
    return FLIGHT_STATUS_LOG_TYPES.has(eventTypeOf(event));
}

export function webhookAlertToDisplayAlert(event: SkydioWebhookSseEvent): SkydioAlert {
    const alert = event.alert;
    const vehicle = vehicleLabel(alert);
    const flight = flightLabel(alert);
    const eventType = event.eventType || alert.alert_type;

    let message: string;
    switch (eventType) {
        case 'FLIGHT_STATUS':
        case 'FLIGHT_STATE':
            message = `Flight status: vehicle ${vehicle}, flight ${flight}`;
            break;
        case 'ONLINE_STATUS':
            message = `Online status changed: vehicle ${vehicle}`;
            break;
        case 'TELEMETRY_AVAILABLE':
            message = `Telemetry available: vehicle ${vehicle}, flight ${flight}`;
            break;
        case 'LIVE_STREAM_STATUS_CHANGED':
            message = `Live stream status changed: vehicle ${vehicle}`;
            break;
        case 'HUMAN_DETECTED':
            message = `Human detected: vehicle ${vehicle}, flight ${flight}`;
            break;
        case 'MISSION_INCOMPLETE':
            message = `Mission incomplete: vehicle ${vehicle}`;
            break;
        case 'DOCK_ERROR':
            message = `Dock error: vehicle ${vehicle}`;
            break;
        case 'SCHEDULED_MISSION_FAILED_TAKEOFF':
            message = `Scheduled mission failed takeoff: vehicle ${vehicle}`;
            break;
        case 'MEDIA_FILE_AVAILABLE':
        case 'MEDIA_AVAILABLE_FOR_SCAN':
            message = `Media available: vehicle ${vehicle}, flight ${flight}`;
            break;
        case 'WAYPOINT_PROGRESS':
            message = `Waypoint progress: vehicle ${vehicle}`;
            break;
        default:
            message = `${eventType.replace(/_/g, ' ').toLowerCase()}: vehicle ${vehicle}`;
            break;
    }

    return {
        id: alert.alert_id,
        source: 'sse',
        type: eventType,
        message,
        vehicleSerial: alert.vehicle_serial?.trim() || '',
        flightId: alert.flight_id?.trim() || undefined,
        timestamp: alert.alert_time,
        raw: alert,
    };
}

export async function handleSkydioSseEvent(
    event: SkydioWebhookSseEvent,
    opts: {
        flightStatusLogEnabled: boolean;
        getMissionGuid: () => string | undefined;
        onAlert: (alert: SkydioAlert) => void;
        onFlightStatusLog?: (
            alert: SkydioWebhookAlert,
            message: string,
            missionGuid: string,
        ) => Promise<void>;
        onLogError?: (message: string) => void;
    },
): Promise<void> {
    const displayAlert = webhookAlertToDisplayAlert(event);
    opts.onAlert(displayAlert);

    if (!opts.flightStatusLogEnabled || !shouldLogFlightStatusToMission(event)) {
        return;
    }

    const missionGuid = opts.getMissionGuid();
    if (!missionGuid || !opts.onFlightStatusLog) return;

    try {
        await opts.onFlightStatusLog(event.alert, displayAlert.message, missionGuid);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to write mission log';
        opts.onLogError?.(message);
    }
}
