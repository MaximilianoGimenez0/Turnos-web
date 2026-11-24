# 02 — Backend Multi-Tenant: Cloud Functions, Pagos por Tenant, Triggers y Cron Jobs

## 1. Objetivos y Alcance

### Problema que resuelve
Las Cloud Functions actuales operan sobre colecciones raíz globales, mantienen cachés en memoria en variables escalares compartidas entre invocaciones (`cachedProfile`, `cachedServices`, `cachedClient` de Mercado Pago), construyen URLs de retorno sin `/:tenantSlug`, reciben webhooks sin contexto de negocio y ejecutan tareas programadas que mezclarían conflictos de horarios entre distintos salones.

### Qué incluye esta fase
- Capa transversal de contexto y autorización multi-tenant en backend (`tenantContext.ts`).
- Triggers automáticos de sincronización de bootstrap (`tenant_slugs/{slug}`) y sincronización de Custom Claims en Firebase Auth al modificar `/tenants/{tenantId}/members/{uid}`.
- Particionado por `tenantId` (con límite LRU y TTL) de las cachés en memoria de `ownerProfile.ts` y `servicesCatalog.ts`.
- Implementación de **Mercado Pago Opción A**: resolución de `mpAccessToken` y `mpWebhookSecret` propios desde `/tenants/{tenantId}/private_config/integrations`, con fallback a `.env` **exclusivamente** cuando `tenant.isDemo === true`, más callables para guardar/consultar estado enmascarado de credenciales.
- Adaptación de `createPreference`, `mpWebhook`, `verifyPayment`, `syncPublicSlot` y las 5 funciones `admin*` de turnos al árbol `/tenants/{tenantId}/...`.
- Callables de administración de plataforma (`superadmin*`) consumidos en la Fase 5 por `/superadmin`.
- Refactorización de `cronJobs.ts` a `db.collectionGroup('slots')` agrupando validaciones de solapamiento y envíos de correo estrictamente por `tenantId`.
- Parametrización multi-tenant de `emailService.ts` (remitente dinámico con nombre del salón, `replyTo` del tenant, `timezone` por tenant y URL `/:tenantSlug/admin`).

### Qué queda explícitamente fuera de alcance
- Componentes visuales de React, contextos de frontend y rutas de React Router (Fases 3, 4 y 5).
- Migración de los datos actuales de producción al tenant `/demo` (Fase 6).

---

## 2. Archivos y Recursos Afectados

### Archivos a crear
- `functions/src/tenantContext.ts` — resolución y validación de `tenantId`, guardias `assertActiveTenant`, `assertTenantRole` y `assertPlatformAdmin`.
- `functions/src/tenantSync.ts` — triggers `onTenantDocWritten`, `onTenantOwnerInfoWritten` y `onTenantMemberWritten` (sincronización de `tenant_slugs` y `setCustomUserClaims`).
- `functions/src/paymentSettings.ts` — callables `adminSavePaymentSettings` y `adminGetPaymentSettingsSummary` para gestionar `/tenants/{tenantId}/private_config/integrations`.
- `functions/src/superadminTenants.ts` — callables `superadminCreateTenant`, `superadminUpdateTenant`, `superadminChangeTenantSlug` y `superadminUpsertTenantMember`.
- `tests/unit/functionsTenantSync.test.ts` — tests unitarios de sincronización de claims, slugs y resolución de credenciales MP.
- `tests/integration/tenantSyncAndPayments.test.ts` — tests de integración contra Auth, Firestore y Functions Emulators para triggers (`syncPublicSlot`, `syncTenantBootstrap`, `syncTenantMemberClaims`) y `paymentSettings`.

