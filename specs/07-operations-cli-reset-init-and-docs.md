# 07 — CLI Operativa Unificada (`reset`, `init`, `doctor`, `tenant`, `backup`) y Guía de Google Cloud CLI

## 1. Objetivos y Alcance

### Problema que resuelve
Una vez operativa la plataforma **Turneado** en arquitectura SaaS Multi-Tenant sobre Firebase (Auth, Firestore, Cloud Storage y Cloud Functions v2), las tareas administrativas críticas de ciclo de vida del entorno —devolver el proyecto a un estado 100% limpio sin demo ni tenants, ejecutar una configuración inicial reproducible desde cero, diagnosticar credenciales/variables, eliminar permanentemente un tenant puntual o exportar respaldos previos— carecen hoy de una herramienta unificada y segura. El repositorio solo dispone de `scripts/bootstrap-platform-admin.mjs` para promover `platformAdmin`.

Además, operar con `firebase-admin` contra producción requiere credenciales privilegiadas de Google Cloud (Application Default Credentials vía `gcloud` o Service Account JSON), por lo que se necesita una guía clara en `/artifacts` que documente todos los scripts del proyecto, las definiciones disponibles y el paso a paso completo para instalar **Google Cloud CLI (`gcloud`)** y autenticarse correctamente.

### Qué incluye esta fase
- **CLI interna unificada sin dependencias externas** (`scripts/turneado-cli.mjs` + módulos bajo `scripts/cli/`), reutilizando `firebase-admin` desde `functions/node_modules/` (mismo patrón ya probado en `scripts/bootstrap-platform-admin.mjs`) y APIs nativas de Node.js (`node:util`, `node:readline/promises`).
- **Subcomandos operativos:**
  - `doctor`: diagnóstico de entorno, credenciales Admin SDK, bucket de Storage, `.firebaserc`, `.env` y `functions/.env` (detectando errores como `SES_FROM_EMAIL` sin `@`, `AWS_REGION` inválida o placeholders, sin imprimir secretos).
  - `reset`: borrado total controlado de Firestore (todas las colecciones/subcolecciones en orden seguro anti-triggers), Cloud Storage (`/tenants/**` y residuos raíz) y Firebase Auth (preservando SuperAdmin por defecto con `--keep-superadmin`, o purga total con `--wipe-auth-all`), protegido por `--dry-run`, `--confirm-project <id>` y confirmación interactiva.
  - `init`: configuración inicial limpia (preflight + creación/promoción de SuperAdmin `platformAdmin: true` + flag opcional `--with-demo` para sembrar atómicamente `/demo` con servicios y turnos de muestra).
  - `admin`: `promote` y `revoke` de `platformAdmin` (manteniendo `scripts/bootstrap-platform-admin.mjs` y `npm run admin:bootstrap` 100% compatibles hacia atrás).
  - `tenant`: `list`, `inspect <slug|tenantId>` y `delete <slug|tenantId>` (eliminación completa de un solo negocio: subcolecciones Firestore, `/tenant_slugs/*`, objetos de Storage `/tenants/{tenantId}/**` y limpieza de claims en miembros).
  - `backup`: `export` para guardar un snapshot JSON local en `backups/` antes de ejecutar operaciones destructivas.
- **Soporte transversal `--emulator`:** permite ejecutar y probar cualquier subcomando contra Firebase Emulator Suite (`127.0.0.1:9099`, `8080`, `9199`) sin riesgo sobre producción.
- **Documentación operativa en `/artifacts`:** archivo `artifacts/cli-and-gcloud-guide.md` con inventario completo de todos los scripts del proyecto (`package.json`, `functions/package.json`, CLI y artefactos), índice de definiciones en `artifacts/definitions/` y tutorial detallado para instalar **Google Cloud CLI (`gcloud`)**, configurar ADC (`gcloud auth application-default login`), verificar proyecto/permisos IAM y usar la alternativa de Service Account.
- **Tests unitarios y de integración con Firebase Emulators** cubriendo argumentos, validaciones, `reset`, `init`, `tenant delete` y `backup export`.

