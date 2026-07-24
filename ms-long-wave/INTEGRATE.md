# MindSync · Electron 硬化整合单（INTEGRATE）

| 项 | 值 |
|----|-----|
| **波次** | Electron Harden · G0=B |
| **基线** | `221b767` develop |
| **集成分支策略** | 各 `xvyimu/ms-harden-*` 从 develop 拉 · 总控审 evidence 后 **ff/merge 到 develop** 由人授权；默认 **不 push** |
| **live 上限** | ≤3 wt agent |

---

## 模块登记

| 模块 | wt | branch | HEAD | evidence | gate | 总控审 | 人闸 | 合入 |
|------|-----|--------|------|----------|------|--------|------|------|
| M-MS-harden-ipc | wt rm | `xvyimu/ms-harden-ipc` | **`881cca9`** · origin | `ms-harden-ipc-evidence-2026-07-24.md` | 21+13+89 | **PASS** | feature tip pushed · develop 未合 | pending 人授 |
| M-MS-harden-secrets | stop/rm | `xvyimu/ms-harden-secrets` | **`fcb35a0`** · origin（fix `6da7ecd`） | `ms-harden-secrets-evidence-2026-07-24.md` | 12 + 99 | **PASS** | feature tip pushed | pending 人授 |
| M-MS-harden-abort | wt **rm** | `xvyimu/ms-harden-abort` | **`bf8e419`** · origin | `ms-harden-abort-evidence-2026-07-24.md` | 93 + cancel 5/5 | **PASS** | feature tip · develop 未合 | pending 人授 |
| M-MS-harden-preload-csp | wt **rm** | `xvyimu/ms-harden-preload-csp` | **`5132986`** · origin | `ms-harden-preload-csp-evidence-2026-07-24.md` | 9 + **92** | **PASS** | feature tip | pending 人授 |
| M-MS-harden-updater-surface | wt **rm** | `xvyimu/ms-harden-updater-surface` | **`2582c4a`** · origin | `ms-harden-updater-surface-evidence-2026-07-24.md` | 19+89+11 | **PASS** | feature tip | pending 人授 |
| M-MS-core-api-boundary | `ms-core-api-boundary` | `xvyimu/ms-core-api-boundary` | `221b767` base | pending | pending | **live** | n/a | pending |
| M-MS-test-gate-stabilize | `ms-test-gate-stabilize` | `xvyimu/ms-test-gate-stabilize` | `221b767` base | pending | pending | **live** · term_4d3177d0… | n/a | pending |

---

## 审核门（每模块）

- [ ] 边界内（未拆 desktop 主路径 / 未开 Tauri）
- [ ] 触及面 gate 绿 + exit code 写入 evidence
- [ ] 无密钥 / 无 `.env` 进 diff
- [ ] evidence 路径 `docs/ops/ms-harden-*-evidence-YYYY-MM-DD.md`
- [ ] 验收勾（IPC 表 / secrets 边界 / Abort 测）
- [ ] 人闸：asar / push develop — **本波默认跳过**

---

## 整合顺序

1. **ipc** 先（契约与通道面）  
2. **secrets**（依赖 IPC 敏感通道语义清晰）  
3. **abort**（流式 + 可测；可碰 D-TEST-CORE6 cancellation）

---

## 变更日志

| 时点 | 事件 |
|------|------|
| 2026-07-24 | G0=B 确认 · 建表 · 派 ms-harden-ipc |
