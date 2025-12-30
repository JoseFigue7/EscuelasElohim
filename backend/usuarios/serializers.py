from rest_framework import serializers
from django.contrib.auth.password_validation import validate_password
from .models import Usuario


class UsuarioSerializer(serializers.ModelSerializer):
    class Meta:
        model = Usuario
        fields = ['id', 'username', 'email', 'first_name', 'last_name', 
                  'tipo', 'telefono', 'fecha_nacimiento', 'direccion', 
                  'activo', 'debe_cambiar_password', 'fecha_creacion']
        read_only_fields = ['id', 'fecha_creacion', 'username', 'tipo', 'activo', 'debe_cambiar_password']


class UsuarioCreateSerializer(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True, required=False)
    
    class Meta:
        model = Usuario
        fields = ['username', 'email', 'first_name', 'last_name', 'password', 
                  'tipo', 'telefono', 'fecha_nacimiento', 'direccion']
    
    def validate(self, attrs):
        # Si se proporciona una contraseña, validarla (para casos especiales)
        password = attrs.get('password')
        if password:
            try:
                validate_password(password)
            except Exception as e:
                raise serializers.ValidationError({"password": str(e)})
        # Si no se proporciona password, el view se encargará de generarlo automáticamente
        return attrs
    
    def create(self, validated_data):
        password = validated_data.pop('password', None)
        
        user = Usuario.objects.create_user(**validated_data)
        
        if password:
            user.set_password(password)
        # Si no hay password, el view se encargará de generarlo automáticamente
        user.debe_cambiar_password = True
        user.save()
        return user

