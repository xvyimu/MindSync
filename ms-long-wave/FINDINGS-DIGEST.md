# MindSync · code-review findings 消化单 · 2026-07-24

**源：** `D:\orca\.planning\portfolio-stack-policy-2026-07-24\code-review\mindsync-findings.md`  
**G0：** B Electron 硬化 · **禁** Tauri 实现 / asar  
**更新：** 7m 巡检 · CR-001/003 已落地 feature tip

## 分级

| 级 | 结论 |
|----|------|
| **P0** | **无** 新默认 RCE / nodeIntegration 全开 |
| **P1** | 6 条 · 见下表 |
| **P2** | 门闩/管线 · 本波不抢 P1 |

## P1 映射（终态）

| id | 症状 | 处置 |
|----|------|------|
| **MS-CR-001** | safeStorage 不可用 → 密钥明文落盘 | **DONE** · `origin/xvyimu/ms-fix-safestorage-warn@d9b6219` · SECURITY warn + `secretsSecurity` · gate 6+9 exit0 · **无 dirty** |
| **MS-CR-002** | 裸 ipcMain.handle / manifest 纪律 | **并入已审** W1 `ms-harden-ipc@881cca9` · **未合 develop** |
| **MS-CR-003** | openExternal 未统一 allowlist | **DONE** · `origin/xvyimu/ms-fix-openexternal-allowlist@4bb542b` · http(s) allowlist + 调用点门闩 · gate 5+91 exit0 · **无 dirty** |
| **MS-CR-004** | Tauri vs Electron 双叙事 | **docs-only / 不实现** · G0=B |
| **MS-CR-005** | AI-Core 误进包 | W10 断言默认 OFF |
| **MS-CR-006** | 更新源/签名 | **并入已审** W5 `2582c4a` |

## Dirty 核查（本巡）

| 路径 | 状态 |
|------|------|
| `ms-fix-safestorage-warn` wt | **已 rm** · tip 仅 origin `d9b6219` · **无未提交改动** |
| `ms-fix-openexternal-allowlist` wt | **已 rm** · tip 仅 origin `4bb542b` · **无未提交改动** |
| `D:\MindSync\src\mindsync` develop | dirty = **Tauri 文档**（ADR/cutover/scout…）· **G0=B 不 commit 换壳文档** · 非 CR fix dirty |

## 人闸

- 合 develop / push develop：**未授**  
- 不 force `ms-electron-harden-verify`（local `d066a12` vs origin WIP `bec04e8`）

## 明确不做

- Tauri 实现 · asar · React 平行 UI · AI-Core 默认 asar · stop orca
