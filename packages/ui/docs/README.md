# Naive UI 重构组件使用指南

## 快速开始

### 安装

```bash
# 通过pnpm安装（推荐）
pnpm add @mindsync/ui

# 或通过npm安装
npm install @mindsync/ui
```

### 基础用法

```vue
<template>
  <div>
    <!-- 上下文编辑器 -->
    <ContextEditor
      v-model:visible="showEditor"
      :state="contextState"
      @save="handleSave"
    />
    
    <!-- 工具调用显示 -->
    <ToolCallDisplay
      :tool-calls="toolCalls"
      :collapsed="false"
    />
    
    <!-- 可访问性支持 - 使用 composable 方式 -->
    <!-- <ScreenReaderSupport> 组件已移除，请使用 useAccessibility -->
    <!--
    <ScreenReaderSupport
      :enhanced="true" 
      :show-navigation-help="true"
    />
    -->
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import {
  ContextEditor,
  ToolCallDisplay,
  // ScreenReaderSupport, // 已移除，使用 useAccessibility composable
  useAccessibility,
  type ContextState,
  type ToolCall
} from '@mindsync/ui'

// 引入样式
import '@mindsync/ui/dist/style.css'

// 上下文状态
const showEditor = ref(false)
const contextState = ref<ContextState>({
  messages: [
    { role: 'user', content: 'Hello World' }
  ],
  variables: {},
  tools: [],
  showVariablePreview: true,
  showToolManager: true,
  mode: 'edit'
})

// 工具调用数据
const toolCalls = ref<ToolCall[]>([
  {
    id: 'call_1',
    name: 'get_weather',
    arguments: { location: 'Beijing' },
    result: { temperature: 25 },
    status: 'success',
    timestamp: Date.now()
  }
])

// 可访问性支持
const { announce } = useAccessibility('MyApp')

const handleSave = (context: ContextState) => {
  console.log('Context saved:', context)
  announce('上下文已保存', 'polite')
  showEditor.value = false
}
</script>
```

## 主要特性

### 🎯 完整的可访问性支持
- WCAG 2.1 AA/AAA 标准合规
- 完整的键盘导航
- 屏幕阅读器优化
- 高对比度模式支持

### 📱 响应式设计
- 移动端优先
- 自适应布局
- 触摸友好的交互

### ⚡ 性能优化
- 虚拟滚动
- 懒加载
- 防抖节流
- 代码分割

### 🌍 国际化支持
- 多语言切换
- 本地化格式
- RTL语言支持

## 组件概览

| 组件名 | 用途 | 主要特性 |
|--------|------|----------|
| `ContextEditor` | 上下文编辑 | 消息管理、变量处理、工具配置 |
| `ToolCallDisplay` | 工具调用显示 | 折叠面板、状态显示、错误处理 |
| `ScreenReaderSupport` | 屏幕阅读器支持 | 实时通知、键盘快捷键、导航提示 |

## Composables

| 函数名 | 用途 | 返回值 |
|--------|------|--------|
| `useAccessibility` | 可访问性支持 | 键盘导航、ARIA管理、消息通知 |
| `useFocusManager` | 焦点管理 | 焦点陷阱、键盘导航、自动恢复 |
| `useAccessibilityTesting` | 可访问性测试 | WCAG合规检查、问题报告 |

## 最佳实践

### 1. 可访问性优先

```vue
<template>
  <div>
    <!-- ✅ 正确：提供ARIA标签 -->
    <button
      :aria-label="aria.getLabel('save', '保存')"
      @click="handleSave"
    >
      保存
    </button>
    
    <!-- ❌ 错误：缺少语义化标签 -->
    <div @click="handleSave">保存</div>
  </div>
</template>

<script setup lang="ts">
import { useAccessibility } from '@mindsync/ui'

const { aria, announce } = useAccessibility('MyComponent')

const handleSave = () => {
  // 保存逻辑
  announce('内容已保存', 'polite')
}
</script>
```

### 2. 响应式设计

