<template>
    <div class='col-12 py-3'>
        <form @submit.prevent='searchFlights'>
            <div class='card mb-3'>
                <div class='card-header'>
                    <div class='card-title'>
                        Search Flights
                    </div>
                </div>
                <div class='card-body'>
                    <label class='form-label'>
                        Vehicle serial (required)
                    </label>
                    <select
                        v-model='selectedSerials'
                        class='form-select'
                        multiple
                        required
                        size='5'
                    >
                        <option
                            v-for='vehicle in vehicles'
                            :key='vehicle.vehicle_serial'
                            :value='vehicle.vehicle_serial'
                        >
                            {{ vehicle.name }} ({{ vehicle.vehicle_serial }})
                        </option>
                    </select>
                    <div class='form-hint'>
                        Hold Cmd/Ctrl to select multiple vehicles. Load vehicles in Settings first.
                    </div>

                    <TablerInput
                        v-model='takeoffSince'
                        class='mt-3'
                        label='Takeoff since (required)'
                        type='datetime-local'
                    />

                    <TablerInput
                        v-model='takeoffBefore'
                        class='mt-3'
                        label='Takeoff before (optional)'
                        type='datetime-local'
                    />

                    <div class='mt-3'>
                        <button
                            type='submit'
                            class='btn btn-primary'
                            :disabled='loading || !apiKey || selectedSerials.length === 0 || !takeoffSince'
                        >
                            Get Flights
                        </button>
                    </div>
                </div>
            </div>
        </form>

        <div class='card mb-3'>
            <div class='card-header'>
                <div class='card-title'>
                    Mission Planning
                </div>
            </div>
            <div class='card-body'>
                <p class='text-muted'>
                    Draw a polygon or line on the map, then create a Skydio mission from it.
                    A Polygon generates a Map Capture mission (download); a LineString generates a
                    waypoint flight you can send to Skydio or download. Press Escape to cancel drawing.
                </p>

                <div class='mb-3 d-flex flex-wrap gap-2'>
                    <button
                        type='button'
                        class='btn btn-outline-primary'
                        :disabled='drawing'
                        @click='drawMissionArea("polygon")'
                    >
                        {{ drawing && drawMode === "polygon" ? "Draw on map…" : "Draw Map Capture (Polygon)" }}
                    </button>
                    <button
                        type='button'
                        class='btn btn-outline-primary'
                        :disabled='drawing'
                        @click='drawMissionArea("linestring")'
                    >
                        {{ drawing && drawMode === "linestring" ? "Draw on map…" : "Draw Waypoint Route (Line)" }}
                    </button>
                </div>

                <div class='mb-3'>
                    <span class='text-muted'>Current geometry: </span>
                    <span>{{ selectionLabel }}</span>
                </div>

                <button
                    type='button'
                    class='btn btn-primary'
                    :disabled='!canImport'
                    @click='openModal'
                >
                    Create Mission from Drawing
                </button>

                <div
                    v-if='missionNotice'
                    class='alert mt-3'
                    :class='missionNoticeIsError ? "alert-danger" : "alert-info"'
                >
                    {{ missionNotice }}
                </div>
            </div>
        </div>

        <div
            v-if='modalOpen'
            class='modal modal-blur show d-block'
            tabindex='-1'
            role='dialog'
            style='background: rgba(0, 0, 0, 0.5);'
        >
            <div
                class='modal-dialog modal-dialog-centered'
                role='document'
            >
                <div class='modal-content'>
                    <div class='modal-header'>
                        <h5 class='modal-title'>
                            {{ modalTitle }}
                        </h5>
                        <button
                            type='button'
                            class='btn-close'
                            aria-label='Close'
                            @click='closeModal'
                        />
                    </div>
                    <div class='modal-body'>
                        <TablerInput
                            v-model='missionForm.displayName'
                            label='Mission Name'
                            placeholder='Mission name'
                        />
                        <TablerInput
                            v-model.number='missionForm.areaScanHeightFt'
                            class='mt-3'
                            type='number'
                            label='Area Scan Height (Above Takeoff) — ft'
                        />
                        <template v-if='missionType === "mapCapture"'>
                            <TablerInput
                                v-model.number='missionForm.areaOverlap'
                                class='mt-3'
                                type='number'
                                label='Set Overlap Percentage'
                            />
                            <TablerInput
                                v-model.number='missionForm.areaSidelap'
                                class='mt-3'
                                type='number'
                                label='Set Side Overlap Percentage'
                            />
                        </template>
                    </div>
                    <div class='modal-footer'>
                        <button
                            type='button'
                            class='btn btn-secondary'
                            @click='closeModal'
                        >
                            Cancel
                        </button>
                        <button
                            v-if='missionType === "waypoint"'
                            type='button'
                            class='btn btn-primary'
                            :disabled='!canGenerate || sending'
                            @click='sendToSkydio'
                        >
                            {{ sending ? 'Sending…' : 'Send to Skydio' }}
                        </button>
                        <button
                            type='button'
                            class='btn'
                            :class='missionType === "waypoint" ? "btn-outline-primary" : "btn-primary"'
                            :disabled='!canGenerate || sending'
                            @click='generateAndDownload'
                        >
                            Download JSON
                        </button>
                    </div>
                </div>
            </div>
        </div>

        <div
            v-if='!apiKey'
            class='alert alert-warning'
        >
            Configure your API key in Settings first.
        </div>

        <TablerLoading
            v-if='loading'
            :compact='true'
            desc='Loading flights from Skydio…'
        />

        <TablerAlert
            v-if='error'
            :err='error'
        />

        <div
            v-if='flights.length > 0'
            class='card'
        >
            <div class='card-header'>
                <div class='card-title'>
                    Flights
                </div>
            </div>
            <div class='card-body'>
                <div
                    v-for='flight in flights'
                    :key='flight.flight_id'
                    class='form-check'
                >
                    <input
                        :id='flight.flight_id'
                        v-model='selectedFlightIds'
                        class='form-check-input'
                        type='checkbox'
                        :value='flight.flight_id'
                    >
                    <label
                        class='form-check-label'
                        :for='flight.flight_id'
                    >
                        {{ flightLabel(flight.vehicle_serial, flight.takeoff) }}
                    </label>
                </div>

                <div class='mt-3'>
                    <label class='form-label'>
                        Elevation (Z)
                    </label>
                    <select
                        v-model='elevationSource'
                        class='form-select'
                    >
                        <option value='height_above_takeoff'>
                            Height above takeoff → MSL
                        </option>
                        <option value='gps_altitude'>
                            GPS altitude (MSL)
                        </option>
                    </select>
                    <div class='form-hint mt-1'>
                        GeoJSON Z is always MSL meters. Takeoff→MSL uses takeoff GPS altitude plus
                        height above takeoff (e.g. ~60 m AGL → ~1659 m MSL, not 60 m on the map).
                    </div>
                </div>

                <div class='mt-3'>
                    <label class='form-label'>
                        Import mode
                    </label>
                    <select
                        v-model='importMode'
                        class='form-select'
                    >
                        <option value='line'>
                            Line route
                        </option>
                        <option value='points'>
                            Points (full HAE per fix)
                        </option>
                        <option value='both'>
                            Both line and points
                        </option>
                    </select>
                    <div class='form-hint mt-1'>
                        Use Points/Both to preserve per-fix HAE through Node-CoT import.
                    </div>
                </div>

                <div class='mt-3'>
                    <button
                        type='button'
                        class='btn btn-primary'
                        :disabled='downloading || selectedFlightIds.length === 0'
                        @click='downloadTelemetry'
                    >
                        Download Telemetry
                    </button>
                    <button
                        type='button'
                        class='btn btn-secondary ms-2'
                        :disabled='importing || selectedFlightIds.length === 0'
                        @click='importTelemetryToMap'
                    >
                        Import to Map
                    </button>
                </div>

                <p class='form-hint mt-2'>
                    Large flights use your webhook telemetry relay (Settings → Telemetry Relay URL, or the same base as Skydio SSE URL).
                    The relay must expose GET {base}/telemetry/{flightId} with CORS for this CloudTAK site — see relay-server/ in the plugin repo.
                </p>

                <TablerLoading
                    v-if='downloading'
                    class='mt-3'
                    :compact='true'
                    desc='Downloading telemetry…'
                />

                <TablerAlert
                    v-if='downloadError'
                    class='mt-3'
                    :err='downloadError'
                />

                <TablerLoading
                    v-if='importing'
                    class='mt-3'
                    :compact='true'
                    desc='Preparing GeoJSON for import…'
                />

                <TablerAlert
                    v-if='importError'
                    class='mt-3'
                    :err='importError'
                />
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { TablerInput, TablerLoading, TablerAlert } from '@tak-ps/vue-tabler';
import { createMissionTemplate, getFlightTelemetry, listFlights } from '../api/client';
import { ProxyError } from '../api/proxy';
import type { SkydioFlight, SkydioVehicle } from '../types';
import type { Feature } from '../../../src/types.ts';
import { useMapStore } from '../../../src/stores/map.ts';
import { drawGeometry, type DrawMode } from '../lib/location-picker.ts';
import { getPluginMap } from '../lib/plugin-map.ts';
import { normalize_geojson } from '@tak-ps/node-cot/normalize_geojson';
import { resolveSkydioTelemetryRelayUrl } from '../lib/sse-url';
import {
    FEET_TO_METERS,
    buildMapCaptureMission,
    buildWaypointMission,
    buildWaypointTemplate,
    downloadMissionJson,
    lineStringCoords,
    polygonOuterRing,
} from '../utils/skydioMission';
import {
    downloadGeoJson,
    flightLabel,
    telemetryToGeoJson,
    type TelemetryElevationSource,
    type TelemetryGeoJsonMode,
} from '../utils/telemetryGeoJson';

