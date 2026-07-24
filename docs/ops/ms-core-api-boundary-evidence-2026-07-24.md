# MS-core-api-boundary · evidence · 2026-07-24

> **模块：** `M-MS-core-api-boundary`  
> **分支：** `xvyimu/ms-core-api-boundary`  
> **基线：** `develop` @ **`221b767`**（`docs(ops): MS residual deps card 2026-07-25`）  
> **交付：** 边界矩阵 + Electron proxy 收口小修 + 本证据  
> **禁止已守：** 未 `git push develop` · 未 asar · 未拆 desktop · 未假绿

---

## 结论

| 项 | 值 |
|----|-----|
| Scout | exports 仅 `.` + `./electron`；web/extension 生产走 exports；extension 不依 electron |
| 泄漏 | **`ElectronImageUnderstandingServiceProxy` 曾挂主入口** → 已迁 `./electron` |
| secret / FileStorage | 仍在主入口（desktop main 需要）；**非密钥值泄漏**；记 follow-up 子路径 |
| 验证 | gate / typecheck / build / boundary 静态测 **全 0** |
| 交付态 | **DONE · in-review**；feature tip **可 push** |

**风险一句：** 主入口仍导出 `FileStorageProvider` 与 secret codec API，web 误用会运行时失败或拿到透传编解码面，但不等于密钥出包；本刀已堵住 Electron Proxy 进 browser 主图的最大实漏。

---

## 变更清单

| 路径 | 动作 |
|------|------|
| `packages/core/src/index.ts` | 移除 ImageUnderstanding Electron proxy 导出 |
| `packages/core/src/electron.ts` | 导出 `ElectronImageUnderstandingServiceProxy` |
| `packages/ui/src/composables/system/useAppInitializer.ts` | 从 `@mindsync/core/electron` 动态 import 取 proxy |
| `scripts/package-scripts.test.mjs` | exports 键集 + proxy 边界断言 |
| `docs/ops/ms-core-api-boundary-matrix-2026-07-24.md` | **新建** 边界矩阵 |
| `docs/ops/ms-core-api-boundary-evidence-2026-07-24.md` | **本文件** |
| `docs/ops/ms-core-api-boundary-progress.md` | 进度条 |

---

## 验证（实跑 exit code）

| # | 命令 | Exit | 备注 |
|---|------|-----:|------|
| 1 | `pnpm -F @mindsync/core test:gate` | **0** | 21 passed（2 files） |
| 2 | `pnpm -F @mindsync/core typecheck` | **0** | `tsc -p tsconfig.json --noEmit` |
| 3 | `pnpm -F @mindsync/core build` | **0** | tsup cjs/esm + dts；双入口 |
| 4 | `node --test --test-name-pattern "electron adapters\|ui package index\|web and extension declare\|web/extension production" scripts/package-scripts.test.mjs` | **0** | 4/4 pass |
| 5 | `Select-String` `dist/index.d.ts` ∌ `ElectronImageUnderstanding` | **0** | OK clean |
| 6 | `Select-String` `dist/electron.d.ts` ∋ `ElectronImageUnderstandingServiceProxy` | **0** | OK exported |
| 7 | rg `dist/index.js` ∌ ImageUnderstanding proxy | **0** | no match |

**未跑（范围外）：** ui 全量 vitest · e2e · desktop asar · `test:gate:full`。

---

## Scout 摘要

1. **exports：** 仅 `.` 与 `./electron`；build 入口 `src/index.ts` + `src/electron.ts`。  
2. **electron 谁用：** 唯一生产消费者 `useAppInitializer` 在 `isRunningInElectron()` 分支动态 import。  
3. **web 泄漏：** 主入口曾含 ImageUnderstanding proxy（已修）；secret API / FileStorage 仍公开但 web 路径不实例化 FileStorage。  
4. **extension/web：** `package.json` 直依 `@mindsync/core` workspace；production vite **不** alias 到 src；src 无 deep core path。

---

## 与矩阵交叉

详见 [`ms-core-api-boundary-matrix-2026-07-24.md`](./ms-core-api-boundary-matrix-2026-07-24.md)。
