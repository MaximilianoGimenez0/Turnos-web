# TODO / Reporte Técnico — Blindaje de Secretos y Credenciales (Firebase Secret Manager + Cifrado por Tenant)

> **Estado:** Pendiente (para convertir en `specs/08-...` e implementar)
> **Prioridad:** Alta antes de sumar clientes comerciales pagos en `turneado.app`
> **Fecha de relevamiento:** 2026-11-24
> **Ámbito:** Google Cloud Console, Firebase Functions v2 (`functions/`), Firestore (`/private_config/integrations`), Emuladores y CI

---

## 1. Diagnóstico Actual por Capa

| Capa | Ubicación actual | Tipo de dato | Estado / Riesgo |
| :--- | :--- | :--- | :--- |
| **Frontend Web** | `.env` (`VITE_FIREBASE_*`) | Identificadores públicos del proyecto Firebase | Normal que vayan al bundle JS; falta restringir la Browser API Key por HTTP Referrer en GCP y evaluar App Check. |
| **Backend Config (no secreta)** | `functions/.env` (`CLIENT_APP_URL`, `MP_WEBHOOK_URL`, `RESEND_FROM_EMAIL`, `BUSINESS_*`) | Configuración de entorno | Correcto mantener en `functions/.env` o `defineString`. |
| **Backend Secretos globales** | `functions/.env` (`RESEND_API_KEY`, `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`) | Secretos sensibles reales | Hoy se despliegan como env vars en texto plano en Cloud Run y viven en disco local. *(Además revisar si `MP_ACCESS_TOKEN` de respaldo del modo Demo debe ser `TEST-...` en lugar de `APP_USR-...`.)* |
| **Credenciales MP de clientes (SaaS)** | Firestore `/tenants/{tenantId}/private_config/integrations` | `mpAccessToken` y `mpWebhookSecret` de cada negocio | Bien aislado por `firestore.rules` (`allow read, write: if false`), pero almacenado en texto plano dentro de Firestore (visible en Console / backups privilegiados). |

---

## 2. Matriz de Mínimo Privilegio (Qué Función Necesita Qué Secreto)

Al migrar a `defineSecret` (`firebase-functions/params`), solo las funciones estrictamente necesarias reciben cada secreto:

| Cloud Function | `RESEND_API_KEY` | `MP_ACCESS_TOKEN` | `MP_WEBHOOK_SECRET` | `INTEGRATIONS_ENCRYPTION_KEY` *(Nivel 3)* |
| :--- | :---: | :---: | :---: | :---: |
| `createPreference` | — | Sí *(fallback demo)* | — | Sí |
| `mpWebhook` | Sí | Sí *(fallback demo)* | Sí *(fallback demo)* | Sí |
| `verifyPayment` | Sí | Sí *(fallback demo)* | — | Sí |
| `releaseExpiredSlots` *(cron email retry)* | Sí | — | — | — |
| `adminSavePaymentSettings` | — | — | — | Sí |
| `adminGetPaymentSettingsSummary` | — | — | — | Sí *(solo si requiere re-enmascarar; si guarda `maskedAccessToken` separado no hace falta)* |
| Resto (`admin*Slots`, `superadmin*`, `onTenant*`, `syncPublicSlot`, `cleanupPastSlots`) | **No** | **No** | **No** | **No** |

---

## 3. Plan de Implementación por Niveles (TODO)

### Nivel A — Blindaje inmediato en Google Cloud Console (sin cambios de código)
- [ ] Restringir la **Browser API Key** de Firebase en *Google Cloud Console → APIs & Services → Credentials*:
  - **Application restrictions → Websites (HTTP referrers):** `https://turneado.app/*`, `https://www.turneado.app/*`, `https://turnos-web-eb8b5.web.app/*` (y `http://localhost:5173/*` solo si se usa contra Firebase real).
  - **API restrictions:** limitar únicamente a las APIs usadas por Firebase Web SDK (Identity Toolkit, Token Service, Cloud Firestore, Cloud Storage, Cloud Functions).
- [ ] Revisar si el entorno `/demo` (`isDemo: true`) debe usar un `MP_ACCESS_TOKEN` de prueba (`TEST-...`) en vez de un token productivo (`APP_USR-...`).
- [ ] Rotar `RESEND_API_KEY` y `MP_ACCESS_TOKEN` al completar la migración a Secret Manager.

