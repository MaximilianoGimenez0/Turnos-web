# Turneado — Análisis Detallado de la Aplicación y Arquitectura de Carpetas de Artefactos

> **Propósito de este documento:** Servir como base de verdad funcional, comercial y estructural para los artefactos de presentación y venta de **Turneado** (Business Cards 16:9, Dossier PDF A4 de 2 páginas e imágenes PNG de vista previa).  
> **Estado de referencia:** Código fuente vigente en rama `main` (Specs `00` a `15` implementados; arquitectura de carpetas en `artifacts/src/` y salidas en `public/artifacts/` ya aplicadas y operativas). Ver arquitectura técnica completa en [`specs/architecture/architecture-and-adrs.md`](../../specs/architecture/architecture-and-adrs.md).

---

## 1. Resumen Ejecutivo de la Aplicación

**Turneado** evolucionó de un sistema de reservas monousuario a una **plataforma SaaS Multi-Tenant de reservas online con cobro de seña, personalización visual integral, herramientas de difusión y autogestión completa por negocio**.

Opera múltiples negocios independientes sobre una única infraestructura serverless de Firebase (Hosting, Auth con Custom Claims, Cloud Firestore, Cloud Storage y Cloud Functions v2 en Node 24), con aislamiento estricto de datos, archivos, credenciales de Mercado Pago y estética por cada comercio (`/:tenantSlug`).

### Propuesta de Valor Central
1. **Elimina el ausentismo (*no-show*):** Cada reserva exige el pago de una seña online vía **Mercado Pago Checkout Pro**, acreditada **directamente en la cuenta del negocio** sin intermediación ni comisiones por turno de la plataforma.
2. **Cero superposiciones (*double booking*):** Motor determinista de intervalos temporales que calcula duraciones combinadas (servicios + adicionales), bloquea reservas concurrentes por **15 minutos** de forma atómica (`runTransaction` + `lockToken`) y marca/reactiva conflictos automáticamente.
3. **Marca 100% propia (Web + Retorno de Pago + Difusión + Emails):** Estudio de Apariencia v2 (31 ejes, 24 paletas, 5 Style Packs por rubro) con vista previa desktop/mobile en vivo que sincroniza storefront, vistas `/payment/*`, placas PNG de Instagram, tarjetas QR y **correos transaccionales (Amazon SES)** con calibración automática de contraste **WCAG AA**.
4. **Cero fricción para el cliente final:** Sin descargas de apps ni creación de cuentas. Pasarela guiada en 4 pasos desde un enlace de Instagram, WhatsApp o QR hasta el comprobante por email con claridad total sobre seña y **saldo pendiente**.
5. **Multirrubro con calidez editorial:** Copy neutro y packs visuales nativos para **estética & belleza, spa & bienestar, barberías, consultorios clínicos/salud, pilates/kinesiología y estudios profesionales**.

---

## 2. Mapa Completo de Funcionalidades Reales (Estado Actual del Código)

### 2.1 Plataforma Comercial y Experiencia Pública del Cliente

