# 技术开发指南

> **注意:** 本文档整合了原有的开发指南和技术文档，提供完整的技术栈说明和开发规范。

## 1. 项目技术架构

### 1.1 整体架构
- Monorepo结构
  - packages/core - 核心功能包
  - packages/web - Web应用
  - packages/extension - Chrome扩展
  - packages/ui - 共享UI组件
- 包间依赖管理
  - 清晰的依赖关系
  - 版本一致性
  - 最小化重复代码
- 工程化工具
  - pnpm workspace
  - 多包管理
  - 统一版本控制

### 1.2 技术栈概览

#### 1.2.1 核心包 (@prompt-optimizer/core)
- TypeScript 5.3.x
  - 类型系统
  - 接口定义
  - 模块化
- 原生SDK集成
  - OpenAI SDK ^4.83.0
  - Google Generative AI SDK ^0.21.0
  - 模型管理
  - 提示词处理
  - 流式响应
- 工具库
  - uuid ^11.0.5
  - zod ^3.22.4
  - 错误处理
  - 类型定义

#### 1.2.2 Web包 (@prompt-optimizer/web)
- Vue 3.5.x
  - Composition API
  - Script Setup
  - 响应式系统
  - 组件生态
- Vite 6.0.x
  - 快速开发服务器
  - 优化的构建
  - 插件系统
  - HMR支持

#### 1.2.3 UI框架和样式
- TailwindCSS 3.4.x
  - 实用优先
  - 响应式设计
  - 深色模式支持
  - 动画系统
- Vue Transitions
  - 页面过渡动画
  - 组件切换效果
  - 列表动画
- Naive UI 2.42.x
  - 企业级组件库
  - 完整的TypeScript支持  
  - 主题定制系统
  - 响应式组件设计

#### 1.2.4 状态管理
- Vue Reactivity
  - ref/reactive
  - computed
  - watch
  - watchEffect
- Composables模式
  - 状态逻辑复用
  - 响应式组合
  - 生命周期管理
  - 副作用处理
- LocalStorage
  - 配置持久化
  - 历史记录存储
  - 模板管理
  - 加密存储

#### 1.2.5 安全性
- WebCrypto API
  - API密钥加密
  - 安全存储
  - 密钥轮换
- XSS防护
  - 输入验证
  - 内容过滤
  - 安全编码
- CORS配置
  - API访问控制
  - 安全头部
  - CSP策略

#### 1.2.6 开发工具
- TypeScript 5.3.x
  - 类型检查
  - 代码提示
  - 接口定义
- ESLint 8.56.x
  - 代码规范
  - 自动修复
  - TypeScript支持
- Prettier 3.2.x
  - 代码格式化
  - 统一风格
  - 编辑器集成

#### 1.2.7 测试框架
- Vitest 3.0.x
  - 单元测试
  - 集成测试
  - 快照测试
  - 覆盖率报告
- Vue Test Utils 2.4.x
  - 组件测试
  - 行为模拟
  - 事件测试
- Playwright 1.41.x
  - E2E测试
  - 跨浏览器测试
  - 视觉回归测试

### 1.3 代码组织
- 模块化设计
  - 按功能划分模块
  - 单一职责原则
  - 关注点分离
- 统一目录结构
  - src/ - 源代码
  - tests/ - 测试代码
  - types/ - 类型定义
  - config/ - 配置文件

## 2. 核心包开发规范

### 2.1 服务实现规范
- 接口一致性
  - 所有服务必须实现统一接口
  - 方法命名保持一致
  - 错误处理遵循统一模式
  - 返回值类型一致

- 错误处理
  - 使用统一的错误类型
  - 错误信息应包含上下文
  - 实现错误恢复机制
  - 提供用户友好的错误信息

### 2.2 SDK集成规范
- 原生SDK集成
  - 直接使用官方SDK
  - 避免不必要的抽象层
  - 保持版本更新
  - 遵循官方最佳实践

