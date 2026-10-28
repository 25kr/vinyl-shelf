"""Authenticated review reactions and paginated comments."""
import json
import uuid
from django.core.cache import cache
from django.core.paginator import Paginator, EmptyPage
from django.db.models import Count, Q
from django.http import JsonResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_http_methods
from accounts.profiles import avatar_url
from .models import Review, Reaction, Comment


def counts(review, user):
    totals = review.reactions.filter(owner__is_active=True).aggregate(likes=Count("id", filter=Q(value=1)), dislikes=Count("id", filter=Q(value=-1)))
    return {**totals, "myReaction": review.reactions.filter(owner=user).values_list("value", flat=True).first() or 0,
            "comments": review.comments.filter(owner__is_active=True).count()}


def payload(request):
    if request.content_type != "application/json" or len(request.body) > 8192:
        return None
    try:
        data = json.loads(request.body)
        return data if isinstance(data, dict) else None
    except (ValueError, UnicodeDecodeError):
        return None


def limited(user, action, maximum):
    key = f"social:{action}:{user.pk}"
    cache.add(key, 0, timeout=300)
    try:
        return cache.incr(key) > maximum
    except ValueError:
        cache.set(key, 1, timeout=300)
        return False


@never_cache
@require_http_methods(["GET", "POST"])
def reactions(request, review_id):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Log in to react to reviews."}, status=401)
    review = Review.objects.filter(pk=review_id, owner__is_active=True).first()
    if not review:
        return JsonResponse({"error": "Review not found."}, status=404)
    if request.method == "POST":
        data = payload(request)
        if data is None or set(data) != {"value"} or type(data["value"]) is not int or data["value"] not in [-1, 0, 1]:
            return JsonResponse({"error": "Choose like, dislike or neither."}, status=400)
        if limited(request.user, "reaction", 120):
            return JsonResponse({"error": "Too many reactions. Try again in five minutes."}, status=429)
        if data["value"] == 0:
            Reaction.objects.filter(review=review, owner=request.user).delete()
        else:
            Reaction.objects.update_or_create(review=review, owner=request.user, defaults={"value": data["value"]})
    return JsonResponse(counts(review, request.user))


def serialize_comment(comment, user):
    return {"id": comment.pk, "text": comment.text, "createdAt": comment.created_at.isoformat(),
            "author": {"id": comment.owner_id, "username": comment.owner.username, "avatarUrl": avatar_url(comment.owner)},
            "canDelete": comment.owner_id == user.pk}


@never_cache
@require_http_methods(["GET", "POST"])
def comments(request, review_id):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Log in to view and write comments."}, status=401)
    review = Review.objects.filter(pk=review_id, owner__is_active=True).first()
    if not review:
        return JsonResponse({"error": "Review not found."}, status=404)
    if request.method == "POST":
        data = payload(request)
        if data is None or set(data) != {"text", "clientId"} or not isinstance(data["text"], str) or not 1 <= len(data["text"].strip()) <= 1000:
            return JsonResponse({"error": "Write a comment of 1 to 1,000 characters."}, status=400)
        try:
            client_id = uuid.UUID(data["clientId"]) if isinstance(data["clientId"], str) else None
        except ValueError:
            client_id = None
        if client_id is None:
            return JsonResponse({"error": "Invalid comment request."}, status=400)
        if limited(request.user, "comment", 30):
            return JsonResponse({"error": "Too many comments. Try again in five minutes."}, status=429)
        comment, created = Comment.objects.get_or_create(owner=request.user, client_id=client_id, defaults={"review": review, "text": data["text"].strip()})
        if comment.review_id != review.pk or comment.text != data["text"].strip():
            return JsonResponse({"error": "This comment was already submitted."}, status=409)
        return JsonResponse({"comment": serialize_comment(comment, request.user), "counts": counts(review, request.user)}, status=201 if created else 200)
    try:
        number = int(request.GET.get("page", "1"))
        if number < 1:
            raise ValueError
        pages = Paginator(review.comments.filter(owner__is_active=True).select_related("owner").defer("owner__avatar_data", "owner__banner_data"), 20)
        page = pages.page(number)
    except ValueError:
        return JsonResponse({"error": "Invalid page."}, status=400)
    except EmptyPage:
        return JsonResponse({"error": "Page not found."}, status=404)
    return JsonResponse({"results": [serialize_comment(item, request.user) for item in page], "count": pages.count,
                         "nextPage": page.next_page_number() if page.has_next() else None})


@never_cache
@require_http_methods(["DELETE"])
def delete_comment(request, review_id, comment_id):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Log in to delete your comments."}, status=401)
    comment = Comment.objects.filter(pk=comment_id, review_id=review_id, owner=request.user).first()
    if not comment:
        return JsonResponse({"error": "Comment not found."}, status=404)
    comment.delete()
    return JsonResponse({"deleted": True})
