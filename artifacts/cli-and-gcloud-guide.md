# Guía Operativa: Scripts, Artefactos, CLI Unificada y Google Cloud CLI (`gcloud`)

Esta guía reúne en un solo lugar el inventario completo de scripts del proyecto **Turneado**, el catálogo de definiciones y archivos en `/artifacts`, la referencia operativa de la CLI unificada (`scripts/turneado-cli.mjs`) y el tutorial paso a paso para instalar y autenticar **Google Cloud CLI (`gcloud`)** con *Application Default Credentials (ADC)* o mediante *Service Account*.

---

## 1. Inventario Completo de Scripts del Repositorio

### 1.1 Scripts raíz (`package.json`)

| Script | Comando real | Propósito |
| --- | --- | --- |
| `npm run dev` | `vite` | Levanta el servidor de desarrollo frontend (Vite + HMR) en `http://localhost:5173` apuntando al proyecto de `.env`. |
| `npm run dev:local` | `node scripts/dev-local.mjs` | Entorno local todo-en-uno: compila `functions`, levanta Firebase Emulators con persistencia en `.firebase/emulator-data`, siembra SuperAdmin + `/demo` y arranca Vite en modo emulador. |
| `npm run dev:emulator` | `vite --mode emulator` | Levanta únicamente Vite apuntando a los Firebase Emulators locales (usa `.env.emulator`). |
| `npm run emulators:start` | `npm --prefix functions run build && firebase emulators:start --only auth,firestore,storage,functions --import=.firebase/emulator-data --export-on-exit=.firebase/emulator-data` | Compila Cloud Functions e inicia Auth (`9099`), Firestore (`8080`), Storage (`9199`), Functions (`5001`) y Emulator UI (`4000`) con persistencia local. |
| `npm run emulators:seed` | `node scripts/turneado-cli.mjs init --admin-email admin@local.test --admin-password LocalAdmin123! --with-demo --emulator` | Siembra de forma idempotente el SuperAdmin local y el negocio `/demo` en los emuladores activos. |
| `npm run build` | `tsc -b && vite build` | Verifica tipos TypeScript y genera el bundle de producción en `dist/`. |
| `npm run preview` | `vite preview` | Sirve localmente el bundle ya compilado en `dist/`. |
| `npm run lint` | `eslint .` | Ejecuta ESLint sobre todo el código TypeScript/React (`**/*.{ts,tsx}`). |
| `npm test` | `vitest run tests/unit` | Corre la suite de tests unitarios (rápidos, sin emuladores). |
| `npm run test:integration` | `npm --prefix functions run build && firebase emulators:exec --only auth,firestore,storage,functions "npm run test:integration:run"` | Compila Cloud Functions, levanta Firebase Emulator Suite y ejecuta todos los tests de integración. |
| `npm run test:integration:run` | `vitest run --config tests/vitest.integration.config.ts` | Ejecuta los tests de integración asumiendo que los emuladores ya están corriendo. |
| `npm run cli -- <cmd>` | `node scripts/turneado-cli.mjs` | Punto de entrada principal de la **CLI operativa unificada** (`doctor`, `reset`, `init`, `admin`, `tenant`, `backup`). |
| `npm run ops:doctor` | `node scripts/turneado-cli.mjs doctor` | Atajo directo para auditar entorno, `.env`, credenciales y conectividad Firebase. |
| `npm run ops:reset` | `node scripts/turneado-cli.mjs reset` | Atajo directo para el comando de purga completa controlada. |
| `npm run ops:init` | `node scripts/turneado-cli.mjs init` | Atajo directo para la inicialización limpia de la plataforma (SuperAdmin y demo opcional). |
| `npm run holidays:sync` | `node scripts/sync-holidays.mjs` | Sincroniza el catálogo local de feriados nacionales en `src/data/holidays.json`. |
| `npm run admin:bootstrap` | `node scripts/bootstrap-platform-admin.mjs` | Script legacy retrocompatible para asignar o revocar el claim `platformAdmin`. |
| `npm run artifacts:build` | `node artifacts/src/build.mjs` | Regenera todos los artefactos comerciales (tarjetas + dossier PDF + PNGs) en `public/artifacts/`. |
| `npm run artifacts:cards` | `node artifacts/src/build.mjs --only=cards` | Regenera únicamente las tarjetas de presentación (`business-cards/`). |
| `npm run artifacts:pdf` | `node artifacts/src/build.mjs --only=pdf` | Regenera únicamente el dossier comercial A4 en PDF y capturas PNG. |

