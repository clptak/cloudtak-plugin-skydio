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
                        Hold Cmd/Ctrl to select multiple vehicles. Load vehicles on the Vehicles tab first.
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
                    Downloads one GeoJSON file per selected flight. If you configured a Skydio Telemetry Relay URL
                    in Settings, large flights may be fetched via the relay (avoiding the Plugin Proxy 1MB response limit).
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
import { ref } from 'vue';
import { TablerInput, TablerLoading, TablerAlert } from '@tak-ps/vue-tabler';
import { getFlightTelemetry, listFlights } from '../api/client';
import { ProxyError } from '../api/proxy';
import type { SkydioFlight, SkydioVehicle } from '../types';
import { useMapStore } from '../../../src/stores/map.ts';
import { normalize_geojson } from '@tak-ps/node-cot/normalize_geojson';
import { resolveSkydioTelemetryRelayUrl } from '../lib/sse-url';
import {
    downloadGeoJson,
    flightLabel,
    telemetryToGeoJson,
} from '../utils/telemetryGeoJson';

const props = defineProps<{
    apiKey: string;
    vehicles: SkydioVehicle[];
    telemetryRelayUrl: string;
}>();

const selectedSerials = ref<string[]>([]);
const takeoffSince = ref('');
const takeoffBefore = ref('');
const flights = ref<SkydioFlight[]>([]);
const selectedFlightIds = ref<string[]>([]);
const loading = ref(false);
const downloading = ref(false);
const importing = ref(false);
const error = ref<Error | undefined>();
const downloadError = ref<Error | undefined>();
const importError = ref<Error | undefined>();

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
                    { telemetryRelayUrl: resolveSkydioTelemetryRelayUrl(props.telemetryRelayUrl) },
                );
                const collection = telemetryToGeoJson(telemetry);
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
): Promise<unknown[]> {
    const features: unknown[] = [];

    for (const feat of collection.features) {
        const norm = await normalize_geojson(feat);
        // Keep CloudTAK's GeoJSON import folder convention.
        const creator = (norm as any)?.properties?.creator;
        features.push({
            ...norm,
            path: `/${folderName}/`,
            properties: {
                ...(norm as any).properties,
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
    const mapStore = useMapStore() as any;

    try {
        const allImportFeatures: unknown[] = [];
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
                    { telemetryRelayUrl: resolveSkydioTelemetryRelayUrl(props.telemetryRelayUrl) },
                );
                const collection = telemetryToGeoJson(telemetry);
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
