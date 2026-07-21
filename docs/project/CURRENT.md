# 现行事实快照（CURRENT）

> **L1 活文档 · 版本与路径只在这里维护权威数字。**  
> 其他文档应链接本文，勿复制过期版本号。  
> 文档体系：方案 C（双层真相源）— 见 ``docs/project/archives/install-side-2026-07/DOC-SYSTEM-PLAN-2026-07-20.md``

| 项 | 值 |
|----|-----|
| **产品版本** | **2.11.7**（= 根 `package.json` / desktop） |
| **日期** | 2026-07-21 |
| **分支** | `develop` |
| **远端 tip** | 以 `git log -1 --oneline` 为准 |
| **本仓** | https://github.com/xvyimu/MindSync（独立仓；**仅 `origin`**） |
| **策略** | **独立产品开发 / 不跟踪原上游 / 不默认开 PR 到 linshenkx** |
| **上游 remote** | **已移除**（2026-07-21）。安全补丁改为手工补丁，不恢复 `upstream` 除非维护者书面决定 |
| **身份 SSOT** | [`GITHUB_IDENTITY.md`](../../GITHUB_IDENTITY.md) |
| **包名/appId 重命名** | 方案见 [`PACKAGE-RENAME-PLAN-2026-07-21.md`](./PACKAGE-RENAME-PLAN-2026-07-21.md)（默认未执行） |
| **许可** | AGPL-3.0-only（`LICENSE` 正文保留；抬头含独立维护说明） |

---

## 本机路径（维护者）

