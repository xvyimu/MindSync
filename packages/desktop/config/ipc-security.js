/**
 * 轻量 IPC 错误构造工具。
 *
 * 目的：给流注册表 / 领域执行器提供带 `code` 的结构化错误，
 * 让 main 进程的 createErrorResponse 能把 code 透传给 renderer 做 i18n，
 * 而不是把裸 message 抛出去。
 *
 * 注意：这是官方 2.11.7 未内置的模块，属于本地流式取消特性的支撑件。
 * 保持零依赖、纯 CommonJS，便于 `node --test` 直接加载。
 */

/**
 * 创建带 code 的 Error。
 * @param {string} code 机器可读的错误码，例如 'IPC_UNTRUSTED_SENDER'
 * @param {string} message 人类可读的英文兜底描述
 * @returns {Error & { code: string }}
 */
function createIpcError(code, message) {
  const error = new Error(message || code);
  error.code = code;
  return error;
}

module.exports = {
  createIpcError,
};
