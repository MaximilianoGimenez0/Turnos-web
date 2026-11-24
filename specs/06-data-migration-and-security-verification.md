# 06 — Migración de Datos Actuales a `/demo` y Certificación de Seguridad Cross-Tenant

## 1. Objetivos y Alcance

### Problema que resuelve
El proyecto cuenta hoy con datos existentes en colecciones raíz (`/ownerinfo/profile`, `/services`, `/portfolio`, `/slots`, `/public_meta/availability`, `/payment_attempts`, `/payment_incidents`), archivos en carpetas raíz de Cloud Storage y pruebas de integración diseñadas para un único tenant. Antes de desplegar las nuevas reglas y funciones en producción, es indispensable migrar sin pérdida los datos actuales hacia el tenant `/demo` (al que redirige `/`) y certificar de forma automatizada que no exista ningún vector de fuga de datos ni colisión operativa entre dos negocios distintos.

### Qué incluye esta fase
- Script idempotente de migración `scripts/migrate-single-to-demo-tenant.mjs` con modos `--dry-run` (solo reporte y respaldo JSON local) y `--execute` (copia verificada hacia `/tenants/tnt_demo/...`, `/tenant_slugs/demo`, copia opcional de objetos en Storage a `/tenants/tnt_demo/...` y asignación de Custom Claims al usuario administrador existente).
- Script controlado de limpieza post-verificación `scripts/cleanup-legacy-root-collections.mjs` para eliminar colecciones y objetos raíz obsoletos una vez validado el corte en producción.
- Actualización de los helpers y fixtures de integración (`tests/setup/fixtures.ts`, `tests/setup/testEnvironment.ts`) y migración de toda la suite existente en `tests/integration/*.test.ts` al esquema multi-tenant.
- Nueva suite dedicada de auditoría y penetración Cross-Tenant (`tests/integration/crossTenantIsolation.test.ts`) ejecutada contra Firebase Emulator Suite (Auth + Firestore + Storage + Functions).
- Procedimiento exacto de despliegue escalonado (*cutover checklist*) y actualización de `README.md`.

### Qué queda explícitamente fuera de alcance
- Desarrollo de nuevas funcionalidades de producto ajenas a la migración multi-tenant.
- Borrado automático destructivo de las colecciones raíz durante el mismo paso de copia inicial (la limpieza se ejecuta únicamente como paso posterior verificado).

---

## 2. Archivos y Recursos Afectados

### Archivos a crear
- `scripts/migrate-single-to-demo-tenant.mjs` — migrador idempotente con backup previo, reporte de conteos y validación de integridad.
- `scripts/cleanup-legacy-root-collections.mjs` — script de purga diferida de colecciones raíz legacy (`/slots`, `/public_meta`, `/public_slots`, `/ownerinfo`, `/portfolio`, `/services`, `/prices`, `/payment_attempts`, `/payment_incidents`) con flag obligatorio `--confirm-delete-legacy`.
- `tests/integration/crossTenantIsolation.test.ts` — suite automatizada de pruebas de intrusión y aislamiento entre `Tenant A`, `Tenant B`, `Anonymous` y `PlatformAdmin`.

### Archivos a modificar
- `tests/setup/testEnvironment.ts` y `tests/setup/fixtures.ts` — helpers `seedTestTenant(slug, options)`, `createTenantOwnerUser(tenantId, email)` (con Custom Claims en el Auth Emulator) y limpieza integral entre tests.
- `tests/integration/auth.test.ts`, `tests/integration/cloudFunctions.test.ts`, `tests/integration/db.booking.test.ts`, `tests/integration/db.slots.test.ts`, `tests/integration/ownerService.test.ts`, `tests/integration/servicesService.test.ts` — adaptación de todas las pruebas de integración existentes al contexto de `tenantId`.
- `.gitignore` — ignorar directorio local de respaldos de migración (`backups/`).
- `README.md` — documentación de arquitectura multi-tenant, variables `.env`, comandos de bootstrap/migración y ejecución de tests de seguridad.

---

## 3. Metodología de Implementación