### Qué queda explícitamente fuera de alcance
- Modificación automática de infraestructura desplegada (`firestore.rules`, `storage.rules`, índices de Firestore, Cloud Functions desplegadas, Firebase Hosting o DNS/SSL del dominio personalizado).
- Gestión de configuraciones en servicios externos (aplicaciones/webhooks en Mercado Pago Developers o identidades/credenciales IAM en Amazon SES).
- Restauración automática (`backup import`) desde snapshots JSON (puede agregarse como subcomando futuro si se requiere).
- Publicación de la CLI como paquete externo en npm.

---

## 2. Archivos y Recursos Afectados

### Archivos a crear
- `scripts/turneado-cli.mjs` — entry point ejecutable (`#!/usr/bin/env node`) con router de subcomandos, ayuda contextual (`--help`) y manejo uniforme de errores/códigos de salida.
- `scripts/cli/core/firebase.mjs` — resolución de `firebase-admin` (raíz o `functions/package.json`), resolución de `projectId` y `storageBucket`, inicialización segura con ADC / Service Account / `--emulator` y limpieza de instancia.
- `scripts/cli/core/env.mjs` — lectura segura de `.firebaserc`, `.env` y `functions/.env`, redacción de secretos y validaciones de formato (`AWS_REGION`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `SES_FROM_EMAIL`, `CLIENT_APP_URL`, `MP_WEBHOOK_URL`, `VITE_FIREBASE_*`).
- `scripts/cli/core/prompt.mjs` — helpers de confirmación interactiva (`node:readline/promises`), formateo de tablas y salida ANSI limpia.
- `scripts/cli/commands/doctor.mjs` — diagnóstico integral de entorno y conectividad Admin SDK.
- `scripts/cli/commands/reset.mjs` — purga completa trigger-safe de Firestore, Storage y Auth con `--dry-run`, `--confirm-project`, `--keep-superadmin` / `--wipe-auth-all` y doble verificación post-borrado.
- `scripts/cli/commands/init.mjs` — inicialización limpia de plataforma (SuperAdmin) y seed opcional de `/demo` (`--with-demo`).
- `scripts/cli/commands/admin.mjs` — `promote` y `revoke` de `platformAdmin` reutilizando la lógica de `mergePlatformAdminClaims`.
- `scripts/cli/commands/tenant.mjs` — `list`, `inspect` y `delete` de un tenant específico (Firestore + Storage + Auth claims).
- `scripts/cli/commands/backup.mjs` — `export` de respaldo JSON estructurado en `backups/` (ignorado por Git).
- `artifacts/cli-and-gcloud-guide.md` — guía completa con:
  1. Inventario y explicación de todos los scripts del proyecto (raíz, `functions/`, CLI y generador de artefactos).
  2. Índice y propósito de todos los archivos de definición y QA en `/artifacts`.
  3. Tutorial paso a paso para instalar Google Cloud CLI (`gcloud`) en Windows (PowerShell / instalador oficial), macOS y Linux, iniciar sesión con `gcloud auth login` y `gcloud auth application-default login`, seleccionar el proyecto `turnos-web-eb8b5`, verificar permisos IAM y configurar la alternativa de Service Account (`GOOGLE_APPLICATION_CREDENTIALS`).
- `tests/unit/turnosCli.test.ts` — tests unitarios de parsing de argumentos, guardrails de confirmación (`reset`), validaciones de `doctor`, construcción del seed demo y redacción de secretos.
- `tests/integration/turnosCli.test.ts` — tests de integración ejecutando `reset`, `init`, `init --with-demo`, `tenant delete` y `backup export` contra Auth, Firestore, Storage y Functions Emulators.

