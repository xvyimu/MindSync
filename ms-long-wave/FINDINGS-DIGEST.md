# MindSync · code-review findings 消化单 · 2026-07-24

**源：** `D:\orca\.planning\portfolio-stack-policy-2026-07-24\code-review\mindsync-findings.md`  
**G0：** B Electron 硬化 · **禁** Tauri 实现 / asar

## 分级

| 级 | 结论 |
|----|------|
| **P0** | **无** 新默认 RCE / nodeIntegration 全开 |
| **P1** | 6 条 · 见下表 |
| **P2** | 门闩/管线 · 本波不抢 P1 |

## P1 映射（硬化波已有 / 新 fix）

| id | 症状 | 处置 |
|----|------|------|
| **MS-CR-001** | safeStorage 不可用 → 密钥明文落盘 | **开** `ms-fix-safestorage-warn`：启动可见警告 + docs + 测 |
| **MS-CR-002** | 裸 ipcMain.handle / manifest 纪律 | **并入已审** W1 `ms-harden-ipc@881cca9`（ghost 收敛 + secure 全覆盖测）；verify 矩阵交叉 · **不重复开 wt** 除非 W10 发现回归 |
| **MS-CR-003** | openExternal 未统一 allowlist | **开** `ms-fix-openexternal-allowlist`：https-only 等 + 单测 |
| **MS-CR-004** | Tauri vs Electron 双叙事 | **docs-only / 不实现** · G0=B 冻结 Tauri 实现 · cutover 状态见既有 ADR（不双写） |
| **MS-CR-005** | AI-Core 误进包 | 默认 OFF 已锁 · W10 verify 可断言 · 可选后续 pack-guard |
| **MS-CR-006** | 更新源/签名 | **并入已审** W5 `ms-harden-updater-surface@2582c4a`（host fail-closed / openRelease） |

## 本巡 live 计划

| wt | 模块 | 优先级 |
|----|------|--------|
| ms-electron-harden-verify | W10 综合 gate | 续跑 |
| ms-fix-safestorage-warn | MS-CR-001 | **dispatch** |
| ms-fix-openexternal-allowlist | MS-CR-003 | **dispatch** |

live 上限 3 · **不**开 Tauri fix。
