#!/usr/bin/env bash
# Actualiza backend + frontend en producción y verifica restablecer-contrasena.
# Uso en el servidor:
#   export REPO=/var/www/elohim/EscuelasElohim
#   bash deploy/actualizar.sh

set -euo pipefail

REPO="${REPO:-/var/www/elohim/EscuelasElohim}"
DJANGO_ENV_FILE="${DJANGO_ENV_FILE:-/etc/elohimcoban.env}"
DOMAIN="${DOMAIN:-https://escuelaselohim.com}"

cd "$REPO"

echo "==> 1/4 Código (git pull)"
git fetch origin
BEFORE=$(git rev-parse --short HEAD)
git pull origin main || {
  echo "git pull falló. Intentando reset forzado a origin/main..."
  git reset --hard origin/main
}
AFTER=$(git rev-parse --short HEAD)
echo "    Commit: $BEFORE → $AFTER ($(git log -1 --oneline))"

if ! grep -q 'restablecer-contrasena' frontend/src/App.js; then
  echo ""
  echo "ERROR: el código en el servidor NO incluye restablecer-contrasena."
  echo "Ejecuta diagnóstico: bash deploy/diagnostico.sh"
  exit 1
fi
if ! grep -q 'restablecer-contrasena' backend/usuarios/urls.py; then
  echo ""
  echo "ERROR: el backend en el servidor NO incluye el endpoint."
  echo "Ejecuta: git fetch origin && git reset --hard origin/main"
  exit 1
fi

echo "==> 2/4 Backend"
cd "$REPO/backend"
# shellcheck disable=SC1091
source venv/bin/activate
export DJANGO_ENV_FILE
pip install -r requirements.txt -q
python manage.py migrate --noinput
python manage.py collectstatic --noinput
deactivate
sudo systemctl restart elohimcoban

echo "==> 3/4 Frontend (npm run build)"
cd "$REPO/frontend"
npm ci
export NODE_OPTIONS="${NODE_OPTIONS:---max-old-space-size=3072}"
npm run build

echo "==> 4/4 Nginx"
sudo nginx -t
sudo systemctl reload nginx

echo ""
echo "==> Verificación"

API_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST "$DOMAIN/api/auth/restablecer-contrasena/" \
  -H "Content-Type: application/json" \
  -d '{"username":"verificacion","password_nueva":"x","password_nueva_confirm":"x"}')

MAIN_JS=$(grep -oE 'static/js/main\.[a-f0-9]+\.js' "$REPO/frontend/build/index.html" | head -1)
if [ -z "$MAIN_JS" ]; then
  echo "ERROR: no se encontró main.js en frontend/build/index.html"
  exit 1
fi

if grep -q 'restablecer-contrasena' "$REPO/frontend/build/$MAIN_JS"; then
  FRONTEND_OK=1
else
  FRONTEND_OK=0
fi

echo "  Backend  POST /api/auth/restablecer-contrasena/ → HTTP $API_CODE"
echo "  Frontend bundle $MAIN_JS → restablecer-contrasena: $([ "$FRONTEND_OK" -eq 1 ] && echo OK || echo FALTA)"

if [ "$API_CODE" = "404" ]; then
  echo ""
  echo "FALLO: el backend sigue sin el endpoint. Revisa: sudo systemctl status elohimcoban"
  exit 1
fi

if [ "$FRONTEND_OK" -eq 0 ]; then
  echo ""
  echo "FALLO: el build del frontend no incluye la ruta. Vuelve a ejecutar npm run build."
  exit 1
fi

echo ""
echo "Listo. Prueba: $DOMAIN/restablecer-contrasena"
