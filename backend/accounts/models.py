from django.contrib.auth.models import AbstractUser
from django.db import models
from django.db.models.functions import Lower


class User(AbstractUser):
    """Listener accounts; username spelling is unique regardless of case."""

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
