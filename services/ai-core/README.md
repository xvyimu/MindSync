# MindSync AI-Core (Python) · Phase2 scaffold

**Status**: scaffold + **draft OpenAPI** + **evaluation stub** · **2026-07-22**  
**SSOT (types)**: `packages/core/src/services/evaluation/types.ts`  
**SSOT (extract plan)**: `docs/phase2-ai-core-extract-map.md`  
**Does not**: change Vue panel, Electron IPC, or production traffic.

## Layout

```text
services/ai-core/
  README.md
  pyproject.toml
  openapi/
    evaluation.v0.yaml   # frozen draft contract (T-MS-001)
  tests/
    test_evaluation_stub.py
  ai_core/
    __init__.py
    health.py
    main.py              # FastAPI: /health + stub POST /v1/evaluation/run
    schemas/
      evaluation.py      # Pydantic mirror of main fields
```

## OpenAPI (draft)

| Artifact | Path |
|----------|------|
| Evaluation v0 | [`openapi/evaluation.v0.yaml`](./openapi/evaluation.v0.yaml) |
| Status | `info.x-status: draft` · non-production |

### Endpoints in v0

| Method | Path | Notes |
|--------|------|--------|
| `GET` | `/health` | Matches `ai_core.health.health_payload` |
| `POST` | `/v1/evaluation/run` | Sync JSON; **stub** (no LLM). Bearer required unless `AI_CORE_LOCAL_DEV=1` |

**Not in v0**: SSE/`evaluateStream`, cancel, rewrite-brief, separate structured-compare path, prompt jobs, eval-cases.

### Validate the spec

```bash
npx --yes @redocly/cli lint services/ai-core/openapi/evaluation.v0.yaml
# Or structural self-check:
python -c "import yaml; d=yaml.safe_load(open('services/ai-core/openapi/evaluation.v0.yaml')); assert d['openapi'].startswith('3.'); print('ok', d['info']['version'])"
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
# pytest tests/test_evaluation_stub.py
```

## Contract table

| Endpoint | Purpose | Implemented? |
|----------|---------|--------------|
| `GET /health` | Liveness | Yes |
| `POST /v1/evaluation/run` | Evaluation job | **Stub** (validate + zero score; no LLM) |
| (later) `POST /v1/prompt/*` | optimize / iterate / test | No |

**Trust**: Vue never calls this port in production; desktop main or BFF only.

## Next implementation slices

1. [x] Freeze OpenAPI for EvaluationRequest/Response from TS types.
2. [x] Stub route + bearer gate + tests.
3. [ ] Port structured-compare prompts / real evaluator.
4. [ ] Wire Electron main env `AI_CORE_URL` behind feature flag (default off).
5. [ ] Dual-run shadow: TS evaluation vs Python.

## Out of scope

- Template library bulk move
- Image generation
- Dexie/storage
- Replacing NaiveUI console
- Production LLM spend from this process without BFF auth
