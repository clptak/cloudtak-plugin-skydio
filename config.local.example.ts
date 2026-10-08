import type { DeploymentSettings } from './storage/deploymentDefaults';

/**
 * Copy to config.local.ts (gitignored), fill in this deployment, then restart
 * or rebuild CloudTAK's app/. Each person still enters their own Skydio API key.
 *
 * These values are compiled into the web bundle. Anyone who can load CloudTAK
 * can read them, including the OAuth client secret. Do not put API keys here.
 */
export const deploymentDefaults: DeploymentSettings = {
    /** Must end with /application/o/token/ */
    authentikTokenUrl: '',
    oauthClientId: '',
    oauthClientSecret: '',
    /** Full SSE stream URL, e.g. https://webhook.example.com/events/skydio */
    skydioSseUrl: '',
    /** Optional. Leave blank to use the SSE URL base for telemetry. */
    skydioTelemetryRelayUrl: '',
    /** URL Skydio Cloud should POST alerts to. */
    skydioWebhookUrl: '',
};
