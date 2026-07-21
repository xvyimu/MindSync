# PromptOptimizer 项目交接总册（PROJECT_HANDOFF）

> 单一真相入口。更新代码后优先改本文相关章节；安装侧见 `D:\PromtOptimizer\README.md`。

**最后更新：** 2026-07-20 文档体系方案 C + 产品态收口  
**产品版本：** Desktop **2.11.7**（权威快照：[`project/CURRENT.md`](./project/CURRENT.md)）  
**维护分支：** **`develop`**（tip 以 `git log -1` 为准）  
**本仓：** https://github.com/xvyimu/MindSync（原 `prompt-optimizer`，已脱离 fork 网络并改名）  
**上游：** https://github.com/linshenkx/prompt-optimizer（`upstream`，仅拉取）  
**贡献策略：** **独立仓 / 不默认向上游开 PR**  
**文档分层：** L0 本文 + 安装 README · L1 CURRENT/AUDIT/user · L2 archives/workspace/.pipeline  
**本机安装：** `D:\PromtOptimizer\app\PromptOptimizer.exe`  
**全面检查：** `D:\PromtOptimizer\docs\FULL-AUDIT-REPORT-2026-07-20.md`  
**文档规划：** `D:\PromtOptimizer\docs\DOC-SYSTEM-PLAN-2026-07-20.md` · C2：`DOC-SYSTEM-PLAN-C2-2026-07-20.md`  
**文档策略 / 漂移台账 / 清理：** [`DOCS_POLICY.md`](./DOCS_POLICY.md) · [`project/DOC-DRIFT-REGISTRY.md`](./project/DOC-DRIFT-REGISTRY.md) · [`project/CLEANUP-PLAYBOOK.md`](./project/CLEANUP-PLAYBOOK.md)

---

## 0. 一分钟读懂

