/**
 * Core 服务管理器
 * 
 * 负责初始化和管理所有 Core 模块服务
 * 采用单例模式确保服务实例的唯一性
 */

import {
  MemoryStorageProvider,
  createModelManager,
  createLLMService,
  createTemplateManager,
  createHistoryManager,
  createPromptService,
  createImageUnderstandingService,
  createTextAdapterRegistry,
  PromptService,
  IPromptService,
  ModelManager,
  ILLMService,
  TemplateManager,
  HistoryManager,

} from '@prompt-optimizer/core';

import { MCPServerConfig } from '../config/environment.js';
import { setupDefaultModel } from '../config/models.js';
import * as logger from '../utils/logging.js';
import { createSimpleLanguageService, SimpleLanguageService } from './language-service.js';

export class CoreServicesManager {
  private static instance: CoreServicesManager;
  private promptService: PromptService | null = null;
  private modelManager: ModelManager | null = null;
  private llmService: ILLMService | null = null;
  private templateManager: TemplateManager | null = null;
  private languageService: SimpleLanguageService | null = null;
  private historyManager: HistoryManager | null = null;
  private initialized = false;

  private constructor() {
    // 构造函数现在更简洁
  }

  static getInstance(): CoreServicesManager {
    if (!CoreServicesManager.instance) {
      CoreServicesManager.instance = new CoreServicesManager();
    }
    return CoreServicesManager.instance;
  }

  async initialize(config: MCPServerConfig): Promise<void> {
    if (this.initialized) {
      logger.warn('CoreServicesManager already initialized');
      return;
    }

    try {
      logger.info('Initializing Core services...');

      // 1. 创建内存存储提供者
      logger.debug('Creating memory storage provider');
      const storage = new MemoryStorageProvider();

      // 2. 共享文本适配器注册表 + 模型管理器
      logger.debug('Initializing ModelManager');
      const textAdapterRegistry = createTextAdapterRegistry();
      this.modelManager = createModelManager(storage, textAdapterRegistry);

      // 3. 配置默认模型
      await this.setupDefaultModel(config);

      // 4. 初始化 LLM 服务（与 ModelManager 共用 Registry）
      logger.debug('Initializing LLMService');
      this.llmService = createLLMService(this.modelManager, textAdapterRegistry);

      // 5. 初始化语言服务
      logger.debug('Initializing LanguageService');
      const defaultLanguage = resolveDefaultLanguage(config);
      this.languageService = createSimpleLanguageService(defaultLanguage);
      await this.languageService.initialize();

      // 6. 初始化模板管理器
      logger.debug('Initializing TemplateManager');
      this.templateManager = createTemplateManager(storage, this.languageService);
      // 注意：core 的内置模板会自动可用，无需额外设置

      // 8. 初始化历史管理器
      logger.debug('Initializing HistoryManager');
      this.historyManager = createHistoryManager(storage, this.modelManager);

      // 9. 创建提示词服务
      logger.debug('Creating PromptService');
      this.promptService = createPromptService(
        this.modelManager,
        this.llmService,
        this.templateManager,
        this.historyManager,
        createImageUnderstandingService({ registry: textAdapterRegistry }),
      );

      // 10. 验证服务健康状态
      await this.validateServices();

      this.initialized = true;
      logger.info('Core services initialized successfully');

    } catch (error) {
      // 记录详细错误信息
      logger.error('Failed to initialize Core services', error as Error);

      // 检查是否有任何可用的模型配置
      this.showEnvironmentHint();

      throw new Error(`Core services initialization failed: ${(error as Error).message}`, { cause: error });
    }
  }

  private async setupDefaultModel(config: MCPServerConfig): Promise<void> {
    if (!this.modelManager) {
      throw new Error('ModelManager not initialized');
    }

    try {
      // 使用重构后的 setupDefaultModel 函数，只传递 preferredProvider
      await setupDefaultModel(
        this.modelManager,
        config.preferredModelProvider
      );

      // 获取并显示当前使用的模型信息
      const mcpModel = await this.modelManager.getModel('mcp-default');
      if (mcpModel) {
        logger.info(`✅ Using model: ${mcpModel.name} (${mcpModel.providerMeta.id})`);
        logger.info(`   Model: ${mcpModel.modelMeta.id}`);
        logger.info(`   Base URL: ${mcpModel.connectionConfig.baseURL || mcpModel.providerMeta.defaultBaseURL}`);
      } else {
        logger.info(`Default model configured with preferred provider: ${config.preferredModelProvider || 'auto-selected'}`);
      }
    } catch (error) {
      throw new Error(`Failed to setup default model: ${(error as Error).message}`, { cause: error });
    }
  }



