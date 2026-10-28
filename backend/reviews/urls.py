from django.urls import path
from . import views, social

urlpatterns = [path("<uuid:review_id>/reactions/", social.reactions), path("<uuid:review_id>/comments/", social.comments), path("<uuid:review_id>/comments/<int:comment_id>/", social.delete_comment), path("", views.review_list), path("<uuid:review_id>/", views.review_detail)]
