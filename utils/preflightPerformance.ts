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
 * Compare the current weather against a platform's performance specs. Any spec
 * left undefined is skipped. Missing wind/temperature values fail (so the gap is
 * noticed); a missing KP index only warns, since it is not auto-populated. When
 * the platform has no specs at all, returns an empty metric list and
 * overallPass = true. Warnings never block (overallPass ignores them).
 */
export function evaluatePerformance(
    weather: PreflightWeather,
    spec: DronePerformanceSpec | undefined,
): PerformanceEvaluation {
    if (!spec) {
        return { overallPass: true, metrics: [] };
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
    ];

    const metrics = candidates.filter((m): m is PerformanceMetricResult => m !== null);
    const overallPass = metrics.every((m) => m.status !== 'fail');

    return { overallPass, metrics };
}
