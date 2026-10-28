"""Single-origin Render deployment. Missing infrastructure fails closed."""
import os
import dj_database_url
from django.core.exceptions import ImproperlyConfigured
from .base import *

if len(SECRET_KEY) < 50:
    raise ImproperlyConfigured("Production requires a secret key of at least 50 characters.")
_hostname = os.environ.get("RENDER_EXTERNAL_HOSTNAME", "").strip()
if _hostname:
    ALLOWED_HOSTS = list(dict.fromkeys([*ALLOWED_HOSTS, _hostname]))
if not ALLOWED_HOSTS or any(host.startswith(("*", ".")) for host in ALLOWED_HOSTS):
    raise ImproperlyConfigured("Set explicit production hostnames; wildcards are not allowed.")
_database = os.environ.get("DATABASE_URL", "")
if not _database.startswith(("postgres://", "postgresql://")):
    raise ImproperlyConfigured("Production requires a PostgreSQL DATABASE_URL.")
DATABASES = {"default": dj_database_url.parse(_database, conn_max_age=60, conn_health_checks=True, ssl_require=True)}
_cache = os.environ.get("REDIS_URL", "")
if not _cache.startswith(("redis://", "rediss://")):
    raise ImproperlyConfigured("Set REDIS_URL for shared authentication rate limits.")
CACHES = {"default": {"BACKEND": "django.core.cache.backends.redis.RedisCache", "LOCATION": _cache,
    "OPTIONS": {"socket_connect_timeout": 3, "socket_timeout": 3}}}

# Render terminates HTTPS and forwards this header. Deploy only behind that proxy.
SECURE_PROXY_SSL_HEADER = ("HTTP_X_FORWARDED_PROTO", "https")
SECURE_HSTS_SECONDS = 3600
SECURE_HSTS_INCLUDE_SUBDOMAINS = True
SECURE_HSTS_PRELOAD = False
SECURE_REFERRER_POLICY = "same-origin"
SESSION_COOKIE_NAME = "__Host-vinyl-session"
CSRF_COOKIE_NAME = "__Host-vinyl-csrf"
SESSION_COOKIE_SAMESITE = "Lax"
CSRF_COOKIE_SAMESITE = "Lax"
SESSION_COOKIE_AGE = 60 * 60 * 24 * 7
DATA_UPLOAD_MAX_MEMORY_SIZE = 16384
MIDDLEWARE = [MIDDLEWARE[0], "whitenoise.middleware.WhiteNoiseMiddleware", *MIDDLEWARE[1:],
    "accounts.middleware.AdminLoginThrottle"]
STATIC_URL = "/static/"
STORAGES = {"default": {"BACKEND": "django.core.files.storage.FileSystemStorage"},
    "staticfiles": {"BACKEND": "whitenoise.storage.CompressedManifestStaticFilesStorage"}}
WHITENOISE_ROOT = BASE_DIR.parent / "dist"
WHITENOISE_INDEX_FILE = True
WHITENOISE_MAX_AGE = 60
