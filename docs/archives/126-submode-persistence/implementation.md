# 子模式持久化 - 实施记录

## 📋 实施概览

本文档记录三种功能模式子模式持久化的完整实施过程，包括核心代码、关键决策和实施步骤。

## 🔧 核心实现

### 1. 存储键定义

**文件**: `packages/core/src/constants/storage-keys.ts`

```typescript
export const UI_SETTINGS_KEYS = {
  // ... 现有键 ...
  FUNCTION_MODE: 'app:settings:ui:function-mode',
  
  // ✅ 子模式持久化（三种功能模式独立存储）
  BASIC_SUB_MODE: 'app:settings:ui:basic-sub-mode',     // 基础模式
  PRO_SUB_MODE: 'app:settings:ui:pro-sub-mode',         // 上下文模式
  IMAGE_SUB_MODE: 'app:settings:ui:image-sub-mode',     // 图像模式
} as const
```

**设计要点**:
- 三个完全独立的存储键
- 命名清晰反映功能模式
- 使用 `as const` 确保类型安全

---

### 2. TypeScript类型定义

**文件**: `packages/core/src/services/prompt/types.ts`

```typescript
/**
 * 子模式类型定义（三种功能模式独立）
 * 用于持久化各功能模式下的子模式选择
 */

// 基础模式的子模式
export type BasicSubMode = "system" | "user"

// 上下文模式的子模式
export type ProSubMode = "system" | "user"

// 图像模式的子模式
export type ImageSubMode = "text2image" | "image2image"
```

**设计要点**:
- 三个独立的类型，即使值域相同也不混用
- 清晰的JSDoc注释
- 体现功能模式的独立性

---

### 3. Composable实现

#### useBasicSubMode.ts

**文件**: `packages/ui/src/composables/useBasicSubMode.ts`

```typescript
import { ref, readonly, type Ref } from 'vue'
import type { AppServices } from '../types/services'
import { usePreferences } from './usePreferenceManager'
import { UI_SETTINGS_KEYS, type BasicSubMode } from '@mindsync/core'

interface UseBasicSubModeApi {
  basicSubMode: Ref<BasicSubMode>
  setBasicSubMode: (mode: BasicSubMode) => Promise<void>
  switchToSystem: () => Promise<void>
  switchToUser: () => Promise<void>
  ensureInitialized: () => Promise<void>
}

let singleton: {
  mode: Ref<BasicSubMode>
  initialized: boolean
  initializing: Promise<void> | null
} | null = null

export function useBasicSubMode(services: Ref<AppServices | null>): UseBasicSubModeApi {
  // 单例模式：确保全局唯一状态
  if (!singleton) {
    singleton = { 
      mode: ref<BasicSubMode>('system'), 
      initialized: false, 
      initializing: null 
    }
  }

  const { getPreference, setPreference } = usePreferences(services)

  // 异步初始化：从存储读取，带防抖
  const ensureInitialized = async () => {
    if (singleton!.initialized) return
    if (singleton!.initializing) {
      await singleton!.initializing
      return
    }
    
    singleton!.initializing = (async () => {
      try {
        const saved = await getPreference<BasicSubMode>(
          UI_SETTINGS_KEYS.BASIC_SUB_MODE, 
          'system'
        )
        singleton!.mode.value = (saved === 'system' || saved === 'user') 
          ? saved 
          : 'system'
        
        console.log(`[useBasicSubMode] 初始化完成，当前值: ${singleton!.mode.value}`)

        if (saved !== 'system' && saved !== 'user') {
          await setPreference(UI_SETTINGS_KEYS.BASIC_SUB_MODE, 'system')
          console.log('[useBasicSubMode] 首次初始化，已持久化默认值: system')
        }
      } catch (e) {
        console.error('[useBasicSubMode] 初始化失败，使用默认值 system:', e)
        try {
          await setPreference(UI_SETTINGS_KEYS.BASIC_SUB_MODE, 'system')
        } catch {
          // 忽略设置失败错误
        }
      } finally {
        singleton!.initialized = true
        singleton!.initializing = null
      }
    })()
    
    await singleton!.initializing
  }

  // 自动持久化：每次切换自动保存
  const setBasicSubMode = async (mode: BasicSubMode) => {
    await ensureInitialized()
    singleton!.mode.value = mode
    await setPreference(UI_SETTINGS_KEYS.BASIC_SUB_MODE, mode)
    console.log(`[useBasicSubMode] 子模式已切换并持久化: ${mode}`)
  }

  const switchToSystem = () => setBasicSubMode('system')
  const switchToUser = () => setBasicSubMode('user')

  return {
    basicSubMode: readonly(singleton.mode) as Ref<BasicSubMode>,
    setBasicSubMode,
    switchToSystem,
    switchToUser,
    ensureInitialized
  }
}
```

