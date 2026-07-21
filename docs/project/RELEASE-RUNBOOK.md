# 发版操作手册（RELEASE-RUNBOOK）

> **L1 活文档。** 发版命令以根 `package.json` `scripts` 与 `scripts/release-notes.js` / `scripts/sync-versions.js` 为准。  
> 版本号权威数字仍只写 [`CURRENT.md`](./CURRENT.md)（发版后同步更新）。  
> 详细文件约定见 [`release-notes.md`](./release-notes.md) · 同步机制见 [`version-sync.md`](./version-sync.md)。

| 项 | 值 |
|----|-----|
| 日期 | 2026-07-20 |
| 源码根 | `D:\PromtOptimizer\src\prompt-optimizer` |
| 策略 | 独立仓 MindSync · 不默认上游 PR · 默认分支 `develop` |

---

## 0. 前置

```powershell
cd D:\PromtOptimizer\src\prompt-optimizer
# 推荐 Node 24（engines ^24；系统 Node 即可）
node scripts/check-docs-current-version.mjs
# 或完整文档门禁（Node 24 下也可用 pnpm check:docs）：
# node -e "require('child_process').execSync('node scripts/check-docs-current-version.mjs&&node scripts/check-docs-freeze-banners.mjs&&node scripts/check-docs-handoff-paths.mjs&&node scripts/check-docs-pnpm-script-refs.mjs&&node scripts/check-docs-version-sync-list.mjs&&node scripts/check-docs-version-consistency.mjs',{stdio:'inherit'})"
```

建议发版前：`pnpm test:gate`（或至少 core/ui 相关门禁）在 Node 24 下通过。

---

## 1. 真实 CLI 对照表

| 意图 | 推荐命令 | 等价 |
|------|----------|------|
| 同步版本到 extension manifest + desktop package.json | `pnpm version:sync` | `node scripts/sync-versions.js` |
| 升版本（不打 tag） | `pnpm version:prepare patch` 等 | `pnpm version --no-git-tag-version patch` |
| 生成 en/zh-CN release 模板 | `pnpm release:notes:new` | `node scripts/release-notes.js new [version]` |
| 校验当前版本说明（CHANGELOG 须置顶） | `pnpm release:notes:check` | `node scripts/release-notes.js check [version]` |
| 校验历史条目（不必置顶） | `pnpm release:notes:check:entry vX.Y.Z` | `node scripts/release-notes.js check-entry vX.Y.Z` |
| 渲染 GitHub Release 正文 | `pnpm release:notes:render-body` | `node scripts/release-notes.js render-body [version] [repo]` |
| 打 tag | `pnpm version:tag` | `git tag v$(node -p "require('./package.json').version")` |
| 推 tag | `pnpm version:publish` | `git push origin v…` |

根 `package.json` 已定义 `release:notes:new` / `release:notes:check` / `release:notes:check:entry` / `release:notes:render-body`（C2-B），均指向 `node scripts/release-notes.js …`。  
底层实现永远是 **`node scripts/release-notes.js`**。

---

## 2. 推荐发布流程（fork develop）

```powershell
cd D:\PromtOptimizer\src\prompt-optimizer

# 1) 升版本（示例 patch；会触发 package.json version 钩子里的 version:sync）
pnpm version:prepare patch
# 若只改了 package.json 版本、未走 prepare：
pnpm version:sync

# 2) 生成双语文档模板
pnpm release:notes:new
# 或：node scripts/release-notes.js new

# 3) 手写完善
#    - releases/vX.Y.Z.en.md
#    - releases/vX.Y.Z.zh-CN.md
#    - CHANGELOG.md 顶部摘要 + 链到上述两文件
#    - docs/project/CURRENT.md 产品版本与日期

# 4) 硬门槛校验
pnpm release:notes:check

# 5) 文档门禁（含版本一致）
node scripts/check-docs-version-consistency.mjs
# 完整：按 package.json 的 check:docs 链执行各 node scripts/check-docs-*.mjs

# 6) 提交（信息自拟）后打 tag 并推送
git add -A
git commit -m "chore(release): vX.Y.Z"
pnpm version:tag
pnpm version:publish
git push origin develop
```

Desktop NSIS（可选，本机产品包）：

```powershell
pnpm -F @prompt-optimizer/core build
pnpm -F @prompt-optimizer/ui build:bundle
pnpm -F @prompt-optimizer/desktop build:ci
# 安装生成的 NSIS 到 D:\PromtOptimizer\app
# 自检见 CLEANUP-PLAYBOOK.md
```

---

## 3. 版本同步范围（与脚本一致）

`scripts/sync-versions.js` 的 `versionFiles` **当前为 2 项**：

1. `packages/extension/public/manifest.json`  
2. `packages/desktop/package.json`  

权威说明：[`version-sync.md`](./version-sync.md)。  
机检：`node scripts/check-docs-version-sync-list.mjs`。

**不在自动同步内、但发版应人工对齐：** `docs/project/CURRENT.md` 中的 **2.x.y**（SSOT 叙述）。

---

## 4. 相关

- 漂移台账：[`DOC-DRIFT-REGISTRY.md`](./DOC-DRIFT-REGISTRY.md)  
- C2 规划：`D:\PromtOptimizer\docs\DOC-SYSTEM-PLAN-C2-2026-07-20.md`  
