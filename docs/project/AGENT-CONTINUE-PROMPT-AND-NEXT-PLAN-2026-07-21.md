# Agent 续作提示词 · 下一步规划 · 诊断手册

| 项 | 值 |
|----|-----|
| 日期 | 2026-07-21 |
| 适用仓库 | `D:\PromtOptimizer\src\prompt-optimizer` · 本仓 `xvyimu/MindSync`（原 prompt-optimizer，已脱离 fork） |
| 基线 tip | **`develop` @ 以 `git log -1` / origin 为准** |
| 产品 | **2.11.7** · 策略 **独立仓 / 不默认上游 PR** |
| 维护者用途 | 交给**其他 Agent** 开分支续作；或本人做规划/排障 |

> **读法**：§1 复制给 Agent 当 system/task 提示词；§2 是产品/工程下一步；§3 是诊断剧本；§4 是禁止项。

---

## 1. 给其他 Agent 的完整续作提示词（可整段粘贴）

```text
你是 Claude Code 工程代理，在维护者独立仓 xvyimu/MindSync 上工作，不是上游 linshenkx 仓库。

## 仓库与身份
- 路径：D:\PromtOptimizer\src\prompt-optimizer（本地目录名可保留）
- remote origin：https://github.com/xvyimu/MindSync （独立仓，默认不向上游开 PR）
- 产品名：Prompt Optimizer；包 scope：@prompt-optimizer/*（不因改名而改）
- 默认基线分支：develop（先 git fetch && git checkout develop && git pull）
- 产品版本：2.11.7；L1 版本/安装路径只信 docs/project/CURRENT.md
- 身份卡：GITHUB_IDENTITY.md
- 工具链：Node ^24、pnpm（以 packageManager 字段为准）、PowerShell 优先 pwsh

## 开工前必读（按序）
1. docs/architecture/charter.md（最高架构准则）
2. docs/project/CURRENT.md
3. docs/project/COMPETITIVE-BRIEF.md
4. docs/project/AGENT-CONTINUE-PROMPT-AND-NEXT-PLAN-2026-07-21.md（本文）
5. 若续五层/性能：docs/project/FIVE-LAYER-OPT-CHANGE-REPORT-2026-07-21.md
6. 若装机/手测：docs/project/HANDTEST-CHECKLIST-2026-07-21.md 与 HANDTEST-STATUS-*-E1.md

## 硬约束（违反即停）
1. 包边界：extension|web|desktop-renderer → ui → core；desktop-main|mcp-server → core
2. ui 禁止 re-export core 工厂；禁止 Web/UI 引入 @aws-sdk / 浏览器 S3
3. 导出默认脱敏 API Key；含密钥须二次确认
4. 主安装/默认路径自动优化必须关（ADR-005）；实验开关仅 opt-in
5. 敏感能力仅 Electron main；新 IPC 必须进 channel-manifest + secure 注册
6. 不改顶层分层、不换前端框架、不做多租户/云 Trace/Agent OS/默认 K8s
7. 不加第三方依赖，除非用户书面要求且写清理由
8. 不把 secrets、web-dist、desktop/dist 提交进 git

## 分支纪律（强制）
1. 禁止在 main 上改；本仓主线是 develop
2. 每一刀从最新 develop 开 feature 分支：
   git checkout develop && git pull origin develop
   git checkout -b feature/<短横线主题>
3. 推送：git push -u origin feature/<主题>
4. PR：只对 origin develop（--repo xvyimu/MindSync），不要对 upstream
5. 合入：维护者批准后 merge 到 develop；不要 force-push develop

## 工作方式
1. 先读代码与文档，用 10 行以内复述「现状 + 你要改的边界」再动手
2. 最小变更；每处改动能说清：缺陷 → 思路 → 收益
3. 改完必跑与触及面匹配的验证（见下）
4. 结束时写：改了什么、验证命令与结果、未做事项、风险

## 建议验证菜单（按触及面选）
- core：pnpm -F @prompt-optimizer/core build && pnpm -F @prompt-optimizer/core test:gate
- 动态模型缓存：pnpm -F @prompt-optimizer/core exec vitest run tests/unit/adapters/dynamic-models-cache.test.ts
- ui：pnpm -F @prompt-optimizer/ui typecheck && pnpm -F @prompt-optimizer/ui test --run
- desktop 契约：node --test packages/desktop/config/*.test.js
- mcp：pnpm -F @prompt-optimizer/mcp-server test
- 装机：仅当用户要求；归档到 D:\PromtOptimizer\nsis-YYYY-MM-DD-*/
- 硬约束抽查：rg "@aws-sdk" packages/ui packages/web；确认 includeSecrets 默认 false

## 当前 tip 之后的合理候选（只选用户点的一项，勿一次全做）
A. GUI 真机手测签字（HANDTEST-CHECKLIST）— 可不改代码
B. 用最新 develop tip 重打 NSIS/zip 并归档（含五层+IPC）
C. 证据包一键 zip（JSON+promptfoo.yaml+meta，无密钥）— 需规格
D. 实验 auto 设置页（默认关、非主 CTA）— 需规格
E. Desktop 装机冒烟自动化（启动+一次 IPC 成功）— 工程向
F. 仅文档：CURRENT/BRIEF/手测状态与 tip 对齐

## 排障时
1. 先看 %AppData%\Roaming\@prompt-optimizer\desktop\logs\（error.log / main.log / ipc.log）
2. IPC 初始化失败：搜 IPC_UNTRUSTED_SENDER；已有 isExplicitNonMainFrame 修复，确认 asar 是否含该符号
3. updater 404 latest.yml：本仓无 Release 通道时预期；应 soft-fail 不刷 ERROR
4. 区分 origin（xvyimu/MindSync）与 upstream（linshenkx）；gh 命令加 --repo xvyimu/MindSync

## 交付物
- 代码在 feature 分支；可选 PR 到 develop
- 若有非显然决策：写短说明到 docs/project/ 或 PR 描述
- 不要擅自：改版本号大跳、默认开 auto、Web 加 S3、向上游开 PR
```

