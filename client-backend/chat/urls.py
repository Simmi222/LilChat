from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import ChatViewSet, chatbot_view

router = SimpleRouter()
router.register(r'chats', ChatViewSet, basename='chat')

urlpatterns = [
    path('', include(router.urls)),
    path('chatbot/', chatbot_view, name='chatbot'),
]
