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

    def test_signup_requires_post(self):
        self.assertEqual(self.client.get("/api/auth/signup/").status_code, 405)

from datetime import timedelta
import hashlib
from django.utils import timezone
from .models import Invitation


class InviteSignupTests(TestCase):
    def setUp(self):
        cache.clear()
        self.client = Client(enforce_csrf_checks=True)
        self.user = get_user_model().objects.create_user(username="listener", password="unused")
        self.code = "private-test-invite-with-enough-entropy"
        self.invite = Invitation.objects.create(code_hash=hashlib.sha256(self.code.encode()).hexdigest(),
            expires_at=timezone.now() + timedelta(days=7))
        self.details = {"username": "new-listener", "email": "listener@example.com",
            "password1": "Cobalt-orbit-records-741!", "password2": "Cobalt-orbit-records-741!", "inviteCode": self.code}

    csrf = SessionAuthenticationTests.csrf
    post = SessionAuthenticationTests.post

    def signup(self, **changes):
        return self.post("/api/auth/signup/", {**self.details, **changes})

    def test_signup_hashes_password_logs_in_and_never_grants_admin(self):
        response = self.signup()
        self.assertEqual(response.status_code, 201)
        user = get_user_model().objects.get(username="new-listener")
        self.assertTrue(user.check_password(self.details["password1"]))
        self.assertNotEqual(user.password, self.details["password1"])
        self.assertFalse(user.is_staff)
        self.assertFalse(user.is_superuser)
        self.assertEqual(user.email, self.details["email"])
        self.assertEqual(response.json()["user"]["id"], user.pk)
        self.assertNotIn("email", response.json()["user"])
        self.invite.refresh_from_db()
        self.assertEqual(self.invite.used_by, user)
        self.assertIsNotNone(self.invite.used_at)
        self.assertNotIn(self.code, self.invite.code_hash)
        self.assertEqual(self.client.get("/admin/").status_code, 302)
        self.client.logout()
        self.assertEqual(self.signup(username="another").status_code, 400)

    def test_invalid_expired_and_revoked_invites_create_no_users(self):
        self.assertEqual(self.signup(inviteCode="wrong").status_code, 400)
        self.invite.expires_at = timezone.now() - timedelta(seconds=1)
        self.invite.save()
        self.assertEqual(self.signup().status_code, 400)
        self.invite.delete()
        self.assertEqual(self.signup().status_code, 400)
        self.assertFalse(get_user_model().objects.filter(username="new-listener").exists())

    def test_bad_fields_do_not_consume_invite(self):
        for change in [{"username": "LISTENER"}, {"email": "invalid"}, {"password2": "mismatch"},
                       {"password1": "12345678", "password2": "12345678"}, {"username": "bad space"}]:
            response = self.signup(**change)
            self.assertEqual(response.status_code, 400)
        self.invite.refresh_from_db()
        self.assertIsNone(self.invite.used_at)
        self.assertEqual(self.signup().status_code, 201)

    def test_signup_blocks_privilege_fields_and_malformed_values(self):
        for data in [{**self.details, "is_staff": True}, {**self.details, "is_superuser": True},
                     {**self.details, "username": []}, [], None]:
            self.assertEqual(self.post("/api/auth/signup/", data).status_code, 400)
        self.assertIsNone(Invitation.objects.get(pk=self.invite.pk).used_at)

    def test_signup_requires_csrf_origin_and_post(self):
        self.assertEqual(self.client.post("/api/auth/signup/", "{}", content_type="application/json").status_code, 403)
        self.assertEqual(self.post("/api/auth/signup/", self.details, HTTP_ORIGIN="https://evil.example").status_code, 403)
        self.assertEqual(self.client.get("/api/auth/signup/").status_code, 405)

    def test_signup_rate_limit_and_authenticated_account_guard(self):
        for _ in range(10):
            self.assertEqual(self.signup(inviteCode="wrong").status_code, 400)
        response = self.signup()
        self.assertEqual(response.status_code, 429)
        self.assertEqual(response["Retry-After"], "300")
        cache.clear()
        self.client.force_login(self.user)
        self.assertEqual(self.signup().status_code, 409)

    def test_username_constraint_is_case_insensitive(self):
        from django.db import IntegrityError, transaction
        with self.assertRaises(IntegrityError), transaction.atomic():
            get_user_model().objects.create_user(username="LISTENER", password="unused")
