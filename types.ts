export interface SkydioVehicle {
    vehicle_serial: string;
    name: string;
    is_online: boolean;
    is_live_streaming: boolean;
    device_health_status?: string;
    vehicle_class?: string;
    vehicle_type?: string;
}

export interface SkydioFlight {
    flight_id: string;
    vehicle_serial: string;
    takeoff?: string;
    landing?: string | null;
    has_telemetry?: boolean;
    takeoff_latitude?: number;
    takeoff_longitude?: number;
    user_email?: string;
}

export interface SkydioTelemetryPoint {
    gps_latitude?: number;
    gps_longitude?: number;
    gps_altitude?: number;
    height_above_takeoff?: number;
    timestamp?: string;
}

export interface SkydioFlightTelemetryResponse {
    data: {
        flight: SkydioFlight;
        flight_telemetry?: {
            aligned_telemetry?: SkydioTelemetryPoint[];
        };
    };
    status_code: number;
    skydio_error_code: number;
    error_message?: string | null;
}

export interface SkydioWebhook {
    id: string;
    name: string;
    url: string;
}

export interface SkydioApiResponse<T> {
    data: T;
    status_code: number;
    skydio_error_code: number;
    error_message?: string | null;
    meta?: { time?: number };
}

export type SkydioAlertType =
    | 'device_online'
    | 'device_offline'
    | 'flight_started'
    | 'flight_ended'
    | 'telemetry_available'
    | 'live_stream_started'
    | 'live_stream_ended';

export interface SkydioWebhookAlert {
    alert_id: string;
    alert_time: string;
    alert_type: string;
    vehicle_serial?: string | null;
    flight_id?: string | null;
    mission_template_id?: string | null;
    mission_execution_id?: string | null;
    mission_result?: string | null;
}

export interface SkydioWebhookSseEvent {
    source: string;
    eventType: string;
    alert: SkydioWebhookAlert;
}

export interface SkydioAlert {
    id: string;
    source: 'sse' | 'poll';
    type: string;
    message: string;
    vehicleSerial: string;
    flightId?: string;
    timestamp: string;
    raw?: SkydioWebhookAlert;
}

export interface SkydioSettings {
    apiKey: string;
    pollIntervalMs: number;
    pollingEnabled: boolean;
    authentikTokenUrl: string;
    oauthClientId: string;
    oauthClientSecret: string;
    skydioSseUrl: string;
    skydioWebhookUrl: string;
    sseEnabled: boolean;
    flightStatusLogEnabled: boolean;
}

export const DEFAULT_SETTINGS: SkydioSettings = {
    apiKey: '',
    pollIntervalMs: 30_000,
    pollingEnabled: true,
    authentikTokenUrl: '',
    oauthClientId: '',
    oauthClientSecret: '',
    skydioSseUrl: '',
    skydioWebhookUrl: '',
    sseEnabled: true,
    flightStatusLogEnabled: true,
};

export function hasSseConfig(settings: SkydioSettings): boolean {
    return Boolean(
        settings.oauthClientId.trim()
        && settings.oauthClientSecret.trim()
        && settings.skydioSseUrl.trim(),
    );
}

export const SKYDIO_API_BASE = 'https://api.skydio.com/api';
/** @deprecated Use per-user keys via storage/settings.ts */
export const SETTINGS_KEY = 'cloudtak-plugin-skydio:settings';
