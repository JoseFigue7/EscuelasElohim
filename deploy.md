# Despliegue y actualización en producción

Guía para el servidor **DigitalOcean** (droplet `162.243.93.136`, dominio `https://escuelaselohim.com`).

| Concepto | Valor |
|----------|--------|
| Ruta del proyecto | `/var/www/elohim/EscuelasElohim` |
| Variables Django | `/etc/elohimcoban.env` |
| Servicio backend | `elohimcoban.service` (Gunicorn + socket) |
| Nginx IP | `/etc/nginx/sites-available/elohimcoban` |
| Nginx dominio | `/etc/nginx/sites-available/escuelaselohim.com` |
| Build frontend | `frontend/build/` |

---

## Conexión SSH

Desde tu PC (ThinkPad):

```bash
ssh -i ~/.ssh/id_ed25519 root@162.243.93.136
```

Si usaste otra clave al crear el droplet:

```bash
ssh -i /ruta/a/tu/clave/privada root@162.243.93.136
```

---

## Actualización rápida (cambios normales)

Ejecutar en el servidor como `root` (o con `sudo`).

```bash
export REPO=/var/www/elohim/EscuelasElohim
cd "$REPO"

# 1) Código nuevo
git pull origin main   # o la rama que uses: master, develop, etc.

# 2) Backend
cd "$REPO/backend"
source venv/bin/activate
export DJANGO_ENV_FILE=/etc/elohimcoban.env

pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput

deactivate
sudo systemctl restart elohimcoban

# 3) Frontend
cd "$REPO/frontend"
# Asegúrate de que .env.production tenga REACT_APP_API_URL=/api
npm ci
export NODE_OPTIONS="--max-old-space-size=3072"   # solo si falla por memoria
npm run build

# 4) Recargar Nginx (sin downtime si la config ya es válida)
sudo nginx -t && sudo systemctl reload nginx
```

### Script automático (recomendado)

En el servidor, después de `git pull`:

```bash
export REPO=/var/www/elohim/EscuelasElohim
bash "$REPO/deploy/actualizar.sh"
```

El script hace migrate, build, reinicia Gunicorn y comprueba que existan la ruta y el API de restablecer contraseña.

### Verificación después del update

```bash
sudo systemctl status elohimcoban --no-pager
curl -s -o /dev/null -w "%{http_code}\n" https://escuelaselohim.com/
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://escuelaselohim.com/api/auth/login/ \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password":"test"}'

# Restablecer contraseña: debe ser 200 (no 404)
curl -s -o /dev/null -w "restablecer API: %{http_code}\n" -X POST \
  https://escuelaselohim.com/api/auth/restablecer-contrasena/ \
  -H "Content-Type: application/json" \
  -d '{"username":"test","password_nueva":"x","password_nueva_confirm":"x"}'

# Build nuevo (debe contener la cadena restablecer-contrasena)
grep -o 'static/js/main\.[^"]*' /var/www/elohim/EscuelasElohim/frontend/build/index.html
grep -q restablecer-contrasena /var/www/elohim/EscuelasElohim/frontend/build/static/js/main.*.js \
  && echo "frontend OK" || echo "frontend DESACTUALIZADO — ejecuta npm run build"
```

- La home debe responder `200`.
- El login con credenciales falsas debe responder `401` o `400`, **no** `502`.
- **Restablecer contraseña:** el API debe responder `200` (usuario inexistente también devuelve 200). Si responde `404`, el backend no se actualizó.
- **Frontend:** si `grep restablecer-contrasena` falla, el build es viejo; incógnito no ayuda porque el servidor sirve JS antiguo.

Probar en el navegador:

- App: https://escuelaselohim.com
- Restablecer: https://escuelaselohim.com/restablecer-contrasena (debe decir «Restablecer Contraseña», no el login)
- Admin Django: https://escuelaselohim.com/admin/

---

## Variables de entorno

### Django — `/etc/elohimcoban.env`

No commitear este archivo. Editar solo si cambian dominio, BD o CORS:

