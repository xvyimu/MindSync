# PromptOptimizer 文档体系 · 二期规划（C2）

| 项 | 值 |
|----|-----|
| 日期 | 2026-07-20 |
| 基线 | 方案 C 三期已落地（见 `DOC-SYSTEM-PLAN-2026-07-20.md` §10） |
| 输入 | `FULL-SCAN-RECOMMENDATIONS-2026-07-20.md` §4（DOC-01～DOC-20） |
| 版本 | Desktop **2.11.7** · 分支 `develop` · fork-only |
| 角色 | 技术文档 + 产品（agency） |
| 约束 | **单人维护** · **fork-only** · 中文为主 · **不**重做上游文档站 · **不**批量搬 archives |

---

## 0. 一句话结论

**继续走方案 C 的轨道，进入 C2「漂移清零 + 门禁硬化」；不重开 Diátaxis / MkDocs / 巨册。**

方案 C 已解决「信谁」；C2 解决「怎么保证不再漂」——用 **最小活文档增补 + 可机检断言** 把 DOC-01～DOC-20 压到 0 开放项。

---

## 1. 现状：C 已完成 vs 仍欠

### 1.1 方案 C 已交付（勿重做）

| 交付 | 路径 / 证据 |
|------|-------------|
| L0/L1/L2 分层 | `docs/README.md` · `DOCS_POLICY.md` |
| 版本/路径 SSOT | `docs/project/CURRENT.md` |
| 工程入口 | `docs/PROJECT_HANDOFF.md` 首部已链 CURRENT / AUDIT / PLAN |
| 冻结横幅 | `archives/README` · `workspace/README` · `.pipeline` 非规范声明 |
| 机检雏形 | `scripts/check-docs-current-version.mjs` · `check-docs-freeze-banners.mjs` · `pnpm check:docs` |
| 安全文对齐 | `user/deployment/vercel.md` HMAC · `docker-runtime-security.md` |
| 有意不做 | 不物理搬 300+ archives/workspace；不做全量 Diátaxis/MkDocs |

### 1.2 扫描后仍欠（DOC 债）

来源：`FULL-SCAN-RECOMMENDATIONS-2026-07-20.md` §4.2，共 **20 条**（可独立 PR 的为主）。

| 簇 | ID | 本质 | 严重度 |
|----|-----|------|--------|
| **A 交接失真** | DOC-01～05, 13, 20 | HANDOFF §6/§7/§10/§2.2 与真实路径/分支/IPC 文件不一致 | P0 |
| **B 发版命令假** | DOC-06, 07, 15 | `pnpm release:notes:*` 不存在；`version-sync.md` 漏 desktop | P0 |
| **C 索引死链** | DOC-08～10, 19 | archives/developer README 大面积失真 | P1 |
| **D 入口缺口** | DOC-11, 12, 14, 16 | 源码 README 仍指上游 clone；PRD 停在 2.10；FULL-AUDIT 表漏 CURRENT | P1 |
| **E 门禁过窄** | DOC-17, 18 | check-docs 只守 1 个版本 + 2 个横幅 | P1 |

**健康分（扫描）：** 结构 7 / 新鲜 6 / 可操作 5 / 单一真相 6 → **24/40（≈60%）**  
C 解决了「能找到入口」；C2 要把「可操作 + 不漂移」拉到 ≥8。

### 1.3 不变量（任何方案都不得违反）

1. `CURRENT.md` 仍是版本/路径/策略**唯一**权威数字源  
2. `archives/**`、`workspace/**`、`.pipeline/**` **禁止**当正式结论  
3. `user/**` **禁止**本机绝对路径  
4. fork-only：默认不写「向上游开 PR」主路径  
5. 不批量物理迁移 300+ 历史 md（成本 > 收益）

---

## 2. 多方案对比（C 之后）

> 方案 A～E 是 **C 一期前**的 IA 选型（见 `DOC-SYSTEM-PLAN-2026-07-20.md` §3），**已选定 C 并落地**。  
> 本节对比的是 **C 之后如何消化 DOC 债** 的五条路线。

