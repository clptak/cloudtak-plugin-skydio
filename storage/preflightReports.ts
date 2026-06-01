import type { PreflightReport } from '../types';
import { getCurrentUserId } from './user';

const REPORTS_KEY_PREFIX = 'cloudtak-plugin-skydio:preflight-reports:';
const LEGACY_REPORTS_KEY = 'cloudtak-plugin-skydio:preflight-reports';

/** Cap stored reports so localStorage (typically ~5MB) is not exhausted by PDFs. */
const MAX_REPORTS = 25;

function reportsStorageKey(): string {
    const userId = getCurrentUserId();
    return userId ? `${REPORTS_KEY_PREFIX}${userId}` : LEGACY_REPORTS_KEY;
}

export function loadPreflightReports(): PreflightReport[] {
    try {
        const raw = localStorage.getItem(reportsStorageKey());
        if (!raw) return [];
        const parsed = JSON.parse(raw) as unknown;
        return Array.isArray(parsed) ? (parsed as PreflightReport[]) : [];
    } catch {
        return [];
    }
}

function persist(reports: PreflightReport[]): void {
    localStorage.setItem(reportsStorageKey(), JSON.stringify(reports));
}

/**
 * Prepend a report and persist. Returns the new list (most-recent first). Throws
 * when the browser rejects the write (e.g. quota exceeded), so the UI can warn.
 */
export function addPreflightReport(report: PreflightReport): PreflightReport[] {
    const next = [report, ...loadPreflightReports()].slice(0, MAX_REPORTS);
    persist(next);
    return next;
}

export function deletePreflightReport(id: string): PreflightReport[] {
    const next = loadPreflightReports().filter((report) => report.id !== id);
    persist(next);
    return next;
}
