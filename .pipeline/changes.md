# Changes: D3 ServiceContainer slim main + D4 non-root Docker

## Summary

- **D3**: `createCoreServices` owns core factory requires, PreferenceService creation, and env API-key probe. `main.js` is composition root only. Domain IPC registration moves to `register-domain-handlers.js`; `image-understanding-understand` lives in `image-handlers.js`.
- **D4**: Image user `app`/uid `10001`, writable-path chown, MCP `user=app` in supervisord; docs + commented compose for full non-root with `NGINX_PORT=8080`. Default path still allows port 80 (no forced `USER app`).

## Files

### D3

| File | Change |
|------|--------|
| `packages/desktop/config/service-container.js` | Internal `require('@prompt-optimizer/core')`; create PreferenceService inside container; env probe helper; deps slimmed to Electron/env only (`core` optional for tests) |
| `packages/desktop/main.js` | Remove core factory bag + preference init + env scan; thin `initializeServices`; `setupIPC` → `registerDomainIpcHandlers` |
| `packages/desktop/config/ipc/register-domain-handlers.js` | **New** — single entry calling all domain `register*IpcHandlers` + optional `setupUpdateHandlers` |
| `packages/desktop/config/ipc/image-handlers.js` | Accept `imageUnderstandingService`; register `image-understanding-understand` |
| `packages/desktop/config/service-container.test.js` | **New** — mock-core success / throw / FileStorage fallback |
| `packages/desktop/config/ipc-domain-handlers.test.js` | Assert image-understanding channel + forward |
| `scripts/desktop-ipc-handlers.test.mjs` | Composition-root + preference bridge contracts use `registerDomainIpcHandlers` |
| `docs/project/BACKLOG-90D-2026-07-21.md` | D3/D4 → **done** |
| `docs/project/CURRENT.md` | Capability lines for D3/D4 |

### D4

| File | Change |
|------|--------|
| `Dockerfile` | Create `app` uid/gid 10001; chown runtime writable paths; comments on non-root (no default `USER`) |
| `docker/supervisord.conf` | `user=app` on mcp-server; comments for full non-root |
| `docker/start-services.sh` | Clearer mkdir/write failures for non-root |
| `docker/generate-auth.sh` | chown matrix for root vs app entry; keep 0640 auth |
| `docker/docker-compose.yml` | Commented non-root example (`user: "10001:10001"`, port 8080) |
| `docker/docker-compose.dev.yml` | Short non-root comment |
| `docs/user/deployment/docker-runtime-security.md` | Non-root section + one-liner |
| `mkdocs/docs/zh/deployment/docker-advanced.md` | Non-root section |
| `mkdocs/docs/en/deployment/docker-advanced.md` | Non-root section |

## Verification (ran)

```powershell
cd D:\PromtOptimizer\src\prompt-optimizer
pnpm -F @prompt-optimizer/desktop test
# → 75 pass, 0 fail

node --test scripts/desktop-ipc-handlers.test.mjs
# → 10 pass, 0 fail
```

Static D4: Dockerfile has `10001`/`app`; supervisord has `user=app` on mcp; docs mention `NGINX_PORT=8080`.

## Tester focus

1. Desktop contract: service-container mock tests; image-understanding channel still registered; no business factories in `main.js` (grep).
2. IPC preload ↔ handler parity still green after domain register move.
3. D4: default container may still start as root for port 80; non-root needs high port; MCP still behind `/mcp`.
4. Hard won't: auto-optimize default OFF; export redaction; Web no S3 — untouched.
