"""
FloodGuard ASGI Application Entry Point
Re-exports the FastAPI app from backend.app.main for hosting environments
(such as Render) that default to `uvicorn main:app`.
"""
import sys
from pathlib import Path

ROOT_DIR = Path(__file__).resolve().parent
if str(ROOT_DIR) not in sys.path:
    sys.path.insert(0, str(ROOT_DIR))

from backend.app.main import app

__all__ = ["app"]
