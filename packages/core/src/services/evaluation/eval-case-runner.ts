import type { ILLMService, Message } from '../llm/types';
import {
  EVAL_CASE_SET_MAX_CASES,
  EVAL_OUTPUT_PREVIEW_MAX_CHARS,
  type EvalAssertion,
  type EvalAssertionResult,
  type EvalCase,
  type EvalCaseRunResult,
  type EvalCaseSet,
  type EvalEvidenceBundle,
} from './eval-case-types';

export interface EvalCaseRunnerDeps {
  llmService: Pick<ILLMService, 'sendMessage'>;
  modelKey: string;
  signal?: AbortSignal;
  /** 输出预览最大字符，默认 EVAL_OUTPUT_PREVIEW_MAX_CHARS */
  previewMaxChars?: number;
}

const throwIfAborted = (signal?: AbortSignal): void => {
  if (signal?.aborted) {
    const error = new Error('Eval case run was cancelled');
    error.name = 'AbortError';
    throw error;
  }
};

const normalizeForCompare = (text: string, caseSensitive: boolean): string =>
  caseSensitive ? text : text.toLowerCase();

/**
 * 对单条模型输出执行断言（纯函数，便于单测）。
 */
export function evaluateAssertions(
  output: string,
  assertions: EvalAssertion[],
): EvalAssertionResult[] {
  return assertions.map((assertion) => {
    const caseSensitive = assertion.caseSensitive === true;
    const haystack = normalizeForCompare(output, caseSensitive);
    const needle = normalizeForCompare(assertion.value, caseSensitive);

    if (assertion.type === 'contains') {
      const passed = haystack.includes(needle);
      return {
        assertion,
        passed,
        detail: passed
          ? undefined
          : `Expected output to contain ${JSON.stringify(assertion.value)}`,
      };
    }

    if (assertion.type === 'not_contains') {
      const passed = !haystack.includes(needle);
      return {
        assertion,
        passed,
        detail: passed
          ? undefined
          : `Expected output not to contain ${JSON.stringify(assertion.value)}`,
      };
    }

    // 穷尽联合类型保护
    const _exhaustive: never = assertion;
    return {
      assertion: _exhaustive,
      passed: false,
      detail: 'Unknown assertion type',
    };
  });
}

const buildMessages = (evalCase: EvalCase): Message[] => {
  const messages: Message[] = [];
  if (evalCase.systemPrompt?.trim()) {
    messages.push({ role: 'system', content: evalCase.systemPrompt.trim() });
  }
  messages.push({ role: 'user', content: evalCase.input });
  return messages;
};

const previewOutput = (output: string, maxChars: number): string => {
  if (output.length <= maxChars) return output;
  return `${output.slice(0, maxChars)}\n…[truncated ${output.length - maxChars} chars]`;
};

/**
 * 串行跑用例集：每条调用 LLM，再跑 contains/not_contains 断言。
 * 单条失败记入 error 并继续；signal abort 则整批中止。
 */
export async function runEvalCaseSet(
  caseSet: EvalCaseSet,
  deps: EvalCaseRunnerDeps,
): Promise<EvalEvidenceBundle> {
  const { llmService, modelKey, signal } = deps;
  const previewMax = deps.previewMaxChars ?? EVAL_OUTPUT_PREVIEW_MAX_CHARS;

  if (!modelKey?.trim()) {
    throw new Error('modelKey is required to run eval case set');
  }
  if (caseSet.cases.length > EVAL_CASE_SET_MAX_CASES) {
    throw new Error(
      `Eval case set exceeds max cases (${EVAL_CASE_SET_MAX_CASES})`,
    );
  }

  const results: EvalCaseRunResult[] = [];

  for (const evalCase of caseSet.cases) {
    throwIfAborted(signal);
    const started = Date.now();
    try {
      const output = await llmService.sendMessage(
        buildMessages(evalCase),
        modelKey,
      );
      throwIfAborted(signal);
      const assertionResults = evaluateAssertions(output, evalCase.assertions);
      const passed = assertionResults.every((r) => r.passed);
      results.push({
        caseId: evalCase.id,
        caseName: evalCase.name,
        passed,
        outputPreview: previewOutput(output, previewMax),
        assertionResults,
        durationMs: Date.now() - started,
      });
    } catch (error) {
      if (error instanceof Error && error.name === 'AbortError') {
        throw error;
      }
      if (signal?.aborted) {
        const abortError = new Error('Eval case run was cancelled');
        abortError.name = 'AbortError';
        throw abortError;
      }
      const message = error instanceof Error ? error.message : String(error);
      results.push({
        caseId: evalCase.id,
        caseName: evalCase.name,
        passed: false,
        outputPreview: '',
        assertionResults: [],
        durationMs: Date.now() - started,
        error: message,
      });
    }
  }

  const passedCount = results.filter((r) => r.passed).length;
  return {
    version: 1,
    createdAt: Date.now(),
    modelKey,
    caseSetId: caseSet.id,
    caseSetName: caseSet.name,
    results,
    summary: {
      total: results.length,
      passed: passedCount,
      failed: results.length - passedCount,
    },
  };
}

/**
 * 序列化证据包（导出文件内容）。
 */
export function serializeEvalEvidenceBundle(
  bundle: EvalEvidenceBundle,
  pretty = true,
): string {
  return pretty ? JSON.stringify(bundle, null, 2) : JSON.stringify(bundle);
}

/**
 * 生成导出文件名。
 */
export function createEvalEvidenceFileName(date: Date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  const stamp = [
    date.getFullYear(),
    pad(date.getMonth() + 1),
    pad(date.getDate()),
    '-',
    pad(date.getHours()),
    pad(date.getMinutes()),
    pad(date.getSeconds()),
  ].join('');
  return `eval-evidence-${stamp}.json`;
}
