import { proxyRequest } from './proxy';

export interface OAuthTokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

function buildTokenBody(clientId: string, clientSecret: string): string {
    const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
        scope: 'openid',
    });
    return params.toString();
}

function isCorsOrNetworkError(err: unknown): boolean {
    if (!(err instanceof TypeError)) return false;
    const message = err.message.toLowerCase();
    return message.includes('failed to fetch')
        || message.includes('network')
        || message.includes('cors');
}

async function fetchTokenDirect(tokenUrl: string, body: string): Promise<OAuthTokenResponse> {
    const res = await fetch(tokenUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    let payload: unknown;
    try {
        payload = await res.json();
    } catch {
        throw new Error(`Authentik token endpoint returned non-JSON (${res.status})`);
    }

    if (!res.ok) {
        const message = (payload as { error_description?: string; error?: string }).error_description
            ?? (payload as { error?: string }).error
            ?? `Authentik token request failed (${res.status})`;
        throw new Error(message);
    }

    const token = payload as OAuthTokenResponse;
    if (!token.access_token) {
        throw new Error('Authentik token response missing access_token');
    }

    return token;
}

async function fetchTokenViaProxy(tokenUrl: string, body: string): Promise<OAuthTokenResponse> {
    const res = await proxyRequest<string>({
        url: tokenUrl,
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    if (typeof res.body === 'string') {
        try {
            const parsed = JSON.parse(res.body) as OAuthTokenResponse;
            if (parsed.access_token) return parsed;
        } catch {
            throw new Error('Authentik token proxy response was not valid JSON');
        }
    }

    const token = res.body as unknown as OAuthTokenResponse;
    if (!token?.access_token) {
        throw new Error('Authentik token proxy response missing access_token');
    }

    return token;
}

export async function fetchClientCredentialsToken(opts: {
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
}): Promise<OAuthTokenResponse> {
    const tokenUrl = opts.tokenUrl.trim();
    const clientId = opts.clientId.trim();
    const clientSecret = opts.clientSecret.trim();
    const body = buildTokenBody(clientId, clientSecret);

    try {
        return await fetchTokenDirect(tokenUrl, body);
    } catch (err) {
        if (isCorsOrNetworkError(err)) {
            return fetchTokenViaProxy(tokenUrl, body);
        }
        throw err instanceof Error ? err : new Error('Authentik token request failed');
    }
}
