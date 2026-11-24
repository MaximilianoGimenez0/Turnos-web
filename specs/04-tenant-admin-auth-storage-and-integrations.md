# 04 — Autenticación por Claims, Backoffice del Tenant, Storage Aislado y Credenciales MP

## 1. Objetivos y Alcance

### Problema que resuelve
Hoy cualquier usuario autenticado en Firebase Auth (`Boolean(user)`) supera `ProtectedRoute` y puede operar el panel `/admin`, subir o borrar imágenes en carpetas globales de Cloud Storage y compartir preferencias en `localStorage`. Además, la pantalla de login muestra siempre un cartel de demostración y no existe interfaz para que el dueño de cada centro configure sus propias credenciales de cobro en Mercado Pago (Opción A).

### Qué incluye esta fase
- Lectura, refresco forzado y exposición de Firebase Auth Custom Claims (`platformAdmin`, `tenants: Record<string, TenantRole>`) en `auth.ts` y `AuthContext.tsx`.
- Guardia `ProtectedTenantRoute` que valida autenticación **y** rol activo sobre el `tenantId` resuelto en la URL (`/:tenantSlug/admin`), con pantalla específica `UnauthorizedTenantAccess` cuando un usuario autenticado pertenece a otro salón.
- Adaptación contextual de `/:tenantSlug/login` (`Login.tsx`) mostrando el branding del negocio actual y exhibiendo el aviso de "Modo Demo" únicamente cuando `tenant.isDemo === true`.
- Aislamiento completo de `storageService.ts` bajo `/tenants/{tenantId}/{logo|profile|hero|portfolio}/{fileName}` con validación de prefijo antes de eliminar archivos.
- Adaptación de `AdminLayout.tsx`, `AdminView.tsx`, `OwnerSettings.tsx`, `PortfolioManager.tsx` y `ServicesManager.tsx` al contexto de `tenantId` y permisos por rol (`owner` vs `staff`).
- Nuevo módulo `PaymentSettingsManager` dentro del panel Admin del tenant para cargar, rotar o limpiar `mpAccessToken` y `mpWebhookSecret` vía Cloud Functions (`adminGetPaymentSettingsSummary` y `adminSavePaymentSettings`), mostrando el estado enmascarado y la URL dedicada del webhook.

### Qué queda explícitamente fuera de alcance
- Panel de plataforma `/superadmin` para creación global de tenants y gestión de `isDemo` (Fase 5).
- Script de migración de producción al tenant `/demo` (Fase 6).

---

## 2. Archivos y Recursos Afectados

### Archivos a crear
- `src/pages/TenantStatus/UnauthorizedTenantAccess.tsx` — vista mostrada cuando el usuario tiene sesión activa pero carece de permisos sobre el `tenantId` de la URL.
- `src/components/admin/PaymentSettings/PaymentSettingsManager.tsx` — módulo de configuración de credenciales de Mercado Pago por tenant (Opción A).
- `src/components/admin/PaymentSettings/PaymentSettingsManager.module.css` — estilos alineados con `OwnerSettings` y `FormProgressTracker`.
- `src/services/paymentSettingsService.ts` — wrappers tipados sobre las callables `adminGetPaymentSettingsSummary` y `adminSavePaymentSettings`.
- `src/texts/components/admin/PaymentSettings.ts` — textos de UI, ayudas paso a paso y validaciones para configuración de Mercado Pago.
- `tests/unit/authClaims.test.ts` — tests unitarios de extracción y validación de Custom Claims (`platformAdmin`, `tenants[tenantId]`, roles `owner` vs `staff`).
- `tests/integration/paymentSettings.test.ts` — tests de integración contra Auth, Firestore y Functions Emulators para `paymentSettingsService` (`adminSavePaymentSettings` y `adminGetPaymentSettingsSummary`).

