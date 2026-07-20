/**
 * 数据导入导出相关类型定义
 */

import type { ExportAllDataOptions } from './export-secrets';

/**
 * 完整的导出数据结构
 */
export interface ExportData {
  version: number;
  timestamp: number;
  data: Record<string, any>;
}

/**
 * 数据管理器接口
 */
export interface IDataManager {
  /**
   * 导出所有数据
   * @param options.includeSecrets 默认 false：脱敏模型 API Key
   * @returns JSON格式的数据字符串
   */
  exportAllData(options?: ExportAllDataOptions): Promise<string>;

  /**
   * 导入所有数据
   * @param dataString JSON格式的数据字符串
   */
  importAllData(dataString: string): Promise<void>;
}

// ImportExportError 已移动到 ../../interfaces/import-export.ts
