/**
 * Optional local-model adapter feature flag (W3).
 *
 * Default OFF — production and normal paths never auto-enable.
 * Enable only for explicit local experiments:
 *   - process env: MINDSYNC_LOCAL_MODEL_ADAPTER=1  (or true/yes/on)
 *   - Vite-style:  VITE_LOCAL_MODEL_ADAPTER=1
 *
 * Never reads API keys. Does not bind production defaults.
 */

const TRUTHY = new Set(['1', 'true', 'yes', 'on']);

/**
 * Normalize boolean-like env strings.
 */
export function isTruthyEnvValue(value: string | undefined | null): boolean {
  if (value === undefined || value === null) return false;
  return TRUTHY.has(String(value).trim().toLowerCase());
}

/**
 * Read flag from an env-like map (defaults to process.env when available).
 * Safe in browser bundles that lack process — returns false.
 */
export function isLocalModelAdapterEnabled(
  env?: Record<string, string | undefined> | NodeJS.ProcessEnv,
): boolean {
  const source =
    env ??
    (typeof process !== 'undefined' && process.env ? process.env : undefined);
  if (!source) return false;
  return (
    isTruthyEnvValue(source.MINDSYNC_LOCAL_MODEL_ADAPTER) ||
    isTruthyEnvValue(source.VITE_LOCAL_MODEL_ADAPTER)
  );
}

/** Provider id used when the flag is ON and the stub is registered. */
export const LOCAL_MODEL_PROVIDER_ID = 'local-model' as const;

/** Stable model id for the stub entry (no remote fetch). */
export const LOCAL_MODEL_STUB_ID = 'local-model-stub' as const;
