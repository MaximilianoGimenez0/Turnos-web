# TurnosWeb — Análisis Detallado de la Aplicación y Arquitectura de Carpetas de Artefactos

> **Propósito de este documento:** Servir como base de verdad funcional, comercial y arquitectónica para regenerar todos los artefactos de presentación y venta de **TurnosWeb** (Business Cards 16:9, Dossier PDF A4 de 2 páginas e imágenes PNG de vista previa).
> **Estado de referencia:** Código fuente actual en rama `multi-tenant` (noviembre 2026). No aplica modificaciones de código ni mueve archivos existentes hasta aprobación.

---

## 1. Resumen Ejecutivo de la Aplicación

**TurnosWeb** evolucionó de un sistema de reservas monousuario para un estudio de estética a una **plataforma SaaS Multi-Tenant de reservas online con cobro de seña, personalización visual integral y autogestión completa por negocio**.

Opera múltiples negocios independientes sobre una única infraestructura serverless de Firebase (Hosting, Auth con Custom Claims, Cloud Firestore, Cloud Storage y Cloud Functions v2), con aislamiento estricto de datos, archivos, credenciales de Mercado Pago y estética por cada comercio (`/:tenantSlug`).

### Propuesta de Valor Central
1. **Elimina el ausentismo (*no-show*):** Cada reserva exige el pago de una seña online vía **Mercado Pago Checkout Pro**, acreditada **directamente en la cuenta del negocio** sin intermediación financiera de la plataforma.
2. **Cero superposiciones (*double booking*):** Motor determinista de intervalos temporales que calcula duraciones combinadas (servicios + extras), bloquea reservas concurrentes por **15 minutos** de forma atómica (`runTransaction`) y marca/reactiva conflictos automáticamente.
3. **Marca 100% propia (Web + Emails):** Estudio de Apariencia de 6 pasos con vista previa en vivo que personaliza paletas, superficies, texturas de fondo, tipografías, geometría, portada Hero y los **correos transaccionales** con calibración automática de contraste **WCAG AA**.
4. **Cero fricción para el cliente final:** Sin descargas de apps ni creación de cuentas. De un enlace en Instagram o WhatsApp al comprobante por email en 3 pasos.
5. **Multirrubro con calidez editorial:** Aunque nació con ADN editorial de estética y belleza, hoy cubre de forma nativa **estética & belleza, spa & bienestar, barberías, consultorios clínicos/salud, pilates/kinesiología y estudios profesionales**.

---

## 2. Mapa Completo de Funcionalidades Reales (Estado Actual del Código)

### 2.1 Experiencia Pública del Cliente (`/:tenantSlug`)

