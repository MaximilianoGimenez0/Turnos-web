# 05 — Panel `/superadmin` y Gestión del Ciclo de Vida de Tenants

## 1. Objetivos y Alcance

### Problema que resuelve
Conforme a la decisión arquitectónica acordada, el alta y la administración de negocios en la plataforma no tendrán registro público abierto, sino que se operarán de forma centralizada desde `/superadmin`. Se necesita tanto el mecanismo inicial para otorgar el claim `platformAdmin: true` al dueño de la plataforma como la interfaz `/superadmin` para crear negocios, asignar dueños, pausar/reactivar agendas, cambiar slugs sin romper enlaces previos y controlar el flag `isDemo`.

### Qué incluye esta fase
- Script CLI administrativo `scripts/bootstrap-platform-admin.mjs` (ejecutado localmente o en CI seguro con Firebase Admin SDK) para asignar o revocar el Custom Claim `platformAdmin: true` sobre el UID/email del administrador de la plataforma.
- Guardia `PlatformProtectedRoute` y rutas `/superadmin/login` y `/superadmin` en `App.tsx`.
- Servicio `superadminService.ts` para listar en tiempo real `/tenants` y consumir las callables `superadminCreateTenant`, `superadminUpdateTenant`, `superadminChangeTenantSlug` y `superadminUpsertTenantMember` creadas en la Fase 2.
- Interfaz completa de `/superadmin` (`SuperAdminLayout` y `SuperAdminView`) con métricas globales de plataforma, buscador/filtro de negocios, formulario de alta de nuevo negocio y panel de edición/membresías por tenant.

### Qué queda explícitamente fuera de alcance
- Facturación recurrente automatizada de suscripciones SaaS (cobro mensual automático de TurnosWeb a los salones).
- Registro público autoservicio (*self-service onboarding*).
- Migración de los datos legacy actuales al tenant `/demo` (Fase 6).

---

## 2. Archivos y Recursos Afectados

### Archivos a crear
- `scripts/bootstrap-platform-admin.mjs` — script Node.js idempotente con `firebase-admin` para promover un email/UID a `platformAdmin: true` preservando sus claims `tenants`.
- `src/pages/PlatformProtectedRoute.tsx` — guardia de ruta exclusivo para usuarios con `user.platformAdmin === true`.
- `src/layouts/SuperAdminLayout/SuperAdminLayout.tsx` y `SuperAdminLayout.module.css` — layout sobrio de gobierno de plataforma con indicador de sesión SuperAdmin y cierre de sesión.
- `src/pages/SuperAdminView/SuperAdminView.tsx` y `SuperAdminView.module.css` — vista principal con listado de tenants, indicadores operativos y modales/drawers de alta y gestión.
- `src/pages/SuperAdminLogin/SuperAdminLogin.tsx` — acceso dedicado en `/superadmin/login`.
- `src/services/superadminService.ts` — suscripción `subscribeToAllTenants` y wrappers tipados de las callables `superadmin*`.
- `src/texts/pages/SuperAdmin.ts` — textos centralizados de `/superadmin`.
- `tests/unit/superadminService.test.ts` — tests unitarios de validaciones de alta/slug, normalización y helpers del panel `/superadmin`.
- `tests/integration/superadmin.test.ts` — tests de integración contra Auth, Firestore y Functions Emulators para el ciclo de vida completo de tenants (`superadminCreateTenant`, `superadminUpdateTenant`, `superadminChangeTenantSlug`, `superadminUpsertTenantMember`) y bootstrap de `platformAdmin`.

### Archivos a modificar
- `src/App.tsx` — conexión de las rutas `/superadmin/login` y `/superadmin` (con carga diferida `React.lazy` para no agregar peso al bundle público `/:tenantSlug`).
- `src/texts/index.ts` — exportación de `SUPERADMIN_TEXTS`.
- `package.json` — incorporación del script utilitario `"admin:bootstrap": "node scripts/bootstrap-platform-admin.mjs"`.

---

## 3. Metodología de Implementación

### 3.1 Bootstrap Inicial del Administrador de Plataforma (`scripts/bootstrap-platform-admin.mjs`)
1. Recibe `--email <correo>` (y opcionalmente `--revoke` o `--project <id>`, soportando también `FIRESTORE_EMULATOR_HOST` / `FIREBASE_AUTH_EMULATOR_HOST` para desarrollo local).
2. Obtiene el usuario mediante `admin.auth().getUserByEmail(email)`.
3. Lee `user.customClaims || {}` y fusiona `{ ...existingClaims, platformAdmin: !isRevoke }` sin sobrescribir el mapa `tenants` si el superadmin también figura como miembro de algún negocio.
4. Imprime confirmación y recuerda refrescar sesión o invocar `refreshClaims()`.

### 3.2 Carga Diferida (*Code-Splitting*) y Guardia `PlatformProtectedRoute`
1. En `App.tsx`, importar `SuperAdminLayout`, `SuperAdminView` y `SuperAdminLogin` exclusivamente con `lazy(() => import(...))` para que ningún cliente final ni dueño de salón descargue el código del panel `/superadmin`.
2. Comportamiento de `PlatformProtectedRoute`:
   - Si `!isAuthenticated` $\to$ `<Navigate to="/superadmin/login" replace />`.
   - Si `isAuthenticated && !user.platformAdmin` (incluso tras 1 intento de `refreshClaims()`) $\to$ muestra vista de acceso restringido a nivel plataforma sin revelar existencia ni métricas de tenants.
   - Si `user.platformAdmin === true` $\to$ renderiza `<SuperAdminLayout />`.

