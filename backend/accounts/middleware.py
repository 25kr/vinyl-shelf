from django.core.cache import cache
from django.http import HttpResponse
from django.utils.crypto import salted_hmac


class AdminLoginThrottle:
    """Apply the shared cache limiter to Django's separate admin login too."""
    def __init__(self, get_response):
        self.get_response = get_response

    def __call__(self, request):
        if request.method == "POST" and request.path == "/admin/login/":
            # Never trust caller-supplied forwarding headers for the limiter.
            digest = salted_hmac("admin-rate", request.META.get("REMOTE_ADDR", "unknown"), algorithm="sha256").hexdigest()
            key = "admin-attempts:" + digest
            cache.add(key, 0, timeout=300)
            try:
                attempts = cache.incr(key)
            except ValueError:
                cache.set(key, 1, timeout=300)
                attempts = 1
            if attempts > 20:
                response = HttpResponse("Too many sign-in attempts. Try again in five minutes.", status=429)
                response["Retry-After"] = "300"
                response["Cache-Control"] = "no-store"
                return response
        return self.get_response(request)
