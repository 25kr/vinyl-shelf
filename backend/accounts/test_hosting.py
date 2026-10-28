import os
import re
import hashlib
from io import StringIO
from unittest.mock import patch
from django.test import TestCase
from django.core.management import call_command, CommandError
from django.contrib.auth import get_user_model
from .models import Invitation


class HostingAccountTests(TestCase):
    def test_owner_bootstrap_creates_only_owner_and_never_resets_password(self):
        output = StringIO()
        with patch.dict(os.environ, {"BOOTSTRAP_ADMIN_PASSWORD": "Hosting-owner-741-cobalt!"}):
            call_command("bootstrap_admin", stdout=output)
        owner = get_user_model().objects.get(username="29kr")
        self.assertTrue(owner.is_superuser)
        self.assertTrue(owner.check_password("Hosting-owner-741-cobalt!"))
        with patch.dict(os.environ, {"BOOTSTRAP_ADMIN_PASSWORD": "Different-741-cobalt!"}):
            call_command("bootstrap_admin", stdout=output)
        owner.refresh_from_db()
        self.assertTrue(owner.check_password("Hosting-owner-741-cobalt!"))
        self.assertNotIn("Hosting-owner-741-cobalt!", output.getvalue())

    def test_bootstrap_missing_secret_or_occupied_name_fails_without_granting_access(self):
        with patch.dict(os.environ, {"BOOTSTRAP_ADMIN_PASSWORD": ""}):
            with self.assertRaises(CommandError):
                call_command("bootstrap_admin")
        user = get_user_model().objects.create_user(username="29KR", password="test-only-password")
        with self.assertRaises(CommandError):
            call_command("bootstrap_admin")
        user.refresh_from_db()
        self.assertFalse(user.is_superuser)

    def test_admin_can_create_hashed_invite_but_ordinary_member_cannot(self):
        owner = get_user_model().objects.create_superuser(username="29kr", password="test-only-password")
        self.client.force_login(owner)
        response = self.client.post("/admin/accounts/invitation/add/", {"label": "Friend", "days": 7, "_save": "Save"}, follow=True)
        self.assertEqual(response.status_code, 200)
        code = re.search(r"Private single-use invite: ([A-Za-z0-9_-]+)", response.content.decode()).group(1)
        invite = Invitation.objects.get()
        self.assertEqual(invite.code_hash, hashlib.sha256(code.encode()).hexdigest())
        self.assertNotIn(code, self.client.get("/admin/accounts/invitation/").content.decode())
        user = get_user_model().objects.create_user(username="member", password="test-only-password")
        self.client.force_login(user)
        response = self.client.post("/admin/accounts/invitation/add/", {"label": "Unauthorised", "days": 7})
        self.assertEqual(response.status_code, 302)
        self.assertEqual(Invitation.objects.count(), 1)
