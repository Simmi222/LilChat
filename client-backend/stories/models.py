from django.db import models
from users.models import User

def story_media_upload_path(instance, filename):
    """Generate upload path for story media files"""
    return f'stories/{instance.user.id}/{filename}'

class Story(models.Model):
    MEDIA_TYPES = [
        ('text', 'Text'),
        ('image', 'Image'),
        ('video', 'Video'),
    ]
    
    user = models.ForeignKey(User, on_delete=models.CASCADE, related_name='stories')
    content = models.TextField(null=True, blank=True)
    media = models.FileField(upload_to=story_media_upload_path, null=True, blank=True)
    media_url = models.TextField(null=True, blank=True)
    media_type = models.CharField(max_length=10, choices=MEDIA_TYPES, default='text')
    background_color = models.CharField(max_length=7, default='#4f46e5')
    views = models.ManyToManyField(User, related_name='viewed_stories', blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)
    expires_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        db_table = 'stories'
        ordering = ['-created_at']
    
    def __str__(self):
        return f"{self.user.email} - Story"
