import type { DeploymentSettings } from './storage/deploymentDefaults';
import type { OverlayFieldMapping } from './lib/overlay-field-map';

/**
 * Copy to config.local.ts (gitignored), fill in this deployment, then restart
 * or rebuild CloudTAK's app/. Each person still enters their own Skydio API key.
 *
 * These values are compiled into the web bundle. Anyone who can load CloudTAK
 * can read them, including the OAuth client secret. Do not put API keys here.
 */
export const deploymentDefaults: DeploymentSettings = {
    /** Must end with /application/o/token/ */
    authentikTokenUrl: '',
    oauthClientId: '',
    oauthClientSecret: '',
    /** Full SSE stream URL, e.g. https://webhook.example.com/events/skydio */
    skydioSseUrl: '',
    /** Optional. Leave blank to use the SSE URL base for telemetry. */
    skydioTelemetryRelayUrl: '',
    /** URL Skydio Cloud should POST alerts to. */
    skydioWebhookUrl: '',
};

/**
 * Exact labels from this deployment's CloudTAK Overlays menu, used by the
 * PreFlight Detect buttons. Leave a name blank if this deployment does not have
 * that overlay: Detect skips its rows and says which fields to verify manually.
 */
const OVERLAY_NAMES = {
    /** FAA UAS Facility Map: max altitude and LAANC */
    uasfm: '',
    /** FAA Special Use Airspace */
    faaSpecialUse: '',
    /** FAA Prohibited / Restricted areas */
    faaProhibited: '',
    /** Grand Canyon National Park SFRA */
    gcnpSfra: '',
    /** Wilderness areas */
    wilderness: '',
    /** Land owner / managing agency */
    landowner: '',
    /** FAA Class Airspace */
    airspaceClass: '',
};

/**
 * Which overlay attribute fills which PreFlight field. These rows are a working
 * example for northern Arizona. Layer ids depend on each overlay's style, and the
 * value maps list local agencies, so check both against this deployment with
 * "Inspect overlays at point". Delete any rows that do not apply.
 */
export const overlayFieldMap: OverlayFieldMapping[] = [
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
