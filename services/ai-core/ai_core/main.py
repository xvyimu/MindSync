"""Optional local HTTP entry. Not wired to Electron/UI by default."""

from __future__ import annotations

from fastapi import FastAPI

from ai_core import __version__
from ai_core.health import health_payload

app = FastAPI(title="MindSync AI-Core", version=__version__, docs_url="/docs")


@app.get("/health")
def health() -> dict:
    return health_payload(__version__)
