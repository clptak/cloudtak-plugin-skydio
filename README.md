# Skydio Plugin for CloudTAK

Skydio Plugin for CloudTAK to interface with Skydio's API (https://api.skydio.com) to get Skydio flight telemetry, create flight missions from CloudTAK map objects, get Skydio alerts in CloudTAK, and add significant Skydio events to DataSync (log entries).

## Installation

Copy or symlink this repository into CloudTAK's `api/web/plugins/skydio/` before building the web UI. CloudTAK bundles plugins at build time via `import.meta.glob`.

## Prerequisites

1. **Plugin Proxy** enabled in CloudTAK Admin → Plugin Proxy.
2. Whitelist these hosts:
   - `https://api.skydio.com` — Skydio Cloud API (vehicles, flights, webhooks)
   - `https://users.ccsosar.net` — Authentik token endpoint (OAuth client_credentials)
   - `https://webhook.ccsosar.net` — webhook server SSE stream
3. Skydio Cloud API token entered in the plugin Settings tab.
4. Authentik **webhook-sse** OAuth2 client ID + secret for real-time alerts (Settings → Webhook SSE).
5. Skydio webhook registered to `https://webhook.ccsosar.net/api/skydio` (Webhooks tab).
6. **CORS** on webhook server `/events/*` for your CloudTAK origin (production: `https://cloudtak.ccsosar.net`; local dev: `http://localhost:8080`). Deploy `WebMvcConfig.kt` in clptak-webhook-server and reload the tak-stack Caddyfile.

### Local dev (localhost:8080)

SSE cannot use the Plugin Proxy (long-lived stream). From local CloudTAK dev, either:

1. **Deploy server CORS** (recommended): rebuild `webhook-server` with `WebMvcConfig.kt` and reload Caddy (see tak-stack `Caddyfile` `/events/*` block), or
2. **Vite dev proxy** (no server change): add to CloudTAK `api/web/vite.config.ts`:

```typescript
server: {
  proxy: {
    '/webhook-sse': {
      target: 'https://webhook.ccsosar.net',
      changeOrigin: true,
      rewrite: (path) => path.replace(/^\/webhook-sse/, ''),
    },
  },
},
```

The plugin automatically uses `http://localhost:8080/webhook-sse/events/skydio` when running on localhost.

## Alerts and webhooks

| Feature | Docker Compose + webhook server | Polling fallback | AWS ETL bridge |
|---|---|---|---|
| Real-time alerts via SSE | Yes (recommended) | No | Yes (legacy) |
| Skydio webhook create/list | Yes | Yes | Yes |
| Inbound Skydio POST to plugin | No (browser cannot receive HTTP) | No | No |
| DataSync log on FLIGHT_STATUS | Yes (active mission) | No | Optional |

**Primary path:** Skydio POST → `webhook.ccsosar.net/api/skydio` → SSE `GET /events/skydio` → plugin Alerts tab (+ optional mission log).

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
