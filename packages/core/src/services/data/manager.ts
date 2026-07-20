import { IHistoryManager } from '../history/types';
import { IModelManager } from '../model/types';
import type { IImageModelManager } from '../image/types';
import { ITemplateManager } from '../template/types';
import { IPreferenceService } from '../preference/types';
import { ContextRepo } from '../context/types';
import type { IFavoriteManager } from '../favorite/types';
import { CORE_SERVICE_KEYS } from '../../constants/storage-keys';
import type { EvalCaseSet } from '../evaluation/eval-case-types';
import { isEvalCaseSet } from '../evaluation/eval-case-repository';
import {
  DataExportFailedError,
  DataImportPartialFailedError,
  DataInvalidFormatError,
  DataInvalidJsonError,
} from './errors';
import { toErrorWithCode } from '../../utils/error';
import {
  redactExportDataObject,
  type ExportAllDataOptions,
} from './export-secrets';

/** 全量导出中的可复现用例集键（Cut-R1 / F2） */
export const EXPORT_DATA_KEY_EVAL_CASE_SETS = 'evalCaseSets' as const;

/**
 * 数据导入导出管理器
 *
 * 采用协调者模式：
 * - DataManager只负责协调各个服务的导入导出
 * - 具体的导入导出实现由各个服务自己负责
 * - 通过IImportExportable接口统一各服务的导入导出行为
 */

// 旧版本兼容性处理现在由各个服务自己负责

/**
 * 数据管理器接口
 */
export interface IDataManager {
  /**
   * 导出所有数据
   * @param options.includeSecrets 默认 false：导出中脱敏模型 API Key
   * @returns JSON格式的数据字符串
   */
  exportAllData(options?: ExportAllDataOptions): Promise<string>;

  /**
   * 导入所有数据
   * @param dataString JSON格式的数据字符串
   */
  importAllData(dataString: string): Promise<void>;
}

export class DataManager implements IDataManager {
  private modelManager: IModelManager;
  private imageModelManager?: IImageModelManager;
  private templateManager: ITemplateManager;
  private historyManager: IHistoryManager;
  private preferenceService: IPreferenceService;
  private contextRepo: ContextRepo;
  private favoriteManager?: IFavoriteManager;

  constructor(
    modelManager: IModelManager,
    templateManager: ITemplateManager,
    historyManager: IHistoryManager,
    preferenceService: IPreferenceService,
    contextRepo: ContextRepo,
    imageModelManager?: IImageModelManager,
    favoriteManager?: IFavoriteManager,
  ) {
    this.modelManager = modelManager;
    this.imageModelManager = imageModelManager;
    this.templateManager = templateManager;
    this.historyManager = historyManager;
    this.preferenceService = preferenceService;
    this.contextRepo = contextRepo;
    this.favoriteManager = favoriteManager;
  }

  /**
   * 从 preference 读取 EvalCaseSet（UI 与 Cut-1 同一键）。
   * 无效或缺失时返回 null，不抛错，避免阻断全量导出。
   */
  private async loadEvalCaseSetForExport(): Promise<EvalCaseSet | null> {
    try {
      const raw = await this.preferenceService.get<EvalCaseSet | string | null>(
        CORE_SERVICE_KEYS.EVAL_CASE_SET,
        null,
      );
      if (raw == null) return null;
      const parsed: unknown = typeof raw === 'string' ? JSON.parse(raw) : raw;
      if (!isEvalCaseSet(parsed)) {
        console.warn(
          '[DataManager] Stored eval case set is invalid; skipping export of evalCaseSets',
        );
        return null;
      }
      return parsed;
    } catch (error) {
      console.warn('[DataManager] Failed to load eval case set for export:', error);
      return null;
    }
  }

  /**
   * 导入 EvalCaseSet 到 preference 存储键。
   * 无效 payload：skip + warn，不记入 errors（不阻断其它域）。
   * 写入失败：记入 errors。
   */
  private async importEvalCaseSet(
    payload: unknown,
    errors: string[],
  ): Promise<void> {
    if (payload === undefined) return;
    try {
      const parsed: unknown =
        typeof payload === 'string' ? JSON.parse(payload) : payload;
      if (!isEvalCaseSet(parsed)) {
        console.warn(
          '[DataManager] Invalid evalCaseSets payload on import; skipped',
        );
        return;
      }
      await this.preferenceService.set(CORE_SERVICE_KEYS.EVAL_CASE_SET, parsed);
      console.log('Successfully imported evalCaseSets');
    } catch (error) {
      const errorMessage = `Failed to import evalCaseSets: ${
        error instanceof Error ? error.message : String(error)
      }`;
      errors.push(errorMessage);
      console.error(errorMessage, error);
    }
  }

