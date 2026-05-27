const DEV_SSE_PROXY_PREFIX = '/webhook-sse';

/**
 * Resolve the SSE URL for the current runtime.
 * Local CloudTAK dev can use a same-origin vite proxy at /webhook-sse/* to avoid CORS.
 */
export function resolveSkydioSseUrl(configuredUrl: string): string {
    const url = configuredUrl.trim();
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

export { DEV_SSE_PROXY_PREFIX };

/**
 * Local CloudTAK dev typically uses the same Vite dev proxy path for `/events/*`
 * endpoints on the webhook server (SSE and telemetry relay).
 *
 * When `configuredUrl` points at a local webhook-server `/events/...` path,
 * rewrite it to go through CloudTAK's Vite proxy at `/webhook-sse/...`.
 */
export function resolveSkydioTelemetryRelayUrl(configuredUrl: string): string {
    const url = configuredUrl.trim();
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
