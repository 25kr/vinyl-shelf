"""Member-only profiles and bounded, re-encoded account pictures."""
import hashlib
import json
from .models import Follow
from io import BytesIO
import warnings
from PIL import Image, ImageOps, UnidentifiedImageError
from django.contrib.auth import get_user_model
from django.core.cache import cache
from django.core.paginator import Paginator, EmptyPage
from django.http import JsonResponse, HttpResponse
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET, require_POST


def avatar_url(user):
    return f"/api/auth/profiles/{user.pk}/avatar/?v={user.avatar_version}" if user.avatar_version else None


def public_user(user):
    return {"id": user.pk, "username": user.username, "bio": user.bio, "avatarUrl": avatar_url(user), "bannerUrl": f"/api/auth/profiles/{user.pk}/banner/?v={user.banner_version}" if user.banner_version else None}


@require_GET
@never_cache
def profile(request, user_id):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Log in to view profiles."}, status=401)
    user = get_user_model().objects.defer("avatar_data", "banner_data").filter(pk=user_id, is_active=True).first()
    if not user:
        return JsonResponse({"error": "Profile not found."}, status=404)
    try:
        number = int(request.GET.get("page", "1"))
        if number < 1:
            raise ValueError
        pages = Paginator(user.reviews.select_related("owner").defer("owner__avatar_data", "owner__banner_data"), 20)
        page = pages.page(number)
    except ValueError:
        return JsonResponse({"error": "Invalid review page."}, status=400)
    except EmptyPage:
        return JsonResponse({"error": "Review page not found."}, status=404)
    from reviews.views import serialize
    return JsonResponse({"profile": public_user(user), "connections": connection_data(user, request.user), "results": [serialize(item) for item in page],
                         "count": pages.count, "nextPage": page.next_page_number() if page.has_next() else None})


@require_GET
@never_cache
def avatar(request, user_id):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Log in to view profile pictures."}, status=401)
    user = get_user_model().objects.only("avatar_data", "avatar_version").filter(pk=user_id, is_active=True).first()
    if not user or not user.avatar_version:
        return HttpResponse(status=404)
    response = HttpResponse(bytes(user.avatar_data), content_type="image/jpeg")
    response["X-Content-Type-Options"] = "nosniff"
    return response


@require_POST
@never_cache
def edit_profile(request):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Log in to edit your profile."}, status=401)
    # Bound the whole multipart request before parsing or decoding an image.
    try:
        if int(request.META.get("CONTENT_LENGTH") or 0) > 4 * 1024 * 1024 + 16384:
            return JsonResponse({"error": "Choose a picture smaller than 2 MB."}, status=413)
    except ValueError:
        return JsonResponse({"error": "Invalid upload size."}, status=400)
    if request.content_type != "multipart/form-data":
        return JsonResponse({"error": "Send a profile form."}, status=415)
    key = f"profile-updates:{request.user.pk}"
    cache.add(key, 0, timeout=300)
    try:
        attempts = cache.incr(key)
    except ValueError:
        cache.set(key, 1, timeout=300)
        attempts = 1
    if attempts > 20:
        return JsonResponse({"error": "Too many changes. Try again in five minutes."}, status=429)
    if (set(request.POST) - {"bio", "removeAvatar", "removeBanner"} or set(request.FILES) - {"avatar", "banner"}
            or any(len(request.POST.getlist(key)) != 1 for key in request.POST)
            or any(len(request.FILES.getlist(key)) != 1 for key in request.FILES)):
        return JsonResponse({"error": "Invalid profile fields."}, status=400)
    bio = request.POST.get("bio", request.user.bio).strip()
    remove = request.POST.get("removeAvatar", "false")
    if len(bio) > 240 or remove not in {"true", "false"}:
        return JsonResponse({"error": "Use a bio of at most 240 characters."}, status=400)
    user = request.user
    fields = ["bio"]
    for name, flag, dimensions in [("avatar", "removeAvatar", (256, 256)), ("banner", "removeBanner", (1200, 400))]:
        remove = request.POST.get(flag, "false")
        upload = request.FILES.get(name)
        if remove not in {"true", "false"} or (upload and remove == "true"):
            return JsonResponse({"error": "Choose an image or remove it, not both."}, status=400)
        if upload:
            if upload.size > 2 * 1024 * 1024:
                return JsonResponse({"error": "Choose images smaller than 2 MB each."}, status=413)
            try:
                with warnings.catch_warnings():
                    warnings.simplefilter("error", Image.DecompressionBombWarning)
                    with Image.open(upload, formats=["JPEG", "PNG", "WEBP"]) as source:
                        if source.width * source.height > 12_000_000 or getattr(source, "n_frames", 1) != 1:
                            raise ValueError("Unsupported dimensions or animation")
                        source.load()
                        picture = ImageOps.fit(ImageOps.exif_transpose(source).convert("RGB"), dimensions)
                        clean = Image.new("RGB", dimensions)
                        clean.paste(picture)
                        output = BytesIO()
                        clean.save(output, format="JPEG", quality=85)
                        content = output.getvalue()
                        setattr(user, f"{name}_data", content)
                        setattr(user, f"{name}_version", hashlib.sha256(content).hexdigest())
            except (UnidentifiedImageError, OSError, ValueError, Image.DecompressionBombError, Image.DecompressionBombWarning):
                return JsonResponse({"error": "Use still JPG, PNG or WebP images up to 12 megapixels."}, status=400)
            fields += [f"{name}_data", f"{name}_version"]
        elif remove == "true":
            setattr(user, f"{name}_data", b"")
            setattr(user, f"{name}_version", "")
            fields += [f"{name}_data", f"{name}_version"]
    user.bio = bio
    user.save(update_fields=fields)
    return JsonResponse({"profile": public_user(user)})


