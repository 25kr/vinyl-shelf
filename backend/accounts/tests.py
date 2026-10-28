import json
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.test import Client, TestCase


class SessionAuthenticationTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.user = get_user_model().objects.create_user(username="listener", password="test-password-for-auth")
        get_user_model().objects.create_user(username="inactive", password="test-password-for-auth", is_active=False)

    def setUp(self):
        cache.clear()
        self.client = Client(enforce_csrf_checks=True)

    def csrf(self):
        return self.client.get("/api/auth/session/").json()["csrfToken"]

    def post(self, path, data, token=None, **headers):
        return self.client.post(path, json.dumps(data), content_type="application/json",
                                HTTP_X_CSRFTOKEN=token or self.csrf(), **headers)

    def test_anonymous_session_is_uncached_and_does_not_create_a_login(self):
        response = self.client.get("/api/auth/session/")
        self.assertIsNone(response.json()["user"])
        self.assertTrue(response.json()["csrfToken"])
        self.assertNotIn("sessionid", response.cookies)
        self.assertIn("no-store", response["Cache-Control"])

    def test_login_persists_and_logout_invalidates_old_cookie(self):
        token = self.csrf()
        response = self.post("/api/auth/login/", {"username": "listener", "password": "test-password-for-auth"}, token)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["user"], {"id": self.user.pk, "username": "listener", "isStaff": False})
        self.assertNotIn("password", response.content.decode())
        self.assertNotIn("email", response.json()["user"])
        self.assertTrue(response.cookies["sessionid"]["httponly"])
        self.assertNotEqual(response.json()["csrfToken"], token)
        old_cookie = self.client.cookies["sessionid"].value
        self.assertEqual(self.client.get("/api/auth/session/").json()["user"]["username"], "listener")
        response = self.post("/api/auth/logout/", {}, response.json()["csrfToken"])
        self.assertIsNone(response.json()["user"])
        stale = Client()
        stale.cookies["sessionid"] = old_cookie
        self.assertIsNone(stale.get("/api/auth/session/").json()["user"])

    def test_credentials_failure_is_generic(self):
        for username in ["listener", "missing", "inactive"]:
            response = self.post("/api/auth/login/", {"username": username, "password": "wrong"})
            self.assertEqual(response.status_code, 401)
            self.assertEqual(response.json(), {"error": "Username or password is incorrect."})
        response = self.post("/api/auth/login/", {"username": "inactive", "password": "test-password-for-auth"})
        self.assertEqual(response.status_code, 401)

    def test_login_and_logout_require_csrf_and_correct_origin(self):
        self.csrf()
        for path in ["/api/auth/login/", "/api/auth/logout/"]:
            self.assertEqual(self.client.post(path, "{}", content_type="application/json").status_code, 403)
            response = self.post(path, {}, HTTP_ORIGIN="https://untrusted.example")
            self.assertEqual(response.status_code, 403)
            self.assertNotIn("untrusted", response.json()["error"])
            self.assertEqual(self.client.get(path).status_code, 405)

    def test_malformed_payloads_do_not_crash_or_authenticate(self):
        for value in [[], None, {}, {"username": ["listener"], "password": "x"}]:
            self.assertEqual(self.post("/api/auth/login/", value).status_code, 400)
        response = self.client.post("/api/auth/login/", "{", content_type="application/json", HTTP_X_CSRFTOKEN=self.csrf())
        self.assertEqual(response.status_code, 400)
        self.assertIsNone(self.client.get("/api/auth/session/").json()["user"])

    def test_repeated_attempts_are_limited(self):
        from unittest.mock import patch
        with patch("accounts.views.AuthenticationForm") as form:
            form.return_value.is_valid.return_value = False
            for _ in range(20):
                self.assertEqual(self.post("/api/auth/login/", {"username": "listener", "password": "wrong"}).status_code, 401)
            response = self.post("/api/auth/login/", {"username": "listener", "password": "wrong"})
            self.assertEqual(response.status_code, 429)
            self.assertEqual(response["Retry-After"], "300")

    def test_public_registration_is_not_available(self):
        self.assertEqual(self.client.get("/api/auth/signup/").status_code, 404)