---

## 2. 下一步规划（维护者视角 · 有序）

### 2.1 立刻（0.5–1 天 · 无/少代码）

| ID | 事项 | 出门条件 |
|----|------|----------|
| N1 | 启动 `D:\PromtOptimizer\app\PromptOptimizer.exe` 做人手测 | HANDTEST §1–§5 勾选或记 Fail |
| N2 | 若 asar 过旧：用 `nsis-2026-07-21-ipc` 或 **重打含 bbbc88a 的包** | 启动无「初始化失败」 |
| N3 | 看 CI：`gh run list --repo xvyimu/MindSync --branch develop --limit 5` | tip 上 test 绿或已知噪声 |

### 2.2 短线工程（1–3 天 · feature 分支）

| ID | 事项 | 建议分支名 | 验收 |
|----|------|------------|------|
| E1 | 最新 tip 重打 Desktop 安装包 | `feature/nsis-post-five-layer` | 归档 `nsis-*-five-layer`；asar 含 `isExplicitNonMainFrame` + E1 testid |
| E2 | 装机冒烟脚本（启动+日志无 UNTRUSTED） | `feature/desktop-smoke-script` | 文档命令 + 退出码 |
| E3 | CURRENT/手测状态与 `bbbc88a` 对齐 | `docs/sync-tip-bbbc88a` | CURRENT 链接正确 |

### 2.3 产品薄增强（仅 1 项 · 先规格）

| ID | 事项 | 规格要点 | 不做 |
|----|------|----------|------|
| P1 | 证据包 zip | 一键打包证据 JSON + promptfoo.yaml + 无 Key meta | 不上云 |
| P2 | 实验 auto UI | 设置页、默认 false、预算展示、非主 CTA | 主安装默认开 |
| P3 | Context 手测写进清单 | 勾选项与 data-testid 对齐 | 新评测矩阵 |

**纪律**：每轮只开一个 feature；竞品学习只允许带回一个 backlog 项。

### 2.4 明确延后

