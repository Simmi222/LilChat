from rest_framework import serializers
from .models import Story
from users.serializers import UserSerializer


class StorySerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    views_count = serializers.SerializerMethodField()
    is_viewed = serializers.SerializerMethodField()
    media_url = serializers.SerializerMethodField()

    class Meta:
        model = Story
        fields = ['id', 'user', 'content', 'media', 'media_url', 'media_type', 'background_color', 'views_count', 'is_viewed', 'created_at', 'expires_at']

    def get_views_count(self, obj):
        return obj.views.count()

    def get_is_viewed(self, obj):
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            return obj.views.filter(id=request.user.id).exists()
        return False

    def get_media_url(self, obj):
        if obj.media:
            try:
                return obj.media.url
            except Exception:
                pass
        return obj.media_url if obj.media_url else None
