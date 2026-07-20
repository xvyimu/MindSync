# 文档策略（DOCS_POLICY）

> **L1 元文档。** 体系：方案 C — 双层真相源 + 冻结噪音。  
> 规划：`D:\PromtOptimizer\docs\DOC-SYSTEM-PLAN-2026-07-20.md`

## 写哪里

| 内容类型 | 写入 |
|----------|------|
| 版本号、安装路径、fork 策略 | [`project/CURRENT.md`](./project/CURRENT.md) **仅此一处权威** |
| 工程目录、测试、模块 | [`PROJECT_HANDOFF.md`](./PROJECT_HANDOFF.md) |
| 产品范围 | [`project/prd.md`](./project/prd.md) |
| 部署/使用 | [`user/`](./user/)（**禁止本机绝对路径**） |
| 现行架构 | [`architecture/`](./architecture/) 且列入 [白名单](./architecture/README.md) |
| 全面审计 | `D:\PromtOptimizer\docs\FULL-AUDIT-REPORT-日期.md`（新日期新文件） |
| 过程/实验 | `.pipeline/` 或 `workspace/`（**非规范**） |

## 禁止

1. 在 `archives/**` 写现行 API/安装说明  
2. 在 `workspace/**` 维护版本号或发布说明  
3. 改写旧 `FULL-AUDIT-*` / `CLOSEOUT.md` 当现行 wiki  
4. 多处手写互相矛盾的版本号（只改 CURRENT，再改入口链接叙述）  
5. 把 `.pipeline` 当产品需求长期源  

## 检查脚本

```powershell
node scripts/check-docs-current-version.mjs
node scripts/check-docs-freeze-banners.mjs
```

（已纳入 `pnpm` / `test:repo` 相关门禁时以 `package.json` 为准。）
