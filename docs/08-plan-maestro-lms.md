# Plan maestro — PrePa LMS completo

> **Versión**: 1.0 · Fecha: 2026-06-24 · Autor: Equipo PrePa
> **Estado**: Pendiente aprobación de Nicolás
> **Repo**: `C:\Users\Nico\Desktop\Proyectos Amjsoft\prepa`
> **Branch base**: `main` (commit `b356608`)

---

## 1. Visión del producto

PrePa es un **LMS preuniversitario PAES regional** diseñado para un preu chico de Punta Arenas que conoce a sus alumnos por nombre. La aplicación reemplaza el ecosistema actual de WhatsApp + Excel + Google Drive con un sistema integrado que orquesta clases en vivo (Meet/Zoom con link pegado a mano), tareas con entrega digital, evaluaciones con notas chilenas 1.0–7.0, simulacros PAES con percentil interno, asistencia y justificaciones, libreta consolidada del alumno, cobranza de cuotas, comunicaciones masivas y mensajería profesor-apoderado. El estudiante ve su próxima clase, sus tareas y su puntaje proyectado PAES en una sola pantalla; el apoderado abre la app y sabe en 5 segundos cómo va su pupilo (asistencia, promedio, cuota); el profesor pasa lista en 60 segundos y carga 30 notas con autosave; la secretaria registra pagos, matricula alumnos y manda comunicados sin abrir el correo. Frente a Cpech/PdV (corporativos, profes anónimos, pago vía call center) PrePa diferencia con **cara, nombre y resultados verificables del preu**; frente a Moodle/Canvas (sobre-ingenierizados) gana en **simplicidad operativa para un equipo sin IT dedicado**.

---

## 2. Roles del sistema (resumen)

| Rol | Descripción | Dashboard URL | 3 capacidades clave | 1 cosa que NO puede hacer |
|---|---|---|---|---|
| **Estudiante** | Alumno de 3°/4° medio o egresado preparando PAES | `/dashboard/estudiante` | Entrar a clase en vivo, entregar tarea, ver libreta y percentil PAES | Ver notas de compañeros |
| **Apoderado** | Padre/madre/tutor con pago al día | `/dashboard/apoderado` | Ver libreta y asistencia de pupilos, justificar inasistencias, pagar cuotas | Editar notas del pupilo o chatear con su propio hijo en la app |
| **Profesor** | Docente PAES por materia | `/dashboard/profesor` | Programar clase, calificar tareas/evaluaciones, pasar lista | Ver pagos de alumnos o calificar a su propio hijo (si lo tuviera matriculado) |
| **Administrativo** | Secretaría / finanzas / atención apoderado | `/dashboard/administrativo` | Matricular alumnos, registrar pagos, gestionar leads y justificaciones | Poner notas, dictar clases o leer mensajes privados profesor-apoderado |
| **Admin** | Director académico / IT / dueño | `/dashboard/admin` | Configurar todo, ver auditoría, gestionar usuarios y permisos | Borrar permanentemente datos personales (debe anonimizar — Ley 19.628) |

**Multi-rol**: un mismo usuario puede tener varios roles (ej. profesor que también es apoderado de su hijo). Campo `users.roles` (multi-select) reemplaza `users.rol` (string). Selector de contexto activo en el `Header` cuando `roles.length > 1`.

---

## 3. Identidad visual (resumen)

**Paleta**:
- `primary`: azul-teal Estrecho de Magallanes `#1A4F66` (HSL `199 65% 28%`)
- `secondary`: verde eucalipto magallánico `#547F6B` (HSL `158 24% 42%`)
- `accent`: ámbar cálido para CTAs `#F2A03D` (HSL `32 88% 56%`)
- Neutrals con tinte azulado (no gris cemento)

**Tipografía**:
- **Display**: Fraunces (serif variable con personalidad, swash y optical sizing) para H1/H2 y números hero
- **UI**: Inter (legibilidad en dashboards densos)
- **Numérica**: JetBrains Mono para notas, puntajes, montos

**Concepto en 1 párrafo**: *Tutor cercano, motivador y riguroso, con orgullo magallánico*. Fotografía real (no Unsplash), profesores con cara y CV, resultados PAES verificables con n exacto, WhatsApp directo con secretaria real con foto. Estética minimalista con detalles humanos: layouts limpios, radius 14px (cálido sin caer en kids), sombras con tinte primary, animaciones rápidas (220ms) y deliberadas. El subrayado ámbar es marca; el badge "🎓 Medicina · U. Chile" es signature. NO es: institución acartonada, startup edtech disruptiva, ni "tío buena onda".

Detalle completo en `docs/09-identidad-visual.md` (a crear en Fase 0).

---

## 4. Arquitectura técnica

### 4.1 Principios

1. **Append-only en migraciones PocketBase**. Nunca editar migración aplicada. Cambios = nueva migración.
2. **Aditivo no destructivo**. Las colecciones existentes (`asignaciones`, `materiales`, `asistencia`) se mantienen con flag de deprecación, hooks sincronizan con las nuevas durante 1 release.
3. **Reglas server-side son la seguridad real**. El frontend solo oculta UI.
4. **Mismo stack**. No introducir Next.js, GraphQL, microservicios, vector DB. Sí agregar libs frontend específicas (TipTap, Recharts, TanStack Query/Table, FullCalendar).
5. **MVP sin integración API de video**. Profesor pega link Meet/Zoom a mano. V2 agrega Zoom Server-to-Server OAuth (aditivo, mismos campos).
6. **Multi-rol via array**. `users.roles` (multi-select). Hook copia `rol` legacy a `roles[]` durante 1 release.

### 4.2 Mini-diagrama

```
┌──────────────────────────────────────────────────────────────────────┐
│                          BROWSER (SPA Vite)                          │
│  ┌────────────────────────────────────────────────────────────────┐  │
│  │  React 18 + React Router 7                                     │  │
│  │  ├─ AuthContext (currentUser, rolActivo, switchRol)            │  │
│  │  ├─ TanStack Query (cache de datos PB)                         │  │
│  │  ├─ shadcn/ui (62 componentes) + Tailwind + design tokens HSL  │  │
│  │  └─ Páginas por rol bajo /dashboard/{rol}/*                     │  │
│  └────────────────────────────────────────────────────────────────┘  │
└────────────────────┬─────────────────────────────────────────────────┘
                     │ HTTPS (auth via Bearer PB token)
                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│                   POCKETBASE 0.38 (Go + SQLite)                      │
│  ┌─────────────────┐  ┌──────────────────┐  ┌──────────────────────┐ │
│  │ pb_migrations/  │  │   pb_hooks/      │  │    SQLite (pb_data)  │ │
│  │ 35 actuales +   │  │ builder-mailer   │  │  ~30 colecciones     │ │
│  │ ~50 nuevas      │  │ clases_lifecycle │  │  índices + reglas    │ │
│  │ (append-only)   │  │ creditos_helper  │  │  files attachments   │ │
│  │                 │  │ recordatorios    │  │                      │ │
│  │                 │  │ recurrencia_gen  │  │                      │ │
│  │                 │  │ notif_emails     │  │                      │ │
│  │                 │  │ audit_log_writer │  │                      │ │
│  └─────────────────┘  └──────────────────┘  └──────────────────────┘ │
│  Custom routes: /api/public/clases-gratis, /api/clases-vivo/...      │
└────────────────────┬─────────────────────────────────────────────────┘
                     │ SMTP
                     ▼
┌──────────────────────────────────────────────────────────────────────┐
│  Hostinger Builder Mailer (vía builder-mailer.pb.js)                 │
│  → emails transaccionales (recordatorios, notif, recibos PDF)        │
└──────────────────────────────────────────────────────────────────────┘

DEPLOY: Docker + Coolify en VPS propio. Volumen persistente para pb_data.
```

### 4.3 Decisiones técnicas clave

| Decisión | Razón |
|---|---|
| Mantener PocketBase, no migrar a Postgres + API custom | Cubre auth, files, hooks, realtime, admin UI en un binario. Escala suficiente para preu de Punta Arenas. |
| Mantener Vite SPA, no Next.js | No hay necesidad de SSR/SSG. Dashboards son post-login. Landing es 1 página estática que vivirá igual de bien servida por nginx. |
| `users.roles` multi-select (no array de objetos) | Permite filter PB simple `roles ~ "profesor"`. Soporta caso profesor-apoderado del mismo alumno. |
| Trimestres en frontend, no en PB | Son derivados de fecha. Mantener config en `apps/web/src/lib/trimestres.js` evita rigidez. |
| Notas chilenas en `Input number` + atajos teclado | 30 notas tipeadas con Tab > 30 clicks en Select. |
| Promedios calculados on-demand (no caché) | Bajo volumen (decenas de notas por alumno). Cache solo si vemos problema. |
| TanStack Query | Reemplaza el patrón `useState+useEffect` repetido en cada página actual. Cache + invalidación + realtime opcional. |
| FullCalendar para calendario semanal | Madurez del componente vs. construir uno desde cero. |
| TipTap para anuncios (no Markdown editor) | Mejor UX para usuarios no técnicos. Salida HTML sanitizable. |
| Recharts para gráficos | Compatible Vite, suficiente para progresión PAES + KPIs. |
| Link Meet/Zoom pegado a mano en V1 | 1 línea pegada vs. semanas de OAuth + licencias. Migración a Zoom API es aditiva. |
| No Sentry, no analytics, no PWA en MVP | Out of scope. Agregar cuando duela. |

### 4.4 Dependencias nuevas a instalar

```bash
npm i -w apps/web @tanstack/react-query @tanstack/react-table \
  @hookform/resolvers zod \
  recharts \
  @fullcalendar/react @fullcalendar/timegrid @fullcalendar/daygrid @fullcalendar/interaction \
  @tiptap/react @tiptap/starter-kit @tiptap/extension-link @tiptap/extension-placeholder \
  react-markdown remark-gfm rehype-sanitize dompurify \
  react-dropzone react-pdf pdfjs-dist \
  date-fns date-fns-tz \
  spark-md5 papaparse jszip \
  react-hotkeys-hook \
  @dnd-kit/core @dnd-kit/sortable \
  @fontsource/fraunces @fontsource/inter @fontsource/jetbrains-mono
```

---

## 5. Modelo de datos extendido (resumen)

| Colección | Propósito | Nueva / Extensión | Dependencias |
|---|---|---|---|
| `users` | Auth + datos personales + multi-rol | **Extensión** (rol→roles, foto, tel, RUT, comuna, etc.) | — |
| `cursos` | Catálogo de asignaturas | **Extensión** (materia PAES, modalidad, color, anio_lectivo) | — |
| `secciones_curso` | Grupo concreto de un curso (Mate-A Mañana 2026) | **Nueva** | cursos, users |
| `horarios` | Bloques semanales recurrentes de una sección | **Nueva** | secciones_curso |
| `matriculas_seccion` | Alumno ↔ sección (reemplaza `asignaciones`) | **Nueva** | secciones_curso, users |
| `asignaciones` | Legacy alumno↔curso | **Deprecar** (mantener con sync hook 1 release) | — |
| `clases_vivo` | Instancia de clase en vivo con link | **Nueva** | secciones_curso, users |
| `asistencia_clase_vivo` | Lista por clase concreta | **Nueva** | clases_vivo |
| `asistencia` | Asistencia legacy diaria | **Extensión** (clase_vivo_id, seccion_id) | clases_vivo |
| `feriados_cl` | Catálogo feriados Chile | **Nueva** (seed 2026) | — |
| `clase_recordatorio_log` | Idempotencia de cron de recordatorios | **Nueva** | clases_vivo |
| `clase_lead_publica` | Inscripciones a clases públicas gratuitas | **Nueva** | clases_vivo |
| `reemplazos_clase` | Histórico de reemplazos de profesor | **Nueva** | clases_vivo, users |
| `profesores_extra` | Perfil profesional 1-1 con `users` | **Nueva** | users |
| `administrativos_extra` | Sub-rol del administrativo | **Nueva** | users |
| `lecciones` | Unidades temáticas que agrupan materiales | **Nueva** | cursos, secciones_curso |
| `materiales` | Recursos (PDF, link, video) | **Extensión** (seccion_id, publicado) | secciones_curso |
| `tareas` | Trabajos con entrega digital | **Nueva** | secciones_curso, categorias_evaluacion |
| `entregas` | Submission del alumno | **Nueva** | tareas, users |
| `calificaciones_tarea` | Nota + feedback de tarea | **Nueva** | entregas |
| `grupos_tarea` | Asignación grupal en tarea | **Nueva** | tareas, users |
| `banco_tareas` | Plantillas reutilizables | **Nueva** | users |
| `evaluaciones` | Pruebas / controles / simulacros (sin entrega digital) | **Nueva** | secciones_curso |
| `calificaciones_evaluacion` | Nota + feedback de evaluación | **Nueva** | evaluaciones, users |
| `simulacros_paes` | Set de preguntas con tabla de conversión | **Nueva** | — |
| `resultados_simulacro_paes` | Puntaje + percentil del alumno | **Nueva** | simulacros_paes, users |
| `categorias_evaluacion` | Ponderaciones por curso | **Nueva** | cursos, secciones_curso |
| `solicitudes_revision` | Alumno pide revisión de nota | **Nueva** | calificaciones_* |
| `anuncios` | Comunicación 1→N | **Nueva** | secciones_curso, cursos |
| `respuestas_anuncio` | Comentarios en anuncios | **Nueva** | anuncios |
| `threads_mensajes` | Conversación 1-a-1 | **Nueva** | users |
| `mensajes_internos` | Mensajes individuales | **Nueva** | threads_mensajes |
| `thread_lecturas` | Tracking lectura por participante | **Nueva** | threads_mensajes, users |
| `notificaciones` | In-app + email pipeline | **Nueva** | users |
| `rate_limits_comunicacion` | Antispam server-side | **Nueva** | users |
| `pagos` | Cuotas (matrícula + mensualidades) | **Nueva** | users, matriculas_seccion |
| `documentos` | Docs académicos/legales del alumno | **Nueva** | users |
| `audit_log` | Accesos sensibles | **Nueva** | users |
| `profesores_publicos`, `testimonios_publicos`, `resultados_paes` | Contenido editable de landing | **Nuevas** | — |
| `justifications` | Justificación de inasistencia | **Extensión** (motivo controlado, archivo) | asistencia_clase_vivo |
| `leads` | Captura landing genérica | **Mantener** | — |

