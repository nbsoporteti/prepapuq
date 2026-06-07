# Modelo de datos

Todas las colecciones viven en PocketBase. Sus schemas y reglas se definen en
migraciones JavaScript bajo `apps/pocketbase/pb_migrations/`. **Las migraciones
son append-only — nunca se editan después de aplicadas; siempre se agrega una
migración nueva.**

## Diagrama de relaciones

```
                        ┌──────────────┐
                        │    users     │
                        │  (auth coll) │
                        └──────┬───────┘
                               │
            ┌──────────────────┼──────────────────┐
            │                  │                  │
            ▼                  ▼                  ▼
   ┌──────────────────┐ ┌──────────────┐ ┌──────────────────┐
   │  parent_student  │ │ asignaciones │ │    asistencia    │
   │  parent_id  ─────┤ │  user_id ────┤ │  user_id ───────-┤
   │  student_id ────┤  │  curso_id ──┐│ │  curso_id ──┐    │
   └──────────────────┘ └────────────┐││ └─────────────│────┘
                                     │││               │
                                     ▼▼▼               ▼
                                ┌──────────┐    ┌────────────┐
                                │  cursos  │    │ justifica- │
                                └────┬─────┘    │   tions    │
                                     │          │ asistencia │
                                     ▼          │   _id ─────┤
                              ┌──────────────┐  │ user_id ───┤
                              │  materiales  │  └────────────┘
                              │  curso_id ───┤
                              └──────────────┘

   ┌─────────┐
   │  leads  │  (formulario de contacto público)
   └─────────┘
```

## Colecciones

### users (auth)

Sistema de autenticación + perfil.

| Campo      | Tipo     | Requerido | Notas                                          |
| ---------- | -------- | --------- | ---------------------------------------------- |
| email      | email    | ✓         | Único, identificador de login                  |
| password   | password | ✓         | Hash bcrypt                                    |
| name       | text     |           | Nombre completo                                |
| rol        | select   | ✓         | `estudiante` \| `apoderado` \| `admin`         |
| rut        | text     |           | RUT chileno (Run Único Tributario)             |
| created    | autodate |           |                                                |
| updated    | autodate |           |                                                |

⚠️ **El campo es `rol` (sin "e"), no `role`.** Existen migraciones viejas
(`1776144xxx_001_update_rules_for_*`) que escribieron `@request.auth.role`
por error. La migración `1780617600_001_fix_role_typo_and_apoderado_access.js`
corrige esto en todas las colecciones afectadas.

**Reglas (vigentes después del fix):**

```
listRule:   id = @request.auth.id || @request.auth.rol = "admin"
viewRule:   @request.auth.rol = "admin" || @request.auth.rol = "apoderado" || id = @request.auth.id
authRule:   (default PB — verified opcional)
```

El apoderado puede ver datos básicos de cualquier usuario porque necesita
mostrar nombre/RUT/email de sus pupilos en el dashboard.

### cursos

Cursos ofrecidos por el preuniversitario.

| Campo       | Tipo     | Requerido | Notas                                  |
| ----------- | -------- | --------- | -------------------------------------- |
| nombre      | text     | ✓         | Ej: "Matemáticas M1"                   |
| descripcion | text     | ✓         | Resumen del contenido                  |
| portada     | file     |           | Imagen (jpg/png/gif/webp, max 20MB)    |
| created     | autodate |           |                                        |
| updated     | autodate |           |                                        |

**Reglas:**
```
listRule:   @request.auth.id != ""    (cualquier autenticado)
viewRule:   @request.auth.id != ""
createRule: @request.auth.rol = "admin"
updateRule: @request.auth.rol = "admin"
deleteRule: @request.auth.rol = "admin"
```

### materiales

Material de estudio asociado a un curso (PDFs, links a videos, guías).

| Campo    | Tipo     | Requerido | Notas                          |
| -------- | -------- | --------- | ------------------------------ |
| titulo   | text     | ✓         | Nombre visible                 |
| tipo     | select   | ✓         | `PDF` \| `Link`                |
| enlace   | url      | ✓         | URL al contenido               |
| curso_id | relation | ✓         | → cursos                       |
| created  | autodate |           |                                |
| updated  | autodate |           |                                |

**Reglas:** mismas que `cursos` (lista/view abiertos a autenticados, CUD solo admin).

### asignaciones

Tabla de matrículas (qué estudiante está en qué curso).

| Campo    | Tipo     | Requerido | Notas               |
| -------- | -------- | --------- | ------------------- |
| user_id  | relation | ✓         | → users (estudiante)|
| curso_id | relation | ✓         | → cursos            |
| created  | autodate |           |                     |
| updated  | autodate |           |                     |

**Reglas (con fix de apoderado):**
```
listRule: @request.auth.rol = "admin"
       || user_id = @request.auth.id
       || (@collection.parent_student.parent_id ?= @request.auth.id
           && @collection.parent_student.student_id ?= user_id)
```
- Admin ve todo.
- Estudiante ve solo sus propias matrículas.
- Apoderado ve las matrículas de sus pupilos.

Mismo patrón en `viewRule`. CUD solo admin.

### asistencia

Registro diario por estudiante por curso.

| Campo    | Tipo     | Requerido | Notas                                       |
| -------- | -------- | --------- | ------------------------------------------- |
| fecha    | date     | ✓         |                                             |
| estado   | select   | ✓         | `Presente` \| `Ausente` \| `Justificado`    |
| user_id  | relation | ✓         | → users (estudiante)                        |
| curso_id | relation | ✓         | → cursos                                    |
| created  | autodate |           |                                             |
| updated  | autodate |           |                                             |

