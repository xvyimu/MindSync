# TestArea组件系统

测试区域重构后的模块化组件系统，提供统一的AI提示词测试界面。包含输入、控制、结果显示等功能的完整解决方案。

## 概述

TestArea组件系统采用模块化架构，由以下核心组件组成：
- **TestAreaPanel** - 主容器组件，统一管理布局和状态
- **TestInputSection** - 测试内容输入组件
- **TestControlBar** - 测试控制栏组件  
- **TestResultSection** - 测试结果展示组件
- **ConversationSection** - 会话管理包装组件

## 主要特性

✅ **统一设计风格** - 基于Naive UI设计系统，确保视觉一致性  
✅ **响应式布局** - 自动适配不同屏幕尺寸和设备类型  
✅ **主题兼容性** - 完全兼容亮色/暗色主题切换  
✅ **模式切换** - 支持系统提示词/用户提示词模式  
✅ **对比测试** - 支持原始vs优化提示词的并行对比  
✅ **类型安全** - 完整的TypeScript类型定义  

## 快速开始

### 基础用法

```vue
<template>
  <TestAreaPanel
    :optimization-mode="optimizationMode"
    :is-test-running="isTestRunning"
    :test-content="testContent"
    :is-compare-mode="isCompareMode"
    @update:test-content="testContent = $event"
    @compare-toggle="handleCompareToggle"
    @test="handleTest"
  >
    <template #model-select>
      <ModelSelectUI v-model="selectedModel" />
    </template>
  </TestAreaPanel>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { TestAreaPanel, ModelSelectUI } from '@mindsync/ui'
import type { OptimizationMode } from '@mindsync/core'

const optimizationMode = ref<OptimizationMode>('system')
const isTestRunning = ref(false)
const testContent = ref('')
const isCompareMode = ref(true)
const selectedModel = ref('gpt-4')

const handleCompareToggle = () => {
  isCompareMode.value = !isCompareMode.value
}

const handleTest = async () => {
  isTestRunning.value = true
  try {
    // 执行测试逻辑
  } finally {
    isTestRunning.value = false
  }
}
</script>
```

### 高级配置

```vue
<template>
  <TestAreaPanel
    :optimization-mode="optimizationMode"
    :is-test-running="isTestRunning"
    :advanced-mode-enabled="advancedModeEnabled"
    :test-content="testContent"
    :is-compare-mode="isCompareMode"
    :enable-compare-mode="enableCompareMode"
    :enable-fullscreen="true"
    :input-mode="inputMode"
    :control-bar-layout="controlBarLayout"
    :button-size="buttonSize"
    @update:test-content="testContent = $event"
    @compare-toggle="handleCompareToggle"
    @test="handleTest"
  >
    <!-- 模型选择插槽 -->
    <template #model-select>
      <ModelSelectUI 
        v-model="selectedModel" 
        :size="buttonSize"
      />
    </template>
    
    <!-- 原始结果插槽 -->
    <template #original-result>
      <OutputDisplay :content="originalResult" />
    </template>
    
    <!-- 优化结果插槽 -->
    <template #optimized-result>
      <OutputDisplay :content="optimizedResult" />
    </template>
    
    <!-- 单一结果插槽 -->
    <template #single-result>
      <OutputDisplay :content="singleResult" />
    </template>
  </TestAreaPanel>
</template>

<script setup lang="ts">
import { ref, computed } from 'vue'
import { 
  TestAreaPanel, 
  ModelSelectUI, 
  OutputDisplay,
  useResponsiveTestLayout 
} from '@mindsync/ui'

// 响应式布局配置
const { 
  inputMode, 
  controlBarLayout, 
  buttonSize,
  isMobile 
} = useResponsiveTestLayout()

// 状态管理
const optimizationMode = ref<OptimizationMode>('system')
const isTestRunning = ref(false)
const advancedModeEnabled = ref(false)
const testContent = ref('')
const isCompareMode = ref(true)
const selectedModel = ref('gpt-4')

// 结果数据
const originalResult = ref('')
const optimizedResult = ref('')
const singleResult = computed(() => optimizedResult.value)

// 根据屏幕尺寸动态配置
const enableCompareMode = computed(() => !isMobile.value)
</script>
```

## API参考

### TestAreaPanel Props

| 属性名 | 类型 | 默认值 | 描述 |
|--------|------|--------|------|
| `optimizationMode` | `OptimizationMode` | `'system'` | 优化模式：'system' 或 'user' |
| `isTestRunning` | `boolean` | `false` | 测试是否正在进行中 |
| `advancedModeEnabled` | `boolean` | `false` | 是否启用高级模式 |
| `testContent` | `string` | `''` | 测试内容（v-model支持） |
| `isCompareMode` | `boolean` | `false` | 是否为对比模式 |
| `enableCompareMode` | `boolean` | `true` | 是否允许切换到对比模式 |
| `enableFullscreen` | `boolean` | `true` | 是否启用全屏编辑功能 |
| `inputMode` | `'default' \| 'compact'` | `'default'` | 输入框显示模式 |
| `controlBarLayout` | `'default' \| 'compact'` | `'default'` | 控制栏布局模式 |
| `buttonSize` | `'small' \| 'medium' \| 'large'` | `'medium'` | 按钮尺寸 |

