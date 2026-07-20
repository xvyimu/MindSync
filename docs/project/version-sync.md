# 版本同步机制

## 概述

为了确保项目中关键组件的版本号与根目录 `package.json` 一致，仓库提供自动版本同步脚本 `scripts/sync-versions.js`。

产品叙述中的版本号权威仍在 [`CURRENT.md`](./CURRENT.md)（发版后手改）。  
发版一步表见 [`RELEASE-RUNBOOK.md`](./RELEASE-RUNBOOK.md)。

## 自动同步的文件

与 `scripts/sync-versions.js` 中 `versionFiles` **一一对应**（机检：`node scripts/check-docs-version-sync-list.mjs`）：

| 路径 | 字段 | 说明 |
|------|------|------|
| `packages/extension/public/manifest.json` | `version` | 浏览器扩展清单 |
| `packages/desktop/package.json` | `version` | Desktop 应用包 |

**不在** `versionFiles` 内、需发版时人工对齐的示例：

- `docs/project/CURRENT.md`（L1 SSOT 叙述）
- `packages/core` / `ui` / `web` / `mcp-server` 等 workspace 包的 `package.json`（可为 `0.0.x`，见 CURRENT 策略）

## 使用方法

### 方法1: 使用 pnpm version / version:prepare（推荐）

```bash
# 升级补丁版本（示例）；version 钩子会跑 version:sync 并 git add
pnpm version patch

# 或不打 tag，只改版本号：
pnpm version:prepare patch
pnpm version:sync
```

### 方法2: 手动同步

如果直接修改了根 `package.json` 中的版本号：

```bash
pnpm run version:sync
# 等价：node scripts/sync-versions.js
```

## 工作原理

1. **pnpm version / version:prepare**：更新根 `package.json` 版本号  
2. **version 钩子**（`package.json` scripts.version）：`pnpm run version:sync && git add -A`  
3. **同步脚本**：读取根版本，写入 `versionFiles` 中的每个 JSON 字段  
4. **git commit / tag**：由维护者或 `version:tag` / `version:publish` 完成  

## 与 Release 版本说明的关系

版本号同步只是发布准备的一部分。创建正式 tag 之前，还需要补齐并校验版本说明：

```bash
pnpm release:notes:new
# 编辑 releases/* 与 CHANGELOG.md、CURRENT.md
pnpm release:notes:check
pnpm version:tag
```

等价底层：

```bash
node scripts/release-notes.js new
node scripts/release-notes.js check
```

- `new`：生成 `releases/vX.Y.Z.en.md` 与 `releases/vX.Y.Z.zh-CN.md` 模板  
- `check`：校验 CHANGELOG 置顶 + 双语文档结构  
- `check-entry`：历史版本回填校验  
- `version:tag`：打 `vX.Y.Z` tag（请先完成 check）  

完整流程：[`RELEASE-RUNBOOK.md`](./RELEASE-RUNBOOK.md) · 文件约定：[`release-notes.md`](./release-notes.md)

## 添加新的同步文件

编辑 `scripts/sync-versions.js` 中的 `versionFiles` 数组，并**同步更新本文表格**（否则 `check-docs-version-sync-list.mjs` 失败）：

```javascript
const versionFiles = [
  {
    path: 'packages/extension/public/manifest.json',
    field: 'version',
    description: '浏览器扩展清单文件'
  },
  {
    path: 'packages/desktop/package.json',
    field: 'version',
    description: 'Desktop应用包文件'
  },
  // {
  //   path: 'path/to/your/file.json',
  //   field: 'version',
  //   description: '你的文件描述'
  // }
];
```

## 注意事项

- 确保目标文件是有效的 JSON 格式  
- 版本字段必须存在于目标文件中  
- 脚本会在出现错误时退出并显示错误信息  
- 所有版本号变更都会被记录到控制台  

## 故障排除

如果同步失败，请检查：

1. 目标文件是否存在且格式正确  
2. 版本字段是否存在于目标文件中  
3. 是否有文件权限问题  
4. Node.js 版本是否兼容（仓库 engines：`^22`）  

调试：

```bash
node scripts/sync-versions.js
```
