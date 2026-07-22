from __future__ import annotations

from datetime import datetime, timezone


def health_payload(version: str = "0.1.0") -> dict:
    return {
        "status": "ok",
        "service": "mindsync-ai-core",
        "version": version,
        "ts": datetime.now(timezone.utc).isoformat(),
        "phase": "scaffold",
    }