### Archivos a modificar
- `scripts/bootstrap-platform-admin.mjs` — mantener su API exportada (`parseCliArgs`, `mergePlatformAdminClaims`, `bootstrapPlatformAdmin`, `readDefaultProjectId`) 100% intacta y delegar/compartir helpers con `scripts/cli/core/` sin romper `tests/unit/superadminService.test.ts` ni `npm run admin:bootstrap`.
- `package.json` — agregar scripts operativos:
  - `"cli": "node scripts/turneado-cli.mjs"`
  - `"ops:doctor": "node scripts/turneado-cli.mjs doctor"`
  - `"ops:reset": "node scripts/turneado-cli.mjs reset"`
  - `"ops:init": "node scripts/turneado-cli.mjs init"`
- `.gitignore` — agregar `backups/` para evitar que snapshots con PII o datos de tenants puedan commitearse accidentalmente.

---

## 3. Metodología de Implementación

### 3.1 Núcleo Compartido sin Dependencias (`scripts/cli/core/`)
1. **Resolución de `firebase-admin` (`firebase.mjs`):**
   - Usa `createRequire` buscando primero en raíz y luego en `functions/package.json` (cero nuevas dependencias en `package.json` raíz).
   - Detecta `--emulator`: configura automáticamente `FIREBASE_AUTH_EMULATOR_HOST=127.0.0.1:9099`, `FIRESTORE_EMULATOR_HOST=127.0.0.1:8080` y `FIREBASE_STORAGE_EMULATOR_HOST=127.0.0.1:9199` (si no estaban definidas) y omite `applicationDefault()` en modo emulador.
   - Resuelve `projectId` por prioridad: flag `--project` $\to$ env (`FIREBASE_PROJECT_ID` / `GCLOUD_PROJECT` / `GOOGLE_CLOUD_PROJECT` / `VITE_FIREBASE_PROJECT_ID`) $\to$ `.firebaserc` (`projects.default`).
   - Resuelve `storageBucket` por prioridad: flag `--bucket` $\to$ `VITE_FIREBASE_STORAGE_BUCKET` en env/`.env` $\to$ `${projectId}.firebasestorage.app`.
2. **Validación de entorno y redacción (`env.mjs`):**
   - Parsea `.env` y `functions/.env` en memoria sin mutar archivos y enmascara automáticamente cualquier clave sensible (`API_KEY`, `TOKEN`, `SECRET`) al mostrar diagnósticos.

### 3.2 Comando `reset` — Purga Completa Trigger-Safe (`commands/reset.mjs`)
1. **Flags soportados:**
   - `--dry-run` (solo audita y reporta conteos sin borrar nada).
   - `--confirm-project <projectId>` (obligatorio para ejecutar borrado real).
   - `--keep-superadmin` *(default: true)* / `--keep-email <correo>` (preserva cuentas `platformAdmin` y limpia únicamente su mapa `tenants` en Custom Claims).
   - `--wipe-auth-all` (elimina el 100% de las cuentas de Firebase Auth, incluyendo `platformAdmin`).
   - `--skip-storage` / `--skip-auth` (opcionales para limpiezas parciales controladas).
   - `--yes` (salta el prompt interactivo solo si `--confirm-project` coincide exactamente con el proyecto objetivo).
   - `--emulator` y `--project <id>`.
2. **Pre-auditoría obligatoria antes de borrar:**
   - Cuenta documentos en `/tenants`, `/tenant_slugs`, colecciones raíz adicionales, cantidad de archivos en el bucket de Storage y usuarios de Auth (desglosando cuántos se eliminan y cuántos se preservan).
   - Imprime el resumen y solicita confirmación escrita exacta (`RESET <projectId>`) salvo que se pase `--dry-run` o `--yes`.
