# MS-ELECTRON-HARDEN-VERIFY · 综合 gate 矩阵 · 2026-07-24

> **模块：** `M-MS-electron-harden-verify` · **W10** · G0=B  
> **范围：** 综合 VERIFY · 触及面回归命令矩阵 · 基线 vs feature 支差异 · findings 交叉。  
> **基线：** `develop` / `origin/develop` @ **`221b767`**（`docs(ops): MS residual deps card 2026-07-25`）。  
> **禁止已守：** `git push develop` · asar 重打 · Tauri 实现 · D7/生产 CSP 大改 · 假绿 · 业务代码改动（本刀 docs-only）。  
> **Worktree：** `C:\Users\yuanjia\orca\workspaces\mindsync\ms-electron-harden-verify`  
> **分支：** `xvyimu/ms-electron-harden-verify`  
> **实跑时点：** 2026-07-24 15:11–15:20 +08:00 · Node **v24.16.0** · pnpm **11.5.3**

## 结论

| 项 | 值 |
|----|-----|
| 基线 tip | **`221b767`** = `origin/develop` |
| HEAD 进跑 | **`221b767`**（clean · 与 develop 同 tip） |
| 综合 gate（必测） | **全绿 exit 0**（见 P1） |
| 既有红（非本刀引入） | core 全量 6 fail · `check:docs` tip lag · locale-parity 缺 root `typescript` |
| W1–W9 feature 合 develop | **否** · 全部 tip 在 feature 支（见 P0） |
| 业务 / asar / glass 默认 / Tauri | **未改** |
| 交付态 | 综合矩阵 + CR 交叉 + progress · **DONE · in-review** |

**风险一句：** W1–W9 harden tips **未合** develop，基线矩阵只证明 develop@221b767 契约面仍绿；合入后须在合并 tip 上重跑本矩阵，IPC/abort/updater 行为以 feature tip 为准。

---

## P0 基线 vs feature 支

> 本刀**默认在 develop@221b767 基线**跑矩阵。W1–W9 **未合** develop；下表记录 tip 与相对 HEAD 的 ahead 数，供 cherry-pick / 合入前对照。  
> 可选：在某 feature 支 checkout 后复跑对应触及面 gate（本会话**未**强制 checkout 各支，避免污染 verify 基线证据）。

| # | 模块 / wt | origin tip | 相对 `221b767` | 合入 HEAD? | 一句话 |
|---|-----------|------------|----------------|------------|--------|
| W1 | `ms-harden-ipc` | **`881cca9`** | +1 | **NOT_IN_HEAD** | drop ghost channels · expose `openReleasePage` |
| W2 | `ms-harden-secrets` | **`fcb35a0`** | +2 | **NOT_IN_HEAD** | safeStorage codec + redaction · progress docs |
| W3 | `ms-harden-abort` | **`bf8e419`** | +1 | **NOT_IN_HEAD** | rethrow AbortError on LLM stream cancel |
| W4 | `ms-harden-preload-csp` | **`5132986`** | +1 | **NOT_IN_HEAD** | lock webPreferences isolation + preload whitelist |
| W5 | `ms-harden-updater-surface` | **`2582c4a`** | +1 | **NOT_IN_HEAD** | updater shell inject · openRelease · error envelope |
| W6 | `ms-core-api-boundary` | **`6638045`** | +2 | **NOT_IN_HEAD** | core 公开 API / electron 子路径边界 |
| W7 | `ms-test-gate-stabilize` | **`6257056`** | +1 | **NOT_IN_HEAD** | rethrow stream Abort/config · import-export secrets |
| W8 | `ms-ext-mcp-smoke-docs` | **`131260b`** | +1 | **NOT_IN_HEAD** | extension/MCP smoke docs |
| W9 | `ms-deps-audit` | **`d871aee`** | +1 | **NOT_IN_HEAD** | residual 分类卡 |
| — | `ms-deps-sec`（前序） | **`ef6c5db`** | 0 | **IN_HEAD** | security-now patches 已在 develop 祖先链 |

**说明：** W9 任务卡「deps residual」在 develop 上已有 `ms-deps-sec` + residual card（`ef6c5db`/`221b767`）；`ms-deps-audit@d871aee` 为并行 docs tip，**仍未合**。

