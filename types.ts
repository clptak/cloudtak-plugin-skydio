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

    aviationHazardSelections: string[];
    aviationHazardsOther: string;
    groundHazardSelections: string[];
    groundHazardsOther: string;
    crewHazardSelections: string[];
    crewHazardsOther: string;
    equipmentHazardSelections: string[];
    equipmentHazardsOther: string;
    mitigations: string[];

    remotePilots: string[];
    additionalRemotePilots: string[];
    visualObservers: string[];
    crewMembers: string[];
}

export interface HazardOption {
    id: string;
    label: string;
    hint?: string;
}

export const AVIATION_HAZARD_OPTIONS: readonly HazardOption[] = [
    {
        id: 'manned-helicopters',
        label: 'Manned helicopters',
        hint: 'rescue, medical, law enforcement, park service, news',
    },
    {
        id: 'emergency-response-aircraft',
        label: 'Emergency response aircraft',
        hint: 'in-bound SAR helicopters, medevac',
    },
    {
        id: 'fixed-wing-aircraft',
        label: 'Fixed-wing aircraft',
        hint: 'general aviation, commercial, military',
    },
    {
        id: 'other-uas-drones',
        label: 'Other UAS/drones',
        hint: 'recreational, commercial, military',
    },
    {
        id: 'military-training-routes',
        label: 'Military training routes and operations',
    },
    {
        id: 'low-level-operations',
        label: 'Low-level operations',
        hint: 'crop dusters, pipeline inspection, banner towing',
    },
    {
        id: 'parachute-operations',
        label: 'Parachute operations',
        hint: 'skydivers, jumpers',
    },
    {
        id: 'tethered-balloons',
        label: 'Tethered balloons/aerostats',
    },
    {
        id: 'birds-wildlife',
        label: 'Birds and wildlife',
        hint: 'large birds, flocks',
    },
    {
        id: 'other',
        label: 'Other',
    },
];

export function formatAviationHazards(
    form: Pick<PreflightFormState, 'aviationHazardSelections' | 'aviationHazardsOther'>,
): string {
    const labels = form.aviationHazardSelections
        .map((id) => AVIATION_HAZARD_OPTIONS.find((option) => option.id === id)?.label ?? id);
    const otherText = form.aviationHazardsOther.trim();
    if (otherText) {
        labels.push(`Other: ${otherText}`);
    }
    return labels.length > 0 ? labels.join('; ') : '\u2014';
}

export const GROUND_HAZARD_OPTIONS: readonly HazardOption[] = [
    {
        id: 'power-lines',
        label: 'Power lines and electrical infrastructure',
    },
    {
        id: 'communication-towers',
        label: 'Communication towers and antenna arrays',
    },
    {
        id: 'structures',
        label: 'Structures',
        hint: 'buildings, water towers, cranes, radio masts',
    },
    {
        id: 'dense-vegetation',
        label: 'Dense vegetation and trees',
    },
    {
        id: 'steep-terrain',
        label: 'Steep terrain',
        hint: 'cliffs, canyons, gorges, ravines',
    },
    {
        id: 'water-bodies',
        label: 'Water bodies',
        hint: 'lakes, rivers, reservoirs, flash flood zones',
    },
    {
        id: 'roads-traffic',
        label: 'Roads and vehicle traffic',
    },
    {
        id: 'personnel-flight-area',
        label: 'Personnel in flight area',
        hint: 'rescue teams, civilians, bystanders',
    },
    {
        id: 'crowds-spectators',
        label: 'Crowds and spectators',
    },
    {
        id: 'rough-unstable-ground',
        label: 'Rough or unstable ground',
        hint: 'scree, talus, mud, snow',
    },
    {
        id: 'dust-storms',
        label: 'Dust storms and blowing debris',
    },
    {
        id: 'smoke',
        label: 'Smoke',
        hint: 'wildfires, structure fires',
    },
    {
        id: 'tall-brush',
        label: 'Tall brush and standing crops',
    },
    {
        id: 'underground-utilities',
        label: 'Underground utilities',
        hint: 'cables, natural gas, water lines',
    },
    {
        id: 'rf-interference',
        label: 'RF interference sources',
        hint: 'radio repeaters, cell towers, radar',
    },
    {
        id: 'hazardous-materials',
        label: 'Hazardous materials',
        hint: 'chemical spills, contamination zones',
    },
    {
        id: 'wildlife',
        label: 'Wildlife',
        hint: 'agitated animals that could damage aircraft or be injured',
    },
    {
        id: 'blast-zones',
        label: 'Blast zones or ordnance areas',
    },
    {
        id: 'other',
        label: 'Other',
    },
];

export function formatGroundHazards(
    form: Pick<PreflightFormState, 'groundHazardSelections' | 'groundHazardsOther'>,
): string {
    const labels = form.groundHazardSelections
        .map((id) => GROUND_HAZARD_OPTIONS.find((option) => option.id === id)?.label ?? id);
    const otherText = form.groundHazardsOther.trim();
    if (otherText) {
        labels.push(`Other: ${otherText}`);
    }
    return labels.length > 0 ? labels.join('; ') : '\u2014';
}

