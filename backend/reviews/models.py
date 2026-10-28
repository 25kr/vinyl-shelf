from django.conf import settings
from django.db import models
import uuid


class Review(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews")
    album_id = models.CharField(max_length=100)
    target = models.CharField(max_length=30, default="album")
    listened_on = models.DateField(null=True, blank=True)
    rating = models.PositiveSmallIntegerField()
    note = models.TextField(max_length=500, blank=True)
    repeat = models.BooleanField(default=False)
    client_id = models.CharField(max_length=128)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at", "-id"]
        constraints = [
            models.CheckConstraint(condition=models.Q(rating__gte=1, rating__lte=5), name="review_rating_1_to_5"),
            models.UniqueConstraint(fields=["owner", "client_id"], name="review_import_once_per_owner"),
        ]


class Reaction(models.Model):
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="reactions")
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    value = models.SmallIntegerField()

    class Meta:
        constraints = [models.UniqueConstraint(fields=["review", "owner"], name="review_one_reaction_per_user"),
                       models.CheckConstraint(condition=models.Q(value__in=[-1, 1]), name="review_reaction_valid")]


class Comment(models.Model):
    review = models.ForeignKey(Review, on_delete=models.CASCADE, related_name="comments")
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    text = models.CharField(max_length=1000)
    client_id = models.UUIDField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-created_at", "-pk"]
        constraints = [models.UniqueConstraint(fields=["owner", "client_id"], name="comment_once_per_client")]
