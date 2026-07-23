# @mindsync/desktop-tauri

Tauri 2 **parallel shell** for MindSync. Loads the existing Vue 3 + Vite UI from `@mindsync/web` (same port / `web-dist` pattern as Electron `packages/desktop`).

> Electron remains the production mainline until cutover. This package must not replace `packages/desktop`.

## Prerequisites

- Node ^24, pnpm 11.x (repo engines)
- Rust toolchain (`rustc` / `cargo`) + platform linker (Windows: **MSVC** Build Tools + WebView2)
- On Windows, prefer Developer PowerShell / `vcvars64.bat` so MSVC `link.exe` is ahead of Git's GNU `link.exe` (see progress doc)
- See `docs/ops/ms-tauri-shell-progress.md` for verified commands + exit codes

## Dev

From monorepo root:

```powershell
pnpm install
pnpm dev:desktop-tauri
```

This starts `@mindsync/web` on `http://localhost:18181` and `tauri dev` against that URL.

## Build (packaged)

```powershell
pnpm -F @mindsync/desktop-tauri build
```

Copies `packages/web/dist` → `packages/desktop-tauri/web-dist`, then `tauri build`.

## Identity

| Field | Value |
|-------|--------|
| identifier / appId | `com.xvyimu.mindsync` |
| productName | `MindSync` |
| version | aligned with root `2.11.7` |