| 你想… | 去哪里 |
|--------|--------|
| **现行版本/路径一页纸** | [`project/CURRENT.md`](./project/CURRENT.md) |
| 改代码 | `D:\PromtOptimizer\src\prompt-optimizer`（本文后续章节） |
| 打开软件 | `D:\PromtOptimizer\app\PromptOptimizer.exe` |
| 安装侧入口 | `D:\PromtOptimizer\README.md` |
| 安装包 | `D:\PromtOptimizer\nsis-2026-07-20-paper-theme\` 等 |
| 全面检查 | `D:\PromtOptimizer\docs\FULL-AUDIT-REPORT-2026-07-20.md` |
| 文档怎么分层 | `D:\PromtOptimizer\docs\DOC-SYSTEM-PLAN-2026-07-20.md` · [`docs/README.md`](./README.md) |
| 历史 hardening / ship | §2 + `.pipeline/`（**非规范**）+ `CLOSEOUT.md` |
| 跑测试 | §5；Desktop 契约见 FULL-AUDIT §8 |
| 推送到 GitHub | §6（独立仓 MindSync · 默认 `develop`） |
| 优化债务 | FULL-AUDIT §10 · CURRENT |

---

## 1. 目录与角色

### 1.1 源码工作区（真相源）

```
D:\PromtOptimizer\src\prompt-optimizer\
├── packages/
│   ├── core/          # LLM/Prompt/模型领域；AbortSignal；electron 子路径
│   ├── desktop/       # Electron main/preload；config/ipc/* 领域拆分；icons/**
│   ├── ui/            # Vue UI + Paper 主题
│   ├── web/           # Web 入口（Desktop 用 web-dist）
│   ├── extension/     # 浏览器扩展
│   └── mcp-server/    # MCP
├── scripts/           # IPC 契约、e2e smoke、溯源
├── docs/              # 含本 HANDOFF
├── .pipeline/         # Ship/优化/验证过程文档
└── ...
```

### 1.2 本机安装（日常运行）

```
D:\PromtOptimizer\
├── app\                               # 现行 NSIS 安装根
│   ├── PromptOptimizer.exe
│   └── resources\
│       ├── app.asar                   # 业务 + web-dist + icons
│       └── app-update.yml
├── docs\FULL-AUDIT-REPORT-2026-07-20.md
├── README.md                          # 安装侧入口
├── CLOSEOUT.md                        # 2026-07-18 历史收口
├── nsis-2026-07-20-paper-theme\       # Paper 主题安装包
├── nsis-2026-07-20-develop-ux\        # UX 安装包
├── src\prompt-optimizer\              # 源码
├── tools\                             # portable Node 等
└── custom-templates\                  # 用户模板（勿删）
```

**重要：** 旧热替换树 `PromptOptimizer\` 已不是真相源。asar 热修前可有 `app.asar.bak-pre-icons-*` 备份；完整回滚仍靠源码/fork/nsis 归档。

### 1.3 远程 Git

| remote | URL | 用途 |
|--------|-----|------|
| origin | https://github.com/xvyimu/MindSync.git | 本仓（独立，非 fork） |
| upstream | https://github.com/linshenkx/prompt-optimizer.git | 官方 |

- **日常分支：`develop`**（功能用 `feat/*` 再合入）
- 历史工作分支名 `work/desktop-hardening*` 仅作考古，不再作为主路径
- 勿 force 推 `develop`/`main`
- 本机 GitHub 代理常用 `http://127.0.0.1:7890`

```powershell
$env:HTTP_PROXY='http://127.0.0.1:7890'; $env:HTTPS_PROXY='http://127.0.0.1:7890'
git push origin develop
```

### 1.4 提交历史（关键）

以 `git log -8 --oneline` 为准。近年要点：

| 主题 | 说明 |
|------|------|
| Paper 主题 / icons 打包 | UI 纸感 + desktop `files` 含 icons |
| P0 安全 | Docker public config 过滤；Vercel HMAC 会话 |
| Desktop hardening | stream cancel、IPC 域拆分、更新源 fork |

---

## 2. 已交付能力（功能真相）

### 2.1 Provider 真实取消

- `StreamRequestOptions { signal?: AbortSignal }` 贯穿：
  - LLMService / PromptService / ImageUnderstanding
  - Desktop owned-stream-runner → Core
  - OpenAI / Anthropic / Gemini / Chrome / Deepseek adapters
- preload：LLM + Prompt 流式支持 signal → `stream-cancel` 竞速
- 测试：`packages/core/tests/unit/llm/provider-cancellation.test.ts` 等

### 2.2 Desktop IPC 领域拆分

`packages/desktop/config/ipc/`（**以磁盘文件名为准**）：

| 文件 | 职责 |
|------|------|
| `channel-manifest.js` | 协议版本 **1.1.0** + CHANNEL_META + 域 channel 清单 |
| `llm-handlers.js` | LLM 域（含 secure/sensitive 注册路径） |
| `prompt-stream-handlers.js` | Prompt 流式 |
| `prompt-sync-handlers.js` | Prompt 同步调用 |
| `model-handlers.js` | 文本模型配置 |
| `image-handlers.js` | 图像模型 / 生成 |
| `template-handlers.js` | 模板 |
| `history-handlers.js` | 历史 |
| `context-handlers.js` | 上下文 |
| `favorite-handlers.js` | 收藏 |
| `data-handlers.js` | 导入导出 / 存储信息 |
| `preference-handlers.js` | 偏好 |
| `system-handlers.js` | 系统（日志目录等） |
| `update-handlers.js` | 自动更新（`createUpdateHandlers(ctx)`） |
| `owned-stream-runner.js` | 流所有权 + AbortSignal |

`main.js`：composition root + 生命周期；update 通过 getter/setter 注入。  
**IPC 安全（Wave C）：** 业务域 handler 经 `registerSensitiveIpc`（sender + 信封）；`update-handlers` 用 `secureHandle` + `assertTrustedRendererSender`（自带详细信封，避免双重包装）；`remote-storage` 经 `registerSensitiveIpc`。

### 2.3 安全边界

- IPC sender / main-frame / streamId
- stream 所有权与取消
- runtime 公共配置白名单
- 外部导航限制
- WebDAV 路径校验
- preload listener 精确解绑

### 2.4 安装形态（现行）

- **安装根：** `D:\PromtOptimizer\app`
- **加载：** `resources/app.asar`（NSIS；含 web-dist + icons）
- 缺 API key 时仅警告，可启动
- 打包清单含 `icons/**/*`；主题可选 **纸感 Paper**

---

## 3. 过程文档索引（.pipeline）

见 `.pipeline/INDEX.md`。要点：

| 文件 | 用途 |
|------|------|
| OPTIMIZATION_PLAN.md | **优化诊断与执行结果（最细）** |
| todos-completion-report.md | 五项待办完成报告 |
| release-traceability.md | commit/文件 sha256 |
| spec/changes/verify-notes/test-results/review | Ship 流水线交接 |
| PROJECT_HANDOFF.md | 本文（docs/ 下） |

---

## 4. 日常开发路径

### 4.1 改 Core / Desktop（推荐）

1. 在 `D:\PromtOptimizer\src\prompt-optimizer` 改代码  
2. 使用 **Node 24**（engines `^24`；系统 Node 即可）  
3. 构建并重装：

```powershell
pnpm -F @mindsync/core build
pnpm -F @mindsync/ui build:bundle   # 若 vue-tsc 失败可跳过 types
pnpm -F @mindsync/desktop build:ci
# 安装生成的 NSIS 到 D:\PromtOptimizer\app
```

4. 契约抽测：

```powershell
node --test packages/desktop/config/*.test.js
node --test scripts/desktop-ipc-handlers.test.mjs
```

### 4.2 环境

- engines：Node `^22`；推荐 portable 22，避免系统 Node 24 踩 engines  
- 独立仓 MindSync；高风险 push/删除先确认

---

## 5. 测试命令（正确入口）

### 5.1 Core 单测（务必从 package 或指定 config）

```powershell
# 推荐
cd packages/core
node ./node_modules/vitest/vitest.mjs run tests/unit

# 从 monorepo 根（依赖已修 vitest root/setup 绝对路径）
cd <repo>
node ./packages/core/node_modules/vitest/vitest.mjs run --config packages/core/vitest.config.js tests/unit
```

### 5.2 Core typecheck

```powershell
cd packages/core
node ./node_modules/typescript/bin/tsc -p tsconfig.json --noEmit
```

### 5.3 UI

```powershell
cd packages/ui
node ./node_modules/vitest/vitest.mjs run tests/unit
node ./node_modules/vue-tsc/bin/vue-tsc.js -p tsconfig.json --noEmit
```

### 5.4 Desktop

```powershell
cd <repo>
node --test packages/desktop/config/*.test.js
node --test scripts/desktop-ipc-handlers.test.mjs
node scripts/desktop-local-e2e-smoke.cjs          # 安装版
node scripts/desktop-local-e2e-smoke.cjs --source # 源码 electron
node scripts/write-release-traceability.cjs
```

### 5.5 Playwright gate（VCR）

```powershell
# Node 24；浏览器 chromium-1208
$env:PLAYWRIGHT_BROWSERS_PATH='D:\ms-playwright'
$env:NO_PROXY='localhost,127.0.0.1'
# 只开 DeepSeek + SiliconFlow，勿开 OpenAI
$env:VITE_DEEPSEEK_API_KEY='vcr'
$env:VITE_SILICONFLOW_API_KEY='vcr'
# 先起 web（packages/web）:15555，再：
$env:E2E_VCR_MODE='replay'
node scripts/run-e2e-group.js gate
```

### 5.6 已知坑

| 错误入口 | 现象 |
|----------|------|
| 根目录 vitest 不带 core config（旧配置） | `vi is not defined`、ENOENT `src/...`、MSW 超时 |
| update-handlers 用 `./package.json` | 更新检查 MODULE_NOT_FOUND（已修为 `../../package.json`） |
| gate 启用 `VITE_OPENAI_API_KEY` | 默认模型变 openai，VCR hash 对不上 DeepSeek fixture |
| 系统代理未设 `NO_PROXY=localhost` | Playwright 访问 127.0.0.1 失败 / 假 502 |

---

## 6. Git 工作流

**源码根（唯一）：** `D:\PromtOptimizer\src\prompt-optimizer`  
**日常分支：** `develop`（功能用 `feat/*` 再合入）  
**策略：** 独立仓 `xvyimu/MindSync` · 默认 **不**向上游开 PR  

```powershell
cd D:\PromtOptimizer\src\prompt-optimizer
$env:HTTP_PROXY='http://127.0.0.1:7890'; $env:HTTPS_PROXY='http://127.0.0.1:7890'
git status -sb
git log -5 --oneline
git push origin develop
```

- 历史分支名 `work/desktop-hardening*` **仅考古**，不要再 `push` 作主路径  
- 上游 PR #324 等为历史记录；现行以 fork `develop` 为准  
- fork 已合 PR：#1 #2（及后续）  

---

## 7. 清理策略

**完整允许删 / 禁止删 / 自检表：** 只维护  
[`docs/project/CLEANUP-PLAYBOOK.md`](./project/CLEANUP-PLAYBOOK.md)

摘要：

| 现行安装 | `D:\PromtOptimizer\app\`（`app.asar`） |
|----------|----------------------------------------|
| 现行 NSIS 归档 | `nsis-2026-07-20-paper-theme\` · `nsis-2026-07-20-develop-ux\` |
| 已废弃 | `D:\PromtOptimizer\PromptOptimizer\` 热替换树（**不是**运行安装） |

机检：`node scripts/check-docs-handoff-paths.mjs`（禁止本文再写入废弃自检路径）。

---

## 8. 未决与可选债

1. **上游 PR #324** 等待 review/merge  
2. **代码签名 NSIS**：本机已能打未签名包；签名需证书/CI  
3. **Playwright extended**：非日常门禁（gate 已 12/12）  
4. **API 密钥**：安装启动无 key 仅警告，需用户配置模型  

细节见 `.pipeline/OPTIMIZATION_PLAN.md`、`D:\PromtOptimizer\CLOSEOUT.md`。

---

## 9. 相关记忆（Claude）

- `prompt-optimizer-2026-07-18-delivery.md`
- `prompt-optimizer-remaining-todos.md`

---

## 10. 变更日志（本文）

| 日期 | 变更 |
|------|------|
| 2026-07-18 | 初版：路径/能力/测试/清理/Git 全细节交接 |
| 2026-07-18 晚 | 收口：upstream merge、PR#324、NSIS、gate 12/12、CLOSEOUT 入口 |
| 2026-07-20 | 文档体系方案 C：CURRENT / DOCS_POLICY / 冻结横幅 / check:docs 雏形 |
| 2026-07-20 | **C2-A**：§6 源码路径与 `develop` push；§7 改链 CLEANUP-PLAYBOOK；§2.2 IPC 文件名对齐磁盘；漂移台账 DOC-DRIFT-REGISTRY；`check-docs-handoff-paths.mjs` |
| 2026-07-20 | **C2-B**：RELEASE-RUNBOOK；`release:notes:*` package 别名；version-sync 双文件；pnpm-script-refs / version-sync-list / version-consistency 入 check:docs |
| 2026-07-20 | **C2-C**：archives 索引=磁盘；developer README；README EN/ZH fork clone；PRD 图像取消；FULL-AUDIT §6.5 CURRENT SSOT；archive-index + source-readme-fork；freeze+pipeline；REGISTRY open=0 |

## 11. 文档体系摘要

| 文档 | 角色 |
|------|------|
| [`project/CURRENT.md`](./project/CURRENT.md) | 版本/路径/策略 SSOT |
| [`DOCS_POLICY.md`](./DOCS_POLICY.md) | 写哪里 / 禁止 |
| [`project/DOC-DRIFT-REGISTRY.md`](./project/DOC-DRIFT-REGISTRY.md) | DOC 债台账 |
| [`project/CLEANUP-PLAYBOOK.md`](./project/CLEANUP-PLAYBOOK.md) | 磁盘清理 |
| `D:\PromtOptimizer\docs\DOC-SYSTEM-PLAN-2026-07-20.md` | 方案 C |
| `D:\PromtOptimizer\docs\DOC-SYSTEM-PLAN-C2-2026-07-20.md` | 方案 C2 |
| `D:\PromtOptimizer\docs\FULL-AUDIT-REPORT-2026-07-20.md` | 深度审计 |
| `D:\PromtOptimizer\docs\FULL-SCAN-RECOMMENDATIONS-2026-07-20.md` | 全面扫描建议 |
