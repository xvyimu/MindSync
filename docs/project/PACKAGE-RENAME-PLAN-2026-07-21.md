# 包名 / appId / 产品标识 重命名方案（G3 · 2026-07-21）

> 状态：**P0–P3 已在 `feature/mindsync-independence` 执行（未 push）**。  
> 许可：**未改变 AGPL-3.0-only**；重命名 ≠ 换协议。

## 执行摘要（已落地）

| 阶段 | 内容 | 状态 |
|------|------|------|
| P0 | 移除 `upstream` · 身份文档 | ✅ |
| P1 | 根 name → `mindsync` · README MindSync 化 | ✅ |
| P2 | `@prompt-optimizer/*` → `@mindsync/*`（~318 文件） | ✅ |
| P3 | `appId` `com.xvyimu.mindsync` · `productName` `MindSync` · userData 迁移 | ✅ |

校验：`user-data-migration` 3 pass · `package-scripts.test` 12 pass · `@mindsync/core` + `@mindsync/ui` typecheck pass。

### 迁移行为
- `app.setName('MindSync')` 后、ConsoleLogger 前：若新 userData 无主数据文件，且存在 legacy  
  `%APPDATA%/@prompt-optimizer/desktop` 或 `%APPDATA%/PromptOptimizer`，则**复制**（不删旧目录）。

### 故意未改
- `LICENSE` / AGPL / `Copyright (C) 2025 linshenkx`
- MCP bin `prompt-optimizer-mcp`
- 主数据文件名 `prompt-optimizer-data.json`
- 全量 i18n UI 文案