  /**
   * 显示环境变量配置提示
   */
  private showEnvironmentHint(): void {
    try {
      // 检查当前环境变量状态
      const staticEnvVars = [
        'VITE_OPENAI_API_KEY',
        'VITE_GEMINI_API_KEY',
        'VITE_DEEPSEEK_API_KEY',
        'VITE_ZHIPU_API_KEY',
        'VITE_SILICONFLOW_API_KEY',
        'VITE_CUSTOM_API_KEY'
      ];

      // 扫描动态自定义模型环境变量（使用统一的验证逻辑）
      const CUSTOM_API_KEY_PATTERN = /^VITE_CUSTOM_API_KEY_(.+)$/;
      const SUFFIX_PATTERN = /^[a-zA-Z0-9_-]+$/;
      const MAX_SUFFIX_LENGTH = 50;

      const dynamicEnvVars = Object.keys(process.env).filter(key => {
        const match = key.match(CUSTOM_API_KEY_PATTERN);
        if (!match) return false;

        const [, suffix] = match;
        return suffix && suffix.length <= MAX_SUFFIX_LENGTH && SUFFIX_PATTERN.test(suffix);
      });

      const allEnvVars = [...staticEnvVars, ...dynamicEnvVars];

      const setVars = allEnvVars.filter(key => {
        const value = process.env[key];
        return value && value.trim().length > 0;
      });

      if (setVars.length === 0) {
        // 没有设置任何环境变量
        console.error('💡 No API keys found. Please set at least one:');
        console.error('   VITE_OPENAI_API_KEY=your-openai-key');
        console.error('   VITE_GEMINI_API_KEY=your-gemini-key');
        console.error('   VITE_DEEPSEEK_API_KEY=your-deepseek-key');
        console.error('   VITE_ZHIPU_API_KEY=your-zhipu-key');
        console.error('   VITE_SILICONFLOW_API_KEY=your-siliconflow-key');
        console.error('   VITE_CUSTOM_API_KEY=your-custom-key');
        console.error('   Or dynamic custom models:');
        console.error('   VITE_CUSTOM_API_KEY_qwen3=your-qwen-key');
        console.error('   VITE_CUSTOM_API_KEY_claude=your-claude-key');
      } else {
        // 有设置但可能无效
        console.error('💡 Found API keys but no models are enabled:');
        setVars.forEach(key => {
          const value = process.env[key];
          const masked = value ? '[CONFIGURED]' : 'empty';
          console.error(`   ${key}=${masked}`);
        });
        console.error('   Please check if your API keys are valid.');
      }
    } catch {
      // 如果检查环境变量失败，显示通用提示
      console.error('💡 Please ensure you have set valid API keys.');
    }
  }

  private async validateServices(): Promise<void> {
    const services = [
      { name: 'ModelManager', service: this.modelManager },
      { name: 'LLMService', service: this.llmService },
      { name: 'LanguageService', service: this.languageService },
      { name: 'TemplateManager', service: this.templateManager },
      { name: 'HistoryManager', service: this.historyManager },
      { name: 'PromptService', service: this.promptService }
    ];

    for (const { name, service } of services) {
      if (!service) {
        throw new Error(`${name} is not initialized`);
      }
    }

    logger.debug('All services validated successfully');
  }

  getPromptService(): IPromptService {
    if (!this.initialized || !this.promptService) {
      throw new Error('CoreServicesManager not initialized or PromptService not available');
    }
    return this.promptService;
  }

  getModelManager(): ModelManager {
    if (!this.initialized || !this.modelManager) {
      throw new Error('CoreServicesManager not initialized or ModelManager not available');
    }
    return this.modelManager;
  }

  getTemplateManager(): TemplateManager {
    if (!this.initialized || !this.templateManager) {
      throw new Error('CoreServicesManager not initialized or TemplateManager not available');
    }
    return this.templateManager;
  }

  isInitialized(): boolean {
    return this.initialized;
  }

  async getHealthStatus(): Promise<{
    initialized: boolean;
    services: Record<string, boolean>;
  }> {
    return {
      initialized: this.initialized,
      services: {
        modelManager: !!this.modelManager,
        llmService: !!this.llmService,
        languageService: !!this.languageService,
        templateManager: !!this.templateManager,
        historyManager: !!this.historyManager,
        promptService: !!this.promptService
      }
    };
  }
}

export function resolveDefaultLanguage(config: Pick<MCPServerConfig, 'defaultLanguage'>): string {
  return config.defaultLanguage || process.env.MCP_DEFAULT_LANGUAGE || 'en-US';
}