| Ruta | Módulo | Funcionalidades clave actuales |
| :--- | :--- | :--- |
| `/:tenantSlug` | **Portada (Hero) + Agenda Reactiva (`ClientView`)** | - Portada personalizable en 5 layouts, 6 formas de foto, 6 marcos y copy propio.<br>- Tarjeta de estudio con estado "Agenda abierta online", ubicación y acceso a "Sobre mí".<br>- Badges de confianza (Mercado Pago, débito/crédito/dinero en cuenta, comprobante instantáneo).<br>- **Tira horizontal de fechas** con barra de progreso de scroll proporcional, desvanecimientos en bordes, `ResizeObserver` y aviso móvil (*"Deslizá"*).<br>- Filtros por fecha, franja horaria (*Todo el día*, *Mañana hasta 13:00 hs*, *Tarde desde 13:00 hs*), buscador en tiempo real por día/horario/servicio.<br>- Selector de densidad (**Fichas** completas vs vista **Rápida** compacta) y acordeón de fechas expandible/colapsable.<br>- Galería de trabajos (Portfolio) integrada en el inicio.<br>- Sección *"Cómo funciona en 3 pasos"*, **Preguntas Frecuentes (FAQ)** y bloque de garantía de pago. |
| `/:tenantSlug` (Modal) | **Reserva y Pago Protegido (`BookingModal`)** | - Modal unificado móvil-first con `safe-area`.<br>- Selección de uno o varios servicios habilitados en el turno + adicionales opcionales por servicio.<br>- Cálculo transparente en vivo: precio base + adicionales = **Total estimado**, **Seña online (Mercado Pago)** y **Saldo restante presencial**.<br>- Bloqueo concurrente atómico por **15 minutos** (`pending_payment`) al iniciar Checkout Pro.<br>- Fallback elegante si el negocio aún no configuró Mercado Pago: botón directo a WhatsApp o Instagram del estudio. |
| `/:tenantSlug/prices` | **Catálogo y Calculadora de Presupuestos (`Prices`)** | - Lista completa de tratamientos con descripción, duración y adicionales opcionales.<br>- Buscador en tiempo real por tratamiento o adicional.<br>- **Calculadora interactiva:** el cliente suma/quita servicios y extras para ver **tiempo estimado total** y **presupuesto estimado** antes de reservar.<br>- Barra flotante inferior (*Floating Dock*) y cajón de desglose (*Drawer*) en móvil con salto directo a reservar. |
| `/:tenantSlug/about` | **Sobre Mí & Portfolio (`About`)** | - Presentación de la marca/profesional (foto, rol, biografía, badge profesional).<br>- Tarjetas de contacto directo: Instagram, WhatsApp, Email y Ubicación.<br>- 3 pilares de estándares (Insumos, Atención personalizada, Puntualidad con seña).<br>- Galería de trabajos destacados y CTA final a la agenda. |
| `/:tenantSlug/payment/*` | **Retorno de Pago (`success` / `failure` / `pending`)** | - Verificación segura de pago contra backend (`verifyPayment`) sin exponer PII innecesaria.<br>- Resumen claro del turno confirmado, código de pago, seña abonada y saldo restante.<br>- Manejo de pagos pendientes o rechazados con opción de reintento. |
| `/:tenantSlug` (Estados) | **Resolución Inteligente de Tenant (`TenantStatus`)** | - Bootstrap en **1 sola lectura** (`/tenant_slugs/{slug}`) con caché aislado por negocio.<br>- Redirección automática transparente si el negocio cambió su slug (`redirectToSlug`).<br>- Pantallas dedicadas si el negocio está pausado/suspendido o no existe, con vuelta a demo. |

### 2.2 Panel Privado de Administración (`/:tenantSlug/admin`)

Navegación reorganizada en **3 grupos semánticos** con barra lateral en escritorio y pestañas con indicador lateral de acento en móvil:

#### Grupo A — Gestión diaria
1. **Agenda (`ConfirmedAgenda`):**
   - **Línea de tiempo diaria cronológica** con hora de inicio, fin, duración real y barra de ocupación diaria.
   - Identifica visualmente **huecos libres entre turnos**, turnos seguidos (*back-to-back*), turnos **en curso** (*"restan X min"*), finalizados y eventuales superposiciones.
   - Muestra total estimado, seña pagada, **saldo pendiente a cobrar en el salón**, ID de comprobante de Mercado Pago (`MP #`) y accesos directos en 1 clic a **WhatsApp** y **Email** del cliente.
   - Filtros de alcance temporal (**Día / Semana / Mes / Todos**) y buscador por cliente, WhatsApp, email o servicio.
2. **Turnos (`AdminView` + `CreateSlotModal` + `AssignSlotModal`):**
   - Control total sobre todos los estados (`available`, `pending_payment`, `confirmed`, `conflict`, `cancelled`, `past`) con selector de vista **Fichas / Rápida**.
   - **Carga masiva de turnos** (Workbench en 3 pasos + Tracker de progreso): elegir servicios habilitados y seña → calendario multifecha + accesos rápidos (*Hoy / Mañana / Pasado*) → horarios en intervalos de 30 min (mañana/tarde) → **resumen en vivo** con detección automática de horarios ya existentes o pasados + modal de confirmación en lote.
   - **Asignación manual de turnos:** para clientes que escriben por WhatsApp o teléfono, manteniendo las mismas reglas anti-solapamiento.
   - **Liberar bloqueos**, cancelar turnos (reactivando automáticamente los horarios en conflicto) o eliminar turnos libres.
3. **Servicios (`ServicesManager`):**
   - Editor rediseñado de **3 pasos con tracker de progreso** (`01 Identidad`, `02 Tarifa y duración`, `03 Adicionales opcionales`).
   - Gestión de **extras inline** (carga ágil con `Enter`, validaciones de rango de precio y duración 5–480 min).
   - **Vista previa en vivo** de cómo se verá la tarjeta del servicio para los clientes (incluyendo rango de precios con adicionales).
