import json
from django.core.paginator import Paginator, EmptyPage
from django.http import JsonResponse
from django.shortcuts import get_object_or_404
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_http_methods
from .forms import ReviewForm
from .models import Review
from accounts.profiles import avatar_url


def serialize(review):
    return {"id": str(review.pk), "albumId": review.album_id, "target": review.target,
            "date": review.listened_on.isoformat() if review.listened_on else None, "rating": review.rating,
            "note": review.note, "repeat": review.repeat, "clientId": review.client_id,
            "createdAt": review.created_at.isoformat(), "updatedAt": review.updated_at.isoformat(),
            "author": {"id": review.owner_id, "username": review.owner.username, "avatarUrl": avatar_url(review.owner)}}


def validated_payload(request, client_id=None):
    if request.content_type != "application/json" or len(request.body) > 8192:
        return None, JsonResponse({"error": "Send a JSON review of at most 8 KB."}, status=400)
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        return None, JsonResponse({"error": "Invalid review data."}, status=400)
    allowed = {"albumId", "target", "date", "rating", "note", "repeat", "clientId"}
    if not isinstance(data, dict) or set(data) - allowed:
        return None, JsonResponse({"error": "Invalid review fields."}, status=400)
    if type(data.get("rating")) is not int or type(data.get("repeat")) is not bool or not isinstance(data.get("note", ""), str):
        return None, JsonResponse({"error": "Use a rating from 1 to 5 and a true/false repeat value."}, status=400)
    if client_id is not None:
        data["clientId"] = client_id
    form = ReviewForm(data)
    if not form.is_valid():
        return None, JsonResponse({"error": "Check your review details.", "fields": form.errors.get_json_data()}, status=400)
    return {"album_id": form.cleaned_data["albumId"], "target": form.cleaned_data["target"],
            "listened_on": form.cleaned_data["date"], "rating": form.cleaned_data["rating"],
            "note": form.cleaned_data["note"], "repeat": form.cleaned_data["repeat"],
            "client_id": form.cleaned_data["clientId"]}, None


@never_cache
@require_http_methods(["GET", "POST"])
def review_list(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Log in to view and write reviews."}, status=401)
    if request.method == "GET":
        try:
            page_number = int(request.GET.get("page", "1"))
            if page_number < 1:
                raise ValueError
        except ValueError:
            return JsonResponse({"error": "Invalid review page."}, status=400)
        pages = Paginator(Review.objects.select_related("owner").defer("owner__avatar_data", "owner__banner_data").all(), 20)
        try:
            page = pages.page(page_number)
        except EmptyPage:
            return JsonResponse({"error": "Review page not found."}, status=404)
        return JsonResponse({"results": [serialize(item) for item in page], "count": pages.count,
                             "nextPage": page.next_page_number() if page.has_next() else None})
    data, error = validated_payload(request)
    if error is not None:
        return error
    review, created = Review.objects.get_or_create(owner=request.user, client_id=data["client_id"], defaults=data)
    if not created and any(getattr(review, key) != value for key, value in data.items()):
        return JsonResponse({"error": "This review was already saved. Open it from the diary to edit it."}, status=409)
    return JsonResponse(serialize(review), status=201 if created else 200)


@never_cache
@require_http_methods(["PATCH", "DELETE"])
def review_detail(request, review_id):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Log in to change your reviews."}, status=401)
    # Ownership is enforced in the database query, even for a forged request.
    # Admin moderation is deliberately separate, through Django's admin site.
    try:
        review = Review.objects.select_related("owner").get(pk=review_id, owner=request.user)
    except Review.DoesNotExist:
        return JsonResponse({"error": "Review not found."}, status=404)
    if request.method == "DELETE":
        review.delete()
        return JsonResponse({"deleted": True})
    data, error = validated_payload(request, client_id=review.client_id)
    if error is not None:
        return error
    for key, value in data.items():
        setattr(review, key, value)
    review.save()
    return JsonResponse(serialize(review))
