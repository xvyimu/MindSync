# Changes: E1 ship — commit + handtest assist + NSIS archive

## Summary

| 项 | 值 |
|----|-----|
| Goal | Commit E1 (CTA+EvalCase+dual entry parity) · machine handtest · NSIS 2.11.7 archive |
| Branch | `develop` |
| E1 commit | **`1e2346e`** `feat(ui): E1 entry parity CTA+EvalCase+dual on Context and Basic User` |
| Docs commit | **`53bf4a8`** `docs(project): archive path for nsis-2026-07-21-e1 + handtest status` |
| Tip HEAD | `53bf4a8` |
| Version | **2.11.7** (no bump) |
| Push | **not done (by design)** · ahead of origin/develop by 2 |
| NSIS | **OK** → `D:\PromtOptimizer\nsis-2026-07-21-e1\` |
| Handtest status | `docs/project/HANDTEST-STATUS-2026-07-21-E1.md` |

**One line:** E1 已本地 commit；typecheck/UI unit 绿；testid 静态全命中；2.11.7 NSIS 已归档；硬约束未破；未 push。

---

## Files committed

### Commit `1e2346e` (E1 feature + project docs)

| Path | What changed |
|------|----------------|
| `packages/ui/src/components/context-mode/ContextSystemWorkspace.vue` | PostOptimize CTA + EvalCase panel + dual-model seed (`pro-multi-*`) |
| `packages/ui/src/components/context-mode/ContextUserWorkspace.vue` | Same pattern (`pro-variable-*`) |
| `packages/ui/src/components/basic-mode/BasicUserWorkspace.vue` | EvalCase entry/panel parity (`basic-user-*`; CTA/dual already present) |
| `docs/project/NEXT-CUT-SPEC-2026-07-21-E0-E1-E2.md` | **new** · E0/E1/E2 cut spec |
| `docs/project/CURRENT.md` | E1 capability row + doc entry |
| `docs/project/BACKLOG-90D-2026-07-21.md` | Stage E table |
| `docs/project/COMPETITIVE-BRIEF.md` | R3 form freeze |

### Commit `53bf4a8` (archive + handtest)

| Path | What changed |
|------|----------------|
| `docs/project/CURRENT.md` | Install archive line `nsis-2026-07-21-e1` + HANDTEST-STATUS link |
| `docs/project/HANDTEST-STATUS-2026-07-21-E1.md` | **new** · machine pass / GUI partial-human |

### Not staged (intentional)

| Path | Note |
|------|------|
| `.pipeline/spec.md` | Planner/pipeline working file · not product · left dirty |
| `packages/desktop/web-dist/**` · `packages/desktop/dist/**` | Build artifacts · **not** committed |
| NSIS archive | Outside git: `D:\PromtOptimizer\nsis-2026-07-21-e1\` |

---

## Commands run + exit

| Command | Exit / result |
|---------|----------------|
| `git status` / precheck | dirty §3.1 only (+ `.pipeline/spec.md`) |
| `rg @aws-sdk` packages/web | no hits |
| `rg @aws-sdk` packages/ui | only `tests/unit/utils/remote-backup.spec.ts` |
| `rg includeSecrets` packages/core/src | manager/types/export-secrets present |
| `pnpm -F @prompt-optimizer/ui typecheck` | **0** |
| `pnpm -F @prompt-optimizer/ui test` | **0** · 929 passed \| 4 skipped \| 1 todo |
| data-testid static (all §3.2) | **all hit** |
| `pnpm -F @prompt-optimizer/core build` | **0** |
| `pnpm -F @prompt-optimizer/ui build:bundle` | **0** |
| `pnpm -F @prompt-optimizer/desktop build:ci` | **0** · nsis + zip |
| `git push` | **not run** |

---

## Hard constraints (spot-check)

| Constraint | Status |
|------------|--------|
| Export default redaction (`includeSecrets`) | untouched · still in core |
| Web no `@aws-sdk` / S3 UI dep | pass |
| auto-opt default OFF | not modified this knife |
| fork-only | no upstream PR |
| Package boundary app→ui→core | UI-only feature files |
| Version 2.11.7 | root + desktop package.json |

---

## data-testid contract (§3.2)

| Workspace | EvalCase open | Dual model | CTA |
|-----------|---------------|------------|-----|
| Basic System (pre-existing) | `basic-system-eval-case-open` | `basic-system-test-dual-model` | `post-optimize-cta` |
| Basic User | `basic-user-eval-case-open` | `basic-user-test-dual-model` | shared |
| Context System | `pro-multi-eval-case-open` | `pro-multi-test-dual-model` | shared |
| Context User | `pro-variable-eval-case-open` | `pro-variable-test-dual-model` | shared |

---

## NSIS archive

**Path:** `D:\PromtOptimizer\nsis-2026-07-21-e1\`

| File | Size (approx) |
|------|----------------|
| `PromptOptimizer-2.11.7-win-x64.exe` | ~105 MB |
| `PromptOptimizer-2.11.7-win-x64.zip` | ~146 MB |
| `PromptOptimizer-2.11.7-win-x64.exe.blockmap` | ~114 KB |
| `latest.yml` | small |
| `README.md` | build note · commit `1e2346e` |

Optional install: user may run installer to `D:\PromtOptimizer\app\` — **not** forced by pipeline. Existing app\ exe is 2026-07-20 build (pre-E1).

---

## Handtest

- Status file: `docs/project/HANDTEST-STATUS-2026-07-21-E1.md`
- Checklist authority: `docs/project/HANDTEST-CHECKLIST-2026-07-21.md`
- Machine: **pass** (typecheck, UI unit, testids, hard constraints)
- GUI §1–§6: **partial/human** (LLM optimize / export eyeball / dual live run)

---

## Tester focus (Phase B)

1. **T1** Working tree: product E1 committed; only `.pipeline/spec.md` dirty OK  
2. **T2–T3** Re-run typecheck + UI unit if desired (already green at tip)  
3. **T5** Re-grep §3.2 testids  
4. **T6** Hard constraints still hold  
5. **T7** HANDTEST-STATUS exists with auto vs human  
6. **T8** Archive has `PromptOptimizer-2.11.7-win-x64.exe`  
7. **T9** Version still 2.11.7  
8. **T10** Not pushed (`ahead by 2`)  

No Playwright full e2e required as gate.

---

## Final git

```
53bf4a8 docs(project): archive path for nsis-2026-07-21-e1 + handtest status
1e2346e feat(ui): E1 entry parity CTA+EvalCase+dual on Context and Basic User
```

**Push: not done (by design)**
