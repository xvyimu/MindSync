# 现行事实快照（CURRENT）

> **L1 活文档 · 版本与路径只在这里维护权威数字。**  
> 其他文档应链接本文，勿复制过期版本号。  
> 文档体系：方案 C（双层真相源）— 见 `D:\PromtOptimizer\docs\DOC-SYSTEM-PLAN-2026-07-20.md`

| 项 | 值 |
|----|-----|
| **产品版本** | **2.11.7**（= 根 `package.json` / desktop） |
| **日期** | 2026-07-21 |
| **分支** | `develop` |
| **远端 tip** | 以 `git log -1 --oneline` 为准 |
| **Fork** | https://github.com/xvyimu/prompt-optimizer |
| **策略** | **fork-only**（默认不向上游开 PR） |
| **上游 remote** | `upstream` → `linshenkx/prompt-optimizer`（可拉取，不默认贡献） |

---

## 本机路径（维护者）

| 用途 | 路径 |
|------|------|
| 源码 | `D:\PromtOptimizer\src\prompt-optimizer` |
| **运行安装** | **`D:\PromtOptimizer\app\PromptOptimizer.exe`** |
| 安装包归档 | `D:\PromtOptimizer\nsis-2026-07-20-paper-theme\` · `nsis-2026-07-20-develop-ux\` |
| 工具链 | **Node ^24**（本机系统 Node 即可；旧 portable `tools\node-v22.*` 可弃用） |
| 用户模板 | `D:\PromtOptimizer\custom-templates\`（勿删） |
| Desktop IPC 协议 | `packages/desktop/config/ipc/channel-manifest.js` · **1.1.0** |

旧热替换树 `D:\PromtOptimizer\PromptOptimizer\` **已废弃**（清理表见 [`CLEANUP-PLAYBOOK.md`](./CLEANUP-PLAYBOOK.md)）。

---

## 文档入口（L0 / L1）

| 你想… | 打开 |
|--------|------|
| 安装/启动 | `D:\PromtOptimizer\README.md` |
| 开发/模块/测试 | [`../PROJECT_HANDOFF.md`](../PROJECT_HANDOFF.md) |
| 全面检查/安全/模块审计 | `D:\PromtOptimizer\docs\FULL-AUDIT-REPORT-2026-07-20.md` |
| 全面扫描建议 | `D:\PromtOptimizer\docs\FULL-SCAN-RECOMMENDATIONS-2026-07-20.md` |
| **全面扫描+规划（2026-07-21）** | `D:\PromtOptimizer\docs\FULL-SCAN-PLAN-RECOMMENDATIONS-2026-07-21.md` |
| **竞品/架构调研（万字）** | `D:\PromtOptimizer\docs\COMPETITIVE-ARCHITECTURE-RESEARCH-2026-07-21.md` |
| **决策简报（目标/约束/验收）** | [`COMPETITIVE-BRIEF.md`](./COMPETITIVE-BRIEF.md) |
| **架构宪章** | [`../architecture/charter.md`](../architecture/charter.md) |
| **90 天 backlog** | [`BACKLOG-90D-2026-07-21.md`](./BACKLOG-90D-2026-07-21.md) |
| **下一刀规格（EvalCaseSet）** | [`NEXT-CUT-SPEC-2026-07-21.md`](./NEXT-CUT-SPEC-2026-07-21.md) |
| 文档怎么管 | `D:\PromtOptimizer\docs\DOC-SYSTEM-PLAN-2026-07-20.md`（方案 C 已落地） |
| **文档二期 C2** | `D:\PromtOptimizer\docs\DOC-SYSTEM-PLAN-C2-2026-07-20.md`（漂移清零 + 门禁硬化） |
| **文档漂移台账** | [`DOC-DRIFT-REGISTRY.md`](./DOC-DRIFT-REGISTRY.md)（DOC-01～20 状态） |
| 磁盘清理 | [`CLEANUP-PLAYBOOK.md`](./CLEANUP-PLAYBOOK.md) |
| **发版一步表** | [`RELEASE-RUNBOOK.md`](./RELEASE-RUNBOOK.md) |
| 产品范围 | [`prd.md`](./prd.md) |
| 部署（Vercel 等） | [`../user/deployment/`](../user/deployment/) |
| 现行架构白名单 | [`../architecture/README.md`](../architecture/README.md) |

---

## 本轮产品能力摘要（2.11.7 fork）

- Desktop hardening：stream cancel、IPC 域拆分、**域 handler 全量 `registerSensitiveIpc` / update `secureHandle` sender 校验**  
- UX quiet-workbench + 取消文案  
- **Paper / 纸感**主题（离线字体）  
- 打包含 `icons/**`；安装为 **app.asar**  
- **P0 安全**：Docker `config.js` 仅 public `VITE_*`；Vercel HMAC 会话 Cookie（非明文密码）  
- **UI `build:types` / `vue-tsc`**：TemplateSelect 与 Naive `SelectFilter` 对齐（watch 软降级）  
- **图像生成可取消**：`ImageRequest.signal` → adapters `fetch`；Desktop 可选 `streamId` + `stream-cancel`；UI Stop + `toast.info.optimizeCancelled`  
- **2026-07-21 加固批**：流式 finish payload、XSS、CI lint/mcp、Docker 密码门闩、vite define 白名单、sandbox、favorites 进全量备份、包边界（web/extension 直依 core；UI 不再 re-export 工厂）  
- **Cut-1 可复现评估用例**：`EvalCaseSet` 本地存取 + `contains` 批跑 + 证据 JSON 导出（Basic System 工作区入口）；手测修补：失败不丢表单、错误区、max cases  
- **Cut+1 Desktop safeStorage**：`models` / `image-models` 的 `apiKey` 等字段落盘为 `__enc:v1:` + OS 级加密；业务层仍见明文；Web 透传  
- **B3 历史上限可感知**：默认 50 可配置（10–500）；History 抽屉显示占用与 near/full 警告；`setMaxRecords` 可截断最旧  
- **工具链**：Node **^24**（系统 Node 即可，无需 portable 22）  
- **战略文档**：竞品/架构调研见 `D:\PromtOptimizer\docs\COMPETITIVE-ARCHITECTURE-RESEARCH-2026-07-21.md`（本地优先工作台定位，非 LLMOps 平台）  

---

## 构建 / 验证（摘要）

```powershell
cd D:\PromtOptimizer\src\prompt-optimizer
# Node 24（engines ^24）
pnpm -F @prompt-optimizer/core build
pnpm -F @prompt-optimizer/ui build:bundle
pnpm -F @prompt-optimizer/desktop build:ci

node --test packages/desktop/config/*.test.js
node --test scripts/desktop-ipc-handlers.test.mjs
node --test api/access-session.test.mjs scripts/generate-config-public-filter.test.mjs
```

细节与命令全集见 HANDOFF / FULL-AUDIT。

---

## 明确不做（文档层）

- 不把 `docs/workspace/**`、`docs/archives/**`、`.pipeline/**` 当现行规范  
- 不在用户文档写本机绝对路径  
- 不默认 reopen 上游 PR  

**维护：** 发版或安装根变更时只先改本文件，再改 HANDOFF/安装 README 链接叙述。
