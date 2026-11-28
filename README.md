# Turneado — Plataforma SaaS Multi-Tenant de Reservas Online

**Turneado** es una aplicación web **SaaS Multi-Tenant** pensada para negocios y profesionales que atienden por turnos (estética, barberías, spa/bienestar, consultorios, kinesiología/pilates, estudios profesionales y oficios). Permite gestionar disponibilidad en tiempo real, cobrar señas directamente en la cuenta de **Mercado Pago** de cada negocio (sin intermediación), personalizar la estética web y los correos transaccionales, y administrar múltiples espacios desde una única infraestructura serverless de Firebase.

---

## Documentación del Proyecto

| Documento | Contenido |
| :--- | :--- |
| [**Arquitectura y ADRs (`specs/architecture/architecture-and-adrs.md`)**](specs/architecture/architecture-and-adrs.md) | Arquitectura completa, diagramas Mermaid, modelo Firestore/Storage, catálogo de las 20 Cloud Functions, invariantes Zero-Trust y 14 ADRs formales (`ADR-001`–`ADR-014`). |
| [**Definición de Producto (`PRODUCT.md`)**](PRODUCT.md) | Propuesta de valor, usuarios, principios de producto, compromisos de marca y restricciones operativas. |
| [**Guía CLI, Emuladores y Google Cloud (`artifacts/cli-and-gcloud-guide.md`)**](artifacts/cli-and-gcloud-guide.md) | Uso de la CLI operativa (`doctor`, `reset`, `init`, `admin`, `tenant`, `backup`), consola interactiva, emuladores locales y despliegue. |
| [**Checklist Interactivo de QA Manual (`artifacts/manualtest.html`)**](artifacts/manualtest.html) | Suite manual interactiva offline (15 módulos, filtro Smoke P0, lanzador de URLs, export de bugs en Markdown y backup JSON). |
| [**Especificaciones por Fase (`specs/00`–`15`)**](specs/00-overview.md) | Especificaciones técnicas detalladas desde la migración multi-tenant hasta la pasarela de reserva en 4 pasos. |

---

## Funcionalidades Principales

### Plataforma y Experiencia Pública
- **Landing Comercial (`/`) y Centro de Ayuda (`/ayuda`):** presentación del producto, acceso a demo en vivo, dossier comercial descargable y centro de ayuda con buscador instantáneo (`/help` redirige a `/ayuda`).
- **Storefront por Negocio (`/:tenantSlug`):**
  - Resolución de tenant en **1 lectura** (`/tenant_slugs/{slug}`) con soporte de redirección automática cuando cambia el slug y pantallas tematizadas de suspensión o inexistencia.
  - Portada personalizable, tira horizontal de fechas con **feriados nacionales argentinos** sincronizables, filtros por franja horaria/búsqueda, vista en **Fichas** o **Rápida**, portfolio y badges de **recargo en turnos** (monto fijo o porcentaje).
  - **Pasarela de Reserva en 4 Pasos (`BookingModal`):** selección de servicios → adicionales opcionales (con auto-salto inteligente) → datos de contacto con persistencia local → resumen con total estimado, seña online y **saldo pendiente** + checkout en **Mercado Pago** (o fallback a WhatsApp/Instagram si el negocio aún no configuró MP).
  - **Motor anti-solapamiento:** bloqueo atómico transaccional por 15 minutos (`lockToken`), cálculo autoritativo de precios/duraciones/recargos en servidor, confirmación idempotente por webhook HMAC + `verifyPayment` y manejo seguro de `bfcache` al volver desde la pasarela.
  - **Retorno de Pago (`/:tenantSlug/payment/*`):** vistas a pantalla completa (`100dvh`) tematizadas con la identidad del negocio, detalle completo del comprobante y aviso acentuado para revisar la carpeta de spam.
  - **Catálogo y Calculadora (`/:tenantSlug/prices`)** y **Sobre Mí (`/:tenantSlug/about`)**.

### Backoffice del Negocio (`/:tenantSlug/admin`)
Organizado en **3 grupos semánticos** con control de acceso por rol (`owner` / `staff`):
- **Gestión diaria:**
  - **Agenda confirmada (`ConfirmedAgenda`):** línea de tiempo cronológica con ocupación diaria, huecos libres entre turnos, turnos en curso, comprobante MP y accesos directos a WhatsApp/Email.
  - **Turnos (`AdminView`, `CreateSlotModal`, `AssignSlotModal`):** carga individual o masiva en 3 pasos con detección de duplicados, feriados y configuración de recargos (`fixed`/`percentage`); asignación manual, liberación, cancelación (con reactivación automática de conflictos) y eliminación.
  - **Servicios (`ServicesManager`):** catálogo con precio base, duración, adicionales inline y vista previa en vivo.
  - **Métricas (`AdminChart`):** KPIs financieros reales (facturación estimada, señas cobradas online sin mezclar asignaciones manuales, saldo pendiente, ticket promedio y clientes únicos).