export const CREW_HAZARD_OPTIONS: readonly HazardOption[] = [
    {
        id: 'unfamiliar-operating-area',
        label: 'Unfamiliar operating area',
        hint: 'new terrain, limited reconnaissance',
    },
    {
        id: 'unfamiliar-equipment',
        label: 'Unfamiliar equipment',
        hint: 'new platform, untested configuration',
    },
    {
        id: 'inadequate-training',
        label: 'Inadequate training',
        hint: 'new procedures, specialized mission type',
    },
    {
        id: 'impaired-judgment',
        label: 'Impaired judgment',
        hint: 'stress, time pressure, decision fatigue',
    },
    {
        id: 'distraction',
        label: 'Distraction or divided attention',
    },
    {
        id: 'lack-of-coordination',
        label: 'Lack of crew coordination',
        hint: 'poor communication with spotter/VO',
    },
    {
        id: 'complacency',
        label: 'Complacency or overconfidence',
    },
    {
        id: 'illness-impairment',
        label: 'Illness or physical impairment',
        hint: 'fever, medication effects, injury',
    },
    {
        id: 'insufficient-rest',
        label: 'Insufficient rest or fatigue',
        hint: 'extended ops, early callouts',
    },
    {
        id: 'other',
        label: 'Other',
    },
];

export function formatCrewHazards(
    form: Pick<PreflightFormState, 'crewHazardSelections' | 'crewHazardsOther'>,
): string {
    const labels = form.crewHazardSelections
        .map((id) => CREW_HAZARD_OPTIONS.find((option) => option.id === id)?.label ?? id);
    const otherText = form.crewHazardsOther.trim();
    if (otherText) {
        labels.push(`Other: ${otherText}`);
    }
    return labels.length > 0 ? labels.join('; ') : '\u2014';
}

export const EQUIPMENT_HAZARD_OPTIONS: readonly HazardOption[] = [
    {
        id: 'low-battery-health',
        label: 'Low battery health or cycle count',
    },
    {
        id: 'overheating',
        label: 'Overheating',
        hint: 'electronics, battery, motor under load',
    },
    {
        id: 'freezing-cold-soak',
        label: 'Freezing/cold soak',
        hint: 'battery performance loss, condensation on startup',
    },
    {
        id: 'moisture-condensation',
        label: 'Moisture and condensation',
        hint: 'fog, rain, high humidity',
    },
    {
        id: 'firmware-updates',
        label: 'Firmware/software updates',
        hint: 'untested versions, partial installs',
    },
    {
        id: 'outdated-flight-software',
        label: 'Outdated or corrupted flight control software',
    },
    {
        id: 'gimbal-calibration',
        label: 'Gimbal/sensor calibration issues',
    },
    {
        id: 'worn-components',
        label: 'Worn or degraded components',
        hint: 'propellers, bearings, motors',
    },
    {
        id: 'electromagnetic-interference',
        label: 'Electromagnetic interference',
        hint: 'from comms or RF sources',
    },
    {
        id: 'gps-magnetometer-interference',
        label: 'GPS/magnetometer interference or signal loss',
    },
    {
        id: 'untested-modifications',
        label: 'Untested modifications or payloads',
    },
    {
        id: 'lack-of-spare-parts',
        label: 'Lack of spare parts or backup equipment',
    },
    {
        id: 'antenna-damage',
        label: 'Antenna damage or loose connections',
    },
    {
        id: 'other',
        label: 'Other',
    },
];

export function formatEquipmentHazards(
    form: Pick<PreflightFormState, 'equipmentHazardSelections' | 'equipmentHazardsOther'>,
): string {
    const labels = form.equipmentHazardSelections
        .map((id) => EQUIPMENT_HAZARD_OPTIONS.find((option) => option.id === id)?.label ?? id);
    const otherText = form.equipmentHazardsOther.trim();
    if (otherText) {
        labels.push(`Other: ${otherText}`);
    }
    return labels.length > 0 ? labels.join('; ') : '\u2014';
}

export const PREFLIGHT_MAX_MITIGATIONS = 10;
export const PREFLIGHT_MAX_ADDITIONAL_REMOTE_PILOTS = 5;
export const PREFLIGHT_MAX_VISUAL_OBSERVERS = 10;
export const PREFLIGHT_MAX_ADDITIONAL_CREW = 10;

export function formatMitigations(mitigations: string[]): string {
    const items = mitigations.map((entry) => entry.trim()).filter(Boolean);
    if (items.length === 0) return '\u2014';
    return items.map((entry, index) => `${index + 1}. ${entry}`).join('; ');
}

export function formatRemotePilotsReport(
    remotePilots: string[],
    additionalRemotePilots: string[],
): string {
    const additional = additionalRemotePilots.map((entry) => entry.trim()).filter(Boolean);
    const all = [...remotePilots, ...additional];
    return all.length > 0 ? all.join(', ') : '\u2014';
}

export function formatTextList(entries: string[]): string {
    const items = entries.map((entry) => entry.trim()).filter(Boolean);
    return items.length > 0 ? items.join(', ') : '\u2014';
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
