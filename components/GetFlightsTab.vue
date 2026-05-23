<template>
    <div class="skydio-tab">
        <form
            class="search-form"
            @submit.prevent="searchFlights"
        >
            <label class="field">
                <span>Vehicle serial (required)</span>
                <select
                    v-model="selectedSerials"
                    multiple
                    required
                    size="4"
                >
                    <option
                        v-for="vehicle in vehicles"
                        :key="vehicle.vehicle_serial"
                        :value="vehicle.vehicle_serial"
                    >
                        {{ vehicle.name }} ({{ vehicle.vehicle_serial }})
                    </option>
                </select>
                <span
                    v-if="vehicles.length === 0"
                    class="field-hint"
                >
                    Load vehicles on the Vehicles tab first.
                </span>
            </label>

            <label class="field">
                <span>Takeoff since (required)</span>
                <input
                    v-model="takeoffSince"
                    type="datetime-local"
                    required
                >
            </label>

            <label class="field">
                <span>Takeoff before (optional)</span>
                <input
                    v-model="takeoffBefore"
                    type="datetime-local"
                >
            </label>

            <button
                type="submit"
                class="btn-primary"
                :disabled="loading || !apiKey"
            >
                Get Flights
            </button>
        </form>

        <p
            v-if="!apiKey"
            class="hint"
        >
            Configure your API key in Settings first.
        </p>

        <p
            v-if="error"
            class="error"
        >
            {{ error }}
        </p>

        <section
            v-if="flights.length > 0"
            class="results"
        >
            <h4>Flights</h4>
            <ul class="flight-list">
                <li
                    v-for="flight in flights"
                    :key="flight.flight_id"
                >
                    <label>
                        <input
                            v-model="selectedFlightIds"
                            type="checkbox"
                            :value="flight.flight_id"
                        >
                        {{ flightLabel(flight.vehicle_serial, flight.takeoff) }}
                    </label>
                </li>
            </ul>

            <button
                type="button"
                class="btn-primary"
                :disabled="downloading || selectedFlightIds.length === 0"
                @click="downloadTelemetry"
            >
                Download Telemetry
            </button>

            <p
                v-if="downloadError"
                class="error"
            >
                {{ downloadError }}
            </p>
        </section>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
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
const error = ref<string | null>(null);
const downloadError = ref<string | null>(null);

function toIso8601(localDatetime: string): string {
    return new Date(localDatetime).toISOString();
}

async function searchFlights(): Promise<void> {
    if (!props.apiKey || selectedSerials.value.length === 0 || !takeoffSince.value) {
        return;
    }

    loading.value = true;
    error.value = null;
    flights.value = [];
    selectedFlightIds.value = [];

    try {
        flights.value = await listFlights(props.apiKey, {
            takeoffSince: toIso8601(takeoffSince.value),
            takeoffBefore: takeoffBefore.value ? toIso8601(takeoffBefore.value) : undefined,
            vehicleSerials: selectedSerials.value,
        });
    } catch (err) {
        error.value = err instanceof ProxyError ? err.message : 'Failed to load flights';
    } finally {
        loading.value = false;
    }
}

async function downloadTelemetry(): Promise<void> {
    if (!props.apiKey || selectedFlightIds.value.length === 0) return;

    downloading.value = true;
    downloadError.value = null;

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
        downloadError.value = err instanceof ProxyError ? err.message : 'Failed to download telemetry';
    } finally {
        downloading.value = false;
    }
}
</script>

<style scoped>
.search-form {
    display: flex;
    flex-direction: column;
    gap: 0;
}

.field {
    display: flex;
    flex-direction: column;
    gap: 4px;
    margin-bottom: 12px;
}

.field select,
.field input[type="datetime-local"] {
    padding: 6px 8px;
    border: 1px solid var(--tblr-border-color, #dee2e6);
    border-radius: 4px;
    background: var(--tblr-bg-surface, #fff);
    color: inherit;
}

.field-hint {
    font-size: 11px;
    color: var(--tblr-secondary, #6c757d);
}

.btn-primary {
    padding: 6px 16px;
    background: var(--tblr-primary, #206bc4);
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin-bottom: 12px;
    align-self: flex-start;
}

.btn-primary:disabled {
    opacity: 0.6;
    cursor: not-allowed;
}

.hint {
    font-size: 12px;
    color: var(--tblr-secondary, #6c757d);
    margin: 0 0 12px;
}

.error {
    color: var(--tblr-danger, #d63939);
    font-size: 13px;
    margin: 0 0 8px;
}

.results h4 {
    margin: 16px 0 8px;
}

.flight-list {
    list-style: none;
    margin: 0 0 12px;
    padding: 0;
    max-height: 240px;
    overflow-y: auto;
}

.flight-list li {
    padding: 4px 0;
    font-size: 13px;
}

.flight-list label {
    display: flex;
    align-items: center;
    gap: 8px;
    cursor: pointer;
}
</style>