4. **Métricas (`AdminChart`):**
   - Contexto mensual en cabecera (`Total Turnos`, `Disponibles`, `Confirmados`, `Señas Recaudadas`).
   - Tablero analítico con 4 KPIs reales de cobro: **Total Confirmados**, **Señas Cobradas**, **Ticket Promedio** y **Clientes Únicos**.
   - Gráfico interactivo de ingresos exactos por fecha de turno.

#### Grupo B — Tu página pública
5. **Apariencia (`AppearanceSettings` + `themeEngine`):**
   - Editor visual guiado en **6 pasos numerados (`01` a `06`)** con chips de resumen activo en cada sección y **vista previa en vivo** (claro/oscuro + tarjeta de agenda + vista previa del **correo de confirmación sincronizado**):
     - **01 · Paleta de colores:** **24 paletas curadas** en 6 categorías (*Estética & Editorial*, *Tierra & Boutique*, *Botánica & Spa*, *Minimal & Estudios*, *Vibrante & Creativo*, *Clínico & Bienestar*) + colores principal y acento personalizados en HEX con calibración automática de contraste **WCAG AA** en claro y oscuro.
     - **02 · Fondo y superficies:** **6 bases de superficie curadas** (*Cálida*, *Neutra*, *Fría*, *Galería Pura*, *Seda Rosada*, *Lino Botánico*) o color de fondo base propio (deriva automáticamente tarjetas, bordes, textos y la variante opuesta claro/oscuro) + **6 estilos/texturas de fondo** (*Liso*, *Degradado suave*, *Aura de marca*, *Trama de puntos*, *Grilla editorial*, *Líneas finas*) en 3 intensidades.
     - **03 · Modo claro y oscuro:** elegir modo inicial (*Claro*, *Oscuro*, *Según dispositivo*) y activar o bloquear el selector para visitantes.
     - **04 · Tipografía y escala:** **8 combinaciones tipográficas** (*Editorial*, *Clásico Boutique*, *Moderno Geométrico*, *Minimal Urbano*, *Atelier Orgánico*, *Clínico Preciso*, *Estudio Creativo*, *Cercano & Suave*) + 3 tamaños de lectura (*Sutil*, *Estándar*, *Amplia*).
     - **05 · Formas, tarjetas, botones y densidad:** **4 curvaturas** (*Recto*, *Suave*, *Redondeado*, *Cápsula*), **4 estilos de tarjetas** (*Con borde*, *Elevado*, *Plano tonal*, *Cristal suave*), **3 estilos de botón** (*Relleno*, *Tonal suave*, *Contorno*) y **3 densidades** (*Compacta*, *Equilibrada*, *Amplia*).
     - **06 · Portada (Hero):** **5 layouts** (*Clásico derecha*, *Foto izquierda*, *Centrado editorial*, *Banner inmersivo*, *Compacto horizontal*), **6 formas de fotografía** (*Retrato 4:5*, *Arco editorial*, *Círculo*, *Cuadrado 1:1*, *Panorámico 16:10*, *Silueta orgánica*), **6 marcos** (*Paspartú editorial*, *Limpio a sangre*, *Doble filete*, *Marco desplazado*, *Postal/Polaroid*, *Placa flotante*), visibilidad de placa de ubicación y **8 presets de copy** o titular propio.
   - El panel de administración mantiene siempre su diseño operativo legible mientras la web pública y los correos reflejan la identidad del estudio.
6. **Mi Perfil (`OwnerSettings`):**
   - 3 pasos con tracker de progreso (`01 Identidad visual`, `02 Marca y presentación`, `03 Contacto y ubicación`).
   - Carga optimizada a Firebase Storage aislado por negocio: **Logo**, **Foto de perfil** y **Foto de portada** (JPG/PNG/WebP/SVG hasta 10 MB), con restauración a ejemplos en 1 clic.
7. **Portfolio (`PortfolioManager`):**
   - Subida drag-and-drop de fotos de trabajos con título, categoría y descripción breve para mostrar en el inicio y en "Sobre mí".

