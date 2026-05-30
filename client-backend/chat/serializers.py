from rest_framework import serializers
from .models import Chat
from users.serializers import UserSerializer


class ReplySerializer(serializers.ModelSerializer):
    """Lightweight serializer for the quoted/replied message"""
    sender = UserSerializer(read_only=True)

    class Meta:
        model = Chat
        fields = ['id', 'sender', 'content', 'message_type', 'created_at']


class ChatSerializer(serializers.ModelSerializer):
    sender   = UserSerializer(read_only=True)
    receiver = UserSerializer(read_only=True)
    # Frontend-compatible aliases
    from_user = UserSerializer(source='sender',   read_only=True)
    to_user   = UserSerializer(source='receiver', read_only=True)
    text      = serializers.CharField(source='content', read_only=True)
    # Nested reply-to message (read-only)
    reply_to  = ReplySerializer(read_only=True)

    class Meta:
        model = Chat
        fields = [
            'id', 'sender', 'receiver', 'from_user', 'to_user',
            'content', 'text', 'message_type', 'media_url',
            'is_read', 'reply_to', 'created_at', 'updated_at',
        ]
