# M-MS-harden-ipc · progress · 2026-07-24

**状态：** DONE · in-review  
**分支：** `xvyimu/ms-harden-ipc` · 基线 `221b767`  
**切片：** 1/3（G0=B Electron IPC 硬化）

## 摘要

- Scout：manifest 160→加固后 **156**；preload≡manifest≡secure  
- 删幽灵：`model-getModels`、`template-getSupportedLanguages`、`logs-get-paths`、`logs-open-directory`  
- 补 preload：`updater.openReleasePage` → `updater-open-release-page`  
- 契约：装配完整性 + 敏感路径全覆盖 + preload/manifest 对齐  
- 协议 **1.1.0** 未 bump  
- 验证 exit 0：config tests 89 · ipc-handlers 13 · domain+security 21  
- 文档：`docs/ops/ms-harden-ipc-channel-matrix-2026-07-24.md` · `docs/ops/ms-harden-ipc-evidence-2026-07-24.md`  
- **风险：** 旧名直接 invoke 失败（预期收敛）  
- **未做：** push / asar / UI·core 业务
