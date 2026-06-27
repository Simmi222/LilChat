from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from django.db.models import Case, When, IntegerField, Value, F
from django.db import transaction
from .models import Post, Comment
from .serializers import PostSerializer, CommentSerializer
from users.models import User


def get_user_from_request(request):
    """Helper: get user from session or clerk_id fallback"""
    if request.user.is_authenticated:
        return request.user
    clerk_id = request.data.get('clerk_id') or request.query_params.get('clerk_id')
    if clerk_id:
        try:
            return User.objects.get(clerk_id=clerk_id)
        except User.DoesNotExist:
            pass
    return None


def ordered_feed(queryset, current_user):
    """
    Custom Feed Ordering Logic:
    - Posts NOT liked by current_user  => shown FIRST
    - Posts liked by current_user      => pushed LAST
    - Within each group, newest posts come first (-created_at)

    .distinct() is required because the ManyToMany likes JOIN
    can create duplicate rows for posts liked by the current user.
    """
    if current_user:
        queryset = queryset.annotate(
            is_liked_rank=Case(
                When(likes=current_user, then=Value(1)),
                default=Value(0),
                output_field=IntegerField(),
            )
        ).order_by('is_liked_rank', '-created_at').distinct()
    else:
        queryset = queryset.order_by('-created_at')
    return queryset


class PostViewSet(viewsets.ModelViewSet):
    queryset = Post.objects.all()
    serializer_class = PostSerializer
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        safe_actions = [
            'list', 'retrieve', 'feed', 'create',
            'comments', 'create_comment', 'like', 'unlike',
            'delete_post', 'delete_comment',
        ]
        if self.action in safe_actions:
            return [AllowAny()]
        return super().get_permissions()

    def get_object(self):
        """
        Override to bypass the annotated queryset.
        The ManyToMany 'likes' annotation in get_queryset() creates duplicate
        rows via JOIN, which breaks get_object_or_404's .get() call.
        Fetching directly by PK avoids this entirely.
        """
        pk = self.kwargs.get(self.lookup_field)
        try:
            obj = Post.objects.get(pk=pk)
        except Post.DoesNotExist:
            from rest_framework.exceptions import NotFound
            raise NotFound('Post not found.')
        self.check_object_permissions(self.request, obj)
        return obj

    def get_queryset(self):
        current_user = get_user_from_request(self.request)
        queryset = Post.objects.all()
        user_id = self.request.query_params.get('user')
        if user_id:
            queryset = queryset.filter(user__id=user_id)
            return queryset.order_by('-created_at')
        return ordered_feed(queryset, current_user)

    def perform_create(self, serializer):
        user = get_user_from_request(self.request)
        if not user:
            from rest_framework.exceptions import ValidationError
            raise ValidationError('clerk_id required')
        serializer.save(user=user)

    @action(detail=True, methods=['post'])
    def like(self, request, pk=None):
        post = self.get_object()
        user = get_user_from_request(request)
        if not user:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        if post.likes.filter(id=user.id).exists():
            return Response({'error': 'Already liked'}, status=status.HTTP_400_BAD_REQUEST)
        with transaction.atomic():
            post.likes.add(user)
            # F() ensures database does the increment atomically — no race condition
            Post.objects.filter(pk=post.pk).update(likes_count=F('likes_count') + 1)
            post.refresh_from_db()
        return Response({'status': 'liked', 'likes_count': post.likes_count})

    @action(detail=True, methods=['post'])
    def unlike(self, request, pk=None):
        post = self.get_object()
        user = get_user_from_request(request)
        if not user:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        with transaction.atomic():
            post.likes.remove(user)
            # F() ensures database does the decrement atomically — no race condition
            Post.objects.filter(pk=post.pk).update(likes_count=F('likes_count') - 1)
            post.refresh_from_db()
        return Response({'status': 'unliked', 'likes_count': post.likes_count})

    @action(detail=False, methods=['get'], permission_classes=[AllowAny])
    def feed(self, request):
        current_user = get_user_from_request(request)
        if request.user.is_authenticated:
            following_users = request.user.following.all()
            base_qs = Post.objects.filter(user__in=following_users)
        elif current_user:
            following_users = current_user.following.all()
            base_qs = Post.objects.filter(user__in=list(following_users) + [current_user])
        else:
            base_qs = Post.objects.all()
        posts = ordered_feed(base_qs, current_user)[:20]
        serializer = self.get_serializer(posts, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def comments(self, request, pk=None):
        post = self.get_object()
        comments = post.comments.all().order_by('created_at')
        serializer = CommentSerializer(comments, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'], permission_classes=[AllowAny], url_path='comments/create')
    def create_comment(self, request, pk=None):
        post = self.get_object()
        user = get_user_from_request(request)
        if not user:
            return Response({'error': 'clerk_id required'}, status=status.HTTP_401_UNAUTHORIZED)
        serializer = CommentSerializer(data={'content': request.data.get('content', ''), 'post': post.id})
        if serializer.is_valid():
            serializer.save(user=user, post=post)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['delete'], permission_classes=[AllowAny], url_path='delete_post')
    def delete_post(self, request, pk=None):
        post = self.get_object()
        user = get_user_from_request(request)
        if not user:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        if post.user != user:
            return Response({'error': 'You can only delete your own posts'}, status=status.HTTP_403_FORBIDDEN)
        post.delete()
        return Response({'status': 'deleted'}, status=status.HTTP_200_OK)

    @action(detail=True, methods=['delete'], permission_classes=[AllowAny], url_path='delete_comment/(?P<comment_id>[^/.]+)')
    def delete_comment(self, request, pk=None, comment_id=None):
        post = self.get_object()
        user = get_user_from_request(request)
        if not user:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)
        try:
            comment = Comment.objects.get(id=comment_id, post=post)
        except Comment.DoesNotExist:
            return Response({'error': 'Comment not found'}, status=status.HTTP_404_NOT_FOUND)

        is_post_owner    = (post.user == user)
        is_comment_owner = (comment.user == user)

        if not is_post_owner and not is_comment_owner:
            return Response({'error': 'Permission denied'}, status=status.HTTP_403_FORBIDDEN)

        comment.delete()
        return Response({'status': 'deleted'}, status=status.HTTP_200_OK)


class CommentViewSet(viewsets.ModelViewSet):
    queryset = Comment.objects.all()
    serializer_class = CommentSerializer
    permission_classes = [AllowAny]

    def perform_create(self, serializer):
        user = get_user_from_request(self.request)
        if not user:
            from rest_framework.exceptions import ValidationError
            raise ValidationError('clerk_id required')
        serializer.save(user=user)