### Nivel B — Migrar Secretos Globales a Firebase Secret Manager (`defineSecret`)
- [ ] Habilitar **Secret Manager API** en el proyecto `turnos-web-eb8b5` (verificando cobertura dentro del free tier de GCP: 6 versiones activas y 10.000 accesos/mes sin cargo).
- [ ] Cargar secretos con Firebase CLI:
  - `firebase functions:secrets:set RESEND_API_KEY`
  - `firebase functions:secrets:set MP_ACCESS_TOKEN`
  - `firebase functions:secrets:set MP_WEBHOOK_SECRET`
- [ ] Declarar `defineSecret(...)` en `functions/src/` y adjuntar `secrets: [...]` únicamente en las funciones de la matriz de mínimo privilegio (`createPreference`, `mpWebhook`, `verifyPayment`, `releaseExpiredSlots`).
- [ ] Retirar `RESEND_API_KEY`, `MP_ACCESS_TOKEN` y `MP_WEBHOOK_SECRET` de `functions/.env` (dejando solo configuración no secreta).
- [ ] Configurar soporte para desarrollo local y emuladores:
  - Agregar `functions/.secret.local` a `.gitignore` y crear `functions/.secret.local.example`.
  - Actualizar `.github/workflows/ci.yml` (`integration-tests`) para copiar `functions/.secret.local.example` a `functions/.secret.local` antes de iniciar Firebase Emulators.
- [ ] Desplegar Functions y verificar en Cloud Console que los secretos ya figuren montados desde Secret Manager y no en variables de entorno en texto plano.

### Nivel C — Cifrado en Reposo (AES-256-GCM) de `/private_config/integrations`
- [ ] Generar una clave simétrica de 32 bytes (256 bits) en Base64/Hex y cargarla en Secret Manager como `INTEGRATIONS_ENCRYPTION_KEY` (con soporte opcional de rotación `keyVersion: 'v1'`).
- [ ] Crear módulo `functions/src/cryptoUtils.ts` (usando `node:crypto` nativo, 0 dependencias externas) con `encryptSecret(plaintext, key)` y `decryptSecret(payload, key)` mediante **AES-256-GCM** (IV aleatorio de 12 bytes + auth tag de 16 bytes).
- [ ] Actualizar `functions/src/paymentSettings.ts` para cifrar `mpAccessToken` y `mpWebhookSecret` antes de guardar en `/tenants/{tenantId}/private_config/integrations` (manteniendo `maskedAccessToken` en claro para mostrar en UI sin descifrar).
- [ ] Actualizar `functions/src/mercadoPago.ts` (`resolveTenantMpCredentials`) con **lectura retrocompatible** (si detecta formato cifrado `enc:v1:...` descifra; si detecta valor legacy en claro sigue funcionando hasta migrar o rotar).
- [ ] Agregar tests unitarios (`tests/unit/cryptoUtils.test.ts` + cobertura en `functionsTenantSync.test.ts`) y tests de integración (`tests/integration/paymentSettings.test.ts`) verificando que en Firestore nunca quede el token en texto plano.

### Nivel D — Protección Anti-Abuso Opcional (Firebase App Check)
- [ ] Evaluar activación de **Firebase App Check** con reCAPTCHA v3 / Enterprise en `turneado.app`.
- [ ] Configurar `enforceAppCheck: true` de forma progresiva en callables públicas (`createPreference`, `verifyPayment`) una vez verificado el funcionamiento en navegadores móviles/desktop y configurado el debug token en local.

---

## 4. Criterios de Validación cuando se Implemente
- [ ] `npm run lint`, `npm test`, `npm run build` y `npm --prefix functions run build` en verde.
- [ ] `npm run test:integration` en verde en local y en GitHub Actions usando `functions/.secret.local`.
- [ ] Prueba real en `https://turneado.app/demo`: creación de preferencia MP, recepción de webhook firmado, envío de email vía Resend y guardado/lectura cifrada de credenciales MP en un tenant de prueba.
- [ ] Verificación con `npm run cli -- doctor` (Spec 07) de que no queden secretos en texto plano en `functions/.env`.
