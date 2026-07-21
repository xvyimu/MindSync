# PromptOptimizer 项目文档体系规划

| 项 | 值 |
|----|-----|
| 日期 | 2026-07-20 |
| 范围 | fork `xvyimu/prompt-optimizer` · 本机 `D:\PromtOptimizer` · 源码 `src\prompt-optimizer` |
| 版本 | Desktop **2.11.7** · 分支 `develop` |
| 角色 | 技术文档 + 产品（agency eng profile） |
| 约束 | **单人维护** · **fork-only** · 中文为主 · 不重做上游文档站 |

---

## 1. 现状诊断

### 1.1 体量（源码 `docs/`）

| 区域 | 约 md 数 | 角色 |
|------|--------:|------|
| `archives/` | **133** | 历史功能点开发档案（高噪音） |
| `workspace/` | **112** | 临时开发笔记（极易过期） |
| `testing/` | 32 | 测试/自动化 |
| `architecture/` | 15 | 现行架构事实（质量不均） |
| `developer/` | 14 | 开发指南 |
| `user/` | 14 | 用户/部署 |
| `project/` | 8 | PRD/状态（**版本滞后**） |
| 其他 | 少量 | deployment/guides/migration |
| **合计** | **~346** | + 根 README / CHANGELOG |
| `.pipeline/` | 12 | Ship/优化过程（不进产品文档） |
| 安装侧 | 3+ | `D:\PromtOptimizer\{README,CLOSEOUT,docs/FULL-AUDIT…}` |

### 1.2 真相源分裂（核心问题）

```
读者问「现在该信谁？」
        │
        ├─ docs/PROJECT_HANDOFF.md     ← 工程交接（路径已 07-20 部分更新，章节仍含旧分支名）
        ├─ D:\…\FULL-AUDIT-REPORT…     ← 全面检查（安装侧，最全但长）
        ├─ D:\…\CLOSEOUT.md            ← 07-18 历史收口
        ├─ D:\…\README.md              ← 安装入口（已更新）
        ├─ docs/project/*              ← 仍写 v2.10.0 / 2026-05
        ├─ docs/README.md              ← 角色导航（不知 HANDOFF/AUDIT）
        ├─ .pipeline/*                 ← 过程产物，易被当现行规范
        └─ archives/ + workspace/      ← 历史/草稿噪音
```

### 1.3 文档债务（分级）

| ID | 级 | 债务 |
|----|----|------|
| D1 | P0 | **多 SSOT**：安装路径/策略/版本在 4+ 处互相矛盾 |
| D2 | P0 | `docs/project` 版本停在 **2.10.0**，与 2.11.7 + Paper + P0 安全脱节 |
| D3 | P1 | `docs/README` 不指向 HANDOFF / FULL-AUDIT / 本机 `app` |
| D4 | P1 | `PROJECT_HANDOFF` 仍残留 `work/desktop-hardening` 等旧分支叙述 |
| D5 | P1 | `workspace/` 112 篇无归档策略，搜索污染 |
| D6 | P2 | `archives/` 133 篇无「只读冻结」标签，新人当现行设计读 |
| D7 | P2 | 用户文档与安全变更（HMAC 会话、Docker 不注入 key）未同步英文镜像 |
| D8 | P2 | Diátaxis 混用：教程/How-to/Reference/Explanation 挤在同一目录 |

---

## 2. 受众与任务地图