### 3.3 Flujos Operativos en `SuperAdminView`
1. **Listado y Métricas Globales:**
   - Suscripción en tiempo real a `query(collection(db, 'tenants'), orderBy('createdAt', 'desc'))`.
   - Tarjetas resumen: Total de negocios, Activos, Suspendidos y Con Mercado Pago activo (`mpConfigured === true`).
   - Búsqueda instantánea por nombre comercial, `slug` o `tenantId`, y filtro por estado (`all` | `active` | `suspended` | `demo`).
   - Acciones rápidas por fila: abrir agenda pública (`/${tenant.slug}` en nueva pestaña), abrir backoffice del negocio (`/${tenant.slug}/admin` con permisos de soporte `platformAdmin`), pausar/reactivar y editar configuración.
2. **Alta de Nuevo Tenant ("Crear Negocio"):**
   - Campos:
     - `Nombre comercial` (ej. `"Estudio Aura"`).
     - `Slug de URL` (auto-sugerido a partir del nombre comercial con edición manual; validado en vivo con `validateTenantSlug` mostrando vista previa `tudominio.com/estudio-aura`).
     - `Email del dueño` (si ya existe en Auth lo vincula; si no existe requiere `Contraseña inicial` de al menos 8 caracteres).
     - `Zona horaria` (selector con default `America/Argentina/Buenos_Aires`).
     - `Modo Demo (isDemo)` (switch desactivado por defecto; con advertencia explícita de que activarlo usa las credenciales globales `.env` de Mercado Pago cuando el tenant no cargó token propio).
   - Al confirmar, invoca `superadminCreateTenant` y muestra resumen con links listos para enviar al cliente (`/${slug}` y `/${slug}/login`).
3. **Edición, Cambio de Slug y Gestión de Miembros:**
   - **Suspensión / Reactivación (`superadminUpdateTenant`):** alterna `status` entre `'active'` y `'suspended'` con modal de confirmación (al suspender, la agenda pública pasa instantáneamente a `TenantSuspended` y `createPreference` queda bloqueado).
   - **Renombrado de Slug (`superadminChangeTenantSlug`):** valida el nuevo slug y advierte que `/old-slug` redirigirá automáticamente a `/new-slug`.
   - **Miembros del Negocio (`superadminUpsertTenantMember`):** lista `/tenants/{tenantId}/members`, permite agregar un `owner` o `staff` por email y desactivar accesos revocados.

---

## 4. Estados Válidos e Invariantes

- **Invariante de Exclusividad SuperAdmin:** Ningún usuario sin `request.auth.token.platformAdmin === true` (ni siquiera el `owner` de un tenant válido) puede listar `/tenants`, crear un negocio, modificar `isDemo` ni cambiar un `slug`.
- **Invariante de Bundle Público Liviano:** El chunk JavaScript de `/superadmin` nunca se descarga al visitar `/` ni `/:tenantSlug/*`.
- **Invariante de Consistencia Atómica en Alta y Cambio de Slug:** Todo negocio creado desde `/superadmin` nace siempre con su documento `/tenants/{tenantId}`, su entrada `/tenant_slugs/{slug}`, su `/ownerinfo/profile` inicial, su `/public_meta/availability` vacío y al menos un miembro `owner` con Custom Claims sincronizados.

---

## 5. Comprobaciones y Criterios de Aceptación

1. **Compilación, Separación de Chunks, Lint y Unitarios:** `npm run build` genera un chunk separado para `SuperAdminView`, y `npm run lint` + `npm test` (incluyendo `superadminService.test.ts`) finalizan con código `0`.
2. **Tests de Integración con Firebase Emulators (`npm run test:integration` en `superadmin.test.ts`):**
   - Verifica en Auth + Firestore + Functions Emulators que promover un usuario a `platformAdmin: true` preserva sus `tenants` existentes, que `superadminCreateTenant` crea toda la estructura atómicamente, que `superadminChangeTenantSlug` genera `redirectToSlug` sin romper el slug anterior y que un `owner` regular recibe `permission-denied` al listar `/tenants` o invocar cualquier callable `superadmin*`.
3. **Control de Acceso a `/superadmin`:**
   - Usuario anónimo visita `/superadmin` $\to$ redirige a `/superadmin/login`.
   - Dueño de un salón normal (`tenants: { tnt_a: 'owner' }`, `platformAdmin: false`) visita `/superadmin` $\to$ acceso denegado y `getDocs(collection(db, 'tenants'))` falla en Firestore Rules.
   - Usuario promovido con `scripts/bootstrap-platform-admin.mjs` accede a `/superadmin` y visualiza la lista de tenants.
3. **Ciclo de Vida Completo End-to-End en Emulador:**
   - Crear el negocio `"Salón Magnolia"` con slug `magnolia` y dueño `duena@magnolia.com` desde `/superadmin`.
   - Visitar `/magnolia` muestra inmediatamente la agenda pública vacía con el nombre `"Salón Magnolia"`.
   - Iniciar sesión con `duena@magnolia.com` en `/magnolia/login` ingresa correctamente a `/magnolia/admin`.
   - Cambiar el slug en `/superadmin` de `magnolia` a `magnolia-studio` hace que visitar `/magnolia` redirija automáticamente a `/magnolia-studio`.
   - Suspender `magnolia-studio` desde `/superadmin` muestra `TenantSuspended` en `/magnolia-studio`.
