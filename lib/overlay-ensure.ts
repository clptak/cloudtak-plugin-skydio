// Temporarily enable CloudTAK overlays needed for attribute detection, then restore prior state.
//
// Used by the PreFlight "Detect" actions so the user does not have to manually toggle every
// overlay in the Overlays menu. Only overlays that were off before detect are turned back off.

import { OVERLAY_FALLBACKS } from './overlay-sources.ts';
import { normalizeLabel } from './overlay-detect.ts';

export interface EnsurableOverlay {
    name: string;
    visible: boolean;
    update(body: { visible?: boolean }): Promise<void>;
}

export interface OverlayStoreLike {
    overlays?: EnsurableOverlay[];
    initOverlays?: () => Promise<void>;
    getOverlayByName?: (name: string) => EnsurableOverlay | null;
    getOverlayById?: (id: number) => EnsurableOverlay | null;
}

export interface EnsureOverlaysResult {
    /** Names we turned on (were off before this detect run). */
    enabled: string[];
    /** Names in the request that could not be resolved in the store. */
    missing: string[];
    /** Turn off overlays this run enabled. No-op if none were toggled. */
    restore: () => Promise<void>;
}

function findInList(store: OverlayStoreLike, name: string): EnsurableOverlay | null {
    const norm = normalizeLabel(name);
    for (const overlay of store.overlays ?? []) {
        if (normalizeLabel(overlay.name) === norm) return overlay;
    }
    return null;
}

function resolveOverlay(store: OverlayStoreLike, name: string): EnsurableOverlay | null {
    const trimmed = name.trim();
    if (!trimmed) return null;

    const byName = store.getOverlayByName?.(trimmed);
    if (byName) return byName;

    const inList = findInList(store, trimmed);
    if (inList) return inList;

    const fallbackId = OVERLAY_FALLBACKS[trimmed]?.profileOverlayId;
    if (fallbackId != null) {
        const byId = store.getOverlayById?.(fallbackId);
        if (byId) return byId;
    }

    return null;
}

/**
 * Turn on the named overlays if they exist and are currently off.
 * Call `restore()` in a `finally` block to turn back off only what this run enabled.
 */
export async function ensureOverlaysVisible(
    store: OverlayStoreLike,
    names: string[],
): Promise<EnsureOverlaysResult> {
    if (store.initOverlays) {
        await store.initOverlays();
    }

    const unique = [...new Set(names.map((n) => n.trim()).filter(Boolean))];
    const toggledOn: EnsurableOverlay[] = [];
    const missing: string[] = [];

    for (const name of unique) {
        const overlay = resolveOverlay(store, name);
        if (!overlay) {
            missing.push(name);
            continue;
        }
        if (!overlay.visible) {
            await overlay.update({ visible: true });
            toggledOn.push(overlay);
        }
    }

    return {
        enabled: toggledOn.map((o) => o.name),
        missing,
        restore: async () => {
            for (const overlay of toggledOn) {
                await overlay.update({ visible: false });
            }
        },
    };
}
