# PrePa — Prepara tu futuro

Plataforma de gestión académica para preuniversitario PAES en Punta Arenas.
Monorepo con landing pública, login multi-rol (estudiante / apoderado / admin),
panel administrativo, dashboards de alumnos y apoderados, y registro de
asistencia / justificaciones.

## Stack

| Capa     | Tecnología                                                              |
| -------- | ----------------------------------------------------------------------- |
| Frontend | React 18 + Vite 7 + React Router 7 + Tailwind + shadcn/ui (Radix)       |
| Backend  | PocketBase 0.38 (SQLite + JS migrations + JS hooks)                     |
| Build    | npm workspaces (`apps/web` + `apps/pocketbase`)                         |
| Deploy   | Docker / Coolify (VPS)                                                  |

## Estructura

```
apps/
  web/              React SPA
    src/
      pages/        HomePage, LoginPage, AdminDashboard, EstudianteDashboard, ApoderadoDashboard, CourseDetailPage
      components/   UI + dominio (CourseCard, MaterialCard, JustificationModal, …)
      contexts/     AuthContext
      lib/          pocketbaseClient
    Dockerfile      multi-stage (node build → nginx serve)
    nginx.conf      SPA fallback + cache de assets

  pocketbase/       Backend
    pb_migrations/  Schema y reglas (append-only)
    pb_hooks/       Hooks JS server-side
    scripts/        entrypoint.sh + setup local
    Dockerfile      descarga binario PB y arranca

docker-compose.yml  Orquesta web + pocketbase
.env.example        Plantilla de variables
```

## Desarrollo local

### Sin Docker

```bash
# 1. Instalar deps del monorepo
npm install

# 2. Descargar binario de PocketBase (sólo la primera vez)
cd apps/pocketbase && ./scripts/setup.sh && cd ../..

# 3. Levantar web (3000) + pocketbase (8090) en paralelo
npm run dev
```

La SPA queda en http://localhost:3000 y el admin UI de PocketBase en
http://localhost:8090/_/.

> Nota: el cliente PocketBase apunta a `/hcgi/platform` por defecto (proxy de
> Horizons). Para correr sin ese proxy seteá `VITE_POCKETBASE_URL=http://localhost:8090`
> en un archivo `.env` dentro de `apps/web/`.

### Con Docker Compose

```bash
cp .env.example .env
# Editar .env y setear VITE_POCKETBASE_URL=http://localhost:8090

docker compose up --build
```

- Web: http://localhost:8080
- PocketBase: http://localhost:8090

## Deploy en Coolify (VPS)

### Arquitectura recomendada

Dos servicios separados, dos subdominios:

- `prepapuq.cl` → contenedor web
- `api.prepapuq.cl` → contenedor pocketbase

### Pasos

1. **Conectá el repo** en Coolify (Application → Public/Private Git).
2. **Servicio PocketBase**:
   - Type: **Dockerfile**
   - Dockerfile location: `apps/pocketbase/Dockerfile`
   - Build context: `apps/pocketbase`
   - Port: `8090`
   - Persistent volume: `/pb/pb_data` → asignar storage de Coolify (importante,
     sin esto perdés la BD en cada redeploy)
   - Domain: `api.prepapuq.cl`
   - Environment:
     - `PB_ENCRYPTION_KEY` = (32 chars, generar con `openssl rand -hex 16`)
3. **Servicio Web**:
   - Type: **Dockerfile**
   - Dockerfile location: `apps/web/Dockerfile`
   - Build context: `.` (raíz del repo)
   - Port: `80`
   - Domain: `prepapuq.cl`
   - Build args:
     - `VITE_POCKETBASE_URL` = `https://api.prepapuq.cl`
4. Deployá primero PocketBase, abrí el admin UI en
   `https://api.prepapuq.cl/_/`, creá la cuenta superuser y verificá
   que las migraciones corrieron (deberías ver las colecciones `users`,
   `cursos`, `materiales`, `asignaciones`, `asistencia`, `parent_student`,
   `justifications`, `leads`).
5. Deployá Web. Probá login en `https://prepapuq.cl/login`.

### Backup de pb_data

```bash
# Tomar snapshot del volumen
docker run --rm -v prepa_pb_data:/data -v $(pwd):/backup alpine \
  tar czf /backup/pb_data_$(date +%F).tar.gz -C /data .
```

Para producción configurá backups automáticos del volumen desde Coolify.

## Roles y reglas

| Rol           | Login | Dashboard                      | Permisos clave                              |
| ------------- | ----- | ------------------------------ | ------------------------------------------- |
| `estudiante`  | ✓     | `/dashboard/estudiante`        | Ver sus cursos asignados y materiales       |
| `apoderado`   | ✓     | `/dashboard/apoderado`         | Ver asistencia de pupilos, justificar       |
| `admin`       | ✓     | `/dashboard/admin`             | CRUD de cursos, materiales, matrícula, asistencia |

Las reglas viven en migraciones JS dentro de `apps/pocketbase/pb_migrations/`.
Cualquier cambio de reglas se hace **agregando** una nueva migración (no
editando las existentes).

## Variables de entorno

Ver [`.env.example`](.env.example) para la lista completa. Resumen:

| Variable                | Dónde       | Para qué                                          |
| ----------------------- | ----------- | ------------------------------------------------- |
| `VITE_POCKETBASE_URL`   | Build web   | URL pública del backend (hardcoded en el bundle)  |
| `PB_ENCRYPTION_KEY`     | Runtime PB  | Cifra `settings` de PB en disco (opcional)        |

## Scripts útiles

```bash
npm run dev              # Web + PocketBase en paralelo
npm run build            # Build de la SPA
npm run lint             # ESLint sobre apps/web
```

## Configuración de email (recuperación de contraseña)

El flujo "Olvidé mi contraseña" (`/forgot-password`) usa PocketBase para enviar
el email de recuperación. Para que llegue de verdad, configurá SMTP en el
admin de PocketBase:

1. Entrá a `https://api.prepapuq.cl/_/`.
2. **Settings → Mail settings**: marcá "Use SMTP mail server" y completá host,
   puerto, usuario, contraseña y dirección remitente (cualquier proveedor:
   Hostinger Mail, Mailgun, SendGrid, Resend, etc.).
3. **Settings → Application**: poné en "Application URL" la URL pública del
   frontend (`https://prepapuq.cl`). PocketBase la usa para armar el
   link del email.
4. **Collections → users → Options → Reset password email**: ajustá el
   template para que el enlace apunte a `{APP_URL}/reset-password?token={TOKEN}`.
   (Por defecto va a `/auth/confirm-password-reset/...`, hay que cambiarlo.)
5. Probá el flujo desde `/forgot-password`.

## Notas de seguridad

- Las credenciales OAuth de Google que figuran en `Captura de pantalla 2026-04-12 114850.png`
  fueron expuestas en el repo. **Revocá y regenerá** en Google Cloud Console
  antes de habilitar el flujo OAuth.
- No commitees `.env` (ya está en `.dockerignore`; agregalo a `.gitignore` si
  inicializás git aquí).
- Hacé el primer login al admin de PocketBase apenas deployes y rotá la
  contraseña sugerida.
