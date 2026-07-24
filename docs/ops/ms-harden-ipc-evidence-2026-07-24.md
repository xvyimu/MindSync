# MS-HARDEN-IPC · Evidence · 2026-07-24

> **模块 ID：** M-MS-harden-ipc · 切片 1/3（G0=B）  
> **分支：** `xvyimu/ms-harden-ipc`  
> **基线 tip：** `221b767`（docs residual deps card）  
> **协议：** 1.1.0（未 bump）  
> **禁止已守：** `git push` · asar 重打 · 改 UI/core 业务 · 假绿

## 结论

| 项 | 值 |
|----|-----|
| 交付 | 幽灵 channel 收敛 + preload `openReleasePage` 补齐 + 契约测加固 + matrix/evidence |
| 协议 | **1.1.0** 保持 |
| invoke 面 | **156**（preload ≡ manifest ≡ secure handle） |
| 风险一句 | 移除无 preload 的 log/别名 channel 对当前 UI 无调用面；旧名直接 invoke 会失败（预期） |

## Diff 摘要

| 文件 | 变更 |
|------|------|
| `packages/desktop/config/ipc/channel-manifest.js` | 删 `model-getModels` / `template-getSupportedLanguages` / `logs-*` |
| `packages/desktop/config/ipc/model-handlers.js` | 删 `model-getModels` handler |
| `packages/desktop/config/ipc/template-handlers.js` | 删 `template-getSupportedLanguages` handler |
| `packages/desktop/config/ipc/system-handlers.js` | 删 logs handlers |
| `packages/desktop/preload.js` | 补 `UPDATE_OPEN_RELEASE_PAGE` + `updater.openReleasePage` |
| `packages/desktop/config/ipc-domain-handlers.test.js` | 对齐断言 |
| `scripts/desktop-ipc-handlers.test.mjs` | 装配完整性 / preload↔manifest / 敏感路径全覆盖 |
| `docs/ops/ms-harden-ipc-channel-matrix-2026-07-24.md` | 全量矩阵 |
| 本文 | 证据 |

## 验证（本条消息实跑 · exit code）

| # | 命令 | Exit | 结果 |
|---|------|-----:|------|
| 1 | `node --test packages/desktop/config/ipc-domain-handlers.test.js packages/desktop/config/ipc-security.test.js` | **0** | 21/21 |
| 2 | `node --test scripts/desktop-ipc-handlers.test.mjs` | **0** | 13/13 |
| 3 | `node --test packages/desktop/config/*.test.js` | **0** | 89/89 |

## Scout 要点（加固前 → 后）

| Gap | 前 | 后 |
|-----|----|----|
| manifest-only | 6（logs×2, model-getModels, template-getSupportedLanguages, remote 扫描假阳, open-release 实为 preload 缺） | 0 |
| preload 缺 openReleasePage | 是 | **已补** |
| 未走 sensitive/secure | 0（领域已全覆盖） | 0 |

## 不做（切片边界）

- 不 push / 不 asar  
- 不改 Vue UI 业务 / `@mindsync/core`  
- 不 bump 协议（非破坏性）  
- 切片 2/3 预留：args 校验加深 / 事件 channel 清单 / 权限分级
