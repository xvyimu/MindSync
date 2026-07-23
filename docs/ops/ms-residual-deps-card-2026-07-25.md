# MS residual deps card · 2026-07-25

> **模块：** `M-MS-residual-card`  
> **范围：** 仅 residual 盘点（esbuild low×2 + `@hono/node-server` medium major）。**不改** `package.json` / lock / 业务源码。  
> **基线：** `origin/develop` @ **`ef6c5db`**（`docs(ops): MS-DEPS-SEC pre-push re-run matrix 2026-07-24`）。  
> **前序：** [`ms-deps-sec-2026-07-24.md`](./ms-deps-sec-2026-07-24.md) 已做 security-now patch/minor；本卡只收口其 residual。  
> **禁止已守：** `git push` · asar · glass ON · 升依赖 · 编 CVE。

## 结论

| 项 | 值 |
|----|-----|
| 分支 | `xvyimu/ms-residual-card` |
| tip / HEAD | **`ef6c5db`** = `origin/develop`（进档前 clean） |
| residual open | **3** Dependabot（esbuild low×2 + `@hono/node-server` medium） |
| security-now | **无**（无可在 1.x / 0.27 线内再补的 patched residual） |
| major-later | esbuild **0.28.1** · `@hono/node-server` **2.0.5** |
| ignore / 接受 | esbuild Windows **dev-server only** 暴露面 |
| 本卡动作 | **仅文档** · 未改 package / lock |

**交付态：** residual 分类卡 + lock 实测版本与 Dependabot 对照；**不升 major** 理由已写清。

---

## P0 基线

| 检查 | 结果 |
|------|------|
| `git fetch origin develop` | OK |
| `origin/develop` | **`ef6c5dbbc95ba21e9689804944d83ea3a7a9a97a`** |
| `HEAD` | **`ef6c5db`**（同 tip） |
| 扫描 SSOT | GitHub Dependabot open alerts（`gh api …/dependabot/alerts?state=open`） |
| `pnpm audit` | 本卡**未**依赖（npmmirror audit 端点历史失败；见 deps-sec 卡） |

---

## P1 lock 解析版本（实测）

### monorepo `pnpm-lock.yaml`

| 包 | lock 解析 | resolution 锚点 | 引入链（`pnpm why`） | override（若有） |
|----|-----------|------------------|----------------------|------------------|
| `esbuild` | **`0.27.4`** | `esbuild@0.27.4`（packages 段） | `vite@8.1.5`（core/ui/web/extension/vitest）+ `tsup@8.5.1` → `bundle-require` | **无** esbuild override |
| `@hono/node-server` | **`1.19.14`** | `@hono/node-server@1.19.14` | `@modelcontextprotocol/sdk@1.28.0` → `@mindsync/mcp-server` / `@google/genai` → `@mindsync/core` | **`'>=1.19.13 <2'`**（显式 cap major） |

### site `site/pnpm-lock.yaml`

| 包 | lock 解析 | 备注 |
|----|-----------|------|
| `esbuild` | **`0.27.4`** | site 独立 lock；integrity 与 monorepo 同哈希 `sha512-Rq4vbHnYkK5fws5NF7MYTU68FPRE1ajX7heQ/8QXXWqNgqqJ/GkmmyxIzUnf2Sr/bakf8l54716CcMGHYhMrrQ==` |
| `@hono/node-server` | **不在 site 树** | site 告警仅 esbuild |

### 版本一致性核对

| 源 | esbuild | @hono/node-server |
|----|---------|-------------------|
| `pnpm-lock.yaml` | 0.27.4 | 1.19.14 |
| `site/pnpm-lock.yaml` | 0.27.4 | — |
| `pnpm why`（root） | Found 1 version · 0.27.4 | Found 1 version · 1.19.14 |
| Dependabot 报 vulnerable 范围 | `>=0.27.3, <0.28.1` | `<2.0.5` |
| first_patched | **0.28.1** | **2.0.5** |
| 当前是否 ≥ patched | **否**（仍 0.27.4） | **否**（1.19.14 ≪ 2.0.5；且 2.x 为 major） |

---

## P2 Dependabot open（本 residual 集）

扫描时 open **3** 条（全仓 open 过滤后与本 residual 相关）：

| # | package | severity | manifest | scope | vulnerable | patched | summary |
|---|---------|----------|----------|-------|------------|---------|---------|
| **57** | `esbuild` | **low** | `pnpm-lock.yaml` | runtime* | `>=0.27.3, <0.28.1` | **0.28.1** | esbuild allows arbitrary file read when running the development server on Windows |
| **113** | `esbuild` | **low** | `site/pnpm-lock.yaml` | development | 同上 | **0.28.1** | 同上 |
| **98** | `@hono/node-server` | **medium** | `pnpm-lock.yaml` | runtime | `< 2.0.5` | **2.0.5** | Path traversal in `serve-static` on Windows via encoded backslash (`%5C`) |

