from django.urls import path
from . import views

urlpatterns = [path("", views.review_list), path("<uuid:review_id>/", views.review_detail)]
