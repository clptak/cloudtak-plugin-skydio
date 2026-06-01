import {
    DEFAULT_PREFLIGHT_CONFIG,
    type DronePerformanceSpec,
    type PreflightConfig,
    type PreflightPlatform,
    type RemotePilot,
} from '../types';
import { getCurrentUserId } from './user';

const CONFIG_KEY_PREFIX = 'cloudtak-plugin-skydio:preflight-config:';
const LEGACY_CONFIG_KEY = 'cloudtak-plugin-skydio:preflight-config';

function configStorageKey(): string {
    const userId = getCurrentUserId();
    return userId ? `${CONFIG_KEY_PREFIX}${userId}` : LEGACY_CONFIG_KEY;
}

export class PreflightConfigError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'PreflightConfigError';
    }
}

function asStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) return [];
    return value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean);
}

function parseSpec(value: unknown): DronePerformanceSpec | undefined {
    if (!value || typeof value !== 'object') return undefined;
    const raw = value as Record<string, unknown>;
    const spec: DronePerformanceSpec = {};

    const numericKeys: (keyof DronePerformanceSpec)[] = [
        'maxWindMph',
        'minTempF',
        'maxTempF',
        'minVisibilityMiles',
        'maxKpIndex',
    ];
    for (const key of numericKeys) {
        const candidate = raw[key];
        if (typeof candidate === 'number' && Number.isFinite(candidate)) {
            spec[key] = candidate;
        }
    }

    return Object.keys(spec).length > 0 ? spec : undefined;
}

function parsePlatforms(value: unknown): PreflightPlatform[] {
    if (!Array.isArray(value)) return [];
    const platforms: PreflightPlatform[] = [];
    for (const item of value) {
        if (typeof item === 'string') {
            const name = item.trim();
            if (name) platforms.push({ name });
            continue;
        }
        if (item && typeof item === 'object') {
            const raw = item as Record<string, unknown>;
            const name = typeof raw.name === 'string' ? raw.name.trim() : '';
            if (!name) continue;
            platforms.push({ name, specs: parseSpec(raw.specs) });
        }
    }
    return platforms;
}

function parsePilots(value: unknown): RemotePilot[] {
    if (!Array.isArray(value)) return [];
    const pilots: RemotePilot[] = [];
    for (const item of value) {
        if (typeof item === 'string') {
            const id = item.trim();
            if (id) pilots.push({ id });
            continue;
        }
        if (item && typeof item === 'object') {
            const raw = item as Record<string, unknown>;
            const id = typeof raw.id === 'string' ? raw.id.trim() : '';
            if (!id) continue;
            const name = typeof raw.name === 'string' ? raw.name.trim() : undefined;
            pilots.push(name ? { id, name } : { id });
        }
    }
    return pilots;
}

/**
 * Validate and normalize a parsed JSON config. Throws PreflightConfigError when
 * the document has no usable lists at all so the UI can surface a clear message.
 */
export function normalizePreflightConfig(parsed: unknown): PreflightConfig {
    if (!parsed || typeof parsed !== 'object') {
        throw new PreflightConfigError('Config must be a JSON object.');
    }

    const raw = parsed as Record<string, unknown>;
    const config: PreflightConfig = {
        landManagers: asStringArray(raw.landManagers),
        platforms: parsePlatforms(raw.platforms),
        remotePilots: parsePilots(raw.remotePilots),
    };

    if (
        config.landManagers.length === 0
        && config.platforms.length === 0
        && config.remotePilots.length === 0
    ) {
        throw new PreflightConfigError(
            'Config has no landManagers, platforms, or remotePilots. Check the file format.',
        );
    }

    return config;
}

/** Parse a raw JSON string into a validated config. */
export function parsePreflightConfig(text: string): PreflightConfig {
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        throw new PreflightConfigError('File is not valid JSON.');
    }
    return normalizePreflightConfig(parsed);
}

export function loadPreflightConfig(): PreflightConfig {
    try {
        const raw = localStorage.getItem(configStorageKey());
        if (!raw) return { ...DEFAULT_PREFLIGHT_CONFIG };
        return normalizePreflightConfig(JSON.parse(raw));
    } catch {
        return { ...DEFAULT_PREFLIGHT_CONFIG };
    }
}

export function savePreflightConfig(config: PreflightConfig): void {
    localStorage.setItem(configStorageKey(), JSON.stringify(config));
}

export function clearPreflightConfig(): void {
    localStorage.removeItem(configStorageKey());
}
