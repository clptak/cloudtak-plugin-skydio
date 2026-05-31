<template>
    <div class='col-12 py-3'>
        <div class='card'>
            <div class='card-header'>
                <div class='card-title'>
                    Mission Planning
                </div>
            </div>
            <div class='card-body'>
                <p class='text-muted'>
                    Select a Polygon on the map, then import it here to generate a Skydio
                    Map Capture mission file for manual import into Skydio Cloud.
                </p>

                <div class='mb-3'>
                    <span class='text-muted'>Current selection: </span>
                    <span>{{ selectionLabel }}</span>
                </div>

                <button
                    type='button'
                    class='btn btn-primary'
                    :disabled='!canImport'
                    @click='openModal'
                >
                    Import Selected Map Feature
                </button>

                <div
                    v-if='notice'
                    class='alert mt-3'
                    :class='noticeIsError ? "alert-danger" : "alert-info"'
                >
                    {{ notice }}
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
                            New Map Capture Mission
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
                            v-model='form.displayName'
                            label='Mission Name'
                            placeholder='Mission name'
                        />
                        <TablerInput
                            v-model.number='form.areaScanHeightFt'
                            class='mt-3'
                            type='number'
                            label='Area Scan Height (Above Takeoff) — ft'
                            description='Converted to meters in the generated mission file.'
                        />
                        <TablerInput
                            v-model.number='form.areaOverlap'
                            class='mt-3'
                            type='number'
                            label='Set Overlap Percentage'
                        />
                        <TablerInput
                            v-model.number='form.areaSidelap'
                            class='mt-3'
                            type='number'
                            label='Set Side Overlap Percentage'
                        />
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
                            type='button'
                            class='btn btn-primary'
                            :disabled='!canGenerate'
                            @click='generateAndDownload'
                        >
                            Generate &amp; Download
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { TablerInput } from '@tak-ps/vue-tabler';
import { useMapStore } from '../../../src/stores/map.ts';
import type { Feature } from '../../../src/types.ts';
import {
    FEET_TO_METERS,
    buildMapCaptureMission,
    downloadMissionJson,
    polygonOuterRing,
} from '../utils/skydioMission';

const mapStore = useMapStore();

const props = defineProps<{
    activeFeature: Feature | null;
}>();

// #region agent log
interface DebugMapState {
    selected?: { values?: () => Iterable<unknown>; size?: number };
    radial?: { mode?: unknown; cot?: unknown };
    viewedFeature?: unknown;
    select?: { feats?: unknown[] };
}

function debugGeomType(value: unknown): string | null {
    if (value && typeof value === 'object') {
        const cot = value as { as_feature?: () => { geometry?: { type?: string } } };
        if (typeof cot.as_feature === 'function') {
            try {
                return cot.as_feature().geometry?.type ?? 'no-geometry';
            } catch {
                return 'as_feature-threw';
            }
        }
        const feat = value as { geometry?: { type?: string } };
        if (feat.geometry) return feat.geometry.type ?? 'no-type';
    }
    return value == null ? null : 'non-feature';
}

function debugCaptureMapState(where: string): void {
    const m = mapStore as unknown as DebugMapState;
    const selectedEntries = Array.from(m.selected?.values?.() ?? []);
    fetch('http://127.0.0.1:7476/ingest/03b14338-79f6-4e2b-aa33-ecb1824b3829', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'f269f9' },
        body: JSON.stringify({
            sessionId: 'f269f9',
            runId: 'run1',
            hypothesisId: 'A,B,C,D,E',
            location: 'MissionPlanningTab.vue:debugCaptureMapState',
            message: `map selection state @ ${where}`,
            data: {
                where,
                href: typeof window !== 'undefined' ? window.location.href : null,
                selectedSize: m.selected?.size ?? null,
                selectedTypes: selectedEntries.map((e) => debugGeomType(e)),
                radialMode: m.radial?.mode ?? null,
                radialCotType: debugGeomType(m.radial?.cot),
                viewedFeatureType: debugGeomType(m.viewedFeature),
                selectFeatsLen: Array.isArray(m.select?.feats) ? m.select?.feats.length : null,
                selectFeatsTypes: Array.isArray(m.select?.feats)
                    ? m.select?.feats.map((e) => debugGeomType(e))
                    : null,
            },
            timestamp: Date.now(),
        }),
    }).catch(() => {});
}

