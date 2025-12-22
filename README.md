# Elohim Coban - Plataforma de Cursos

Plataforma web para la gestión de cursos de la Iglesia de Cristo Elohim. Permite gestionar cursos, promociones, temas, materiales, asistencias y exámenes.

## Tecnologías

- **Backend**: Django 4.2 + Django REST Framework
- **Frontend**: React 18
- **Base de datos**: PostgreSQL 15

## Estructura del Proyecto

```
elohimcoban/
├── backend/           # Aplicación Django
│   ├── elohimcoban/  # Configuración principal
│   ├── cursos/       # App de gestión de cursos
│   ├── usuarios/     # App de usuarios
│   └── manage.py
├── frontend/         # Aplicación React
│   ├── public/
│   └── src/
├── docker-compose.yml
└── README.md
```

## Requisitos Previos

- Python 3.10+
- Node.js 16+
- PostgreSQL 15 (o usar Docker Compose)
- pip
- npm o yarn

## Instalación y Configuración

### 1. Clonar el repositorio

```bash
git clone <url-del-repositorio>
cd elohimcoban
```

### 2. Configurar Base de Datos con Docker Compose

```bash
docker-compose up -d
```

Esto iniciará PostgreSQL en el puerto 5432.

### 3. Configurar Backend (Django)

```bash
cd backend

# Crear entorno virtual
python -m venv venv
source venv/bin/activate  # En Windows: venv\Scripts\activate

# Instalar dependencias
pip install -r requirements.txt

# Copiar archivo de entorno
cp ../.env.example .env
# Editar .env con tus configuraciones

# Crear migraciones
python manage.py makemigrations

# Aplicar migraciones
python manage.py migrate

# Crear superusuario
python manage.py createsuperuser

# Cargar datos iniciales (crear los 3 cursos)
python manage.py load_initial_data

### 4. Configurar Frontend (React)

```bash
cd ../frontend

# Instalar dependencias
npm install

# Iniciar servidor de desarrollo
npm start
```

El frontend estará disponible en http://localhost:3000

### 5. Iniciar Backend

En otra terminal:

```bash
cd backend
source venv/bin/activate  # Si no está activado
python manage.py runserver
```

El backend estará disponible en http://localhost:8000
La API estará disponible en http://localhost:8000/api/
El admin de Django estará disponible en http://localhost:8000/admin/

## Modelos de Datos

### Usuarios
- **Usuario**: Usuarios del sistema (alumnos, docentes, administradores)

### Cursos
- **Curso**: Los tres cursos disponibles (Escuela de Corderitos, Doctrina Intermedia, Escuela de Evangelismo)
- **Promoción**: Promociones de cada curso con fechas de inicio y fin
- **Tema**: Temas/clases de cada promoción
- **Material**: Archivos de materiales por tema
- **Inscripción**: Inscripciones de alumnos a promociones
- **Asistencia**: Registro de asistencia con tipos: presente, tarde, presente sin cámara, no asistió
- **Pregunta**: Banco de preguntas por tema
- **Examen**: Exámenes asociados a temas
- **RespuestaExamen**: Respuestas de alumnos a preguntas de exámenes
- **CalificacionExamen**: Calificaciones finales de exámenes

## Tipos de Usuario

1. **Alumno**: Puede ver sus cursos, temas, materiales, hacer exámenes y ver calificaciones
2. **Docente**: Puede gestionar promociones, temas, materiales, asistencias y exámenes
3. **Administrador**: Acceso completo al sistema

## API Endpoints

### Autenticación
- `POST /api/auth/login/` - Iniciar sesión
- `POST /api/auth/refresh/` - Refrescar token
- `GET /api/auth/profile/` - Obtener perfil del usuario

### Cursos
- `GET /api/cursos/` - Listar cursos
- `POST /api/cursos/` - Crear curso
- `GET /api/cursos/{id}/` - Detalle de curso
- `PUT /api/cursos/{id}/` - Actualizar curso
- `DELETE /api/cursos/{id}/` - Eliminar curso

### Promociones
- `GET /api/promociones/` - Listar promociones
- `POST /api/promociones/` - Crear promoción
- `GET /api/promociones/{id}/` - Detalle de promoción

### Temas
- `GET /api/temas/?promocion={id}` - Listar temas de una promoción
- `GET /api/temas/{id}/` - Detalle de tema con materiales

### Materiales
- `GET /api/materiales/?tema={id}` - Listar materiales de un tema
- `POST /api/materiales/` - Subir material

### Exámenes
- `GET /api/examenes/?tema={id}` - Listar exámenes de un tema
- `GET /api/examenes/{id}/` - Detalle de examen con preguntas
- `POST /api/examenes/{id}/responder/` - Responder examen

### Calificaciones
- `GET /api/calificaciones/?examen={id}` - Listar calificaciones de un examen

## Desarrollo

### Ejecutar tests
```bash
cd backend
python manage.py test
```

### Crear migraciones después de cambios en modelos
```bash
python manage.py makemigrations
python manage.py migrate
```

## Producción

Para desplegar en producción:

1. Configurar variables de entorno en producción
2. Establecer `DEBUG=False` en settings.py
3. Configurar `ALLOWED_HOSTS` apropiadamente
4. Usar un servidor WSGI como Gunicorn
5. Configurar un servidor web como Nginx
6. Configurar PostgreSQL en producción

## Licencia

Este proyecto es propiedad de la Iglesia de Cristo Elohim.

