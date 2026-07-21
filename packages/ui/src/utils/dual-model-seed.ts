/**
 * C1 dual-model light compare helpers (pure).
 *
 * Goal: make "same prompt version, two modelKeys side-by-side" one click,
 * without a matrix editor or structured-compare judge flow.
 */

export type DualModelSeedVariantId = 'a' | 'b'

export interface DualModelSeedInput {
  /** Currently selected model keys for columns A/B (may be empty). */
  currentA: string
  currentB: string
  /** Enabled model keys in UI order. */
  availableModelKeys: string[]
  /** Preferred primary key when seeding (e.g. legacy selectedTestModelKey). */
  preferredPrimary?: string
}

export interface DualModelSeedResult {
  modelA: string
  modelB: string
  /** True when B differs from A (true dual-model). False if only one model exists. */
  isDual: boolean
  /** Why dual could not be formed (for toast). */
  reason?: 'need-two-models' | 'no-models'
}

/**
 * Pick primary + secondary model keys for dual-model layout.
 * Secondary prefers the next distinct key in the options list.
 */
export function seedDualModelKeys(input: DualModelSeedInput): DualModelSeedResult {
  const keys = (input.availableModelKeys || []).map((k) => k.trim()).filter(Boolean)
  if (keys.length === 0) {
    return { modelA: '', modelB: '', isDual: false, reason: 'no-models' }
  }

  const preferred = (input.preferredPrimary || '').trim()
  const currentA = (input.currentA || '').trim()
  const currentB = (input.currentB || '').trim()

  const primary =
    (preferred && keys.includes(preferred) && preferred) ||
    (currentA && keys.includes(currentA) && currentA) ||
    keys[0]

  if (keys.length === 1) {
    return {
      modelA: primary,
      modelB: primary,
      isDual: false,
      reason: 'need-two-models',
    }
  }

  // Prefer existing B if already different and valid.
  if (currentB && keys.includes(currentB) && currentB !== primary) {
    return { modelA: primary, modelB: currentB, isDual: true }
  }

  const primaryIndex = keys.indexOf(primary)
  const secondary = keys[(primaryIndex + 1) % keys.length]
  if (!secondary || secondary === primary) {
    // Defensive: list may have duplicates.
    const distinct = keys.find((k) => k !== primary)
    if (!distinct) {
      return {
        modelA: primary,
        modelB: primary,
        isDual: false,
        reason: 'need-two-models',
      }
    }
    return { modelA: primary, modelB: distinct, isDual: true }
  }

  return { modelA: primary, modelB: secondary, isDual: true }
}

/**
 * Whether current A/B model keys already form a dual-model setup.
 */
export function isDualModelActive(modelA: string, modelB: string): boolean {
  const a = (modelA || '').trim()
  const b = (modelB || '').trim()
  return !!a && !!b && a !== b
}
