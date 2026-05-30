from django.contrib.auth import get_user_model
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
    docentes_nombres = serializers.SerializerMethodField()
    docentes = serializers.PrimaryKeyRelatedField(
        many=True,
        queryset=get_user_model().objects.filter(tipo__in=['docente', 'admin']),
        required=False,
    )
    
    class Meta:
        model = Promocion
        fields = '__all__'
    
    def get_docente_nombre(self, obj):
        if obj.docente:
            return f"{obj.docente.get_full_name() or obj.docente.username}"
        return None

    def get_docentes_nombres(self, obj):
        return [
            f"{docente.get_full_name() or docente.username}"
            for docente in obj.docentes.all()
        ]

    def create(self, validated_data):
        docentes = validated_data.pop('docentes', [])
        promocion = super().create(validated_data)
        if docentes:
            promocion.docentes.set(docentes)
            if not promocion.docente:
                promocion.docente = docentes[0]
                promocion.save(update_fields=['docente'])
        elif promocion.docente:
            promocion.docentes.add(promocion.docente)
        return promocion

    def update(self, instance, validated_data):
        docentes = validated_data.pop('docentes', None)
        promocion = super().update(instance, validated_data)
        if docentes is not None:
            promocion.docentes.set(docentes)
            if docentes and not promocion.docente:
                promocion.docente = docentes[0]
                promocion.save(update_fields=['docente'])
        return promocion


class MaterialSerializer(serializers.ModelSerializer):
    nombre_archivo = serializers.SerializerMethodField()
    archivo_url = serializers.SerializerMethodField()
    
    class Meta:
        model = Material
        fields = '__all__'
        read_only_fields = ['fecha_creacion']
    
    def get_nombre_archivo(self, obj):
        """Retorna el nombre del archivo original"""
        if obj.archivo:
            return obj.archivo.name.split('/')[-1]
        return None

    def get_archivo_url(self, obj):
        if not obj.archivo:
            return None
        request = self.context.get('request')
        if request:
            return request.build_absolute_uri(obj.archivo.url)
        return obj.archivo.url

    def validate(self, attrs):
        tipo = attrs.get('tipo')
        if self.instance:
            tipo = tipo or self.instance.tipo
        else:
            tipo = tipo or 'archivo'

        archivo = attrs.get('archivo')
        url = attrs.get('url')
        tiene_archivo = bool(archivo) or bool(self.instance and self.instance.archivo)
        tiene_url = bool(url) or bool(self.instance and self.instance.url)

        if tipo == 'archivo' and not tiene_archivo:
            raise serializers.ValidationError({
                'archivo': 'Debe subir un archivo para este tipo de material.'
            })
        if tipo == 'enlace':
            if not tiene_url:
                raise serializers.ValidationError({
                    'url': 'Debe indicar la URL del enlace.'
                })
        if tipo == 'imagen' and not tiene_archivo and not tiene_url:
            raise serializers.ValidationError({
                'archivo': 'Suba una imagen o indique una URL de imagen.'
            })
        return attrs


class TemaSerializer(serializers.ModelSerializer):
    materiales = MaterialSerializer(many=True, read_only=True)
    curso_nombre = serializers.CharField(source='curso.nombre', read_only=True)
    numero_tema = serializers.IntegerField(required=False, allow_null=True)
    
    class Meta:
        model = Tema
        fields = '__all__'
        read_only_fields = ['fecha_creacion', 'fecha_actualizacion']
        # Desactivamos el validador automático de unique_together porque fuerza
        # numero_tema como obligatorio aun cuando lo autogeneramos en create().
        validators = []

    def create(self, validated_data):
        # Si el frontend no envía numero_tema, usar el siguiente consecutivo por curso.
        if validated_data.get('numero_tema') is None:
            curso = validated_data.get('curso')
            if curso is None:
                raise serializers.ValidationError({'curso': 'Este campo es requerido.'})
            ultimo_numero = (
                Tema.objects.filter(curso=curso)
                .order_by('-numero_tema')
                .values_list('numero_tema', flat=True)
                .first()
            )
            validated_data['numero_tema'] = (ultimo_numero or 0) + 1
        elif Tema.objects.filter(
            curso=validated_data['curso'],
            numero_tema=validated_data['numero_tema']
        ).exists():
            raise serializers.ValidationError({
                'numero_tema': 'Ya existe un tema con ese número en este curso.'
            })
        return super().create(validated_data)


class TemaListSerializer(serializers.ModelSerializer):
    curso_nombre = serializers.CharField(source='curso.nombre', read_only=True)
    
    class Meta:
        model = Tema
        fields = [
            'id', 'numero_tema', 'titulo', 'descripcion', 'fecha_clase',
            'curso_nombre', 'visible_para_estudiante',
        ]


