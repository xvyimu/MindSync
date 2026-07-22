"""Smoke tests for evaluation stub + bearer gate (no network LLM)."""

from __future__ import annotations

import os

import pytest
from fastapi.testclient import TestClient

# Ensure import path
from ai_core.main import app


@pytest.fixture()
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.delenv("AI_CORE_LOCAL_DEV", raising=False)
    monkeypatch.delenv("AI_CORE_BEARER", raising=False)
    return TestClient(app)


PROMPT_ONLY = {
    "type": "prompt-only",
    "evaluationModelKey": "openai:gpt-4o-mini",
    "mode": {"functionMode": "basic", "subMode": "system"},
    "target": {"workspacePrompt": "You are a helpful assistant."},
}


def test_health(client: TestClient) -> None:
    r = client.get("/health")
    assert r.status_code == 200
    body = r.json()
    assert body["status"] == "ok"
    assert body["service"]


def test_evaluation_requires_bearer_by_default(client: TestClient) -> None:
    r = client.post("/v1/evaluation/run", json=PROMPT_ONLY)
    assert r.status_code == 401


def test_evaluation_stub_with_bearer(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AI_CORE_BEARER", "test-token")
    r = client.post(
        "/v1/evaluation/run",
        json=PROMPT_ONLY,
        headers={"Authorization": "Bearer test-token"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["type"] == "prompt-only"
    assert body["score"]["overall"] == 0.0
    assert "Stub" in body["summary"]
    assert body["patchPlan"] == []


def test_evaluation_local_dev_skips_bearer(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AI_CORE_LOCAL_DEV", "1")
    r = client.post("/v1/evaluation/run", json=PROMPT_ONLY)
    assert r.status_code == 200
    assert r.json()["type"] == "prompt-only"


def test_evaluation_validation_error(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AI_CORE_LOCAL_DEV", "1")
    r = client.post("/v1/evaluation/run", json={"type": "prompt-only"})
    assert r.status_code == 422