const props = defineProps<{
    apiKey: string;
    vehicles: SkydioVehicle[];
    telemetryRelayUrl: string;
    skydioSseUrl: string;
}>();

function effectiveTelemetryRelayUrl(): string {
    return resolveSkydioTelemetryRelayUrl(props.telemetryRelayUrl, props.skydioSseUrl);
}

function telemetryFetchOpts(): { telemetryRelayUrl: string; requireRelay: boolean } {
    const relayUrl = effectiveTelemetryRelayUrl();
    return {
        telemetryRelayUrl: relayUrl,
        requireRelay: Boolean(relayUrl),
    };
}

const selectedSerials = ref<string[]>([]);
const takeoffSince = ref('');
const takeoffBefore = ref('');
const flights = ref<SkydioFlight[]>([]);
const selectedFlightIds = ref<string[]>([]);
const loading = ref(false);
const downloading = ref(false);
const importing = ref(false);
const importMode = ref<TelemetryGeoJsonMode>('line');
const elevationSource = ref<TelemetryElevationSource>('height_above_takeoff');
const error = ref<Error | undefined>();
const downloadError = ref<Error | undefined>();
const importError = ref<Error | undefined>();

const drawnFeature = ref<Feature | null>(null);
const drawing = ref(false);
const drawMode = ref<DrawMode | null>(null);

