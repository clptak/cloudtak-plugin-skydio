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
    hybrid_altitude?: number;
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
    /** Nested resource.type from cloud events (e.g. FLIGHT_START, FLIGHT_END). */
    resource_type?: string | null;
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
    /**
     * Optional telemetry relay base URL. The relay is expected to expose:
     *   GET {skydioTelemetryRelayUrl}/telemetry/{flightId}
     * For local dev the plugin will attempt to rewrite this URL through the existing
     * /webhook-sse Vite dev proxy when the path starts with /events/.
     */
    skydioTelemetryRelayUrl: string;
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
    skydioTelemetryRelayUrl: '',
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

// ---------------------------------------------------------------------------
// Pre-Flight tab
// ---------------------------------------------------------------------------

/**
 * Manufacturer / operational limits for a drone platform. Any field left
 * undefined is skipped during the performance check. All values use the same
 * units the WEATHER section of the form displays (imperial).
 */
export interface DronePerformanceSpec {
    /** Maximum sustained wind the platform is rated for, in mph. */
    maxWindMph?: number;
    /** Minimum operating temperature, in degrees Fahrenheit. */
    minTempF?: number;
    /** Maximum operating temperature, in degrees Fahrenheit. */
    maxTempF?: number;
    /** Minimum acceptable visibility, in statute miles. */
    minVisibilityMiles?: number;
    /** Maximum acceptable planetary K-index (geomagnetic activity). */
    maxKpIndex?: number;
}

/** A drone platform option, populating the PLATFORM list. */
export interface PreflightPlatform {
    name: string;
    specs?: DronePerformanceSpec;
}

/** A remote pilot option, populating the Remote Pilots list. */
export interface RemotePilot {
    /** Badge / callsign identifier shown in the list (e.g. AZ-CCSO-RPIC-S064). */
    id: string;
    /** Optional human-readable name. */
    name?: string;
}

/**
 * Uploaded configuration that populates the Land Manager / Owner, PLATFORM, and
 * Remote Pilots lists, and supplies per-platform performance specs.
 */
export interface PreflightConfig {
    landManagers: string[];
    platforms: PreflightPlatform[];
    remotePilots: RemotePilot[];
}

export const DEFAULT_PREFLIGHT_CONFIG: PreflightConfig = {
    landManagers: [
        'United States Forest Service',
        'National Park Service',
        'Bureau of Land Management',
        'State Land',
        'County',
        'Native American Reservation',
        'Private',
        'Other',
    ],
    platforms: [
        { name: 'Skydio X10' },
        { name: 'Skydio X2' },
        { name: 'DJI Mavic 2 Enterprise Advanced' },
        { name: 'Other' },
    ],
    remotePilots: [],
};

/** Weather values for the WEATHER section, in imperial units. */
export interface PreflightWeather {
    temperatureF: number | null;
    dewPointF: number | null;
    windSpeedMph: number | null;
    windDirection: string;
    kpIndex: string;
    visibilityMiles: number | null;
    ceilingFt: number | null;
    source: string;
}

export const EMPTY_WEATHER: PreflightWeather = {
    temperatureF: null,
    dewPointF: null,
    windSpeedMph: null,
    windDirection: '',
    kpIndex: '',
    visibilityMiles: null,
    ceilingFt: null,
    source: '',
};

/** Pass = within spec, warn = non-blocking (e.g. missing optional input), fail = out of spec. */
export type PerformanceStatus = 'pass' | 'warn' | 'fail';

/** Result of comparing one weather metric to a drone spec limit. */
export interface PerformanceMetricResult {
    label: string;
    value: string;
    limit: string;
    status: PerformanceStatus;
}

/** Aggregate performance check against a platform's specs. */
export interface PerformanceEvaluation {
    /** True when no metric is failing (warnings do not block). */
    overallPass: boolean;
    /** Empty when the platform has no specs to check against. */
    metrics: PerformanceMetricResult[];
}

/** Full pre-flight form state. Mirrors the core sections of Pre-Flight.xml. */
export interface PreflightFormState {
    dateTime: string;
    location: string;
    latitude: number | null;
    longitude: number | null;
    activityNumber: string;
    demaNumber: string;
    airspaceClass: string;
    maxAltitudeAglFt: number | null;
    laancRequired: string;
    laancAuthNumber: string;

    flightCategory: string;
    missionType: string;
    flightRule: string;
    landManager: string;
    landManagerPermissionRequired: string;
    mapSource: string;
    mapSourceOther: string;
    platform: string;
    platformOther: string;
    dataCollection: string;
    dataCollectionOther: string;

    forecastAttached: string;
    weather: PreflightWeather;

    aviationHazards: string;
    groundHazards: string;
    crewEquipmentHazards: string;

    remotePilots: string[];
    visualObservers: string[];
    crewMembers: string;
}

/** A generated report stored in the reports list. */
export interface PreflightReport {
    id: string;
    title: string;
    createdAt: string;
    location: string;
    platform: string;
    /** Null when no platform specs were available to evaluate. */
    overallPass: boolean | null;
    fileName: string;
    /** Base64-encoded PDF payload (no data: prefix). */
    pdfBase64: string;
}
