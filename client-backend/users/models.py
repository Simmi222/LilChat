from django.db import models
from django.contrib.auth.models import AbstractUser

class User(AbstractUser):
    clerk_id = models.CharField(max_length=255, unique=True)  # Clerk user ID
    bio = models.TextField(blank=True, null=True)
    profile_picture = models.TextField(blank=True, null=True)  # stores base64 or URL
    cover_photo = models.TextField(blank=True, null=True)  # stores base64 or URL
    location = models.CharField(max_length=255, blank=True, null=True)
    is_verified = models.BooleanField(default=False)
    followers = models.ManyToManyField('self', symmetrical=False, related_name='following', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'users'
    
    def __str__(self):
        return self.email 
    