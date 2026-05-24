<template>
    <div class="col-12 py-3">
        <form @submit.prevent="searchFlights">
            <div class="card mb-3">
                <div class="card-header">
                    <div class="card-title">
                        Search Flights
                    </div>
                </div>
                <div class="card-body">
                    <label class="form-label">
                        Vehicle serial (required)
                    </label>
                    <select
                        v-model="selectedSerials"
                        class="form-select"
                        multiple
                        required
                        size="5"
                    >
                        <option
                            v-for="vehicle in vehicles"
                            :key="vehicle.vehicle_serial"
                            :value="vehicle.vehicle_serial"
                        >
                            {{ vehicle.name }} ({{ vehicle.vehicle_serial }})
                        </option>
                    </select>
                    <div class="form-hint">
                        Hold Cmd/Ctrl to select multiple vehicles. Load vehicles on the Vehicles tab first.
                    </div>

                    <TablerInput
                        v-model="takeoffSince"
                        class="mt-3"
                        label="Takeoff since (required)"
                        type="datetime-local"
                    />

                    <TablerInput
                        v-model="takeoffBefore"
                        class="mt-3"
                        label="Takeoff before (optional)"
                        type="datetime-local"
                    />

                    <div class="mt-3">
                        <button
                            type="submit"
                            class="btn btn-primary"
                            :disabled="loading || !apiKey || selectedSerials.length === 0 || !takeoffSince"
                        >
                            Get Flights
                        </button>
                    </div>
                </div>
            </div>
        </form>

        <div
            v-if="!apiKey"
            class="alert alert-warning"
        >
            Configure your API key in Settings first.
        </div>

        <TablerLoading
            v-if="loading"
            :compact="true"
            desc="Loading flights from Skydio…"
        />

        <TablerAlert
            v-if="error"
            :err="error"
        />

        <div
            v-if="flights.length > 0"
            class="card"
        >
            <div class="card-header">
                <div class="card-title">
                    Flights
                </div>
            </div>
            <div class="card-body">
                <div
                    v-for="flight in flights"
                    :key="flight.flight_id"
                    class="form-check"
                >
                    <input
                        :id="flight.flight_id"
                        v-model="selectedFlightIds"
                        class="form-check-input"
                        type="checkbox"
                        :value="flight.flight_id"
                    >
                    <label
                        class="form-check-label"
                        :for="flight.flight_id"
                    >
                        {{ flightLabel(flight.vehicle_serial, flight.takeoff) }}
                    </label>
                </div>

                <div class="mt-3">
                    <button
                        type="button"
                        class="btn btn-primary"
                        :disabled="downloading || selectedFlightIds.length === 0"
                        @click="downloadTelemetry"
                    >
                        Download Telemetry
                    </button>
                </div>

                <TablerLoading
                    v-if="downloading"
                    class="mt-3"
                    :compact="true"
                    desc="Downloading telemetry…"
                />

                <TablerAlert
                    v-if="downloadError"
                    class="mt-3"
                    :err="downloadError"
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
import {
    downloadGeoJson,
    flightLabel,
    telemetryToGeoJson,
    type GeoJsonFeatureCollection,
} from '../utils/telemetryGeoJson';

const props = defineProps<{
    apiKey: string;
    vehicles: SkydioVehicle[];
}>();

const selectedSerials = ref<string[]>([]);
const takeoffSince = ref('');
const takeoffBefore = ref('');
const flights = ref<SkydioFlight[]>([]);
const selectedFlightIds = ref<string[]>([]);
const loading = ref(false);
const downloading = ref(false);
const error = ref<Error | undefined>();
const downloadError = ref<Error | undefined>();

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

async function downloadTelemetry(): Promise<void> {
    if (!props.apiKey || selectedFlightIds.value.length === 0) return;

    downloading.value = true;
    downloadError.value = undefined;

    try {
        const collections: GeoJsonFeatureCollection[] = [];

        for (const flightId of selectedFlightIds.value) {
            const telemetry = await getFlightTelemetry(props.apiKey, flightId);
            collections.push(telemetryToGeoJson(telemetry));
        }

        const combined: GeoJsonFeatureCollection = {
            type: 'FeatureCollection',
            features: collections.flatMap((c) => c.features),
        };

        downloadGeoJson(combined, 'skydio-telemetry.geojson');
    } catch (err) {
        downloadError.value = toError(err, 'Failed to download telemetry');
    } finally {
        downloading.value = false;
    }
}
</script>
