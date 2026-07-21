const { createIpcError } = require('../ipc-security');

/**
 * 注册图像模型配置与图像生成相关的 Desktop IPC interface。
 * 经 registerSensitiveIpc：sender 校验 + 统一错误信封。
 * 生成通道可选 streamId → stream-registry + stream-cancel。
 */
function registerImageIpcHandlers({
  registerSensitiveIpc,
  imageModelManager,
  imageService,
  imageAdapterRegistry,
  imageUnderstandingService,
  safeSerialize,
  streamRegistry,
  assertValidStreamId,
}) {
  const runCancelableGenerate = async (event, streamId, request, operate) => {
    const safeReq = safeSerialize(request) || {};
    if (streamId && streamRegistry && typeof assertValidStreamId === 'function') {
      assertValidStreamId(streamId);
      const stream = streamRegistry.register(event.sender, streamId);
      try {
        safeReq.signal = stream.signal;
        return await operate(safeReq);
      } catch (error) {
        if (error?.name === 'AbortError' || stream.signal.aborted) {
          throw createIpcError('IPC_STREAM_CANCELLED', 'IPC stream was cancelled');
        }
        throw error;
      } finally {
        try {
          streamRegistry.complete(event.sender, streamId);
        } catch {
          // ignore complete races after cancel
        }
      }
    }
    return operate(safeReq);
  };

  registerSensitiveIpc('image-model-ensureInitialized', async () => {
    await imageModelManager.ensureInitialized();
    return null;
  });

  registerSensitiveIpc('image-model-isInitialized', async () => imageModelManager.isInitialized());

  registerSensitiveIpc('image-model-getAllConfigs', async () => imageModelManager.getAllConfigs());

  registerSensitiveIpc('image-model-getConfig', async (_event, id) => imageModelManager.getConfig(id));

  registerSensitiveIpc('image-model-addConfig', async (_event, config) => {
    await imageModelManager.addConfig(safeSerialize(config));
    return null;
  });

  registerSensitiveIpc('image-model-updateConfig', async (_event, id, updates) => {
    await imageModelManager.updateConfig(id, safeSerialize(updates));
    return null;
  });

  registerSensitiveIpc('image-model-deleteConfig', async (_event, id) => {
    await imageModelManager.deleteConfig(id);
    return null;
  });

  registerSensitiveIpc('image-model-getEnabledConfigs', async () => imageModelManager.getEnabledConfigs());

  registerSensitiveIpc('image-model-exportData', async () => imageModelManager.exportData());

  registerSensitiveIpc('image-model-importData', async (_event, data) => {
    await imageModelManager.importData(safeSerialize(data));
    return null;
  });

  registerSensitiveIpc('image-model-getDataType', async () => imageModelManager.getDataType());

  registerSensitiveIpc('image-model-validateData', async (_event, data) => {
    return imageModelManager.validateData(safeSerialize(data));
  });

  registerSensitiveIpc('image-generate', async (event, request, streamId) => {
    return runCancelableGenerate(event, streamId, request, (req) => imageService.generate(req));
  });

  registerSensitiveIpc('image-generateText2Image', async (event, request, streamId) => {
    return runCancelableGenerate(event, streamId, request, (req) => imageService.generateText2Image(req));
  });

  registerSensitiveIpc('image-generateImage2Image', async (event, request, streamId) => {
    return runCancelableGenerate(event, streamId, request, (req) => imageService.generateImage2Image(req));
  });

  registerSensitiveIpc('image-generateMultiImage', async (event, request, streamId) => {
    return runCancelableGenerate(event, streamId, request, (req) => imageService.generateMultiImage(req));
  });

  registerSensitiveIpc('image-validateRequest', async (_event, request) => {
    return imageService.validateRequest(safeSerialize(request));
  });

  registerSensitiveIpc('image-validateText2ImageRequest', async (_event, request) => {
    return imageService.validateText2ImageRequest(safeSerialize(request));
  });

  registerSensitiveIpc('image-validateImage2ImageRequest', async (_event, request) => {
    return imageService.validateImage2ImageRequest(safeSerialize(request));
  });

  registerSensitiveIpc('image-validateMultiImageRequest', async (_event, request) => {
    return imageService.validateMultiImageRequest(safeSerialize(request));
  });

  registerSensitiveIpc('image-testConnection', async (_event, config) => {
    return imageService.testConnection(safeSerialize(config));
  });

  registerSensitiveIpc('image-getDynamicModels', async (_event, providerId, connectionConfig) => {
    return imageAdapterRegistry.getDynamicModels(providerId, safeSerialize(connectionConfig));
  });

  // multimodal evaluation：图像理解走主进程，避免 renderer 直连供应商。
  if (imageUnderstandingService && typeof imageUnderstandingService.understand === 'function') {
    registerSensitiveIpc('image-understanding-understand', async (_event, request) => {
      return imageUnderstandingService.understand(safeSerialize(request));
    });
  }
}

module.exports = {
  registerImageIpcHandlers,
};
