# MindSync AI-Core (Python) · Phase2 scaffold

**Status**: scaffold only · **2026-07-22**  
**SSOT**: `docs/phase2-ai-core-extract-map.md`  
**Does not**: change Vue panel, Electron IPC, or production traffic.

## Layout

```text
services/ai-core/
  README.md           # this file
  pyproject.toml      # package metadata
  ai_core/
    __init__.py
    health.py         # health payload helper
    main.py           # optional FastAPI app (local only)
```

## Run (local)

```bash
cd services/ai-core
python -m venv .venv
# Windows: .venv\Scripts\activate
pip install -e ".[dev]"
uvicorn ai_core.main:app --host 127.0.0.1 --port 8091
# GET http://127.0.0.1:8091/health
```

## Contract (draft)

| Endpoint | Purpose |
|----------|---------|
| `GET /health` | Liveness for Electron main / BFF probe |
| (later) `POST /v1/evaluation/*` | From map E1 |
| (later) `POST /v1/prompt/*` | optimize / iterate / test jobs |

**Trust**: Vue never calls this port in production; desktop main or BFF only.

## Next implementation slices (not this commit)

1. Freeze OpenAPI for EvaluationRequest/Response from TS types.  
2. Port structured-compare prompts.  
3. Wire Electron main env `AI_CORE_URL` behind feature flag (default off).  
4. Dual-run shadow: TS evaluation vs Python, compare logs.  

## Out of scope

- Template library bulk move  
- Image generation  
- Dexie/storage  
- Replacing NaiveUI console  