def connection_data(user, viewer):
    return {"followers": user.follower_connections.filter(follower__is_active=True).count(),
            "following": user.following_connections.filter(following__is_active=True).count(),
            "isFollowing": Follow.objects.filter(follower=viewer, following=user).exists()}


@require_POST
@never_cache
def follow(request, user_id):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Log in to follow listeners."}, status=401)
    if request.content_type != "application/json" or len(request.body) > 1024:
        return JsonResponse({"error": "Send a small JSON follow request."}, status=400)
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid follow request."}, status=400)
    if not isinstance(data, dict) or set(data) != {"following"} or type(data["following"]) is not bool:
        return JsonResponse({"error": "Choose whether to follow this listener."}, status=400)
    user = get_user_model().objects.defer("avatar_data", "banner_data").filter(pk=user_id, is_active=True).first()
    if not user:
        return JsonResponse({"error": "Profile not found."}, status=404)
    if user.pk == request.user.pk:
        return JsonResponse({"error": "You can’t follow yourself."}, status=400)
    # Idempotent writes: retries cannot duplicate or accidentally undo a follow.
    if data["following"]:
        Follow.objects.get_or_create(follower=request.user, following=user)
    else:
        Follow.objects.filter(follower=request.user, following=user).delete()
    return JsonResponse({"connections": connection_data(user, request.user)})


@require_GET
@never_cache
def connections(request, user_id, kind):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Log in to view listeners."}, status=401)
    user = get_user_model().objects.filter(pk=user_id, is_active=True).only("id").first()
    if not user:
        return JsonResponse({"error": "Profile not found."}, status=404)
    if kind not in {"followers", "following"}:
        return JsonResponse({"error": "List not found."}, status=404)
    rows = Follow.objects.filter(following=user, follower__is_active=True) if kind == "followers" else Follow.objects.filter(follower=user, following__is_active=True)
    member = "follower" if kind == "followers" else "following"
    rows = rows.select_related(member).defer(f"{member}__avatar_data", f"{member}__banner_data")
    try:
        number = int(request.GET.get("page", "1"))
        if number < 1:
            raise ValueError
        pages = Paginator(rows, 20)
        page = pages.page(number)
    except ValueError:
        return JsonResponse({"error": "Invalid page."}, status=400)
    except EmptyPage:
        return JsonResponse({"error": "Page not found."}, status=404)
    return JsonResponse({"results": [public_user(getattr(row, member)) for row in page], "count": pages.count,
                         "nextPage": page.next_page_number() if page.has_next() else None})


@require_GET
@never_cache
def banner(request, user_id):
    if not request.user.is_authenticated:
        return JsonResponse({"error": "Log in to view banners."}, status=401)
    user = get_user_model().objects.only("banner_data", "banner_version").filter(pk=user_id, is_active=True).first()
    if not user or not user.banner_version:
        return HttpResponse(status=404)
    response = HttpResponse(bytes(user.banner_data), content_type="image/jpeg")
    response["X-Content-Type-Options"] = "nosniff"
    return response
