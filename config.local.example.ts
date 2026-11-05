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
 * Which overlay attribute fills which PreFlight field. Detect finds each overlay
 * from its layer id, so overlay names and renames do not matter, but the overlay
 * must be in the person's Overlays menu.
 *
 * These rows are a working example for northern Arizona. They expect overlays for
 * the FAA UAS Facility Map (UASFM*), FAA Special Use Airspace (394-poly), FAA
 * Prohibited / Restricted areas (400-poly), the Grand Canyon SFRA
 * (gcnp-sectors-fill), Wilderness (wilderness-poly), Land Owner / Managing Agency
 * (landowner-poly), and FAA Class Airspace (E4-poly, D-poly).
 *
 * Layer ids depend on each overlay's style, and the value maps list local agencies,
 * so check both against this deployment with "Inspect overlays at point". Delete
 * any rows that do not apply.
 */
export const overlayFieldMap: OverlayFieldMapping[] = [
    {
        formField: 'maxAltitudeAglFt',
        overlayLayerId: 'UASFM100-poly',
        attribute: 'CEILING',
        note: 'Maximum Permitted Altitude (AGL) — written as a number',
    },
    {
        formField: 'maxAltitudeAglFt',
        overlayLayerId: 'UASFM50-poly',
        attribute: 'CEILING',
        note: 'Maximum Permitted Altitude (AGL) — written as a number',
    },
    {
        formField: 'maxAltitudeAglFt',
        overlayLayerId: 'UASFM0-poly',
        attribute: 'CEILING',
        note: 'Maximum Permitted Altitude (AGL) — written as a number',
        valueMap: {
            '0': '0 - NO FLY ZONE',
        },
    },
    {
        formField: 'maxAltitudeAglFt',
        overlayLayerId: 'UASFM200-poly',
        attribute: 'CEILING',
        note: 'Maximum Permitted Altitude (AGL) — written as a number',
    },
    {
        formField: 'maxAltitudeAglFt',
        overlayLayerId: 'UASFM300-poly',
        attribute: 'CEILING',
        note: 'Maximum Permitted Altitude (AGL) — written as a number',
    },
    {
        formField: 'maxAltitudeAglFt',
        overlayLayerId: 'UASFM400-poly',
        attribute: 'CEILING',
        note: 'Maximum Permitted Altitude (AGL) — written as a number',
    },
    {
        formField: 'laancRequired',
        overlayLayerId: 'UASFM100-poly',
        attribute: 'LAANC_REQUIRED',
        note: 'LAANC Required',
        valueMap: {
            '100': 'Yes',
        },
    },
    {
        formField: 'laancRequired',
        overlayLayerId: 'UASFM50-poly',
        attribute: 'LAANC_REQUIRED',
        note: 'LAANC Required',
        valueMap: {
            '50': 'Yes',
        },
    },
    {
        formField: 'laancRequired',
        overlayLayerId: 'UASFM0-poly',
        attribute: 'LAANC_REQUIRED',
        note: 'LAANC Required',
        valueMap: {
            '0': 'Yes',
        },
    },
    {
        formField: 'laancRequired',
        overlayLayerId: 'UASFM200-poly',
        attribute: 'LAANC_REQUIRED',
        note: 'LAANC Required',
        valueMap: {
            '200': 'Yes',
        },
    },
    {
        formField: 'laancRequired',
        overlayLayerId: 'UASFM300-poly',
        attribute: 'LAANC_REQUIRED',
        note: 'LAANC Required',
        valueMap: {
            '300': 'Yes',
        },
    },
    {
        formField: 'laancRequired',
        overlayLayerId: 'UASFM400-poly',
        attribute: 'LAANC_REQUIRED',
        note: 'LAANC Required',
        valueMap: {
            '400': 'Yes',
        },
    },
    {
        formField: 'airspaceSpecial',
        overlayLayerId: '394-poly',
        attribute: 'TYPE_CODE',
        note: 'Airspace Special',
        valueMap: {
            'R': 'Restricted - Check NOTAM',
        },
    },
    {
        formField: 'airspaceSpecial',
        overlayLayerId: '400-poly',
        attribute: 'REASON',
        note: 'NATIONAL SECURITY',
        valueMap: {
            'NATIONAL SECURITY': 'NO FLY ZONE',
        },
    },
    {
        formField: 'airspaceSpecial',
        overlayLayerId: 'gcnp-sectors-fill',
        attribute: 'LOCAL_TYPE',
        note: 'Airspace Special',
        valueMap: {
            'SFRA': 'GCNP SFRA - Check with Interagency Aviation Coordinator',
        },
    },
    {
        formField: 'landManagerPermissionRequired',
        overlayLayerId: 'gcnp-sectors-fill',
        attribute: 'LOCAL_TYPE',
        note: 'Airspace Special',
        valueMap: {
            'SFRA': 'Yes',
        },
    },
    {
        formField: 'landManagerPermissionRequired',
        overlayLayerId: '394-poly',
        attribute: 'TYPE_CODE',
        note: 'Airspace Special',
        valueMap: {
            'R': 'Yes',
        },
    },
    {
        formField: 'landManagerPermissionRequired',
        overlayLayerId: '400-poly',
        attribute: 'REASON',
        note: 'Land Manager Permission Required (Yes / No)',
        valueMap: {
            'National Security': 'Yes',
        },
    },
    {
        formField: 'landManagerPermissionRequired',
        overlayLayerId: 'wilderness-poly',
        attribute: 'Editor',
        note: 'Land Manager Permission Required (Yes / No)',
        valueMap: {
            'TWSAdmin': 'Yes',
        },
    },
    {
        formField: 'landManager',
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
        overlayLayerId: 'E4-poly',
        attribute: 'TYPE_CODE',
        note: 'Airspace Class',
        valueMap: {
            'CLASS_E4': 'E',
        },
    },
    {
        formField: 'airspaceClass',
        overlayLayerId: 'D-poly',
        attribute: 'TYPE_CODE',
        note: 'Airspace Class',
        valueMap: {
            'CLASS_D': 'D',
        },
    },
];
