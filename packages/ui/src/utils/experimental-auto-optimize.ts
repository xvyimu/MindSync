/**
 * D2: experimental auto-optimize preference helpers (UI).
 * Default OFF; only explicit true enables. Never main-install default.
 */

import {
  EXPERIMENTAL_AUTO_OPTIMIZE_PREF_KEY,
  createDefaultExperimentalAutoOptimizeSettings,
  normalizeExperimentalAutoOptimizeSettings,
  type ExperimentalAutoOptimizeSettings,
  type IPreferenceService,
} from '@prompt-optimizer/core'

export {
  EXPERIMENTAL_AUTO_OPTIMIZE_PREF_KEY,
  createDefaultExperimentalAutoOptimizeSettings,
  normalizeExperimentalAutoOptimizeSettings,
  type ExperimentalAutoOptimizeSettings,
}

export async function loadExperimentalAutoOptimizeSettings(
  preferenceService: IPreferenceService | null | undefined,
): Promise<ExperimentalAutoOptimizeSettings> {
  if (!preferenceService) {
    return createDefaultExperimentalAutoOptimizeSettings()
  }
  try {
    const raw = await preferenceService.get<unknown>(
      EXPERIMENTAL_AUTO_OPTIMIZE_PREF_KEY,
      null,
    )
    return normalizeExperimentalAutoOptimizeSettings(raw)
  } catch {
    return createDefaultExperimentalAutoOptimizeSettings()
  }
}

export async function saveExperimentalAutoOptimizeSettings(
  preferenceService: IPreferenceService | null | undefined,
  settings: ExperimentalAutoOptimizeSettings,
): Promise<ExperimentalAutoOptimizeSettings> {
  const normalized = normalizeExperimentalAutoOptimizeSettings(settings)
  if (!preferenceService) return normalized
  await preferenceService.set(EXPERIMENTAL_AUTO_OPTIMIZE_PREF_KEY, normalized)
  return normalized
}
