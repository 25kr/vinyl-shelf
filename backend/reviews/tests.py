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
        self.assertEqual(data["author"], {"id": self.alice.pk, "username": "alice", "avatarUrl": None})
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


class SocialReviewTests(TestCase):
    @classmethod
    def setUpTestData(cls):
        from django.contrib.auth import get_user_model
        from .models import Review
        cls.owner = get_user_model().objects.create_user(username="post-owner")
        cls.reader = get_user_model().objects.create_user(username="post-reader")
        cls.review = Review.objects.create(owner=cls.owner, album_id="2hollis-star", rating=5, client_id="social-post")

    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.client.force_login(self.reader)
        self.root = f"/api/reviews/{self.review.pk}/"

    def send(self, path, data):
        import json
        return self.client.post(self.root + path, json.dumps(data), content_type="application/json")

    def test_reaction_switch_clear_and_retry(self):
        from .models import Reaction
        for _ in range(2):
            self.assertEqual(self.send("reactions/", {"value": 1}).json()["likes"], 1)
        result = self.send("reactions/", {"value": -1}).json()
        self.assertEqual((result["likes"], result["dislikes"], result["myReaction"]), (0, 1, -1))
        self.assertEqual(Reaction.objects.count(), 1)
        self.assertEqual(self.send("reactions/", {"value": 0}).json()["dislikes"], 0)
        for value in [True, 2, "1", None]:
            self.assertEqual(self.send("reactions/", {"value": value}).status_code, 400)

    def test_comment_retry_ownership_and_plain_text(self):
        import uuid
        from .models import Comment
        data = {"text": "<script>this stays text</script>", "clientId": str(uuid.uuid4())}
        response = self.send("comments/", data)
        self.assertEqual(response.status_code, 201)
        comment = response.json()["comment"]
        self.assertEqual(comment["author"]["id"], self.reader.pk)
        self.assertTrue(comment["canDelete"])
        self.assertEqual(self.send("comments/", data).status_code, 200)
        self.assertEqual(Comment.objects.count(), 1)
        self.assertEqual(self.send("comments/", {**data, "text": "different"}).status_code, 409)
        self.client.force_login(self.owner)
        listed = self.client.get(self.root + "comments/").json()["results"][0]
        self.assertFalse(listed["canDelete"])
        self.assertEqual(self.client.delete(self.root + f"comments/{comment['id']}/").status_code, 404)
        self.client.force_login(self.reader)
        self.assertEqual(self.client.delete(self.root + f"comments/{comment['id']}/").status_code, 200)
        self.assertEqual(Comment.objects.filter(is_deleted=False).count(), 0)

    def test_authentication_csrf_and_input_limits(self):
        import uuid
        from django.test import Client
        self.client.logout()
        for path in ["comments/", "reactions/"]:
            self.assertEqual(self.client.get(self.root + path).status_code, 401)
            self.assertEqual(self.send(path, {}).status_code, 401)
        client = Client(enforce_csrf_checks=True)
        client.force_login(self.reader)
        for path in ["comments/", "reactions/"]:
            self.assertEqual(client.post(self.root + path, "{}", content_type="application/json").status_code, 403)
        self.client.force_login(self.reader)
        for text in ["", "   ", "x" * 1001]:
            self.assertEqual(self.send("comments/", {"text": text, "clientId": str(uuid.uuid4())}).status_code, 400)
        self.assertEqual(self.send("comments/", {"text": "valid", "clientId": "bad"}).status_code, 400)
        self.assertEqual(self.send("comments/", {"text": "valid", "clientId": str(uuid.uuid4()), "owner": self.owner.pk}).status_code, 400)

    def test_comment_pagination_and_rate_limit(self):
        import uuid
        from .models import Comment
        for _ in range(21):
            Comment.objects.create(review=self.review, owner=self.reader, text="A thought", client_id=uuid.uuid4())
        response = self.client.get(self.root + "comments/").json()
        self.assertEqual((response["count"], len(response["results"]), response["nextPage"]), (21, 20, 2))
        self.assertEqual(len(self.client.get(self.root + "comments/?page=2").json()["results"]), 1)
        from django.core.cache import cache
        cache.set(f"social:comment:{self.reader.pk}", 30, 300)
        self.assertEqual(self.send("comments/", {"text": "limited", "clientId": str(uuid.uuid4())}).status_code, 429)
        self.review.delete()
        self.assertEqual(Comment.objects.count(), 0)


