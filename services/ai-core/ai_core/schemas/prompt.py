"""Pydantic mirror of prompt.v0 OpenAPI (main fields only).

SSOT: packages/core/src/services/prompt/types.ts (OptimizationRequest)
OpenAPI: services/ai-core/openapi/prompt.v0.yaml

Draft / non-production. No LLM calls.
"""

from __future__ import annotations

from typing import Literal, Optional

from pydantic import BaseModel, ConfigDict, Field


class PromptOptimizeRequest(BaseModel):
    model_config = ConfigDict(extra="forbid")

    optimizationMode: Literal["system", "user"]
    targetPrompt: str = Field(min_length=1)
    modelKey: str = Field(min_length=1)
    templateId: Optional[str] = None


class PromptOptimizeResponseMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid")

    model: Optional[str] = None
    timestamp: Optional[float] = None
    duration: Optional[float] = None
    stub: Optional[bool] = None


class PromptOptimizeResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    optimizedPrompt: str
    summary: Optional[str] = None
    metadata: Optional[PromptOptimizeResponseMetadata] = None
