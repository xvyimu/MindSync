"""Optional local HTTP entry. Not wired to Electron/UI by default."""

from __future__ import annotations

import os
import time
from typing import Annotated, Any

from fastapi import Depends, FastAPI, Header, HTTPException, status
from pydantic import TypeAdapter, ValidationError

from ai_core import __version__
from ai_core.health import health_payload

app = FastAPI(title="MindSync AI-Core", version=__version__, docs_url="/docs")



@app.get("/health")
def health() -> dict:
    return health_payload(__version__)


def _local_dev() -> bool:
    """Explicit local-dev escape hatch for unauthenticated scaffold probes."""
    v = (os.environ.get("AI_CORE_LOCAL_DEV") or "").strip().lower()
    return v in {"1", "true", "yes", "on"}


def _expected_bearer() -> str | None:
    token = (os.environ.get("AI_CORE_BEARER") or "").strip()
    return token or None


async def require_desktop_bearer(
    authorization: Annotated[str | None, Header()] = None,
) -> None:
    """
    Enforce desktopBearer before model-backed work.

    - If AI_CORE_LOCAL_DEV=1: allow missing Authorization (scaffold only).
    - Else if AI_CORE_BEARER set: require matching Bearer token.
    - Else: require non-empty Bearer (opaque) so anonymous calls fail closed
      when the service can spend quota later.
    """
    if _local_dev():
        return

    if not authorization or not authorization.lower().startswith("bearer "):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="missing or invalid Authorization bearer",
            headers={"WWW-Authenticate": "Bearer"},
        )
    presented = authorization[7:].strip()
    if not presented:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="empty bearer token",
            headers={"WWW-Authenticate": "Bearer"},
        )
    expected = _expected_bearer()
    if expected is not None and presented != expected:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="bearer token mismatch",
            headers={"WWW-Authenticate": "Bearer"},
        )


def _stub_response(req_type: str, model_key: str) -> dict[str, Any]:
    """Deterministic non-model evaluation placeholder (no LLM calls)."""
    now_ms = time.time() * 1000.0
    return {
        "type": req_type,
        "score": {
            "overall": 0.0,
            "dimensions": [
                {
                    "key": "stub",
                    "label": "Stub (not evaluated)",
                    "score": 0.0,
                }
            ],
        },
        "improvements": [
            "AI-Core evaluation stub only — no model call was made.",
            "Set AI_CORE_LOCAL_DEV=0 and wire a real evaluator before production.",
        ],
        "summary": (
            f"Stub evaluation for type={req_type} model={model_key}. "
            "Phase2 scaffold; not production-wired."
        ),
        "patchPlan": [],
        "metadata": {
            "model": model_key,
            "timestamp": now_ms,
            "duration": 0.0,
        },
    }


@app.post("/v1/evaluation/run", dependencies=[Depends(require_desktop_bearer)])
def run_evaluation(body: dict[str, Any]) -> dict[str, Any]:
    """
    Draft OpenAPI path: validate request shape, return stub EvaluationResponse.

    Does **not** call LLM providers. Refuses to run without bearer unless
    AI_CORE_LOCAL_DEV=1.
    """
    try:
        from ai_core.schemas.evaluation import EvaluationRequest  # lazy: needs pydantic
    except ImportError as exc:  # pragma: no cover
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="pydantic schemas not installed; pip install 'mindsync-ai-core[dev]' or pydantic",
        ) from exc

    try:
        adapter: TypeAdapter[Any] = TypeAdapter(EvaluationRequest)
        req = adapter.validate_python(body)
    except ValidationError as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=exc.errors(),
        ) from exc

    req_type = getattr(req, "type", None) or body.get("type")
    model_key = getattr(req, "evaluationModelKey", None) or body.get(
        "evaluationModelKey", "unknown"
    )
    return _stub_response(str(req_type), str(model_key))