| Ruta | Módulo | Funcionalidades clave actuales |
| :--- | :--- | :--- |
| `/` | **Landing Comercial (`LandingView`)** | - Presentación del producto, beneficios clave, acceso directo a la demo interactiva (`/demo`), descarga del dossier comercial y acceso al centro de ayuda. |
| `/ayuda` (`/help` → `/ayuda`) | **Centro de Ayuda (`HelpView`)** | - Guías y preguntas frecuentes organizadas para clientes y negocios, con buscador instantáneo (`helpSearch.ts`). |
| `/:tenantSlug` | **Portada (Hero) + Agenda Reactiva (`ClientView`)** | - Portada personalizable en 5 layouts, 6 formas de foto, 6 marcos y copy propio.<br>- Tarjeta de estudio con estado, ubicación y acceso a "Sobre mí".<br>- **Tira horizontal de fechas** con barra de progreso proporcional, **feriados nacionales argentinos** (`holidays.json` sincronizable) y aviso móvil.<br>- Filtros por fecha, franja horaria (*Todo el día*, *Mañana*, *Tarde*), buscador en tiempo real, selector de densidad (**Fichas** vs **Rápida**) y badges claros de **recargo en turnos** (fijo o porcentual).<br>- Galería de Portfolio, sección *"Cómo funciona"*, FAQ y bloque de garantía de pago. |
| `/:tenantSlug` (Modal) | **Pasarela de Reserva en 4 Pasos (`BookingModal`)** | - Wizard guiado móvil-first: `01 Servicios` → `02 Adicionales` (auto-salto si no aplican) → `03 Tus datos` (con persistencia local) → `04 Resumen y pago`, con barra de progreso híbrida en vivo.<br>- Cálculo transparente en vivo: servicios + adicionales + recargo (si aplica) = **Total estimado**, **Seña online (Mercado Pago)** y **Saldo pendiente**.<br>- Bloqueo concurrente atómico por **15 minutos** (`pending_payment`) al iniciar Checkout Pro, protección contra falsos errores durante la redirección y cierre limpio en `bfcache`.<br>- Fallback elegante si el negocio aún no configuró Mercado Pago: contacto directo vía WhatsApp o Instagram. |
| `/:tenantSlug/prices` | **Catálogo y Calculadora (`Prices`)** | - Lista completa de servicios con descripción, duración y adicionales opcionales.<br>- Buscador en tiempo real y **calculadora interactiva** con tiempo total, presupuesto estimado y salto directo a reservar. |
| `/:tenantSlug/about` | **Sobre Mí & Portfolio (`About`)** | - Presentación del profesional/marca, tarjetas de contacto directo (Instagram, WhatsApp, Email, Ubicación), pilares de atención y galería de trabajos. |
| `/:tenantSlug/payment/*` | **Retorno de Pago (`success` / `failure` / `pending`)** | - Vistas a pantalla completa (`100dvh`) tematizadas con la apariencia y logo del negocio.<br>- Verificación segura contra backend (`verifyPayment`) con detalle de comprobante MP, recargo, seña abonada, **saldo pendiente** y aviso destacado para revisar la carpeta de spam. |
| `/:tenantSlug` (Estados) | **Resolución de Tenant (`TenantStatus`)** | - Bootstrap en **1 sola lectura** (`/tenant_slugs/{slug}`) con caché aislado por negocio y caché de apariencia por slug.<br>- Redirección automática transparente si cambió el slug (`redirectToSlug`) y pantalla tematizada `TenantSuspended` / `TenantNotFound`. |

### 2.2 Panel Privado de Administración (`/:tenantSlug/admin`)

Navegación organizada en **3 grupos semánticos** con control de acceso por rol (`owner` / `staff`):

#### Grupo A — Gestión diaria (`Owner` & `Staff` en Agenda y Turnos; `Solo Owner` en Servicios y Métricas)
1. **Agenda (`ConfirmedAgenda`):**
   - **Línea de tiempo diaria cronológica** con hora de inicio, fin, duración real y barra de ocupación diaria.
   - Identifica visualmente **huecos libres entre turnos**, turnos seguidos, turnos **en curso**, finalizados y eventuales superposiciones.
   - Muestra total estimado, recargo si aplica, seña pagada, **saldo pendiente**, comprobante MP (`MP #`) y accesos en 1 clic a **WhatsApp** y **Email**.
   - Alcance temporal (**Día / Semana / Mes / Todos**) con zona horaria del tenant y detección de feriados.
2. **Turnos (`AdminView` + `CreateSlotModal` + `AssignSlotModal`):**
   - Control total sobre todos los estados (`available`, `pending_payment`, `confirmed`, `conflict`, `cancelled`, `past`) con vistas **Fichas / Rápida**.
   - **Carga masiva en 3 pasos:** servicios y seña + **recargo opcional** (`fixed` o `percentage` con motivo visible) → calendario multifecha con **feriados destacados** → franjas de 30 min → resumen en vivo y publicación por lote.
   - **Asignación manual**, liberación de bloqueos, cancelación con reactivación automática de conflictos y eliminación.
3. **Servicios (`ServicesManager` — Solo Owner):**
   - Editor de **3 pasos** (`01 Identidad`, `02 Tarifa y duración`, `03 Adicionales opcionales`) con carga ágil inline y vista previa en vivo.
4. **Métricas (`AdminChart` — Solo Owner):**
   - KPIs financieros precisos (`analyticsService.ts`): distingue **señas cobradas online** de turnos asignados manualmente, calcula **facturación total estimada**, **saldo pendiente**, **ticket promedio** y **clientes únicos** en la zona horaria del negocio.

#### Grupo B — Tu página pública (`Solo Owner`)
5. **Apariencia (`AppearanceSettings` + `themeEngine`):**
   - **31 ejes configurables** con **5 Style Packs por rubro**, **24 paletas curadas** en 6 categorías + colores HEX libres con calibración **WCAG AA**, **6 superficies**, **6 estilos de fondo** en 3 intensidades, **8 pares tipográficos**, **4 curvaturas**, **4 estilos de tarjeta** (incluido `glass` reforzado), **5 layouts de Hero**, **6 formas y 6 marcos de imagen**, preview dual con vista mobile flotante y previsualización de **email sincronizado**.
