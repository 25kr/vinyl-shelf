"""Member-only cached catalogue search; does not import or change albums."""
import hashlib
import unicodedata
from django.core.cache import cache
from django.http import JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET
from . import musicbrainz


def unavailable(seconds=10):
    response = JsonResponse({"error": "Album search is busy or unavailable. Please try again shortly."}, status=503)
    response["Retry-After"] = str(seconds)
    return response


@require_GET
@never_cache
def album_search(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Log in to search for albums."}, status=401)
    if set(request.GET) - {"q", "page"} or any(len(request.GET.getlist(key)) != 1 for key in request.GET):
        return JsonResponse({"error": "Use one album search and page number."}, status=400)
    raw = request.GET.get("q", "")
    if len(raw) > 200 or any(unicodedata.category(char).startswith("C") for char in raw):
        return JsonResponse({"error": "Use a search of 2 to 120 characters."}, status=400)
    query = " ".join(unicodedata.normalize("NFKC", raw).split())
    if not 2 <= len(query) <= 120:
        return JsonResponse({"error": "Use a search of 2 to 120 characters."}, status=400)
    try:
        page = int(request.GET.get("page", "1"))
        if not 1 <= page <= 10:
            raise ValueError
    except ValueError:
        return JsonResponse({"error": "Choose a page from 1 to 10."}, status=400)
    digest = hashlib.sha256(query.casefold().encode()).hexdigest()
    key = f"musicbrainz:search:v1:{digest}:{page}"
    try:
        # Per-account request budget, plus an atomic shared provider gate across workers.
        rate_key = f"catalogue-search:{request.user.pk}"
        cache.add(rate_key, 0, timeout=60)
        try:
            attempts = cache.incr(rate_key)
        except ValueError:
            cache.set(rate_key, 1, timeout=60)
            attempts = 1
        if attempts > 30:
            response = JsonResponse({"error": "Too many searches. Please wait a minute."}, status=429)
            response["Retry-After"] = "60"
            return response
        saved = cache.get(key)
        if saved is not None:
            return JsonResponse({**saved, "query": query})
        if cache.get("musicbrainz:cooldown") or not cache.add("musicbrainz:request-slot", True, timeout=2):
            return unavailable(2)
    except Exception:
        # A broken shared cache must not allow an unthrottled provider request.
        return unavailable()
    try:
        result = musicbrainz.search(query, page)
    except musicbrainz.ProviderUnavailable as failure:
        try:
            cache.set("musicbrainz:cooldown", True, timeout=failure.retry_after)
        except Exception:
            pass
        return unavailable(failure.retry_after)
    try:
        cache.set(key, result, timeout=3600)
    except Exception:
        return unavailable()
    return JsonResponse(result)
