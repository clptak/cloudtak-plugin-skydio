const DEV_SSE_PROXY_PREFIX = '/webhook-sse';

function rewriteForLocalDev(url: string): string {
    if (typeof window === 'undefined' || !url) return url;

    const host = window.location.hostname;
    const isLocalDev = host === 'localhost' || host === '127.0.0.1';
    if (!isLocalDev) return url;

    try {
        const parsed = new URL(url);
        if (parsed.pathname.startsWith('/events/')) {
            return `${window.location.origin}${DEV_SSE_PROXY_PREFIX}${parsed.pathname}`;
        }
    } catch {
        return url;
    }

    return url;
}

function deriveRelayBaseFromSse(sseUrl: string): string {
    const trimmed = sseUrl.trim();
    if (!trimmed) return '';

    try {
        const parsed = new URL(trimmed);
        if (!parsed.pathname.startsWith('/events/')) return '';
        return `${parsed.origin}${parsed.pathname.replace(/\/+$/, '')}`;
    } catch {
        return '';
    }
}

/**
 * Resolve the SSE URL for the current runtime.
 * Local CloudTAK dev can use a same-origin vite proxy at /webhook-sse/* to avoid CORS.
 */
export function resolveSkydioSseUrl(configuredUrl: string): string {
    return rewriteForLocalDev(configuredUrl.trim());
}

export { DEV_SSE_PROXY_PREFIX };

/**
 * Resolve the telemetry relay base URL.
 * Uses Skydio Telemetry Relay URL when set; otherwise derives from Skydio SSE URL
 * (same webhook host/path prefix, e.g. https://webhook.example.com/events/skydio).
 */
export function resolveSkydioTelemetryRelayUrl(
    telemetryRelayUrl: string,
    sseUrl = '',
): string {
    const explicit = telemetryRelayUrl.trim();
    const base = explicit || deriveRelayBaseFromSse(sseUrl);
    return rewriteForLocalDev(base);
}
