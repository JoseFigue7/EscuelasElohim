from rest_framework import serializers
from .models import (
    Curso, Promocion, Tema, Material, Inscripcion, 
    Asistencia, Pregunta, Examen, RespuestaExamen, RecuperacionExamen,
    CalificacionExamen, PromedioPromocion, Diploma
)
from usuarios.serializers import UsuarioSerializer


class CursoSerializer(serializers.ModelSerializer):
    class Meta:
        model = Curso
        fields = '__all__'


class PromocionSerializer(serializers.ModelSerializer):
    curso_nombre = serializers.CharField(source='curso.nombre', read_only=True)
    docente_nombre = serializers.SerializerMethodField()
    
    class Meta:
        model = Promocion
        fields = '__all__'
    
    def get_docente_nombre(self, obj):
        if obj.docente:
            return f"{obj.docente.get_full_name() or obj.docente.username}"
        return None


class MaterialSerializer(serializers.ModelSerializer):
    class Meta:
        model = Material
        fields = '__all__'
        read_only_fields = ['fecha_creacion']


class TemaSerializer(serializers.ModelSerializer):
    materiales = MaterialSerializer(many=True, read_only=True)
    curso_nombre = serializers.CharField(source='curso.nombre', read_only=True)
    
    class Meta:
        model = Tema
        fields = '__all__'
        read_only_fields = ['fecha_creacion', 'fecha_actualizacion']


class TemaListSerializer(serializers.ModelSerializer):
    curso_nombre = serializers.CharField(source='curso.nombre', read_only=True)
    
    class Meta:
        model = Tema
        fields = ['id', 'numero_tema', 'titulo', 'descripcion', 'fecha_clase', 'curso_nombre']


class InscripcionSerializer(serializers.ModelSerializer):
    alumno_nombre = serializers.SerializerMethodField()
    promocion_nombre = serializers.CharField(source='promocion.nombre', read_only=True)
    curso_nombre = serializers.CharField(source='promocion.curso.nombre', read_only=True)
    
    class Meta:
        model = Inscripcion
        fields = '__all__'
        read_only_fields = ['fecha_inscripcion']
    
    def get_alumno_nombre(self, obj):
        return f"{obj.alumno.get_full_name() or obj.alumno.username}"


class AsistenciaSerializer(serializers.ModelSerializer):
    alumno_nombre = serializers.SerializerMethodField()
    tema_titulo = serializers.CharField(source='tema.titulo', read_only=True)
    
    class Meta:
        model = Asistencia
        fields = '__all__'
        read_only_fields = ['fecha_registro', 'fecha_actualizacion']
    
    def get_alumno_nombre(self, obj):
        return f"{obj.inscripcion.alumno.get_full_name() or obj.inscripcion.alumno.username}"


class PreguntaSerializer(serializers.ModelSerializer):
    class Meta:
        model = Pregunta
        fields = '__all__'
        read_only_fields = ['fecha_creacion']


class PreguntaDetailSerializer(serializers.ModelSerializer):
    """Serializer para mostrar preguntas en exámenes (sin respuesta correcta)"""
    class Meta:
        model = Pregunta
        exclude = ['respuesta_correcta', 'fecha_creacion']


class ExamenSerializer(serializers.ModelSerializer):
    tema_titulo = serializers.CharField(source='tema.titulo', read_only=True)
    tema_id = serializers.IntegerField(source='tema.id', read_only=True)
    curso_nombre = serializers.CharField(source='tema.curso.nombre', read_only=True)
    cantidad_preguntas_disponibles = serializers.SerializerMethodField()
    puntaje_total = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = Examen
        fields = '__all__'
        read_only_fields = ['fecha_creacion', 'fecha_actualizacion', 'puntaje_total']
    
    def get_cantidad_preguntas_disponibles(self, obj):
        """Retorna la cantidad de preguntas disponibles en el banco del tema"""
        return obj.tema.preguntas.count()


class ExamenListSerializer(serializers.ModelSerializer):
    tema_titulo = serializers.CharField(source='tema.titulo', read_only=True)
    curso_nombre = serializers.CharField(source='tema.curso.nombre', read_only=True)
    cantidad_preguntas_disponibles = serializers.SerializerMethodField()
    
    class Meta:
        model = Examen
        fields = ['id', 'titulo', 'descripcion', 'tema_titulo', 'curso_nombre', 
                  'numero_preguntas', 'puntos_por_pregunta', 'fecha_inicio', 'fecha_fin', 
                  'activo', 'cantidad_preguntas_disponibles']
    
    def get_cantidad_preguntas_disponibles(self, obj):
        """Retorna la cantidad de preguntas disponibles en el banco del tema"""
        return obj.tema.preguntas.count()


class RespuestaExamenSerializer(serializers.ModelSerializer):
    pregunta_texto = serializers.CharField(source='pregunta.pregunta_texto', read_only=True)
    
    class Meta:
        model = RespuestaExamen
        fields = '__all__'
        read_only_fields = ['es_correcta', 'puntos_obtenidos', 'fecha_respuesta']


