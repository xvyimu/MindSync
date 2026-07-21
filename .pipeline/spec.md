# Spec: E1 ship — handtest checklist assist + commit E1 + NSIS package

## OPEN QUESTIONS

**无阻塞 OPEN QUESTIONS。** 下列采用规划默认，Coder / Tester / Reviewer 按此执行，勿再追问：

| 项 | 默认 |
|----|------|
| Git 推送 | **仅本地 commit**；**不** `git push`、**不**打 tag、**不** `version:publish`（ship 参数是「装 NSIS」= 本机构建安装包，非发布远端） |
| 版本号 | **保持 2.11.7**；**不** `version:prepare` / 不升 patch |
| E1 代码 | **已实现、未提交**；本刀不写新功能，只 commit + 验证 + 打包 |
| 手测 E0 | 机器侧：typecheck + UI unit + 静态 data-testid 存在性；**完整 GUI 点击**由人类可选完成；产出状态文件记录 pass/partial |
| NSIS 失败 | 若 electron-builder / 依赖缺失导致失败：**记录阻塞原因**，不降级为“改代码绕过”；成功则归档到 `D:\PromtOptimizer\nsis-2026-07-21-e1\` |
| 工作区 | 仅 `D:\PromtOptimizer\src\prompt-optimizer` 内 git；L0 调研 `D:\PromtOptimizer\docs\INTEGRATED-WORKBENCH-DECISION-RESEARCH-2026-07-21-R3.md` **不**强制纳入 monorepo commit（除非已在 tracked 路径） |
| 安装到 app\ | **可选**：打包成功后可提示用户安装到 `D:\PromtOptimizer\app\`；本流水线以**产出 NSIS 归档**为验收，不强制覆盖现用安装 |

---

## 1. Goals

1. **Commit E1**：在 `develop` 上提交已实现的入口铺全（CTA + EvalCase + 双模型）与配套项目文档；仅含意图文件；不 force-push；默认不 push。
2. **Handtest (E0) 协助**：跑可机器化门禁；按 `docs/project/HANDTEST-CHECKLIST-2026-07-21.md` 列出真机步骤；静态核对 E1 data-testid；写入手测状态文件（pass / partial + 备注）。完整 GUI 可标「待人类」。
3. **NSIS (E2)**：不升版本，按 `RELEASE-RUNBOOK.md` Desktop 构建路径产出 `PromptOptimizer-2.11.7-win-x64.exe`（及 zip 若 builder 默认产出），归档到 `D:\PromtOptimizer\nsis-2026-07-21-e1\`，并更新 `CURRENT.md` 安装包归档行。

硬约束全程不可破坏：

- 导出默认脱敏 API keys  
- Web 无 `@aws-sdk` / S3  
- 主安装 auto-optimize 默认 OFF  
- fork-only（无上游 PR）  
- 包边界 app → ui → core  

---

## 2. Non-goals

| 禁止 | 说明 |
|------|------|
| 新功能 | 不扩展 E1 之外的产品能力 |
| 实验 auto-opt 设置页 | 允许日后做；本刀不做 |
| 默认 auto-opt ON / 平台化 / Web S3 | 硬约束 |
| 上游 PR | fork-only |
| 推送 remote / 打 tag / GitHub Release | 除非用户另开任务；本 spec **不**要求 |
| 版本 bump | 保持 2.11.7 |
| 提交 secrets、`.env`、`web-dist` 噪声、`packages/desktop/dist` 产物 | 勿 add |
| 修改 `.pipeline/spec.md` 以外的流水线历史报告冒充验收 | 可用 `.pipeline/changes.md` / handtest status 交接 |

---

## 3. Current state (verified 2026-07-21)

| 事实 | 值 |
|------|-----|
| 分支 | `develop` @ `9070556`（docs: drop duplicate CURRENT bullets）；与 `origin/develop` 同步 |
| 功能 tip（E1 前） | `fe12cbf`（D3/D4） |
| 产品版本 | **2.11.7**（根 + desktop package.json） |
| Node / pnpm | v24.16.0 / 10.6.1（engines `^24`） |
| 已实现未提交 E1 | 见下表 |
| 机器已验证（用户侧） | vue-tsc exit 0 · UI unit 929 pass · core gate 21 pass |
| 现用安装 | `D:\PromtOptimizer\app\PromptOptimizer.exe` 存在（约 2026-07-20） |
| 历史 NSIS 归档 | `D:\PromtOptimizer\nsis-2026-07-20-paper-theme\` · `nsis-2026-07-20-develop-ux\` |
| 上一次 desktop dist | `packages/desktop/dist/PromptOptimizer-2.11.7-win-x64.exe`（勿提交 dist） |

### 3.1 Uncommitted intentional set（应进入 commit）

| 路径 | 角色 |
|------|------|
| `packages/ui/src/components/context-mode/ContextSystemWorkspace.vue` | PostOptimize CTA + EvalCase + dual-model |
| `packages/ui/src/components/context-mode/ContextUserWorkspace.vue` | 同上 |
| `packages/ui/src/components/basic-mode/BasicUserWorkspace.vue` | EvalCase 入口+面板（CTA/dual 已有） |
| `docs/project/NEXT-CUT-SPEC-2026-07-21-E0-E1-E2.md` | **untracked** · E0/E1/E2 规格 |
| `docs/project/CURRENT.md` | E1 能力行 + 文档入口 |
| `docs/project/BACKLOG-90D-2026-07-21.md` | 阶段 E 表 |
| `docs/project/COMPETITIVE-BRIEF.md` | R3 表单冻结 |

**不要** stage：`packages/desktop/web-dist/**`、`packages/desktop/dist/**`、任何密钥、`node_modules`、未跟踪杂项。

### 3.2 E1 data-testid 契约（静态验收用）

| 工作区 | EvalCase open | Dual model | PostOptimize CTA |
|--------|---------------|------------|------------------|
| Basic System（已有） | `basic-system-eval-case-open` | `basic-system-test-dual-model` | `post-optimize-cta`（共享组件） |
| Basic User（本刀） | `basic-user-eval-case-open` | `basic-user-test-dual-model` | 同上 |
| Context System（本刀） | `pro-multi-eval-case-open` | `pro-multi-test-dual-model` | 同上 |
| Context User（本刀） | `pro-variable-eval-case-open` | `pro-variable-test-dual-model` | 同上 |

共享：`PostOptimizeActions` → `post-optimize-cta` / `post-optimize-test` / `post-optimize-evaluate` / `post-optimize-favorite` / `post-optimize-dismiss`。

模式：复用 `useEvalCaseSet`、`EvalCaseSetPanel`、`seedDualModelKeys`、preference 键 `eval.caseSets.v1`（**勿改键名**）。

---

## 4. Phases（流水线分工）

### Phase A — Coder：commit 准备 + 文档收口 + NSIS 构建

#### A1. 预检（commit 前）

```powershell
cd D:\PromtOptimizer\src\prompt-optimizer
git status
git diff --stat
# 确认仅 §3.1 文件 + 无 secrets
```

硬约束静态抽检（应仍通过；失败则 **停**，不 commit）：

```powershell
# Web/UI 不得依赖 @aws-sdk
rg -n "@aws-sdk" packages/web packages/ui --glob "!**/node_modules/**"
# 导出默认脱敏：exportAllData 默认不带 secrets（抽查 core 实现仍存在即可，勿改）
rg -n "includeSecrets" packages/core/src --glob "!**/*.test.*"
```

可选但推荐（与用户已报绿对齐；若环境慢可只跑 typecheck + ui test）：

```powershell
pnpm -F @mindsync/ui typecheck
pnpm -F @mindsync/ui test
# 可选：pnpm test:gate:core
```

#### A2. Commit E1（本地 only）

Stage **仅** §3.1 列表。建议 message（Conventional Commits）：

```
feat(ui): E1 entry parity — PostOptimize CTA, EvalCase, dual-model on Context + Basic User

