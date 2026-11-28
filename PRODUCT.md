<!-- impeccable:product-schema 1 -->
# Turneado — Product Definition

## Platform
- **Stack:** React 19, TypeScript 6, Vite 8, React Router 7, CSS Modules, Motion, Lucide React, QRCode, Firebase (Hosting, Auth con Custom Claims, Cloud Firestore, Cloud Storage, Cloud Functions v2 en Node 24 y Cloud Scheduler), Mercado Pago SDK v2 (Checkout Pro + Webhooks HMAC) y Amazon SES v2.
- **Surfaces:** Aplicación web responsive mobile-first servida en Firebase Hosting:
  - **Plataforma pública:** Landing comercial (`/`) y Centro de Ayuda (`/ayuda`).
  - **Storefront por negocio (`/:tenantSlug`):** Portada y agenda reactiva, pasarela de reserva en 4 pasos, catálogo/calculadora (`/prices`), sobre mí y portfolio (`/about`), y retorno de pago tematizado (`/payment/success|pending|failure`).
  - **Backoffice por negocio (`/:tenantSlug/admin`):** Gestión diaria (Agenda cronológica, Turnos/Carga masiva/Recargos, Servicios, Métricas), Página pública (Estudio de Apariencia v2, Mi Perfil, Portfolio, Difusión Instagram + QR) y Cobros con Mercado Pago.
  - **Gobierno de plataforma (`/superadmin`):** Alta atómica de negocios, pausa/reactivación, migración de slugs con alias y gestión de miembros (`owner` / `staff`).
- **Deploy / Runtime:** Arquitectura SaaS Multi-Tenant sobre un único proyecto Firebase, con aislamiento lógico en `/tenants/{tenantId}/*` y `/tenant_slugs/{slug}`, sin servidor Node dedicado.

## Users
- **Visitante / Cliente final:** Persona que llega desde Instagram, WhatsApp o código QR buscando reservar un turno sin instalar apps ni crear cuenta. Necesita ver disponibilidad real (incluidos feriados y recargos), calcular el total estimado con adicionales, pagar la seña online con confianza y recibir su comprobante por email con claridad sobre el **saldo pendiente**.
- **Dueño del negocio (`owner`):** Profesional independiente o titular de un negocio de servicios (estética, barbería, spa, bienestar, consultorio clínico, kinesiología/pilates, estudio profesional) que busca eliminar ausentismo, dejar de coordinar horarios por chat, reflejar su propia marca (web, placas de Instagram, tarjetas QR y correos) y cobrar señas directamente en su propia cuenta de Mercado Pago.
- **Staff del negocio (`staff`):** Colaborador operativo habilitado para gestionar la agenda diaria, publicar turnos y asignar reservas manuales sin acceder a tarifas, perfil, apariencia, métricas financieras ni credenciales de cobro.
- **Administrador de plataforma (`platformAdmin`):** Operador de Turneado encargado del alta de nuevos negocios, soporte, pausa/reactivación, cambios de URL (`slug`) y auditoría operativa.

## Product Purpose
Turneado elimina la coordinación manual de turnos por mensajes y reduce el ausentismo (*no-show*) mediante una agenda online en tiempo real respaldada por seña obligatoria vía Mercado Pago. Ofrece a cada negocio su propio espacio web tematizable (`/:tenantSlug`), sin comisiones de intermediación sobre los cobros y con prevención determinista de superposiciones (*double booking*).

## Positioning
- **Categoría:** Plataforma SaaS Multi-Tenant de gestión de turnos, cobro de señas y difusión para negocios de servicios locales.
- **Diferenciadores clave:**
  - **Cobro 100% directo al negocio:** cada tenant conecta su propia cuenta de Mercado Pago con verificación criptográfica HMAC y aislamiento estricto de credenciales.
  - **Identidad propia de punta a punta:** Estudio de Apariencia v2 (31 ejes, 24 paletas + colores HEX libres calibrados a WCAG AA, 5 Style Packs por rubro) sincronizado con la web pública, vistas de retorno de pago, placas PNG de Instagram, tarjetas QR y correos transaccionales.
  - **Cero fricción para reservar:** pasarela guiada en 4 pasos sin registro obligatorio, con cálculo transparente de servicios, adicionales, recargos, seña y saldo pendiente.
  - **Operación real pensada para el día a día:** línea de tiempo con huecos libres, carga masiva con feriados argentinos y recargos, calculadora de presupuestos y métricas financieras que distinguen cobros online de asignaciones manuales.

