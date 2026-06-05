import { jsPDF } from '../vendor/jspdf.es.min.js';
import {
    formatAviationHazards,
    formatCrewHazards,
    formatEquipmentHazards,
    formatGroundHazards,
    formatMitigations,
    type PerformanceEvaluation,
    type PreflightFormState,
} from '../types';

export interface PreflightPdfInput {
    form: PreflightFormState;
    evaluation: PerformanceEvaluation;
    platformLabel: string;
    generatedAt: string;
}

const MARGIN = 15;
const PAGE_WIDTH = 210;
const PAGE_HEIGHT = 297;
const CONTENT_WIDTH = PAGE_WIDTH - MARGIN * 2;
const LABEL_WIDTH = 60;

type RGB = [number, number, number];
const COLOR_PRIMARY: RGB = [32, 107, 196];
const COLOR_TEXT: RGB = [33, 37, 41];
const COLOR_MUTED: RGB = [108, 117, 125];
const COLOR_PASS: RGB = [25, 135, 84];
const COLOR_FAIL: RGB = [220, 53, 69];
const COLOR_WARN: RGB = [245, 159, 0];

function fmt(value: string | number | null | undefined): string {
    if (value === null || value === undefined || value === '') return '\u2014';
    return String(value);
}

function fmtList(values: string[]): string {
    return values.length ? values.join(', ') : '\u2014';
}

/** Internal layout helper that tracks the cursor and handles page breaks. */
class PdfBuilder {
    readonly doc: jsPDF;

    private y = MARGIN;

    constructor() {
        this.doc = new jsPDF({ unit: 'mm', format: 'a4' });
    }

    private ensureSpace(height: number): void {
        if (this.y + height > PAGE_HEIGHT - MARGIN) {
            this.doc.addPage();
            this.y = MARGIN;
        }
    }

    header(title: string, subtitle: string, generatedAt: string): void {
        this.doc.setFillColor(...COLOR_PRIMARY);
        this.doc.rect(0, 0, PAGE_WIDTH, 26, 'F');
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(16);
        this.doc.text(title, MARGIN, 12);
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(10);
        this.doc.text(subtitle || 'UAS Pre-Flight', MARGIN, 19);
        this.doc.setFontSize(8);
        this.doc.text(`Generated ${generatedAt}`, PAGE_WIDTH - MARGIN, 12, { align: 'right' });
        this.y = 34;
    }

    overallBadge(pass: boolean | null): void {
        const label = pass === null
            ? 'PERFORMANCE: NOT EVALUATED'
            : pass
                ? 'PERFORMANCE: WITHIN SPECIFICATIONS'
                : 'PERFORMANCE: OUTSIDE SPECIFICATIONS';
        const color: RGB = pass === null ? COLOR_MUTED : pass ? COLOR_PASS : COLOR_FAIL;

        this.ensureSpace(12);
        this.doc.setFillColor(...color);
        this.doc.roundedRect(MARGIN, this.y, CONTENT_WIDTH, 9, 1.5, 1.5, 'F');
        this.doc.setTextColor(255, 255, 255);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(10);
        this.doc.text(label, MARGIN + 3, this.y + 6);
        this.y += 14;
    }

    sectionTitle(title: string): void {
        this.ensureSpace(12);
        this.doc.setDrawColor(...COLOR_PRIMARY);
        this.doc.setLineWidth(0.5);
        this.doc.line(MARGIN, this.y, PAGE_WIDTH - MARGIN, this.y);
        this.y += 5;
        this.doc.setTextColor(...COLOR_PRIMARY);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(11);
        this.doc.text(title, MARGIN, this.y);
        this.y += 6;
    }

    row(label: string, value: string): void {
        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(9);
        const valueWidth = CONTENT_WIDTH - LABEL_WIDTH;
        const lines = this.doc.splitTextToSize(value, valueWidth) as string[];
        const rowHeight = Math.max(5, lines.length * 4.4);
        this.ensureSpace(rowHeight);

        this.doc.setTextColor(...COLOR_MUTED);
        this.doc.text(label, MARGIN, this.y);
        this.doc.setTextColor(...COLOR_TEXT);
        this.doc.text(lines, MARGIN + LABEL_WIDTH, this.y);
        this.y += rowHeight + 1.5;
    }

    performanceTable(evaluation: PerformanceEvaluation): void {
        if (evaluation.metrics.length === 0) {
            this.row('Status', 'No platform performance specs available to evaluate.');
            return;
        }

        const cols = [MARGIN, MARGIN + 55, MARGIN + 110, MARGIN + 150];
        this.ensureSpace(8);
        this.doc.setFont('helvetica', 'bold');
        this.doc.setFontSize(8.5);
        this.doc.setTextColor(...COLOR_MUTED);
        this.doc.text('METRIC', cols[0], this.y);
        this.doc.text('CURRENT', cols[1], this.y);
        this.doc.text('LIMIT', cols[2], this.y);
        this.doc.text('RESULT', cols[3], this.y);
        this.y += 5;

        this.doc.setFont('helvetica', 'normal');
        this.doc.setFontSize(9);
        for (const m of evaluation.metrics) {
            this.ensureSpace(6);
            this.doc.setTextColor(...COLOR_TEXT);
            this.doc.text(m.label, cols[0], this.y);
            this.doc.text(m.value, cols[1], this.y);
            this.doc.text(m.limit, cols[2], this.y);
            const statusColor = m.status === 'pass' ? COLOR_PASS : m.status === 'warn' ? COLOR_WARN : COLOR_FAIL;
            this.doc.setTextColor(...statusColor);
            this.doc.setFont('helvetica', 'bold');
            this.doc.text(m.status.toUpperCase(), cols[3], this.y);
            this.doc.setFont('helvetica', 'normal');
            this.y += 5.5;
        }
        this.y += 2;
    }