**关键设计模式**:

1. **单例模式**
   ```typescript
   let singleton: { mode: Ref<SubMode>, initialized: boolean, initializing: Promise<void> | null } | null = null
   ```
   - 确保全局唯一状态
   - 避免多实例冲突

2. **防抖初始化**
   ```typescript
   if (singleton!.initialized) return
   if (singleton!.initializing) {
     await singleton!.initializing
     return
   }
   ```
   - 避免重复初始化
   - 处理并发调用

3. **只读状态暴露**
   ```typescript
   return {
     basicSubMode: readonly(singleton.mode) as Ref<BasicSubMode>,
     // ...
   }
   ```
   - 防止外部直接修改
   - 强制通过setter更新

4. **完善的错误处理**
   ```typescript
   try {
     // 读取存储
   } catch (e) {
     // 回退到默认值
   } finally {
     singleton!.initialized = true
     singleton!.initializing = null
   }
   ```

**其他Composable**:
- `useProSubMode.ts` - 与useBasicSubMode结构相同，使用ProSubMode类型
- `useImageSubMode.ts` - 与useBasicSubMode结构相同，默认值为'text2image'

---

### 4. App.vue集成

#### 导入和状态初始化

```typescript
import {
    useBasicSubMode,
    useProSubMode,
    useImageSubMode,
    // ... 其他导入
} from '@mindsync/ui'

// 功能模式
const { functionMode, setFunctionMode } = useFunctionMode(services as any)

// 三种功能模式的子模式持久化（独立存储）
const { basicSubMode, setBasicSubMode } = useBasicSubMode(services as any)
const { proSubMode, setProSubMode } = useProSubMode(services as any)
const { imageSubMode, setImageSubMode } = useImageSubMode(services as any)
```

#### 导航栏模板

```vue
<template #core-nav>
    <NSpace :size="12" align="center">
        <!-- 功能模式选择器 -->
        <FunctionModeSelector
            :modelValue="functionMode"
            @update:modelValue="handleModeSelect"
        />

        <!-- 子模式选择器 - 基础模式 -->
        <OptimizationModeSelectorUI
            v-if="functionMode === 'basic'"
            :modelValue="basicSubMode"
            @change="handleBasicSubModeChange"
        />

        <!-- 子模式选择器 - 上下文模式 -->
        <OptimizationModeSelectorUI
            v-if="functionMode === 'pro'"
            :modelValue="proSubMode"
            @change="handleProSubModeChange"
        />

        <!-- 子模式选择器 - 图像模式 -->
        <ImageModeSelector
            v-if="functionMode === 'image'"
            :modelValue="imageSubMode"
            @change="handleImageSubModeChange"
        />
    </NSpace>
</template>
```

#### 应用启动初始化

```typescript
onMounted(async () => {
    // ... 其他初始化代码 ...

    // 根据当前功能模式，从存储恢复对应的子模式选择
    if (functionMode.value === "basic") {
        const { ensureInitialized } = useBasicSubMode(services as any);
        await ensureInitialized();
        selectedOptimizationMode.value = basicSubMode.value as OptimizationMode;
        console.log(`[App] 基础模式子模式已恢复: ${basicSubMode.value}`);
    } else if (functionMode.value === "pro") {
        const { ensureInitialized } = useProSubMode(services as any);
        await ensureInitialized();
        selectedOptimizationMode.value = proSubMode.value as OptimizationMode;
        await handleContextModeChange(
            proSubMode.value as import("@mindsync/core").ContextMode,
        );
        console.log(`[App] 上下文模式子模式已恢复: ${proSubMode.value}`);
    } else if (functionMode.value === "image") {
        const { ensureInitialized } = useImageSubMode(services as any);
        await ensureInitialized();
        console.log(`[App] 图像模式子模式已恢复: ${imageSubMode.value}`);
    }
})
```

