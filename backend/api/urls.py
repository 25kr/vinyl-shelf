from django.urls import include, path
from .views import health
from .catalogue import album_search

urlpatterns = [path("catalogue/search/", album_search, name="album-search"), path("reviews/", include("reviews.urls")), path("auth/", include("accounts.urls")), path("health/", health, name="health")]