- Context System/User: CTA + EvalCase panel + dual-model seed
- Basic User: EvalCase entry/panel parity with Basic System
- docs: E0/E1/E2 cut spec, CURRENT, BACKLOG stage E, COMPETITIVE-BRIEF R3
```

规则：

- `git commit` 成功即可；**禁止** `--no-verify`（若 hook 失败则修 hook 问题，勿跳过）  
- **禁止** `git push` / `git push --force`  
- 不 amend 远端已存在 commit  

Commit 后记录：`git log -1 --oneline` → 写入 `.pipeline/changes.md` 的 tip。

#### A3. Handtest 机器侧 + 状态文件

1. 对照 `docs/project/HANDTEST-CHECKLIST-2026-07-21.md` §1–§6。  
2. **可自动**：typecheck / UI unit / 下列 grep 全命中。  
3. **不可自动（标 human / partial）**：真优化 LLM 调用、导出 JSON 肉眼脱敏、Desktop 密文落盘、完整 CTA 点击流。  

静态 testid 命令示例：

```powershell
cd D:\PromtOptimizer\src\prompt-optimizer
$need = @(
  'basic-user-eval-case-open',
  'basic-user-test-dual-model',
  'pro-multi-eval-case-open',
  'pro-multi-test-dual-model',
  'pro-variable-eval-case-open',
  'pro-variable-test-dual-model',
  'post-optimize-cta'
)
foreach ($t in $need) {
  if (-not (rg -l --fixed-strings $t packages/ui/src)) { Write-Error "MISSING testid: $t" }
}
```

**产出文件**（本仓库内，可 commit 也可仅交接；优先写入 project docs 以免丢）：

- 路径：`docs/project/HANDTEST-STATUS-2026-07-21-E1.md`  
- 内容最低要求：

```markdown
# Handtest status E1 · 2026-07-21

