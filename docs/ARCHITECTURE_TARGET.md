# MindSync · 架构目标态（Target）

| 项 | 值 |
|----|-----|
| **产品** | MindSync（独立仓 `xvyimu/MindSync` · AGPL-3.0-only） |
| **版本锚点** | 2.11.7 · 主线 `develop` |
| **文档日** | 2026-07-22 |
| **角色** | P1 目标边界（非实现清单） |
| **As-Is** | [`ARCHITECTURE_ASIS.md`](./ARCHITECTURE_ASIS.md) |
| **AI-Core 抽离地图** | [`phase2-ai-core-extract-map.md`](./phase2-ai-core-extract-map.md) |
| **发行契约** | [`ops/ai-core-distribution-contract.md`](./ops/ai-core-distribution-contract.md) |
| **总规划 SSOT** | `D:\orca\docs\architecture-stack-refactor-master-2026-07-22.md` · 决策 #6 |

> 描述 **目标边界与禁止项**。不授权本轮切生产流量、不默认开 redesign、不把 stub 当生产。

---

## 0. 一句话

**面板已 Vue 不动**；**Electron 主进程仍是桌面信任边界**；**AI 编排/评测逐步绞杀到 Python `services/ai-core`（默认 OFF 旁路）**；Web 静态与 MCP 仍以现有 Node 路径为主；**不**为 MindSync 引入 Go 网关或换前端框架。

---

## 1. 目标运行时拓扑

```
[ Vue3 + NaiveUI 面板 ]          ← 冻结；redesign shell 默认 OFF
         │ IPC (secure)
[ Electron Main 网关 ]           ← 密钥 / loopback 旁路 / 本地存储
         │
         ├─ 仍留 TS：storage, preference, history, template CRUD,
         │           image gen, jsdiff compare, LLM adapters（热路径）
         │
         └─ HTTP (loopback + bearer) ──► services/ai-core (Python)
                                            evaluation / prompt 编排 stub→实装
                                            未来：stream / cancel / jobs

[ Web / Extension ]  → ui → core（浏览器内；敏感能力不直连 AI-Core 端口）
[ MCP (Node) ]       → core；可旁挂 AI-Core（后波）
[ Docker Web 镜像 ]  → nginx 静态 + MCP；**不含** Python AI-Core（见发行契约）
```

---

## 2. 分层目标

| 层 | 目标 | 本期约束 |
|----|------|----------|
| **Console** | 保持 Vue3 + NaiveUI + Paper | 禁止换栈；redesign 默认 OFF，促销需证据清单 |
| **Desktop shell** | Electron main/preload 为唯一桌面信任边界 | Vue **不**直连 `127.0.0.1:8091`；Bearer 不进 renderer |
| **Domain TS** | `@mindsync/core` 逐步瘦身 | 存储/偏好/历史/图像热路径留 TS |
| **AI-Core** | Python FastAPI · OpenAPI draft → 可部署 sidecar | 默认 OFF；开发者自启；**不**打进 asar |
| **Web Docker** | 可复现的静态 + MCP 镜像 | 镜像名与身份一致（见 §4）；Node 版本与 engines 对齐为后波 |
| **数据** | 本地优先 | 批跑 SQL 若引入则为增量，不替换 Dexie/userData |

---

## 3. 安全与信任边界（目标保持）

1. **Sender 校验**：域 IPC 经 `registerSensitiveIpc` / `secureHandle`。
2. **AI-Core**：仅 loopback；`AI_CORE_BEARER` 只在 main/sidecar 环境；`AI_CORE_LOCAL_DEV=1` 仅本地脚手架。
3. **密钥**：模型 API Key 不进浏览器 `config.js`；Docker public 配置白名单。
4. **默认路径**：`AI_CORE_URL` 空 → 评测/优化仍走进程内 TS（生产不变）。

---

## 4. 发行边界（摘要）

| 产物 | 含 AI-Core？ | 说明 |
|------|--------------|------|
| Desktop NSIS / asar | **否** | `files` 仅 main/preload/config/icons/web-dist/node_modules |
| Docker Web 镜像 | **否** | nginx + MCP；Python 服务不在此镜像 |
| 开发者 sidecar | **是（可选）** | `services/ai-core` 自启；见发行契约 |

**容器镜像身份（目标决策，本波文档化）：**

- **正式目标镜像名（MindSync 自建）：** `xvyimu/mindsync`（Docker Hub 或 GHCR，维护者启用发布后再 push）。
- **历史/上游镜像名：** `linshen/prompt-optimizer` — 仅作 AGPL 衍生生态中的**上游对照物**；**不是** MindSync 产品承诺的官方发行名。
- 在官方 `xvyimu/mindsync` 发布流水线启用前：README/compose 必须标明「源码构建」或「上游对照镜像」，禁止把上游镜像写成 MindSync 官方发布。

完整条文：[`ops/ai-core-distribution-contract.md`](./ops/ai-core-distribution-contract.md) · 身份：[`../GITHUB_IDENTITY.md`](../GITHUB_IDENTITY.md)。

---

## 5. 明确禁止（Won't）

- 把 Vue 面板改为其他框架，或默认打开 redesign flag 无证据 cutover。
- 将 stub AI-Core 接入生产 UI 流量，或绕过 Electron 主进程直连 sidecar。
- 覆盖用户装机 asar 做「真发布」热替换（维护者本机实验除外，且不写进产品路径）。
- 恢复 `upstream` git remote 或默认向上游开 PR（除非维护者书面决定）。
- 删除 `LICENSE`/`NOTICE` 归属或改成非 AGPL 暗示。
- 大范围 redesign 实现塞进本波；文档/清单可以，代码 cutover 不行。

---

## 6. 验收锚点（目标态里程碑，非本波全部完成）

| 里程碑 | 信号 |
|--------|------|
| M0 脚手架 | OpenAPI draft + stub + bearer/loopback + desktop flag OFF（**已有**） |
| M1 契约绿 | IPC Gate 含 AI-Core 通道；Python pytest 绿；文档身份一致（**本波**） |
| M2 可消费 | prompt optimize 桌面 client + 同 fixture 跨 OpenAPI/Python/IPC（后波） |
| M3 影子 | TS vs Python dual-run shadow，flag 仍默认 OFF（后波） |
| M4 发行 | 选定 sidecar 或 bundle；CI 含 pytest/OpenAPI；健康检查一条命令（后波） |

---

## 7. 相关文档

- As-Is：[`ARCHITECTURE_ASIS.md`](./ARCHITECTURE_ASIS.md)
- 抽离地图：[`phase2-ai-core-extract-map.md`](./phase2-ai-core-extract-map.md)
- AI-Core README：[`../services/ai-core/README.md`](../services/ai-core/README.md)
- 品牌素材：[`brand-assets.md`](./brand-assets.md)
- 现行快照：[`project/CURRENT.md`](./project/CURRENT.md)