```bash
sudo nano /etc/elohimcoban.env
sudo systemctl restart elohimcoban
```

Ejemplo con dominio y HTTPS:

```env
SECRET_KEY=...
DEBUG=False
ALLOWED_HOSTS=127.0.0.1,localhost,162.243.93.136,escuelaselohim.com,www.escuelaselohim.com

DB_NAME=elohimcoban_db
DB_USER=elohimcoban
DB_PASSWORD=...
DB_HOST=localhost
DB_PORT=5432

CORS_ALLOWED_ORIGINS=https://escuelaselohim.com,https://www.escuelaselohim.com
CSRF_TRUSTED_ORIGINS=https://escuelaselohim.com,https://www.escuelaselohim.com
```

### Frontend — `frontend/.env.production`

Antes de cada `npm run build` en producción:

```env
REACT_APP_API_URL=/api
```

Con eso las peticiones van a `https://escuelaselohim.com/api/...` (mismo host, sin mixed content).

---

## Solo backend / solo frontend

**Solo backend** (modelos, API, admin):

```bash
cd /var/www/elohim/EscuelasElohim/backend
source venv/bin/activate
export DJANGO_ENV_FILE=/etc/elohimcoban.env
git -C .. pull
pip install -r requirements.txt
python manage.py migrate
python manage.py collectstatic --noinput
deactivate
sudo systemctl restart elohimcoban
```

**Solo frontend** (React):

```bash
cd /var/www/elohim/EscuelasElohim
git pull
cd frontend
npm ci
npm run build
sudo nginx -t && sudo systemctl reload nginx
```

---

## Build del frontend en PC local (droplet con poca RAM)

En tu máquina:

```bash
cd frontend
cp .env.production.example .env.production
# Editar: REACT_APP_API_URL=/api
npm ci
npm run build
```

Subir al servidor:

```bash
rsync -avz --delete frontend/build/ root@162.243.93.136:/var/www/elohim/EscuelasElohim/frontend/build/
```

En el servidor:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## Nginx: dos sitios

- **`elohimcoban`**: acceso por IP (`162.243.93.136`). Define el `upstream elohimcoban_app` (socket Gunicorn).
- **`escuelaselohim.com`**: dominio + HTTPS (Certbot). **No** repetir el bloque `upstream` (provoca `duplicate upstream` y Nginx no recarga).

Plantilla IP (desde el repo):

```bash
REPO=/var/www/elohim/EscuelasElohim
sudo sed "s|__REPO__|${REPO}|g" "$REPO/deploy/nginx.conf.example" | sudo tee /etc/nginx/sites-available/elohimcoban
sudo ln -sf /etc/nginx/sites-available/elohimcoban /etc/nginx/sites-enabled/
```

El sitio del dominio debe incluir al menos:

- `location /api/` → `proxy_pass http://elohimcoban_app;` (sin barra final en `proxy_pass`)
- `location /admin/` → mismo upstream
- `location = /admin` → `return 301 https://$host/admin/;`
- `location /` → `frontend/build` con `try_files` para SPA
- `/static/admin/` y `/static/rest_framework/` → `backend/staticfiles/`
- resto de `/static/` → `frontend/build/static/`

Recargar:

```bash
sudo nginx -t && sudo systemctl reload nginx
```

---

## Servicios útiles

```bash
# Backend
sudo systemctl status elohimcoban
sudo systemctl restart elohimcoban
sudo journalctl -u elohimcoban -n 50 --no-pager

# Nginx
sudo nginx -t
sudo systemctl reload nginx
sudo tail -n 50 /var/log/nginx/error.log

# Socket Gunicorn
ls -la /run/gunicorn/elohimcoban.sock
```

---

## Problemas frecuentes