**Total**: ~30 colecciones (8 existentes + ~22 nuevas).

Detalle completo en `docs/02-modelo-datos.md` (a actualizar en Fase 0).

---

## 6. Permisos (resumen)

Matriz comprimida. `C/R/U/D` = create/read/update/delete. `(s)` = scope limitado (su sección, su pupilo, etc.). `—` = sin acceso.

| Operación → / Rol ↓ | Cursos | Secciones | Matrícula alumnos | Pasar lista | Poner nota | Crear tarea | Calificar tarea | Ver nota individual | Pagos | Anuncios | Mensajes |
|---|---|---|---|---|---|---|---|---|---|---|---|
| **Estudiante** | R(s) | R(s) | — | — | — | — | — | R(self) | — | R(s) | C↔profe(s) |
| **Apoderado** | R(s pupilo) | R(s pupilo) | — | — | — | — | — | R(pupilo) | R(pupilo) | R(s pupilo) | C↔profe pupilo, ↔admin |
| **Profesor** | R | R(s) | — | CU(s) | CU(s) | CU(s) | CU(s) | R(s) | — | C(s) | C↔alumno(s), ↔apod(s) |
| **Administrativo** | R | R, U logística | CRUD | R agregados | — | — | — | — agregados | CRUD | C institucional, C↔apod | C↔alumno, ↔apod |
| **Admin** | CRUD | CRUD | CRUD | CRUD | CRUD audit | CRUD | CRUD audit | R con audit | CRUD audit | CRUD | R con audit + motivo |

### 6.1 Casos peligrosos identificados

1. **Profesor califica a su propio hijo**: hook server-side bloquea (`@collection.parent_student` cruzado con `entrega.alumno_id`). Exige co-firma de otro profesor o admin. Audit log obligatorio.
2. **Admin lee mensajes privados sin motivo**: endpoint custom `/api/admin/audit/thread/:id` exige `motivo` (min 30 chars) + ticket de referencia. Inserta en `audit_log` antes de devolver contenido. Notifica a participantes.
3. **Alumno escala su propio rol vía PATCH**: regla `@request.data.roles:isset = false` en updateRule de roles no-admin. Solo admin puede setear `roles`.

Detalle completo en `docs/02-modelo-datos.md` sección "Matriz extendida de reglas de acceso por rol".

---

## 7. Features del LMS

### 7.1 Gestión académica

**MVP**:
- Curso con metadata PAES (materia, año, modalidad default)
- Secciones (Mate-A Mañana, Mate-B Tarde) con horario, sala, link Meet default, capacidad
- Asignación profesor titular + ayudantes
- Horario semanal recurrente por sección
- Matrícula alumno → sección con estado (pre_inscrito, matriculado, retirado, suspendido)
- Generación automática de 10 cuotas al matricular

**V2**:
- Períodos académicos múltiples (semestre 1/2, intensivos)
- Reasignación masiva entre secciones
- Lista de espera al alcanzar capacidad
- Calendario académico con feriados auto-skip

### 7.2 Contenido y materiales

**MVP**:
- Materiales por curso o por sección (PDF, video link, link externo)
- Syllabus/temario markdown editable
- Lecciones ordenadas dentro de un curso (Unidad 1, 2, 3...) con materiales asociados
- Switch `publicada` para drafts del profesor

**V2**:
- Versionado de materiales
- Editor WYSIWYG dentro de la app
- Videos embebidos con tracking de visualización
- Biblioteca pública cross-curso

### 7.3 Clases en vivo

**MVP**:
- Programar clase con link Meet/Zoom pegado a mano
- Calendario semanal con drag-and-drop (profesor/admin)
- Sala de espera virtual: banner sticky 15min antes con CTA "Entrar"
- Recordatorios email 24h y 1h antes (cron PB)
- Pasar lista post-clase: lista virtualizada, default "presente", toggle rápido
- Subir grabación (URL Drive/YouTube/Zoom Cloud)
- Recurrencia con wizard (días semana, rango, skip feriados)
- Reagendamiento con notif inmediata a alumnos
- Cancelación con crédito automático en cuota si < 24h
- Reemplazo de profesor con histórico
- Clases públicas gratuitas (lead-gen) en landing

**V2**:
- Integración Zoom Server-to-Server OAuth (crea link automático, webhook asistencia, descarga grabación)
- SSO Google para alumnos (asistencia automática via Meet `conferenceRecords`)
- Push notifications web
- Streaming nativo (descartado por costo)

### 7.4 Evaluación y calificaciones

**MVP**:
- 7 tipos de evaluación: prueba, control, simulacro_paes, ensayo, trabajo, oral, proyecto
- Escala chilena 1.0–7.0 con 1 decimal, aprobación default 4.0, escala exigencia default 60%
- Carga bulk de notas con autosave (debounce 800ms), atajos teclado (Tab, Enter, Shift+↑↓, Cmd+1-7), pegado desde Excel
- Categorías con ponderación (Controles 30%, Tareas 15%, Simulacros 40%, Participación 15%)
- Promedio ponderado on-demand con re-normalización si falta categoría sin notas
- Libreta del alumno con filtros curso/trimestre/estado
- Simulacro PAES con puntaje 100-1000 + percentil interno (no DEMRE) + ranking opcional con consentimiento
- Comparación con cortes de carreras (catálogo top 20 estático)
- Gráfico progresión Recharts (líneas por asignatura, banda de error, línea de corte)
- Estados especiales: pendiente, anulada, eximida, recuperada
- Recuperativos con vínculo a evaluación origen
- Solicitudes de revisión (alumno → profesor) con plazo 48h
- Anti profesor-padre vía hook

**V2**:
- Test online auto-corregido (multiple choice)
- Banco de preguntas reutilizable con etiquetas
- Análisis por eje temático PAES
- Re-evaluaciones automáticas
- Eximición por nota mínima de categoría

### 7.5 Tareas y entregables

**MVP**:
- Crear tarea con título, descripción markdown, archivos adjuntos, fecha límite, puntaje
- Entrega digital (upload max 10 archivos 20MB c/u)
- Estados: pendiente, en_progreso (borrador), entregada, calificada, atrasada, no_entregada
- Penalización por atraso configurable (% por día, max días)
- Re-entregas (intentos)
- Calificación con preview PDF inline, atajos J/K/Cmd+Enter, feedback markdown
- Detección de copia V1: hash MD5 client-side cruzado entre entregas
- Tareas grupales (2-5 alumnos) con asignación manual/auto/elección propia
- Banco de tareas reutilizable + compartido
- Resumen para apoderado en su dashboard
- Marcado automático "no_entregada" via cron

**V2**:
- Rúbricas estructuradas
- Detección plagio externa (Turnitin/Compilatio)
- Anotación inline en PDFs
- Penalización aplicada automáticamente sobre la nota

### 7.6 Comunicaciones

**MVP**:
- Anuncios scope sección / curso / institucional / personal
- Banner anuncios destacados en cada dashboard
- Categorías + filtros + búsqueda
- Anuncios "importantes" envían email
- Editor TipTap (negrita, lista, link, code, blockquote)
- Notificaciones in-app con campana + popover + página historial
- Cron 5min consume cola de emails con throttling y DND
- 16 tipos de notif (tarea_calificada, clase_proxima, cuota_vencida, etc.)
- Agrupación automática (3 mensajes en Mat-A → 1 notif)
- Preferencias por usuario por tipo y canal
- Mensajería 1-a-1 (alumno↔profe, apoderado↔profe, apoderado↔admin) con Sheet estilo Slack
- Antispam vía `rate_limits_comunicacion`
- Acceso admin a contenido privado con audit + motivo + notif a participantes
- Bloqueo apoderado↔su propio pupilo (UI hint a usar WhatsApp)

**V2**:
- Respuestas a anuncios (foro ligero)
- Threads grupales pequeños (citaciones)
- Real-time vía PB subscribe
- Reacciones emoji
- Push web (service worker)
- Búsqueda global en mensajes
- Digest emails diarios/semanales
- WhatsApp Business API (descartado por costo en MVP)

---

## 8. Integraciones video

### Decisión final: **Link pegado a mano (MVP) + Zoom Server-to-Server OAuth (V2 aditivo)**

**MVP — Link manual**:
- Profesor crea Meet/Zoom desde su cuenta personal o cuenta compartida del preu
- Pega URL en `clases_vivo.link` con validación regex (`meet.google.com/[a-z]{3}-...`, `zoom.us/j/...`, `teams.microsoft.com/...`)
- Botón "Probar link" abre nueva pestaña
- Asistencia se toma manualmente post-clase (lista virtualizada, default presente, 60s)
- Grabación se sube como URL a Drive/YouTube unlisted/Zoom Cloud

**V2 — Zoom Server-to-Server OAuth** (cuando duela la asistencia manual):
- Una sola app Zoom Marketplace (no publicada): Account ID + Client ID + Client Secret
- PocketBase crea meetings en nombre del profe vía `POST /v2/users/{ZOOM_USER_ID}/meetings`
- Webhook `meeting.participant_joined/left` → match por email → precarga asistencia
- Webhook `recording.completed` → descarga MP4 a storage local del VPS
- Activación por curso vía flag `cursos.usa_api_clases` (coexiste con V1)

**Por qué Zoom y no Meet en V2**:
- API de meetings madura y directa (Meet requiere Calendar API + service account + dominio Workspace)
- Webhooks granulares de participación (Meet usa Pub/Sub de GCP)
- Override: si PrePa accede a **Google Workspace for Education (gratis)**, Meet gana. **Validar elegibilidad antes de implementar V2**.

**Costo operacional**:
- MVP: $0 (profes usan sus cuentas) o ~CLP 14.000/mes (1 licencia Zoom Pro compartida si quieren grabar siempre)
- V2: igual + storage del VPS para grabaciones

**Justificación**: para un preu chico en Punta Arenas con 3-8 profes, la inversión en OAuth + webhooks no se paga en el primer año. Pegar link cuesta 10 segundos por clase. Marcar asistencia post-clase cuesta 60 segundos. Total fricción: ~5 min/semana por profe — manejable. El modelo de datos diseñado garantiza que V2 sea puramente aditivo: cero migración destructiva.

Detalle completo en `docs/04-arquitectura-clases-vivo.md` (a crear en Fase 3).

---

## 9. Plan de implementación por fases

### Resumen ejecutivo de fases

| Fase | Duración | Objetivo | Resultado tangible |
|---|---|---|---|
| **0 — Foundation** | 1 sem (5 días) | Schema, roles, design tokens listos sin romper la app | Migraciones aplicadas, design system funcionando, AdminDashboard sigue operativo |
| **1 — Landing rediseñada** | 1 sem (5 días) | Nueva landing con identidad PrePa | Apoderado abre la home y dice "esto es distinto" |
| **2 — Roles profesor + administrativo** | 2 sem (10 días) | Dashboards básicos + flujos secretaría | Profesor pasa lista, admvo matricula |
| **3 — LMS core** | 3 sem (15 días) | Clases en vivo + tareas + evaluaciones | Profesor da clase, alumno entrega, profe califica |
| **4 — Comunicaciones + Polish** | 1 sem (5 días) | Notif, anuncios, mensajería | Sistema reemplaza WhatsApp del preu |
| **5 — Beta + ajustes** | 2 sem (10 días) | 30 alumnos usan 2 semanas | Datos reales, bugs, ajustes UX |

