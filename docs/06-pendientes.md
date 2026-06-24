# Pendientes

Lista priorizada de cosas por hacer. Marcá con `[x]` al completar.

## Fase 2 — operación (cursos + PAES interactiva + biblioteca + pizarra)

Lo construido en la sesión 2026-06-24 (Fase 2 + Fase 2.1 + Fase 2.2 + Fase 2.3)
necesita un redeploy del backend para quedar activo. Detalle del cambio en
[`05-cambios-recientes.md`](05-cambios-recientes.md).

- [ ] **Redeploy del backend PocketBase** para correr las **9 migraciones nuevas**
  (`1781100100`–`1781100180`) y cargar el hook nuevo `users_activo_login.pb.js`:
  - `…100`–`…120`: cursos de Ciencias, lecciones y asignación de la alumna demo.
  - `…130`–`…140`: extensión de `simulacros_paes` + `resultados_simulacro_paes` y
    seed de los 8 simulacros-PDF originales.
  - `…150`–`…160` (**Fase 2.1, PAES interactiva**): campo `modo`, **archiva los 8
    simulacros-PDF**, crea `preguntas_paes` y siembra los **7 mini-ensayos
    interactivos** con 70 preguntas originales.
  - `…170` (**Fase 2.2, editor enriquecido**): agrega a `preguntas_paes` los campos
    `dificultad`, `piloto` e `imagen_enunciado`/`imagen_contexto`/`imagen_a…e`, y a
    `simulacros_paes` el campo `instrucciones`.
  - `…180` (**Fase 2.3, gestión de usuarios**): abre `create/update/delete/manageRule`
    de `users` al admin (antes solo el superuser podía crear/editar cuentas), y
    backfillea `emailVisibility=true` + `activo=true` en los usuarios existentes. El
    hook nuevo `users_activo_login.pb.js` bloquea el login si `activo=false` (soft-disable)
    y defaultea `activo=true` al crear. **Sin este redeploy el panel de usuarios no
    puede crear ni editar cuentas** (la API las rechaza) y la lista sale sin emails.

  Hasta el redeploy, los cursos y simulacros **no existen** en la DB. Tras correr,
  verificar en el admin PB: 3 cursos `materia="ciencias"`, 7 `simulacros_paes` con
  `modo="interactivo"` / `estado="publicado"` (los 8 PDF quedan `archivado`) y 70
  filas en `preguntas_paes`. **El editor visual solo puede subir imágenes una vez
  corrida la `…170`**; antes de eso falla al guardar archivos (los campos no existen).

- [ ] **Revisión pedagógica del banco de preguntas (recomendado).** Que un profe
  revise las **70 preguntas originales** de PrePa (enunciados, alternativas, clave
  correcta y explicaciones) antes de abrirlas a estudiantes reales. Editables desde
  el panel admin (`preguntas_paes`) o con una migración nueva.

- [ ] **Revisar la `tabla_conversion_json` de cada simulacro.** Por defecto es
  **referencial** (curva 100–1000 aproximada por nº de preguntas), no una tabla
  oficial DEMRE. Desde la Fase 2.2 el **editor visual permite pegar una tabla
  personalizada** ("correctas: puntaje") por simulacro; usarla si se quiere un
  puntaje más fiel. También editable por registro o migración.

- [ ] **(Diferido) Puntaje personalizado por pregunta.** El editor visual permite
  marcar preguntas **piloto** (no puntúan), pero no asignar un puntaje propio a cada
  pregunta: el hook de corrección reparte el puntaje por la tabla de conversión sobre
  el total que puntúa. Para puntajes ponderados habría que tocar el scoring
  server-side (`pb_hooks/simulacros_paes.pb.js`). Decidir si vale la pena.

- [ ] **(Futuro) Ampliar los mini-ensayos a largo PAES real.** Cada simulacro
  interactivo tiene hoy 10 preguntas (mini-ensayo de práctica). Para un ensayo
  completo, agregar más `preguntas_paes` (y el seed deriva la clave solo). Mantener
  todo como **contenido original**, nunca transcripciones DEMRE.

> ℹ️ La vieja tarea "cargar la clave DEMRE por simulacro" quedó **obsoleta** para
> el flujo interactivo: cada mini-ensayo trae su propia clave (derivada de sus
> preguntas), así que puntúa solo apenas el alumno entrega. El camino de
> clave-DEMRE solo aplicaría si se reactivara algún simulacro-PDF archivado — y aun
> así **nunca se transcriben los enunciados** (la licencia DEMRE lo prohíbe).

- [ ] **Code-splitting del bundle web** — el `index.js` ronda **1.46 MB** (gz ~430 KB)
  tras sumar **KaTeX** en la Fase 2.2; Rollup tira el warning de >500 KB. No bloquea,
  pero conviene `React.lazy` por ruta (sobre todo el editor PAES y `katex`) o
  `build.rollupOptions.output.manualChunks` para bajar el JS inicial.

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
  Ya existe la tab **"Resumen"** (Fase 2.3) con contadores: estudiantes, apoderados,
  profesores, administrativos, cursos, simulacros, pagos pendientes, leads y cuentas
  inactivas. Falta el reporte analítico: asistencia promedio por curso, estudiantes
  con < 75% asistencia, leads sin contactar.

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
