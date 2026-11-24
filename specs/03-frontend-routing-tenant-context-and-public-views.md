# 03 — Frontend: Enrutamiento `/:tenantSlug`, TenantContext, Caché Aislada y Vistas Públicas

## 1. Objetivos y Alcance

### Problema que resuelve
El frontend actual monta los *providers* de negocio encima de `<BrowserRouter>`, usa claves globales en `sessionStorage` sin distinguir de qué negocio provienen, consulta colecciones raíz en Firestore y utiliza rutas estáticas (`/about`, `/prices`, `/payment/success`, `/`). Al introducir múltiples negocios por URL, esto provocaría pérdida del contexto del salón al navegar o volver de Mercado Pago y filtración visual de datos cacheados al cambiar de un salón a otro en la misma pestaña.

### Qué incluye esta fase
- Redirección automática de la raíz `/` hacia la landing del tenant demo (`/demo`).
- Servicio `tenantService.ts` y `TenantProvider` (`TenantContext.tsx`) para resolver `:tenantSlug` leyendo `/tenant_slugs/{slug}` en **1 sola lectura** (con soporte de caché por slug, redirección de slugs antiguos `redirectToSlug`, vista 404 para tenants inexistentes y vista de agenda suspendida).
- Particionado obligatorio por `tenantId`/`slug` de todas las entradas en `publicCache.ts`.
- Refactorización de `db.ts`, `ownerService.ts`, `servicesService.ts`, `OwnerInfoContext.tsx`, `ServicesContext.tsx`, `PortfolioContext.tsx` y `useSlots.ts` para operar bajo `/tenants/{tenantId}/...` y aprovechar el `ownerProfile` embebido en el bootstrap de `/tenant_slugs/{slug}`.
- Parametrización de zona horaria (`timezone`) desde el contexto del tenant en `dateUtils.ts` / vistas públicas.
- Actualización de rutas y enlaces relativos al tenant en `App.tsx`, `Navbar.tsx`, `Footer.tsx`, `ClientView.tsx`, `About.tsx`, `Prices.tsx`, `BookingModal.tsx`, `PaymentSuccess.tsx` y `PaymentFailure.tsx`.

### Qué queda explícitamente fuera de alcance
- Flujo de login, validación de Custom Claims en `ProtectedRoute`, panel `/:tenantSlug/admin` y subida de imágenes a Storage (Fase 4).
- Panel `/superadmin` (Fase 5).

---

## 2. Archivos y Recursos Afectados

### Archivos a crear
- `src/services/tenantService.ts` — resolución de `/tenant_slugs/{slug}`, helpers `buildTenantPath(slug, subPath)` y suscripción/lectura cacheada del bootstrap.
- `src/context/TenantContext.tsx` — `TenantProvider` y hook `useTenant()` (expone `tenantId`, `slug`, `timezone`, `mpConfigured`, `initialOwnerProfile` y estado de resolución).
- `src/pages/TenantStatus/TenantNotFound.tsx` — pantalla 404 cuando `:tenantSlug` no existe.
- `src/pages/TenantStatus/TenantSuspended.tsx` — pantalla informativa cuando `status === 'suspended'`.
- `src/pages/TenantStatus/TenantStatus.module.css` — estilos editoriales coherentes con el sistema visual cálido actual.
- `src/texts/pages/TenantStatus.ts` — textos desacoplados para estados de tenant inexistente o pausado.
- `tests/unit/tenantService.test.ts` — tests unitarios de `buildTenantPath`, caché particionada y estados de resolución.

