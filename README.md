# Skydio Plugin for CloudTAK

Skydio Plugin for CloudTAK to interface with Skydio's API (https://api.skydio.com) to get Skydio flight telemetry, create flight missions from CloudTAK map objects, get Skydio alerts in CloudTAK, and add significant Skydio events to DataSync (log entries).

## Installation

Copy or symlink this repository into CloudTAK's `api/web/plugins/skydio/` before building the web UI. CloudTAK bundles plugins at build time via `import.meta.glob`.

## Prerequisites

1. **Plugin Proxy** enabled in CloudTAK Admin → Plugin Proxy.
2. Whitelist the hosts you configure in Settings (Skydio API, Authentik token URL, webhook SSE URL, and webhook POST URL).
3. Skydio Cloud API token entered in the plugin Settings tab.
4. Authentik **webhook-sse** OAuth2 client ID + secret, Authentik token URL, SSE URL, and webhook URL entered in Settings → Webhook SSE.
5. Skydio webhook registered to your configured webhook URL (Webhooks tab).
6. **CORS** on webhook server `/events/*` for your CloudTAK origin (local dev: `http://localhost:8080`). Deploy `WebMvcConfig.kt` in your webhook server and reload your reverse proxy.

### Local dev (localhost:8080)

SSE cannot use the Plugin Proxy (long-lived stream). From local CloudTAK dev, either:

1. **Deploy server CORS** (recommended): rebuild `webhook-server` with `WebMvcConfig.kt` and reload Caddy (see tak-stack `Caddyfile` `/events/*` block), or
2. **Vite dev proxy** (no server change): add to CloudTAK `api/web/vite.config.ts`:

```typescript
server: {
  proxy: {
    '/webhook-sse': {
      target: 'https://webhook.example.com', // your webhook server origin
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/webhook-sse/, ''),
    },
  },
},
```

The plugin automatically uses `http://localhost:8080/webhook-sse/events/skydio` when running on localhost.

## Telemetry Relay (bypass Plugin Proxy 1MB limit)

The Plugin Proxy enforces a hard response size limit (~1MB). For long flights, Skydio's `/telemetry` payload can exceed that limit, causing the `Get Flights → Download Telemetry` action to fail.

To avoid this, configure an optional **Skydio Telemetry Relay URL** in the plugin Settings. Provide the *parent* URL where your webhook server exposes:

- `GET {Skydio Telemetry Relay URL}/telemetry/{flightId}`

The relay server must also:

- Allow CORS from your CloudTAK UI origin (similar to SSE).
- Accept `Authorization: <SKYDIO_API_TOKEN>` and forward it to `https://api.skydio.com/api/v1/flight/{flight_id}/telemetry` server-side.

This repo includes a reference relay implementation under [`relay-server/`](relay-server/README.md). **The relay is not automatic** — you must add the route to your webhook server (or run the reference server) and allow CORS from your CloudTAK origin (e.g. `https://cloudtak.ccsosar.net`).

If **Skydio Telemetry Relay URL** is empty but **Skydio SSE URL** is set (e.g. `https://webhook.example.com/events/skydio`), the plugin uses that same base for telemetry: `GET https://webhook.example.com/events/skydio/telemetry/{flightId}`.

### Troubleshooting 1MB proxy errors

1. Confirm Settings → **Skydio SSE URL** or **Skydio Telemetry Relay URL** is saved.
2. From your browser (logged into CloudTAK), open DevTools → Network and retry Import to Map. You should see a request to your **webhook host**, not `/api/proxy`.
3. If you still see `/api/proxy`, the relay URL is missing or the relay request failed earlier (older plugin builds silently fell back to the proxy).
4. Deploy `GET /events/skydio/telemetry/:flightId` on the webhook server and set `CORS_ORIGINS` to include `https://cloudtak.ccsosar.net` (or your CloudTAK UI origin).

### Local dev (localhost:8080)

When your relay URL points at a webhook-server path under `/events/`, the plugin rewrites it through the existing Vite dev proxy at `/webhook-sse/*` (same proxy setup as SSE). If you mount telemetry at `/events/skydio/telemetry/:flightId`, you can reuse the existing Vite proxy config.

### If you cannot use a relay

- Fetch telemetry outside CloudTAK (curl/Postman), convert it to `.geojson`, and use CloudTAK's GeoJSON import UI to add it to the map.
- If you control and can modify CloudTAK, you can increase the proxy response limit by updating `RESPONSE_BODY_LIMIT` in CloudTAK's `api/routes/proxy.ts` and redeploying the CloudTAK API.

## Alerts and webhooks

| Feature | Docker Compose + webhook server | Polling fallback | AWS ETL bridge |
|---|---|---|---|
| Real-time alerts via SSE | Yes (recommended) | No | Yes (legacy) |
| Skydio webhook create/list | Yes | Yes | Yes |
| Inbound Skydio POST to plugin | No (browser cannot receive HTTP) | No | No |
| DataSync log on FLIGHT_START / FLIGHT_END (and legacy FLIGHT_STATUS) | Yes (active mission) | No | Optional |

**Primary path:** Skydio POST → your webhook URL → SSE stream URL from Settings → plugin Alerts tab (+ optional mission log).

**Fallback:** When OAuth/SSE credentials are absent, the plugin can poll the Skydio API for state changes (requires API key only).

See:

- [Skydio_api_templates/webhooks.md](Skydio_api_templates/webhooks.md) — webhook server architecture and Skydio management APIs
- [docs/aws-etl-webhook-bridge.md](docs/aws-etl-webhook-bridge.md) — optional AWS ETL integration

## Plugin structure

```
index.ts              # Plugin entry (menu, route, floating pane)
api/client.ts         # Skydio API via CloudTAK proxy
api/authentik.ts      # OAuth client_credentials token fetch
alerts/sse.ts         # Fetch-based SSE client (Bearer auth)
alerts/webhook.ts     # SSE payload → UI alerts + DataSync logs
alerts/polling.ts     # Fallback alert detection (vehicles + flights)
components/           # Settings, Alerts, Webhooks tabs
storage/settings.ts   # localStorage persistence
types.ts              # Shared types
```