**Total: 10 semanas calendario** (~50 días hábiles) para un dev senior full-time. Paralelizable en partes con 2 devs (Fases 2 y 3).

---

### Fase 0 — Foundation (semana 1, ~5 días)

**Objetivo medible**: schema + roles + scaffolding listos. `npm run dev` funciona, AdminDashboard sigue operativo, login no se rompe, todas las migraciones nuevas aplicadas en limpio sin error.

**Dependencias**: ninguna (es la base).

**Mini-diagrama de la fase**:
```
┌─────────────────────────────────────────────────────────────┐
│ Migraciones PB (~50 archivos nuevos)                        │
│  └─ users multi-rol + extensión campos                      │
│  └─ ~22 colecciones nuevas con reglas                       │
│  └─ Seeds (categorías eval, feriados 2026, conversión PAES) │
│                                                             │
│ Hooks PB básicos                                            │
│  └─ Sync rol→roles[]                                         │
│  └─ Audit log writer                                        │
│  └─ Generación cuotas al matricular                         │
│                                                             │
│ Design system                                               │
│  └─ Fonts self-hosted (Fraunces + Inter + JetBrains Mono)   │
│  └─ Tokens HSL en index.css                                 │
│  └─ Extensión tailwind.config.js                            │
│  └─ shadcn/ui regenerado con nuevos tokens                  │
│                                                             │
│ Frontend scaffold                                           │
│  └─ AuthContext extendido (rolActivo + switchRol)           │
│  └─ ProtectedRoute con roles[]                              │
│  └─ Header con RolContextSwitcher                           │
│  └─ TanStack Query provider                                 │
│  └─ Componentes shared (DataTable, EmptyState, etc.)        │
└─────────────────────────────────────────────────────────────┘
```

**Tickets**:

#### 0.1 Migraciones PocketBase — Extensiones a colecciones existentes

- [ ] **0.1.1** Crear `apps/pocketbase/pb_migrations/1780617700_extend_users_personal_data.js`: agregar campos `foto`, `telefono`, `fecha_nacimiento`, `rut` (unique), `direccion`, `comuna` (default Punta Arenas), `region` (default Magallanes), `nacionalidad`, `anio_que_cursa`, `colegio_procedencia`, `roles` (multi-select con `estudiante|apoderado|profesor|administrativo|admin`), `rol_principal` (single, mantener compat), `activo` (default true), `acepta_comunicaciones` (default true), `ultimo_login`, `preferencias_notificacion` (json con default conservador), `email_digest_frecuencia`, `hora_digest`, `do_not_disturb_desde/hasta`, `pista_paes`, `carrera_objetivo`, `mostrar_ranking`. Reglas extendidas con OR sobre `roles`.
- [ ] **0.1.2** Crear `1780617702_migrate_rol_to_roles.js`: hook on-record-after-update copia `rol` (string) a `roles=[rol]` para todos los users existentes. NO borrar `rol` (deprecar 1 release).
- [ ] **0.1.3** Crear `1780617710_extend_cursos_metadata.js`: agregar `materia`, `nivel`, `modalidad_default`, `anio_lectivo`, `syllabus_markdown`, `objetivos`, `color_tema`, `icono`, `imagen_portada`, `activo`, `orden`. Hook que rellene valores por default para cursos existentes.
- [ ] **0.1.4** Crear `1780617720_extend_asistencia_clase_vivo.js`: agregar `clase_vivo_id` (nullable, relation), `seccion_id` (nullable), `marcada_por`, `hora_marca`. Mantener compat.
- [ ] **0.1.5** Crear `1780617725_extend_materiales_seccion.js`: agregar `seccion_id` (nullable, relation), `publicado` (default true), `tags` (json). Hook que asigne `seccion_id` desde `curso_id` mapping en la sección "default" (a generar para cada curso en seed).
- [ ] **0.1.6** Crear `1780617730_extend_justifications_archivo.js`: agregar `archivo_adjunto` (file, 5MB), `fecha_revision`, `revisada_por`, `comentario_revisor`.

#### 0.2 Migraciones PocketBase — Colecciones nuevas (orden timestamp)

- [ ] **0.2.1** `1780617800_create_profesores_extra.js`
- [ ] **0.2.2** `1780617810_create_administrativos_extra.js`
- [ ] **0.2.3** `1780617820_create_secciones_curso.js`
- [ ] **0.2.4** `1780617830_create_horarios.js`
- [ ] **0.2.5** `1780617840_create_matriculas_seccion.js` + UNIQUE `(alumno_id, seccion_id)`
- [ ] **0.2.6** `1780617850_create_clases_vivo.js`
- [ ] **0.2.7** `1780617860_create_asistencia_clase_vivo.js` + UNIQUE `(clase_vivo_id, alumno_id)`
- [ ] **0.2.8** `1780617870_create_lecciones.js`
- [ ] **0.2.9** `1780617880_create_tareas.js`
- [ ] **0.2.10** `1780617890_create_entregas.js` + UNIQUE `(tarea_id, alumno_id, intento_n)`
- [ ] **0.2.11** `1780617900_create_calificaciones_tarea.js`
- [ ] **0.2.12** `1780617910_create_evaluaciones.js`
- [ ] **0.2.13** `1780617920_create_calificaciones_evaluacion.js` + UNIQUE `(evaluacion_id, alumno_id)`
- [ ] **0.2.14** `1780617930_create_simulacros_paes.js`
- [ ] **0.2.15** `1780617940_create_resultados_simulacro_paes.js`
- [ ] **0.2.16** `1780617950_create_categorias_evaluacion.js`
- [ ] **0.2.17** `1780617960_create_anuncios.js`
- [ ] **0.2.18** `1780617970_create_threads_mensajes.js`
- [ ] **0.2.19** `1780617980_create_mensajes_internos.js`
- [ ] **0.2.20** `1780617990_create_notificaciones.js`
- [ ] **0.2.21** `1780618000_create_pagos.js`
- [ ] **0.2.22** `1780618010_create_documentos.js`
- [ ] **0.2.23** `1780618020_create_audit_log.js`
- [ ] **0.2.24** `1780618100_create_solicitudes_revision.js`
- [ ] **0.2.25** `1780618110_create_respuestas_anuncio.js`
- [ ] **0.2.26** `1780618130_create_thread_lecturas.js`
- [ ] **0.2.27** `1780618160_create_rate_limits_comunicacion.js`
- [ ] **0.2.28** `1782000100_extend_clases_vivo_modulo_live.js` (recurrence, reagenda, grabacion, lead_publica)
- [ ] **0.2.29** `1782000110_create_feriados_cl.js`
- [ ] **0.2.30** `1782000120_create_clase_recordatorio_log.js`
- [ ] **0.2.31** `1782000130_create_clase_lead_publica.js`
- [ ] **0.2.32** `1782000140_create_reemplazos_clase.js`
- [ ] **0.2.33** `1780620010_create_grupos_tarea.js`
- [ ] **0.2.34** `1780620020_create_banco_tareas.js`
- [ ] **0.2.35** `1780620030_extend_tareas_formatos.js` (`formatos_permitidos`)
- [ ] **0.2.36** `1780620040_extend_entregas_hashes.js` (`archivos_hashes` para plagio V1)
- [ ] **0.2.37** `1780618150_refine_notificaciones.js` (agrupacion_key, expira_en)

#### 0.3 Migraciones PocketBase — Seeds

- [ ] **0.3.1** `1782000115_seed_feriados_2026.js` — 17 feriados Chile 2026 (irrenunciables marcados)
- [ ] **0.3.2** `1780619000_seed_categorias_evaluacion.js` — hook on-create de `cursos` replica 4 categorías (Controles 30%, Tareas 15%, Simulacros 40%, Participación 15%)
- [ ] **0.3.3** `1780619010_seed_tabla_conversion_paes.js` — JSON oficial DEMRE 2025 (65 preguntas → puntaje + percentil)
- [ ] **0.3.4** `1780619020_seed_secciones_default_para_cursos_existentes.js` — para cada curso existente, generar 1 sección "default" con `nombre = curso.nombre + " - Default"` para que `materiales` legacy queden asignados

#### 0.4 Hooks PocketBase — Foundation

- [ ] **0.4.1** Crear `apps/pocketbase/pb_hooks/audit_log_writer.pb.js` — helper `insertAuditLog(accion, recurso_coleccion, recurso_id, motivo, payload)` para uso por otros hooks.
- [ ] **0.4.2** Crear `apps/pocketbase/pb_hooks/cuotas_generator.pb.js` — `onRecordAfterCreate("matriculas_seccion")` genera 1 pago `matricula` + 10 pagos `mensualidad` con vencimiento día 5 de cada mes (marzo-diciembre del año lectivo).
- [ ] **0.4.3** Crear `apps/pocketbase/pb_hooks/anti_profe_padre.pb.js` — `onRecordBeforeCreate/Update` en `calificaciones_tarea` y `calificaciones_evaluacion` valida cruce `parent_student`. Rechaza con ForbiddenError si profe es padre del alumno target.
- [ ] **0.4.4** Crear `apps/pocketbase/pb_hooks/users_security.pb.js` — `onRecordBeforeUpdate("users")` valida que `@request.data.roles:isset = false` para usuarios no-admin (impide self-escalation).

#### 0.5 Design system frontend

- [ ] **0.5.1** Instalar fonts: `npm i -w apps/web @fontsource/fraunces @fontsource/inter @fontsource/jetbrains-mono`. Importar en `apps/web/src/main.jsx`.
- [ ] **0.5.2** Reescribir `apps/web/src/index.css`:
  - Variables HSL en `:root` (light) y `.dark` (modo oscuro) según `docs/09-identidad-visual.md`
  - `--radius: 0.875rem`
  - Sombras con tinte primary
  - Easings custom
- [ ] **0.5.3** Extender `apps/web/tailwind.config.js`:
  - `fontFamily.display: ['Fraunces', 'serif']`, `sans: ['Inter']`, `mono: ['JetBrains Mono']`
  - `borderRadius` con escala basada en `--radius`
  - `transitionTimingFunction: { 'out-soft', 'in-snap', 'spring' }`
  - `transitionDuration: { fast: 150, base: 220, slow: 420 }`
  - `maxWidth: { 'prose-wide': '72ch', shell: '76rem', 'shell-narrow': '56rem' }`
  - `fontSize.display-2xl/xl/lg/md` con clamp
- [ ] **0.5.4** Verificar componentes shadcn ya instalados usan las variables (Button, Card, Badge). Regenerar Button, Card, Badge si hardcodean colores.

#### 0.6 Frontend scaffold

- [ ] **0.6.1** Instalar deps: `@tanstack/react-query`, `@tanstack/react-table`, `@hookform/resolvers`, `zod`.
- [ ] **0.6.2** Crear `apps/web/src/lib/queryClient.js` y wrappear `<QueryClientProvider>` en `apps/web/src/main.jsx`.
- [ ] **0.6.3** Refactor `apps/web/src/contexts/AuthContext.jsx`:
  - Agregar `rolActivo` (persistido en `localStorage`)
  - Agregar `switchRol(rol)`
  - Si user tiene 1 rol → autoset
  - Helper `useCanI(action, resource)` que cruza `roles` con matriz
- [ ] **0.6.4** Refactor `apps/web/src/components/ProtectedRoute.jsx`:
  - Aceptar prop `roles={["profesor", "admin"]}` (array)
  - Validar `user.roles ~ allowedRoles`
  - Reconocer 5 roles para redirección
- [ ] **0.6.5** Crear `apps/web/src/components/shared/RolContextSwitcher.jsx` — Dropdown visible si `roles.length > 1`. Muestra rol activo, lista alternativas con badge.
- [ ] **0.6.6** Crear `apps/web/src/components/shared/EmptyState.jsx` — props: `icon`, `title`, `description`, `action`.
- [ ] **0.6.7** Crear `apps/web/src/components/shared/DataTable.jsx` — wrapper `@tanstack/react-table` + shadcn Table con: sort, filters, selection, pagination, bulk actions sticky, skeleton, empty state, server-side mode, persistencia preferencias en localStorage.
- [ ] **0.6.8** Crear `apps/web/src/components/shared/DateRangeFilter.jsx`, `ExportCsvButton.jsx`, `ConfirmDialog.jsx`, `PreviewArchivoDialog.jsx`.
- [ ] **0.6.9** Extender `apps/web/src/components/Header.jsx` con `<RolContextSwitcher />` cuando `roles.length > 1` y placeholder de campana (Bell icon, sin lógica aún).
- [ ] **0.6.10** Setup ruteo nuevo en `apps/web/src/App.jsx`:
  - `/dashboard/profesor` (placeholder con "Hola, profesor")
  - `/dashboard/administrativo` (placeholder)
  - Mantener rutas actuales sin tocar

