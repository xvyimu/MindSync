# MS-DAY-QUALITY · 全天质量矩阵 · 2026-07-24

> **范围：** 全量测 / docs tip 卫生 / 依赖 audit 报告 / glass·asar 默认安全确认。  
> **基线：** `xvyimu/ms-w1-push-prep` @ `dc97d2a` → cherry-pick push-prep re-pin `c8f743b`（= local `develop` tip）。  
> **禁止已守：** `git push` · asar 重打 · glass/redesign 默认 ON · 生产密钥 · 恢复 upstream。

## 结论

| 项 | 值 |
|----|-----|
| 分支 | `xvyimu/ms-day-quality` |
| 父 tip（内容） | `c8f743b` · push-prep re-pin CURRENT tip to `dc97d2a` |
| 本轮 HEAD | 见 commit 后 `git rev-parse --short HEAD`（本证据 + tip re-pin · lag-1） |
| 文档 tip 行 | **`c8f743b`**（相对 HEAD 滞后 1 · W4/MS-W1 自指惯例） |
| 相对 `origin/develop` | ahead（MS-W1 + push-prep + 本轮；**未 push**） |
| 业务代码 / 依赖 / flag 默认 | **未改** |

**交付态：** 质量矩阵 + push 前检查表 v2 已落档；默认安全仍 OFF；**不 push**。

---

## P0 继承

| 来源 | 结果 |
|------|------|
| push-prep 证据 | `docs/ops/ms-w1-push-prep-2026-07-23.md`（cherry-pick `4469d6f` → `c8f743b`） |
| CURRENT tip 进树 | `dc97d2a`（push-prep lag-1）；本轮 re-pin → `c8f743b` |
| `git log origin/develop..HEAD`（进本轮前） | `82043f3` … `c8f743b`（5 个 docs-only + 本轮） |

---

## P1 质量矩阵（实跑 exit）

| # | 命令 / 包 | Exit | 备注 |
|---|-----------|-----:|------|
| 1 | `pnpm install --frozen-lockfile` | **0** | 970 pkgs |
| 2 | `pnpm check:docs`（全 9 子脚本） | **1** | 仅 `check-docs-current-tip` FAIL（lag-1 预期）；余 8/8 绿 |
| 3 | docs 余 8 子脚本单独跑 | **0** | version / freeze / handoff / pnpm-refs / version-sync / consistency / archive / readme-fork |
| 4 | `uv run --extra dev pytest tests -q`（`services/ai-core`） | **0** | **9 passed**（3 deprecation warnings） |
| 5 | `node --test packages/desktop/config/ai-core-*.test.js` | **0** | **10/10** |
| 6 | `node --test packages/desktop/config/*.test.js` | **0** | **89/89** |
| 7 | `node --test scripts/desktop-ipc-handlers.test.mjs` | **0** | **11/11** |
| 8 | `pnpm -F @mindsync/core test:gate` | **0** | **21 passed** |
| 9 | `pnpm -F @mindsync/core test`（全量） | **1** | **1238 passed · 6 failed · 141 skipped**（既有；见下） |
| 10 | `pnpm -F @mindsync/core build` | **0** | tsup cjs/esm + dts |
| 11 | `pnpm -F @mindsync/core typecheck` | **0** | |
| 12 | `pnpm -F @mindsync/ui test` | **0** | **953 passed · 4 skipped · 1 todo** |
| 13 | `pnpm -F @mindsync/ui lint` | **0** | |
| 14 | `pnpm -F @mindsync/ui typecheck` | **2** | CodeMirror 双版本类型冲突（既有；见下） |
| 15 | `pnpm -F @mindsync/mcp-server test`（core build 后） | **0** | **39 passed** |
| 16 | `pnpm -F @mindsync/mcp-server type-check` | **0** | |
| 17 | `pnpm -F @mindsync/mcp-server lint` | **0** | |
| 18 | `pnpm -F @mindsync/web test` | **1** | **无 test 文件**（vitest exit 1 · 非回归） |
| 19 | `pnpm -F @mindsync/extension test` | **1** | **无 test 文件**（同上） |
| 20 | `pnpm -F @mindsync/web typecheck` / extension | **1** | `vue-tsc` 不在该包 PATH（缺 devDep 解析 · 既有工具链） |
| 21 | `node --test` api/access-session + generate-config + run-many + package-scripts | **0** | **23/23** |
| 22 | `pnpm check:no-chinese-runtime` | **0** | |
| 23 | `pnpm check:locale` | **1** | 根无 `typescript` 包（脚本 `import 'typescript'` · 既有） |
| 24 | e2e / `test:gate:full` | **跳过** | 本日不跑 Playwright 重矩阵；契约/单元已覆盖主路径 |

