#!/bin/bash

# Script de inicio rápido para el proyecto Elohim Coban

echo "🚀 Iniciando Elohim Coban..."

# Verificar si Docker está corriendo
if ! docker ps &> /dev/null; then
    echo "⚠️  Docker no está corriendo. Por favor inicia Docker primero."
    exit 1
fi

# Iniciar PostgreSQL
echo "📦 Iniciando PostgreSQL..."
docker-compose up -d

# Esperar a que PostgreSQL esté listo
echo "⏳ Esperando a que PostgreSQL esté listo..."
sleep 5

# Backend
echo "🔧 Configurando backend..."
cd backend

# Crear entorno virtual si no existe
if [ ! -d "venv" ]; then
    echo "📦 Creando entorno virtual..."
    python3 -m venv venv
fi

# Activar entorno virtual
source venv/bin/activate

# Instalar dependencias
echo "📥 Instalando dependencias de Python..."
pip install -r requirements.txt

# Crear .env si no existe
if [ ! -f ".env" ]; then
    echo "⚙️  Creando archivo .env..."
    cp ../.env.example .env
    echo "✅ Archivo .env creado. Por favor revisa la configuración."
fi

# Hacer migraciones
echo "🗄️  Ejecutando migraciones..."
python manage.py makemigrations
python manage.py migrate

# Crear superusuario si no existe
echo "👤 Creando superusuario (si no existe)..."
python manage.py createsuperuser --noinput || echo "⚠️  Superusuario ya existe o hubo un error. Ejecuta manualmente: python manage.py createsuperuser"

# Cargar datos iniciales
echo "📚 Cargando datos iniciales..."
python manage.py load_initial_data

echo "✅ Backend configurado!"
echo ""
echo "🌐 Para iniciar el backend, ejecuta:"
echo "   cd backend && source venv/bin/activate && python manage.py runserver"
echo ""
echo "⚛️  Para iniciar el frontend, ejecuta en otra terminal:"
echo "   cd frontend && npm install && npm start"