**Criterio de éxito Fase 0**: `docker compose up --build` levanta sin errores. Login con cuenta de seed funciona. AdminDashboard sigue funcionando como antes. Un usuario con `roles=["profesor"]` entra a `/dashboard/profesor` y ve un placeholder. Las migraciones pasan en limpio (database vacío) sin error. Reglas server-side bloquean intentos de PATCH `users.roles` por self.

---

### Fase 1 — Landing rediseñada (semana 2, ~5 días)

**Objetivo medible**: la home `/` se ve completamente distinta. Un apoderado de Punta Arenas la abre y dice "esto no es Cpech, esto es local". El formulario de contacto funciona, los datos vienen de PocketBase (no hardcoded), Lighthouse mobile > 90 en performance.

**Dependencias**: Fase 0 (design tokens, fonts).

**Mini-diagrama de la fase**:
```
┌──────────────────────────────────────────────────────┐
│ Migraciones nuevas (contenido editable de landing)   │
│  └─ profesores_publicos                              │
│  └─ testimonios_publicos                             │
│  └─ resultados_paes                                  │
│  └─ secciones_publicas (clases gratis ya cubierto)   │
│                                                      │
│ Componentes signature (la firma visual)              │
│  └─ TeacherCard (foto + CV + frase)                  │
│  └─ AlumnoTestimonialCard (foto + cita + badge uni)  │
│  └─ PaesTimeline (timeline horizontal/vertical)      │
│  └─ StatCounter (animado on viewport)                │
│                                                      │
│ Reescritura de HomePage.jsx                          │
│  └─ 9 secciones según docs/09-identidad-visual.md    │
│  └─ Datos desde PB                                   │
│  └─ Framer Motion para reveals                       │
│                                                      │
│ Footer + Header refresh                              │
│  └─ Magallánico (mapa, pingüino, datos reales)       │
└──────────────────────────────────────────────────────┘
```

**Tickets**:

#### 1.1 Migraciones de contenido público

- [ ] **1.1.1** `1781000000_create_profesores_publicos.js` — `nombre`, `apellido`, `materia` (select), `foto`, `universidad`, `titulo`, `magister`, `frase`, `cv_completo_markdown`, `orden`, `activo`. Reglas: list/view público, CUD admin.
- [ ] **1.1.2** `1781000010_create_testimonios_publicos.js` — `nombre_alumno`, `foto`, `promocion`, `cita` (max 300), `carrera`, `universidad`, `orden`, `activo`. Reglas: list/view público, CUD admin.
- [ ] **1.1.3** `1781000020_create_resultados_paes.js` — `anio_promocion`, `n_alumnos`, `pct_ingreso_carrera_elegida`, `puntaje_promedio_general`, `puntaje_promedio_m1`, `puntaje_promedio_competencia_lectora`, `mejora_promedio_pts`, `data_simulacros_mensuales` (json para gráfico). Reglas idem.
- [ ] **1.1.4** Seed inicial con datos placeholder editables vía admin (ej. promoción 2024 con n=24, 87%, 692 pts).

#### 1.2 Componentes signature

- [ ] **1.2.1** Crear `apps/web/src/components/landing/TeacherCard.jsx`:
  - Foto cuadrada con filtro tinte primary al hover
  - Nombre Fraunces 700
  - Badge universidad con icono 🎓
  - Frase italic
  - Modal "Ver perfil completo" con CV markdown
- [ ] **1.2.2** Crear `apps/web/src/components/landing/AlumnoTestimonialCard.jsx`:
  - Foto + cita 2-3 líneas
  - Footer con Badge signature "🎓 {carrera} · {universidad}"
- [ ] **1.2.3** Crear `apps/web/src/components/landing/PaesTimeline.jsx`:
  - Horizontal desktop, vertical mobile
  - Puntos interactivos con tooltip
  - Hito "PRÓXIMA" con ring pulse en accent
- [ ] **1.2.4** Crear `apps/web/src/components/landing/StatCounter.jsx`:
  - Hook `useInView` (Framer Motion) dispara count 0→valor en 1200ms
  - JetBrains Mono 700 display-xl
  - Línea ámbar debajo

#### 1.3 Secciones de la landing

- [ ] **1.3.1** Reescribir `apps/web/src/pages/HomePage.jsx` con 9 secciones en orden:
  1. Hero — "Conocemos a cada estudiante por su nombre. Y a qué universidad quiere llegar." Eyebrow + H1 + subtítulo + 2 CTAs + trust bar + foto real + card flotante con puntaje promedio
  2. Resultados — 4 StatCounters + gráfico Recharts evolución simulacros
  3. Equipo docente — grid de TeacherCards desde PB
  4. Modalidades — 3 cards (presencial/online/mixta) + tabla comparativa collapsible
  5. Calendario PAES — PaesTimeline desde colección `feriados_cl` + hardcoded PAES oficial
  6. Testimonios — Carousel embla con AlumnoTestimonialCards desde PB
  7. Por qué local — H2 "Punta Arenas merece un preu que sepa que vivís acá" + 5 bullets + foto sede
  8. FAQ PAES — Accordion shadcn con 6-8 preguntas
  9. CTA final — WhatsApp grande + ContactForm con próximo simulacro
- [ ] **1.3.2** Eliminar imágenes de Unsplash. Hardcodear paths a `/img/landing/*` (assets locales). Documentar en `docs/09-identidad-visual.md` que se necesita sesión de fotografía local presupuesto $200-400 USD.
- [ ] **1.3.3** Agregar Framer Motion scroll reveals (`useInView`, `whileInView`) a cada sección.
- [ ] **1.3.4** SEO: extender Helmet con OG tags, JSON-LD `EducationalOrganization`.

#### 1.4 Header y Footer

- [ ] **1.4.1** Refactor `apps/web/src/components/Header.jsx`:
  - Logo + nombre con Fraunces
  - Links anchor a secciones de home si está en `/`
  - Botón "Iniciar sesión" outline + "Inscribirme" accent
  - Sheet mobile responsive
- [ ] **1.4.2** Refactor `apps/web/src/components/Footer.jsx`:
  - 3 columnas: marca + dirección + mapa pequeño Google Maps embed
  - Enlaces: Cursos / Modalidades / Equipo / Resultados / FAQ / Privacidad
  - Contacto real: WhatsApp link `wa.me/...`, email real, Instagram/Facebook reales
  - Línea inferior: "© 2026 PrePa · Diseñado y operado en Punta Arenas, Magallanes. 🐧"
- [ ] **1.4.3** Actualizar `apps/web/src/components/ContactForm.jsx` para usar campos coherentes con `leads` actual + agregar `utm_*` desde URLSearchParams.

#### 1.5 Página `/clases-gratis` (lead-gen)

- [ ] **1.5.1** Crear `apps/web/src/pages/ClasesPublicasLandingPage.jsx` — grid de cards de clases con `lead_publica=true && fecha>=now`.
- [ ] **1.5.2** Crear `apps/web/src/pages/ClasePublicaDetallePage.jsx` con form de inscripción + honeypot + UTM tracking.
- [ ] **1.5.3** Crear endpoint custom `apps/pocketbase/pb_hooks/endpoint_publico_clases.pb.js` con `GET /api/public/clases-gratis` (cache 60s) y `POST /api/public/clases-gratis/:id/inscribirse` (rate-limit por IP + honeypot).

#### 1.6 Checklist "se siente PrePa"

- [ ] **1.6.1** Verificar checklist completo de `docs/09-identidad-visual.md` sección 10: arriba del fold aparece "Magallanes"/"Punta Arenas", cara real, CTA en ámbar, números en JetBrains Mono, H1 en Fraunces, WhatsApp visible sin scroll, nombre de profesor real, fecha próxima PAES, dato % verificable, footer "operado en Punta Arenas".

**Criterio de éxito Fase 1**: nueva landing en producción. Apoderado externo navega y reporta "esto se ve único". ContactForm crea `leads` correctamente. Inscripción a clase gratuita funciona end-to-end (form → PB → email confirmación). Lighthouse mobile ≥ 90 perf, ≥ 95 a11y, ≥ 95 SEO. Cero imágenes de Unsplash.

---

### Fase 2 — Roles profesor y administrativo (semanas 3-4, ~10 días)

**Objetivo medible**: un profesor entra a `/dashboard/profesor`, ve sus secciones, programa una clase, pasa lista, sube material; un administrativo entra a `/dashboard/administrativo`, matricula un alumno nuevo, registra un pago, marca una justificación como aprobada. AdminDashboard actual sigue intacto.

**Dependencias**: Fase 0 (schema + scaffolding) + Fase 1 (design tokens).

**Mini-diagrama de la fase**:
```
┌──────────────────────────────────────────────────────────────┐
│ Hooks PB (vista profesor)                                    │
│  └─ asistencia_hooks (alerta < 75%)                          │
│  └─ Notif "clase_proxima" cron (placeholder, lógica fase 4)  │
│                                                              │
│ ProfesorDashboard                                            │
│  ├─ Tab Hoy (Hero próxima clase + 4 KPIs + agenda)           │
│  ├─ Tab Mis cursos (grid de secciones)                       │
│  ├─ Tab Calendario (FullCalendar semana/mes)                 │
│  ├─ Tab Calificar (cola con count)                           │
│  ├─ Tab Comunicaciones (placeholder fase 4)                  │
│  └─ Tab Mi perfil                                            │
│                                                              │
│ SeccionDetalleProfesor (8 subtabs)                           │
│  └─ Alumnos / Materiales / Clases / Tareas / Eval / Notas    │
│     /Asistencia / Anuncios                                   │
│                                                              │
│ Sheets de creación (QuickActions FAB)                        │
│  ├─ CrearClaseVivoSheet                                      │
│  ├─ CrearTareaSheet (form básico, calificación fase 3)       │
│  ├─ CrearEvaluacionSheet                                     │
│  └─ CrearAnuncioSheet                                        │
│                                                              │
│ AdministrativoDashboard                                      │
│  ├─ Tab Hoy (KPIs + widgets)                                 │
│  ├─ Tab Alumnos (DataTable + Sheet detalle)                  │
│  ├─ Tab Apoderados                                           │
│  ├─ Tab Matrículas (Kanban + NuevaMatriculaWizard)           │
│  ├─ Tab Pagos (DataTable + RegistrarPagoDialog)              │
│  ├─ Tab Justificaciones                                      │
│  └─ Tab Reportes (CSVs básicos)                              │
└──────────────────────────────────────────────────────────────┘
```

**Tickets**:

#### 2.1 Hooks PB

- [ ] **2.1.1** Crear `apps/pocketbase/pb_hooks/asistencia_hooks.pb.js`:
  - `onRecordAfterCreate/Update("asistencia_clase_vivo")` recalcula `clases_vivo.numero_asistentes_cache`
  - Verifica regla 75% si `total_clases >= 4` → crea `notificaciones` tipo `inasistencias_seguidas` al apoderado vía `parent_student`
  - Inserta `audit_log` accion `alerta_75pct_emitida`
- [ ] **2.1.2** Crear `apps/pocketbase/pb_hooks/clases_lifecycle.pb.js` (versión Fase 2, sin webhooks):
  - `onRecordAfterCreate("clases_vivo")` → crea N filas `asistencia_clase_vivo` con default `ausente` para cada `matricula_seccion` activa
  - `onRecordBeforeUpdate("clases_vivo")` detecta cambios en `fecha/hora` → set `reagendada_desde`, encola notif `email_reagenda`
  - Append en `historial_cambios`
- [ ] **2.1.3** Crear `apps/pocketbase/pb_hooks/pagos_lifecycle.pb.js`:
  - Cron diario 09:00: `pagos.estado="pendiente" && fecha_vencimiento < today` → `estado="vencido"` + notif `cuota_vencida`
  - `onRecordAfterUpdate("pagos")` si `estado="pagado"` → set `fecha_pago=now`, generar `boleta_pdf` (placeholder, contenido en fase 4 con template)

#### 2.2 ProfesorDashboard — Layout y Tab Hoy

- [ ] **2.2.1** Crear `apps/web/src/hooks/useProfesorOverview.js` — single roundtrip (Promise.all) que devuelve `{cursos, totalAlumnos, pendientesCalif, asistPendientes, proxClase, notifs}`. `staleTime: 60_000`.
- [ ] **2.2.2** Crear `apps/web/src/pages/profesor/ProfesorDashboard.jsx`:
  - Tabs root sincronizados con `useSearchParams()`
  - Badge en tab "Calificar" con count rojo si > 0
  - QuickActionsFAB integrado
