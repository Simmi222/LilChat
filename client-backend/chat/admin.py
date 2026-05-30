from django.contrib import admin
from .models import Chat

@admin.register(Chat)
class ChatAdmin(admin.ModelAdmin):
    list_display = ['id', 'sender', 'receiver', 'content', 'is_read', 'created_at']
    search_fields = ['sender__email', 'receiver__email', 'content']
    list_filter = ['is_read', 'created_at']
