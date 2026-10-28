"""Session authentication for the React client. No public signup endpoint yet."""
import json

from django.contrib.auth import login, logout
from django.contrib.auth.forms import AuthenticationForm
from django.core.cache import cache
from django.http import JsonResponse
from django.middleware.csrf import get_token
from django.utils.crypto import salted_hmac
from django.views.decorators.cache import never_cache
from django.views.decorators.http import require_GET, require_POST


def session_data(request):
    user = request.user
    return {
        "user": {"id": user.pk, "username": user.username} if user.is_authenticated else None,
        "csrfToken": get_token(request),
    }


@require_GET
@never_cache
def session(request):
    return JsonResponse(session_data(request))


def csrf_failure(request, reason=""):
    # Do not expose Django's diagnostic reason or echo request data.
    return JsonResponse({"error": "Your sign-in form expired. Please try again."}, status=403)


@require_POST
@never_cache
def sign_in(request):
    if request.content_type != "application/json":
        return JsonResponse({"error": "Send a JSON sign-in request."}, status=415)
    if len(request.body) > 8192:
        return JsonResponse({"error": "Sign-in request is too large."}, status=400)
    try:
        data = json.loads(request.body)
    except (ValueError, UnicodeDecodeError):
        return JsonResponse({"error": "Invalid sign-in request."}, status=400)
    if not isinstance(data, dict):
        return JsonResponse({"error": "Invalid sign-in request."}, status=400)
    username, password = data.get("username"), data.get("password")
    if (not isinstance(username, str) or not isinstance(password, str)
            or not username.strip() or not password or len(username) > 150 or len(password) > 1024):
        return JsonResponse({"error": "Enter your username and password."}, status=400)

    # Local-process protection. Configure a shared production cache before hosting.
    # Trust REMOTE_ADDR, never a caller-supplied forwarded-address header.
    digest = salted_hmac("login-rate", request.META.get("REMOTE_ADDR", "unknown"), algorithm="sha256").hexdigest()
    key = "login-attempts:" + digest
    cache.add(key, 0, timeout=300)
    try:
        attempts = cache.incr(key)
    except ValueError:
        cache.set(key, 1, timeout=300)
        attempts = 1
    if attempts > 20:
        response = JsonResponse({"error": "Too many sign-in attempts. Try again in five minutes."}, status=429)
        response["Retry-After"] = "300"
        return response

    form = AuthenticationForm(request=request, data={"username": username.strip(), "password": password})
    if not form.is_valid():
        # Identical response for unknown usernames, wrong passwords and inactive users.
        return JsonResponse({"error": "Username or password is incorrect."}, status=401)
    login(request, form.get_user())
    return JsonResponse(session_data(request))


@require_POST
@never_cache
def sign_out(request):
    logout(request)
    return JsonResponse(session_data(request))
