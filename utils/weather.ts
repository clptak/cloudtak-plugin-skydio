import { proxyRequest, ProxyError } from '../api/proxy';
import { EMPTY_WEATHER, type PreflightWeather } from '../types';

const NWS_BASE = 'https://api.weather.gov';

/**
 * NWS asks API consumers to send a descriptive User-Agent. The Plugin Proxy
 * forwards these headers to api.weather.gov.
 */
const NWS_HEADERS: Record<string, string> = {
    accept: 'application/geo+json',
    'User-Agent': 'CloudTAK-Skydio-Plugin (pre-flight weather)',
};

interface QuantityValue {
    value: number | null;
    unitCode?: string;
}

interface ObservationProperties {
    temperature?: QuantityValue;
    dewpoint?: QuantityValue;
    windSpeed?: QuantityValue;
    windDirection?: QuantityValue;
    visibility?: QuantityValue;
    cloudLayers?: Array<{ base?: QuantityValue; amount?: string }>;
}

interface PointsResponse {
    properties?: { observationStations?: string };
}

interface StationsResponse {
    observationStations?: string[];
    features?: Array<{ id?: string; properties?: { stationIdentifier?: string } }>;
}

interface LatestObservationResponse {
    properties?: ObservationProperties;
}

function celsiusToF(c: number): number {
    return Math.round((c * 9) / 5 + 32);
}

function speedToMph(value: number, unitCode?: string): number {
    // NWS observations report km/h ("wmoUnit:km_h-1"); some feeds use m/s.
    if (unitCode && /m_s-1|m\/s/i.test(unitCode)) {
        return Math.round(value * 2.236936);
    }
    return Math.round(value * 0.621371);
}

function metersToMiles(m: number): number {
    return Math.round((m / 1609.344) * 10) / 10;
}

function metersToFeet(m: number): number {
    return Math.round(m / 0.3048);
}

function degreesToCardinal(deg: number): string {
    const dirs = ['N', 'NNE', 'NE', 'ENE', 'E', 'ESE', 'SE', 'SSE',
        'S', 'SSW', 'SW', 'WSW', 'W', 'WNW', 'NW', 'NNW'];
    const index = Math.round(deg / 22.5) % 16;
    return `${dirs[index]} (${Math.round(deg)}\u00B0)`;
}

async function getJson<T>(url: string): Promise<T> {
    const res = await proxyRequest<T>({ url, method: 'GET', headers: NWS_HEADERS });
    if (res.status < 200 || res.status >= 300) {
        throw new ProxyError(`Weather request failed (${res.status}) for ${url}`, res.status);
    }
    return res.body;
}

/** Lowest cloud layer reported as broken/overcast is treated as the ceiling. */
function ceilingFromLayers(layers: ObservationProperties['cloudLayers']): number | null {
    if (!Array.isArray(layers)) return null;
    for (const layer of layers) {
        const amount = layer.amount?.toUpperCase();
        if ((amount === 'BKN' || amount === 'OVC') && typeof layer.base?.value === 'number') {
            return metersToFeet(layer.base.value);
        }
    }
    return null;
}

function mapObservation(props: ObservationProperties, source: string): PreflightWeather {
    const weather: PreflightWeather = { ...EMPTY_WEATHER, source };

    if (typeof props.temperature?.value === 'number') {
        weather.temperatureF = celsiusToF(props.temperature.value);
    }
    if (typeof props.dewpoint?.value === 'number') {
        weather.dewPointF = celsiusToF(props.dewpoint.value);
    }
    if (typeof props.windSpeed?.value === 'number') {
        weather.windSpeedMph = speedToMph(props.windSpeed.value, props.windSpeed.unitCode);
    }
    if (typeof props.windDirection?.value === 'number') {
        weather.windDirection = degreesToCardinal(props.windDirection.value);
    }
    if (typeof props.visibility?.value === 'number') {
        weather.visibilityMiles = metersToMiles(props.visibility.value);
    }
    weather.ceilingFt = ceilingFromLayers(props.cloudLayers);

    return weather;
}

/**
 * Fetch current conditions for a coordinate from the National Weather Service
 * via the CloudTAK Plugin Proxy. Resolves the point to its nearest observation
 * station, then reads the latest observation. Values are mapped to the WEATHER
 * section's imperial fields. KP index is not provided by NWS and is left blank.
 */
export async function fetchPointWeather(lat: number, lon: number): Promise<PreflightWeather> {
    const fixedLat = lat.toFixed(4);
    const fixedLon = lon.toFixed(4);

    const point = await getJson<PointsResponse>(`${NWS_BASE}/points/${fixedLat},${fixedLon}`);
    const stationsUrl = point.properties?.observationStations;
    if (!stationsUrl) {
        throw new ProxyError('No NWS observation stations found for this location (US coverage only).', 404);
    }

    const stations = await getJson<StationsResponse>(stationsUrl);
    const stationUrl = stations.observationStations?.[0];
    const stationId = stations.features?.[0]?.properties?.stationIdentifier;
    if (!stationUrl && !stationId) {
        throw new ProxyError('No nearby NWS station returned an observation for this location.', 404);
    }

    const latestUrl = stationUrl
        ? `${stationUrl.replace(/\/+$/, '')}/observations/latest`
        : `${NWS_BASE}/stations/${encodeURIComponent(stationId as string)}/observations/latest`;

    const latest = await getJson<LatestObservationResponse>(latestUrl);
    if (!latest.properties) {
        throw new ProxyError('NWS returned no observation properties for this station.', 502);
    }

    const sourceLabel = `NWS ${stationId ?? ''} (${fixedLat}, ${fixedLon})`.replace(/\s+/g, ' ').trim();
    return mapObservation(latest.properties, sourceLabel);
}
