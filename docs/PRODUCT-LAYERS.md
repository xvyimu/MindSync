# MindSync · 产品分层方案（PRODUCT-LAYERS）

> **组合总纲：** `D:\orca\.planning\portfolio-product-docs-program-2026-07-23\PORTFOLIO-PRODUCT-PROGRAM.md`  
> **形态与栈 SSOT：** [`PROJECT.md`](./PROJECT.md) · 活数字 [`project/CURRENT.md`](./project/CURRENT.md)  
> **tip：** `5d00d21` · 视觉 **Atelier** `?glassShell=1` **默认 OFF**

---

## L0 · 产品身份

| 项 | 内容 |
|----|------|
| **一句话** | **本地优先** 的提示词 / 模型 **工作台**（Desktop 主交付，Web/扩展/MCP 并列）。 |
| **核心问题** | 如何在可控、可硬化的桌面环境中高效编写、优化与管理提示词与多模型配置。 |
| **主用户** | **提示工程师 / 重度 AI 用户** · 需要本地密钥与 IPC 边界的开发者 |
| **明确不做** | 无 ADR 弃 Desktop 改纯 Web-only · React 重写 UI 平行栈 · AI-Core 默认打进 asar · glass 默认开/无授权 asar 重打 |
| **价值** | monorepo 复用 core/ui · 可 AGPL 二次分发（义务）· 桌面硬化路径清晰 |

---

## L1 · 形态与栈

见 PROJECT：pnpm · Node 24 · Vue3 · Naive · Electron · Vitest/Playwright · **AGPL-3.0-only**。

---

## L2 · 运行与边界

| 项 | 内容 |
|----|------|
| 源码 | `D:\MindSync\src\mindsync` |
| 装机 | `D:\MindSync\app\`（仓外布局见外层 LAYOUT） |
| 入口 | `D:\projects\MindSync` |
| 预览 | web `127.0.0.1:18181` · glass 仅 query/localStorage |
| 密钥 | safeStorage / env · 不进 git |

---

## L3 · 架构与扩展

| 包 | 职责 |
|----|------|
| `@mindsync/core` | 领域与模型适配 SSOT |
| `@mindsync/ui` | Vue 工作台 UI · Paper/Atelier |
| `@mindsync/web` | Web 构建 / Desktop 加载 |
| `@mindsync/desktop` | Electron · IPC manifest |
| extension / mcp-server | 并列入口 |
| ai-core | Python scaffold · **默认 OFF** |
| 扩展点 | 模型 provider · 模板 · MCP 工具 |
| **禁止** | 无门闩第二 UI 框架 · 绕过 IPC 信任边界 |

---

## L4 · 验收与质量

| 命令 | 用途 |
|------|------|
| `pnpm test` / `test:gate*` | 仓级门闩 |
| Desktop IPC 单测 | 安全相关必跑 |
| 视觉 | 默认路径无 glass；flag 路径不挡主功能 |

---

## L5 · 协作与合规

| 项 | 内容 |
|----|------|
| 许可 | **AGPL-3.0-only** · 独立维护抬头 |
| 安全 | 根 `SECURITY.md` |
| 贡献 | 根 [`CONTRIBUTING.md`](../CONTRIBUTING.md) |

---

## L6 · 路线图与维护

| 周期 | 内容 |
|------|------|
| 近 | Desktop 硬化与依赖健康 · 文档 CURRENT tip |
| 中 | AI-Core 发行模型清晰化（仍默认 OFF） |
| 远 | 多入口体验一致 · 性能（大文档/编辑器） |
| 节奏 | Issue/PR 欢迎 · 发版走 CURRENT 双层 SSOT |

---

## 文档地图

PROJECT · PRODUCT-LAYERS · project/CURRENT · PROJECT_HANDOFF · ops/glass-shell-* · SECURITY
