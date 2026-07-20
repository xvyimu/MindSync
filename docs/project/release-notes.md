# 版本说明与 Release 发布

## 目标

从当前流程开始，仓库内的版本说明文件是 GitHub Release 正文的唯一事实来源。

- `CHANGELOG.md`：版本索引与摘要入口
- `releases/vX.Y.Z.en.md`：某个版本的英文完整说明
- `releases/vX.Y.Z.zh-CN.md`：某个版本的中文完整说明
- `.github/workflows/release.yml`：读取两个版本文件，生成 GitHub Release 摘要正文

**一步表（推荐）：** [`RELEASE-RUNBOOK.md`](./RELEASE-RUNBOOK.md)

## 文件约定

每次发布都需要同时维护两处内容：

1. `CHANGELOG.md`
   - 顶部必须是当前版本
   - 必须包含一行英文摘要和一行中文摘要
   - 必须分别链接到 `releases/vX.Y.Z.en.md` 和 `releases/vX.Y.Z.zh-CN.md`

2. `releases/vX.Y.Z.en.md`
   - 标题固定为 `# Prompt Optimizer vX.Y.Z`
   - 必须包含 `## Summary`
   - 必须包含以下完整栏目：
     - `## Highlights`
     - `## Product Updates`
     - `## Fixes`
     - `## Breaking Changes / Upgrade Notes`
     - `## Developer Notes`

3. `releases/vX.Y.Z.zh-CN.md`
   - 标题固定为 `# Prompt Optimizer vX.Y.Z`
   - 必须包含 `## 概括`
   - 必须包含以下完整栏目：
     - `## 亮点`
     - `## 产品更新`
     - `## 修复`
     - `## 破坏性变更 / 升级说明`
     - `## 开发者说明`

`Summary / 概括` 为正式发布必填项；GitHub Release 正文会嵌入完整英文和中文版本说明，并保留安装文档与仓库版本说明链接。

## 常用命令

根 `package.json` 已提供 `release:notes:*` 别名；**底层实现**均为 `node scripts/release-notes.js`。

```bash
# 1. 生成当前版本的版本说明模板
pnpm release:notes:new
# 等价：node scripts/release-notes.js new

# 或者显式指定版本
pnpm release:notes:new 2.9.0
# 等价：node scripts/release-notes.js new 2.9.0

# 2. 校验当前版本说明
pnpm release:notes:check
# 等价：node scripts/release-notes.js check

# 或者显式指定版本
pnpm release:notes:check v2.9.0

# 3. 校验历史版本条目（用于回填旧版本 release 文档）
pnpm release:notes:check:entry v2.6.0
# 等价：node scripts/release-notes.js check-entry v2.6.0
```

- `new`：同时生成英文和中文模板，并附带一段仅供编辑参考的 commit 草稿区。  
- `check`：正式发布前硬门槛，要求目标版本位于 `CHANGELOG.md` **顶部**。  
- `check-entry`：历史回填，只要求 `CHANGELOG.md` 中存在对应版本条目。

## 推荐发布流程

见 [`RELEASE-RUNBOOK.md`](./RELEASE-RUNBOOK.md)。摘要：

```bash
# 1. 更新版本号（不打 tag）
pnpm version:prepare patch
pnpm version:sync   # 若需要显式再同步

# 2. 生成版本说明模板
pnpm release:notes:new

# 3. 手动完善 releases/vX.Y.Z.en.md 与 releases/vX.Y.Z.zh-CN.md，
#    并更新 CHANGELOG.md 顶部摘要与 docs/project/CURRENT.md

# 4. 校验版本说明
pnpm release:notes:check

# 5. 创建 tag
pnpm version:tag

# 6. 推送 tag
pnpm version:publish
```

## 校验规则

以下情况会导致 `pnpm release:notes:check`（即 `node scripts/release-notes.js check`）失败：

- 缺少对应版本的英文或中文 release 文件
- 标题版本号与文件名不一致
- 缺少 `## Summary` 或 `## 概括`
- 必需栏目缺失或顺序错误
- `CHANGELOG.md` 顶部不是当前版本
- `CHANGELOG.md` 顶部没有同时链接英文和中文版本说明
- 正文中仍然存在 `TODO`、`TBD`、`待补充`、`XX` 等占位内容

对于历史版本回填，使用 `pnpm release:notes:check:entry <version>`。

## GitHub Release 行为

发布工作流不会再从 commit 列表自动拼接公开正文，而是优先读取：

- `releases/vX.Y.Z.en.md`
- `releases/vX.Y.Z.zh-CN.md`

然后生成：

- 英文区块（完整英文说明 + 安装文档链接 + 仓库版本说明链接）
- 中文区块（完整中文说明 + 安装文档链接 + 仓库版本说明链接）
- 末尾轻量 macOS 备注

`workflow_dispatch` 中手动输入的 `version` 仍然用于“当前所选 ref 上准备发布的版本”，不是用来从当前主干回补任意历史版本的重新发布。

如果版本说明校验失败：

- 构建任务不会继续执行
- GitHub Release 不会创建成功
