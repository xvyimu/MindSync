# MS Dependabot #118 · brace-expansion@5 → 5.0.8 · 2026-07-29

**Alert:** high · DoS via unbounded expansion · vulnerable `<=5.0.7` · first patched `5.0.8`  
**Scope:** runtime transitive via `minimatch@10` → `@microsoft/api-extractor` / tsup (build/dev plane).

## Change

| File | Change |
|------|--------|
| `pnpm-workspace.yaml` | override `'brace-expansion@5': 5.0.7` → `5.0.8` |
| `pnpm-lock.yaml` | resolved `brace-expansion@5.0.8` only (no 5.0.7) |

pnpm 11: overrides live in workspace yaml (package.json `pnpm` key ignored).

## Verify

- `pnpm install` exit 0
- lock: `brace-expansion@5: 5.0.8` only
- `pnpm why brace-expansion` shows `@5.0.8` under minimatch@10

## Not in this commit

- #98 `@hono/node-server` major DEFER
- #113 site esbuild low DEFER
- No default-branch push; land on `governance-cleanup-2026-07-28` feature only

## GH follow-up (human)

Dismiss or wait re-scan for alert #118 after push.
