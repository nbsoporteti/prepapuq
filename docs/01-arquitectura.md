# Arquitectura

## Visión general

```
┌──────────────────────┐       ┌──────────────────────┐
│   Navegador (SPA)    │       │     PocketBase       │
│   React + Vite       │       │  Go + SQLite         │
│   shadcn/ui          │       │  /api/* + /_/* admin │
└──────────┬───────────┘       └──────────┬───────────┘
           │ HTTPS                         │ HTTPS
           │                               │
           ▼                               ▼
   prepapuq.cl           api.prepapuq.cl
   (nginx en Coolify)           (binario PB en Coolify)
                                          │
                                          ▼
                                  /pb/pb_data (volumen)
                                  ├── data.db (SQLite)
                                  ├── auxiliary.db
                                  └── storage/ (uploads)
```

## Por qué este stack

| Decisión               | Por qué                                                                                              |
| ---------------------- | ---------------------------------------------------------------------------------------------------- |
| **Vite SPA**           | Sin SSR necesario, build ultra rápido (3-4s), bundle pequeño, despliegue como estáticos en nginx     |
| **PocketBase**         | Un solo binario con auth, CRUD, files, hooks y admin UI. Tiempo de setup mínimo.                     |
| **shadcn/ui**          | Componentes propios (no dependencia externa) construidos sobre Radix. Personalizables sin pelearse.  |
| **Monorepo workspaces**| `npm install` único, paths claros, build coordinado con `concurrently`.                              |
| **Docker + Coolify**   | Reproducible. Un push a git → deploy automático. Coolify gestiona TLS, volúmenes y reverse-proxy.    |

## Flujo de autenticación

```
1. Usuario navega a /login
2. LoginPage hace pb.collection('users').authWithPassword(email, password)
3. PocketBase responde con { token, record }
4. AuthContext guarda token (vía pb.authStore) + currentUser en localStorage
5. ProtectedRoute lee currentUser.rol y redirige al dashboard correspondiente
   - rol === 'estudiante' → /dashboard/estudiante
   - rol === 'apoderado'  → /dashboard/apoderado
   - rol === 'admin'      → /dashboard/admin
6. Cada request siguiente lleva Authorization: Bearer <token>
7. PocketBase evalúa las reglas de la colección contra @request.auth
```

## Flujo de "olvidé mi contraseña"

```
/forgot-password
    │ user ingresa email
    ▼
pb.collection('users').requestPasswordReset(email)
    │ PocketBase genera token y envía email (SMTP configurado en Settings)
    ▼
Usuario abre email → click en link → /reset-password?token=XXX
    │
    ▼
pb.collection('users').confirmPasswordReset(token, newPwd, newPwd)
    │
    ▼
Redirect a /login
```

Requisito: SMTP configurado en PB admin. Sin SMTP el email no sale.

## Flujo de matriculación + asistencia

```
1. Admin crea curso (AdminDashboard tab "Cursos")
   → cursos collection
2. Admin sube materiales al curso (tab "Materiales")
   → materiales collection (curso_id)
3. Admin matricula estudiantes (tab "Matriculación")
   → asignaciones collection (curso_id, user_id)
4. Admin pasa asistencia diaria (tab "Asistencia")
   → asistencia collection (curso_id, user_id, fecha, estado)
5. Apoderado ve asistencia de sus pupilos (ApoderadoDashboard)
   → query a asistencia filtrada por user_id de los pupilos
6. Apoderado justifica inasistencias (JustificationModal)
   → justifications collection (asistencia_id, razon, estado)
```

## Reglas de seguridad

Todas las colecciones tienen reglas server-side. Resumen:

| Acción          | Estudiante                  | Apoderado                            | Admin |
| --------------- | --------------------------- | ------------------------------------ | ----- |
| Ver cursos      | ✓ (autenticado)             | ✓                                    | ✓     |
| Ver materiales  | ✓                           | ✓                                    | ✓     |
| Ver asistencia  | Solo la suya                | Solo de sus pupilos (vía parent_student) | Todas |
| Ver asignación  | Solo las suyas              | Solo de sus pupilos                  | Todas |
| Crear curso     | ✗                           | ✗                                    | ✓     |
| Pasar asistencia| ✗                           | ✗                                    | ✓     |
| Justificar      | ✗                           | ✓                                    | ✓     |

Detalle completo en [`02-modelo-datos.md`](02-modelo-datos.md).

## Despliegue

- **Web** y **PocketBase** se sirven en subdominios distintos:
  - `prepapuq.cl` → SPA (nginx)
  - `api.prepapuq.cl` → PocketBase
- **CORS**: PocketBase permite por default todos los origenes. Si se quiere ajustar, se hace desde el admin de PB (Settings → CORS).
- **TLS**: gestionado por Coolify (Let's Encrypt automático).
- **Volumen persistente**: `/pb/pb_data` debe estar montado a un volumen de Coolify. Sin eso, perdés la BD en cada redeploy.

## Limitaciones conocidas

- **No hay roles compuestos**: un usuario es estudiante, apoderado o admin. No puede ser dos cosas a la vez.
- **No hay sistema de notas/calificaciones**: la asistencia se trackea, las notas no. Habría que agregar una colección `evaluaciones` o similar.
- **No hay sistema de pagos**: el dashboard del apoderado mostraba "Próximo Pago" mockeado; se quitó.
- **No hay multi-tenant**: una instancia = un colegio.
- **Email reset usa la URL configurada en PB Settings → Application URL** — hay que cambiarla manualmente al dominio real al hacer deploy.
