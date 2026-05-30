from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import StoryViewSet

router = SimpleRouter()
router.register(r'stories', StoryViewSet, basename='story')

urlpatterns = [
    path('', include(router.urls)),
]
