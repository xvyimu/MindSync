/**
 * Naive UI 组件统一类型定义
 * 为高级模块重构组件提供标准化的 Props 和 Events 接口
 */

import type {
  ConversationMessage,
  ToolDefinition,
  ToolCallResult,
  AdvancedTestResult,
  ContextEditorState,
  ComponentVisibility,
  VariableImportOptions,
  VariableExportData
} from '@mindsync/core'
import type { AppServices } from '../types/services'
import type { VariableManagerHooks } from '../composables/prompt/useVariableManager'

/**
 * 基础组件 Props 接口
 */
export interface BaseComponentProps {
  /** 组件是否禁用 */
  disabled?: boolean
  /** 组件大小 */
  size?: 'small' | 'medium' | 'large'
  /** 组件主题模式（继承自全局） */
  theme?: 'light' | 'dark'
  /** 是否显示加载状态 */
  loading?: boolean
}

/**
 * 基础组件 Events 接口
 */
export interface BaseComponentEvents {
  /** 通用错误事件 */
  error: (error: Error) => void
  /** 组件准备就绪事件 */
  ready: () => void
}

/**
 * VariableManagerModal 组件类型
 */
export interface VariableManagerModalProps extends BaseComponentProps {
  /** 弹窗是否可见 */
  visible: boolean
  /** 当前变量数据 */
  variables?: Record<string, string>
  /** 是否只读模式 */
  readonly?: boolean
  /** 弹窗标题 */
  title?: string
  /** 弹窗宽度 */
  width?: number | string
  /** 是否显示导入导出按钮 */
  showImportExport?: boolean
}

export interface VariableManagerModalEvents extends BaseComponentEvents {
  /** 弹窗可见性变更 */
  'update:visible': (visible: boolean) => void
  /** 变量数据变更 */
  'update:variables': (variables: Record<string, string>) => void
  /** 变量变更事件 */
  variableChange: (name: string, value: string, action: 'add' | 'update' | 'delete') => void
  /** 变量导入事件 */
  import: (data: VariableExportData, options?: VariableImportOptions) => void
  /** 变量导出事件 */
  export: () => void
  /** 确认事件 */
  confirm: (variables: Record<string, string>) => void
  /** 取消事件 */
  cancel: () => void
}

/**
 * ConversationManager 组件类型（上下文管理）
 */
export interface ConversationManagerProps extends BaseComponentProps {
  /** 消息列表 */
  messages: ConversationMessage[]
  /** 可用变量集合（用于统计/高亮） */
  availableVariables: Record<string, string>
  /** 🆕 临时变量值集合（用于 VariableAwareInput） */
  temporaryVariables?: Record<string, string>
  /** 优化模式（用于模板分类） */
  optimizationMode?: 'system' | 'user'
  /** 变量扫描函数（标准化注入） */
  scanVariables?: (content: string) => string[]
  /** 变量替换函数（标准化注入） */
  replaceVariables?: (content: string, variables?: Record<string, string>) => string
  /** 预定义变量判定函数（标准化注入） */
  isPredefinedVariable?: (name: string) => boolean
  /** 工具数量（仅显示统计） */
  toolCount?: number
  /** 是否只读模式 */
  readonly?: boolean
  /** 是否显示变量预览 */
  showVariablePreview?: boolean
  /** 最大高度（像素） */
  maxHeight?: number
  /** 是否可折叠 */
  collapsible?: boolean
  /** 标题 */
  title?: string
  /** 🆕 当前选中的消息 ID（用于高亮显示） */
  selectedMessageId?: string
  /** 🆕 是否启用消息优化功能 */
  enableMessageOptimization?: boolean
  /** 🆕 消息优化中状态 */
  isMessageOptimizing?: boolean
  /** 🆕 是否启用工具管理功能 */
  enableToolManagement?: boolean
}

export interface ConversationManagerEvents extends BaseComponentEvents {
  /** 消息列表变更 */
  'update:messages': (messages: ConversationMessage[]) => void
  /** 消息变更事件 */
  messageChange: (index: number, message: ConversationMessage, action: 'add' | 'update' | 'delete') => void
  /** 打开上下文编辑器 */
  openContextEditor: (messages: ConversationMessage[], variables?: Record<string, string>) => void
  /** 变量管理器打开请求 */
  openVariableManager: (variableName?: string) => void
  /** 消息拖拽排序 */
  messageReorder: (fromIndex: number, toIndex: number) => void
  /** 🆕 消息被选中用于优化 */
  messageSelect: (message: ConversationMessage) => void
  /** 🆕 触发消息优化 */
  optimizeMessage: () => void
  /** 🆕 打开工具管理器 */
  'open-tool-manager': () => void
  /** 🆕 变量提取事件 */
  'variable-extracted': (data: {
    variableName: string
    variableValue: string
    variableType: 'global' | 'temporary'
  }) => void
  /** 🆕 添加缺失变量事件 */
  'add-missing-variable': (varName: string) => void
}