- Electron 43 major  
- undici 8 / 大范围 SDK 升级  
- 约束「放宽」落地（须先改 COMPETITIVE-BRIEF）  
- 上游 PR  

---

## 3. 诊断提示词（可粘贴）

### 3.1 启动失败 / 白屏 /「应用初始化失败」

```text
诊断 Prompt Optimizer Desktop 初始化失败。
路径：D:\PromtOptimizer\app 与源码 D:\PromtOptimizer\src\prompt-optimizer develop。
1) 读 %AppData%\Roaming\@prompt-optimizer\desktop\logs\error.log 与 main.log 最近 50 行
2) 若 IPC_UNTRUSTED_SENDER：核对 app.asar 是否含 isExplicitNonMainFrame（ipc-security.js）
3) 若 asar 过旧：说明需用 nsis-2026-07-21-ipc 或 develop tip 重打包覆盖
4) 区分 updater latest.yml 404（可 soft-fail）与真正 IPC/装配失败
5) 给出：根因一句话、修复步骤、是否需改代码（若需则开 feature 分支，勿直接改 develop 乱提交）
不要引入新依赖，不要放宽安全默认。
```

### 3.2 CI 红 / 本地 typecheck 红

```text
在 D:\PromtOptimizer\src\prompt-optimizer 的 develop 上排查 CI 或 typecheck 失败。
先 git status / git log -1；再按失败 job 复现最小命令。
修复时开 feature/ci-fix-<短主题>，最小 diff，跑相关 package 测试。
禁止提交 dist、禁止 --no-verify，禁止改 charter 边界。
```

### 3.3 性能 / 限流 / 模型列表慢

```text
基于 develop@bbbc88a：动态模型列表已有 AbstractAdapterRegistry 30s TTL + inflight。
若用户仍遇限流：先确认是否走 getDynamicModels、缓存键是否因 baseURL 抖动失效。
只允许内部实现优化（缓存/合并/日志），不要加全局假 RPM 产品功能，除非用户明确要求并改 BRIEF。
```

### 3.4 安全回归抽查

```text
只读抽查：
- packages/ui 与 packages/web 无 @aws-sdk 生产依赖
- exportAllData / includeSecrets 默认脱敏
- experimental auto enabled 仅 === true
- 新 IPC 是否在 channel-manifest
输出 PASS/FAIL 表，不改代码除非发现回归且用户要求修。
```

---

## 4. 禁止与冲突处理

| 情况 | 做法 |
|------|------|
| 用户要求「放宽脱敏/Web S3/默认 auto」 | 先改 COMPETITIVE-BRIEF，再开规格；禁止 silent |
| gh pr 指错仓库 | 始终 `--repo xvyimu/MindSync` |
| 误在 develop 直接大改 | cherry-pick 到 feature 或 reset 未推送提交；已推送则 revert |
| 与上游冲突 | 独立仓：以己方 develop 为准，安全补丁可 cherry-pick |

---

## 5. 给维护者的「一句话开工」

| 目标 | 对 Agent 说 |
|------|-------------|
| 手测 | 继续 PromptOptimizer 手测，按 HANDTEST-CHECKLIST 勾选，装机路径 app\ |
| 重打包 | 从 develop 最新 tip 开 feature 打 desktop build:ci，归档到 D:\PromtOptimizer\nsis-… |
| 薄功能 | 按 AGENT-CONTINUE §2.3 只做 P1 或 P2，先写 NEXT-CUT 规格再实现 |
| 排障 | 粘贴 §3.1 诊断提示词 |

---

## 6. 状态快照（写文档时）

| 项 | 值 |
|----|-----|
| develop tip | 以 `git log -1` / origin 为准 |
| 仓库身份 | `xvyimu/MindSync` · 见 `GITHUB_IDENTITY.md` |
| 五层 | 已合 PR#5 |
| 装机归档 | `nsis-2026-07-21-ipc`（五层之后若再打则更新 CURRENT） |

**维护：** tip 前进时只改 CURRENT + 本文件 §6 + handoff 记忆；勿复制过期 SHA 到多处当真相。
