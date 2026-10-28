import hashlib
import secrets
from datetime import timedelta
from django.core.management.base import BaseCommand, CommandError
from django.utils import timezone
from accounts.models import Invitation


class Command(BaseCommand):
    help = "Create a single-use beta invite; only its hash is stored."

    def add_arguments(self, parser):
        parser.add_argument("--label", default="", help="Private label for identifying the invite")
        parser.add_argument("--days", type=int, default=7)

    def handle(self, *args, **options):
        if not 1 <= options["days"] <= 30:
            raise CommandError("Choose an expiry between 1 and 30 days.")
        if len(options["label"]) > 100:
            raise CommandError("Keep the label to 100 characters.")
        code = secrets.token_urlsafe(32)
        invite = Invitation.objects.create(label=options["label"],
            code_hash=hashlib.sha256(code.encode()).hexdigest(),
            expires_at=timezone.now() + timedelta(days=options["days"]))
        self.stdout.write(f"Single-use invite (keep private): {code}")
        self.stdout.write(f"Expires: {invite.expires_at.isoformat()}. This code is shown only once.")
