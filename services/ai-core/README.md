# MindSync AI-Core (Python) · Phase2 scaffold

**Status**: scaffold + **draft OpenAPI** · **2026-07-22**  
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
  ai_core/
    __init__.py
    health.py
    main.py              # FastAPI: GET /health only (no eval route yet)
    schemas/
      evaluation.py      # optional Pydantic mirror of main fields
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
| `POST` | `/v1/evaluation/run` | Sync JSON body = `EvaluationRequest` union; response = `EvaluationResponse` |

**Not in v0**: SSE/`evaluateStream`, cancel, rewrite-brief, separate structured-compare path, prompt jobs, eval-cases.

### Validate the spec

```bash
# Prefer Redocly if network/npm available
npx --yes @redocly/cli lint services/ai-core/openapi/evaluation.v0.yaml

# Or: structural self-check (no network)
python -c "import yaml; d=yaml.safe_load(open('services/ai-core/openapi/evaluation.v0.yaml')); assert d['openapi'].startswith('3.'); assert '/health' in d['paths'] and '/v1/evaluation/run' in d['paths']; print('ok', d['info']['version'])"
```

If Redocly is unavailable offline, rely on the YAML self-check and manual review against TS.

### TS vs OpenAPI differences

| Area | TypeScript (SSOT) | OpenAPI / Pydantic v0 |
|------|-------------------|------------------------|
| Request shape | `EvaluationRequest` 4-arm discriminated union | `oneOf` + `discriminator` on `type` |
| `mode.subMode` | Typed per `functionMode` (`BasicSubMode` \| `ProSubMode` \| `ImageSubMode`) | Flattened string enum of all submodes; pair validity is runtime |
| Pro contexts | `ProSystemEvaluationContext` / `ProUserEvaluationContext` exist in types file | **Omitted** from HTTP body (not top-level request fields in current evaluate API) |
| Streaming | `EvaluationStreamHandlers` / `evaluateStream` | **Out of scope** for v0 |
| `IEvaluationService` | Interface only | Not represented as HTTP |
| Media `b64` | Allowed | Allowed; size limits deferred |
| Response `metadata.timestamp` | `number` (epoch ms) | `number` (not date-time string) |
| Compare graph | Full nested TS interfaces | Full nested schemas in YAML; Pydantic keeps compare nested as `dict` loosely |
| camelCase | Yes | Yes (JSON field names match TS) |
| Secrets | `evaluationModelKey` only | Same; **never** API keys in body |
| Auth | N/A (in-process TS) | Optional `desktopBearer`; loopback-only bind; see OpenAPI `security` + `x-implementation-requirements` |

### Auth / bind (implementors)

- **Bind** `127.0.0.1` only for scaffold; do not advertise `0.0.0.0`.
- Global `security` is optional bearer **or** empty (local). Any implementation that can spend model quota **must** reject unauthenticated `POST /v1/evaluation/run` when not in an explicit local-dev mode.

## Run (local)

```bash
cd services/ai-core
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -e ".[dev]"
# optional for schema mirror:
# pip install pydantic
uvicorn ai_core.main:app --host 127.0.0.1 --port 8091
# GET http://127.0.0.1:8091/health
```

## Contract table

| Endpoint | Purpose | Implemented? |
|----------|---------|--------------|
| `GET /health` | Liveness for Electron main / BFF probe | Yes (scaffold) |
| `POST /v1/evaluation/run` | Evaluation job (see OpenAPI) | Spec only; route not registered |
| (later) `POST /v1/prompt/*` | optimize / iterate / test jobs | No |

**Trust**: Vue never calls this port in production; desktop main or BFF only.

## Next implementation slices

1. [x] Freeze OpenAPI for EvaluationRequest/Response from TS types.  
2. [ ] Port structured-compare prompts.  
3. [ ] Wire Electron main env `AI_CORE_URL` behind feature flag (default off).  
4. [ ] Dual-run shadow: TS evaluation vs Python, compare logs.

## Out of scope

- Template library bulk move  
- Image generation  
- Dexie/storage  
- Replacing NaiveUI console  
- Implementing real evaluation logic in this slice  
