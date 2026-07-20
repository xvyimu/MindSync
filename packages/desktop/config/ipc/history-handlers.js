/**
 * 注册历史记录相关的 Desktop IPC interface。
 * 经 registerSensitiveIpc：sender 校验 + 统一错误信封。
 */
function registerHistoryIpcHandlers({
  registerSensitiveIpc,
  historyManager,
  safeSerialize,
}) {
  registerSensitiveIpc('history-getHistory', async () => historyManager.getRecords());

  registerSensitiveIpc('history-addRecord', async (_event, record) => {
    const safeRecord = safeSerialize(record);
    return historyManager.addRecord(safeRecord);
  });

  registerSensitiveIpc('history-deleteRecord', async (_event, id) => {
    await historyManager.deleteRecord(id);
    return null;
  });

  registerSensitiveIpc('history-clearHistory', async () => {
    await historyManager.clearHistory();
    return null;
  });

  registerSensitiveIpc('history-getIterationChain', async (_event, recordId) => {
    return historyManager.getIterationChain(recordId);
  });

  registerSensitiveIpc('history-getAllChains', async () => historyManager.getAllChains());

  registerSensitiveIpc('history-getChain', async (_event, chainId) => {
    return historyManager.getChain(chainId);
  });

  registerSensitiveIpc('history-createNewChain', async (_event, record) => {
    const safeRecord = safeSerialize(record);
    return historyManager.createNewChain(safeRecord);
  });

  registerSensitiveIpc('history-addIteration', async (_event, params) => {
    const safeParams = safeSerialize(params);
    return historyManager.addIteration(safeParams);
  });

  registerSensitiveIpc('history-deleteChain', async (_event, chainId) => {
    await historyManager.deleteChain(chainId);
    return null;
  });

  registerSensitiveIpc('history-exportData', async () => historyManager.exportData());

  registerSensitiveIpc('history-importData', async (_event, data) => {
    const safeData = safeSerialize(data);
    await historyManager.importData(safeData);
    return null;
  });

  registerSensitiveIpc('history-getDataType', async () => historyManager.getDataType());

  registerSensitiveIpc('history-validateData', async (_event, data) => {
    const safeData = safeSerialize(data);
    return historyManager.validateData(safeData);
  });
}

module.exports = {
  registerHistoryIpcHandlers,
};
