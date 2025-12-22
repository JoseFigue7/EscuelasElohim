from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.shortcuts import get_object_or_404
from django.db.models import Q

from .models import (
    Curso, Promocion, Tema, Material, Inscripcion, 
    Asistencia, Pregunta, Examen, RespuestaExamen, RecuperacionExamen,
    CalificacionExamen, PromedioPromocion, Diploma
)
from .serializers import (
    CursoSerializer, PromocionSerializer, TemaSerializer, TemaListSerializer,
    MaterialSerializer, InscripcionSerializer, AsistenciaSerializer,
    PreguntaSerializer, ExamenSerializer, ExamenListSerializer,
    RespuestaExamenSerializer, RecuperacionExamenSerializer,
    CalificacionExamenSerializer, PromedioPromocionSerializer, DiplomaSerializer
)


class CursoViewSet(viewsets.ModelViewSet):
    queryset = Curso.objects.all()
    serializer_class = CursoSerializer
    permission_classes = [IsAuthenticated]


class PromocionViewSet(viewsets.ModelViewSet):
    queryset = Promocion.objects.select_related('curso', 'docente').all()
    serializer_class = PromocionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Alumnos solo ven promociones donde están inscritos
        if user.es_alumno:
            inscripciones = Inscripcion.objects.filter(
                alumno=user, activa=True
            ).values_list('promocion_id', flat=True)
            queryset = queryset.filter(id__in=inscripciones, activa=True)
        
        # Docentes ven sus propias promociones
        elif user.es_docente and not user.is_superuser:
            queryset = queryset.filter(docente=user)
        
        return queryset


class TemaViewSet(viewsets.ModelViewSet):
    queryset = Tema.objects.select_related('curso').prefetch_related('materiales').all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return TemaListSerializer
        return TemaSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Alumnos solo ven temas de cursos de promociones donde están inscritos
        if user.es_alumno:
            inscripciones = Inscripcion.objects.filter(
                alumno=user, activa=True
            ).select_related('promocion__curso')
            curso_ids = [insc.promocion.curso_id for insc in inscripciones]
            queryset = queryset.filter(curso_id__in=curso_ids)
        
        # Filtrar por promoción: obtener el curso de la promoción
        promocion_id = self.request.query_params.get('promocion')
        if promocion_id:
            try:
                promocion = Promocion.objects.select_related('curso').get(id=promocion_id)
                queryset = queryset.filter(curso_id=promocion.curso_id)
            except Promocion.DoesNotExist:
                queryset = queryset.none()
        
        # Filtrar por curso si se proporciona directamente
        curso_id = self.request.query_params.get('curso')
        if curso_id:
            queryset = queryset.filter(curso_id=curso_id)
        
        return queryset


class MaterialViewSet(viewsets.ModelViewSet):
    queryset = Material.objects.select_related('tema', 'tema__curso').all()
    serializer_class = MaterialSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Alumnos solo ven materiales de temas de cursos donde están inscritos
        if user.es_alumno:
            inscripciones = Inscripcion.objects.filter(
                alumno=user, activa=True
            ).select_related('promocion__curso')
            curso_ids = [insc.promocion.curso_id for insc in inscripciones]
            queryset = queryset.filter(tema__curso_id__in=curso_ids)
        
        # Filtrar por tema si se proporciona
        tema_id = self.request.query_params.get('tema')
        if tema_id:
            queryset = queryset.filter(tema_id=tema_id)
        
        return queryset


class InscripcionViewSet(viewsets.ModelViewSet):
    queryset = Inscripcion.objects.select_related('alumno', 'promocion', 'promocion__curso').all()
    serializer_class = InscripcionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Alumnos solo ven sus propias inscripciones
        if user.es_alumno:
            queryset = queryset.filter(alumno=user)
        
        # Filtrar por promoción si se proporciona
        promocion_id = self.request.query_params.get('promocion')
        if promocion_id:
            queryset = queryset.filter(promocion_id=promocion_id)
        
        return queryset


