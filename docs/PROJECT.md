# MindSync · 形态与技术栈（SSOT）

> **产品：** MindSync（历史名 Prompt Optimizer）· **GitHub：** [xvyimu/MindSync](https://github.com/xvyimu/MindSync)  
> **源码根：** `D:\MindSync\src\mindsync`（入口 `D:\projects\MindSync`）  
> **运行安装：** `D:\MindSync\app\PromptOptimizer.exe`（productName=MindSync）  
> **版本/路径活数字：** [`project/CURRENT.md`](./project/CURRENT.md)（L1）  
> 全局门闩：`~/CLAUDE.md` §8 · `~/.claude/specs/principle.md`「形态与技术栈」。  
> **本文件 = 本产品形态与唯一技术栈权威。** 细节交接见 [`PROJECT_HANDOFF.md`](./PROJECT_HANDOFF.md)。小修不重选型。

---

## 产品方案指针与验收摘要

| 项 | 链接 |
|----|------|
| **产品分层（L0–L6）** | [`PRODUCT-LAYERS.md`](./PRODUCT-LAYERS.md) |
| **形态与栈 SSOT** | 本文其余章节 |
| **组合总纲** | 本机 `D:\orca\.planning\portfolio-product-docs-program-2026-07-23\PORTFOLIO-PRODUCT-PROGRAM.md` |

**五问快答：** 身份/用户/边界见 PRODUCT-LAYERS **L0**；栈见本文；验收见 **L4**；许可与协作见 **L5** 与根 `LICENSE` / `CONTRIBUTING.md` / `SECURITY.md`。

---

## 1. 产品形态（唯一）

| 项 | 结论 |
|----|------|
| **主形态（目标）** | **桌面应用（Tauri 2）** — 本地优先的提示词/模型工作台（[ADR-0001](./adr/0001-tauri-desktop-mainline.md)，范围 **仅壳**） |
| **主形态（现行默认交付）** | **Electron** — G3 cutover 前安装包/主路径仍为 Electron；**禁止**无 G3 拆除 |
| **次形态** | **Web**（`@mindsync/web`）· **浏览器扩展** · **MCP server**（同 monorepo） |
| **交付** | Desktop 安装为主（过渡期 NSIS/asar）；Web/扩展并列，共享 `@mindsync/core` / UI |
| **不是** | 小程序、.NET 原生重写、纯无壳静态站作为唯一交付、React 平行 UI、无 ADR 双壳功能双写 |

**做 / 不做（形态级）**

| 做 | 不做 |
|----|------|
| 按 ADR-0001 / [cutover-plan](./ops/ms-tauri-cutover-plan.md) 迁壳；过渡期保留 Electron 回滚面 | 无 G1 写 Tauri 业务、无 G3 切默认交付、无 gate 拆 Electron |
| Electron 对照硬化（IPC、safeStorage、更新）直至 cutover | 无 ADR 放弃 Desktop 改纯 Web-only 产品 |
| Vue UI 包 + Web/扩展复用 | 用 React 重写 UI 平行栈 |
| 可选 Python AI-Core scaffold（默认 OFF，不进安装包） | 把 AI-Core 强行打进 asar/Tauri 默认资源 |

---

## 2. 唯一技术栈

| 层 | 技术 | 约束 |
|----|------|------|
| 包管理 / Node | **pnpm** workspace · **Node ^24** | 禁 npm/yarn 主路径 |
| 领域 | **`@mindsync/core`**（TS） | 业务能力 SSOT；AbortSignal / 模型适配 |
| UI | **Vue 3** · **Naive UI** · **Vite** · Pinia · CodeMirror | `@mindsync/ui` |
| Web | Vite 构建 · 供 Desktop `web-dist` 与 Web 部署 | |
| Desktop（目标） | **Tauri 2** · commands + 兼容 facade · 见 ADR-0001 | G3 后主交付；appId 保持 `com.xvyimu.mindsync` 身份 |
| Desktop（过渡） | **Electron** + **electron-builder** · IPC manifest 1.1.0 | G3 前默认；回滚窗内保留 |
| 扩展 | 浏览器 extension 包 | |
| MCP | `@mindsync/mcp-server` | |
| 旁路 | `services/ai-core` Python scaffold | 默认 OFF；发行契约见 ops 文档 |
| 测试 | Vitest · Playwright · 仓级 `test:gate*` | |
| 许可 | **AGPL-3.0-only**（独立维护抬头） | 无 upstream remote |

架构入口：[`architecture/`](./architecture/) · 交接：[`PROJECT_HANDOFF.md`](./PROJECT_HANDOFF.md) · 活快照：[`project/CURRENT.md`](./project/CURRENT.md)。

---

## 3. 选型理由（取舍）

- **Desktop 主交付（目标 Tauri2 / 过渡 Electron）：** 密钥/本机文件/流式/可测体积；装机路径与迁移见 cutover-plan。
- **Vue + Naive：** 仓内成熟 UI；换 React 成本高于收益（A1 **不**换 UI）。
- **core 共享：** Web/扩展/Desktop 同一领域层，避免三套 prompt 逻辑。
- **AI-Core 旁路：** 重能力可选，不绑架默认安装体积。
- **换壳纪律：** 仅 ADR-0001 授权的 Tauri 路径；禁止无 gate 第二壳功能双写；Electron 为 G3 前默认与回滚面。

---

## 4. 防漂移

1. 版本号与本机路径以 **CURRENT.md** 为准；形态与栈以 **本文** 为准。  
2. 新功能优先 core → ui → 各入口；禁止在 extension/web 复制 core 业务。  
3. 换栈/换主形态 → ADR + 更新本文与 CURRENT 链接 → 确认后实现。  
4. 独立仓：不默认恢复 linshenkx `upstream` / 不默认向上游 PR。
