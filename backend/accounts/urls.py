from django.urls import path
from . import views, profiles

urlpatterns = [
    path("profiles/<int:user_id>/follow/", profiles.follow, name="member-follow"),
    path("profile/", profiles.edit_profile, name="edit-profile"),
    path("profiles/<int:user_id>/", profiles.profile, name="member-profile"),
    path("profiles/<int:user_id>/avatar/", profiles.avatar, name="member-avatar"),
    path("profiles/<int:user_id>/<str:kind>/", profiles.connections, name="member-connections"),
    path("session/", views.session, name="auth-session"),
    path("login/", views.sign_in, name="auth-login"),
    path("signup/", views.sign_up, name="auth-signup"),
    path("logout/", views.sign_out, name="auth-logout"),
]
