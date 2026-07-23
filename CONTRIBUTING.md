# Contributing · MindSync

Local-first prompt / model workstation (Desktop primary). Issues and PRs welcome.

## Before you change code

1. [`docs/PROJECT.md`](docs/PROJECT.md) — form & stack SSOT  
2. [`docs/PRODUCT-LAYERS.md`](docs/PRODUCT-LAYERS.md) — product layers  
3. [`docs/project/CURRENT.md`](docs/project/CURRENT.md) — live version/tip  

## Do / don’t

| Do | Don’t |
|----|--------|
| Keep Desktop IPC trust boundaries | Bypass IPC security for convenience |
| Share logic via `@mindsync/core` | Spin a second UI framework without ADR |
| Leave `glassShell` **default OFF** | Force glass on or repack asar without release wave |

## Checks

```bash
pnpm test
# or gate scripts as appropriate: pnpm test:gate / test:gate:ui …
```

## License

**AGPL-3.0-only** — see `LICENSE`. Network service obligations may apply.

## Security

[`SECURITY.md`](SECURITY.md) — no API keys in issues.