### 3.1 Diseño del Script Idempotente `migrate-single-to-demo-tenant.mjs`
1. **Parámetros:** `--dry-run` (por defecto), `--execute`, `--tenant-id tnt_demo`, `--slug demo`, `--admin-email <correo>` y `--promote-platform-admin`.
2. **Paso 1 — Respaldo íntegro local:** exporta todas las colecciones raíz existentes a `backups/pre-multitenant-<timestamp>.json` antes de escribir un solo byte.
3. **Paso 2 — Copia de Storage y reescritura de URLs:**
   - Inspecciona `logoUrl`, `pictureUrl`, `heroImageUrl` en `/ownerinfo/profile` y cada `imageUrl` en `/portfolio/*`.
   - Si apuntan a objetos propios en carpetas raíz (`logo/...`, `profile/...`, `hero/...`, `portfolio/...`), copia cada objeto a `tenants/tnt_demo/{folder}/{fileName}` conservando `contentType` y `cacheControl`, obtiene su nueva URL pública y sustituye la referencia en los documentos destino para que futuras ediciones desde Admin puedan reemplazar/borrar la imagen bajo las nuevas `storage.rules`.
4. **Paso 3 — Escritura idempotente en Firestore (conservando IDs originales de documentos):**
   - Crea/actualiza `/tenants/tnt_demo` con `{ id: 'tnt_demo', slug: 'demo', status: 'active', isDemo: true, mpConfigured: true, timezone: 'America/Argentina/Buenos_Aires', currency: 'ARS', ... }`.
   - Copia `/ownerinfo/profile` $\to$ `/tenants/tnt_demo/ownerinfo/profile`.
   - Copia `/services/{id}` $\to$ `/tenants/tnt_demo/services/{id}` (si `/services` estuviera vacío y existiera `/prices`, migra `/prices/{id}` directamente a `/tenants/tnt_demo/services/{id}`).
   - Copia `/portfolio/{id}` $\to$ `/tenants/tnt_demo/portfolio/{id}`.
   - Copia `/slots/{slotId}` $\to$ `/tenants/tnt_demo/slots/{slotId}` inyectando `tenantId: 'tnt_demo'`.
   - Reconstruye `/tenants/tnt_demo/public_meta/availability` a partir de los turnos migrados usando `buildPublicSlotProjection` (garantizando consistencia exacta).
   - Copia `/payment_attempts/{id}` y `/payment_incidents/{id}` agregando `tenantId: 'tnt_demo'` y `tenantSlug: 'demo'`.
   - Genera `/tenant_slugs/demo` con el bootstrap completo sincronizado.
5. **Paso 4 — Membresía y Custom Claims:**
   - Registra al usuario `--admin-email` en `/tenants/tnt_demo/members/{uid}` (`role: 'owner', active: true`) y asigna `customClaims = { tenants: { tnt_demo: 'owner' }, ...(promotePlatformAdmin ? { platformAdmin: true } : {}) }`.
6. **Paso 5 — Verificación de paridad:** compara conteos origen vs. destino colección por colección y falla con código distinto de `0` ante cualquier discrepancia.

### 3.2 Matriz Obligatoria de Pruebas de Seguridad (`crossTenantIsolation.test.ts`)
Sembrar en cada corrida dos negocios independientes: **`tenantA`** (`tnt_estudioa`, `slug: 'estudio-a'`, `isDemo: false`, con token MP propio simulado) y **`tenantB`** (`tnt_estudiob`, `slug: 'estudio-b'`, `isDemo: false`, con token MP distinto), con sus respectivos dueños `ownerA` y `ownerB`:

1. **Vector 1 — Anti-Enumeración:**
   - Cliente anónimo y `ownerA` ejecutan `getDocs(collection(db, 'tenants'))` y `getDocs(collection(db, 'tenant_slugs'))` $\to$ ambos rechazados con `permission-denied`.
2. **Vector 2 — Lectura/Escritura Cross-Tenant en Firestore:**
   - `ownerA` intenta leer `tenants/tnt_estudiob/slots` o `tenants/tnt_estudiob/payment_incidents` $\to$ `permission-denied`.
   - `ownerA` intenta crear/editar/borrar en `tenants/tnt_estudiob/services`, `portfolio` u `ownerinfo/profile` $\to$ `permission-denied`.
3. **Vector 3 — Inmutabilidad de `slots` y Blindaje de Secretos en el Propio Tenant:**
   - `ownerA` intenta hacer `setDoc`/`updateDoc`/`deleteDoc` directo sobre `tenants/tnt_estudioa/slots/s1` desde el SDK cliente $\to$ `permission-denied`.
   - `ownerA` intenta hacer `getDoc` sobre `tenants/tnt_estudioa/private_config/integrations` o `payment_attempts/p1` $\to$ `permission-denied`.
4. **Vector 4 — Aislamiento Cross-Tenant en Cloud Storage:**
   - `ownerA` intenta subir archivo a `tenants/tnt_estudiob/portfolio/hack.webp` o borrar un archivo existente de `tenantB` $\to$ `storage/unauthorized`.
