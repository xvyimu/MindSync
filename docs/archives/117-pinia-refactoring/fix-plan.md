# Pinia 重构问题修复方案

**基于 Claude + Codex 联合审查**

## 📋 修复清单

### 🔴 P0 - 统一服务访问入口（改动最小）

**决策**：以 `getPiniaServices()` 为唯一业务入口

**理由**（Codex + Claude 共识）：
- 当前代码已经全部使用 `getPiniaServices()`
- 函数式风格更符合 Vue 3 Composition API
- 测试更简单（无需处理 this 上下文）
- 避免 setup store 中 this 丢失问题
- 避免后续用法分裂/新人误用

**修改点**：

#### 1. 修改 `packages/ui/src/plugins/pinia-services-plugin.ts`

```typescript
/**
 * Pinia 插件：注入 $services 到所有 Store
 *
 * ⚠️ 注意：$services 仅作为调试/兼容属性，不推荐在业务代码中使用
 *
 * **推荐使用**：
 * ```typescript
 * import { getPiniaServices } from '../plugins/pinia'
 *
 * const $services = getPiniaServices()
 * if ($services) {
 *   await $services.modelManager.getAllModels()
 * }
 * ```
 *
 * **不推荐使用**：
 * ```typescript
 * // ❌ 避免在 setup store 中使用 this.$services
 * this.$services?.modelManager.getAllModels()
 * ```
 *
 * 使用方式：
 * pinia.use(piniaServicesPlugin(servicesRef))
 */

import { type PiniaPluginContext } from 'pinia'
import type { AppServices } from '../types/services'

/**
 * Pinia 服务注入插件
 *
 * @param servicesRef - 应用服务的响应式引用
 * @returns Pinia 插件函数
 */
export function piniaServicesPlugin(servicesRef: { value: AppServices | null }) {
  return (context: PiniaPluginContext) => {
    // 注入到 store 实例
    // 注意：直接赋值 ref，Pinia 会自动解包
    // 访问 store.$services 时会自动返回 servicesRef.value
    context.store.$services = servicesRef as any
  }
}

// TypeScript 类型扩展
declare module 'pinia' {
  export interface PiniaCustomProperties {
    /**
     * 应用服务实例（调试/兼容属性，不推荐业务代码使用）
     *
     * ⚠️ 注意：
     * - 实际注入的是 Ref<AppServices | null>，但 Pinia 会自动解包
     * - 访问时直接使用 this.$services（已自动解包）
     * - 初始化时可能为 null，使用前需检查
     * - **推荐使用 getPiniaServices() 代替**
     *
     * @deprecated 推荐使用 getPiniaServices() 代替
     * @see getPiniaServices
     */
    $services: AppServices | null
  }
}
```

#### 2. 完善 `packages/ui/src/plugins/pinia.ts`

```typescript
/**
 * 获取 Pinia 服务实例
 *
 * 用于 Store 内部访问服务，这是**推荐的服务访问方式**
 *
 * **设计说明**：
 * - 这是本项目推荐的服务访问方式（工程取舍）
 * - 基于单例模式，适用于单应用场景
 * - 测试时需要使用 setPiniaServices() 设置 mock 服务
 * - 测试后需要调用 setPiniaServices(null) 清理，避免污染
 *
 * **为什么推荐使用函数而非 this.$services**：
 * - 避免 this 上下文依赖（解构调用时 this 会丢失）
 * - 更符合函数式编程风格，与 Composition API 一致
 * - 测试更简单（直接调用函数，无需 bind this）
 * - Setup Store 中不需要依赖 this，代码更清晰
 *
 * **使用示例**：
 * ```typescript
 * import { getPiniaServices } from '@/plugins/pinia'
 *
 * export const useMyStore = defineStore('myStore', () => {
 *   const loadData = async () => {
 *     const $services = getPiniaServices()
 *     if (!$services) {
 *       console.warn('Services not available')
 *       return
 *     }
 *
 *     const models = await $services.modelManager.getAllModels()
 *     // ...
 *   }
 *
 *   return { loadData }
 * })
 * ```
 *
 * @returns 应用服务实例（或 null）
 */
export function getPiniaServices(): AppServices | null {
  return servicesRef.value
}
```

**时间估计**：30分钟
**风险评估**：低（仅修改文档和注释）

---

### 🟠 P1 - 标准化测试清理机制（两者结合）

**决策**（Codex建议）：全局 afterEach 兜底 + helper 提供标准入口

#### 1. 添加全局清理（兜底机制）

**文件**：`packages/ui/tests/setup.ts`（如不存在则创建）

```typescript
import { afterEach } from 'vitest'
import { setPiniaServices } from '../src/plugins/pinia'

/**
 * 全局测试清理
 * 确保每个测试用例后都清理 Pinia 服务，避免测试污染
 */
afterEach(() => {
  setPiniaServices(null)
})
```

