# AI-Core 发行契约（Distribution Contract）

| 项 | 值 |
|----|-----|
| **状态** | 契约冻结（文档）· 实现仍为 scaffold/stub · **W2 ADR Accepted Mode A** |
| **日期** | 2026-07-23 |
| **服务路径** | `services/ai-core/` |
| **桌面旁路** | `AI_CORE_URL` 默认空（OFF） |
| **OpenAPI** | `services/ai-core/openapi/*.v0.yaml`（`x-status: draft`） |
| **目标架构** | [`../ARCHITECTURE_TARGET.md`](../ARCHITECTURE_TARGET.md) |
| **W2 ADR** | [`adr-ai-core-distribution-w2.md`](./adr-ai-core-distribution-w2.md)（Mode A/B/C 拍板） |

---

## 1. 选定模式：**A · 开发者自启 sidecar**

| 选项 | 含义 | 本仓决策 |
|------|------|----------|
| **A. 开发者自启 sidecar** | 源码/venv 本地启动；桌面经 main 网关探测 | **当前正式模式（W2 ADR Accepted）** |
| B. Versioned sidecar bundle | 安装包附带解释器/二进制 | **Deferred**（W3+ 人 gate；禁止默认 ON） |
| C. 容器内 / 远程 AI-Core | Docker 或非 loopback | **Rejected as default**；Web 镜像仍只含 nginx+MCP；桌面拒非 loopback |

**理由与 UX 全文：** [`adr-ai-core-distribution-w2.md`](./adr-ai-core-distribution-w2.md)

**理由（证据）：**

- 桌面 `package.json` → `build.files` **不含** `services/ai-core` 或 Python 运行时。
- 根 `Dockerfile` **不** `COPY` `services/ai-core`。
- `pnpm-workspace.yaml` 仅 `packages/*`；CI `test.yml` 以 Node/pnpm 为主（Python 测试为本地/后续 CI 扩展）。
- 旁路已具备：loopback-only + bearer fail-closed + 默认 OFF → 不污染生产路径。
- 组合角色：MindSync = 提示/工作台，**非**公有多租户网关。

---

## 2. 发行矩阵

| 产物 | 是否包含 AI-Core | 用户如何得到 `/health` |
|------|------------------|------------------------|
| **Desktop 安装包 (asar/NSIS)** | 否 | 不包含；需开发者按 README 自启 stub 并设 `AI_CORE_URL` |
| **Docker Web 镜像** | 否 | 不包含；镜像职责是静态 Web + MCP |
| **源码 monorepo** | 是（源码树） | `cd services/ai-core && … uvicorn …` 见服务 README |
| **生产 UI 评测路径** | 不经过 AI-Core | 进程内 `@mindsync/core` TS（flag OFF） |

---

## 3. 运行与安全契约

| 规则 | 要求 |
|------|------|
| Bind | **仅** `127.0.0.1`（禁止非 loopback 作为默认） |
| Auth | 默认 `Authorization: Bearer`；`AI_CORE_BEARER` 可钉死 token |
| Local dev | `AI_CORE_LOCAL_DEV=1` 可跳过 bearer — **禁止**生产/共享主机使用 |
| Desktop env | `AI_CORE_URL` 非空才启用 client；非 loopback host **拒绝** |
| Renderer | **不得**持有 bearer；preload 只暴露 status/health/evaluation 探测 API |
| IPC 通道 | `ai-core-get-status` · `ai-core-probe-health` · `ai-core-run-evaluation`（manifest + Gate 扫描） |
| Status 字段 | `enabled` · `baseUrl` · `error` · `distributionMode: 'A'` · `lastHealth`（probe 缓存；无 bearer） |
| 未接线 | `/v1/prompt/optimize` 有 stub **无**桌面 client/IPC（后波） |

---

## 4. 支持的健康检查（模式 A）

**最短步骤（推荐入口）：** [`ai-core-local-sidecar-runbook.md`](./ai-core-local-sidecar-runbook.md)

```bash
# 1) 安装与启动（仓库根或 services/ai-core）
cd services/ai-core
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -e ".[dev]"
set AI_CORE_LOCAL_DEV=1   # 仅本地
uvicorn ai_core.main:app --host 127.0.0.1 --port 8091

# 2) 健康
curl -s http://127.0.0.1:8091/health
# 或: node packages/desktop/scripts/ai-core-smoke.cjs

# 3) 契约测试（无需 Electron UI）
python -m pytest services/ai-core/tests
node --test packages/desktop/config/ai-core-config.test.js packages/desktop/config/ai-core-client.test.js
node --test scripts/desktop-ipc-handlers.test.mjs
```

**验收定义（模式 A）：** 全新开发机按上述命令得到 JSON health；Python 与桌面 config/client 单测绿；IPC Gate 含三条 AI-Core 通道。  
**非验收：** 终端用户安装 Desktop 后「开箱即有」Python sidecar。

---

## 5. CI / 工作区边界（现状与目标）

| 面 | 现状 | 目标（后波，不阻塞本契约） |
|----|------|----------------------------|
| pnpm workspace | 仅 `packages/*` | 可保持；AI-Core 用独立 Python 工具链 |
| GitHub `test.yml` | Node/pnpm | 增加 Python setup + pytest + OpenAPI lint |
| Docker build | Node 22 镜像构建 Web+MCP | 与 engines `^24` 对齐；**仍不含** AI-Core 除非改模式为 C |
| Desktop pack | 无 Python | 保持；除非升级到模式 B |

---

## 6. 明确不做（本契约）

- 不把 AI-Core 打进 asar / 覆盖用户装机。
- 不把 stub 接到生产 Vue 评测按钮。
- 不实现 stream/cancel/jobs 语义（地图已列，后波）。
- 不在本波改 Docker 发布目标账号密钥或真 push 镜像。

---

## 7. 变更流程

1. 改 OpenAPI draft → 同步 Pydantic + Python 测试 +（若有）桌面 client。
2. 新增 IPC 通道 → 更新 `channel-manifest.js` + `ai-core-handlers.js` + `preload.js` + **`scripts/desktop-ipc-handlers.test.mjs` 扫描源**。
3. 若要将模式升级为 B/C → 先改本文与 `ARCHITECTURE_TARGET.md`，再改打包/Dockerfile，禁止静默塞进安装包。
