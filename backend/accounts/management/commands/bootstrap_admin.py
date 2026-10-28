import os
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Initialize the owner's 29kr admin once, using a private hosting secret. Never resets accounts."

    def handle(self, *args, **options):
        User = get_user_model()
        existing = User.objects.filter(username__iexact="29kr").first()
        if existing:
            if existing.username != "29kr" or not existing.is_superuser or not existing.is_staff:
                raise CommandError("The owner username is already used by a non-admin account. No permissions changed.")
            self.stdout.write("Owner admin is already initialized; no account changed.")
            return
        password = os.environ.get("BOOTSTRAP_ADMIN_PASSWORD", "")
        if not password:
            raise CommandError("Set BOOTSTRAP_ADMIN_PASSWORD privately for the first deployment.")
        user = User(username="29kr", is_staff=True, is_superuser=True)
        try:
            validate_password(password, user=user)
        except ValidationError:
            raise CommandError("Choose a stronger initial admin password (at least 8 characters; avoid common passwords).")
        user.set_password(password)
        user.save()
        self.stdout.write("Owner admin initialized. Remove BOOTSTRAP_ADMIN_PASSWORD from the hosting environment.")