### Archivos a modificar
- `src/App.tsx` — reestructuración del árbol de rutas (`/` $\to$ `<Navigate to="/demo" replace />`, bloque `/superadmin/*` reservado y bloque `/:tenantSlug/*` envolviendo `TenantProvider` $\to$ `OwnerInfoProvider` $\to$ `ServicesProvider` $\to$ `PortfolioProvider`).
- `src/services/publicCache.ts` — todas las funciones (`readPublicCache`, `writePublicCache`, `clearPublicCache`) reciben `scopeKey` (`slug` o `tenantId`) generando claves `turnos_pub_v2:${scopeKey}:${resource}`.
- `src/services/db.ts` — todas las lecturas, suscripciones y callables (`subscribeToAvailableSlots`, `subscribeToSlotsInRange`, `subscribeToAllSlots`, `fetchAllSlotsOnce`, `createMultipleSlots`, `cancelSlot`, `assignSlotManually`, `releaseSlot`, `deleteSlot`, `requestPaymentPreference`, `verifySlotPayment`) reciben `tenantId: string` como primer parámetro.
- `src/services/ownerService.ts` — `getRawOwnerInfo`, `subscribeToRawOwnerInfo`, `updateOwnerInfo`, `getPortfolioItems`, `subscribeToPortfolio`, `addPortfolioItem`, `deletePortfolioItem` reciben `tenantId: string` (y `slug` al invalidar caché de bootstrap).
- `src/services/servicesService.ts` — `subscribeToServices`, `getServices`, `addService`, `updateService`, `deleteService` reciben `tenantId: string` y eliminan la consulta fallback a la colección legacy `/prices`.
- `src/context/OwnerInfoContext.tsx` — consume `useTenant()`; en visitas públicas hidrata `rawOwner` directamente desde `tenantBootstrap.ownerProfile` **con 0 lecturas adicionales a Firestore** (solo abre `onSnapshot` directo a `tenants/{tenantId}/ownerinfo/profile` cuando el usuario es admin del tenant).
- `src/context/ServicesContext.tsx` y `src/context/PortfolioContext.tsx` — consumen `tenantId` desde `useTenant()`, reinician su estado interno cuando cambia `tenantId` (por ej. usando `key={tenantId}` en el árbol de providers debajo de `TenantProvider`) y usan caché particionada.
- `src/hooks/useSlots.ts` — obtiene `tenantId` desde `useTenant()` (o por argumento explícito) y lo pasa a todas las funciones de `db.ts`.
- `src/components/common/Navbar/Navbar.tsx` — construye enlaces dinámicos (`/${slug}`, `/${slug}/about`, `/${slug}/prices`).
- `src/components/slots/BookingModal/BookingModal.tsx` — si `tenant.mpConfigured === false`, deshabilita el inicio de pago mostrando un aviso claro de contacto directo con el salón.
- `src/pages/PaymentStatus/PaymentSuccess.tsx` y `src/pages/PaymentStatus/PaymentFailure.tsx` — pasan `tenantId` a `verifySlotPayment(tenantId, paymentId, slotId)` y dirigen el botón "Volver al inicio" a `/${slug}`.
- `src/texts/index.ts` — exportación de `TENANT_STATUS_TEXTS`.

---

## 3. Metodología de Implementación

### 3.1 Árbol de Rutas y Montaje por Clave (`key={tenantId}`) en `App.tsx`
1. Mover `BrowserRouter` por encima de los providers de dominio para que `TenantProvider` pueda leer `useParams<{ tenantSlug: string }>()`:
   ```text
   ThemeProvider
   └── AuthProvider
       └── BrowserRouter
           └── Routes
               ├── Route path="/" -> <Navigate to={`/${DEFAULT_DEMO_SLUG}`} replace />
               ├── Route path="/superadmin/*" -> (Reservado para Fase 5)
               ├── Route path="/:tenantSlug" element={<TenantShell />}
               │   ├── Route element={<ClientLayout />}
               │   │   ├── Route index -> <ClientView />
               │   │   ├── Route path="about" -> <About />
               │   │   └── Route path="prices" -> <Prices />
               │   ├── Route element={<ClientLayout showNavbar={false} />}
               │   │   ├── Route path="payment/success" -> <PaymentSuccess />
               │   │   ├── Route path="payment/failure" -> <PaymentFailure />
               │   │   └── Route path="payment/pending" -> <PaymentSuccess />
               │   ├── Route path="login" -> (Fase 4)
               │   ├── Route path="admin" -> (Fase 4)
               │   └── Route path="*" -> <Navigate to="." replace />
               └── Route path="*" -> <TenantNotFound />
   ```
2. **Patrón `key={tenant.tenantId}` en `TenantShell`:** Cuando `TenantProvider` resuelve un tenant activo, renderiza `<TenantDataProviders key={tenant.tenantId}><Outlet /></TenantDataProviders>`. Usar `key={tenant.tenantId}` garantiza por construcción de React que al navegar de `/salon-a` a `/salon-b`, `OwnerInfoProvider`, `ServicesProvider` y `PortfolioProvider` desmonten suscripciones anteriores y monten estado limpio sin condiciones de carrera.

