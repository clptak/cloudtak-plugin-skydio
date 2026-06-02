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

function parseApiError(res: Response, errText: string): string | null {
    try {
        const errBody = errText ? JSON.parse(errText) : null;
        if (
            errBody
            && typeof errBody === 'object'
            && 'message' in errBody
            && typeof (errBody as { message: unknown }).message === 'string'
        ) {
            return (errBody as { message: string }).message;
        }
    } catch {
        /* ignore */
    }
    return null;
}

/**
 * Upload a PDF to the active mission the same way CloudTAK Mission Files does:
 * POST /api/marti/missions/:guid/upload?name=... with raw file bytes (no S3 attachment store).
 */
async function uploadToMission(
    missionGuid: string,
    pdfBlob: Blob,
    fileName: string,
    missionToken?: string,
): Promise<void> {
    const safeName = fileName.replace(/^.*[/\\]/, '') || 'preflight-report.pdf';
    const buffer = await pdfBlob.arrayBuffer();
    const uploadUrl =
        `/api/marti/missions/${encodeURIComponent(missionGuid)}/upload`
        + `?name=${encodeURIComponent(safeName)}`;

    const headers: Record<string, string> = {};
    if (missionToken) {
        headers.MissionAuthorization = missionToken;
    }

    const res = await cloudtakFetch(uploadUrl, {
        method: 'POST',
        headers,
        body: new Blob([buffer], { type: 'application/pdf' }),
    });

    if (!res.ok) {
        const errText = await res.text().catch(() => '');
        const errMessage = parseApiError(res, errText);
        throw new MissionAttachError(
            errMessage
                ? `Mission file upload failed (${res.status}): ${errMessage}`
                : `Mission file upload failed (${res.status}).`,
        );
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
 * Attach a generated report PDF to the active DataSync mission. Uses CloudTAK's
 * mission file upload API (streams to TAK Server Enterprise Sync); falls back to a
 * mission log entry if upload is not available.
 */
export async function attachReportToMission(
    missionGuid: string,
    pdfBlob: Blob,
    fileName: string,
    missionToken?: string,
): Promise<AttachResult> {
    if (!missionGuid) {
        throw new MissionAttachError(
            'No active DataSync mission. Open a mission in CloudTAK, then retry.',
        );
    }

    try {
        await uploadToMission(missionGuid, pdfBlob, fileName, missionToken);
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