### 1.2 Scripts de Cloud Functions (`functions/package.json`)

Se invocan con `npm --prefix functions run <script>` desde la raíz (o `npm run <script>` dentro de `functions/`).

| Script | Comando real | Propósito |
| --- | --- | --- |
| `build` | `tsc` | Compila `functions/src/*.ts` a `functions/lib/` (Node 24). |
| `serve` | `npm run build && firebase emulators:start --only functions` | Compila e inicia el emulador local de Cloud Functions. |
| `shell` / `start` | `npm run build && firebase functions:shell` | Abre consola interactiva para invocar Cloud Functions localmente. |
| `deploy` | `firebase deploy --only functions` | Despliega únicamente las Cloud Functions al proyecto activo en `.firebaserc`. |
| `logs` | `firebase functions:log` | Muestra los logs remotos recientes de Cloud Functions. |

### 1.3 Referencia de la CLI Unificada (`scripts/turneado-cli.mjs`)

> **Regla de oro:** En npm, los flags destinados a la CLI siempre van **después de `--`** (por ejemplo: `npm run cli -- doctor --emulator`).

#### Flags transversales (disponibles en todos los comandos)
- `--emulator`: apunta a los Firebase Emulators locales (`Auth: 127.0.0.1:9099`, `Firestore: 127.0.0.1:8080`, `Storage: 127.0.0.1:9199`) sin necesitar credenciales de Google Cloud.
- `--project <projectId>` / `-p <projectId>`: sobrescribe el proyecto por defecto leído desde `.firebaserc` (`turnos-web-eb8b5`).
- `--bucket <nombre>`: sobrescribe el bucket de Cloud Storage (default: `VITE_FIREBASE_STORAGE_BUCKET` o `<projectId>.firebasestorage.app`).
- `--help` / `-h`: muestra la ayuda del comando.

#### Subcomandos y ejemplos seguros

