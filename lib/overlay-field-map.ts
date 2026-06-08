// Static overlay → PreFlight form-field mapping (Paul-authored).
//
// Each row tells the PreFlight tab: "at the selected map point, read property
// `attribute` from the overlay layer `overlayLayerId`, and write it into the
// PreFlight form field `formField`."
//
// How to fill this in:
//   1. Fill in `OVERLAY_NAMES` below with the exact labels from the CloudTAK Overlays menu.
//   2. In the PreFlight tab, pick a point, click "Inspect overlays at point" (with the overlay on
//      once manually) to discover stable layer ids and attribute keys.
//   3. Add or adjust rows using `overlayName`, `overlayLayerId` (stable suffix), and `attribute`.
//
// IMPORTANT — layer ids reset:
//   CloudTAK prefixes each overlay layer with `${overlay.id}-`, and that leading number is reassigned
//   on every restart and can differ between users. Detection matches on the STABLE suffix (the part
//   after the leading "N-"), so `overlayLayerId` survives id resets.
//
// On-demand overlays:
//   The Detect buttons temporarily turn on only the overlays referenced by the rows being detected,
//   then turn back off the ones that were off before. You do not need to leave all layers on in the UI.

import type { PreflightFormState } from '../types.ts';

/** Exact overlay names from the CloudTAK Overlays menu — fill in once, reuse on every row. */
export const OVERLAY_NAMES = {
    uasfm: 'TODO: FAA UAS Facility Map',
    faaSpecialUse: 'TODO: FAA Special Use Airspace',
    faaProhibited: 'TODO: FAA Prohibited / Restricted',
    gcnpSfra: 'TODO: GCNP SFRA',
    wilderness: 'TODO: Wilderness',
    landowner: 'TODO: Land Owner / Managing Agency',
    airspaceClass: 'TODO: FAA Class Airspace',
} as const;

/** PreFlight form fields that can be auto-filled (string / number fields only). */
export type PreflightAutofillField = {
    [K in keyof PreflightFormState]: PreflightFormState[K] extends string | number | null ? K : never;
}[keyof PreflightFormState];

