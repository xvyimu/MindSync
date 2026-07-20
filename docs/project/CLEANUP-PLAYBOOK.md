# 磁盘清理手册（CLEANUP-PLAYBOOK）

> **L1 活文档。** 允许删 / 禁止删 / 清理后自检的**唯一**维护处。  
> `PROJECT_HANDOFF` §7 只链本文，不再维护过期路径表。  
> 版本与安装根以 [`CURRENT.md`](./CURRENT.md) 为准。

| 项 | 值 |
|----|-----|
| 日期 | 2026-07-20 |
| 本机根 | `D:\PromtOptimizer` |
| 源码 | `D:\PromtOptimizer\src\prompt-optimizer` |

---

## 1. 允许删除（可再生 junk）

| 路径 | 说明 |
|------|------|
| `D:\PromtOptimizer\portable-build\` | 失败整壳拷贝（若存在） |
| `D:\PromtOptimizer\portable-app-overlay\` | 已有 zip 时可删（若存在） |
| `D:\PromtOptimizer\src\prompt-optimizer\.pipeline\core-unit-report.json` | 可重跑生成 |
| `D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\dist\win-unpacked\` | electron-builder 半成品 |
| `D:\PromtOptimizer\src\prompt-optimizer\test-results\` | e2e 产物 |
| `D:\PromtOptimizer\src\prompt-optimizer\playwright-report\` | e2e 报告 |
| `%TEMP%\po-local-e2e-*.log` | 烟测日志 |
| `D:\PromtOptimizer\app\resources\app.asar.bak-pre-icons-*` | asar 热修备份（确认新 asar 正常后） |
| `node_modules` / `packages/*/dist` 构建缓存 | 可用 `pnpm install` / build 恢复（删前确认无未提交改动依赖） |

---

## 2. 禁止删除

| 路径 | 说明 |
|------|------|
| `D:\PromtOptimizer\src\prompt-optimizer\` | 源码真相源 |
| `D:\PromtOptimizer\app\` | **现行** NSIS 安装根（`PromptOptimizer.exe` + `resources\app.asar`） |
| `D:\PromtOptimizer\tools\` | 历史 portable Node 等（Node 基线已升 **^24**，系统 Node 优先） |
| `D:\PromtOptimizer\custom-templates\` | 用户模板数据 |
| `D:\PromtOptimizer\nsis-2026-07-20-paper-theme\` | Paper 主题安装包归档 |
| `D:\PromtOptimizer\nsis-2026-07-20-develop-ux\` | UX 安装包归档 |
| `D:\PromtOptimizer\docs\` | 安装侧审计 / 文档规划（含 FULL-AUDIT、DOC-SYSTEM-PLAN*） |
| `D:\PromtOptimizer\CLOSEOUT.md` | 历史收口清单（L2，勿当现行 wiki，但勿删证据） |
| `D:\PromtOptimizer\README.md` | 安装侧 L0 入口 |
| `docs/PROJECT_HANDOFF.md` · `docs/project/CURRENT.md` | 工程 L0 / 版本 SSOT |
| `.pipeline/*.md` | 过程证据（**非**产品规范，但保留溯源） |

### 2.1 已废弃（不要当安装真相；目录若仍存在可评估删除）

| 路径 | 说明 |
|------|------|
| `D:\PromtOptimizer\PromptOptimizer\` | **旧热替换树，已废弃**（见 CURRENT）。**不是**现行运行安装。 |
| `D:\PromtOptimizer\nsis-2026-07-18\` | 旧 NSIS 归档名；现行为 `nsis-2026-07-20-*`。若磁盘上已不存在，忽略即可。 |

---

## 3. 清理后自检（现行路径）

在 **pwsh** 中：

```powershell
# 安装根与 asar
Test-Path 'D:\PromtOptimizer\app\PromptOptimizer.exe'
Test-Path 'D:\PromtOptimizer\app\resources\app.asar'
Test-Path 'D:\PromtOptimizer\app\resources\app-update.yml'

# 现行 NSIS 归档（至少一类存在即可）
Test-Path 'D:\PromtOptimizer\nsis-2026-07-20-paper-theme'
Test-Path 'D:\PromtOptimizer\nsis-2026-07-20-develop-ux'

# 源码与 SSOT
Test-Path 'D:\PromtOptimizer\src\prompt-optimizer\docs\project\CURRENT.md'
Test-Path 'D:\PromtOptimizer\src\prompt-optimizer\packages\desktop\config\ipc\channel-manifest.js'

# 可选：桌面烟测（需已安装 app）
cd D:\PromtOptimizer\src\prompt-optimizer
$env:PROMPT_OPTIMIZER_INSTALL_ROOT = 'D:\PromtOptimizer\app'
# node scripts/desktop-local-e2e-smoke.cjs
```

**期望：** 前三项为 `True`；`PromptOptimizer\` 旧树**不要求**存在。

---

## 4. 相关

- 漂移台账：[`DOC-DRIFT-REGISTRY.md`](./DOC-DRIFT-REGISTRY.md)  
- 方案 C2：`D:\PromtOptimizer\docs\DOC-SYSTEM-PLAN-C2-2026-07-20.md`  
- 机检禁词：`node scripts/check-docs-handoff-paths.mjs`（禁止 HANDOFF 再写废弃自检路径）  
