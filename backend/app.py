"""ASGI entrypoint for local runners expecting backend/app.py."""
from app.main import app

__all__ = ["app"]
