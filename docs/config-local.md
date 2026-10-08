# Deployment settings via `config.local.ts`

Use this when a CloudTAK plugin should ship shared settings for one deployment, so each person does not retype URLs, client ids, and other values that are the same for everyone. The browser cannot read a `.env` file. Vite compiles a gitignored `config.local.ts` into the web bundle when CloudTAK builds `app/`.

This is the pattern in the Skydio plugin (`config.local.example.ts`, `storage/deploymentDefaults.ts`, `storage/settings.ts`). CloudTAK 13.102+ loads plugins from `app/plugins/<name>/`.

## What gets committed

| File | In git | Role |
|---|---|---|
| `config.local.example.ts` | Yes | Template. Lists every shared settings field. |
| `config.local.ts` | No | Real values for this deployment. Copy of the example. |
| `storage/deploymentDefaults.ts` | Yes | Loads `config.local.ts` when it exists. |
| `env.d.ts` | Yes | Lets the plugin typecheck `import.meta.glob`. |

Add this line to `.gitignore`:

```
config.local.ts
```

Do not name the example `config.local.ts`. The loader globs that exact filename. `config.local.example.ts` is not included in the build.

## 1. Example file

Put `config.local.example.ts` at the plugin root. Export `deploymentDefaults` and list every settings field that should be prefilled. Leave per-user secrets out (Skydio leaves out `apiKey`, because each person is issued their own).

```typescript
import type { DeploymentSettings } from './storage/deploymentDefaults';

/**
 * Copy to config.local.ts (gitignored), fill in this deployment, then restart
 * or rebuild CloudTAK's app/.
 *
 * These values are compiled into the web bundle. Anyone who can load CloudTAK
 * can read them. Do not put per-user secrets here.
 */
export const deploymentDefaults: DeploymentSettings = {
    authentikTokenUrl: '',
    oauthClientId: '',
    oauthClientSecret: '',
    sseUrl: '',
    webhookUrl: '',
};
```

Operators then:

```bash
cp config.local.example.ts config.local.ts
# fill in config.local.ts
```

`git pull` updates the example only. It does not create, fetch, or overwrite `config.local.ts`. After a pull that adds a field to the example, add that field to the existing `config.local.ts` by hand. Avoid `git clean -fdx`; that deletes ignored files. `git pull` and `git reset --hard` leave `config.local.ts` in place.

A fresh clone or a Docker build that only copies git content does not include `config.local.ts`. Copy the file onto that machine before building `app/`.

## 2. Loader

`storage/deploymentDefaults.ts` must call `import.meta.glob` directly. Vite only replaces the literal `import.meta.glob(`. A cast or a helper that hides that call will not be compiled, and the browser will not see the file.

The glob path is relative to this file. From `storage/`, the plugin-root file is `../config.local.ts`.

```typescript
import type { PluginSettings } from '../types';

/** Shared settings from config.local.ts. Omit credentials issued per person. */
export type DeploymentSettings = Partial<Omit<PluginSettings, 'apiKey'>>;

interface DeploymentModule {
    deploymentDefaults?: DeploymentSettings;
}

export function deploymentDefaults(): DeploymentSettings {
    const modules = import.meta.glob<DeploymentModule>('../config.local.ts', {
        eager: true,
    });

    for (const mod of Object.values(modules)) {
        const defaults = mod?.deploymentDefaults;
        if (!defaults || typeof defaults !== 'object') continue;

        const rest = { ...defaults } as DeploymentSettings & { apiKey?: string };
        delete rest.apiKey;
        return rest;
    }

    return {};
}

export function hasDeploymentDefaults(): boolean {
    return Object.values(deploymentDefaults()).some((value) => {
        if (typeof value === 'string') return value.trim().length > 0;
        return value !== undefined && value !== null;
    });
}
```

If `config.local.ts` is missing, Vite turns the glob into an empty object and the plugin still builds. If the file exists, Vite bundles it.

To prefill every field, drop the `Omit<..., 'apiKey'>` and the `delete rest.apiKey` line, and use `Partial<PluginSettings>`. Only do that when the value is the same for every user of that CloudTAK. A per-user API key in this file is compiled into the bundle and given to everyone.

## 3. Type the glob for standalone `tsc`

CloudTAK's `app/tsconfig.json` already includes `vite/client`, so `vue-tsc` from `app/` accepts `import.meta.glob`. The plugin's own `tsc` does not. Add this to the plugin `env.d.ts` (global, not inside a module):

