# Review: D3 ServiceContainer slim main + D4 non-root Docker

**Date:** 2026-07-21  
**Tip:** `fe12cbf` — `feat(desktop,docker): D3 slim ServiceContainer main; D4 non-root milestone`  
**Scope:** D3 + D4 only  

---

## VERDICT: **SHIP**

Implementation matches `.pipeline/spec.md` acceptance criteria. Tests are meaningful (not greps-only). Hard won't surfaces untouched. Residual risks are documented and non-blocking for this milestone.

---

## Findings

### Critical / Block
_None._

### High
_None._

### Medium
_None that block ship._

### Low

| ID | Severity | Finding | Where |
|----|----------|---------|--------|
| L1 | Low | `image-understanding-understand` is now **conditionally** registered (`if imageUnderstandingService?.understand`). Previously main always registered the channel. Production always creates the service via `createCoreServices`, so happy-path parity holds; failure/missing-service mode silently omits the channel instead of registering a throwing handler. | `packages/desktop/config/ipc/image-handlers.js` L124–128 |
| L2 | Low | `docs/project/CURRENT.md` inserts two capability bullets **above** the `# 现行事实快照` H1 (duplicate of bullets also under the capabilities list). Cosmetic doc structure drift only. | `docs/project/CURRENT.md` L1–2 vs L84–86 |
| L3 | Low | No single test exercises `registerDomainIpcHandlers` as one bag (domain modules still unit-tested; composition-root contract is static text). Acceptable per spec; optional follow-up. | `register-domain-handlers.js` |
| L4 | Low | D4 full non-root path not smoke-built in CI/this run (static + docs only). Spec allows this. | Dockerfile / compose comments |

---

## Spec vs code

### D3 — PASS

| Criterion | Evidence |
|-----------|----------|
| main 无业务装配构造 | `main.js` no longer requires `@prompt-optimizer/core` factories; no `new PreferenceService` / `createModelManager` / etc. Only comment + module-level service vars + bag assign. |
| `createCoreServices` sole assembly entry | `service-container.js`: internal core require, PreferenceService, env probe, storage→…→data order; deps slimmed to Electron/env (+ optional `core` for tests). |
| Preference 不双向耦合 main | Removed `initializePreferenceService` / `getPreferenceService` from deps. |
| `image-understanding-understand` 不在 main 内联 | Moved to `image-handlers.js`; `register-domain-handlers.js` wires services. |
| 契约测试 | New `service-container.test.js` (success bag, throw→ok:false, FileStorage fallback, order pref before language / proxy before LLM). `ipc-domain-handlers` asserts understanding channel + forward. `scripts/desktop-ipc-handlers.test.mjs` updated for composition root. |
| 生命周期未大拆 | Window / proxy / update / sensitive IPC factory remain in main. |

### D4 — PASS (milestone as specified)

| Criterion | Evidence |
|-----------|----------|
| uid 10001 user `app` | Dockerfile `addgroup`/`adduser` 10001 |
| Writable path ownership | chown app:app on supervisor logs, nginx tmp/logs/run, auth, http.d, html, `/app` |
| No forced `USER app` (port 80 compat) | Explicit comments; default `NGINX_PORT=80` |
| MCP non-root (Layer A) | `docker/supervisord.conf` `[program:mcp-server] user=app` |
| Scripts permission-friendly | `start-services.sh` clearer mkdir/envsubst failures + non-root hints; `generate-auth.sh` root vs app chown matrix, 0640 kept |
| Compose | `no-new-privileges` retained; non-root example **commented** (`user: "10001:10001"`, 8080, healthcheck) |
| Docs | `docker-runtime-security.md` + zh/en `docker-advanced.md` non-root section + one-liner |
| BACKLOG / CURRENT | D3/D4 → **done** |

### Hard won't — PASS (spot)

| Item | Result |
|------|--------|
| Default auto-optimize ON | Untouched (`packages/ui` / experimental defaults not in diff; prior D2 default OFF) |
| Auto-opt as main CTA | Untouched |
| Unlimited unbudgeted search | Untouched |
| local-first / export redaction | Untouched (`packages/core` data export not in this diff) |
| Web no S3 | Untouched (no `@aws-sdk` / web package changes) |
| No new runtime deps | No `pnpm add` |
| No UI/core product surface churn | Diff limited to desktop, docker, docs, scripts, pipeline |

---

## Tests

| Suite | Result | Assessment |
|-------|--------|------------|
| `pnpm -F @prompt-optimizer/desktop test` | 75 pass | Includes new service-container mocks + image IPC understanding; **meaningful** |
| `node --test scripts/desktop-ipc-handlers.test.mjs` | 10 pass | Composition-root / preload contracts updated for domain register move; **meaningful** |
| D4 Docker build/run | Not required / not run | Spec-ok; residual ops risk only |

Green tests align with intended behavior for D3 contracts. They do **not** prove full Electron GUI or non-root container boot — residual, not a false green on wrong product logic.

---

## Residual risks

1. **Layer B full non-root (`--user 10001`)** unproven in this environment: supervisord as non-root + `user=app` on MCP may be no-op or fail depending on Alpine supervisord privileges; nginx bind needs `NGINX_PORT≥1024`. Docs correctly warn; first real deploy should smoke with `curl` healthz.
2. **`chown -R app:app /app`** broadens ownership of node_modules/packages vs historical root-owned tree — intended for non-root; watch for any process still assuming root-only writes outside chowned paths.
3. **Default path still root entry** for port 80 — security posture improves MCP drop, not full container root elimination. Matches milestone, not “rootless by default.”
4. **No e2e desktop launch** after service-container move — low risk given bag shape preserved and IPC modules unchanged aside from understanding channel wiring.

---

## Ship notes

- Commit already on `develop` tip `fe12cbf`; pipeline artifacts consistent with that commit.
- Optional polish (non-blocking): fix `CURRENT.md` H1 ordering; consider always registering `image-understanding-understand` with a clear error if service missing (restore strict channel presence).
- Next ops: optional `docker build` + non-root run when Docker available; no product rework required for D3/D4 acceptance.

**Final: SHIP**
