from django.contrib.auth.models import AbstractUser


class User(AbstractUser):
    """Start with Django's account fields and password hashing, ready to extend."""
