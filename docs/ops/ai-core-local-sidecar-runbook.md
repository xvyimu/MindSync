# AI-Core · 模式 A 本地 sidecar 最短步骤

| 项 | 值 |
|----|-----|
| **模式** | A · 开发者自启 sidecar（发行契约正式模式） |
| **契约** | [`ai-core-distribution-contract.md`](./ai-core-distribution-contract.md) |
| **默认** | `AI_CORE_URL` 空 = OFF；**不进** asar / Docker Web / 生产评测路径 |
| **日期** | 2026-07-22 |

> 目标：全新开发机 **5 分钟内** 起 loopback stub + 验 `/health`。不做真打包、不默认打开生产路径。

---

## 0. 前置

- Python **≥ 3.11**、`pip`
- 仓库根：含 `services/ai-core/`
- 端口 **8091** 空闲（可改，须与 `AI_CORE_URL` 一致）

---

## 1. 最短路径（Windows / pwsh）

```powershell
cd services/ai-core
python -m venv .venv
.\.venv\Scripts\Activate.ps1
pip install -e ".[dev]"
$env:AI_CORE_LOCAL_DEV = '1'   # 仅本机脚手架；禁止生产/共享主机
uvicorn ai_core.main:app --host 127.0.0.1 --port 8091
```

另开终端：

```powershell
# 健康（无需 bearer，/health 公开）
curl.exe -s http://127.0.0.1:8091/health
# 期望 JSON：含 status/ok 与 version 类字段

# 桌面侧配置探测（默认 OFF 也 exit 0）
node packages/desktop/scripts/ai-core-smoke.cjs

# 指到 live stub 再探
$env:AI_CORE_URL = 'http://127.0.0.1:8091'
node packages/desktop/scripts/ai-core-smoke.cjs
# 可选评测 stub：
# node packages/desktop/scripts/ai-core-smoke.cjs --eval
```

**可选 · 钉死 bearer（更接近桌面默认 fail-closed）：**

```powershell
# 终端 A（stub）
$env:AI_CORE_BEARER = 'dev-local-only'   # 勿提交；勿用生产密钥
# 不要设 AI_CORE_LOCAL_DEV
uvicorn ai_core.main:app --host 127.0.0.1 --port 8091

# 终端 B（desktop env / smoke）
$env:AI_CORE_URL = 'http://127.0.0.1:8091'
$env:AI_CORE_BEARER = 'dev-local-only'
node packages/desktop/scripts/ai-core-smoke.cjs --eval
```

---

## 2. 最短路径（bash / macOS·Linux）

```bash
cd services/ai-core
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
export AI_CORE_LOCAL_DEV=1
uvicorn ai_core.main:app --host 127.0.0.1 --port 8091
```

```bash
curl -s http://127.0.0.1:8091/health
AI_CORE_URL=http://127.0.0.1:8091 node packages/desktop/scripts/ai-core-smoke.cjs
```

---

## 3. 联调桌面（可选）

1. 仓库根 `.env.local`（**不提交密钥**）：

   ```text
   AI_CORE_URL=http://127.0.0.1:8091
   # AI_CORE_BEARER=…  与 stub 一致时再填
   ```

2. `pnpm --filter @mindsync/desktop dev`  
   主进程日志应出现 `AI-Core enabled at http://127.0.0.1:8091`。

3. Preload 探测（Bearer **不进** renderer）：  
   `window.electronAPI.aiCore.getStatus()` / `.probeHealth()` / `.runEvaluation(body)`

4. 关掉旁路：清空 `AI_CORE_URL` → 评测仍走进程内 TS。

---

## 4. 无 Electron 的契约验证（CI/本地）

在**仓库根**（无需起 uvicorn 即可跑单测）：

```powershell
python -m pytest services/ai-core/tests -q
node --test packages/desktop/config/ai-core-config.test.js packages/desktop/config/ai-core-client.test.js
node --test --test-name-pattern "preload IPC|streaming contract|composition root|channel manifest|preference bridge|avoids renderer" scripts/desktop-ipc-handlers.test.mjs
```

| 检查 | 通过标准 |
|------|----------|
| pytest | exit **0**，evaluation + prompt stubs 绿 |
| desktop config/client | exit **0**，默认 OFF + loopback only |
| IPC Gate 子集 | exit **0**，含 `ai-core-*` 三条通道 |

---

## 5. 故障速查

| 现象 | 处理 |
|------|------|
| `401` on `/v1/*` | 设 `AI_CORE_LOCAL_DEV=1` **或** 配对 `AI_CORE_BEARER` |
| smoke：URL rejected | 必须是 `http://127.0.0.1` / `localhost`；禁止公网 host |
| 端口占用 | 换 port，同步改 `AI_CORE_URL` |
| `ModuleNotFoundError: pydantic/fastapi` | `pip install -e ".[dev]"` 在 venv 内 |
| 桌面无 AI-Core 日志 | 确认 env 注入 main 进程（`.env.local` / 启动 shell），非仅 renderer |

---

## 6. 明确不做

- 不把 AI-Core 打进 Desktop asar / 覆盖用户装机
- 不默认 `AI_CORE_URL` 进生产构建或 CI 发布矩阵
- 不把 stub 接到生产 Vue 评测按钮
- 不把 `AI_CORE_LOCAL_DEV=1` 用于共享/生产主机
- 不在本 runbook 授权真 publish / D7 / 生产 CSP·RLS / ISS

更完整的发行矩阵与变更流程见 [distribution contract](./ai-core-distribution-contract.md)。