#### 子模式切换处理

```typescript
// 基础模式子模式变更处理器
const handleBasicSubModeChange = async (mode: OptimizationMode) => {
    await setBasicSubMode(mode as import("@mindsync/core").BasicSubMode);
    selectedOptimizationMode.value = mode;
    console.log(`[App] 基础模式子模式已切换并持久化: ${mode}`);
};

// 上下文模式子模式变更处理器
const handleProSubModeChange = async (mode: OptimizationMode) => {
    await setProSubMode(mode as import("@mindsync/core").ProSubMode);
    selectedOptimizationMode.value = mode;
    
    if (services.value?.contextMode.value !== mode) {
        await handleContextModeChange(
            mode as import("@mindsync/core").ContextMode,
        );
    }
    console.log(`[App] 上下文模式子模式已切换并持久化: ${mode}`);
};

// 图像模式子模式变更处理器
const handleImageSubModeChange = async (mode: import("@mindsync/core").ImageSubMode) => {
    await setImageSubMode(mode);
    console.log(`[App] 图像模式子模式已切换并持久化: ${mode}`);
    
    // 通知 ImageWorkspace 更新
    if (typeof window !== "undefined") {
        window.dispatchEvent(new CustomEvent("image-submode-changed", { 
            detail: { mode } 
        }));
    }
};
```

---

### 5. 图像模式特殊处理

#### ImageWorkspace.vue 修改

**移除内部选择器**:
```vue
<!-- ❌ 移除前 -->
<ImageModeSelector v-model="imageMode" @change="handleImageModeChange" />

<!-- ✅ 移除后 -->
<!-- 图像模式选择器已移到导航栏 -->
```

**监听导航栏事件**:
```typescript
// 图像子模式变更事件处理器
const handleImageSubModeChanged = (e: CustomEvent) => {
  const { mode } = e.detail
  if (mode && mode !== imageMode.value) {
    console.log(`[ImageWorkspace] 接收到导航栏子模式切换事件: ${mode}`)
    handleImageModeChange(mode)
  }
}

onMounted(() => {
    window.addEventListener(
        "image-submode-changed",
        handleImageSubModeChanged as EventListener,
    );
})

onBeforeUnmount(() => {
    window.removeEventListener(
        "image-submode-changed",
        handleImageSubModeChanged as EventListener,
    );
})
```

#### useImageWorkspace.ts 修复

**问题**: 初始化时未从存储恢复 `imageMode`

**修复**:
```typescript
// 文件: packages/ui/src/composables/useImageWorkspace.ts

// 1. 导入 UI_SETTINGS_KEYS
import {
  IMAGE_MODE_KEYS,
  UI_SETTINGS_KEYS,  // ✅ 新增
  // ...
} from '@mindsync/core'

// 2. 修改 restoreSelections 方法
const restoreSelections = async () => {
  try {
    state.selectedTextModelKey = await getPreference(...)
    state.selectedImageModelKey = await getPreference(...)
    state.isCompareMode = await getPreference(...)

    // ✅ 恢复图像子模式（从全局持久化存储读取）
    const savedImageMode = await getPreference(
      UI_SETTINGS_KEYS.IMAGE_SUB_MODE,
      "text2image",
    );
    if (savedImageMode === "text2image" || savedImageMode === "image2image") {
      state.imageMode = savedImageMode;
      console.log(`[useImageWorkspace] 图像子模式已从存储恢复: ${savedImageMode}`);
    }

    await restoreTemplateSelection();
    await restoreImageIterateTemplateSelection();
  } catch (error) {
    console.warn("Failed to restore selections:", error);
  }
}
```

---