### Archivos a modificar
- `functions/src/mercadoPago.ts` — factoría multi-tenant `getTenantMpClients(db, tenantDoc)` con caché acotada por `(tenantId, tokenFingerprint)` y regla estricta `isDemo`.
- `functions/src/ownerProfile.ts` — caché `Map<string, CachedEntry>` por `tenantId` leyendo `/tenants/{tenantId}/ownerinfo/profile` (y fallback a `/tenants/{tenantId}`).
- `functions/src/servicesCatalog.ts` — caché `Map<string, CachedEntry>` por `tenantId` leyendo `/tenants/{tenantId}/services` (eliminando fallback legacy a `/prices`).
- `functions/src/publicSlots.ts` — `syncPublicSlotDocument` recibe `tenantId` y escribe en `/tenants/{tenantId}/public_meta/availability`.
- `functions/src/adminSlots.ts` — `adminCreateSlotsCore`, `adminAssignSlotCore`, `adminCancelSlotCore`, `adminReleaseSlotCore` y `adminDeleteSlotCore` reciben `tenantId` y operan sobre `tenants/{tenantId}/slots`.
- `functions/src/cronJobs.ts` — uso de `db.collectionGroup('slots')` con agrupación por `tenantId` antes de consultar ventanas de conflicto o despachar emails.
- `functions/src/emailService.ts` — soporte de `timezone` por tenant, remitente `"${businessName} vía TurnosWeb <...>"`, link `/${tenantSlug}/admin` e `idempotencyKey` prefijada por `tenantId`.
- `functions/src/index.ts` — cableado y exportación de todas las funciones HTTP/Callable/Triggers/Schedules actualizadas.
- `functions/.env.example` — documentación clara de que `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` actúan únicamente como credenciales de respaldo para tenants con `isDemo: true`.
- `tests/unit/functionsAdminSlots.test.ts`, `tests/unit/functionsCron.test.ts`, `tests/unit/functionsEmail.test.ts`, `tests/unit/functionsSecurity.test.ts` — adaptación de firmas con `tenantId` y casos multi-tenant.
- `tests/integration/cloudFunctions.test.ts` — adaptación de `createPreference` y `verifyPayment` al contrato con `tenantId` y validación de rechazo en tenants sin MP (`isDemo: false`).

---

## 3. Metodología de Implementación

### 3.1 Guardias de Autorización y Contexto (`tenantContext.ts`)
1. `validateTenantIdOrThrow(raw)`: verifica tipo string y `TENANT_ID_REGEX`; lanza `HttpsError('invalid-argument', ...)` ante valores vacíos o con caracteres de ruta (`/`).
2. `assertTenantRole(request, db, tenantId, allowedRoles)`:
   - Exige `request.auth` (`unauthenticated` si falta).
   - Permite acceso inmediato si `request.auth.token.platformAdmin === true`.
   - Verifica `request.auth.token.tenants?.[tenantId]` dentro de `allowedRoles`; si el token aún no se refrescó, consulta `/tenants/{tenantId}/members/{uid}` (`active === true` y `role in allowedRoles`). Si falla ambos, lanza `HttpsError('permission-denied', 'No tenés permisos sobre este negocio.')`.
3. `assertPlatformAdmin(request)`: exige `request.auth?.token?.platformAdmin === true`; caso contrario lanza `HttpsError('permission-denied', ...)`.
4. `getActiveTenantOrThrow(db, tenantId)`: lee `/tenants/{tenantId}`; si no existe lanza `not-found`, y si `status !== 'active'` lanza `failed-precondition`.

### 3.2 Triggers de Bootstrap y Custom Claims (`tenantSync.ts`)
1. **`syncTenantBootstrap`** (disparado al escribir en `tenants/{tenantId}` o `tenants/{tenantId}/ownerinfo/profile`):
   - Construye el documento `/tenant_slugs/{tenant.slug}` combinando `{ tenantId, slug, status, timezone, currency, mpConfigured, ownerProfile, updatedAt }`.
   - Si el tenant fue eliminado, elimina `/tenant_slugs/{slug}`.
2. **`syncTenantMemberClaims`** (`onDocumentWritten('tenants/{tenantId}/members/{uid}')`):
   - Recalcula todas las membresías activas de ese `uid` mediante `db.collectionGroup('members').where('uid', '==', uid).where('active', '==', true)` (o leyendo los claims actuales y aplicando el delta sobre `tenants[tenantId]`).
   - Preserva siempre el booleano `platformAdmin` existente en `admin.auth().getUser(uid).customClaims`.
   - Verifica que el payload JSON de claims no supere `950 bytes` antes de llamar a `admin.auth().setCustomUserClaims(uid, nextClaims)`.

### 3.3 Mercado Pago por Tenant — Opción A + Fallback `isDemo` (`mercadoPago.ts` y `paymentSettings.ts`)
1. **Resolución de credenciales (`resolveTenantMpCredentials(db, tenantDoc)`):**
   - Lee `/tenants/{tenantId}/private_config/integrations`.
   - Si `mpAccessToken` existe y no está vacío $\to$ retorna `{ accessToken: mpAccessToken, webhookSecret: mpWebhookSecret || '', source: 'tenant' }`.
   - Si no tiene token propio y `tenantDoc.isDemo === true` $\to$ retorna `{ accessToken: process.env.MP_ACCESS_TOKEN, webhookSecret: process.env.MP_WEBHOOK_SECRET, source: 'demo_env' }`.
   - Si no tiene token propio y `tenantDoc.isDemo !== true` $\to$ lanza `HttpsError('failed-precondition', 'Este negocio no tiene configurado Mercado Pago para cobros online.')`.
