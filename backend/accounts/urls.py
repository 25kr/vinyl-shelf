from django.urls import path
from . import views

urlpatterns = [
    path("session/", views.session, name="auth-session"),
    path("login/", views.sign_in, name="auth-login"),
    path("signup/", views.sign_up, name="auth-signup"),
    path("logout/", views.sign_out, name="auth-logout"),
]
