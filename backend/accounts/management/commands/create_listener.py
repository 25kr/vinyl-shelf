import getpass
from django.contrib.auth import get_user_model
from django.contrib.auth.password_validation import validate_password
from django.core.exceptions import ValidationError
from django.core.management.base import BaseCommand, CommandError


class Command(BaseCommand):
    help = "Create an ordinary local listener, prompting privately for a password."

    def add_arguments(self, parser):
        parser.add_argument("username")

    def handle(self, *args, **options):
        User = get_user_model()
        username = options["username"].strip()
        if User.objects.filter(username=username).exists():
            raise CommandError("That username already exists. No account was changed.")
        user = User(username=username)
        try:
            user.full_clean(exclude=["password"])
            password = getpass.getpass("Password: ")
            if password != getpass.getpass("Confirm password: "):
                raise CommandError("Passwords did not match. No account was created.")
            validate_password(password, user=user)
        except ValidationError as error:
            raise CommandError(" ".join(error.messages)) from error
        user.set_password(password)
        user.save()
        self.stdout.write(self.style.SUCCESS("Listener account created. No admin permissions granted."))
