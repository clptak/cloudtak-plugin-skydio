// Overlay → PreFlight form-field mapping types and helpers.
//
// The rows themselves are deployment-specific and live in the gitignored config.local.ts
// (see config.local.example.ts). Each row tells the PreFlight tab: "at the selected map point,
// read property `attribute` from the overlay layer `overlayLayerId`, and write it into the
// PreFlight form field `formField`."
//
// How to fill the rows in:
//   1. In the PreFlight tab, pick a point, click "Inspect overlays at point" (with the overlay on
//      once manually) to discover stable layer ids and attribute keys.
//   2. Add or adjust rows in config.local.ts using `overlayLayerId` (stable suffix) and `attribute`,
//      then restart or rebuild CloudTAK's app/.
//
// IMPORTANT — layer ids reset:
//   CloudTAK prefixes each overlay layer with `${overlay.id}-`, and that leading number is reassigned
//   on every restart and can differ between users. Detection matches on the STABLE suffix (the part
//   after the leading "N-"), so `overlayLayerId` survives id resets.
//
// On-demand overlays:
//   The Detect buttons find the loaded overlays that own the rows' layer ids, temporarily turn on
//   the ones that are off, then turn those back off. You do not need to leave all layers on in the UI.

import type { PreflightFormState } from '../types.ts';
import { deploymentOverlayFieldMap } from '../storage/deploymentDefaults.ts';

/** PreFlight form fields that can be auto-filled (string / number fields only). */
export type PreflightAutofillField = {
    [K in keyof PreflightFormState]: PreflightFormState[K] extends string | number | null ? K : never;
}[keyof PreflightFormState];

export interface OverlayFieldMapping {
    /** PreFlight form field to fill, e.g. 'landManager', 'airspaceClass', 'maxAltitudeAglFt'. */
    formField: PreflightAutofillField;
    /**
     * Stable MapLibre layer suffix from "Inspect overlays at point", e.g. "UASFM100-poly".
     * Do not use the full runtime id ("1217-UASFM100-poly"): its leading "N-" changes on restart.
     */
    overlayLayerId: string;
    /** Property key on that overlay's features whose value to use, e.g. "CEILING". */
    attribute: string;
    /**
     * Optional translation from the overlay's attribute value → the value your form expects.
     * Keys are matched case-insensitively and whitespace-normalized. Unlisted values pass through.
     */
    valueMap?: Record<string, string>;
    /** Optional human note — ignored by code. */
    note?: string;
}

/** Per-field Detect buttons in the PreFlight tab — only overlays for these fields are enabled. */
export interface OverlayFieldGroup {
    id: string;
    label: string;
    fields: PreflightAutofillField[];
}

export const OVERLAY_FIELD_GROUPS: OverlayFieldGroup[] = [
    {
        id: 'altitude-laanc',
        label: 'Altitude & LAANC',
        fields: ['maxAltitudeAglFt', 'laancRequired'],
    },
    {
        id: 'airspace',
        label: 'Airspace Class & Special',
        fields: ['airspaceClass', 'airspaceSpecial'],
    },
    {
        id: 'land',
        label: 'Land Manager',
        fields: ['landManager', 'landManagerPermissionRequired'],
    },
];

export function mappingsForFields(fields: PreflightAutofillField[]): OverlayFieldMapping[] {
    const want = new Set(fields);
    return OVERLAY_FIELD_MAP.filter((row) => want.has(row.formField));
}

export function layerIdsForMappings(mappings: OverlayFieldMapping[]): string[] {
    return [...new Set(mappings.map((row) => row.overlayLayerId.trim()).filter(Boolean))];
}

/** Form fields with at least one row that depends on one of these layer ids. */
export function fieldsForLayerIds(
    mappings: OverlayFieldMapping[],
    layerIds: string[],
): PreflightAutofillField[] {
    const wanted = new Set(layerIds);
    return [...new Set(mappings.filter((row) => wanted.has(row.overlayLayerId.trim())).map((row) => row.formField))];
}

export const OVERLAY_FIELD_MAP: OverlayFieldMapping[] = deploymentOverlayFieldMap();
