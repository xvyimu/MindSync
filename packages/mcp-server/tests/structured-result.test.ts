import { describe, it, expect } from 'vitest';
import {
  buildMcpStructuredResult,
  serializeMcpStructuredResult,
  assertMcpResultHasNoSecrets,
  MCP_STRUCTURED_RESULT_VERSION,
} from '../src/adapters/structured-result.js';

describe('MCP structured results (C3)', () => {
  it('builds original/optimized/meta with stable version', () => {
    const r = buildMcpStructuredResult({
      tool: 'optimize-user-prompt',
      mode: 'user',
      original: 'help me write',
      optimized: 'Please write a clear article about…',
      templateId: 'user-prompt-professional',
    });

    expect(r.original).toBe('help me write');
    expect(r.optimized).toContain('write');
    expect(r.meta.version).toBe(MCP_STRUCTURED_RESULT_VERSION);
    expect(r.meta.tool).toBe('optimize-user-prompt');
    expect(r.meta.mode).toBe('user');
    expect(r.meta.templateId).toBe('user-prompt-professional');
    expect(r.meta.modelKey).toBe('mcp-default');
    expect(r.meta.truncated).toBe(false);

    const json = serializeMcpStructuredResult(r);
    const parsed = JSON.parse(json);
    expect(parsed.meta.version).toBe(1);
    expect(() => assertMcpResultHasNoSecrets(json)).not.toThrow();
  });

  it('includes requirements for iterate mode', () => {
    const r = buildMcpStructuredResult({
      tool: 'iterate-prompt',
      mode: 'iterate',
      original: 'base',
      optimized: 'iterated',
      templateId: 'iterate',
      requirements: 'more formal',
    });
    expect(r.meta.requirements).toBe('more formal');
  });

  it('truncates long fields and marks meta.truncated', () => {
    const r = buildMcpStructuredResult(
      {
        tool: 'optimize-system-prompt',
        mode: 'system',
        original: 'x'.repeat(5000),
        optimized: 'y'.repeat(5000),
        templateId: 't',
        maxChars: 1000,
      },
      1000,
    );
    expect(r.meta.truncated).toBe(true);
    expect(r.original.length).toBeLessThan(5000);
    expect(r.optimized.length).toBeLessThan(5000);
    expect(r.original + r.optimized).toMatch(/truncated/);
  });

  it('assertMcpResultHasNoSecrets catches apiKey-like content', () => {
    expect(() => assertMcpResultHasNoSecrets('{"apiKey":"x"}')).toThrow(/secrets/i);
  });
});
