import { fetchClientCredentialsToken } from '../api/authentik';
import { resolveSkydioSseUrl } from '../lib/sse-url';
import { handleSkydioSseEvent } from './webhook';
import type { SkydioAlert, SkydioSettings, SkydioWebhookAlert, SkydioWebhookSseEvent } from '../types';
import type { AlertListener } from './polling';

export interface SseStatus {
    connected: boolean;
    reconnecting: boolean;
    lastEvent: string | null;
}

export type SseStatusListener = (status: SseStatus) => void;
export type SseErrorListener = (error: string) => void;

export interface SkydioSseClientOptions {
    onAlert: AlertListener;
    onStatus: SseStatusListener;
    onError: SseErrorListener;
    getMissionGuid: () => string | undefined;
    onFlightStatusLog?: (
        alert: SkydioWebhookAlert,
        message: string,
        missionGuid: string,
    ) => Promise<void>;
}

const INITIAL_BACKOFF_MS = 1_000;
const MAX_BACKOFF_MS = 30_000;

function formatSseError(err: unknown): string {
    if (!(err instanceof Error)) return 'SSE connection failed';

    const message = err.message;
    const isNetworkFailure = err instanceof TypeError
        || /networkerror|failed to fetch|load failed/i.test(message);

    if (isNetworkFailure) {
        const origin = typeof window !== 'undefined' ? window.location.origin : 'your CloudTAK origin';
        return [
            'SSE connection blocked by the browser (usually CORS).',
            `Webhook server must allow ${origin} on GET /events/*.`,
            'Redeploy clptak-webhook-server after updating CORS, then reload CloudTAK.',
        ].join(' ');
    }

    return message;
}

function parseSseFrame(frame: string, onEvent: (eventType: string, data: string) => void): void {
    let eventType = 'message';
    const dataLines: string[] = [];

    for (const line of frame.split('\n')) {
        if (!line || line.startsWith(':')) continue;
        if (line.startsWith('event:')) {
            eventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
            dataLines.push(line.slice(5).trimStart());
        }
    }

    if (dataLines.length > 0) {
        onEvent(eventType, dataLines.join('\n'));
    }
}

async function readSseStream(
    stream: ReadableStream<Uint8Array>,
    onEvent: (eventType: string, data: string) => void,
    signal: AbortSignal,
): Promise<void> {
    const reader = stream.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    try {
        while (!signal.aborted) {
            const { done, value } = await reader.read();
            if (done) break;

            buffer += decoder.decode(value, { stream: true });

            let separatorIndex = buffer.indexOf('\n\n');
            while (separatorIndex !== -1) {
                const frame = buffer.slice(0, separatorIndex);
                buffer = buffer.slice(separatorIndex + 2);
                parseSseFrame(frame, onEvent);
                separatorIndex = buffer.indexOf('\n\n');
            }
        }
    } finally {
        reader.releaseLock();
    }
}

export class SkydioSseClient {
    private settings: SkydioSettings | null = null;
    private abortController: AbortController | null = null;
    private running = false;
    private backoffMs = INITIAL_BACKOFF_MS;
    private onAlert: AlertListener;
    private onStatus: SseStatusListener;
    private onError: SseErrorListener;
    private getMissionGuid: () => string | undefined;
    private onFlightStatusLog?: SkydioSseClientOptions['onFlightStatusLog'];
    private lastEvent: string | null = null;

    constructor(opts: SkydioSseClientOptions) {
        this.onAlert = opts.onAlert;
        this.onStatus = opts.onStatus;
        this.onError = opts.onError;
        this.getMissionGuid = opts.getMissionGuid;
        this.onFlightStatusLog = opts.onFlightStatusLog;
    }

    start(settings: SkydioSettings): void {
        this.stop();
        this.settings = settings;
        this.running = true;
        this.backoffMs = INITIAL_BACKOFF_MS;
        this.emitStatus({ connected: false, reconnecting: true, lastEvent: this.lastEvent });
        void this.connectLoop();
    }

    stop(): void {
        this.running = false;
        this.abortController?.abort();
        this.abortController = null;
        this.emitStatus({ connected: false, reconnecting: false, lastEvent: this.lastEvent });
    }

    private emitStatus(partial: SseStatus): void {
        this.onStatus(partial);
    }

    private async connectLoop(): Promise<void> {
        while (this.running && this.settings) {
            try {
                await this.connectOnce(this.settings);
                if (this.running) {
                    this.emitStatus({ connected: false, reconnecting: true, lastEvent: this.lastEvent });
                }
            } catch (err) {
                if (!this.running) break;
                this.onError(formatSseError(err));
                this.emitStatus({ connected: false, reconnecting: true, lastEvent: this.lastEvent });
            }

            if (!this.running) break;

            await sleep(this.backoffMs);
            this.backoffMs = Math.min(this.backoffMs * 2, MAX_BACKOFF_MS);
        }
    }

    private async connectOnce(settings: SkydioSettings): Promise<void> {
        const token = await fetchClientCredentialsToken({
            tokenUrl: settings.authentikTokenUrl,
            clientId: settings.oauthClientId,
            clientSecret: settings.oauthClientSecret,
        });

        const controller = new AbortController();
        this.abortController = controller;

        const res = await fetch(resolveSkydioSseUrl(settings.skydioSseUrl), {
            method: 'GET',
            headers: {
                Authorization: `Bearer ${token.access_token}`,
                Accept: 'text/event-stream',
            },
            signal: controller.signal,
        });

        if (!res.ok) {
            throw new Error(`SSE connection rejected (${res.status})`);
        }

        if (!res.body) {
            throw new Error('SSE response missing body');
        }

        this.backoffMs = INITIAL_BACKOFF_MS;
        this.emitStatus({ connected: true, reconnecting: false, lastEvent: this.lastEvent });

        await readSseStream(res.body, (eventType, data) => {
            void this.handleEventData(eventType, data, settings);
        }, controller.signal);
    }

    private async handleEventData(
        _eventType: string,
        data: string,
        settings: SkydioSettings,
    ): Promise<void> {
        let event: SkydioWebhookSseEvent;
        try {
            event = JSON.parse(data) as SkydioWebhookSseEvent;
        } catch {
            this.onError('Received invalid SSE JSON payload');
            return;
        }

        if (event.source !== 'skydio') return;

        this.lastEvent = new Date().toISOString();
        this.emitStatus({ connected: true, reconnecting: false, lastEvent: this.lastEvent });

        await handleSkydioSseEvent(event, {
            flightStatusLogEnabled: settings.flightStatusLogEnabled,
            getMissionGuid: this.getMissionGuid,
            onAlert: this.onAlert,
            onFlightStatusLog: this.onFlightStatusLog,
            onLogError: (message) => this.onError(message),
        });
    }
}

function sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}
