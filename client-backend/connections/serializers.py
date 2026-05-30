from rest_framework import serializers
from .models import Connection
from users.serializers import UserSerializer

class ConnectionSerializer(serializers.ModelSerializer):
    from_user = UserSerializer(read_only=True)
    to_user = UserSerializer(read_only=True)

    class Meta:
        model = Connection
        fields = ['id', 'from_user', 'to_user', 'status', 'created_at', 'updated_at']
