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
| HANDTEST §1 CTA | **pass（活数据）** | 见「orca 驱动手测」：装机实例已有 V1 优化结果 + PostOptimize 区在树 |
| HANDTEST §2 历史 | **pass（只读）** | 历史抽屉「记录 50 / 上限 50」+ 已达上限警告文案实读 |
| HANDTEST §3 导出脱敏 | **代码+活数据佐证**（导出实测跳过） | 原生另存框 orca 抓不到；活库落盘 apiKey 明文 0、`__enc:v1:` 命中 |
| HANDTEST §4 promptfoo | **未测**（本轮范围外） | 只跑安全+可落盘项，未触发 |
| HANDTEST §5 双模型 | **pass（静态/树）** | 双模型按钮 + 列数 2/3/4 + A/B 两列在树；未点「测试全部」（避付费 LLM） |
| HANDTEST §6 Web/Desktop | **pass** | Web 无 S3 静态已验；Desktop 活库 `models[].apiKey` = `__enc:v1:` 密文实读 |

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

### orca 驱动手测（2026-07-21 · 范围：只跑安全 + 可落盘核验项）

用户定范围：**不触发付费 LLM（不点「继续优化」/「测试全部」）、不做含密钥导出**。经 `orca computer` 驱动装机实例（pid 31616 · `app\` E1+IPC asar）。

| 项 | 结论 | 证据 |
|----|------|------|
| 截图通道 | **不可用** | Windows 按窗口 bounds 截图连续抓到被遮挡的前台窗口（New API 登录页 / 本终端）；全程**信 a11y 树不信像素** |
| §1 优化闭环 | **pass** | 活实例 basic/system 已存在 V1 结果（元素 108 完整「# Role: AI提示词优化专家…」）；PostOptimize「继续优化/渲染/对比/复制」在树 |
| §2 历史上限 | **pass** | 历史抽屉实读「记录 50 / 上限 50」；警告「历史记录已达上限（50 条）。新增时会静默丢弃最旧记录…」；条数上限输入=50。**未点「应用上限」**（避免截断真实历史） |
| §3 导出脱敏 | **佐证 pass** | 数据管理「包含模型 API 密钥（不安全，默认关闭）」**默认关** + 「默认导出已脱敏」文案在树；导出走 **Electron 原生另存框**（`surfaces.dialogs=false` → orca 抓不到），实测产物未落到可读路径，故**导出实测跳过**；改以活库佐证 |
| §6/#20 Desktop 密文 | **pass** | 活库 `…\AppData\Roaming\@prompt-optimizer\desktop\prompt-optimizer-data.json`：真配 key（grok-4.5）= `__enc:v1:` 密文；明文 `apiKey` **0**（仅内置占位值 `"string"`） |
| §6/#19 Web 边界 | **pass** | 数据管理远程备份仅 R2/S3/WebDAV（桌面版无 Google Drive）；符合 B5 |
| `sk-` 明文排查 | **非泄漏** | 活库唯一 `sk-` 命中在 `user-templates`（Role-Task-Format 模板正文字面量），非密钥字段 |

未做：§4 promptfoo 导出、§5「测试全部」实跑（均需触发或超范围）。

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
| orca 驱动手测（安全项） | §1/§2/§6 **pass** · §3 佐证pass(导出实测跳过) · §4/§5 未做 | 2026-07-21 |
| 人类 GUI 手测签字 | 待（§4 promptfoo + §5 双模型实跑需人工触发） | |
