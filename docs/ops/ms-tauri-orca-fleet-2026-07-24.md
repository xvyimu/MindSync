# MindSync Tauri A1 · Orca 舰队编排卡（全流程）

| 项 | 值 |
|----|-----|
| **日期** | 2026-07-24 |
| **范围** | A1 仅壳 · ADR-0001 · cutover-plan |
| **源码** | `D:\MindSync\src\mindsync` · Orca 名 MindSync |
| **总控** | 本会话 / Orca orchestration · **禁** stop 总控 `path:D:\orca` |
| **默认交付** | G3 前仍 Electron |

---

## 1. DAG（依赖）

```
M0 文档 ✅
  └─ M1 shell 脚手架（开窗+挂 UI）
        ├─ M2 facade+P0 commands  ─┐
        └─ M4 stream+abort 设计    │  (M4 实现依赖 M2 最小 invoke)
              └─ M3 secrets ───────┼─ 可与 M2 后半并行，但合入前 M2 facade 稳定
                    └─ M5 批次串行：
                         B1 system → B2 pref/template/history/context
                           → B3 model/密钥 → B4 llm/prompt 全量
                           → B5 data/favorite → B6 remote → B7 ai-core
                           → M7 update DEFER
                    └─ M8 测量回归 → G3 人 gate
```

**并行度（推荐）：**

| 波 | worktree | 任务 | 依赖 |
|----|----------|------|------|
| W1 | `ms-tauri-shell` | M1 脚手架 + dev 脚本 + 不删 Electron | 无 |
| W1 | `ms-tauri-facade` | M2：desktopAPI/electronAPI 兼容层设计+空实现 | 可与 shell 并行设计；合码依赖 shell 目录约定 |
| W2 | `ms-tauri-commands` | M2 实现：version/preference/ping/openExternal | shell + facade 接口冻结 |
| W2 | `ms-tauri-stream` | M4 流式+Abort 最小 | commands ping 通 |
| W2 | `ms-tauri-secrets` | M3 密钥 codec | facade 存储接口 |
| W3+ | `ms-tauri-ipc-b1`… | 按批 B1–B7 **串行开 wt**（或完成一个再 create 下一个） | 上一批 merge/ff 到 develop 或集成分支 |

**集成分支建议：** `feat/ms-tauri-a1`（各 wt 从 develop 拉，合入集成分支；**不擅自 push** 除非人授权）。

---

## 2. 每 worker 固定前缀

```
---
产品：MindSync · 源码工作树内路径以 orca worktree 为准（真源 D:\MindSync\src\mindsync）
先读：docs/PROJECT.md · docs/adr/0001-tauri-desktop-mainline.md · docs/ops/ms-tauri-cutover-plan.md · docs/ops/ms-tauri-migration-scout-2026-07-24.md · 本任务附件
栈：Vue3/Naive/Vite/pnpm/@mindsync/core 不变；壳仅任务目录
禁：git push、删 packages/desktop 主路径、换 UI 框架、AI-Core 默认进包、空口完成、改 Web/扩展业务
验证：命令 + exit code 写 progress.md
做完：worker_done + docs/ops 或 wt 内 progress.md / findings.md
心跳：长任务每阶段 heartbeat
---
```

---

## 3. Worktree 命名

| name | 阶段 | agent |
|------|------|-------|
| `ms-tauri-shell` | M1 | claude |
| `ms-tauri-facade` | M2 接口 | claude |
| `ms-tauri-commands` | M2 实现 | claude |
| `ms-tauri-stream` | M4 | claude |
| `ms-tauri-secrets` | M3 | claude |
| `ms-tauri-ipc-bN` | M5 批 | claude（按批） |

---

## 4. 总控循环

1. `orca status --json`  
2. `worktree create --name … --agent claude --prompt …` 或 create 后核 terminal  
3. `orchestration task-create` + `deps`  
4. `dispatch --inject`  
5. `check --wait --types worker_done,escalation,decision_gate` 滚动 15–60min  
6. 收 evidence → 开下一波  
7. 收工：只 stop/rm **本波 child 名表**

---

## 5. 与 G1 关系

维护者指示「写好了就设置长任务跑全流程」= **授权进入实现舰队调度**。  
若某 worker 需改 ADR 范围 → escalation 总控，不擅自扩 A2。
