# AWS ETL Webhook Bridge for Skydio

Optional path for **real-time** Skydio event delivery on full AWS CloudTAK deployments. Not available in Docker Compose local dev.

## Architecture

```
Skydio Cloud  --POST-->  webhooks.{domain}/{layer-uuid}
                              |
                              v
                     CloudTAK ETL Lambda (custom Skydio task)
                              |
                              v
                     CoT / DataSync / TAK Server
                              |
                              v
                     CloudTAK map client (plugin sees markers)
```

CloudTAK plugins cannot receive inbound HTTP. The ETL webhook stack is a **separate** system from the plugin API.

## Prerequisites

1. Full AWS CloudTAK deployment (not Docker Compose alone).
2. Webhooks CloudFormation stack deployed:

```bash
npx deploy create <stack> --template cloudformation/webhooks.template.js
```

3. Custom Skydio ETL Docker task published to CloudTAK's ECR (format `skydio-v1.0.0`).
4. Skydio API token with webhook management permissions.
5. Skydio Alerts configured for desired event types.

## Setup steps

### 1. Create ETL layer with webhooks enabled

1. In CloudTAK Connection admin, create a new incoming layer using the Skydio ETL task.
2. Open **Layer Config → Incoming**.
3. Enable **Webhooks Delivery**.
4. Copy the **Webhook URL** (layer UUID). Full URL format:

```
https://webhooks.{your-domain}/{layer-uuid}
```

### 2. Register URL in Skydio

Use the plugin Webhooks tab or Skydio Cloud directly:

```javascript
POST https://api.skydio.com/api/v0/webhook
{
  "name": "CloudTAK ETL",
  "url": "https://webhooks.example.com/xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
}
```

### 3. Configure Skydio Alerts

In Skydio Cloud → Settings → Alerts, enable the webhook for each event type (flight status, telemetry available, device online, etc.).

### 4. Implement the Skydio ETL task

The ETL Lambda receives API Gateway events. Parse the POST body and emit CoT or DataSync entries.

Placeholder handler structure:

```javascript
export async function handler(event) {
  const body = JSON.parse(event.body || '{}');
  const eventType = body.event_type; // confirm field name via payload capture

  switch (eventType) {
    case 'flight_status_changed':
      // emit CoT for flight start/end
      break;
    case 'flight_telemetry_available':
      // trigger telemetry fetch or log entry
      break;
    case 'device_online_status_changed':
      // update vehicle marker stale time
      break;
    default:
      console.info('Unhandled Skydio event', eventType, body);
  }

  return { statusCode: 200, body: 'ok' };
}
```

Inbound payload field names are **not confirmed** — capture real payloads per [webhook_payload.md](../Skydio_api_templates/webhook_payload.md) before implementing parsers.

### 5. Point Data Sync destination

In the ETL layer incoming config, set **Data Destination** to the desired Data Sync feed or TAK connection so converted events appear on the map.

## Plugin role

The Skydio plugin does **not** receive webhook POSTs. On AWS deployments it can:

- Register/list Skydio webhooks pointing at the ETL layer URL (Webhooks tab).
- Display map markers and alerts from CoT/DataSync after ETL processing.
- Continue polling as fallback when ETL is unavailable or for Docker Compose dev.

## Limitations

| Limitation | Detail |
|---|---|
| Docker Compose | No ETL webhook gateway — use polling only |
| Custom ETL task required | No upstream Skydio layer template in CloudTAK |
| Payload schema unknown | Must capture POST bodies before production ETL parser |
| CloudFormation deploy delay | Enabling/disabling webhooks on a layer triggers CF update |

## Related files

- [Skydio_api_templates/webhooks.md](../Skydio_api_templates/webhooks.md) — management APIs and feasibility
- [Skydio_api_templates/webhook_payload.md](../Skydio_api_templates/webhook_payload.md) — event types and capture instructions
- [alerts/polling.ts](../alerts/polling.ts) — polling fallback used in all environments
