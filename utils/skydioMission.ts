import type { Geometry, Position } from 'geojson';

export const FEET_TO_METERS = 0.3048;

export interface MapCaptureInput {
    displayName: string;
    /** Area scan height above takeoff, in meters. */
    areaScanHeightMeters: number;
    /** Top/bottom overlap percentage. */
    areaOverlap: number;
    /** Side overlap (sidelap) percentage. */
    areaSidelap: number;
    /** Outer ring of the polygon as GeoJSON [lng, lat] positions. */
    ring: Position[];
}

export interface GpsPolygonVertex {
    latitude: number;
    longitude: number;
    key: string;
    hasAltitude: false;
    altitude: 0;
    hasHeading: false;
    heading: 0;
    hasGimbalPitch: false;
    gimbalPitch: 0;
}

function ringIsClosed(ring: Position[]): boolean {
    if (ring.length < 2) return false;
    const first = ring[0];
    const last = ring[ring.length - 1];
    return first[0] === last[0] && first[1] === last[1];
}

/**
 * Convert a GeoJSON polygon outer ring ([lng, lat] positions) into the Skydio
 * gpsPolygon vertex list. Keys are "0".."n-1" for the unique vertices, and the
 * closing vertex (a repeat of the first) uses key "0" to match the Skydio
 * Map Capture template.
 */
export function polygonRingToGpsPolygon(ring: Position[]): GpsPolygonVertex[] {
    const closed = ringIsClosed(ring) ? ring : [...ring, ring[0]];

    return closed.map((position, index) => {
        const isClosingVertex = index === closed.length - 1;
        return {
            latitude: position[1],
            longitude: position[0],
            key: isClosingVertex ? '0' : String(index),
            hasAltitude: false,
            altitude: 0,
            hasHeading: false,
            heading: 0,
            hasGimbalPitch: false,
            gimbalPitch: 0,
        };
    });
}

/** Average of the unique ring vertices (ignores the closing duplicate). */
export function polygonCentroid(ring: Position[]): { lat: number; lon: number } {
    const unique = ringIsClosed(ring) ? ring.slice(0, -1) : ring;
    if (unique.length === 0) {
        return { lat: 0, lon: 0 };
    }

    let lonSum = 0;
    let latSum = 0;
    for (const position of unique) {
        lonSum += position[0];
        latSum += position[1];
    }

    return {
        lat: latSum / unique.length,
        lon: lonSum / unique.length,
    };
}

/** Extract the outer ring from a GeoJSON Polygon geometry. */
export function polygonOuterRing(geometry: Geometry): Position[] | null {
    if (geometry.type !== 'Polygon') return null;
    const ring = geometry.coordinates[0];
    if (!Array.isArray(ring) || ring.length < 3) return null;
    return ring;
}

