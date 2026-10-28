from unittest.mock import patch
from django.db import OperationalError
from django.test import TestCase, override_settings
from django.contrib.auth import get_user_model


class BackendFoundationTests(TestCase):
    def test_health_checks_database_without_exposing_settings(self):
        response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json(), {"status": "ok", "service": "vinyl-shelf", "database": "ok"})
        self.assertIn("no-store", response.headers["Cache-Control"])

    def test_health_is_read_only(self):
        self.assertEqual(self.client.post("/api/health/").status_code, 405)

    def test_database_failure_returns_generic_error(self):
        with patch("api.views.connection.cursor", side_effect=OperationalError("private database details")):
            response = self.client.get("/api/health/")
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response.json(), {"status": "unavailable"})

    @override_settings(DEBUG=False)
    def test_unknown_hosts_are_rejected(self):
        self.assertEqual(self.client.get("/api/health/", HTTP_HOST="untrusted.example").status_code, 400)

    def test_accounts_hash_passwords(self):
        user = get_user_model().objects.create_user(username="test-listener", password="local-test-password")
        self.assertNotEqual(user.password, "local-test-password")
        self.assertTrue(user.check_password("local-test-password"))

    def test_admin_requires_login(self):
        self.assertEqual(self.client.get("/admin/").status_code, 302)
