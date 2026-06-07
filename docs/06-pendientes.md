# Pendientes

Lista priorizada de cosas por hacer. Marcá con `[x]` al completar.

## Acción inmediata (antes del primer deploy)

- [ ] **Revocar credenciales OAuth de Google expuestas**
  El cliente `1004147035116-u3sv8jhs3akav5ce57q1d3a61n7qhgeg` y su secret
  `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` aparecen en
  `Captura de pantalla 2026-04-12 114850.png`. Entrar a
  [Google Cloud Console](https://console.cloud.google.com/apis/credentials),
  borrar el cliente y crear uno nuevo. Después borrar el PNG del repo.

- [ ] **Agregar `.gitignore`** que excluya:
  ```
  node_modules
  dist
  .env
  .env.local
  apps/pocketbase/pb_data
  apps/pocketbase/pocketbase
  Captura*.png
  *.webp  (si no querés versionar el logo y la foto)
  Temario-*.pdf  (si los temarios son pesados / cambian)
  ```

- [ ] **Inicializar git y pushear a un remoto**
  ```bash
  git init
  git add .
  git commit -m "Initial commit: PrePa monorepo"
  git remote add origin <url>
  git push -u origin main
  ```

## Setup de producción

- [ ] **Crear servicios en Coolify** siguiendo [`04-deploy-coolify.md`](04-deploy-coolify.md).

- [ ] **Configurar SMTP** en el admin de PocketBase (necesario para "olvidé mi contraseña").

- [ ] **Editar el template de reset password** en PB para que apunte a `{APP_URL}/reset-password?token={TOKEN}` (default va al admin).

- [ ] **Setear `Application URL`** en PB Settings → Application al dominio público del frontend.

- [ ] **Cargar datos iniciales**: 1+ admin, algunos estudiantes y apoderados, vínculos `parent_student`, algunos cursos.

- [ ] **Verificar que las migraciones corrieron** entrando al admin PB y revisando que existen las 8 colecciones: users, cursos, materiales, asignaciones, asistencia, justifications, parent_student, leads.

- [ ] **Configurar backups del volumen** `pb_data` en Coolify.

## Features que valen la pena

- [ ] **Botón "Iniciar con Google" en LoginPage**
  - Requiere haber regenerado las credenciales OAuth.
  - En PB admin → Collections → users → Options → OAuth2 → enable Google provider.
  - En `LoginPage.jsx` agregar botón que llame a `pb.collection('users').authWithOAuth2({ provider: 'google' })`.

- [ ] **Endurecer `createRule` de `justifications`**
  Hoy es `@request.auth.id != ""` (cualquier autenticado puede crear con cualquier user_id).
  Migración propuesta:
  ```js
  c.createRule = `@request.auth.rol = "admin"
    || @request.auth.id = user_id
    || (@collection.parent_student.parent_id ?= @request.auth.id
        && @collection.parent_student.student_id ?= user_id)`;
  ```

- [ ] **Sistema de notificaciones / emails**
  - Cuando se pasa asistencia y un estudiante queda ausente → enviar email al apoderado.
  - Implementable como hook server-side en `pb_hooks/`.

- [ ] **Sistema de notas / evaluaciones**
  Nueva colección `evaluaciones` con `user_id`, `curso_id`, `fecha`, `nota`, `tipo`.
  Volver a poner la card "Rendimiento" en el dashboard del apoderado.

- [ ] **Sistema de pagos**
  Nueva colección `pagos` con `user_id` (el apoderado), `monto`, `fecha_vencimiento`, `estado`.
  Volver a poner "Próximo Pago" en el dashboard.

- [ ] **Dashboard del admin: reportes**
  Tab "Reportes" con: asistencia promedio por curso, estudiantes con < 75% asistencia, leads sin contactar.

## Mejoras técnicas (no urgentes)

- [ ] **Migrar a TypeScript** — todo el front es JSX/JS plano. Mejor DX, menos bugs.

- [ ] **Tests** — Vitest + React Testing Library para componentes críticos (ProtectedRoute, AuthContext, AdminDashboard tabs).

- [ ] **Migrar a TanStack Query** (React Query) — el fetching manual con `useEffect + useState` se va a volver inmantenible. TanStack Query da cache, refetch, optimistic updates gratis.

- [ ] **Schema validation con Zod** — los formularios usan `react-hook-form` pero no aprovechan Zod para validación (aunque está en deps).

- [ ] **Lazy-loading de rutas** — `React.lazy(() => import('./pages/AdminDashboard'))` para reducir el bundle inicial.

- [ ] **Atender vulnerabilidades de npm** — `npm audit` reporta 3 (1 moderate, 2 high). Revisar cuáles son antes de hacer `audit fix`.

- [ ] **Quitar plugins de Horizons** del `vite.config.js` si dejás esa plataforma definitivamente. Hoy están condicionados a `isDev` así que no rompen el build de prod, pero ocupan deps.

- [ ] **Internacionalización** — si en algún momento se expande fuera de Chile.

## Limpieza del repo

- [ ] Borrar el PNG `Captura de pantalla 2026-04-12 114850.png` después de revocar las credenciales.
- [ ] Decidir si los `Temario-*.pdf` y las imágenes (`unnamed.webp`, logo `.webp`) deben estar versionados o servidos desde un CDN/PB files.
- [ ] Borrar `cropped-Gemini_Generated_Image...webp` y reemplazar por un asset con nombre razonable (`logo.webp`).

## Decisiones pendientes

- [ ] **¿Una instancia por colegio (multi-tenant) o solo PrePa Punta Arenas?**
  Si es multi-tenant: agregar colección `tenants`, filtrar todas las queries por `tenant_id`, etc. Cambio grande.

- [ ] **¿Self-host del PocketBase o managed (e.g. PocketHost)?**
  Self-host es el camino actual (Coolify). PocketHost te ahorra ops pero cuesta plata.

- [ ] **¿Qué hacer con el `pb_data` actual de Horizons?**
  Si querés migrar los usuarios y datos existentes desde Horizons, hay que exportar el `pb_data` de allá y subirlo al nuevo deploy.
