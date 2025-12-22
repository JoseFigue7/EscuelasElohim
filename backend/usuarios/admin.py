from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin
from .models import Usuario


@admin.register(Usuario)
class UsuarioAdmin(BaseUserAdmin):
    list_display = ('username', 'email', 'get_full_name', 'tipo', 'activo', 'fecha_creacion')
    list_filter = ('tipo', 'activo', 'is_staff', 'is_superuser')
    search_fields = ('username', 'email', 'first_name', 'last_name')
    
    fieldsets = BaseUserAdmin.fieldsets + (
        ('Información Adicional', {
            'fields': ('tipo', 'telefono', 'fecha_nacimiento', 'direccion', 'activo')
        }),
    )
    
    add_fieldsets = BaseUserAdmin.add_fieldsets + (
        ('Información Adicional', {
            'fields': ('tipo', 'telefono', 'fecha_nacimiento', 'direccion', 'activo')
        }),
    )


