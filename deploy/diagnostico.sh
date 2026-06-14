#!/usr/bin/env bash
# Diagnóstico en el servidor: por qué no aparece restablecer-contrasena.
# Uso: bash deploy/diagnostico.sh

REPO="${REPO:-/var/www/elohim/EscuelasElohim}"

echo "========== GIT =========="
cd "$REPO" || exit 1
git remote -v
git branch -v
git log -3 --oneline
echo ""
echo "¿Código fuente incluye restablecer?"
grep -n restablecer backend/usuarios/urls.py 2>/dev/null || echo "  backend/urls.py: NO"
grep -n restablecer frontend/src/App.js 2>/dev/null || echo "  frontend/App.js: NO"

echo ""
echo "========== BUILD LOCAL EN SERVIDOR =========="
if [ -f frontend/build/index.html ]; then
  echo "index.html JS:"
  grep -oE 'static/js/main\.[a-f0-9]+\.js' frontend/build/index.html
  if grep -q restablecer-contrasena frontend/build/static/js/main.*.js 2>/dev/null; then
    echo "  build: OK (contiene restablecer-contrasena)"
  else
    echo "  build: VIEJO (falta restablecer-contrasena) → ejecuta: cd frontend && npm run build"
  fi
else
  echo "  No existe frontend/build/index.html"
fi

echo ""
echo "========== NGINX (¿de dónde sirve el frontend?) =========="
nginx -T 2>/dev/null | grep -E 'server_name|root |alias ' | grep -A0 -B0 escuelaselohim || true
nginx -T 2>/dev/null | awk '/server_name.*escuelaselohim/{p=1} p&&/root |alias /{print; p=0}' || \
  grep -E 'root|alias' /etc/nginx/sites-enabled/* 2>/dev/null | head -20

echo ""
echo "========== BACKEND (Gunicorn) =========="
systemctl is-active elohimcoban 2>/dev/null || echo "servicio no activo"
echo "WorkingDirectory esperado: $REPO/backend"
grep WorkingDirectory /etc/systemd/system/elohimcoban.service 2>/dev/null || true

echo ""
echo "========== API (desde internet) =========="
curl -s -o /dev/null -w "POST restablecer-contrasena: HTTP %{http_code}\n" \
  -X POST "https://escuelaselohim.com/api/auth/restablecer-contrasena/" \
  -H "Content-Type: application/json" \
  -d '{"username":"x","password_nueva":"a","password_nueva_confirm":"a"}'
curl -s -o /dev/null -w "POST login: HTTP %{http_code}\n" \
  -X POST "https://escuelaselohim.com/api/auth/login/" \
  -H "Content-Type: application/json" \
  -d '{"username":"x","password":"x"}'

echo ""
echo "========== JS que sirve el dominio (desde internet) =========="
curl -sL "https://escuelaselohim.com/" | grep -oE 'static/js/main\.[a-f0-9]+\.js' || echo "no se pudo leer"

echo ""
echo "Si git log NO muestra commit 'contras' (8437858), el servidor no tiene el código nuevo."
echo "Si el build local OK pero el JS de internet es distinto, Nginx apunta a otra carpeta."
