# AI-Core · 模式 A 本地 sidecar 最短步骤

| 项 | 值 |
|----|-----|
| **模式** | A · 开发者自启 sidecar（发行契约正式模式 · **W2 ADR Accepted**） |
| **契约** | [`ai-core-distribution-contract.md`](./ai-core-distribution-contract.md) |
| **ADR** | [`adr-ai-core-distribution-w2.md`](./adr-ai-core-distribution-w2.md) |
| **默认** | `AI_CORE_URL` 空 = OFF；**不进** asar / Docker Web / 生产评测路径 |
| **日期** | 2026-07-23 |

> 目标：全新开发机 **5 分钟内** 起 loopback stub + 验 `/health`。不做真打包、不默认打开生产路径。

---

## 0. 前置

- Python **≥ 3.11**
- **推荐** [uv](https://github.com/astral-sh/uv)（W4：`services/ai-core/uv.lock` 可复现安装）
- 无 uv 时：`pip` + venv（版本浮动，仅应急）
- 仓库根：含 `services/ai-core/`
- 端口 **8091** 空闲（可改，须与 `AI_CORE_URL` 一致）

---

## 1. 最短路径（Windows / pwsh）

```powershell
cd services/ai-core
# 推荐 · 锁文件（W4）
uv sync --extra dev
$env:AI_CORE_LOCAL_DEV = '1'   # 仅本机脚手架；禁止生产/共享主机
uv run uvicorn ai_core.main:app --host 127.0.0.1 --port 8091

# 应急 · 无 uv：
# python -m venv .venv
# .\.venv\Scripts\Activate.ps1
# pip install -e ".[dev]"
# uvicorn ai_core.main:app --host 127.0.0.1 --port 8091
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
uv sync --extra dev
export AI_CORE_LOCAL_DEV=1
uv run uvicorn ai_core.main:app --host 127.0.0.1 --port 8091
# fallback: python3 -m venv .venv && source .venv/bin/activate && pip install -e ".[dev]" && uvicorn …
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

   | API | 用途 |
   |-----|------|
   | `getStatus()` | 配置态：`enabled` · `baseUrl` · `error` · `distributionMode: 'A'` · `lastHealth`（上次 probe 缓存；未 probe 为 `null`） · **`healthState`**（见下表） |
   | `probeHealth()` | 主动 `GET /health`；成功后 `getStatus().lastHealth` 带 `ok` / `httpStatus` / `body` / `probedAt`；`healthState` 同步为 `ok`/`error` |
   | `runEvaluation(body)` | stub 评测；需 enabled + 合法 object body |

   **`healthState`（W3 Mode A · 与 IPC 一致 · 无 bearer）**

   | 值 | 含义 |
   |----|------|
   | `disabled` | `AI_CORE_URL` 空 / 默认 OFF |
   | `config_error` | URL 被拒（非 loopback / 非法） |
   | `not_probed` | enabled 但尚未 `probeHealth`（`lastHealth === null`） |
   | `ok` | 最近一次 probe `ok: true` |
   | `error` | 最近一次 probe 失败或 HTTP≠200 |

4. 关掉旁路：清空 `AI_CORE_URL` → 评测仍走进程内 TS。

---

## 4. 无 Electron 的契约验证（CI/本地）

在**仓库根**（无需起 uvicorn 即可跑单测）：

```powershell
# 锁文件路径（推荐）：
# cd services/ai-core; uv sync --extra dev; uv run pytest tests -q
python -m pytest services/ai-core/tests -q
node --test packages/desktop/config/ai-core-config.test.js packages/desktop/config/ai-core-client.test.js
# 全量 IPC（含 S3/WebDAV/AI-Core fail-closed + lastHealth）；W2 S3 懒加载后装载模块不再依赖 top-level SDK
node --test scripts/desktop-ipc-handlers.test.mjs
```

| 检查 | 通过标准 |
|------|----------|
| pytest | exit **0**，evaluation + prompt stubs 绿 |
| desktop config/client | exit **0**，默认 OFF + loopback only + `distributionMode: 'A'` + `healthState` |
| IPC 全量 | exit **0**，11/11（含 `ai-core-*` 与 remote-storage） |
| CURRENT tip 门闩 | `pnpm check:docs-tip` / `pnpm check:docs` exit **0**（`本仓 tip（SSOT）` = `git rev-parse HEAD` 前缀） |

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
