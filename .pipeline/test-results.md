# Test results: D3 ServiceContainer slim main + D4 non-root Docker

Date: 2026-07-21  
Workspace: `D:\PromtOptimizer\src\prompt-optimizer`  
Role: pipeline-tester (behavior + static acceptance only; no product code changes)

## Overall

**PASS** — all required commands green; D3/D4 acceptance greps pass; hard won't-do items untouched.

---

## Commands run

### 1. Desktop package tests

```powershell
cd D:\PromtOptimizer\src\prompt-optimizer
pnpm -F @prompt-optimizer/desktop test
```

| Metric | Value |
|--------|-------|
| Result | **PASS** |
| tests | 75 |
| pass | 75 |
| fail | 0 |
| duration_ms | ~451 |

Includes:

- Domain IPC backend modules (LLM/Prompt/Model/Image/Template/History/Favorite/Context/Data/Preference/System)
- `service-container.test.js`: success bag (`preferenceService`, `promptService`), factory throw → `ok:false`, FileStorageProvider fallback
- Stream ownership, page zoom, proxy, remote storage path safety, runtime config public filter, safeStorage codec, update source resolution, navigation guard

### 2. Desktop IPC composition contracts

```powershell
cd D:\PromtOptimizer\src\prompt-optimizer
node --test scripts/desktop-ipc-handlers.test.mjs
```

| Metric | Value |
|--------|-------|
| Result | **PASS** |
| tests | 10 |
| pass | 10 |
| fail | 0 |
| duration_ms | ~384 |

Covers preload↔main channel parity, streaming cancel, composition root → backend modules, channel manifest, remote storage S3/WebDAV/Drive reject, preference bridge.

---

## D3 static / grep acceptance

| Check | Expected | Result |
|-------|----------|--------|
| `main.js` free of business factories | No `createModelManager`, `createLLMService`, `new PreferenceService`, `new FileStorageProvider`, `createPromptService`, etc. | **PASS** (no matches) |
| `main.js` does not `require('@prompt-optimizer/core')` for assembly | Only comment that factories live in service-container | **PASS** (comment only at L86; no actual require) |
| `main.js` uses `createCoreServices` | Composition root only | **PASS** (`require('./config/service-container')`, thin `initializeServices`) |
| Domain IPC via register module | `registerDomainIpcHandlers` | **PASS** (`setupIPC` → `registerDomainIpcHandlers`) |
| `service-container` owns core + PreferenceService | Internal require + `new PreferenceService` | **PASS** (`deps.core \|\| require('@prompt-optimizer/core')`, creates PreferenceService) |
| `image-understanding-understand` not inline in main | In image-handlers | **PASS** (registered in `config/ipc/image-handlers.js`; forwarded via `register-domain-handlers.js`) |
| Domain test asserts image-understanding channel | Channel present + forward | **PASS** (`ipc-domain-handlers.test.js` asserts handler + understand result) |

### Failure case exercised by suite

- `createCoreServices` when `createModelManager` throws → returns `{ ok: false }` (logged during run; test still **PASS**).

---

## D4 static acceptance

| Check | Result | Evidence |
|-------|--------|----------|
| Dockerfile user `app` / uid `10001` | **PASS** | `addgroup -g 10001 -S app` + `adduser -u 10001 ...`; comments: no default `USER app` for port 80 |
| Writable-path / non-root notes | **PASS** | Dockerfile comments + Layer A design notes |
| supervisord MCP non-root | **PASS** | `[program:mcp-server]` has `user=app` |
| Docs: `NGINX_PORT=8080` non-root | **PASS** | `docs/user/deployment/docker-runtime-security.md`; `mkdocs/docs/zh|en/deployment/docker-advanced.md` |
| compose: optional non-root + security baseline | **PASS** | Commented `user: "10001:10001"` + `NGINX_PORT=8080`; `no-new-privileges:true` retained |
| Docker build smoke | **SKIPPED** | Spec allows static-only when not required; optional `docker build` not run |

---

## Hard won't-do (spot check — must remain untouched)

| Item | Result | Notes |
|------|--------|-------|
| Auto-optimize default OFF | **PASS / untouched** | `DEFAULT_EXPERIMENTAL_AUTO_OPTIMIZE.enabled: false`; normalize only enables on explicit `true`; UI helper documents “Default OFF” |
| Export redaction default | **PASS / untouched** | `exportAllData`: `includeSecrets` default false; uses `redactExportDataObject` |
| Web no S3 | **PASS / untouched** | No `@aws-sdk` in `packages/web` or `packages/ui/package.json` (desktop may keep S3 for remote backup) |

---

## Spec acceptance mapping

### D3

- [x] main.js free of business construction greps  
- [x] createCoreServices mockable without Electron GUI  
- [x] image-understanding not inline in main  
- [x] `pnpm -F @prompt-optimizer/desktop test` green  
- [x] `node --test scripts/desktop-ipc-handlers.test.mjs` green  
- [x] Channel names preserved (image-understanding still registered)

### D4

- [x] Fixed uid 10001 user `app` in Dockerfile  
- [x] MCP `user=app` in supervisord  
- [x] Docs non-root + `NGINX_PORT=8080`  
- [x] prod compose keeps `no-new-privileges`; non-root as commented example  
- [x] No won't-do product changes  

---

## Failures

None.

## Next

Ready for **pipeline-reviewer** / human sign-off. Tester did not implement or patch product code.
