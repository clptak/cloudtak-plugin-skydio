import type { SkydioSettings } from '../types';
import type { OverlayFieldMapping } from '../lib/overlay-field-map';

/** Shared settings compiled in from gitignored config.local.ts. Never includes an API key. */
export type DeploymentSettings = Partial<Omit<SkydioSettings, 'apiKey'>>;

interface DeploymentModule {
    deploymentDefaults?: DeploymentSettings;
    overlayFieldMap?: OverlayFieldMapping[];
}

/**
 * Vite includes config.local.ts only when that file exists at build time.
 * A missing file becomes an empty module map, so clones without it still build.
 */
export function deploymentDefaults(): DeploymentSettings {
    const modules = import.meta.glob<DeploymentModule>('../config.local.ts', {
        eager: true,
    });

    for (const mod of Object.values(modules)) {
        const defaults = mod?.deploymentDefaults;
        if (!defaults || typeof defaults !== 'object') continue;

        const rest = { ...defaults } as DeploymentSettings & { apiKey?: string };
        delete rest.apiKey;
        return rest;
    }

    return {};
}

/** This deployment's overlay → PreFlight field rows. Empty when none are configured. */
export function deploymentOverlayFieldMap(): OverlayFieldMapping[] {
    const modules = import.meta.glob<DeploymentModule>('../config.local.ts', {
        eager: true,
    });

    for (const mod of Object.values(modules)) {
        if (Array.isArray(mod?.overlayFieldMap)) return mod.overlayFieldMap;
    }

    return [];
}

export function hasDeploymentDefaults(): boolean {
    return Object.values(deploymentDefaults()).some((value) => {
        if (typeof value === 'string') return value.trim().length > 0;
        return value !== undefined && value !== null;
    });
}
