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
        Authorization: apiKey,
    };
}

function assertOk<T>(response: { status: number; body: SkydioApiResponse<T> }): SkydioApiResponse<T> {
    const { body, status } = response;
    if (status !== 200 || body.status_code !== 200 || body.skydio_error_code !== 0) {
        throw new ProxyError(
            body.error_message ?? `Skydio API error (${body.status_code})`,
            status,
        );
    }
    return body;
}

export async function listVehicles(apiKey: string): Promise<SkydioVehicle[]> {
    const res = await proxyRequest<SkydioApiResponse<{ vehicles: SkydioVehicle[] }>>({
        url: `${SKYDIO_API_BASE}/v0/vehicles?per_page=100&page_number=1`,
        method: 'GET',
        headers: authHeaders(apiKey),
    });
    return assertOk(res).data.vehicles ?? [];
}

export async function listFlights(
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

export async function getFlightTelemetry(
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
        body: { name, url },
    });
    return assertOk(res).data.webhook;
}
