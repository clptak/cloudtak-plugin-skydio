import { proxyRequest, ProxyError } from './proxy';
import {
    SKYDIO_API_BASE,
    type SkydioApiResponse,
    type SkydioFlight,
    type SkydioFlightTelemetryResponse,
    type SkydioVehicle,
    type SkydioWebhook,
} from '../types';

function authHeaders(apiKey: string): Record<string, string> {
    return {
        accept: 'application/json',
        Authorization: apiKey.trim(),
    };
}

function assertOk<T>(response: { status: number; body: SkydioApiResponse<T> }): SkydioApiResponse<T> {
    const { body, status } = response;

    if (typeof body !== 'object' || body === null) {
        throw new ProxyError(`Unexpected Skydio proxy response (${status})`, status);
    }

    const skydioBody = body as SkydioApiResponse<T> & { error_message?: string | null };
    if (status !== 200 || skydioBody.status_code !== 200 || skydioBody.skydio_error_code !== 0) {
        throw new ProxyError(
            skydioBody.error_message ?? `Skydio API error (HTTP ${status}, code ${skydioBody.status_code})`,
            status,
        );
    }

    return skydioBody;
}

export async function listVehicles(apiKey: string): Promise<SkydioVehicle[]> {
    const res = await proxyRequest<SkydioApiResponse<{ vehicles: SkydioVehicle[] }>>({
        url: `${SKYDIO_API_BASE}/v0/vehicles?per_page=100&page_number=1`,
        method: 'GET',
        headers: authHeaders(apiKey),
    });
    return assertOk(res).data.vehicles ?? [];
}

async function listFlightsForSerials(
    apiKey: string,
    opts: { takeoffSince: string; takeoffBefore?: string; vehicleSerials?: string[] },
): Promise<SkydioFlight[]> {
    const params = new URLSearchParams({
        per_page: '50',
        page_number: '1',
        takeoff_since: opts.takeoffSince,
    });
    if (opts.takeoffBefore) {
        params.set('takeoff_before', opts.takeoffBefore);
    }
    for (const serial of opts.vehicleSerials ?? []) {
        params.append('vehicle_serial', serial);
    }

    const res = await proxyRequest<SkydioApiResponse<{ flights: SkydioFlight[] }>>({
        url: `${SKYDIO_API_BASE}/v0/flights?${params}`,
        method: 'GET',
        headers: authHeaders(apiKey),
    });
    return assertOk(res).data.flights ?? [];
}

export async function listFlights(
    apiKey: string,
    opts: { takeoffSince: string; takeoffBefore?: string; vehicleSerials?: string[] },
): Promise<SkydioFlight[]> {
    const serials = opts.vehicleSerials ?? [];
    if (serials.length <= 1) {
        return listFlightsForSerials(apiKey, opts);
    }

    const batches = await Promise.all(
        serials.map((serial) => listFlightsForSerials(apiKey, {
            ...opts,
            vehicleSerials: [serial],
        })),
    );

    const seen = new Set<string>();
    const merged: SkydioFlight[] = [];
    for (const batch of batches) {
        for (const flight of batch) {
            if (seen.has(flight.flight_id)) continue;
            seen.add(flight.flight_id);
            merged.push(flight);
        }
    }

    return merged.sort((a, b) => String(b.takeoff ?? '').localeCompare(String(a.takeoff ?? '')));
}

function telemetryRelayEndpoint(relayBaseUrl: string, flightId: string): string {
    const base = relayBaseUrl.trim().replace(/\/+$/, '');
    const encodedFlightId = encodeURIComponent(flightId);

    // Expected:
    //   base = https://webhook.example.com/events/skydio
    //   => GET {base}/telemetry/{flightId}
    //
    // Also allow:
    //   base = https://webhook.example.com/skydio/telemetry
    //   => GET {base}/{flightId}
    if (base.endsWith('/telemetry')) {
        return `${base}/${encodedFlightId}`;
    }
    return `${base}/telemetry/${encodedFlightId}`;
}

async function getFlightTelemetryViaProxy(
    apiKey: string,
    flightId: string,
): Promise<SkydioFlightTelemetryResponse> {
    const res = await proxyRequest<SkydioFlightTelemetryResponse>({
        url: `${SKYDIO_API_BASE}/v1/flight/${encodeURIComponent(flightId)}/telemetry`,
        method: 'GET',
        headers: authHeaders(apiKey),
    });
    return assertOk(res);
}

async function getFlightTelemetryViaRelay(
    relayBaseUrl: string,
    apiKey: string,
    flightId: string,
): Promise<SkydioFlightTelemetryResponse> {
    const url = telemetryRelayEndpoint(relayBaseUrl, flightId);

    let res: Response;
    try {
        res = await fetch(url, {
            method: 'GET',
            headers: authHeaders(apiKey),
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Unknown error';
        throw new ProxyError(`Telemetry relay request failed: ${message}`, 0);
    }

    let payload: unknown;
    try {
        payload = await res.json();
    } catch {
        throw new ProxyError(`Telemetry relay returned non-JSON response (${res.status})`, res.status);
    }

    // Reuse the same validation as the proxy path.
    return assertOk({ status: res.status, body: payload as SkydioApiResponse<unknown> }) as SkydioFlightTelemetryResponse;
}

export async function getFlightTelemetry(
    apiKey: string,
    flightId: string,
    opts?: {
        telemetryRelayUrl?: string;
    },
): Promise<SkydioFlightTelemetryResponse> {
    const relayUrl = opts?.telemetryRelayUrl?.trim();

    if (relayUrl) {
        try {
            return await getFlightTelemetryViaRelay(relayUrl, apiKey, flightId);
        } catch {
            // If relay fails (misconfiguration, CORS, etc.) fall back to the existing proxy path.
        }
    }

    return getFlightTelemetryViaProxy(apiKey, flightId);
}

export async function listWebhooks(apiKey: string): Promise<SkydioWebhook[]> {
    const res = await proxyRequest<SkydioApiResponse<{ webhooks: SkydioWebhook[] }>>({
        url: `${SKYDIO_API_BASE}/v0/webhooks?per_page=100&page_number=1`,
        method: 'GET',
        headers: authHeaders(apiKey),
    });
    return assertOk(res).data.webhooks ?? [];
}

export async function createWebhook(
    apiKey: string,
    name: string,
    url: string,
): Promise<SkydioWebhook> {
    const res = await proxyRequest<SkydioApiResponse<{ webhook: SkydioWebhook }>>({
        url: `${SKYDIO_API_BASE}/v0/webhook`,
        method: 'POST',
        headers: {
            ...authHeaders(apiKey),
            'content-type': 'application/json',
        },
        body: { name: name.trim(), url: url.trim() },
    });
    return assertOk(res).data.webhook;
}
