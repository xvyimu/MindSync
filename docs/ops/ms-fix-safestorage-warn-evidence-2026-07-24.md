# MS-CR-001 · safeStorage plaintext warn · 2026-07-24

> **模块：** M-MS-fix-safestorage-warn · findings **MS-CR-001**  
> **分支：** `xvyimu/ms-fix-safestorage-warn`  
> **基线：** develop@`221b767`  
> **禁：** push develop · asar · Tauri · 强制改 Web 透传策略

## 结论

| 项 | 值 |
|----|-----|
| 交付 | 不可用时 **console.warn + 固定 SECURITY 文案**；`services.secretsSecurity` 可观测态 |
| 风险一句 | 兼容策略仍可能明文落盘；本刀只消灭「静默当安全」，不改 codec unavailable → 明文的产品契约 |

## 变更

| 文件 | 变更 |
|------|------|
| `service-container.js` | UNAVAILABLE 警告升级；返回 `secretsSecurity` |
| `service-container.test.js` | null vs mock safeStorage 断言 + warn 捕获 |

## 不做

- 不强制加密失败即拒启动（需独立 ADR）  
- 不改 UI 横幅（无既有 toast 通道则仅主进程可观测 + 结构字段供后续 UI）

## 总控复跑 exit

| 命令 | Exit |
|------|-----:|
| `node --test packages/desktop/config/service-container.test.js` | **0** (6/6) |
| `node --test packages/desktop/config/safe-storage-secrets.test.js packages/desktop/config/service-container.test.js` | **0** (9/9) |
