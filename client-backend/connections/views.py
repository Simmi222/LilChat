from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db import models
from django.db.models import Q
from .models import Connection
from .serializers import ConnectionSerializer
from users.models import User
from users.serializers import UserSerializer

class ConnectionViewSet(viewsets.ModelViewSet):
    serializer_class = ConnectionSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        user = self.request.user
        if user.is_authenticated:
            return Connection.objects.filter(from_user=user) | Connection.objects.filter(to_user=user)
        return Connection.objects.none()
    
    def get_permissions(self):
        if self.action in ['list', 'retrieve']:
            return [AllowAny()]
        return super().get_permissions()

    # POST /api/connections/send-request/ - Send connection request
    @action(detail=False, methods=['post'])
    def send_request(self, request):
        to_user_id = request.data.get('to_user_id')
        
        if not to_user_id:
            return Response({'error': 'to_user_id required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            to_user = User.objects.get(id=to_user_id)
        except User.DoesNotExist:
            return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
        
        if to_user == request.user:
            return Response({'error': 'Cannot send request to yourself'}, status=status.HTTP_400_BAD_REQUEST)
        
        connection, created = Connection.objects.get_or_create(
            from_user=request.user,
            to_user=to_user,
            defaults={'status': 'pending'}
        )
        
        if not created and connection.status == 'pending':
            return Response({'error': 'Request already sent'}, status=status.HTTP_400_BAD_REQUEST)
        
        serializer = self.get_serializer(connection)
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    # POST /api/connections/{id}/accept/ - Accept connection request
    @action(detail=True, methods=['post'])
    def accept(self, request, pk=None):
        connection = self.get_object()
        
        if connection.to_user != request.user:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        if connection.status != 'pending':
            return Response({'error': 'Connection already processed'}, status=status.HTTP_400_BAD_REQUEST)
        
        connection.status = 'accepted'
        connection.save()
        
        # Also add follow relationship
        request.user.following.add(connection.from_user)
        connection.from_user.following.add(request.user)
        
        serializer = self.get_serializer(connection)
        return Response(serializer.data)

    # POST /api/connections/{id}/reject/ - Reject connection request
    @action(detail=True, methods=['post'])
    def reject(self, request, pk=None):
        connection = self.get_object()
        
        if connection.to_user != request.user:
            return Response({'error': 'Not authorized'}, status=status.HTTP_403_FORBIDDEN)
        
        connection.status = 'rejected'
        connection.save()
        serializer = self.get_serializer(connection)
        return Response(serializer.data)

    # GET /api/connections/pending/ - Get pending connection requests
    @action(detail=False, methods=['get'])
    def pending(self, request):
        connections = Connection.objects.filter(to_user=request.user, status='pending')
        serializer = self.get_serializer(connections, many=True)
        return Response(serializer.data)

    # GET /api/connections/accepted/ - Get accepted connections
    @action(detail=False, methods=['get'])
    def accepted(self, request):
        connections = Connection.objects.filter(status='accepted').filter(
            Q(from_user=request.user) | Q(to_user=request.user)
        )
        serializer = self.get_serializer(connections, many=True)
        return Response(serializer.data)
