/**
 * D1: Optimization strategy port (template = default human path).
 * D2: experimental auto strategy is OFF by default and must stay opt-in.
 *
 * ADR-005: main install never enables auto-optimization by default.
 */

import type { OptimizationMode } from '../prompt/types';

/** Strategy kinds supported by the workbench. */
export type OptimizationStrategyKind = 'template' | 'auto-experimental';

export interface OptimizationStrategyContext {
  mode: OptimizationMode;
  targetPrompt: string;
  modelKey: string;
  templateId?: string;
  /** Optional iterate inputs */
  lastOptimizedPrompt?: string;
  iterateInput?: string;
}

export interface OptimizationStrategyPlan {
  kind: OptimizationStrategyKind;
  /** Template strategy: which template id to use (required for template). */
  templateId?: string;
  /** Auto experimental: max LLM improvement rounds (budget). */
  maxRounds?: number;
  /** Auto experimental: soft token/char budget for intermediate drafts. */
  maxCharsBudget?: number;
  /** Human-readable note for UI / logs (never secrets). */
  note?: string;
}

export interface OptimizationStrategy {
  readonly kind: OptimizationStrategyKind;
  /** Whether this strategy may run without an explicit user template choice. */
  readonly isExperimental: boolean;
  plan(ctx: OptimizationStrategyContext): OptimizationStrategyPlan;
}

/** Default product path: template + human iteration. */
export class TemplateOptimizationStrategy implements OptimizationStrategy {
  readonly kind = 'template' as const;
  readonly isExperimental = false;

  constructor(private readonly defaultTemplateId?: string) {}

  plan(ctx: OptimizationStrategyContext): OptimizationStrategyPlan {
    const templateId = (ctx.templateId || this.defaultTemplateId || '').trim();
    if (!templateId) {
      throw new Error('TemplateOptimizationStrategy requires a templateId');
    }
    return {
      kind: 'template',
      templateId,
      note: 'Default human template path',
    };
  }
}

/**
 * Experimental auto strategy — must never be selected unless
 * `isExperimentalAutoOptimizeEnabled` is true.
 */
export class ExperimentalAutoOptimizationStrategy implements OptimizationStrategy {
  readonly kind = 'auto-experimental' as const;
  readonly isExperimental = true;

  constructor(
    private readonly options: {
      maxRounds?: number;
      maxCharsBudget?: number;
      fallbackTemplateId?: string;
    } = {},
  ) {}

  plan(ctx: OptimizationStrategyContext): OptimizationStrategyPlan {
    const maxRounds = clampInt(this.options.maxRounds ?? 3, 1, 10);
    const maxCharsBudget = clampInt(this.options.maxCharsBudget ?? 20_000, 1_000, 100_000);
    return {
      kind: 'auto-experimental',
      templateId: ctx.templateId || this.options.fallbackTemplateId,
      maxRounds,
      maxCharsBudget,
      note: 'Experimental auto-optimize (budgeted; cancelable by caller)',
    };
  }
}

export interface ExperimentalAutoOptimizeSettings {
  /** Master switch — default false. */
  enabled: boolean;
  maxRounds: number;
  maxCharsBudget: number;
}

export const DEFAULT_EXPERIMENTAL_AUTO_OPTIMIZE: Readonly<ExperimentalAutoOptimizeSettings> = {
  enabled: false,
  maxRounds: 3,
  maxCharsBudget: 20_000,
};

/** Preference key for experimental auto-optimize (D2). */
export const EXPERIMENTAL_AUTO_OPTIMIZE_PREF_KEY =
  'app:settings:experimental:auto-optimize.v1' as const;

export function createDefaultExperimentalAutoOptimizeSettings(): ExperimentalAutoOptimizeSettings {
  return { ...DEFAULT_EXPERIMENTAL_AUTO_OPTIMIZE };
}

export function normalizeExperimentalAutoOptimizeSettings(
  raw: unknown,
): ExperimentalAutoOptimizeSettings {
  const base = createDefaultExperimentalAutoOptimizeSettings();
  if (!raw || typeof raw !== 'object') return base;
  const o = raw as Record<string, unknown>;
  return {
    // Hard default OFF: only explicit true enables.
    enabled: o.enabled === true,
    maxRounds: clampInt(Number(o.maxRounds ?? base.maxRounds), 1, 10),
    maxCharsBudget: clampInt(Number(o.maxCharsBudget ?? base.maxCharsBudget), 1_000, 100_000),
  };
}

/**
 * Resolve which strategy to use. Auto is never chosen unless settings.enabled.
 */
export function resolveOptimizationStrategy(
  settings: ExperimentalAutoOptimizeSettings = DEFAULT_EXPERIMENTAL_AUTO_OPTIMIZE,
  defaults?: { templateId?: string },
): OptimizationStrategy {
  if (settings.enabled === true) {
    return new ExperimentalAutoOptimizationStrategy({
      maxRounds: settings.maxRounds,
      maxCharsBudget: settings.maxCharsBudget,
      fallbackTemplateId: defaults?.templateId,
    });
  }
  return new TemplateOptimizationStrategy(defaults?.templateId);
}

function clampInt(n: number, min: number, max: number): number {
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, Math.trunc(n)));
}
