# Troubleshooting

Problemas comunes y cómo resolverlos.

## Desarrollo local

### "deps NOT installed" después de clonar

```bash
npm install
```
desde la raíz. Tarda ~20s la primera vez.

### `npm run dev` arranca el front pero PocketBase falla

Probablemente el binario `apps/pocketbase/pocketbase` no es de tu OS.
- En el repo viene un ELF de Linux (de Horizons).
- En Windows necesitás bajarlo manualmente (ver `03-desarrollo-local.md`).
- En Mac usá `apps/pocketbase/scripts/setup.sh`.
- Más simple: usar Docker Compose.

### El front se conecta pero PB devuelve 401 en todo

El cliente está apuntando al lugar equivocado. Revisar `apps/web/.env.local`:
```
VITE_POCKETBASE_URL=http://localhost:8090
```
Reiniciá Vite después de cambiar `.env.local` (no se detecta en hot reload).

### Vite tira error "Failed to load module" al arrancar

```bash
rm -rf node_modules apps/web/node_modules apps/pocketbase/node_modules
npm install
```

### Login funciona pero el redirect al dashboard tira "Cargando..." infinito

Mirá la consola del navegador. Probablemente la query inicial al dashboard
está siendo bloqueada por las reglas de PB. Casos típicos:

1. **El usuario no tiene `rol` seteado**: la migración original lo definió pero algún usuario creado a mano no lo tiene. Editalo desde el admin de PB.
2. **Las reglas tienen el typo `role`**: aplicaste el fix? Revisá que la migración `1780617600_001_fix_role_typo_and_apoderado_access.js` corrió:
   ```bash
   # En el admin PB → Settings → Logs, debería figurar el run.
   ```
   Si no corrió, reiniciá el container.

### "PocketBase Response: {}" o data vacía sin error visible

Era código de debug; la sesión 2026-06-06 ya lo limpió. Si volvió a
aparecer es porque alguien agregó otro `console.log`. Buscá con:
```bash
grep -rn "console.log" apps/web/src/
```

## Docker

### `docker compose build` falla: "failed to connect to the docker API"

Docker Desktop no está corriendo. Abrilo (icono en la bandeja del sistema en
Windows / Mac, `systemctl start docker` en Linux).

### Build de la imagen `web` falla: "Cannot find module 'vite'"

Verificá que el contexto del build sea la **raíz del repo**, no `apps/web/`.
El Dockerfile espera el `package-lock.json` raíz para resolver el workspace.

### Build de la imagen `pocketbase` falla descargando el binario

Revisá:
1. Que `TARGETARCH` esté seteado al deploy. Coolify lo setea automáticamente; Docker Compose puro no — agregás `platform: linux/amd64` al servicio si te corre con la arch equivocada.
2. Que la URL de descarga sigue válida. Si lanzaron una versión nueva, actualizá el `ARG PB_VERSION` en el Dockerfile.

### El container de PocketBase arranca pero al pegarle queda colgado

Probablemente el volumen `/pb/pb_data` no está montado correctamente. Sin
volumen escribible, PB no puede crear la BD. Revisá:
- En Docker Compose: el bloque `volumes:` está bien.
- En Coolify: el persistent storage está configurado y apunta a `/pb/pb_data`.

### La SPA carga pero las llamadas a la API fallan con CORS

Posibles causas:
1. `VITE_POCKETBASE_URL` apunta a un dominio distinto del que esperás. Revisá DevTools → Network.
2. CORS bloqueado en PB. Por default PB permite todos los origins. Si tocaron Settings → CORS, revisalo.
3. El frontend está en HTTPS pero la URL de PB es HTTP. Mixed content → bloqueado por el navegador.

## Migraciones

### Una migración corrió mal y dejó la BD inconsistente

PB permite revertir la última con:
```bash
cd apps/pocketbase
npm run migrations:revert
```
Esto ejecuta la función `down` de la migración. Solo funciona si la `down`
está bien escrita.

Si no hay manera de revertir, restaurá desde backup del volumen.

