/**
 * 参数验证工具
 * 简化的参数验证，移除过度抽象
 */

export class ParameterValidator {

  /**
   * 验证提示词输入
   */
  static validatePrompt(prompt: string): void {
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      throw new Error('Prompt must be a non-empty string');
    }
    if (prompt.length > 50000) {
      throw new Error('Prompt must not exceed 50,000 characters');
    }
  }

  /**
   * 验证模板输入
   */
  static validateTemplate(template?: string): void {
    if (template !== undefined && (typeof template !== 'string' || template.trim().length === 0)) {
      throw new Error('Template must be a non-empty string');
    }
  }

  /**
   * 验证需求描述输入
   */
  static validateRequirements(requirements: string): void {
    if (!requirements || typeof requirements !== 'string' || requirements.trim().length === 0) {
      throw new Error('Requirements must be a non-empty string');
    }
    if (requirements.length > 10000) {
      throw new Error('Requirements must not exceed 10,000 characters');
    }
  }

  /**
   * 验证上次优化结果（iterate 第二参）
   */
  static validateLastOptimized(lastOptimized?: string): void {
    if (lastOptimized === undefined) return;
    if (typeof lastOptimized !== 'string' || lastOptimized.trim().length === 0) {
      throw new Error('lastOptimized must be a non-empty string when provided');
    }
    if (lastOptimized.length > 50000) {
      throw new Error('lastOptimized must not exceed 50,000 characters');
    }
  }

  /** MCP 工具返回文本默认上限，防止 token 爆炸 */
  static readonly DEFAULT_RESULT_MAX_CHARS = 20000;

  /**
   * 截断过长工具结果；超限时附加 truncated 标记。
   */
  static truncateResult(
    text: string,
    maxChars: number = ParameterValidator.DEFAULT_RESULT_MAX_CHARS,
  ): string {
    if (typeof text !== 'string') return String(text);
    if (text.length <= maxChars) return text;
    return `${text.slice(0, maxChars)}\n\n[truncated: output exceeded ${maxChars} characters]`;
  }
}