- **Tu página pública (`Solo Owner`):**
  - **Estudio de Apariencia v2 (`AppearanceSettings`):** 31 ejes configurables, 24 paletas curadas + colores HEX libres con calibración automática **WCAG AA**, 5 Style Packs por rubro, 6 superficies, 6 fondos, 8 tipografías, 5 layouts de Hero, preview desktop/mobile flotante y correos sincronizados.
  - **Mi Perfil (`OwnerSettings`) y Portfolio (`PortfolioManager`):** carga de imágenes a Firebase Storage aislado por tenant (`/tenants/{tenantId}/*`, ≤5 MB).
  - **Difusión y QR (`DiffusionHub`):** generador 100% client-side de **placa PNG 1080×1920 para historias de Instagram** con turnos disponibles y **tarjeta de negocio con código QR**.
- **Configuración avanzada (`Solo Owner`):**
  - **Cobros con Mercado Pago (`PaymentSettingsManager`):** protegido con confirmación previa y solo lectura por defecto; credenciales guardadas exclusivamente en `/private_config/integrations` (backend-only) con URL de webhook dedicada y firma HMAC.

### Gobierno de Plataforma (`/superadmin`) y Automatización Serverless
- Alta atómica de negocios, pausa/reactivación, cambio de slug con alias automático y gestión de miembros (`owner` / `staff`) sincronizada con Custom Claims de Firebase Auth.
- **Correos transaccionales (Amazon SES v2):** remitente `"{Negocio}" <noreply@turneado.app>`, estética sincronizada con la apariencia del negocio, doble envío (cliente + negocio), alertas de incidentes de pago y reintento automático idempotente.
- **Mantenimiento programado (Cloud Scheduler):** `releaseExpiredSlots` cada 10 minutos (libera bloqueos vencidos + reintenta correos) y `cleanupPastSlots` horario, siempre particionados por `tenantId`.

---

## Mapa de Rutas

| Ruta | Vista | Acceso |
| :--- | :--- | :--- |
| `/` | Landing comercial de Turneado | Público |
| `/ayuda` (`/help` → `/ayuda`) | Centro de ayuda con buscador | Público |
| `/:tenantSlug` | Agenda pública y reserva en 4 pasos | Público |
| `/:tenantSlug/prices` | Catálogo de servicios y calculadora | Público |
| `/:tenantSlug/about` | Presentación del negocio y portfolio | Público |
| `/:tenantSlug/payment/success` \| `pending` \| `failure` | Verificación y comprobante de seña | Público |
| `/:tenantSlug/login` | Acceso administrativo del negocio | Público |
| `/:tenantSlug/admin` | Panel de administración del negocio | `owner` / `staff` / `platformAdmin` |
| `/superadmin/login` y `/superadmin` | Panel de gobierno multi-tenant | `platformAdmin` |

---

## Stack Tecnológico

- **Frontend:** React 19, TypeScript 6, Vite 8, React Router 7, Motion, Lucide React, QRCode, CSS Modules + CSS Custom Properties.
- **Backend & Infraestructura:** Firebase Hosting, Firebase Authentication (Custom Claims), Cloud Firestore (reglas Zero-Trust + índices compuestos + TTL), Cloud Storage, Cloud Functions v2 (Node.js 24) y Cloud Scheduler.
- **Integraciones:** Mercado Pago SDK v2 (Checkout Pro + Webhooks HMAC) y Amazon SES v2 (`@aws-sdk/client-sesv2`).
- **Calidad:** Vitest 4 (`28` suites unitarias / `297` tests + `14` suites de integración sobre Firebase Emulators) y ESLint 10.

---

## Inicio Rápido Local (Recomendado)

### Requisitos previos
- Node.js `>= 20` (Cloud Functions apunta a Node `24`) y npm.
- Java JDK (requerido por Firebase Local Emulator Suite) y `firebase-tools` (`npm i -g firebase-tools`).

### 1. Instalar dependencias y variables de entorno
```bash
npm install
npm --prefix functions install
```

Creá tus archivos de entorno a partir de las plantillas:
- Raíz: copiar `.env.example` → `.env` (credenciales web de Firebase).
- Backend: copiar `functions/.env.example` → `functions/.env` (`CLIENT_APP_URL`, `MP_WEBHOOK_URL`, `MP_ACCESS_TOKEN`/`MP_WEBHOOK_SECRET` solo de respaldo para tenants `isDemo: true`, y variables `AWS_*`/`SES_FROM_EMAIL` para Amazon SES).

