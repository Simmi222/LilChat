from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Q, Max, OuterRef, Subquery
from .models import Chat
from .serializers import ChatSerializer
from users.models import User


def get_user_from_request(request):
    """Get user from session or clerk_id fallback (for Clerk-based auth)"""
    if request.user.is_authenticated:
        return request.user
    clerk_id = (
        request.data.get('clerk_id')
        or request.query_params.get('clerk_id')
    )
    # Skip empty strings — frontend may send clerk_id='' when Clerk hasn't loaded
    if clerk_id and str(clerk_id).strip():
        try:
            return User.objects.get(clerk_id=str(clerk_id).strip())
        except User.DoesNotExist:
            pass
    return None


class ChatViewSet(viewsets.ModelViewSet):
    serializer_class = ChatSerializer
    permission_classes = [AllowAny]   # Auth handled manually via clerk_id

    def get_queryset(self):
        user = get_user_from_request(self.request)
        if not user:
            return Chat.objects.none()
        return Chat.objects.filter(
            Q(sender=user) | Q(receiver=user)
        ).select_related('sender', 'receiver', 'reply_to', 'reply_to__sender')

    def get_permissions(self):
        return [AllowAny()]

    def perform_create(self, serializer):
        sender = get_user_from_request(self.request)
        if not sender:
            from rest_framework.exceptions import ValidationError
            raise ValidationError('clerk_id required to send message')

        to_user_id  = self.request.data.get('to_user_id')
        text        = self.request.data.get('text', '')
        message_type = self.request.data.get('message_type', 'text')
        reply_to_id  = self.request.data.get('reply_to_id')

        try:
            receiver = User.objects.get(id=to_user_id)
        except User.DoesNotExist:
            from rest_framework.exceptions import ValidationError
            raise ValidationError('Receiver user not found')

        reply_to = None
        if reply_to_id:
            try:
                reply_to = Chat.objects.get(id=reply_to_id)
            except Chat.DoesNotExist:
                pass

        serializer.save(
            sender=sender,
            receiver=receiver,
            content=text,
            message_type=message_type,
            reply_to=reply_to,
        )

    # GET /api/chats/conversations/?clerk_id=xxx
    # Returns: list of users + last_message + unread_count per conversation
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def conversations(self, request):
        user = get_user_from_request(request)
        if not user:
            return Response([])

        # All users this user has chatted with
        sent_to      = Chat.objects.filter(sender=user).values_list('receiver', flat=True).distinct()
        received_from = Chat.objects.filter(receiver=user).values_list('sender', flat=True).distinct()
        user_ids = set(list(sent_to) + list(received_from))

        result = []
        for other_id in user_ids:
            try:
                other_user = User.objects.get(id=other_id)
            except User.DoesNotExist:
                continue

            # Last message between them
            last_msg = Chat.objects.filter(
                Q(sender=user, receiver_id=other_id)
                | Q(sender_id=other_id, receiver=user)
            ).order_by('-created_at').first()

            # Unread count (messages FROM other user that current user hasn't read)
            unread = Chat.objects.filter(
                sender_id=other_id, receiver=user, is_read=False
            ).count()

            result.append({
                'id':              other_user.id,
                'first_name':      other_user.first_name,
                'last_name':       other_user.last_name,
                'email':           other_user.email,
                'profile_picture': other_user.profile_picture,
                'bio':             other_user.bio,
                'last_message':    last_msg.content if last_msg else '',
                'last_message_at': last_msg.created_at.isoformat() if last_msg else None,
                'unread_count':    unread,
            })

        # Sort by most recent message first
        result.sort(key=lambda x: x['last_message_at'] or '', reverse=True)
        return Response(result)

    # GET /api/chats/with-user/?user_id=X&clerk_id=xxx
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def with_user(self, request):
        user = get_user_from_request(request)
        if not user:
            return Response(
                {'error': 'clerk_id required'},
                status=status.HTTP_401_UNAUTHORIZED
            )

        other_id = request.query_params.get('user_id')
        if not other_id:
            return Response(
                {'error': 'user_id required'},
                status=status.HTTP_400_BAD_REQUEST
            )

        chats = Chat.objects.filter(
            Q(sender=user, receiver_id=other_id)
            | Q(sender_id=other_id, receiver=user)
        ).select_related('sender', 'receiver', 'reply_to', 'reply_to__sender') \
         .order_by('created_at')

        # Mark incoming messages as read
        Chat.objects.filter(
            sender_id=other_id, receiver=user, is_read=False
        ).update(is_read=True)

        serializer = self.get_serializer(chats, many=True)
        return Response(serializer.data)

    # GET /api/chats/unread-count/?clerk_id=xxx
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def unread_count(self, request):
        user = get_user_from_request(request)
        if not user:
            return Response({'unread_count': 0})
        unread = Chat.objects.filter(receiver=user, is_read=False).count()
        return Response({'unread_count': unread})
