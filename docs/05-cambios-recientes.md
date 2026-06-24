# Cambios recientes — sesión 2026-06-06

Bitácora de la sesión de finalización del proyecto (de "scaffolding sucio
de Horizons con bugs" a "listo para deploy en VPS propio").

---

## 2026-06-24 — Limpieza final de Horizons + branding PrePa

Ya en producción (prepapuq.cl con cert Let's Encrypt), se sacó **todo** rastro
de Hostinger Horizons del frontend y se agregó el branding propio.

**Removido (Horizons):**

- `index.html` — `<meta generator="Hostinger Horizons">`, `<title>Hostinger Horizons</title>`, favicon `/vite.svg`, `lang="en"`.
- `vite.config.js` — el plugin `addTransformIndexHtml` que **inyectaba 5 scripts en el build de producción** (`window.parent.postMessage` de errores runtime/consola/vite-overlay/navegación + monkey-patch de `window.fetch`). También: los 5 plugins del editor visual (`visual-editor/*`, `selection-mode/*`, `iframe-route-restoration`, `pocketbase-auth`, solo dev), el `console.warn = () => {}` global, el `customLogger` que silenciaba `CssSyntaxError`, los `server.headers`/`allowedHosts` del iframe de preview y los `external` de babel. Quedó una config mínima (React + alias `@` + `fs.allow` del monorepo).
- Carpeta `apps/web/plugins/` completa (9 archivos huérfanos tras quitar los imports).
- `apps/web/public/.htaccess` — config de Apache (Hostinger) con header `X-Powered-By "Hostinger Horizons"`; muerto en el deploy nginx.
- `pocketbaseClient.js` — fallback `/hcgi/platform` → `http://127.0.0.1:8090` (dev local). En prod la URL se hornea con `VITE_POCKETBASE_URL`.

**Agregado (branding):**

- `apps/web/public/favicon.svg` — birrete en los colores del logo (verde `#22C55E` + azul `#0EA5E9`), usado como favicon y en el `Header` (desktop + menú mobile).
- `index.html` — `<title>` y `description` reales, `lang="es"`, `theme-color`, y meta **Open Graph** para previews al compartir por WhatsApp/redes (`og:image` → `/og-image.png`, falta subir ese PNG 1200×630).

**Verificación:** `vite build` OK (2305 módulos, 9.6s); el `dist/index.html` quedó en 1.07 kB sin ningún script inyectado.

> Nota: el script `npm run build` usa `node tools/generate-llms.js || true && vite build`. En Windows `cmd.exe` no tiene `true`, así que si `generate-llms.js` falla, el build local se salta en silencio. En Docker/Linux (producción) funciona bien.



## Estado al iniciar la sesión

- Monorepo armado en Horizons (Hostinger AI).
- Backend con 34 migraciones, **con un typo crítico** en las reglas (`role` en vez de `rol`) que rompía la autorización en 7 colecciones.
- Frontend con páginas funcionando pero con bugs y código de debug pegado en producción.
- Sin Docker, sin documentación, sin `.env.example`, sin guía de deploy.
- Cliente PocketBase hardcodeado al proxy de Horizons (`/hcgi/platform`).

## Bugs encontrados y arreglados

### Bug 1 — ApoderadoDashboard traía toda la asistencia

**Síntoma**: el apoderado veía registros de asistencia de cualquier estudiante,
no solo de sus pupilos. Había un "REALITY TEST" pegado del debug que pedía
*toda* la tabla `asistencia` ignorando el filtro.

**Fix**: reemplazado el fetch para filtrar por los IDs de los pupilos vinculados.
Archivo: `apps/web/src/pages/ApoderadoDashboard.jsx` (función `fetchDashboardData`).

### Bug 2 — Typo `role` vs `rol` en 7 migraciones

**Síntoma**: una serie de migraciones (`1776144xxx_001_update_rules_for_*`)
cambiaron las reglas de 7 colecciones usando `@request.auth.role` (en inglés)
cuando el campo real del usuario es `rol` (en español). Resultado: **toda
la autorización basada en rol estaba rota**.

**Fix**: nueva migración `1780617600_001_fix_role_typo_and_apoderado_access.js`
que reescribe las reglas con el campo correcto. Como bonus, agrega acceso
del apoderado a `asistencia` y `justifications` de sus pupilos vía join
con `parent_student`.

### Bug 3 — Stats mockeadas en ApoderadoDashboard

**Síntoma**: el dashboard del apoderado mostraba "Próximo Pago $45.000",
"Asistencia 92%", "Rendimiento 780 pts" — todos hardcoded.

**Fix**:
- Quitadas las cards "Próximo Pago" e "Informes Emitidos" (no hay colecciones para soportarlas).
- Reemplazado "Asistencia 92%" por **cálculo real** (`presente / total × 100`) tanto a nivel global como por estudiante.
- Quitado "Rendimiento Promedio 780 pts" (no hay sistema de notas).
- Agregadas dos cards nuevas con datos reales: "Asistencia General" (promedio de pupilos) y "Ausencias por Justificar" (count de `estado === 'Ausente'`).

### Bug 4 — "¿Olvidaste tu contraseña?" link muerto

**Síntoma**: `href="#"` en LoginPage, sin destino.

**Fix**:
- Nueva ruta `/forgot-password` con `ForgotPasswordPage.jsx` que llama a `pb.collection('users').requestPasswordReset(email)`.
- Nueva ruta `/reset-password?token=...` con `ResetPasswordPage.jsx` que llama a `confirmPasswordReset`.
- Link en `LoginPage.jsx` ahora apunta a `/forgot-password`.
- README documenta que hace falta SMTP configurado en PB para que los emails salgan.

### Bug 5 — Mensajes en inglés mezclados

**Síntoma**: tres ocurrencias de "Student already enrolled in this course" en
`AdminDashboard.jsx` (toasts y banner inline), mientras el resto de la UI
está en español.

**Fix**: traducido a "El estudiante ya está matriculado en este curso".

### Bug 6 — Console.logs de debug en producción

**Síntoma**: 14 `console.log` con prefijos `[ComponentName]`, `PocketBase Response:`,
`Test de Realidad:`, etc. ensuciando la consola del navegador.

**Fix**: eliminados de:
- `pages/EstudianteDashboard.jsx` (7 logs)
- `pages/ApoderadoDashboard.jsx` (2 logs, ya borrados al arreglar Bug 1)
- `components/AttendanceTab.jsx` (4 logs)
- `components/JustificationModal.jsx` (1 log + import vacío de useEffect)
- `components/StudentSearchCombobox.jsx` (2 logs)
- `components/ui/command.jsx` (1 log)

Los `console.error` se mantienen porque son útiles para diagnóstico.

## Configuración para deploy

### Cliente PocketBase parametrizable

`apps/web/src/lib/pocketbaseClient.js` ahora lee `import.meta.env.VITE_POCKETBASE_URL`
con fallback al path de Horizons (`/hcgi/platform`). Esto permite usarlo en
cualquier deploy sin tocar código.

### Dockerización

Archivos nuevos:
- `apps/pocketbase/Dockerfile` — Alpine + descarga del binario PB 0.38 para amd64/arm64. Healthcheck con `/api/health`.
- `apps/pocketbase/scripts/entrypoint.sh` — agrega `--encryptionEnv` solo si `PB_ENCRYPTION_KEY` está seteada (permite primera corrida sin encryption).
- `apps/web/Dockerfile` — multi-stage: Node 20 → vite build → nginx alpine.
- `apps/web/nginx.conf` — SPA fallback (`try_files`), cache largo de `/assets/*`, no-cache de `index.html`.
- `docker-compose.yml` — orquesta web (port 8080→80) y pocketbase (port 8090) con volumen `pb_data`.
- `.dockerignore` — excluye `node_modules`, `dist`, assets sueltos, el PNG con OAuth, etc.

### Documentación

Archivos nuevos:
- `README.md` — overview + setup local + deploy Coolify resumido.
- `.env.example` — plantilla de variables.
- `CLAUDE.md` — contexto para sesiones de IA.
- `docs/01-arquitectura.md`
- `docs/02-modelo-datos.md`
- `docs/03-desarrollo-local.md`
- `docs/04-deploy-coolify.md`
- `docs/05-cambios-recientes.md` ← este archivo
- `docs/06-pendientes.md`
- `docs/07-troubleshooting.md`

## Validación local

| Check                  | Resultado                                                      |
| ---------------------- | -------------------------------------------------------------- |
| `npm install`          | ✓ 517 paquetes, 19s. 3 vulnerabilidades menores no atendidas. |
| `npm run lint`         | ✓ Sin errores                                                  |
| `npm run build`        | ✓ 1724 módulos, 3.9s. 494KB JS (gz 153KB) + 85KB CSS (gz 14KB) |
| `docker compose build` | ⚠️ No probado (Docker Desktop no estaba corriendo en la sesión)|

## Pendiente para vos

Ver [`06-pendientes.md`](06-pendientes.md). En resumen:

1. **Revocar credenciales OAuth de Google** del PNG `Captura de pantalla 2026-04-12 114850.png`.
2. **Borrar ese PNG del repo** (ya está en `.dockerignore` pero no en `.gitignore`).
3. **Configurar SMTP** en PocketBase admin tras deployar.
4. **Subir el repo a GitHub/GitLab** y conectarlo a Coolify.
5. **Crear datos iniciales** (admin + algunos estudiantes y apoderados).

## Pendiente opcional

- Integrar botón "Iniciar con Google" en LoginPage (requiere paso 1 hecho antes).
- Endurecer `createRule` de `justifications` (hoy permite que cualquier autenticado cree con cualquier `user_id`).
- Crear colecciones `pagos` y `evaluaciones` si querés volver a tener esas métricas en el dashboard.
- Migrar JS → TS (todo el front es JSX).
- Agregar tests (Vitest + React Testing Library).