\* Dependabot 标 monorepo esbuild 为 runtime，但解析链为 **vite/tsup 工具链**（dev/build）；非 Electron asar 运行时直依赖。

> 对照任务卡预期：**esbuild low×2 + @hono/node-server medium（要 2.x major）** — **一致**。

---

## P3 分类

### security-now

| 包 | 现版本 | 动作 | 理由 |
|----|--------|------|------|
| — | — | **无本轮 security-now** | 1.x 线 `@hono/node-server` 已在 deps-sec 升到 **1.19.14**（override `>=1.19.13 <2`）；GH advisory first_patched 落在 **2.0.5**，**无 1.x 补丁可再升**。esbuild patched 仅 **0.28.1**（跨 0.27→0.28 minor，牵工具链，见 major-later）。 |

### major-later（**暂不升**）

| 包 | lock 现版 | 目标 patched | 不升理由 | 跟进债 |
|----|-----------|--------------|----------|--------|
| `esbuild` | **0.27.4** | **0.28.1** | ① severity **low**；② 攻击面 = **Windows 上跑 esbuild/vite **开发服务器**** 的任意文件读，非生产 Electron 发行路径；③ 0.28.x 会牵动 monorepo `vite@8.1.5` / `tsup@8.5.1` / site vite 7 线 的 optional peer 与平台二进制 `@esbuild/*` 整树；④ deps-sec 已明确「等 vite 线自然带上或单独工具链 PR」。**本 residual 卡禁止升依赖。** | 单独工具链 PR：评估 `pnpm override esbuild@>=0.28.1` 或等 vite/tsup 上游抬 peer；monorepo + site **双 lock 同升** |
| `@hono/node-server` | **1.19.14** | **2.0.5**（**major 2.x**） | ① patched 版本在 **2.x**；1.x 已 cap（override `<2`）且 1.19.14 是 deps-sec 安全钉；② 仅由 **`@modelcontextprotocol/sdk@1.28.0`** 传递引入（mcp-server + genai→core）；③ 2.x 可能改 serve-static / peer `hono` 契约，需跟 MCP SDK 上游兼容矩阵；④ major 不在 residual 卡范围。 | 等 `@modelcontextprotocol/sdk` 声明/消费 2.x 后再开 **major-compat** 卡；期间保持 `<2` override |

### ignore / 接受（当前风险态度）

| 项 | 理由 |
|----|------|
| esbuild low · Windows dev server 任意文件读 | 仅本地/CI 开发服务；**不**进运行时 asar；无公网默认暴露。接受至工具链 PR。 |
| Dependabot monorepo esbuild scope=runtime 标签 | 解析树为 vite/tsup；标签偏保守，不改变「dev/build 工具链」处置 |
| 同 advisory 双 manifest（#57 + #113） | 根 lock + site lock 各一条；修复时需两边同版本，避免半升 |

---

## 为何暂不升 major（摘要）

1. **`@hono/node-server` 2.x**  
   - first_patched = **2.0.5** → 必跨 major。  
   - 当前 override **故意** `'>=1.19.13 <2'`（deps-sec 已写：MCP SDK 绑 1.x）。  
   - 传递唯一消费者：`@modelcontextprotocol/sdk@1.28.0`。硬 override 到 2.x 可能破坏 SDK peer/行为，需兼容测，**不是 residual 文档卡可做的最小变更**。

2. **`esbuild` 0.28.1**  
   - 虽是 0.27→0.28 **minor**，但对工具链等价于「整树 esbuild 平台包 + vite/tsup 联调」，deps-sec 已归 **major-later / 工具链债**。  
   - severity low + **仅 Windows dev server** 暴露 → 风险可接受，优先不打断 build 绿线。

3. **本模块硬边界**  
   - 只做分类卡 + commit docs；**禁止**改 `package.json` / lock / push。

---

## 红线复核

| 红线 | 状态 |
|------|------|
| 无 package.json / lock 变更 | **未改** |
| 无业务源码 / glass / asar | **未触碰** |
| 无 git push | **未 push** |
| 版本与 lock 一致 | esbuild **0.27.4**（双 lock）· `@hono/node-server` **1.19.14** |
| 不编造 CVE | 仅 Dependabot #57/#113/#98 + lock/`pnpm why` |
| major 不硬升 | 2.x hono-node + esbuild 0.28 均 **major-later** |

---

## 后续（给整合方）

1. push deps-sec + 本卡后，等 GH Dependabot 再扫；预期 residual 仍 open 直至工具链/major PR。  
2. 开 **MS-toolchain-esbuild-0.28**（双 lock）与 **MS-mcp-hono-node-2**（跟 MCP SDK）两张债，勿塞进 residual 卡。  
3. 整合时勿把 override `<2` 误删为「未钉安全」——那是 **防 major 漂移** 的显式 cap。
