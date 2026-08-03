# M-MS-harden-preload-csp · progress

| 项 | 值 |
|----|-----|
| 日期 | 2026-07-24 |
| 分支 | `xvyimu/ms-harden-preload-csp` |
| 基线 | `develop@221b767` |
| 状态 | **DONE · in-review** |

## 做了

1. Scout：contextIsolation / nodeIntegration / sandbox / webSecurity / preload 暴露面 / 导航门闩矩阵 → `docs/ops/ms-harden-preload-csp-evidence-2026-07-24.md`
2. 加固：
   - `createSecureWebPreferences` 强制锁隔离基线（含显式 `webSecurity:true`）
   - preload `electronAPI.on/off` 事件白名单（6 updater channel）
3. 测试：`node --test packages/desktop/config/*.test.js` → **exit 0 · 92/92**

## 风险一句

XSS 仍可调用宽 invoke 面（llm/data/…）；本刀只锁隔离开关 + 收口事件订阅，CSP/invoke 最小化另刀。

## 证据

- `docs/ops/ms-harden-preload-csp-evidence-2026-07-24.md`
