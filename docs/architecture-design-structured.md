# MindSync · 结构化架构设计（v2）

| 项 | 值 |
|----|-----|
| 产品 | MindSync（Prompt Optimizer）· 提示词/模型工作台 |
| GitHub | [xvyimu/MindSync](https://github.com/xvyimu/MindSync) |
| 路径 | `D:\projects\MindSync` |
| 文档版本 | **v2 · 2026-07-29** |
| 状态 | Active |
| **栈权威** | **[`PROJECT.md`](./PROJECT.md)** · [`project/CURRENT.md`](./project/CURRENT.md) |
| 许可 | **AGPL-3.0-only** |

> 方法：[组合优化说明](file:///D:/orca/.planning/portfolio-architecture-design-2026-07-29/README.md) · [arc42](https://docs.arc42.org/home/) · [C4](https://c4model.com/)

---

## 0. 五问

| # | 答 |
|---|----|
| 是什么？ | 本地优先提示词优化与多模型工作台（Desktop 主） |
| 为谁？ | 提示工程师 · 重度 AI 用户 |
| 不做？ | 无 ADR 弃 Desktop；React 平行 UI；AI-Core 默认进 asar |
| 验收？ | `pnpm` test/gate · desktop test · typecheck（按改动面） |
| 协作？ | 公有仓 Issue/PR；AGPL 义务 |

---

## 1. 背景与目标

独立维护自 Prompt Optimizer 谱系；主入口 Electron 安装态；monorepo 含 Web/扩展/MCP，共享 `@mindsync/core`。

| 质量属性 | 表述 | 验证 |
|----------|------|------|
| 正确性 | 流式/工具调用契约稳定（onError 不双 toast） | core unit |
| 安全 | IPC 清单 · safeStorage · 依赖 high 关闭 | 测 + deps-sec |
| 可扩展 | 新能力进 core 再进壳 | 目录审 |
| 体积 | AI-Core 默认 OFF | 发行契约 |

---

## 2. 总体架构（C4）

### Context

```text
 [用户] → MindSync Desktop / Web / Extension / MCP 客户端
              │
              ▼
        上游 LLM API（多 provider）
```

### Container

```text
 @mindsync/ui (Vue3+Naive+Vite+Pinia)
        │
   ┌────┼────┬──────────┬─────────┐
   ▼    ▼    ▼          ▼         ▼
 desktop web extension mcp-server (可选 ai-core)
   │
   └──────► @mindsync/core (TS 领域 SSOT)
```

| 容器 | 技术 | 职责 |
|------|------|------|
| core | TS | LLM、模板、导入导出 |
| ui | Vue3 | 可复用界面 |
| desktop | Electron+builder | 主交付、IPC、更新 |
| mcp-server | Node | Agent 宿主协议 |
| ai-core | Python 可选 | 重能力旁路 |

---

## 3. 选型理由

| 选 | 因 | 不选 |
|----|----|------|
| Electron | 密钥/文件/更新 | 无 ADR 换 Tauri 主线 |
| Vue+Naive | 成熟成本低 | React 重写 |
| pnpm monorepo | 单 core 多壳 | 复制业务到 extension |
| builder ≥26.15 | 修 app-builder-lib / runtime high | 旧 9.5.1 传递链 |

---

## 4. 核心模块与接口

| 模块 | 接口要点 |
|------|----------|
| LLM stream | 回调 onError；勿随意 rethrow |
| 模板 | 中/英内置；导入导出脱敏选项 |
| IPC | manifest 白名单 |
| MCP | 与 core 版本对齐；hono 传递链 DEFER major |
| overrides | workspace 安全地板 |

---

## 5. 资产复用

| 资产 | 复用 | 禁止 |
|------|------|------|
| PO 谱系 | 能力+AGPL | 静默当 upstream bot |
| 安装态路径 | 稳定 appId | 无迁移换壳 |
| Vue UI | 续用 | 平行 React |

---

## 6. 信任边界与风险

| 边界 | 风险 | 缓解 |
|------|------|------|
| Renderer↔Main | 过度暴露 IPC | manifest |
| 依赖链 | electron-builder CVE | overrides + Dependabot |
| MCP | 传递依赖 major | DEFER 至 SDK |
| asar | 误打密钥/源码 | 发行清单 |

---

## 7. 14 天计划

| 日 | 主题 | DoD |
|----|------|-----|
| 1–2 | 文档交叉 | 与 CURRENT 一致 |
| 3–4 | deps | develop 含 high 修复；why 证明 |
| 5–7 | core 契约 | unit 绿 |
| 8–9 | desktop | test 绿 |
| 10–11 | ui tsc 债 | 独立卡或修 dual |
| 12–13 | web/mcp 冒烟 | gate |
| 14 | 收口 | 人闸合支 |

---

## 8. 验收命令（L4）

| 命令 | 用途 |
|------|------|
| `pnpm -F @mindsync/core test` / unit | 领域 |
| `pnpm -F @mindsync/desktop test` | 壳 |
| `pnpm -F @mindsync/core typecheck` | 类型 |
| `pnpm test:gate*`（若改动触发） | 仓级门 |

---

## 9. 相关文档

`PROJECT.md` · `PRODUCT-LAYERS.md` · `PROJECT_HANDOFF.md` · `ops/ms-deps-sec-evidence-2026-07-28.md` · `architecture/`

---

*v2 · 2026-07-29*
