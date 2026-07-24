# MS-DEPS-AUDIT · residual 依赖审计收口 · 2026-07-24

> **模块：** `M-MS-deps-audit`  
> **范围：** 对照 residual 卡，对 **esbuild low×2** + **`@hono/node-server` medium major** 做 security-now / major-later / accept 分类；**无 CVE 急修 → 不改 package.json / lock**。  
> **基线：** `origin/develop` @ **`221b767`**（`docs(ops): MS residual deps card 2026-07-25`）。  
> **前序：**  
> - [`ms-deps-sec-2026-07-24.md`](./ms-deps-sec-2026-07-24.md) — security-now patch/minor + overrides  
> - [`ms-residual-deps-card-2026-07-25.md`](./ms-residual-deps-card-2026-07-25.md) — residual 盘点（仅文档）  
> **禁止已守：** `git push develop` · asar · Tauri · 大爆炸 major · 假绿 · 编造 CVE。  
> **扫描 SSOT：** GitHub Dependabot open alerts + `pnpm why` + lock 实测。

## 结论

| 项 | 值 |
|----|-----|
| 分支 | `xvyimu/ms-deps-audit` |
| 基线 / HEAD（进档前） | **`221b767`** = `origin/develop` |
| Dependabot open total | **3**（全仓；即本 residual 全集） |
| security-now | **无**（1.x / 0.27 线无可再补 patched residual） |
| major-later | `esbuild` **0.28.1** · `@hono/node-server` **2.0.5** |
| accept | esbuild Windows **dev-server only** 暴露面（至工具链 PR） |
| lock / package.json | **未改** |
| 无用可选依赖 | **无待删项**（见 §可选依赖） |

**交付态：** residual 状态刷新 + 分类裁决 + evidence（`pnpm why` / Dependabot / exit）；**仅文档**。

---

## P0 基线

| 检查 | 结果 |
|------|------|
| `origin/develop` / 任务基线 | **`221b767f3e254e1947cc839fc68024b2518e27ed`** |
| 本支进改前 | clean · tip = 基线 |
| residual 卡 | open 3 · 分类 security-now=无 · major-later=esbuild+hono-node · accept=esbuild dev |
| deps-sec overrides | `@hono/node-server: '>=1.19.13 <2'` 仍在 `pnpm-workspace.yaml` |
| `pnpm audit` | **不依赖**（npmmirror audit 端点历史失败；见 deps-sec） |

---

## P1 实测证据

### Dependabot open（扫描时 · 全仓 = residual 3）

| # | package | severity | GHSA | manifest | scope | vulnerable | first_patched | summary |
|---|---------|----------|------|----------|-------|------------|---------------|---------|
| **57** | `esbuild` | **low** | GHSA-g7r4-m6w7-qqqr | `pnpm-lock.yaml` | runtime* | `>=0.27.3, <0.28.1` | **0.28.1** | Windows 上跑 esbuild **开发服务器** 时可任意文件读 |
| **113** | `esbuild` | **low** | GHSA-g7r4-m6w7-qqqr | `site/pnpm-lock.yaml` | development | 同上 | **0.28.1** | 同上 |
| **98** | `@hono/node-server` | **medium** | GHSA-frvp-7c67-39w9 | `pnpm-lock.yaml` | runtime | `<2.0.5` | **2.0.5** | Windows `serve-static` 经编码反斜杠 `%5C` 路径穿越 |

\* monorepo esbuild 被标 runtime，但解析链为 **vite/tsup 工具链**（dev/build），非 Electron asar 运行时直依赖。

### lock / `pnpm why`（实测）

