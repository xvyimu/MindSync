/**
 * 可复现评估用例集（Cut-1 最小切片）
 * 与 EvaluationService 的 LLM 打分评估并行：本模块先做「输出包含」类断言批跑。
 */

/** 断言类型（Cut-1 仅 contains / not_contains） */
export type EvalAssertion =
  | { type: 'contains'; value: string; caseSensitive?: boolean }
  | { type: 'not_contains'; value: string; caseSensitive?: boolean };

export interface EvalCase {
  id: string;
  name: string;
  /** 送给模型的用户侧输入或任务描述 */
  input: string;
  /** 可选系统提示覆盖 */
  systemPrompt?: string;
  assertions: EvalAssertion[];
  tags?: string[];
}

export interface EvalCaseSet {
  id: string;
  name: string;
  version: 1;
  updatedAt: number;
  cases: EvalCase[];
}

export interface EvalAssertionResult {
  assertion: EvalAssertion;
  passed: boolean;
  detail?: string;
}

export interface EvalCaseRunResult {
  caseId: string;
  caseName: string;
  passed: boolean;
  outputPreview: string;
  assertionResults: EvalAssertionResult[];
  durationMs: number;
  error?: string;
}

export interface EvalEvidenceBundle {
  version: 1;
  createdAt: number;
  modelKey: string;
  caseSetId: string;
  caseSetName: string;
  results: EvalCaseRunResult[];
  summary: { total: number; passed: number; failed: number };
}

/** 批跑时每条用例的上限（防 token 爆炸） */
export const EVAL_CASE_SET_MAX_CASES = 20;

/** 证据中输出预览最大字符 */
export const EVAL_OUTPUT_PREVIEW_MAX_CHARS = 2000;

export const DEFAULT_EVAL_CASE_SET_ID = 'default';
export const DEFAULT_EVAL_CASE_SET_NAME = 'Default case set';
