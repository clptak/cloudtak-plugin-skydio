# Skydio Telemetry Relay (reference)

CloudTAK's Plugin Proxy enforces a ~`1MB` response limit, which can break large-flight telemetry downloads.
This small relay server fetches telemetry from Skydio server-side and returns it to the browser with normal HTTP responses.

## Endpoints

The plugin is intended to call one of these (both are implemented):

- `GET /events/skydio/telemetry/:flightId`
- `GET /skydio/telemetry/:flightId`

## Authorization

The plugin forwards your Skydio API token via the `Authorization` request header:

- `Authorization: <SKYDIO_API_TOKEN>`

Skydio expects `Authorization: <token>` (not `Bearer <token>`), so the relay forwards the header unchanged.

## CORS

Set `CORS_ORIGINS` to the CloudTAK UI origin(s) you want to allow, e.g.

`CORS_ORIGINS="https://map.example.com,https://app.example.com"`

If `CORS_ORIGINS` is empty, the relay allows all origins (not recommended for production).

## Run

```bash
cd relay-server
npm install
SKYDIO_API_BASE="https://api.skydio.com/api" \
PORT=8081 \
CORS_ORIGINS="https://map.example.com" \
npm start
```

