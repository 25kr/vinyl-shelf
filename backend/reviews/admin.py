from django.contrib import admin
from .models import Review


@admin.register(Review)
class ReviewAdmin(admin.ModelAdmin):
    list_display = ["owner", "album_id", "rating", "listened_on", "created_at"]
    list_filter = ["rating", "repeat"]
    search_fields = ["owner__username", "album_id", "note"]
    readonly_fields = ["owner", "client_id", "created_at", "updated_at"]

    def has_add_permission(self, request):
        return False