- [ ] **2.2.3** Crear `apps/web/src/pages/profesor/ProfesorVistaDia.jsx` con `<ProximaClaseHero/>`, `<OverviewCards/>`, `<HoyAgenda/>`.
- [ ] **2.2.4** Crear `apps/web/src/components/profesor/ProximaClaseHero.jsx`:
  - Card con border-left coloreado por curso
  - Botón XL "Entrar a la clase" disabled si > 15min
  - Empty state "Sin clases hoy" con icono Coffee
- [ ] **2.2.5** Crear `apps/web/src/components/profesor/OverviewCards.jsx` — grid 4 cards (Mis cursos / Alumnos / Por calificar / Asistencias hoy).
- [ ] **2.2.6** Crear `apps/web/src/components/profesor/HoyAgenda.jsx`:
  - Timeline vertical izq con clases del día
  - 3 cards der: Asistencias por marcar / Entregas nuevas hoy / Recordatorios

#### 2.3 ProfesorDashboard — Mis Cursos y Sección detalle

- [ ] **2.3.1** Crear `apps/web/src/pages/profesor/ProfesorMisCursos.jsx`:
  - Toolbar: search + filtro año + filtro estado
  - Grid 3 columnas de cards
- [ ] **2.3.2** Crear `apps/web/src/pages/profesor/seccion/SeccionDetalleProfesor.jsx`:
  - Header con breadcrumb, color de curso, KPIs (alumnos/clases/tareas/pendientes)
  - Tabs internos con badges de pendientes
  - Subtabs sincronizados con URL `?tab=...`
- [ ] **2.3.3** Crear `apps/web/src/pages/profesor/seccion/SeccionAlumnosTab.jsx` — DataTable con avatar + nombre + RUT + % asistencia + promedio + estado + acciones (ver libreta, mensaje).
- [ ] **2.3.4** Crear `apps/web/src/pages/profesor/seccion/SeccionMaterialesTab.jsx` — reusa `MaterialCard` existente + botón "Subir material".
- [ ] **2.3.5** Crear `apps/web/src/pages/profesor/seccion/SeccionClasesTab.jsx` — Accordion por mes con cards de clases.
- [ ] **2.3.6** Crear `apps/web/src/pages/profesor/seccion/SeccionTareasTab.jsx` — DataTable básica (calificación detallada en Fase 3).
- [ ] **2.3.7** Crear `apps/web/src/pages/profesor/seccion/SeccionEvaluacionesTab.jsx` — placeholder con DataTable (carga bulk en Fase 3).
- [ ] **2.3.8** Crear `apps/web/src/pages/profesor/seccion/SeccionAsistenciaTab.jsx` — tabla pivot alumnos × fechas + botón "Pasar lista".
- [ ] **2.3.9** Crear `apps/web/src/pages/profesor/seccion/SeccionAnunciosTab.jsx` — placeholder (CRUD en Fase 4).
- [ ] **2.3.10** Crear `apps/web/src/pages/profesor/seccion/SeccionNotasTab.jsx` — placeholder libreta (implementación Fase 3).

#### 2.4 Sheets de creación (Quick Actions FAB)

- [ ] **2.4.1** Crear `apps/web/src/components/profesor/QuickActionsFAB.jsx` — DropdownMenu con Tarea / Clase / Evaluación / Anuncio.
- [ ] **2.4.2** Crear `apps/web/src/components/profesor/CrearClaseVivoSheet.jsx`:
  - Form con react-hook-form + zod (`apps/web/src/schemas/claseVivo.js`)
  - Validación link Meet/Zoom regex
  - Botón "Probar link"
  - Switch "Notificar a alumnos por email ahora"
- [ ] **2.4.3** Crear `apps/web/src/components/profesor/CrearTareaSheet.jsx` — form básico (calificación detallada Fase 3).
- [ ] **2.4.4** Crear `apps/web/src/components/profesor/CrearEvaluacionSheet.jsx`.
- [ ] **2.4.5** Crear `apps/web/src/components/profesor/CrearAnuncioSheet.jsx` — versión Fase 2 con textarea simple (TipTap en Fase 4).
- [ ] **2.4.6** Crear `apps/web/src/components/profesor/PasarListaDialog.jsx`:
  - Lista virtualizada de matriculados
  - ToggleGroup 5 estados (P/T/A/J/R)
  - Búsqueda inline
  - Acciones bulk
  - Submit batch upsert

#### 2.5 ProfesorDashboard — Calendario

- [ ] **2.5.1** Instalar `@fullcalendar/react @fullcalendar/timegrid @fullcalendar/daygrid @fullcalendar/interaction`.
- [ ] **2.5.2** Crear `apps/web/src/pages/profesor/ProfesorCalendario.jsx` con FullCalendar + locale es + timezone `America/Punta_Arenas`.
- [ ] **2.5.3** Eventos: bloques coloreados por curso, click → Sheet detalle, drag → modal confirmación reagenda.
- [ ] **2.5.4** Mobile: vista lista cronológica.

#### 2.6 ProfesorDashboard — Calificar y Perfil

- [ ] **2.6.1** Crear `apps/web/src/pages/profesor/ProfesorCalificarQueue.jsx` — placeholder con count + lista de tareas/entregas pendientes (calificación real en Fase 3).
- [ ] **2.6.2** Crear `apps/web/src/pages/profesor/ProfesorPerfil.jsx` — tabs Datos personales / Perfil profesional (`profesores_extra`) / Disponibilidad / Cuenta.

#### 2.7 AdministrativoDashboard — Layout y Vista del día

- [ ] **2.7.1** Crear `apps/web/src/pages/administrativo/AdministrativoDashboard.jsx` con tabs root.
- [ ] **2.7.2** Crear `apps/web/src/hooks/useAdministrativoOverview.js`.
- [ ] **2.7.3** Crear `apps/web/src/pages/administrativo/AdmVistaDia.jsx`:
  - Widget pagos vencidos (top 10)
  - Widget matrículas pendientes
  - Widget justificaciones pendientes
  - Widget resumen del día (ingresos, matriculados nuevos)

#### 2.8 AdministrativoDashboard — Alumnos y Apoderados

- [ ] **2.8.1** Crear `apps/web/src/pages/administrativo/AdmAlumnos.jsx` con DataTable + Sheet detalle (tabs Resumen/Pagos/Asistencia/Notas read-only/Documentos/Historial).
- [ ] **2.8.2** Crear `apps/web/src/pages/administrativo/AdmApoderados.jsx` con DataTable + acción "Vincular pupilo" (Combobox + tipo relación → `parent_student`).

#### 2.9 AdministrativoDashboard — Matrículas

- [ ] **2.9.1** Instalar `@dnd-kit/core @dnd-kit/sortable`.
- [ ] **2.9.2** Crear `apps/web/src/pages/administrativo/AdmMatriculas.jsx` con Kanban 5 columnas (Leads / Contactados / Cotizando / Contrato pendiente / Matriculado).
- [ ] **2.9.3** Crear `apps/web/src/components/administrativo/NuevaMatriculaWizard.jsx` con 6 steps (Datos alumno → Apoderado → Curso/sección → Plan pagos → Documentos → Confirmar).

#### 2.10 AdministrativoDashboard — Pagos y Justificaciones

- [ ] **2.10.1** Crear `apps/web/src/pages/administrativo/AdmPagos.jsx` con DataTable + filtros + bulk actions.
- [ ] **2.10.2** Crear `apps/web/src/components/administrativo/RegistrarPagoDialog.jsx` — Combobox alumno + checkboxes cuotas + monto + método + comprobante + boleta PDF.
- [ ] **2.10.3** Crear `apps/web/src/components/administrativo/GenerarRecibosBatch.jsx` — Progress bar + ZIP descarga.
- [ ] **2.10.4** Crear `apps/web/src/pages/administrativo/AdmJustificaciones.jsx` con queue lateral + detalle con preview archivo + botones Aprobar/Rechazar.

#### 2.11 AdministrativoDashboard — Reportes básicos

- [ ] **2.11.1** Crear `apps/web/src/pages/administrativo/AdmReportes.jsx` con cards de reportes.
- [ ] **2.11.2** Implementar exportadores CSV: Nómina por sección, Estado morosidad, % asistencia por sección, Lista apoderados.
- [ ] **2.11.3** Reportes con gráficos Recharts (Ingresos por mes) — preview antes de exportar.

**Criterio de éxito Fase 2**: profesor de prueba (rol `profesor`) entra, ve sus 2 secciones seed, programa una clase con link Meet, pasa lista de 5 alumnos, sube un PDF como material. Administrativo de prueba (rol `administrativo`) matricula un alumno nuevo end-to-end (con apoderado, sección, plan de pagos), registra un pago, aprueba una justificación. AdminDashboard original sigue funcionando. Cero regresiones en rutas existentes.

---

### Fase 3 — LMS core (semanas 5-7, ~15 días)

**Objetivo medible**: ciclo completo profesor crea clase → da clase → pasa lista → sube tarea → alumno entrega → profesor califica → alumno ve nota en su libreta. Simulacros PAES con puntaje y percentil interno. Calendario semanal completo. Recurrencia de clases con skip feriados.

**Dependencias**: Fase 2 (dashboards profesor + admvo).

**Mini-diagrama de la fase**:
```
┌────────────────────────────────────────────────────────────┐
│ Clases en vivo avanzadas                                   │
│  ├─ Recurrencia (Wizard 3 pasos)                           │
│  ├─ WaitingRoomBanner (sala de espera virtual)             │
│  ├─ Reagenda + Cancelación con créditos                    │
│  └─ Reemplazo de profesor                                  │
│                                                            │
│ Tareas (flujo completo)                                    │
│  ├─ Crear con MD editor                                    │
│  ├─ Alumno entrega (upload + countdown)                    │
│  ├─ Profesor califica focus mode (J/K shortcuts)           │
│  ├─ Grupos (dnd-kit)                                       │
│  ├─ Banco de tareas                                        │
│  └─ Detección plagio V1 (hashes MD5)                       │
│                                                            │
│ Evaluaciones + libreta                                     │
│  ├─ Carga bulk de notas (autosave + pegado Excel)          │
│  ├─ Libreta tabla pivot (alumnos × evaluaciones)           │
│  ├─ Solicitudes de revisión                                │
│  └─ Recuperativos                                          │
│                                                            │
│ Simulacros PAES                                            │
│  ├─ Carga manual de resultados                             │
│  ├─ Cálculo puntaje + percentil interno                    │
│  ├─ Gráfico progresión Recharts                            │
│  ├─ Comparación cortes carreras                            │
│  └─ Ranking interno (con consentimiento)                   │
│                                                            │
│ Estudiante y Apoderado dashboards extendidos               │
│  ├─ Tab Notas (libreta)                                    │
│  ├─ Tab PAES                                               │
│  ├─ Tab Tareas (4 tabs)                                    │
│  └─ Tab Calendario                                         │
└────────────────────────────────────────────────────────────┘
```

**Tickets**:

#### 3.1 Clases en vivo — Recurrencia y wizard

- [ ] **3.1.1** Crear `apps/pocketbase/pb_hooks/recurrencia_generador.pb.js` con endpoint `POST /api/clases-vivo/generar-recurrente`. Input: seccion, profesor, rango fechas, días semana, hora, plataforma, link, tema_template. Algoritmo skip feriados desde `feriados_cl`, validación colisiones.
- [ ] **3.1.2** Crear `apps/web/src/components/clases/RecurrenceWizard.jsx` con 3 pasos (Patrón / Preview / Detalles). Mock visual del calendar con clases marcadas y saltadas.
- [ ] **3.1.3** Soportar edit modes: solo esta / esta y siguientes / todas. Modal dialog antes de PATCH.

#### 3.2 Clases en vivo — WaitingRoomBanner y reagenda/cancelación

- [ ] **3.2.1** Crear `apps/web/src/components/clases/WaitingRoomBanner.jsx`:
  - Hook `useProximaClase` con polling 30s + realtime PB subscribe
  - Estados visuales: hidden / yellow 15-30min / green pulse 0-15min / red live durante clase
  - Botón ENTRAR XL con click `window.open(link)`
- [ ] **3.2.2** Montar `<WaitingRoomBanner />` en top de los 4 dashboards (estudiante, apoderado, profesor, admvo).
- [ ] **3.2.3** Crear `apps/web/src/components/clases/ReagendaDialog.jsx` con motivo + switch "Notificar inmediatamente".
- [ ] **3.2.4** Crear `apps/web/src/components/clases/CancelacionDialog.jsx`:
  - Warning si < 24h
  - Switch "Reagendar a otra fecha"
- [ ] **3.2.5** Crear `apps/pocketbase/pb_hooks/creditos_helper.pb.js` con `aplicarCreditoCancelacion(clase_id)`. Hook llama esto en `onRecordBeforeUpdate("clases_vivo")` si pasa a `cancelada` con < 24h.

#### 3.3 Clases en vivo — Reemplazo de profesor

