# 测试区域重构迁移指南

## 概述

TestPanel.vue 和基于条件的 AdvancedTestPanel 使用已被新的统一 TestAreaPanel 组件替代。本指南帮助您迁移现有代码。

## 主要变化

### 1. 组件统一
- **旧方式**: TestPanelUI (基础模式) + AdvancedTestPanel (高级模式)
- **新方式**: TestAreaPanel (统一组件，自动处理模式差异)

### 2. 接口简化
- **移除冗余**: showTestInput 属性已移除，自动从 optimizationMode 推导
- **响应式**: 自动适配不同屏幕尺寸
- **统一样式**: 严格遵循 Naive UI 设计规范

## 迁移步骤

### Web 包 (已完成)
packages/web/src/App.vue 已经完成迁移，作为参考示例。

### Extension 包 (已完成)
packages/extension/src/App.vue 已经完成迁移到新的TestAreaPanel统一组件。

主要变更：
- 移除了条件渲染的TestPanelUI和AdvancedTestPanel
- 采用统一的TestAreaPanel组件，自动处理模式差异
- 添加了响应式布局配置和测试模式配置
- 实现了新的事件处理机制

#### 1. 更新导入语句
```vue
// 旧代码
import { TestPanelUI, AdvancedTestPanel } from '@mindsync/ui'

// 新代码  
import { TestAreaPanel, useResponsiveTestLayout, useTestModeConfig } from '@mindsync/ui'
```

#### 2. 添加状态管理
```vue
// 新增测试内容状态
const testContent = ref('')
const isCompareMode = ref(true)

// 新增响应式配置
const responsiveLayout = useResponsiveTestLayout()
const testModeConfig = useTestModeConfig(selectedOptimizationMode)
```

#### 3. 替换模板代码
```vue
<!-- 旧代码 -->
<TestPanelUI v-if="!advancedModeEnabled" ... />
<AdvancedTestPanel v-else ... />

<!-- 新代码 -->
<TestAreaPanel
  :optimization-mode="selectedOptimizationMode"
  :advanced-mode-enabled="advancedModeEnabled"
  v-model:test-content="testContent"
  v-model:is-compare-mode="isCompareMode"
  :input-mode="responsiveLayout.recommendedInputMode.value"
  :control-bar-layout="responsiveLayout.recommendedControlBarLayout.value"
  :button-size="responsiveLayout.smartButtonSize.value"
  @test="handleTestAreaTest"
  @compare-toggle="handleTestAreaCompareToggle"
>
  <!-- 插槽内容 -->
</TestAreaPanel>
```

#### 4. 添加事件处理函数
```vue
const handleTestAreaTest = async () => {
  // 测试逻辑
}

const handleTestAreaCompareToggle = () => {
  isCompareMode.value = !isCompareMode.value
}
```

## 关键优势

### 1. 消除接口冗余
- showTestInput 自动从 optimizationMode 推导
- 统一的组件接口，减少条件判断

### 2. 响应式支持  
- 自动屏幕尺寸适配
- 智能布局模式切换
- 防抖窗口监听

### 3. 样式统一
- 完全遵循 Naive UI 设计系统
- 移除所有硬编码 CSS
- 与左侧优化区域视觉一致

### 4. 类型安全
- 完整的 TypeScript 类型定义
- IDE 智能提示支持
- 编译时类型检查

## 向后兼容性

### 保留的组件
- AdvancedTestPanel.vue 暂时保留，供其他包使用
- TestPanel.vue 已重命名为 TestPanel.vue.backup

### 导出更新
- TestPanelUI 导出已移除
- 新增 TestAreaPanel 导出
- 新增相关 composables 和类型导出

## 测试建议

1. **功能测试**: 确保测试、对比模式、模型选择等功能正常
2. **响应式测试**: 在不同屏幕尺寸下测试布局
3. **兼容性测试**: 确保高级模式和基础模式切换正常
4. **样式测试**: 验证与现有 UI 的视觉一致性

## 注意事项

1. **渐进迁移**: 建议逐个包进行迁移，确保稳定性
2. **测试充分**: 迁移后进行完整的功能测试
3. **备份文件**: 旧组件文件已备份，可在需要时恢复
4. **文档更新**: 更新相关文档和使用说明

## 支持

如果在迁移过程中遇到问题，请参考：
- Web 包的 App.vue 作为完整示例
- 组件类型定义：`packages/ui/src/components/types/test-area.ts`
- 样式规范：`docs/components/test-area-style-guide.md`