    footer(): void {
        const pages = this.doc.getNumberOfPages();
        for (let page = 1; page <= pages; page += 1) {
            this.doc.setPage(page);
            this.doc.setFont('helvetica', 'normal');
            this.doc.setFontSize(7.5);
            this.doc.setTextColor(...COLOR_MUTED);
            this.doc.text(
                `Page ${page} of ${pages}  \u2022  Generated by CloudTAK Skydio plugin`,
                PAGE_WIDTH / 2,
                PAGE_HEIGHT - 8,
                { align: 'center' },
            );
        }
    }
}

/** Build a professional, multi-section pre-flight report PDF. */
export function buildPreflightPdf(input: PreflightPdfInput): jsPDF {
    const { form, evaluation, platformLabel, generatedAt } = input;
    const b = new PdfBuilder();

    const subtitle = [platformLabel, form.location].filter(Boolean).join('  \u2022  ');
    b.header('UAS PRE-FLIGHT MISSION PACKET', subtitle, generatedAt);
    b.overallBadge(evaluation.metrics.length === 0 ? null : evaluation.overallPass);

    b.sectionTitle('Location / Airspace / Platform');
    b.row('Date / Time', fmt(form.dateTime));
    b.row('Location', fmt(form.location));
    b.row('DR # (Activity #)', fmt(form.activityNumber));
    b.row('DEMA (State SAR Mission #)', fmt(form.demaNumber));
    b.row('Airspace Class', fmt(form.airspaceClass));
    b.row('Max Permitted Altitude (AGL)', form.maxAltitudeAglFt === null ? '\u2014' : `${form.maxAltitudeAglFt} ft`);
    b.row('LAANC Required', fmt(form.laancRequired));
    b.row('LAANC Authorization #', fmt(form.laancAuthNumber));
    b.row('Platform', fmt(platformLabel));

    b.sectionTitle('Flight Type');
    b.row('Flight Category', fmt(form.flightCategory));
    b.row('Mission Type', fmt(form.missionType));
    b.row('Flight Rule', fmt(form.flightRule));
    b.row('Land Manager / Owner', fmt(form.landManager));
    b.row('Land Manager Permission Required', fmt(form.landManagerPermissionRequired));
    b.row('Map Source', fmtList([form.mapSource, form.mapSourceOther].filter(Boolean)));
    b.row('Data Collection', fmtList([form.dataCollection, form.dataCollectionOther].filter(Boolean)));

    b.sectionTitle('Weather');
    b.row('Forecast Attached (DataSync)', fmt(form.forecastAttached));
    b.row('Weather Source(s)', fmt(form.weather.source));
    b.row('Temperature', form.weather.temperatureF === null ? '\u2014' : `${form.weather.temperatureF}\u00B0F`);
    b.row('Dew Point', form.weather.dewPointF === null ? '\u2014' : `${form.weather.dewPointF}\u00B0F`);
    b.row('Wind Speed', form.weather.windSpeedMph === null ? '\u2014' : `${form.weather.windSpeedMph} mph`);
    b.row('Wind Direction', fmt(form.weather.windDirection));
    b.row('KP Index', fmt(form.weather.kpIndex));
    b.row('Visibility', form.weather.visibilityMiles === null ? '\u2014' : `${form.weather.visibilityMiles} mi`);
    b.row('Ceiling', form.weather.ceilingFt === null ? '\u2014' : `${form.weather.ceilingFt} ft`);

    b.sectionTitle('Performance Check vs Platform Specifications');
    b.performanceTable(evaluation);

    b.sectionTitle('Operational Hazards');
    b.row('Aviation Hazards', formatAviationHazards(form));
    b.row('Ground-based Hazards', formatGroundHazards(form));
    b.row('Crew/Operator Hazards', formatCrewHazards(form));
    b.row('Equipment Hazards', formatEquipmentHazards(form));
    b.row('Mitigations', formatMitigations(form.mitigations));

    b.sectionTitle('Logistics');
    b.row('Remote Pilot(s)', fmtList(form.remotePilots));
    b.row('Visual Observer(s)', fmtList(form.visualObservers));
    b.row('Crew Members', fmt(form.crewMembers));

    b.footer();
    return b.doc;
}

/** Extract the raw base64 payload (no data: prefix) from a jsPDF document. */
export function pdfToBase64(doc: jsPDF): string {
    const dataUri = doc.output('datauristring');
    return dataUri.substring(dataUri.indexOf(',') + 1);
}

/** Convert a stored base64 PDF payload into a Blob. */
export function base64ToPdfBlob(base64: string): Blob {
    const binary = atob(base64);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
        bytes[i] = binary.charCodeAt(i);
    }
    return new Blob([bytes], { type: 'application/pdf' });
}

/** Trigger a browser download of a stored base64 PDF. */
export function downloadPdfFromBase64(base64: string, fileName: string): void {
    const blob = base64ToPdfBlob(base64);
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = fileName;
    anchor.click();
    URL.revokeObjectURL(url);
}