## 🔄 数据流

### 初始化流程

```
App启动
  ↓
读取 FUNCTION_MODE → 确定当前功能模式
  ↓
根据功能模式调用对应的 ensureInitialized()
  ↓
┌──────────┬──────────┬──────────┐
│  basic   │   pro    │  image   │
│  ↓       │   ↓      │   ↓      │
│ BASIC_   │  PRO_    │ IMAGE_   │
│ SUB_MODE │ SUB_MODE │ SUB_MODE │
└──────────┴──────────┴──────────┘
  ↓
恢复子模式状态 → 显示对应的选择器
```

### 切换流程

```
用户点击导航栏选择器
  ↓
触发 onChange 事件
  ↓
调用对应的 handleSubModeChange
  ↓
调用 setSubMode(newMode)
  ↓
更新内存状态 → 保存到 localStorage
  ↓
触发响应式更新 → UI自动刷新
  ↓
（图像模式）发送自定义事件通知 ImageWorkspace
```

---

## 📝 关键代码位置

| 功能 | 文件路径 | 行号范围 |
|------|----------|----------|
| 存储键定义 | `packages/core/src/constants/storage-keys.ts` | ~28-32 |
| 类型定义 | `packages/core/src/services/prompt/types.ts` | ~15-25 |
| useBasicSubMode | `packages/ui/src/composables/useBasicSubMode.ts` | 全文 |
| useProSubMode | `packages/ui/src/composables/useProSubMode.ts` | 全文 |
| useImageSubMode | `packages/ui/src/composables/useImageSubMode.ts` | 全文 |
| App.vue 导航栏 | `packages/web/src/App.vue` | ~21-49 |
| App.vue 初始化 | `packages/web/src/App.vue` | ~1566-1586 |
| App.vue 切换器 | `packages/web/src/App.vue` | ~1788-1831 |
| ImageWorkspace 事件 | `packages/ui/src/components/image-mode/ImageWorkspace.vue` | ~1441-1547 |
| useImageWorkspace 修复 | `packages/ui/src/composables/useImageWorkspace.ts` | ~282-292 |

---

## 🧪 测试验证

### 测试场景

#### 场景1: 基础模式持久化
1. 切换到基础模式
2. 选择"用户提示词优化"
3. 刷新页面
4. ✅ 验证: 基础模式仍显示"用户提示词优化"

#### 场景2: 独立性验证
1. 基础模式选择"用户提示词优化"
2. 切换到上下文模式，选择"系统提示词优化"
3. 切换回基础模式
4. ✅ 验证: 基础模式仍显示"用户提示词优化"（证明独立）

#### 场景3: 图像模式初始化修复
1. 切换到图像模式
2. 选择"图生图"
3. 刷新页面
4. ✅ 验证: 文件上传按钮正确显示

### 验证日志

成功的日志输出示例:
```
[useBasicSubMode] 初始化完成，当前值: user
[App] 基础模式子模式已恢复: user
[useProSubMode] 初始化完成，当前值: system
[App] 上下文模式子模式已恢复: system
[useImageSubMode] 初始化完成，当前值: image2image
[useImageWorkspace] 图像子模式已从存储恢复: image2image
[App] 图像模式子模式已恢复: image2image
```

---

## 🎯 实施总结

### 核心成就
1. ✅ 三个功能模式完全独立的子模式管理
2. ✅ 统一的导航栏UI体验
3. ✅ 完善的持久化和恢复机制
4. ✅ 修复了图像模式的初始化问题

### 技术亮点
1. **单例模式**: 确保全局唯一状态
2. **异步初始化**: 不阻塞应用启动
3. **自动持久化**: 用户无感知的状态保存
4. **完善的错误处理**: 回退机制保证可用性
5. **清晰的日志**: 便于调试和问题排查

### 代码质量
- **类型安全**: 完整的TypeScript类型定义
- **可维护性**: 清晰的职责分离和模块化
- **可扩展性**: 易于添加新的功能模式
- **向后兼容**: 与现有代码平滑集成

---

**文档版本**: v1.0  
**最后更新**: 2025-10-22
