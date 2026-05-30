from django.urls import path, include
from rest_framework.routers import SimpleRouter
from .views import ConnectionViewSet

router = SimpleRouter()
router.register(r'connections', ConnectionViewSet, basename='connection')

urlpatterns = [
    path('', include(router.urls)),
]