### 2. Levantar el entorno completo en 1 comando
```bash
npm run dev:local
```
Este comando compila `functions`, inicia los emuladores (`Auth:9099`, `Firestore:8080`, `Storage:9199`, `Functions:5001`, `UI:4000`) con persistencia en `.firebase/emulator-data`, siembra de forma idempotente el SuperAdmin local (`admin@local.test` / `LocalAdmin123!`) y el negocio `/demo`, y levanta Vite en modo emulador:

- **Landing:** `http://localhost:5173/`
- **Agenda Demo:** `http://localhost:5173/demo`
- **Admin Demo:** `http://localhost:5173/demo/login`
- **SuperAdmin:** `http://localhost:5173/superadmin/login`
- **Emulator UI:** `http://127.0.0.1:4000`

> **Alternativa guiada:** ejecutá `npm run cli:console` (o doble clic en `scripts/quickactions/turneado-quickactions.bat` en Windows) para abrir el menú interactivo de desarrollo local, diagnósticos y operaciones.

---

## Scripts y Comandos Principales

| Comando | Descripción |
| :--- | :--- |
| `npm run dev:local` | Compila Functions, levanta emuladores persistentes, siembra `/demo` y arranca Vite. |
| `npm run dev` / `npm run dev:emulator` | Inicia solo el servidor frontend Vite (normal o apuntando a emuladores). |
| `npm run build` | Compila TypeScript (`tsc -b`) y construye el bundle de producción (`vite build`). |
| `npm run lint` | Ejecuta ESLint sobre todo el repositorio. |
| `npm test` | Corre las `28` suites de tests unitarios (`297` tests) en `tests/unit/`. |
| `npm run test:integration` | Compila Functions y ejecuta las `14` suites de integración y seguridad Cross-Tenant sobre Firebase Emulators. |
| `npm run cli:console` | Abre la consola operativa interactiva (entorno local, logs, seed, reset, prod read-only, feriados, build). |
| `npm run cli -- <cmd>` | Ejecuta la CLI operativa (`doctor`, `reset`, `init`, `admin`, `tenant`, `backup`). |
| `npm run holidays:sync` | Sincroniza `src/data/holidays.json` desde el calendario oficial de `argentina.gob.ar`. |
| `npm run artifacts:build` | Regenera todos los artefactos comerciales en `public/artifacts/` (también `artifacts:cards` y `artifacts:pdf`). |

---

## Estructura del Repositorio

```text
├── src/
│   ├── components/         # UI común, modales de reserva/turnos y módulos de Admin (DiffusionHub, Appearance, Chart...)
│   ├── config/             # Constantes multi-tenant, límites de campos, presets de apariencia (24 paletas, 5 packs)
│   ├── context/            # Theme, Auth, Tenant, OwnerInfo, Services y Portfolio providers aislados por tenant
│   ├── data/               # Dataset versionado de feriados argentinos (holidays.json) y copy de ayuda
│   ├── hooks/              # useSlots, useAuth, useEffectiveTenantAppearance, useHorizontalScrollIndicator
│   ├── layouts/            # ClientLayout, AdminLayout, LoginLayout, SuperAdminLayout
│   ├── pages/              # Landing, Help, ClientView, Prices, About, PaymentStatus, Login, AdminView, SuperAdminView
│   ├── services/           # Acceso a Firestore/Storage/Functions, motor de conflictos, analíticas, themeEngine y caché
│   ├── texts/              # Diccionario centralizado de copy neutro en español
│   └── utils/              # dateUtils (SSOT), holidays, surcharge, canvas/QR, helpSearch, validators
├── functions/src/          # 19 módulos TypeScript -> 20 Cloud Functions v2 (pagos, admin, superadmin, triggers, crons, SES)
├── scripts/                # CLI unificada (turneado-cli.mjs), consola interactiva, dev-local, sync-holidays y quickactions
├── specs/                  # Especificaciones 00..15 y arquitectura maestra (specs/architecture/architecture-and-adrs.md)
├── artifacts/              # Guías operativas, generador de dossier/tarjetas (src/), definitions/, todo/ y manualtest.html
└── tests/                  # tests/unit/ (28 suites) y tests/integration/ (14 suites sobre Emulators)
```

---

## Despliegue en Firebase

```bash
# Compilar frontend y backend
npm run build
npm --prefix functions run build

# Desplegar reglas, índices, funciones y hosting
firebase deploy --only firestore:rules,firestore:indexes,storage,functions,hosting
```

Para detalles completos de operación en producción, backups, alta de SuperAdmin y diagnóstico con Google Cloud CLI, consultá [**artifacts/cli-and-gcloud-guide.md**](artifacts/cli-and-gcloud-guide.md).
