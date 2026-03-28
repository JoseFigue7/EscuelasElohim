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
├── deploy/            # Ejemplos Nginx + systemd (producción)
├── frontend/         # Aplicación React
│   ├── public/
│   └── src/
├── docker-compose.yml
├── .env.example              # Plantilla desarrollo → backend/.env
├── .env.production.example   # Plantilla servidor (no commitear .env real)
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
python -m pip install Pillow
python -m pip install reportlab PyPDF2

# Copiar archivo de entorno (plantilla de desarrollo en la raíz del repo)
cp ../.env.example .env
# Editar backend/.env con tus valores (no subir .env a git)

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

## Producción (droplet: Nginx + Gunicorn)

**Servidor de referencia:** IP pública del droplet `162.243.93.136` (las plantillas `.env.production.example` ya la usan hasta que haya dominio).

Las variables de **producción** están documentadas aparte de las de desarrollo para no mezclar secretos ni `DEBUG=True` en el servidor.

| Archivo | Uso |
|--------|-----|
| `.env.example` | Plantilla solo para desarrollo → copiar a `backend/.env` |
| `.env.production.example` | Plantilla para el servidor → copiar a p. ej. `/etc/elohimcoban.env` (no commitear el archivo real) |
| `frontend/.env.production.example` | Antes de `npm run build`, copiar a `frontend/.env.production` con la URL pública de la API |

### Ubuntu/Debian en el servidor (antes del venv)

Si `python3 -m venv venv` falla con *ensurepip is not available*, instala el paquete `venv` de tu versión de Python y herramientas para compilar dependencias (p. ej. `psycopg2`):

```bash
sudo apt update
sudo apt install -y python3-venv python3-pip build-essential libpq-dev
```

Si el mensaje pide una versión concreta (p. ej. `python3.12-venv`), instálala: `sudo apt install -y python3.12-venv`. Borra el venv a medias y créalo de nuevo: `rm -rf backend/venv` y vuelve a `python3 -m venv venv`. Usa `python3 manage.py ...` o, con el venv activado, `python manage.py ...`.

### PostgreSQL en Ubuntu (error: Connection refused en puerto 5432)

Significa que el servicio no está instalado, no está arrancado o no escucha en `localhost`. Instalación típica en el mismo droplet:

```bash
sudo apt update
sudo apt install -y postgresql postgresql-contrib
sudo systemctl enable --now postgresql
sudo ss -lntp | grep 5432   # debe mostrar postgres escuchando
```

Crea usuario y base **con los mismos** `DB_NAME`, `DB_USER` y `DB_PASSWORD` que en `/etc/elohimcoban.env` (sustituye la contraseña):

```bash
sudo -u postgres psql -c "CREATE USER elohimcoban WITH PASSWORD 'LA_MISMA_QUE_EN_ENV';"
sudo -u postgres psql -c "CREATE DATABASE elohimcoban_db OWNER elohimcoban;"
sudo -u postgres psql -d elohimcoban_db -c "GRANT ALL ON SCHEMA public TO elohimcoban;"
```

Si el usuario o la base ya existen, verás error de “already exists”: entonces solo comprueba que la contraseña en `.env` coincida (`ALTER USER elohimcoban WITH PASSWORD '...';` si hace falta). Después, de nuevo en `backend` con venv activo: `export DJANGO_ENV_FILE=/etc/elohimcoban.env` y `python manage.py migrate`.

### Resumen de despliegue

1. **Clonar** el repo en el droplet (p. ej. `/var/www/elohimcoban`).
2. **PostgreSQL**: instalar y arrancar el servicio; crear base y usuario alineados con `/etc/elohimcoban.env` (comandos arriba).
3. **Backend**: paquetes del sistema (arriba), crear venv, `pip install -r requirements.txt`, aplicar migraciones, `collectstatic`, `createsuperuser` si aplica.
4. **Variables**: `sudo cp .env.production.example /etc/elohimcoban.env`, editar (SECRET_KEY, ALLOWED_HOSTS, DB_*, CORS/CSRF con la URL real del sitio). `sudo chmod 600 /etc/elohimcoban.env`.
5. **Gunicorn**: el servicio puede usar `DJANGO_ENV_FILE=/etc/elohimcoban.env` (lo soporta `settings.py`). Ver `deploy/gunicorn.service.example` y ajustar rutas de `User`, `WorkingDirectory` y `ExecStart`.
6. **Frontend**: `cp .env.production.example .env.production`, definir `REACT_APP_API_URL` (mismo host que Nginx, ruta `/api`), luego `npm ci` y `npm run build` (ver abajo si falla por memoria).
7. **Nginx**: sirve el build estático y hace proxy de `/api/` y `/admin/` a Gunicorn. Ver `deploy/nginx.conf.example` (ajusta `server_name` cuando tengas dominio y SSL).

#### Si `npm run build` falla con *JavaScript heap out of memory*

En droplets con poca RAM, sube el límite de heap de Node (el número es MB; no debe superar la RAM+swap disponible):

```bash
cd frontend
export NODE_OPTIONS="--max-old-space-size=3072"
npm run build
```

Si sigue fallando: añade **swap** de 2 GB en el servidor (`fallocate`/`mkswap`/`swapon`) o compila en tu PC y sube la carpeta `frontend/build/` con `rsync`/`scp`.

Mientras no uses HTTPS, las URLs en plantillas usan `http://162.243.93.136`. Al añadir dominio y certificado, cambia a `https://tu-dominio` en esas mismas variables y vuelve a construir el frontend.

## Licencia

Este proyecto es propiedad de la Iglesia de Cristo Elohim.