### 方案 α —「只修文字」*Patch-only*

逐条改 DOC-01～20 的 md，**不加**新检查脚本、**不建**新活文档。

| | |
|--|--|
| **结构** | 维持 C 树不变 |
| **工作量** | 0.5–1 天 |
| **复发风险** | **高**（无门禁，下次扫描再漂） |
| **活文档数** | 不增 |
| **适合** | 仅应急演示前 |

### 方案 β —「漂移清零 + 门禁硬化」*Clear + Guard* ⭐推荐（C2）

修 DOC-01～20 中 **高杠杆文字** + 落地 **精选机检**（不 10 条全上，先 5 条高 ROI）+ **2～3 篇**刚需活文档（REGISTRY / RUNBOOK / CLEANUP）。

| | |
|--|--|
| **结构** | C 不变；L1 增 2～3 篇；`check:docs` 扩到 5～7 断言 |
| **工作量** | 1～2 天（可拆 3 个 PR） |
| **复发风险** | **低**（路径/命令/版本可机检） |
| **活文档数** | ≤ 12（仍在 C 的「≤15」预算内） |
| **适合** | **当前单人 fork + 刚做完全面扫描** |

### 方案 γ —「全量扫描建议照单全收」*Scan-max*

扫描 §4.3 的 7 篇新文档 + §4.5 的 10 条 check 脚本 **全部**落地。

| | |
|--|--|
| **结构** | L1 膨胀到边界；脚本维护面大 |
| **工作量** | 3～5 天 |
| **复发风险** | 低，但 **误报/维护税** 升高（IPC 表解析、changelog 日期差等易碎） |
| **活文档数** | 逼近/超过 15 |
| **适合** | 有专职文档岗；**当前不优先** |

### 方案 δ —「Diátaxis 轻量切 user/」*Diátaxis-lite*

只对 `docs/user/` 按 Tutorial/How-to/Reference 重切；工程侧仍走 C。

| | |
|--|--|
| **结构** | user 子树重排 |
| **工作量** | 2～4 天（含中英镜像） |
| **复发风险** | 中（用户文与工程文双轨） |
| **对 DOC 债** | **几乎不修** HANDOFF/发版漂移 |
| **适合** | 对外用户文档 KPI；**不解决本轮扫描主痛** |

### 方案 ε —「MkDocs 公开站」*Docs site*

以站点为唯一发布面。

| | |
|--|--|
| **结构** | 导航驱动 |
| **工作量** | 1 周+ |
| **风险** | 本机路径/审计/fork 隐私不宜上站；与 C 的「本机双栖」冲突 |
| **适合** | 上游开源运营；**明确不推荐** 当前 fork |

### 对比表

| 维度 | α 只修字 | **β C2 清零+门禁** | γ 扫描全收 | δ Diátaxis-lite | ε MkDocs |
|------|:--------:|:------------------:|:----------:|:---------------:|:--------:|
| 消 DOC 债 | ★★★ | **★★★★★** | ★★★★★ | ★ | ★★ |
| 防再漂 | ★ | **★★★★★** | ★★★★ | ★★ | ★★★ |
| 工作量（初） | ★★★★★ | **★★★★** | ★★ | ★★ | ★ |
| 单人可维 | ★★★★ | **★★★★★** | ★★ | ★★★ | ★★ |
| 与方案 C 兼容 | ★★★★★ | **★★★★★** | ★★★ | ★★★ | ★ |
| 不打断安全/功能 | ★★★★★ | **★★★★★** | ★★ | ★★★ | ★ |
| 活文档纪律 | ★★★★ | **★★★★** | ★★ | ★★★ | ★★ |

**否决说明**

- α：修完必再漂（已有 HANDOFF §6/§7 复发史）  
- γ：10 个 check 里 IPC 解析/日期差等 ROI 低、脆  
- δ：答错题（本轮痛点是交接与发版，不是用户 IA）  
- ε：与 fork/本机审计画像冲突  

---

## 3. 最佳方案：β = 方案 C 的 C2 期

### 3.1 目标

