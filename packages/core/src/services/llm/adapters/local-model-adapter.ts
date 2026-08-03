/**
 * Optional local-model text adapter (W3).
 *
 * Stub only — no network, no API keys, no production default.
 * Registered in TextAdapterRegistry only when isLocalModelAdapterEnabled().
 * When somehow invoked while flag is OFF, fails closed with RequestConfigError.
 */

import type {
  LLMResponse,
  Message,
  ParameterDefinition,
  StreamHandlers,
  StreamRequestOptions,
  TextModel,
  TextModelConfig,
  TextProvider,
} from '../types';
import { RequestConfigError } from '../errors';
import { AbstractTextProviderAdapter } from './abstract-adapter';
import {
  isLocalModelAdapterEnabled,
  LOCAL_MODEL_PROVIDER_ID,
  LOCAL_MODEL_STUB_ID,
} from '../local-model-flag';

const STUB_CONTENT =
  '[local-model-stub] Feature-flagged offline response. No remote call was made.';

export class LocalModelAdapter extends AbstractTextProviderAdapter {
  public getProvider(): TextProvider {
    return {
      id: LOCAL_MODEL_PROVIDER_ID,
      name: 'Local Model (stub)',
      description:
        'Optional offline local-model adapter (feature flag default OFF). Stub only — no keys, no network.',
      corsRestricted: false,
      requiresApiKey: false,
      defaultBaseURL: '',
      supportsDynamicModels: false,
      connectionSchema: {
        required: [],
        optional: [],
        fieldTypes: {},
      },
    };
  }

  public getModels(): TextModel[] {
    return [
      {
        id: LOCAL_MODEL_STUB_ID,
        name: 'Local Model Stub',
        description: 'Deterministic offline stub for W3 flag experiments',
        providerId: LOCAL_MODEL_PROVIDER_ID,
        capabilities: {
          supportsTools: false,
          supportsReasoning: false,
        },
        parameterDefinitions: [],
        defaultParameterValues: {},
      },
    ];
  }

  private assertEnabled(): void {
    if (!isLocalModelAdapterEnabled()) {
      throw new RequestConfigError(
        'Local model adapter is disabled (MINDSYNC_LOCAL_MODEL_ADAPTER / VITE_LOCAL_MODEL_ADAPTER default OFF)',
      );
    }
  }

  protected async doSendMessage(
    messages: Message[],
    _config: TextModelConfig,
  ): Promise<LLMResponse> {
    this.assertEnabled();
    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    const hint =
      lastUser && typeof lastUser.content === 'string' && lastUser.content.trim()
        ? ` echo=${lastUser.content.trim().slice(0, 80)}`
        : '';
    return {
      content: `${STUB_CONTENT}${hint}`,
      metadata: {
        model: LOCAL_MODEL_STUB_ID,
        finishReason: 'local-model-stub',
      },
    };
  }

  protected async doSendMessageStream(
    messages: Message[],
    config: TextModelConfig,
    callbacks: StreamHandlers,
    options?: StreamRequestOptions,
  ): Promise<void> {
    this.assertEnabled();
    if (options?.signal?.aborted) {
      const abortError = new Error('Local model stub stream aborted');
      abortError.name = 'AbortError';
      throw abortError;
    }
    const response = await this.doSendMessage(messages, config);
    callbacks.onToken(response.content);
    callbacks.onComplete(response);
  }

  protected getParameterDefinitions(_modelId: string): readonly ParameterDefinition[] {
    return [];
  }

  protected getDefaultParameterValues(_modelId: string): Record<string, unknown> {
    return {};
  }
}