### 3.2 Máquina de Estados de `TenantProvider`
1. Extrae `rawSlug` de `useParams()`, normaliza a minúsculas; si el formato ni siquiera cumple `TENANT_SLUG_REGEX` (y no requiere llamada a red), pasa directo a estado `not_found` con **0 lecturas de Firestore**.
2. Consulta `readPublicCache('slug:' + slug, 'bootstrap')`; si hay acierto vigente:
   - Si tiene `redirectToSlug`, reemplaza la URL actual conservando el sub-path (`/${redirectToSlug}${subPath}`).
   - Si `status === 'suspended'`, renderiza `<TenantSuspended businessName={...} />`.
   - Si `status === 'active'`, expone el contexto listo inmediatamente.
3. En caso de *cache miss*, ejecuta `getDoc(doc(db, 'tenant_slugs', slug))` (1 lectura):
   - Si `!snap.exists()`, guarda un marcador negativo corto en memoria (TTL 60 s para evitar lecturas repetidas en recargas accidentales) y renderiza `<TenantNotFound />`.
   - Si existe, persiste en `publicCache` y aplica las mismas transiciones (`redirect`, `suspended` o `active`).

### 3.3 Helpers de Navegación Segura (`buildTenantPath`)
Implementar `buildTenantPath(slug: string, subPath = ''): string`:
- `buildTenantPath('demo', '')` $\to$ `'/demo'`
- `buildTenantPath('demo', '/prices')` $\to$ `'/demo/prices'`
- `buildTenantPath('demo', '/payment/success')` $\to$ `'/demo/payment/success'`
Reemplazar todo `<Link to="/">`, `<NavLink to="/about">`, `<NavLink to="/prices">` en vistas de tenant por `buildTenantPath(slug, ...)`.

### 3.4 Actualización Dinámica de Metadatos del Documento (`document.title`)
Dentro de `OwnerInfoContext` o `TenantShell`, sincronizar `document.title` con `${owner.businessName || owner.name} · Reservas Online` para que cada centro de estética tenga su propio título en la pestaña del navegador al compartir su link `/:tenantSlug`.

---

## 4. Estados Válidos e Invariantes

- **Invariante de Raíz Demo:** Acceder a `/` siempre redirige de manera determinística y con `replace` hacia `/demo`.
- **Invariante de Costo de Carga Inicial:** Cargar `/:tenantSlug` por primera vez realiza exactamente **1 lectura** a `/tenant_slugs/{slug}` y **1 suscripción** a `/tenants/{tenantId}/public_meta/availability` (2 lecturas totales; 0 lecturas a `ownerinfo/profile`, `services` ni `portfolio` hasta que se visiten `/prices`, `/about` o se abra el modal de reserva).
- **Invariante de Cero Fuga en `sessionStorage` y Memoria:** Ninguna clave de `publicCache` se escribe sin prefijo de `tenantId` o `slug`; cambiar de `/demo` a `/otro-estudio` jamás renderiza ni por un milisegundo servicios, precios ni fotos del tenant anterior.
- **Invariante de Corte en Tenants Suspendidos o Inexistentes:** Si un tenant no existe o tiene `status === 'suspended'`, jamás se montan `ServicesProvider`, `PortfolioProvider` ni `useSlots` (0 suscripciones ni lecturas adicionales).

---

## 5. Comprobaciones y Criterios de Aceptación

1. **Compilación y Tests Unitarios:** `npm run build`, `npm run lint` y `npm test` finalizan con código `0`.
2. **Validación Funcional de Rutas y Estados Borde:**
   - Navegar a `/` redirige automáticamente a `/demo`.
   - Navegar a `/slug-que-no-existe` o `/slug-que-no-existe/prices` muestra `TenantNotFound` sin errores no capturados en consola ni suscripciones a `slots`.
   - Si `/tenant_slugs/salon-pausado` tiene `status: 'suspended'`, navegar a `/salon-pausado` muestra `TenantSuspended` y no expone turnos ni permite abrir checkout.
   - Si `/tenant_slugs/viejo` tiene `redirectToSlug: 'nuevo'`, entrar a `/viejo/prices` redirige automáticamente a `/nuevo/prices`.
3. **Aislamiento de Navegación entre Dos Tenants en la Misma Pestaña:**
   - Visitar `/estudio-a/prices` (cachea servicios de A), luego cambiar la URL a `/estudio-b/prices`: se muestran únicamente los servicios de B y `document.title` refleja el nombre de B.
4. **Retorno de Mercado Pago:**
   - `/estudio-a/payment/success?payment_id=123&external_reference=tnt_a:slot1` invoca `verifyPayment` con `tenantId: 'tnt_a'` y el botón "Volver al inicio" navega a `/estudio-a` (no a `/`).