**配置 Vitest**（`packages/ui/vitest.config.ts`）：
```typescript
export default defineConfig({
  test: {
    setupFiles: ['./tests/setup.ts'],  // ✅ 添加这一行
    // ... 其他配置
  }
})
```

#### 2. 提供标准化 Helper

**文件**：`packages/ui/tests/utils/pinia-test-helpers.ts`（新建）

```typescript
import { createPinia, type Pinia } from 'pinia'
import { createApp } from 'vue'
import { setPiniaServices } from '../../src/plugins/pinia'
import { piniaServicesPlugin } from '../../src/plugins/pinia-services-plugin'
import type { AppServices } from '../../src/types/services'
import type { IPreferenceService } from '@mindsync/core'

/**
 * 创建 PreferenceService stub（可复用的默认实现）
 */
export function createPreferenceServiceStub(
  overrides: Partial<IPreferenceService> = {}
): IPreferenceService {
  return {
    get: async <T,>(_key: string, defaultValue: T) => defaultValue,
    set: async () => {},
    delete: async () => {},
    keys: async () => [],
    clear: async () => {},
    getAll: async () => ({}),
    exportData: async () => ({}),
    importData: async () => {},
    getDataType: async () => 'preference',
    validateData: async () => true,
    ...overrides,
  }
}

/**
 * 创建用于测试的 Pinia 实例和服务
 *
 * @param services - 可选的服务对象（默认创建基础 stub）
 * @returns { pinia, services, cleanup }
 *
 * @example
 * ```typescript
 * it('should save session', async () => {
 *   const { pinia, services, cleanup } = createTestPinia({
 *     preferenceService: createPreferenceServiceStub({
 *       set: vi.fn().mockResolvedValue(undefined)
 *     })
 *   })
 *
 *   const store = useBasicUserSession(pinia)
 *   await store.saveSession()
 *
 *   expect(services.preferenceService.set).toHaveBeenCalled()
 *   cleanup()  // 可选：手动清理（全局 afterEach 会兜底）
 * })
 * ```
 */
export function createTestPinia(
  servicesOverrides: Partial<AppServices> = {}
): {
  pinia: Pinia
  services: AppServices
  cleanup: () => void
} {
  // 创建默认服务 stub
  const defaultServices: AppServices = {
    preferenceService: createPreferenceServiceStub(),
    // 其他服务可以按需添加默认 stub
    ...servicesOverrides,
  } as AppServices

  // 创建 Pinia 实例
  const pinia = createPinia()
  pinia.use(piniaServicesPlugin({ value: defaultServices }))

  // 创建 Vue 应用（Pinia 需要）
  const app = createApp({ render: () => null })
  app.use(pinia)

  // 设置全局服务（供 getPiniaServices() 使用）
  setPiniaServices(defaultServices)

  // 提供清理函数
  const cleanup = () => {
    setPiniaServices(null)
  }

  return {
    pinia,
    services: defaultServices,
    cleanup,
  }
}

/**
 * 使用 mock 服务运行测试函数（自动清理）
 *
 * @param servicesOverrides - 服务覆盖配置
 * @param testFn - 测试函数
 *
 * @example
 * ```typescript
 * it('should work with services', async () => {
 *   await withMockPiniaServices(
 *     {
 *       preferenceService: createPreferenceServiceStub({
 *         get: vi.fn().mockResolvedValue('saved-data')
 *       })
 *     },
 *     async ({ pinia, services }) => {
 *       const store = useBasicUserSession(pinia)
 *       await store.restoreSession()
 *       // assertions...
 *     }
 *   )
 *   // 自动清理，无需手动 cleanup
 * })
 * ```
 */
export async function withMockPiniaServices(
  servicesOverrides: Partial<AppServices>,
  testFn: (ctx: { pinia: Pinia; services: AppServices }) => void | Promise<void>
): Promise<void> {
  const { pinia, services, cleanup } = createTestPinia(servicesOverrides)

  try {
    await testFn({ pinia, services })
  } finally {
    cleanup()
  }
}
```

#### 3. 更新现有测试用例（示例）

**修改前**（`packages/ui/tests/unit/pinia-services-plugin.test.ts`）：
```typescript
it('allows session store to persist via preferenceService', async () => {
  const set = vi.fn<IPreferenceService['set']>().mockResolvedValue(undefined)
  const preferenceService = createPreferenceServiceStub({ set })
  const services = { preferenceService } as unknown as AppServices

  setPiniaServices(services)  // ⚠️ 手动设置

  const servicesRef = shallowRef<AppServices | null>(services)
  const pinia = createPinia()
  pinia.use(piniaServicesPlugin(servicesRef))
  createApp({ render: () => null }).use(pinia)

  const store = useBasicUserSession(pinia)
  store.updatePrompt('hello')
  await store.saveSession()

  expect(set).toHaveBeenCalledTimes(1)
  // ⚠️ 没有清理
})
```

