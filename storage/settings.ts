import { DEFAULT_SETTINGS, type SkydioSettings } from '../types';
import { migrateLegacySettingsIfNeeded, settingsStorageKey } from './user';

export function loadSettings(): SkydioSettings {
    migrateLegacySettingsIfNeeded();

    try {
        const raw = localStorage.getItem(settingsStorageKey());
        if (!raw) return { ...DEFAULT_SETTINGS };
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

export function saveSettings(settings: SkydioSettings): void {
    localStorage.setItem(settingsStorageKey(), JSON.stringify(settings));
}

/** Keep the saved client secret when password inputs are left blank on save. */
export function mergeSkydioSettings(next: SkydioSettings, prior: SkydioSettings): SkydioSettings {
    return {
        ...next,
        apiKey: next.apiKey.trim(),
        oauthClientId: next.oauthClientId.trim(),
        oauthClientSecret: next.oauthClientSecret.trim() || prior.oauthClientSecret.trim(),
        authentikTokenUrl: next.authentikTokenUrl.trim(),
        skydioSseUrl: next.skydioSseUrl.trim(),
    };
}
