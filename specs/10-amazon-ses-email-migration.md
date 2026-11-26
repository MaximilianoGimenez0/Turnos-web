# 10 — Migración Completa de Correos Transaccionales a Amazon SES (`turneado.app`)

> **Estado:** Listo para implementar (Pendiente de ejecución)  
> **Ámbito:** Cloud Functions (`functions/`), CLI operativa (`scripts/cli/`), Tests unitarios (`tests/unit/`) y Documentación técnica  
> **Requisito clave:** Reemplazo directo y total de **Resend** por **Amazon SESv2** (`@aws-sdk/client-sesv2`) con dominio verificado `turneado.app`, **sin** fallback, feature flags ni convivencia entre proveedores.

---

## 1. Objetivos y Alcance

### Problema que resuelve
Actualmente, el envío de correos transaccionales del backend ([functions/src/emailService.ts](file:///d:/Projects/Portfolio%20personal/Turnos-web/functions/src/emailService.ts)) depende del SDK `resend`, requiere `RESEND_API_KEY` y `RESEND_FROM_EMAIL` en `functions/.env`, y mantiene validaciones específicas para Resend en la CLI operativa (`npm run ops:doctor`).

Con acceso a producción aprobado en **Amazon SES** y el dominio propio `turneado.app` verificado, se requiere migrar directamente toda la infraestructura de despacho de emails a AWS SDK v3 (`@aws-sdk/client-sesv2`), conservando intactas todas las plantillas HTML/texto plano, los temas dinámicos por comercio, los flujos de confirmación y reintento, y eliminando por completo toda dependencia o referencia a Resend.

### Qué incluye esta especificación
- **Nueva capa de transporte modular (`functions/src/sesMailer.ts`):**
  - Cliente oficial `@aws-sdk/client-sesv2` (`SESv2Client`, `SendEmailCommand`) con reutilización cacheada por firma de configuración (`region`, `accessKeyId`, `secretAccessKey`).
  - Identidad multitenant centralizada sobre el dominio verificado `noreply@turneado.app` con Display Name dinámico del comercio (`"Nombre del Comercio" <noreply@turneado.app>`).
  - Codificación **RFC 2047** (`=?UTF-8?B?...?=`) automática para Display Names con tildes, `ñ` o caracteres no-ASCII, y `Charset: 'UTF-8'` explícito en `Subject`, `Html` y `Text`.
  - Soporte para `ReplyToAddresses` dinámico (email del negocio en correos al cliente; email del cliente en correos/alertas al negocio) y `ConfigurationSetName` opcional vía `SES_CONFIGURATION_SET`.
  - Manejo explícito y clasificación de errores comunes de AWS SES (`MessageRejected`, `MailFromDomainNotVerifiedException`, `AccountSendingPausedException`, `SendingPausedException`, `TooManyRequestsException`, `BadRequestException`, `CredentialsProviderError` y ausencia de credenciales/región) siguiendo las convenciones de `firebase-functions/logger` con enmascaramiento de emails (`maskEmail`).
- **Refactorización limpia de [functions/src/emailService.ts](file:///d:/Projects/Portfolio%20personal/Turnos-web/functions/src/emailService.ts):**
  - Eliminación total de `resend` (`import`, `getResendClient`, `isResendConfigured`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `idempotencyKey` de Resend y prefijos `[Resend]`).
  - Preservación al 100% de todas las plantillas HTML inline y plain-text (`buildClientEmailHtml`, `buildClientEmailText`, `buildOwnerEmailHtml`, `buildOwnerEmailText`, `buildPaymentIncidentEmailHtml`, `buildPaymentIncidentEmailText`), así como del motor de temas multitenant (`resolveEmailThemeForAppearance`, `EMAIL_THEME`, `getOwnerProfileCached`, `sanitizeEmailLogoUrl`).
  - Registro del `MessageId` retornado por Amazon SES en cada despacho exitoso.
- **Actualización de dependencias, entorno, CLI, tests y documentación:**
  - Desinstalación de `resend` e instalación de `@aws-sdk/client-sesv2` en `functions/` (sin `@react-email/render`, ya que todas las plantillas se renderizan mediante string builders puros).
  - Reemplazo de variables en `functions/.env.example` (y `functions/.env`), actualización de `auditEnvConfig` en [scripts/cli/core/env.mjs](file:///d:/Projects/Portfolio%20personal/Turnos-web/scripts/cli/core/env.mjs), actualización/ampliación de tests unitarios y limpieza de referencias en documentación/TODOs.

### Qué queda explícitamente fuera de alcance
- Convivencia, fallback hacia Resend o feature flags entre proveedores.
- Modificación de plantillas visuales, textos comerciales, paletas, radios, tipografías o lógica de cálculo financiero en `emailService.ts` / `tenantAppearance.ts`.
- Construcción de MIME raw (`Content.Raw`) para adjuntos (verificado en auditoría que no existen adjuntos en ningún correo actual; todos usan `Content.Simple`).
- Migración de credenciales a Google Cloud Secret Manager (`defineSecret`), la cual permanece planificada por separado en [secrets-and-credentials-hardening.md](file:///d:/Projects/Portfolio%20personal/Turnos-web/artifacts/todo/secrets-and-credentials-hardening.md).
- Cambios en los invocadores `processPaymentConfirmation` ([functions/src/index.ts](file:///d:/Projects/Portfolio%20personal/Turnos-web/functions/src/index.ts)) o `retryPendingBookingEmails` ([functions/src/cronJobs.ts](file:///d:/Projects/Portfolio%20personal/Turnos-web/functions/src/cronJobs.ts)), cuya firma pública de consumo (`sendBookingConfirmationEmails`, `sendPaymentIncidentAlertEmail`, `resolveEmailTimezone`) se mantiene 100% compatible.

---

## 2. Archivos y Recursos Afectados

### Archivos a crear
- `functions/src/sesMailer.ts` — Capa de transporte y cliente oficial AWS SDK v3 (`@aws-sdk/client-sesv2`), formateo RFC 2047 / RFC 5322 de `FromEmailAddress`, envío de `SendEmailCommand`, registro de `MessageId` y mapeo de errores de AWS.

### Archivos a modificar
- [`functions/package.json`](file:///d:/Projects/Portfolio%20personal/Turnos-web/functions/package.json) y [`functions/package-lock.json`](file:///d:/Projects/Portfolio%20personal/Turnos-web/functions/package-lock.json)
  - Quitar `resend` (`^6.28.1`); agregar `@aws-sdk/client-sesv2`.
- [`functions/.env.example`](file:///d:/Projects/Portfolio%20personal/Turnos-web/functions/.env.example) y [`functions/.env`](file:///d:/Projects/Portfolio%20personal/Turnos-web/functions/.env)
  - Eliminar `RESEND_API_KEY` y `RESEND_FROM_EMAIL`.
  - Incorporar `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SES_FROM_EMAIL` y `SES_CONFIGURATION_SET` *(opcional)*.
- [`functions/src/emailService.ts`](file:///d:/Projects/Portfolio%20personal/Turnos-web/functions/src/emailService.ts)
  - Reemplazar cliente y despacho de Resend por `sesMailer.ts`.
  - Actualizar `buildTenantFromHeader` para usar el formato `"Nombre del Comercio" <noreply@turneado.app>` con codificación UTF-8 segura.
  - Actualizar logs (`[Resend]` → `[SES]`) registrando `messageId` y `errorCode`.
  - Exportar opcionalmente `clientMessageId` y `ownerMessageId` en `SendEmailsResult` (sin romper consumidores actuales).
- [`scripts/cli/core/env.mjs`](file:///d:/Projects/Portfolio%20personal/Turnos-web/scripts/cli/core/env.mjs)
  - Reemplazar auditoría de `RESEND_API_KEY` / `RESEND_FROM_EMAIL` en `auditEnvConfig` por auditoría de `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SES_FROM_EMAIL` y `SES_CONFIGURATION_SET`.
- [`tests/unit/functionsEmail.test.ts`](file:///d:/Projects/Portfolio%20personal/Turnos-web/tests/unit/functionsEmail.test.ts)
  - Reemplazar `RESEND_FROM_EMAIL` por `SES_FROM_EMAIL`, adaptar expectativas de `buildTenantFromHeader` (incluyendo tildes/`ñ`), y sumar tests unitarios de envío/errores con mock de `SESv2Client`.
- [`tests/unit/turnosCli.test.ts`](file:///d:/Projects/Portfolio%20personal/Turnos-web/tests/unit/turnosCli.test.ts)
  - Adaptar tests de `auditEnvConfig` y `formatEnvValueForDisplay` a variables AWS SES verificando no-exposición de `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY`.
- Documentación y referencias informativas:
  - [`README.md`](file:///d:/Projects/Portfolio%20personal/Turnos-web/README.md)
  - [`PRODUCT.md`](file:///d:/Projects/Portfolio%20personal/Turnos-web/PRODUCT.md)
  - [`artifacts/cli-and-gcloud-guide.md`](file:///d:/Projects/Portfolio%20personal/Turnos-web/artifacts/cli-and-gcloud-guide.md)
  - [`artifacts/manualtest.html`](file:///d:/Projects/Portfolio%20personal/Turnos-web/artifacts/manualtest.html)
  - [`artifacts/definitions/00-app-analysis-and-folder-architecture.md`](file:///d:/Projects/Portfolio%20personal/Turnos-web/artifacts/definitions/00-app-analysis-and-folder-architecture.md)
  - [`specs/07-operations-cli-reset-init-and-docs.md`](file:///d:/Projects/Portfolio%20personal/Turnos-web/specs/07-operations-cli-reset-init-and-docs.md)
  - [`artifacts/todo/secrets-and-credentials-hardening.md`](file:///d:/Projects/Portfolio%20personal/Turnos-web/artifacts/todo/secrets-and-credentials-hardening.md)
  - [`artifacts/todo/mercadopago-orders-api-migration.md`](file:///d:/Projects/Portfolio%20personal/Turnos-web/artifacts/todo/mercadopago-orders-api-migration.md)
  - [`artifacts/todo/recargo-turnos-badges-y-visibilidad.md`](file:///d:/Projects/Portfolio%20personal/Turnos-web/artifacts/todo/recargo-turnos-badges-y-visibilidad.md)

### Dependencias y código a eliminar
- Paquete `resend` en `functions/package.json` y `functions/package-lock.json`.
- Todo símbolo, variable y mensaje ligado a Resend (`Resend`, `cachedResendClient`, `getResendApiKey`, `getResendFromEmail`, `isResendConfigured`, `getResendClient`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL`, `onboarding@resend.dev`, `[Resend]`).

---

## 3. Metodología de Implementación

### 3.1 Capa de Transporte AWS SESv2 (`functions/src/sesMailer.ts`)

1. **Lectura y validación estricta de configuración:**
   - Variables leídas desde `process.env` (con `.trim()` para evitar saltos de línea o espacios accidentales):
     - `AWS_REGION` (requerida, formato válido tipo `us-east-1`, `sa-east-1`, sin placeholders).
     - `AWS_ACCESS_KEY_ID` (requerida, sin placeholders ni valores de ejemplo).
     - `AWS_SECRET_ACCESS_KEY` (requerida, sin placeholders ni valores de ejemplo).
     - `SES_FROM_EMAIL` (fallback seguro `'Turneado <noreply@turneado.app>'`; extraer dirección email validando `@` y dominio).
     - `SES_CONFIGURATION_SET` (opcional; si tiene valor no vacío, se adjunta como `ConfigurationSetName` en `SendEmailCommand`).
   - `isSesConfigured()`: retorna `true` únicamente si `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` y una dirección `SES_FROM_EMAIL` válida están presentes y libres de placeholders.

2. **Singleton `SESv2Client` con caché por configuración:**
   - Cachear la instancia `SESv2Client` indexada por un fingerprint no reversible (o comparación de `region + accessKeyId + hash(secretAccessKey)`) para evitar clientes obsoletos si cambian variables en tests o recargas en caliente.
   - Exportar `resetSesClientForTesting()` y permitir inyectar un `sendFn` de prueba (`setSesSenderForTesting`) para testear todos los flujos y errores AWS sin llamadas reales a red.

3. **Identidad multitenant centralizada y codificación UTF-8 (`formatSesFromHeader`):**
   - Extraer la dirección base verificada desde `SES_FROM_EMAIL` (ej. `noreply@turneado.app`).
   - Limpiar `businessName` eliminando saltos de línea (`\r`, `\n`), caracteres de control y comillas/ángulos inseguros (`<`, `>`), recortando a 60 caracteres.
   - Si el comercio no tiene nombre o equivale genéricamente a `'Turneado'`, mantener el `From` base (`"Turneado" <noreply@turneado.app>` o el configurado en `SES_FROM_EMAIL`).
   - Si el comercio tiene nombre propio:
     - **ASCII puro** (`/^[ -~]+$/`): formatear como `"Nombre del Comercio" <noreply@turneado.app>` escapando comillas dobles internas si existieran.
     - **Con caracteres UTF-8 no-ASCII** (tildes como `á, é, í, ó, ú`, `ñ`, diéresis o símbolos): codificar el Display Name como *encoded-word* **RFC 2047** (`=?UTF-8?B?${Buffer.from(cleanName, 'utf8').toString('base64')}?= <noreply@turneado.app>`), evitando rechazos `InvalidParameterValue` / `MessageRejected` de AWS SESv2 y garantizando visualización perfecta en Gmail y Outlook.

4. **Interfaz pública y comando `SendEmailCommand`:**
   ```ts
   export interface SesSendEmailParams {
     from: string;
     to: string[];
     replyTo?: string[];
     subject: string;
     html: string;
     text: string;
   }

   export interface SesSendEmailOutcome {
     ok: boolean;
     messageId?: string;
     errorCode?: string;
     errorMessage?: string;
   }

   export async function sendSesEmail(params: SesSendEmailParams): Promise<SesSendEmailOutcome>
   ```
   - Construye `new SendEmailCommand({ ... })` con:
     - `FromEmailAddress`: `params.from`
     - `Destination`: `{ ToAddresses: params.to }`
     - `ReplyToAddresses`: `params.replyTo` *(solo si el array filtrado no está vacío)*
     - `Content`:
       ```ts
       {
         Simple: {
           Subject: { Data: params.subject, Charset: 'UTF-8' },
           Body: {
             Html: { Data: params.html, Charset: 'UTF-8' },
             Text: { Data: params.text, Charset: 'UTF-8' },
           },
         },
       }
       ```
     - `ConfigurationSetName`: incluido únicamente cuando `SES_CONFIGURATION_SET` está definido.

5. **Manejo explícito de errores AWS SES:**
   - Capturar excepciones de `client.send(command)` inspeccionando `err.name` / `$metadata?.httpStatusCode`:
     - `MessageRejected` (dirección/contenido rechazado o cuenta limitada).
     - `MailFromDomainNotVerifiedException` (dominio o identidad no verificada en la región configurada).
     - `AccountSendingPausedException` / `SendingPausedException` (envío pausado en la cuenta/configuration set).
     - `TooManyRequestsException` / `LimitExceededException` (cuota o tasa superada — elegible para retry por cron).
     - `BadRequestException` / `InvalidParameterValue` (formato de email o header inválido).
     - `CredentialsProviderError` / errores de firma/región (`UnrecognizedClientException`, `InvalidSignatureException`).
   - Retornar siempre `{ ok: false, errorCode, errorMessage }` legible sin lanzar excepciones no controladas que aborten el webhook o `verifyPayment`.

---

### 3.2 Actualización del Servicio de Correos (`functions/src/emailService.ts`)

1. **Limpieza total de Resend:**
   - Remover `import type { Resend } from 'resend'`, `cachedResendClient`, `getResendApiKey`, `getResendFromEmail`, `isResendConfigured` y `getResendClient`.
   - Re-exportar o delegar en `sesMailer.ts`: `buildTenantFromHeader` llama a `formatSesFromHeader(businessName)`.
2. **Despacho en `sendBookingConfirmationEmails`:**
   - Validar al inicio `isSesConfigured()`. Si falta configuración o credenciales, registrar `logger.warn('[SES] ...')` y devolver `clientError` / `ownerError` descriptivos sin romper la confirmación del turno.
   - Mantener las firmas de entrada/salida y la ejecución en paralelo (`Promise.all([clientTask(), ownerTask()])`):
     - **Correo al cliente:** `from: buildTenantFromHeader(booking.businessName)`, `to: [cleanClientEmail]`, `replyTo` = `[cleanOwnerEmail]` si `isUsableEmail(cleanOwnerEmail)`, `subject: Turno confirmado · ${displayDate} (${displayTimeRange})`, `html: buildClientEmailHtml(booking)`, `text: buildClientEmailText(booking)`.
     - **Correo al comercio:** `from: buildTenantFromHeader(booking.businessName)`, `to: [cleanOwnerEmail]`, `replyTo` = `[cleanClientEmail]` si `isUsableEmail(cleanClientEmail)`, `subject: Nueva reserva: ${booking.clientName || 'Cliente'} · ${displayDate} (${displayTimeRange})`, `html: buildOwnerEmailHtml(booking)`, `text: buildOwnerEmailText(booking)`.
   - Al tener éxito, registrar `logger.info('[SES] Correo al cliente enviado.', { tenantId, slotId, messageId, recipient: maskEmail(...) })` (e ídem para el dueño).
   - En caso de fallo, registrar `logger.error('[SES] Error al enviar email ...', { tenantId, slotId, recipient: maskEmail(...), errorCode, errorMessage })` y guardar `result.clientError` / `result.ownerError` para persistencia en Firestore y reintento posterior en `retryPendingBookingEmails`.
   - *Idempotencia:* Se elimina el campo `idempotencyKey` (propio de Resend); la garantía anti-duplicados continúa intacta en las transacciones Firestore de `processPaymentConfirmation` (`emailStatus: 'processing'`, `clientEmailSent`, `ownerEmailSent`).
3. **Despacho en `sendPaymentIncidentAlertEmail`:**
   - Reemplazar el cliente Resend por `isSesConfigured()` + `sendSesEmail(...)`.
   - Mantener `from: buildTenantFromHeader(incident.businessName)`, `to: [cleanOwnerEmail]`, `replyTo: [cleanIncomingEmail]` (si es válido), `subject`, `html` y `text`.
   - Loguear `messageId` en éxito o `errorCode`/`errorMessage` en error con `[SES]`.

---

### 3.3 Variables de Entorno, CLI Operativa y CI

1. **`functions/.env.example` (y `functions/.env`):**
   - Reemplazar el bloque de Resend por:
     ```dotenv
     # Amazon SES (envío de correos transaccionales con @aws-sdk/client-sesv2)
     AWS_REGION=us-east-1
     AWS_ACCESS_KEY_ID=AKIA_TU_ACCESS_KEY_ID
     AWS_SECRET_ACCESS_KEY=tu_secret_access_key_aqui
     SES_FROM_EMAIL=Turneado <noreply@turneado.app>
     # Opcional: Configuration Set de SES para métricas/rebotes
     SES_CONFIGURATION_SET=
     ```
2. **`scripts/cli/core/env.mjs` (`auditEnvConfig`):**
   - Auditar `AWS_REGION` (error si falta o tiene placeholder), `AWS_ACCESS_KEY_ID` (warn/error si falta o usa ejemplo `AKIA_TU_...`), `AWS_SECRET_ACCESS_KEY` (warn/error si falta o usa ejemplo; siempre redactada con `maskSecretValue`), y `SES_FROM_EMAIL` (validar formato email con `extractEmailAddressFromFromHeader`, rechazar si no tiene `@`, advertir si quedó un dominio de prueba ajeno o no verificado, y confirmar ok con `noreply@turneado.app`).
   - Verificar opcionalmente `SES_CONFIGURATION_SET` (informativo `ok` si está configurado o omitido intencionalmente).
   - *Invariante de seguridad:* confirmar que `SENSITIVE_KEY_PATTERN` (`/(KEY|TOKEN|SECRET|PASSWORD|PASS|CREDENTIAL|PRIVATE)/i`) continúa enmascarando `AWS_ACCESS_KEY_ID` y `AWS_SECRET_ACCESS_KEY` tanto en `npm run ops:doctor` como en `formatEnvValueForDisplay`.
3. **CI (`.github/workflows/ci.yml`):**
   - Verificar compatibilidad sin cambios en el workflow: al copiar `functions/.env.example` a `functions/.env`, el job `lint-and-build` compilará `functions` con las nuevas variables declaradas.

---

### 3.4 Tests Unitarios y Documentación

1. **`tests/unit/functionsEmail.test.ts`:**
   - Actualizar setup/teardown de `RESEND_FROM_EMAIL` → `SES_FROM_EMAIL` (y limpiar `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SES_CONFIGURATION_SET` en `afterEach`).
   - Actualizar pruebas de `buildTenantFromHeader`:
     - Nombre ASCII (`'Estudio Linen'`) → `"Estudio Linen" <noreply@turneado.app>`.
     - Nombre genérico (`'Turneado'`) o vacío → `Turneado <noreply@turneado.app>`.
     - Nombre con tildes/`ñ` (`'Estética Sofía Núñez'`) → cabecera RFC 2047 `=?UTF-8?B?...?= <noreply@turneado.app>` decodificable exactamente al string original.
     - Sanitización de inyección CRLF (`\r\n`) y ángulos (`<`, `>`).
   - Agregar suite de despacho con mock de `SESv2Client` / `setSesSenderForTesting`:
     - `sendBookingConfirmationEmails` envía ambos correos en paralelo, devuelve `clientSent: true`, `ownerSent: true`, `clientMessageId`, `ownerMessageId`, aplica `ReplyToAddresses` inverso correcto, `Charset: 'UTF-8'` y `ConfigurationSetName` cuando existe.
     - Manejo ante `SES_FROM_EMAIL`/credenciales faltantes (retorna `clientSent: false`, `ownerSent: false`, no lanza excepción).
     - Manejo ante `MessageRejected` parcial (ej. falla cliente, éxito dueño → `clientSent: false`, `ownerSent: true`, `clientError` poblado).
     - `sendPaymentIncidentAlertEmail` con éxito y con rechazo.
   - Mantener intactos todos los tests de paletas, `shapePreset`, `buttonStyle`, sanitización XSS, `sanitizeEmailLogoUrl`, timezones y estados financieros.
2. **`tests/unit/turnosCli.test.ts`:**
   - Reemplazar variables Resend en tests de `formatEnvValueForDisplay` y `auditEnvConfig` por `AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` y `SES_FROM_EMAIL`, verificando que ningún secreto AWS aparezca serializado en la salida.
3. **Limpieza documental:**
   - Actualizar menciones técnicas de Resend → Amazon SES (`@aws-sdk/client-sesv2` + `turneado.app`) en `README.md`, `PRODUCT.md`, `artifacts/cli-and-gcloud-guide.md`, `artifacts/manualtest.html`, `artifacts/definitions/00-app-analysis-and-folder-architecture.md`, `specs/07-operations-cli-reset-init-and-docs.md` y los TODOs de `artifacts/todo/`.

---

## 4. Estados Válidos e Invariantes

- **Invariante de cero convivencia:** No existe importación a `resend`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` ni rama condicional de fallback en todo el repositorio.
- **Invariante de fidelidad visual y multitenant:** Los HTML y plain-text generados por `buildClientEmailHtml`, `buildOwnerEmailHtml`, `buildPaymentIncidentEmailHtml` y sus equivalentes `Text` conservan exactamente la misma estructura, estilos inline, logos HTTPS sanitizados y `resolveEmailThemeForAppearance` por comercio.
- **Invariante de identidad y entregabilidad (`turneado.app`):** Todo correo saliente utiliza como dirección real del remitente la identidad verificada (`noreply@turneado.app`), con Display Name dinámico por comercio codificado en RFC 2047 cuando contiene UTF-8 no-ASCII, y `ReplyToAddresses` apuntando dinámicamente al comercio (en mails al cliente) o al cliente (en mails/alertas al comercio).
- **Invariante de no-regresión en pagos y crons:** Un fallo o rechazo de SES (`MessageRejected`, throttling o credenciales inválidas) **nunca** revierte un turno ya confirmado en Firestore; persiste `emailStatus: 'failed' | 'partial'`, registra `errorCode` + email enmascarado y permite el reintento automático vía `retryPendingBookingEmails`.
- **Invariante de no-exposición de secretos:** `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` y emails completos nunca aparecen en logs (`logger.*`), salidas de `npm run ops:doctor` ni tests.

---

## 5. Comprobaciones y Criterios de Aceptación

1. **Verificación de código limpio (sin residuos de Resend):**
   - Búsqueda en `src/`, `functions/`, `scripts/`, `tests/` y documentación por `resend`, `RESEND_API_KEY`, `RESEND_FROM_EMAIL` → **0 coincidencias** en código, dependencias y configuración.
2. **Validación estática, build y tests:**
   - `npm --prefix functions run build` → código `0`.
   - `npm run lint` → código `0`.
   - `npm run build` → código `0`.
   - `npm test` → 100% de suites unitarias en verde (incluyendo tests de `sesMailer`, `emailService` y `turnosCli`).
   - `npm run ops:doctor -- --skip-connectivity` → valida correctamente variables SES sin exponer secretos.
3. **Prueba real E2E en despliegue / staging (`turneado.app`):**
   - Configurar un comercio de prueba con nombre con tilde/`ñ` (ej. `"Estética Sofía Núñez"`), `email` propio del dueño, logo PNG/WEBP HTTPS y preset distinto al default (`sage-botanical` o `ocean-slate` + `pill`).
   - Completar un pago de seña de prueba en Mercado Pago.
   - Confirmar en logs de Firebase Functions la presencia de `[SES] Correo al cliente enviado.` y `[SES] Correo al negocio enviado.`, ambos con su respectivo `messageId`, y en Firestore `emailStatus: 'sent'`, `clientEmailSent: true`, `ownerEmailSent: true`.
4. **Validación en clientes reales (Gmail y Outlook):**
   - **Remitente (`From`):** se visualiza `"Estética Sofía Núñez" <noreply@turneado.app>` con tildes y `ñ` intactas.
   - **Asunto (`Subject`):** codificación UTF-8 limpia sin caracteres corruptos.
   - **`Reply-To`:** responder el correo del cliente pre-completa el email del comercio; responder el correo del comercio pre-completa el email del cliente.
   - **Diseño y tema:** colores, fondo, tipografía, botones, radios y logo del tenant idénticos al diseño previo en Gmail (web/móvil) y Outlook.
   - **Headers de autenticación ("Mostrar original" / Origen del mensaje):** `SPF = PASS`, `DKIM = PASS` (`d=turneado.app`), `DMARC = PASS`.