- [ ] **3.3.1** Crear `apps/web/src/pages/administrativo/AdmReemplazosPage.jsx` con form: profesor falta + rango fechas + lista clases afectadas + profesor reemplazo + motivo.
- [ ] **3.3.2** Submit crea registros `reemplazos_clase` + PATCH `clases_vivo` (profesor_id update con `profesor_titular_original_id` backup) + notif.
- [ ] **3.3.3** Vista lista de reemplazos activos con botón "Revertir".

#### 3.4 Tareas — Profesor crea y publica

- [ ] **3.4.1** Crear `apps/web/src/lib/tareasSchema.js` con zod schemas.
- [ ] **3.4.2** Crear `apps/web/src/components/ui/file-dropzone.jsx` reutilizable (react-dropzone).
- [ ] **3.4.3** Crear `apps/web/src/components/ui/markdown-editor.jsx` wrap `@uiw/react-md-editor`.
- [ ] **3.4.4** Crear `apps/web/src/pages/tareas/profesor/ProfesorTareaFormPage.jsx` con secciones identificación / contenido / fechas / puntaje / tipo / reglas avanzadas. Botón "Guardar borrador" / "Publicar".
- [ ] **3.4.5** Crear `apps/web/src/pages/tareas/profesor/ProfesorTareasListPage.jsx` con DataTable.

#### 3.5 Tareas — Alumno entrega

- [ ] **3.5.1** Crear `apps/web/src/pages/tareas/estudiante/EstudianteTareasPage.jsx` con 4 tabs (Pendientes / En progreso / Entregadas / Calificadas) + filtros.
- [ ] **3.5.2** Crear `apps/web/src/components/tareas/TaskCard.jsx` con badges urgencia (verde/amarillo/rojo según horas restantes).
- [ ] **3.5.3** Crear `apps/web/src/pages/tareas/estudiante/EstudianteTareaDetailPage.jsx` con 2 columnas (enunciado + entrega) + Countdown component.
- [ ] **3.5.4** Submit "Entregar" con AlertDialog confirmación. Hook PB calcula `dias_de_atraso` y `penalizacion_aplicada`.
- [ ] **3.5.5** Hash MD5 client-side con spark-md5 antes de subir → guardar en `entregas.archivos_hashes`.

#### 3.6 Tareas — Profesor califica focus mode

- [ ] **3.6.1** Crear `apps/web/src/pages/tareas/profesor/ProfesorCalificarPage.jsx` con 3 columnas (sidebar entregas / preview / form calificación).
- [ ] **3.6.2** Instalar `react-pdf pdfjs-dist`. Crear `apps/web/src/components/tareas/PdfPreview.jsx`.
- [ ] **3.6.3** Form calificación con `Input nota 1.0-7.0` + Slider opcional + MD editor feedback + upload `archivo_correccion`.
- [ ] **3.6.4** Atajos con `react-hotkeys-hook`: J=siguiente, K=anterior, Cmd+Enter=guardar y siguiente, Cmd+1..7=setea nota.
- [ ] **3.6.5** Si edita nota ya guardada: AlertDialog pidiendo `motivo_recalificacion`, incrementar `version`, guardar `nota_anterior`, escribir en `audit_log`.

#### 3.7 Tareas — Grupos y banco

- [ ] **3.7.1** Crear `apps/web/src/components/tareas/GruposManager.jsx` con drag-and-drop (`@dnd-kit/core`).
- [ ] **3.7.2** Crear `apps/web/src/pages/tareas/estudiante/EstudianteGrupoPage.jsx`.
- [ ] **3.7.3** Crear `apps/web/src/pages/tareas/profesor/ProfesorBancoTareasPage.jsx` con grid + filtros + "Usar plantilla".
- [ ] **3.7.4** Botón "Guardar como plantilla" en `ProfesorTareaFormPage` → crea `banco_tareas`.
- [ ] **3.7.5** Crear `apps/pocketbase/pb_hooks/plagio.pb.js` — `onRecordAfterCreate("entregas")` cruza hashes y notifica al profe si hay matches.

#### 3.8 Evaluaciones — Carga bulk

- [ ] **3.8.1** Crear `apps/web/src/components/evaluaciones/NotaInput.jsx` — Input text con inputMode decimal + atajos teclado (`,`→`.`, ↑↓ step 0.1, Tab/Enter siguiente fila) + validación visual.
- [ ] **3.8.2** Crear `apps/web/src/components/evaluaciones/PuntajeInput.jsx` con bidireccional puntaje↔nota.
- [ ] **3.8.3** Crear `apps/web/src/lib/escala-notas.js` con fórmula chilena estándar.
- [ ] **3.8.4** Crear `apps/web/src/components/evaluaciones/CalificarEvaluacionBulk.jsx` con tabla editable + autosave 800ms + pegado desde Excel + buscador + acción "Aplicar nota base".
- [ ] **3.8.5** Botón "Publicar resultados" con AlertDialog → PATCH `evaluacion.estado="publicada"` → hook crea N notif `nota_publicada`.

#### 3.9 Evaluaciones — Libreta del alumno

- [ ] **3.9.1** Crear `apps/web/src/lib/promedios.js` con cálculo ponderado + re-normalización si falta categoría sin notas + tests unitarios.
- [ ] **3.9.2** Crear `apps/web/src/lib/trimestres.js` (T1/T2/T3) + tests.
- [ ] **3.9.3** Crear `apps/web/src/components/evaluaciones/BadgeNota.jsx` con semáforo.
- [ ] **3.9.4** Crear `apps/web/src/pages/estudiante/EstudianteNotas.jsx` con filtros curso/trimestre/estado, Accordion por curso, Table interna.
- [ ] **3.9.5** Sheet detalle de nota con botón "Pedir revisión" → crea `solicitudes_revision`.
- [ ] **3.9.6** Crear `apps/web/src/components/profesor/LibretaSeccionTable.jsx` — tabla pivot alumnos × evaluaciones con celdas editables inline, header sticky, promedio última columna.

#### 3.10 Evaluaciones — Revisiones y recuperativos

- [ ] **3.10.1** Crear `apps/web/src/pages/profesor/ProfesorRevisionesPage.jsx` con lista + detalle + botones (Sube nota / Baja / Sin cambio / Rechazar).
- [ ] **3.10.2** UI "Crear recuperativo": en `CrearEvaluacionSheet` switch "Es recuperativo de..." → autocomplete + filtra alumnos elegibles.
- [ ] **3.10.3** Hook backend marca evaluación original como `estado_nota="recuperada"` para alumnos que rindieron recuperativo.

#### 3.11 Simulacros PAES

- [ ] **3.11.1** Crear `apps/web/src/data/cortes-carreras-2025.json` con top 20 carreras.
- [ ] **3.11.2** Hook `apps/pocketbase/pb_hooks/simulacros_paes.pb.js` calcula `puntaje` y `percentil` desde `tabla_conversion_json` al crear `resultados_simulacro_paes`.
- [ ] **3.11.3** Crear `apps/web/src/components/evaluaciones/ProgresionPAESChart.jsx` con Recharts (líneas por asignatura, banda error, línea corte).
- [ ] **3.11.4** Crear `apps/web/src/pages/estudiante/EstudiantePAES.jsx`:
  - Card puntaje proyectado con cálculo (sumatoria mejores N por asignatura)
  - 4 cards por asignatura con percentil + tendencia
  - Gráfico progresión
  - Comparación con corte objetivo (Progress bar)
  - Ranking interno con switch consentimiento
- [ ] **3.11.5** UI profesor: en `CalificarEvaluacionBulk`, si `tipo="simulacro_paes"`, mostrar columnas adicionales (correctas, puntaje calculado, percentil).

#### 3.12 EstudianteDashboard extendido

- [ ] **3.12.1** Reescribir `apps/web/src/pages/EstudianteDashboard.jsx` con tabs:
  - Hoy (próximas clases + tareas urgentes)
  - Mis cursos (refactor existente)
  - Calendario (FullCalendar vista alumno)
  - Tareas (link a `EstudianteTareasPage`)
  - Notas (link a `EstudianteNotas`)
  - PAES (link a `EstudiantePAES`)
- [ ] **3.12.2** En `CourseDetailPage` agregar tabs internos: Materiales / Clases / Tareas / Notas curso.

#### 3.13 ApoderadoDashboard extendido

- [ ] **3.13.1** Reescribir `apps/web/src/pages/ApoderadoDashboard.jsx`:
  - Selector de pupilo
  - Card resumen 4 KPIs (asistencia, promedio, PAES proyectado, última nota) con semáforo
  - Card alertas accionables (recuperativo pendiente, cuota vencida, etc.)
- [ ] **3.13.2** Reusar `EstudianteNotas` y `EstudiantePAES` con prop `pupiloId`.
- [ ] **3.13.3** Tab "Pagos pupilo" con tabla `pagos` + botón "Ver detalle".
- [ ] **3.13.4** Tab "Tareas pupilo" (`ApoderadoTareasPupiloPage`).

**Criterio de éxito Fase 3**: profesor crea curso + sección → matricula 5 alumnos → programa clase recurrente 8 semanas (skip feriados ok) → da clase 1 → pasa lista → sube material → crea tarea → alumno entrega PDF → profesor califica con shortcuts → alumno ve nota en libreta + profesor publica simulacro PAES → alumno rinde → ve puntaje + percentil + comparación con corte de Medicina. Apoderado abre app y ve todo de su pupilo en 1 pantalla.

---

### Fase 4 — Comunicaciones + Polish (semana 8, ~5 días)

**Objetivo medible**: notificaciones in-app + email funcionando, anuncios reemplazan grupo de WhatsApp del preu, mensajería 1-a-1 alumno↔profe funcional, banner urgente para apoderados con cuota vencida o inasistencias.

**Dependencias**: Fase 3 (eventos que disparan notifs).

**Mini-diagrama de la fase**:
```
┌────────────────────────────────────────────────────────┐
│ Notificaciones                                         │
│  ├─ NotificationsBell (Header)                         │
│  ├─ Popover con últimas 10                             │
│  ├─ Cron 5min consume cola email                       │
│  ├─ Templates HTML por tipo                            │
│  ├─ Agrupación + preferencias granulares               │
│  └─ Banner urgente en dashboards                       │
│                                                        │
│ Anuncios                                               │
│  ├─ AnunciosDestacadosBanner (top dashboards)          │
│  ├─ Tab Anuncios en CourseDetailPage                   │
│  ├─ NuevoAnuncioDialog con TipTap                      │
│  ├─ Página /comunicaciones/anuncios                    │
│  └─ Rate limits + audiencia resolver                   │
│                                                        │
│ Mensajería 1-a-1                                       │
│  ├─ MessengerSheet desde Header                        │
│  ├─ Lista threads + chat panel                         │
│  ├─ NuevoMensajeDialog con matriz permisos             │
│  └─ Rate limits + acceso admin auditado                │
│                                                        │
│ Polish UX                                              │
│  ├─ Loading skeletons en todos los datos              │
│  ├─ Empty states con CTAs                              │
│  ├─ Toast feedback en cada acción                      │
│  └─ Validación accesibilidad AA                        │
└────────────────────────────────────────────────────────┘
```

**Tickets**:

#### 4.1 Notificaciones — Core

- [ ] **4.1.1** Crear `apps/pocketbase/pb_hooks/comunicaciones_notif_agrupacion.pb.js` — `onRecordBeforeCreate("notificaciones")` con merge logic por `(user_id, tipo, agrupacion_key)` en ventana 5min.
- [ ] **4.1.2** Crear `apps/pocketbase/pb_hooks/comunicaciones_notif_emails.pb.js` — cron 5min consume `notificaciones` con `canal ~ "email" && email_enviado = false`, valida preferencias + DND, dispara via builder-mailer.
- [ ] **4.1.3** Crear templates HTML en `apps/pocketbase/pb_hooks/email_templates/`:
  - `notif_tarea_calificada.html`
  - `notif_nota_publicada.html`
  - `notif_clase_proxima.html`
  - `notif_anuncio_importante.html`
  - `notif_cuota_vencida.html`
  - `notif_inasistencias_seguidas.html`
  - `notif_justificacion_aprobada/rechazada.html`
  - Footer común con link a `/configuracion/notificaciones`

#### 4.2 Notificaciones — UI