## Operating Context
- **Modelo de negocio:** SaaS Multi-Tenant operado sobre un proyecto Firebase unificado; los cobros de seña fluyen directamente desde el cliente final hacia la cuenta de Mercado Pago de cada negocio (0% comisión por turno de la plataforma).
- **Mercado y normativa local:** Optimizado para Argentina (`ARS`, zona horaria `America/Argentina/Buenos_Aires` por defecto con soporte IANA por tenant, calendario sincronizable de feriados oficiales de `argentina.gob.ar` y español rioplatense claro).
- **Lenguaje multirrubro neutro:** Toda la interfaz y comunicaciones deben ser válidas para cualquier rubro de servicios (evitar términos rígidos de un solo rubro como "salón" o "efectivo/presencial"; referirse siempre al monto restante como **"Saldo pendiente"**).
- **Contexto de uso:** Mayoritariamente mobile para el cliente final (acceso desde bio de Instagram, WhatsApp o QR impreso) y mixto desktop/mobile para el dueño y staff.

## Capabilities and Constraints
- **Invariantes técnicas y de seguridad:**
  - Bloqueo transaccional de 15 minutos (`pending_payment` + `lockToken`) con recálculo autoritativo en servidor de precios, duraciones, adicionales y recargos (`fixed` / `percentage`).
  - Reglas Zero-Trust: el cliente nunca escribe `/slots`, la agenda pública lee `/public_meta/availability` libre de PII, y los secretos de Mercado Pago residen en `/private_config/integrations` (backend-only).
  - Fallback de credenciales demo restringido estrictamente a tenants con `isDemo: true`; negocios comerciales sin credenciales propias operan en modo exploración con contacto directo (WhatsApp/Instagram).
  - Mantenimiento desatendido vía Cloud Scheduler (`releaseExpiredSlots` cada 10 min con reintento de emails hasta 3 veces; `cleanupPastSlots` horario) particionado por `tenantId`, más TTL nativo de 30 días en `payment_attempts`.
- **Restricciones actuales y deuda conocida:**
  - Los tokens de Mercado Pago por tenant aún están pendientes de cifrado en reposo y migración de secretos globales a Firebase Secret Manager (`artifacts/todo/secrets-and-credentials-hardening.md`).
  - La pasarela utiliza Mercado Pago Checkout Pro / Preferences API (evolución futura a Orders API documentada en `artifacts/todo/mercadopago-orders-api-migration.md`).
  - Pendiente de implementación el sistema de banners/avisos manuales de vacaciones en portada (`artifacts/todo/notificaciones-manuales-banner-vacaciones.md`).

## Brand Commitments
- **Personalidad visual:** Calidez editorial moderna, claridad operativa y elegancia sobria. Por defecto combina superficie crema cálida (`#f1e9dc` / `#faf5ec`), tinta profunda (`#231c19`) y acento rosa editorial (`#9e4f5e`), adaptándose fielmente a la paleta de cada negocio en su storefront y manteniendo un backoffice neutro y de alta legibilidad.
- **Accesibilidad y contraste:** Calibración automática WCAG AA para paletas y colores HEX personalizados tanto en modo claro como oscuro, foco visible por teclado y respeto a `prefers-reduced-motion`.
- **Tono de voz:** Cercano, profesional, directo y en español rioplatense (*voseo* consistente). Sin jerga técnica hacia el cliente final y con transparencia absoluta en montos (total estimado, recargo si aplica, seña online y saldo pendiente).

## Evidence on Hand
- **Arquitectura y decisiones:** [specs/architecture/architecture-and-adrs.md](specs/architecture/architecture-and-adrs.md) y especificaciones `specs/00`–`15`.
- **Cobertura automatizada verificada:** `28` suites unitarias (`297` tests en `tests/unit/`) y `14` suites de integración Cross-Tenant y Emulators en `tests/integration/`.
- **QA manual:** Suite interactiva actualizada en [artifacts/manualtest.html](artifacts/manualtest.html).
- **Operación y artefactos comerciales:** CLI operativa + consola interactiva (`scripts/turneado-cli.mjs`, `scripts/cli/console.mjs`) y generador de dossier PDF / tarjetas (`artifacts/src/build.mjs`).

## Product Principles
1. **Confianza antes que ornamentación:** El cliente paga una seña antes de recibir el servicio; cada pantalla (portada, pasarela de 4 pasos, retorno de pago y comprobante por email) debe transmitir claridad financiera, identidad consistente del negocio y cero estados ambiguos.
2. **Cero superposiciones, cero sorpresas:** La integridad temporal (zona horaria del tenant, duraciones combinadas, bloqueos de 15 min y recargos explícitos) se valida en servidor y se comunica con total transparencia antes de pagar.
3. **Aislamiento estricto por negocio:** Datos, medios, credenciales de cobro, caché local y estética pertenecen exclusivamente a cada tenant; un error o configuración incompleta de un negocio jamás puede afectar a otro.
4. **Personalización sin romper la usabilidad:** El dueño puede expresar la personalidad de su marca en su storefront y piezas de difusión, mientras el motor de apariencia protege el contraste WCAG AA y mantiene el backoffice siempre limpio y rápido de operar.
5. **Autogestión real en pocos toques:** Tanto reservar un turno como cargar una semana de horarios, aplicar un recargo de feriado o descargar una placa para Instagram debe resolverse en segundos desde el teléfono.
