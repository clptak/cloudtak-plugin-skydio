<template>
    <div class='col-12 py-3'>
        <!-- Configuration upload -->
        <div class='card mb-3'>
            <div class='card-header'>
                <div class='card-title'>
                    Configuration
                </div>
            </div>
            <div class='card-body'>
                <p class='text-muted'>
                    Upload a JSON file to populate the Land Manager / Owner, Platform, and Remote
                    Pilot lists, and to supply per-platform performance specifications. Saved per
                    CloudTAK user in this browser.
                </p>
                <input
                    ref='configInput'
                    class='form-control'
                    type='file'
                    accept='.json,application/json'
                    @change='onConfigFile'
                >
                <div class='form-hint mt-1'>
                    Expected keys: <code>landManagers</code>, <code>platforms</code>
                    (with optional <code>specs</code>), <code>remotePilots</code>.
                </div>

                <div
                    v-if='configNotice'
                    class='alert mt-3'
                    :class='configError ? "alert-danger" : "alert-success"'
                >
                    {{ configNotice }}
                </div>
            </div>
        </div>

        <!-- Location / Airspace / Platform -->
        <div class='card mb-3'>
            <div class='card-header'>
                <div class='card-title'>
                    Location | Airspace | Platform
                </div>
            </div>
            <div class='card-body'>
                <div class='mb-3'>
                    <span class='text-muted'>Map point: </span>
                    <span>{{ form.location || 'No point selected — click a point on the map.' }}</span>
                    <button
                        type='button'
                        class='btn btn-sm btn-outline-primary ms-2'
                        :disabled='!hasMapPoint'
                        @click='useMapPoint'
                    >
                        Use Map Selection
                    </button>
                </div>

                <TablerInput
                    v-model='form.dateTime'
                    label='Date / Time'
                    type='datetime-local'
                />
                <TablerInput
                    v-model='form.activityNumber'
                    class='mt-3'
                    label='DR # (Activity #)'
                />
                <TablerInput
                    v-model='form.demaNumber'
                    class='mt-3'
                    label='DEMA (State SAR Mission #)'
                />

                <label class='form-label mt-3'>Airspace Class</label>
                <select
                    v-model='form.airspaceClass'
                    class='form-select'
                >
                    <option value=''>
                        Select…
                    </option>
                    <option
                        v-for='cls in AIRSPACE_CLASSES'
                        :key='cls'
                        :value='cls'
                    >
                        {{ cls }}
                    </option>
                </select>

                <TablerInput
                    v-model.number='form.maxAltitudeAglFt'
                    class='mt-3'
                    type='number'
                    label='Maximum Permitted Altitude (AGL) — ft'
                />

                <label class='form-label mt-3'>LAANC Required</label>
                <select
                    v-model='form.laancRequired'
                    class='form-select'
                >
                    <option value=''>
                        Select…
                    </option>
                    <option
                        v-for='opt in YES_NO'
                        :key='opt'
                        :value='opt'
                    >
                        {{ opt }}
                    </option>
                </select>

                <TablerInput
                    v-model='form.laancAuthNumber'
                    class='mt-3'
                    label='LAANC Authorization #'
                />

                <label class='form-label mt-3'>Platform (drone for performance check)</label>
                <select
                    v-model='form.platform'
                    class='form-select'
                >
                    <option value=''>
                        Select…
                    </option>
                    <option
                        v-for='platform in config.platforms'
                        :key='platform.name'
                        :value='platform.name'
                    >
                        {{ platform.name }}{{ platform.specs ? ' (specs available)' : '' }}
                    </option>
                </select>
            </div>
        </div>

        <!-- Flight Type -->
        <div class='card mb-3'>
            <div class='card-header'>
                <div class='card-title'>
                    Flight Type
                </div>
            </div>
            <div class='card-body'>
                <label class='form-label'>Flight Category</label>
                <select
                    v-model='form.flightCategory'
                    class='form-select'
                >
                    <option value=''>
                        Select…
                    </option>
                    <option
                        v-for='opt in FLIGHT_CATEGORIES'
                        :key='opt'
                        :value='opt'
                    >
                        {{ opt }}
                    </option>
                </select>

                <label class='form-label mt-3'>Mission Type</label>
                <select
                    v-model='form.missionType'
                    class='form-select'
                >
                    <option value=''>
                        Select…
                    </option>
                    <option
                        v-for='opt in MISSION_TYPES'
                        :key='opt'
                        :value='opt'
                    >
                        {{ opt }}
                    </option>
                </select>

                <label class='form-label mt-3'>Flight Rule(s)</label>
                <label
                    v-for='opt in FLIGHT_RULES'
                    :key='opt'
                    class='form-check'
                >
                    <input
                        v-model='form.flightRules'
                        class='form-check-input'
                        type='checkbox'
                        :value='opt'
                    >
                    <span class='form-check-label'>{{ opt }}</span>
                </label>

                <label class='form-label mt-3'>Land Manager / Owner</label>
                <div
                    v-if='config.landManagers.length === 0'
                    class='form-hint'
                >
                    Upload a config file to populate this list.
                </div>
                <label
                    v-for='manager in config.landManagers'
                    :key='manager'
                    class='form-check'
                >
                    <input
                        v-model='form.landManagers'
                        class='form-check-input'
                        type='checkbox'
                        :value='manager'
                    >
                    <span class='form-check-label'>{{ manager }}</span>
                </label>

                <label class='form-label mt-3'>Land Manager Permission Required</label>
                <select
                    v-model='form.landManagerPermissionRequired'
                    class='form-select'
                >
                    <option value=''>
                        Select…
                    </option>
                    <option
                        v-for='opt in YES_NO'
                        :key='opt'
                        :value='opt'
                    >
                        {{ opt }}
                    </option>
                </select>

                <label class='form-label mt-3'>Map Sources</label>
                <label
                    v-for='opt in MAP_SOURCES'
                    :key='opt'
                    class='form-check'
                >
                    <input
                        v-model='form.mapSources'
                        class='form-check-input'
                        type='checkbox'
                        :value='opt'
                    >
                    <span class='form-check-label'>{{ opt }}</span>
                </label>
                <TablerInput
                    v-model='form.mapSourceOther'
                    class='mt-2'
                    label='If other, enter source(s)'
                />

                <label class='form-label mt-3'>Data Collection</label>
                <label
                    v-for='opt in DATA_COLLECTION'
                    :key='opt'
                    class='form-check'
                >
                    <input
                        v-model='form.dataCollection'
                        class='form-check-input'
                        type='checkbox'
                        :value='opt'
                    >
                    <span class='form-check-label'>{{ opt }}</span>
                </label>
                <TablerInput
                    v-model='form.dataCollectionOther'
                    class='mt-2'
                    label='If other, list'
                />
            </div>
        </div>

        <!-- Weather -->
        <div class='card mb-3'>
            <div class='card-header'>
                <div class='card-title'>
                    Weather
                </div>
                <div class='card-actions'>
                    <button
                        type='button'
                        class='btn btn-sm btn-primary'
                        :disabled='!hasMapPoint || weatherLoading'
                        @click='fetchWeather'
                    >
                        {{ weatherLoading ? 'Fetching…' : 'Auto-fill from NWS' }}
                    </button>
                </div>
            </div>
            <div class='card-body'>
                <p class='text-muted'>
                    Select a point on the map, then auto-fill current conditions from the National
                    Weather Service. US coverage only; all fields can be edited.
                </p>

                <TablerAlert
                    v-if='weatherError'
                    :err='weatherError'
                />

                <label class='form-label'>Forecast Attached (DataSync)</label>
                <select
                    v-model='form.forecastAttached'
                    class='form-select'
                >
                    <option value=''>
                        Select…
                    </option>
                    <option
                        v-for='opt in YES_NO'
                        :key='opt'
                        :value='opt'
                    >
                        {{ opt }}
                    </option>
                </select>

                <TablerInput
                    v-model='form.weather.source'
                    class='mt-3'
                    label='Weather Source(s)'
                />
                <div class='row'>
                    <div class='col-6'>
                        <TablerInput
                            v-model.number='form.weather.temperatureF'
                            class='mt-3'
                            type='number'
                            label='Temperature (°F)'
                        />
                    </div>
                    <div class='col-6'>
                        <TablerInput
                            v-model.number='form.weather.dewPointF'
                            class='mt-3'
                            type='number'
                            label='Dew Point (°F)'
                        />
                    </div>
                    <div class='col-6'>
                        <TablerInput
                            v-model.number='form.weather.windSpeedMph'
                            class='mt-3'
                            type='number'
                            label='Wind Speed (mph)'
                        />
                    </div>
                    <div class='col-6'>
                        <TablerInput
                            v-model='form.weather.windDirection'
                            class='mt-3'
                            label='Wind Direction'
                        />
                    </div>
                    <div class='col-6'>
                        <TablerInput
                            v-model='form.weather.kpIndex'
                            class='mt-3'
                            label='KP Index'
                        />
                    </div>
                    <div class='col-6'>
                        <TablerInput
                            v-model.number='form.weather.visibilityMiles'
                            class='mt-3'
                            type='number'
                            label='Visibility (mi)'
                        />
                    </div>
                    <div class='col-6'>
                        <TablerInput
                            v-model.number='form.weather.ceilingFt'
                            class='mt-3'
                            type='number'
                            label='Ceiling (ft)'
                        />
                    </div>
                </div>
            </div>
        </div>

        <!-- Performance Check -->
        <div class='card mb-3'>
            <div class='card-header'>
                <div class='card-title'>
                    Performance Check
                </div>
                <div class='card-actions'>
                    <span
                        class='badge'
                        :class='overallBadgeClass'
                    >
                        {{ overallBadgeLabel }}
                    </span>
                </div>
            </div>
            <div class='card-body'>
                <p
                    v-if='evaluation.metrics.length === 0'
                    class='text-muted mb-0'
                >
                    Select a platform with performance specs (from the uploaded config) to evaluate
                    the current weather.
                </p>
                <table
                    v-else
                    class='table table-sm mb-0'
                >
                    <thead>
                        <tr>
                            <th>Metric</th>
                            <th>Current</th>
                            <th>Limit</th>
                            <th>Result</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for='metric in evaluation.metrics'
                            :key='metric.label'
                        >
                            <td>{{ metric.label }}</td>
                            <td>{{ metric.value }}</td>
                            <td>{{ metric.limit }}</td>
                            <td>
                                <span
                                    class='badge'
                                    :class='metric.pass ? "bg-green text-white" : "bg-red text-white"'
                                >
                                    {{ metric.pass ? 'PASS' : 'FAIL' }}
                                </span>
                            </td>
                        </tr>
                    </tbody>
                </table>
                <div
                    v-if='evaluation.metrics.length > 0 && !evaluation.overallPass'
                    class='alert alert-warning mt-3 mb-0'
                >
                    Current weather is outside the selected platform's specifications. Review before
                    flight. You can still generate a report.
                </div>
            </div>
        </div>

        <!-- Operational Hazards -->
        <div class='card mb-3'>
            <div class='card-header'>
                <div class='card-title'>
                    Operational Hazards
                </div>
            </div>
            <div class='card-body'>
                <TablerInput
                    v-model='form.aviationHazards'
                    label='Aviation Hazards'
                />
                <TablerInput
                    v-model='form.groundHazards'
                    class='mt-3'
                    label='Ground-based Hazards'
                />
                <TablerInput
                    v-model='form.crewEquipmentHazards'
                    class='mt-3'
                    label='Crew / Equipment Hazards'
                />
            </div>
        </div>

        <!-- Logistics -->
        <div class='card mb-3'>
            <div class='card-header'>
                <div class='card-title'>
                    Logistics
                </div>
            </div>
            <div class='card-body'>
                <label class='form-label'>Remote Pilot(s)</label>
                <div
                    v-if='config.remotePilots.length === 0'
                    class='form-hint'
                >
                    Upload a config file to populate this list.
                </div>
                <label
                    v-for='pilot in config.remotePilots'
                    :key='pilot.id'
                    class='form-check'
                >
                    <input
                        v-model='form.remotePilots'
                        class='form-check-input'
                        type='checkbox'
                        :value='pilotLabel(pilot)'
                    >
                    <span class='form-check-label'>{{ pilotLabel(pilot) }}</span>
                </label>

                <label class='form-label mt-3'>Visual Observer(s)</label>
                <TablerInput
                    v-for='(_, index) in form.visualObservers'
                    :key='index'
                    v-model='form.visualObservers[index]'
                    class='mb-2'
                    :placeholder='`VO #${index + 1}`'
                />

                <TablerInput
                    v-model='form.crewMembers'
                    class='mt-2'
                    label='Additional Crew Members (by badge #)'
                />
            </div>
        </div>

        <!-- Generate -->
        <div class='card mb-3'>
            <div class='card-header'>
                <div class='card-title'>
                    Generate Report
                </div>
            </div>
            <div class='card-body'>
                <TablerInput
                    v-model='reportTitle'
                    label='Report Title'
                    placeholder='Pre-Flight Mission Packet'
                />
                <button
                    type='button'
                    class='btn btn-primary mt-3'
                    @click='generateReport'
                >
                    Generate Report
                </button>

                <TablerAlert
                    v-if='generateError'
                    class='mt-3'
                    :err='generateError'
                />
            </div>
        </div>

        <!-- Reports list -->
        <div class='card'>
            <div class='card-header'>
                <div class='card-title'>
                    Reports
                </div>
            </div>
            <div class='card-body'>
                <p
                    v-if='reports.length === 0'
                    class='text-muted mb-0'
                >
                    No reports yet. Fill in the form and generate one above.
                </p>
                <div
                    v-if='actionNotice'
                    class='alert mb-3'
                    :class='actionError ? "alert-danger" : "alert-success"'
                >
                    {{ actionNotice }}
                </div>
                <table
                    v-if='reports.length > 0'
                    class='table'
                >
                    <thead>
                        <tr>
                            <th>Title</th>
                            <th>Created</th>
                            <th>Performance</th>
                            <th class='text-end'>
                                Actions
                            </th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr
                            v-for='report in reports'
                            :key='report.id'
                        >
                            <td>{{ report.title }}</td>
                            <td>{{ formatDate(report.createdAt) }}</td>
                            <td>
                                <span
                                    class='badge'
                                    :class='reportBadgeClass(report.overallPass)'
                                >
                                    {{ reportBadgeLabel(report.overallPass) }}
                                </span>
                            </td>
                            <td class='text-end'>
                                <button
                                    type='button'
                                    class='btn btn-sm btn-primary'
                                    :disabled='attachingId === report.id'
                                    @click='attachReport(report)'
                                >
                                    {{ attachingId === report.id ? 'Attaching…' : 'Attach to Mission' }}
                                </button>
                                <button
                                    type='button'
                                    class='btn btn-sm btn-secondary ms-2'
                                    @click='exportReport(report)'
                                >
                                    Export PDF
                                </button>
                                <button
                                    type='button'
                                    class='btn btn-sm btn-outline-danger ms-2'
                                    @click='deleteReport(report)'
                                >
                                    Delete
                                </button>
                            </td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue';
