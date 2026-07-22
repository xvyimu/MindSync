# GitHub identity · MindSync

| | |
|--|--|
| **Repository** | https://github.com/xvyimu/MindSync |
| **Former name** | `xvyimu/prompt-optimizer` |
| **Fork network** | Detached (independent) |
| **Upstream remote** | **Removed** (2026-07-21). No `upstream` remote. |
| **Origin of code** | Derived from `linshenkx/prompt-optimizer` (AGPL-3.0). Attribution retained in `LICENSE`. |
| **Product UI name** | Prompt Optimizer（提示词优化器）— may remain in i18n until a copy sweep |
| **npm package root** | `mindsync` · workspace `@mindsync/*` |
| **Electron** | `appId` `com.xvyimu.mindsync` · `productName` `MindSync` · userData migration from legacy paths |
| **License** | AGPL-3.0-only |
| **Default branch** | `develop` |
| **Local path (maintainer)** | `D:\MindSync\src\mindsync`（入口 `D:\projects\MindSync`） |
| **NOTICE** | [NOTICE](./NOTICE) — upstream + maintainer attribution |

## Rules

1. **Repo / package identity = MindSync.** UI product strings may still say Prompt Optimizer until i18n is updated.
2. Desktop auto-update / `electron-builder` publish targets **MindSync** (`xvyimu/MindSync`).
3. **No `upstream` remote.** Do not re-add or open PRs to linshenkx unless the maintainer explicitly asks.
4. Maintainer version / install path SSOT: `docs/project/CURRENT.md`.
5. Package rename executed 2026-07-21 on `feature/mindsync-independence` — details in `docs/project/PACKAGE-RENAME-PLAN-2026-07-21.md`.

## License & attribution (do not remove)

MindSync is an **independent distribution of AGPL-3.0 code** derived from
`linshenkx/prompt-optimizer`. Detaching the fork network and renaming packages
does **not** change license obligations:

- `LICENSE` keeps the full AGPL-3.0 text and the original `Copyright (C) 2025 linshenkx`.
- `NOTICE` records upstream project link and maintainer modifications.
- The AGPL network-use / source-offer obligations still apply.
- "Independence" means repo identity + process + package names — **not** a license change.