---

## P1 综合 gate 矩阵（实跑 exit）

| # | 命令 | Exit | 备注 |
|---|------|-----:|------|
| 0 | `pnpm install --frozen-lockfile` | **0** | 971 pkgs · 17.3s |
| 1 | `pnpm -F @mindsync/core test:gate` | **0** | **21/21** passed · 718ms |
| 2 | `pnpm -F @mindsync/core build` | **0** | tsup cjs/esm + dts |
| 3 | `node --test packages/desktop/config/*.test.js` | **0** | **89/89** · 254ms |
| 4 | `node --test scripts/desktop-ipc-handlers.test.mjs` | **0** | **11/11** · 166ms |
| 5 | `pnpm -F @mindsync/mcp-server test`（先 #2） | **0** | **39/39** · 6 files |
| 6 | `pnpm -F @mindsync/core typecheck` | **0** | `tsc --noEmit` |
| 7 | `node --test packages/desktop/config/ai-core-*.test.js` | **0** | **10/10** · AI-Core Mode A 默认 OFF |
| 8 | `node --test` api/access-session + generate-config + run-many + package-scripts + check-no-chinese-runtime | **0** | **44/44**（显式排除 locale-parity） |
| 8b | `node --test scripts/check-locale-parity.test.mjs` | **1** | **既有** · `ERR_MODULE_NOT_FOUND: typescript`（根无该包） |
| 9 | `pnpm check:no-chinese-runtime` | **0** | No disallowed Chinese runtime strings |
| 10 | `pnpm check:docs` | **1** | 仅 `check-docs-current-tip` FAIL：tip `201056d` ≠ HEAD `221b767`（lag 惯例） |
| 10b | docs 余 8 子脚本 | **0** | version / freeze / handoff / pnpm-refs / version-sync / consistency / archive / readme-fork |
| 11 | `pnpm -F @mindsync/core` 全量 vitest | **1** | **1238 passed · 6 failed · 141 skipped**（既有；见下） |
| 12 | `uv run --extra dev pytest tests -q`（`services/ai-core`） | **0** | **9 passed** · 3 deprecation warnings |
| 13 | `pnpm -F @mindsync/ui test` | **0** | **953 passed · 4 skipped · 1 todo** |
| 14 | e2e / `test:gate:full` / asar pack | **跳过** | 本日不跑 Playwright 重矩阵 / **未** electron-builder；契约/单元已覆盖主路径 |

### core 全量 6 fail（既有 · 本轮未修 · W7 tip 另支）

| 文件（摘要） | 现象 |
|--------------|------|
| `import-export-integration.test.ts` | image model `connectionConfig.apiKey` 导入后 `undefined`（脱敏/加密路径） |
| `provider-cancellation.test.ts` | abort 后 promise resolve 而非 AbortError |
| `tool-calls.test.ts` ×4 | `sendMessageStreamWithTools` 校验应 reject 却 resolve |

> day-quality / DEBT `D-TEST-CORE6` 已记。W7 `ms-test-gate-stabilize@6257056` **未合**；合入后应在该 tip 复跑 core 全量。

### 原始 exit 日志

`docs/ops/_verify-logs/*.exit.txt`（本提交可一并入库或 `.gitignore`；以本文 exit 表为 SSOT）。

---

## P2 code-review findings 交叉（MS-CR）

源：`FINDINGS-DIGEST.md`（总控 `ms-coord/ms-long-wave`）← `…/code-review/mindsync-findings.md`。  
**P0：** 无。