class RecuperacionExamenSerializer(serializers.ModelSerializer):
    examen_titulo = serializers.CharField(source='examen.tema.titulo', read_only=True)
    alumno_nombre = serializers.SerializerMethodField()
    numero_recuperacion = serializers.IntegerField(read_only=True)
    
    class Meta:
        model = RecuperacionExamen
        fields = '__all__'
        read_only_fields = ['fecha_creacion']
    
    def get_alumno_nombre(self, obj):
        return f"{obj.inscripcion.alumno.get_full_name() or obj.inscripcion.alumno.username}"
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['numero_recuperacion'] = instance.numero_recuperacion
        return data


class RecuperacionExamenBulkCreateSerializer(serializers.Serializer):
    """Serializer para crear múltiples recuperaciones a la vez"""
    from .models import Examen, Inscripcion
    
    examen = serializers.PrimaryKeyRelatedField(queryset=Examen.objects.all())
    inscripciones = serializers.ListField(
        child=serializers.PrimaryKeyRelatedField(queryset=Inscripcion.objects.all()),
        min_length=1,
        help_text='Lista de IDs de inscripciones'
    )
    fecha_inicio = serializers.DateTimeField()
    fecha_fin = serializers.DateTimeField()
    activa = serializers.BooleanField(default=True)
    
    def validate_inscripciones(self, value):
        """Validar que las inscripciones sean válidas y únicas"""
        if not value:
            raise serializers.ValidationError("Debe seleccionar al menos una inscripción")
        # Eliminar duplicados manteniendo el orden
        seen = set()
        unique_value = []
        for item in value:
            item_id = item.id if hasattr(item, 'id') else item
            if item_id not in seen:
                seen.add(item_id)
                unique_value.append(item)
        value = unique_value
        # Verificar que todas las inscripciones pertenezcan al mismo curso
        if len(value) > 1:
            # value ya contiene objetos Inscripcion
            cursos = set(insc.promocion.curso_id for insc in value)
            if len(cursos) > 1:
                raise serializers.ValidationError("Todas las inscripciones deben ser del mismo curso")
        return value
    
    def validate(self, attrs):
        """Validar que las fechas sean correctas"""
        if attrs['fecha_inicio'] >= attrs['fecha_fin']:
            raise serializers.ValidationError("La fecha de fin debe ser posterior a la fecha de inicio")
        return attrs
    
    def create(self, validated_data):
        """Crear múltiples recuperaciones"""
        from .models import RecuperacionExamen
        examen = validated_data['examen']
        inscripciones = validated_data['inscripciones']
        fecha_inicio = validated_data['fecha_inicio']
        fecha_fin = validated_data['fecha_fin']
        activa = validated_data.get('activa', True)
        
        recuperaciones = []
        for inscripcion in inscripciones:
            recuperacion = RecuperacionExamen.objects.create(
                examen=examen,
                inscripcion=inscripcion,
                fecha_inicio=fecha_inicio,
                fecha_fin=fecha_fin,
                activa=activa
            )
            recuperaciones.append(recuperacion)
        
        return recuperaciones


class CalificacionExamenSerializer(serializers.ModelSerializer):
    examen_titulo = serializers.CharField(source='examen.titulo', read_only=True)
    alumno_nombre = serializers.SerializerMethodField()
    
    class Meta:
        model = CalificacionExamen
        fields = '__all__'
        read_only_fields = ['porcentaje', 'fecha_completado', 'fecha_actualizacion']
    
    def get_alumno_nombre(self, obj):
        return f"{obj.inscripcion.alumno.get_full_name() or obj.inscripcion.alumno.username}"
    
    def to_representation(self, instance):
        data = super().to_representation(instance)
        data['aprobado'] = instance.aprobado
        data['es_recuperacion'] = instance.es_recuperacion
        return data


class PromedioPromocionSerializer(serializers.ModelSerializer):
    alumno_nombre = serializers.SerializerMethodField()
    promocion_nombre = serializers.CharField(source='inscripcion.promocion.nombre', read_only=True)
    curso_nombre = serializers.CharField(source='inscripcion.promocion.curso.nombre', read_only=True)
    
    class Meta:
        model = PromedioPromocion
        fields = '__all__'
        read_only_fields = ['promedio_final', 'aprobado', 'fecha_calculo']
    
    def get_alumno_nombre(self, obj):
        return f"{obj.inscripcion.alumno.get_full_name() or obj.inscripcion.alumno.username}"


class DiplomaSerializer(serializers.ModelSerializer):
    alumno_nombre = serializers.SerializerMethodField()
    promocion_nombre = serializers.CharField(source='inscripcion.promocion.nombre', read_only=True)
    curso_nombre = serializers.CharField(source='inscripcion.promocion.curso.nombre', read_only=True)
    
    class Meta:
        model = Diploma
        fields = '__all__'
        read_only_fields = ['codigo_diploma', 'fecha_emision']
    
    def get_alumno_nombre(self, obj):
        return f"{obj.inscripcion.alumno.get_full_name() or obj.inscripcion.alumno.username}"
