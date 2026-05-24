<template>
    <div class="col-12 py-3">
        <div class="d-flex align-items-center mb-3">
            <div class="h3 mb-0">
                Vehicles
            </div>
            <div class="ms-auto">
                <button
                    type="button"
                    class="btn btn-primary"
                    :disabled="loading || !apiKey"
                    @click="fetchVehicles"
                >
                    Get Vehicles
                </button>
            </div>
        </div>

        <div
            v-if="!apiKey"
            class="alert alert-warning"
        >
            Configure your API key in Settings first.
        </div>

        <TablerLoading
            v-if="loading"
            :compact="true"
            desc="Loading vehicles from Skydio…"
        />

        <TablerAlert
            v-if="error"
            :err="error"
        />

        <div
            v-if="vehicles.length === 0 && !loading && apiKey && !error"
            class="text-muted"
        >
            No vehicles loaded yet.
        </div>

        <div
            v-if="vehicles.length > 0"
            class="table-responsive"
        >
            <table class="table table-sm table-vcenter">
                <thead>
                    <tr>
                        <th>Vehicle Serial</th>
                        <th>Name</th>
                        <th>Class</th>
                        <th>Online</th>
                        <th>Health</th>
                    </tr>
                </thead>
                <tbody>
                    <tr
                        v-for="vehicle in vehicles"
                        :key="vehicle.vehicle_serial"
                    >
                        <td>{{ vehicle.vehicle_serial }}</td>
                        <td>{{ vehicle.name }}</td>
                        <td>{{ vehicle.vehicle_class ?? '—' }}</td>
                        <td>{{ vehicle.is_online ? 'Yes' : 'No' }}</td>
                        <td>{{ vehicle.device_health_status ?? '—' }}</td>
                    </tr>
                </tbody>
            </table>
        </div>
    </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';
import { TablerLoading, TablerAlert } from '@tak-ps/vue-tabler';
import { listVehicles } from '../api/client';
import { ProxyError } from '../api/proxy';
import type { SkydioVehicle } from '../types';

const props = defineProps<{
    apiKey: string;
    vehicles: SkydioVehicle[];
}>();

const emit = defineEmits<{
    'update:vehicles': [vehicles: SkydioVehicle[]];
}>();

const loading = ref(false);
const error = ref<Error | undefined>();

async function fetchVehicles(): Promise<void> {
    if (!props.apiKey) return;

    loading.value = true;
    error.value = undefined;

    try {
        const result = await listVehicles(props.apiKey);
        emit('update:vehicles', result);
    } catch (err) {
        error.value = err instanceof ProxyError || err instanceof Error
            ? err
            : new Error('Failed to load vehicles');
    } finally {
        loading.value = false;
    }
}
</script>