#### Grupo C — Configuración avanzada
8. **Mercado Pago (`PaymentSettingsManager`):**
   - Acceso protegido por diálogo de confirmación + **modo solo lectura bloqueado por defecto** para prevenir borrados o errores accidentales.
   - Guía interactiva en **3 pasos con tracker de progreso**:
     - `01` Access Token propio (`APP_USR-` producción / `TEST-` prueba), guardado solo en servidor privado (`/private_config/integrations`), nunca reenviado completo al navegador.
     - `02` URL de Webhook dedicada del negocio (`?tenantId={tenantId}`) lista para copiar en 1 clic.
     - `03` Clave Secreta de Webhook (`x-signature`) para verificación criptográfica **HMAC**.
   - Aislamiento del Modo Demo: solo los espacios marcados `isDemo: true` pueden usar respaldo de prueba.

### 2.3 Gobierno de Plataforma (`/superadmin`) & Backend Serverless

- **Panel `/superadmin`:** Alta atómica de negocios (crea tenant, slug público, perfil inicial y dueño), pausa/reactivación instantánea, cambio de `slug` con **redirección automática del slug anterior**, gestión de miembros (`owner` / `staff`) sincronizada con Custom Claims de Auth.
- **Notificaciones Transaccionales (Resend):**
  - Remitente contextualizado (`{Nombre del Negocio} vía TurnosWeb`).
  - Diseño HTML adaptado automáticamente a la **paleta de apariencia del negocio**, su logo, ubicación, Instagram, WhatsApp y zona horaria.
  - Doble envío: comprobante completo al cliente + aviso operativo al estudio con datos de contacto.
  - Alertas críticas ante incidentes de pago (`double_payment_incident` / `late_payment_conflict`).
- **Mantenimiento Desatendido (Cloud Scheduler):**
  - **Cada 10 minutos (`releaseExpiredSlots`):** libera bloqueos `pending_payment` vencidos (15 min) respetando conflictos y **reintenta hasta 3 veces** el envío de correos pendientes.
  - **Limpieza horaria (`cleanupPastSlots`):** archiva y depura turnos pasados agrupados por negocio sin cruzar fronteras de tenant.
- **Seguridad y Calidad Verificada:** Reglas zero-trust en Firestore/Storage, proyección pública libre de PII (`/public_meta/availability`), tests unitarios y suite de integración Cross-Tenant sobre Firebase Emulators.

---

## 3. Auditoría de Brechas: Aplicación Actual vs. Artefactos Existentes

Al comparar los artefactos actuales (`docs/artifacts-src/` y `public/artifacts/`) contra la aplicación actual, se detectaron **7 brechas estratégicas** que debemos resolver al regenerar:

