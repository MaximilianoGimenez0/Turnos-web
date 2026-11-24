# 01 — Modelo de Datos, Contratos e Infraestructura de Reglas de Seguridad

## 1. Objetivos y Alcance

### Problema que resuelve
Actualmente el esquema de Firestore y Cloud Storage asume un único negocio en colecciones y carpetas raíz (`/slots`, `/services`, `/ownerinfo`, `/logo/...`), y las reglas de seguridad otorgan acceso total de lectura y escritura a cualquier usuario autenticado (`request.auth != null`). En un entorno multi-tenant compartido, esto permitiría acceso cruzado a datos personales (PII) de clientes, modificación de precios ajenos y enumeración de todos los negocios registrados.

### Qué incluye esta fase
- Definición formal de todos los contratos TypeScript multi-tenant compartidos (`Tenant`, `TenantSlugDoc`, `TenantMember`, `TenantPaymentSettingsSummary`, claims de autenticación y payloads con `tenantId`).
- Lista centralizada de slugs reservados del sistema (`RESERVED_TENANT_SLUGS`) y validadores de formato para `slug` y `tenantId`.
- Rediseño completo de `firestore.rules` bajo jerarquía `/tenants/{tenantId}/...` y `/tenant_slugs/{slug}` con bloqueo de listado público (`allow list: if false`) y cierre de escritura directa en `slots`.
- Rediseño completo de `storage.rules` bajo `/tenants/{tenantId}/{folder}/{fileName}` basado en Custom Claims.
- Configuración de índices compuestos (`COLLECTION` y `COLLECTION_GROUP`) y política TTL en `firestore.indexes.json`.
- Pruebas unitarias de validadores de tenant y pruebas de reglas de seguridad sobre Firebase Emulators.

### Qué queda explícitamente fuera de alcance
- Modificación de la lógica de negocio en Cloud Functions (cubierto en Fase 2).
- Cambios en componentes React, contextos o enrutamiento del frontend (cubierto en Fases 3, 4 y 5).
- Migración de documentos existentes en producción (cubierto en Fase 6).

---

## 2. Archivos y Recursos Afectados

### Archivos a crear
- `src/config/tenantConstants.ts` — constantes globales (`DEFAULT_DEMO_SLUG = 'demo'`, `RESERVED_TENANT_SLUGS`, expresiones regulares de `slug` y `tenantId`).

### Archivos a modificar
- `src/types/index.ts` — incorporación de tipos de dominio multi-tenant, roles, claims y extensión de contratos de Functions (`CreatePreferencePayload`, `VerifyPaymentPayload`, contratos Admin y SuperAdmin).
- `src/utils/validators.ts` — funciones puras `validateTenantSlug(slug)` y `normalizeTenantSlug(raw)`.
- `firestore.rules` — reemplazo de reglas *single-tenant* por reglas jerárquicas multi-tenant con verificación de Custom Claims y fallback de membresía.
- `storage.rules` — reemplazo de rutas raíz por `/tenants/{tenantId}/{folder}/{fileName}` con validación de rol por tenant.
- `firestore.indexes.json` — declaración de índices para consultas por subcolección y `COLLECTION_GROUP` para cron jobs, más override TTL en `payment_attempts.expireAt`.
- `tests/unit/validators.test.ts` — casos de prueba para slugs válidos, inválidos y reservados.
- `tests/integration/securityRules.test.ts` — reescritura orientada a validar aislamiento multi-tenant en Firestore Rules.

### Archivos o recursos a eliminar
- Eliminación lógica en `firestore.rules` de los bloques legacy `/public_slots/{slotId}` y `/prices/{priceId}` (ningún código nuevo volverá a escribir ni leer en rutas raíz).

---

## 3. Metodología de Implementación

### 3.1 Identificadores, Slugs Reservados y Normalización
1. Definir en `src/config/tenantConstants.ts`:
   - `DEFAULT_DEMO_SLUG = 'demo'`.
   - `TENANT_ID_REGEX = /^tnt_[a-z0-9]{6,32}$/` (ej. `tnt_demo` para el showcase inicial y `tnt_<nanoid/random>` para altas desde `/superadmin`).
   - `TENANT_SLUG_REGEX = /^[a-z0-9]+(?:-[a-z0-9]+)*$/` con longitud mínima `3` y máxima `40` caracteres.
   - `RESERVED_TENANT_SLUGS` (conjunto inmutable): `'admin'`, `'superadmin'`, `'login'`, `'logout'`, `'api'`, `'payment'`, `'about'`, `'prices'`, `'assets'`, `'default'`, `'artifacts'`, `'auth'`, `'static'`, `'app'`, `'www'`, `'root'`, `'system'`, `'null'`, `'undefined'`.
2. Implementar `validateTenantSlug` rechazando mayúsculas sin normalizar, guiones al inicio/fin, guiones dobles consecutivos y cualquier coincidencia con `RESERVED_TENANT_SLUGS`.

### 3.2 Esquema Exacto de Documentos en Firestore

