# MS-CR-003 · openExternal allowlist · 2026-07-24

> **模块：** M-MS-fix-openexternal-allowlist · findings **MS-CR-003**  
> **分支：** `xvyimu/ms-fix-openexternal-allowlist`  
> **基线：** develop@`221b767`  
> **禁：** push develop · asar · Tauri

## 结论

| 项 | 值 |
|----|-----|
| 交付 | 收紧 `isSafeExternalUrl` + 调用点二次门闩 + 单测 |
| 风险一句 | openPath(userData/logDir) 仍为本机目录打开（非 URL 外链）；外链面仅 http(s) |

## 变更

| 文件 | 变更 |
|------|------|
| `window-security.js` | allowlist 显式；拒 userinfo 钓鱼；`openExternalSafe` |
| `system-handlers.js` | openExternal 二次 isSafe 校验 |
| `update-handlers.js` | openRelease URL http(s) 再校验 |
| `remote-storage.js` | openExternal 走 isSafe |
| `window-security.test.js` | allowlist + openExternalSafe 测 |

## 验证

见 commit 后本地 `node --test` exit（本 evidence 由总控复跑填）。

## 不做

- 不 push develop / 不 asar / 不改更新源 host 策略（GitHub 白名单属 W5）

## 总控复跑 exit

| 命令 | Exit |
|------|-----:|
| `node --test packages/desktop/config/window-security.test.js` | **0** (5/5) |
| `node --test packages/desktop/config/*.test.js` | **0** (91/91) |
