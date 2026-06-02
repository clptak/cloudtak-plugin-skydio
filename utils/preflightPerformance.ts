import type {
    DronePerformanceSpec,
    PerformanceEvaluation,
    PerformanceMetricResult,
    PerformanceStatus,
    PreflightWeather,
} from '../types';

function metric(
    label: string,
    value: number | null,
    limit: number | undefined,
    compare: (value: number, limit: number) => boolean,
    formatValue: (value: number) => string,
    formatLimit: (limit: number) => string,
    /** Status to use when the weather value is missing. Defaults to 'fail'. */
    missingStatus: PerformanceStatus = 'fail',
): PerformanceMetricResult | null {
    if (limit === undefined) return null;
    if (value === null || Number.isNaN(value)) {
        return { label, value: 'n/a', limit: formatLimit(limit), status: missingStatus };
    }
    return {
        label,
        value: formatValue(value),
        limit: formatLimit(limit),
        status: compare(value, limit) ? 'pass' : 'fail',
    };
}

/**
 * Temp/dew-point spread check (always evaluated when both values are present;
 * does not depend on a platform spec limit).
 *
 * Spread = temperature - dew point (°F):
 *   < 5 and temp < 38 °F  → FAIL  (icing / frost risk)
 *   < 5                   → WARN  (high humidity / fog risk)
 *   ≥ 5 or missing values → skipped / n/a
 */
function dewPointSpreadMetric(weather: PreflightWeather): PerformanceMetricResult | null {
    const temp = weather.temperatureF;
    const dew = weather.dewPointF;

    // Only evaluate when both values are present.
    if (temp === null || dew === null) return null;

    const spread = temp - dew;
    if (spread >= 5) return null; // within acceptable range, no row needed

    const spreadStr = `${spread.toFixed(1)}\u00B0F`;
    const status: PerformanceStatus = temp < 38 ? 'fail' : 'warn';
    const reason = temp < 38
        ? 'spread < 5\u00B0F and temp < 38\u00B0F (icing risk)'
        : 'spread < 5\u00B0F (high humidity / fog risk)';

    return {
        label: 'Temp \u2212 Dew Point spread',
        value: spreadStr,
        limit: reason,
        status,
    };
}

/**
 * Compare the current weather against a platform's performance specs. Any spec
 * left undefined is skipped. Missing wind/temperature values fail (so the gap is
 * noticed); a missing KP index only warns, since it is not auto-populated. The
 * temp/dew-point spread check runs whenever both values are present regardless
 * of spec. Warnings never block (overallPass only counts fails).
 */
export function evaluatePerformance(
    weather: PreflightWeather,
    spec: DronePerformanceSpec | undefined,
): PerformanceEvaluation {
    if (!spec) {
        // Still run the spread check even with no spec.
        const spreadResult = dewPointSpreadMetric(weather);
        const metrics = spreadResult ? [spreadResult] : [];
        return { overallPass: metrics.every((m) => m.status !== 'fail'), metrics };
    }

    const candidates = [
        metric(
            'Wind speed',
            weather.windSpeedMph,
            spec.maxWindMph,
            (v, l) => v <= l,
            (v) => `${v} mph`,
            (l) => `\u2264 ${l} mph`,
        ),
        metric(
            'Min temperature',
            weather.temperatureF,
            spec.minTempF,
            (v, l) => v >= l,
            (v) => `${v}\u00B0F`,
            (l) => `\u2265 ${l}\u00B0F`,
        ),
        metric(
            'Max temperature',
            weather.temperatureF,
            spec.maxTempF,
            (v, l) => v <= l,
            (v) => `${v}\u00B0F`,
            (l) => `\u2264 ${l}\u00B0F`,
        ),
        metric(
            'KP index',
            weather.kpIndex.trim() === '' ? null : Number(weather.kpIndex),
            spec.maxKpIndex,
            (v, l) => v <= l,
            (v) => `${v}`,
            (l) => `\u2264 ${l}`,
            'warn',
        ),
        dewPointSpreadMetric(weather),
    ];

    const metrics = candidates.filter((m): m is PerformanceMetricResult => m !== null);
    const overallPass = metrics.every((m) => m.status !== 'fail');

    return { overallPass, metrics };
}
