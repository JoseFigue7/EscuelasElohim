from rest_framework import generics, permissions, viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.contrib.auth.password_validation import validate_password
from .models import Usuario
from .serializers import UsuarioSerializer, UsuarioCreateSerializer
import secrets

# Lista de palabras eclesiásticas para generar contraseñas sencillas
# Todas con primera letra mayúscula para facilitar su uso
PALABRAS_ECLESIASTICAS = [
    'Aguila', 'Apostol', 'Pastor', 'Oveja', 'Cordero', 'Paloma', 'Cruz',
    'Biblia', 'Fe', 'Amor', 'Paz', 'Gracia', 'Misericordia', 'Alabanza',
    'Adoracion', 'Oracion', 'Cantico', 'Salmo', 'Profeta', 'Sacerdote',
    'Discipulo', 'Servidor', 'Siervo', 'Mensajero', 'Angel', 'Espiritu',
    'Bautismo', 'Comunion', 'Iglesia', 'Altar', 'Templo', 'Cristo', 'Dios',
    'Senor', 'Redentor', 'Salvador', 'Rey', 'Maestro', 'Sanctus', 'Aleluya',
    'Esperanza', 'Caridad', 'Humildad', 'Sabiduria', 'Verdad', 'Luz', 'Vida',
    'Eterno', 'Santo', 'Sagrado', 'Bendicion', 'Promesa', 'Alianza', 'Pacto'
]


class ProfileView(generics.RetrieveUpdateAPIView):
    """Vista para obtener y actualizar el perfil del usuario autenticado"""
    serializer_class = UsuarioSerializer
    permission_classes = [permissions.IsAuthenticated]
    
    def get_object(self):
        return self.request.user


class UsuarioViewSet(viewsets.ModelViewSet):
    """ViewSet para gestionar usuarios (solo para docentes/admin)"""
    queryset = Usuario.objects.all()
    permission_classes = [permissions.IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'create':
            return UsuarioCreateSerializer
        return UsuarioSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Solo docentes y admin pueden ver usuarios
        if not (user.es_docente or user.is_superuser):
            return queryset.none()
        
        # Filtrar por tipo si se especifica
        tipo = self.request.query_params.get('tipo')
        if tipo:
            queryset = queryset.filter(tipo=tipo)
        
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # Solo admin puede crear/editar usuarios
            return [permissions.IsAuthenticated(), permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]
    
    def create(self, request, *args, **kwargs):
        """Crear usuario con contraseña eclesiástica generada automáticamente"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Siempre generar contraseña eclesiástica automáticamente si no se proporciona una
        password_provided = bool(serializer.validated_data.get('password'))
        
        if not password_provided:
            # Generar contraseña sencilla con palabra eclesiástica
            # Seleccionar una palabra aleatoria (ya tiene primera letra mayúscula)
            password_generada = secrets.choice(PALABRAS_ECLESIASTICAS)
            serializer.validated_data['password'] = password_generada
        else:
            # Si se proporciona una contraseña, usarla (para casos especiales)
            password_generada = serializer.validated_data['password']
        
        # Establecer que debe cambiar contraseña
        serializer.validated_data['debe_cambiar_password'] = True
        
        user = serializer.save()
        user.set_password(serializer.validated_data['password'])
        user.save()
        
        # Retornar respuesta siempre con la contraseña generada (sin encriptar)
        headers = self.get_success_headers(serializer.data)
        response_data = UsuarioSerializer(user).data
        response_data['password_generada'] = password_generada
        response_data['mensaje'] = 'Usuario creado con contraseña generada automáticamente'
        
        return Response(response_data, status=status.HTTP_201_CREATED, headers=headers)
    
    @action(detail=False, methods=['post'])
    def cambiar_password(self, request):
        """Endpoint para cambiar contraseña (uso del usuario)"""
        user = request.user
        password_actual = request.data.get('password_actual')
        password_nueva = request.data.get('password_nueva')
        password_nueva_confirm = request.data.get('password_nueva_confirm')
        
        if not password_actual or not password_nueva or not password_nueva_confirm:
            return Response(
                {'error': 'Todos los campos son requeridos'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if password_nueva != password_nueva_confirm:
            return Response(
                {'error': 'Las contraseñas nuevas no coinciden'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if not user.check_password(password_actual):
            return Response(
                {'error': 'Contraseña actual incorrecta'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            validate_password(password_nueva, user)
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        user.set_password(password_nueva)
        user.debe_cambiar_password = False
        user.save()
        
        return Response({'mensaje': 'Contraseña actualizada correctamente'})
