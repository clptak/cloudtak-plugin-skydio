import { getCloudTakToken } from './cloudtakToken';

const LEGACY_SETTINGS_KEY = 'cloudtak-plugin-skydio:settings';
const SETTINGS_KEY_PREFIX = 'cloudtak-plugin-skydio:settings:';

export function getCurrentUserId(): string | null {
    try {
        const token = getCloudTakToken();
        if (!token) return null;

        const payload = token.split('.')[1];
        if (!payload) return null;

        const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
            email?: string;
            sub?: string;
        };

        return decoded.email ?? decoded.sub ?? null;
    } catch {
        return null;
    }
}

export function settingsStorageKey(): string {
    const userId = getCurrentUserId();
    return userId ? `${SETTINGS_KEY_PREFIX}${userId}` : LEGACY_SETTINGS_KEY;
}

export function migrateLegacySettingsIfNeeded(): void {
    const userKey = settingsStorageKey();
    if (userKey === LEGACY_SETTINGS_KEY) return;
    if (localStorage.getItem(userKey)) return;

    const legacy = localStorage.getItem(LEGACY_SETTINGS_KEY);
    if (!legacy) return;

    localStorage.setItem(userKey, legacy);
    localStorage.removeItem(LEGACY_SETTINGS_KEY);
}
