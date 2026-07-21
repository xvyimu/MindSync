# Test results: E1 ship — commit + handtest + NSIS

| 项 | 值 |
|----|-----|
| Date | 2026-07-21 |
| Role | pipeline-tester |
| Branch | `develop` |
| Tip HEAD | `53bf4a8` |
| E1 feat | `1e2346e` |
| Docs | `53bf4a8` |
| Spec | `.pipeline/spec.md` Phase B (T1–T10) |
| Changes | `.pipeline/changes.md` |

**Verdict: READY FOR REVIEWER** — all critical gates **PASS**. GUI handtest remains partial/human (by design; non-blocking).

---

## Commit verification

| Check | Result | Evidence |
|-------|--------|----------|
| Feat commit `1e2346e` on develop | **PASS** | `feat(ui): E1 entry parity CTA+EvalCase+dual on Context and Basic User` · 7 files (+787/−8) |
| Docs commit `53bf4a8` on develop | **PASS** | `docs(project): archive path for nsis-2026-07-21-e1 + handtest status` · CURRENT + HANDTEST-STATUS |
| Tip is docs commit | **PASS** | `HEAD = 53bf4a8e70e345cfb104badffc75561a65f1ec7a` |
| Ahead of origin by 2 | **PASS** | `develop...origin/develop [ahead 2]` · log: `53bf4a8`, `1e2346e` |
| Push not done | **PASS** | no push; status shows ahead only |

### Commit scope (feat `1e2346e`)

- `packages/ui/.../ContextSystemWorkspace.vue`
- `packages/ui/.../ContextUserWorkspace.vue`
- `packages/ui/.../BasicUserWorkspace.vue`
- `docs/project/NEXT-CUT-SPEC-2026-07-21-E0-E1-E2.md` (new)
- `docs/project/CURRENT.md`
- `docs/project/BACKLOG-90D-2026-07-21.md`
- `docs/project/COMPETITIVE-BRIEF.md`

No desktop/core product churn in feat commit. No `web-dist` / `dist` / secrets.

### Dirty tree (allowed)

| Path | Note |
|------|------|
| `.pipeline/changes.md` | pipeline handoff · OK |
| `.pipeline/spec.md` | planner working file · OK per changes/spec |

No unstaged product UI/docs outside pipeline.

---

## Gate matrix (T1–T10)

| ID | Gate | Status | Notes |
|----|------|--------|-------|
| **T1** | Commit scope clean | **PASS** | E1 product committed; dirty only `.pipeline/*` |
| **T2** | Typecheck | **PASS** | `pnpm -F @mindsync/ui typecheck` · vue-tsc **exit 0** (re-run 2026-07-21) |
| **T3** | UI unit | **PASS** | `pnpm -F @mindsync/ui test` · **929 passed** \| 4 skipped \| 1 todo · ~46s · exit 0 |
| **T4** | Core gate | **SKIP** | Recommended, not hard gate this knife; not re-run. Coder previously reported green; UI unit + typecheck sufficient for E1 UI-only ship |
| **T5** | data-testid static §3.2 | **PASS** | All required strings present in `packages/ui/src` (see below) |
| **T6** | Hard constraints | **PASS** | See hard-constraint section |
| **T7** | Handtest status file | **PASS** | `docs/project/HANDTEST-STATUS-2026-07-21-E1.md` · auto vs human labeled |
| **T8** | NSIS artifact | **PASS** | `D:\PromtOptimizer\nsis-2026-07-21-e1\PromptOptimizer-2.11.7-win-x64.exe` exists (~105 MB) |
| **T9** | Version no bump | **PASS** | root + desktop `package.json` still **2.11.7**; no version commit |
| **T10** | No push | **PASS** | ahead 2 by design; push not run |

---

## T2 — Typecheck (re-run)

```
pnpm -F @mindsync/ui typecheck
> vue-tsc --noEmit
EXIT: 0
```

---

## T3 — UI unit (re-run)

```
pnpm -F @mindsync/ui test
 Test Files  156 passed | 2 skipped (158)
      Tests  929 passed | 4 skipped | 1 todo (934)
 Duration  45.61s
```

Matches coder claim (~929). No failures.

---

## T5 — data-testid (§3.2)