- 错误映射
  - SDK特定错误映射到统一错误类型
  - 保留原始错误信息
  - 实现重试机制
  - 提供降级方案

### 2.3 类型定义规范
- 类型安全性
  - 使用精确的类型定义
  - 避免any类型
  - 使用联合类型表示可能的值
  - 为复杂对象定义接口

- 类型导出
  - 在index.ts中集中导出类型
  - 按模块组织类型定义
  - 使用命名空间避免冲突
  - 提供类型文档注释

### 2.4 测试规范
- 单元测试
  - 测试覆盖率目标>80%
  - 测试边界条件
  - 模拟外部依赖
  - 验证错误处理

- 集成测试
  - 测试服务间交互
  - 验证端到端流程
  - 测试性能和并发
  - 模拟真实环境

## 3. 前端开发规范

### 3.1 项目架构
- 推荐目录结构
  ```
  src/
  ├── components/    # UI组件
  ├── composables/   # 组合式函数
  ├── views/         # 页面组件
  ├── services/      # 服务层
  ├── config/        # 配置文件
  ├── assets/        # 静态资源
  ├── utils/         # 工具函数
  ├── types/         # 类型定义
  ├── App.vue        # 根组件
  └── main.ts        # 入口文件
  ```

- 命名规范
  - 组件文件：PascalCase.vue
  - 工具函数文件：camelCase.ts
  - 类型定义文件：camelCase.types.ts
  - 组合式函数：useXxx.ts

### 3.2 服务使用规范
- 核心服务集成
  - 使用统一的服务访问模式
  - 实现服务单例模式
  - 处理服务初始化
  - 管理服务状态

- 错误处理
  - 使用统一的错误处理机制
  - 提供用户友好的错误提示
  - 实现错误恢复
  - 记录错误日志

### 3.3 组件开发规范
- Vue组件模板
  - 使用<script setup>语法
  - 明确定义props和emits
  - 使用TypeScript类型
  - 遵循单一职责原则

- 组件设计原则
  - 组件应该是可复用的
  - 组件应该是可测试的
  - 组件应该是可维护的
  - 组件应该是可扩展的

### 3.4 类型系统
- Vue组件类型
  - 为props定义明确类型
  - 为emits定义事件类型
  - 为ref和reactive定义类型
  - 使用泛型增强类型安全

- 通用工具类型
  - 创建可复用的工具类型
  - 使用TypeScript内置工具类型
  - 为复杂数据结构定义类型
  - 避免类型断言

### 3.5 状态管理
- Composables模式
  - 按功能模块组织composables
  - 使用组合式API风格
  - 实现状态共享和复用
  - 处理异步操作和副作用

- 响应式状态管理
  - 使用ref/reactive管理局部状态
  - 使用provide/inject实现依赖注入
  - 通过composables实现状态逻辑复用
  - 管理组件生命周期和清理

### 3.6 TypeScript和ESLint配置指导

#### 3.6.1 TypeScript配置最佳实践

**项目级tsconfig.json配置**
```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "lib": ["ES2022", "DOM", "DOM.Iterable"],
    "moduleResolution": "node",
    "strict": true,
    "jsx": "preserve",
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "isolatedModules": true,
    "noEmit": true,
    "useDefineForClassFields": true
  },
  "include": ["src/**/*", "*.vue"],
  "exclude": ["node_modules", "dist"]
}
```

**Vue组件类型定义**
```typescript
// 组件Props类型定义
interface ComponentProps {
  title: string
  items: Array<{ id: string, name: string }>
  onSelect?: (item: any) => void
}

// 组件Emits类型定义  
const emit = defineEmits<{
  select: [item: any]
  update: [value: string]
}>()

// 响应式数据类型
const formData = ref<{
  username: string
  modelConfig: ModelConfig | null
}>({
  username: '',
  modelConfig: null
})
```

