import { DEFAULT_SETTINGS, SETTINGS_KEY, type SkydioSettings } from '../types';

export function loadSettings(): SkydioSettings {
    try {
        const raw = localStorage.getItem(SETTINGS_KEY);
        if (!raw) return { ...DEFAULT_SETTINGS };
        return { ...DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch {
        return { ...DEFAULT_SETTINGS };
    }
}

export function saveSettings(settings: SkydioSettings): void {
    localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings));
}
