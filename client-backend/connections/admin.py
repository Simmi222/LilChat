from django.contrib import admin
from .models import Connection

@admin.register(Connection)
class ConnectionAdmin(admin.ModelAdmin):
    list_display = ['id', 'from_user', 'to_user', 'status', 'created_at']
    search_fields = ['from_user__email', 'to_user__email']
    list_filter = ['status', 'created_at']
