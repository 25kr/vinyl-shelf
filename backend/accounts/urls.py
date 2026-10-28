from django.urls import path
from . import views

urlpatterns = [
    path("session/", views.session, name="auth-session"),
    path("login/", views.sign_in, name="auth-login"),
    path("logout/", views.sign_out, name="auth-logout"),
]
