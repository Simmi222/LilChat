from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.utils import timezone
from datetime import timedelta
from .models import Story
from .serializers import StorySerializer
from users.models import User

class StoryViewSet(viewsets.ModelViewSet):
    queryset = Story.objects.all()
    serializer_class = StorySerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action in ['list', 'retrieve', 'following', 'create', 'destroy']:
            return [AllowAny()]
        return super().get_permissions()

    def perform_create(self, serializer):
        # Get user from clerk_id if unauthenticated
        user = self.request.user
        if not user.is_authenticated:
            clerk_id = self.request.data.get('clerk_id')
            if clerk_id:
                try:
                    user = User.objects.get(clerk_id=clerk_id)
                except User.DoesNotExist:
                    from rest_framework.exceptions import ValidationError
                    raise ValidationError('User not found. Please sync your account first.')
            else:
                from rest_framework.exceptions import ValidationError
                raise ValidationError('clerk_id required for unauthenticated requests')

        expires_at = timezone.now() + timedelta(hours=24)

        # Handle both file uploads and data URLs for backward compatibility
        media_file = self.request.FILES.get('media')  # New: for file uploads
        media_url = self.request.data.get('media_url', '')  # Legacy: for data URLs
        media_type = self.request.data.get('media_type', 'text')
        background_color = self.request.data.get('background_color', '#4f46e5')
        content = self.request.data.get('content', '')

        serializer.save(
            user=user,
            expires_at=expires_at,
            media=media_file,  # New: file upload
            media_url=media_url,  # Legacy: data URLs
            media_type=media_type,
            background_color=background_color,
            content=content,
        )

    def destroy(self, request, *args, **kwargs):
        """Delete a story — verifies ownership via clerk_id query param"""
        story = self.get_object()
        # Try to get user from session or clerk_id query param
        user = request.user
        if not user.is_authenticated:
            clerk_id = request.query_params.get('clerk_id') or request.data.get('clerk_id')
            if clerk_id:
                try:
                    user = User.objects.get(clerk_id=clerk_id)
                except User.DoesNotExist:
                    return Response({'error': 'User not found'}, status=status.HTTP_404_NOT_FOUND)
            else:
                return Response({'error': 'clerk_id required'}, status=status.HTTP_401_UNAUTHORIZED)

        if story.user != user:
            return Response({'error': 'You can only delete your own stories'}, status=status.HTTP_403_FORBIDDEN)

        story.delete()
        return Response(status=status.HTTP_204_NO_CONTENT)

    # GET /api/stories/following/ - Get stories from following users + own stories
    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def following(self, request):
        now = timezone.now()
        if request.user.is_authenticated:
            following_users = request.user.following.all()
            stories = Story.objects.filter(
                user__in=list(following_users) + [request.user],
                expires_at__gt=now
            ).order_by('-created_at')
        else:
            # For unauthenticated users (clerk_id based), try to include own stories too
            clerk_id = request.query_params.get('clerk_id')
            if clerk_id:
                try:
                    current_user = User.objects.get(clerk_id=clerk_id)
                    following_users = current_user.following.all()
                    stories = Story.objects.filter(
                        user__in=list(following_users) + [current_user],
                        expires_at__gt=now
                    ).order_by('-created_at')
                except User.DoesNotExist:
                    stories = Story.objects.filter(expires_at__gt=now).order_by('-created_at')
            else:
                stories = Story.objects.filter(expires_at__gt=now).order_by('-created_at')

        serializer = self.get_serializer(stories, many=True)
        return Response(serializer.data)

    # POST /api/stories/{id}/view/ - Mark story as viewed
    @action(detail=True, methods=['post'])
    def view(self, request, pk=None):
        story = self.get_object()
        story.views.add(request.user)
        return Response({'status': 'viewed', 'views_count': story.views.count()})
