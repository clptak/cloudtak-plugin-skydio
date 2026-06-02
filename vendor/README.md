Vendored browser ESM build of [jsPDF](https://github.com/parallax/jsPDF) v4.2.1 (MIT).

## Why this is vendored

CloudTAK's Docker image builds the web UI with three steps over `./plugins/`:
`npm run lint` (its own ESLint config), `npm run check` (`vue-tsc`), and `npm run build` (vite).
It only runs `npm install` in `api/web/`, so a plugin's own `package.json` dependencies are
never installed, and a bare `import 'jspdf'` fails `vue-tsc` with `Cannot find module 'jspdf'`.

Vendoring keeps pre-flight PDF generation self-contained with no CloudTAK changes:

- `jspdf.es.min.js` — real jsPDF ESM bundle (vite bundles it at build time).
  Prefixed with `/* eslint-disable */` because CloudTAK lints `./plugins/` with its own
  config (the plugin's `eslint.config.js` ignores do not apply there). The header makes
  ESLint report zero rule errors on the minified bundle.
- `jspdf.es.min.d.ts` — minimal type surface used by `utils/preflightPdf.ts`, resolved by
  `vue-tsc` via the relative `../vendor/jspdf.es.min.js` import.

## Updating

```bash
cd api/web && npm install jspdf@^4.2.1   # to grab the dist file
printf '/* eslint-disable */\n' > plugins/skydio/vendor/jspdf.es.min.js
cat node_modules/jspdf/dist/jspdf.es.min.js >> plugins/skydio/vendor/jspdf.es.min.js
```
