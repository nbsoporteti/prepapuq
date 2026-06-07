# Desarrollo local

## Requisitos

| Herramienta    | Versión        | Por qué                                          |
| -------------- | -------------- | ------------------------------------------------ |
| Node.js        | ≥ 20.x         | Workspaces, ESM nativo, Vite 7                   |
| npm            | ≥ 10.x         | Workspaces                                       |
| Docker Desktop | última         | Para `docker compose` y para tests de deploy     |
| Git            | cualquier      | Para clonar/pushear el repo                      |

En Windows puro PocketBase **necesita el binario `.exe`** (el binario actual del
repo es Linux ELF). Opciones:
- Usar Docker Compose (recomendado).
- Bajar el binario Windows manualmente:
  ```powershell
  cd apps\pocketbase
  Invoke-WebRequest -Uri "https://github.com/pocketbase/pocketbase/releases/download/v0.38.0/pocketbase_0.38.0_windows_amd64.zip" -OutFile pb.zip
  Expand-Archive pb.zip .
  Remove-Item pb.zip
  ```
- Usar WSL2 (Windows Subsystem for Linux).

## Setup inicial

```bash
# 1. Clonar el repo
git clone <tu-remote> prepa
cd prepa

# 2. Instalar deps de todo el monorepo
npm install

# 3. (Opcional) Copiar plantilla de env
cp .env.example apps/web/.env.local
# Editá apps/web/.env.local y poné VITE_POCKETBASE_URL=http://localhost:8090
```

## Correr con Docker Compose (recomendado)

```bash
cp .env.example .env
# Editá .env: VITE_POCKETBASE_URL=http://localhost:8090

docker compose up --build
```

- Web: http://localhost:8080
- PocketBase: http://localhost:8090
- Admin de PB: http://localhost:8090/_/

Para detener: `docker compose down`. Para limpiar el volumen de la BD:
`docker compose down -v` (⚠️ esto borra la BD).

## Correr sin Docker

```bash
# Asegurate de tener el binario de PB correcto para tu OS en apps/pocketbase/pocketbase
npm run dev
```

Esto arranca:
- Vite dev server en http://localhost:3000 (web)
- PocketBase en http://localhost:8090

Por default el cliente apunta a `/hcgi/platform` (proxy de Horizons). Para
desarrollo local creá `apps/web/.env.local` con:
```
VITE_POCKETBASE_URL=http://localhost:8090
```

## Comandos del workspace

Desde la raíz:

| Comando                    | Qué hace                                              |
| -------------------------- | ----------------------------------------------------- |
| `npm install`              | Instala deps de todo el monorepo                      |
| `npm run dev`              | Web + PocketBase en paralelo (`concurrently`)         |
| `npm run build`            | Build de producción de la SPA → `dist/apps/web/`      |
| `npm run start`            | Sirve la SPA buildeada con `vite preview`             |
| `npm run lint`             | ESLint sobre `apps/web`                               |

Desde `apps/web`:

| Comando         | Qué hace                       |
| --------------- | ------------------------------ |
| `npm run dev`   | Solo el front (Vite, port 3000)|
| `npm run build` | Solo build de la SPA           |
| `npm run lint:warn` | Lint mostrando warnings    |

Desde `apps/pocketbase`:

| Comando                       | Qué hace                                       |
| ----------------------------- | ---------------------------------------------- |
| `npm run dev`                 | PocketBase serve (puerto 8090)                 |
| `npm run start`               | Igual pero apuntando a `/data` (modo Horizons) |
| `npm run migrations:up`       | Aplica migraciones pendientes                  |
| `npm run migrations:revert`   | Revierte la última migración                   |
| `npm run migrations:snapshot` | Genera snapshot del schema actual              |
| `npm run update`              | Actualiza el binario de PocketBase             |

## Crear cuentas de prueba