### TestAreaPanel Events

| 事件名 | 参数 | 描述 |
|--------|------|------|
| `update:testContent` | `(value: string)` | 测试内容变化 |
| `compare-toggle` | `()` | 对比模式切换 |
| `test` | `()` | 开始测试 |

### TestAreaPanel Slots

| 插槽名 | 描述 | 示例 |
|--------|------|------|
| `model-select` | 模型选择组件 | `<ModelSelectUI v-model="model" />` |
| `original-result` | 原始测试结果显示 | `<OutputDisplay :content="result" />` |
| `optimized-result` | 优化测试结果显示 | `<OutputDisplay :content="result" />` |
| `single-result` | 单一模式结果显示 | `<OutputDisplay :content="result" />` |

## 子组件说明

### TestInputSection

测试内容输入组件，支持智能高度调整和全屏编辑。

```vue
<TestInputSection
  v-model="content"
  :label="inputLabel"
  :placeholder="placeholder"
  :disabled="disabled"
  :mode="inputMode"
  :enable-fullscreen="true"
/>
```

**Props:**
- `modelValue: string` - 输入内容
- `label: string` - 输入框标签
- `placeholder: string` - 占位符文本
- `helpText: string` - 帮助文本
- `disabled: boolean` - 是否禁用
- `mode: 'default' | 'compact'` - 显示模式
- `enableFullscreen: boolean` - 是否启用全屏

### TestControlBar

测试控制栏组件，提供模型选择和测试控制功能。

```vue
<TestControlBar
  :model-label="t('test.model')"
  :show-compare-toggle="enableCompareMode"
  :is-compare-mode="isCompareMode"
  :primary-action-text="buttonText"
  :primary-action-disabled="!canTest"
  :primary-action-loading="isTestRunning"
  :layout="controlBarLayout"
  :button-size="buttonSize"
  @compare-toggle="$emit('compare-toggle')"
  @primary-action="$emit('primary-action')"
>
  <template #model-select>
    <slot name="model-select" />
  </template>
</TestControlBar>
```

### TestResultSection

测试结果展示组件，支持对比模式和单一模式布局。

```vue
<TestResultSection
  :is-compare-mode="isCompareMode"
  :vertical-layout="verticalLayout"
  :show-original="showOriginal"
  :original-title="originalTitle"
  :optimized-title="optimizedTitle"
  :single-result-title="singleTitle"
>
  <template #original-result>
    <slot name="original-result" />
  </template>
  <template #optimized-result>
    <slot name="optimized-result" />
  </template>
  <template #single-result>
    <slot name="single-result" />
  </template>
</TestResultSection>
```

### ConversationSection

会话管理包装组件，控制高级模式下的会话管理面板显示。

```vue
<ConversationSection
  :visible="showConversation"
  :collapsible="true"
  :title="conversationTitle"
  :max-height="maxHeight"
>
  <ConversationManager v-model="conversations" />
</ConversationSection>
```

## Composables

### useResponsiveTestLayout

响应式布局管理hook，根据屏幕尺寸自动调整组件配置。

```ts
import { useResponsiveTestLayout } from '@mindsync/ui'

const {
  isMobile,           // 是否为移动端
  isTablet,           // 是否为平板
  currentBreakpoint,  // 当前断点
  inputMode,          // 推荐的输入模式
  controlBarLayout,   // 推荐的控制栏布局
  buttonSize,         // 推荐的按钮尺寸
  responsiveHeights   // 响应式高度配置
} = useResponsiveTestLayout()
```

### useTestModeConfig

测试模式配置管理hook，处理不同优化模式下的显示逻辑。

```ts
import { useTestModeConfig } from '@mindsync/ui'

const {
  currentModeConfig,      // 当前模式配置
  showTestInput,          // 是否显示测试输入
  requiresTestContent,    // 是否需要测试内容
  inputLabel,             // 输入框标签
  canStartTest,           // 是否可以开始测试
  enableCompareMode,      // 是否启用对比模式
  showConversationManager, // 是否显示会话管理
  getDynamicButtonText,   // 获取动态按钮文本
  validateTestSetup       // 验证测试配置
} = useTestModeConfig(optimizationMode)
```

## 样式规范

所有TestArea组件遵循[测试区域组件样式规范](./test-area-style-guide.md)：

- 使用Naive UI设计系统组件
- 禁止硬编码像素值和Tailwind CSS类
- 统一的间距和文本样式系统
- 完整的响应式布局支持
- 主题兼容性要求