| id | 症状 | W10 交叉结论 | 覆盖 / 处置 |
|----|------|--------------|-------------|
| **MS-CR-001** | safeStorage 不可用 → 密钥明文落盘 | **基线未修** · 兼容策略仍可能明文 | **另开 fix wt** `ms-fix-safestorage-warn`（启动可见警告 + docs + 测）· **非本刀** |
| **MS-CR-002** | 裸 `ipcMain.handle` / manifest 纪律 | 基线 desktop config **89** + ipc-handlers **11** 绿；ghost/secure 全覆盖改动在 **W1 tip** | **由 harden-ipc 覆盖** · `xvyimu/ms-harden-ipc@881cca9` · **不重复开 wt**；合入后重跑 #3+#4 |
| **MS-CR-003** | `openExternal` 未统一 allowlist | 基线 window-security 测在 #3 绿，但 allowlist 加固**不在** develop tip | **另开 fix wt** `ms-fix-openexternal-allowlist` · **非本刀** |
| **MS-CR-004** | Tauri vs Electron 双叙事 | G0=B · **不实现** Tauri · 本刀未触 `ms-tauri-*` | docs-only / 冻结 |
| **MS-CR-005** | AI-Core 误进包 | 基线断言：`resolveAiCoreConfig` → **`enabled: false`** · `baseUrl: null` · ai-core node **10/10** · pytest **9** | **verify 已断言默认 OFF** · 可选后续 pack-guard；**未** asar 打包 |
| **MS-CR-006** | 更新源/签名 | 基线 update-config / delivery-policy 测在 #3 绿；shell inject / openRelease 加固在 **W5 tip** | **由 harden-updater 覆盖** · `xvyimu/ms-harden-updater-surface@2582c4a` · 合入后重跑 update 相关测 |

### 默认安全（基线仍 OFF）

| 开关 | 证据 | 默认 |
|------|------|------|
| **AI-Core sidecar** | `packages/desktop/config/ai-core-config.js` · 空 `AI_CORE_URL` → disabled · 测 10/10 | **OFF** |
| **glassShell** | `packages/ui/src/config/glass-shell.ts` · 无 env 默认 ON | **OFF**（未改） |
| **local model adapter** | `packages/core/src/services/llm/local-model-flag.ts` · 需显式 env | **OFF**（未改） |
| **asar 重打** | 本轮未跑 electron-builder | **未执行** |

---

## P3 本刀变更

| 文件 | 变更 |
|------|------|
| `docs/ops/ms-electron-harden-verify-2026-07-24.md` | 本证据（命令+exit · 基线 vs feature · CR 交叉） |
| `docs/ops/ms-electron-harden-verify-progress.md` | DONE · in-review |

**未改：** 业务源码 · lockfile · glass/redesign flag · CURRENT tip · asar · package.json。

---

## 红线复核

| 红线 | 状态 |
|------|------|
| 无授权 `git push develop` | **未 push develop** |
| 无 asar 重打 | **未执行** |
| 无 Tauri 实现 | **未触** |
| 无假绿 | 必测 exit **0**；已知红单列 exit **1** + 根因 |
| 不改业务除非阻断回归 | **docs-only** · 无阻断 |

---

## DEFER

| 项 | 原因 |
|----|------|
| 合 W1–W9 → develop | **人授** · 本刀只 VERIFY |
| MS-CR-001 / MS-CR-003 fix | 独立 fix wt（总控已派） |
| core 6 fail 在 develop 清零 | W7 tip 未合；合后复跑 |
| CURRENT tip re-pin / locale typescript | 工具链/文档惯例债 · 非本刀 |
| Playwright e2e / asar pack | 重矩阵 / 人 gate |
| feature 支逐支 checkout 全矩阵 | 可选；合入前在合并 tip 一次复跑更省 |

---

## 复跑命令（维护者）

```powershell
cd <repo>   # 期望 HEAD = develop tip 或合入后 tip
pnpm install --frozen-lockfile
pnpm -F @mindsync/core test:gate
pnpm -F @mindsync/core build
node --test packages/desktop/config/*.test.js
node --test scripts/desktop-ipc-handlers.test.mjs
pnpm -F @mindsync/mcp-server test
pnpm -F @mindsync/core typecheck
node --test packages/desktop/config/ai-core-*.test.js
pnpm check:no-chinese-runtime
pnpm -F @mindsync/ui test
# optional:
# Set-Location services/ai-core; uv run --extra dev pytest tests -q
# pnpm -F @mindsync/core test   # 预期仍可能 6 fail 直至 W7 合入
```

---

## 交付清单

- [x] develop@221b767 基线矩阵 + 每命令 exit  
- [x] W1–W9 tip 表（未合差异）  
- [x] MS-CR-002/005/006 交叉 · CR-001/003 指向 fix wt  
- [x] progress DONE · in-review  
- [x] conventional commit · 可 push **feature** tip · **不** push develop  
