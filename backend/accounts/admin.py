from django.contrib import admin, messages
from django import forms
from django.utils import timezone
from datetime import timedelta
import hashlib
import secrets
from django.contrib.auth.admin import UserAdmin
from .models import User, Invitation

admin.site.register(User, UserAdmin)


class InvitationCreateForm(forms.ModelForm):
    days = forms.IntegerField(min_value=1, max_value=30, initial=7, help_text="Code works once. Default expiry: seven days.")

    class Meta:
        model = Invitation
        fields = ("label",)


@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ("label", "created_at", "expires_at", "used_at", "used_by")
    form = InvitationCreateForm
    fields = ("label", "days")

    def has_add_permission(self, request):
        return request.user.is_superuser

    def save_model(self, request, obj, form, change):
        code = secrets.token_urlsafe(32)
        obj.code_hash = hashlib.sha256(code.encode()).hexdigest()
        obj.expires_at = timezone.now() + timedelta(days=form.cleaned_data["days"])
        super().save_model(request, obj, form, change)
        messages.success(request, f"Private single-use invite: {code} — copy it now; it is shown only once.")

    def has_change_permission(self, request, obj=None):
        return False
