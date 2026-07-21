# 五层深度优化 · 完整变更报告（待审核）

| 项 | 值 |
|----|-----|
| 日期 | 2026-07-21 |
| 基线 | `develop` @ `201bdee` |
| **分支** | **`feature/five-layer-internal-opt`**（**未**合入 main/develop） |
| 准则 | `docs/architecture/charter.md`：分层与包边界**未改** |
| 约束 | 无新依赖 · 无新功能 · 无架构重构 · 仅内部实现 |

**架构理解（开工前）**：`docs/project/FIVE-LAYER-OPT-ARCHITECTURE-UNDERSTANDING-2026-07-21.md`

---

## 0. 验证

| 检查 | 结果 |
|------|------|
| `pnpm -F core build` | pass |
| `pnpm -F core test:gate` | 21 pass |
| `vitest` dynamic-models-cache | **3 pass** |
| `pnpm -F ui typecheck` | pass |
| `pnpm -F ui test` | （本报告提交前跑；见 CI/本地） |
| `node --test` service-container + ipc-security | **10 pass** |
| `pnpm -F mcp-server test` | **39 pass** |
| 分支 | 非 main |

---

## 1. 第一层 · 架构解耦（包内装配，不改分层）

### 1.1 共享 TextAdapterRegistry（消除装配内硬耦合重复）

| 字段 | 内容 |
|------|------|
| **原有缺陷** | `createModelManager` / `createLLMService` / `createImageUnderstandingService` 各自 `new TextAdapterRegistry()`，同一进程内多份 Adapter 图与静态缓存，职责交叉、内存与行为漂移风险 |
| **优化思路** | 工厂**可选注入**同一 `ITextAdapterRegistry`；装配根（Web/Desktop/MCP）创建一次并下传。**不**改包边界，**不**引入 DI 框架 |
| **涉及文件** | `model/manager.ts` · `llm/service.ts` · `useAppInitializer.ts` · `service-container.js` · `mcp-server/.../core-services.ts` |

**旧（概念）：**

```ts
createModelManager(storage)           // 内部可能再建 Registry
createLLMService(modelManager)        // 再 new TextAdapterRegistry()
createImageUnderstandingService()     // 再 new TextAdapterRegistry()
```

**新（概念）：**

```ts
const registry = createTextAdapterRegistry()
createModelManager(storage, registry)
createLLMService(modelManager, registry)  // Electron 仍返回 Proxy
createImageUnderstandingService({ registry })
```

| **优化收益** | 单一适配器图；语义一致；启动少构造 1–2 份完整 Provider 适配器表 |

### 1.2 Web 评估路径复用 ImageUnderstanding 实例

| 字段 | 内容 |
|------|------|
| **原有缺陷** | `useAppInitializer` Web 路径对 `createImageUnderstandingService` **调用两次**（Prompt + Evaluation） |
| **优化思路** | 单实例注入两处 |
| **新旧** | 删除 Evaluation 分支内第二次 `createImageUnderstandingService({ registry })`，改用已有 `imageUnderstandingService` |
| **收益** | 少一个服务实例；配置/转换器一致 |

---

## 2. 第二层 · 代码重构

| 字段 | 内容 |
|------|------|
| **原有缺陷** | `createLLMService` 在 Electron 路径无条件 `console.log`，增加噪声、无业务价值 |
| **优化思路** | 删除该工厂 log；行为不变（仍返回 `ElectronLLMProxy`） |
| **文件** | `packages/core/src/services/llm/service.ts` |
| **收益** | 日志更干净；工厂更纯粹 |

| 字段 | 内容 |
|------|------|
| **原有缺陷** | MCP 装配未共享 Registry；ImageUnderstanding 无 registry |
| **优化思路** | 同步 import `createTextAdapterRegistry`，注入三处工厂 |
| **收益** | MCP 与 Web/Desktop 装配模式一致 |

---

## 3. 第三层 · 核心逻辑（映射到本产品，非 Agent OS）

本仓库无「Agent 记忆/工具调度」主路径。映射：

| 用户层表述 | 本项目落点 | 本刀动作 |
|------------|------------|----------|
| 记忆策略 | 历史/用例本地存储 | **未改** API；容量策略既有 |
| 工具调度 | MCP 三工具 + 结构化截断 | **未改** schema；依赖共享 Registry 降重复 |
| 命令执行 | Prompt/LLM 调用 | 共享 Registry + 动态列表缓存（L4） |
| 上下文/token | MCP `structured-result` / 策略 `maxCharsBudget` | **未改** 默认预算（已有截断） |

