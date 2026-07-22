# ADR · AI-Core 发行模型（Mode A / B / C）· W2

| 项 | 值 |
|----|-----|
| **状态** | **Accepted**（W2 拍板） |
| **日期** | 2026-07-23 |
| **波次** | portfolio-arch-upgrade-2026h2 · **W2** |
| **产品** | MindSync |
| **关联契约** | [`ai-core-distribution-contract.md`](./ai-core-distribution-contract.md) |
| **Runbook** | [`ai-core-local-sidecar-runbook.md`](./ai-core-local-sidecar-runbook.md) |
| **目标架构** | [`../ARCHITECTURE_TARGET.md`](../ARCHITECTURE_TARGET.md) |
| **组合角色** | MindSync = 提示/工作台（**非**多租户公有网关） |

---

## 1. 背景

`services/ai-core`（Python FastAPI scaffold）提供 evaluation / prompt 编排 stub。桌面经 Electron **main 网关**探测；`AI_CORE_URL` 空 = OFF（生产路径不变）。  
W1 已固定 pnpm 11.5、IPC 契约与装通后全绿。W2 需**书面拍板**三种发行模式、默认 UX、非目标，避免静默把 Python 塞进 asar 或 Docker Web。

---

## 2. 决策

**默认且当前正式模式：A · 开发者自启 sidecar。**

| 模式 | 含义 | 本仓决策 | 默认 UX |
|------|------|----------|---------|
| **A. 开发者 sidecar** | 源码/venv 本地起 uvicorn；桌面 `AI_CORE_URL=http://127.0.0.1:…` 经 main 探测 | **Accepted · 默认** | 空 URL = OFF；开发者按 runbook 自启后设 env；**终端用户安装包无 AI-Core** |
| **B. 可选捆绑** | 安装包附带解释器/二进制或可选组件 | **Deferred（W3+ 人 gate）** | 仅维护者 opt-in 实验；**禁止**默认 ON；**禁止**无选项塞进 asar |
| **C. 远程 / 容器** | 非本机或 Docker 内 AI-Core | **Rejected as default** | 桌面 client **拒绝非 loopback**；Web 镜像仍 nginx+MCP **不含** Python；远程公网路径 **非本产品角色**（网关属 TransitHub） |

**代码锚点：** `packages/desktop/config/ai-core-config.js` → `DISTRIBUTION_MODE = 'A'`；`toPublicAiCoreStatus().distributionMode === 'A'`。

---

## 3. 理由（证据）

1. **打包边界：** `packages/desktop/package.json` → `build.files` **不含** `services/ai-core` / Python runtime。  
2. **Docker 边界：** 根 `Dockerfile` **不** `COPY` AI-Core。  
3. **安全默认：** loopback-only + bearer fail-closed + URL 空 OFF → 不污染生产评测（仍走进程内 TS）。  
4. **角色边界：** 组合宪章 — MindSync 是工作台/提示优化，**不是**多租户公有 AI 网关。  
5. **成本：** Mode B 需发行链、签名、体积与升级策略；Mode C 需 auth/租户/计费 — 均超出 W2 且触红线「无回滚生产 cutover」。

---

## 4. 默认 UX（Mode A）

| 角色 | 路径 |
|------|------|
| **终端用户** | 安装 Desktop → **无** AI-Core；评测/优化 = 进程内 `@mindsync/core` TS |
| **开发者 / 维护者** | runbook 起 sidecar → `.env.local` 设 `AI_CORE_URL`（可选 `AI_CORE_BEARER`）→ `pnpm --filter @mindsync/desktop dev` → preload `window.electronAPI.aiCore.getStatus()` / `.probeHealth()` / `.runEvaluation(body)` |
| **Status 面板** | `ai-core-get-status` 返回 `enabled` · `baseUrl` · `error` · `distributionMode` · `lastHealth`（probe 后缓存；**永不**含 bearer） |
| **关闭旁路** | 清空 `AI_CORE_URL` 重启 main → 回到 in-process TS |

**验收（Mode A）：** 全新开发机按 runbook 得 JSON `/health`；pytest + desktop config/client + IPC 全量绿。  
**非验收：** 终端用户「开箱即有」Python sidecar。

---

## 5. 安全契约（不变）

| 规则 | 要求 |
|------|------|
| Bind | 仅 `127.0.0.1`（默认） |
| Auth | Bearer 默认；`AI_CORE_LOCAL_DEV=1` **仅**本地脚手架 |
| Desktop | 非 loopback host → config `enabled:false` + `error` |
| Renderer | **不得**持有 bearer；preload 仅 status/health/evaluation 探测 |
| IPC | `ai-core-get-status` · `ai-core-probe-health` · `ai-core-run-evaluation` |

---

## 6. 非目标（W2 与半年红线）

- 不把 AI-Core 打进 asar / 覆盖用户装机（**人 gate** 且另开 Mode B ADR）  
- 不把 stub 接到生产 Vue 评测按钮（默认生产路径）  
- 不实现 stream/cancel/jobs 语义（后波）  
- 不 Docker 真推 / 不 publish-runtime / 不默认 redesign 生产  
- 不把 MindSync 变成公有多租户网关（TransitHub 角色）  
- 不静默从 A 切 B/C：须先改本 ADR + contract + TARGET  

---

## 7. 后果与演进

| 波 | 允许 |
|----|------|
| **W2（本波）** | ADR 冻结 A；runbook + status `lastHealth`；IPC 全绿 harden（S3 懒加载） |
| **W3** | 可选本地模型适配器（feature flag）；Mode B **仅设计/spike**；asar **人 gate** |
| **W4** | 文档收口；若 Mode B 证据充分再开独立 ADR |

**升级流程：** 改 OpenAPI → Pydantic + pytest →（若有）desktop client → 新 IPC 同步 manifest + Gate 测试。模式升级 **先文档后打包**。

---

## 8. 替代方案简表

| 方案 | 弃用原因 |
|------|----------|
| 默认 Mode B 捆绑 | 体积/签名/升级/安全面；W1–W2 无用户证据要求开箱 Python |
| 默认 Mode C 远程 | 角色越界；loopback 策略故意拒绝；密钥与多租户不在本仓 |
| 永不抽 AI-Core | 与 TARGET 绞杀地图冲突；保留 A 旁路已足够演进 |

---

**维护：** 发行模式变更时同步本 ADR、`ai-core-distribution-contract.md`、`ARCHITECTURE_TARGET.md` §4、stack-matrix「AI-Core」行。
