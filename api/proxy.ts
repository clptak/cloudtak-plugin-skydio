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

export async function proxyRequest<T = unknown>(opts: {
    url: string;
    method?: 'GET' | 'POST';
    headers?: Record<string, string>;
    body?: unknown;
}): Promise<ProxyResponse<T>> {
    const token = localStorage.token;
    if (!token) {
        throw new ProxyError('Not authenticated', 401);
    }

    const res = await fetch('/api/proxy', {
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

    if (!res.ok) {
        let message = `Proxy request failed (${res.status})`;
        try {
            const err = await res.json();
            if (err.message) message = err.message;
        } catch {
            // ignore parse errors
        }
        throw new ProxyError(message, res.status);
    }

    return res.json() as Promise<ProxyResponse<T>>;
}