export interface OverlayFieldMapping {
    /** PreFlight form field to fill, e.g. 'landManager', 'airspaceClass', 'maxAltitudeAglFt'. */
    formField: PreflightAutofillField;
    /**
     * Exact overlay name from the CloudTAK Overlays menu (see `OVERLAY_NAMES`).
     * Used to turn the overlay on temporarily during Detect.
     */
    overlayName: string;
    /**
     * Stable MapLibre layer suffix from "Inspect overlays at point", e.g. "UASFM100-poly".
     * A full runtime id ("1217-UASFM100-poly") also works — the volatile leading "N-" is ignored.
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

export function overlayNamesForMappings(mappings: OverlayFieldMapping[]): string[] {
    return [...new Set(mappings.map((row) => row.overlayName.trim()).filter(Boolean))];
}

export function mappingsMissingOverlayName(mappings: OverlayFieldMapping[]): OverlayFieldMapping[] {
    return mappings.filter((row) => !row.overlayName.trim() || row.overlayName.startsWith('TODO:'));
}

export const OVERLAY_FIELD_MAP: OverlayFieldMapping[] = [
    {
        formField: 'maxAltitudeAglFt',
        overlayName: OVERLAY_NAMES.uasfm,
        overlayLayerId: 'UASFM100-poly',
        attribute: 'CEILING',
        note: 'Maximum Permitted Altitude (AGL) — written as a number',
    },
    {
        formField: 'maxAltitudeAglFt',
        overlayName: OVERLAY_NAMES.uasfm,
        overlayLayerId: 'UASFM50-poly',
        attribute: 'CEILING',
        note: 'Maximum Permitted Altitude (AGL) — written as a number',
    },
    {
        formField: 'maxAltitudeAglFt',
        overlayName: OVERLAY_NAMES.uasfm,
        overlayLayerId: 'UASFM0-poly',
        attribute: 'CEILING',
        note: 'Maximum Permitted Altitude (AGL) — written as a number',
        valueMap: {
            '0': '0 - NO FLY ZONE',
        },
    },
    {
        formField: 'maxAltitudeAglFt',
        overlayName: OVERLAY_NAMES.uasfm,
        overlayLayerId: 'UASFM200-poly',
        attribute: 'CEILING',
        note: 'Maximum Permitted Altitude (AGL) — written as a number',
    },
    {
        formField: 'maxAltitudeAglFt',
        overlayName: OVERLAY_NAMES.uasfm,
        overlayLayerId: 'UASFM300-poly',
        attribute: 'CEILING',
        note: 'Maximum Permitted Altitude (AGL) — written as a number',
    },
    {
        formField: 'maxAltitudeAglFt',
        overlayName: OVERLAY_NAMES.uasfm,
        overlayLayerId: 'UASFM400-poly',
        attribute: 'CEILING',
        note: 'Maximum Permitted Altitude (AGL) — written as a number',
    },
    {
        formField: 'laancRequired',
        overlayName: OVERLAY_NAMES.uasfm,
        overlayLayerId: 'UASFM100-poly',
        attribute: 'LAANC_REQUIRED',
        note: 'LAANC Required',
        valueMap: {
            '100': 'Yes',
        },
    },
    {
        formField: 'laancRequired',
        overlayName: OVERLAY_NAMES.uasfm,
        overlayLayerId: 'UASFM50-poly',
        attribute: 'LAANC_REQUIRED',
        note: 'LAANC Required',
        valueMap: {
            '50': 'Yes',
        },
    },
    {
        formField: 'laancRequired',
        overlayName: OVERLAY_NAMES.uasfm,
        overlayLayerId: 'UASFM0-poly',
        attribute: 'LAANC_REQUIRED',
        note: 'LAANC Required',
        valueMap: {
            '0': 'Yes',
        },
    },
    {
        formField: 'laancRequired',
        overlayName: OVERLAY_NAMES.uasfm,
        overlayLayerId: 'UASFM200-poly',
        attribute: 'LAANC_REQUIRED',
        note: 'LAANC Required',
        valueMap: {
            '200': 'Yes',
        },
    },
    {
        formField: 'laancRequired',
        overlayName: OVERLAY_NAMES.uasfm,
        overlayLayerId: 'UASFM300-poly',
        attribute: 'LAANC_REQUIRED',
        note: 'LAANC Required',
        valueMap: {
            '300': 'Yes',
        },
    },
    {
        formField: 'laancRequired',
        overlayName: OVERLAY_NAMES.uasfm,
        overlayLayerId: 'UASFM400-poly',
        attribute: 'LAANC_REQUIRED',
        note: 'LAANC Required',
        valueMap: {
            '400': 'Yes',
        },
    },
    {
        formField: 'airspaceSpecial',
        overlayName: OVERLAY_NAMES.faaSpecialUse,
        overlayLayerId: '394-poly',
        attribute: 'TYPE_CODE',
        note: 'Airspace Special',
        valueMap: {
            'R': 'Restricted - Check NOTAM',
        },
    },
    {
        formField: 'airspaceSpecial',
        overlayName: OVERLAY_NAMES.faaProhibited,
        overlayLayerId: '400-poly',
        attribute: 'REASON',
        note: 'NATIONAL SECURITY',
        valueMap: {
            'NATIONAL SECURITY': 'NO FLY ZONE',
        },
    },
    {
        formField: 'airspaceSpecial',
        overlayName: OVERLAY_NAMES.gcnpSfra,
        overlayLayerId: 'gcnp-sectors-fill',
        attribute: 'LOCAL_TYPE',
        note: 'Airspace Special',
        valueMap: {
            'SFRA': 'GCNP SFRA - Check with Interagency Aviation Coordinator',
        },
    },
    {
        formField: 'landManagerPermissionRequired',
        overlayName: OVERLAY_NAMES.gcnpSfra,
        overlayLayerId: 'gcnp-sectors-fill',
        attribute: 'LOCAL_TYPE',
        note: 'Airspace Special',
        valueMap: {
            'SFRA': 'Yes',
        },
    },
    {
        formField: 'landManagerPermissionRequired',
        overlayName: OVERLAY_NAMES.faaSpecialUse,
        overlayLayerId: '394-poly',
        attribute: 'TYPE_CODE',
        note: 'Airspace Special',
        valueMap: {
            'R': 'Yes',
        },
    },
    {
        formField: 'landManagerPermissionRequired',
        overlayName: OVERLAY_NAMES.faaProhibited,
        overlayLayerId: '400-poly',
        attribute: 'REASON',
        note: 'Land Manager Permission Required (Yes / No)',
        valueMap: {
            'National Security': 'Yes',
        },
    },
    {
        formField: 'landManagerPermissionRequired',
        overlayName: OVERLAY_NAMES.wilderness,
        overlayLayerId: 'wilderness-poly',
        attribute: 'Editor',
        note: 'Land Manager Permission Required (Yes / No)',
        valueMap: {
            'TWSAdmin': 'Yes',
        },
    },
    {
        formField: 'landManager',
        overlayName: OVERLAY_NAMES.landowner,
        overlayLayerId: 'landowner-poly',
        attribute: 'OWNERORMANAGINGAGENCY',
        note: 'Land Owner or Managing Agency',
        valueMap: {
            'Apache-Sitgreaves National Forests': 'United States Forest Service',
            'Coconino National Forest': 'United States Forest Service',
            'Kaibab National Forest': 'United States Forest Service',
            'Grand Canyon National Park': 'National Park Service',
            'Sunset Crater National Monument': 'National Park Service',
            'Walnut Canyon National Monument': 'National Park Service',
            'Vermilion Cliffs National Monument': 'Bureau of Land Management',
            'Bureau of Land Management': 'Bureau of Land Management',
            'Baaj Nwaavjo Itah Kukveni National Monument': 'Bureau of Land Management',
            'Glen Canyon National Recreation Area': 'National Park Service',
            'City of Page': 'County',
            'City of Flagstaff': 'County',
            'City of Williams': 'County',
            'City of Sedona': 'County',
            'Navajo Nation': 'Native American Reservation',
            'Hopi Tribal Land': 'Native American Reservation',
            'Hualapai Tribal Land': 'Native American Reservation',
            'Havasupai Tribal Land': 'Native American Reservation',
            'Private': 'Private',
            'State Trust': 'State Land',
        },
    },
    {
        formField: 'landManagerPermissionRequired',
        overlayName: OVERLAY_NAMES.landowner,
        overlayLayerId: 'landowner-poly',
        attribute: 'OWNERORMANAGINGAGENCY',
        note: 'Land Manager Permission Required (Yes / No)',
        valueMap: {
            'Apache-Sitgreaves National Forests': 'No',
            'Coconino National Forest': 'No',
            'Kaibab National Forest': 'No',
            'Grand Canyon National Park': 'Yes',
            'Sunset Crater National Monument': 'Yes',
            'Walnut Canyon National Monument': 'Yes',
            'Vermilion Cliffs National Monument': 'Yes',
            'Bureau of Land Management': 'Yes',
            'Baaj Nwaavjo Itah Kukveni National Monument': 'Yes',
            'Glen Canyon National Recreation Area': 'Yes',
            'City of Page': 'No',
            'City of Flagstaff': 'No',
            'City of Williams': 'No',
            'City of Sedona': 'No',
            'Navajo Nation': 'Yes',
            'Hopi Tribal Land': 'Yes',
            'Hualapai Tribal Land': 'Yes',
            'Havasupai Tribal Land': 'Yes',
            'Private': 'No',
            'State Trust': 'No',
        },
    },
    {
        formField: 'airspaceClass',
        overlayName: OVERLAY_NAMES.airspaceClass,
        overlayLayerId: 'E4-poly',
        attribute: 'TYPE_CODE',
        note: 'Airspace Class',
        valueMap: {
            'CLASS_E4': 'E',
        },
    },
    {
        formField: 'airspaceClass',
        overlayName: OVERLAY_NAMES.airspaceClass,
        overlayLayerId: 'D-poly',
        attribute: 'TYPE_CODE',
        note: 'Airspace Class',
        valueMap: {
            'CLASS_D': 'D',
        },
    },
];