| 指标 | C 一期后 | **C2 目标** |
|------|----------|-------------|
| 回答「装哪 / 推哪」打开文件数 | ≤1 | ≤1（保持） |
| DOC-01～20 开放项 | 20 | **0**（修或 wontfix 入 REGISTRY） |
| `pnpm check:docs` 断言数 | 2 | **6～7** |
| 约定维护的活文档 | ≤15 | **≤12**（严于 C） |
| 健康分（扫描口径） | 24/40 | **≥32/40**（可操作/单一真相 ≥8） |
| 误写 workspace 当正式结论 | 0 | 0（保持） |

### 3.2 原则

1. **文字先于脚本**：先让 HANDOFF/发版文正确，再加 check 防止回退  
2. **机检只做高确定性**：路径禁词、pnpm 脚本存在性、version 一致、archives 索引集合、freeze 横幅 — **不做**脆弱的自然语言 IPC 段落解析（DOC-20 用人工修 + 可选弱检）  
3. **新活文档 ≤3 篇刚需**：REGISTRY（债可见）· RELEASE-RUNBOOK（命令真）· CLEANUP-PLAYBOOK（替 HANDOFF §7）  
4. **扫描里 7 篇提案裁剪**：NEW-CONTRIBUTOR / CURRENT-STATE / CHECK-DOCS-HARDENING / MIGRATION-HISTORY → **不新建文件**，内容并入 HANDOFF / architecture/README / DOCS_POLICY / REGISTRY 附录  
5. **FULL-SCAN / FULL-AUDIT 只追加链接与差分表**，不重写整份审计  

### 3.3 目标树（相对 C 的增量）

```
docs/project/
├── CURRENT.md              # 已有；C2 增补：漂移债链接、tools 完整路径、channel-manifest 版本
├── DOC-DRIFT-REGISTRY.md   # 【新建】DOC-01～20 状态台账
├── RELEASE-RUNBOOK.md      # 【新建】真实 CLI 发版一步表
├── CLEANUP-PLAYBOOK.md     # 【新建】允许/禁止删除 + 真路径自检
├── release-notes.md        # 改：去掉假 pnpm release:notes:*
├── version-sync.md         # 改：对齐 sync-versions.js 双文件
├── prd.md                  # 改：2.11.x 增量段（Paper/cancel/fork）
└── ...

docs/PROJECT_HANDOFF.md     # 改：§6/§7/§10/§2.2
docs/developer/README.md    # 改：死链 / 待创建
docs/archives/README.md     # 改：索引=磁盘实况（不搬目录）
README.md / README.zh-CN.md # 改：fork clone + CURRENT 链接

scripts/
├── check-docs-current-version.mjs     # 已有
├── check-docs-freeze-banners.mjs      # 扩展文件列表
├── check-docs-handoff-paths.mjs       # 【新建】
├── check-docs-pnpm-script-refs.mjs    # 【新建】
├── check-docs-version-sync-list.mjs   # 【新建】
├── check-docs-archive-index.mjs       # 【新建】
└── check-docs-version-consistency.mjs # 【新建】（CURRENT+HANDOFF+CHANGELOG 顶）
```

**明确不建：**  
`NEW-CONTRIBUTOR.md`、`architecture/CURRENT-STATE.md`、`CHECK-DOCS-HARDENING.md`、`MIGRATION-HISTORY.md`、`check-docs-handoff-ipc-manifest.mjs`（脆）、`check-docs-handoff-changelog-freshness.mjs`（易误报）、`check-docs-developer-index.mjs`（可并入 archive-index 类集合检查或手工修一次）。

---

## 4. 三波执行（可独立 PR）

### Wave C2-A — 交接与禁区止血（约 2～4h）P0