const modalOpen = ref(false);
const missionNotice = ref<string | null>(null);
const missionNoticeIsError = ref(false);
const sending = ref(false);
const missionForm = reactive({
    displayName: '',
    areaScanHeightFt: 300,
    areaOverlap: 50,
    areaSidelap: 30,
});

type MissionType = 'mapCapture' | 'waypoint';

interface SelectedInfo {
    feature: Feature;
    geometryType: string;
    callsign: string;
}

const selected = computed<SelectedInfo | null>(() => {
    const feature = drawnFeature.value;
    if (!feature?.geometry) return null;

    const callsign = typeof feature.properties?.callsign === 'string'
        ? feature.properties.callsign
        : '';

    return {
        feature,
        geometryType: feature.geometry.type,
        callsign,
    };
});

const missionType = computed<MissionType | null>(() => {
    switch (selected.value?.geometryType) {
        case 'Polygon': return 'mapCapture';
        case 'LineString': return 'waypoint';
        default: return null;
    }
});

const selectionLabel = computed(() => {
    const info = selected.value;
    if (!info) return 'None — draw a polygon or line on the map.';
    const name = info.callsign || '(drawn)';
    return `${name} — ${info.geometryType}`;
});

const canImport = computed(() => missionType.value !== null);

const canGenerate = computed(() => Boolean(missionForm.displayName.trim()));

const modalTitle = computed(() =>
    missionType.value === 'waypoint' ? 'New Waypoint Flight' : 'New Map Capture Mission');

async function drawMissionArea(mode: 'polygon' | 'linestring'): Promise<void> {
    const map = getPluginMap();
    if (!map) {
        missionNotice.value = 'Map is not available.';
        missionNoticeIsError.value = true;
        return;
    }

    drawing.value = true;
    drawMode.value = mode;
    missionNotice.value = null;
    missionNoticeIsError.value = false;

    try {
        const feature = await drawGeometry(map, mode);
        drawnFeature.value = {
            type: 'Feature',
            geometry: feature.geometry as Feature['geometry'],
            properties: {},
        };
    } catch (err) {
        if (!(err instanceof Error && err.message === 'cancelled')) {
            missionNotice.value = err instanceof Error ? err.message : 'Failed to draw geometry.';
            missionNoticeIsError.value = true;
        }
    } finally {
        drawing.value = false;
        drawMode.value = null;
    }
}