6. **Mi Perfil (`OwnerSettings`):** carga optimizada de Logo, Foto de perfil y Portada en Firebase Storage aislado (`/tenants/{tenantId}/*`, ≤5 MB).
7. **Portfolio (`PortfolioManager`):** gestión de trabajos destacados para inicio y "Sobre mí".
8. **Difusión y QR (`DiffusionHub`):**
   - **Placa de turnos para Instagram (`InstagramScheduleGenerator`):** renderiza en `<canvas>` 2D una placa PNG 1080×1920 con los turnos disponibles y la estética exacta del negocio.
   - **Tarjeta y código QR (`BusinessCardGenerator`):** tarjeta visual descargable con QR hacia `/:tenantSlug`.

#### Grupo C — Configuración avanzada (`Solo Owner`)
9. **Mercado Pago (`PaymentSettingsManager`):**
   - Acceso con diálogo de confirmación y bloqueo de edición por defecto.
   - Credenciales guardadas únicamente en `/tenants/{tenantId}/private_config/integrations` (backend-only), URL de webhook dedicada (`?tenantId={tenantId}`) y clave secreta HMAC (`x-signature`).

### 2.3 Gobierno de Plataforma (`/superadmin`) y Backend Serverless

- **Panel `/superadmin`:** alta atómica de negocios, pausa/reactivación, migración de slug con redirección automática, gestión de miembros (`owner`/`staff`) y refresco de permisos.
- **20 Cloud Functions v2 (Node 24):** checkout transaccional, webhooks HMAC con tenant binding, proyección pública libre de PII (`/public_meta/availability`), triggers de bootstrap y Custom Claims, correos **Amazon SES v2** tematizados y 2 crons (`releaseExpiredSlots` cada 10 min + `cleanupPastSlots` horario).

---

## 3. Arquitectura Vigente de Carpetas de Artefactos

La reorganización propuesta originalmente **ya fue implementada y está operativa**: el código fuente y las definiciones viven en `artifacts/` y las salidas listas para web, WhatsApp e imprenta se publican en `public/artifacts/` (servidas públicamente bajo el slug reservado `'artifacts'`).

```text
artifacts/
├── cli-and-gcloud-guide.md                           # Guía operativa de scripts, CLI, consola y gcloud
├── manualtest.html                                   # Suite interactiva de QA manual E2E (15 módulos)
├── definitions/                                      # Especificaciones de marca, layout y copy
│   ├── 00-app-analysis-and-folder-architecture.md    # Este documento
│   ├── 01-design-system-and-css-spec.md
│   ├── 02-business-card-front.md
│   ├── 03-business-card-back.md
│   ├── 04-pdf-page-1-quick-view.md
│   └── 05-pdf-page-2-details.md
├── src/                                              # Generador modular de piezas comerciales
│   ├── config/ (brand.mjs, icons.mjs, qr.mjs)
│   ├── data/   (qr-matrix.json, business-card.copy.mjs, pdf-dossier.copy.mjs)
│   ├── styles/ (tokens.css, business-card.css, pdf-a4.css)
│   ├── templates/ (layouts, business-card-front/back, pdf-page-1/2, pdf-shared)
│   └── build.mjs                                     # CLI: --only=all|cards|pdf --keep-html
└── todo/                                             # Backlog técnico/UX y notas de auditoría

public/artifacts/                                     # Salidas compiladas servidas por Firebase Hosting
├── business-cards/
│   ├── turneado-card-front.png
│   ├── turneado-card-back.png
│   └── turneado-card-print.pdf
├── pdf/
│   ├── turneado-dossier-comercial.pdf
│   ├── turneado-page-1-quick-view.pdf
│   └── turneado-page-2-details.pdf
└── images/
    ├── turneado-page-1-quick-view.png
    └── turneado-page-2-details.png
```

### Scripts de Regeneración Activos (`package.json`)
- `npm run artifacts:build` → regenera todo (Business Cards + PDFs + PNGs).
- `npm run artifacts:cards` → regenera solo frente, dorso y PDF imprimible de la Business Card.
- `npm run artifacts:pdf` → regenera solo el dossier PDF A4 y sus imágenes PNG de vista rápida.
