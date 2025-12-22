from django.urls import path, include
from rest_framework.routers import DefaultRouter
from . import views

router = DefaultRouter()
router.register(r'cursos', views.CursoViewSet)
router.register(r'promociones', views.PromocionViewSet)
router.register(r'temas', views.TemaViewSet)
router.register(r'materiales', views.MaterialViewSet)
router.register(r'inscripciones', views.InscripcionViewSet)
router.register(r'asistencias', views.AsistenciaViewSet)
router.register(r'preguntas', views.PreguntaViewSet)
router.register(r'examenes', views.ExamenViewSet)
router.register(r'recuperaciones', views.RecuperacionExamenViewSet)
router.register(r'calificaciones', views.CalificacionExamenViewSet)
router.register(r'promedios', views.PromedioPromocionViewSet)
router.register(r'diplomas', views.DiplomaViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

