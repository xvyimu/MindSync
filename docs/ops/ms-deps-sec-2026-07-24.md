# MS-DEPS-SEC · 依赖安全扫描与最小升级 · 2026-07-24

> **范围：** Dependabot / 传递依赖分类 + 仅 security-now patch/minor。  
> **基线：** `origin/develop` @ **`fabe6c5`**。  
> **禁止已守：** `git push` · asar 重打 · glass/redesign 默认 ON · 编造 CVE。  
> **扫描 SSOT：** GitHub Dependabot open alerts（`gh api …/dependabot/alerts`）；`pnpm audit` 因 registry 无 audit 端点失败（见下）。

## 结论

| 项 | 值 |
|----|-----|
| 分支 | `xvyimu/ms-deps-sec` |
| 父 tip | `fabe6c5` · re-pin CURRENT tip to `201056d` after day-quality |
| CURRENT tip 惯例 | 文档 tip=`201056d` · lag-1 可接受（本轮**未**改 CURRENT tip） |
| 业务代码 / glass / asar | **未改** |
| 动作 | direct 安全升 + `pnpm-workspace.yaml` / `site/pnpm-workspace.yaml` **overrides**（pnpm 11 不读 `package.json#pnpm`） |
| push | **未做** |

**交付态：** 分类表 + 安全向 local upgrade + 测 exit 已落档；major 债单列。

---

## P0 基线

| 检查 | 结果 |
|------|------|
| `git fetch origin develop` | OK |
| `git log -3 --oneline origin/develop` | `fabe6c5` · `201056d` · `c8f743b` |
| `HEAD` | `fabe6c5`（进改前） |
| `docs/project/CURRENT.md` tip | **`201056d`**（相对 `fabe6c5` lag-1） |

---

## P1 扫描

### `pnpm audit`

```
ERR_PNPM_AUDIT_ENDPOINT_NOT_EXISTS
The audit endpoint (at https://registry.npmmirror.com/-/npm/v1/security/advisories/bulk) doesn't exist.
```

说明：本机/全局可能仍解析到 npmmirror audit 路径；根 `.npmrc` 已 `registry=https://registry.npmjs.org`，但 audit 仍失败。**未**用 audit 编造 CVE。  
**替代证据：** GitHub Dependabot open alerts（只读）。

### Dependabot open alerts（扫描时）

| 维度 | 数量（约） |
|------|-----------:|
| open total | **~100+**（含同一包多 advisory 叠加） |
| critical | **2 类包**：`tar`（node-tar decompression DoS）、`protobufjs`（任意代码执行历史告警） |
| high | 多：`vite`、`hono`、`fast-uri`、`linkify-it`、`js-yaml`、`brace-expansion`、`undici`、`ws`、`form-data`、`tmp`、`js-cookie`、`@xmldom/xmldom`、`lodash`/`lodash-es` 等 |
| medium | 多：`dompurify`、`markdown-it`、`postcss`、`qs`、`@anthropic-ai/sdk`、`hono/*` 等 |
| low | `esbuild`（dev server Windows 任意文件读）、`body-parser` 等 |
| 独立 lock | `site/pnpm-lock.yaml`：`vite@7.3.1` 线 + `postcss`/`picomatch`/`esbuild` |

manifest 分布：`pnpm-lock.yaml` · `site/pnpm-lock.yaml` · `packages/core/package.json`（`@anthropic-ai/sdk` direct）。

---

## P2 分类表

> **现版本** = 升级前 lock 实测；**升后** = 本轮 `pnpm-lock.yaml` / 安装后。

### security-now（本轮已动）

