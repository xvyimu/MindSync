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
