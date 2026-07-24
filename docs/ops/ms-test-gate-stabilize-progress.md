# progress · M-MS-test-gate-stabilize · 2026-07-24

| 状态 | DONE · in-review |
|------|------------------|
| 分支 | `xvyimu/ms-test-gate-stabilize` |
| 基线 | develop@221b767 |
| 证据 | `docs/ops/ms-test-gate-stabilize-evidence-2026-07-24.md` |

## 已做

1. 复现 core 6 fail（exit 1 · 6 failed / 21 passed）。
2. 修真缺口：`LLMService` 流式 Abort + `RequestConfigError` **rethrow**；local-model stub AbortError。
3. import-export：集成测对齐默认脱敏 + `includeSecrets` 往返（不改生产默认）。
4. 验证：`test:gate` 21 · 相关 vitest 44 · typecheck · build · **exit 0**。

## Next

- 人审 in-review；可选 `git push -u origin xvyimu/ms-test-gate-stabilize`。
- **勿** push develop；勿 asar。
- W3 desktop abort 补测可另合 `ms-harden-abort`。