| # | 动作 | 消债 |
|---|------|------|
| 1 | 新建 `DOC-DRIFT-REGISTRY.md`：导入 DOC-01～20，状态 open | 台账 |
| 2 | 修 HANDOFF §6：`cd` → `D:\PromtOptimizer\src\prompt-optimizer`；push → `develop` | DOC-01, 02 |
| 3 | 修 HANDOFF §7：整段改为链 `CLEANUP-PLAYBOOK.md`；同步新建 CLEANUP 真路径表 | DOC-03～05 |
| 4 | 修 HANDOFF §10 补 2026-07-20 方案 C 条目；§2.2 IPC 文件名对齐磁盘 | DOC-13, 20 |
| 5 | `check-docs-handoff-paths.mjs` 禁词：Codex 旧路径、`work/desktop-hardening` 作主路径、`PromptOptimizer\` 安装根、`nsis-2026-07-18` | 防再漂 |
| 6 | REGISTRY 将 A 簇标 fixed | |

**验收：**  
`node scripts/check-docs-handoff-paths.mjs` 绿；HANDOFF 中 `Test-Path` 示例仅含 `app\` / `nsis-2026-07-20-*`。

### Wave C2-B — 发版命令与版本 SSOT（约 2～3h）P0

| # | 动作 | 消债 |
|---|------|------|
| 1 | 新建 `RELEASE-RUNBOOK.md`：真实 `node scripts/release-notes.js …` + `version:prepare` 链 | DOC-06 |
| 2 | 改 `release-notes.md`：所有 `pnpm release:notes:*` → 真 CLI 或「见 RUNBOOK」 | DOC-06 |
| 3 | 改 `version-sync.md`：列出 extension manifest **与** desktop package.json | DOC-07 |
| 4 | `DOCS_POLICY` 表补：release-notes / version-sync / RUNBOOK / REGISTRY / CLEANUP 为 L1 | DOC-15 |
| 5 | `check-docs-pnpm-script-refs.mjs`：扫描 `docs/**/*.md` 中 `pnpm <script>` | DOC-06 |
| 6 | `check-docs-version-sync-list.mjs`：脚本 versionFiles ↔ version-sync.md | DOC-07 |
| 7 | `check-docs-version-consistency.mjs`：package.json version ∈ CURRENT / HANDOFF 首部 / CHANGELOG 顶 | DOC-17 |
| 8 | CURRENT 增补：链 REGISTRY；`tools\node-v22.17.0-win-x64`；channel-manifest 版本字段 | |

**验收：**  
`pnpm check:docs`（含新脚本）绿；按 RUNBOOK 干跑一遍命令名全部可解析。

### Wave C2-C — 索引、入口、审计表（约 2～4h）P1

| # | 动作 | 消债 |
|---|------|------|
| 1 | `archives/README.md` 重写索引 = `fs.readdir` 实况；重复编号 122 如实标注 | DOC-08, 09, 19 |
| 2 | `check-docs-archive-index.mjs` 集合比对 | 同上 |
| 3 | `developer/README.md` 去死链；「待创建」仅保留真未建 | DOC-10 |
| 4 | 源码 `README.md` / `README.zh-CN.md`：Local Development 增加 fork clone + CURRENT 链接 | DOC-11, 16 |
| 5 | PRD 增加 **§ 2.11.x fork 增量**（Paper / 图像取消 / HMAC / Docker public filter / fork-only），旧 2.10 节保留为历史 | DOC-12 |
| 6 | FULL-AUDIT §6.5 或 FULL-SCAN 差分：CURRENT 列为头号 SSOT | DOC-14 |
| 7 | 扩展 `check-docs-freeze-banners.mjs`：+ `.pipeline/INDEX.md`（若有 README 则 workspace-template） | DOC-18 |
| 8 | REGISTRY 全部 closed 或 wontfix（附理由） | |

**验收：**  
archives 索引无死链；新贡献者只读 README 能 clone 到 `xvyimu/prompt-optimizer`；REGISTRY 开放项 = 0。

### 刻意不做（C2）

| 项 | 原因 |
|----|------|
| 物理搬迁 archives/workspace | C 已否决；冻结 + 索引修正足够 |
| 10 条 check 全上 | IPC 段落解析 / changelog 日期差 脆、ROI 低 |
| 新建 7 篇扫描提案全文 | 并入现有 L0/L1，守住 ≤12 活文档 |
| MkDocs / Diátaxis user 重切 | 不解决 DOC 主债；打断安全 Wave C/D |
| 改写旧 FULL-AUDIT 全文 | 只追加 SSOT 表与链接 |

---

## 5. 与安全 / 功能波次的关系

| 工作流 | 文档 C2 关系 |
|--------|----------------|
| Wave C IPC secure 迁移 | **并行**：文档 C2-A 可先合，不挡代码 |
| Wave D CI 扩 gate | C2-B 的 `check:docs` 扩展应进 `test:repo`（与 D 同向） |
| 图像 cancel / Paper | 已在 CURRENT；C2-C PRD 增量一句即可 |
| 全面扫描报告 | 保持只读证据；C2 完成后在 REGISTRY 勾 fixed |

**建议顺序（单人）：**  
`C2-A` → `C2-B`（可与 IPC secure 穿插）→ `C2-C` → 再回头做代码 Wave C1。

---

## 6. 成功度量（C2 完成时勾选）

- [x] `pnpm check:docs` ≥ 6 个子检查且 CI/`test:repo` 调用（现为 **8** 项）  
- [x] HANDOFF §6 无 `Documents\Codex\...`、无 `work/desktop-hardening` 作为 push 主路径  
- [x] HANDOFF §7 不再维护过期禁删表（只链 CLEANUP-PLAYBOOK）  
- [x] 仓库 `docs/**/*.md` 中 `pnpm release:notes:*` 均有 package 别名或真 CLI  
- [x] `version-sync.md` 文件列表 = `sync-versions.js` versionFiles  
- [x] `archives/README` 链接集合 ⊆ 磁盘目录集合  
- [x] `DOC-DRIFT-REGISTRY` 开放项 = 0  
- [x] 活文档约定清单 ≤ 12 且写入 CURRENT 或 DOCS_POLICY  

**C2 三波执行状态（2026-07-20）：** C2-A ✅ · C2-B ✅ · C2-C ✅

---

## 7. 风险与回滚

| 风险 | 缓解 |
|------|------|
| check 过严导致 CI 红 | 新脚本先 `warn` 一周或仅本地；稳定后 `exit 1` |
| archives 索引重写丢「叙事」 | 旧索引段落移到 README 底部「历史编号说明」或 REGISTRY 附录，不删 git 历史 |
| 活文档又膨胀 | REGISTRY 强制：新建 L1 必须删/合并另一篇或升 L2 |
| 与上游 docs 冲突 | fork-only；不回灌上游文档结构 |

回滚：各 Wave 独立 commit；脚本从 `package.json` `check:docs` 去掉即可降级到 C 一期两检查。

---

## 8. 方案选择决议（给决策者）

| 问题 | 答案 |
|------|------|
| 还要不要换 IA（D/E）？ | **不要**。C 正确，欠的是执行残留。 |
| 只改字行不行（α）？ | **不行**。无门禁会回到 HANDOFF 漂移。 |
| 扫描 7+10 是否全做（γ）？ | **不做全量**；裁成 3 文 + 5～6 检。 |
| 最佳方案？ | **β = C2：漂移清零 + 门禁硬化** |
| 下一步？ | 用户确认后执行 **Wave C2-A**（先 HANDOFF + REGISTRY + CLEANUP + handoff-paths 检查） |

---

## 9. 关联文档

| 文档 | 角色 |
|------|------|
| `DOC-SYSTEM-PLAN-2026-07-20.md` | 方案 C 原文与三期完成态 |
| `src/.../docs/DOCS_POLICY.md` | 写哪里 / 禁止 |
| `src/.../docs/project/CURRENT.md` | 版本路径 SSOT |
| `FULL-SCAN-RECOMMENDATIONS-2026-07-20.md` §4 | DOC-01～20 证据 |
| `FULL-AUDIT-REPORT-2026-07-20.md` | 深度审计（C2 只补 SSOT 表） |

---

**维护：** 本文件为 L1 元文档（安装侧 `D:\PromtOptimizer\docs\`）。C2 全部完成后在 §6 勾选，并在 CURRENT「已知漂移」改为「见 REGISTRY：0 open」。
