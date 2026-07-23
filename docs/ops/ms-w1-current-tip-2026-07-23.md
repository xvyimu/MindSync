# MS-W1 · CURRENT tip/branch SSOT · 2026-07-23

> **范围：** 文档 SSOT + 契约回归。  
> **禁止已守：** asar 覆盖 · redesign 默认 ON · Docker 真推 · 未授权 push。

## 结论

| 项 | 值 |
|----|-----|
| 分支 | `xvyimu/ms-w1-current-tip` → 本地 `develop`（**ahead 3 · 未 push**） |
| 内容 tip | `82043f3` · `docs(project): MS-W1 align CURRENT tip/branch to develop live` |
| re-pin tip | `80eafcf` · `docs(project): re-pin CURRENT tip to MS-W1 content commit` |
| 证据 tip | `1826519` · `docs(ops): MS-W1 evidence + re-pin CURRENT tip to 80eafcf`（**local HEAD**） |
| 文档 tip 行 | **`80eafcf`**（相对 HEAD 滞后 1 · W4 自指惯例） |
| 父 tip | `d760c2d`（D1 README hub · origin/develop） |
| 前态漂移 | CURRENT 钉 `xvyimu/w4-ms-claude` @ `1009439`（约 19 commit 后） |

## 改动

1. `docs/project/CURRENT.md`：分支 → `develop`；本仓 tip SSOT 对齐 live；远端 develop 参考句刷新  
2. 能力摘要补 D1 hub / glass OFF / MS-W1 一句  
3. **未**改业务代码 / 依赖 / flag 默认

## 验证（exit）

| 命令 | Exit | 备注 |
|------|-----:|------|
| `pnpm check:docs`（内容 commit 树 tip=`d760c2d`↔HEAD） | **0** | 9 子脚本全绿 |
| `uv run --extra dev pytest tests -q`（`services/ai-core`） | **0** | **9 passed** |
| `node --test …/ai-core-config.test.js …/ai-core-client.test.js` | **0** | **10/10** |
| `node --test scripts/desktop-ipc-handlers.test.mjs` | **0** | **11/11** |

### tip 自指（与 W4 同）

`check-docs-current-tip` 要求文档 hash 为 **HEAD 前缀**。  
把 tip 写进 commit 后 HEAD 前移 → 干净树 tip **滞后 1 次提交**（终态：`82043f3` in doc · HEAD `80eafcf`）。  
合入 / CI 若强制 tip 门闩：再改 CURRENT 一行 commit，或在内容 commit 树上检。

## DEFER

| 项 | 原因 |
|----|------|
| push `develop` | 等人说 push |
| asar / R5 / Mode B | 人 gate / 另题 |
| Dependabot open alerts | 另刀 |
