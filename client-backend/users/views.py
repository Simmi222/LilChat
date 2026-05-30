from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated, AllowAny
from .models import User
from .serializers import UserSerializer, UserUpdateSerializer

def get_user_from_request(request):
    """Helper: get user from request.user or clerk_id fallback"""
    if request.user.is_authenticated:
        return request.user
    clerk_id = request.data.get('clerk_id') or request.query_params.get('clerk_id')
    if clerk_id:
        try:
            return User.objects.get(clerk_id=clerk_id)
        except User.DoesNotExist:
            pass
    return None

class UserViewSet(viewsets.ModelViewSet):
    queryset = User.objects.all()
    serializer_class = UserSerializer

    def get_permissions(self):
        return [AllowAny()]

    # GET + PUT + PATCH /api/users/me/
    @action(detail=False, methods=['get', 'put', 'patch'], permission_classes=[AllowAny])
    def me(self, request):
        user = get_user_from_request(request)
        if not user:
            return Response({'error': 'Authentication required'}, status=status.HTTP_401_UNAUTHORIZED)

        # GET → return profile
        if request.method == 'GET':
            serializer = self.get_serializer(user)
            return Response(serializer.data)

        # PUT / PATCH → update profile
        serializer = UserUpdateSerializer(user, data=request.data, partial=True)
        if serializer.is_valid():
            serializer.save()
            return Response(serializer.data)
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    # POST /api/users/sync/ - Sync Clerk user with Django (called after Clerk login)
    @action(detail=False, methods=['post'], permission_classes=[AllowAny])
    def sync(self, request):
        clerk_id = request.data.get('clerk_id')
        email = request.data.get('email')
        first_name = request.data.get('first_name', '')
        last_name = request.data.get('last_name', '')

        if not clerk_id or not email:
            return Response({'error': 'clerk_id and email required'}, status=status.HTTP_400_BAD_REQUEST)

        user, created = User.objects.get_or_create(
            clerk_id=clerk_id,
            defaults={
                'email': email,
                'first_name': first_name,
                'last_name': last_name,
                'username': email.split('@')[0]
            }
        )

        serializer = self.get_serializer(user)
        return Response(serializer.data, status=status.HTTP_201_CREATED if created else status.HTTP_200_OK)

    # GET /api/users/{id}/ - Get specific user profile
    def retrieve(self, request, pk=None):
        user = self.get_object()
        serializer = self.get_serializer(user)
        return Response(serializer.data)

    # GET /api/users/ - List all users (for discovery)
    def list(self, request):
        queryset = self.get_queryset()
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)

    # POST /api/users/{id}/follow/ - Follow a user
    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def follow(self, request, pk=None):
        current_user = get_user_from_request(request)
        if not current_user:
            return Response({'error': 'clerk_id required'}, status=status.HTTP_401_UNAUTHORIZED)
        user_to_follow = self.get_object()
        if current_user == user_to_follow:
            return Response({'error': 'Cannot follow yourself'}, status=status.HTTP_400_BAD_REQUEST)
        current_user.following.add(user_to_follow)
        return Response({'status': 'followed', 'followers_count': user_to_follow.followers.count()})

    # POST /api/users/{id}/unfollow/ - Unfollow a user
    @action(detail=True, methods=['post'], permission_classes=[AllowAny])
    def unfollow(self, request, pk=None):
        current_user = get_user_from_request(request)
        if not current_user:
            return Response({'error': 'clerk_id required'}, status=status.HTTP_401_UNAUTHORIZED)
        user_to_unfollow = self.get_object()
        current_user.following.remove(user_to_unfollow)
        return Response({'status': 'unfollowed', 'followers_count': user_to_unfollow.followers.count()})

    # GET /api/users/{id}/followers/ - Get followers list of a user
    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def followers(self, request, pk=None):
        user = self.get_object()
        followers_list = user.followers.all()
        serializer = self.get_serializer(followers_list, many=True)
        return Response(serializer.data)

    # GET /api/users/{id}/following/ - Get following list of a user
    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def following_list(self, request, pk=None):
        user = self.get_object()
        following = user.following.all()
        serializer = self.get_serializer(following, many=True)
        return Response(serializer.data)

    # GET /api/users/{id}/is_following/ - Check if current user follows this user
    @action(detail=True, methods=['get'], permission_classes=[AllowAny])
    def is_following(self, request, pk=None):
        current_user = get_user_from_request(request)
        target_user = self.get_object()
        if not current_user:
            return Response({'is_following': False})
        is_following = current_user.following.filter(id=target_user.id).exists()
        return Response({'is_following': is_following})