| testid | Hit location | Status |
|--------|--------------|--------|
| `basic-system-eval-case-open` | BasicSystemWorkspace.vue | **HIT** |
| `basic-system-test-dual-model` | BasicSystemWorkspace.vue | **HIT** |
| `basic-user-eval-case-open` | BasicUserWorkspace.vue | **HIT** |
| `basic-user-test-dual-model` | BasicUserWorkspace.vue | **HIT** |
| `pro-multi-eval-case-open` | ContextSystemWorkspace.vue | **HIT** |
| `pro-multi-test-dual-model` | ContextSystemWorkspace.vue | **HIT** |
| `pro-variable-eval-case-open` | ContextUserWorkspace.vue | **HIT** |
| `pro-variable-test-dual-model` | ContextUserWorkspace.vue | **HIT** |
| `post-optimize-cta` | PostOptimizeActions.vue | **HIT** |

All §3.2 contract IDs present. (Shell `rg` not on PATH; verified via content search tools.)

---

## T6 — Hard constraints

| Constraint | Status | Evidence |
|------------|--------|----------|
| Web no `@aws-sdk` | **PASS** | `packages/web` — no matches |
| UI no production `@aws-sdk` | **PASS** | only mock in `packages/ui/tests/unit/utils/remote-backup.spec.ts` |
| Export default redaction (`includeSecrets`) | **PASS** | still in core: `manager.ts` / `types.ts` / `export-secrets.ts` / `electron-proxy.ts`; docs say default **false** (脱敏) |
| auto-opt default OFF | **PASS** | `DEFAULT_EXPERIMENTAL_AUTO_OPTIMIZE.enabled: false`; normalize only enables on explicit `true`; ADR-005 comment intact; E1 commits did not touch this path |
| fork-only / no upstream PR | **PASS** | no push; local commits only |
| Package boundary (UI feature files) | **PASS** | feat commit is UI workspaces + project docs only |
| Version 2.11.7 | **PASS** | root + desktop package.json |

---

## T8 — NSIS archive

**Dir:** `D:\PromtOptimizer\nsis-2026-07-21-e1\`

| File | Present | Size (bytes) |
|------|---------|--------------|
| `PromptOptimizer-2.11.7-win-x64.exe` | **yes** | 110,267,305 |
| `PromptOptimizer-2.11.7-win-x64.zip` | yes | 152,581,090 |
| `PromptOptimizer-2.11.7-win-x64.exe.blockmap` | yes | 116,334 |
| `latest.yml` | yes | 366 |
| `README.md` | yes | 887 |

---

## T7 — Handtest status

- Path: `docs/project/HANDTEST-STATUS-2026-07-21-E1.md` (committed in `53bf4a8`)
- Machine: typecheck / UI unit / testids / hard constraints → **pass**
- GUI §1–§6: **partial/human** (LLM optimize, export eyeball, dual live, etc.)
- Checklist authority: `docs/project/HANDTEST-CHECKLIST-2026-07-21.md`
- Tester note: re-run confirms machine claims; GUI still human-owned → **does not block** reviewer per spec

---

## Failure cases exercised (tester)

| Case | Expected | Actual |
|------|----------|--------|
| Missing product commit / wrong tip | fail T1 | tip `53bf4a8` + feat `1e2346e` present |
| Typecheck break | fail T2 | exit 0 |
| Unit regression | fail T3 | 929 pass |
| Missing any §3.2 testid | fail T5 | all HIT |
| New web/ui aws-sdk dep | fail T6 | none in prod |
| includeSecrets / auto-opt default flipped | fail T6 | defaults intact |
| Missing NSIS exe | fail T8 | present |
| Version bump or pushed remote | fail T9/T10 | 2.11.7 · ahead 2 · not pushed |

---

## Acceptance (spec §5) checklist

- [x] E1 local commits on develop (`1e2346e` + `53bf4a8`)
- [x] typecheck + UI unit green after commit
- [x] handtest status auto/human split
- [x] NSIS archive present
- [x] version 2.11.7; hard constraints intact
- [x] not pushed

---

## Summary

| Critical | Result |
|----------|--------|
| T1 Commit scope | PASS |
| T2 Typecheck | PASS |
| T3 UI unit | PASS |
| T5 data-testid | PASS |
| T6 Hard constraints | PASS |
| T7 Handtest status | PASS |
| T8 NSIS | PASS |
| T9 Version | PASS |
| T10 No push | PASS |
| T4 Core gate | SKIP (non-blocking) |

**READY FOR REVIEWER.** No code fixes required from tester. Do not push. GUI handtest remains optional human follow-up (E0 partial OK per edge cases).
