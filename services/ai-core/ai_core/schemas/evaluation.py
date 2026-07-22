"""Pydantic mirror of evaluation.v0 OpenAPI (main fields only).

SSOT: packages/core/src/services/evaluation/types.ts
OpenAPI: services/ai-core/openapi/evaluation.v0.yaml

Not wired to routes yet. Draft / non-production.
"""

from __future__ import annotations

from typing import Annotated, Any, Literal, Optional, Union

from pydantic import BaseModel, ConfigDict, Field


class HealthResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    status: str
    service: str
    version: str
    ts: str
    phase: str


class EvaluationModeConfig(BaseModel):
    model_config = ConfigDict(extra="forbid")

    functionMode: Literal["basic", "pro", "image"]
    subMode: str


class FocusBrief(BaseModel):
    model_config = ConfigDict(extra="forbid")

    content: str
    source: Optional[Literal["user", "system"]] = None
    priority: Optional[Literal["highest"]] = None


class EvaluationMediaItem(BaseModel):
    model_config = ConfigDict(extra="forbid")

    label: str
    assetId: Optional[str] = None
    b64: Optional[str] = None
    mimeType: Optional[str] = None


class EvaluationContentBlock(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["text", "variables", "conversation", "image", "json", "custom"]
    label: str
    content: str
    summary: Optional[str] = None
    media: Optional[list[EvaluationMediaItem]] = None


class EvaluationTarget(BaseModel):
    model_config = ConfigDict(extra="forbid")

    workspacePrompt: str
    referencePrompt: Optional[str] = None
    designContext: Optional[EvaluationContentBlock] = None


class EvaluationTestCase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    label: Optional[str] = None
    input: EvaluationContentBlock
    settingsSummary: Optional[str] = None


class EvaluationPromptRef(BaseModel):
    model_config = ConfigDict(extra="forbid")

    kind: Literal["workspace", "original", "version", "custom"]
    version: Optional[int] = None
    label: Optional[str] = None
    dynamicAlias: Optional[Literal["previous"]] = None


class EvaluationSnapshot(BaseModel):
    model_config = ConfigDict(extra="forbid")

    id: str
    label: str
    testCaseId: str
    promptRef: EvaluationPromptRef
    promptText: str
    output: str
    outputBlock: Optional[EvaluationContentBlock] = None
    reasoning: Optional[str] = None
    modelKey: Optional[str] = None
    versionLabel: Optional[str] = None
    executionInput: Optional[EvaluationContentBlock] = None


class CompareAnalysisHints(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: Optional[Literal["generic", "structured"]] = None
    snapshotRoles: Optional[dict[str, str]] = None
    hasSharedTestCases: Optional[bool] = None
    hasSamePromptSnapshots: Optional[bool] = None
    hasCrossModelComparison: Optional[bool] = None


class EvaluationRequestBase(BaseModel):
    model_config = ConfigDict(extra="forbid")

    evaluationModelKey: str
    variables: Optional[dict[str, str]] = None
    mode: EvaluationModeConfig
    focus: Optional[FocusBrief] = None


class ResultEvaluationRequest(EvaluationRequestBase):
    type: Literal["result"]
    target: EvaluationTarget
    testCase: EvaluationTestCase
    snapshot: EvaluationSnapshot


class CompareEvaluationRequest(EvaluationRequestBase):
    type: Literal["compare"]
    target: EvaluationTarget
    testCases: list[EvaluationTestCase]
    snapshots: list[EvaluationSnapshot]
    compareHints: Optional[CompareAnalysisHints] = None


class PromptOnlyEvaluationRequest(EvaluationRequestBase):
    type: Literal["prompt-only"]
    target: EvaluationTarget


class PromptIterateEvaluationRequest(EvaluationRequestBase):
    type: Literal["prompt-iterate"]
    target: EvaluationTarget
    iterateRequirement: str


EvaluationRequest = Annotated[
    Union[
        ResultEvaluationRequest,
        CompareEvaluationRequest,
        PromptOnlyEvaluationRequest,
        PromptIterateEvaluationRequest,
    ],
    Field(discriminator="type"),
]


class EvaluationDimension(BaseModel):
    model_config = ConfigDict(extra="forbid")

    key: str
    label: str
    score: float


class EvaluationScore(BaseModel):
    model_config = ConfigDict(extra="forbid")

    overall: float
    dimensions: list[EvaluationDimension]


class PatchOperation(BaseModel):
    model_config = ConfigDict(extra="forbid")

    op: Literal["insert", "replace", "delete"]
    oldText: str
    newText: str
    instruction: str
    occurrence: Optional[int] = 1


class EvaluationResponseMetadata(BaseModel):
    model_config = ConfigDict(extra="forbid")

    model: Optional[str] = None
    timestamp: Optional[float] = None
    duration: Optional[float] = None
    compareMode: Optional[Literal["generic", "structured"]] = None
    snapshotRoles: Optional[dict[str, str]] = None
    # Nested compare artefacts kept loosely typed to avoid full graph drift
    compareStopSignals: Optional[dict[str, Any]] = None
    compareJudgements: Optional[list[dict[str, Any]]] = None
    compareInsights: Optional[dict[str, Any]] = None


class EvaluationResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")

    type: Literal["result", "compare", "prompt-only", "prompt-iterate"]
    score: EvaluationScore
    improvements: list[str]
    summary: str
    patchPlan: list[PatchOperation]
    metadata: Optional[EvaluationResponseMetadata] = None
