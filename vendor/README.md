Vendored browser build of [jsPDF](https://github.com/parallax/jsPDF) v4.2.1 (MIT).

CloudTAK Docker builds only run `npm install` in `api/web/`, not in cloned plugin directories.
Bundling `jspdf.es.min.js` here keeps pre-flight PDF generation working without host changes.
