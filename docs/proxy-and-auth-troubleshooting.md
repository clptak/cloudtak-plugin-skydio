# CloudTAK Plugin Proxy / Auth — Debugging Cheat Sheet

## TL;DR

If a plugin's outbound calls (weather, Authentik token, Skydio, etc.) fail, it's
almost always one of: (1) the **proxy whitelist** in CloudTAK Admin, or (2) a
**stale browser cache / expired session** — fix the latter with a **hard
refresh** before assuming the code is broken.

## How CloudTAK's Plugin Proxy works (server-side, `api/routes/proxy.ts`)

- All plugin outbound HTTP goes through `POST /api/proxy`, which checks the
  target against the `proxy::whitelist` setting (CloudTAK Admin UI).
- The whitelist is matched on **exact origin** = `scheme + host (+ port)`.
  `https://api.weather.gov` != `http://api.weather.gov` != `https://www.host`.
  No path/query/fragment allowed in entries.
- It is **all-or-nothing**: if **any single entry** is malformed (e.g. bare host
  `api.weather.gov` with no scheme, or a URL with a path), the whole list throws
  a **400** and **every** plugin proxy call breaks — not just the new one.
- Only **GET/POST** are allowed; request/response bodies capped at 256KB / 1MB;
  redirects are **not followed** (`redirect: 'manual'`).

## Error → meaning

- `Proxy origin <X> is not allowed` (**403**): `<X>` is not in the effective
  whitelist. Compare the exact string (scheme/host/port) via DevTools → Network →
  the `/api/proxy` request payload `url` vs the whitelist entry.
- `Invalid whitelist entry` / `must be origin-only` (**400**): a malformed
  whitelist entry is taking the entire list down. Fix/remove it.
- Upstream **405** (e.g. "empty response (HTTP 405)"): the request **reached**
  the target (so whitelist is fine for that host) but hit the wrong
  endpoint/method — for Authentik, use the token URL **with trailing slash**:
  `https://<host>/application/o/token/` (missing slash → Django 301 redirect →
  proxy won't follow it).

## Whitelist format (origin-only, one per line)

```
https://api.skydio.com
https://webhook.example.com
https://auth.example.com
https://caltopo.com
https://etl.example.com
https://api.weather.gov
```

Each entry must be `https://host` only — no paths, no trailing slash content,
correct scheme. Copy the current list to a note before editing, since one bad
line breaks all of them.

## The thing that actually unstuck it: hard refresh

- After plugin updates or auth weirdness, the browser can serve a **stale plugin
  bundle** and/or hold a **stale/expired CloudTAK JWT**, producing failures that
  look like server/whitelist problems but aren't.
- **Hard refresh** (Cmd/Ctrl+Shift+R) — or log out/in via SSO — clears it. Do
  this **first** when a plugin "was working and suddenly isn't."

## "If the strings match exactly but it still 403s"

The running API is serving a different config than the UI shows:

- Restart/redeploy the CloudTAK API service (stale config), **or**
- The deployment sets the whitelist via a startup env var that overrides the DB
  (`CLOUDTAK_Config_proxy_whitelist`) — change it there. This is
  host/deployment config, not anything in plugin code.

## Scope note

Plugins run in the browser and **cannot read/write/cache** the proxy whitelist
or any server config. A plugin only hands the proxy a URL to fetch. So plugin
code changes can't gate these origins — the gate is 100% CloudTAK's
`proxy::whitelist` plus the browser's cache/session.

## Plugin hosts that must be whitelisted (this plugin)

| Purpose | Host (origin) | Configured in |
| --- | --- | --- |
| Skydio Cloud API | `https://api.skydio.com` | fixed in code |
| NWS weather (Pre-Flight) | `https://api.weather.gov` | fixed in code |
| Authentik token (SSE auth) | your Authentik host, e.g. `https://auth.example.com` | Settings → Authentik Token URL |
| Webhook server (SSE/alerts) | your webhook host, e.g. `https://webhook.example.com` | Settings → Skydio SSE / Webhook URL |
| Telemetry relay (optional) | your relay host | Settings → Telemetry Relay URL |
