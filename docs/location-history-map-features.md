# Location history → map features (handoff)

Use this in the **correct** repo where live location history is accumulated (e.g. SSE/webhook → CoT or GeoJSON import). This spec was drafted in `cloudtak-plugin-skydio` by mistake and **reverted** there; copy this file (or the module below) into your target project.

---

## Goal

As locations arrive over time, maintain a **history** per track key (vehicle, detection id, etc.). On each update, refresh map features so operators see:

1. **One** hostile ground marker (`a-h-G`) at the **most recent** location only.
2. When history length **> 1**, a **magenta** trail LineString from first → last, with **every** intermediate fix as a vertex.
3. **No gap** between trail and marker: the LineString’s **last vertex** must be the **same coordinate** as the Point (icon sits on the end of the line).
4. **Callsign** includes **UTC HHMM** of the latest fix (append `" 1430"` style suffix).

---

## Rules

| History size | Map output |
|--------------|------------|
| 0 | Nothing |
| 1 | Single Point, `type: a-h-G`, callsign + HHMM if timestamp present |
| 2+ | LineString (magenta) through **all** positions **including** the latest, **plus** Point at latest (`a-h-G`) |

### Styling

| Property | Value |
|----------|--------|
| Point CoT type | `a-h-G` |
| Line stroke | `#ff00ff` (rgb 255, 0, 255) |
| Line `stroke-width` | `2` |
| Line `stroke-opacity` | `1` |

### Callsign

- Base callsign from your domain (vehicle name, detection label, etc.).
- Append a space and **UTC HHMM** from the **latest** location’s receive/fix timestamp.
- Example: `Target Alpha 1430` (received at 14:30 UTC).
- If timestamp missing or unparseable, omit HHMM suffix.

### No gap (important)

Do **not** build the line from `positions.slice(0, -1)` with a separate point at the end. Use the **full** `positions` array for the LineString; the Point uses `positions[positions.length - 1]` — same lng/lat/(z).

---

## Streaming integration pattern

```text
On each incoming location (lon, lat, z?, timestamp, meta…):
  1. Append to in-memory history[key] (stable key per entity).
  2. Call locationHistoryGeoJsonFeatures(positions, pointMeta, opts).
  3. Replace/update map features for that key (two feature ids: point + optional line).
```

For CloudTAK plugins writing CoT/Features:

- `@tak-ps/node-cot/normalize_geojson` **overwrites** Point `type` to `u-d-p` — after normalize, **restore** `properties.type = 'a-h-G'` when importing.
- `stroke` on LineString is preserved by normalize when valid hex (e.g. `#ff00ff`).

---

## Reference module

Drop in as `lib/location-history.ts` (adjust import paths). No Skydio-specific deps.