/**
 * ContextEditor 组件类型（全屏上下文编辑器）
 */
export interface ContextEditorProps extends BaseComponentProps {
  /** 是否可见 */
  visible: boolean
  /** 编辑器状态 */
  state?: ContextEditorState
  /** 服务实例（用于变量管理） */
  services?: AppServices | null
  /** 变量管理器实例（必需，用于数据同步，与全局变量管理器共享） */
  variableManager: VariableManagerHooks
  /** 是否显示工具管理标签页 */
  showToolManager?: boolean
  /** 工具列表 */
  tools?: ToolDefinition[]
  /** 优化模式（用于模板分类） */
  optimizationMode?: 'system' | 'user'
  /** 变量扫描函数（标准化注入） */
  scanVariables: (content: string) => string[]
  /** 变量替换函数（标准化注入） */
  replaceVariables: (content: string, variables?: Record<string, string>) => string
  /** 预定义变量判定函数（标准化注入） */
  isPredefinedVariable: (name: string) => boolean
  /** 弹窗标题 */
  title?: string
  /** 弹窗宽度 */
  width?: number | string
  /** 弹窗高度 */
  height?: number | string
  /** 默认激活的标签页 */
  defaultTab?: 'messages' | 'variables' | 'tools'
  /** 仅显示指定标签页（隐藏其他标签页和标签栏） */
  onlyShowTab?: 'messages' | 'variables' | 'tools' | 'templates'
}

export interface ContextEditorEvents extends BaseComponentEvents {
  /** 可见性变更 */
  'update:visible': (visible: boolean) => void
  /** 状态变更 */
  'update:state': (state: ContextEditorState) => void
  /** 工具列表变更 */
  'update:tools': (tools: ToolDefinition[]) => void
  /** 上下文变更 */
  contextChange: (messages: ConversationMessage[], variables: Record<string, string>) => void
  /** 工具变更 */
  toolChange: (tools: ToolDefinition[], action: 'add' | 'update' | 'delete', index?: number) => void
  /** 保存事件 */
  save: (context: { messages: ConversationMessage[]; variables: Record<string, string>; tools: ToolDefinition[] }) => void
  /** 取消事件 */
  cancel: () => void
  /** 预览模式切换 */
  previewToggle: (enabled: boolean) => void
  /** 打开变量管理器 */
  openVariableManager: (focusVariable?: string) => void
  /** 快速创建变量 */
  createVariable: (name: string, defaultValue?: string) => void
}

/**
 * TestAreaPanel 集成组件类型
 */
export interface TestAreaPanelProps extends BaseComponentProps {
  /** 优化模式 */
  optimizationMode?: 'system' | 'user'
  /** 是否显示测试输入 */
  showTestInput?: boolean
  /** 是否启用对比模式 */
  enableCompareMode?: boolean
  /** 当前对比模式状态 */
  isCompareMode?: boolean
  /** 是否测试运行中 */
  isTestRunning?: boolean
  /** 高级模式是否启用 */
  advancedModeEnabled?: boolean
  /** 测试内容 */
  testContent?: string

  /** E2E: stable selector prefix, e.g. "basic-system" */
  testIdPrefix?: string

  /** 主要操作按钮文字 */
  primaryActionText?: string
  /** 主要操作是否禁用 */
  primaryActionDisabled?: boolean
  /** 第一列测试结果（支持工具调用显示） */
  primaryResult?: AdvancedTestResult
  /** 第二列测试结果（支持工具调用显示） */
  secondaryResult?: AdvancedTestResult
  /** 单一测试结果（支持工具调用显示） */
  singleResult?: AdvancedTestResult
}

export interface TestAreaPanelEvents extends BaseComponentEvents {
  /** 对比模式切换 */
  'update:isCompareMode': (enabled: boolean) => void
  /** 测试内容变更 */
  'update:testContent': (content: string) => void
  /** 对比模式切换事件 */
  compareToggle: (enabled: boolean) => void
  /** 主要操作（测试）事件 */
  primaryAction: () => void
  /** 显示模型配置 */
  showConfig: () => void
  /** 高级功能事件 */
  openVariableManager: () => void
  openContextEditor: () => void
  variableChange: (name: string, value: string) => void
  contextChange: (messages: ConversationMessage[], variables: Record<string, string>) => void
}

