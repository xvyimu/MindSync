/**
 * C3: stable structured MCP tool results.
 * JSON text for IDE clients; never embeds API keys.
 */

export const MCP_STRUCTURED_RESULT_VERSION = 1 as const;

export type McpOptimizationMode = 'user' | 'system' | 'iterate';

export interface McpStructuredResultMeta {
  version: typeof MCP_STRUCTURED_RESULT_VERSION;
  tool: string;
  mode: McpOptimizationMode;
  templateId: string;
  modelKey: string;
  truncated: boolean;
  /** Optional opaque fields (never secrets). */
  requirements?: string;
}

export interface McpStructuredResult {
  original: string;
  optimized: string;
  meta: McpStructuredResultMeta;
}

export interface BuildMcpStructuredResultInput {
  tool: string;
  mode: McpOptimizationMode;
  original: string;
  optimized: string;
  templateId: string;
  modelKey?: string;
  requirements?: string;
  /** Max chars for original+optimized combined payload body (before JSON wrap). */
  maxChars?: number;
}

function truncateField(text: string, max: number): { text: string; truncated: boolean } {
  if (text.length <= max) return { text, truncated: false };
  const marker = '\n…[truncated]';
  const keep = Math.max(0, max - marker.length);
  return { text: `${text.slice(0, keep)}${marker}`, truncated: true };
}

/**
 * Build a versioned MCP result object. Truncates original/optimized if needed
 * so the serialized form stays within budget.
 */
export function buildMcpStructuredResult(
  input: BuildMcpStructuredResultInput,
  maxChars: number = 20000,
): McpStructuredResult {
  const budget = input.maxChars ?? maxChars;
  // Leave headroom for JSON keys / meta.
  const bodyBudget = Math.max(256, budget - 800);
  const half = Math.floor(bodyBudget / 2);

  let original = typeof input.original === 'string' ? input.original : String(input.original ?? '');
  let optimized =
    typeof input.optimized === 'string' ? input.optimized : String(input.optimized ?? '');

  const o1 = truncateField(original, half);
  const o2 = truncateField(optimized, half);
  original = o1.text;
  optimized = o2.text;
  const truncated = o1.truncated || o2.truncated;

  const meta: McpStructuredResultMeta = {
    version: MCP_STRUCTURED_RESULT_VERSION,
    tool: input.tool,
    mode: input.mode,
    templateId: input.templateId || '',
    modelKey: input.modelKey || 'mcp-default',
    truncated,
  };
  if (input.requirements?.trim()) {
    meta.requirements = truncateField(input.requirements.trim(), 500).text;
  }

  return { original, optimized, meta };
}

export function serializeMcpStructuredResult(result: McpStructuredResult, pretty = false): string {
  return pretty ? JSON.stringify(result, null, 2) : JSON.stringify(result);
}

/** Guard against accidental secret leakage in structured payloads. */
export function assertMcpResultHasNoSecrets(text: string): void {
  const patterns = [
    /\bapiKey\b/i,
    /\bapi_key\b/i,
    /\bAuthorization\b\s*:/i,
    /\bsk-[A-Za-z0-9]{10,}/,
  ];
  for (const re of patterns) {
    if (re.test(text)) {
      throw new Error(`MCP structured result must not contain secrets (matched ${re})`);
    }
  }
}