class InscripcionSerializer(serializers.ModelSerializer):
    alumno_nombre = serializers.SerializerMethodField()
    alumno_activo = serializers.SerializerMethodField()
    promocion_nombre = serializers.CharField(source='promocion.nombre', read_only=True)
    curso_nombre = serializers.CharField(source='promocion.curso.nombre', read_only=True)
    
    class Meta:
        model = Inscripcion
        fields = '__all__'
        read_only_fields = ['fecha_inscripcion']
    
    def get_alumno_nombre(self, obj):
        return f"{obj.alumno.get_full_name() or obj.alumno.username}"

    def get_alumno_activo(self, obj):
        return bool(obj.alumno.activo)


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


class RespuestaExamenDetalleSerializer(serializers.ModelSerializer):
    pregunta_texto = serializers.CharField(source='pregunta.pregunta_texto', read_only=True)
    tipo_pregunta = serializers.CharField(source='pregunta.tipo_pregunta', read_only=True)
    respuesta_correcta_texto = serializers.SerializerMethodField()
    respuesta_dada_texto = serializers.SerializerMethodField()

    class Meta:
        model = RespuestaExamen
        fields = [
            'id',
            'pregunta',
            'pregunta_texto',
            'tipo_pregunta',
            'respuesta_dada',
            'respuesta_dada_texto',
            'respuesta_correcta_texto',
            'es_correcta',
            'puntos_obtenidos',
            'fecha_respuesta',
        ]

    def _texto_respuesta(self, pregunta, valor):
        if not valor:
            return '(sin respuesta)'
        clave = str(valor).lower().strip()
        if pregunta.tipo_pregunta == 'opcion_multiple':
            opciones = {
                'a': pregunta.opcion_a,
                'b': pregunta.opcion_b,
                'c': pregunta.opcion_c,
                'd': pregunta.opcion_d,
            }
            texto = opciones.get(clave)
            return f"{clave.upper()}) {texto}" if texto else clave.upper()
        if pregunta.tipo_pregunta == 'verdadero_falso':
            return 'Verdadero' if clave == 'verdadero' else 'Falso' if clave == 'falso' else valor
        return valor

    def get_respuesta_correcta_texto(self, obj):
        return self._texto_respuesta(obj.pregunta, obj.pregunta.respuesta_correcta)

    def get_respuesta_dada_texto(self, obj):
        return self._texto_respuesta(obj.pregunta, obj.respuesta_dada)


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


class RecuperacionExamenAlumnoSerializer(serializers.ModelSerializer):
    """Recuperación visible para el alumno, con datos del examen original."""
    examen_id = serializers.IntegerField(source='examen.id', read_only=True)
    examen_titulo = serializers.SerializerMethodField()
    tema_id = serializers.IntegerField(source='examen.tema.id', read_only=True)
    tema_titulo = serializers.CharField(source='examen.tema.titulo', read_only=True)
    curso_nombre = serializers.CharField(source='examen.tema.curso.nombre', read_only=True)
    numero_preguntas = serializers.IntegerField(source='examen.numero_preguntas', read_only=True)
    puntos_por_pregunta = serializers.IntegerField(source='examen.puntos_por_pregunta', read_only=True)
    numero_recuperacion = serializers.IntegerField(read_only=True)

    class Meta:
        model = RecuperacionExamen
        fields = [
            'id',
            'examen_id',
            'examen_titulo',
            'tema_id',
            'tema_titulo',
            'curso_nombre',
            'fecha_inicio',
            'fecha_fin',
            'numero_recuperacion',
            'numero_preguntas',
            'puntos_por_pregunta',
            'completada',
            'activa',
        ]

    def get_examen_titulo(self, obj):
        if obj.examen.titulo:
            return obj.examen.titulo
        return f"Examen - {obj.examen.tema.titulo}"

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
        """Validar fechas e inscripciones del mismo curso que el examen."""
        if attrs['fecha_inicio'] >= attrs['fecha_fin']:
            raise serializers.ValidationError("La fecha de fin debe ser posterior a la fecha de inicio")

        examen = attrs['examen']
        curso_id = examen.tema.curso_id
        for inscripcion in attrs['inscripciones']:
            if inscripcion.promocion.curso_id != curso_id:
                raise serializers.ValidationError(
                    "Todos los estudiantes deben estar inscritos en una promoción "
                    "del mismo curso que el examen."
                )
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


class CalificacionExamenDetalleSerializer(CalificacionExamenSerializer):
    respuestas = serializers.SerializerMethodField()

    class Meta(CalificacionExamenSerializer.Meta):
        pass

    def get_respuestas(self, obj):
        respuestas = RespuestaExamen.objects.filter(
            examen=obj.examen,
            inscripcion=obj.inscripcion,
            recuperacion=obj.recuperacion,
        ).select_related('pregunta').order_by('pregunta_id')
        return RespuestaExamenDetalleSerializer(respuestas, many=True).data


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
        read_only_fields = ['codigo_diploma', 'fecha_emision', 'archivo']
    
    def get_alumno_nombre(self, obj):
        return f"{obj.inscripcion.alumno.get_full_name() or obj.inscripcion.alumno.username}"
