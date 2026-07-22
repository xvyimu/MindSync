"""Smoke tests for prompt optimize stub + bearer gate (no network LLM)."""

from __future__ import annotations

import pytest
from fastapi.testclient import TestClient

from ai_core.main import app


@pytest.fixture()
def client(monkeypatch: pytest.MonkeyPatch) -> TestClient:
    monkeypatch.delenv("AI_CORE_LOCAL_DEV", raising=False)
    monkeypatch.delenv("AI_CORE_BEARER", raising=False)
    return TestClient(app)


OPTIMIZE_BODY = {
    "optimizationMode": "system",
    "targetPrompt": "You are a helpful assistant.",
    "modelKey": "openai:gpt-4o-mini",
}


def test_prompt_optimize_requires_bearer_by_default(client: TestClient) -> None:
    r = client.post("/v1/prompt/optimize", json=OPTIMIZE_BODY)
    assert r.status_code == 401


def test_prompt_optimize_stub_local_dev(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AI_CORE_LOCAL_DEV", "1")
    r = client.post("/v1/prompt/optimize", json=OPTIMIZE_BODY)
    assert r.status_code == 200
    body = r.json()
    assert "optimizedPrompt" in body
    assert "Stub" in body["summary"] or body["metadata"].get("stub") is True
    assert "You are a helpful assistant." in body["optimizedPrompt"]
    assert body["metadata"]["model"] == "openai:gpt-4o-mini"


def test_prompt_optimize_stub_with_bearer(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AI_CORE_BEARER", "test-token")
    r = client.post(
        "/v1/prompt/optimize",
        json=OPTIMIZE_BODY,
        headers={"Authorization": "Bearer test-token"},
    )
    assert r.status_code == 200
    body = r.json()
    assert body["metadata"]["stub"] is True


def test_prompt_optimize_validation_error(
    client: TestClient, monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("AI_CORE_LOCAL_DEV", "1")
    r = client.post(
        "/v1/prompt/optimize",
        json={"optimizationMode": "system"},
    )
    assert r.status_code == 422