**服务接口类型安全**
```typescript
// 服务依赖注入类型
interface Services {
  modelManager: IModelManager
  templateManager: ITemplateManager
  variableManager: IVariableManager
}

const services = inject<{ value: Services | null }>('services')
if (!services?.value) {
  throw new Error('Services not provided')
}
```

#### 3.6.2 ESLint配置指导

**基础ESLint配置**
```json
{
  "root": true,
  "parser": "vue-eslint-parser",
  "parserOptions": {
    "parser": "@typescript-eslint/parser",
    "ecmaVersion": 2022,
    "sourceType": "module",
    "extraFileExtensions": [".vue"]
  },
  "plugins": ["@typescript-eslint", "vue"],
  "extends": [
    "eslint:recommended",
    "@vue/eslint-config-typescript/recommended"
  ],
  "rules": {
    "@typescript-eslint/no-unused-vars": "warn",
    "@typescript-eslint/no-explicit-any": "warn",
    "vue/multi-word-component-names": "off",
    "vue/no-unused-vars": "error"
  }
}
```

**Vue文件特定规则**
```json
{
  "rules": {
    "vue/component-name-in-template-casing": ["error", "PascalCase"],
    "vue/prop-name-casing": ["error", "camelCase"],
    "vue/attribute-hyphenation": ["error", "always"],
    "vue/v-on-event-hyphenation": ["error", "always"],
    "vue/no-unused-components": "warn",
    "vue/require-default-prop": "off"
  }
}
```

#### 3.6.3 开发环境集成

**VS Code配置 (.vscode/settings.json)**
```json
{
  "editor.codeActionsOnSave": {
    "source.fixAll.eslint": true
  },
  "eslint.validate": [
    "javascript",
    "typescript",
    "vue"
  ],
  "vetur.validation.template": false,
  "vetur.validation.script": false,
  "vetur.validation.style": false
}
```

### 3.7 性能优化
- 动态导入
  - 使用路由懒加载
  - 组件按需加载
  - 第三方库按需导入
  - 代码分割

- 渲染优化
  - 使用虚拟列表
  - 避免不必要的渲染
  - 使用计算属性缓存
  - 优化大型列表

### 3.8 Naive UI使用指南

#### 3.8.1 组件库特性
- **企业级设计**
  - 专业的视觉设计语言
  - 一致的交互体验
  - 完整的组件生态

- **TypeScript支持**
  - 完整的类型定义
  - 智能代码提示
  - 类型安全的属性传递

- **主题系统**
  - 内置多种主题（light、dark、blue、green、purple）
  - 支持主题定制和动态切换
  - CSS变量支持

#### 3.8.2 配置指南

1. **基础配置**
   ```vue
   <template>
     <NConfigProvider :theme="naiveTheme" :theme-overrides="themeOverrides">
       <!-- 应用内容 -->
     </NConfigProvider>
   </template>
   
   <script setup>
   import { useNaiveTheme } from '@prompt-optimizer/ui'
   
   const { naiveTheme, themeOverrides } = useNaiveTheme()
   </script>
   ```

2. **主题配置**
   ```typescript
   // config/naive-theme.ts
   export const themeConfig = {
     light: lightTheme,
     dark: darkTheme,
     blue: createCustomTheme(blueColors),
     green: createCustomTheme(greenColors),
     purple: createCustomTheme(purpleColors)
   }
   ```

3. **组件使用**
   ```vue
   <template>
     <NButton type="primary" @click="handleClick">
       按钮
     </NButton>
     <NCard title="卡片标题">
       <p>卡片内容</p>
     </NCard>
   </template>
   
   <script setup>
   import { NButton, NCard } from 'naive-ui'
   </script>
   ```

#### 3.8.3 主题配置详细说明

系统提供5种完整主题配置，每种主题都包含完整的颜色体系和组件样式定制：