**Reglas:** mismas que `asignaciones` (estudiante ve la suya, apoderado ve la
de sus pupilos, admin ve todo). CUD solo admin.

### justifications

Justificaciones que el apoderado envía cuando ve una ausencia.

| Campo          | Tipo     | Requerido | Notas                                         |
| -------------- | -------- | --------- | --------------------------------------------- |
| fecha          | date     | ✓         | Copia de la fecha de la asistencia            |
| razon          | text     | ✓         | Motivo escrito por el apoderado               |
| estado         | select   | ✓         | `Pendiente` \| `Aprobada` \| `Rechazada`      |
| user_id        | relation | ✓         | → users (estudiante)                          |
| asistencia_id  | relation | ✓         | → asistencia (la falta que se justifica)      |
| created        | autodate |           |                                               |
| updated        | autodate |           |                                               |

**Reglas:**
```
listRule:  igual a asistencia (admin, dueño, apoderado-del-dueño)
viewRule:  igual
createRule: @request.auth.id != ""     (cualquier autenticado puede crear)
updateRule: @request.auth.rol = "admin"
deleteRule: @request.auth.rol = "admin"
```

⚠️ **Mejora pendiente:** el `createRule` actual permite que cualquier usuario
cree una justificación con cualquier `user_id`. Idealmente debería ser
"apoderado solo de sus pupilos". Para hacerlo agregar una migración con:
```
createRule: @request.auth.rol = "admin"
         || @request.auth.id = user_id
         || (@collection.parent_student.parent_id ?= @request.auth.id
             && @collection.parent_student.student_id ?= user_id)
```

### parent_student

Tabla de unión que vincula un apoderado con sus pupilos.

| Campo      | Tipo     | Requerido | Notas                       |
| ---------- | -------- | --------- | --------------------------- |
| parent_id  | relation | ✓         | → users (apoderado)         |
| student_id | relation | ✓         | → users (estudiante)        |
| created    | autodate |           |                             |
| updated    | autodate |           |                             |

**Reglas:**
```
listRule: @request.auth.rol = "admin" || @request.auth.id = parent_id || @request.auth.id = student_id
viewRule: idem
CUD: solo admin
```

### leads

Submissions del formulario de contacto público (HomePage).

| Campo      | Tipo     | Requerido | Notas             |
| ---------- | -------- | --------- | ----------------- |
| nombre     | text     | ✓         |                   |
| email      | email    | ✓         |                   |
| telefono   | text     |           |                   |
| mensaje    | text     |           |                   |
| created    | autodate |           |                   |

**Reglas:**
```
listRule:   @request.auth.rol = "admin"
viewRule:   @request.auth.rol = "admin"
createRule: ""    (público — cualquiera del formulario de contacto)
```

## Reglas de acceso por rol — vista resumida

| Operación                           | Estudiante                | Apoderado                      | Admin |
| ----------------------------------- | ------------------------- | ------------------------------ | ----- |
| Listar cursos                       | ✓                         | ✓                              | ✓     |
| Ver materiales de un curso          | ✓                         | ✓                              | ✓     |
| Crear / editar / borrar curso       | ✗                         | ✗                              | ✓     |
| Ver mis matrículas                  | ✓                         | n/a                            | ✓     |
| Ver matrículas de pupilo            | ✗                         | ✓                              | ✓     |
| Ver mi asistencia                   | ✓                         | n/a                            | ✓     |
| Ver asistencia de pupilo            | ✗                         | ✓                              | ✓     |
| Pasar asistencia                    | ✗                         | ✗                              | ✓     |
| Crear justificación                 | ✗                         | ✓                              | ✓     |
| Aprobar / rechazar justificación    | ✗                         | ✗                              | ✓     |
| Ver datos de otro user              | ✗                         | ✓ (solo lectura básica)        | ✓     |
| Vincular apoderado ↔ estudiante     | ✗                         | ✗                              | ✓     |

## El operador `?=` de PocketBase

Las reglas del tipo "apoderado ve datos de sus pupilos" usan back-relations:

```
@collection.parent_student.parent_id ?= @request.auth.id
&& @collection.parent_student.student_id ?= user_id
```

- `@collection.<nombre>` referencia toda la colección.
- `?=` significa "existe al menos un registro que cumple".
- Como las dos condiciones están con `&&` referenciando el mismo `@collection.parent_student`, PocketBase las evalúa como un INNER JOIN: tiene que existir **un mismo registro** que cumpla ambas. No son dos exists independientes.

Esto permite expresar joins server-side sin escribir SQL custom.

## Crear una migración nueva

1. Naming: `<unix_timestamp>_001_<descripcion_snake_case>.js` dentro de `apps/pocketbase/pb_migrations/`.
2. Plantilla mínima:
   ```js
   /// <reference path="../pb_data/types.d.ts" />
   migrate((app) => {
     const c = app.findCollectionByNameOrId("cursos");
     c.listRule = '@request.auth.id != ""';
     app.save(c);
   }, (app) => {
     const c = app.findCollectionByNameOrId("cursos");
     c.listRule = "";
     app.save(c);
   });
   ```
3. La migración corre **automáticamente** la próxima vez que PocketBase arranca.
4. Para correr manualmente: `npm run migrations:up --prefix apps/pocketbase`.

## Seeds disponibles

Hay migraciones seed que crean usuarios de ejemplo:
- `1776144690_001_create_user_marta_at_example_com.js`
- `1776144691_001_create_user_camila_at_example_com.js`
- `1776063676_002_seed_parent_student_1_records.js`
- `1776144699_002_seed_parent_student_1_records.js`
- `1776144701_002_seed_asistencia_1_records.js`

Revisalas si necesitás datos de prueba; ejecutan solo si los registros no existen.