3. **Orden estricto de borrado anti-triggers (evita recreación de docs fantasma por Cloud Functions):**
   - **Paso 1 — Documentos padre `/tenants/{tenantId}`:** eliminar primero cada documento raíz `tenants/{tenantId}` (sin eliminar aún subcolecciones) para que `onTenantOwnerInfoWritten` devuelva `skipped` y no vuelva a poblar `/tenant_slugs/{slug}`.
   - **Paso 2 — Subcolecciones `slots`:** eliminar `/tenants/{tenantId}/slots` antes que `public_meta` para que `syncPublicSlot` no recree `public_meta/availability`.
   - **Paso 3 — Resto de subcolecciones y colecciones raíz:** ejecutar `db.recursiveDelete(...)` sobre `/tenants` (eliminando `members`, `ownerinfo`, `services`, `portfolio`, `public_meta`, `private_config`, `payment_attempts`, `payment_incidents`), sobre `/tenant_slugs` y sobre cualquier otra colección raíz listada por `db.listCollections()`.
   - **Paso 4 — Cloud Storage:** listar y eliminar todos los objetos del bucket (`bucket.deleteFiles({ force: true })` con manejo de bucket vacío).
   - **Paso 5 — Firebase Auth:** listar usuarios paginados (`listUsers(1000)`).
     - En modo `--wipe-auth-all`: borrar en lotes de hasta 1000 UIDs (`auth.deleteUsers(batch)`).
     - En modo `--keep-superadmin`: borrar los usuarios no preservados y limpiar `tenants` de los Custom Claims de los usuarios preservados (`{ platformAdmin: true }`).
   - **Paso 6 — Segunda pasada de verificación:** aguardar brevemente (`1500 ms` fuera de emulador o `500 ms` en emulador), re-inspeccionar `db.listCollections()` y eliminar cualquier documento residual generado por un trigger en vuelo.

### 3.3 Comando `init` — Configuración Inicial Reproducible (`commands/init.mjs`)
1. **Flags soportados:**
   - `--admin-email <correo>` (obligatorio o solicitado interactivamente).
   - `--admin-password <clave>` (requerida ≥ 8 caracteres solo si el usuario no existe aún en Firebase Auth).
   - `--with-demo` (opcional; desactivado por defecto para permitir inicialización 100% limpia sin demo).
   - `--demo-slug <slug>` (default: `demo`), `--demo-name <nombre>` (default: `Estudio Demo`).
   - `--timezone <iana>` (default: `America/Argentina/Buenos_Aires`).
   - `--emulator` y `--project <id>`.
2. **Secuencia de ejecución idempotente:**
   - Ejecuta validaciones clave de `doctor` (bloquea si no hay conectividad con Auth/Firestore).
   - Busca `--admin-email` en Auth; si no existe, lo crea con `--admin-password` y `emailVerified: true`; luego asigna `{ ...existingClaims, platformAdmin: true }`.
   - Si se indicó `--with-demo`:
     - Si `/tenants/tnt_demo` ya existe, reporta que ya está creado sin sobrescribir ni duplicar (idempotente).
     - Si no existe, crea en una transacción atómica los 5 documentos base (`/tenants/tnt_demo`, `/tenants/tnt_demo/ownerinfo/profile`, `/tenants/tnt_demo/public_meta/availability`, `/tenants/tnt_demo/members/{uid}`, `/tenant_slugs/demo`) con `isDemo: true`, `mpConfigured: true`, y siembra 3 servicios de ejemplo con adicionales + turnos futuros disponibles (próximos 3 días hábiles), actualizando `public_meta/availability` y los Custom Claims del dueño (`tenants.tnt_demo = 'owner'`).
   - Imprime resumen final con las rutas listas (`/superadmin/login` y, si corresponde, `/demo` y `/demo/admin`).

