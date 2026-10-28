import os
import subprocess
import sys
from pathlib import Path
from tempfile import TemporaryDirectory
from unittest.mock import patch
from django.core.cache import cache
from django.http import HttpResponse
from django.test import SimpleTestCase, RequestFactory, override_settings
from accounts.middleware import AdminLoginThrottle


class ProductionConfigurationTests(SimpleTestCase):
    def test_production_settings_fail_closed_and_pass_deployment_checks(self):
        env = {**os.environ, "DJANGO_SETTINGS_MODULE": "config.settings.production",
            "DJANGO_SECRET_KEY": "test-only-secret-not-for-a-real-deployment-" * 2,
            "DJANGO_ALLOWED_HOSTS": "beta.example.com", "RENDER_EXTERNAL_HOSTNAME": "", "DJANGO_SECRET_KEY_EXTRA": "",
            "DATABASE_URL": "postgresql://unused:unused@localhost/unused", "REDIS_URL": "redis://localhost:6379"}
        backend = Path(__file__).resolve().parents[1]
        response = subprocess.run([sys.executable, "manage.py", "check", "--deploy", "--fail-level", "ERROR"],
            cwd=backend, env=env, capture_output=True, text=True)
        self.assertEqual(response.returncode, 0, response.stderr)
        # HSTS preload is intentionally off for this temporary shared-hostname beta.
        self.assertNotIn("ERRORS:", response.stderr)
        split_env = {**env, "DJANGO_SECRET_KEY": "aB3dE5gH7jK9mN2pQ4sT6vW8yZ1cF0iL",
                     "DJANGO_SECRET_KEY_EXTRA": "zX9vB7nM5kJ3hG1fD2sA4pO6iU8yT0rE"}
        response = subprocess.run([sys.executable, "manage.py", "check", "--deploy", "--fail-level", "ERROR"],
            cwd=backend, env=split_env, capture_output=True, text=True)
        self.assertEqual(response.returncode, 0, response.stderr)
        for changes in [{"DATABASE_URL": "sqlite:///local.db"}, {"REDIS_URL": ""},
                        {"DJANGO_SECRET_KEY": "short"}, {"DJANGO_ALLOWED_HOSTS": "*"}]:
            response = subprocess.run([sys.executable, "-c", "import config.settings.production"],
                cwd=backend, env={**env, **changes}, capture_output=True, text=True)
            self.assertNotEqual(response.returncode, 0)

    def test_admin_login_is_limited_and_forwarded_addresses_cannot_bypass_it(self):
        cache.clear()
        middleware = AdminLoginThrottle(lambda request: HttpResponse("ok"))
        for number in range(20):
            request = RequestFactory().post("/admin/login/", HTTP_X_FORWARDED_FOR=f"192.0.2.{number}")
            self.assertEqual(middleware(request).status_code, 200)
        self.assertEqual(middleware(request).status_code, 429)
        self.assertEqual(middleware(RequestFactory().get("/admin/login/")).status_code, 200)

    def test_production_static_serving_and_https_redirect(self):
        from django.test import Client
        middleware = ["django.middleware.security.SecurityMiddleware", "whitenoise.middleware.WhiteNoiseMiddleware",
            "django.middleware.common.CommonMiddleware"]
        with TemporaryDirectory() as folder:
            Path(folder, "index.html").write_text("<h1>Vinyl Shelf</h1>")
            with override_settings(DEBUG=False, ALLOWED_HOSTS=["beta.example.com"], MIDDLEWARE=middleware,
                SECURE_SSL_REDIRECT=True, SECURE_PROXY_SSL_HEADER=("HTTP_X_FORWARDED_PROTO", "https"),
                WHITENOISE_ROOT=folder, WHITENOISE_INDEX_FILE=True, WHITENOISE_AUTOREFRESH=False,
                WHITENOISE_USE_FINDERS=False):
                client = Client()
                self.assertEqual(client.get("/", HTTP_HOST="beta.example.com").status_code, 301)
                response = client.get("/", HTTP_HOST="beta.example.com", HTTP_X_FORWARDED_PROTO="https")
                self.assertEqual(response.status_code, 200)
                self.assertEqual(b"".join(response.streaming_content), b"<h1>Vinyl Shelf</h1>")
                self.assertEqual(client.get("/.env", HTTP_HOST="beta.example.com", HTTP_X_FORWARDED_PROTO="https").status_code, 404)