| 包 | monorepo lock | site lock | `pnpm why` | override |
|----|---------------|-----------|------------|----------|
| `esbuild` | **0.27.4**（Found 1 version） | **0.27.4** | `vite@8.1.5`（core/ui/web/extension/vitest）+ `tsup@8.5.1` → `bundle-require` | **无** esbuild override；`allowBuilds.esbuild: true`（lifecycle 允许，非版本钉） |
| `@hono/node-server` | **1.19.14**（Found 1 version） | **不在 site 树** | `@modelcontextprotocol/sdk@1.28.0` → `@mindsync/mcp-server` + `@google/genai` → `@mindsync/core` | **`'>=1.19.13 <2'`**（显式 cap major） |

### 版本 vs patched

| 包 | 现版 | first_patched | ≥ patched? | 线内可再升? |
|----|------|---------------|------------|-------------|
| `esbuild` | 0.27.4 | 0.28.1 | **否** | **否**（patched 在 0.28.x；0.27 线无安全补丁） |
| `@hono/node-server` | 1.19.14 | 2.0.5 | **否** | **否**（patched 在 **2.x major**；1.x 已 deps-sec 钉 1.19.14） |

---

## P2 分类裁决（本审计）

### security-now

| 包 | 动作 | 理由 |
|----|------|------|
| — | **无** | residual 卡与本轮实测一致：无可在 **1.x / 0.27** 线内再补的 first_patched。本模块 **无 CVE 急修 → 不改 lock**。 |

### major-later（暂不升 · 禁大爆炸）

| 包 | lock | 目标 | 不升理由 | 跟进债 ID（建议） |
|----|------|------|----------|-------------------|
| `esbuild` | 0.27.4 | **0.28.1** | ① severity **low**；② 攻击面 = Windows **dev server** 任意文件读，不进 asar 发行；③ 0.28 牵 monorepo vite 8 / tsup 8 + site vite 7 双 lock 与 `@esbuild/*` 平台包整树；④ residual/deps-sec 已归工具链债 | **MS-toolchain-esbuild-0.28**（双 lock 同升或等 vite/tsup 抬 peer） |
| `@hono/node-server` | 1.19.14 | **2.0.5**（**major**） | ① patched 必跨 2.x；② override 故意 `<2`（防 major 漂移 + MCP SDK 1.x 绑定）；③ 唯一传递消费者 `@modelcontextprotocol/sdk@1.28.0`；硬钉 2.x 需兼容矩阵 | **MS-mcp-hono-node-2**（跟 MCP SDK 上游） |

### accept（当前风险态度）

| 项 | 理由 |
|----|------|
| esbuild low · GHSA-g7r4-m6w7-qqqr | 仅本地/CI 开发服务；**不**进运行时 asar；无公网默认暴露。**接受至工具链 PR**。 |
| Dependabot monorepo esbuild `scope=runtime` | 标签偏保守；`pnpm why` 证明为 vite/tsup 工具链。处置仍按 dev/build。 |
| 同 advisory 双 manifest（#57 + #113） | 修复时 monorepo + site **必须同版本**，禁止半升。 |
| `@hono/node-server` 1.x 残留 medium | 无 1.x 补丁；**不**接受「删 override 漂到 2.x」；接受「钉 1.19.14 + major 债」直至 MCP SDK 就绪。 |

---

## P3 可选 / allowBuilds 依赖说明

> 任务要求：无用可选依赖说明。本轮**不删**依赖，只陈述现状。

| 项 | 状态 | 说明 |
|----|------|------|
| `package.json` / 各包 `optionalDependencies` | **无** | 根、`packages/*`、`site` 均未声明 `optionalDependencies` |
| `peerDependenciesMeta` optional | **无** | 无「可删的 optional peer」清单项 |
| `pnpm-workspace.yaml` `allowBuilds` | **保留** | `electron` / `electron-winstaller` / `esbuild` / `msw` / `protobufjs` — pnpm 11 lifecycle 白名单，**不是**可卸 optional 包；desktop + vite/tsup postinstall 需要 |
| site 独立 lock | **保留** | site 仍 pnpm 10 线 + 独立 lock；esbuild 0.27.4 与 monorepo 同哈希；不并仓本轮 |

