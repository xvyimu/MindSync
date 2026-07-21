# 五层优化 · 架构理解（开工前）

| 项 | 值 |
|----|-----|
| 日期 | 2026-07-21 |
| 基线 tip | `develop` @ `201bdee` |
| 分支 | `feature/five-layer-internal-opt` |
| 最高准则 | `docs/architecture/charter.md` + 白名单文档 |

---

## 1. 产品与边界（宪章）

- **产品**：本地优先多端提示词**工作台**（非 LLMOps、非 Agent OS）。
- **依赖方向**（不可反）：`extension|web|desktop-renderer → ui → core`；`desktop-main|mcp-server → core`。
- **ui 禁止** re-export core 工厂；**敏感能力**仅 Electron main；IPC 登记 + secure。
- **硬约束**：导出默认脱敏、Web 无 S3、auto-opt 默认关、fork-only。

## 2. 包与调用关系

```
[web / extension / desktop renderer]
        │  Vue UI + composables
        ▼
   packages/ui  ──► packages/core  (领域：LLM/Prompt/Model/History/Eval/…)
        ▲
[desktop main] ── createCoreServices + domain IPC ──► core
[mcp-server]   ── CoreServicesManager ──► core（三工具 + 结构化结果）
```

| 包 | 职责 |
|----|------|
| **core** | `services/{llm,prompt,model,template,history,evaluation,data,favorite,context,image*}`；Adapter Registry；存储端口 |
| **ui** | 工作区、组件、i18n、`useAppInitializer`（Web 全量装配 / Electron 代理） |
| **web/extension** | 壳与路由 |
| **desktop** | `main.js` composition root、`service-container`、`config/ipc/*`、safeStorage、updater |
| **mcp-server** | 工具面、校验/截断、structured-result |

## 3. 关键运行时链路

1. **优化**：UI → PromptService → LLMService → TextAdapterRegistry → Provider Adapter（SDK 懒加载 `sdk-loaders`）。  
2. **Desktop**：Renderer Proxy IPC → main domain handlers → core 实例（单容器装配）。  
3. **MCP**：CallTool → PromptService → `buildMcpStructuredResult`（截断预算）。  
4. **评估**：EvalCaseSet / structured-compare；导出 promptfoo 纯函数适配。

## 4. 与「五层」表述的映射

本仓库**不是**通用 Agent OS：

| 用户层表述 | 本项目映射 |
|------------|------------|
| 架构解耦 | 包内装配共享端口（Registry 注入），消除重复实例 |
| 代码重构 | 去重、边界/异常一致、死重复构造 |
| 记忆/工具/命令 | 历史容量、MCP 工具结果预算、优化策略预算（已有 D1/D2 口） |
| 配额性能 | 动态模型列表缓存、减少重复 Registry 构造与重复服务实例 |
| 工程 | 日志降噪、配置/文档报告 |

## 5. 已观察到的内部缺陷（优化候选）

1. **Web 装配**：`createTextAdapterRegistry()` 与 `createLLMService`/`createModelManager` 各自再建 Registry → **多份 Adapter 图**。  
2. **useAppInitializer**：`createImageUnderstandingService` **两次**（prompt + evaluation）。  
3. **Desktop/MCP**：LLM 与 ImageUnderstanding 未共享同一 Registry。  
4. **动态模型拉取**：`getDynamicModels` 无进程内短缓存 → 重复刷新易打满上游限流。  
5. **工厂日志**：`createLLMService` Electron 分支 `console.log` 噪声。

**不在范围**：改分层、新功能、新依赖、换框架、平台化。

---

**确认**：在以上理解下开始五层内部优化。
