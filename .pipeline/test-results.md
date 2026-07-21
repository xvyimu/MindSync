# Test results: D3 + D4

Date: 2026-07-21
Tip working tree (uncommitted until ship commit)

## Commands

```powershell
cd D:\PromtOptimizer\src\prompt-optimizer
pnpm -F @prompt-optimizer/desktop test
# 75 pass, 0 fail

node --test scripts/desktop-ipc-handlers.test.mjs
# 10 pass, 0 fail
```

## Grep / static

| Check | Result |
|-------|--------|
| main.js free of createModelManager / new PreferenceService | PASS |
| service-container requires core + PreferenceService | PASS |
| image-understanding-understand in image-handlers | PASS |
| Dockerfile app/10001 | PASS |
| supervisord mcp user=app | PASS |
| Docs NGINX_PORT=8080 non-root | PASS (runtime-security + mkdocs advanced) |

## Hard won't (spot)

| Item | Result |
|------|--------|
| Experimental auto-optimize default OFF | Untouched (prior a4b54db) |
| Export redaction | Untouched |
| Web no S3 | Untouched |

## Overall

**PASS** — ready for review/ship.
