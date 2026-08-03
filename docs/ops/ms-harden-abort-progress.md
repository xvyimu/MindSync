# progress · M-MS-harden-abort · 2026-07-24

| 状态 | DONE · in-review |
|------|------------------|
| 分支 | `xvyimu/ms-harden-abort` |
| 基线 | develop@221b767 |
| 证据 | `docs/ops/ms-harden-abort-evidence-2026-07-24.md` |

## 已做

1. Scout：流 channel + streamId + owner/non-owner + preload race；core 6 fail 中 **仅** provider-cancellation 为本刀。
2. 修：`LLMService` Abort **rethrow**；local-model stub AbortError；desktop 补测（stream-cancel / runner / image / preload pre-abort）。
3. 验证：provider-cancellation 5/5 · desktop abort 相关 26/26 · config 全量 93/93 · exit 0。

## Next

- 人审 in-review；可选 `git push -u origin xvyimu/ms-harden-abort`。
- **勿** push develop；勿 asar。
- 剩余 core fail（import-export + tool-calls×4）另刀。
