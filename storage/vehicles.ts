import type { SkydioVehicle } from '../types';
import { getCurrentUserId } from './user';

const VEHICLES_KEY_PREFIX = 'cloudtak-plugin-skydio:vehicles:';
const LEGACY_VEHICLES_KEY = 'cloudtak-plugin-skydio:vehicles';

function vehiclesStorageKey(): string {
    const userId = getCurrentUserId();
    return userId ? `${VEHICLES_KEY_PREFIX}${userId}` : LEGACY_VEHICLES_KEY;
}

export function loadVehicles(): SkydioVehicle[] {
    try {
        const raw = localStorage.getItem(vehiclesStorageKey());
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? parsed as SkydioVehicle[] : [];
    } catch {
        return [];
    }
}

export function saveVehicles(vehicles: SkydioVehicle[]): void {
    localStorage.setItem(vehiclesStorageKey(), JSON.stringify(vehicles));
}
