# Guía de Instalación Rápida

## Pasos Rápidos

### 1. Base de Datos (Docker)

```bash
docker-compose up -d
```

### 2. Backend

```bash
cd backend
python -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
cp ../.env.example .env
# Editar .env si es necesario
python manage.py makemigrations
python manage.py migrate
python manage.py createsuperuser
python manage.py load_initial_data
python manage.py runserver
```

### 3. Frontend

```bash
cd frontend
npm install
npm start
```

## Accesos

- Backend API: http://localhost:8000/api/
- Admin Django: http://localhost:8000/admin/
- Frontend: http://localhost:3000