onMounted(() => debugCaptureMapState('tab-mounted'));

watch(() => props.activeFeature, (feature) => {
    fetch('http://127.0.0.1:7476/ingest/03b14338-79f6-4e2b-aa33-ecb1824b3829', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Debug-Session-Id': 'f269f9' },
        body: JSON.stringify({
            sessionId: 'f269f9',
            runId: 'post-fix',
            hypothesisId: 'B',
            location: 'MissionPlanningTab.vue:watch(activeFeature)',
            message: 'activeFeature prop changed',
            data: {
                geometryType: feature?.geometry?.type ?? null,
                callsign: typeof feature?.properties?.callsign === 'string' ? feature.properties.callsign : null,
            },
            timestamp: Date.now(),
        }),
    }).catch(() => {});
}, { immediate: true });
// #endregion

const modalOpen = ref(false);
const notice = ref<string | null>(null);
const noticeIsError = ref(false);

const form = reactive({
    displayName: '',
    areaScanHeightFt: 300,
    areaOverlap: 50,
    areaSidelap: 30,
});

interface SelectedInfo {
    feature: Feature;
    geometryType: string;
    callsign: string;
}

const selected = computed<SelectedInfo | null>(() => {
    const feature = props.activeFeature;
    if (!feature || !feature.geometry) return null;

    const callsign = typeof feature.properties?.callsign === 'string'
        ? feature.properties.callsign
        : '';

    return {
        feature,
        geometryType: feature.geometry.type,
        callsign,
    };
});

const selectionLabel = computed(() => {
    const info = selected.value;
    if (!info) return 'No map feature captured — click a feature on the map.';
    const name = info.callsign || '(unnamed)';
    return `${name} — ${info.geometryType}`;
});

const canImport = computed(() => selected.value !== null);

const canGenerate = computed(() => Boolean(form.displayName.trim()));

function openModal(): void {
    notice.value = null;
    noticeIsError.value = false;

    // #region agent log
    debugCaptureMapState('import-click');
    // #endregion

    const info = selected.value;
    if (!info) {
        notice.value = 'Select exactly one map feature first.';
        noticeIsError.value = true;
        return;
    }

    if (info.geometryType !== 'Polygon') {
        notice.value = info.geometryType === 'Point' || info.geometryType === 'LineString'
            ? 'Waypoint flights (Point / LineString) coming soon. Select a Polygon for a Map Capture mission.'
            : `Unsupported geometry "${info.geometryType}". Select a Polygon.`;
        noticeIsError.value = true;
        return;
    }

    form.displayName = info.callsign || 'Skydio Map Capture';
    form.areaScanHeightFt = 300;
    form.areaOverlap = 50;
    form.areaSidelap = 30;
    modalOpen.value = true;
}

function closeModal(): void {
    modalOpen.value = false;
}

function generateAndDownload(): void {
    const info = selected.value;
    if (!info) {
        notice.value = 'Map selection changed — re-select a Polygon and try again.';
        noticeIsError.value = true;
        modalOpen.value = false;
        return;
    }

    const ring = polygonOuterRing(info.feature.geometry);
    if (!ring) {
        notice.value = 'Selected feature is not a valid Polygon.';
        noticeIsError.value = true;
        modalOpen.value = false;
        return;
    }

    const displayName = form.displayName.trim();
    const mission = buildMapCaptureMission({
        displayName,
        areaScanHeightMeters: form.areaScanHeightFt * FEET_TO_METERS,
        areaOverlap: form.areaOverlap,
        areaSidelap: form.areaSidelap,
        ring,
    });

    const safeName = displayName.replace(/[^a-z0-9_-]+/gi, '_') || 'skydio-mission';
    downloadMissionJson(mission, `${safeName}.json`);

    modalOpen.value = false;
    notice.value = `Downloaded "${safeName}.json". Import it into Skydio Cloud.`;
    noticeIsError.value = false;
}
</script>
