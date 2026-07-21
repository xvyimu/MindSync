# Handtest status E1 · 2026-07-21

| 项 | 值 |
|----|-----|
| 日期 | 2026-07-21 |
| 产品 | 2.11.7 fork · `develop` |
| 源码 tip | `1e2346e` feat(ui): E1 entry parity CTA+EvalCase+dual on Context and Basic User |
| 功能 tip（E1 前） | `fe12cbf`（D3/D4） |
| 清单权威 | `docs/project/HANDTEST-CHECKLIST-2026-07-21.md` |
| Push | **not done**（by design） |

---

## 机器侧（auto）

| 区 | 结果 | 备注 |
|----|------|------|
| 机器 typecheck | **pass** | `pnpm -F @mindsync/ui typecheck` · vue-tsc exit 0 |
| 机器 UI unit | **pass** | `pnpm -F @mindsync/ui test` · 929 passed \| 4 skipped \| 1 todo · ~50s |
| data-testid 静态 | **pass** | 全部命中 packages/ui/src（见下表） |
| 硬约束 `@aws-sdk` | **pass** | packages/web 无命中；packages/ui 仅 tests unit remote-backup.spec.ts |
| 硬约束 includeSecrets | **pass** | core data manager / types / export-secrets 仍在 |
| 版本 | **pass** | 仍 2.11.7；无 version bump commit |
| 安装 exe 存在 | **yes · E1 已装入 app\\** | 2026-07-21 便携 zip 覆盖；asar **71188635**；backup=`app-backup-2026-07-20-pre-e1` |

### data-testid 命中清单

| testid | 位置 |
|--------|------|
| `basic-user-eval-case-open` | BasicUserWorkspace.vue |
| `basic-user-test-dual-model` | BasicUserWorkspace.vue |
| `pro-multi-eval-case-open` | ContextSystemWorkspace.vue |
| `pro-multi-test-dual-model` | ContextSystemWorkspace.vue |
| `pro-variable-eval-case-open` | ContextUserWorkspace.vue |
| `pro-variable-test-dual-model` | ContextUserWorkspace.vue |
| `post-optimize-cta` | PostOptimizeActions.vue（共享） |

E1 增量重点（静态已具备；GUI 见 human）：

- Context System / Context User：优化成功后 `post-optimize-cta` 可挂接  
- 四工作区均可 `*-eval-case-open`（Basic System 既有 + 本刀三区）  
- Context + Basic 测试区 `*-test-dual-model`

---

## GUI / 人类侧（partial · 待人类）

按 `HANDTEST-CHECKLIST-2026-07-21.md` §1–§6 勾选；本流水线 **未** 做真 LLM 点击流。

| 区 | 结果 | 备注 |
|----|------|------|
| HANDTEST §1 CTA | **partial/human** | 需真优化 LLM；E1 代码与 testid 已就位 |
| HANDTEST §2 历史 | **partial/human** | 非 E1 增量；既有能力 |
| HANDTEST §3 导出脱敏 | **partial/human** | 代码路径未改；需导出 JSON 肉眼确认 |
| HANDTEST §4 promptfoo | **partial/human** | 需下载 yaml 检查 |
| HANDTEST §5 双模型 | **partial/human** | testid 就位；需 ≥2 文本模型实跑 |
| HANDTEST §6 Web/Desktop | **partial/human** | Web 无 S3 静态已验；Desktop 密文落盘需装机 |

### 安装记录（2026-07-21 选项 1）

| 项 | 值 |
|----|-----|
| 方式 | 便携 zip 覆盖（**非**跑 NSIS 安装器；`app\` 原为便携树） |
| 源 | `D:\PromtOptimizer\nsis-2026-07-21-e1\PromptOptimizer-2.11.7-win-x64.zip` |
| 目标 | `D:\PromtOptimizer\app\` |
| 回滚 | 删/改名 `app\` → 恢复 `D:\PromtOptimizer\app-backup-2026-07-20-pre-e1\` |
| asar E1 字符串 | **HIT** `pro-multi-eval-case-open` · `pro-variable-eval-case-open` · `basic-user-eval-case-open` · `post-optimize-cta` · `pro-multi-test-dual-model` |
| 启动 | 初次 **FAIL** → 见下「IPC 信任修复」；补丁后 **ok** |

### IPC 信任修复（初始化失败根因）

| 项 | 值 |
|----|-----|
| 症状 | UI「应用初始化失败，请刷新或联系支持」 |
| 日志 | `IPC request sender is not trusted` / `IPC_UNTRUSTED_SENDER` |
| 根因 | `isTrustedRendererSender` 要求 `senderFrame.isMainFrame === true`；Electron 41 合法主 frame 可能缺该属性 → 全 IPC 被拒 |
| 修复 | `packages/desktop/config/ipc-security.js`：仅 **明确 false** 时拒子 frame；`window-security` Windows 路径大小写归一 |
| 单测 | `node --test packages/desktop/config/ipc-security.test.js` 等 **9 pass** |
| 热补丁 | 已写入当前 `app\resources\app.asar`（备份 `app.asar.bak-pre-ipc-fix`） |
| 源码 commit | 见 `git log -1`（fix desktop IPC trust） |
| 验证 | 重启后 stderr **无** 新 UNTRUSTED（updater 404 仍为噪声、非阻塞） |

### Smoke path（人类 GUI · 装机后）

1. 已启动：`D:\PromtOptimizer\app\PromptOptimizer.exe`（**E1 asar**）。  
2. 按 `HANDTEST-CHECKLIST-2026-07-21.md` §1–§6 勾选。  
3. E1 重点：Context System/User 优化后 CTA；四区 EvalCase open；双模型按钮。

---

## 签名

| 角色 | 状态 | 日期 |
|------|------|------|
| pipeline-coder（机器侧） | auto **pass** · GUI **partial/human** | 2026-07-21 |
| pipeline-tester | T1–T10 PASS | 2026-07-21 |
| 安装到 app\\ | **done** · asar HIT · 进程启动 | 2026-07-21 |
| 人类 GUI 手测签字 | 待 | |