```vue
<template>
  <div class="responsive-container">
    <!-- 使用响应式组件属性 -->
    <ContextEditor
      v-model:visible="showEditor"
      :size="isMobile ? 'small' : 'large'"
      :state="contextState"
    />
  </div>
</template>

<script setup lang="ts">
import { useResponsive } from '@mindsync/ui'

const { isMobile, isTablet, modalWidth } = useResponsive()
</script>

<style scoped>
.responsive-container {
  /* 移动端 */
  @media (max-width: 767px) {
    padding: 8px;
  }
  
  /* 桌面端 */
  @media (min-width: 1024px) {
    padding: 24px;
  }
}
</style>
```

### 3. 性能优化

```vue
<template>
  <div>
    <!-- 大量数据使用虚拟滚动 -->
    <ToolCallDisplay
      :tool-calls="largeDataset"
      :max-items="100"
      virtual-scroll
    />
    
    <!-- 使用防抖搜索 -->
    <NInput
      :value="searchQuery"
      @input="debouncedSearch"
      placeholder="搜索..."
    />
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useDebounceThrottle } from '@mindsync/ui'

const { debounce } = useDebounceThrottle()
const searchQuery = ref('')
const largeDataset = ref([]) // 假设有大量数据

const handleSearch = (query: string) => {
  // 执行搜索逻辑
  console.log('搜索:', query)
}

const debouncedSearch = debounce((value: string) => {
  searchQuery.value = value
  handleSearch(value)
}, 300)
</script>
```

## 常见问题

### Q: 如何启用可访问性模式？

A: 使用 `useAccessibility` composable：

```typescript
const { isAccessibilityMode } = useAccessibility()

// 自动检测或手动启用
isAccessibilityMode.value = true
```

### Q: 如何处理大量数据的性能问题？

A: 使用虚拟化和分页：

```vue
<template>
  <ToolCallDisplay
    :tool-calls="paginatedData"
    virtual-scroll
    :max-items="50"
  />
</template>
```

### Q: 如何自定义主题？

A: 通过CSS变量覆盖默认主题：

```css
:root {
  --primary-color: #1890ff;
  --border-radius: 4px;
  --font-size: 14px;
}
```

### Q: 如何添加国际化支持？

A: 配置i18n实例：

```typescript
import { createI18n } from 'vue-i18n'

const i18n = createI18n({
  locale: 'zh-CN',
  messages: {
    'zh-CN': { /* 中文消息 */ },
    'en-US': { /* 英文消息 */ }
  }
})
```

## 升级指南

### 从传统组件升级到Naive UI版本

1. **更新导入语句**：
```typescript
// 旧版本
import ContextEditor from './components/ContextEditor.vue'

// 新版本
import { ContextEditor } from '@mindsync/ui'
```

2. **更新Props**：
```vue
<!-- 旧版本 -->
<ContextEditor :dialogVisible="visible" />

<!-- 新版本 -->
<ContextEditor v-model:visible="visible" />
```

3. **添加可访问性支持**：
```vue
<template>
  <div>
    <ContextEditor v-model:visible="visible" />
    <ScreenReaderSupport enhanced />
  </div>
</template>
```

## 开发工具

### TypeScript支持

完整的TypeScript类型定义：

```typescript
import type {
  ContextState,
  ToolCall,
  AccessibilityFeatures,
  FocusManagerOptions
} from '@mindsync/ui'
```

### 开发时调试

启用调试模式：

```typescript
import { setDebugMode } from '@mindsync/ui'

// 开发环境下启用
if (process.env.NODE_ENV === 'development') {
  setDebugMode(true)
}
```

### 测试工具

使用内置的测试工具：

```typescript
import { useAccessibilityTesting } from '@mindsync/ui'

const { runTest } = useAccessibilityTesting()

// 运行可访问性测试
const result = await runTest({
  wcagLevel: 'AA',
  scope: document.body
})
```

## 贡献指南

欢迎贡献代码和改进建议！

1. Fork 项目仓库
2. 创建特性分支 (`git checkout -b feature/amazing-feature`)
3. 提交更改 (`git commit -m 'Add some amazing feature'`)
4. 推送到分支 (`git push origin feature/amazing-feature`)
5. 创建Pull Request

## 支持

- 📖 [完整API文档](./COMPONENT_API.md)
- 🐛 [问题反馈](https://github.com/your-repo/issues)
- 💬 [讨论区](https://github.com/your-repo/discussions)

---

*最后更新: 2024年XX月XX日*