1. **Índice público de resolución `/tenant_slugs/{slug}`:**
   ```ts
   interface TenantSlugBootstrapDoc {
     tenantId: string;                  // Ej: "tnt_demo"
     slug: string;                      // Coincide exactamente con el ID del documento
     status: 'active' | 'suspended';
     redirectToSlug?: string | null;    // Presente solo cuando este slug fue reemplazado por otro
     timezone: string;                  // IANA TZ, ej: "America/Argentina/Buenos_Aires"
     currency: 'ARS';
     mpConfigured: boolean;             // Indica si admite checkout online (propio o fallback demo)
     ownerProfile: Partial<OwnerInfo>;  // Copia proyectada de ownerinfo/profile para carga en 1 lectura
     updatedAt: string;                 // ISO-8601
   }
   ```
2. **Documento maestro `/tenants/{tenantId}`:**
   ```ts
   interface TenantDoc {
     id: string;
     slug: string;                      // Slug canónico vigente
     previousSlugs?: string[];          // Historial de slugs que redirigen al actual
     name: string;                      // Nombre comercial interno/visible
     status: 'active' | 'suspended';
     isDemo: boolean;                   // Solo editable por platformAdmin; habilita fallback .env de MP
     mpConfigured: boolean;             // true si tiene token propio o isDemo == true
     timezone: string;                  // Default: "America/Argentina/Buenos_Aires"
     currency: 'ARS';
     createdAt: string;
     updatedAt: string;
     createdByUid: string;
   }
   ```
3. **Membresías `/tenants/{tenantId}/members/{uid}`:**
   ```ts
   type TenantRole = 'owner' | 'staff';

   interface TenantMemberDoc {
     uid: string;
     email: string;
     displayName?: string;
     role: TenantRole;
     active: boolean;
     createdAt: string;
     updatedAt: string;
   }
   ```
4. **Configuración privada `/tenants/{tenantId}/private_config/integrations`:**
   ```ts
   interface TenantPrivateIntegrationsDoc {
     mpAccessToken?: string | null;
     mpWebhookSecret?: string | null;
     mpPublicKey?: string | null;
     maskedAccessToken?: string | null; // Ej: "APP_USR-****-9876"
     updatedAt: string;
     updatedByUid: string;
   }
   ```
5. **Subcolecciones operativas bajo `/tenants/{tenantId}/`:**
   - `ownerinfo/profile`: mantiene exactamente la interfaz `OwnerInfo`.
   - `public_meta/availability`: `{ slots: Record<string, PublicSlotProjection>, updatedAt: string }`.
   - `services/{serviceId}` y `portfolio/{workId}`: mantienen sus estructuras actuales.
   - `slots/{slotId}`: mantiene `Slot` y añade el campo obligatorio `tenantId: string` para trazabilidad directa en consultas `collectionGroup('slots')`.
   - `payment_attempts/{attemptId}` y `payment_incidents/{paymentId}`: mantienen sus campos actuales y añaden `tenantId: string` y `tenantSlug: string`.

### 3.3 Estructura de Custom Claims en Firebase Auth
Definir en `src/types/index.ts` la interfaz esperada del token decodificado:
```ts
interface TurnosCustomClaims {
  platformAdmin?: boolean;
  tenants?: Record<string, 'owner' | 'staff'>;
}
```

### 3.4 Implementación de `firestore.rules` y `storage.rules`
1. En `firestore.rules`:
   - Crear funciones auxiliares `isSignedIn()`, `isPlatformAdmin()`, `hasTenantClaim(tenantId, roles)`, `hasActiveMemberDoc(tenantId, roles)`, `isTenantMember(tenantId)` e `isTenantOwner(tenantId)`.
   - `/tenant_slugs/{slug}`: `allow get: if true; allow list, write: if false;`.
   - `/tenants/{tenantId}`: `allow get: if resource.data.status == 'active' || isTenantMember(tenantId); allow list: if isPlatformAdmin(); allow write: if false;` (todas las altas y ediciones de tenants pasan por las callables transaccionales `superadmin*` para mantener sincronizado `/tenant_slugs/{slug}`).
   - `/tenants/{tenantId}/members/{uid}`: `allow get: if isSignedIn() && (request.auth.uid == uid || isTenantOwner(tenantId)); allow list: if isTenantOwner(tenantId); allow write: if false;`.
   - `/tenants/{tenantId}/private_config/{docId}`: `allow read, write: if false;`.
   - `/tenants/{tenantId}/public_meta/{docId}`: `allow get: if docId == 'availability'; allow list, write: if false;`.
   - `/tenants/{tenantId}/ownerinfo/{docId}`: `allow get: if docId == 'profile'; allow list: if false; allow write: if docId == 'profile' && isTenantOwner(tenantId);`.
   - `/tenants/{tenantId}/services/{serviceId}` y `/portfolio/{workId}`: `allow read: if true; allow write: if isTenantOwner(tenantId);`.
   - `/tenants/{tenantId}/slots/{slotId}`: `allow read: if isTenantMember(tenantId); allow write: if false;` (toda mutación ocurre vía Cloud Functions).
   - `/tenants/{tenantId}/payment_attempts/{attemptId}`: `allow read, write: if false;`.
   - `/tenants/{tenantId}/payment_incidents/{incidentId}`: `allow read: if isTenantOwner(tenantId); allow write: if false;`.
   - Regla final comodín `match /{document=**}`: `allow read, write: if false;`.
