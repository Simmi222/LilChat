from django.db import models


class ContactMessage(models.Model):
    name = models.CharField(max_length=200, blank=True, default='')
    email = models.EmailField(blank=True, default='')
    subject = models.CharField(max_length=300)
    message = models.TextField()
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        db_table = 'contact_messages'
        ordering = ['-created_at']

    def __str__(self):
        return f"{self.email} — {self.subject[:50]}"
