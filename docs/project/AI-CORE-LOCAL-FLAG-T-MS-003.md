# T-MS-003 · Electron AI_CORE_URL local联调

**状态**：已实现（默认 OFF）  
**日期**：2026-07-22  
**相关**：`services/ai-core/README.md` · `packages/desktop/config/ai-core-config.js`

## 5 步

1. **起 stub**（`127.0.0.1` only）  
   ```text
   cd services/ai-core
   # activate venv, pip install -e ".[dev]"
   set AI_CORE_LOCAL_DEV=1
   uvicorn ai_core.main:app --host 127.0.0.1 --port 8091
   ```

2. **设 URL**（repo root `.env.local` 或进程环境）  
   ```text
   AI_CORE_URL=http://127.0.0.1:8091
   # optional: AI_CORE_BEARER=<same as stub AI_CORE_BEARER>
   ```
   空 `AI_CORE_URL` = 关闭远程（与现网一致）。

3. **验 /health**  
   ```text
   curl -s http://127.0.0.1:8091/health
   node packages/desktop/scripts/ai-core-smoke.cjs
   # with URL + live:
   # $env:AI_CORE_URL='http://127.0.0.1:8091'; node packages/desktop/scripts/ai-core-smoke.cjs
   ```

4. **起桌面**  
   `pnpm --filter @mindsync/desktop dev`  
   主进程日志：`AI-Core enabled at http://127.0.0.1:8091`  
   可选 IPC：`window.electronAPI.aiCore.getStatus()` / `.probeHealth()` / `.runEvaluation(body)`  
   **Bearer 不进 renderer。**

5. **默认路径**  
   不设 `AI_CORE_URL` → `resolveAiCoreConfig` `enabled:false`；UI 评估仍走 in-process TS。本波**不**切换面板。

## 安全

- 禁止仓库默认密钥；`AI_CORE_BEARER` 仅本地 env。
- 非 loopback host 拒绝。
- `AI_CORE_LOCAL_DEV=1` 仅 Python stub 本地脚手架，禁止生产。
