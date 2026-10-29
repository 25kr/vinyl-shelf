"""Read-only MusicBrainz adapter. No user-controlled hosts or redirects."""
import json
from http.client import HTTPException
import uuid
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, build_opener, HTTPRedirectHandler

USER_AGENT = "VinylShelf/0.01 (https://github.com/25kr/vinyl-shelf)"
PAGE_SIZE = 20
MAX_BYTES = 1024 * 1024


class ProviderUnavailable(Exception):
    def __init__(self, retry_after=10):
        self.retry_after = retry_after


class NoRedirects(HTTPRedirectHandler):
    def redirect_request(self, request, fp, code, message, headers, new_url):
        return None


def identifier(value):
    try:
        return str(uuid.UUID(value)) if isinstance(value, str) else None
    except ValueError:
        return None


def text(value, maximum=300):
    return value[:maximum] if isinstance(value, str) else ""


def normalize(payload, query, page):
    if not isinstance(payload, dict) or not isinstance(payload.get("release-groups"), list):
        raise ProviderUnavailable()
    total = payload.get("count")
    if type(total) is not int or total < 0:
        raise ProviderUnavailable()
    results = []
    for item in payload["release-groups"][:PAGE_SIZE]:
        if not isinstance(item, dict):
            continue
        album_id = identifier(item.get("id"))
        title = text(item.get("title"))
        if not album_id or not title:
            continue
        credits = item.get("artist-credit", [])
        artists, display = [], []
        for credit in credits[:20] if isinstance(credits, list) else []:
            if not isinstance(credit, dict):
                continue
            artist = credit.get("artist")
            if not isinstance(artist, dict):
                continue
            name = text(credit.get("name")) or text(artist.get("name"))
            if not name:
                continue
            artists.append({"id": identifier(artist.get("id")), "name": name})
            display.append(name + text(credit.get("joinphrase"), 30))
        results.append({"id": album_id, "title": title, "artist": "".join(display).strip(), "artists": artists,
                        "firstReleaseDate": text(item.get("first-release-date"), 10),
                        "type": text(item.get("primary-type"), 40),
                        "disambiguation": text(item.get("disambiguation")),
                        "sourceUrl": f"https://musicbrainz.org/release-group/{album_id}"})
    # Bound pagination to ten pages for this first search endpoint.
    next_page = page + 1 if page < 10 and page * PAGE_SIZE < total else None
    return {"provider": "musicbrainz", "query": query, "page": page, "count": total,
            "nextPage": next_page, "results": results,
            "attribution": {"name": "MusicBrainz", "url": "https://musicbrainz.org/"}}


def provider_query(query):
    # Quote every word so user text cannot introduce Lucene operators or fields.
    words = [word for word in query.split() if any(char.isalnum() for char in word)]
    def quoted(word):
        return '"' + word.replace(chr(92), chr(92) * 2).replace('"', chr(92) + '"') + '"'
    terms = " AND ".join(f"(releasegroup:{quoted(word)} OR artist:{quoted(word)})" for word in words)
    return f"({terms or quoted(query)}) AND (primarytype:album OR primarytype:ep)"


def search(query, page):
    parameters = urlencode({"query": provider_query(query), "fmt": "json", "limit": PAGE_SIZE,
                            "offset": (page - 1) * PAGE_SIZE})
    request = Request("https://musicbrainz.org/ws/2/release-group/?" + parameters,
                      headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    try:
        with build_opener(NoRedirects()).open(request, timeout=8) as response:
            if response.headers.get_content_type() != "application/json":
                raise ProviderUnavailable()
            body = response.read(MAX_BYTES + 1)
            if len(body) > MAX_BYTES:
                raise ProviderUnavailable()
        payload = json.loads(body)
    except HTTPError as failure:
        # Never expose provider response bodies, URLs or headers to the client.
        retry = 30 if failure.code in (429, 503) else 10
        raise ProviderUnavailable(retry) from None
    except (URLError, TimeoutError, OSError, HTTPException, ValueError, UnicodeDecodeError):
        raise ProviderUnavailable() from None
    return normalize(payload, query, page)