### core 全量 6 fail（既有 · 本轮未修）

| 文件 | 现象 |
|------|------|
| `import-export-integration.test.ts` | image model `connectionConfig.apiKey` 导入后 `undefined`（脱敏/加密路径期望未对齐） |
| `provider-cancellation.test.ts` | abort 后 promise resolve 而非 AbortError |
| `tool-calls.test.ts` ×4 | `sendMessageStreamWithTools` 校验应 reject 却 resolve |

### ui typecheck（既有）

`VariableAwareInput.vue`：`@codemirror/view@6.40` vs `6.43` / `state@6.6` vs `6.7` 双实例 `KeyBinding`/`EditorState` 不兼容。  
**未**做 major/齐升；单独立项。

---

## P2 Docs / tip 卫生

1. 进树时 tip=`dc97d2a`、HEAD=`c8f743b` → lag-1（push-prep 态，OK）。  
2. 本轮把 tip 钉到 **`c8f743b`**，与本证据 **同 commit** → 提交后 tip 相对新 HEAD 仍 **lag-1**。  
3. 未改业务叙述 / 版本号 / 路径表。

---

## P3 依赖 audit

| 项 | 值 |
|----|-----|
| 默认 registry | `https://registry.npmmirror.com` → audit endpoint **不存在** |
| 实跑 | `pnpm audit --registry https://registry.npmjs.org/` |
| 元数据 | **critical 2 · high 34 · moderate 58 · low 9**（total deps ~1052） |
| 本轮动作 | **仅报告** · **不**大版本齐升 · **不**改 lockfile |

### critical / 代表性 high（分类）

| 级别 | 包 | 路径（摘要） | 备注 |
|------|-----|--------------|------|
| critical | `protobufjs` `<7.5.5` | core → `@google/genai` | 传递；需上游/overrides 另刀 |
| critical | `tar` `<=7.5.18` | desktop → `electron-builder` / node-gyp | **构建链**；非运行时默认路径 |
| high | `lodash-es` / `lodash` `<=4.17.23` | ui 直依 + naive-ui；core tsup；electron-builder | ui 直依可 patch 候选（另刀） |
| high | `vite` `<=8.0.4` | core/vitest 等 | **dev server** 面；发版产物不直接暴露 |
| high | `@xmldom/xmldom` | electron-builder → plist | **构建链** |
| high | `fast-uri` | genai MCP sdk / tsup api-extractor | 传递 |

**策略：** Dependabot / 手工 patch 另刀；本轮 **不**动依赖（符合「可修 patch 才动」且避免无测齐升）。

---

## P4 默认安全确认（仍 OFF）

| 开关 | 证据 | 默认 |
|------|------|------|
| **glassShell** | `packages/ui/src/config/glass-shell.ts` · `isGlassShellEnabled` 仅 query/localStorage；无 env 默认 ON；单测 `defaults to false` | **OFF** |
| **redesignShell** | `packages/ui/src/config/redesign-shell.ts` · 同模式；单测 `defaults to false` | **OFF** |
| **local model adapter** | `packages/core/src/services/llm/local-model-flag.ts` · 需 `MINDSYNC_LOCAL_MODEL_ADAPTER` / `VITE_*` 显式真值 | **OFF** |
| **AI-Core sidecar** | `packages/desktop/config/ai-core-config.js` · 空 `AI_CORE_URL` = disabled；node 测 10/10 | **OFF** |
| **asar 重打** | `packages/desktop/package.json` `build` **无** asar 覆盖字段；本轮 **未** `electron-builder` 打包 | **未执行 asar 重打** |

