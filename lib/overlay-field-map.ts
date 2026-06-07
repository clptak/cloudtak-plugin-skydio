// Static overlay → PreFlight form-field mapping (Paul-authored).
//
// Each row tells the PreFlight tab: "at the selected map point, read property
// `attribute` from the overlay layer `overlayLayerId`, and write it into the
// PreFlight form field `formField`."
//
// How to fill this in:
//   1. In the PreFlight tab, select the map point, then click "Inspect overlays at point".
//      It lists, for every overlay under that point, the STABLE layer id (e.g. "136-poly"),
//      the full runtime id, the source, and that feature's property keys + values.
//   2. Find the property that holds the value you want (e.g. districtname → "Red Rock Ranger District").
//   3. Pick the PreFlight form field to fill (see PreflightAutofillField below).
//   4. Add a row, using the STABLE layer id for `overlayLayerId`.
//
// IMPORTANT — layer ids reset:
//   CloudTAK prefixes each overlay layer with `${overlay.id}-`, and that leading number is reassigned
//   on every restart and can differ between users (e.g. "1202-136-poly" → "1530-136-poly"). Detection
//   matches on the STABLE suffix, so you can store either the full id ("1217-UASFM100-poly") or just
//   the suffix ("UASFM100-poly") — both keep working after the leading number changes.
//
// Matching behavior at detect time:
//   1. The overlay layer is matched by stable suffix (the volatile leading "N-" is ignored).
//   2. The raw overlay value is run through `valueMap` (if present) to translate the overlay's
//      label into the exact value your form expects. Keys match case-insensitively + whitespace-
//      normalized; an unmapped value passes through unchanged.
//   3. The (translated) value is written into the form field. Number fields (e.g. maxAltitudeAglFt)
//      are coerced to a number; everything else is written as a string.
//   4. For <select> fields (airspaceClass, landManager, …) the written value must match an existing
//      option exactly, so use `valueMap` to translate the overlay's wording into your option label.
//
// Note: auto-detect can only read overlays that are toggled ON and are vector/geojson (raster
// MapServer image overlays carry no attributes). The "Detect" action recenters the map on the
// point first so the overlay tiles are rendered there before querying.

import type { PreflightFormState } from '../types.ts';

/** PreFlight form fields that can be auto-filled (string / number fields only). */
export type PreflightAutofillField = {
    [K in keyof PreflightFormState]: PreflightFormState[K] extends string | number | null ? K : never;
}[keyof PreflightFormState];

export interface OverlayFieldMapping {
    /** PreFlight form field to fill, e.g. 'landManager', 'airspaceClass', 'maxAltitudeAglFt'. */
    formField: PreflightAutofillField;
    /**
     * Overlay layer id from "Inspect overlays at point". Prefer the STABLE id (no leading
     * overlay number), e.g. "136-poly". A full runtime id ("1202-136-poly") also works —
     * matching ignores the volatile leading "N-" so it survives id resets between runs/users.
     */
    overlayLayerId: string;
    /** Property key on that overlay's features whose value to use, e.g. "districtname". */
    attribute: string;
    /**
     * Optional translation from the overlay's attribute value → the value your form expects.
     * Use when the overlay's wording differs from your option labels, e.g.
     *   { 'Red Rock Ranger District': 'USFS Coconino — Red Rock Ranger District' }
     * Keys are matched case-insensitively and whitespace-normalized. Unlisted values pass through.
     */
    valueMap?: Record<string, string>;
    /** Optional human note — ignored by code. */
    note?: string;
}

export const OVERLAY_FIELD_MAP: OverlayFieldMapping[] = [
    // --- Examples (commented). Replace with real ids/keys discovered via "Inspect overlays". ---
    // {
    //     formField: 'landManager',
    //     overlayLayerId: '1202-136-poly',
    //     attribute: 'districtname',
    //     note: 'Land Manager / Owner',
    //     valueMap: {
    //         'Red Rock Ranger District': 'USFS Coconino — Red Rock Ranger District',
    //     },
    // },
    // {
    //     formField: 'airspaceClass',
    //     overlayLayerId: 'REPLACE-poly',
    //     attribute: 'CLASS',
    //     note: 'Airspace Class (must match an option: G/D/E/C/B)',
    // },
    // {
    //     formField: 'maxAltitudeAglFt',
    //     overlayLayerId: 'REPLACE-poly',
    //     attribute: 'CEILING',
    //     note: 'Maximum Permitted Altitude (AGL) — written as a number',
    // },
    {
        formField: 'maxAltitudeAglFt',
        overlayLayerId: '1217-UASFM100-poly',
        attribute: 'CEILING',
        note: 'Maximum Permitted Altitude (AGL) — written as a number',
    },
    {
        formField: 'maxAltitudeAglFt',
        overlayLayerId: '1217-UASFM50-poly',
        attribute: 'CEILING',
        note: 'Maximum Permitted Altitude (AGL) — written as a number',
    },
    {
        formField: 'maxAltitudeAglFt',
        overlayLayerId: '1217-UASFM0-poly',
        attribute: 'CEILING',
        note: 'Maximum Permitted Altitude (AGL) — written as a number',
    },
    {
        formField: 'maxAltitudeAglFt',
        overlayLayerId: '1217-UASFM200-poly',
        attribute: 'CEILING',
        note: 'Maximum Permitted Altitude (AGL) — written as a number',
    },
    {
        formField: 'maxAltitudeAglFt',
        overlayLayerId: '1217-UASFM300-poly',
        attribute: 'CEILING',
        note: 'Maximum Permitted Altitude (AGL) — written as a number',
    },
    {
        formField: 'maxAltitudeAglFt',
        overlayLayerId: '1217-UASFM400-poly',
        attribute: 'CEILING',
        note: 'Maximum Permitted Altitude (AGL) — written as a number',
    },
    {
        formField: 'laancRequired',
        overlayLayerId: '1217-UASFM100-poly',
        attribute: 'LAANC_REQUIRED',
        note: 'LAANC Required',
        valueMap: {
            '100': 'Yes',
        },
    },
    {
        formField: 'laancRequired',
        overlayLayerId: '1217-UASFM50-poly',
        attribute: 'LAANC_REQUIRED',
        note: 'LAANC Required',
        valueMap: {
            '50': 'Yes',
        },
    },
    {
        formField: 'laancRequired',
        overlayLayerId: '1217-UASFM0-poly',
        attribute: 'LAANC_REQUIRED',
        note: 'LAANC Required',
        valueMap: {
            '0': 'Yes',
        },
    },
    {
        formField: 'laancRequired',
        overlayLayerId: '1217-UASFM200-poly',
        attribute: 'LAANC_REQUIRED',
        note: 'LAANC Required',
        valueMap: {
            '200': 'Yes',
        },
    },
    {
        formField: 'laancRequired',
        overlayLayerId: '1217-UASFM300-poly',
        attribute: 'LAANC_REQUIRED',
        note: 'LAANC Required',
        valueMap: {
            '300': 'Yes',
        },
    },
    {
        formField: 'laancRequired',
        overlayLayerId: '1217-UASFM400-poly',
        attribute: 'LAANC_REQUIRED',
        note: 'LAANC Required',
        valueMap: {
            '400': 'Yes',
        },
    },
];
