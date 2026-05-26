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
        return `${message} Enable Plugin Proxy in CloudTAK Admin and whitelist https://api.skydio.com, https://users.ccsosar.net, and https://webhook.ccsosar.net.`;
    }
    if (status === 401) {
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
    const token = localStorage.token;
    if (!token) {
        throw new ProxyError('Not authenticated — log in to CloudTAK first', 401);
    }

    let res: Response;
    try {
        res = await fetch('/api/proxy', {
            method: 'POST',
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
                'Full-flight Skydio telemetry often exceeds that limit.',
                'Try one shorter flight at a time, or fetch telemetry outside CloudTAK.',
            ].join(' ');
        }
        throw new ProxyError(proxyHint(res.status, message), res.status);
    }

    return payload as ProxyResponse<T>;
}