| Comando | Descripción | Ejemplo en Emulador | Ejemplo en Producción |
| --- | --- | --- | --- |
| `doctor` | Audita Node.js, `.env`, `functions/.env` (detecta `SES_FROM_EMAIL` sin `@`, `AWS_REGION` inválida, placeholders, `localhost`), credenciales ADC y conectividad real a Auth/Firestore/Storage. | `npm run cli -- doctor --emulator` | `npm run cli -- doctor` |
| `backup export` | Exporta un respaldo JSON en `backups/backup-<project>-<ts>.json`. **Excluye `private_config/integrations` por defecto** para no volcar tokens de Mercado Pago (solo se incluye si pasás `--include-secrets`). | `npm run cli -- backup export --emulator` | `npm run cli -- backup export` |
| `reset` | Purga completa en orden seguro anti-triggers de Firestore, Cloud Storage y Firebase Auth. Preserva SuperAdmins por defecto (`--keep-superadmin`) limpiando su mapa `tenants`. Requiere `--confirm-project <id>` + frase interactiva `RESET <id>` (salvo `--yes`). | `npm run cli -- reset --dry-run --emulator`<br>`npm run cli -- reset --confirm-project turnos-web-eb8b5 --yes --emulator` | `npm run cli -- reset --dry-run`<br>`npm run cli -- reset --confirm-project turnos-web-eb8b5` |
| `reset --wipe-auth-all` | Igual que `reset`, pero borra el **100%** de usuarios de Firebase Auth incluyendo cuentas `platformAdmin`. | `npm run cli -- reset --confirm-project turnos-web-eb8b5 --wipe-auth-all --yes --emulator` | `npm run cli -- reset --confirm-project turnos-web-eb8b5 --wipe-auth-all` |
| `init` | Configuración inicial idempotente: crea o promueve al SuperAdmin (`platformAdmin: true`) sin crear negocios (entorno limpio). | `npm run cli -- init --admin-email admin@turneado.app --admin-password ClaveSegura123 --emulator` | `npm run cli -- init --admin-email admin@turneado.app` |
| `init --with-demo` | Igual que `init`, pero además siembra atómicamente `/demo` (`tnt_demo`) con 3 servicios de ejemplo y 9 turnos futuros disponibles. | `npm run cli -- init --admin-email admin@turneado.app --admin-password ClaveSegura123 --with-demo --emulator` | `npm run cli -- init --admin-email admin@turneado.app --with-demo` |
| `admin promote` | Asigna `platformAdmin: true` preservando el resto de los claims del usuario. | `npm run cli -- admin promote --email admin@turneado.app --emulator` | `npm run cli -- admin promote --email admin@turneado.app` |
| `admin revoke` | Revoca `platformAdmin: false` preservando el mapa `tenants`. | `npm run cli -- admin revoke --email admin@turneado.app --emulator` | `npm run cli -- admin revoke --email admin@turneado.app` |
| `tenant list` | Lista todos los negocios en `/tenants` en formato tabla. | `npm run cli -- tenant list --emulator` | `npm run cli -- tenant list` |
| `tenant inspect` | Inspecciona un negocio por `slug` o `tenantId` (conteos de servicios/turnos/miembros/storage y estado MP enmascarado, nunca imprime secretos). | `npm run cli -- tenant inspect demo --emulator` | `npm run cli -- tenant inspect demo` |
| `tenant delete` | Elimina permanentemente un único negocio (subcolecciones Firestore + `/tenant_slugs/*` + `tenants/<id>/` en Storage + limpieza de claims de sus miembros). | `npm run cli -- tenant delete demo --dry-run --emulator`<br>`npm run cli -- tenant delete demo --confirm demo --yes --emulator` | `npm run cli -- tenant delete demo --confirm demo` |

#### Flujo recomendado para resetear a estado limpio y reiniciar en producción
```powershell
# 1. Verificar credenciales y entorno antes de tocar nada
npm run cli -- doctor

# 2. Guardar respaldo local de seguridad (carpeta backups/ ignorada por Git)
npm run cli -- backup export

# 3. Simular el borrado sin modificar datos
npm run cli -- reset --dry-run

# 4. Ejecutar purga completa preservando tu cuenta SuperAdmin (pide escribir "RESET turnos-web-eb8b5")
npm run cli -- reset --confirm-project turnos-web-eb8b5

# 5. (Opcional) Si elegiste --wipe-auth-all o querés dejar listo el SuperAdmin (y opcionalmente --with-demo):
npm run cli -- init --admin-email tu-correo@turneado.app
```

#### Flujo de desarrollo local con emuladores (reiniciar datos, `reset` y `seed` con `/demo`)

Para desarrollar y probar autenticación, turnos, servicios y pagos localmente sin tocar producción:

```powershell
# Levanta Emulators + seed idempotente (/demo) + Vite en un solo comando
npm run dev:local
```

* **URLs locales:** `http://localhost:5173/demo`, `http://localhost:5173/demo/login`, `http://localhost:5173/superadmin/login` y Emulator UI en `http://127.0.0.1:4000`.
* **Credenciales locales por defecto:** `admin@local.test` / `LocalAdmin123!` *(personalizables vía `LOCAL_ADMIN_EMAIL` y `LOCAL_ADMIN_PASSWORD`)*.
* **Persistencia:** al cerrar con `Ctrl+C`, los datos se exportan automáticamente a `.firebase/emulator-data`.

##### Reiniciar los datos locales desde cero

* **Opción 1 — Con los emuladores apagados (más rápida):** borrá la carpeta persistida y volvé a ejecutar `dev:local` para regenerar `/demo` limpio:
  ```powershell
  Remove-Item -Recurse -Force .firebase\emulator-data -ErrorAction SilentlyContinue
  npm run dev:local
  ```

