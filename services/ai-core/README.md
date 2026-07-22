# MindSync AI-Core (Python) · Phase2 scaffold

**Status**: scaffold + **draft OpenAPI** + **evaluation stub** + **prompt optimize stub** · **2026-07-22**  
**SSOT (types)**: `packages/core/src/services/evaluation/types.ts`, `packages/core/src/services/prompt/types.ts`  
**SSOT (extract plan)**: `docs/phase2-ai-core-extract-map.md`  
**Does not**: change Vue panel, Electron IPC, or production traffic.

## Layout

```text
services/ai-core/
  README.md
  pyproject.toml
  openapi/
    evaluation.v0.yaml   # frozen draft contract (T-MS-001)
    prompt.v0.yaml       # draft contract (T-MS-004)
  tests/
    test_evaluation_stub.py
    test_prompt_stub.py
  ai_core/
    __init__.py
    health.py
    main.py              # FastAPI: /health + evaluation + prompt stubs
    schemas/
      evaluation.py      # Pydantic mirror of main fields
      prompt.py          # Pydantic mirror of OptimizationRequest (minimal)
```

## OpenAPI (draft)

| Artifact | Path |
|----------|------|
| Evaluation v0 | [`openapi/evaluation.v0.yaml`](./openapi/evaluation.v0.yaml) |
| Prompt v0 | [`openapi/prompt.v0.yaml`](./openapi/prompt.v0.yaml) |
| Status | `info.x-status: draft` · non-production |

### Endpoints in v0

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/health` | Matches `ai_core.health.health_payload` |
| `POST` | `/v1/evaluation/run` | Sync JSON; **stub** (no LLM). Bearer required unless `AI_CORE_LOCAL_DEV=1` |
| `POST` | `/v1/prompt/optimize` | Sync JSON; **stub** (no LLM). Same bearer gate as evaluation |

**Not in v0**: SSE/`evaluateStream`, cancel, rewrite-brief, separate structured-compare path, prompt iterate/test/stream, eval-cases.

### Validate the spec

```bash
npx --yes @redocly/cli lint services/ai-core/openapi/evaluation.v0.yaml
npx --yes @redocly/cli lint services/ai-core/openapi/prompt.v0.yaml
# Or structural self-check:
python -c "import yaml; d=yaml.safe_load(open('services/ai-core/openapi/evaluation.v0.yaml')); assert d['openapi'].startswith('3.'); print('ok', d['info']['version'])"
python -c "import yaml; d=yaml.safe_load(open('services/ai-core/openapi/prompt.v0.yaml')); assert d['openapi'].startswith('3.'); print('ok', d['info']['version'])"
```

### TS vs OpenAPI differences

| Area | TypeScript (SSOT) | OpenAPI / Pydantic v0 |
|------|-------------------|------------------------|
| Request shape | `EvaluationRequest` 4-arm union | `oneOf` + `discriminator` on `type` |
| `mode.subMode` | Typed per functionMode | Flattened string enum |
| Streaming | `evaluateStream` | Out of scope |
| Secrets | `evaluationModelKey` only | Never API keys in body |
| Auth | In-process TS | Optional `desktopBearer`; loopback-only bind |

### Auth / bind (implementors)

- Bind **`127.0.0.1` only**.
- Default: require `Authorization: Bearer …` (set `AI_CORE_BEARER` to pin the token).
- Local scaffold only: `AI_CORE_LOCAL_DEV=1` skips bearer (never for production).

## Run (local)

```bash
cd services/ai-core
python -m venv .venv
# Windows: .venv\Scriptsctivate
pip install -e ".[dev]"
uvicorn ai_core.main:app --host 127.0.0.1 --port 8091
# GET http://127.0.0.1:8091/health
# pytest tests/
```

## Contract table

| Endpoint | Purpose | Implemented? |
|----------|---------|--------------|
| `GET /health` | Liveness | Yes |
| `POST /v1/evaluation/run` | Evaluation job | **Stub** (validate + zero score; no LLM) |
| `POST /v1/prompt/optimize` | Prompt optimize | **Stub** (validate + echo; no LLM) |
| (later) `POST /v1/prompt/iterate` / `test` | iterate / test | No |

**Trust**: Vue never calls this port in production; desktop main or BFF only.

## Next implementation slices

1. [x] Freeze OpenAPI for EvaluationRequest/Response from TS types.
2. [x] Stub route + bearer gate + tests.
3. [x] Wire Electron main env `AI_CORE_URL` behind feature flag (default off) — see [Local Electron ↔ AI-Core](#local-electron--ai-core-5-steps).
4. [x] Prompt optimize OpenAPI + stub route + tests (T-MS-004).
5. [ ] Port structured-compare prompts / real evaluator.
6. [ ] Dual-run shadow: TS evaluation vs Python.

## Local Electron ↔ AI-Core (5 steps)

1. **Start stub** (loopback only):

   ```bash
   cd services/ai-core
   python -m venv .venv
   # Windows: .venv\Scripts\activate
   pip install -e ".[dev]"
   # Option A — local scaffold (no bearer):
   set AI_CORE_LOCAL_DEV=1
   uvicorn ai_core.main:app --host 127.0.0.1 --port 8091
   # Option B — pin bearer (matches desktop):
   # set AI_CORE_BEARER=dev-token
   # uvicorn ai_core.main:app --host 127.0.0.1 --port 8091
   ```

2. **Point desktop main at stub** (repo root `.env.local`, never commit secrets):

   ```bash
   AI_CORE_URL=http://127.0.0.1:8091
   # If stub uses AI_CORE_BEARER:
   # AI_CORE_BEARER=dev-token
   ```

3. **Verify health** without Electron:

   ```bash
   curl -s http://127.0.0.1:8091/health
   # or: node packages/desktop/scripts/ai-core-smoke.cjs
   ```

4. **Start desktop** (`pnpm --filter @mindsync/desktop dev`). Main logs `AI-Core enabled at http://127.0.0.1:8091` when URL is set. IPC probes: `ai-core-get-status` / `ai-core-probe-health` / `ai-core-run-evaluation` (preload: `window.electronAPI.aiCore`).

5. **Default off**: leave `AI_CORE_URL` empty — client disabled, evaluation remains in-process TS (unchanged production path). Non-loopback hosts are rejected.

## Out of scope

- Template library bulk move
- Image generation
- Dexie/storage
- Replacing NaiveUI console
- Production LLM spend from this process without BFF auth
- Wiring Vue evaluation panel to AI-Core (later wave)