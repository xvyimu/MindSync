const { isAllowedMainFrameNavigation } = require('./window-security');

const STREAM_ID_PATTERN = /^[A-Za-z0-9_-]{1,96}$/;

/** 创建带稳定错误码的 IPC 边界错误。 */
function createIpcError(code, message) {
  const error = new Error(message);
  error.code = code;
  return error;
}

/** 将 handler 成功结果包装为跨层统一响应信封。 */
function createSuccessResponse(data) {
  return { success: true, data };
}

/** 将未知异常收敛为不包含 stack 的跨层错误信封。 */
function createErrorResponse(error) {
  const message = error instanceof Error ? error.message : String(error);
  return {
    success: false,
    error: {
      code: error && typeof error.code === 'string' ? error.code : 'IPC_HANDLER_FAILED',
      message,
    },
  };
}

/** 优先读取 senderFrame URL，并为兼容环境回退到 sender URL。 */
function getSenderUrl(event) {
  const frameUrl = event?.senderFrame?.url;
  if (typeof frameUrl === 'string' && frameUrl.length > 0) {
    return frameUrl;
  }

  const getUrl = event?.sender?.getURL;
  return typeof getUrl === 'function' ? getUrl.call(event.sender) : '';
}

/**
 * 是否为「明确的非主 frame」。
 * Electron 各版本/场景下 senderFrame 可能缺失，或 isMainFrame 未暴露；
 * 仅在 **明确为 false** 时拒绝，避免误杀合法 renderer 的全部 IPC。
 */
function isExplicitNonMainFrame(event) {
  const frame = event?.senderFrame;
  if (!frame || typeof frame !== 'object') {
    // 无 senderFrame：回退到 sender URL 校验（仍有路径门闩）
    return false;
  }
  if (!Object.prototype.hasOwnProperty.call(frame, 'isMainFrame')) {
    return false;
  }
  return frame.isMainFrame === false;
}

/** 判断 IPC 是否来自应用允许的未销毁主 frame renderer。 */
function isTrustedRendererSender(event, options) {
  const sender = event?.sender;
  if (!sender || typeof sender.id !== 'number') {
    return false;
  }

  if (typeof sender.isDestroyed === 'function' && sender.isDestroyed()) {
    return false;
  }

  // Only reject when the frame is *known* to be a subframe.
  // Missing senderFrame / missing isMainFrame must not fail-closed on init IPC
  // (Electron 41+ can omit the flag on legitimate main-frame senders).
  if (isExplicitNonMainFrame(event)) {
    return false;
  }

  return isAllowedMainFrameNavigation(getSenderUrl(event), options);
}

/** 拒绝来自子 frame、外部页面或已销毁 renderer 的 IPC 请求。 */
function assertTrustedRendererSender(event, options) {
  if (!isTrustedRendererSender(event, options)) {
    throw createIpcError('IPC_UNTRUSTED_SENDER', 'IPC request sender is not trusted');
  }
}

/** 判断流标识是否满足长度与字符集约束。 */
function isValidStreamId(streamId) {
  return typeof streamId === 'string' && STREAM_ID_PATTERN.test(streamId);
}

/** 在流标识不合法时抛出稳定 IPC 错误。 */
function assertValidStreamId(streamId) {
  if (!isValidStreamId(streamId)) {
    throw createIpcError('IPC_INVALID_STREAM_ID', 'Invalid IPC stream identifier');
  }
}

/** 注册具备 sender 校验、参数校验和统一响应信封的敏感 IPC handler。 */
function registerSecureIpcHandler(ipcMain, channel, handler, {
  senderOptions,
  validateArgs,
  createSuccess = createSuccessResponse,
  createError = createErrorResponse,
  /** 默认校验 channel 已登记在 manifest；测试可传 false 跳过。 */
  assertKnownChannel = true,
} = {}) {
  // 延迟 require 避免与 channel-manifest 循环依赖
  if (assertKnownChannel) {
    const { assertKnownInvokeChannel } = require('./ipc/channel-manifest');
    assertKnownInvokeChannel(channel);
  }

  ipcMain.handle(channel, async (event, ...args) => {
    try {
      assertTrustedRendererSender(event, senderOptions);
      if (typeof validateArgs === 'function') {
        validateArgs(args, event);
      }
      return createSuccess(await handler(event, ...args));
    } catch (error) {
      return createError(error);
    }
  });
}

module.exports = {
  assertTrustedRendererSender,
  assertValidStreamId,
  createIpcError,
  isTrustedRendererSender,
  isValidStreamId,
  registerSecureIpcHandler,
};
