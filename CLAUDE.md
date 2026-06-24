# Contexto del proyecto — PrePa

> Este archivo es el "primer mensaje" para cualquier sesión nueva de Claude
> (Code, Desktop, web). Pegá su contenido o ábrelo al iniciar la sesión y la
> IA tendrá el contexto completo sin tener que descubrirlo de cero.

## Qué es

**PrePa — Prepara tu futuro**: plataforma web para un preuniversitario PAES en
Punta Arenas (Chile). Gestiona cursos, materiales, matrículas, asistencia y
justificaciones de inasistencias. Tres roles: estudiante, apoderado, admin.

## Stack

- **Frontend**: React 18 + Vite 7 + React Router 7 + Tailwind + shadcn/ui (Radix). JavaScript (no TS).
- **Backend**: PocketBase 0.38 (Go, SQLite, migraciones y hooks en JS).
- **Monorepo**: npm workspaces — `apps/web` + `apps/pocketbase`.
- **Deploy target**: Coolify en VPS propio. Dockerfile por app + docker-compose.

## Estructura mínima

```
prepa/
├── apps/
│   ├── web/                 React SPA
│   │   ├── src/pages/       HomePage, LoginPage, ForgotPasswordPage,
│   │   │                    ResetPasswordPage, AdminDashboard,
│   │   │                    EstudianteDashboard, ApoderadoDashboard,
│   │   │                    CourseDetailPage
│   │   ├── src/components/  CourseCard, MaterialCard, JustificationModal,
│   │   │                    AttendanceTab, StudentSearchCombobox, Header,
│   │   │                    Footer, ContactForm, ProtectedRoute, ui/*
│   │   ├── src/contexts/    AuthContext
│   │   ├── src/lib/         pocketbaseClient (lee VITE_POCKETBASE_URL)
│   │   ├── Dockerfile       multi-stage Node → nginx
│   │   ├── nginx.conf       SPA fallback + cache de assets
│   │   └── vite.config.js   Config Vite limpia (React + alias @ + monorepo)
│   └── pocketbase/
│       ├── pb_migrations/   34 originales + 1 fix (1780617600_…)
│       ├── pb_hooks/        builder-mailer, custom-migrations-cmd, external-dashboard
│       ├── Dockerfile       descarga binario PB 0.38 amd64/arm64
│       └── scripts/         entrypoint.sh + setup.sh
├── docker-compose.yml
├── .env.example
├── README.md
├── CLAUDE.md                (este archivo)
└── docs/
    ├── 01-arquitectura.md
    ├── 02-modelo-datos.md
    ├── 03-desarrollo-local.md
    ├── 04-deploy-coolify.md
    ├── 05-cambios-recientes.md
    ├── 06-pendientes.md
    └── 07-troubleshooting.md
```

## Decisiones tomadas (no las cambies sin avisar)

- **Vite SPA, no Next.js** — la app no necesita SSR/SSG. Vite es más simple para esto.
- **PocketBase, no Postgres + API custom** — un solo binario con auth, files, hooks. Suficiente para esta escala.
- **Reglas en migraciones JS** — append-only. **Nunca editar una migración existente** una vez aplicada; siempre agregar una nueva con el cambio.
- **Cliente PB lee `VITE_POCKETBASE_URL` con fallback a `http://127.0.0.1:8090`** — la URL pública se hornea en build; el fallback es solo para dev local. (Se eliminó el viejo fallback `/hcgi/platform` de Horizons junto con toda su tooling: ver `docs/05-cambios-recientes.md`.)
- **Apoderado ve asistencia de pupilos vía join `parent_student`** — implementado en la migración `1780617600_…` con el operador `?=` de PocketBase.

## Comandos clave

```bash
npm install              # instala workspace completo
npm run dev              # web (3000) + pocketbase (8090) en paralelo
npm run build            # build SPA → dist/apps/web
npm run lint             # ESLint
docker compose up --build  # levanta todo en containers
```

## Variables de entorno

| Var                   | Dónde      | Para qué                                                  |
| --------------------- | ---------- | --------------------------------------------------------- |
| `VITE_POCKETBASE_URL` | Build web  | URL pública del backend (hardcoded en el bundle al build) |
| `PB_ENCRYPTION_KEY`   | Runtime PB | Cifra settings de PB en disco (opcional, 32 chars)        |

Ver [`.env.example`](.env.example).

## Estado actual

✅ **Terminado** — bugs críticos corregidos, mocks reemplazados por datos reales,
flujo de password reset implementado, dockerizado, documentado.

⏳ **Pendiente** — ver [`docs/06-pendientes.md`](docs/06-pendientes.md).

## Siguiente paso de seguridad (importante)

Las credenciales OAuth de Google del archivo `Captura de pantalla 2026-04-12 114850.png`
**fueron expuestas**. Revocar y regenerar en
[Google Cloud Console](https://console.cloud.google.com/apis/credentials)
**antes** de habilitar el botón "Iniciar con Google".

## Para una sesión nueva con IA

1. Abrí esta carpeta en Claude Code / Cursor / IDE.
2. La IA debe leer `CLAUDE.md` y `docs/` antes de tocar código.
3. Si vas a hacer cambios de modelo de datos → agregar **migración nueva** (no editar las existentes).
4. Si vas a tocar reglas de PocketBase → mirar `docs/02-modelo-datos.md` sección "Reglas de acceso por rol".
