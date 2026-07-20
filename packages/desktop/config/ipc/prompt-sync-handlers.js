/**
 * 注册 Prompt 同步（非流式）IPC interface。
 * 流式通道仍由 prompt-stream-handlers 负责。
 * 经 registerSensitiveIpc：sender 校验 + 统一错误信封。
 */
function registerPromptSyncIpcHandlers({
  registerSensitiveIpc,
  promptService,
  historyManager,
}) {
  registerSensitiveIpc('prompt-optimizePrompt', async (_event, request) => {
    return promptService.optimizePrompt(request);
  });

  registerSensitiveIpc('prompt-optimizeMessage', async (_event, request) => {
    return promptService.optimizeMessage(request);
  });

  registerSensitiveIpc('prompt-iteratePrompt', async (
    _event,
    originalPrompt,
    lastOptimizedPrompt,
    iterateInput,
    modelKey,
    templateId,
    contextData,
  ) => {
    return promptService.iteratePrompt(
      originalPrompt,
      lastOptimizedPrompt,
      iterateInput,
      modelKey,
      templateId,
      contextData,
    );
  });

  registerSensitiveIpc('prompt-testPrompt', async (_event, systemPrompt, userPrompt, modelKey) => {
    return promptService.testPrompt(systemPrompt, userPrompt, modelKey);
  });

  registerSensitiveIpc('prompt-getHistory', async () => historyManager.getHistory());

  registerSensitiveIpc('prompt-getIterationChain', async (_event, recordId) => {
    return historyManager.getIterationChain(recordId);
  });
}

module.exports = {
  registerPromptSyncIpcHandlers,
};
