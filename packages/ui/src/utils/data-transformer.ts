import type { TextModelConfig, Template } from '@prompt-optimizer/core'
import type { ModelSelectOption, TemplateSelectOption, SelectOption } from '../types/select-options'

interface ModelSelectTransformOptions {
  getProviderName?: (model: TextModelConfig) => string
  getModelName?: (model: TextModelConfig) => string
}

/**
 * 数据转换工具类
 * 负责将原始数据转换为SelectWithConfig组件所需的标准化格式
 */
export class DataTransformer {
  /**
   * 将模型配置转换为选择器选项
   * @param models 模型配置数组
   * @returns 标准化的模型选择选项
   */
  static modelsToSelectOptions(models: TextModelConfig[], options: ModelSelectTransformOptions = {}): ModelSelectOption[] {
    return models.map(model => {
      const providerName = options.getProviderName?.(model) ?? model.providerMeta?.name ?? model.providerMeta?.id ?? 'Unknown'
      const modelName = options.getModelName?.(model) ?? model.name
      return {
        primary: modelName,
        secondary: providerName,
        value: model.id,
        raw: model,
        // 保持向后兼容性
        label: `${modelName} (${providerName})`
      }
    })
  }

  /**
   * 将模板配置转换为选择器选项
   * secondary 为模板描述，配合 SelectWithConfig 两行卡片展示
   * @param templates 模板配置数组
   * @returns 标准化的模板选择选项
   */
  static templatesToSelectOptions(templates: Template[]): TemplateSelectOption[] {
    return templates.map(template => {
      const name = template.name || ''
      const description = template.metadata?.description || ''
      return {
        primary: name,
        secondary: description,
        value: template.id,
        raw: template,
        // 保持向后兼容性
        label: name
      }
    })
  }

  /**
   * 通用转换函数
   * @param items 原始数据数组
   * @param getPrimary 提取主要显示文本的函数
   * @param getSecondary 提取次要显示文本的函数
   * @param getValue 提取值的函数
   * @returns 标准化的选择选项
   */
  static toSelectOptions<T>(
    items: T[],
    getPrimary: (item: T) => string,
    getSecondary: (item: T) => string,
    getValue: (item: T) => string
  ): SelectOption<T>[] {
    return items.map(item => {
      const primary = getPrimary(item)
      const secondary = getSecondary(item)
      return {
        primary,
        secondary,
        value: getValue(item),
        raw: item,
        // 生成兼容的label格式
        label: secondary ? `${primary} (${secondary})` : primary
      }
    })
  }
}

/**
 * 简化的访问器函数
 * 用于SelectWithConfig组件的prop函数
 */
export const OptionAccessors = {
  /**
   * 获取主要显示文本
   */
  getPrimary: (opt: SelectOption): string => opt.primary,

  /**
   * 获取次要显示文本
   */
  getSecondary: (opt: SelectOption): string => opt.secondary,

  /**
   * 获取选择值
   */
  getValue: (opt: SelectOption): string => opt.value
}