2. **Gestión desde Admin (`paymentSettings.ts`):**
   - `adminGetPaymentSettingsSummary({ tenantId })`: requiere rol `owner`; devuelve `{ configured: boolean, maskedAccessToken: string | null, hasWebhookSecret: boolean, isDemoFallbackActive: boolean, webhookUrl: string }` (**nunca devuelve los secretos en texto plano**).
   - `adminSavePaymentSettings({ tenantId, mpAccessToken?, mpWebhookSecret?, clearCredentials?: boolean })`: requiere rol `owner`; valida formato básico del token, guarda en `private_config/integrations`, genera `maskedAccessToken` (ej. primeros 8 y últimos 4 caracteres) y actualiza `mpConfigured: Boolean(hasOwnToken || tenant.isDemo)` en `/tenants/{tenantId}` (lo cual propaga `mpConfigured` a `/tenant_slugs/{slug}`).
3. **Flujo de Checkout y Webhook (`index.ts`):**
   - `createPreference({ tenantId, slotId, clientData })`:
     - Valida que el tenant esté `active` y resuelve sus credenciales MP **antes** o junto al bloqueo para no dejar bloqueos huérfanos si el negocio no configuró MP.
     - Ejecuta la transacción sobre `/tenants/{tenantId}/slots/{slotId}` consultando conflictos únicamente en `/tenants/{tenantId}/slots`.
     - Configura `back_urls` como `${baseUrl}/${tenant.slug}/payment/{success|failure|pending}`.
     - Configura `notification_url` como `${webhookBaseUrl}?tenantId=${encodeURIComponent(tenantId)}`.
     - Configura `external_reference` como `${tenantId}:${slotId}` y `metadata` con `{ tenant_id: tenantId, tenant_slug: tenant.slug, slot_id: slotId, lock_token: lockToken, ... }`.
     - Guarda el snapshot en `/tenants/{tenantId}/payment_attempts/{attemptId}` con `expireAt` (Timestamp +30 días).
   - `mpWebhook` (`onRequest`):
     - Extrae `tenantId` de `req.query.tenantId` y valida `TENANT_ID_REGEX` (responde `400` si falta o es inválido).
     - Resuelve las credenciales de ese `tenantId` y verifica la firma HMAC `x-signature` usando el `webhookSecret` correspondiente a ese tenant.
     - Obtiene el pago en Mercado Pago con el `Payment` client de ese tenant y **verifica que `metadata.tenant_id` (o el prefijo de `external_reference`) coincida exactamente con `tenantId`**; si no coincide, registra alerta en logs y rechaza con `403` sin tocar Firestore.
   - `verifyPayment({ tenantId, paymentId, slotId? })`:
     - Ejecuta el fast-path y la confirmación transaccional exclusivamente dentro de `/tenants/{tenantId}/slots/{slotId}`.

### 3.4 Callables de `/superadmin` (`superadminTenants.ts`)
Todas invocan `assertPlatformAdmin(request)` en la primera línea:
1. `superadminCreateTenant({ name, slug, ownerEmail, ownerPassword?, timezone?, isDemo? })`:
   - Valida `slug` con `validateTenantSlug`.
   - Busca en Firebase Auth si `ownerEmail` ya existe (`getUserByEmail`); si no existe, crea el usuario con contraseña temporal/provista.
   - Ejecuta una **transacción en Firestore** que verifica que `/tenant_slugs/{slug}` no exista, crea `/tenants/{tenantId}`, `/tenant_slugs/{slug}`, `/tenants/{tenantId}/ownerinfo/profile` (semilla inicial con `businessName: name, email: ownerEmail`), `/tenants/{tenantId}/public_meta/availability` (`{ slots: {} }`) y `/tenants/{tenantId}/members/{ownerUid}` (`role: 'owner', active: true`).
2. `superadminUpdateTenant({ tenantId, status?, name?, timezone?, isDemo? })`: actualiza `/tenants/{tenantId}` y recalcula `mpConfigured`.
3. `superadminChangeTenantSlug({ tenantId, newSlug })`: en transacción, verifica disponibilidad de `newSlug` (salvo que ya pertenezca al mismo `tenantId`), crea el nuevo `/tenant_slugs/{newSlug}`, marca el anterior `/tenant_slugs/{oldSlug}` con `{ redirectToSlug: newSlug }` y actualiza `tenants/{tenantId}.slug`.
4. `superadminUpsertTenantMember({ tenantId, email, role, active })`: vincula o revoca miembros (`owner` / `staff`) sobre un tenant.

