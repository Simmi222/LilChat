from rest_framework import serializers
from .models import Story
from users.serializers import UserSerializer

class StorySerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    views_count = serializers.SerializerMethodField()
    is_viewed = serializers.SerializerMethodField()
    media_url = serializers.SerializerMethodField()  # Custom method to get media URL

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
        """Return the appropriate media URL - uploaded file or data URL"""
        request = self.context.get('request')
        if obj.media:
            # Return absolute URL for uploaded files
            return request.build_absolute_uri(obj.media.url) if request else obj.media.url
        # Fall back to data URLs for backward compatibility
        return obj.media_url