```typescript
/** Hostile ground point — only the most recent location in a history. */
export const LOCATION_HISTORY_POINT_TYPE = 'a-h-G';

/** Magenta trail rgb(255, 0, 255). */
export const LOCATION_HISTORY_STROKE = '#ff00ff';

export type LocationHistoryPosition = [number, number, number];

export interface LocationHistoryPointMeta {
    timestamp?: string;
    gpsAltitude?: number;
    heightAboveTakeoff?: number;
    hybridAltitude?: number;
}

export interface LocationHistoryGeoJsonOptions {
    callsign: string;
    remarks: string;
    startTime?: string;
    endTime?: string;
    elevationSource?: string;
    takeoffMslMeters?: number;
}

/** UTC HHMM from an ISO timestamp. */
export function formatReceivedHhmm(timestamp: string | undefined): string {
    if (!timestamp) return '';
    const date = new Date(timestamp);
    if (Number.isNaN(date.getTime())) return '';
    const hh = String(date.getUTCHours()).padStart(2, '0');
    const mm = String(date.getUTCMinutes()).padStart(2, '0');
    return `${hh}${mm}`;
}

export function callsignWithReceivedHhmm(callsign: string, timestamp: string | undefined): string {
    const hhmm = formatReceivedHhmm(timestamp);
    return hhmm ? `${callsign} ${hhmm}` : callsign;
}

/**
 * Latest fix → a-h-G Point; 2+ fixes → magenta LineString (full history) + same Point.
 * Line terminal vertex === Point coordinate (no gap).
 */
export function locationHistoryGeoJsonFeatures(
    positions: LocationHistoryPosition[],
    pointMeta: LocationHistoryPointMeta[],
    opts: LocationHistoryGeoJsonOptions,
): Array<{
    type: 'Feature';
    geometry: { type: 'Point' | 'LineString'; coordinates: LocationHistoryPosition | LocationHistoryPosition[] };
    properties: Record<string, unknown>;
}> {
    if (positions.length === 0) return [];

    const features: Array<{
        type: 'Feature';
        geometry: { type: 'Point' | 'LineString'; coordinates: LocationHistoryPosition | LocationHistoryPosition[] };
        properties: Record<string, unknown>;
    }> = [];

    const lastIndex = positions.length - 1;
    const lastPosition = positions[lastIndex];
    const lastMeta = pointMeta[lastIndex] ?? {};
    const displayCallsign = callsignWithReceivedHhmm(opts.callsign, lastMeta.timestamp);

    if (positions.length > 1) {
        features.push({
            type: 'Feature',
            geometry: {
                type: 'LineString',
                coordinates: positions,
            },
            properties: {
                callsign: displayCallsign,
                remarks: opts.remarks,
                pointCount: positions.length,
                stroke: LOCATION_HISTORY_STROKE,
                'stroke-width': 2,
                'stroke-opacity': 1,
                startTime: opts.startTime,
                endTime: opts.endTime,
                elevationSource: opts.elevationSource,
                takeoffMslMeters: opts.takeoffMslMeters,
            },
        });
    }

    features.push({
        type: 'Feature',
        geometry: {
            type: 'Point',
            coordinates: lastPosition,
        },
        properties: {
            callsign: displayCallsign,
            remarks: opts.remarks,
            type: LOCATION_HISTORY_POINT_TYPE,
            pointIndex: lastIndex,
            timestamp: lastMeta.timestamp,
            gpsAltitude: lastMeta.gpsAltitude,
            heightAboveTakeoff: lastMeta.heightAboveTakeoff,
            hybridAltitude: lastMeta.hybridAltitude,
        },
    });

    return features;
}
```

---

## CloudTAK import helper (preserve a-h-G)

When using `normalize_geojson` before `mapStore.toImport`:

```typescript
const rawProps = feat.properties as Record<string, unknown>;
const cotType = typeof rawProps.type === 'string' ? rawProps.type : undefined;
const norm = await normalize_geojson(feat);
// …
properties: {
    ...(norm.properties as Feature['properties']),
    ...(cotType ? { type: cotType } : {}),
}
```

---

## Optional: stateful tracker

If events arrive one at a time, wrap history in a small class:

```typescript
export class LocationHistoryTracker {
    private positions = new Map<string, LocationHistoryPosition[]>();
    private meta = new Map<string, LocationHistoryPointMeta[]>();

    push(
        key: string,
        position: LocationHistoryPosition,
        pointMeta: LocationHistoryPointMeta,
        opts: Omit<LocationHistoryGeoJsonOptions, 'startTime' | 'endTime'>,
    ) {
        const positions = [...(this.positions.get(key) ?? []), position];
        const metas = [...(this.meta.get(key) ?? []), pointMeta];
        this.positions.set(key, positions);
        this.meta.set(key, metas);
        return locationHistoryGeoJsonFeatures(positions, metas, {
            ...opts,
            startTime: metas[0]?.timestamp,
            endTime: metas[metas.length - 1]?.timestamp,
        });
    }

    clear(key: string): void {
        this.positions.delete(key);
        this.meta.delete(key);
    }
}
```

Wire `push()` from your SSE/webhook handler after parsing lat/lon + timestamp.

---

## Verify in target repo

1. Send 1 location → single `a-h-G`, callsign ends with HHMM.
2. Send 2nd location → magenta line from fix 1 → fix 2; icon on fix 2; line ends at icon (no gap).
3. Send 3rd+ → line grows through all vertices; only one icon at latest.

---

## Notes

- HHMM uses **UTC** from the fix timestamp. Switch to local time in `formatReceivedHhmm` if your ops team prefers local.
- Stable **feature ids** per track key (e.g. `${key}-point`, `${key}-trail`) simplify update-in-place vs creating duplicates each event.
- Somewear reference for writing CoT to mission overlay: `subscription.feature.update(mapStore.worker, cot)` (see `cloudtak-pluin-somewear/lib/somewear-bridge.ts`).