* **Opción 2 — En caliente (con los emuladores ya corriendo en otra terminal):** usá la CLI con `--emulator` (garantiza que nunca toque producción):
  ```powershell
  # 1. Purga completa en el emulador (Firestore, Storage y Auth)
  npm run cli -- reset --confirm-project turnos-web-eb8b5 --wipe-auth-all --yes --emulator

  # 2. Volver a sembrar SuperAdmin (admin@local.test / LocalAdmin123!) y negocio /demo
  npm run emulators:seed
  ```
  *(Para preservar tu usuario SuperAdmin y limpiar solo los negocios/datos, omití `--wipe-auth-all`. Para sembrar con otro correo o contraseña, ejecutá `npm run cli -- init --admin-email tu@correo.com --admin-password TuClave123 --with-demo --emulator`.)*

---

## 2. Catálogo de `/artifacts` y Salidas Generadas

### 2.1 Definiciones de diseño y especificaciones (`artifacts/definitions/`)

| Archivo | Contenido |
| --- | --- |
| `artifacts/definitions/00-app-analysis-and-folder-architecture.md` | Análisis funcional de Turneado y arquitectura de carpetas para la generación de artefactos comerciales. |
| `artifacts/definitions/01-design-system-and-css-spec.md` | Sistema de diseño, paleta tipográfica, tokens CSS y reglas de maquetación para piezas imprimibles y digitales. |
| `artifacts/definitions/02-business-card-front.md` | Especificación visual y copy del frente de la tarjeta personal/comercial. |
| `artifacts/definitions/03-business-card-back.md` | Especificación del dorso de la tarjeta con QR de acceso directo a `https://turneado.app`. |
| `artifacts/definitions/04-pdf-page-1-quick-view.md` | Especificación de la página 1 del dossier comercial A4 (propuesta de valor y resumen ejecutivo). |
| `artifacts/definitions/05-pdf-page-2-details.md` | Especificación de la página 2 del dossier comercial A4 (arquitectura, flujo de pagos y diferenciadores). |

### 2.2 Código fuente de generación (`artifacts/src/`)
- `artifacts/src/build.mjs`: motor de compilación que renderiza plantillas HTML/CSS y exporta PDFs/PNGs usando Chromium/Edge headless.
- `artifacts/src/config/` (`brand.mjs`, `icons.mjs`, `qr.mjs`): identidad de marca (`turneado.app`), íconos vectoriales y renderizador SVG del código QR.
- `artifacts/src/data/` (`business-card.copy.mjs`, `pdf-dossier.copy.mjs`, `qr-matrix.json`): textos comerciales y matriz QR `25x25` correspondiente a `https://turneado.app`.
- `artifacts/src/styles/` (`tokens.css`, `business-card.css`, `pdf-a4.css`): hojas de estilo para tarjetas y formato A4.
- `artifacts/src/templates/`: plantillas modulares (`business-card-front.mjs`, `business-card-back.mjs`, `pdf-page-1-quick-view.mjs`, `pdf-page-2-details.mjs`, `pdf-shared.mjs`, `layouts.mjs`).

### 2.3 QA, guías y pendientes (`artifacts/` y `artifacts/todo/`)
- `artifacts/cli-and-gcloud-guide.md`: esta guía operativa de scripts, artefactos, CLI y Google Cloud CLI.
- `artifacts/manualtest.html`: checklist interactivo de pruebas manuales end-to-end para validar despliegues.
- `artifacts/todo/mercadopago-orders-api-migration.md`: análisis técnico sobre la transición de Mercado Pago Checkout Pro / Preferences vs. Orders API.
- `artifacts/todo/secrets-and-credentials-hardening.md`: auditoría de seguridad y plan para migrar secretos de `functions/.env` a Cloud Secret Manager (`defineSecret`).

### 2.4 Salidas generadas listas para compartir (`public/artifacts/`)
- **Tarjetas:** `public/artifacts/business-cards/turneado-card-front.png`, `turneado-card-back.png`, `turneado-card-print.pdf`.
- **Dossier PDF:** `public/artifacts/pdf/turneado-dossier-comercial.pdf`, `turneado-page-1-quick-view.pdf`, `turneado-page-2-details.pdf`.
- **Capturas de vista rápida:** `public/artifacts/images/turneado-page-1-quick-view.png`, `turneado-page-2-details.png`.