function buildSettingsManager(
    areaScanHeightMeters: number,
    areaOverlap: number,
    areaSidelap: number,
): Record<string, unknown> {
    return {
        scanModeLcm: 'MAP_AREA',
        runAreaScan: true,
        areaScanHeight: areaScanHeightMeters,
        areaOverlap,
        areaSidelap,
        crossHatchGimbalAngle: 60,
        perimeterGimbalPitch: 60,
        perimeterNumHeights: '1',
        perimeterMinDistanceToScanPlane: 2,
        specificationSelection: 'MAP',
        perimeterOverlap: 80,
        useGeofenceArea: true,
        globalMaximumSpeed: 5,
        enableCustomFlightLegDirection: true,
        customFlightLegDirection: 142,
        areaGimbalPitch: 90,
        diagonalOverlap: 85,
        diagonalGimbalPitch: 60,
        runPerimeterScan: false,
        runOrbitScan: false,
        runMeshScan: false,
        runContourZScan: false,
        runContourYScan: false,
        runContourXScan: false,
        runContourCustomScan: false,
        runManualScan: false,
        runColumnScan: false,
        runVertexColumnScan: false,
        runStructureColumnInspectionScan: false,
        runDiagonalScan: false,
        stopForPhoto: false,
        ignoreTranslationMotionBlurConstraint: false,
        maxMotionBlurPx: 0,
        overlapPercentage: 0,
        distanceToSurface: 0,
        showArCoverageMesh: false,
        awbMode: 'AWB_MODE_AUTO',
        exposureMode: 'EXP_MODE_AUTO',
        autofocusMode: 'OFF',
        eoRecordingMode: 'VIDEO_DEFAULT',
        geofenceStrictCeiling: false,
        geofenceCeilOffset: 0,
        geofenceStrictFloor: false,
        geofenceFloorOffset: 0,
        geofenceStrictLateral: false,
        geofenceLateralOffset: 0,
        geofenceOffsetFloorFromPolygonPrismCeiling: false,
        minDistanceFromSurface: 0,
        exteriorCaptureCeil: false,
        exteriorCaptureFloor: false,
        exteriorCaptureLateral: false,
        scanVolumeInside: false,
        scanVolumeExtendCaptureDistance: 0,
        enableCrossHatch: false,
        enableCustomCameraHeading: false,
        ccwPerpendicularCameraHeading: false,
        scanPlaneOffsetFromNavTakeoff: 0,
        rollingShutterCorrection: false,
        isLookupScan: false,
        orbitSidelap: 0,
        orbitGimbalPitch: 0,
        orbitUseHelix: false,
        numColumns: 0,
        columnOverlap: 0,
        columnGimbalPitch: 0,
        contourDesiredRange: 0,
        contourWaypointOverlapPercentage: 0,
        contourSliceOverlapPercentage: 0,
        contourZLookdownAngle: 0,
        avoidRedundantCoverage: false,
        adjustUnreachablePhotos: false,
        contourNumPasses: '0',
        contourPassMultiplier: 0,
        contourSlicePitch: 0,
        contourSliceYaw: 0,
        contourSmallGapsDistance: 0,
        contourLongRange: false,
        verticalOverlapFractionPercentage: 0,
        gimbalPitchDeg: 0,
        lengthTower: 0,
        upAndOverHeight: 0,
        standoffDistance: 0,
        explorationOrbitRadius: 0,
        explorationOrbitHeight: 0,
        towerHeight: 0,
        towerWidth: 0,
        towerDepth: 0,
        nadirExecutionMode: 'CAPTURE',
        nadirFillImage: 0,
        overviewExecutionMode: 'CAPTURE',
        overviewGimbalPitchDown: 0,
        insulatorExecutionMode: 'CAPTURE',
        columnPlanType: 'FOUR_COLUMNS',
        useSemanticInspectionGimbalPitchUp: false,
        semanticInspectionGimbalPitchUp: 0,
        useSemanticInspectionGimbalPitchStraight: false,
        useSemanticInspectionGimbalPitchDown: false,
        semanticInspectionGimbalPitchDown: 0,
        towerBodyExecutionMode: 'CAPTURE',
        towerBodyEnabled: false,
        towerBodyTakePhoto: false,
        towerBodyPitch: 0,
        towerBodyOverlap: 0,
        spanExecutionMode: 'CAPTURE',
        spanEnabled: false,
        spanTakePhoto: false,
        autonomousTowerAlignment: false,
        useSemanticAim: false,
        numberPitchAngles: 0,
        nadirTakePhoto: false,
        overviewEnabled: false,
        overviewTakePhoto: false,
        insulatorEnabled: false,
        insulatorTakePhoto: false,
        semanticInspectionGimbalPitchStraight: 0,
        columnIndices: [],
        compensationMode: 'COMP_MODE_0',
        useGlobalMapFromRtk: false,
        useExplorationPhase: false,
        useMeshExplore: false,
        useLongRangeExplore: false,
        useOrbitExploration: false,
        globalSupportOutsideGeofencePoints: false,
        splitExplorationIsEnabled: false,
        splitExplorationIsCumulative: false,
        splitExplorationIsTopToBottom: false,
        splitExplorationSliceHeight: 0,
        usePillarCursor: false,
        usePillarCursorMarker: false,
        useExtremeCursor: false,
        lockAwbAtFirstWaypoint: false,
        lockAfAtFirstWaypoint: false,
        useGpsScanPose: false,
        lostCommsWaitTime: 0,
        lostCommsRallyWaitTime: 0,
        numPhotosPerOrbit: '0',
        lookOutwards: false,
        orbitCounterClockwise: false,
        takeIrPhotos: false,
        takeRawPhotos: false,
        terrainFollow: false,
        useRealTimeTerrainDetection: false,
        dtedMapPath: '',
    };
}

const SETTINGS_KEYS = [
    'runAreaScan',
    'runDiagonalScan',
    'runPerimeterScan',
    'stopForPhoto',
    'areaGimbalPitch',
    'areaOverlap',
    'areaSidelap',
    'areaScanHeight',
    'ccwPerpendicularCameraHeading',
    'crossHatchGimbalAngle',
    'customFlightLegDirection',
    'enableCustomCameraHeading',
    'enableCustomFlightLegDirection',
    'globalMaximumSpeed',
    'perimeterGimbalPitch',
    'perimeterMinDistanceToScanPlane',
    'perimeterNumHeights',
    'perimeterOverlap',
    'diagonalGimbalPitch',
    'diagonalOverlap',
    'scanModeLcm',
    'specificationSelection',
    'useGeofenceArea',
    'enableCrossHatch',
    'scanPlaneOffsetFromNavTakeoff',
    'terrainFollow',
];