2. En `storage.rules`:
   - Única ruta habilitada: `match /tenants/{tenantId}/{folder}/{fileName}` restringida a `folder in ['logo', 'profile', 'hero', 'portfolio']`.
   - `allow read: if true;`.
   - `allow create, update`: solo si `isTenantOwner(tenantId)` (vía `request.auth.token.platformAdmin == true || request.auth.token.tenants[tenantId] == 'owner'`), tamaño $\le 5\text{ MB}$ y MIME válido (`svg+xml` permitido únicamente en `logo`).
   - `allow delete`: solo si `isTenantOwner(tenantId)`.

### 3.5 Configuración de `firestore.indexes.json`
1. Declarar índices con `queryScope: "COLLECTION"` en `slots`:
   - `(status ASC, datetime ASC)`
   - `(status ASC, expiresAt ASC)`
2. Declarar índices con `queryScope: "COLLECTION_GROUP"` en `slots`:
   - `(status ASC, expiresAt ASC)`
   - `(emailStatus ASC, updatedAt ASC)`
   - `(status ASC, datetime ASC)`
3. Declarar índice con `queryScope: "COLLECTION"` en `payment_attempts`:
   - `(slotId ASC, createdAt DESC)`
4. En `fieldOverrides`, configurar `ttl: true` para `collectionGroup: "payment_attempts"`, `fieldPath: "expireAt"` (preservando índices de campo simple por defecto).

---

## 4. Estados Válidos e Invariantes

- **Invariante de No-Enumeración:** Ningún cliente anónimo ni administrador de un tenant puede ejecutar `list` (`getDocs`) sobre `/tenants` ni sobre `/tenant_slugs`; solo `platformAdmin` puede listar `/tenants`.
- **Invariante de Aislamiento Cross-Tenant:** Un usuario con `request.auth.token.tenants = { tnt_a: 'owner' }` nunca puede leer `/tenants/tnt_b/slots`, ni escribir en `/tenants/tnt_b/{ownerinfo|services|portfolio}`, ni escribir/borrar en Storage bajo `/tenants/tnt_b/...`.
- **Invariante de Integridad de Turnos (`slots`):** Ningún cliente web (ni siquiera el `owner` legítimo del tenant) puede crear, editar ni borrar documentos en `/tenants/{tenantId}/slots/*` directamente desde el SDK cliente; solo el Admin SDK en Cloud Functions puede mutarlos.
- **Invariante de Confidencialidad de Secretos:** `/tenants/{tenantId}/private_config/*` y `/tenants/{tenantId}/payment_attempts/*` jamás pueden ser leídos desde ningún cliente autenticado (ni siquiera por `owner` o `platformAdmin` desde el navegador).
- **Invariante de Unicidad y Reserva de Slugs:** Ningún `slug` válido puede colisionar con rutas del sistema (`login`, `admin`, `superadmin`, `payment`, `about`, `prices`, `assets`, `default`, `artifacts`).

---

## 5. Comprobaciones y Criterios de Aceptación

1. **Compilación y Tipado:** `npx tsc -b` y `npm run lint` finalizan con código `0`.
2. **Tests Unitarios de Slugs (`npm test`):**
   - Acepta slugs válidos (`demo`, `estudio-rosa`, `nails-24`).
   - Rechaza slugs reservados (`superadmin`, `admin`, `login`, `payment`, `prices`, `about`), slugs de menos de 3 caracteres, mayúsculas crudas o caracteres especiales.
3. **Suite de Reglas en Emulador (`firebase emulators:exec --only auth,firestore,storage ...`):**
   - `getDoc(doc(db, 'tenant_slugs/demo'))` sin autenticación $\to$ **PERMITIDO**.
   - `getDocs(collection(db, 'tenant_slugs'))` sin o con autenticación de owner $\to$ **DENEGADO**.
   - `ownerA` lee `tenants/tnt_a/slots` y escribe `tenants/tnt_a/services/s1` $\to$ **PERMITIDO**.
   - `ownerA` intenta escribir directo en `tenants/tnt_a/slots/slot1` $\to$ **DENEGADO**.
   - `ownerA` intenta leer `tenants/tnt_a/private_config/integrations` $\to$ **DENEGADO**.
   - `ownerA` intenta leer `tenants/tnt_b/slots` o escribir en `tenants/tnt_b/services/s1` $\to$ **DENEGADO**.
   - `ownerA` intenta subir imagen en Storage a `tenants/tnt_b/logo/x.webp` o a la raíz legacy `logo/x.webp` $\to$ **DENEGADO**.
   - `platformAdmin` lista `collection(db, 'tenants')` $\to$ **PERMITIDO**.