import { TablerInput, TablerAlert } from '@tak-ps/vue-tabler';
import type { Feature } from '../../../src/types.ts';
import {
    EMPTY_WEATHER,
    type PreflightConfig,
    type PreflightFormState,
    type PreflightReport,
    type RemotePilot,
} from '../types';
import {
    loadPreflightConfig,
    parsePreflightConfig,
    savePreflightConfig,
    PreflightConfigError,
} from '../storage/preflightConfig';
import {
    addPreflightReport,
    deletePreflightReport,
    loadPreflightReports,
} from '../storage/preflightReports';
import { fetchPointWeather } from '../utils/weather';
import { evaluatePerformance } from '../utils/preflightPerformance';
import {
    buildPreflightPdf,
    base64ToPdfBlob,
    downloadPdfFromBase64,
    pdfToBase64,
} from '../utils/preflightPdf';
import { attachReportToMission } from '../utils/missionAttachment';

const props = defineProps<{
    activeFeature: Feature | null;
    missionGuid?: string;
}>();

const AIRSPACE_CLASSES = ['G', 'D', 'E', 'C', 'B'];
const YES_NO = ['Yes', 'No'];
const FLIGHT_CATEGORIES = [
    'Emergency Services',
    'Law Enforcement',
    'Training',
    'Testing',
    'Function Test / Return to Service',
];
const MISSION_TYPES = [
    'Search and Rescue',
    'Evidence Search',
    'Special Event',
    'Tactical Support',
    'Search Warrant',
    'Crime Scene',
    'Accident Scene',
    'Other',
];
const FLIGHT_RULES = [
    'FAA Part 107',
    'Certificate of Authorization (COA)',
    'Special Government Interest (SGI)',
];
const MAP_SOURCES = [
    'FAA Section (Required)',
    'CloudTAK FAA Layers (Required)',
    'Aerial Imagery',
    'Other',
];
const DATA_COLLECTION = [
    'High Resolution Photographs (Loc8)',
    'Radiometric (RDT)',
    'Photogrammetry',
    'Evidentiary Photographs / Video',
    'None',
    'Other',
];

