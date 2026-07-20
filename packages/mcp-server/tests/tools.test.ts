/**
 * MCP Tools 基础测试
 */

import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { CoreServicesManager } from '../src/adapters/core-services.js';
import { ParameterValidator } from '../src/adapters/parameter-adapter.js';
import { MCPErrorHandler, MCP_ERROR_CODES } from '../src/adapters/error-handler.js';

describe('MCP Server Tools', () => {
  let coreServices: CoreServicesManager;

  beforeAll(async () => {
    // 设置测试环境变量
    process.env.MCP_DEFAULT_MODEL_API_KEY = 'test-key';
    process.env.MCP_DEFAULT_MODEL_PROVIDER = 'openai';
    process.env.MCP_DEFAULT_MODEL_NAME = 'gpt-4';

    coreServices = CoreServicesManager.getInstance();
    
    // 注意：这里只测试初始化，不测试实际的 LLM 调用
    // 实际的 LLM 调用需要真实的 API 密钥
  });

  describe('ParameterValidator', () => {
    it('validates prompt input', () => {
      expect(() => ParameterValidator.validatePrompt('valid prompt')).not.toThrow();
      expect(() => ParameterValidator.validatePrompt('')).toThrow('Prompt must be a non-empty string');
      expect(() => ParameterValidator.validatePrompt('   ')).toThrow('Prompt must be a non-empty string');
      expect(() => ParameterValidator.validatePrompt('a'.repeat(60000))).toThrow('Prompt must not exceed 50,000 characters');
    });

    it('validates requirements input', () => {
      expect(() => ParameterValidator.validateRequirements('valid requirements')).not.toThrow();
      expect(() => ParameterValidator.validateRequirements('')).toThrow('Requirements must be a non-empty string');
      expect(() => ParameterValidator.validateRequirements('   ')).toThrow('Requirements must be a non-empty string');
      expect(() => ParameterValidator.validateRequirements('a'.repeat(15000))).toThrow('Requirements must not exceed 10,000 characters');
    });

    it('validates template input', () => {
      expect(() => ParameterValidator.validateTemplate('valid-template')).not.toThrow();
      expect(() => ParameterValidator.validateTemplate(undefined)).not.toThrow();
      expect(() => ParameterValidator.validateTemplate('')).toThrow('Template must be a non-empty string');
      expect(() => ParameterValidator.validateTemplate('   ')).toThrow('Template must be a non-empty string');
    });

    it('validates lastOptimized input', () => {
      expect(() => ParameterValidator.validateLastOptimized(undefined)).not.toThrow();
      expect(() => ParameterValidator.validateLastOptimized('previous version')).not.toThrow();
      expect(() => ParameterValidator.validateLastOptimized('')).toThrow('lastOptimized must be a non-empty string');
      expect(() => ParameterValidator.validateLastOptimized('a'.repeat(60000))).toThrow('lastOptimized must not exceed 50,000 characters');
    });

    it('truncates long tool results', () => {
      const long = 'x'.repeat(ParameterValidator.DEFAULT_RESULT_MAX_CHARS + 10);
      const truncated = ParameterValidator.truncateResult(long);
      expect(truncated.length).toBeLessThan(long.length);
      expect(truncated).toContain('[truncated:');
      expect(ParameterValidator.truncateResult('short')).toBe('short');
    });
  });

  describe('MCPErrorHandler', () => {
    it('converts validation errors', () => {
      const error = new Error('Prompt must be a non-empty string');
      const mcpError = MCPErrorHandler.convertCoreError(error);

      expect(mcpError.code).toBe(MCP_ERROR_CODES.INVALID_PARAMS); // -32602
      expect(mcpError.message).toContain('Prompt must be a non-empty string');
    });

    it('converts optimization errors', () => {
      const error = new Error('Optimization failed');
      error.name = 'OptimizationError';
      const mcpError = MCPErrorHandler.convertCoreError(error);

      expect(mcpError.code).toBe(MCP_ERROR_CODES.PROMPT_OPTIMIZATION_FAILED); // -32001
      expect(mcpError.message).toContain('Prompt optimization failed');
    });

    it('converts unknown errors to internal errors', () => {
      const error = new Error('Unknown failure');
      const mcpError = MCPErrorHandler.convertCoreError(error);

      expect(mcpError.code).toBe(MCP_ERROR_CODES.INTERNAL_ERROR); // -32000
      expect(mcpError.message).toContain('Internal error');
    });

    it('creates validation errors', () => {
      const mcpError = MCPErrorHandler.createValidationError('Validation issue');

      expect(mcpError.code).toBe(MCP_ERROR_CODES.INVALID_PARAMS);
      expect(mcpError.message).toContain('Parameter validation failed: Validation issue');
    });

    it('creates internal errors', () => {
      const mcpError = MCPErrorHandler.createInternalError('Internal failure');

      expect(mcpError.code).toBe(MCP_ERROR_CODES.INTERNAL_ERROR);
      expect(mcpError.message).toContain('Internal failure');
    });
  });
});
