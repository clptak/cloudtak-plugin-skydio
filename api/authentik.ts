import { resolveCloudTakToken } from '../storage/cloudtakToken';
import { proxyRequest, ProxyError } from './proxy';

export interface OAuthTokenResponse {
    access_token: string;
    expires_in: number;
    token_type: string;
}

function buildTokenBody(clientId: string, clientSecret: string, scope?: string): string {
    const params = new URLSearchParams({
        grant_type: 'client_credentials',
        client_id: clientId,
        client_secret: clientSecret,
    });
    if (scope) params.set('scope', scope);
    return params.toString();
}

function parseOAuthTokenPayload(
    body: unknown,
    upstreamStatus: number,
    context: string,
): OAuthTokenResponse {
    let payload = body;

    if (typeof payload === 'string') {
        const trimmed = payload.trim();
        if (!trimmed) {
            throw new Error(`${context}: empty response (HTTP ${upstreamStatus})`);
        }
        try {
            payload = JSON.parse(trimmed);
        } catch {
            throw new Error(`${context}: non-JSON response (HTTP ${upstreamStatus})`);
        }
    }

    if (typeof payload !== 'object' || payload === null) {
        throw new Error(`${context}: unexpected response format (HTTP ${upstreamStatus})`);
    }

    const record = payload as Record<string, unknown>;
    if (typeof record.access_token === 'string' && record.access_token.length > 0) {
        return payload as OAuthTokenResponse;
    }

    const parts: string[] = [];
    if (typeof record.error === 'string') parts.push(record.error);
    if (typeof record.error_description === 'string') parts.push(record.error_description);
    if (parts.length > 0) {
        throw new Error(`Authentik token error (HTTP ${upstreamStatus}): ${parts.join(' — ')}`);
    }

    throw new Error(`${context}: missing access_token (HTTP ${upstreamStatus})`);
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

    return parseOAuthTokenPayload(payload, res.status, 'Authentik token response');
}

async function fetchTokenViaProxy(tokenUrl: string, body: string): Promise<OAuthTokenResponse> {
    const res = await proxyRequest<unknown>({
        url: tokenUrl,
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body,
    });

    return parseOAuthTokenPayload(
        res.body,
        res.status,
        'Authentik token proxy response',
    );
}

async function requestToken(
    tokenUrl: string,
    clientId: string,
    clientSecret: string,
): Promise<OAuthTokenResponse> {
    const scopes: Array<string | undefined> = ['openid', undefined];
    let lastError: Error | undefined;

    for (const scope of scopes) {
        const body = buildTokenBody(clientId, clientSecret, scope);
        try {
            if (await resolveCloudTakToken()) {
                return await fetchTokenViaProxy(tokenUrl, body);
            }
            return await fetchTokenDirect(tokenUrl, body);
        } catch (err) {
            if (err instanceof ProxyError) throw err;
            lastError = err instanceof Error ? err : new Error('Authentik token request failed');
            if (!lastError.message.includes('invalid_grant') || scope === undefined) {
                throw lastError;
            }
        }
    }

    throw lastError ?? new Error('Authentik token request failed');
}

export async function fetchClientCredentialsToken(opts: {
    tokenUrl: string;
    clientId: string;
    clientSecret: string;
}): Promise<OAuthTokenResponse> {
    const tokenUrl = opts.tokenUrl.trim();
    const clientId = opts.clientId.trim();
    const clientSecret = opts.clientSecret.trim();

    if (!clientId || !clientSecret) {
        throw new Error('Authentik Client ID and Client Secret are required');
    }

    return requestToken(tokenUrl, clientId, clientSecret);
}
