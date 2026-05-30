from django.contrib import admin
from .models import Story

@admin.register(Story)
class StoryAdmin(admin.ModelAdmin):
    list_display = ['id', 'user', 'media_type', 'created_at', 'expires_at']
    search_fields = ['user__email']
    list_filter = ['media_type', 'created_at']
