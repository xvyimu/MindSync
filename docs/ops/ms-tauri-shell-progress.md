# MS Tauri Shell Progress — M1 skeleton

> Branch: `xvyimu/ms-tauri-shell`  
> Package dir: **`packages/desktop-tauri`** (preferred; no conflict with Electron)  
> Date: 2026-07-24

## Scope (M1)

- Tauri 2 skeleton that opens a window and loads existing Vue/Vite UI (`@mindsync/web`).
- Align identity: `identifier` / appId `com.xvyimu.mindsync`, `productName` `MindSync`.
- Do **not** remove or break `packages/desktop` (Electron mainline).
- No AI-Core packaging; no Web/extension business changes; no UI framework swap.

## Layout

```
packages/desktop-tauri/
  package.json                 # @mindsync/desktop-tauri + @tauri-apps/cli ^2.11
  README.md
  scripts/copy-web-dist.mjs    # packages/web/dist → web-dist
  web-dist/                    # build output (gitignored)
  src-tauri/
    Cargo.toml / Cargo.lock
    build.rs
    tauri.conf.json            # identifier, productName, devUrl, frontendDist
    capabilities/default.json
    icons/                     # from packages/desktop/icons
    src/main.rs + lib.rs
    gen/schemas/               # tauri-build generated ACL schemas
```

## Identity

| Field | Value |
|-------|--------|
| identifier | `com.xvyimu.mindsync` |
| productName | `MindSync` |
| version | `2.11.7` (aligned with root) |
| devUrl | `http://localhost:18181` (same as Electron) |
| frontendDist | `../web-dist` (copy of `@mindsync/web` dist) |

## How to start (dev)

Prereqs: Node ^24, pnpm 11.x, Rust (`rustc`/`cargo`), **MSVC** Build Tools + WebView2.

**Windows note:** Git ships `C:\Program Files\Git\usr\bin\link.exe` (GNU), which shadows MSVC `link.exe` and breaks `cargo` (`extra operand` / exit 101). Use **Developer PowerShell for VS** or:

```powershell
cmd /c "call `"C:\Program Files (x86)\Microsoft Visual Studio\2022\BuildTools\VC\Auxiliary\Build\vcvars64.bat`" && pnpm dev:desktop-tauri"
```

From monorepo root:

```powershell
pnpm install
pnpm dev:desktop-tauri
```

Equivalent split terminals:

```powershell
# A — Vite UI
pnpm -F @mindsync/web dev
# B — Tauri shell (after :18181 is up; under vcvars)
pnpm -F @mindsync/desktop-tauri dev
```

Root scripts:

| Script | Role |
|--------|------|
| `pnpm dev:desktop-tauri` | build core/ui then WEB+TAURI concurrently |
| `pnpm build:desktop-tauri` | web build → copy web-dist → `tauri build` |
| `pnpm -F @mindsync/desktop-tauri check:rust` | `cargo check` only |

## Verification log

| Check | Command | Exit | Notes |
|-------|---------|------|-------|
| Rust toolchain | `rustc --version` / `cargo --version` | **0** | rustc 1.97.1 / cargo 1.97.1 |
| IPC regression | `node --test scripts/desktop-ipc-handlers.test.mjs` | **0** | 11 pass |
| Desktop package tests | `pnpm -F @mindsync/desktop test` | **0** | 89 pass |
| Rust compile (no vcvars) | `pnpm -F @mindsync/desktop-tauri check:rust` | **101** | Git `link.exe` shadows MSVC |
| Rust compile (vcvars64) | `cmd /c "call …\vcvars64.bat && cargo check --manifest-path packages/desktop-tauri/src-tauri/Cargo.toml"` | **0** | Finished dev profile ~1m05s |
| Window open | `pnpm dev:desktop-tauri` under vcvars | **not run end-to-end GUI** | skeleton + check green; operator can open via start table above |

## Gaps / non-goals

- No Tauri command IPC parity with Electron yet (M2+ / facade track).
- No NSIS/installer cutover; Electron remains install path until G3.
- `packages/desktop` untouched for M1 shell work.
- ADR / cutover / scout / fleet docs live under `docs/adr/` + `docs/ops/ms-tauri-*` on this branch.

## Commits

Local commits allowed on branch; **no push**.