  async exportAllData(options: ExportAllDataOptions = {}): Promise<string> {
    const data: Record<string, any> = {};

    try {
      // 使用各服务的exportData接口，使用固定的键名保持兼容性
      data['history'] = await this.historyManager.exportData();
      data['models'] = await this.modelManager.exportData();
      if (this.imageModelManager) {
        data['imageModels'] = await this.imageModelManager.exportData();
      }
      data['userTemplates'] = await this.templateManager.exportData();
      data['userSettings'] = await this.preferenceService.exportData();
      data['contexts'] = await this.contextRepo.exportData();
      if (this.favoriteManager) {
        data['favorites'] = await this.favoriteManager.exportData();
      }
      // F2：可复现用例集进入全量导出（与 preference 键同源）
      const evalCaseSet = await this.loadEvalCaseSetForExport();
      if (evalCaseSet) {
        data[EXPORT_DATA_KEY_EVAL_CASE_SETS] = evalCaseSet;
      }
    } catch (error) {
      console.error('Failed to export data:', error);
      if (typeof (error as any)?.code === 'string') {
        throw toErrorWithCode(error)
      }
      throw new DataExportFailedError(error instanceof Error ? error.message : String(error))
    }

    // 默认脱敏 models / imageModels 中的 apiKey 等（B4 配套）
    // evalCaseSets 不含密钥，脱敏逻辑不会改动它
    const safeData = redactExportDataObject(data, options);

    const exportFormat = {
      version: 1,
      data: safeData,
      // 标记导出是否含密钥，便于导入侧与 UI 提示
      meta: {
        secretsIncluded: options.includeSecrets === true,
      },
    };

    return JSON.stringify(exportFormat, null, 2); // 格式化输出，便于调试
  }

  async importAllData(dataString: string): Promise<void> {
    let exportData: any;

    try {
      exportData = JSON.parse(dataString);
    } catch (error) {
      throw new DataInvalidJsonError(error instanceof Error ? error.message : String(error))
    }

    if (!exportData || typeof exportData !== 'object' || Array.isArray(exportData)) {
      throw new DataInvalidFormatError('Data must be an object')
    }

    // Support both old and new format for backward compatibility
    let dataToImport: Record<string, any>;

    // New format: { version: 1, data: { ... } }
    if (exportData.version) {
      if (!exportData.data || typeof exportData.data !== 'object' || Array.isArray(exportData.data)) {
        throw new DataInvalidFormatError('"data" property is missing or not an object')
      }
      dataToImport = exportData.data;
    }
    // Old format: direct data object { history: [...], models: [...], ... }
    else if (
      exportData.history ||
      exportData.models ||
      exportData.imageModels ||
      exportData.userTemplates ||
      exportData.userSettings ||
      exportData.contexts ||
      exportData.favorites ||
      exportData[EXPORT_DATA_KEY_EVAL_CASE_SETS] ||
      exportData[CORE_SERVICE_KEYS.EVAL_CASE_SET]
    ) {
      dataToImport = exportData;
    }
    else {
      throw new DataInvalidFormatError('Unrecognized data structure')
    }

    const errors: string[] = [];

    // 使用各服务的importData接口
    const serviceMap = [
      { service: this.historyManager, dataKey: 'history' },
      { service: this.modelManager, dataKey: 'models' },
      ...(this.imageModelManager ? [{ service: this.imageModelManager, dataKey: 'imageModels' }] : []),
      { service: this.templateManager, dataKey: 'userTemplates' },
      { service: this.preferenceService, dataKey: 'userSettings' },
      { service: this.contextRepo, dataKey: 'contexts' },
      ...(this.favoriteManager ? [{ service: this.favoriteManager, dataKey: 'favorites' }] : []),
    ];

    for (const { service, dataKey } of serviceMap) {
      if (dataToImport[dataKey] !== undefined) {
        try {
          await service.importData(dataToImport[dataKey]);
          console.log(`Successfully imported ${dataKey}`);
        } catch (error) {
          const errorMessage = `Failed to import ${dataKey}: ${error instanceof Error ? error.message : String(error)}`;
          errors.push(errorMessage);
          console.error(errorMessage, error);
        }
      }
    }

    // F2：用例集（导出键 evalCaseSets，或兼容 storage 原键）
    const evalPayload =
      dataToImport[EXPORT_DATA_KEY_EVAL_CASE_SETS] ??
      dataToImport[CORE_SERVICE_KEYS.EVAL_CASE_SET];
    if (evalPayload !== undefined) {
      await this.importEvalCaseSet(evalPayload, errors);
    }

    if (errors.length > 0) {
      throw new DataImportPartialFailedError(errors.length, errors.join('; '))
    }
  }
}

/**
 * 创建数据管理器的工厂函数
 * @param modelManager 模型管理器实例
 * @param templateManager 模板管理器实例
 * @param historyManager 历史记录管理器实例
 * @param preferenceService 偏好设置服务实例
 * @param contextRepo 上下文仓库实例
 * @returns 数据管理器实例
 */
export function createDataManager(
  modelManager: IModelManager,
  templateManager: ITemplateManager,
  historyManager: IHistoryManager,
  preferenceService: IPreferenceService,
  contextRepo: ContextRepo,
  imageModelManager?: IImageModelManager,
  favoriteManager?: IFavoriteManager,
): DataManager {
  return new DataManager(
    modelManager,
    templateManager,
    historyManager,
    preferenceService,
    contextRepo,
    imageModelManager,
    favoriteManager,
  );
}