| 包 | 现版本 | 升后 | 建议 | 理由 | 动作 |
|----|--------|------|------|------|------|
| `@anthropic-ai/sdk` | 0.80.0 | **0.91.1** | 升 | Dependabot #1/#2/#5/#30 medium（Memory Tool 路径/权限） | direct `packages/core` `^0.91.1` + override |
| `dompurify` | 3.3.3 | **3.4.12** | 升 | 多条 XSS/config pollution；patched ≤3.4.12 | direct `@mindsync/ui` + override |
| `markdown-it` | 14.1.1 | **14.3.0** | 升 | quadratic smartquotes DoS · patched ≥14.2.0 | direct ui + override |
| `lodash-es` | 4.17.21/23 | **4.18.1** | 升 | template/prototype pollution · patched ≥4.18.0 | direct ui/web + override |
| `undici` | 7.24.6 | **7.28.0** | 升 | 多条 high/medium（WebSocket/SOCKS/TLS 等）· patched ≥7.28.0 | direct desktop + override `<8` |
| `vite`（monorepo） | 8.0.3 | **8.1.5** | 升 | dev server fs.deny / arbitrary file read 等 · patched ≥8.0.16 | direct core/ui/web/extension + override `<9` |
| `vite`（site） | 7.3.1 | **7.3.6** | 升 | site lock 7.x 线 · patched ≥7.3.5 | `site/package.json` `^7.3.5` + site overrides |
| `postcss` | 8.5.8 | **8.5.22** | 升 | XSS via `</style>` · patched ≥8.5.10 | ui direct + overrides（含 site） |
| `tar` | 7.5.13 | **7.5.21** | 升 | **critical** decompression DoS + 多条 medium/high · ≥7.5.19 | override `<8` |
| `protobufjs` | 7.5.4 | **7.6.5** | 升 | **critical** ACE + 多条 DoS/injection · 钉 7.x | override `>=7.6.5 <8`（**不**上 8.x major） |
| `hono` | 4.12.9 | **4.12.31** | 升 | CORS/path/JWT/cookie 等多条 · ≥4.12.27 | override `<5` |
| `@hono/node-server` | 1.19.11 | **1.19.14** | 升 | serveStatic 绕过 · ≥1.19.13；**不**上 2.x | override `>=1.19.13 <2` |
| `fast-uri` | 3.1.0 | **3.1.4** | 升 | host confusion / path traversal · ≥3.1.4 | override `<4` |
| `linkify-it` | 5.0.0 | **5.0.2** | 升 | quadratic DoS · ≥5.0.2 | override `<6` |
| `js-yaml` | 4.1.1 | **4.3.0** | 升 | merge-key quadratic · ≥4.3.0 | override `<5`（**不**上 5.x） |
| `form-data` | 4.0.5 | **4.0.6** | 升 | CRLF multipart · ≥4.0.6 | override |
| `ws` | 8.20.0 | **8.21.1** | 升 | memory DoS / uninit memory · ≥8.21.0 | override `<9` |
| `tmp` | 0.2.5 | **0.2.7** | 升 | path traversal prefix · ≥0.2.6 | override |
| `qs` | 6.15.0 | **6.15.3** | 升 | stringify DoS · ≥6.15.2 | override（运行时树） |
| `js-cookie` | 3.0.5 | **3.0.8** | 升 | prototype hijack · ≥3.0.7 | override |
| `@xmldom/xmldom` | 0.8.11 | **0.8.13** | 升 | XML injection / recursion DoS · ≥0.8.13 | override `<0.9` |
| `lodash` | 4.17.23 | **4.18.1** | 升 | 同 lodash-es | override |
| `brace-expansion` | 1.1.13 / 2.0.2 / 5.0.5 | **1.1.16 / 2.1.2 / 5.0.7** | 升 | exponential DoS · 分 major 线钉补丁 | override 按 major |
| `body-parser@2` | 2.2.2 | **2.3.0** | 升 | invalid limit disables size · ≥2.3.0 | override `body-parser@2` |
| `ip-address` | 10.1.0 | **10.2.0** | 升 | XSS in Address6 HTML methods · ≥10.1.1 | override |
| `picomatch`（site） | 4.0.3 | **4.0.5** | 升 | method injection · ≥4.0.4 | site override |

### major-later（本轮不升）

| 包 | 现/升后 | 不升理由 | 债 |
|----|---------|----------|----|
| `protobufjs` 8.x | 钉 7.6.5 | major API/体积；`@google/genai` 传递 | 等上游 direct 或单独兼容测 |
| `@hono/node-server` 2.x | 钉 1.19.x | major；MCP SDK 绑定 1.x peer | 跟 `@modelcontextprotocol/sdk` 升级 |
| `fast-uri` 4.x | 钉 3.1.4 | major | 跟 ajv 生态 |
| `js-yaml` 5.x | 钉 4.3.0 | major | electron-builder / app-builder 消费面 |
| `undici` 8.x | 钉 7.28.0 | major | desktop 直依赖线 |
| `vite` 9 / site 升 8 | monorepo 已 8.1.5；site 留 7.3.6 | site 独立小站 · 避免跨 major 构建链 | site 可另开「迁 vite 8」债 |
| `esbuild` 0.28.1 | **仍 0.27.4** | low；改 esbuild minor 牵 vite/tsup 工具链 | 等 vite 线自然带上或单独工具链 PR |
| `@anthropic-ai/sdk` 最新 0.113 | 停 **0.91.1** | 满足 patched 门槛即可；再跳大跨度非最小安全 | 产品功能向升级另开 |
| `linkify-it` 6 / `markdown-it` 大改 | 已达 patched | 更大 major 无必要 | — |

