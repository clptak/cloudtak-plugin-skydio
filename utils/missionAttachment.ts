import { requireCloudTakToken, CloudTakAuthError } from '../storage/cloudtakToken';

export type AttachMethod = 'file' | 'log';

export interface AttachResult {
    method: AttachMethod;
    message: string;
}

export class MissionAttachError extends Error {
    constructor(message: string) {
        super(message);
        this.name = 'MissionAttachError';
    }
}

interface PackageUploadResponse {
    Hash?: string;
    hash?: string;
    data?: { hash?: string };
}

function extractHash(body: unknown): string | null {
    if (!body || typeof body !== 'object') return null;
    const res = body as PackageUploadResponse;
    return res.Hash ?? res.hash ?? res.data?.hash ?? null;
}

/**
 * Call a same-origin CloudTAK API route with the session bearer token. Mirrors
 * the auth approach in api/proxy.ts so this util needs no CloudTAK host imports.
 */
async function cloudtakFetch(path: string, init: RequestInit): Promise<Response> {
    const token = await requireCloudTakToken();
    return fetch(path, {
        ...init,
        credentials: 'same-origin',
        headers: {
            ...(init.headers ?? {}),
            Authorization: `Bearer ${token}`,
        },
    });
}

/** Upload the PDF to CloudTAK's Marti package endpoint and return its content hash. */
async function uploadPackage(pdfBlob: Blob, fileName: string): Promise<string> {
    const form = new FormData();
    form.append('file', new File([pdfBlob], fileName, { type: 'application/pdf' }));

    const res = await cloudtakFetch(`/api/marti/package?name=${encodeURIComponent(fileName)}`, {
        method: 'PUT',
        body: form,
    });

    if (!res.ok) {
        throw new MissionAttachError(`Package upload failed (${res.status}).`);
    }

    const body = (await res.json().catch(() => null)) as unknown;
    const hash = extractHash(body);
    if (!hash) {
        throw new MissionAttachError('Package upload returned no content hash.');
    }
    return hash;
}

/** Associate a previously uploaded content hash with a mission. */
async function associateWithMission(missionGuid: string, hash: string): Promise<void> {
    const res = await cloudtakFetch(
        `/api/marti/missions/${encodeURIComponent(missionGuid)}/contents`,
        {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ hashes: [hash] }),
        },
    );
    if (!res.ok) {
        throw new MissionAttachError(`Mission association failed (${res.status}).`);
    }
}

/** Post a log entry referencing the report when a file attachment is not possible. */
async function logFallback(missionGuid: string, fileName: string, note: string): Promise<void> {
    const res = await cloudtakFetch(
        `/api/marti/missions/${encodeURIComponent(missionGuid)}/log`,
        {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                content: `Skydio Pre-Flight report "${fileName}" generated. ${note}`.trim(),
                dtg: new Date().toISOString(),
                keywords: ['skydio', 'preflight', 'report'],
            }),
        },
    );
    if (!res.ok) {
        throw new MissionAttachError(`Mission log entry failed (${res.status}).`);
    }
}

/**
 * Attach a generated report PDF to the active DataSync mission. Attempts a real
 * file attachment (Marti package upload + mission association); if that is not
 * available, falls back to a mission log entry referencing the report so the
 * action never silently fails.
 */
export async function attachReportToMission(
    missionGuid: string,
    pdfBlob: Blob,
    fileName: string,
): Promise<AttachResult> {
    if (!missionGuid) {
        throw new MissionAttachError(
            'No active DataSync mission. Open a mission in CloudTAK, then retry.',
        );
    }

    try {
        const hash = await uploadPackage(pdfBlob, fileName);
        await associateWithMission(missionGuid, hash);
        return { method: 'file', message: `Attached "${fileName}" to the active mission.` };
    } catch (err) {
        if (err instanceof CloudTakAuthError) {
            throw new MissionAttachError(err.message);
        }

        const reason = err instanceof Error ? err.message : 'File attachment unavailable';
        try {
            await logFallback(missionGuid, fileName, `Export the PDF and attach manually. (${reason})`);
            return {
                method: 'log',
                message: `Could not attach the PDF directly (${reason}). Logged a reference to the mission instead — use Export to PDF and attach manually.`,
            };
        } catch (logErr) {
            const logReason = logErr instanceof Error ? logErr.message : 'unknown error';
            throw new MissionAttachError(
                `Failed to attach report to mission: ${reason}. Log fallback also failed: ${logReason}.`,
            );
        }
    }
}