### 3.5 Trigger `syncPublicSlot` y Cron Jobs (`collectionGroup`)
1. `syncPublicSlot`: cambiar patrón a `document: 'tenants/{tenantId}/slots/{slotId}'`, `maxInstances: 20` (reemplazando `maxInstances: 1` ya que cada tenant escribe en su propio `public_meta/availability`).
2. `cronJobs.ts`:
   - `processExpiredSlots`: ejecuta `db.collectionGroup('slots').where('status', '==', 'pending_payment').where('expiresAt', '<=', nowIso).limit(500).get()`. Agrupa los documentos por `tenantId = doc.ref.parent.parent!.id`. Por cada `tenantId`, consulta los turnos `confirmed` en ventana **solo en `tenants/{tenantId}/slots`** y aplica actualizaciones precondicionadas.
   - `retryPendingBookingEmails`: ejecuta `db.collectionGroup('slots').where('emailStatus', 'in', ['failed', 'partial', 'processing']).where('updatedAt', '>=', lookbackIso).limit(200).get()`. Para cada turno carga `getOwnerProfileCached(db, tenantId)` y `tenants/{tenantId}` (para `slug` y `timezone`).
   - `cleanupPastSlotsMaintenance`: ejecuta `db.collectionGroup('slots').where('status', 'in', ['available', 'conflict', 'confirmed', 'cancelled']).where('datetime', '<=', nowIso).limit(1000).get()` y procesa bajas/pasaje a `past` en lotes de 400.

---

## 4. Estados Válidos e Invariantes

- **Invariante de Cero Contaminación en Memoria:** Ningún módulo en `functions/src/` mantiene estado cacheado de un negocio sin indexarlo por `tenantId`.
- **Invariante Financiera (Opción A):** Un pago iniciado en `tenantA` jamás utiliza el `mpAccessToken` de `tenantB` ni el `MP_ACCESS_TOKEN` global de `.env` (salvo que `tenantA.isDemo === true`).
- **Invariante de Vinculación Webhook-Tenant:** `mpWebhook` nunca confirma ni libera un turno si el `tenant_id` embebido en la metadata/referencia del pago en Mercado Pago difiere del `tenantId` recibido en la URL del webhook.
- **Invariante de Aislamiento de Conflictos Horarios:** Confirmar, cancelar o vencer un turno en `tenantA` solo puede marcar como `conflict` o reactivar a `available` turnos pertenecientes a `tenants/tenantA/slots`.
- **Invariante de Unicidad de Slugs:** Dos documentos activos en `/tenant_slugs` con `redirectToSlug == null` nunca pueden apuntar a distintos `tenantId` bajo el mismo `slug`.

---

## 5. Comprobaciones y Criterios de Aceptación

1. **Compilación de Functions:** `npm --prefix functions run build` y `npm run lint` terminan con código `0`.
2. **Tests Unitarios de Backend (`npm test`):**
   - Dos tenants con un turno en el mismo horario (`10:00 hs`): confirmar en `tenantA` no altera el turno de `10:00 hs` en `tenantB` tanto en `adminSlots` como en `processExpiredSlots`.
   - `resolveTenantMpCredentials` devuelve token propio cuando existe, usa `.env` cuando `isDemo: true` sin token propio, y lanza `failed-precondition` cuando `isDemo: false` sin token propio.
   - `adminGetPaymentSettingsSummary` devuelve el token enmascarado y jamás incluye `mpAccessToken` ni `mpWebhookSecret` completos.
   - `buildClientEmailHtml` y `buildOwnerEmailHtml` renderizan el nombre del tenant correspondiente y el botón de panel apunta a `${CLIENT_APP_URL}/${tenantSlug}/admin`.
3. **Tests de Integración sobre Emuladores (`npm run test:integration` en `cloudFunctions.test.ts` y `tenantSyncAndPayments.test.ts`):**
   - Crear un tenant vía `superadminCreateTenant` genera atómicamente `/tenants/{id}`, `/tenant_slugs/{slug}`, `/ownerinfo/profile`, `/public_meta/availability`, `/members/{uid}` y asigna Custom Claims en el Auth Emulator.
   - Trigger `syncPublicSlot` (con corrección de `FieldPath` de `firebase-admin/firestore`) actualiza `/tenants/{tenantId}/public_meta/availability` al crear/confirmar turnos en `/tenants/{tenantId}/slots`.
   - `adminSavePaymentSettings` y `adminGetPaymentSettingsSummary` persisten en `private_config/integrations`, actualizan `mpConfigured` en `/tenant_slugs/{slug}` y jamás devuelven secretos en claro.
   - Llamar `adminCreateSlots({ tenantId: 'tnt_b', ... })` autenticado como `ownerA` devuelve `permission-denied`, y `createPreference` sobre un tenant con `isDemo: false` sin token propio devuelve `failed-precondition`.
