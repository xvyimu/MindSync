// 提示词相关 composables
export * from './usePromptOptimizer'
export * from './usePromptTester'
export * from './useConversationTester'  // 🆕 多对话测试
export * from './usePromptHistory'
export * from './usePromptPreview'
export * from './useTemplateManager'
export * from './useVariableManager'
export * from './useConversationOptimization'
export * from './useContextUserOptimization'  // 🆕 ContextUser 优化器
export * from './useContextUserTester'  // 🆕 ContextUser 测试器
export * from './usePromptDisplayAdapter'  // 🆕 提示词显示适配器
export * from './useEvaluation'  // 🆕 LLM 智能评估
export * from './useEvaluationHandler'  // 🆕 评估处理器（封装业务逻辑）
export * from './useEvalCaseSet'  // Cut-1：可复现用例集
export * from './compareEvaluation'
export * from './useCompareRoleConfig'
export * from './testVariantState'
export * from './useTestVariantSourceFeedback'
export * from './useTestSourceAreaFeedback'
export * from './useEvaluationContext'  // 🆕 评估上下文 (provide/inject)
export * from './useProContext'  // 🆕 Pro 模式上下文 (provide/inject)
export * from './useVariableExtraction'  // 🆕 AI 智能变量提取

// 变量管理相关 composables
export * from '../variable'
