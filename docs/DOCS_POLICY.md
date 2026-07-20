# 文档策略（DOCS_POLICY）

> **L1 元文档。** 体系：方案 C — 双层真相源 + 冻结噪音；二期 C2 — 漂移清零 + 门禁硬化。  
> 规划：`D:\PromtOptimizer\docs\DOC-SYSTEM-PLAN-2026-07-20.md` · C2：`DOC-SYSTEM-PLAN-C2-2026-07-20.md`

## 写哪里

| 内容类型 | 写入 |
|----------|------|
| 版本号、安装路径、fork 策略 | [`project/CURRENT.md`](./project/CURRENT.md) **仅此一处权威数字** |
| 工程目录、测试、模块 | [`PROJECT_HANDOFF.md`](./PROJECT_HANDOFF.md) |
| 产品范围 | [`project/prd.md`](./project/prd.md) |
| 部署/使用 | [`user/`](./user/)（**禁止本机绝对路径**） |
| 现行架构 | [`architecture/`](./architecture/) 且列入 [白名单](./architecture/README.md) |
| 全面审计 / 扫描建议 | `D:\PromtOptimizer\docs\FULL-AUDIT-REPORT-*.md` · `FULL-SCAN-RECOMMENDATIONS-*.md` |
| **文档漂移台账** | [`project/DOC-DRIFT-REGISTRY.md`](./project/DOC-DRIFT-REGISTRY.md) |
| **磁盘清理允许/禁止** | [`project/CLEANUP-PLAYBOOK.md`](./project/CLEANUP-PLAYBOOK.md) |
| **发版一步表** | [`project/RELEASE-RUNBOOK.md`](./project/RELEASE-RUNBOOK.md) |
| 版本说明文件约定 | [`project/release-notes.md`](./project/release-notes.md) |
| 版本同步范围 | [`project/version-sync.md`](./project/version-sync.md)（须 = `sync-versions.js`） |
| 过程/实验 | `.pipeline/` 或 `workspace/`（**非规范**） |

## 禁止

1. 在 `archives/**` 写现行 API/安装说明  
2. 在 `workspace/**` 维护版本号或发布说明  
3. 改写旧 `FULL-AUDIT-*` / `CLOSEOUT.md` 当现行 wiki  
4. 多处手写互相矛盾的版本号（只改 CURRENT，再改入口链接叙述）  
5. 把 `.pipeline` 当产品需求长期源  
6. 在 `PROJECT_HANDOFF` 维护过期禁删/自检表（只链 CLEANUP-PLAYBOOK）  
7. 文档中写不存在的 `package.json` scripts（机检：`check-docs-pnpm-script-refs`）  

## 检查脚本

```powershell
cd D:\PromtOptimizer\src\prompt-optimizer
# 推荐 Node 24；或逐条 node：
node scripts/check-docs-current-version.mjs
node scripts/check-docs-freeze-banners.mjs
node scripts/check-docs-handoff-paths.mjs
node scripts/check-docs-pnpm-script-refs.mjs
node scripts/check-docs-version-sync-list.mjs
node scripts/check-docs-version-consistency.mjs
# 聚合（engines 满足时）：
pnpm check:docs
```

（已纳入 `package.json` 的 `check:docs` / 部分 `test:repo` 文档检查；以 scripts 字段为准。）
