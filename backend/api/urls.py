from django.urls import include, path
from .views import health

urlpatterns = [path("reviews/", include("reviews.urls")), path("auth/", include("accounts.urls")), path("health/", health, name="health")]
