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