| 受众 | 典型任务 | 应读（目标态） | 不应读 |
|------|----------|----------------|--------|
| **你自己（维护者）** | 改代码、打包、排障 | `PROJECT_HANDOFF` → `DEV-WORKFLOW` → architecture 相关篇 | CLOSEOUT 全文、旧 pipeline 当规范 |
| **未来的你（3 个月后）** | 「装哪、跑哪、信哪」 | 安装侧 `README` + HANDOFF §0 | workspace 草稿 |
| **产品决策** | 范围/优先级 | `docs/project/prd`（刷新后）+ FULL-AUDIT §1/§10 | archives |
| **部署用户（Docker/Vercel）** | 部署与密码 | `docs/user/deployment/*` | HANDOFF、.pipeline |
| **桌面用户** | 安装/主题/更新 | 安装 README + 用户手册（若有） | 源码 docs 深层 |
| **贡献者（若有）** | 开发环境 | developer/* + HANDOFF 边界规则 | 本机绝对路径段落 |
| **审计/安全** | 威胁与控制 | FULL-AUDIT §5 + architecture/storage | project-status 营销式完成度 |

---

## 3. 四种（+）方案对比

### 方案 A —「轻量修补」*Status-quo patch*

只改过期数字和坏链接，不改目录。

| | |
|--|--|
| **结构** | 保持 346 篇原样 |
| **工作量** | 0.5–1 天 |
| **维护成本** | 仍高（多 SSOT） |
| **风险** | 债务复发；搜索依旧嘈杂 |
| **适合** | 仅临时止血 |

### 方案 B —「单一巨册」*One Mega Doc*

把一切并进超长 `PROJECT_HANDOFF` 或单一 Wiki。

| | |
|--|--|
| **结构** | 1 个 5k+ 行 markdown |
| **工作量** | 2–3 天合并 |
| **维护成本** | 极高（每次改都碰巨文件） |
| **风险** | 合并冲突、可读性崩 |
| **适合** | 极短期交接 U 盘场景，不适合持续演进 |

### 方案 C —「双层真相源 + 冻结噪音」*Dual SSOT + Freeze* ⭐推荐

**活文档（少而准）** 与 **冻文档（多而只读）** 分离；安装侧与源码侧各一个入口，互相链接。

| | |
|--|--|
| **结构** | 见 §6 目标树 |
| **工作量** | 第 1 期 0.5–1 天；第 2 期 1–2 天；第 3 期按需 |
| **维护成本** | 低：约定「只改活文档」 |
| **风险** | 需纪律执行「禁止写 workspace 当正式」 |
| **适合** | **单人 fork + 本机产品**（当前画像） |

### 方案 D —「完整 Diátaxis 重构」*Full IA rebuild*

按 Tutorial / How-to / Reference / Explanation 重切全部 docs，可选 mkdocs 站。

| | |
|--|--|
| **结构** | 新 IA + 大量迁移 |
| **工作量** | 1–2 周 |
| **维护成本** | 中（结构清晰后较低） |
| **风险** | 范围蔓延；打断当前功能迭代 |
| **适合** | 团队文档岗 / 对外文档站 KPI |

### 方案 E —「仅文档站」*MkDocs-only*

以 `mkdocs/` 为唯一发布面，仓库 md 当源。

| | |
|--|--|
| **结构** | 站点导航驱动 |
| **工作量** | 中高（站配置+内容清洗） |
| **维护成本** | 中 |
| **风险** | 本机路径/审计报告不适合上公开站；fork 隐私 |
| **适合** | 上游开源运营；**不优先**当前 fork |

### 对比表

| 维度 | A 轻量 | B 巨册 | **C 双层冻结** | D Diátaxis | E MkDocs |
|------|:------:|:------:|:--------------:|:----------:|:--------:|
| 找得到 | ★★ | ★★★ | **★★★★** | ★★★★★ | ★★★★ |
| 不漂移 | ★ | ★★ | **★★★★** | ★★★★ | ★★★ |
| fork/本机友好 | ★★★ | ★★ | **★★★★★** | ★★ | ★★ |
| 工作量（初置） | ★★★★★ | ★★ | **★★★★** | ★ | ★★ |
| 可渐进 | ★★★ | ★ | **★★★★★** | ★★ | ★★ |
| 噪音隔离 | ★ | ★★ | **★★★★★** | ★★★★ | ★★★ |

---

## 4. 推荐方案：C — 双层真相源 + 冻结噪音

### 4.1 为什么是 C

1. **匹配单人维护**：活文档 ≤10 个「必须保持正确」的文件，其余只读。  
2. **承认双栖现实**：源码在 git，安装/审计在 `D:\PromtOptimizer`——硬揉成一个文件会再次漂移。  
3. **可渐进**：第 1 期只改入口与过期版本，不搬 300 篇。  
4. **与已有资产兼容**：FULL-AUDIT、HANDOFF、user 部署文档都保留，只规定层级。  
5. **避免 D/E 的范围爆炸**：功能与安全迭代优先于文档美学。

### 4.2 双层模型

```
┌─────────────────────────────────────────────────────────┐
│ L0  入口（各 1 页，必须正确）                              │
│   源码：docs/PROJECT_HANDOFF.md                          │
│   安装：D:\PromtOptimizer\README.md                      │
│   互相只链到对方 + L1，不链到 archives 细节                │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│ L1  活文档 Living（改代码时允许/应当更新）                 │
│   · docs/project/prd.md（范围）                          │
│   · docs/project/CURRENT.md（新建：版本/策略/路径快照）    │
│   · docs/developer/development.md + DEV-WORKFLOW         │
│   · docs/architecture/*（仅标记为「现行」的清单）         │
│   · docs/user/deployment/*（含安全会话/Docker 过滤）       │
│   · D:\…\docs\FULL-AUDIT-REPORT-*.md（按审计轮次追加）    │
│   · docs/project/SMOKE-CHECKLIST-*.md                    │
└───────────────────────────┬─────────────────────────────┘
                            │
┌───────────────────────────▼─────────────────────────────┐
│ L2  冻文档 Frozen（默认只读；新内容禁止写入）              │
│   · docs/archives/**                                     │
│   · docs/workspace/** → 迁入 archives 或删除可再生件     │
│   · .pipeline/**（过程产物；索引说明「非规范」）           │
│   · CLOSEOUT.md 及历史 nsis 旁注                         │
└─────────────────────────────────────────────────────────┘
```

### 4.3 规则（写进 HANDOFF / docs/README）

| 规则 | 内容 |
|------|------|
| **R1 单一问题单一入口** | 「怎么跑起来」→ 安装 README；「怎么开发」→ HANDOFF §0；「查风险」→ 最新 FULL-AUDIT |
| **R2 版本号只写一处活文档** | `docs/project/CURRENT.md`；其他只引用 |
| **R3 禁止** | 在 `workspace/` 新增「正式结论」；结论必须升到 L1 |
| **R4 禁止** | 把本机绝对路径写进 `docs/user/**`（用户文档用占位符） |
| **R5 archives** | 顶部统一横幅：`> 归档只读 · 非现行行为` |
| **R6 审计报告** | 落在 `D:\PromtOptimizer\docs\`，源码 HANDOFF 只保留链接 |
| **R7 fork-only** | 文档默认不写「向上游开 PR」流程，除非单独章节 |

---

## 5. 目标目录树（稳态）

```
D:\PromtOptimizer\
├── README.md                          # L0 安装入口
├── docs\
│   ├── FULL-AUDIT-REPORT-2026-07-20.md
│   └── DOC-SYSTEM-PLAN-2026-07-20.md  # 本规划
├── CLOSEOUT.md                        # L2 历史
├── app\                               # 运行
└── src\prompt-optimizer\
    ├── README.zh-CN.md                # 上游式产品介绍（可保留）
    ├── docs\
    │   ├── README.md                  # 角色导航 → L0/L1（重写）
    │   ├── PROJECT_HANDOFF.md         # L0 工程入口
    │   ├── project\
    │   │   ├── CURRENT.md             # 【新建】现行版本/路径/策略
    │   │   ├── prd.md                 # 活：范围
    │   │   ├── DEV-WORKFLOW.md
    │   │   ├── SMOKE-CHECKLIST-*.md
    │   │   ├── project-status.md      # 标为历史或改写为指向 CURRENT
    │   │   └── README.md              # 指向 CURRENT
    │   ├── developer\                 # L1
    │   ├── user\                      # L1
    │   ├── architecture\
    │   │   ├── README.md              # 【新建】现行架构索引（白名单链接）
    │   │   └── *.md                   # 未入白名单的标「可能过期」
    │   ├── testing\                   # L1 测试说明
    │   ├── archives\                  # L2 冻结
    │   └── workspace\                 # L2：清空或整目录迁 archives/workspace-2026
    └── .pipeline\                     # L2 过程
```

---

## 6. 三期落地（可执行）

### 第 1 期 — 入口止血（0.5–1 天）✅ 建议立即做

**目标**：任何人 30 秒知道信谁。

| # | 交付物 |
|---|--------|
| 1 | 新建 `docs/project/CURRENT.md`：版本 2.11.7、fork-only、`D:\PromtOptimizer\app`、develop tip、Paper、P0 安全摘要、链接 FULL-AUDIT/HANDOFF |
| 2 | 重写 `docs/README.md` 顶部：三入口表（安装/开发/审计）+ L1/L2 说明 |
| 3 | `docs/project/README.md` 去掉「当前 v2.10.0」主叙事，改链 CURRENT |
| 4 | `PROJECT_HANDOFF` 删/改旧分支 `work/desktop-hardening` 为主路径叙述；§0 已较新可微调 |
| 5 | `docs/architecture/README.md` 白名单：storage-runtime、function-mode、electron-adapter 等现行篇 |
| 6 | `.pipeline/INDEX.md` 加一句：非产品规范 |

**验收**：新开对话只给 `CURRENT.md` 能答对安装路径与策略。

### 第 2 期 — 活文档对齐（1–2 天）

| # | 交付物 |
|---|--------|
| 1 | `user/deployment/vercel.md` 等与 HMAC 会话、Docker 过滤一致（中文优先；英文可后补） |
| 2 | `developer/development.md` 克隆 URL 增加 fork 说明；engines Node 22 |
| 3 | PRD 增补：Paper 主题、取消流、fork 边界（不扩企业云） |
| 4 | `project-status.md` 页眉标记 **Superseded by CURRENT.md** 或压缩为变更日志 |
| 5 | FULL-AUDIT 在 HANDOFF/CURRENT 双向链接固定 |

### 第 3 期 — 噪音治理（按需，可拆周）

| # | 交付物 |
|---|--------|
| 1 | `workspace/**`：有结论的升 L1；其余移 `archives/workspace-dump-2026-07` 或删除可再生 |
| 2 | `archives/**` 批量加只读横幅（脚本） |
| 3 | 可选：mkdocs 只发布 `user/` + 精简 developer（**不做**全量 346） |
| 4 | 文档 CI：检查 CURRENT 版本号 = root package.json（简单脚本） |

---

## 7. 与 FULL-AUDIT / HANDOFF 的关系

| 文档 | 层级 | 职责 | 更新触发 |
|------|------|------|----------|
| **PROJECT_HANDOFF** | L0 源码 | 目录、git、怎么 build/test、模块地图摘要 | 目录/流程变更 |
| **安装 README** | L0 本机 | 怎么启动、装哪、别删什么 | 安装根变更 |
| **FULL-AUDIT-*** | L1 审计 | 边界/安全/模块/backlog 深报告 | 每轮全面检查 |
| **CURRENT.md** | L1 快照 | 一页纸「现在」 | 每个里程碑/发版 |
| **本规划 DOC-SYSTEM-PLAN** | L1 元文档 | 文档怎么管 | 文档策略变更 |
| **CLOSEOUT / .pipeline** | L2 | 历史证据 | 原则上不改 |

**冲突解决顺序**：`CURRENT`（事实快照）> `HANDOFF`/`安装 README`（入口）> `FULL-AUDIT`（深度）> 其他 → archives 仅参考。

---

## 8. 明确不推荐（当前阶段）

| 做法 | 原因 |
|------|------|
| 立刻 Diátaxis 全库搬家 | 性价比低，打断功能/安全节奏 |
| 删光 archives | 排障与溯源仍有价值；冻结即可 |
| 把 FULL-AUDIT 拆进 20 个小文件 | 单人维护成本上升 |
| 公开 mkdocs 含本机绝对路径 | 隐私与无意义 |
| 继续往 workspace 写正式结论 | 漂移根源 |

---

## 9. 成功度量

| 指标 | 目标（第 1 期后） |
|------|------------------|
| 回答「安装路径」所需打开文件数 | ≤ 1（README 或 CURRENT） |
| 活文档数量（约定维护） | ≤ 15 |
| project 目录展示版本 | = package.json `2.11.7` |
| 新文档误写入 workspace 作为正式结论 | 0 |

---

## 10. 执行状态（2026-07-20）

已按 **方案 C** 落地三期要点（详见 git / 源码 docs）：

| 期 | 状态 | 交付 |
|----|------|------|
| 1 入口止血 | ✅ | `docs/project/CURRENT.md` · 重写 `docs/README.md` · project/architecture/workspace/archives 入口 · HANDOFF 主路径 develop · `.pipeline` 非规范声明 |
| 2 活文档对齐 | ✅ | PRD fork 增量 · development fork clone · project-status superseded · vercel HMAC 已有 · Docker 安全文 · 安装 README/CLOSEOUT 分层 |
| 3 噪音治理 | ✅ | L2 README 冻结横幅 · `scripts/check-docs-*.mjs` · `pnpm check:docs` / 纳入 test:repo · `docs/DOCS_POLICY.md` |

**未做（有意）：** 不物理搬迁 300+ archives/workspace 文件；不做全量 Diátaxis/MkDocs 重建。
