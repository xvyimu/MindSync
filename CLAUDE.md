@AGENTS.md

## 快速入口
- 栈：**Electron** + **Vue3** + Naive + Vite + Pinia · `@mindsync/core` · pnpm monorepo
- 测试：`pnpm -F @mindsync/core test:gate` · `pnpm -F @mindsync/core test` · `pnpm -F @mindsync/ui build:bundle` · `pnpm -F @mindsync/ui typecheck`
- 红线：无 ADR 不换 Tauri · 不 React 重写 UI · glass OFF · asar 不重打 · 不升 major residual 未经授权
- 注意：pnpm 11 overrides 只认 `pnpm-workspace.yaml`（不认 root `package.json`）
- 先读：`docs/PROJECT.md` · `docs/project/CURRENT.md`（活数字）