---

## 3. Tutorial: Instalar Google Cloud CLI (`gcloud`) y Autenticarse Correctamente

### ¿Por qué se necesita `gcloud` (ADC) para operar contra producción?
Los comandos administrativos (`reset`, `init`, `admin`, `tenant`, `backup`) usan **Firebase Admin SDK** (`firebase-admin`). A diferencia de `firebase login` (que solo autentica a la CLI de Firebase para deploy), el Admin SDK necesita credenciales de Google Cloud mediante **Application Default Credentials (ADC)**.

Usar **ADC vía `gcloud`** es el método oficial recomendado por Google porque:
- No requiere descargar archivos JSON de Service Account con llaves privadas permanentes en tu disco.
- Usa tokens de corta duración asociados a tu cuenta de Google, revocables en un clic.
- Reduce drásticamente el riesgo de filtrar credenciales en un commit accidental.

*(Nota: si solo vas a correr la CLI con `--emulator`, NO necesitás `gcloud` ni credenciales de Google Cloud.)*

---

### Paso 1: Instalación de Google Cloud CLI (`gcloud`)

#### Opción A — Windows (recomendado)
1. **Con `winget` en PowerShell:**
   ```powershell
   winget install --id Google.CloudSDK -e
   ```
2. **O con el instalador oficial gráfico:**
   - Descargá `GoogleCloudSDKInstaller.exe` desde [cloud.google.com/sdk/docs/install](https://cloud.google.com/sdk/docs/install).
   - Ejecutalo dejando marcadas las opciones *"Add gcloud to PATH"* y *"Bundled Python"*.
3. **Cerrá y volvé a abrir PowerShell / VS Code** para que se recargue la variable `PATH`.
4. Verificá la instalación:
   ```powershell
   gcloud --version
   ```

#### Opción B — macOS
```bash
brew install --cask google-cloud-sdk
```
Luego recargá tu shell (`source ~/.zshrc`) y verificá con `gcloud --version`.

#### Opción C — Linux (Debian / Ubuntu)
```bash
sudo apt-get update && sudo apt-get install -y apt-transport-https ca-certificates gnupg curl
curl -fsSL https://packages.cloud.google.com/apt/doc/apt-key.gpg | sudo gpg --dearmor -o /usr/share/keyrings/cloud.google.gpg
echo "deb [signed-by=/usr/share/keyrings/cloud.google.gpg] https://packages.cloud.google.com/apt cloud-sdk main" | sudo tee /etc/apt/sources.list.d/google-cloud-sdk.list
sudo apt-get update && sudo apt-get install -y google-cloud-cli
gcloud --version
```

---

### Paso 2: Autenticación y selección del proyecto (`turnos-web-eb8b5`)

Ejecutá estos **4 comandos en orden** desde tu terminal:

```powershell
# 1. Inicia sesión con tu cuenta de Google en gcloud (abre el navegador)
gcloud auth login

# 2. Configura el proyecto activo de Firebase / GCP
gcloud config set project turnos-web-eb8b5

# 3. Genera las Application Default Credentials (ADC) que lee firebase-admin
gcloud auth application-default login

# 4. Asocia el proyecto de cuota (evita errores de "quota project not set" en Firestore/Storage)
gcloud auth application-default set-quota-project turnos-web-eb8b5
```

> **Importante:** `gcloud auth login` autentica únicamente al comando `gcloud`. El comando que realmente habilita a Node.js (`firebase-admin` / `npm run cli`) es **`gcloud auth application-default login`**.

---

### Paso 3: Verificar cuenta, proyecto y permisos IAM

1. Comprobá la configuración activa en `gcloud`:
   ```powershell
   gcloud config list
   gcloud auth list
   ```
   Asegurate de que el proyecto activo sea `turnos-web-eb8b5` y la cuenta sea la propietaria del proyecto en Firebase Console.

2. **Roles IAM requeridos** para tu usuario en Google Cloud Console (*IAM y administración → IAM*):
   - Si sos el creador/propietario del proyecto: `roles/owner` (**Propietario**) o `roles/editor` + `Firebase Authentication Admin` ya cubren todo.
   - Si usás un principio de mínimo privilegio, necesitás:
     - `Firebase Authentication Admin` (`roles/firebaseauth.admin`) — gestionar usuarios y Custom Claims.
     - `Cloud Datastore User` (`roles/datastore.user`) — leer/escribir/borrar documentos de Firestore.
     - `Storage Admin` (`roles/storage.admin`) — listar y purgar archivos en Cloud Storage.

3. Validá toda la conexión de punta a punta con la CLI de Turneado:
   ```powershell
   npm run cli -- doctor
   ```
   Si ves `[OK]` en **Firebase Auth**, **Firestore** y **Cloud Storage**, tu entorno está 100% listo para operar.

---

### Paso 4 (Alternativa): Usar una Service Account JSON (`GOOGLE_APPLICATION_CREDENTIALS`)

Si necesitás correr la CLI en un servidor CI/CD o en una máquina donde no podés instalar `gcloud`:

1. En **Firebase Console** → *Configuración del proyecto* → *Cuentas de servicio* → *Firebase Admin SDK* → clic en **Generar nueva clave privada**.
2. Guardá el archivo JSON **FUERA del repositorio** (por ejemplo en `C:\secrets\turnos-web-sa.json` o `~/.secrets/turnos-web-sa.json`). **Nunca lo guardes dentro de la carpeta del proyecto ni lo subas a Git.**
3. Definí la variable de entorno en la sesión actual antes de invocar la CLI:
   - **PowerShell (Windows):**
     ```powershell
     $env:GOOGLE_APPLICATION_CREDENTIALS = "C:\secrets\turnos-web-sa.json"
     npm run cli -- doctor
     ```
   - **Bash / Zsh (macOS / Linux):**
     ```bash
     export GOOGLE_APPLICATION_CREDENTIALS="$HOME/.secrets/turnos-web-sa.json"
     npm run cli -- doctor
     ```
4. **Buenas prácticas de seguridad:** rotá o revocá la clave en *Google Cloud Console → IAM → Cuentas de servicio* cuando ya no la necesites, y preferí siempre ADC (`gcloud auth application-default login`) en equipos de desarrollo personales.

---

### Paso 5: Resolución de errores comunes

| Error | Causa | Solución |
| --- | --- | --- |
| `Could not load the default credentials` | No ejecutaste el login ADC o la variable `GOOGLE_APPLICATION_CREDENTIALS` apunta a una ruta inexistente. | Ejecutá `gcloud auth application-default login` (o verificá `$env:GOOGLE_APPLICATION_CREDENTIALS`). |
| `Your application is authenticating by using local Application Default Credentials... quota project` | Falta asociar un proyecto de cuota a las credenciales ADC. | Ejecutá `gcloud auth application-default set-quota-project turnos-web-eb8b5`. |
| `PERMISSION_DENIED` o `insufficient permissions` | La cuenta autenticada en ADC no tiene permisos sobre `turnos-web-eb8b5` (o estás logueado con otra cuenta de Google). | Revisá `gcloud auth list`, re-logueate con la cuenta dueña del proyecto y validá los roles IAM en GCP. |
| `The specified bucket does not exist` | El bucket de Storage aún no fue inicializado en Firebase Console o el nombre en `.env` no coincide. | Abrí **Firebase Console → Storage → Comenzar**, o pasá `--bucket <nombre-real>` a la CLI. |
| `gcloud: command not found` (Windows) | La terminal fue abierta antes de instalar el SDK o faltó agregarlo al `PATH`. | Cerrá y abrí una nueva ventana de PowerShell / VS Code y probá `gcloud --version`. |
| Quiero probar sin tocar producción | Falta el flag `--emulator` o los emuladores no están levantados. | Levantá los emuladores con `firebase emulators:start --only auth,firestore,storage,functions` en una terminal y ejecutá los comandos de la CLI con `--emulator`. |