**结论：** 无可安全删除的「无用可选依赖」；勿把 `allowBuilds.esbuild` 误当成「未钉版本的 optional 垃圾」。

---

## P4 residual 状态刷新（相对 residual 卡）

| 维度 | residual 卡（221b767） | 本审计 | Δ |
|------|------------------------|--------|---|
| open residual | 3 | **3** | 无变化（未 push 修树 / 未升） |
| lock esbuild | 0.27.4 双锁 | **0.27.4** | 一致 |
| lock @hono/node-server | 1.19.14 | **1.19.14** | 一致 |
| security-now | 无 | **无** | 确认 |
| major-later | esbuild 0.28.1 · hono-node 2.0.5 | **同** | 确认 + 债 ID |
| accept | esbuild dev-only | **同** + GHSA 锚点 | 确认 |
| 动作 | 仅文档 | **仅文档** | 本支加审计证据 |

---

## P5 Evidence（实跑）

| # | 命令 / 源 | Exit / 结果 | 备注 |
|---|-----------|-------------|------|
| 1 | `git rev-parse HEAD` | **0** · `221b767…` | = develop 基线 |
| 2 | `pnpm why esbuild` | **0** · Found **1** version **0.27.4** | vite@8.1.5 + tsup@8.5.1 |
| 3 | `pnpm why @hono/node-server` | **0** · Found **1** version **1.19.14** | 仅 MCP SDK 1.28.0 |
| 4 | lock `rg` monorepo | `esbuild@0.27.4` · `@hono/node-server@1.19.14` | packages 段锚点存在 |
| 5 | lock `rg` site | `esbuild@0.27.4` | 无 hono-node |
| 6 | `pnpm-workspace.yaml` overrides | `@hono/node-server: '>=1.19.13 <2'` | major cap 仍在 |
| 7 | `gh api …/dependabot/alerts?state=open` | **0** · open total **3** | #57 / #113 / #98 |
| 8 | package optional 扫描 | **0 条** optionalDependencies | 无用 optional：无 |

未跑（本模块无 lock 变更）：`pnpm install` 重解 · 包测试 gate · asar。  
未 push：`develop`；feature tip **可** push（见结束态）。

---

## P6 红线复核

| 红线 | 状态 |
|------|------|
| 无 package.json / lock 变更 | **未改** |
| 无大爆炸 major | **未升** 2.x / 0.28 整树 |
| 无 asar / Tauri / glass ON | **未触碰** |
| 无 `git push develop` | **未 push develop** |
| 不编造 CVE | 仅 GHSA + Dependabot + lock/`pnpm why` |
| 假绿 | 未声称 residual 已关；open=3 如实 |

---

## 后续（给整合方 / 债）

1. **MS-toolchain-esbuild-0.28** — monorepo + site 双 lock 同升至 ≥0.28.1，或等 vite/tsup 自然带上；升后复扫 #57/#113。  
2. **MS-mcp-hono-node-2** — 等 `@modelcontextprotocol/sdk` 消费/声明 2.x 后开 major-compat；**期间勿删** `<2` override。  
3. push 本审计 feature 后 Dependabot 仍会报 3 条，直至债落地——**预期 open，非回归**。  
4. `pnpm audit` 镜像端点问题仍属运维债，不阻塞本分类。

---

## Progress

| 时刻（+08） | 状态 | 说明 |
|-------------|------|------|
| 2026-07-24 ~14:53 | 扫描 | Dependabot open=3；why/lock 对齐 residual 卡 |
| 2026-07-24 | 分类 | security-now=∅ · major-later=2 · accept=esbuild dev |
| 2026-07-24 | 文档 | 本文件 + evidence 表；**不改 lock** |
| 结束 | **DONE · in-review** | conventional commit；可 push `xvyimu/ms-deps-audit`；**不** push develop |
