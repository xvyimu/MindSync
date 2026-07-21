# GitHub identity · MindSync

| | |
|--|--|
| **Repository** | https://github.com/xvyimu/MindSync |
| **Former name** | `xvyimu/prompt-optimizer` |
| **Fork network** | Detached (independent) |
| **Upstream tracking** | `upstream` → https://github.com/linshenkx/prompt-optimizer |
| **Product name** | Prompt Optimizer (UI / Desktop / package scope unchanged) |
| **npm package root** | `prompt-optimizer` · workspace `@prompt-optimizer/*` |
| **License** | AGPL-3.0-only |
| **Default branch** | `develop` |
| **Local path (maintainer)** | `D:\PromtOptimizer\src\prompt-optimizer` |

## Rules

1. **Repo identity ≠ product rename.** GitHub is MindSync; users still see Prompt Optimizer.
2. Desktop auto-update / `electron-builder` publish must target **MindSync**, not the old repo name.
3. Default: **no PRs to upstream**. Pull security patches via `upstream` only when needed.
4. Maintainer version / install path SSOT: `docs/project/CURRENT.md`.
5. Do **not** rename `@prompt-optimizer/*` packages or Electron `appId` in this identity cut.
