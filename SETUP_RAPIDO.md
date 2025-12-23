# Setup Rápido - Pasos para Ejecutar

## Pasos Correctos (en orden)

### 1. Activar el entorno virtual
```bash
cd backend
source venv/bin/activate
# Deberías ver (venv) al inicio de tu línea de comando
```

### 2. Instalar dependencias (si no lo has hecho)
```bash
pip install -r requirements.txt
```

### 3. Crear archivo .env (si no existe)
```bash
# Desde el directorio backend/
cp ../.env.example .env
# Edita .env si necesitas cambiar la configuración de la base de datos
```

### 4. Asegurar que PostgreSQL esté corriendo
```bash
# Desde el directorio raíz del proyecto
docker-compose up -d
# Espera unos segundos a que PostgreSQL inicie
```

### 5. Crear las migraciones
```bash
# Desde backend/ con venv activado
python manage.py makemigrations cursos usuarios
```

### 6. Aplicar las migraciones
```bash
python manage.py migrate
```

### 7. Crear superusuario
```bash
python manage.py createsuperuser
# Te pedirá username, email y password
```

### 8. Cargar datos iniciales (los 3 cursos)
```bash
python manage.py load_initial_data
```

### 9. Iniciar el servidor de Django
```bash
python manage.py runserver
# El servidor estará en http://localhost:8000
```

### 10. En otra terminal - Frontend
```bash
cd frontend
npm install
npm start
# El frontend estará en http://localhost:3000
```

## Comandos Importantes

**Nota sobre el typo:** El comando correcto es:
- ✅ `python manage.py migrate` 
- ❌ NO es `python magane.py migrate`

**Verificar que Django esté instalado:**
```bash
python manage.py --version
```

**Ver qué apps tienen cambios pendientes:**
```bash
python manage.py makemigrations --dry-run
```

## Solución de Problemas

### "No changes detected"
Si ves "No changes detected" al hacer makemigrations:
1. Verifica que las apps estén en INSTALLED_APPS en settings.py
2. Especifica las apps: `python manage.py makemigrations cursos usuarios`
3. Verifica que los modelos estén correctamente definidos

### "ModuleNotFoundError: No module named 'django'"
1. Activa el entorno virtual: `source venv/bin/activate`
2. Instala las dependencias: `pip install -r requirements.txt`

### Error de conexión a PostgreSQL
1. Verifica que Docker esté corriendo: `docker ps`
2. Inicia PostgreSQL: `docker-compose up -d`
3. Verifica las credenciales en .env