function createForm(): PreflightFormState {
    return {
        dateTime: '',
        location: '',
        latitude: null,
        longitude: null,
        activityNumber: '',
        demaNumber: '',
        airspaceClass: '',
        maxAltitudeAglFt: null,
        laancRequired: '',
        laancAuthNumber: '',
        flightCategory: '',
        missionType: '',
        flightRules: [],
        landManagers: [],
        landManagerPermissionRequired: '',
        mapSources: [],
        mapSourceOther: '',
        platform: '',
        platformOther: '',
        dataCollection: [],
        dataCollectionOther: '',
        forecastAttached: '',
        weather: { ...EMPTY_WEATHER },
        aviationHazards: '',
        groundHazards: '',
        crewEquipmentHazards: '',
        remotePilots: [],
        visualObservers: ['', '', '', '', ''],
        crewMembers: '',
    };
}

const config = reactive<PreflightConfig>(loadPreflightConfig());
const form = reactive<PreflightFormState>(createForm());
const reports = ref<PreflightReport[]>(loadPreflightReports());

const configInput = ref<HTMLInputElement | null>(null);
const configNotice = ref<string | null>(null);
const configError = ref(false);

const weatherLoading = ref(false);
const weatherError = ref<Error | undefined>();

const reportTitle = ref('');
const generateError = ref<Error | undefined>();

