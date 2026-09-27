from django.urls import path, include
from rest_framework.routers import DefaultRouter
from rest_framework_simplejwt.views import TokenObtainPairView, TokenRefreshView
from . import views
from .serializers import CustomTokenObtainPairSerializer

router = DefaultRouter()
router.register(r'usuarios', views.UsuarioViewSet, basename='usuario')


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


urlpatterns = [
    path('login/', CustomTokenObtainPairView.as_view(), name='token_obtain_pair'),
    path('refresh/', TokenRefreshView.as_view(), name='token_refresh'),
    path('restablecer-contrasena/', views.RestablecerContrasenaView.as_view(), name='restablecer_contrasena'),
    path('profile/', views.ProfileView.as_view(), name='profile'),
    path('', include(router.urls)),
]