### ignore / 接受

| 包 / 告警 | 理由 |
|-----------|------|
| `body-parser@1.19.6` | 旧线残留于类型/间接；express5 路径已 2.3.0；低优先级 |
| `@types/lodash*` / `@types/qs` 版本串 | 类型包，非运行时 advisory 主体 |
| Dependabot 对**已补丁版本**的历史叠加告警 | 同包多条 open 可能在 GH 侧未 auto-dismiss 前仍显示；以 lock 版本 ≥ first_patched 为准 |
| dev-only 部分路径（js-cookie via `@vue/test-utils`、tmp via flatpak-bundler） | 仍升了传递；生产 Electron 发行面不直接暴露 test-utils |
| `esbuild` low（Windows dev server 任意文件读） | 仅本地 dev；不进运行时 asar 路径（本轮未打 asar） |

---

## P3 变更清单

| 文件 | 变更 |
|------|------|
| `pnpm-workspace.yaml` | 新增 `overrides:`（pnpm 11 唯一 overrides 家） |
| `pnpm-lock.yaml` | 安全向重解 |
| `packages/core/package.json` | `@anthropic-ai/sdk` `^0.91.1` · `vite` `^8.0.16` |
| `packages/ui/package.json` | `dompurify` / `lodash-es` / `markdown-it` / `postcss` / `vite` |
| `packages/web/package.json` | `lodash-es` / `vite` |
| `packages/extension/package.json` | `vite` |
| `packages/desktop/package.json` | `undici` `^7.28.0` |
| `site/package.json` | `vite` `^7.3.5` |
| `site/pnpm-workspace.yaml` | site 独立 overrides（vite/postcss/picomatch） |
| `site/pnpm-lock.yaml` | 重解 |

**未改：** 业务源码 · glass flag · asar · CURRENT tip · Python deps。

---

## P3 测试（实跑 exit）

| # | 命令 | Exit | 备注 |
|---|------|-----:|------|
| 1 | `pnpm install`（root · overrides 后） | **0** | |
| 2 | `pnpm install`（`site/`） | **0** | |
| 3 | `pnpm -F @mindsync/core test:gate` | **0** | 21 passed |
| 4 | `pnpm -F @mindsync/core exec vitest run tests/unit/llm/anthropic-adapter.test.ts` | **0** | 8 passed（SDK 升后） |
| 5 | `pnpm -F @mindsync/core build` | **0** | tsup cjs/esm+dts |
| 6 | `pnpm -F @mindsync/core typecheck` | **0** | |
| 7 | `node --test scripts/desktop-ipc-handlers.test.mjs` | **0** | 11/11 |
| 8 | `pnpm -F @mindsync/desktop test` | **0** | 89/89 |
| 9 | `pytest -q`（`services/ai-core`） | **0** | 9 passed · 3 deprecation warnings（既有） |
| 10 | `pnpm -F @mindsync/mcp-server test`（core build 后） | **0** | 39 passed |
| 11 | `pnpm -F @mindsync/ui test` | **0** | 953 passed · 4 skipped · 1 todo |
| 12 | `pnpm typecheck:ui` | **2** | **既有** CodeMirror 双版本（`view@6.40` vs `6.43` / `state@6.6` vs `6.7`）· day-quality 已记；本轮未引入 |

未跑：Playwright e2e · asar 打包 · glass 预览。

---

## 残留 / 后续

1. **Dependabot 关闭：** 需 push 后 GH 再扫；本轮禁 push，alert 状态以远端为准。  
2. **`esbuild` 0.27.4 → 0.28.1：** 工具链债。  
3. **ui typecheck CodeMirror 双实例：** 独立依赖对齐债（非安全）。  
4. **`pnpm audit` 端点：** 修全局/用户 npmrc 镜像 audit 或改用 `npm audit --registry=https://registry.npmjs.org` 作辅证。  
5. **site** 仍 pnpm 10.6.1 + 独立 lock；与 monorepo 11.5 分治。

---

## 红线复核

| 红线 | 状态 |
|------|------|
| 无授权 git push | **未 push** |
| 无扫描证据不编造 CVE | 仅 Dependabot + lock 版本 |
| major 不硬升 | protobufjs/hono-node/js-yaml/undici/fast-uri 均 cap major |
| 单仓 | 仅 `xvyimu/MindSync` worktree |
| glass 默认 OFF / 禁 asar | 未触碰 |