| # | Área | Estado en artefactos actuales | Estado real actual en la app | Acción recomendada en nuevos artefactos |
| :--- | :--- | :--- | :--- | :--- |
| 1 | **Personalización Visual & Emails** | Solo menciona brevemente *"Estética de tu estudio"* y *"Modo claro y oscuro"*. | Motor completo de Apariencia (6 pasos, 24 paletas, colores propios WCAG AA, 8 tipografías, 5 portadas Hero, 6 fondos y **emails con marca propia**). | Elevarlo a **diferenciador protagónico** en Card Front, PDF Page 1 y PDF Page 2. |
| 2 | **Posicionamiento de Rubro** | Muy enfocado a femenino/estética (*"tus clientas"*, *"Estética, belleza & estudios profesionales"*). | Plataforma multirrubro real (estética, barberías, spa, salud/clínico, pilates, estudios), conservando calidez editorial como estética bandera. | Mantener el ejemplo visual aspiracional (estética/estudio) pero usar copy inclusivo (*"tus clientes"*, *"estudios y profesionales"*) que abra ventas a más rubros sin perder elegancia. |
| 3 | **Cobro Directo en Mercado Pago Propio** | Dice *"Integración directa con tu cuenta de Mercado Pago"*, pero no enfatiza la autogestión segura ni la protección criptográfica HMAC. | Cada negocio conecta sus propias credenciales con protección HMAC y dinero 100% directo a su cuenta, sin comisiones de plataforma. | Destacar **"Cobros directo a tu Mercado Pago (0% comisión por turno)"** y respaldo anti-errores. |
| 4 | **Experiencia de Agenda y Servicios** | Menciona *"agenda diaria cronológica"* y *"carga masiva"*, pero no refleja la línea de tiempo con huecos libres/turnos en curso ni el editor con vista previa y extras inline. | Línea de tiempo diaria inteligente + calculadora interactiva de presupuestos + strips deslizables + carga masiva con resumen en vivo. | Refinar viñetas en PDF Page 1 y Page 2 con lenguaje concreto y tangible de alto valor. |
| 5 | **Arquitectura SaaS / Escalabilidad** | No refleja la madurez técnica real (aislamiento por negocio, URL propia dedicada, mantenimiento cada 10 min, reintento automático de emails). | SaaS multi-tenant con URL dedicada `/:negocio`, cron cada 10 min, reintento de emails e incidentes de pago protegidos. | Incorporar credibilidad técnica (sin jerga pesada) en PDF Page 2 ("Detalles y respaldo"). |
| 6 | **Inconsistencia de Paleta CSS** | `cards.css` usa `#F5EFE6` / `#8F3D4B` / `#241F1E`, mientras `shared.css` y la app usan `#f1e9dc` / `#9e4f5e` / `#231c19`. | La app oficial (`variables.css`) define Rosa Editorial (`#9e4f5e`) sobre Crema Cálida (`#f1e9dc`) y Superficie Marfil (`#faf5ec`). | Unificar tokens en `01-design-system-and-css-spec.md` manteniendo un único sistema coherente (con variantes explícitas y justificadas solo donde el contraste de soporte lo exige). |
| 7 | **Organización de Carpetas y Scripts** | `docs/artifacts-src/` mezcla `.mjs`, `.css`, `.json` y `.html` compilados en un solo directorio plano; no hay script en `package.json`. | `public/artifacts/` se publica vía Firebase Hosting (slug reservado `'artifacts'` en `src/config/tenantConstants.ts`). | Reorganizar en `/artifacts/` (fuente + definiciones) y salida limpia y predecible (ver Sección 4). |

---

## 4. Propuesta de Organización Más Clara de Carpetas (Plan sin Aplicar Todavía)

### 4.1 Diagnóstico de la estructura actual
```text
docs/artifacts-src/                          # ❌ Mezcla generadores, CSS, datos y HTML generados
├── build-artifacts.mjs
├── business-card-turnosweb-back.html        # ❌ HTML compilado mezclado con fuente
├── business-card-turnosweb-front.html       # ❌ HTML compilado mezclado con fuente
├── cards.css
├── cards.mjs
├── pages.mjs
├── qr-matrix.json
├── shared.css
├── turnosweb-a4-caracteristicas.html        # ❌ HTML compilado mezclado con fuente
├── turnosweb-a4-plan-y-precios.html         # ❌ HTML compilado mezclado con fuente
└── turnosweb-dossier-comercial.html         # ❌ HTML compilado mezclado con fuente

public/artifacts/                            # ⚠️ Mezcla PDFs y PNGs A4 en el mismo nivel + subcarpeta cards/
├── cards/
│   ├── business-card-turnosweb-back.png
│   └── business-card-turnosweb-front.png
├── turnosweb-a4-caracteristicas.pdf
├── turnosweb-a4-caracteristicas.png
├── turnosweb-a4-plan-y-precios.pdf
├── turnosweb-a4-plan-y-precios.png
└── turnosweb-dossier-comercial.pdf
```

### 4.2 Estructura Propuesta (Limpia, Modular y Orientada a Regeneración Rápida)

> **Nota importante de despliegue:** En `src/config/tenantConstants.ts`, `'artifacts'` es un slug reservado para que Vite copie `public/artifacts/` hacia `dist/artifacts/` y Firebase Hosting sirva los archivos públicamente en `https://turneado.app/artifacts/...`. Por eso se propone separar **fuente y definiciones** en `/artifacts/` y **archivos publicados** en `public/artifacts/` (o espejo automático en `artifacts/output/` si se prefiere desacoplar del hosting).

