/** Capacitor Preferences default group on web (see @capacitor/preferences). */
const CAPACITOR_TOKEN_KEY = 'CapacitorStorage.token';

/**
 * CloudTAK session JWT. Modern CloudTAK stores this via Capacitor Preferences
 * (`CapacitorStorage.token`); older builds used `localStorage.token`.
 */
export function getCloudTakToken(): string | null {
    const legacy = localStorage.getItem('token');
    if (legacy) return legacy;

    return localStorage.getItem(CAPACITOR_TOKEN_KEY);
}
