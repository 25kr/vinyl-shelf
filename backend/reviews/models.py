from django.conf import settings
from django.db import models
import uuid


class Review(models.Model):
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    owner = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE, related_name="reviews")
    album_id = models.CharField(max_length=100)
    target = models.CharField(max_length=30, default="album")
    listened_on = models.DateField()
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