/**
 * Build a Skydio "Map Capture" (SurfaceScanSkill) mission object from a polygon
 * and the user-supplied scan settings. Returns a plain object ready to be
 * serialized and downloaded for manual import into Skydio Cloud.
 */
export function buildMapCaptureMission(input: MapCaptureInput): Record<string, unknown> {
    const { displayName, areaScanHeightMeters, areaOverlap, areaSidelap, ring } = input;

    const centroid = polygonCentroid(ring);

    return {
        uuid: crypto.randomUUID(),
        displayName,
        templateUuid: crypto.randomUUID(),
        actions: [
            {
                actionUuid: crypto.randomUUID(),
                actionKey: 'Sequence',
                args: {
                    sequence: {
                        actions: [
                            {
                                actionUuid: crypto.randomUUID(),
                                actionKey: 'SurfaceScanSkill',
                                args: {
                                    surfaceScanSkill: {
                                        inspectionParameters: {
                                            polygonPrism: {
                                                maxHeight: 1,
                                                minHeight: -1,
                                            },
                                            gpsHelper: {
                                                gpsPolygon: polygonRingToGpsPolygon(ring),
                                                overwriteGlobalMapGpsOriginZFromWorldTNavZ: false,
                                            },
                                            viewpointCandidates: [],
                                            relocalizationStrategy: 'NONE',
                                            singleOrbitRequests: [],
                                            structures: [],
                                            globalMapTColumnPositionsXy: [],
                                            dtedSourceFiles: [],
                                        },
                                        settingsManager: buildSettingsManager(
                                            areaScanHeightMeters,
                                            areaOverlap,
                                            areaSidelap,
                                        ),
                                        settingsKeys: [...SETTINGS_KEYS],
                                        siteName: displayName,
                                        cameraSettings: {
                                            awbMode: 'AWB_MODE_5000K',
                                            zoomLevel: 1,
                                            recordingMode: 'PHOTO_HIGH_RES',
                                            eoSensor: 'R47_CINE',
                                            isoMode: 'ISO_MODE_AUTO',
                                            exposureMode: 'EXP_MODE_AUTO',
                                            compensationMode: 'COMP_MODE_0',
                                        },
                                        photoFormatSettings: {
                                            eoPhotoFormats: ['JPEG'],
                                            irPhotoFormats: [],
                                        },
                                        scanSkillStateId: '',
                                        resumeScan: false,
                                        saveName: '',
                                        saveUclock: '0',
                                        scanModeLabel: '',
                                    },
                                    photoOnCompletion: false,
                                    isSkippable: false,
                                },
                            },
                        ],
                        name: 'root_sequence',
                        hideReverseUi: true,
                    },
                    photoOnCompletion: false,
                    isSkippable: false,
                },
            },
        ],
        postMissionAction: 'DEFAULT_RETURN',
        lostConnectionAction: 'RETURN_TO_HOME',
        postFailureAction: 'DEFAULT_RETURN',
        dockMission: true,
        autoStart: true,
        expectedGpsOrigin: {
            lat: centroid.lat,
            lon: centroid.lon,
            gpsAltitude: 0,
            gpsHeading: 0,
        },
        autonomousAbortMissionOnFailedAction: true,
        useRtxSettings: true,
        rtxSettings: {
            faceForward: true,
            minimumHeight: 71.93368,
            waitTime: 60,
            speed: 8.493746,
            ascendFromCurrentHeight: true,
            globalPathfinderReturnHeightAgl: 0,
            landOnceReturned: false,
            waitTimeBeforeLand: 0,
            dontReturnOnLostComms: false,
            useBacktrack: false,
            useGlobalPathfinder: false,
            lowBatteryAutoRth: false,
            dontDescend: false,
            dontReturnOnLostCommsInAtti: false,
            attiReturnAltAgl: 0,
            cancelAttiReturnWithTimer: false,
            cancelAttiReturnWaitTime: 0,
        },
        utime: '0',
        scheduledMissionUuid: '',
        missionRunnerSkill: 'MISSION_RUNNER',
        flightId: '',
        ncpgFileId: '',
        globalGraphFileId: '',
        needsGpsInitializationMove: false,
        returnToPathOnResume: false,
        showSkipUi: false,
        useRecordingMode: false,
        recordingMode: 'VIDEO_DEFAULT',
        useIsoMode: false,
        isoMode: 'ISO_MODE_AUTO',
        useExposureMode: false,
        exposureMode: 'EXP_MODE_AUTO',
        useAwbMode: false,
        awbMode: 'AWB_MODE_AUTO',
        useCompensationMode: false,
        compensationMode: 'COMP_MODE_0',
        enableFaultBasedDirectRtd: false,
        needsNcpgInitialization: false,
        videoBitrateOverride: 0,
        navigationModeOverrideEnabled: false,
        navigationModeOverride: 'UNKNOWN',
        needsGlobalGraph: false,
        disableStrobeLights: false,
        skipUpload: false,
        skipPausedState: false,
    };
}

