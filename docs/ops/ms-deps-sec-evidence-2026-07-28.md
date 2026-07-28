# MS-DEPS-SEC · Dependabot high 收口 + med/low 评估 · 2026-07-28

> **模块：** `M-MS-deps-sec` · WAVE-DEBT-LONG  
> **基线 tip：** `governance-cleanup-2026-07-28` @ **`38a0eeb`**（stream onError 契约 fix 含）  
> **分支：** `ms-deps-sec-2026-07-28`（本 Orca worktree）  
> **禁止已守：** `git push` · asar 重打 · glass ON · UI 大重构 · 删测试  
> **扫描 SSOT：** GitHub Dependabot open alerts（`gh api …/dependabot/alerts`）

## 结论

| 项 | 值 |
|----|-----|
| high #116 `app-builder-lib` | **CLOSED on lock** · 26.8.2 → **26.15.3**（≥26.15.0） |
| high #117 `builder-util-runtime` | **CLOSED on lock** · 9.5.1 残留消除 → **仅 9.7.0** |
| medium #98 `@hono/node-server` | **DEFER major** · 仍 1.19.14（override `<2`） |
| low #113 site `esbuild` | **DEFER** · site 仍 0.27.4；另 monorepo 同 residual |
| 动作 | desktop `electron-builder` ^26.8.2 → **^26.15.0** + workspace overrides 地板钉 |
| push | **未做** |

**交付态：** lock 可证明 high fixed；evidence 完整；本地 commit 待写。

---

## P0 基线

| 检查 | 结果 |
|------|------|
| `HEAD`（进改前） | `38a0eebfc6e459d309726445f10f29fc15888c02` |
| 分支 | `ms-deps-sec-2026-07-28` |
| 前序 | [`ms-deps-sec-2026-07-24.md`](./ms-deps-sec-2026-07-24.md) · [`ms-residual-deps-card-2026-07-25.md`](./ms-residual-deps-card-2026-07-25.md) |
| open Dependabot（本卡相关） | #117 high · #116 high · #113 low · #98 medium |

---

## P1 before / after 版本表

### high（本轮已修）

| 包 | before | after | 引入链 | 动作 |
|----|--------|-------|--------|------|
| `electron-builder` | **26.8.2** | **26.15.3** | `@mindsync/desktop` devDep | direct `^26.15.0` |
| `app-builder-lib` | **26.8.2** | **26.15.3** | via electron-builder | 随升 + override `>=26.15.0 <27` |
| `builder-util-runtime` | **9.5.1**（builder 线）+ **9.7.0**（updater 线） | **仅 9.7.0** | app-builder-lib / builder-util / electron-publish / electron-updater | 随升 + override `>=9.7.0 <10` |
| `dmg-builder` / `builder-util` / `electron-publish` / squirrel | 26.8.x | **26.15.3** | electron-builder 同族 | 随升 |

**lock 证明：**

```text
pnpm why builder-util-runtime  → Found 1 version · 9.7.0
pnpm why app-builder-lib       → Found 1 version · 26.15.3
pnpm why electron-builder      → Found 1 version · 26.15.3
pnpm-lock.yaml 无 builder-util-runtime@9.5 / app-builder-lib@26.8
```

### medium / low（评估 + DEFER）

| # | 包 | lock 现版 | patched | 决策 | 理由 |
|---|----|-----------|---------|------|------|
| **98** | `@hono/node-server` | **1.19.14** | **2.0.5**（**major 2.x**） | **DEFER** | ① GH first_patched 在 2.x；1.x 最新 1.19.15 仍 <2.0.5。② 仅 `@modelcontextprotocol/sdk@1.28.0` 传递，其 deps 声明 **`@hono/node-server: ^1.19.9`**。③ 现 override 显式 **`>=1.19.13 <2`**（2026-07-24 安全钉）。④ 硬升 2.x = major + 可能破 MCP SDK peer 契约；影响面：mcp-server + genai→core 的 node HTTP 宿主。**等 SDK 声明/消费 2.x 再开 major-compat 卡。** |
| **113** | `esbuild`（site） | **0.27.4** | **0.28.1** | **DEFER** | ① severity **low**。② 攻击面 = Windows 上 esbuild/vite **开发服务器**任意文件读，非 Electron 发行路径。③ 0.28 牵 monorepo vite@8 / tsup 与 site vite@7 双 lock 工具链。④ residual 卡已记；本轮优先 high。**另 monorepo esbuild 同 residual（Dependabot 另条）。** |

---

## P2 变更文件

| 文件 | 变更 |
|------|------|
| `packages/desktop/package.json` | `electron-builder`: `^26.8.2` → `^26.15.0` |
| `pnpm-workspace.yaml` | overrides 加 `app-builder-lib: '>=26.15.0 <27'`、`builder-util-runtime: '>=9.7.0 <10'` + 2026-07-28 注释 |
| `pnpm-lock.yaml` | 随 `pnpm install` 重解（~1019 行 diff） |
| `docs/ops/ms-deps-sec-evidence-2026-07-28.md` | 本文 |

**未改：** 业务源码 · glass · asar · site lock · `@hono/node-server` override cap。

---

## P3 命令与 exit code

| 命令 | exit | 备注 |
|------|-----:|------|
| `pnpm install` | **0** | 23.1s · electron-builder 26.15.3 落 lock |
| `pnpm -F @mindsync/core exec vitest run tests/unit/llm/tool-calls.test.ts` | **0** | 15 passed |
| `pnpm -F @mindsync/core exec vitest run tests/unit/llm/provider-cancellation.test.ts` | **0** | 5 passed |
| `pnpm -F @mindsync/core exec vitest run` …5× import-export unit | **0** | 60 passed / 5 files |
| `pnpm -F @mindsync/core typecheck` | **0** | `tsc --noEmit` |
| `pnpm -F @mindsync/core build` | **0** | tsup + DTS |
| `pnpm -F @mindsync/desktop test` | **0** | 89 passed |
| `pnpm -F @mindsync/ui typecheck` | **2** | **预存** CodeMirror `@codemirror/state` 6.6.0 vs 6.7.1 / view 6.40 vs 6.43 双版本类型冲突；与 electron-builder 无关。本卡**不**修工具链 dual。 |

---

## P4 剩余 DEFER / 债

| 债 | 跟进 |
|----|------|
| `#98` `@hono/node-server` → 2.0.5+ | 等 `@modelcontextprotocol/sdk` 放宽 `^1`；major-compat 卡 + 去掉 `<2` override |
| `#113` + monorepo esbuild → 0.28.1 | 工具链 PR：override 或等 vite/tsup 抬；monorepo + site **双 lock** |
| ui typecheck CodeMirror dual | 独立 UI/deps 卡：钉 `@codemirror/*` 单版本 |

---

## P5 DONE 对照

| 条件 | 状态 |
|------|------|
| high #116/#117 lock ≥ fixed | **是** · app-builder-lib 26.15.3 · builder-util-runtime 9.7.0 only |
| evidence md 完整 | **是** · 本文 |
| 本地 commit · 不 push | 见 commit tip（本文件随 commit 写入） |
| 树相对本任务干净 | 仅 deps + evidence |

---

*生成：2026-07-28 · agent ms-deps-sec worktree*
