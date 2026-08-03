# progress · 舰队派工回执汇总

> 多条 wt 分支各自在仓根写了同名 `progress.md`（派工模板产物），合并时 add/add 冲突。
> 此处按分支拼接保留，未删任何一份。**权威证据在 `docs/ops/<module>-evidence-*.md`**，本文件仅为回执索引。
> 汇总于 2026-08-03 集成分支 `xvyimu/ms-harden-integrate-2026-08-03`。

---

# progress · M-MS-harden-secrets · 回执总控

| 项 | 值 |
|----|-----|
| 状态 | **DONE · in-review** |
| 模块 | `M-MS-harden-secrets` · W2 切片 2 |
| 分支 | `xvyimu/ms-harden-secrets` |
| base | `develop` @ `221b767`（进改前） |
| commit | **`6da7ecd`** `fix(desktop): harden safeStorage secrets — fixed codec errors + log/envelope redaction` |
| 证据 | `docs/ops/ms-harden-secrets-evidence-2026-07-24.md` |
| push | **否** |
| 叠 W1 IPC | **否**（独立 secrets） |

## 交付摘要

1. **Scout：** safeStorage（无 keytar）→ SecretAwareStorage → `__enc:v1:` on `models` / `image-models`；字段 `apiKey|secretAccessKey|accessKeyId`；unavailable → 明文落盘；密文无法开 → 空串。
2. **加固：** codec 错误不夹带明文；`redactSecretsInText`；IPC 错误信封 + service-container 日志脱敏；core decrypt 日志瘦身。
3. **验：** desktop config `*.test.js` **exit 0** · secret-field vitest **exit 0** · core build **exit 0**。

## 风险一句

codec 不可用仍明文落盘（产品兼容）；本刀只堵日志/信封二次泄漏。

---

# progress · M-MS-harden-updater-surface · 2026-07-24

| 项 | 值 |
|----|-----|
| 模块 | M-MS-harden-updater-surface |
| 状态 | **DONE · in-review** |
| 分支 | `xvyimu/ms-harden-updater-surface` |
| 基线 | `develop@221b767` |
| 证据 | [`docs/ops/ms-harden-updater-surface-evidence-2026-07-24.md`](./docs/ops/ms-harden-updater-surface-evidence-2026-07-24.md) |

## 完成

- Scout：check / download / install / ignore / openReleasePage；sender；publish fail-closed；macOS manual
- 最小修：注入 `shell`；preload 暴露 `openReleasePage`；release host 白名单；错误对象不跨 IPC；ignore versionType 白名单
- 验证：update 相关 + desktop config 89/89 + ipc handlers 11/11，exit **0**
- commit + `git push -u origin HEAD`（禁 develop / asar）

## 风险一句

openRelease 现 fail-closed 到 github.com https；若未来切 generic feed 须同步 delivery policy。

## Next（人审）

- 人审 in-review；可选确认 origin feature 支
- 勿 push develop；勿 asar

---

# M-MS-harden-ipc · progress · 2026-07-24

**状态：** DONE · in-review  
**分支：** `xvyimu/ms-harden-ipc` · 基线 `221b767`  
**切片：** 1/3（G0=B Electron IPC 硬化）

## 摘要

- Scout：manifest 160→加固后 **156**；preload≡manifest≡secure  
- 删幽灵：`model-getModels`、`template-getSupportedLanguages`、`logs-get-paths`、`logs-open-directory`  
- 补 preload：`updater.openReleasePage` → `updater-open-release-page`  
- 契约：装配完整性 + 敏感路径全覆盖 + preload/manifest 对齐  
- 协议 **1.1.0** 未 bump  
- 验证 exit 0：config tests 89 · ipc-handlers 13 · domain+security 21  
- 文档：`docs/ops/ms-harden-ipc-channel-matrix-2026-07-24.md` · `docs/ops/ms-harden-ipc-evidence-2026-07-24.md`  
- **风险：** 旧名直接 invoke 失败（预期收敛）  
- **未做：** push / asar / UI·core 业务
