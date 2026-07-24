# MS-EXT-MCP-SMOKE · progress

| 字段 | 值 |
|------|-----|
| 模块 | `M-MS-ext-mcp-smoke-docs` |
| 日期 | 2026-07-24 |
| 基线 | `develop@221b767` |
| 分支 | `xvyimu/ms-ext-mcp-smoke-docs` |
| 状态 | **DONE · in-review** |

## 勾选

- [x] Scout extension 入口 / 构建 / 加载路径  
- [x] Scout mcp-server 工具面 / 测试 / core 边界  
- [x] 产出 `docs/ops/ms-ext-mcp-smoke-2026-07-24.md`  
- [x] 实跑既有测 + exit 写入 evidence  
- [x] conventional commit（本文件 + smoke 卡）  
- [ ] 可选 push feature tip（不 push develop）

## 验证摘要

| 门 | Exit |
|----|-----:|
| core build | 0 |
| mcp-server test（39） | 0 |
| mcp-server type-check | 0 |
| mcp-server lint | 0 |
| extension test（无文件） | 1（缺口） |
| extension typecheck（vue-tsc PATH） | 1（既有） |

## 风险一句

扩展 test/typecheck 不能当合入绿；MCP 测必须先 `pnpm -F @mindsync/core build`。

## 证据主文

→ [`ms-ext-mcp-smoke-2026-07-24.md`](./ms-ext-mcp-smoke-2026-07-24.md)