```typescript
interface ImportMeta {
    glob<M>(pattern: string, options: { eager: true }): Record<string, M>;
}
```

## 4. Merge with saved settings

Load order:

1. Hard-coded `DEFAULT_SETTINGS`
2. `config.local.ts`
3. This browser's `localStorage`, for values the user actually saved

Blank strings in `localStorage` fall back to `config.local.ts`. A non-blank saved string wins, so a person can override one field. On save, if a string still equals the deployment value, store `''` instead. The next load then picks up a changed `config.local.ts` instead of a frozen copy.

List every string field from the example in `SHARED_STRING_KEYS`.

```typescript
import { DEFAULT_SETTINGS, type PluginSettings } from '../types';
import { deploymentDefaults } from './deploymentDefaults';

const SHARED_STRING_KEYS = [
    'authentikTokenUrl',
    'oauthClientId',
    'oauthClientSecret',
    'sseUrl',
    'webhookUrl',
] as const satisfies readonly (keyof PluginSettings)[];

function trimmed(value: unknown): string {
    return typeof value === 'string' ? value.trim() : '';
}

export function applyDeploymentDefaults(stored: Partial<PluginSettings> | null): PluginSettings {
    const settings: PluginSettings = {
        ...DEFAULT_SETTINGS,
        ...deploymentDefaults(),
        apiKey: trimmed(stored?.apiKey),
    };

    if (!stored) return settings;

    for (const key of SHARED_STRING_KEYS) {
        const fromUser = trimmed(stored[key]);
        settings[key] = fromUser || trimmed(settings[key]);
    }

    return settings;
}

export function settingsForStorage(settings: PluginSettings): PluginSettings {
    const deployed = deploymentDefaults();
    const stored: PluginSettings = { ...settings };

    for (const key of SHARED_STRING_KEYS) {
        const fromDeployment = trimmed(deployed[key]);
        if (fromDeployment && stored[key].trim() === fromDeployment) {
            stored[key] = '';
        }
    }

    return stored;
}

export function loadSettings(): PluginSettings {
    const raw = localStorage.getItem(settingsStorageKey());
    let stored: Partial<PluginSettings> | null = null;
    if (raw) {
        try {
            const parsed: unknown = JSON.parse(raw);
            if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
                stored = parsed as Partial<PluginSettings>;
            }
        } catch {
            stored = null;
        }
    }
    return applyDeploymentDefaults(stored);
}

export function saveSettings(settings: PluginSettings): void {
    localStorage.setItem(settingsStorageKey(), JSON.stringify(settingsForStorage(settings)));
}
```

Booleans and numbers from `config.local.ts` apply on the first visit. After the user saves, the stored boolean or number wins. A webhook URL already saved in that browser keeps winning until that field is cleared and saved again.

Keep the existing "blank password keeps the previous secret" merge if the settings form uses a password input. The loaded settings already contain the deployment secret, so a blank input still resolves to it.

## 5. Settings screen

Prefill is automatic once `loadSettings()` applies the merge. Optional note when a deployment file is present:

```vue
<p v-if='deploymentConfigured' class='text-muted'>
    These values are already filled in for this CloudTAK.
    Edit a field only to override the deployment value.
</p>
```

```typescript
import { hasDeploymentDefaults } from '../storage/deploymentDefaults';

const deploymentConfigured = hasDeploymentDefaults();
```

## 6. Rebuild

Restart `npm run serve` in `CloudTAK/app`, or rebuild the web UI, after creating or editing `config.local.ts`. Vite reads the file at build time.

Check from `CloudTAK/app` (plugin symlinked at `app/plugins/<name>/`):

```bash
npx eslint --config eslint.config.js ./plugins/<name>/
npm run check
```

## Checklist

- [ ] `config.local.example.ts` at the plugin root exports `deploymentDefaults` with every shared field
- [ ] `.gitignore` contains `config.local.ts`
- [ ] Loader uses a direct `import.meta.glob('../config.local.ts', { eager: true })`
- [ ] `env.d.ts` declares `ImportMeta.glob`
- [ ] `loadSettings()` fills blanks from the deployment file
- [ ] `saveSettings()` does not persist strings that match the deployment file
- [ ] Per-user secrets stay out of `config.local.ts`
- [ ] Dev server restarted or `app/` rebuilt after the file changes