const attachingId = ref<string | null>(null);
const actionNotice = ref<string | null>(null);
const actionError = ref(false);

function pilotLabel(pilot: RemotePilot): string {
    return pilot.name ? `${pilot.id} — ${pilot.name}` : pilot.id;
}

/** Find the first [lon, lat] pair in an arbitrarily nested GeoJSON coordinate array. */
function firstPosition(coords: unknown): [number, number] | null {
    if (Array.isArray(coords)) {
        if (typeof coords[0] === 'number' && typeof coords[1] === 'number') {
            return [coords[0], coords[1]];
        }
        for (const child of coords) {
            const found = firstPosition(child);
            if (found) return found;
        }
    }
    return null;
}

const mapPoint = computed<{ lat: number; lon: number } | null>(() => {
    const geometry = props.activeFeature?.geometry;
    if (!geometry || !('coordinates' in geometry)) return null;
    const position = firstPosition(geometry.coordinates);
    if (!position) return null;
    return { lon: position[0], lat: position[1] };
});

const hasMapPoint = computed(() => mapPoint.value !== null);

const selectedPlatform = computed(() =>
    config.platforms.find((platform) => platform.name === form.platform));

const evaluation = computed(() =>
    evaluatePerformance(form.weather, selectedPlatform.value?.specs));