export interface WaypointMissionInput {
    displayName: string;
    /** Waypoint height above takeoff, in meters (WORLD_TAKEOFF frame). */
    waypointZMeters: number;
    /** GeoJSON LineString coordinates as [lng, lat] positions. */
    line: Position[];
}

/** Extract LineString coordinates from a GeoJSON geometry. */
export function lineStringCoords(geometry: Geometry): Position[] | null {
    if (geometry.type !== 'LineString') return null;
    const coords = geometry.coordinates;
    if (!Array.isArray(coords) || coords.length < 2) return null;
    return coords;
}

function obstacleAvoidanceAction(): Record<string, unknown> {
    return {
        actionUuid: crypto.randomUUID(),
        actionKey: 'SetObstacleAvoidance',
        args: {
            setObstacleAvoidance: { oaSetting: 'DEFAULT', freeLookMode: 'UNKNOWN' },
            photoOnCompletion: false,
            isSkippable: false,
        },
    };
}

function startVideoAction(): Record<string, unknown> {
    return {
        actionUuid: crypto.randomUUID(),
        actionKey: 'StartVideo',
        args: {
            startVideo: {
                cameraSettings: {
                    zoomLevel: 1,
                    recordingMode: 'VIDEO_4K_DEEP_30FPS',
                    isoMode: 'ISO_MODE_AUTO',
                    exposureMode: 'EXP_MODE_AUTO',
                    awbMode: 'AWB_MODE_AUTO',
                    eoSensor: 'UNKNOWN',
                    compensationMode: 'COMP_MODE_0',
                },
                isoMode: 'ISO_MODE_AUTO',
                exposureMode: 'EXP_MODE_AUTO',
                awbMode: 'AWB_MODE_AUTO',
                freeLookMode: 'UNKNOWN',
            },
            photoOnCompletion: false,
            isSkippable: false,
        },
    };
}

function gotoWaypointAction(latitude: number, longitude: number, zMeters: number): Record<string, unknown> {
    return {
        actionUuid: crypto.randomUUID(),
        actionKey: 'GotoWaypoint',
        args: {
            gotoWaypoint: {
                waypoint: {
                    xy: { x: latitude, y: longitude, frame: 'GPS' },
                    z: { value: zMeters, frame: 'WORLD_TAKEOFF' },
                    heading: { value: 0, frame: 'GPS' },
                    gimbalPitch: { value: 0.7853982 },
                },
                motionArgs: {
                    traversalArgs: {
                        speed: 5,
                        heightMode: 'GRADUAL',
                        ascendSpeed: 0,
                        descendSpeed: 0,
                        ignoreWaypointZ: false,
                        usePathfinder: false,
                        useGlobalPathfinder: false,
                    },
                    lookAtArgs: {
                        headingMode: 'GRADUAL',
                        gimbalPitchMode: 'GRADUAL',
                        ignoreTargetHeading: false,
                        ignoreTargetGimbalPitch: false,
                    },
                },
                preserveArScene: false,
                freeLookMode: 'UNKNOWN',
            },
            photoOnCompletion: false,
            isSkippable: false,
        },
    };
}

function waypointSequenceAction(latitude: number, longitude: number, zMeters: number): Record<string, unknown> {
    return {
        actionUuid: crypto.randomUUID(),
        actionKey: 'Sequence',
        args: {
            sequence: {
                actions: [
                    obstacleAvoidanceAction(),
                    startVideoAction(),
                    gotoWaypointAction(latitude, longitude, zMeters),
                    obstacleAvoidanceAction(),
                ],
                name: '',
                hideReverseUi: false,
            },
            photoOnCompletion: false,
            isSkippable: false,
        },
    };
}