**1. 日间模式 (light)**
- 基础主题：lightTheme
- 主色调：#0ea5e9 (天蓝色)
- 适用场景：默认日间使用，清晰简洁

**2. 夜间模式 (dark)**
- 基础主题：darkTheme  
- 主色调：#64748b (石板灰)
- 适用场景：低光环境，护眼模式

**3. 蓝色模式 (blue)**
- 基础主题：lightTheme + 自定义背景
- 主色调：#0ea5e9 (天蓝色)
- 特色：蓝色调背景色系 (#f0f9ff body, #e0f2fe card)
- 适用场景：商务专业风格

**4. 绿色模式 (green)**
- 基础主题：darkTheme + 完整绿色配色
- 主色调：#14b8a6 (青绿色)
- 特色：深色基调配绿色主题 (#0f1e1a body, #1a2e25 card)
- 完整配置：包含滚动条、图标、边框等所有UI元素

**5. 暗紫模式 (purple)**
- 基础主题：darkTheme + 紫色配色
- 主色调：#a855f7 (紫色)
- 特色：深色基调配紫色主题 (#1a0f2e body, #251a35 card)
- 适用场景：创意设计，个性化界面

#### 3.8.4 常用组件使用模式

**1. 表单组件**
```vue
<template>
  <NForm ref="formRef" :model="formModel" :rules="formRules">
    <NFormItem label="用户名" path="username">
      <NInput v-model:value="formModel.username" placeholder="请输入用户名" />
    </NFormItem>
    <NFormItem label="模型选择" path="model">
      <NSelect 
        v-model:value="formModel.model" 
        :options="modelOptions"
        placeholder="请选择模型"
      />
    </NFormItem>
    <NFormItem>
      <NButton type="primary" @click="handleSubmit">
        提交
      </NButton>
    </NFormItem>
  </NForm>
</template>
```

**2. 布局组件**
```vue
<template>
  <!-- 弹性布局 - 推荐用于现代布局 -->
  <NFlex vertical :size="16">
    <NFlex justify="space-between" align="center">
      <NH3>标题</NH3>
      <NButton type="primary">操作</NButton>
    </NFlex>
    
    <!-- 卡片容器 -->
    <NCard title="内容卡片" hoverable>
      <NFlex :size="12">
        <NTag type="info">标签1</NTag>
        <NTag type="success">标签2</NTag>
      </NFlex>
    </NCard>
  </NFlex>

  <!-- 传统间距布局 -->
  <NSpace vertical :size="16">
    <NSpace justify="space-between" align="center">
      <NText strong>列表标题</NText>
      <NButton quaternary>更多</NButton>
    </NSpace>
  </NSpace>

  <!-- 网格布局 -->
  <NGrid :cols="3" :x-gap="16" :y-gap="16">
    <NGridItem v-for="item in items" :key="item.id">
      <NCard>{{ item.content }}</NCard>
    </NGridItem>
  </NGrid>
</template>
```

**3. 反馈组件**
```vue
<script setup>
import { useMessage, useNotification } from 'naive-ui'

const message = useMessage()
const notification = useNotification()

const showToast = () => {
  message.success('操作成功')
}

const showNotification = () => {
  notification.info({
    title: '通知标题',
    content: '通知内容',
    duration: 3000
  })
}
</script>
```

**4. 变量管理组件使用模式**
```vue
<script setup>
import { useVariableManager } from '@prompt-optimizer/ui'

const services = inject('services')
const {
  isReady,
  isAdvancedMode,
  customVariables,
  allVariables,
  setAdvancedMode,
  addVariable,
  updateVariable,
  deleteVariable,
  replaceVariables
} = useVariableManager(services, { autoSync: true })

// 使用变量替换
const processedContent = computed(() => {
  return replaceVariables(originalContent.value, allVariables.value)
})
</script>
```

#### 3.8.5 最佳实践

- **按需导入**：只导入使用的组件，减少包体积
- **主题一致性**：统一使用主题系统，避免硬编码颜色
- **响应式设计**：优先使用NFlex而不是NSpace，获得更好的响应式支持
- **类型安全**：充分利用TypeScript类型定义
- **组件组合**：合理使用NCard + NFlex + NSpace组合实现复杂布局
- **主题切换**：通过switchTheme()方法实现动态主题切换

### 3.9 测试规范
- 组件测试
  - 测试组件渲染
  - 测试用户交互
  - 测试props和emits
  - 测试边界条件

- 服务测试
  - 模拟外部依赖
  - 测试异步操作
  - 测试错误处理
  - 验证状态变化

## 4. 应用流程

### 4.1 核心服务初始化

1. **核心服务加载顺序**
   - 导入核心服务（modelManager, templateManager, historyManager）
   - 加载模型配置
   - 加载模板配置
   - 加载历史记录

2. **服务实例创建流程**
   - 创建LLM服务实例
   - 创建提示词服务实例
   - 注册事件处理器
   - 初始化服务状态

### 4.2 Web应用初始化

1. **应用配置加载**
   - 环境变量加载
   - 主题设置初始化
   - Vue应用配置

2. **服务状态同步**
   - 模型状态初始化
   - 模板数据加载
   - 历史记录同步

### 4.3 提示词优化流程

1. **用户输入阶段**
   - 输入验证流程
   - 错误处理机制
   - 输入清理和预处理

2. **优化处理阶段**
   - 使用原生SDK处理请求
   - 调用LLM服务进行优化
   - 流式响应处理
   - 错误处理与重试

3. **结果处理阶段**
   - 流式响应UI更新
   - 结果存储到历史记录
   - 错误恢复和降级处理

### 4.4 模型管理流程

1. **模型配置管理**
   - 模型配置更新: 用户可以更新模型的名称、基础URL、API密钥、可用模型列表、默认模型以及是否启用。
   - **高级LLM参数 (`llmParams`)**:
     - `ModelConfig` 接口包含一个 `llmParams?: Record<string, any>;` 字段。
     - 此字段允许用户为每个模型配置提供一个灵活的键值对映射，用于指定特定于该LLM提供商SDK的参数。
     - 用户可以添加其LLM SDK支持的任何参数。
     - **示例**:
       - **OpenAI/OpenAI兼容API (如 DeepSeek, Zhipu):**
         ```json
         "llmParams": {
           "temperature": 0.7,
           "max_tokens": 4096,
           "timeout": 60000, // 用于OpenAI客户端的请求超时 (毫秒)
           "top_p": 0.9,
           "frequency_penalty": 0.5
           // ... 其他OpenAI支持的参数
         }
         ```
       - **Gemini:**
         ```json
         "llmParams": {
           "temperature": 0.8,
           "maxOutputTokens": 2048, // 注意: Gemini使用maxOutputTokens
           "topP": 0.95,
           "topK": 40
           // ... 其他Gemini支持的参数
         }
         ```
     - **`LLMService` 如何处理 `llmParams`**:
       - 对于OpenAI兼容的API, `timeout` 值（如果提供）用于配置OpenAI JavaScript SDK客户端实例的超时设置。其余参数（如 `temperature`, `max_tokens`, `top_p` 等）会直接传递给 `chat.completions.create()` 方法。
       - 对于Gemini, `temperature`, `maxOutputTokens`, `topP`, `topK` 等参数会包含在传递给 `model.startChat()` 的 `generationConfig` 对象中。
       - 未被服务明确处理的参数（即非 `timeout` for OpenAI, 或非已知Gemini参数）通常会被安全地传递给相应SDK的请求中，如果SDK支持它们。
   - 连接测试: 验证API密钥和基础URL是否正确，以及模型是否可用。
   - 配置验证: 确保所有必填字段都已填写，并且格式正确。`llmParams` 字段（如果提供）必须是一个对象。
   - 错误处理: 在配置不正确或连接失败时提供明确的错误信息。

2. **API密钥管理**
   - 密钥设置与加密
   - 密钥验证
   - 安全存储
   - 错误处理

### 4.5 模板管理流程

1. **模板操作流程**
   - 模板保存
   - 模板验证
   - 模板分类管理
   - 错误处理

2. **模板应用流程**
   - 模板获取
   - 模板应用
   - 数据验证
   - 错误处理

### 4.6 历史记录管理

1. **记录保存流程**
   - 添加记录
   - 数据同步
   - 自动清理
   - 错误处理

2. **记录操作流程**
   - 获取记录
   - 过滤记录
   - 删除记录
   - 错误处理

### 4.7 错误处理流程

1. **API错误处理策略**
   - 可重试错误识别
   - 退避重试机制
   - 错误上报
   - 用户通知
   - 降级处理

2. **验证错误处理**
   - 字段验证
   - UI更新
   - 焦点处理
   - 错误提示

3. **全局错误处理**
   - 错误分类
   - 错误恢复
   - 错误上报
   - 用户反馈

## 5. 代码审查清单

### 5.1 通用审查项
- 代码质量
  - [ ] 遵循约定的代码风格
  - [ ] 没有未使用的变量或导入
  - [ ] 适当的注释和文档
  - [ ] 避免重复代码
- 安全性
  - [ ] 输入验证
  - [ ] 敏感信息保护
  - [ ] API密钥安全存储
  - [ ] 防止XSS攻击
- 性能
  - [ ] 避免不必要的计算
  - [ ] 大型数据集的性能处理
  - [ ] 缓存计算结果

### 5.2 前端审查项
- 组件设计
  - [ ] 组件职责单一
  - [ ] 属性和事件定义清晰
  - [ ] 状态管理合理
  - [ ] 错误处理完善
- UI/UX
  - [ ] 响应式设计
  - [ ] 无障碍性支持
  - [ ] 良好的错误反馈
  - [ ] 加载状态处理

### 5.3 核心包审查项
- API设计
  - [ ] 接口一致性
  - [ ] 错误处理标准化
  - [ ] 类型定义完整
  - [ ] 文档注释
- 服务实现
  - [ ] 单一职责原则
  - [ ] 适当的抽象级别
  - [ ] 测试覆盖率
  - [ ] 错误恢复机制

## 6. 开发环境要求

### 6.1 开发环境
- Node.js 22.x
- pnpm >= 8.15.0
- VS Code
  - Volar 1.8.x
  - ESLint
  - Prettier
  - Cursor
  - GitLens
  - Tailwind CSS IntelliSense

### 6.2 浏览器支持
- Chrome >= 90
- Firefox >= 90
- Safari >= 14
- Edge >= 90
- 移动端浏览器
  - iOS Safari >= 14
  - Android Chrome >= 90

## 跨域问题处理

### ⚠️ 代理功能已移除

由于安全原因(SSRF漏洞风险，详见 [GitHub Issue #179](https://github.com/linshenkx/prompt-optimizer/issues/179))，我们已在v1.x版本中**完全移除**了Vercel和Docker内置代理功能。

### 推荐解决方案

如遇跨域问题，请使用以下方案：

1. **桌面版应用**(推荐)
   - 无跨域限制
   - 本地运行，更安全
   - 支持所有LLM API

2. **自建反向代理**
   - 使用Nginx、Caddy等工具
   - 完全控制安全策略
   - 可参考 `docs/archives/122-docker-api-proxy/` 中的历史实现

3. **LLM提供商自有代理**
   - 某些提供商提供CORS友好的端点
   - 查阅对应提供商文档

### 历史说明

早期版本(v0.x)曾提供内置代理端点(`/api/proxy`, `/api/stream`)，但因安全审计发现SSRF风险已移除。历史实现可查看 `docs/archives/122-docker-api-proxy/implementation.md`

最后更新：2025-01-21
