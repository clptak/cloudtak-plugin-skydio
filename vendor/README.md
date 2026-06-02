Vendored browser ESM build of [jsPDF](https://github.com/parallax/jsPDF) v4.2.1 (MIT).

## Why this is vendored

CloudTAK's Docker image builds the web UI with three steps over `./plugins/`:
`npm run lint` (its own ESLint config), `npm run check` (`vue-tsc`), and `npm run build` (vite).
It only runs `npm install` in `api/web/`, so a plugin's own `package.json` dependencies are
never installed, and a bare `import 'jspdf'` fails `vue-tsc` with `Cannot find module 'jspdf'`.

Vendoring keeps pre-flight PDF generation self-contained with no CloudTAK changes:

- `jspdf.es.min.js` — a **self-contained** jsPDF ESM bundle (vite/rolldown bundles it at
  build time). It must have **no external imports**: jsPDF's stock `dist/jspdf.es.min.js`
  still `import`s its own deps (`fast-png`, `fflate`, `@babel/runtime`), which CloudTAK's
  `node_modules` does not have, so vite fails with `Rolldown failed to resolve import "fast-png"`.
  We therefore re-bundle jsPDF with those deps **inlined** (via esbuild). Prefixed with
  `/* eslint-disable */` because CloudTAK lints `./plugins/` with its own config (the
  plugin's `eslint.config.js` ignores do not apply there); the header makes ESLint report
  zero rule errors on the minified bundle.
- `jspdf.es.min.d.ts` — minimal type surface used by `utils/preflightPdf.ts`, resolved by
  `vue-tsc` via the relative `../vendor/jspdf.es.min.js` import.

## Updating

Re-bundle with all dependencies inlined (do **not** just copy `dist/jspdf.es.min.js`):

```bash
# from the plugin root, with jspdf installed (npm install jspdf@^4.2.1)
printf "export { jsPDF } from 'jspdf';\n" > .jspdf-entry.mjs
npx esbuild .jspdf-entry.mjs --bundle --format=esm --platform=browser --minify \
  --legal-comments=none --outfile=/tmp/jspdf.bundle.min.js
printf '/* eslint-disable */\n' > vendor/jspdf.es.min.js
cat /tmp/jspdf.bundle.min.js >> vendor/jspdf.es.min.js
rm .jspdf-entry.mjs /tmp/jspdf.bundle.min.js
```

Verify the result has no external imports (should print nothing):

```bash
grep -oE "from\"[^.][^\"]*\"" vendor/jspdf.es.min.js
```
