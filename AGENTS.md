# MindSync — Agent 入口

> 与 Codex/Claude 共用。细节与版本数字见 docs；**勿**在本文件复制易过期 tip。

| 项 | 值 |
|----|-----|
| GitHub | [xvyimu/MindSync](https://github.com/xvyimu/MindSync) · 仅 `origin` |
| 源码 | `D:\MindSync\src\mindsync` · 入口 `D:\projects\MindSync` |
| 运行 | `D:\MindSync\app\PromptOptimizer.exe` |
| 默认分支 | `develop` |

## 先读

1. **[`docs/PROJECT.md`](./docs/PROJECT.md)** — **形态与栈 SSOT**（Desktop Electron 主交付 + Vue monorepo）  
2. **[`docs/project/CURRENT.md`](./docs/project/CURRENT.md)** — 版本 / 路径 / tip 活快照  
3. [`docs/PROJECT_HANDOFF.md`](./docs/PROJECT_HANDOFF.md) — 交接总册  
4. 全局门闩：`~/CLAUDE.md` §8 · 形态/栈未入档禁业务编码

## 硬约束（摘要）

- **pnpm** + **Node ^24**；包 scope `@mindsync/*`  
- 领域逻辑进 `@mindsync/core`；UI 为 **Vue 3 + Naive UI**；Desktop **Electron**  
- 小修不重选型；换主形态/栈 → ADR + 改 `docs/PROJECT.md`  
- 不默认恢复 upstream / 不默认向上游 PR  
