from django.urls import include, path
from .views import health

urlpatterns = [path("auth/", include("accounts.urls")), path("health/", health, name="health")]