5. **Vector 5 — Falsificación de `tenantId` en Cloud Functions (`onCall`):**
   - `ownerA` invoca `adminCreateSlots`, `adminAssignSlot`, `adminCancelSlot`, `adminReleaseSlot`, `adminDeleteSlot`, `adminSavePaymentSettings` y `adminGetPaymentSettingsSummary` pasando `tenantId: 'tnt_estudiob'` $\to$ todas responden `HttpsError('permission-denied')`.
   - `ownerA` invoca `superadminCreateTenant` o `superadminUpdateTenant` $\to$ `HttpsError('permission-denied')`.
6. **Vector 6 — Aislamiento de Agenda, Cron Jobs y Webhook de Pagos:**
   - Crear un turno a las `15:00 hs` en `tenantA` y otro a las `15:00 hs` en `tenantB`.
   - Confirmar el turno de `15:00 hs` en `tenantA` (y crear un turno solapado a las `15:30 hs` en ambos tenants): el turno de `15:30 hs` pasa a `conflict` **solo en `tenantA`**, mientras en `tenantB` tanto `15:00 hs` como `15:30 hs` siguen `available`.
   - Enviar notificación a `mpWebhook?tenantId=tnt_estudiob` referenciando un pago cuya metadata pertenece a `tnt_estudioa` $\to$ rechazado (`401`/`403`) sin modificar documentos de ningún tenant.
   - Intentar `createPreference` en un tercer `tenantC` (`isDemo: false`, sin credenciales MP propias) $\to$ rechazado con `failed-precondition` sin usar `process.env.MP_ACCESS_TOKEN`.

### 3.3 Secuencia Segura de Despliegue a Producción (*Cutover Order*)
1. `firebase deploy --only firestore:indexes` y aguardar a que todos los índices `COLLECTION` y `COLLECTION_GROUP` figuren `READY`.
2. Ejecutar `node scripts/migrate-single-to-demo-tenant.mjs --dry-run` y verificar el reporte y el archivo de backup local; luego ejecutar con `--execute --promote-platform-admin`.
3. Desplegar atómicamente Functions, Reglas y Hosting: `npm run build && firebase deploy --only functions,firestore:rules,storage,hosting`.
4. Validar en vivo `/` ($\to$ `/demo`), `/demo/prices`, `/demo/login`, `/demo/admin` y `/superadmin`.
5. Tras período de observación (ej. 7 días), ejecutar `node scripts/cleanup-legacy-root-collections.mjs --confirm-delete-legacy`.

---

## 4. Estados Válidos e Invariantes

- **Invariante de Idempotencia de Migración:** Ejecutar `migrate-single-to-demo-tenant.mjs --execute` dos o más veces seguidas produce exactamente el mismo estado en Firestore, Storage y Auth sin duplicar turnos, servicios ni trabajos del portfolio.
- **Invariante de Preservación Histórica:** El 100% de los turnos históricos (`past`, `confirmed`, `cancelled`), servicios y piezas de portfolio existentes antes de la migración permanecen íntegros bajo `/tenants/tnt_demo/...` con sus métricas intactas en `/demo/admin`.
- **Invariante de Cero Regresión de Seguridad:** Ningún despliegue puede promoverse si falla cualquiera de los 6 vectores de `crossTenantIsolation.test.ts`.

---

## 5. Comprobaciones y Criterios de Aceptación

1. **Calidad Estática y Unitaria Completa:**
   - `npm run lint` $\to$ código `0`.
   - `npm test` (toda la suite unitaria de frontend y functions) $\to$ 100% en verde.
   - `npm run build` y `npm --prefix functions run build` $\to$ código `0`.
2. **Suite Completa de Integración y Penetración en Emuladores:**
   - `npm run test:integration` ejecuta todas las suites de integración más `crossTenantIsolation.test.ts` sobre Auth, Firestore, Storage y Functions Emulators con **0 fallos**.
3. **Prueba del Migrador sobre Datos Reales/Clonados en Emulador:**
   - Sembrar datos en las colecciones raíz legacy, correr `migrate-single-to-demo-tenant.mjs --execute` contra el emulador y verificar que:
     - `/` redirige a `/demo` mostrando todos los turnos disponibles, servicios y fotos migradas.
     - Las colecciones raíz quedan bloqueadas por `firestore.rules` sin afectar ninguna pantalla de la app.
     - El administrador migrado ingresa tanto a `/demo/admin` como a `/superadmin`.
