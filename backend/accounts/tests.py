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


class MemberProfileTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.owner = get_user_model().objects.create_user(username="profile-owner", email="private@example.test")
        cls.other = get_user_model().objects.create_user(username="profile-other")

    def setUp(self):
        cache.clear()
        self.client.force_login(self.owner)

    def picture(self, kind="PNG", size=(320, 280)):
        from io import BytesIO
        from PIL import Image
        from django.core.files.uploadedfile import SimpleUploadedFile
        data = BytesIO()
        Image.new("RGB", size, "red").save(data, format=kind)
        return SimpleUploadedFile("picture.png", data.getvalue(), content_type="image/png")

    def test_member_only_and_private_fields(self):
        url = f"/api/auth/profiles/{self.owner.pk}/"
        response = self.client.get(url)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(set(response.json()["profile"]), {"id", "username", "bio", "avatarUrl"})
        self.assertNotIn("private@example.test", response.content.decode())
        self.assertIn("no-store", response["Cache-Control"])
        self.client.logout()
        self.assertEqual(self.client.get(url).status_code, 401)
        self.assertEqual(self.client.post("/api/auth/profile/", {"bio": "hello"}).status_code, 401)
        self.assertEqual(self.client.get(f"/api/auth/profiles/{self.owner.pk}/avatar/").status_code, 401)

    def test_own_bio_photo_and_removal(self):
        from io import BytesIO
        from PIL import Image
        response = self.client.post("/api/auth/profile/", {"bio": "My music", "avatar": self.picture()})
        self.assertEqual(response.status_code, 200)
        profile = response.json()["profile"]
        self.assertIn("?v=", profile["avatarUrl"])
        self.owner.refresh_from_db()
        self.other.refresh_from_db()
        self.assertEqual(self.owner.bio, "My music")
        self.assertEqual(self.other.bio, "")
        with Image.open(BytesIO(bytes(self.owner.avatar_data))) as picture:
            self.assertEqual(picture.size, (256, 256))
            self.assertEqual(picture.format, "JPEG")
            self.assertFalse(picture.getexif())
        self.assertEqual(self.client.get(profile["avatarUrl"]).get("Content-Type"), "image/jpeg")
        self.assertEqual(self.client.post("/api/auth/profile/", {"removeAvatar": "true"}).status_code, 200)
        self.owner.refresh_from_db()
        self.assertFalse(self.owner.avatar_data)
        self.assertEqual(self.client.get(profile["avatarUrl"]).status_code, 404)

    def test_invalid_images_and_fields_leave_account_unchanged(self):
        from django.core.files.uploadedfile import SimpleUploadedFile
        bad = SimpleUploadedFile("fake.jpg", b"<svg>not a photograph</svg>", content_type="image/jpeg")
        for payload in [{"avatar": bad}, {"username": "hijacked"}, {"is_staff": "true"},
                        {"bio": "x" * 241}, {"avatar": self.picture(size=(4000, 3100))}]:
            self.assertEqual(self.client.post("/api/auth/profile/", payload).status_code, 400)
        large = SimpleUploadedFile("huge.jpg", b"x" * (2 * 1024 * 1024 + 1))
        self.assertEqual(self.client.post("/api/auth/profile/", {"avatar": large}).status_code, 413)
        self.owner.refresh_from_db()
        self.assertFalse(self.owner.avatar_data)
        self.assertFalse(self.owner.is_staff)
        self.assertEqual(self.owner.username, "profile-owner")

    def test_csrf_required(self):
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.owner)
        self.assertEqual(client.post("/api/auth/profile/", {"bio": "forged"}).status_code, 403)

    def test_profile_pagination_only_contains_requested_authors_reviews(self):
        from reviews.models import Review
        for i in range(21):
            Review.objects.create(owner=self.owner, album_id="star", rating=5, client_id=str(i))
        Review.objects.create(owner=self.other, album_id="star", rating=1, client_id="other")
        first = self.client.get(f"/api/auth/profiles/{self.owner.pk}/").json()
        self.assertEqual(first["count"], 21)
        self.assertEqual(len(first["results"]), 20)
        self.assertEqual(first["nextPage"], 2)
        second = self.client.get(f"/api/auth/profiles/{self.owner.pk}/?page=2").json()
        self.assertEqual(len(second["results"]), 1)
        self.assertTrue(all(item["author"]["id"] == self.owner.pk for item in first["results"]))
        self.assertEqual(self.client.get(f"/api/auth/profiles/{self.owner.pk}/?page=0").status_code, 400)
        self.assertEqual(self.client.get("/api/auth/profiles/999999/").status_code, 404)

    def test_database_rejects_case_duplicate_username(self):
        from django.db import IntegrityError, transaction
        with self.assertRaises(IntegrityError), transaction.atomic():
            get_user_model().objects.create_user(username="PROFILE-OWNER")


class FollowingTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        cls.a = get_user_model().objects.create_user(username="follow-a")
        cls.b = get_user_model().objects.create_user(username="follow-b")
        cls.c = get_user_model().objects.create_user(username="follow-c")
        cls.inactive = get_user_model().objects.create_user(username="follow-inactive", is_active=False)

    def setUp(self):
        self.client.force_login(self.a)

    def follow(self, user, value=True, **extra):
        return self.client.post(f"/api/auth/profiles/{user.pk}/follow/", json.dumps({"following": value, **extra}), content_type="application/json")

    def test_follow_is_idempotent_and_survives_new_session(self):
        from .models import Follow
        for _ in range(2):
            response = self.follow(self.b)
            self.assertEqual(response.status_code, 200)
            self.assertEqual(response.json()["connections"], {"followers": 1, "following": 0, "isFollowing": True})
        self.assertEqual(Follow.objects.count(), 1)
        self.client.logout()
        self.client.force_login(self.a)
        self.assertTrue(self.client.get(f"/api/auth/profiles/{self.b.pk}/").json()["connections"]["isFollowing"])
        self.assertEqual(self.client.get(f"/api/auth/profiles/{self.a.pk}/").json()["connections"]["following"], 1)
        self.client.force_login(self.c)
        self.follow(self.b)
        self.client.force_login(self.a)
        for _ in range(2):
            self.assertFalse(self.follow(self.b, False).json()["connections"]["isFollowing"])
        self.assertTrue(Follow.objects.filter(follower=self.c, following=self.b).exists())

    def test_authentication_and_csrf_required(self):
        self.client.logout()
        self.assertEqual(self.follow(self.b).status_code, 401)
        self.assertEqual(self.client.get(f"/api/auth/profiles/{self.b.pk}/followers/").status_code, 401)
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.a)
        self.assertEqual(client.post(f"/api/auth/profiles/{self.b.pk}/follow/", "{\"following\":true}", content_type="application/json").status_code, 403)

    def test_no_self_inactive_or_forged_follower(self):
        from .models import Follow
        self.assertEqual(self.follow(self.a).status_code, 400)
        self.assertEqual(self.follow(self.inactive).status_code, 404)
        self.assertEqual(self.follow(self.b, follower=self.c.pk).status_code, 400)
        self.assertEqual(self.follow(self.b, "true").status_code, 400)
        self.assertEqual(Follow.objects.count(), 0)
        self.assertEqual(self.client.get(f"/api/auth/profiles/{self.b.pk}/follow/").status_code, 405)

    def test_database_rejects_duplicates_and_self_follow(self):
        from .models import Follow
        from django.db import transaction, IntegrityError
        Follow.objects.create(follower=self.a, following=self.b)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Follow.objects.create(follower=self.a, following=self.b)
        with self.assertRaises(IntegrityError), transaction.atomic():
            Follow.objects.create(follower=self.a, following=self.a)

    def test_lists_are_paginated_private_and_correct(self):
        from .models import Follow
        for number in range(21):
            person = get_user_model().objects.create_user(username=f"fan-{number}", email="not-public@example.test")
            Follow.objects.create(follower=person, following=self.b)
        Follow.objects.create(follower=self.inactive, following=self.b)
        first = self.client.get(f"/api/auth/profiles/{self.b.pk}/followers/")
        self.assertEqual(first.json()["count"], 21)
        self.assertEqual(len(first.json()["results"]), 20)
        self.assertEqual(first.json()["nextPage"], 2)
        self.assertNotIn("not-public@example.test", first.content.decode())
        self.assertIn("no-store", first["Cache-Control"])
        self.assertEqual(len(self.client.get(f"/api/auth/profiles/{self.b.pk}/followers/?page=2").json()["results"]), 1)
        self.follow(self.b)
        self.assertEqual(self.client.get(f"/api/auth/profiles/{self.a.pk}/following/").json()["results"][0]["id"], self.b.pk)
        self.assertEqual(self.client.get(f"/api/auth/profiles/{self.b.pk}/followers/?page=0").status_code, 400)
        self.assertEqual(self.client.get(f"/api/auth/profiles/{self.b.pk}/unknown/").status_code, 404)