const overallBadgeLabel = computed(() => {
    if (evaluation.value.metrics.length === 0) return 'NOT EVALUATED';
    return evaluation.value.overallPass ? 'WITHIN SPECS' : 'OUTSIDE SPECS';
});

const overallBadgeClass = computed(() => {
    if (evaluation.value.metrics.length === 0) return 'bg-secondary text-white';
    return evaluation.value.overallPass ? 'bg-green text-white' : 'bg-red text-white';
});

function reportBadgeLabel(pass: boolean | null): string {
    if (pass === null) return 'N/A';
    return pass ? 'WITHIN SPECS' : 'OUTSIDE SPECS';
}

function reportBadgeClass(pass: boolean | null): string {
    if (pass === null) return 'bg-secondary text-white';
    return pass ? 'bg-green text-white' : 'bg-red text-white';
}

function formatDate(iso: string): string {
    const date = new Date(iso);
    return Number.isNaN(date.getTime()) ? iso : date.toLocaleString();
}

function useMapPoint(): void {
    const point = mapPoint.value;
    if (!point) return;
    form.latitude = point.lat;
    form.longitude = point.lon;
    form.location = `POINT (${point.lon.toFixed(6)} ${point.lat.toFixed(6)})`;
}

async function onConfigFile(event: Event): Promise<void> {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    configNotice.value = null;
    configError.value = false;

    try {
        const text = await file.text();
        const parsed = parsePreflightConfig(text);
        Object.assign(config, parsed);
        savePreflightConfig(parsed);
        configNotice.value = `Loaded ${parsed.landManagers.length} land manager(s), `
            + `${parsed.platforms.length} platform(s), ${parsed.remotePilots.length} pilot(s).`;
    } catch (err) {
        configError.value = true;
        configNotice.value = err instanceof PreflightConfigError || err instanceof Error
            ? err.message
            : 'Failed to read config file.';
    } finally {
        if (configInput.value) configInput.value.value = '';
    }
}

