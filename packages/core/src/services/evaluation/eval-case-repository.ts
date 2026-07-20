import type { IStorageProvider } from '../storage/types';
import { CORE_SERVICE_KEYS } from '../../constants/storage-keys';
import {
  DEFAULT_EVAL_CASE_SET_ID,
  DEFAULT_EVAL_CASE_SET_NAME,
  EVAL_CASE_SET_MAX_CASES,
  type EvalAssertion,
  type EvalCase,
  type EvalCaseSet,
} from './eval-case-types';

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

const isEvalAssertion = (value: unknown): value is EvalAssertion => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const rec = value as Record<string, unknown>;
  if (rec.type !== 'contains' && rec.type !== 'not_contains') return false;
  return isNonEmptyString(rec.value);
};

const isEvalCase = (value: unknown): value is EvalCase => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const rec = value as Record<string, unknown>;
  if (!isNonEmptyString(rec.id) || !isNonEmptyString(rec.name) || !isNonEmptyString(rec.input)) {
    return false;
  }
  if (!Array.isArray(rec.assertions) || rec.assertions.length === 0) return false;
  if (!rec.assertions.every(isEvalAssertion)) return false;
  if (rec.systemPrompt !== undefined && typeof rec.systemPrompt !== 'string') return false;
  if (rec.tags !== undefined) {
    if (!Array.isArray(rec.tags) || !rec.tags.every((t) => typeof t === 'string')) return false;
  }
  return true;
};

export const isEvalCaseSet = (value: unknown): value is EvalCaseSet => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const rec = value as Record<string, unknown>;
  if (!isNonEmptyString(rec.id) || !isNonEmptyString(rec.name)) return false;
  if (rec.version !== 1) return false;
  if (typeof rec.updatedAt !== 'number' || !Number.isFinite(rec.updatedAt)) return false;
  if (!Array.isArray(rec.cases)) return false;
  if (rec.cases.length > EVAL_CASE_SET_MAX_CASES) return false;
  return rec.cases.every(isEvalCase);
};

export const createEmptyEvalCaseSet = (
  id: string = DEFAULT_EVAL_CASE_SET_ID,
  name: string = DEFAULT_EVAL_CASE_SET_NAME,
): EvalCaseSet => ({
  id,
  name,
  version: 1,
  updatedAt: Date.now(),
  cases: [],
});

export const createEvalCaseId = (): string => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `case_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
};

/**
 * 默认可复现用例集仓储（单用户单套）。
 */
export class EvalCaseSetRepository {
  constructor(
    private readonly storage: IStorageProvider,
    private readonly storageKey: string = CORE_SERVICE_KEYS.EVAL_CASE_SET,
  ) {}

  async load(): Promise<EvalCaseSet> {
    const raw = await this.storage.getItem(this.storageKey);
    if (!raw) {
      return createEmptyEvalCaseSet();
    }
    try {
      const parsed: unknown = JSON.parse(raw);
      if (!isEvalCaseSet(parsed)) {
        console.warn('[EvalCaseSetRepository] Invalid stored case set, resetting to empty');
        return createEmptyEvalCaseSet();
      }
      return parsed;
    } catch (error) {
      console.warn('[EvalCaseSetRepository] Failed to parse case set:', error);
      return createEmptyEvalCaseSet();
    }
  }

  async save(caseSet: EvalCaseSet): Promise<EvalCaseSet> {
    if (caseSet.cases.length > EVAL_CASE_SET_MAX_CASES) {
      throw new Error(
        `Eval case set exceeds max cases (${EVAL_CASE_SET_MAX_CASES})`,
      );
    }
    if (!isEvalCaseSet({ ...caseSet, version: 1 })) {
      throw new Error('Invalid eval case set payload');
    }
    const next: EvalCaseSet = {
      ...caseSet,
      version: 1,
      updatedAt: Date.now(),
      cases: caseSet.cases.map((c) => ({
        ...c,
        name: c.name.trim(),
        input: c.input.trim(),
        systemPrompt: c.systemPrompt?.trim() || undefined,
        assertions: c.assertions.map((a) => ({ ...a, value: a.value })),
      })),
    };
    if (!isEvalCaseSet(next)) {
      throw new Error('Normalized eval case set failed validation');
    }
    await this.storage.setItem(this.storageKey, JSON.stringify(next));
    return next;
  }

  async clear(): Promise<void> {
    await this.storage.removeItem(this.storageKey);
  }
}

export function createEvalCaseSetRepository(
  storage: IStorageProvider,
  storageKey?: string,
): EvalCaseSetRepository {
  return new EvalCaseSetRepository(storage, storageKey);
}