function openModal(): void {
    missionNotice.value = null;
    missionNoticeIsError.value = false;

    const info = selected.value;
    if (!info) {
        missionNotice.value = 'Draw a polygon or line on the map first.';
        missionNoticeIsError.value = true;
        return;
    }

    if (missionType.value === null) {
        missionNotice.value = info.geometryType === 'Point'
            ? 'Point flights are not supported yet. Draw a Polygon (Map Capture) or LineString (waypoint flight).'
            : `Unsupported geometry "${info.geometryType}". Draw a Polygon or LineString.`;
        missionNoticeIsError.value = true;
        return;
    }

    missionForm.displayName = info.callsign
        || (missionType.value === 'waypoint' ? 'Skydio Waypoint Flight' : 'Skydio Map Capture');
    missionForm.areaScanHeightFt = 300;
    missionForm.areaOverlap = 50;
    missionForm.areaSidelap = 30;
    modalOpen.value = true;
}

function closeModal(): void {
    modalOpen.value = false;
}

function safeFileName(displayName: string): string {
    return displayName.replace(/[^a-z0-9_-]+/gi, '_') || 'skydio-mission';
}

function generateAndDownload(): void {
    const info = selected.value;
    if (!info) {
        missionNotice.value = 'Drawing changed — draw again and try again.';
        missionNoticeIsError.value = true;
        modalOpen.value = false;
        return;
    }

    const displayName = missionForm.displayName.trim();
    let mission: Record<string, unknown>;

    if (missionType.value === 'mapCapture') {
        const ring = polygonOuterRing(info.feature.geometry);
        if (!ring) {
            missionNotice.value = 'Selected feature is not a valid Polygon.';
            missionNoticeIsError.value = true;
            modalOpen.value = false;
            return;
        }
        mission = buildMapCaptureMission({
            displayName,
            areaScanHeightMeters: missionForm.areaScanHeightFt * FEET_TO_METERS,
            areaOverlap: missionForm.areaOverlap,
            areaSidelap: missionForm.areaSidelap,
            ring,
        });
    } else {
        const line = lineStringCoords(info.feature.geometry);
        if (!line) {
            missionNotice.value = 'Selected feature is not a valid LineString.';
            missionNoticeIsError.value = true;
            modalOpen.value = false;
            return;
        }
        mission = buildWaypointMission({
            displayName,
            waypointZMeters: missionForm.areaScanHeightFt * FEET_TO_METERS,
            line,
        });
    }

    const safeName = safeFileName(displayName);
    downloadMissionJson(mission, `${safeName}.json`);

    modalOpen.value = false;
    missionNotice.value = `Downloaded "${safeName}.json". Import it into Skydio Cloud.`;
    missionNoticeIsError.value = false;
}

async function sendToSkydio(): Promise<void> {
    const info = selected.value;
    if (!info || missionType.value !== 'waypoint') {
        missionNotice.value = 'Drawing changed — draw a LineString and try again.';
        missionNoticeIsError.value = true;
        modalOpen.value = false;
        return;
    }

    const line = lineStringCoords(info.feature.geometry);
    if (!line) {
        missionNotice.value = 'Selected feature is not a valid LineString.';
        missionNoticeIsError.value = true;
        return;
    }

    if (!props.apiKey.trim()) {
        missionNotice.value = 'Add your Skydio API key in Settings before sending.';
        missionNoticeIsError.value = true;
        return;
    }

    sending.value = true;
    missionNotice.value = null;

    try {
        const template = await createMissionTemplate(props.apiKey, buildWaypointTemplate({
            name: missionForm.displayName.trim(),
            waypointZFeet: missionForm.areaScanHeightFt,
            line,
        }));

        modalOpen.value = false;
        missionNotice.value = `Sent to Skydio — created mission template${template.uuid ? ` (${template.uuid})` : ''}.`;
        missionNoticeIsError.value = false;
    } catch (err) {
        missionNotice.value = err instanceof ProxyError || err instanceof Error
            ? err.message
            : 'Failed to send mission to Skydio';
        missionNoticeIsError.value = true;
    } finally {
        sending.value = false;
    }
}

function toError(err: unknown, fallback: string): Error {
    if (err instanceof ProxyError || err instanceof Error) {
        return err;
    }
    return new Error(fallback);
}

