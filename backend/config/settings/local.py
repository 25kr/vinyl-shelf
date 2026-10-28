"""Local laptop settings only. Never use this module for a public deployment."""
import os
import secrets
from pathlib import Path

# Keep a stable, private local key out of Git. No passwords or keys in source.
_key_file = Path(__file__).resolve().parents[2] / ".dev-secret-key"
if not os.environ.get("DJANGO_SECRET_KEY"):
    if not _key_file.exists():
        _key_file.write_text(secrets.token_urlsafe(64), encoding="utf-8")
    os.environ["DJANGO_SECRET_KEY"] = _key_file.read_text(encoding="utf-8").strip()

from .base import *  # noqa: F403,E402

DEBUG = True
ALLOWED_HOSTS = ["localhost", "127.0.0.1", "[::1]"]
SESSION_COOKIE_SECURE = False
CSRF_COOKIE_SECURE = False
SECURE_SSL_REDIRECT = False