**修改后**（使用 helper）：
```typescript
import { createTestPinia, createPreferenceServiceStub } from '../utils/pinia-test-helpers'

it('allows session store to persist via preferenceService', async () => {
  const set = vi.fn<IPreferenceService['set']>().mockResolvedValue(undefined)

  const { pinia, services } = createTestPinia({
    preferenceService: createPreferenceServiceStub({ set })
  })

  const store = useBasicUserSession(pinia)
  store.updatePrompt('hello')
  await store.saveSession()

  expect(set).toHaveBeenCalledTimes(1)
  // ✅ 全局 afterEach 会自动清理，无需手动 cleanup
})
```

**或使用 withMockPiniaServices**（更简洁）：
```typescript
import { withMockPiniaServices, createPreferenceServiceStub } from '../utils/pinia-test-helpers'

it('allows session store to persist via preferenceService', async () => {
  const set = vi.fn<IPreferenceService['set']>().mockResolvedValue(undefined)

  await withMockPiniaServices(
    { preferenceService: createPreferenceServiceStub({ set }) },
    async ({ pinia }) => {
      const store = useBasicUserSession(pinia)
      store.updatePrompt('hello')
      await store.saveSession()

      expect(set).toHaveBeenCalledTimes(1)
    }
  )
  // ✅ 自动清理
})
```

**时间估计**：2小时
**风险评估**：低（改进测试基础设施）

---

### 🟡 P2 - useTemporaryVariables 依赖检查（显式错误）

**决策**（Codex建议）：显式检测并抛出清晰错误

#### 修改 `packages/ui/src/composables/variable/useTemporaryVariables.ts`

```typescript
import { readonly, type Ref } from 'vue'
import { storeToRefs, getActivePinia } from 'pinia'
import { useTemporaryVariablesStore } from '../../stores/temporaryVariables'

/**
 * 临时变量管理 Composable
 *
 * 特性：
 * - 仅内存存储（刷新丢失）
 * - 对外接口保持不变（兼容旧调用方）
 * - 底层由 Pinia store 承载状态
 *
 * ⚠️ 使用前提：
 * 必须在应用入口已执行 `installPinia(app)` 后再调用。
 * 如果在非组件上下文（如纯函数/服务层）使用，会抛出错误。
 *
 * @throws {Error} 如果 Pinia 未安装或无 active pinia instance
 *
 * @example
 * ```typescript
 * // ✅ 正确：在组件或 setup 函数中使用
 * export default defineComponent({
 *   setup() {
 *     const tempVars = useTemporaryVariables()
 *     tempVars.setVariable('name', 'value')
 *   }
 * })
 *
 * // ❌ 错误：在模块顶层或纯函数中使用
 * const tempVars = useTemporaryVariables()  // 会抛出错误
 * ```
 */
export function useTemporaryVariables(): TemporaryVariablesManager {
  // ✅ Codex 建议：显式检测 active pinia
  const activePinia = getActivePinia()
  if (!activePinia) {
    throw new Error(
      '[useTemporaryVariables] Pinia not installed or no active pinia instance. ' +
      'Make sure you have called installPinia(app) before using this composable, ' +
      'and you are calling it within a component setup or after app is mounted.'
    )
  }

  const store = useTemporaryVariablesStore()
  const { temporaryVariables } = storeToRefs(store)

  return {
    temporaryVariables: readonly(temporaryVariables) as Readonly<
      Ref<Record<string, string>>
    >,
    setVariable: store.setVariable,
    getVariable: store.getVariable,
    deleteVariable: store.deleteVariable,
    clearAll: store.clearAll,
    hasVariable: store.hasVariable,
    listVariables: store.listVariables,
    batchSet: store.batchSet,
    batchDelete: store.batchDelete,
  }
}
```

**可选升级**（如果有非组件上下文需求）：
```typescript
/**
 * @param pinia - 可选的 Pinia 实例（用于非组件上下文）
 */
export function useTemporaryVariables(pinia?: Pinia): TemporaryVariablesManager {
  // 如果提供了 pinia，使用它；否则获取 active pinia
  const targetPinia = pinia || getActivePinia()

  if (!targetPinia) {
    throw new Error(
      '[useTemporaryVariables] Pinia not installed or no active pinia instance. ' +
      'Either call installPinia(app) first, or provide a pinia instance explicitly.'
    )
  }

  const store = useTemporaryVariablesStore(targetPinia)
  // ... 其余代码相同
}
```