| Síntoma | Causa habitual | Qué hacer |
|---------|----------------|-----------|
| `502` en `/api/` | Nginx apunta a `127.0.0.1:8000` o config no recargada | Usar `proxy_pass http://elohimcoban_app;`, `sudo nginx -t && reload` |
| Log: `127.0.0.1:8000/auth/login/` | `proxy_pass` con `/` final quita `/api/` | Quitar la barra: `proxy_pass http://elohimcoban_app;` |
| `duplicate upstream elohimcoban_app` | `upstream` en dos archivos enabled | Dejar `upstream` solo en `elohimcoban` |
| Login bloqueado (mixed content) | Frontend con `http://162.243.93.136/api` | `REACT_APP_API_URL=/api` y `npm run build` |
| `/admin/` muestra React | Falta `location /admin/` en sitio del dominio | Añadir proxy a Gunicorn (ver arriba) |
| `npm run build` OOM | Poca RAM en droplet | `NODE_OPTIONS=--max-old-space-size=3072` o build local + `rsync` |
| Restablecer → login / API 404 | Código no actualizado en servidor o Nginx sirve otro `build/` | Ver sección **Restablecer contraseña no funciona** abajo |

---

## Restablecer contraseña no funciona

Si tras `git pull` y `npm run build` sigues viendo login en `/restablecer-contrasena` o el API responde `404`:

### 1. Diagnóstico (en el servidor)

```bash
export REPO=/var/www/elohim/EscuelasElohim
bash "$REPO/deploy/diagnostico.sh"
```

### 2. Forzar código nuevo (si `git log` no muestra commit `contras`)

```bash
cd /var/www/elohim/EscuelasElohim
git fetch origin
git reset --hard origin/main
git log -1 --oneline   # debe incluir "contras" o un commit posterior
grep restablecer backend/usuarios/urls.py frontend/src/App.js
```

### 3. Rebuild backend + frontend

```bash
export REPO=/var/www/elohim/EscuelasElohim

cd "$REPO/backend"
source venv/bin/activate
export DJANGO_ENV_FILE=/etc/elohimcoban.env
python manage.py check
deactivate
sudo systemctl restart elohimcoban

cd "$REPO/frontend"
npm ci
export NODE_OPTIONS="--max-old-space-size=3072"
npm run build

# Debe decir OK:
grep -q restablecer-contrasena build/static/js/main.*.js && echo "build OK"
```

### 4. Comprobar que Nginx sirve ESE build

```bash
# Ruta que Nginx usa para el dominio
nginx -T 2>/dev/null | grep -E 'server_name|root ' | grep -A1 escuelaselohim

# JS en disco vs JS que entrega el sitio (deben coincidir)
grep -oE 'main\.[a-f0-9]+\.js' "$REPO/frontend/build/index.html"
curl -sL https://escuelaselohim.com/ | grep -oE 'main\.[a-f0-9]+\.js'
```

Si el hash es distinto (ej. disco `main.94b2f367.js` pero web `main.529df85c.js`), el `root` de Nginx **no apunta** a `$REPO/frontend/build`. Edita `/etc/nginx/sites-available/escuelaselohim.com` y corrige la ruta.

### 5. Alternativa: build en tu PC y subir con rsync

En tu ThinkPad (con el repo actualizado):

```bash
cd frontend
npm ci && npm run build
rsync -avz --delete build/ root@162.243.93.136:/var/www/elohim/EscuelasElohim/frontend/build/
```

En el servidor:

```bash
sudo nginx -t && sudo systemctl reload nginx
grep -q restablecer-contrasena /var/www/elohim/EscuelasElohim/frontend/build/static/js/main.*.js && echo OK
curl -s -o /dev/null -w "%{http_code}\n" -X POST https://escuelaselohim.com/api/auth/restablecer-contrasena/ \
  -H "Content-Type: application/json" -d '{"username":"x","password_nueva":"a","password_nueva_confirm":"a"}'
```

El API debe responder **200** (no 404). La página debe mostrar «Restablecer Contraseña».

---

## Primera instalación

Para despliegue inicial completo (PostgreSQL, venv, systemd, Nginx, Certbot), ver **Producción** en [README.md](README.md) y los ejemplos en `deploy/`:

- `deploy/gunicorn.service.example`
- `deploy/nginx.conf.example`
- `.env.production.example`
- `frontend/.env.production.example`
