# 文档漂移台账（DOC-DRIFT-REGISTRY）

> **L1 活文档。** 登记 `FULL-SCAN-RECOMMENDATIONS-2026-07-20.md` §4 中 DOC-01～DOC-20 的关闭状态。  
> 体系：方案 C2 — 见 `D:\PromtOptimizer\docs\DOC-SYSTEM-PLAN-C2-2026-07-20.md`  
> **版本/路径数字仍以 [`CURRENT.md`](./CURRENT.md) 为准。**

| 项 | 值 |
|----|-----|
| 更新日期 | 2026-07-20 |
| 扫描来源 | `D:\PromtOptimizer\docs\FULL-SCAN-RECOMMENDATIONS-2026-07-20.md` §4 |
| Wave | **C2-A + C2-B + C2-C 已完成** · **open = 0** |

---

## 状态图例

| 状态 | 含义 |
|------|------|
| `open` | 未修 |
| `fixed` | 已改文档/脚本，可机检或人工复核 |
| `wontfix` | 有意不修（附理由） |
| `deferred` | 排入后续 Wave |

---

## 台账

| ID | 簇 | 摘要 | 状态 | Wave | 备注 |
|----|----|------|------|------|------|
| DOC-01 | A | HANDOFF §6 旧 Codex 源码路径 | **fixed** | C2-A | |
| DOC-02 | A | HANDOFF §6 push 僵尸分支 | **fixed** | C2-A | |
| DOC-03 | A | 禁删含废弃 `PromptOptimizer\` | **fixed** | C2-A | CLEANUP-PLAYBOOK |
| DOC-04 | A | 禁删含不存在 `nsis-2026-07-18` | **fixed** | C2-A | |
| DOC-05 | A | 清理自检指向废弃路径 | **fixed** | C2-A | |
| DOC-06 | B | release:notes 命令 | **fixed** | C2-B | package 别名 + RUNBOOK |
| DOC-07 | B | version-sync 漏 desktop | **fixed** | C2-B | |
| DOC-08 | C | archives/README 死链 | **fixed** | C2-C | 索引=磁盘 36 目录 |
| DOC-09 | C | archives 编号/122 漏登 | **fixed** | C2-C | 同号多目录如实列出 |
| DOC-10 | C | developer/README 死链/待创建 | **fixed** | C2-C | 重写索引 |
| DOC-11 | D | 源码 README clone 上游 | **fixed** | C2-C | EN/ZH → xvyimu |
| DOC-12 | D | PRD 图像取消等滞后 | **fixed** | C2-C | §1.1 补图像 cancel / 类型门禁 |
| DOC-13 | A | HANDOFF §10 断档 | **fixed** | C2-A | |
| DOC-14 | D | FULL-AUDIT 表漏 CURRENT | **fixed** | C2-C | §6.5 重写 SSOT 表 |
| DOC-15 | B | DOCS_POLICY 未登发版文 | **fixed** | C2-B | |
| DOC-16 | D | 源码 README 缺 L0/L1 | **fixed** | C2-C | CURRENT + HANDOFF 链 |
| DOC-17 | E | check-docs 版本过窄 | **fixed** | C2-B | version-consistency |
| DOC-18 | E | freeze 只查 2 文件 | **fixed** | C2-C | + `.pipeline/INDEX.md` |
| DOC-19 | C | 同 DOC-09 | **fixed** | C2-C | 合并关闭 |
| DOC-20 | A | HANDOFF §2.2 IPC 文件名 | **fixed** | C2-A | |

---

## 计数

| 状态 | 数量 |
|------|-----:|
| open | **0** |
| fixed | **20** |
| wontfix | 0 |
| deferred | 0 |
| **合计** | **20** |

C2 完成标准：`open = 0` ✅

---

## 机检（`pnpm check:docs` / 逐条 node）

```powershell
cd D:\PromtOptimizer\src\prompt-optimizer
node scripts/check-docs-current-version.mjs
node scripts/check-docs-freeze-banners.mjs
node scripts/check-docs-handoff-paths.mjs
node scripts/check-docs-pnpm-script-refs.mjs
node scripts/check-docs-version-sync-list.mjs
node scripts/check-docs-version-consistency.mjs
node scripts/check-docs-archive-index.mjs
node scripts/check-docs-source-readme-fork.mjs
```

---

## 维护

- 新漂移：加行 `open`，修完改 `fixed`。  
- 新建 L1：登记 `DOCS_POLICY`；活文档约定 ≤12。  
