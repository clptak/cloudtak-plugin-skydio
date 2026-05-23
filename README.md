# Skydio Plugin for CloudTAK

Skydio Plugin for CloudTAK to interface with Skydio's API (https://api.skydio.com) to get Skydio flight telemetry, create flight missions from CloudTAK map objects, get Skydio alerts in CloudTAK, and add significant Skydio events to DataSync (log entries).

## Installation

Copy or symlink this repository into CloudTAK's `api/web/plugins/skydio/` before building the web UI. CloudTAK bundles plugins at build time via `import.meta.glob`.

## Prerequisites

1. **Plugin Proxy** enabled in CloudTAK Admin → Plugin Proxy.
2. Whitelist `https://api.skydio.com`.
3. Skydio Cloud API token entered in the plugin Settings tab.

## Alerts and webhooks

| Feature | Docker Compose | AWS full deployment |
|---|---|---|
| Polling-based alerts | Yes | Yes |
| Skydio webhook create/list (outbound API) | Yes | Yes |
| Inbound Skydio webhook delivery to plugin | No | No |
| Real-time push via ETL webhook bridge | No | Yes (optional) |

See:

- [Skydio_api_templates/webhooks.md](Skydio_api_templates/webhooks.md) — feasibility and management APIs
- [Skydio_api_templates/webhook_payload.md](Skydio_api_templates/webhook_payload.md) — inbound payload capture
- [docs/aws-etl-webhook-bridge.md](docs/aws-etl-webhook-bridge.md) — AWS ETL integration

## Plugin structure

```
index.ts              # Plugin entry (menu, route, floating pane)
api/client.ts         # Skydio API via CloudTAK proxy
alerts/polling.ts     # Primary alert detection (vehicles + flights)
components/           # Settings, Alerts, Webhooks tabs
storage/settings.ts   # localStorage persistence
types.ts              # Shared types
```
