from django.contrib import admin
from django.contrib.auth.admin import UserAdmin
from .models import User, Invitation

admin.site.register(User, UserAdmin)


@admin.register(Invitation)
class InvitationAdmin(admin.ModelAdmin):
    list_display = ("label", "created_at", "expires_at", "used_at", "used_by")
    readonly_fields = ("label", "created_at", "expires_at", "used_at", "used_by")
    exclude = ("code_hash",)

    def has_add_permission(self, request):
        return False

    def has_change_permission(self, request, obj=None):
        return False
