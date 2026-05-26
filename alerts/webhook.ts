import type { SkydioAlert, SkydioWebhookAlert, SkydioWebhookSseEvent } from '../types';

function vehicleLabel(alert: SkydioWebhookAlert): string {
    return alert.vehicle_serial?.trim() || 'unknown vehicle';
}

function flightLabel(alert: SkydioWebhookAlert): string {
    return alert.flight_id?.trim() || 'unknown flight';
}

function eventTypeOf(event: SkydioWebhookSseEvent): string {
    return event.eventType || event.alert.alert_type;
}

function resourceTypeOf(alert: SkydioWebhookAlert): string | undefined {
    return alert.resource_type?.trim().toUpperCase() || undefined;
}

/** Legacy webhooks used FLIGHT_STATUS without nested resource.type. */
const LEGACY_FLIGHT_STATUS_LOG_TYPES = new Set(['FLIGHT_STATUS']);

/** Cloud flight_state events: only start/end are written to DataSync mission log. */
const FLIGHT_STATE_MISSION_LOG_TYPES = new Set(['FLIGHT_START', 'FLIGHT_END']);

export function shouldLogFlightStatusToMission(event: SkydioWebhookSseEvent): boolean {
    const alert = event.alert;
    const eventType = eventTypeOf(event);
    const resourceType = resourceTypeOf(alert);

    if (LEGACY_FLIGHT_STATUS_LOG_TYPES.has(eventType)) {
        return true;
    }

    if (eventType === 'FLIGHT_STATE' && resourceType) {
        return FLIGHT_STATE_MISSION_LOG_TYPES.has(resourceType);
    }

    return false;
}

export function flightStatusMissionLogMessage(event: SkydioWebhookSseEvent): string {
    const alert = event.alert;
    const vehicle = vehicleLabel(alert);
    const flight = flightLabel(alert);
    const resourceType = resourceTypeOf(alert);

    switch (resourceType) {
        case 'FLIGHT_START':
            return `Flight started: vehicle ${vehicle}, flight ${flight}`;
        case 'FLIGHT_END':
            return `Flight ended: vehicle ${vehicle}, flight ${flight}`;
        default:
            return `Flight status: vehicle ${vehicle}, flight ${flight}`;
    }
}

export function webhookAlertToDisplayAlert(event: SkydioWebhookSseEvent): SkydioAlert {
    const alert = event.alert;
    const vehicle = vehicleLabel(alert);
    const flight = flightLabel(alert);
    const eventType = eventTypeOf(event);
    const resourceType = resourceTypeOf(alert);

    let message: string;
    if (eventType === 'FLIGHT_STATE' && resourceType) {
        message = flightStatusMissionLogMessage(event);
    } else {
        switch (eventType) {
            case 'FLIGHT_STATUS':
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
    }

    return {
        id: alert.alert_id,
        source: 'sse',
        type: resourceType || eventType,
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

    const logMessage = flightStatusMissionLogMessage(event);

    try {
        await opts.onFlightStatusLog(event.alert, logMessage, missionGuid);
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Failed to write mission log';
        opts.onLogError?.(message);
    }
}