## 最佳实践

### 1. 响应式设计

```vue
<script setup>
// 使用响应式布局hook
const { inputMode, controlBarLayout, buttonSize, isMobile } = useResponsiveTestLayout()

// 根据屏幕尺寸动态调整功能
const enableAdvancedFeatures = computed(() => !isMobile.value)
</script>
```

### 2. 状态管理

```vue
<script setup>
// 集中管理测试相关状态
const testState = reactive({
  mode: 'system' as OptimizationMode,
  content: '',
  isRunning: false,
  isCompareMode: true,
  results: {
    original: '',
    optimized: ''
  }
})

// 使用计算属性处理复杂逻辑
const canStartTest = computed(() => {
  if (testState.mode === 'system') {
    return testState.content.length > 0
  }
  return true // 用户模式不需要额外输入
})
</script>
```

### 3. 错误处理

```vue
<script setup>
const handleTest = async () => {
  testState.isRunning = true
  
  try {
    await promptService.testPromptStream(
      systemPrompt,
      userPrompt,
      selectedModel.value,
      {
        onToken: (token) => {
          // 处理流式token
        },
        onComplete: () => {
          // 测试完成
        },
        onError: (error) => {
          console.error('测试失败:', error)
          // 显示错误提示
        }
      }
    )
  } catch (error) {
    console.error('测试请求失败:', error)
  } finally {
    testState.isRunning = false
  }
}
</script>
```

### 4. 国际化支持

```vue
<template>
  <TestAreaPanel
    :optimization-mode="optimizationMode"
    <!-- 其他props -->
  >
    <template #model-select>
      <ModelSelectUI 
        v-model="selectedModel"
        :placeholder="$t('common.selectModel')"
      />
    </template>
  </TestAreaPanel>
</template>

<script setup>
import { useI18n } from 'vue-i18n'

const { t } = useI18n()

// 动态计算标签文本
const inputLabel = computed(() => {
  return optimizationMode.value === 'system' 
    ? t('test.content')
    : t('test.userPromptTest')
})
</script>
```

## 测试

### 单元测试

TestArea组件提供完整的测试覆盖：

```bash
# 运行组件单元测试
pnpm -F @mindsync/ui test -- tests/unit/components/TestAreaPanel.spec.ts

# 运行集成测试
pnpm -F @mindsync/ui test -- tests/unit/components/test-area-integration.spec.ts

# 运行端到端测试
pnpm -F @mindsync/ui test -- tests/unit/components/test-area-e2e.spec.ts
```

### 测试用例

```ts
import { mount } from '@vue/test-utils'
import { TestAreaPanel } from '@mindsync/ui'

describe('TestAreaPanel', () => {
  it('应该正确处理模式切换', async () => {
    const wrapper = mount(TestAreaPanel, {
      props: {
        optimizationMode: 'system',
        testContent: '测试内容',
        isCompareMode: true
      }
    })

    // 验证初始状态
    expect(wrapper.find('[data-testid="test-input-section"]').exists()).toBe(true)
    
    // 切换到用户模式
    await wrapper.setProps({ optimizationMode: 'user' })
    
    // 验证状态更新
    expect(wrapper.find('[data-testid="test-input-section"]').exists()).toBe(false)
  })
})
```

## 故障排查

### 常见问题

**Q: 组件样式显示异常？**  
A: 检查是否正确导入了Naive UI的NConfigProvider，确保主题系统正常工作。

**Q: 响应式布局不生效？**  
A: 确认是否使用了useResponsiveTestLayout hook，并正确传递了布局配置props。

**Q: 测试功能无法正常工作？**  
A: 检查services是否正确通过provide/inject机制注入，确保promptService可用。

**Q: TypeScript类型错误？**  
A: 确认导入了正确的类型定义，检查@mindsync/core和@mindsync/ui的版本兼容性。

### 调试工具

```vue
<script setup>
// 开发模式下启用调试
if (import.meta.env.DEV) {
  // 监听状态变化
  watch(() => testState, (newState) => {
    console.log('TestArea状态变化:', newState)
  }, { deep: true })
  
  // 暴露组件状态到全局
  window.__testAreaDebug = {
    state: testState,
    config: useTestModeConfig(optimizationMode),
    layout: useResponsiveTestLayout()
  }
}
</script>
```

## 更新日志

### v1.0.0 (2025-01-20)
- ✨ 初始发布TestArea组件系统
- ✨ 支持系统/用户提示词模式
- ✨ 完整的响应式布局系统
- ✨ 对比测试功能
- ✨ 主题兼容性
- ✨ 完整的TypeScript类型支持

---

**文档更新时间：** 2025-01-20  
**组件版本：** v1.0.0  
**兼容性：** Vue 3.x, Naive UI 2.x