- [ ] **4.2.1** Crear `apps/web/src/lib/comunicaciones/notifIcons.js` — map tipo → icono lucide + color.
- [ ] **4.2.2** Crear `apps/web/src/hooks/useNotificaciones.js` con polling 30s + realtime subscribe + invalidación.
- [ ] **4.2.3** Crear `apps/web/src/components/comunicaciones/notificaciones/NotificationsBell.jsx` — Bell icon en Header + badge count + Popover con tabs.
- [ ] **4.2.4** Crear `apps/web/src/components/comunicaciones/notificaciones/NotificationItem.jsx` con icono + título + acción inline.
- [ ] **4.2.5** Crear `apps/web/src/pages/comunicaciones/NotificacionesPage.jsx` con DataTable filtrable + bulk marcar leídas.
- [ ] **4.2.6** Crear `apps/web/src/components/comunicaciones/notificaciones/NotificationToast.jsx` — sonner toast en real-time si página tiene focus.
- [ ] **4.2.7** Crear `apps/web/src/pages/configuracion/NotificacionesPreferencias.jsx` con tabla checkbox por tipo × canal.
- [ ] **4.2.8** Crear `apps/web/src/components/comunicaciones/notificaciones/NotificationsBanner.jsx` — banner sticky para notifs urgentes (cuota vencida, inasistencias seguidas).

#### 4.3 Anuncios

- [ ] **4.3.1** Crear `apps/web/src/lib/comunicaciones/markdownSanitizer.js` con DOMPurify config.
- [ ] **4.3.2** Crear `apps/web/src/components/comunicaciones/shared/MarkdownContent.jsx`.
- [ ] **4.3.3** Crear `apps/web/src/components/comunicaciones/anuncios/EditorTipTap.jsx` con StarterKit + Link + Placeholder + toolbar shadcn.
- [ ] **4.3.4** Crear `apps/web/src/lib/comunicaciones/audienceResolver.js` — resuelve destinatarios según scope.
- [ ] **4.3.5** Crear `apps/web/src/components/comunicaciones/anuncios/NuevoAnuncioDialog.jsx` (reescribe el de Fase 2 con TipTap).
- [ ] **4.3.6** Crear `apps/web/src/components/comunicaciones/anuncios/AnunciosDestacadosBanner.jsx` con Carousel.
- [ ] **4.3.7** Crear `apps/web/src/components/comunicaciones/anuncios/AnuncioCard.jsx`.
- [ ] **4.3.8** Crear `apps/web/src/pages/comunicaciones/AnunciosPage.jsx` con DataTable.
- [ ] **4.3.9** Crear `apps/pocketbase/pb_hooks/comunicaciones_anuncios.pb.js` — hook create:
  - Rate limit via `rate_limits_comunicacion`
  - Genera N `notificaciones` según audiencia
  - Si `importante`, encola emails

#### 4.4 Mensajería 1-a-1

- [ ] **4.4.1** Crear `apps/web/src/lib/comunicaciones/permisosMensajeria.js` con matriz quién puede iniciar thread.
- [ ] **4.4.2** Crear `apps/web/src/hooks/useMessenger.js`.
- [ ] **4.4.3** Crear `apps/web/src/components/comunicaciones/mensajes/MessengerSheet.jsx`:
  - 2 paneles desktop (lista threads + chat)
  - 1 panel mobile con swipe
- [ ] **4.4.4** Crear `apps/web/src/components/comunicaciones/mensajes/ThreadsList.jsx`, `ThreadItem.jsx`, `ChatPanel.jsx`, `MessageBubble.jsx`, `MessageComposer.jsx`.
- [ ] **4.4.5** Crear `apps/web/src/components/comunicaciones/mensajes/NuevoMensajeDialog.jsx` con Combobox destinatarios filtrado por matriz.
- [ ] **4.4.6** Crear `apps/pocketbase/pb_hooks/comunicaciones_mensajes.pb.js`:
  - Hook create message: actualiza `thread.ultima_actividad`, `mensajes_no_leidos_por_user`, crea notif a otros participantes
  - Rate limit
- [ ] **4.4.7** Página `/admin/moderacion/threads` con headers visibles, acción "Solicitar revisión" con motivo obligatorio + audit log + notif a participantes.

#### 4.5 Polish global

- [ ] **4.5.1** Auditar todos los componentes: agregar Skeleton variants donde falte.
- [ ] **4.5.2** Auditar empty states: cada lista vacía con `EmptyState` + CTA.
- [ ] **4.5.3** Auditar toasts: cada mutation con `toast.success`/`toast.error`.
- [ ] **4.5.4** Lighthouse mobile pass en 5 vistas críticas (home, login, dashboard alumno, libreta, calendario profesor).
- [ ] **4.5.5** Auditoría a11y con `@axe-core/react` en dev mode. Corregir issues AA.
- [ ] **4.5.6** Crear `apps/web/src/pages/configuracion/PerfilGeneral.jsx` para todos los roles (cambiar foto, password, preferencias).
- [ ] **4.5.7** Página 404 dedicada `apps/web/src/pages/NotFoundPage.jsx`.

**Criterio de éxito Fase 4**: profesor publica un anuncio "Repaso integrador martes" en sección Mate-A → 28 alumnos + 22 apoderados reciben notif in-app + 0 emails (no es importante) → si marca importante → 50 emails llegan en < 5 min. Apoderado abre mensajería, escribe a profesor de Mate de su pupilo, profesor responde, ambos reciben notif. Alumno con cuota vencida ve banner rojo sticky en dashboard. Cero error 403 en flujos legítimos. WhatsApp informal del preu deja de ser necesario para anuncios académicos.

---

### Fase 5 — Beta + ajustes (semanas 9-10, ~10 días)

**Objetivo medible**: 30 alumnos reales + sus apoderados + 3-5 profesores + 1 secretaria usan PrePa 2 semanas en lugar del sistema actual. Recolectamos data, fixeamos bugs críticos, ajustamos UX donde se traba la gente real.

**Dependencias**: Fases 1-4 completas.

**Mini-diagrama de la fase**:
```
┌────────────────────────────────────────────────────────┐
│ Pre-beta (días 1-2)                                    │
│  ├─ Seed con 30 alumnos reales                         │
│  ├─ Onboarding de profes (sesión 1h)                   │
│  ├─ Onboarding apoderados (email + tutorial)           │
│  └─ Backup automático Coolify configurado              │
│                                                        │
│ Beta abierta (días 3-12)                               │
│  ├─ Soporte directo via WhatsApp privado a Nicolás    │
│  ├─ Daily standup interno (10 min)                     │
│  ├─ Telemetría manual de fricciones                    │
│  └─ Bug-bash semanal                                   │
│                                                        │
│ Cierre (días 13-14)                                    │
│  ├─ Encuesta NPS profes + apoderados                   │
│  ├─ Retrospectiva de qué duele                         │
│  ├─ Backlog priorizado para v1.1                       │
│  └─ Documentación final de operación                   │
└────────────────────────────────────────────────────────┘
```

**Métricas a observar**:

| Métrica | Target | Cómo medir |
|---|---|---|
| Tiempo del profe para pasar lista de 30 alumnos | < 90s | Cronometrado en sesión observada |
| Profes que crean ≥ 1 tarea en la primera semana | 100% | Query PB |
| Apoderados que abren la app al menos 1 vez | > 80% | Campo `users.ultimo_login` |
| Tareas entregadas a tiempo | > 75% | Query PB |
| Notificaciones email con bounce | < 2% | Logs builder-mailer |
| Bug crítico que bloquea uso | 0 | Lista mantenida en GitHub Issues |
| NPS apoderados | > 30 | Encuesta cierre |
| NPS profes | > 50 | Encuesta cierre |

**Tickets**:

#### 5.1 Preparación

- [ ] **5.1.1** Crear `apps/pocketbase/pb_migrations/seed_beta_alumnos.js` (idempotente, NO commitear datos personales — usar variables de entorno o JSON externo).
- [ ] **5.1.2** Configurar backup automático del volumen `pb_data` en Coolify (cron diario + retención 14 días).
- [ ] **5.1.3** Crear `docs/10-onboarding-profesores.md` con workflow paso a paso + screenshots.
- [ ] **5.1.4** Crear `docs/11-onboarding-apoderados.md` versión simplificada.
- [ ] **5.1.5** Sesión de capacitación de 1h con los 3-5 profes (graba para reutilizar).
- [ ] **5.1.6** Email masivo a apoderados con video tutorial de 3 min (Loom).
- [ ] **5.1.7** Configurar Sentry o equivalente para capturar errores frontend silenciosos (V2 ideal, MVP usar `console.error` + monitoreo manual).

#### 5.2 Durante la beta

- [ ] **5.2.1** Setup canal WhatsApp privado Nicolás ↔ usuarios beta para reportes en tiempo real.
- [ ] **5.2.2** Spreadsheet de fricciones reportadas con columnas: usuario / rol / qué hacía / qué pasó / severidad / fix aplicado.
- [ ] **5.2.3** Daily standup 10 min entre Nicolás y dev: top 3 issues de ayer + plan de hoy.
- [ ] **5.2.4** Sprint de bugs semanal (viernes 16:00): triage, asignación, ETA.
- [ ] **5.2.5** Hot-fixes deployables sin downtime.

#### 5.3 Polish específico esperado

- [ ] **5.3.1** Probable: ajustar el flujo de "pasar lista" tras feedback real (target < 90s).
- [ ] **5.3.2** Probable: refinar countdown de tareas (alumnos pueden confundir hora local vs servidor).
- [ ] **5.3.3** Probable: simplificar `RecurrenceWizard` (3 pasos puede ser demasiado).
- [ ] **5.3.4** Probable: el apoderado pide alguna métrica adicional en su dashboard (espacio para 1-2 cambios).

#### 5.4 Cierre

- [ ] **5.4.1** Encuesta NPS con 5 preguntas open-ended a profes y apoderados.
- [ ] **5.4.2** Retrospectiva interna: qué funcionó / qué no / qué hacer en v1.1.
- [ ] **5.4.3** Backlog priorizado en GitHub Issues con labels (`v1.1`, `v1.2`, `wishlist`).
- [ ] **5.4.4** Documentación final operación:
  - `docs/12-runbook-operativo.md` (cómo manejar incidentes comunes)
  - `docs/13-backup-recovery.md`
  - `docs/14-onboarding-staff-nuevo.md`
- [ ] **5.4.5** Decisión: ¿lanzar a la promoción completa 2027? ¿qué falta?

**Criterio de éxito Fase 5**: 80% de los 30 alumnos beta entran al menos 3 veces por semana. Profes paran de mandar tareas por WhatsApp y las hacen en PrePa. Secretaria registra pagos en PrePa en lugar de Excel. NPS profes > 50, NPS apoderados > 30. < 5 bugs críticos sin resolver al final de las 2 semanas.

---

## 10. Migraciones del esquema actual

### 10.1 Qué se mantiene tal cual

- `users` (auth nativa de PB)
- `cursos`, `materiales`, `asistencia`, `justifications`, `parent_student`, `leads` como colecciones (se extienden, no se reemplazan)
- Migración `1780617600_001_fix_role_typo_and_apoderado_access.js` queda como hito histórico
- `pb_hooks/builder-mailer.pb.js` se mantiene (es el pipeline de emails)
- `pb_hooks/custom-migrations-cmd.pb.js` se mantiene

### 10.2 Qué se extiende (NUEVAS migraciones, NUNCA editar las anteriores)

- `users` → multi-rol via `roles`, campos personales (foto, RUT, comuna, etc.)
- `cursos` → metadata académica (materia PAES, color, modalidad)
- `materiales` → `seccion_id` opcional, `publicado`
- `asistencia` → vínculo a `clase_vivo_id`
- `justifications` → archivo adjunto, revisor, comentario

### 10.3 Qué se deprecia

- `asignaciones` (alumno↔curso plano) → reemplazado por `matriculas_seccion` (alumno↔sección). Hook bidireccional sincroniza durante 1 release. Frontend nuevo usa `matriculas_seccion`. Después de Fase 4 estable, una nueva migración remueve la regla de sync.
- `users.rol` (string) → `users.roles` (multi-select). Mantener `rol` poblado durante 1 release como `rol = roles[0]` para no romper código legacy. Eventualmente migración futura lo borra.
- `pb_hooks/external-dashboard.pb.js` (Horizons CDN) → eliminar (sobra fuera de Horizons). Migración nueva no se necesita; basta borrar archivo en deploy a Coolify.

### 10.4 Convención de timestamps de migraciones nuevas

- `1780617700–1780617990`: extensiones y colecciones core LMS (Fase 0)
- `1780618000–1780618200`: refinamientos de comunicaciones, pagos, audit
- `1780619000–1780619020`: seeds
- `1780620000–1780620040`: tareas avanzadas (grupos, banco, plagio)
- `1781000000–1781000020`: contenido público de landing
- `1782000100–1782000140`: clases en vivo avanzadas (recurrencia, leads públicos)

### 10.5 Cómo aplicar en producción

1. Backup `pb_data` antes de cada deploy con migraciones nuevas.
2. Deploy en Coolify dispara `pocketbase horizons migrations:up` (ya configurado en `custom-migrations-cmd.pb.js`).
3. Si una migración falla, exit 1 → deploy aborta → rollback Coolify a versión anterior.
4. Nunca correr `pb_migrations` editadas manualmente. Si hay error, generar nueva migración correctiva.

