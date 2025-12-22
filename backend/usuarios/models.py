from django.contrib.auth.models import AbstractUser
from django.db import models


class Usuario(AbstractUser):
    """Modelo de usuario personalizado"""
    TIPO_CHOICES = [
        ('alumno', 'Alumno'),
        ('docente', 'Docente'),
        ('admin', 'Administrador'),
    ]
    
    tipo = models.CharField(max_length=20, choices=TIPO_CHOICES, default='alumno')
    telefono = models.CharField(max_length=20, blank=True, null=True)
    fecha_nacimiento = models.DateField(blank=True, null=True)
    direccion = models.TextField(blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    activo = models.BooleanField(default=True)
    debe_cambiar_password = models.BooleanField(default=False, help_text='Forzar cambio de contraseña en próximo login')
    
    class Meta:
        verbose_name = 'Usuario'
        verbose_name_plural = 'Usuarios'
        ordering = ['-fecha_creacion']
    
    def __str__(self):
        return f"{self.get_full_name() or self.username} ({self.get_tipo_display()})"
    
    @property
    def es_docente(self):
        return self.tipo in ['docente', 'admin']
    
    @property
    def es_alumno(self):
        return self.tipo == 'alumno'

