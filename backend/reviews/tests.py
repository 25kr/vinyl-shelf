import json
from django.contrib.auth import get_user_model
from django.test import TestCase, Client
from .models import Review


class ReviewOwnershipTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        User = get_user_model()
        cls.alice = User.objects.create_user(username="alice", password="not-used-in-this-test")
        cls.bob = User.objects.create_user(username="bob", password="not-used-in-this-test")
        cls.admin = User.objects.create_superuser(username="moderator", password="not-used-in-this-test")

    def setUp(self):
        self.client = Client(enforce_csrf_checks=True)
        self.client.force_login(self.alice)
        self.payload = {"albumId": "2hollis-star", "target": "album", "date": "2020-01-01",
                        "rating": 5, "note": "My review", "repeat": False, "clientId": "test-import-key"}

    def write(self, method, path, data=None, token=True, **headers):
        if token:
            headers["HTTP_X_CSRFTOKEN"] = self.client.get("/api/auth/session/").json()["csrfToken"]
        return getattr(self.client, method)(path, json.dumps(data or {}), content_type="application/json", **headers)

    def create(self):
        response = self.write("post", "/api/reviews/", self.payload)
        self.assertEqual(response.status_code, 201)
        return response.json()

    def test_create_sets_author_from_session_and_returns_only_public_profile(self):
        data = self.create()
        self.assertEqual(data["author"], {"id": self.alice.pk, "username": "alice"})
        self.assertEqual(Review.objects.get(pk=data["id"]).owner, self.alice)
        forged = self.write("post", "/api/reviews/", {**self.payload, "owner": self.bob.pk})
        self.assertEqual(forged.status_code, 400)
        self.assertEqual(Review.objects.count(), 1)

    def test_owner_can_edit_and_delete_but_cannot_change_identity(self):
        data = self.create()
        path = f'/api/reviews/{data["id"]}/'
        response = self.write("patch", path, {**self.payload, "rating": 3, "clientId": "forged-change"})
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["rating"], 3)
        self.assertEqual(response.json()["clientId"], self.payload["clientId"])
        self.assertEqual(response.json()["createdAt"], data["createdAt"])
        self.assertEqual(self.write("delete", path).status_code, 200)
        self.assertEqual(Review.objects.count(), 0)

    def test_other_user_and_admin_cannot_bypass_owner_api_checks(self):
        data = self.create()
        for user in [self.bob, self.admin]:
            self.client.force_login(user)
            path = f'/api/reviews/{data["id"]}/'
            self.assertEqual(self.write("patch", path, self.payload).status_code, 404)
            self.assertEqual(self.write("delete", path).status_code, 404)
        self.assertEqual(Review.objects.count(), 1)
        self.assertEqual(Review.objects.get().rating, 5)

    def test_feed_is_private_but_shared_between_logged_in_members(self):
        data = self.create()
        self.client.force_login(self.bob)
        response = self.client.get("/api/reviews/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["results"][0]["id"], data["id"])
        self.assertIn("no-store", response["Cache-Control"])
        self.client.logout()
        self.assertEqual(self.client.get("/api/reviews/").status_code, 401)
        self.assertEqual(self.write("post", "/api/reviews/", self.payload).status_code, 401)
        self.assertEqual(self.write("delete", f'/api/reviews/{data["id"]}/').status_code, 401)

    def test_import_retry_is_idempotent_and_different_owners_are_separate(self):
        first = self.create()
        response = self.write("post", "/api/reviews/", self.payload)
        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.json()["id"], first["id"])
        self.assertEqual(self.write("post", "/api/reviews/", {**self.payload, "note": "changed"}).status_code, 409)
        self.client.force_login(self.bob)
        second = self.create()
        self.assertNotEqual(first["id"], second["id"])
        self.assertEqual(Review.objects.count(), 2)

    def test_validation_rejects_bad_dates_ratings_album_tracks_and_overlong_text(self):
        for update in [{"rating": 0}, {"rating": True}, {"date": "2099-01-01"},
                       {"albumId": "unknown-album"}, {"target": "2-1"}, {"note": "x" * 501},
                       {"repeat": "false"}]:
            self.assertEqual(self.write("post", "/api/reviews/", {**self.payload, **update}).status_code, 400)
        self.assertEqual(Review.objects.count(), 0)

    def test_writes_require_csrf_and_allowed_origin(self):
        self.assertEqual(self.write("post", "/api/reviews/", self.payload, token=False).status_code, 403)
        self.assertEqual(self.write("post", "/api/reviews/", self.payload, HTTP_ORIGIN="https://evil.example").status_code, 403)
        self.assertEqual(Review.objects.count(), 0)

    def test_feed_has_bounded_pagination(self):
        for number in range(23):
            Review.objects.create(owner=self.alice, album_id="2hollis-star", target="album",
                                  listened_on="2020-01-01", rating=4, note="test", client_id=str(number))
        first = self.client.get("/api/reviews/").json()
        second = self.client.get("/api/reviews/?page=2").json()
        self.assertEqual(len(first["results"]), 20)
        self.assertEqual(first["nextPage"], 2)
        self.assertEqual(len(second["results"]), 3)
        self.assertIsNone(second["nextPage"])
        self.assertEqual(self.client.get("/api/reviews/?page=-1").status_code, 400)

    def test_listening_date_is_optional_and_can_be_cleared(self):
        for index, value in enumerate(["", None]):
            response = self.write("post", "/api/reviews/", {**self.payload, "date": value, "clientId": f"undated-{index}"})
            self.assertEqual(response.status_code, 201)
            self.assertIsNone(response.json()["date"])
        payload = dict(self.payload)
        payload.pop("date")
        response = self.write("post", "/api/reviews/", payload)
        self.assertEqual(response.status_code, 201)
        path = f'/api/reviews/{response.json()["id"]}/'
        dated = self.write("patch", path, self.payload)
        self.assertEqual(dated.json()["date"], "2020-01-01")
        cleared = self.write("patch", path, {**self.payload, "date": ""})
        self.assertEqual(cleared.status_code, 200)
        self.assertIsNone(cleared.json()["date"])
        self.assertEqual(self.client.get("/api/reviews/").json()["count"], 3)
