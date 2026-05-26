<template>
    <div class='col-12 py-3'>
        <div class='d-flex align-items-center mb-3'>
            <div class='h3 mb-0'>
                Vehicles
            </div>
            <div class='ms-auto'>
                <button
                    type='button'
                    class='btn btn-primary'
                    :disabled='loading || !apiKey'
                    @click='emit(&apos;refresh&apos;)'
                >
                    Refresh Vehicles
                </button>
            </div>
        </div>

        <div
            v-if='!apiKey'
            class='alert alert-warning'
        >
            Configure your API key in Settings first.
        </div>

        <p
            v-if='cached && vehicles.length > 0 && loading'
            class='text-muted small'
        >
            Showing cached vehicles while refreshing from Skydio…
        </p>

        <TablerLoading
            v-if='loading && vehicles.length === 0'
            :compact='true'
            desc='Loading vehicles from Skydio…'
        />

        <TablerAlert
            v-if='error'
            :err='error'
        />

        <div
            v-if='vehicles.length === 0 && !loading && apiKey && !error'
            class='text-muted'
        >
            No vehicles loaded yet.
        </div>

        <div
            v-if='vehicles.length > 0'
            class='table-responsive'
        >
            <table class='table table-sm table-vcenter'>
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
                        v-for='vehicle in vehicles'
                        :key='vehicle.vehicle_serial'
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
import { TablerLoading, TablerAlert } from '@tak-ps/vue-tabler';
import type { SkydioVehicle } from '../types';

defineProps<{
    apiKey: string;
    vehicles: SkydioVehicle[];
    loading: boolean;
    cached: boolean;
    error?: Error;
}>();

const emit = defineEmits<{
    refresh: [];
}>();
</script>
