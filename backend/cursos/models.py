from django.db import models
from django.conf import settings
from django.core.validators import MinValueValidator, MaxValueValidator
from decimal import Decimal


class Curso(models.Model):
    """Modelo para los cursos/escuelas"""
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Curso'
        verbose_name_plural = 'Cursos'
        ordering = ['nombre']
    
    def __str__(self):
        return self.nombre


class Promocion(models.Model):
    """Modelo para las promociones de cada curso"""
    curso = models.ForeignKey(Curso, on_delete=models.CASCADE, related_name='promociones')
    nombre = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    fecha_inicio = models.DateField()
    fecha_fin = models.DateField(blank=True, null=True)
    docente = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.SET_NULL, 
        null=True,
        related_name='promociones_dictadas',
        limit_choices_to={'tipo__in': ['docente', 'admin']}
    )
    activa = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Promoción'
        verbose_name_plural = 'Promociones'
        ordering = ['-fecha_inicio']
    
    def __str__(self):
        return f"{self.curso.nombre} - {self.nombre}"


class Tema(models.Model):
    """Modelo para los temas/clases de cada curso"""
    curso = models.ForeignKey(Curso, on_delete=models.CASCADE, related_name='temas')
    numero_tema = models.PositiveIntegerField()
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    fecha_clase = models.DateField(blank=True, null=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Tema'
        verbose_name_plural = 'Temas'
        ordering = ['curso', 'numero_tema']
        unique_together = ['curso', 'numero_tema']
    
    def __str__(self):
        return f"{self.curso.nombre} - Tema {self.numero_tema}: {self.titulo}"


class Material(models.Model):
    """Modelo para los materiales de cada tema"""
    tema = models.ForeignKey(Tema, on_delete=models.CASCADE, related_name='materiales')
    titulo = models.CharField(max_length=200)
    descripcion = models.TextField(blank=True, null=True)
    archivo = models.FileField(upload_to='materiales/')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Material'
        verbose_name_plural = 'Materiales'
        ordering = ['-fecha_creacion']
    
    def __str__(self):
        return f"{self.tema} - {self.titulo}"


class Inscripcion(models.Model):
    """Modelo para las inscripciones de alumnos a promociones"""
    alumno = models.ForeignKey(
        settings.AUTH_USER_MODEL, 
        on_delete=models.CASCADE, 
        related_name='inscripciones',
        limit_choices_to={'tipo': 'alumno'}
    )
    promocion = models.ForeignKey(Promocion, on_delete=models.CASCADE, related_name='inscripciones')
    fecha_inscripcion = models.DateTimeField(auto_now_add=True)
    activa = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = 'Inscripción'
        verbose_name_plural = 'Inscripciones'
        unique_together = ['alumno', 'promocion']
        ordering = ['-fecha_inscripcion']
    
    def __str__(self):
        return f"{self.alumno} - {self.promocion}"


class Asistencia(models.Model):
    """Modelo para el registro de asistencia"""
    TIPO_ASISTENCIA_CHOICES = [
        ('presente', 'Presente'),
        ('tarde', 'Tarde'),
        ('presente_sin_camara', 'Presente sin cámara encendida'),
        ('no_asistio', 'No asistió'),
    ]
    
    inscripcion = models.ForeignKey(Inscripcion, on_delete=models.CASCADE, related_name='asistencias')
    tema = models.ForeignKey(Tema, on_delete=models.CASCADE, related_name='asistencias')
    tipo_asistencia = models.CharField(max_length=30, choices=TIPO_ASISTENCIA_CHOICES, default='no_asistio')
    observaciones = models.TextField(blank=True, null=True)
    fecha_registro = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Asistencia'
        verbose_name_plural = 'Asistencias'
        unique_together = ['inscripcion', 'tema']
        ordering = ['tema', 'inscripcion']
    
    def __str__(self):
        return f"{self.inscripcion.alumno} - {self.tema} - {self.get_tipo_asistencia_display()}"


class Pregunta(models.Model):
    """Modelo para las preguntas del banco de preguntas por tema"""
    TIPO_PREGUNTA_CHOICES = [
        ('opcion_multiple', 'Opción Múltiple'),
        ('verdadero_falso', 'Verdadero/Falso'),
        ('texto', 'Texto Libre'),
    ]
    
    tema = models.ForeignKey(Tema, on_delete=models.CASCADE, related_name='preguntas')
    pregunta_texto = models.TextField()
    tipo_pregunta = models.CharField(max_length=20, choices=TIPO_PREGUNTA_CHOICES, default='opcion_multiple')
    opcion_a = models.CharField(max_length=500, blank=True, null=True)
    opcion_b = models.CharField(max_length=500, blank=True, null=True)
    opcion_c = models.CharField(max_length=500, blank=True, null=True)
    opcion_d = models.CharField(max_length=500, blank=True, null=True)
    respuesta_correcta = models.CharField(max_length=10, blank=True, null=True)  # 'a', 'b', 'c', 'd', 'verdadero', 'falso'
    puntos = models.PositiveIntegerField(default=1, validators=[MinValueValidator(1)])
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Pregunta'
        verbose_name_plural = 'Preguntas'
        ordering = ['tema', 'fecha_creacion']
    
    def __str__(self):
        return f"{self.tema} - {self.pregunta_texto[:50]}..."


class Examen(models.Model):
    """Modelo para los exámenes/evaluaciones - cada tema tiene un solo examen"""
    tema = models.OneToOneField(Tema, on_delete=models.CASCADE, related_name='examen')
    titulo = models.CharField(max_length=200, blank=True, null=True)
    descripcion = models.TextField(blank=True, null=True)
    numero_preguntas = models.PositiveIntegerField(
        default=10,
        help_text='Número de preguntas a seleccionar aleatoriamente del banco'
    )
    puntos_por_pregunta = models.PositiveIntegerField(
        default=1,
        help_text='Puntos que vale cada pregunta',
        validators=[MinValueValidator(1)]
    )
    tiempo_limite = models.PositiveIntegerField(help_text='Tiempo en minutos', blank=True, null=True)
    fecha_inicio = models.DateTimeField(help_text='Fecha y hora de inicio del examen', blank=True, null=True)
    fecha_fin = models.DateTimeField(help_text='Fecha y hora de fin del examen', blank=True, null=True)
    activo = models.BooleanField(default=True)
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Examen'
        verbose_name_plural = 'Exámenes'
        ordering = ['-fecha_creacion']
    
    def __str__(self):
        return f"Examen de {self.tema}"
    
    @property
    def puntaje_total(self):
        """Retorna el puntaje total del examen (numero_preguntas * puntos_por_pregunta)"""
        return self.numero_preguntas * self.puntos_por_pregunta
    
    def obtener_preguntas_aleatorias(self):
        """Retorna número_preguntas preguntas aleatorias del banco del tema"""
        from django.db.models import Count
        preguntas_disponibles = self.tema.preguntas.all()
        cantidad_disponible = preguntas_disponibles.count()
        
        if cantidad_disponible == 0:
            return Pregunta.objects.none()
        
        # Si hay menos preguntas disponibles que las solicitadas, retornar todas
        cantidad_a_seleccionar = min(self.numero_preguntas, cantidad_disponible)
        
        # Seleccionar preguntas aleatorias
        return preguntas_disponibles.order_by('?')[:cantidad_a_seleccionar]


class RespuestaExamen(models.Model):
    """Modelo para las respuestas de los alumnos a los exámenes"""
    examen = models.ForeignKey(Examen, on_delete=models.CASCADE, related_name='respuestas')
    inscripcion = models.ForeignKey(Inscripcion, on_delete=models.CASCADE, related_name='respuestas_examenes')
    pregunta = models.ForeignKey(Pregunta, on_delete=models.CASCADE, related_name='respuestas')
    recuperacion = models.ForeignKey('RecuperacionExamen', on_delete=models.SET_NULL, null=True, blank=True, related_name='respuestas')
    respuesta_dada = models.TextField()
    es_correcta = models.BooleanField(default=False)
    puntos_obtenidos = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    fecha_respuesta = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Respuesta de Examen'
        verbose_name_plural = 'Respuestas de Exámenes'
        unique_together = ['examen', 'inscripcion', 'pregunta', 'recuperacion']
        ordering = ['examen', 'inscripcion', 'pregunta']
    
    def __str__(self):
        tipo = f" (Recuperación {self.recuperacion.id})" if self.recuperacion else ""
        return f"{self.inscripcion.alumno} - {self.examen} - Pregunta {self.pregunta.id}{tipo}"


class RecuperacionExamen(models.Model):
    """Modelo para gestionar recuperaciones de exámenes"""
    examen = models.ForeignKey(Examen, on_delete=models.CASCADE, related_name='recuperaciones')
    inscripcion = models.ForeignKey(Inscripcion, on_delete=models.CASCADE, related_name='recuperaciones_examenes')
    fecha_inicio = models.DateTimeField(help_text='Fecha y hora de inicio de la recuperación')
    fecha_fin = models.DateTimeField(help_text='Fecha y hora de fin de la recuperación')
    activa = models.BooleanField(default=True)
    completada = models.BooleanField(default=False, help_text='Indica si el estudiante ya realizó la recuperación')
    fecha_creacion = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        verbose_name = 'Recuperación de Examen'
        verbose_name_plural = 'Recuperaciones de Exámenes'
        ordering = ['-fecha_creacion']
    
    def __str__(self):
        return f"Recuperación - {self.inscripcion.alumno} - {self.examen}"
    
    @property
    def numero_recuperacion(self):
        """Retorna el número de recuperación que es este estudiante en este examen"""
        return RecuperacionExamen.objects.filter(
            examen=self.examen,
            inscripcion=self.inscripcion,
            fecha_creacion__lte=self.fecha_creacion
        ).count()


class CalificacionExamen(models.Model):
    """Modelo para almacenar las calificaciones finales de los exámenes"""
    examen = models.ForeignKey(Examen, on_delete=models.CASCADE, related_name='calificaciones')
    inscripcion = models.ForeignKey(Inscripcion, on_delete=models.CASCADE, related_name='calificaciones_examenes')
    recuperacion = models.ForeignKey(RecuperacionExamen, on_delete=models.SET_NULL, null=True, blank=True, related_name='calificacion')
    puntaje_obtenido = models.DecimalField(max_digits=5, decimal_places=2, default=0)
    puntaje_total = models.DecimalField(max_digits=5, decimal_places=2)
    porcentaje = models.DecimalField(max_digits=5, decimal_places=2, validators=[MinValueValidator(0), MaxValueValidator(100)])
    fecha_completado = models.DateTimeField(auto_now_add=True)
    fecha_actualizacion = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Calificación de Examen'
        verbose_name_plural = 'Calificaciones de Exámenes'
        # Permite múltiples calificaciones si son recuperaciones, pero solo una normal
        unique_together = [['examen', 'inscripcion', 'recuperacion']]
        ordering = ['-fecha_completado']
    
    def __str__(self):
        tipo = "Recuperación" if self.recuperacion else "Normal"
        return f"{self.inscripcion.alumno} - {self.examen} - {tipo} - {self.porcentaje}%"
    
    @property
    def es_recuperacion(self):
        """Retorna True si esta calificación es de una recuperación"""
        return self.recuperacion is not None
    
    def calcular_calificacion(self):
        """Calcula la calificación basándose en las respuestas"""
        # Filtrar respuestas por recuperación si aplica
        if self.recuperacion:
            # Para recuperación, usar solo las respuestas de esa recuperación
            respuestas = RespuestaExamen.objects.filter(
                examen=self.examen,
                inscripcion=self.inscripcion,
                recuperacion=self.recuperacion
            )
        else:
            # Para calificación normal, usar solo respuestas que NO son de recuperación
            respuestas = RespuestaExamen.objects.filter(
                examen=self.examen,
                inscripcion=self.inscripcion,
                recuperacion__isnull=True
            )
        
        self.puntaje_obtenido = Decimal(sum(float(respuesta.puntos_obtenidos) for respuesta in respuestas))
        if self.puntaje_total > 0:
            self.porcentaje = Decimal((float(self.puntaje_obtenido) / float(self.puntaje_total)) * 100)
        else:
            self.porcentaje = Decimal(0)
        self.save()
    
    @property
    def aprobado(self):
        """Retorna True si la calificación es >= 80%"""
        return float(self.porcentaje) >= 80.0


class PromedioPromocion(models.Model):
    """Modelo para almacenar el promedio final de un alumno en una promoción"""
    inscripcion = models.OneToOneField(Inscripcion, on_delete=models.CASCADE, related_name='promedio')
    promedio_final = models.DecimalField(max_digits=5, decimal_places=2, default=0, validators=[MinValueValidator(0), MaxValueValidator(100)])
    aprobado = models.BooleanField(default=False)
    fecha_calculo = models.DateTimeField(auto_now=True)
    
    class Meta:
        verbose_name = 'Promedio de Promoción'
        verbose_name_plural = 'Promedios de Promociones'
        ordering = ['-promedio_final']
    
    def __str__(self):
        return f"{self.inscripcion.alumno} - {self.inscripcion.promocion} - {self.promedio_final}%"
    
    def calcular_promedio(self):
        """Calcula el promedio final de todos los exámenes de la promoción"""
        # Obtener todos los exámenes del curso de la promoción
        examenes = Examen.objects.filter(tema__curso=self.inscripcion.promocion.curso)
        
        calificaciones_finales = []
        for examen in examenes:
            # Buscar calificación de recuperación primero (la más reciente si hay varias)
            calificacion_recuperacion = CalificacionExamen.objects.filter(
                inscripcion=self.inscripcion,
                examen=examen,
                recuperacion__isnull=False
            ).order_by('-fecha_completado').first()
            
            if calificacion_recuperacion:
                # Si hay recuperación, usar esa calificación
                calificaciones_finales.append(calificacion_recuperacion)
            else:
                # Si no hay recuperación, usar la calificación normal
                calificacion_normal = CalificacionExamen.objects.filter(
                    inscripcion=self.inscripcion,
                    examen=examen,
                    recuperacion__isnull=True
                ).first()
                
                if calificacion_normal:
                    calificaciones_finales.append(calificacion_normal)
        
        if calificaciones_finales:
            total_porcentajes = sum(float(cal.porcentaje) for cal in calificaciones_finales)
            self.promedio_final = Decimal(total_porcentajes / len(calificaciones_finales))
        else:
            self.promedio_final = Decimal(0)
        
        # Aprobado si promedio >= 80%
        self.aprobado = float(self.promedio_final) >= 80.0
        self.save()
    
    def contar_recuperaciones_totales(self):
        """Cuenta el total de recuperaciones que ha hecho este estudiante en la promoción"""
        # La clase RecuperacionExamen ya está definida antes de PromedioPromocion, así que podemos usarla directamente
        return RecuperacionExamen.objects.filter(
            inscripcion=self.inscripcion,
            examen__tema__curso=self.inscripcion.promocion.curso
        ).count()


class Diploma(models.Model):
    """Modelo para almacenar información de diplomas generados"""
    inscripcion = models.ForeignKey(Inscripcion, on_delete=models.CASCADE, related_name='diplomas')
    codigo_diploma = models.CharField(max_length=50, unique=True)
    fecha_emision = models.DateTimeField(auto_now_add=True)
    fecha_validez = models.DateField(blank=True, null=True)
    activo = models.BooleanField(default=True)
    
    class Meta:
        verbose_name = 'Diploma'
        verbose_name_plural = 'Diplomas'
        ordering = ['-fecha_emision']
    
    def __str__(self):
        return f"Diploma {self.codigo_diploma} - {self.inscripcion.alumno}"
    
    def save(self, *args, **kwargs):
        if not self.codigo_diploma:
            # Generar código único
            import uuid
            self.codigo_diploma = f"DIP-{uuid.uuid4().hex[:12].upper()}"
        super().save(*args, **kwargs)

