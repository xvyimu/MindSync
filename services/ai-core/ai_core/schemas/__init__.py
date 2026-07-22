"""Pydantic mirrors of evaluation / prompt OpenAPI (draft). SSOT remains TS types."""

from ai_core.schemas.evaluation import (
    EvaluationRequest,
    EvaluationResponse,
    HealthResponse,
)
from ai_core.schemas.prompt import (
    PromptOptimizeRequest,
    PromptOptimizeResponse,
)

__all__ = [
    "EvaluationRequest",
    "EvaluationResponse",
    "HealthResponse",
    "PromptOptimizeRequest",
    "PromptOptimizeResponse",
]
