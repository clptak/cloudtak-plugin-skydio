import {
    CloudTakAuthError,
    requireCloudTakToken,
} from '../storage/cloudtakToken';

export interface ProxyResponse<T = unknown> {
    status: number;
    headers: Record<string, string>;
    body: T;
}

export class ProxyError extends Error {
    status: number;

    constructor(message: string, status: number) {
        super(message);
        this.name = 'ProxyError';
        this.status = status;
    }
}

function proxyHint(status: number, message: string): string {
    if (status === 403 && /proxy/i.test(message)) {
        return `${message} Enable Plugin Proxy in CloudTAK Admin and whitelist the Skydio API, Authentik token, and webhook server URLs configured in Settings.`;
    }
    if (status === 401) {
        if (/invalid token|no auth present|authentication required|not authenticated/i.test(message)) {
            return `${message} Your CloudTAK session may be invalid — log out, sign in again with SSO, then retry.`;
        }
        return `${message} Confirm your Skydio API token in Settings.`;
    }
    return message;
}

export async function proxyRequest<T = unknown>(opts: {
    url: string;
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: unknown;
}): Promise<ProxyResponse<T>> {
    let token: string;
    try {
        token = await requireCloudTakToken();
    } catch (err) {
        const message = err instanceof CloudTakAuthError || err instanceof Error
            ? err.message
            : 'Not authenticated — log in to CloudTAK first';
        throw new ProxyError(message, 401);
    }

    let res: Response;
    try {
        res = await fetch('/api/proxy', {
            method: 'POST',
            credentials: 'same-origin',
            headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
            },
            body: JSON.stringify({
                url: opts.url,
                method: opts.method ?? 'GET',
                headers: opts.headers,
                body: opts.body,
            }),
        });
    } catch (err) {
        const message = err instanceof Error ? err.message : 'Network error';
        throw new ProxyError(`Proxy request failed: ${message}`, 0);
    }

    let payload: unknown;
    try {
        payload = await res.json();
    } catch {
        throw new ProxyError(`Proxy returned non-JSON response (${res.status})`, res.status);
    }

    if (!res.ok) {
        const body = payload as { message?: string };
        let message = body.message ?? `Proxy request failed (${res.status})`;
        if (/1\s*MB limit/i.test(message)) {
            message = [
                'CloudTAK Plugin Proxy limits responses to 1MB (server-side, not this plugin).',
                'Configure Skydio Telemetry Relay URL in Settings (or Skydio SSE URL — the plugin derives the relay base from it),',
                'deploy GET {base}/telemetry/{flightId} on your webhook server with CORS for this CloudTAK origin, then retry.',
            ].join(' ');
        }
        throw new ProxyError(proxyHint(res.status, message), res.status);
    }

    return payload as ProxyResponse<T>;
}
