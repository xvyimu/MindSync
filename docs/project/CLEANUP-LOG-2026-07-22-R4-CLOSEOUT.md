# 清理日志 · 2026-07-22 · R4 收工整理

> 在 develop@`ac6687c`（PR#12 R4 已合）上执行。  
> 不改 AGPL、不碰 `app\` 现行装机、不碰 `custom-templates`、不碰源码逻辑。

## 已删除

| 项 | 约体积 | 原因 |
|----|--------|------|
| `packages/desktop/dist/`（含 win-unpacked + nsis/zip 半成品） | ~662 MB | 可再生 builder 产物；归档仍有 `nsis-2026-07-21-ipc` |
| `packages/{core,ui,web,mcp-server}/node_modules/.vite` | 缓存 | 可重建 |
| `%TEMP%\mindsync-migrate-*` | ~0 | 空迁移临时目录 |
| `%TEMP%\po-local-e2e-*.log` | 小 | 烟测日志 |
| 本地分支 `feature/redesign-{token-r1,modes-r2,manage-r3,workspace-r4,shell,shell-r1}` | — | 已合 develop；远端 PR 后已删 |
| 本地分支 `feature/mindsync-independence` · `feat/paper-visual-theme` | — | 已合入 develop 历史 |
| `git stash` ×2（redesign-shell wip · paper-visual-c backup） | — | 内容已被后续 PR 覆盖 |

## 未删（刻意 / 受限）

| 项 | 原因 |
|----|------|
| `app\` | 现行运行安装 |
| `nsis-2026-07-21-ipc\` | 最新可回滚包 |
| `feat/paper-visual-c` · `feature/five-layer-internal-opt` | 本地仍保留；后者仍跟踪 origin |
| `D:\orca\.tmp-*` | 本环境对 `D:\orca` 删除受保护；需维护者本机删（非 MindSync 源码） |
| `.pipeline/*.md` | 过程证据，playbook 保留 |
| `packages/{core,ui,web}/dist` | 日常 dev 可能依赖；体积相对小 |

## 文档对齐

- `docs/project/CURRENT.md`：日期 tip / redesign R0–R4 / 归档路径
- `docs/project/CLEANUP-PLAYBOOK.md`：禁止删表 NSIS 仅保留 ipc；外层 docs 索引说明
- 记忆 handoff：tip `ac6687c` · 清理本条

## 自检

```powershell
Test-Path 'D:\PromtOptimizer\app\PromptOptimizer.exe'          # True
Test-Path 'D:\PromtOptimizer\app\resources\app.asar'           # True
Test-Path 'D:\PromtOptimizer\nsis-2026-07-21-ipc'              # True
Test-Path 'D:\PromtOptimizer\src\mindsync\docs\project\CURRENT.md' # True
Test-Path 'D:\PromtOptimizer\src\mindsync\packages\desktop\dist'   # False
```