| 用途 | 路径 |
|------|------|
| 源码 | `D:\PromtOptimizer\src\mindsync` |
| **运行安装** | **`D:\PromtOptimizer\app\PromptOptimizer.exe`** |
| 安装包归档 | `D:\PromtOptimizer\nsis-2026-07-20-paper-theme\` · `nsis-2026-07-20-develop-ux\` · `nsis-2026-07-21-e1` · **`nsis-2026-07-21-ipc`** |
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
| 全面检查/安全/模块审计 | ``docs/project/archives/install-side-2026-07/FULL-AUDIT-REPORT-2026-07-20.md`` |
| 全面扫描建议 | ``docs/project/archives/install-side-2026-07/FULL-SCAN-RECOMMENDATIONS-2026-07-20.md`` |
| **全面扫描+规划（2026-07-21）** | ``docs/project/archives/install-side-2026-07/FULL-SCAN-PLAN-RECOMMENDATIONS-2026-07-21.md`` |
| **整合决策调研（tip 对齐 R2）** | ``docs/project/archives/install-side-2026-07/INTEGRATED-WORKBENCH-DECISION-RESEARCH-2026-07-21.md`` |
| **整合决策调研（R3 · 90d 收工后）** | ``docs/project/archives/install-side-2026-07/INTEGRATED-WORKBENCH-DECISION-RESEARCH-2026-07-21-R3.md`` |
| **下一刀规格（Cut-R2a C2）** | [`NEXT-CUT-SPEC-2026-07-21-R2-C2.md`](./NEXT-CUT-SPEC-2026-07-21-R2-C2.md) |
| **手测清单（15 min 闭环）** | [`HANDTEST-CHECKLIST-2026-07-21.md`](./HANDTEST-CHECKLIST-2026-07-21.md) |
| **手测状态 E1（机器+human）** | [`HANDTEST-STATUS-2026-07-21-E1.md`](./HANDTEST-STATUS-2026-07-21-E1.md) |
| **Agent 续作提示词/下一步/诊断** | [`AGENT-CONTINUE-PROMPT-AND-NEXT-PLAN-2026-07-21.md`](./AGENT-CONTINUE-PROMPT-AND-NEXT-PLAN-2026-07-21.md) |
| **E0/E1/E2 规格（R3 表单）** | [`NEXT-CUT-SPEC-2026-07-21-E0-E1-E2.md`](./NEXT-CUT-SPEC-2026-07-21-E0-E1-E2.md) |
| **B6/D1/D2 规格** | [`NEXT-CUT-SPEC-2026-07-21-B6-D1-D2.md`](./NEXT-CUT-SPEC-2026-07-21-B6-D1-D2.md) |
| **竞品/架构调研（万字）** | ``docs/project/archives/install-side-2026-07/COMPETITIVE-ARCHITECTURE-RESEARCH-2026-07-21.md`` |
| **决策简报（目标/约束/验收）** | [`COMPETITIVE-BRIEF.md`](./COMPETITIVE-BRIEF.md) |
| **架构宪章** | [`../architecture/charter.md`](../architecture/charter.md) |
| **90 天 backlog** | [`BACKLOG-90D-2026-07-21.md`](./BACKLOG-90D-2026-07-21.md) |
| **下一刀规格（EvalCaseSet）** | [`NEXT-CUT-SPEC-2026-07-21.md`](./NEXT-CUT-SPEC-2026-07-21.md)（Cut-1 史） |
| **下一刀规格（Cut-R1 发布+F2）** | [`NEXT-CUT-SPEC-2026-07-21-RELEASE-F2.md`](./NEXT-CUT-SPEC-2026-07-21-RELEASE-F2.md) |
| 文档怎么管 | ``docs/project/archives/install-side-2026-07/DOC-SYSTEM-PLAN-2026-07-20.md``（方案 C 已落地） |
| **文档二期 C2** | ``docs/project/archives/install-side-2026-07/DOC-SYSTEM-PLAN-C2-2026-07-20.md``（漂移清零 + 门禁硬化） |
| **文档漂移台账** | [`DOC-DRIFT-REGISTRY.md`](./DOC-DRIFT-REGISTRY.md)（DOC-01～20 状态） |
| 磁盘清理 | [`CLEANUP-PLAYBOOK.md`](./CLEANUP-PLAYBOOK.md) · 日志 [`CLEANUP-LOG-2026-07-22.md`](./CLEANUP-LOG-2026-07-22.md) |
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
- **C4 优化完成 CTA**：Basic System/User 优化结束后固定「测试 / 评估 / 收藏」条（`PostOptimizeActions`）  
- **导出默认脱敏 Key**：`exportAllData({ includeSecrets? })` 默认去掉 models/imageModels 密钥；DataManager 可勾选包含  
- **F2 全量导出含 EvalCaseSet**：`data.evalCaseSets` ↔ preference `eval.caseSets.v1`  
- **C2 promptfoo.yaml 最小导出**：EvalCase 面板一键导出 contains 映射，不含密钥  
- **C1 双模型轻对照**：测试区「双模型」一键（同提示版本 · 两 modelKey 并排）；每列仍可独立改模型  
- **C3 MCP 结构化返回**：工具结果 JSON `original`/`optimized`/`meta.version=1`（无密钥）  
- **导出含密钥二次确认**：DataManager 勾选 includeSecrets 后导出需确认  
- **B6 路径规范化测**：`normalizeObjectPath` 拒 `..`/反斜杠/控制字符（UI+Desktop 对齐）  
- **D1/D2 实验自动优化**：策略接口默认 Template；实验开关 **默认关**（ADR-005）  
- **D3 ServiceContainer**：业务装配下沉 `createCoreServices`；main 仅 composition root + IPC 胶水  
- **D4 Docker 非 root 里程碑**：镜像用户 `app`/10001；MCP 子进程降权；整容器非 root 需 `NGINX_PORT=8080`（文档）  
- **B5 远程备份边界**：UI 移除 `@aws-sdk/client-s3`；Web 仅 Google Drive；S3/R2/WebDAV 仅 Desktop IPC  
- **E1 入口铺全（R3）**：PostOptimize CTA + EvalCase 面板 + 双模型一键覆盖 **Basic System/User + Context System/User**（同一 `useEvalCaseSet` / `seedDualModelKeys`）  
- **工具链**：Node **^24**（系统 Node 即可，无需 portable 22）  
- **战略文档**：竞品/架构调研见 ``docs/project/archives/install-side-2026-07/COMPETITIVE-ARCHITECTURE-RESEARCH-2026-07-21.md``；**R3 决策**见 `INTEGRATED-WORKBENCH-DECISION-RESEARCH-2026-07-21-R3.md`  

---

## 构建 / 验证（摘要）

```powershell
cd D:\PromtOptimizer\src\mindsync
# Node 24（engines ^24）
pnpm -F @mindsync/core build
pnpm -F @mindsync/ui build:bundle
pnpm -F @mindsync/desktop build:ci

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
