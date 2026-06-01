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
                    Select a feature on the map, then import it here. A Polygon generates a
                    Skydio Map Capture mission (download); a LineString generates a waypoint
                    flight you can send to Skydio or download.
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
                            v-model='form.displayName'
                            label='Mission Name'
                            placeholder='Mission name'
                        />
                        <TablerInput
                            v-model.number='form.areaScanHeightFt'
                            class='mt-3'
                            type='number'
                            label='Area Scan Height (Above Takeoff) — ft'
                        />
                        <template v-if='missionType === "mapCapture"'>
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
    </div>
</template>

<script setup lang="ts">
import { computed, reactive, ref } from 'vue';
import { TablerInput } from '@tak-ps/vue-tabler';
import type { Feature } from '../../../src/types.ts';
import { createMissionTemplate } from '../api/client';
import { ProxyError } from '../api/proxy';
import {
    FEET_TO_METERS,
    buildMapCaptureMission,
    buildWaypointMission,
    buildWaypointTemplate,
    downloadMissionJson,
    lineStringCoords,
    polygonOuterRing,
} from '../utils/skydioMission';

const props = defineProps<{
    activeFeature: Feature | null;
    apiKey: string;
}>();

const modalOpen = ref(false);
const notice = ref<string | null>(null);
const noticeIsError = ref(false);
const sending = ref(false);

const form = reactive({
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

const missionType = computed<MissionType | null>(() => {
    switch (selected.value?.geometryType) {
        case 'Polygon': return 'mapCapture';
        case 'LineString': return 'waypoint';
        default: return null;
    }
});

const selectionLabel = computed(() => {
    const info = selected.value;
    if (!info) return 'No map feature captured — click a feature on the map.';
    const name = info.callsign || '(unnamed)';
    return `${name} — ${info.geometryType}`;
});

const canImport = computed(() => missionType.value !== null);

const canGenerate = computed(() => Boolean(form.displayName.trim()));

const modalTitle = computed(() =>
    missionType.value === 'waypoint' ? 'New Waypoint Flight' : 'New Map Capture Mission');

function openModal(): void {
    notice.value = null;
    noticeIsError.value = false;

    const info = selected.value;
    if (!info) {
        notice.value = 'Click a feature on the map first.';
        noticeIsError.value = true;
        return;
    }

    if (missionType.value === null) {
        notice.value = info.geometryType === 'Point'
            ? 'Point flights are not supported yet. Select a Polygon (Map Capture) or LineString (waypoint flight).'
            : `Unsupported geometry "${info.geometryType}". Select a Polygon or LineString.`;
        noticeIsError.value = true;
        return;
    }

    form.displayName = info.callsign
        || (missionType.value === 'waypoint' ? 'Skydio Waypoint Flight' : 'Skydio Map Capture');
    form.areaScanHeightFt = 300;
    form.areaOverlap = 50;
    form.areaSidelap = 30;
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
        notice.value = 'Map selection changed — re-select a feature and try again.';
        noticeIsError.value = true;
        modalOpen.value = false;
        return;
    }

    const displayName = form.displayName.trim();
    let mission: Record<string, unknown>;

    if (missionType.value === 'mapCapture') {
        const ring = polygonOuterRing(info.feature.geometry);
        if (!ring) {
            notice.value = 'Selected feature is not a valid Polygon.';
            noticeIsError.value = true;
            modalOpen.value = false;
            return;
        }
        mission = buildMapCaptureMission({
            displayName,
            areaScanHeightMeters: form.areaScanHeightFt * FEET_TO_METERS,
            areaOverlap: form.areaOverlap,
            areaSidelap: form.areaSidelap,
            ring,
        });
    } else {
        const line = lineStringCoords(info.feature.geometry);
        if (!line) {
            notice.value = 'Selected feature is not a valid LineString.';
            noticeIsError.value = true;
            modalOpen.value = false;
            return;
        }
        mission = buildWaypointMission({
            displayName,
            waypointZMeters: form.areaScanHeightFt * FEET_TO_METERS,
            line,
        });
    }

    const safeName = safeFileName(displayName);
    downloadMissionJson(mission, `${safeName}.json`);

    modalOpen.value = false;
    notice.value = `Downloaded "${safeName}.json". Import it into Skydio Cloud.`;
    noticeIsError.value = false;
}

async function sendToSkydio(): Promise<void> {
    const info = selected.value;
    if (!info || missionType.value !== 'waypoint') {
        notice.value = 'Map selection changed — re-select a LineString and try again.';
        noticeIsError.value = true;
        modalOpen.value = false;
        return;
    }

    const line = lineStringCoords(info.feature.geometry);
    if (!line) {
        notice.value = 'Selected feature is not a valid LineString.';
        noticeIsError.value = true;
        return;
    }

    if (!props.apiKey.trim()) {
        notice.value = 'Add your Skydio API key in Settings before sending.';
        noticeIsError.value = true;
        return;
    }

    sending.value = true;
    notice.value = null;

    try {
        const template = await createMissionTemplate(props.apiKey, buildWaypointTemplate({
            name: form.displayName.trim(),
            waypointZFeet: form.areaScanHeightFt,
            line,
        }));

        modalOpen.value = false;
        notice.value = `Sent to Skydio — created mission template${template.uuid ? ` (${template.uuid})` : ''}.`;
        noticeIsError.value = false;
    } catch (err) {
        notice.value = err instanceof ProxyError || err instanceof Error
            ? err.message
            : 'Failed to send mission to Skydio';
        noticeIsError.value = true;
    } finally {
        sending.value = false;
    }
}
</script>
