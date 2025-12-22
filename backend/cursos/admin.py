from django.contrib import admin
from .models import (
    Curso, Promocion, Tema, Material, Inscripcion, 
    Asistencia, Pregunta, Examen, RespuestaExamen, RecuperacionExamen,
    CalificacionExamen, PromedioPromocion, Diploma
)


class TemaInline(admin.TabularInline):
    model = Tema
    extra = 1


@admin.register(Curso)
class CursoAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'activo', 'fecha_creacion')
    list_filter = ('activo', 'fecha_creacion')
    search_fields = ('nombre', 'descripcion')
    inlines = [TemaInline]


@admin.register(Promocion)
class PromocionAdmin(admin.ModelAdmin):
    list_display = ('nombre', 'curso', 'docente', 'fecha_inicio', 'fecha_fin', 'activa')
    list_filter = ('curso', 'activa', 'fecha_inicio')
    search_fields = ('nombre', 'descripcion')


class MaterialInline(admin.TabularInline):
    model = Material
    extra = 1


class PreguntaInline(admin.TabularInline):
    model = Pregunta
    extra = 1
    fields = ('pregunta_texto', 'tipo_pregunta', 'opcion_a', 'opcion_b', 'opcion_c', 'opcion_d', 'respuesta_correcta', 'puntos')


@admin.register(Tema)
class TemaAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'curso', 'numero_tema', 'fecha_clase')
    list_filter = ('curso', 'fecha_clase')
    search_fields = ('titulo', 'descripcion')
    inlines = [MaterialInline, PreguntaInline]


@admin.register(Material)
class MaterialAdmin(admin.ModelAdmin):
    list_display = ('titulo', 'tema', 'fecha_creacion')
    list_filter = ('tema__curso', 'fecha_creacion')
    search_fields = ('titulo', 'descripcion')


@admin.register(Inscripcion)
class InscripcionAdmin(admin.ModelAdmin):
    list_display = ('alumno', 'promocion', 'fecha_inscripcion', 'activa')
    list_filter = ('promocion__curso', 'promocion', 'activa', 'fecha_inscripcion')
    search_fields = ('alumno__username', 'alumno__first_name', 'alumno__last_name')


@admin.register(Asistencia)
class AsistenciaAdmin(admin.ModelAdmin):
    list_display = ('inscripcion', 'tema', 'tipo_asistencia', 'fecha_registro')
    list_filter = ('tipo_asistencia', 'tema__curso', 'fecha_registro')
    search_fields = ('inscripcion__alumno__username', 'inscripcion__alumno__first_name')


@admin.register(Pregunta)
class PreguntaAdmin(admin.ModelAdmin):
    list_display = ('pregunta_texto', 'tema', 'tipo_pregunta', 'puntos')
    list_filter = ('tipo_pregunta', 'tema__curso')
    search_fields = ('pregunta_texto',)


@admin.register(Examen)
class ExamenAdmin(admin.ModelAdmin):
    list_display = ('tema', 'numero_preguntas', 'puntos_por_pregunta', 'activo', 'fecha_inicio', 'fecha_fin')
    list_filter = ('activo', 'tema__curso', 'fecha_inicio')
    search_fields = ('tema__titulo', 'descripcion')
    fields = ('tema', 'titulo', 'descripcion', 'numero_preguntas', 'puntos_por_pregunta', 
              'tiempo_limite', 'fecha_inicio', 'fecha_fin', 'activo')


@admin.register(RespuestaExamen)
class RespuestaExamenAdmin(admin.ModelAdmin):
    list_display = ('examen', 'inscripcion', 'pregunta', 'recuperacion', 'es_correcta', 'puntos_obtenidos', 'fecha_respuesta')
    list_filter = ('es_correcta', 'examen', 'recuperacion', 'fecha_respuesta')
    search_fields = ('inscripcion__alumno__username', 'inscripcion__alumno__first_name')


@admin.register(RecuperacionExamen)
class RecuperacionExamenAdmin(admin.ModelAdmin):
    list_display = ('examen', 'inscripcion', 'fecha_inicio', 'fecha_fin', 'activa', 'completada', 'fecha_creacion')
    list_filter = ('activa', 'completada', 'examen', 'fecha_creacion')
    search_fields = ('inscripcion__alumno__username', 'inscripcion__alumno__first_name')


@admin.register(CalificacionExamen)
class CalificacionExamenAdmin(admin.ModelAdmin):
    list_display = ('examen', 'inscripcion', 'recuperacion', 'puntaje_obtenido', 'puntaje_total', 'porcentaje', 'aprobado', 'fecha_completado')
    list_filter = ('examen', 'recuperacion', 'fecha_completado')
    search_fields = ('inscripcion__alumno__username', 'inscripcion__alumno__first_name')


@admin.register(PromedioPromocion)
class PromedioPromocionAdmin(admin.ModelAdmin):
    list_display = ('inscripcion', 'promedio_final', 'aprobado', 'fecha_calculo')
    list_filter = ('aprobado', 'fecha_calculo')
    search_fields = ('inscripcion__alumno__username', 'inscripcion__alumno__first_name')


@admin.register(Diploma)
class DiplomaAdmin(admin.ModelAdmin):
    list_display = ('codigo_diploma', 'inscripcion', 'fecha_emision', 'activo')
    list_filter = ('activo', 'fecha_emision')
    search_fields = ('codigo_diploma', 'inscripcion__alumno__username')

