from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.functions import Lower


class User(AbstractUser):
    """Listener accounts; username spelling is unique regardless of case."""

    bio = models.CharField(max_length=240, blank=True)
    avatar_data = models.BinaryField(blank=True, default=bytes)
    avatar_version = models.CharField(max_length=64, blank=True)

    class Meta(AbstractUser.Meta):
        constraints = [models.UniqueConstraint(Lower("username"), name="account_username_case_unique")]


class Invitation(models.Model):
    label = models.CharField(max_length=100, blank=True)
    code_hash = models.CharField(max_length=64, unique=True, editable=False)
    expires_at = models.DateTimeField()
    created_at = models.DateTimeField(auto_now_add=True)
    used_at = models.DateTimeField(null=True, blank=True)
    used_by = models.ForeignKey(User, null=True, blank=True, on_delete=models.SET_NULL)

    def __str__(self):
        return self.label or f"Invitation {self.pk}"