/**
 * TestResultSection 组件类型
 */
export interface TestResultSectionProps extends BaseComponentProps {
  /** 测试结果 */
  result?: AdvancedTestResult
  /** 是否显示工具调用信息 */
  showToolCalls?: boolean
  /** 是否显示变量使用信息 */
  showUsedVariables?: boolean
  /** 是否显示元数据 */
  showMetadata?: boolean
  /** 最大高度 */
  maxHeight?: number | string
}

export interface TestResultSectionEvents extends BaseComponentEvents {
  /** 工具调用详情查看 */
  toolCallDetail: (toolCall: ToolCallResult) => void
  /** 变量详情查看 */
  variableDetail: (variable: string, value: string) => void
  /** 结果复制 */
  copyResult: (content: string) => void
  /** 结果导出 */
  exportResult: (result: AdvancedTestResult) => void
}

/**
 * 通用工具栏按钮组件类型
 */
export interface ToolbarButtonProps extends BaseComponentProps {
  /** 按钮图标 */
  icon?: string
  /** 按钮文字 */
  text?: string
  /** 按钮类型 */
  type?: 'default' | 'primary' | 'success' | 'warning' | 'error'
  /** 是否为幽灵按钮 */
  ghost?: boolean
  /** 提示文字 */
  tooltip?: string
  /** 是否显示徽章 */
  badge?: boolean
  /** 徽章数值 */
  badgeValue?: number | string
}

export interface ToolbarButtonEvents extends BaseComponentEvents {
  /** 点击事件 */
  click: (event: MouseEvent) => void
}

/**
 * 全局状态管理相关类型
 */
export interface AdvancedModuleConfig {
  /** 默认组件可见性 */
  defaultVisibility: ComponentVisibility
  /** 自动保存间隔（毫秒） */
  autoSaveInterval: number
  /** 变量名验证规则 */
  variableNamePattern: RegExp
  /** 是否启用调试模式 */
  debugMode: boolean
  /** 最大变量数量限制 */
  maxVariables: number
  /** 最大工具数量限制 */
  maxTools: number
}

/**
 * 组件通信数据格式
 */
export interface ComponentMessage<T = unknown> {
  /** 消息类型 */
  type: string
  /** 消息负载 */
  payload: T
  /** 发送时间 */
  timestamp: Date
  /** 发送者组件ID */
  sender?: string
  /** 目标组件ID */
  target?: string
}

/**
 * 组件通信数据格式
 */
export interface ComponentError {
  /** 错误代码 */
  code: string
  /** 错误消息 */
  message: string
  /** 错误详情 */
  details?: unknown
  /** 发生错误的组件 */
  component: string
  /** 错误时间 */
  timestamp: Date
  /** 是否为致命错误 */
  fatal: boolean
}

/**
 * 响应式布局相关类型
 */
export interface ResponsiveConfig {
  /** 断点配置 */
  breakpoints: {
    xs: number
    sm: number
    md: number
    lg: number
    xl: number
  }
  /** 当前断点 */
  currentBreakpoint: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  /** 是否为移动端 */
  isMobile: boolean
  /** 是否为平板 */
  isTablet: boolean
  /** 是否为桌面端 */
  isDesktop: boolean
}

/**
 * 性能监控相关类型
 */
export interface PerformanceMetrics {
  /** 组件渲染时间 */
  renderTime: number
  /** 数据加载时间 */
  loadTime: number
  /** 内存使用量 */
  memoryUsage: number
  /** 组件更新次数 */
  updateCount: number
  /** 最后更新时间 */
  lastUpdate: Date
}

/**
 * ToolManagerModal 组件类型
 */
export interface ToolManagerModalProps extends BaseComponentProps {
  /** 弹窗是否可见 */
  visible: boolean
  /** 工具列表 */
  tools: ToolDefinition[]
  /** 是否只读模式 */
  readonly?: boolean
  /** 弹窗标题 */
  title?: string
  /** 弹窗宽度 */
  width?: string
}

export interface ToolManagerModalEvents extends BaseComponentEvents {
  /** 弹窗可见性变更 */
  'update:visible': (visible: boolean) => void
  /** 工具列表变更 */
  'update:tools': (tools: ToolDefinition[]) => void
  /** 工具变更事件 */
  toolChange: (tools: ToolDefinition[], action: 'add' | 'update' | 'delete', index: number) => void
  /** 确认事件 */
  confirm: (tools: ToolDefinition[]) => void
  /** 取消事件 */
  cancel: () => void
}