async function fetchWeather(): Promise<void> {
    const point = mapPoint.value;
    if (!point) return;

    useMapPoint();
    weatherLoading.value = true;
    weatherError.value = undefined;

    try {
        const weather = await fetchPointWeather(point.lat, point.lon);
        // Preserve any manually-entered KP index since NWS does not provide it.
        Object.assign(form.weather, weather, {
            kpIndex: weather.kpIndex || form.weather.kpIndex,
        });
        if (!form.forecastAttached) form.forecastAttached = 'Yes';
    } catch (err) {
        weatherError.value = err instanceof Error ? err : new Error('Failed to fetch weather');
    } finally {
        weatherLoading.value = false;
    }
}

function sanitizeFileName(name: string): string {
    return name.replace(/[^a-z0-9_-]+/gi, '_').replace(/^_+|_+$/g, '') || 'preflight-report';
}

function generateReport(): void {
    generateError.value = undefined;

    try {
        const generatedAt = new Date().toLocaleString();
        const title = reportTitle.value.trim() || `Pre-Flight ${generatedAt}`;
        const doc = buildPreflightPdf({
            form,
            evaluation: evaluation.value,
            platformLabel: form.platform || form.platformOther || '—',
            generatedAt,
        });
        const report: PreflightReport = {
            id: crypto.randomUUID(),
            title,
            createdAt: new Date().toISOString(),
            location: form.location,
            platform: form.platform,
            overallPass: evaluation.value.metrics.length === 0 ? null : evaluation.value.overallPass,
            fileName: `${sanitizeFileName(title)}.pdf`,
            pdfBase64: pdfToBase64(doc),
        };
        reports.value = addPreflightReport(report);
    } catch (err) {
        generateError.value = err instanceof Error
            ? new Error(`Could not save report (browser storage may be full): ${err.message}`)
            : new Error('Failed to generate report');
    }
}

function exportReport(report: PreflightReport): void {
    downloadPdfFromBase64(report.pdfBase64, report.fileName);
}

async function attachReport(report: PreflightReport): Promise<void> {
    attachingId.value = report.id;
    actionNotice.value = null;
    actionError.value = false;

    try {
        const blob = base64ToPdfBlob(report.pdfBase64);
        const result = await attachReportToMission(props.missionGuid ?? '', blob, report.fileName);
        actionNotice.value = result.message;
        actionError.value = result.method === 'log';
    } catch (err) {
        actionError.value = true;
        actionNotice.value = err instanceof Error ? err.message : 'Failed to attach report.';
    } finally {
        attachingId.value = null;
    }
}

function deleteReport(report: PreflightReport): void {
    reports.value = deletePreflightReport(report.id);
}

onMounted(() => {
    Object.assign(config, loadPreflightConfig());
    reports.value = loadPreflightReports();
    if (!form.dateTime) {
        // Default to now in the input's local-datetime format (YYYY-MM-DDTHH:mm).
        form.dateTime = new Date(Date.now() - new Date().getTimezoneOffset() * 60000)
            .toISOString()
            .slice(0, 16);
    }
    useMapPoint();
});
</script>
