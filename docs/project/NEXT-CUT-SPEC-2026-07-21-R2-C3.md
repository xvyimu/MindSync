# 下一刀实现规格：Cut-R2c · C3 MCP 结构化返回

> **C3**：MCP 工具成功结果为稳定 JSON：`original` / `optimized` / `meta`。  
> 不 vendor 新依赖；不返回密钥。

| 项 | 值 |
|----|-----|
| 状态 | **代码 done** |
| 模块 | `packages/mcp-server/src/adapters/structured-result.ts` |
| 接入 | `optimize-user-prompt` · `optimize-system-prompt` · `iterate-prompt` |

## Schema（version=1）

```json
{
  "original": "…",
  "optimized": "…",
  "meta": {
    "version": 1,
    "tool": "optimize-user-prompt",
    "mode": "user",
    "templateId": "…",
    "modelKey": "mcp-default",
    "truncated": false,
    "requirements": "…"
  }
}
```

## 验收

- 单测：`tests/structured-result.test.ts`  
- `pnpm mcp:test` 绿  
- 正文仍经 `truncateResult` 总长度门禁  
