# 可选本地模型适配器 · Feature Flag（W3 · W4 交叉）

| 项 | 值 |
|----|-----|
| **状态** | Stub 已实现 · **默认 OFF** |
| **日期** | 2026-07-23 |
| **波次** | portfolio-arch-upgrade-2026h2 · **W3 实现 · W4 文档交叉** |
| **代码** | `packages/core/src/services/llm/local-model-flag.ts` · `adapters/local-model-adapter.ts` |
| **Provider id** | `local-model` |
| **Model id** | `local-model-stub` |
| **活快照交叉** | [`../project/CURRENT.md`](../project/CURRENT.md) 能力摘要一句（默认 OFF · 勿复制 flag 语义） |

## 1. 开关（默认 OFF）

| 环境变量 | 真值 | 说明 |
|----------|------|------|
| `MINDSYNC_LOCAL_MODEL_ADAPTER` | `1` / `true` / `yes` / `on` | 进程/桌面 main 优先 |
| `VITE_LOCAL_MODEL_ADAPTER` | 同上 | Vite 注入路径（可选） |

- **空 / 未设 / `0` / `false`** → OFF（生产与默认开发路径）  
- **不读 API 密钥**；stub **无网络**  
- **不**写入默认 model 列表；仅当 flag ON 时注册进 `TextAdapterRegistry`

## 2. 行为

| Flag | Registry | `sendMessage` |
|------|----------|---------------|
| OFF | 无 `local-model` provider | 直接构造 adapter 时 fail-closed（`RequestConfigError`） |
| ON | 注册 stub provider | 返回确定性离线文本（`[local-model-stub]…`） |

## 3. 明确不做

- 不接真本地推理运行时 / 不绑 Ollama 为生产默认（Ollama 已有独立 adapter）  
- 不默认进 UI 模型列表 / 不接 Vue 生产评测按钮  
- 不进 asar 捆绑 Python / 不默认 Mode B  
- 不提交密钥；本 flag **不**使用密钥  

## 4. 验证

```powershell
# 默认 OFF 路径（registry 无 local-model）
pnpm -F @mindsync/core exec vitest run tests/unit/llm/local-model-adapter.test.ts

# 手动开 flag 烟测（可选）
$env:MINDSYNC_LOCAL_MODEL_ADAPTER = '1'
# 再跑上述 vitest 中 ON 用例（测试内 stubEnv）
```

## 5. 变更流程

1. 改 flag 语义 → 同步本文件 + 单测 + CURRENT 一句  
2. 若将来接真本地 runtime → 新 ADR + 仍默认 OFF + 禁密钥进仓  

## 6. W4 收口备忘

- **不**将 flag 默认改为 ON；**不**绑生产密钥/runtime  
- 栈矩阵：[`stack-matrix-2026-07.md`](./stack-matrix-2026-07.md) §0 / §4  
- 下半年若接真本地推理：仍走本文件 §5.2 · 与 Ollama 独立 adapter 并存  

