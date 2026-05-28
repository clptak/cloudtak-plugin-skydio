/** Capacitor Preferences default group on web (see @capacitor/preferences). */
const CAPACITOR_TOKEN_KEY = 'CapacitorStorage.token';
/** Legacy Capacitor web prefix (see Preferences.migrate). */
const CAPACITOR_LEGACY_TOKEN_KEY = '_cap_token';

function normalizeToken(raw: string | null | undefined): string | null {
    if (!raw) return null;
    let token = raw.trim();
    if (!token) return null;

    if (
        (token.startsWith('"') && token.endsWith('"'))
        || (token.startsWith("'") && token.endsWith("'"))
    ) {
        token = token.slice(1, -1).trim();
    }

    if (token.toLowerCase().startsWith('bearer ')) {
        token = token.slice(7).trim();
    }

    return token || null;
}

function isJwtShape(token: string): boolean {
    const parts = token.split('.');
    return parts.length === 3 && parts.every((part) => part.length > 0);
}

function jwtExpiresAtMs(token: string): number | null {
    try {
        const payload = token.split('.')[1];
        if (!payload) return null;

        const decoded = JSON.parse(atob(payload.replace(/-/g, '+').replace(/_/g, '/'))) as {
            exp?: number;
        };

        return typeof decoded.exp === 'number' ? decoded.exp * 1000 : null;
    } catch {
        return null;
    }
}

export function isCloudTakTokenExpired(token: string): boolean {
    const expiresAt = jwtExpiresAtMs(token);
    if (expiresAt === null) return true;
    return Date.now() >= expiresAt;
}

function collectSyncTokenCandidates(): string[] {
    const keys = [
        'token',
        CAPACITOR_TOKEN_KEY,
        CAPACITOR_LEGACY_TOKEN_KEY,
    ];

    const seen = new Set<string>();
    const candidates: string[] = [];

    for (const key of keys) {
        const token = normalizeToken(localStorage.getItem(key));
        if (!token || seen.has(token)) continue;
        seen.add(token);
        candidates.push(token);
    }

    return candidates;
}

function pickUsableToken(candidates: string[]): string | null {
    for (const token of candidates) {
        if (!isJwtShape(token)) continue;
        if (!isCloudTakTokenExpired(token)) return token;
    }
    return null;
}

/**
 * CloudTAK session JWT (sync). Prefer {@link resolveCloudTakToken} for API calls.
 */
export function getCloudTakToken(): string | null {
    return pickUsableToken(collectSyncTokenCandidates());
}

/**
 * CloudTAK session JWT from the same store the host app uses (Capacitor Preferences).
 */
export async function resolveCloudTakToken(): Promise<string | null> {
    try {
        const { Preferences } = await import('@capacitor/preferences');
        const { value } = await Preferences.get({ key: 'token' });
        const fromPreferences = normalizeToken(value);
        if (fromPreferences && isJwtShape(fromPreferences) && !isCloudTakTokenExpired(fromPreferences)) {
            return fromPreferences;
        }
    } catch {
        // Preferences unavailable outside CloudTAK (e.g. unit tests).
    }

    return getCloudTakToken();
}

export class CloudTakAuthError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'CloudTakAuthError';
    }
}

/**
 * Resolves a CloudTAK JWT or throws with a user-actionable message.
 */
export async function requireCloudTakToken(): Promise<string> {
    const syncCandidates = collectSyncTokenCandidates();
    const token = await resolveCloudTakToken();

    if (token) return token;

    const hasJwt = syncCandidates.some((t) => isJwtShape(t));
    if (hasJwt) {
        throw new CloudTakAuthError(
            'CloudTAK session expired — log out, sign in again with SSO, then retry.',
        );
    }

    throw new CloudTakAuthError('Not authenticated — log in to CloudTAK first');
}
