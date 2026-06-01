import type {
    DronePerformanceSpec,
    PerformanceEvaluation,
    PerformanceMetricResult,
    PreflightWeather,
} from '../types';

function metric(
    label: string,
    value: number | null,
    limit: number | undefined,
    compare: (value: number, limit: number) => boolean,
    formatValue: (value: number) => string,
    formatLimit: (limit: number) => string,
): PerformanceMetricResult | null {
    if (limit === undefined) return null;
    if (value === null) {
        return { label, value: 'n/a', limit: formatLimit(limit), pass: false };
    }
    return {
        label,
        value: formatValue(value),
        limit: formatLimit(limit),
        pass: compare(value, limit),
    };
}

/**
 * Compare the current weather against a platform's performance specs. Any spec
 * left undefined is skipped. Metrics whose weather value is missing are marked
 * as failing ("n/a") so the operator notices the gap. When the platform has no
 * specs at all, returns an empty metric list and overallPass = true.
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
            'Visibility',
            weather.visibilityMiles,
            spec.minVisibilityMiles,
            (v, l) => v >= l,
            (v) => `${v} mi`,
            (l) => `\u2265 ${l} mi`,
        ),
        metric(
            'KP index',
            weather.kpIndex.trim() === '' ? null : Number(weather.kpIndex),
            spec.maxKpIndex,
            (v, l) => v <= l,
            (v) => `${v}`,
            (l) => `\u2264 ${l}`,
        ),
    ];

    const metrics = candidates.filter((m): m is PerformanceMetricResult => m !== null);
    const overallPass = metrics.every((m) => m.pass);

    return { overallPass, metrics };
}
