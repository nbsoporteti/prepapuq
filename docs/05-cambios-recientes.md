# Cambios recientes — sesión 2026-06-06

Bitácora de la sesión de finalización del proyecto (de "scaffolding sucio
de Horizons con bugs" a "listo para deploy en VPS propio").

---

## 2026-06-24 — Fase 2.1: PAES interactiva (preguntas dentro del sistema)

**Pivote de diseño.** La PAES de la Fase 2 era una *hoja de respuestas*: el
alumno leía el PDF del ensayo aparte y solo marcaba A–E. Se descartó. Ahora las
preguntas viven **dentro del sistema**: el alumno ve el enunciado y las
alternativas en pantalla, **selecciona una respuesta por pregunta** y al entregar
**el sistema calcula el puntaje automáticamente**. (Reemplaza a la sección
"2. PAES integrada y rendible" de la Fase 2, que queda como historial.)

> ⚖️ **Legal:** el contenido interactivo son **preguntas ORIGINALES de PrePa**
> (mismo estilo/ejes PAES), **no** transcripciones de los ensayos oficiales DEMRE
> — esos PDFs prohíben expresamente reproducir sus preguntas (incluso para
> entrenar IA). Los 8 PDFs oficiales siguen disponibles **solo como descarga** en
> la Biblioteca.

### 1. Backend — colección nueva + modo, sin tocar el hook de scoring

- **Migración `1781100150_create_preguntas_paes.js`**
  - Agrega el campo `modo` (`"pdf" | "interactivo"`) a `simulacros_paes`.
  - **Archiva los 8 simulacros-PDF** existentes (`modo="pdf"`, `estado="archivado"`):
    salen de la lista de "Simulacros para rendir" pero siguen como descarga en la
    Biblioteca (lista estática del front, no depende de la colección).
  - Crea la colección **`preguntas_paes`**: `simulacro_id` (relación cascade),
    `numero` (único por simulacro), `eje`, `contexto` (texto base compartido,
    opcional — para Comp. Lectora), `enunciado`, `alternativas_json`
    (`[{letra,texto}]`), `respuesta_correcta` (A–E) y `explicacion`. Lectura para
    cualquier autenticado; escritura solo `profesor`/`admin`. Índice único
    `(simulacro_id, numero)`.
- **Migración `1781100160_seed_preguntas_paes.js`** — siembra **7 mini-ensayos
  interactivos** (Biología, Física, Química, Competencia Lectora, Matemática M1,
  Matemática M2, Historia y Cs. Sociales) con **70 preguntas originales** en total
  (10 c/u), incluidas **2 lecturas originales** para Comp. Lectora. Cada pregunta
  trae su alternativa correcta y una **explicación**. Idempotente: hace *upsert*
  del simulacro por título y recrea sus preguntas, sin pisar intentos ya rendidos.
- **Scoring reutilizado sin cambios.** El truco: el seed deriva el
  `clave_respuestas_json` de cada simulacro desde las respuestas correctas de sus
  preguntas (en orden de `numero`). Así el hook `simulacros_paes.pb.js` ya
  existente puntúa el modo interactivo **sin una sola línea nueva**: compara
  índice-a-índice las respuestas del alumno contra la clave, interpola el puntaje
  con la `tabla_conversion_json` y recalcula el percentil. El cálculo sigue siendo
  100% server-side (el cliente nunca manda el puntaje).

### 2. Frontend — rendir preguntas en pantalla + revisión

- **`EstudiantePAESRendir.jsx` reescrita** — detecta el modo: si el simulacro
  tiene preguntas en `preguntas_paes`, entra en **modo interactivo**:
  - **Intro** "Cómo funciona" + badges de contenidos (ejes).
  - **Rindiendo**: columna de tarjetas, cada una con enunciado y alternativas en un
    `ToggleGroup` vertical (círculo con la letra + texto), una selección por
    pregunta; las lecturas de Comp. Lectora se muestran en un bloque de contexto
    ("Texto 1/2") antes de sus preguntas. Cronómetro y barra de progreso como antes.
  - **Hecho**: muestra **puntaje / correctas / percentil** y una **revisión
    pregunta por pregunta** que marca en verde la correcta, en rojo la elección
    equivocada del alumno y despliega la **explicación**.
  - El submit sigue enviando solo `respuestas_alumno_json` + tiempo (nunca el
    puntaje). El modo PDF clásico se conserva para registros archivados.
- **`EstudiantePAES.jsx`** — badge **"Interactivo"** (✨) en las tarjetas de
  simulacro con `modo="interactivo"`. La lista de "rendir" ahora muestra los 7
  interactivos (los 8 PDF quedaron archivados).

### Verificación

| Check          | Resultado                                                          |
| -------------- | ------------------------------------------------------------------ |
| `npm run lint` | ✓ Sin errores                                                      |
| `vite build`   | ✓ 13.4 s — `index.js` 1.155 MB (gz 339 KB) + CSS 147 KB            |

### ⚠️ Operación: un paso manual

- **Redeploy del backend** para correr las migraciones `1781100150` y `1781100160`.
  Crean `preguntas_paes`, archivan los 8 simulacros-PDF y siembran los 7
  interactivos. Hasta el redeploy, los simulacros interactivos **no existen** en la
  DB. Tras correr, verificar en el admin PB que hay 7 `simulacros_paes` con
  `modo="interactivo"` / `estado="publicado"` y que `preguntas_paes` tiene 70 filas.
- **Revisión de contenido (recomendado):** que un profe revise las 70 preguntas y
  sus claves/explicaciones antes de abrirlas a estudiantes reales.

---

## 2026-06-24 — Fase 2: cursos de Ciencias, PAES interactivo, biblioteca y pizarra

Sesión de contenido + interactividad. Se construyeron los 3 cursos de Ciencias
con material real, los simulacros PAES rendibles dentro del sistema, una
biblioteca de descargas y una pizarra lateral de apoyo. Todo el contenido nuevo
entra por **migraciones append-only** (timestamps `1781100100`–`1781100140`) y
un hook de scoring server-side.

### 1. Cursos de Ciencias (Biología / Física / Química)

- **Migración `1781100100_seed_cursos_ciencias.js`** — 3 cursos `materia="ciencias"`
  con `syllabus_markdown` (campo *editor*/HTML de PocketBase) con el temario real
  estructurado por unidades, más `color_tema` / `icono` por curso
  (bio→`success`/`Dna`, fís→`info`/`Atom`, quí→`accent`/`FlaskConical`).
- **Migración `1781100110_seed_lecciones_ciencias.js`** — lecciones planas y
  ordenadas (`orden`, `publicada`) con un `video_url` de YouTube curado y
  verificado por lección.
- **Migración `1781100120_seed_asignaciones_camila_ciencias.js`** — matricula a
  la alumna demo (camila) en los 3 cursos vía la colección legacy `asignaciones`,
  para poder ver el flujo completo sin tocar el panel admin.
- **`CourseDetailPage.jsx` reescrita** — diseño accesible con hero temático y
  `<Tabs>`: **Lecciones** (acordeón numerado con descripción, duración y video),
  **Temario** (HTML del syllabus renderizado en una clase `.prose-prepa` propia,
  sin depender del plugin typography) y **Material**.
- **`LeccionVideo.jsx` (nuevo)** — player de YouTube *lazy*: muestra el thumbnail
  y solo inyecta el iframe (`youtube-nocookie`) al hacer click. Mejor rendimiento
  y privacidad; `aria-label` por video. `parseYouTubeId()` acepta watch/youtu.be/
  embed/shorts/ID pelado.
- **`.prose-prepa` en `index.css`** — estilos tipográficos para el HTML confiable
  del syllabus (h2/h3/p/ul/ol/strong/a), bajo `@layer components`.

### 2. PAES integrada y rendible (hoja de respuestas + cronómetro + resultados)

> 🔁 **Reemplazado por la Fase 2.1** (ver arriba). Este diseño de *hoja de
> respuestas* se descartó: ahora las preguntas se rinden dentro del sistema. Lo de
> abajo queda como historial. El hook de scoring y la extensión de
> `simulacros_paes` / `resultados_simulacro_paes` **se siguen usando** tal cual.

Diseño **anti-trampa por hoja de respuestas**: por la cláusula DEMRE de "no
reproducir las preguntas para entrenar IA", **no se transcribe ningún enunciado**.
El alumno lee el PDF del ensayo y marca A–E en una hoja interactiva.

- **Migración `1781100130_extend_simulacros_paes_interactivo.js`** — agrega a
  `simulacros_paes` los campos `clave_respuestas_json`, `pdf_url` y `duracion_min`;
  agrega `respuestas_alumno_json` a `resultados_simulacro_paes`; y abre el
  `createRule` de resultados a `@request.auth.id = alumno_id` (o admin/profesor),
  para que el propio alumno registre su intento.
- **Migración `1781100140_seed_simulacros_paes.js`** — 8 simulacros publicados
  enlazados a los ensayos de `/biblioteca`, con metadata (asignatura, nº de
  preguntas, duración) y `tabla_conversion_json` **referencial**. **No** siembra
  clave → arrancan en *modo práctica*.
- **Hook `simulacros_paes.pb.js` (nuevo)** — scoring 100% server-side:
  1. si hay clave, **deriva** `respuestas_correctas` comparando respuestas vs
     clave (ignora lo que mande el cliente; las posiciones con clave `null` son
     piloto y no puntúan);
  2. convierte correctas → puntaje interpolando la `tabla_conversion_json`;
  3. recalcula `percentil_interno` contra los otros resultados del mismo simulacro.
  Si aún no hay clave, el intento se guarda **sin puntaje**; cuando un admin carga
  la clave, `onRecordAfterUpdateSuccess` **re-corrige todos** los intentos de ese
  simulacro automáticamente.
- **`EstudiantePAESRendir.jsx` (nuevo)** — ruta `/dashboard/estudiante/paes/:id`.
  Pantallas intro → rindiendo → hecho. Barra fija con **cronómetro** (umbrales de
  color a 5 min y 1 min), barra de progreso y diálogo de "Entregar". PDF embebido
  (abrir/descargar) junto a la hoja de respuestas (ToggleGroup A–E por pregunta,
  con `aria-label`). Al entregar **solo** envía `respuestas_alumno_json` + tiempo
  (nunca el puntaje). Si vuelve, ve su resultado (puntaje/correctas/percentil si ya
  hay clave, o aviso de "modo práctica" si todavía no).
- **`EstudiantePAES.jsx`** — nueva sección "Simulacros para rendir" (visible aunque
  el alumno no tenga resultados aún) + botón a la Biblioteca.

### 3. Biblioteca de descargas

- **`BibliotecaPage.jsx` (nuevo)** — ruta `/biblioteca` (cualquier autenticado).
  3 temarios + 8 ensayos servidos desde `apps/web/public/biblioteca/` (nginx), con
  botones Abrir / Descargar. Linkeada desde el Header (desktop dropdown + menú
  mobile) y desde "Mi PAES".

### 4. Pizarra lateral de apoyo (dibujo + notas)

- **`PizarraContext.jsx` + `PizarraPanel.jsx` (nuevos)** — panel lateral global
  (no-modal, siempre montado y desplazado fuera de pantalla para conservar el
  estado) que se abre desde el Header. Pestaña **Dibujo** (canvas con lápiz/goma,
  6 colores, grosor, deshacer, limpiar — Pointer Events + `setPointerCapture`) y
  pestaña **Notas** (textarea). Persistido en `localStorage` por usuario
  (`prepa:pizarra:draw:<uid>` / `:notes:<uid>`). Cierre con `Esc`, foco al abrir,
  `aria-label`. Montado en `App.jsx` envuelto por `PizarraProvider`.

### Verificación

| Check            | Resultado                                              |
| ---------------- | ------------------------------------------------------ |
| `npm run lint`   | ✓ Sin errores                                          |
| `vite build`     | ✓ 14.5 s — `index.js` 1.147 MB (gz 337 KB) + CSS 146 KB (gz 39 KB) |

> El bundle pasó los 500 KB (warning de Rollup). No es bloqueante; queda anotado
> en pendientes como candidato a *code-splitting* / `manualChunks`.

### ⚠️ Operación: dos pasos manuales para activar todo

1. **Redeploy del backend** para correr las 5 migraciones nuevas (cursos,
   lecciones, asignaciones, extensión PAES, seeds de simulacros). Hasta entonces
   los cursos y simulacros no existen en la DB.
2. **Cargar la clave DEMRE por simulacro** (`clave_respuestas_json`) desde el panel
   admin cuando DEMRE publique el clavijero. Sin clave, los simulacros corren en
   *modo práctica* (se registra el intento, sin puntaje). Al cargarla, el hook
   re-corrige los intentos ya rendidos solo. **Nunca transcribir los enunciados.**


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

### Seeds demo para los 3 roles faltantes (profesor / administrativo / admin)

Solo había seeds de `estudiante` (camila) y `apoderado` (marta). Se agregaron
tres migraciones append-only (timestamps > `1781000020`) con un usuario demo por
rol restante:

- `1781100000_001_create_user_profesor_…` → `profesor@example.com` / `Profesor123!`
- `1781100001_001_create_user_secretaria_…` → `secretaria@example.com` / `Secretaria123!` (rol `administrativo`)
- `1781100002_001_create_user_admin_…` → `admin@example.com` / `Admin123!` (admin de la app)

Detalle clave: el `rol` legacy es required y no admite `profesor`/`administrativo`,
así que esos dos van con `roles: ["profesor"|"administrativo"]` y un `rol`
placeholder `estudiante` (el front usa `roles`; las reglas de las colecciones
nuevas también). Tabla completa de credenciales en
[`02-modelo-datos.md`](02-modelo-datos.md#seeds-disponibles). Corren solas en el
próximo arranque de PocketBase (requiere **redeploy del back**).



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