class AsistenciaViewSet(viewsets.ModelViewSet):
    queryset = Asistencia.objects.select_related('inscripcion', 'inscripcion__alumno', 'tema').all()
    serializer_class = AsistenciaSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Alumnos solo ven sus propias asistencias
        if user.es_alumno:
            queryset = queryset.filter(inscripcion__alumno=user)
        
        # Filtrar por tema si se proporciona
        tema_id = self.request.query_params.get('tema')
        if tema_id:
            queryset = queryset.filter(tema_id=tema_id)
        
        return queryset


class PreguntaViewSet(viewsets.ModelViewSet):
    queryset = Pregunta.objects.select_related('tema').all()
    serializer_class = PreguntaSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        tema_id = self.request.query_params.get('tema')
        if tema_id:
            return self.queryset.filter(tema_id=tema_id)
        return self.queryset


class ExamenViewSet(viewsets.ModelViewSet):
    queryset = Examen.objects.select_related('tema', 'tema__curso').all()
    permission_classes = [IsAuthenticated]
    
    def get_serializer_class(self):
        if self.action == 'list':
            return ExamenListSerializer
        return ExamenSerializer
    
    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Alumnos solo ven exámenes de temas de cursos donde están inscritos
        if user.es_alumno:
            inscripciones = Inscripcion.objects.filter(
                alumno=user, activa=True
            ).select_related('promocion__curso')
            curso_ids = [insc.promocion.curso_id for insc in inscripciones]
            queryset = queryset.filter(tema__curso_id__in=curso_ids, activo=True)
        
        # Filtrar por tema si se proporciona
        tema_id = self.request.query_params.get('tema')
        if tema_id:
            queryset = queryset.filter(tema_id=tema_id)
        
        return queryset
    
    @action(detail=True, methods=['get'])
    def preguntas(self, request, pk=None):
        """Endpoint para obtener las preguntas aleatorias del examen para un estudiante"""
        examen = self.get_object()
        user = request.user
        
        if not user.es_alumno:
            return Response(
                {'error': 'Solo los alumnos pueden ver las preguntas del examen'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Verificar inscripción
        inscripcion = Inscripcion.objects.filter(
            alumno=user,
            promocion__curso=examen.tema.curso,
            activa=True
        ).first()
        
        if not inscripcion:
            return Response(
                {'error': 'No estás inscrito en una promoción de este curso'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        from django.utils import timezone
        ahora = timezone.now()
        
        # Verificar si hay una recuperación activa
        recuperacion_id = request.query_params.get('recuperacion_id')
        recuperacion = None
        if recuperacion_id:
            recuperacion = RecuperacionExamen.objects.filter(
                id=recuperacion_id,
                examen=examen,
                inscripcion=inscripcion,
                activa=True,
                completada=False
            ).first()
            
            if not recuperacion:
                return Response(
                    {'error': 'Recuperación no válida o no disponible'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Verificar fechas de recuperación
            if recuperacion.fecha_inicio and ahora < recuperacion.fecha_inicio:
                return Response(
                    {'error': 'La recuperación aún no está disponible'},
                    status=status.HTTP_403_FORBIDDEN
                )
            if recuperacion.fecha_fin and ahora > recuperacion.fecha_fin:
                return Response(
                    {'error': 'La recuperación ya expiró'},
                    status=status.HTTP_403_FORBIDDEN
                )
        else:
            # Examen normal - verificar fechas del examen
            if examen.fecha_inicio and ahora < examen.fecha_inicio:
                return Response(
                    {'error': 'El examen aún no está disponible'},
                    status=status.HTTP_403_FORBIDDEN
                )
            if examen.fecha_fin and ahora > examen.fecha_fin:
                return Response(
                    {'error': 'El examen ya expiró'},
                    status=status.HTTP_403_FORBIDDEN
                )
            
            # Verificar si ya tiene una calificación normal (sin recuperación)
            calificacion_normal = CalificacionExamen.objects.filter(
                examen=examen,
                inscripcion=inscripcion,
                recuperacion__isnull=True
            ).first()
            
            if calificacion_normal:
                return Response(
                    {'error': 'Ya has respondido este examen. Busca una recuperación si está disponible.'},
                    status=status.HTTP_403_FORBIDDEN
                )
        
        # Obtener preguntas aleatorias
        preguntas = examen.obtener_preguntas_aleatorias()
        
        if preguntas.count() < examen.numero_preguntas:
            return Response(
                {'error': f'No hay suficientes preguntas en el banco. Se requieren al menos {examen.numero_preguntas} preguntas'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from .serializers import PreguntaDetailSerializer
        serializer = PreguntaDetailSerializer(preguntas, many=True)
        
        # Verificar si hay una recuperación activa
        recuperacion_id = request.query_params.get('recuperacion_id')
        recuperacion = None
        if recuperacion_id:
            recuperacion = RecuperacionExamen.objects.filter(
                id=recuperacion_id,
                examen=examen,
                inscripcion=inscripcion,
                activa=True
            ).first()
        
        return Response({
            'examen_id': examen.id,
            'recuperacion_id': recuperacion.id if recuperacion else None,
            'preguntas': serializer.data,
            'numero_preguntas': examen.numero_preguntas,
            'puntos_por_pregunta': examen.puntos_por_pregunta,
            'puntaje_total': examen.puntaje_total,
            'tiempo_limite': examen.tiempo_limite,
        })
    
    @action(detail=True, methods=['post'])
    def responder(self, request, pk=None):
        """Endpoint para que un alumno responda un examen (normal o recuperación)"""
        examen = self.get_object()
        user = request.user
        recuperacion_id = request.data.get('recuperacion_id')  # Opcional, para recuperaciones
        
        if not user.es_alumno:
            return Response(
                {'error': 'Solo los alumnos pueden responder exámenes'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        # Verificar inscripción en una promoción del mismo curso
        inscripcion = Inscripcion.objects.filter(
            alumno=user,
            promocion__curso=examen.tema.curso,
            activa=True
        ).first()
        
        if not inscripcion:
            return Response(
                {'error': 'No estás inscrito en una promoción de este curso'},
                status=status.HTTP_403_FORBIDDEN
            )
        
        recuperacion = None
        if recuperacion_id:
            # Es una recuperación
            recuperacion = get_object_or_404(RecuperacionExamen, id=recuperacion_id, examen=examen, inscripcion=inscripcion)
            
            # Verificar que la recuperación esté activa y dentro de las fechas
            from django.utils import timezone
            ahora = timezone.now()
            if not recuperacion.activa:
                return Response({'error': 'Esta recuperación no está activa'}, status=status.HTTP_403_FORBIDDEN)
            if recuperacion.fecha_inicio and ahora < recuperacion.fecha_inicio:
                return Response({'error': 'La recuperación aún no está disponible'}, status=status.HTTP_403_FORBIDDEN)
            if recuperacion.fecha_fin and ahora > recuperacion.fecha_fin:
                return Response({'error': 'La recuperación ya expiró'}, status=status.HTTP_403_FORBIDDEN)
            
            # Verificar que no haya respondido ya esta recuperación
            calificacion_recuperacion = CalificacionExamen.objects.filter(
                examen=examen,
                inscripcion=inscripcion,
                recuperacion=recuperacion
            ).first()
            
            if calificacion_recuperacion:
                return Response(
                    {'error': 'Ya has respondido esta recuperación'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        else:
            # Es un examen normal
            # Verificar que no haya respondido ya el examen normal
            calificacion_normal = CalificacionExamen.objects.filter(
                examen=examen,
                inscripcion=inscripcion,
                recuperacion__isnull=True
            ).first()
            
            if calificacion_normal:
                return Response(
                    {'error': 'Ya has respondido este examen'},
                    status=status.HTTP_400_BAD_REQUEST
                )
        
        # Procesar respuestas
        respuestas_data = request.data.get('respuestas', [])
        
        if len(respuestas_data) != examen.numero_preguntas:
            return Response(
                {'error': f'Debes responder exactamente {examen.numero_preguntas} preguntas'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        puntos_totales_obtenidos = 0
        for respuesta_data in respuestas_data:
            pregunta_id = respuesta_data.get('pregunta_id')
            respuesta_dada = respuesta_data.get('respuesta', '')
            
            pregunta = get_object_or_404(Pregunta, id=pregunta_id, tema=examen.tema)
            
            # Verificar si la respuesta es correcta
            es_correcta = False
            if pregunta.tipo_pregunta == 'opcion_multiple':
                es_correcta = respuesta_dada.lower().strip() == pregunta.respuesta_correcta.lower().strip()
            elif pregunta.tipo_pregunta == 'verdadero_falso':
                es_correcta = respuesta_dada.lower().strip() == pregunta.respuesta_correcta.lower().strip()
            
            puntos_obtenidos = Decimal(examen.puntos_por_pregunta) if es_correcta else Decimal(0)
            puntos_totales_obtenidos += float(puntos_obtenidos)
            
            # Crear respuesta (con recuperación si aplica)
            RespuestaExamen.objects.create(
                examen=examen,
                inscripcion=inscripcion,
                pregunta=pregunta,
                recuperacion=recuperacion,
                respuesta_dada=respuesta_dada,
                es_correcta=es_correcta,
                puntos_obtenidos=puntos_obtenidos,
            )
        
        # Calcular calificación final
        from decimal import Decimal
        calificacion = CalificacionExamen.objects.create(
            examen=examen,
            inscripcion=inscripcion,
            recuperacion=recuperacion,
            puntaje_obtenido=Decimal(puntos_totales_obtenidos),
            puntaje_total=Decimal(examen.puntaje_total),
            porcentaje=Decimal((puntos_totales_obtenidos / examen.puntaje_total) * 100) if examen.puntaje_total > 0 else Decimal(0),
        )
        
        # Si es recuperación, marcarla como completada
        if recuperacion:
            recuperacion.completada = True
            recuperacion.save()
        
        serializer = CalificacionExamenSerializer(calificacion)
        return Response(serializer.data, status=status.HTTP_201_CREATED)


class RecuperacionExamenViewSet(viewsets.ModelViewSet):
    queryset = RecuperacionExamen.objects.select_related('examen', 'inscripcion', 'inscripcion__alumno').all()
    serializer_class = RecuperacionExamenSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Filtrar por examen si se proporciona
        examen_id = self.request.query_params.get('examen')
        if examen_id:
            queryset = queryset.filter(examen_id=examen_id)
        
        # Filtrar por inscripción si se proporciona
        inscripcion_id = self.request.query_params.get('inscripcion')
        if inscripcion_id:
            queryset = queryset.filter(inscripcion_id=inscripcion_id)
        
        # Alumnos solo ven sus propias recuperaciones
        if user.es_alumno:
            queryset = queryset.filter(inscripcion__alumno=user)
        
        return queryset
    
    def get_permissions(self):
        if self.action in ['create', 'update', 'partial_update', 'destroy']:
            # Solo docentes/admin pueden crear/editar recuperaciones
            from rest_framework.permissions import IsAuthenticated
            return [IsAuthenticated()]
        return [IsAuthenticated()]
    
    def perform_create(self, serializer):
        """Al crear una recuperación, validar que el usuario sea docente/admin"""
        user = self.request.user
        if not (user.es_docente or user.is_superuser):
            from rest_framework.exceptions import PermissionDenied
            raise PermissionDenied('Solo los docentes pueden crear recuperaciones')
        serializer.save()
    
    @action(detail=False, methods=['get'])
    def contar_por_inscripcion(self, request):
        """Cuenta las recuperaciones totales de una inscripción (para límites)"""
        inscripcion_id = request.query_params.get('inscripcion_id')
        if not inscripcion_id:
            return Response(
                {'error': 'inscripcion_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        inscripcion = get_object_or_404(Inscripcion, id=inscripcion_id)
        total_recuperaciones = RecuperacionExamen.objects.filter(
            inscripcion=inscripcion,
            examen__tema__curso=inscripcion.promocion.curso
        ).count()
        
        return Response({
            'inscripcion_id': inscripcion_id,
            'total_recuperaciones': total_recuperaciones
        })


class CalificacionExamenViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = CalificacionExamen.objects.select_related('examen', 'inscripcion', 'inscripcion__alumno').all()
    serializer_class = CalificacionExamenSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Alumnos solo ven sus propias calificaciones
        if user.es_alumno:
            queryset = queryset.filter(inscripcion__alumno=user)
        
        # Filtrar por examen si se proporciona
        examen_id = self.request.query_params.get('examen')
        if examen_id:
            queryset = queryset.filter(examen_id=examen_id)
        
        return queryset


class PromedioPromocionViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = PromedioPromocion.objects.select_related('inscripcion', 'inscripcion__alumno', 'inscripcion__promocion').all()
    serializer_class = PromedioPromocionSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Alumnos solo ven sus propios promedios
        if user.es_alumno:
            queryset = queryset.filter(inscripcion__alumno=user)
        
        # Filtrar por promoción si se proporciona
        promocion_id = self.request.query_params.get('promocion')
        if promocion_id:
            queryset = queryset.filter(inscripcion__promocion_id=promocion_id)
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def calcular_promedios(self, request):
        """Endpoint para calcular promedios de una promoción"""
        promocion_id = request.data.get('promocion_id')
        if not promocion_id:
            return Response(
                {'error': 'promocion_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from .models import Inscripcion
        inscripciones = Inscripcion.objects.filter(promocion_id=promocion_id, activa=True)
        
        for inscripcion in inscripciones:
            promedio, created = PromedioPromocion.objects.get_or_create(
                inscripcion=inscripcion
            )
            promedio.calcular_promedio()
        
        return Response({'mensaje': 'Promedios calculados correctamente'})


class DiplomaViewSet(viewsets.ModelViewSet):
    queryset = Diploma.objects.select_related('inscripcion', 'inscripcion__alumno', 'inscripcion__promocion').all()
    serializer_class = DiplomaSerializer
    permission_classes = [IsAuthenticated]
    
    def get_queryset(self):
        user = self.request.user
        queryset = super().get_queryset()
        
        # Alumnos solo ven sus propios diplomas
        if user.es_alumno:
            queryset = queryset.filter(inscripcion__alumno=user)
        
        return queryset
    
    @action(detail=False, methods=['post'])
    def generar_diplomas(self, request):
        """Endpoint para generar diplomas para estudiantes aprobados de una promoción"""
        promocion_id = request.data.get('promocion_id')
        if not promocion_id:
            return Response(
                {'error': 'promocion_id es requerido'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        from .models import Inscripcion
        # Obtener inscripciones con promedio aprobado (>= 80%)
        promedios = PromedioPromocion.objects.filter(
            inscripcion__promocion_id=promocion_id,
            aprobado=True
        )
        
        diplomas_creados = []
        for promedio in promedios:
            # Verificar si ya tiene diploma
            diploma, created = Diploma.objects.get_or_create(
                inscripcion=promedio.inscripcion,
                defaults={'activo': True}
            )
            if created:
                diplomas_creados.append({
                    'alumno': f"{promedio.inscripcion.alumno.get_full_name() or promedio.inscripcion.alumno.username}",
                    'codigo': diploma.codigo_diploma
                })
        
        return Response({
            'mensaje': f'Diplomas generados: {len(diplomas_creados)}',
            'diplomas': diplomas_creados
        })