CURRENT 摘要句仍写：glassShell 默认 OFF · ASAR 未执行 · AI-Core Mode A 默认 OFF。

---

## push 前检查表 v2

相对 push-prep v1 扩展：**全量矩阵 / audit / 默认安全 / tip lag-1**。

### 红线（必须全勾）

- [x] **未** `git push`（本 agent / 本工作树）
- [x] **未** asar 重打 / 未改 electron-builder asar 策略
- [x] glassShell / redesignShell / local-model / AI_CORE **默认仍 OFF**
- [x] **未**恢复 `upstream` · **未**开 PR · 单仓 `origin`
- [x] **未**写入生产密钥 / 未改 `.env` 真值

### 代码与文档

- [x] 工作树在 commit 后干净（仅本证据 + tip re-pin）
- [x] 本轮改动 **docs-only**（无业务 / 无 lockfile）
- [x] CURRENT tip 为 **lag-1** 自指惯例（doc tip = 父 commit 短 hash）
- [x] `check:docs` 除 tip 外 8/8 绿
- [x] MS-W1 + push-prep 证据仍在树（`ms-w1-current-tip` · `ms-w1-push-prep` · 本文）

### 测试（契约优先）

- [x] AI-Core pytest **9** 绿
- [x] ai-core node **10** 绿
- [x] desktop config node **89** 绿
- [x] desktop-ipc-handlers **11** 绿
- [x] core `test:gate` **21** 绿 · core build/typecheck 绿
- [x] ui test **953** 绿 · ui lint 绿
- [x] mcp-server test **39**（需先 core build）绿
- [ ] core 全量 6 fail — **已知既有 · 不阻塞 docs push**（另刀）
- [ ] ui typecheck CodeMirror 双版本 — **已知既有 · 另刀**
- [ ] web/extension 无单测 + vue-tsc PATH — **工具链债 · 另刀**
- [ ] `check:locale` 根缺 typescript — **工具链债 · 另刀**

### 依赖

- [x] `pnpm audit`（npmjs registry）已跑并分类进本文
- [x] **未**大版本齐升 / **未**改 lockfile
- [ ] critical/high 传递依赖修复 — **DEFER**（Dependabot / 手工 patch）

### 推送动作（人 gate）

- [ ] 人口头授权后：`git checkout develop && git merge --ff-only xvyimu/ms-day-quality`（或等价）
- [ ] 人口头授权后：`git push origin develop`（**本文件不执行**）
- [ ] push 后若 CI 强制 tip==HEAD：再补一行 CURRENT tip re-pin（或内容树上检）

---

## DEFER

| 项 | 原因 |
|----|------|
| push `develop` | 红线 · 等人说 push |
| core 6 fail / ui typecheck / locale / web·ext typecheck | 既有债 · 非本轮范围 |
| audit critical/high 修复 | 传递依赖 + 禁齐升；另刀 |
| asar / R5 / Mode B / glass 默认 | 人 gate / 产品另题 |
| Playwright e2e 全矩阵 | 本日跳过；需时 `test:gate:full` |

---

## 复跑命令（维护者）

```powershell
cd <repo>
pnpm install --frozen-lockfile
pnpm check:docs          # tip lag-1 → exit 1 预期
pnpm -F @mindsync/core build
pnpm -F @mindsync/core test:gate
pnpm -F @mindsync/ui test
pnpm -F @mindsync/mcp-server test
node --test packages/desktop/config/*.test.js
node --test scripts/desktop-ipc-handlers.test.mjs
Set-Location services/ai-core; uv run --extra dev pytest tests -q
pnpm audit --registry https://registry.npmjs.org/
```
