from rest_framework import serializers
from .models import Post, Comment
from users.serializers import UserSerializer

class CommentSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    
    class Meta:
        model = Comment
        fields = ['id', 'post', 'user', 'content', 'created_at', 'updated_at']

class PostSerializer(serializers.ModelSerializer):
    user = UserSerializer(read_only=True)
    comments = CommentSerializer(many=True, read_only=True)
    comments_count = serializers.SerializerMethodField()
    is_liked = serializers.SerializerMethodField()
    # Frontend-compatible aliases
    content = serializers.CharField(source='caption', read_only=True, allow_blank=True)
    # Allow caption to be written as empty string (media-only posts)
    caption = serializers.CharField(required=False, allow_blank=True, default='')
    image_urls = serializers.SerializerMethodField()
    liked_by_current_user = serializers.SerializerMethodField()
    # Explicitly allow image to be written (accepts base64 or URL string)
    image = serializers.CharField(required=False, allow_blank=True, allow_null=True)

    class Meta:
        model = Post
        fields = [
            'id', 'user', 'caption', 'content', 'image', 'image_urls',
            'likes_count', 'comments_count', 'is_liked', 'liked_by_current_user',
            'comments', 'created_at', 'updated_at'
        ]
    
    def get_comments_count(self, obj):
        return obj.comments.count()
    
    def get_is_liked(self, obj):
        request = self.context.get('request')
        if request:
            if request.user.is_authenticated:
                return obj.likes.filter(id=request.user.id).exists()
            # Fallback: check clerk_id from query params
            clerk_id = request.query_params.get('clerk_id')
            if clerk_id:
                from users.models import User
                try:
                    user = User.objects.get(clerk_id=clerk_id)
                    return obj.likes.filter(id=user.id).exists()
                except User.DoesNotExist:
                    pass
        return False
    
    def get_liked_by_current_user(self, obj):
        return self.get_is_liked(obj)
    
    def get_image_urls(self, obj):
        # Return image as a list for frontend compatibility
        if obj.image:
            return [obj.image]
        return []