### 3.4 Comandos Operativos Complementarios (`doctor`, `admin`, `tenant`, `backup`)
1. **`doctor`:** verifica Node.js, carga de `firebase-admin`, `.firebaserc`, `.env`, `functions/.env` (alertando si `SES_FROM_EMAIL` no tiene `@`, si `AWS_REGION` es inválida, si `MP_WEBHOOK_URL` contiene `tu-proyecto-id` o si `CLIENT_APP_URL` apunta a `localhost`), conectividad real contra Auth, Firestore y existencia del bucket de Storage.
2. **`admin promote|revoke`:** envuelve la lógica de `bootstrap-platform-admin.mjs` aceptando `--email` o `--uid`.
3. **`tenant list|inspect|delete`:**
   - `list`: tabla en consola con `tenantId`, `slug`, `status`, `isDemo`, `mpConfigured` y `createdAt`.
   - `inspect <slug|tenantId>`: muestra documento del tenant, bootstrap `/tenant_slugs/{slug}`, conteo de servicios, portfolio, turnos por estado, miembros y estado de integraciones (enmascarado, nunca muestra tokens en claro).
   - `delete <slug|tenantId> --confirm <slug|tenantId>`: elimina de forma segura un único tenant (Firestore subcolecciones + documento padre + `/tenant_slugs/*` donde `tenantId` coincida + archivos en Storage bajo `tenants/{tenantId}/` + remoción del `tenantId` en Custom Claims de sus miembros).
4. **`backup export [--out <ruta>]`:** exporta en `backups/backup-<projectId>-<timestamp>.json` todos los documentos de `/tenant_slugs` y `/tenants/{id}` con sus subcolecciones públicas y operativas, **excluyendo por defecto `private_config/integrations`** (secretos MP) salvo que se pase explícitamente `--include-secrets` con advertencia de seguridad.

### 3.5 Documento de Referencia y Tutorial (`artifacts/cli-and-gcloud-guide.md`)
Estructura obligatoria del archivo:
1. **Mapa completo de scripts del repositorio:**
   - Scripts de raíz (`package.json`): desarrollo, compilación, lint, tests unitarios/integración, artefactos y CLI operativa.
   - Scripts de `functions/package.json`: build, serve, deploy, logs.
   - Referencia rápida de todos los subcomandos y flags de `npm run cli -- ...` con ejemplos de uso seguro (emulador vs. producción).
2. **Catálogo de archivos y definiciones en `/artifacts`:**
   - Tabla de `artifacts/definitions/00..05`, `artifacts/src/`, `artifacts/manualtest.html`, `artifacts/todo/` y salidas en `public/artifacts/`.
3. **Tutorial completo de Google Cloud CLI (`gcloud`) y autenticación:**
   - Qué es ADC (*Application Default Credentials*) y por qué es más seguro que descargar llaves JSON.
   - Instalación paso a paso en **Windows** (`winget install Google.CloudSDK` / instalador oficial), **macOS** (`brew install --cask google-cloud-sdk`) y **Linux**.
   - Inicialización y login:
     1. `gcloud auth login`
     2. `gcloud config set project turnos-web-eb8b5`
     3. `gcloud auth application-default login`
     4. `gcloud auth application-default set-quota-project turnos-web-eb8b5`
   - Verificación de permisos IAM necesarios (`roles/owner` o combinación `Firebase Admin` + `Cloud Datastore User` + `Storage Admin`) y prueba inmediata con `npm run cli -- doctor`.
   - **Alternativa con Service Account JSON** (`GOOGLE_APPLICATION_CREDENTIALS`) para entornos sin `gcloud`, incluyendo advertencias de seguridad (guardar fuera del repo, nunca commitear, rotación de clave).
   - **Resolución de errores comunes** (`Could not load the default credentials`, `PERMISSION_DENIED`, `quota project not set`, `bucket not found`, uso con emuladores locales).

---

## 4. Estados Válidos e Invariantes

