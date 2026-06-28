import os
from rest_framework import viewsets, status
from rest_framework.decorators import action, api_view, permission_classes
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

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def unread_count(self, request):
        user = get_user_from_request(request)
        if not user:
            return Response({'unread_count': 0})
        unread = Chat.objects.filter(receiver=user, is_read=False).count()
        return Response({'unread_count': unread})


SYSTEM_PROMPT = (
    "You are a helpful and friendly support assistant for lilChat — a social media app.\n"
    "lilChat features: posts, stories (24hr), direct messaging, connections (followers/following), "
    "discover people, dark/light mode, profile editing.\n"
    "Keep your answers short, friendly, and to the point. Use emojis occasionally.\n"
    "If asked something unrelated to lilChat or general tech/social media support, "
    "politely say you can only help with lilChat.\n"
    "Always respond in the same language the user writes in (Hindi or English)."
)


@api_view(['POST'])
@permission_classes([AllowAny])
def chatbot_view(request):
    """Proxy chatbot requests to Groq (LLaMA 3.3 70B) via direct HTTP request."""
    import requests as http_requests
    import traceback

    groq_api_key = os.environ.get('GROQ_API_KEY')
    if not groq_api_key:
        return Response(
            {'reply': '⚠️ AI is not configured on the server. Please contact admin.'},
            status=status.HTTP_503_SERVICE_UNAVAILABLE
        )

    user_message = request.data.get('message', '').strip()
    history = request.data.get('history', [])   # [{"role": "user"|"assistant", "content": "..."}]

    if not user_message:
        return Response({'reply': ''}, status=status.HTTP_400_BAD_REQUEST)

    try:
        # Build message list: system + trimmed history + current user message
        messages = [{'role': 'system', 'content': SYSTEM_PROMPT}]
        # Keep last 6 turns to stay within token limits
        for turn in history[-6:]:
            role = turn.get('role')
            content = turn.get('content', '')
            if role in ('user', 'assistant') and content:
                messages.append({'role': role, 'content': content})
        messages.append({'role': 'user', 'content': user_message})

        resp = http_requests.post(
            'https://api.groq.com/openai/v1/chat/completions',
            headers={
                'Authorization': f'Bearer {groq_api_key}',
                'Content-Type': 'application/json',
            },
            json={
                'model': 'llama-3.3-70b-versatile',
                'messages': messages,
                'temperature': 0.7,
                'max_tokens': 600,
            },
            timeout=30,
        )

        if resp.status_code == 429:
            return Response(
                {'reply': '🤖 Sorry, our AI is currently at maximum capacity! Please try again in a moment.'},
                status=status.HTTP_429_TOO_MANY_REQUESTS
            )

        if not resp.ok:
            print(f'[chatbot_view] Groq API error {resp.status_code}: {resp.text}')
            return Response(
                {'reply': '❌ Sorry, something went wrong. Please try again. 🙏'},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

        data = resp.json()
        reply = data['choices'][0]['message']['content']
        return Response({'reply': reply})

    except Exception as e:
        print(f'[chatbot_view] Exception: {e}')
        traceback.print_exc()
        return Response(
            {'reply': '❌ Sorry, something went wrong. Please try again. 🙏'},
            status=status.HTTP_500_INTERNAL_SERVER_ERROR
        )

