# Deploy en Coolify (VPS)

Guía completa para deployar el monorepo en Coolify con dos servicios separados,
volumen persistente para la BD, y TLS automático.

## Prerrequisitos

- VPS con Coolify ≥ 4.x instalado y accesible.
- Dominio con DNS apuntando al VPS. Vas a usar dos subdominios:
  - `prepa.tudominio.cl` — frontend
  - `api.prepa.tudominio.cl` — backend (PocketBase)
- Repo del proyecto en GitHub/GitLab/Bitbucket (Coolify se conecta vía git).

## Arquitectura del deploy

```
                       ┌──── Coolify ────┐
                       │                 │
  prepa.tudominio.cl  ─┤  Web (nginx)    │
                       │  port 80        │
                       │                 │
                       ├─────────────────┤
                       │                 │
  api.prepa…          ─┤  PocketBase     │
                       │  port 8090      │
                       │  volume:        │
                       │   /pb/pb_data   │
                       └─────────────────┘
```

## Paso 1 — Subir el repo

```bash
cd prepa
git init
git add .
git commit -m "Initial commit"
git remote add origin <url-de-tu-repo>
git push -u origin main
```

(Si el repo ya existe, simplemente pusheá.)

## Paso 2 — Crear servicio PocketBase

En Coolify:

1. **Resources → New Resource → Application**.
2. **Source**: tu repo de git.
3. **Build Pack**: Dockerfile.
4. **Configuración**:
   - **Dockerfile location**: `apps/pocketbase/Dockerfile`
   - **Base directory** (build context): `apps/pocketbase`
   - **Port exposes**: `8090`
   - **Domains**: `https://api.prepa.tudominio.cl`
5. **Environment Variables**:
   - `PB_ENCRYPTION_KEY` = `<generar con openssl rand -hex 16>` (opcional pero recomendado)
6. **Persistent Storage**:
   - Source path: `/pb/pb_data`
   - Type: Volume (no bind mount).
   - **⚠️ Crítico**: sin esto, perdés la BD en cada redeploy.
7. **Healthcheck**: el Dockerfile ya define uno (`/api/health`). Coolify lo respeta.
8. **Deploy**.

Esperá a que termine. Verificá:
- `https://api.prepa.tudominio.cl/api/health` → debería devolver `{"code":200,"message":"API is healthy."}`
- `https://api.prepa.tudominio.cl/_/` → admin UI

### Crear superuser

Primera vez: el admin UI te pide crear un superuser. Hacelo con un email que
recuerdes y una contraseña fuerte. Esa cuenta administra TODO PocketBase
(incluido borrar colecciones), así que cuidala.

### Configurar la URL pública de PocketBase

En el admin de PB:
- **Settings → Application → Application URL**: poné `https://prepa.tudominio.cl`
  (la URL del frontend — PB la usa para armar los links de los emails de reset).

## Paso 3 — Crear servicio Web

1. **Resources → New Resource → Application**.
2. **Source**: el mismo repo.
3. **Build Pack**: Dockerfile.
4. **Configuración**:
   - **Dockerfile location**: `apps/web/Dockerfile`
   - **Base directory** (build context): `.` (raíz del repo — necesita el package-lock.json y la estructura del monorepo)
   - **Port exposes**: `80`
   - **Domains**: `https://prepa.tudominio.cl`
5. **Build arguments** (NO environment variables — el Vite necesita esto al BUILD time, no al runtime):
   - `VITE_POCKETBASE_URL` = `https://api.prepa.tudominio.cl`
6. **Deploy**.

Esperá. Verificá:
- `https://prepa.tudominio.cl/` → debe renderizar la landing de PrePa.
- DevTools → Network: las llamadas a la API deben ir a `https://api.prepa.tudominio.cl/...`

## Paso 4 — Configurar SMTP en PocketBase

Sin esto, los emails de "olvidé mi contraseña" no salen.

1. Admin PB → **Settings → Mail settings**.
2. Marcá "Use SMTP mail server".
3. Completá con los datos de tu proveedor. Ejemplo con Hostinger Mail:
   - Host: `smtp.hostinger.com`
   - Port: `465`
   - Username: `noreply@tudominio.cl`
   - Password: la del buzón
   - Sender name: `PrePa`
   - Sender address: `noreply@tudominio.cl`
   - TLS: `SMTPS` (puerto 465) o `STARTTLS` (587), según tu proveedor.
4. **Test email** desde la misma pantalla. Si llega, OK.
5. **Settings → Collections → users → Options → Mail templates**:
   - **Reset password**: editá el `Action URL` a:
     ```
     {APP_URL}/reset-password?token={TOKEN}
     ```
     (Por defecto apunta a `{APP_URL}/_/#/auth/confirm-password-reset/{TOKEN}` que es el admin, no la app.)

## Paso 5 — Datos iniciales

Levantá PocketBase y crea desde el admin:
- 1+ usuario admin (`rol = "admin"`)
- Usuarios estudiantes y apoderados según necesidad
- Registros en `parent_student` para vincular apoderados ↔ pupilos

O usá las migraciones seed existentes (Marta y Camila).

## Paso 6 — Backups del volumen pb_data

Coolify permite snapshots de volúmenes desde su UI. Configurá:
- Frecuencia: diaria
- Retención: al menos 7 días
- Storage destino: S3 o filesystem local

Backup manual desde el VPS:
```bash
docker run --rm \
  -v <nombre-del-volumen>:/data \
  -v $(pwd):/backup \
  alpine \
  tar czf /backup/pb_data_$(date +%F).tar.gz -C /data .
```

Restaurar:
```bash
docker run --rm \
  -v <nombre-del-volumen>:/data \
  -v $(pwd):/backup \
  alpine \
  tar xzf /backup/pb_data_YYYY-MM-DD.tar.gz -C /data
```

## Paso 7 — CI/CD básico

Coolify soporta auto-deploy en push a una rama. Configurá:
- **Settings → Source → Branch**: `main`
- **Auto deploy**: ✓

Ahora cada `git push origin main` redeploya los dos servicios.

Para pre-prod usá una rama `staging` y dos servicios paralelos con dominios
distintos (`staging.prepa.tudominio.cl`).

## Paso 8 — Monitoreo y logs

- **Coolify → Application → Logs**: ver logs de stdout/stderr en tiempo real.
- **Healthchecks** del Dockerfile: Coolify los muestra como verde/rojo en el dashboard.
- Para alertas externas integrá con Uptime Kuma, Better Uptime, o el monitor que uses.

## Variables de entorno por entorno

| Variable              | Local (Docker) | Staging                              | Producción                             |
| --------------------- | -------------- | ------------------------------------ | -------------------------------------- |
| `VITE_POCKETBASE_URL` | `http://localhost:8090` | `https://staging-api.prepa…` | `https://api.prepa.tudominio.cl` |
| `PB_ENCRYPTION_KEY`   | vacío (OK)     | random 32-char                       | random 32-char (NO el mismo que staging) |

## Rotación de PB_ENCRYPTION_KEY

⚠️ **Cambiar la encryption key después de tener datos rompe los settings cifrados.**

Procedimiento:
1. Backup completo del volumen.
2. Admin PB → Settings → Backups → "Generate".
3. Bajá el backup `.zip`.
4. Cambiá la env var en Coolify.
5. Restart container.
6. Subí el backup desde el admin (Settings → Backups → "Upload").
7. PB redesencripta con la nueva key.

## Troubleshooting deploy

Ver [`07-troubleshooting.md`](07-troubleshooting.md) sección "Deploy en Coolify".