- **Invariante Anti-Borrado Accidental:** `reset` y `tenant delete` **nunca** modifican ni eliminan datos sin `--confirm-project <projectId>` (o `--confirm <tenant>`) coincidente con el destino real, y `--dry-run` garantiza 0 escrituras/borrados.
- **Invariante de Convergencia Limpia (Trigger-Safe):** Tras finalizar `reset` (incluso con Cloud Functions desplegadas o corriendo en Functions Emulator), `db.listCollections()` queda vacío, el bucket de Storage queda sin objetos bajo `tenants/` y ningún usuario preservado conserva entradas huérfanas en `customClaims.tenants`.
- **Invariante de Idempotencia de `init`:** Ejecutar `init` (con o sin `--with-demo`) dos veces consecutivas sobre el mismo entorno no genera usuarios duplicados, ni tenants duplicados, ni sobrescribe datos ya creados.
- **Invariante de No-Exposición de Secretos:** Ningún comando (`doctor`, `tenant inspect`, `backup export` por defecto) imprime `MP_ACCESS_TOKEN`, `MP_WEBHOOK_SECRET`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY` ni contraseñas en stdout/stderr ni en archivos JSON de backup.
- **Invariante de Retrocompatibilidad:** `npm run admin:bootstrap -- --email ...` y las exportaciones de `scripts/bootstrap-platform-admin.mjs` siguen funcionando exactamente igual que en Fase 5, manteniendo `tests/unit/superadminService.test.ts` en verde sin modificarlo.

---

## 5. Comprobaciones y Criterios de Aceptación

1. **Calidad Estática y Compilación:**
   - `npm run lint` $\to$ código `0`.
   - `npm run build` y `npm --prefix functions run build` $\to$ código `0`.
2. **Tests Unitarios (`npm test`, incluyendo `tests/unit/turnosCli.test.ts`):**
   - Parsing de todos los subcomandos y flags (`doctor`, `reset`, `init`, `admin`, `tenant`, `backup`).
   - Rechazo inmediato de `reset` sin `--confirm-project` coincidente.
   - Detección en `doctor` de `SES_FROM_EMAIL` inválido (sin `@`), `AWS_REGION` ausente, `MP_WEBHOOK_URL` placeholder y redacción garantizada de secretos.
   - Retrocompatibilidad intacta de `tests/unit/superadminService.test.ts` (imports desde `scripts/bootstrap-platform-admin.mjs`).
3. **Tests de Integración con Firebase Emulators (`npm run test:integration`, incluyendo `tests/integration/turnosCli.test.ts`):**
   - Sembrar múltiples tenants (con slots, servicios, portfolio, miembros, slugs, alias `redirectToSlug`, objetos en Storage y usuarios en Auth).
   - Ejecutar `backup export --emulator` y verificar JSON válido sin `private_config/integrations`.
   - Ejecutar `tenant delete <tenantA> --emulator` y verificar que `tenantA` desaparece de Firestore, `/tenant_slugs`, Storage y claims de su dueño, mientras `tenantB` queda 100% intacto.
   - Ejecutar `reset --dry-run --emulator` y verificar que no borra ningún dato.
   - Ejecutar `reset --confirm-project <id> --yes --emulator` (con `--keep-superadmin`) y verificar: Firestore vacío tras convergencia de triggers, Storage vacío, usuarios no-superadmin eliminados y SuperAdmin preservado con `platformAdmin: true` y `tenants` limpio.
   - Ejecutar `reset --confirm-project <id> --wipe-auth-all --yes --emulator` y verificar 0 usuarios en Auth.
   - Ejecutar `init --admin-email ... --admin-password ... --emulator` (modo sin demo) y verificar SuperAdmin creado + Firestore sin tenants.
   - Ejecutar `init --admin-email ... --with-demo --emulator` y verificar creación atómica de `/demo` con servicios y turnos disponibles, más idempotencia al re-ejecutar.
4. **Verificación de Documentación:**
   - `artifacts/cli-and-gcloud-guide.md` lista todos los scripts reales de `package.json`, `functions/package.json` y `scripts/turneado-cli.mjs`, todas las definiciones de `artifacts/definitions/` y el tutorial completo paso a paso de instalación y login en `gcloud`.
