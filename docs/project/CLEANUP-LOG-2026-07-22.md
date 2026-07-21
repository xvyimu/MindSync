# 全域整理日志 · 2026-07-22

> 执行分支：`feature/redesign-shell-r1`（叠在 MindSync 身份 cut 之上）  
> 范围：安装侧 `D:\PromtOptimizer` + 仓内 SSOT 路径 + `D:\orca` 会话临时文件  
> **未改**：AGPL / LICENSE、用户 `custom-templates`、现行 `app\`、最新归档 `nsis-2026-07-21-ipc`、源码 `src/mindsync`

---

## 1. 已删除（确认可再生 / 已过期）

### 1.1 `D:\orca` 会话临时
- 手测 dump：`po-*.json/txt`、`dm*.txt`、`nd*.txt`、`export-check.txt`、`sk-*.txt`、`models-shape.txt`
- 调研临时：`tmp-*.html`、`simplify-range.diff`、`mozhang-*.png`

### 1.2 安装侧 junk
| 路径 | 约大小 | 原因 |
|------|--------|------|
| `_extract-ipc-*` / `_ipc-install-tmp` / `app-run-ipc-*` | 临时 | IPC 热修解压残留 |
| `app-backup-2026-07-20-pre-e1` | ~412M | 被 E1/IPC 装机取代 |
| `nsis-2026-07-20-paper-theme` | ~103M | 旧归档 |
| `nsis-2026-07-20-develop-ux` | ~247M | 旧归档 |
| `nsis-2026-07-21-e1` | ~251M | 被 `nsis-2026-07-21-ipc` 取代 |
| `app/resources/app.asar.bak-pre-ipc-fix` | ~68M | 现行 asar 已更新 |
| `src/mindsync/ci-logs*.zip` | ~130K | CI 日志可再生 |

**粗算释放：≈1.0GB+**（以本机 du 为准）

---

## 2. 路径 / 分类收纳

| 动作 | 说明 |
|------|------|
| `docs/project/CLEANUP-PLAYBOOK.md` | 源码路径 `prompt-optimizer` → `mindsync`；增补允许删除表（temp/nsis/app-backup） |
| `docs/project/CURRENT.md` | 源码路径对齐 `src\mindsync` |
| `findings.md` / `progress.md` / `task_plan.md` | 迁至 `docs/project/archives/2026-07-18-workspace-tidy/`（历史 superpower 三件套，根目录不再堆） |
| Junction | 保留 `src/prompt-optimizer` → `src/mindsync`（兼容旧文档/工具路径） |

---

## 3. 刻意保留

| 路径 | 原因 |
|------|------|
| `app\` | 现行运行安装 |
| `nsis-2026-07-21-ipc\` | 最新可回滚归档 |
| `src/mindsync\` | 源码真相源 |
| `custom-templates\` | 用户数据 |
| `docs\`（安装侧审计） | FULL-AUDIT / DOC-SYSTEM 等证据 |
| `tools\` | 历史 toolchain（~133M，可选后续再评估） |
| `audit\` | 小体积审计摘录 |

---

## 4. 建议下一步（未执行，需你点头）

1. `tools\` 若已全用系统 Node 24，可整夹归档或删除（再省 ~133M）  
2. 安装侧 `docs\` 与仓内 `docs/project` 重复主题：可做「外层只留索引、正文只在仓内」二次收敛  
3. 合 PR #7 / #8 后，在 `develop` 上再跑一遍 `pnpm test:repo` 文档门禁  

---

## 5. 自检清单

```powershell
Test-Path 'D:\PromtOptimizer\app\PromptOptimizer.exe'
Test-Path 'D:\PromtOptimizer\app\resources\app.asar'
Test-Path 'D:\PromtOptimizer\nsis-2026-07-21-ipc'
Test-Path 'D:\PromtOptimizer\src\mindsync\docs\project\CURRENT.md'
Test-Path 'D:\PromtOptimizer\src\prompt-optimizer'  # junction
# 下列应为 False
Test-Path 'D:\PromtOptimizer\app-backup-2026-07-20-pre-e1'
Test-Path 'D:\PromtOptimizer\nsis-2026-07-21-e1'
```


---

## 6. 续作 2026-07-22（1 tools + 2 docs + 3 merge）

| 动作 | 结果 |
|------|------|
| 删除 `tools/node-v22*` + `node22.zip` | ~133M；系统 Node v24.16.0 |
| 外层 `D:\PromtOptimizer\docs\` 正文 | 迁入 `docs/project/archives/install-side-2026-07/`（9 份） |
| 外层 docs | 仅 `README.md` 索引 |
| CURRENT 链接 | 指向仓内 archive |
| PR #7 / #8 | 见 merge 记录 |
