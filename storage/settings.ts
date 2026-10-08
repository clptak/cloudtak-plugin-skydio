import { DEFAULT_SETTINGS, type SkydioSettings } from '../types';
import { deploymentDefaults } from './deploymentDefaults';
import { migrateLegacySettingsIfNeeded, settingsStorageKey } from './user';

const SHARED_STRING_KEYS = [
    'authentikTokenUrl',
    'oauthClientId',
    'oauthClientSecret',
    'skydioSseUrl',
    'skydioTelemetryRelayUrl',
    'skydioWebhookUrl',
] as const satisfies readonly (keyof SkydioSettings)[];

function trimmed(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

function storedSettings(raw: string | null): Partial<SkydioSettings> | null {
    if (!raw) return null;

    try {
        const parsed: unknown = JSON.parse(raw);
        if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return null;
        return parsed as Partial<SkydioSettings>;
    } catch {
        return null;
    }
}

/** Blank shared fields fall back to config.local.ts. A saved API key always wins. */
export function applyDeploymentDefaults(stored: Partial<SkydioSettings> | null): SkydioSettings {
    const settings: SkydioSettings = {
        ...DEFAULT_SETTINGS,
        ...deploymentDefaults(),
        apiKey: trimmed(stored?.apiKey),
    };

    if (!stored) return settings;

    if (typeof stored.pollIntervalMs === 'number') settings.pollIntervalMs = stored.pollIntervalMs;
    if (typeof stored.pollingEnabled === 'boolean') settings.pollingEnabled = stored.pollingEnabled;
    if (typeof stored.sseEnabled === 'boolean') settings.sseEnabled = stored.sseEnabled;
    if (typeof stored.flightStatusLogEnabled === 'boolean') {
        settings.flightStatusLogEnabled = stored.flightStatusLogEnabled;
    }

    for (const key of SHARED_STRING_KEYS) {
        const fromUser = trimmed(stored[key]);
        settings[key] = fromUser || trimmed(settings[key]);
    }

    return settings;
}

/**
 * Do not freeze deployment URLs into localStorage. A later config.local.ts
 * change then applies on the next load unless the user saved a different value.
 */
export function settingsForStorage(settings: SkydioSettings): SkydioSettings {
    const deployed = deploymentDefaults();
    const stored: SkydioSettings = { ...settings };

    for (const key of SHARED_STRING_KEYS) {
        const fromDeployment = trimmed(deployed[key]);
        if (fromDeployment && stored[key].trim() === fromDeployment) {
            stored[key] = '';
        }
    }

    return stored;
}

export function loadSettings(): SkydioSettings {
    migrateLegacySettingsIfNeeded();
    return applyDeploymentDefaults(storedSettings(localStorage.getItem(settingsStorageKey())));
}

export function saveSettings(settings: SkydioSettings): void {
    localStorage.setItem(settingsStorageKey(), JSON.stringify(settingsForStorage(settings)));
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
        skydioTelemetryRelayUrl: next.skydioTelemetryRelayUrl.trim(),
        skydioWebhookUrl: next.skydioWebhookUrl.trim(),
    };
}
