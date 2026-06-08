// Optional fallbacks when an overlay is in a user's CloudTAK profile but not loaded in the
// map store yet (or when the menu name differs slightly between environments).
//
// Fill in `profileOverlayId` from the overlay's id in CloudTAK (Overlays menu / API) when
// `getOverlayByName` cannot find it after `initOverlays()`.

export interface OverlayFallbackSpec {
    /** CloudTAK profile overlay id — resolved via map store `getOverlayById`. */
    profileOverlayId?: number;
}

/**
 * Keyed by the exact `overlayName` used in `overlay-field-map.ts`.
 * Leave empty unless a name is missing at runtime despite being in the profile.
 */
export const OVERLAY_FALLBACKS: Record<string, OverlayFallbackSpec> = {
    // 'FAA UAS Facility Map': { profileOverlayId: 1234 },
};
