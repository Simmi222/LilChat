from django.db import models
from users.models import User

class Chat(models.Model):
    MESSAGE_TYPES = [
        ('text', 'Text'),
        ('image', 'Image'),
    ]
    sender   = models.ForeignKey(User, on_delete=models.CASCADE, related_name='sent_chats')
    receiver = models.ForeignKey(User, on_delete=models.CASCADE, related_name='received_chats')
    content  = models.TextField(blank=True, default='')
    message_type = models.CharField(max_length=10, choices=MESSAGE_TYPES, default='text')
    media_url    = models.URLField(blank=True, null=True)
    is_read      = models.BooleanField(default=False)
    # Reply-to: WhatsApp-style quoted reply
    reply_to = models.ForeignKey(
        'self', on_delete=models.SET_NULL,
        null=True, blank=True, related_name='replies'
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        db_table = 'chats'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.sender.email} -> {self.receiver.email}: {self.content[:30]}"
