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


class CatalogueSearchTests(TestCase):
    def setUp(self):
        from django.core.cache import cache
        cache.clear()
        self.user = get_user_model().objects.create_user(username="album-searcher")
        self.client.force_login(self.user)
        self.path = "/api/catalogue/search/"
        self.result = {"provider": "musicbrainz", "query": "2hollis star", "page": 1, "count": 1,
                       "nextPage": None, "results": [{"id": "11111111-1111-4111-8111-111111111111", "title": "star"}]}

    @patch("api.catalogue.musicbrainz.search")
    def test_requires_login_and_get(self, search):
        self.client.logout()
        self.assertEqual(self.client.get(self.path, {"q": "star"}).status_code, 401)
        self.assertEqual(self.client.post(self.path, {"q": "star"}).status_code, 405)
        search.assert_not_called()

    @patch("api.catalogue.musicbrainz.search")
    def test_validation_precedes_provider_call(self, search):
        for query in [{}, {"q": "a"}, {"q": "x" * 121}, {"q": "star", "page": "0"},
                      {"q": "star", "page": "11"}, {"q": "star", "page": "invalid"},
                      {"q": "star", "url": "https://example.test"}, {"q": "st\x00ar"}]:
            self.assertEqual(self.client.get(self.path, query).status_code, 400)
        self.assertEqual(self.client.get(self.path + "?q=star&q=boy").status_code, 400)
        search.assert_not_called()

    @patch("api.catalogue.musicbrainz.search")
    def test_results_cache_and_normalization(self, search):
        search.return_value = self.result
        first = self.client.get(self.path, {"q": "  2hollis   star  "})
        self.assertEqual(first.status_code, 200)
        self.assertIn("no-store", first["Cache-Control"])
        search.assert_called_once_with("2hollis star", 1)
        second = self.client.get(self.path, {"q": "2HOLLIS STAR"})
        self.assertEqual(second.status_code, 200)
        self.assertEqual(second.json()["query"], "2HOLLIS STAR")
        self.assertEqual(search.call_count, 1)

    @patch("api.catalogue.musicbrainz.search")
    def test_shared_provider_gate_blocks_another_query_and_member(self, search):
        search.return_value = self.result
        self.assertEqual(self.client.get(self.path, {"q": "star"}).status_code, 200)
        other = get_user_model().objects.create_user(username="other-searcher")
        self.client.force_login(other)
        response = self.client.get(self.path, {"q": "White Tiger"})
        self.assertEqual(response.status_code, 503)
        self.assertEqual(response["Retry-After"], "2")
        self.assertEqual(search.call_count, 1)

    @patch("api.catalogue.musicbrainz.search")
    def test_provider_failure_is_generic_and_sets_cooldown(self, search):
        from api.musicbrainz import ProviderUnavailable
        search.side_effect = ProviderUnavailable(30)
        first = self.client.get(self.path, {"q": "star"})
        self.assertEqual(first.status_code, 503)
        self.assertEqual(first["Retry-After"], "30")
        self.assertNotIn("traceback", first.content.decode().lower())
        blocked = self.client.get(self.path, {"q": "another album"})
        self.assertEqual(blocked.json()["code"], "provider_busy")
        self.assertGreaterEqual(int(blocked["Retry-After"]), 29)
        self.assertEqual(search.call_count, 1)

    @patch("api.catalogue.musicbrainz.search")
    def test_per_member_limit_and_cache_failure_fail_closed(self, search):
        from django.core.cache import cache
        cache.set(f"catalogue-search:{self.user.pk}", 30, 60)
        self.assertEqual(self.client.get(self.path, {"q": "star"}).status_code, 429)
        search.assert_not_called()
        with patch("api.catalogue.cache.add", side_effect=RuntimeError("private cache details")):
            response = self.client.get(self.path, {"q": "star"})
            self.assertEqual(response.status_code, 503)
            self.assertNotIn("private", response.content.decode())
        search.assert_not_called()


class MusicBrainzAdapterTests(TestCase):
    def fixture(self):
        return {"count": 21, "release-groups": [{"id": "11111111-1111-4111-8111-111111111111", "title": "star",
                "first-release-date": "2025-04-04", "primary-type": "Album",
                "artist-credit": [{"name": "2hollis", "artist": {"id": "22222222-2222-4222-8222-222222222222", "name": "2hollis"}}]}]}

    def test_normalizes_public_metadata_and_pagination(self):
        from api.musicbrainz import normalize
        result = normalize(self.fixture(), "2hollis star", 1)
        self.assertEqual(result["nextPage"], 2)
        self.assertEqual(result["results"][0]["artist"], "2hollis")
        self.assertTrue(result["results"][0]["sourceUrl"].startswith("https://musicbrainz.org/release-group/"))
        self.assertIsNone(normalize(self.fixture(), "query", 2)["nextPage"])

    def test_malformed_metadata_is_rejected_or_skipped(self):
        from api.musicbrainz import normalize, ProviderUnavailable
        for payload in [None, [], {}, {"count": "wrong", "release-groups": []}]:
            with self.assertRaises(ProviderUnavailable):
                normalize(payload, "query", 1)
        payload = self.fixture()
        payload["release-groups"] += [None, {"id": "../../bad", "title": "unsafe"}]
        self.assertEqual(len(normalize(payload, "query", 1)["results"]), 1)

    @patch("api.musicbrainz.build_opener")
    def test_fixed_host_user_agent_timeout_and_bounded_read(self, opener):
        import json
        from email.message import Message
        from urllib.parse import urlparse, parse_qs
        from api.musicbrainz import search, MAX_BYTES
        headers = Message()
        headers["Content-Type"] = "application/json"
        response = opener.return_value.open.return_value.__enter__.return_value
        response.headers = headers
        response.read.return_value = json.dumps(self.fixture()).encode()
        search("AC/DC & star", 2)
        args, kwargs = opener.return_value.open.call_args
        url = urlparse(args[0].full_url)
        self.assertEqual((url.scheme, url.hostname, url.path), ("https", "musicbrainz.org", "/ws/2/release-group/"))
        self.assertIn('releasegroup:"AC/DC"', parse_qs(url.query)["query"][0])
        self.assertIn("primarytype:album", parse_qs(url.query)["query"][0])
        self.assertEqual(parse_qs(url.query)["offset"], ["20"])
        self.assertIn("VinylShelf", args[0].get_header("User-agent"))
        self.assertEqual(kwargs["timeout"], 8)
        response.read.assert_called_once_with(MAX_BYTES + 1)

    @patch("api.musicbrainz.build_opener")
    def test_upstream_throttle_and_timeout(self, opener):
        from urllib.error import HTTPError, URLError
        from api.musicbrainz import search, ProviderUnavailable
        for error, retry in [(HTTPError("https://musicbrainz.org/", 429, "private", {}, None), 30), (URLError("private connection"), 10)]:
            opener.return_value.open.side_effect = error
            with self.assertRaises(ProviderUnavailable) as raised:
                search("star", 1)
            self.assertEqual(raised.exception.retry_after, retry)