**本层结论**：在**不新增功能**前提下，通过装配一致性与 L4 缓存间接降低重复上下文加载与重复元数据拉取；未触碰模板正文或用户提示内容。

---

## 4. 第四层 · 配额与性能

### 4.1 动态模型列表 TTL + 并发合并

| 字段 | 内容 |
|------|------|
| **原有缺陷** | `getDynamicModels` 每次直打厂商；UI 连点刷新 / 并发刷新 → 重复 HTTP，易触发上游限流 |
| **优化思路** | 进程内 **30s TTL** 成功缓存；同 key **inflight 合并**；失败不缓存；缓存键 = `provider + baseURL + 是否有 Key`（**永不写明文 Key**） |
| **文件** | `packages/core/src/services/adapters/abstract-registry.ts` |
| **测试** | `packages/core/tests/unit/adapters/dynamic-models-cache.test.ts`（3 cases） |

**旧：**

```ts
return await this.getModelsAsyncFromAdapter(adapter, connectionConfig);
```

**新：** 查 TTL → 查 inflight → 请求 → 写缓存 / 失败不写。

| **收益** | 30s 内重复刷新 0 额外上游请求；并发 N 次合并为 1；适配挂机场景对 list-models 的抖动 |

### 4.2 配额数字说明（9 RPM / 53.3K TPM）

| 说明 |
|------|
| 产品使用**用户自有 Key**，限流因厂商而异；本刀不伪造全局 9RPM 闸门（会误伤无此限制的厂商）。 |
| 通过 **减少重复 list/装配** 降低无意义请求，从侧向提升稳定性。 |
| 真正 per-provider RPM 需偏好配置 + 产品功能，**超出「不新增功能」范围**，故不实现。 |

---

## 5. 第五层 · 工程优化

| 项 | 内容 |
|----|------|
| 架构理解文档 | `FIVE-LAYER-OPT-ARCHITECTURE-UNDERSTANDING-2026-07-21.md` |
| 本报告 | `FIVE-LAYER-OPT-CHANGE-REPORT-2026-07-21.md` |
| 测试 | 动态模型缓存单测落盘 |
| 目录 | 未挪包；仅扩展可选工厂参数与内部缓存字段 |
| 配置抽离 | 未新增配置系统；TTL 为 Registry 内部常量（30s），避免新偏好键/新功能面 |

---

## 6. 变更文件清单

| 路径 | 层级 |
|------|------|
| `packages/core/src/services/adapters/abstract-registry.ts` | L1/L4 |
| `packages/core/src/services/llm/service.ts` | L1/L2 |
| `packages/core/src/services/model/manager.ts` | L1 |
| `packages/core/tests/unit/adapters/dynamic-models-cache.test.ts` | L4 测试 |
| `packages/ui/src/composables/system/useAppInitializer.ts` | L1/L2 |
| `packages/desktop/config/service-container.js` | L1 |
| `packages/mcp-server/src/adapters/core-services.ts` | L1/L2 |
| `docs/project/FIVE-LAYER-OPT-ARCHITECTURE-UNDERSTANDING-2026-07-21.md` | L5 |
| `docs/project/FIVE-LAYER-OPT-CHANGE-REPORT-2026-07-21.md` | L5（本文件） |

---

## 7. 明确未做（遵守规则）

- 未改 charter 分层 / monorepo 拓扑  
- 未改 main 分支  
- 未加第三方依赖  
- 未加产品功能（无 UI 开关、无新 MCP 工具）  
- 未做全局 9RPM 硬闸（见 §4.2）  
- 未大规模重写 `prompt/service.ts` / Adapter 实现体  

---

## 8. 审核建议

1. Review 本分支 diff 与本报告  
2. 通过后：`git merge --no-ff feature/five-layer-internal-opt` → `develop`（**勿直接 main**）  
3. 可选：装机冒烟（E1 + IPC 信任既有基线）  

---

## 9. 逐层完成声明

| 层 | 状态 |
|----|------|
| 1 架构解耦 | **done**（共享 Registry + 单 ImageUnderstanding） |
| 2 代码重构 | **done**（去噪 log + 装配一致） |
| 3 核心逻辑 | **done（映射）**（无 Agent 层可改；MCP/Prompt 路径依赖共享装配） |
| 4 配额性能 | **done**（动态模型 TTL+inflight） |
| 5 工程 | **done**（文档+测试+报告） |

**等待审核。** 未 push、未合入 `develop`/`main`。