### Archivos a modificar
- `src/services/auth.ts` — extracción de Custom Claims con `user.getIdTokenResult(forceRefresh)` y mapeo en `AuthUser`.
- `src/context/AuthContext.tsx` — exposición de `claims`, `refreshClaims()`, `isPlatformAdmin` y `getTenantRole(tenantId)`.
- `src/pages/ProtectedRoute.tsx` — refactor a `ProtectedTenantRoute` validando pertenencia al `tenantId` activo (con 1 intento automático de `refreshClaims()` si el claim aún no figura en el JWT).
- `src/pages/Login/Login.tsx` — ruta `/:tenantSlug/login`, redirección post-login a `/${slug}/admin`, branding dinámico del tenant y ocultamiento del badge demo si `!tenant.isDemo`.
- `src/layouts/AdminLayout/AdminLayout.tsx` — enlace "Ver web" hacia `/${slug}` y "Cerrar sesión" hacia `/${slug}/login`.
- `src/pages/AdminView/AdminView.tsx` — incorporación de la pestaña "Cobros MP" (`payments`), ocultamiento de pestañas exclusivas de `owner` cuando el rol es `staff`, y prefijado de claves `localStorage` por `tenantId`.
- `src/services/storageService.ts` — firma `uploadImageToStorage(tenantId, file, pathFolder)` y `deleteImageFromStorage(tenantId, imageUrl)`.
- `src/components/admin/OwnerSettings/OwnerSettings.tsx` y `src/components/admin/PortfolioManager/PortfolioManager.tsx` — envío de `tenantId` a `ownerService` y `storageService`.
- `src/components/admin/ServicesManager/ServicesManager.tsx` — envío de `tenantId` a `servicesService`.
- `src/App.tsx` — habilitación de las rutas `/:tenantSlug/login` y `/:tenantSlug/admin`.
- `src/texts/index.ts` y `src/texts/pages/AdminView.ts` — registro de textos del tab de cobros y acceso denegado.
- `tests/unit/storageService.test.ts` y `tests/integration/storageService.test.ts` — actualización de rutas `tenants/${tenantId}/...` y validación de bloqueo cruzado en Storage Emulator.
- `tests/integration/auth.test.ts` — actualización para validar `getIdTokenResult()`, lectura de `claims.tenants`, `refreshClaims()` tras asignación de membresía y rechazo de acceso cruzado en Auth Emulator.

---

## 3. Metodología de Implementación

### 3.1 Gestión de Custom Claims y Refresco de Token (`auth.ts` y `AuthContext.tsx`)
1. Ampliar `AuthUser` en `src/types/index.ts`:
   ```ts
   export interface AuthUser {
     uid: string;
     email: string | null;
     displayName: string;
     platformAdmin: boolean;
     tenants: Record<string, 'owner' | 'staff'>;
   }
   ```
2. En `onAuthChange` y `loginWithEmail`, obtener `const tokenResult = await firebaseUser.getIdTokenResult()` y extraer de forma segura `Boolean(tokenResult.claims.platformAdmin)` y el mapa `tenants`.
3. Exponer `refreshClaims(): Promise<AuthUser | null>` invocando `auth.currentUser.getIdTokenResult(true)` para actualizar el estado en caliente tras asignaciones recientes de permisos sin obligar al usuario a reloguearse.

### 3.2 Flujo de `ProtectedTenantRoute` (Sin Bucles de Redirección)
1. Si `auth.loading` o `tenant.loading` es `true`, renderizar `Loader` de verificación de seguridad.
2. Si `!isAuthenticated`, redirigir con `<Navigate to={buildTenantPath(slug, '/login')} state={{ from: location }} replace />`.
3. Verificar autorización: `const allowed = user.platformAdmin || Boolean(user.tenants[tenantId])`.
4. Si `!allowed` y aún no se intentó refrescar el token para este `(uid, tenantId)`, ejecutar una única vez `await refreshClaims()` (cubre el caso en que `/superadmin` acaba de asignarle el negocio).
5. Si tras refrescar sigue sin rol sobre `tenantId`, renderizar `<UnauthorizedTenantAccess />` mostrando:
   - El correo actualmente autenticado (`user.email`).
   - Enlaces rápidos a los negocios donde sí posee permisos (si tuviera alguno en `user.tenants`).
   - Botón primario "Cerrar sesión e ingresar con otra cuenta" (hace `logout()` y lleva a `/${slug}/login`) y botón secundario "Volver a la agenda pública" (`/${slug}`).

### 3.3 Permisos Diferenciados `owner` vs `staff` en `AdminView`
- **`owner` (y `platformAdmin`):** acceso completo a las 8 secciones (`agenda`, `slots`, `create`, `services`, `charts`, `portfolio`, `owner`, `payments`).
- **`staff`:** acceso operativo a `agenda`, `slots` y `create` (gestión diaria de turnos), ocultando en el menú y bloqueando en `firestore.rules`/`storage.rules`/`paymentSettings.ts` la edición de catálogo, portfolio, perfil comercial y credenciales de Mercado Pago.

### 3.4 Módulo de Credenciales de Mercado Pago (`PaymentSettingsManager.tsx`)
1. Al montar la pestaña, invoca `adminGetPaymentSettingsSummary({ tenantId })` y recibe:
   ```ts
   interface TenantPaymentSettingsSummary {
     configured: boolean;
     maskedAccessToken: string | null;   // Ej: "APP_USR-****-4910"
     hasWebhookSecret: boolean;
     isDemoFallbackActive: boolean;      // true solo si tenant.isDemo && !hasOwnToken
     webhookUrl: string;                 // ".../mpWebhook?tenantId=tnt_xxx"
     updatedAt?: string | null;
   }
   ```
