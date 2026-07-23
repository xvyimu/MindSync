# MindSync Tauri A1 · Phase3 IPC 批次卡（G2 批准后）

| 项 | 值 |
|----|-----|
| **日期** | 2026-07-24 |
| **人 gate** | G2 = **批准 Phase3 功能平移** |
| **基线 tip** | `xvyimu/ms-tauri-stream` @ **`83eedc9`**（含 shell+facade+P0+stream） |
| **secrets tip** | `xvyimu/ms-tauri-secrets` @ `c627828`（B3 前 merge） |
| **规则** | **一批一个 wt** · 完成再开下批 · 不双写 · 不 push · 不拆 Electron |

## 批次 DAG

```
B1 system/app ──► B2 pref/template/history/context
                      │
                      ▼
                   B3 model/image-model + secrets merge
                      │
                      ▼
                   B4 llm/prompt 全量流
                      │
                      ▼
                   B5 data/favorite
                      │
                      ▼
                   B6 remote-storage
                      │
                      ▼
                   B7 ai-core fail-closed
                      
B8 update = DEFER（ADR D9）
```

## 每批 DoD

- progress：`docs/ops/ms-tauri-ipc-bN-progress.md`
- 测或脚本 + exit code
- 不破坏 `@mindsync/core` 公共 API
- `node --test scripts/desktop-ipc-handlers.test.mjs` 仍绿（Electron）
- cargo check（vcvars）与本批相关仍绿
- worker_done 后总控开下一批

## 实开登记

| 批 | wt | task id | status |
|----|-----|---------|--------|
| B1 | ms-tauri-ipc-b1 | （create 后填） | starting |
| B2–B7 | — | pending deps | not started |
| B8 | — | DEFER | — |
