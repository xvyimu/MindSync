import {
  IPromptService,
  OptimizationRequest,
  MessageOptimizationRequest,
  StreamHandlers,
  CustomConversationRequest,
} from './types';
import { PromptRecord } from '../history/types';
import { safeSerializeForIPC } from '../../utils/ipc-serialization';
import { ServiceDependencyError } from './errors';
import type { StreamRequestOptions } from '../llm/types';
import type { ImageInputRef } from '../image/types';
  }

  async testCustomConversationStream(
    request: CustomConversationRequest,
    callbacks: StreamHandlers,
    options?: StreamRequestOptions,
  ): Promise<void> {
    // 自动序列化，防止Vue响应式对象IPC传递错误
    const safeRequest = safeSerializeForIPC(request);
    await this.api.testCustomConversationStream(safeRequest, callbacks, options?.signal);
  }
}