2. Campos del formulario (nunca pre-rellenados con el secreto real; usan placeholders claros cuando ya hay credenciales guardadas):
   - `Access Token de Producción / Prueba` (`type="password"` con toggle mostrar/ocultar mientras se escribe).
   - `Webhook Secret (x-signature)` (`type="password"`).
   - Campo de solo lectura con botón "Copiar URL" para `webhookUrl`, indicando al dueño dónde pegarlo en el panel *Tus integraciones -> Webhooks* de Mercado Pago Developers.
3. Al guardar (`adminSavePaymentSettings`), invalida `clearPublicCache(slug, 'bootstrap')` para que `tenant.mpConfigured` se actualice de inmediato en el frontend.

### 3.5 Aislamiento de Rutas y Borrado Seguro en `storageService.ts`
1. `uploadImageToStorage(tenantId, file, pathFolder)`:
   - Valida `TENANT_ID_REGEX.test(tenantId)`.
   - Construye la referencia `tenants/${tenantId}/${pathFolder}/${Date.now()}_${sanitizedName}`.
2. `deleteImageFromStorage(tenantId, imageUrl)`:
   - Extrae el path del objeto en Storage a partir de `ref(storage, imageUrl).fullPath`.
   - **Guardia defensiva en cliente:** si `!imageRef.fullPath.startsWith(\`tenants/${tenantId}/\`)`, aborta silenciosamente con `console.warn` sin invocar `deleteObject` (protege tanto contra errores de programación como contra el borrado accidental de assets compartidos/default).

---

## 4. Estados Válidos e Invariantes

- **Invariante de Autorización en Ruta Admin:** Ningún componente hijo de `AdminLayout` (ni sus hooks `useSlots({ mode: 'all' })`) se monta hasta que `ProtectedTenantRoute` haya confirmado `user.platformAdmin || Boolean(user.tenants[tenantId])`.
- **Invariante de Opacidad de Secretos MP:** El frontend jamás recibe ni almacena en estado, `sessionStorage` ni `localStorage` un `mpAccessToken` o `mpWebhookSecret` previamente guardado; solo recibe `maskedAccessToken` y booleanos de estado.
- **Invariante de Prefijo en Storage:** Todo objeto creado o eliminado desde el backoffice de `tenantId` reside exclusivamente bajo `tenants/${tenantId}/{logo|profile|hero|portfolio}/...`.
- **Invariante Visual de Login:** En un tenant con `isDemo === false`, la pantalla `/:tenantSlug/login` nunca muestra credenciales ni leyendas de entorno demo.

---

## 5. Comprobaciones y Criterios de Aceptación

1. **Compilación, Lint y Tests Unitarios:** `npm run build`, `npm run lint` y `npm test` (incluyendo `authClaims.test.ts` y `storageService.test.ts`) finalizan con código `0`.
2. **Tests de Integración con Firebase Emulators (`npm run test:integration`):**
   - `auth.test.ts`: verifica contra Auth + Functions Emulators la sincronización de `claims.tenants`, el refresco con `refreshClaims()` y el bloqueo de usuarios sin rol sobre `tenantId`.
   - `storageService.test.ts`: verifica en Storage Emulator la subida/borrado en `tenants/tnt_a/...` y el rechazo `storage/unauthorized` al operar sobre `tenants/tnt_b/...`.
   - `paymentSettings.test.ts`: verifica en Auth + Firestore + Functions Emulators que `owner` guarda y consulta su resumen enmascarado (propagando `mpConfigured` a `tenant_slugs`), mientras `staff` y usuarios de otro tenant reciben `permission-denied`.
3. **Aislamiento de Acceso al Panel Admin (Flujo UI):**
   - Usuario no autenticado entra a `/estudio-a/admin` $\to$ es redirigido a `/estudio-a/login` y tras autenticarse como `ownerA` aterriza en `/estudio-a/admin`.
   - `ownerA` (con sesión activa) navega manualmente a `/estudio-b/admin` $\to$ ve `UnauthorizedTenantAccess`, no se ejecuta ninguna suscripción exitosa a `tenants/tnt_b/slots` y no se produce ningún loop infinito de redirección.
3. **Aislamiento de Imágenes en Storage:**
   - Subir un logo desde `/estudio-a/admin` guarda el archivo en `tenants/tnt_a/logo/...`.
   - Reemplazar el logo elimina el archivo anterior en `tenants/tnt_a/logo/...`; si la imagen anterior era `/default/images/logo-fallback.svg` o una URL externa/ajena, `deleteImageFromStorage` no intenta borrarla.
4. **Flujo de Credenciales Mercado Pago (Opción A):**
   - Guardar `mpAccessToken` y `mpWebhookSecret` desde `PaymentSettingsManager` actualiza el estado a "Configurado", muestra el token enmascarado (`APP_USR-****-...`) y habilita `mpConfigured: true` en el negocio.
   - Al recargar la pestaña, los inputs permanecen vacíos (con indicador de credencial guardada) y la respuesta de red en DevTools no expone los secretos.