function toIso8601(localDatetime: string): string {
    return new Date(localDatetime).toISOString();
}

async function searchFlights(): Promise<void> {
    if (!props.apiKey || selectedSerials.value.length === 0 || !takeoffSince.value) {
        return;
    }

    loading.value = true;
    error.value = undefined;
    flights.value = [];
    selectedFlightIds.value = [];

    try {
        flights.value = await listFlights(props.apiKey, {
            takeoffSince: toIso8601(takeoffSince.value),
            takeoffBefore: takeoffBefore.value ? toIso8601(takeoffBefore.value) : undefined,
            vehicleSerials: selectedSerials.value,
        });
    } catch (err) {
        error.value = toError(err, 'Failed to load flights');
    } finally {
        loading.value = false;
    }
}

function sanitizeFilename(label: string): string {
    return label.replace(/[^\w.-]+/g, '_').slice(0, 80) || 'flight';
}

async function downloadTelemetry(): Promise<void> {
    if (!props.apiKey || selectedFlightIds.value.length === 0) return;

    downloading.value = true;
    downloadError.value = undefined;

    const failures: string[] = [];
    let successCount = 0;

    try {
        for (const flightId of selectedFlightIds.value) {
            const flight = flights.value.find((item) => item.flight_id === flightId);
            const label = flight
                ? flightLabel(flight.vehicle_serial, flight.takeoff)
                : flightId;

            try {
                const telemetry = await getFlightTelemetry(
                    props.apiKey,
                    flightId,
                    telemetryFetchOpts(),
                );
                const collection = telemetryToGeoJson(
                    telemetry,
                    importMode.value,
                    elevationSource.value,
                );
                downloadGeoJson(collection, `skydio-telemetry-${sanitizeFilename(label)}.geojson`);
                successCount += 1;
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                failures.push(`${label}: ${message}`);
            }
        }

        if (failures.length > 0) {
            const summary = successCount > 0
                ? `Downloaded ${successCount} flight(s). ${failures.length} failed:\n`
                : 'Telemetry download failed:\n';
            downloadError.value = new Error(summary + failures.join('\n'));
        }
    } finally {
        downloading.value = false;
    }
}

async function geoJsonCollectionToImportFeatures(
    collection: ReturnType<typeof telemetryToGeoJson>,
    folderName: string,
): Promise<Feature[]> {
    const features: Feature[] = [];

    for (const feat of collection.features) {
        const norm = await normalize_geojson(feat);
        const creator = norm.properties.creator as Feature['properties']['creator'];
        features.push({
            ...(norm as Feature),
            path: `/${folderName}/`,
            properties: {
                ...(norm.properties as Feature['properties']),
                creator: creator ? { ...creator, callsign: creator.callsign ?? '' } : undefined,
            },
        });
    }

    return features;
}

async function importTelemetryToMap(): Promise<void> {
    if (!props.apiKey || selectedFlightIds.value.length === 0) return;

    importing.value = true;
    importError.value = undefined;

    const failures: string[] = [];
    let successCount = 0;

    // CloudTAK map store drives the GeoJSON import modal.
    const mapStore = useMapStore();

    try {
        const allImportFeatures: Feature[] = [];
        for (const flightId of selectedFlightIds.value) {
            const flight = flights.value.find((item) => item.flight_id === flightId);
            const label = flight
                ? flightLabel(flight.vehicle_serial, flight.takeoff)
                : flightId;

            const folderName = `skydio-telemetry-${sanitizeFilename(label)}`;

            try {
                const telemetry = await getFlightTelemetry(
                    props.apiKey,
                    flightId,
                    telemetryFetchOpts(),
                );
                const collection = telemetryToGeoJson(
                    telemetry,
                    importMode.value,
                    elevationSource.value,
                );
                const importFeatures = await geoJsonCollectionToImportFeatures(collection, folderName);
                allImportFeatures.push(...importFeatures);
                successCount += 1;
            } catch (err) {
                const message = err instanceof Error ? err.message : 'Unknown error';
                failures.push(`${label}: ${message}`);
            }
        }

        if (allImportFeatures.length > 0) {
            mapStore.toImport = allImportFeatures;
        }

        if (failures.length > 0) {
            const summary = successCount > 0
                ? `Prepared GeoJSON for ${successCount} flight(s). ${failures.length} failed:\n`
                : 'GeoJSON import preparation failed:\n';
            importError.value = new Error(summary + failures.join('\n'));
        }
    } finally {
        importing.value = false;
    }
}
</script>
