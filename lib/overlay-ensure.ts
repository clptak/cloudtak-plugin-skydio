// Temporarily enable CloudTAK overlays needed for attribute detection, then restore prior state.
//
// Used by the PreFlight "Detect" actions so the user does not have to manually toggle every
// overlay in the Overlays menu. Overlays are found from the layer ids in the field map, so nothing
// depends on what an overlay is called. Only overlays that were off before detect are turned back off.

import { layerMatches } from './overlay-detect.ts';

export interface EnsurableOverlay {
    name: string;
    visible: boolean;
    styles: Array<{ id: string }>;
    /** Set by CloudTAK when an overlay's tiles or layers failed to load. */
    _error?: unknown;
    update(body: { visible?: boolean }): Promise<void>;
}

export interface EnsureOverlaysResult {
    /** Names we turned on (were off before this detect run). */
    enabled: string[];
    /** Requested layer ids with no working overlay, so nothing can be read from them. */
    missing: string[];
    /** Turn off overlays this run enabled. No-op if none were toggled. */
    restore: () => Promise<void>;
}

/**
 * Turn on the overlays that own these layer ids, if they are currently off.
 * Call `restore()` in a `finally` block to turn back off only what this run enabled.
 */
export async function ensureOverlaysVisible(
    overlays: EnsurableOverlay[],
    layerIds: string[],
): Promise<EnsureOverlaysResult> {
    const toggle = new Set<EnsurableOverlay>();
    const missing: string[] = [];

    for (const layerId of layerIds) {
        // An overlay that failed to load draws nothing. Treat it as missing so an empty result
        // cannot be mistaken for "no restriction at this point".
        const owners = overlays.filter((overlay) => !overlay._error
            && overlay.styles.some((layer) => layerMatches(layer.id, layerId)));

        if (!owners.length) {
            missing.push(layerId);
            continue;
        }
        for (const owner of owners) {
            if (!owner.visible) toggle.add(owner);
        }
    }

    const toggledOn: EnsurableOverlay[] = [];
    for (const overlay of toggle) {
        await overlay.update({ visible: true });
        toggledOn.push(overlay);
    }

    return {
        enabled: toggledOn.map((overlay) => overlay.name),
        missing,
        restore: async () => {
            for (const overlay of toggledOn) {
                await overlay.update({ visible: false });
            }
        },
    };
}
