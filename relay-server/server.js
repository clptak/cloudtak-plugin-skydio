import express from 'express';
import cors from 'cors';

const app = express();

const PORT = Number(process.env.PORT || 8081);
const SKYDIO_API_BASE = process.env.SKYDIO_API_BASE || 'https://api.skydio.com/api';
const CORS_ORIGINS = (process.env.CORS_ORIGINS || '')
  .split(',')
  .map((s) => s.trim())
  .filter(Boolean);

const corsMiddleware = cors({
  origin(origin, cb) {
    // Allow non-browser requests (no Origin header).
    if (!origin) return cb(null, true);
    if (CORS_ORIGINS.length === 0) return cb(null, true); // Allow all if not configured.
    if (CORS_ORIGINS.includes(origin)) return cb(null, true);
    return cb(new Error(`CORS origin not allowed: ${origin}`));
  },
  credentials: false,
  methods: ['GET', 'OPTIONS'],
  allowedHeaders: ['Authorization', 'Content-Type', 'Accept'],
});

app.use(corsMiddleware);

function getAuthorization(req) {
  // Plugin sends the Skydio API token directly in the `Authorization` header.
  // Skydio expects `Authorization: <token>` (not `Bearer <token>`).
  return String(req.headers.authorization || '').trim();
}

async function fetchSkydioTelemetry(flightId, authorization) {
  const url = `${SKYDIO_API_BASE}/v1/flight/${encodeURIComponent(flightId)}/telemetry`;
  const res = await fetch(url, {
    method: 'GET',
    headers: {
      accept: 'application/json',
      authorization,
    },
  });

  const text = await res.text();
  let payload;
  try {
    payload = JSON.parse(text);
  } catch {
    payload = { raw: text };
  }

  // Return Skydio's JSON shape unchanged, including `status_code` / `skydio_error_code`.
  return { status: res.status, payload };
}

app.get('/events/skydio/telemetry/:flightId', async (req, res) => {
  const { flightId } = req.params;
  const authorization = getAuthorization(req);
  if (!authorization) return res.status(401).json({ message: 'Missing Authorization header' });

  try {
    const { status, payload } = await fetchSkydioTelemetry(flightId, authorization);
    res.status(status).json(payload);
  } catch (err) {
    res.status(500).json({ message: err instanceof Error ? err.message : 'Unknown error' });
  }
});

// Convenience alias (if you prefer not to hang telemetry off `/events`).
app.get('/skydio/telemetry/:flightId', async (req, res) => {
  req.url = `/events/skydio/telemetry/${encodeURIComponent(req.params.flightId)}`;
  app._router.handle(req, res);
});

app.options('*', corsMiddleware);

app.listen(PORT, () => {
  // eslint-disable-next-line no-console
  console.log(`Skydio telemetry relay listening on :${PORT}`);
});