/**
 * Build a full Skydio waypoint-flight mission object from a LineString. Mirrors
 * SKydio_way-point_example.json: each vertex becomes a Sequence of
 * SetObstacleAvoidance -> StartVideo -> GotoWaypoint -> SetObstacleAvoidance.
 * Returned object is ready to serialize and download for manual import.
 */
export function buildWaypointMission(input: WaypointMissionInput): Record<string, unknown> {
    const { displayName, waypointZMeters, line } = input;

    const first = line[0];

    return {
        uuid: crypto.randomUUID(),
        displayName,
        templateUuid: crypto.randomUUID(),
        actions: [
            {
                actionUuid: crypto.randomUUID(),
                actionKey: 'Sequence',
                args: {
                    sequence: {
                        actions: line.map((position) =>
                            waypointSequenceAction(position[1], position[0], waypointZMeters)),
                        name: 'root_sequence',
                        hideReverseUi: false,
                    },
                    photoOnCompletion: false,
                    isSkippable: false,
                },
            },
        ],
        postMissionAction: 'DEFAULT_RETURN',
        lostConnectionAction: 'RETURN_TO_HOME',
        postFailureAction: 'DEFAULT_RETURN',
        dockMission: true,
        autoStart: true,
        showSkipUi: true,
        expectedGpsOrigin: {
            lat: first[1],
            lon: first[0],
            gpsAltitude: 0,
            gpsHeading: 0,
        },
        recordingMode: 'VIDEO_1080P_30FPS',
        autonomousAbortMissionOnFailedAction: true,
        useRtxSettings: true,
        rtxSettings: {
            faceForward: true,
            minimumHeight: 78,
            waitTime: 60,
            speed: 8.493746,
            globalPathfinderReturnHeightAgl: 0,
            ascendFromCurrentHeight: false,
            landOnceReturned: false,
            waitTimeBeforeLand: 0,
            dontReturnOnLostComms: false,
            useBacktrack: false,
            useGlobalPathfinder: false,
            lowBatteryAutoRth: false,
            dontDescend: false,
            dontReturnOnLostCommsInAtti: false,
            attiReturnAltAgl: 0,
            cancelAttiReturnWithTimer: false,
            cancelAttiReturnWaitTime: 0,
        },
        useRecordingMode: true,
        utime: '0',
        scheduledMissionUuid: '',
        missionRunnerSkill: 'MISSION_RUNNER',
        flightId: '',
        ncpgFileId: '',
        globalGraphFileId: '',
        needsGpsInitializationMove: false,
        returnToPathOnResume: false,
        useIsoMode: false,
        isoMode: 'ISO_MODE_AUTO',
        useExposureMode: false,
        exposureMode: 'EXP_MODE_AUTO',
        useAwbMode: false,
        awbMode: 'AWB_MODE_AUTO',
        useCompensationMode: false,
        compensationMode: 'COMP_MODE_0',
        enableFaultBasedDirectRtd: false,
        needsNcpgInitialization: false,
        videoBitrateOverride: 0,
        navigationModeOverrideEnabled: false,
        navigationModeOverride: 'UNKNOWN',
        needsGlobalGraph: false,
        disableStrobeLights: false,
        skipUpload: false,
        skipPausedState: false,
    };
}

export interface WaypointTemplateInput {
    name: string;
    /** Waypoint height above takeoff, in feet (NAV frame z). */
    waypointZFeet: number;
    /** GeoJSON LineString coordinates as [lng, lat] positions. */
    line: Position[];
}

/**
 * Build the documented Skydio POST /v0/mission/template body ({ name, waypoints })
 * from a LineString. Used by the "Send to Skydio" path. The richer
 * video/obstacle-avoidance actions from the full template are intentionally
 * dropped since this schema does not support them.
 */
export function buildWaypointTemplate(input: WaypointTemplateInput): Record<string, unknown> {
    const { name, waypointZFeet, line } = input;

    return {
        name,
        waypoints: line.map((position) => ({
            position: {
                frame: 'GPS',
                latitude: position[1],
                longitude: position[0],
                z: waypointZFeet,
                z_frame: 'NAV',
            },
            orientation: {
                heading_degrees: 0,
                gimbal_pitch_degrees: -45,
            },
        })),
    };
}

/** Trigger a browser download of an object serialized as pretty-printed JSON. */
export function downloadMissionJson(mission: Record<string, unknown>, filename: string): void {
    const blob = new Blob([JSON.stringify(mission, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.click();
    URL.revokeObjectURL(url);
}
