import csv
import io
import secrets
import unicodedata

from django.contrib.auth.password_validation import validate_password
from django.db import IntegrityError
from rest_framework import generics, permissions, viewsets, status
from rest_framework.decorators import action
from rest_framework.parsers import FormParser, MultiPartParser
from rest_framework.response import Response

from .models import Usuario
from .serializers import UsuarioSerializer, UsuarioCreateSerializer

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

COLUMNAS_CSV = {
    'username': {'usuario', 'username', 'user', 'nombre_usuario', 'nombre_de_usuario'},
    'first_name': {'nombre', 'first_name', 'nombres', 'primer_nombre'},
    'last_name': {'apellido', 'last_name', 'apellidos', 'primer_apellido'},
    'email': {'email', 'correo', 'correo_electronico', 'e-mail'},
    'telefono': {'telefono', 'teléfono', 'phone', 'celular'},
}


def generar_password_eclesiastica():
    return secrets.choice(PALABRAS_ECLESIASTICAS)


def normalizar_encabezado(valor):
    if not valor:
        return ''
    texto = unicodedata.normalize('NFKD', str(valor).strip().lower())
    texto = ''.join(c for c in texto if not unicodedata.combining(c))
    return texto.replace(' ', '_').replace('-', '_')


def mapear_encabezados(encabezados):
    campo_por_columna = {}
    for indice, encabezado in enumerate(encabezados):
        normalizado = normalizar_encabezado(encabezado)
        for campo, alias in COLUMNAS_CSV.items():
            if normalizado in alias:
                campo_por_columna[indice] = campo
                break
    return campo_por_columna


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
        if self.action == 'create':
            # Docentes pueden crear alumnos; admin puede crear cualquier usuario
            return [permissions.IsAuthenticated()]
        if self.action in ['update', 'partial_update', 'destroy']:
            # Solo admin puede editar/eliminar usuarios
            return [permissions.IsAuthenticated(), permissions.IsAdminUser()]
        return [permissions.IsAuthenticated()]
    
    def create(self, request, *args, **kwargs):
        """Crear usuario con contraseña eclesiástica generada automáticamente"""
        user = request.user
        if user.tipo == 'docente':
            tipo_solicitado = request.data.get('tipo')
            if tipo_solicitado != 'alumno':
                return Response(
                    {'detail': 'Solo puedes crear usuarios tipo alumno.'},
                    status=status.HTTP_403_FORBIDDEN
                )

        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        
        # Siempre generar contraseña eclesiástica automáticamente si no se proporciona una
        password_provided = bool(serializer.validated_data.get('password'))
        
        if not password_provided:
            # Generar contraseña sencilla con palabra eclesiástica
            # Seleccionar una palabra aleatoria (ya tiene primera letra mayúscula)
            password_generada = generar_password_eclesiastica()
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

    @action(
        detail=False,
        methods=['post'],
        url_path='importar-csv',
        parser_classes=[MultiPartParser, FormParser],
    )
    def importar_csv(self, request):
        """Importa usuarios desde CSV; todos se crean como tipo alumno."""
        user = request.user
        if not (user.es_docente or user.is_superuser):
            return Response(
                {'detail': 'No tienes permiso para importar usuarios.'},
                status=status.HTTP_403_FORBIDDEN,
            )

        archivo = request.FILES.get('archivo')
        if not archivo:
            return Response(
                {'error': 'Debe enviar un archivo CSV en el campo "archivo".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        nombre = (archivo.name or '').lower()
        if not nombre.endswith('.csv'):
            return Response(
                {'error': 'El archivo debe tener extensión .csv'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            contenido = archivo.read().decode('utf-8-sig')
        except UnicodeDecodeError:
            try:
                archivo.seek(0)
                contenido = archivo.read().decode('latin-1')
            except Exception:
                return Response(
                    {'error': 'No se pudo leer el archivo. Use codificación UTF-8.'},
                    status=status.HTTP_400_BAD_REQUEST,
                )

        lector = csv.reader(io.StringIO(contenido))
        try:
            filas = list(lector)
        except csv.Error:
            return Response(
                {'error': 'El archivo CSV no es válido.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not filas:
            return Response(
                {'error': 'El archivo CSV está vacío.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        encabezados = filas[0]
        campo_por_columna = mapear_encabezados(encabezados)
        if 'username' not in campo_por_columna.values():
            return Response(
                {
                    'error': (
                        'Falta la columna de usuario. Use "usuario" o "username" '
                        'en la primera fila.'
                    )
                },
                status=status.HTTP_400_BAD_REQUEST,
            )

        creados = []
        errores = []
        usernames_en_archivo = set()

        for numero_fila, fila in enumerate(filas[1:], start=2):
            if not fila or not any(str(celda).strip() for celda in fila):
                continue

            datos = {}
            for indice, celda in enumerate(fila):
                campo = campo_por_columna.get(indice)
                if campo:
                    datos[campo] = str(celda).strip()

            username = datos.get('username', '')
            if not username:
                errores.append({
                    'fila': numero_fila,
                    'mensaje': 'El nombre de usuario es obligatorio.',
                    'datos': datos,
                })
                continue

            username_lower = username.lower()
            if username_lower in usernames_en_archivo:
                errores.append({
                    'fila': numero_fila,
                    'mensaje': f'Usuario duplicado en el archivo: {username}',
                    'datos': datos,
                })
                continue
            usernames_en_archivo.add(username_lower)

            if Usuario.objects.filter(username__iexact=username).exists():
                errores.append({
                    'fila': numero_fila,
                    'mensaje': f'El usuario "{username}" ya existe en el sistema.',
                    'datos': datos,
                })
                continue

            password_generada = generar_password_eclesiastica()
            try:
                nuevo = Usuario(
                    username=username,
                    email=datos.get('email') or '',
                    first_name=datos.get('first_name') or '',
                    last_name=datos.get('last_name') or '',
                    telefono=datos.get('telefono') or '',
                    tipo='alumno',
                    debe_cambiar_password=True,
                )
                nuevo.set_password(password_generada)
                nuevo.save()
            except IntegrityError:
                errores.append({
                    'fila': numero_fila,
                    'mensaje': f'No se pudo crear el usuario "{username}".',
                    'datos': datos,
                })
                continue
            except Exception as exc:
                errores.append({
                    'fila': numero_fila,
                    'mensaje': str(exc),
                    'datos': datos,
                })
                continue

            creados.append({
                'fila': numero_fila,
                'username': nuevo.username,
                'first_name': nuevo.first_name,
                'last_name': nuevo.last_name,
                'email': nuevo.email,
                'telefono': nuevo.telefono,
                'password_generada': password_generada,
            })

        return Response({
            'mensaje': f'Se importaron {len(creados)} usuario(s) como alumnos.',
            'total_creados': len(creados),
            'total_errores': len(errores),
            'creados': creados,
            'errores': errores,
        }, status=status.HTTP_200_OK)