---

## 11. Riesgos y mitigaciones

| # | Riesgo | Probabilidad | Impacto | Mitigación |
|---|---|---|---|---|
| 1 | **Migración masiva rompe data existente** (ej. `rol` → `roles[]` deja users sin rol válido) | Media | Alto | Hook idempotente que valida + rellena defaults. Migración corre en staging con dump real de producción antes de deploy. Backup automático pre-migración. |
| 2 | **Profesores rechazan la herramienta y siguen con WhatsApp** | Media | Crítico | Onboarding 1-a-1 obligatorio (Ticket 5.1.5). Foco UX: pasar lista < 90s, calificar < 30s por entrega. Beta con 1 profe campeón antes del rollout. Sesión NPS al final con escucha activa. |
| 3 | **Pegar link Meet a mano genera errores frecuentes** (links mal copiados, profes olvidan) | Alta | Medio | Validación regex frontend + botón "Probar link" + reportar link roto desde dashboard alumno → notif al profe. Documentar en runbook. Si duele mucho, acelerar V2 con Zoom API. |
| 4 | **Performance se degrada con muchas notificaciones in-app** | Baja | Medio | Cron diario purga notif `leida=true && fecha_leida < now - 90d`. Cron diario purga `expira_en < now`. Cap de 50 notifs no leídas por usuario (auto-marca leídas las antiguas). |
| 5 | **Profesor califica accidentalmente a su propio hijo** | Baja | Alto | Hook server-side bloquea con ForbiddenError. UI muestra warning antes. Audit log obligatorio si llega a intentarse. |
| 6 | **Apoderado escribe al profe con tono agresivo / acoso** | Media | Alto | Botón "Reportar mensaje" (`flagged=true`) por participante. 3 flags de distintos usuarios → thread auto-bloqueado pendiente revisión admin. Política documentada de moderación. |
| 7 | **Backup falla y se pierde data** | Baja | Crítico | Backup diario automático Coolify (Ticket 5.1.2) + retención 14 días + test mensual de restore en staging. Documentar runbook recovery. |
| 8 | **SMTP de Builder Mailer falla y los emails no salen** | Media | Alto | Retry exponencial 3 intentos. Si falla, notif al admin in-app. Banner UI a usuarios afectados. Configurar SPF/DKIM bien para no caer en spam. |
| 9 | **Diseño visual no convence al apoderado de Punta Arenas** | Baja | Medio | Test guerrilla con 3 apoderados antes del lanzamiento. Iterar copy en Fase 5 si feedback negativo. La fotografía local es la inversión más alta de ROI. |
| 10 | **Plan toma más tiempo del estimado** (10 semanas → 14) | Alta | Medio | MVP estricto. Cada fase con criterio de éxito explícito. Si Fase 3 retrasa, recortar simulacros PAES avanzados a V2 antes que retrasar Fase 4 (comunicaciones es más crítico que percentiles). |

---

## 12. Primeros 10 cambios de código (after this plan is approved)

| # | Archivo | Qué hacer | Por qué ahora |
|---|---|---|---|
| 1 | `C:\Users\Nico\Desktop\Proyectos Amjsoft\prepa\apps\pocketbase\pb_migrations\1780617700_extend_users_personal_data.js` | Crear migración con campos `roles` (multi), `foto`, `telefono`, `rut`, `comuna`, `region`, `preferencias_notificacion`, etc. + extensión de reglas a OR sobre `roles ~ "X"`. | Bloquea TODO lo demás. Sin multi-rol no podemos crear profesores y administrativos. |
| 2 | `C:\Users\Nico\Desktop\Proyectos Amjsoft\prepa\apps\pocketbase\pb_migrations\1780617702_migrate_rol_to_roles.js` | Hook idempotente que copia `rol` legacy a `roles=[rol]` para users existentes. | Permite que el AdminDashboard actual siga funcionando con el nuevo schema. |
| 3 | `C:\Users\Nico\Desktop\Proyectos Amjsoft\prepa\apps\web\package.json` | Instalar deps Fase 0: `@tanstack/react-query`, `@hookform/resolvers`, `zod`, `@fontsource/fraunces`, `@fontsource/inter`, `@fontsource/jetbrains-mono`. | Necesarias para cualquier ticket siguiente del frontend. |
| 4 | `C:\Users\Nico\Desktop\Proyectos Amjsoft\prepa\apps\web\src\index.css` | Reescribir con tokens HSL (light + dark), radius 14px, sombras tinted primary, easings. | La identidad visual depende de esto. Reescritura más temprana = más componentes adoptan los tokens desde el inicio. |
| 5 | `C:\Users\Nico\Desktop\Proyectos Amjsoft\prepa\apps\web\tailwind.config.js` | Extender con fonts Fraunces/Inter/JetBrains Mono, maxWidth custom, fontSize.display-*, transitions. | Mismo motivo que 4. |
| 6 | `C:\Users\Nico\Desktop\Proyectos Amjsoft\prepa\apps\web\src\contexts\AuthContext.jsx` | Agregar `rolActivo`, `switchRol(rol)`, persistencia localStorage, helper `useCanI`. | El `ProtectedRoute` y los nuevos dashboards lo necesitan. |
| 7 | `C:\Users\Nico\Desktop\Proyectos Amjsoft\prepa\apps\web\src\components\ProtectedRoute.jsx` | Aceptar prop `roles={["profesor", "admin"]}` y validar con OR sobre `roles[]`. Reconocer 5 roles para fallback. | Necesario para registrar las nuevas rutas Fase 2. |
| 8 | `C:\Users\Nico\Desktop\Proyectos Amjsoft\prepa\apps\web\src\main.jsx` | Wrappear con `<QueryClientProvider>`. Importar fonts. | TanStack Query estará usado en todos los nuevos hooks. |
| 9 | `C:\Users\Nico\Desktop\Proyectos Amjsoft\prepa\apps\pocketbase\pb_migrations\1780617800_create_profesores_extra.js` | Primera colección nueva. Establece patrón. | Habilita el campo Perfil del Profesor + la página `/equipo` futura de landing. |
| 10 | `C:\Users\Nico\Desktop\Proyectos Amjsoft\prepa\apps\pocketbase\pb_migrations\1780617820_create_secciones_curso.js` | Colección core que reemplaza el modelo plano `asignaciones`. | Sin secciones no hay clases en vivo, ni horarios, ni matrículas nuevas. Es el centro del modelo LMS. |

**Día 1 esperado**: aplicar cambios 1-3 + commit + verificar `npm run dev` levanta y AdminDashboard sigue OK.
**Día 2**: cambios 4-8 + commit + verificar fonts cargan + login con multi-rol funciona.
**Día 3**: cambios 9-10 + arrancar el resto de migraciones de Fase 0.

---

## 13. Open questions para Nicolás

Antes de arrancar a desarrollar 10 semanas necesitamos confirmación de estas decisiones:

1. **Volumen al lanzamiento**: ¿cuántos profesores y cuántos alumnos esperan en marzo 2027? Esto define si vale la pena V2 de Zoom API en septiembre 2026 o se puede empujar a 2027. *Hipótesis actual: 3-8 profes, 30-100 alumnos en cohorte 2027.*

2. **Sistema de cuotas existente**: ¿hoy llevan cuotas en Excel/papel/sistema externo, o no hay nada formal? Si hay data histórica que importar, hay que diseñar un importador. *Hipótesis actual: hoy lo hacen en Excel y se importa CSV vía pantalla admin (1 día de trabajo).*

3. **V1 sin integración API de video**: ¿aceptas que en MVP el profesor pegue el link Meet/Zoom a mano? Esto ahorra 2 semanas de Fase 3 y habilita V1 en 10 semanas. *Recomendación: SÍ aceptar. V2 con Zoom API entra solo si el dolor de marcar asistencia manualmente es real (post-beta).*

4. **Quién es el admin**: ¿el admin del sistema sos vos (developer-dueño) o hay una persona distinta del preu que también opera como admin? Esto define si el rol `admin` se da a 1 o 2 personas y si hay que separar `super_admin` (vos) de `admin_preu` (director académico). *Hipótesis actual: vos sos admin único en MVP, el director académico es `administrativo` con sub_rol `coordinador_academico`.*

5. **Color de marca**: ¿respetar el verde+azul actual del logo o se puede revisar la paleta? El diseño visual propuesto usa azul-teal Magallanes + verde eucalipto + ámbar accent. ¿El logo soporta esta paleta o hay que rediseñarlo? *Recomendación: validar con muestras antes de Fase 1.*

6. **Sesión de fotografía local**: ¿hay budget de USD 200-400 para una sesión con fotógrafo local de Magallanes? Sin fotos reales la landing pierde su diferenciador principal vs Cpech. *Crítico para Fase 1.*

7. **Acceso a Google Workspace for Education**: ¿pueden registrar PrePa como institución educativa formal en Chile para acceder al Workspace gratis? Esto cambia la ecuación V2 de Zoom vs Meet. *Acción concreta: revisar elegibilidad antes de Fase 3.*

8. **Cuentas seed para beta**: ¿pueden facilitar lista de 30 alumnos + apoderados + 3-5 profes reales (con consentimiento) para Fase 5? Sin esto la beta no es real. *Necesario antes de Fase 5.*

9. **Política de notas chilenas**:
   - Aprobación default 4.0 ✓
   - Escala exigencia default 60% ✓
   - Política de copia: ¿cuenta como 1.0 o se excluye del promedio? *Recomendación: cuenta como 1.0 (desincentiva). Configurable por preu.*
   - Trimestres: T1 mar-jun, T2 jul-sep, T3 oct-dic. ¿Confirman? *Hipótesis actual.*

10. **Datos de resultados PAES 2024**: ¿tienen data real de la promoción 2024 (n exacto, puntaje promedio, % ingreso a carrera elegida) para mostrar en la landing? Si no, ¿usan placeholder honesto ("Promoción 2026: aún sin datos") o esperan a tener? *Decisión bloqueante para Fase 1.*

11. **WhatsApp Business**: ¿hoy el preu tiene una cuenta de WhatsApp Business o cuenta personal? Define si en V2 podemos integrar API (caro pero útil) o seguimos con link `wa.me/...` directo. *No bloqueante MVP.*

12. **Pasarela de pago**: ¿quieren integrar Webpay/Khipu/Flow en V2 o el modelo es siempre transferencia + registro manual? *Hipótesis actual: registro manual MVP, evaluar pasarela en post-beta si el dolor existe.*

---

## ANEXO — Archivos de referencia clave en el repo

- `C:\Users\Nico\Desktop\Proyectos Amjsoft\prepa\CLAUDE.md` — contexto general del proyecto
- `C:\Users\Nico\Desktop\Proyectos Amjsoft\prepa\apps\web\src\App.jsx` — rutas a extender
- `C:\Users\Nico\Desktop\Proyectos Amjsoft\prepa\apps\web\src\contexts\AuthContext.jsx` — punto de extensión multi-rol
- `C:\Users\Nico\Desktop\Proyectos Amjsoft\prepa\apps\web\src\components\ProtectedRoute.jsx` — guard de roles
- `C:\Users\Nico\Desktop\Proyectos Amjsoft\prepa\apps\pocketbase\pb_migrations\1780617600_001_fix_role_typo_and_apoderado_access.js` — última migración aplicada (base para extensiones)
- `C:\Users\Nico\Desktop\Proyectos Amjsoft\prepa\apps\pocketbase\pb_hooks\builder-mailer.pb.js` — pipeline emails activo
- `C:\Users\Nico\Desktop\Proyectos Amjsoft\prepa\docs\01-arquitectura.md` a `07-troubleshooting.md` — documentación a actualizar progresivamente
- `C:\Users\Nico\Desktop\Proyectos Amjsoft\prepa\docs\06-pendientes.md` — lista oficial de pendientes técnicos previos
- `C:\Users\Nico\Desktop\Proyectos Amjsoft\prepa\.env.example` — variables a documentar para Fases 2-4

**Documentos a CREAR como parte de Fase 0**:
- `docs/02-modelo-datos.md` — actualizar con las ~22 colecciones nuevas + matriz de permisos extendida
- `docs/08-clases-en-vivo.md` — runbook profesor (cómo crear Meet/Zoom, cómo subir grabación)
- `docs/09-identidad-visual.md` — paleta, fonts, componentes signature, checklist "se siente PrePa"
- `docs/10-onboarding-profesores.md`, `11-onboarding-apoderados.md`, `12-runbook-operativo.md`, `13-backup-recovery.md`, `14-onboarding-staff-nuevo.md` — antes del cierre Fase 5

---

**Fin del plan maestro**. Cualquier cambio mayor a este documento debe ir como nota de revisión al final con fecha + autor + motivo, y la sección 13 debe actualizarse si surge nueva ambigüedad.