### Quiero re-ejecutar las migraciones desde cero

```bash
# CUIDADO: borra TODA la BD
docker compose down -v
docker compose up --build
```

### Una migración tira "Collection already exists" al primer arranque

Es esperado — las migraciones de creación tienen un try/catch que ignora
ese error. Mirá los logs: deberían decir "Collection already exists, skipping".

## Deploy en Coolify

### El build pasa pero la app dice "Cannot GET /dashboard/estudiante"

nginx no está sirviendo el SPA fallback. Verificá que `apps/web/nginx.conf`
está siendo usado por el container:
```bash
docker exec <web-container-id> cat /etc/nginx/conf.d/default.conf
```
Debe tener el bloque `location / { try_files $uri $uri/ /index.html; }`.

### Después de un redeploy se perdió toda la BD

El volumen no está persistente. Asegurate en Coolify de que:
- Persistent Storage está configurado.
- El path source es `/pb/pb_data` (no `/pb_data` o `/data`).
- Es type "Volume" no "Bind mount" (a menos que sepas lo que hacés).

Si ya pasó: backup. Si no había backup: vas a tener que rehidratar desde cero.

### Los emails de reset password no llegan

1. ¿Configuraste SMTP en PB Settings → Mail settings?
2. ¿El test email del admin de PB llega? Si no, el problema es la config SMTP.
3. ¿El link del email apunta a la app o al admin? Editá el template (ver `04-deploy-coolify.md` paso 4).
4. ¿El email cayó en spam? Configurá SPF + DKIM en tu DNS si usás tu propio dominio.

### Healthcheck del container PocketBase queda en "starting" eternamente

El healthcheck del Dockerfile usa `wget` contra `/api/health`. Si PB tarda
más de 15s en arrancar (porque tiene muchas migraciones pendientes en una
BD vacía), aumentá el `--start-period`:
```dockerfile
HEALTHCHECK --interval=30s --timeout=5s --start-period=60s --retries=3 ...
```

### `Application URL` mal configurada en PB

Síntomas:
- Los emails llevan links a `localhost` o al dominio viejo.
- El admin UI no funciona bien con redirects.

Fix: PB admin → Settings → Application → "Application URL" = el dominio
real del frontend (`https://prepa.tudominio.cl`).

## Reglas de seguridad

### Un usuario ve datos que no debería ver

Probablemente la `viewRule` o `listRule` está mal. Diagnóstico:

1. En PB admin → la colección → tab "API Rules" → mirar las reglas activas.
2. En el SDK del front, las queries con `getList`/`getOne` envían el token,
   y PB filtra automáticamente según las reglas. **No** filtres en el cliente
   pensando que es seguridad — solo es UX.
3. Probá la query desde el admin PB → tab "API Preview" con un token de usuario regular.

### Las reglas con `@collection.parent_student.parent_id ?= ...` no funcionan

El operador `?=` es "existe al menos uno". Si ponés:
```
@collection.parent_student.parent_id ?= @request.auth.id
&& @collection.parent_student.student_id ?= user_id
```
PB lo evalúa como un JOIN — ambas condiciones aplican a una **misma fila** de
`parent_student`. Si esto no anda, verificá:
- Que efectivamente exista la fila en `parent_student` que vincula los dos IDs.
- Que `parent_student` tenga reglas que permitan a PB usarla como join (mirá su `listRule`).

## Frontend

### Toasts no aparecen

`<Toaster />` está en `App.jsx` después del `<AuthProvider>`. Si lo
moviste, agregalo de vuelta. Usar `import { toast } from 'sonner'`.

### El form de contacto no envía

`ContactForm.jsx` postea a la colección `leads`. Verificá:
1. La colección `leads` existe (debería, ya hay migración).
2. `leads.createRule` está vacío (= público).
3. Network tab del navegador para ver el error real.

### shadcn/ui componentes desestilizados

Verificá que `apps/web/src/index.css` tenga los `@tailwind base/components/utilities`
y los CSS vars de shadcn (`--background`, `--foreground`, etc).