1. Levantá el stack (`docker compose up` o `npm run dev`).
2. Entrá al admin: http://localhost:8090/_/
3. Creá un superuser (la primera vez).
4. En el admin, andá a **users → New record** y creá:
   - `admin@prepa.local` con `rol = "admin"`
   - `estudiante@prepa.local` con `rol = "estudiante"`
   - `apoderado@prepa.local` con `rol = "apoderado"`
5. En **parent_student → New record**, vinculá el apoderado con el estudiante.
6. Probá login en http://localhost:8080/login (con Docker) o http://localhost:3000/login (sin Docker).

Hay también seeds en `pb_migrations/` que crean Marta (apoderado) y Camila
(estudiante) automáticamente.

## Estructura del código (web)

```
apps/web/src/
├── App.jsx              Router + AuthProvider + layout
├── main.jsx             Bootstrap (ReactDOM.render)
├── index.css            Tailwind base + tokens de tema
├── pages/               Una pantalla = un archivo
│   ├── HomePage.jsx                Landing pública
│   ├── LoginPage.jsx               /login (email + pwd)
│   ├── ForgotPasswordPage.jsx      /forgot-password
│   ├── ResetPasswordPage.jsx       /reset-password
│   ├── EstudianteDashboard.jsx     /dashboard/estudiante
│   ├── CourseDetailPage.jsx        /dashboard/estudiante/curso/:cursoId
│   ├── ApoderadoDashboard.jsx      /dashboard/apoderado
│   └── AdminDashboard.jsx          /dashboard/admin
├── components/          Reutilizables
│   ├── ui/              shadcn/ui (botones, cards, etc.)
│   ├── Header.jsx
│   ├── Footer.jsx
│   ├── CourseCard.jsx
│   ├── MaterialCard.jsx
│   ├── ProtectedRoute.jsx
│   ├── ContactForm.jsx
│   ├── JustificationModal.jsx
│   ├── StudentSearchCombobox.jsx
│   ├── EnrolledStudentsList.jsx
│   ├── AttendanceTab.jsx
│   ├── LoadingSkeletons.jsx
│   ├── VisuallyHidden.jsx
│   └── ScrollToTop.jsx
├── contexts/
│   └── AuthContext.jsx  Provee currentUser, login(), logout()
├── hooks/
│   ├── use-mobile.jsx
│   └── use-toast.js
└── lib/
    ├── pocketbaseClient.js  Singleton del SDK
    └── utils.js             cn() helper de shadcn
```

## Cómo agregar una página nueva

1. Crear el archivo en `apps/web/src/pages/MiPagina.jsx`.
2. Importarlo en `App.jsx`.
3. Agregar la `<Route />` con `<ProtectedRoute allowedRole="X">` si requiere auth.
4. Usar componentes de `@/components/ui/` (botones, cards, inputs, etc.).
5. Para fetching de datos: `pb.collection('xxx').getList(...)` con `$autoCancel: false` para evitar cancelaciones espurias durante re-renders.

## Cómo modificar el schema de PocketBase

**NUNCA** editar una migración ya aplicada. Crear una nueva:

```bash
# Nombre = unix timestamp seg + _001_ + descripcion
touch apps/pocketbase/pb_migrations/$(date +%s)_001_mi_cambio.js
```

Usar la plantilla de `02-modelo-datos.md` → sección "Crear una migración nueva".

Al reiniciar PocketBase la migración se aplica sola.

## Tipos PocketBase para autocompletado

`apps/pocketbase/database-types.d.ts` define los tipos para escribir migraciones
con autocompletado. No es necesario que tu IDE entienda TS para que funcione la
migración (PB las ejecuta como JS plano).

## Variables de entorno de Vite

Vite expone solo las que empiezan con `VITE_` al cliente. Definirlas en:
- `.env` (todos los entornos)
- `.env.local` (solo local, no commitear)
- `.env.production` (solo build de prod)

Actualmente usadas:
- `VITE_POCKETBASE_URL`

## Linting

ESLint configurado con flat config (`eslint.config.mjs`). Reglas para React,
hooks, imports. `npm run lint` corre con `--quiet` (solo errores).