class CommentReplyTests(SocialReviewTests):
    def test_reply_is_in_its_thread_and_retry_safe(self):
        import uuid
        from .models import Comment
        parent = Comment.objects.create(review=self.review, owner=self.owner, text="Original", client_id=uuid.uuid4())
        data = {"text": "A reply", "clientId": str(uuid.uuid4()), "parentId": parent.pk}
        first = self.send("comments/", data)
        self.assertEqual(first.status_code, 201)
        self.assertEqual(first.json()["comment"]["parentId"], parent.pk)
        self.assertEqual(self.send("comments/", data).status_code, 200)
        roots = self.client.get(self.root + "comments/").json()
        self.assertEqual(len(roots["results"]), 1)
        self.assertEqual(roots["results"][0]["replyCount"], 1)
        replies = self.client.get(self.root + f"comments/?parent={parent.pk}").json()
        self.assertEqual(replies["results"][0]["text"], "A reply")
        self.assertEqual(Comment.objects.count(), 2)

    def test_wrong_review_nested_or_deleted_target_rejected(self):
        import uuid
        from .models import Comment, Review
        other = Review.objects.create(owner=self.owner, album_id="another", rating=4, client_id="other")
        wrong = Comment.objects.create(review=other, owner=self.owner, text="Other", client_id=uuid.uuid4())
        root = Comment.objects.create(review=self.review, owner=self.owner, text="Root", client_id=uuid.uuid4())
        reply = Comment.objects.create(review=self.review, owner=self.owner, parent=root, text="Nested", client_id=uuid.uuid4())
        deleted = Comment.objects.create(review=self.review, owner=self.owner, text="", is_deleted=True, client_id=uuid.uuid4())
        for target in [wrong.pk, reply.pk, deleted.pk, 999999]:
            self.assertEqual(self.send("comments/", {"text": "Reply", "clientId": str(uuid.uuid4()), "parentId": target}).status_code, 404)
        self.assertEqual(self.send("comments/", {"text": "Reply", "clientId": str(uuid.uuid4()), "parentId": True}).status_code, 400)

    def test_deleting_parent_preserves_other_users_replies(self):
        import uuid
        from .models import Comment
        parent = Comment.objects.create(review=self.review, owner=self.owner, text="Original", client_id=uuid.uuid4())
        reply = Comment.objects.create(review=self.review, owner=self.reader, parent=parent, text="Kept reply", client_id=uuid.uuid4())
        self.client.force_login(self.owner)
        self.assertEqual(self.client.delete(self.root + f"comments/{parent.pk}/").status_code, 200)
        self.assertTrue(Comment.objects.filter(pk=reply.pk, is_deleted=False).exists())
        roots = self.client.get(self.root + "comments/").json()["results"]
        self.assertEqual(roots[0]["text"], "Comment deleted.")
        self.assertTrue(roots[0]["deleted"])
        self.assertFalse(roots[0]["canDelete"])
        self.assertEqual(self.client.delete(self.root + f"comments/{reply.pk}/").status_code, 404)

    def test_reply_pages_remain_ordered(self):
        import uuid
        from .models import Comment
        parent = Comment.objects.create(review=self.review, owner=self.owner, text="Root", client_id=uuid.uuid4())
        for number in range(21):
            Comment.objects.create(review=self.review, owner=self.reader, parent=parent, text=str(number), client_id=uuid.uuid4())
        page = self.client.get(self.root + f"comments/?parent={parent.pk}").json()
        self.assertEqual((page["count"], page["nextPage"]), (21, 2))
        self.assertEqual(page["results"][0]["text"], "0")
        self.assertEqual(self.client.get(self.root + f"comments/?parent={parent.pk}&page=2").json()["results"][0]["text"], "20")
