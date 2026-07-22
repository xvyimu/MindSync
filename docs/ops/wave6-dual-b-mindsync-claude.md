# Wave 6 Dual-B · MindSync · Claude

| 项 | 值 |
|----|-----|
| **Agent** | claude |
| **日期** | 2026-07-22 |
| **Worktree** | `C:\Users\yuanjia\orca\workspaces\mindsync\dual-b-ms-claude` |
| **Branch** | `xvyimu/dual-b-ms-claude` |
| **基线 tip** | `735a68e859d2e9e736b9829757b2dcbbba26b8d8`（`feat(ai-core): prompt optimize stub (T-MS-004)`） |
| **主线** | `develop` |
| **Remote** | 仅 `origin` → `git@github.com:xvyimu/MindSync.git`（无 `upstream`） |
| **Dual-A 参考** | Codex 胜方 GAP：`D:\MindSync\src\mindsync\docs\ops\wave6-gap-mindsync-codex.md` |
| **题单** | `D:\orca\.planning\dual-b-wave6\prompts\ms.md` |

> 本报告写在 **独立 feature worktree**，不是主 checkout。未 push / 未 merge / 未真发布镜像 / 未覆盖用户 asar。

---

## 1. 做了什么

### 1.1 IPC Gate 漏扫（P0-01）

- `scripts/desktop-ipc-handlers.test.mjs`
  - preload↔main 扫描源加入 `ai-core-handlers.js`
  - composition root 断言 `registerAiCoreIpcHandlers` 与三条 `registerSensitiveIpc('ai-core-…')`
  - channel manifest 契约导入 `AI_CORE_CHANNELS`，断言 status/health/evaluation 通道与 domain meta
  - `handlerSources` 聚合加入 `ai-core-handlers.js`（修静态 Gate 对运行时已注册通道的误报）

### 1.2 镜像 / handoff 身份对齐（P0-02 文档侧）

- `docs/PROJECT_HANDOFF.md`：标题/路径/安装根改为 MindSync；去掉 **active upstream remote 表**；补 AI-Core 域 handler；Node engines 与 CURRENT 对齐
- `README.md` / `README.zh-CN.md`：Docker 段标明  
  - 目标官方名 `xvyimu/mindsync`  
  - 当前推荐源码 build  
  - `linshen/prompt-optimizer` = 上游/历史**对照**，非 MindSync 产品承诺  
- `docker/docker-compose.yml`、`.github/workflows/docker.yml`：注释冻结身份决策（**未**改真 push 目标账号、未真发布）
- `scripts/check-docs-handoff-paths.mjs`：禁止 HANDOFF 再写 `D:\PromtOptimizer\src|app|…` 为 SSOT；禁止 upstream 表行复活

### 1.3 AI-Core 发行契约 + TARGET（P1-01 / P1-04）

- 新增 `docs/ops/ai-core-distribution-contract.md` — **模式 A：开发者自启 sidecar**；asar/Docker Web **不含** Python；健康检查与验收定义
- 新增 `docs/ARCHITECTURE_TARGET.md` — 目标拓扑、信任边界、禁止项、里程碑
- 新增 `docs/brand-assets.md` — 命名/logo/镜像名清单
- 索引：`docs/README.md`、`docs/architecture/README.md`、`services/ai-core/README.md` 链接契约与 TARGET

---

## 2. 没做什么（题单禁区）

- 未 push / force-push / 开 PR / merge `develop`
- 未覆盖用户装机 asar、未真 publish Docker 镜像
- 未大范围 redesign / 未默认打开 redesign shell
- 未把 AI-Core stub 接到生产 Vue 评测路径
- 未实现 prompt optimize 桌面 client/IPC 端到端（P1-02 后波）
- 未统一 Dockerfile Node 22→24 构建（仅在 TARGET 记漂移）
- 未在本 worktree 执行 `pnpm install`（依赖噪声与 GAP P2-03 一致）

---

## 3. 验证命令与 exit code

| 命令 | Exit | 结果 |
|------|-----:|------|
| `git rev-parse HEAD` | 0 | `735a68e…`（改动未 commit） |
| `git rev-parse --abbrev-ref HEAD` | 0 | `xvyimu/dual-b-ms-claude` |
| `git remote -v` | 0 | 仅 origin MindSync |
| `node --test --test-name-pattern "preload IPC\|streaming contract\|composition root\|channel manifest\|preference bridge\|avoids renderer" scripts/desktop-ipc-handlers.test.mjs` | **0** | **6/6** — 含 AI-Core 三条通道静态 Gate |
| `node --test scripts/desktop-ipc-handlers.test.mjs`（全量） | **1** | 6 pass / **4 fail**：`@aws-sdk/client-s3` MODULE_NOT_FOUND（本机 node_modules 不完整，与 GAP P2-03 一致；**非**本波回归） |
| `node --test packages/desktop/config/ai-core-config.test.js packages/desktop/config/ai-core-client.test.js` | **0** | 9/9 |
| `python -m pytest services/ai-core/tests -q` | **0** | 9 passed |
| `pnpm check:docs` | **0** | 含 handoff-paths + source-readme-fork 等 8 项 |
| `node scripts/check-docs-handoff-paths.mjs` | **0** | OK |
| `node scripts/check-docs-source-readme-fork.mjs` | **0** | OK |

**AI-Core Gate 结论：** 静态完整性对 `ai-core-get-status` / `ai-core-probe-health` / `ai-core-run-evaluation` **已绿**。全量 `desktop-ipc-handlers` 仍被环境依赖缺失挡住 remote-storage 用例。

---

## 4. 变更文件清单

| 路径 | 动作 |
|------|------|
| `scripts/desktop-ipc-handlers.test.mjs` | 修 Gate 扫描 + AI-Core 断言 |
| `scripts/check-docs-handoff-paths.mjs` | 身份/路径门禁加强 |
| `docs/PROJECT_HANDOFF.md` | 身份/路径/IPC/Git 对齐 |
| `docs/README.md` · `docs/architecture/README.md` | 索引 |
| `docs/ARCHITECTURE_TARGET.md` | **新建** |
| `docs/brand-assets.md` | **新建** |
| `docs/ops/ai-core-distribution-contract.md` | **新建** |
| `docs/ops/wave6-dual-b-mindsync-claude.md` | **本报告** |
| `README.md` · `README.zh-CN.md` | Docker 身份说明 |
| `docker/docker-compose.yml` · `.github/workflows/docker.yml` | 注释决策 |
| `services/ai-core/README.md` | 链到发行契约 |

---

## 5. 对侧（Codex）可吸收 3 点

1. **Gate 漏扫的修法是扩 `handlerSources`，不是删通道或改 runtime 注册**——manifest 已有 `AI_CORE_CHANNELS` 时，测试聚合必须同步 `ai-core-handlers.js`。
2. **镜像名决策用「目标名 + 对照名 + 当前推荐 build」三行写死**，比直接改 workflow 推送账号更安全，也满足「禁止真 publish」。
3. **发行契约先冻结模式 A（自启 sidecar）**，避免后人把 Python 默默塞进 asar/Dockerfile；升级 B/C 必须先改契约页。

---

## 6. 停止点

实现与验证完成，**等待总控评分**。未 commit（题单未要求提交）；工作树有上述未暂存改动。