**时间估计**：30分钟
**风险评估**：极低（只是增加错误检查）

---

## 🟢 P3 - 其他改进（可选）

### 1. 添加 ESLint 规则（防止 barrel exports 循环依赖）

**文件**：`.eslintrc.js` 或 `packages/ui/.eslintrc.js`

```javascript
module.exports = {
  // ... 其他配置
  rules: {
    'no-restricted-imports': [
      'error',
      {
        patterns: [
          {
            group: ['**/stores', '**/stores/index'],
            message: '请直接导入具体的 store 文件，避免 barrel exports 循环依赖。例如：import { useSessionManager } from "@/stores/session/useSessionManager"'
          }
        ]
      }
    ]
  }
}
```

**时间估计**：15分钟
**风险评估**：低

### 2. 增强 MessageChainMap 迁移逻辑

**文件**：`packages/ui/src/composables/prompt/useConversationOptimization.ts`

```typescript
// ❌ 旧实现（字符串分割）
const messageId = key.split(':')[1]

// ✅ 新实现（正则匹配）
const PREFIX_PATTERN = /^(system|user):(.+)$/
for (const [key, chainId] of Object.entries(persistedMap)) {
  const match = key.match(PREFIX_PATTERN)
  if (match) {
    const messageId = match[2]  // ✅ 保留完整的 messageId
    messageChainMap.value.set(messageId, chainId)
  } else {
    // 已经是新格式，直接使用
    messageChainMap.value.set(key, chainId)
  }
}
```

**时间估计**：30分钟
**风险评估**：低（增加单元测试验证）

### 3. 引入错误监控

**文件**：`packages/ui/src/utils/error-tracker.ts`（新建）

```typescript
/**
 * 错误追踪工具
 *
 * 可以集成 Sentry、Bugsnag 等服务
 */
export interface ErrorContext {
  context: string
  [key: string]: any
}

export function captureError(error: Error | unknown, context?: ErrorContext) {
  // 开发环境：打印到控制台
  if (import.meta.env.DEV) {
    console.error('[ErrorTracker]', context, error)
  }

  // 生产环境：发送到错误监控服务
  // if (import.meta.env.PROD) {
  //   Sentry.captureException(error, { extra: context })
  // }
}
```

**时间估计**：1天（含集成第三方服务）
**风险评估**：低

---

## 📅 实施计划

### 第1天（P0 + P1）

- [ ] **上午**（2小时）
  - [ ] 修改 `pinia-services-plugin.ts` 文档（30分钟）
  - [ ] 完善 `pinia.ts` 文档（30分钟）
  - [ ] 创建 `tests/setup.ts` 全局清理（15分钟）
  - [ ] 创建 `tests/utils/pinia-test-helpers.ts`（45分钟）

- [ ] **下午**（2小时）
  - [ ] 更新现有测试用例使用 helper（1.5小时）
  - [ ] 运行测试验证（30分钟）

### 第2天（P2 + P3）

- [ ] **上午**（1小时）
  - [ ] 修改 `useTemporaryVariables.ts` 添加检查（30分钟）
  - [ ] 运行测试验证（30分钟）

- [ ] **下午**（可选，1小时）
  - [ ] 添加 ESLint 规则（15分钟）
  - [ ] 增强迁移逻辑（30分钟）
  - [ ] 最终测试和文档更新（15分钟）

**总计时间**：5-6小时（P0+P1+P2 必做）

---

## ✅ 验收标准

### P0 - 服务访问入口

- [ ] 所有文档统一推荐 `getPiniaServices()`
- [ ] `$services` 标记为 `@deprecated`
- [ ] 代码审查确认无新增 `this.$services` 使用

### P1 - 测试清理

- [ ] 全局 `afterEach` 清理已配置
- [ ] `pinia-test-helpers.ts` 已创建并导出
- [ ] 至少2个测试用例已使用新 helper
- [ ] 所有测试通过（194/194）

### P2 - 依赖检查

- [ ] `useTemporaryVariables` 添加 `getActivePinia()` 检查
- [ ] 错误信息清晰友好
- [ ] 单元测试验证错误抛出场景

### P3 - 可选改进

- [ ] ESLint 规则已添加（可选）
- [ ] 迁移逻辑已增强（可选）

---

## 🎯 预期收益

1. **消除团队困惑**：统一服务访问规范，新人不再迷惑
2. **提升测试质量**：标准化 helper 减少重复代码，全局清理防污染
3. **改进错误提示**：明确的错误信息加快问题排查
4. **降低维护成本**：清晰的代码规范和工具支持

---

**制定人**：Claude Code + Codex AI
**审核人**：待定
**实施人**：待定
**完成日期**：建议本周内完成 P0+P1，下周完成 P2