| 区 | 结果 | 备注 |
|----|------|------|
| 机器 typecheck/ui unit | pass/fail | 命令与 exit |
| data-testid 静态 | pass/fail | 列表 |
| HANDTEST §1 CTA | partial/human | … |
| HANDTEST §2 历史 | partial/human | … |
| HANDTEST §3 导出脱敏 | partial/human | … |
| HANDTEST §4 promptfoo | partial/human | … |
| HANDTEST §5 双模型 | partial/human | … |
| HANDTEST §6 Web/Desktop | partial/human | … |
| 安装 exe 存在 | yes/no | D:\PromtOptimizer\app\PromptOptimizer.exe |

签名：pipeline-tester / 日期
```

若 `PromptOptimizer.exe` 存在：在状态文件注明 **smoke path**（启动安装版做 §1 可选；不强制自动化 GUI）。

**人类手测步骤（写入 status 或引用 checklist，勿发明新步骤）**：按 `HANDTEST-CHECKLIST-2026-07-21.md` §1–§5 逐条勾选；E1 增量重点：

- Context System / Context User：优化成功后 `post-optimize-cta` 可见  
- 四工作区均可 `*-eval-case-open` 打开面板  
- Context + Basic 测试区 `*-test-dual-model`  

#### A4. NSIS 构建（E2 · 无版本 bump）

前置：Node ^24、pnpm、E1 已 commit（或至少工作树干净到意图状态）。

```powershell
cd D:\PromtOptimizer\src\prompt-optimizer
# 推荐顺序（与 RELEASE-RUNBOOK / CURRENT 一致）
pnpm -F @mindsync/core build
pnpm -F @mindsync/ui build:bundle
# desktop build:ci = build:web (ELECTRON_BUILD) + package:ci (electron-builder --publish never)
pnpm -F @mindsync/desktop build:ci
# 或根脚本：pnpm build:desktop:ci
```

产物期望（electron-builder win nsis+zip）：

- `packages/desktop/dist/PromptOptimizer-2.11.7-win-x64.exe`  
- 可选 zip / blockmap / latest.yml  

**归档**（在 git 仓库外）：

```powershell
$arch = "D:\PromtOptimizer\nsis-2026-07-21-e1"
New-Item -ItemType Directory -Force -Path $arch | Out-Null
Copy-Item "D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\dist\PromptOptimizer-2.11.7-win-x64.exe" $arch -Force
# 若存在则一并复制 zip / blockmap / latest.yml
Get-ChildItem "D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\dist" -File |
  Where-Object { $_.Name -match 'PromptOptimizer-2\.11\.7|latest\.yml' } |
  Copy-Item -Destination $arch -Force
