<template>
    <div class="skydio-tab">
        <button
            type="button"
            class="btn-primary"
            :disabled="loading || !apiKey"
            @click="fetchVehicles"
        >
            Get Vehicles
        </button>

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

        <div
            v-if="vehicles.length === 0 && !loading && apiKey && !error"
            class="empty"
        >
            No vehicles loaded yet.
        </div>

        <table
            v-if="vehicles.length > 0"
            class="vehicles-table"
        >
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
</template>

<script setup lang="ts">
import { ref } from 'vue';
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
const error = ref<string | null>(null);

async function fetchVehicles(): Promise<void> {
    if (!props.apiKey) return;

    loading.value = true;
    error.value = null;

    try {
        const result = await listVehicles(props.apiKey);
        emit('update:vehicles', result);
    } catch (err) {
        error.value = err instanceof ProxyError ? err.message : 'Failed to load vehicles';
    } finally {
        loading.value = false;
    }
}
</script>

<style scoped>
.btn-primary {
    padding: 6px 16px;
    background: var(--tblr-primary, #206bc4);
    color: #fff;
    border: none;
    border-radius: 4px;
    cursor: pointer;
    margin-bottom: 12px;
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

.empty {
    font-size: 13px;
    color: var(--tblr-secondary, #6c757d);
    padding: 16px 0;
}

.vehicles-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 13px;
    margin-top: 12px;
}

.vehicles-table th,
.vehicles-table td {
    padding: 6px 8px;
    border: 1px solid var(--tblr-border-color, #dee2e6);
    text-align: left;
}

.vehicles-table th {
    background: var(--tblr-bg-surface-secondary, #f8f9fa);
    font-weight: 600;
}
</style>