```text
artifacts/
├── definitions/                                      # ✅ YA CREADO — Fuente de verdad (specs, copy, layout, CSS)
│   ├── 00-app-analysis-and-folder-architecture.md
│   ├── 01-design-system-and-css-spec.md
│   ├── 02-business-card-front.md
│   ├── 03-business-card-back.md
│   ├── 04-pdf-page-1-quick-view.md
│   └── 05-pdf-page-2-details.md
│
├── src/                                              # Código fuente limpio del generador (fase posterior)
│   ├── config/
│   │   ├── brand.mjs                                 # Links, contacto, autor, precios configurables
│   │   ├── icons.mjs                                 # Biblioteca SVG centralizada + isotipos
│   │   └── qr.mjs                                    # Generador SVG a partir de qr-matrix.json
│   ├── data/
│   │   ├── qr-matrix.json                            # Matriz QR 29x29 verificada
│   │   ├── business-card.copy.mjs                    # Textos estructurados Front & Back
│   │   └── pdf-dossier.copy.mjs                      # Textos estructurados Page 1 & Page 2 + precios
│   ├── styles/
│   │   ├── tokens.css                                # Tokens maestros unificados (:root)
│   │   ├── business-card.css                         # Estilos exclusivos 16:9 (Front & Back)
│   │   └── pdf-a4.css                                # Estilos exclusivos A4 (Page 1 & Page 2 + @media print)
│   ├── templates/
│   │   ├── layouts.mjs                               # Envoltorios HTML (Google Fonts + CSS)
│   │   ├── business-card-front.mjs
│   │   ├── business-card-back.mjs
│   │   ├── pdf-page-1-quick-view.mjs
│   │   └── pdf-page-2-details.mjs
│   └── build.mjs                                     # CLI: --only=all|cards|pdf --keep-html
│
└── .tmp/                                             # (gitignored) HTML intermedios solo durante el build

public/artifacts/                                     # Salidas finales listas para web, WhatsApp e imprenta
├── business-cards/
│   ├── turnosweb-card-front.png                      # 3200x1800 px (@2x de 1600x900)
│   ├── turnosweb-card-back.png                       # 3200x1800 px (@2x de 1600x900)
│   └── turnosweb-card-print.pdf                      # (Opcional) 2 páginas frente/dorso para imprenta
├── pdf/
│   ├── turnosweb-dossier-comercial.pdf               # Dossier completo A4 (2 páginas: Quick View + Details)
│   ├── turnosweb-page-1-quick-view.pdf               # Hoja suelta A4 Página 1
│   └── turnosweb-page-2-details.pdf                  # Hoja suelta A4 Página 2
└── images/
    ├── turnosweb-page-1-quick-view.png               # 2480x3508 px (@2x A4) para enviar por WhatsApp/IG
    └── turnosweb-page-2-details.png                  # 2480x3508 px (@2x A4) para enviar por WhatsApp/IG
```

### 4.3 Ventajas de la nueva arquitectura
1. **Edición de precios/textos en 10 segundos:** Todo el copy y los montos (`monthlyPrice`, `setupPrice`, `whatsappDisplay`, `demoUrl`) viven en `artifacts/src/config/brand.mjs` y `artifacts/src/data/*.copy.mjs`, desacoplados del HTML y CSS.
2. **Cero contaminación de HTML compilados:** Los `.html` temporales viven en `artifacts/.tmp/` (ignorados por Git) en vez de ensucian el código fuente.
3. **Un solo sistema de tokens CSS:** `tokens.css` es la fuente única de colores y tipografías para Business Cards y PDFs A4, eliminando divergencias visuales.
4. **Regeneración selectiva vía npm scripts (propuestos para la fase de implementación):**
   - `npm run artifacts:build` → regenera todo (Business Cards + PDFs + PNGs).
   - `npm run artifacts:cards` → regenera solo frente y dorso de la Business Card.
   - `npm run artifacts:pdf` → regenera solo el dossier PDF y sus imágenes A4.
5. **Compatibilidad con enlaces ya compartidos:** Antes de eliminar `docs/artifacts-src/` y renombrar archivos en `public/artifacts/`, verificar si algún enlace externo apunta a los nombres previos (`turnosweb-dossier-comercial.pdf` se mantiene idéntico; para `cards/` se puede confirmar si reemplazar o mantener alias).