```

在归档目录写 `README.md`（最小）：

```markdown
# NSIS build 2026-07-21 (E1 entry parity)

- Commit: <git rev-parse --short HEAD>
- Version: 2.11.7 (no bump)
- Installer: PromptOptimizer-2.11.7-win-x64.exe
- Feature: E1 CTA + EvalCase + dual-model on Context + Basic User
- Handtest: docs/project/HANDTEST-STATUS-2026-07-21-E1.md
```

**CURRENT.md**（若 A2 已 commit 且归档路径需写入）：在「安装包归档」行追加 `nsis-2026-07-21-e1`；可用 **第二笔小 commit**：

```
docs(project): archive path for nsis-2026-07-21-e1
```

或在 E1 同一 commit 前就预写路径（若构建后才知成功，则第二 commit 更干净）。

**失败处理**：缺 electron、签名、磁盘、网络 → `.pipeline/changes.md` 写 **BLOCKED: NSIS** + 完整错误摘要；E1 commit 仍可算交付。

**不**要求：安装覆盖 `D:\PromtOptimizer\app\`（用户可稍后用归档 exe 安装）。

#### A5. Coder 交接产物

更新 `.pipeline/changes.md`（覆盖为本刀）：

- Summary：E1 committed · handtest status path · NSIS path or BLOCKED  
- Files list  
- Commands run + exit codes  
- Final `git log -1`  
- **Push: not done (by design)**  

---

### Phase B — Tester

| ID | 检查 | 通过标准 |
|----|------|----------|
| T1 | Working tree | E1 相关已 commit；无意外 unstaged 产品代码（允许 handtest status / CURRENT 归档行若第二 commit 计划内） |
| T2 | typecheck | `pnpm -F @mindsync/ui typecheck` exit 0 |
| T3 | UI unit | `pnpm -F @mindsync/ui test` 全绿（期望 ~929 量级） |
| T4 | Core gate（推荐） | `pnpm test:gate:core` 或等价 21+ pass |
| T5 | testid 静态 | §3.2 全部可 rg 命中 |
| T6 | 硬约束 | 无 Web/UI 引入 `@aws-sdk`；未改 auto-opt 默认 ON；未改导出默认 secrets |
| T7 | Handtest status | `HANDTEST-STATUS-2026-07-21-E1.md` 存在且标明 auto vs human |
| T8 | NSIS | 归档目录有 `PromptOptimizer-2.11.7-win-x64.exe` **或** changes.md 明确 BLOCKED 原因 |
| T9 | 版本 | 仍为 2.11.7；无误升版本 commit |
| T10 | 远程 | 未 push（`git status` 可显示 ahead，属预期） |

测试结果写入 `.pipeline/test-results.md`。

**不要求** Playwright 全量 e2e 作为本刀门禁（可选 smoke）；真 GUI 失败记 E3 候选，不阻塞 NSIS 若仅 human 项未做。

---

### Phase C — Reviewer

| 审查点 | 期望 |
|--------|------|
| Diff 范围 | 仅 UI 三工作区 + 项目 docs；无 desktop/core 无关大改 |
| 安全 | 无密钥进库；导出/脱敏路径未回退 |
| 架构 | 复用 composable/组件；无 UI→违反包边界 |
| Commit 质量 | message 清晰；无 force-push；fork-only |
| 发版纪律 | 无 tag/push；版本未 bump；NSIS 在仓库外归档 |
| 文档一致 | CURRENT / BACKLOG / BRIEF / NEXT-CUT-E0-E1-E2 与代码状态一致（E1 done；E0 partial 可接受；E2 done 若有 exe） |

Review 写入 `.pipeline/review.md`；结论 **SHIP** / **SHIP with notes** / **NO-SHIP**。

---

## 5. Acceptance（交付切）

- [ ] `develop` 上存在 E1 本地 commit（含 §3.1 意图文件）  
- [ ] 提交后 typecheck + UI unit 仍绿  
- [ ] 手测状态文件记录 auto/human 分界；清单路径明确  
- [ ] NSIS 归档存在 **或** 阻塞原因写清  
- [ ] 版本仍 2.11.7；硬约束未动  
- [ ] **未** push（默认）  

---

## 6. Interfaces / patterns to follow（实现已完成，commit 勿改行为）

| 模式源 | 用途 |
|--------|------|
| `packages/ui/src/components/basic-mode/BasicSystemWorkspace.vue` | EvalCase + dual + CTA 参考实现 |
| `packages/ui/src/components/common/PostOptimizeActions.vue` | CTA 组件与 testid |
| `packages/ui/src/composables/prompt/useEvalCaseSet.ts` | 用例集状态 |
| `packages/ui/src/utils/dual-model-seed.ts` | `seedDualModelKeys` |
| `docs/project/RELEASE-RUNBOOK.md` § Desktop NSIS 段 | 构建命令 |
| `docs/project/HANDTEST-CHECKLIST-2026-07-21.md` | 手测步骤唯一权威 |
| 历史归档 README | `D:\PromtOptimizer\nsis-2026-07-20-develop-ux\README.md` |

**无新公共 API**；无新 preference 键。

---

## 7. Edge cases

| 场景 | 处理 |
|------|------|
| CRLF 警告（CURRENT.md 等） | 接受 git 规范化；勿批量 reformat 全仓 |
| commit hook 失败 | 修问题后重试；禁止 --no-verify |
| UI test 偶发 flaky | 重跑一次；仍失败则 NO-SHIP 并记日志 |
| electron-builder 仅产出 zip 无 nsis | 记异常；优先 nsis target（package.json win.target 含 nsis） |
| 磁盘不足 / 杀软锁 exe | BLOCKED NSIS；E1 commit 仍可 SHIP with notes |
| 工作树出现无关脏文件 | **不要** `git add -A`；只 add §3.1（+ status/CURRENT 若约定） |
| 用户已装旧 2.11.7 | 归档旁路安装；不强制覆盖 app\ |
| E0 人类未签字 | status 标 partial；**不**因此回滚 E1 commit |

---

## 8. File touch map（本刀允许修改）

### Must (commit E1)

- `packages/ui/src/components/context-mode/ContextSystemWorkspace.vue`  
- `packages/ui/src/components/context-mode/ContextUserWorkspace.vue`  
- `packages/ui/src/components/basic-mode/BasicUserWorkspace.vue`  
- `docs/project/NEXT-CUT-SPEC-2026-07-21-E0-E1-E2.md`  
- `docs/project/CURRENT.md`  
- `docs/project/BACKLOG-90D-2026-07-21.md`  
- `docs/project/COMPETITIVE-BRIEF.md`  

### Should (handoff / status)

- `docs/project/HANDTEST-STATUS-2026-07-21-E1.md`（新建）  
- `.pipeline/changes.md`  
- `.pipeline/test-results.md`（Tester）  
- `.pipeline/review.md`（Reviewer）  

### Outside git root（NSIS 归档）

- `D:\PromtOptimizer\nsis-2026-07-21-e1\**`  

### Do not touch

- 导出脱敏默认逻辑、Web S3 边界、auto-opt 默认、IPC 安全门闩  
- `packages/web` 引入 aws-sdk  
- 版本号 / release tag scripts 的执行（version:prepare / version:tag / version:publish）  
- 上游 remote 推送  

---

## 9. Suggested execution order (Coder)

1. Precheck git status + hard-constraint rg  
2. typecheck + ui test  
3. Stage §3.1 → commit（local）  
4. Write handtest status（static + auto results）  
5. Build desktop:ci → archive nsis-2026-07-21-e1 → optional docs commit for CURRENT archive line  
6. Write `.pipeline/changes.md`  

Tester → Reviewer 按 Phase B/C。

---

## 10. Success definition (one line)

**E1 已干净落在本地 develop；机器门禁绿；手测清单状态可追踪；2.11.7 NSIS 已归档或阻塞原因明确；硬约束与 fork-only 未破；未擅自 push。**
