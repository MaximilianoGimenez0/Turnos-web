# 14 — Landing Comercial, Centro de Ayuda, Tarjetas de Negocio y Placa PNG de Turnos para Instagram

> **Estado:** Listo para revisión y ejecución  
> **Prioridad:** Media (expansión comercial, autoservicio de soporte y herramientas de difusión para tenants)  
> **Ámbito:** Rutas institucionales (`src/App.tsx`, `src/config/tenantConstants.ts`, `functions/src/tenantContext.ts`, `scripts/cli/commands/init.mjs`), Landing de producto (`src/pages/Landing/`), Centro de Ayuda (`src/pages/Help/`), Kit de Difusión en Admin (`src/components/admin/BusinessCardGenerator/` y `src/components/admin/InstagramScheduleGenerator/`), Navegación/Footer (`Footer.tsx`, `AdminView.tsx`), Auditoría de tarjetas comerciales (`artifacts/src/`) y Tests unitarios.  
> **TODO cubierto:** [comercial-landing-ayuda-tarjetas-y-pdfs.md](../artifacts/todo/comercial-landing-ayuda-tarjetas-y-pdfs.md) *(excluyendo comprobantes PDF descargables, pospuestos explícitamente, e incorporando generador de placas PNG de turnos disponibles para Instagram)*.

---

## 1. Objetivos y Alcance

### Principio arquitectónico clave: **0 impacto en backend**
Todas las funcionalidades de esta especificación operan **100% en el frontend**:
- **0 llamadas adicionales a Cloud Functions.**
- **0 lecturas adicionales a Cloud Firestore.**
- **Carga diferida (`React.lazy`):** la Landing (`/`), el Centro de Ayuda (`/ayuda`) y el generador de tarjetas se cargan en chunks separados para no incrementar el peso inicial de las agendas públicas (`/:tenantSlug`).

### Qué incluye esta especificación
1. **Landing Oficial de Producto (`/`):** vista institucional comercial de **Turneado** reemplazando el redirect automático `/` → `/demo`, manteniendo `/demo` como demostración interactiva en vivo.
2. **Centro de Ayuda (`/ayuda` y alias `/help`):** base de conocimiento estática con pestañas por audiencia (*Para negocios y profesionales* / *Para clientes*), buscador en tiempo real, acordeón categorizado y contacto directo a soporte.
3. **Reserva de slugs institucionales:** incorporación de `'ayuda'` y `'help'` en `RESERVED_TENANT_SLUGS` (frontend, backend y CLI) para prevenir colisiones con rutas de tenants.
4. **Generador de Tarjeta de Presentación y QR para Tenants (en `AdminView`):** herramienta 100% client-side para que cada negocio previsualice y descargue su propia tarjeta (frente/dorso en PNG alta resolución vía Canvas nativo) con su logo, paleta de `appearance`, datos de contacto y QR directo a `https://turneado.app/:tenantSlug`.
5. **Generador de Placa PNG de Turnos Disponibles para Instagram (Día / Semana / Mes):** herramienta 100% client-side en `AdminView` que transforma los turnos disponibles ya cargados en memoria en una imagen PNG lista para publicar en Instagram Stories (`1080×1920`, 9:16) o Feed (`1080×1350`, 4:5), con diseño editorial tipo calendario estilizado dinámicamente con los colores, tipografías, bordes y modo visual (`appearance`) de cada negocio.
6. **Auditoría de Tarjetas Comerciales de Turneado (`artifacts/src/`):** verificación de resolución (`3200×1800 @2x`), validez del QR (`https://turneado.app`) y consistencia visual/copy tras el rebranding.
7. **Integración en navegación:** enlaces limpios hacia `/` y `/ayuda` desde `Footer`, Landing y panel Admin.

### Qué queda explícitamente fuera de alcance
- **Generación y descarga de comprobantes PDF de turnos confirmados (`src/utils/pdfGenerator.ts`, `jsPDF` en `PaymentSuccess` y `AdminView`):** pospuesto por decisión de producto para mantener la arquitectura simple y sin dependencias pesadas; los comprobantes vigentes continúan siendo la pantalla `PaymentSuccess` y los correos transaccionales vía Amazon SESv2.
- **Formularios de registro automático / alta self-service con suscripción recurrente:** el alta comercial desde la Landing redirige a contacto directo (WhatsApp / email) y al `/demo` interactivo; la creación de tenants sigue centralizada en `/superadmin`.
- **CMS o almacenamiento en Firestore para artículos de ayuda:** el contenido del Centro de Ayuda vive versionado en `src/texts/pages/Help.ts`.

---

## 2. Topología de Rutas y Slugs Reservados

### 2.1 Cambios en [`src/App.tsx`](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/App.tsx)
```text
/                       -> LandingView (lazy) — portada comercial de Turneado
/ayuda                  -> HelpView (lazy) — Centro de Ayuda institucional
/help                   -> <Navigate to="/ayuda" replace />
/superadmin/login       -> SuperAdminLogin (sin cambios)
/superadmin             -> SuperAdminView (sin cambios)
/:tenantSlug/*          -> TenantShell (sin cambios; /demo sigue siendo la demo en vivo)
```

### 2.2 Slugs reservados (3 fuentes sincronizadas)
Agregar `'ayuda'` y `'help'` en:
1. [`src/config/tenantConstants.ts`](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/config/tenantConstants.ts) (`RESERVED_TENANT_SLUGS`)
2. [`functions/src/tenantContext.ts`](file:///d:/Projects/Portfolio%20personal/Turnos-web/functions/src/tenantContext.ts) (`RESERVED_TENANT_SLUGS`)
3. [`scripts/cli/commands/init.mjs`](file:///d:/Projects/Portfolio%20personal/Turnos-web/scripts/cli/commands/init.mjs) (`RESERVED_SLUGS`)

---

## 3. Feature A — Landing Oficial de Producto (`/`)

### 3.1 Archivos nuevos
- `src/pages/Landing/LandingView.tsx`
- `src/pages/Landing/LandingView.module.css`
- `src/texts/pages/Landing.ts` (exportado desde `src/texts/index.ts`)

### 3.2 Identidad visual y estructura de secciones
Diseñada con la paleta editorial propia de Turneado (`--bg-main`, `--bg-surface`, `--color-primary`, `--font-display` Cormorant Garamond + `--font-sans`), compatible con modo claro y oscuro (`ThemeSwitcher`):

1. **Navbar institucional fija/limpia:**
   - Marca **Turneado** (monograma `/favicon.svg` + wordmark).
   - Enlaces de navegación: `Beneficios`, `Cómo funciona`, `Planes`, `Ayuda` (`/ayuda`).
   - Acciones: `ThemeSwitcher` + CTA `Probar Demo` (`/demo`).
2. **Hero Comercial:**
   - Propuesta de valor multirrubro clara: *"Turnos online con seña automática, sin idas y vueltas por mensaje."*
   - Subtítulo enfocado en cualquier negocio de servicios (estudios, consultorios, barberías, bienestar, asesorías, talleres, estética).
   - CTAs: botón primario **`Probar Demo en vivo`** (`/demo`) y botón secundario **`Hablar por WhatsApp`** (`https://wa.me/5491140675852` con mensaje prellenado).
   - **Vista previa editorial:** composición limpia que muestra la experiencia real del cliente (agenda en vivo + tarjeta de turno con seña y badge de horario) y el control del backoffice, usando componentes/estilos propios sin imágenes externas pesadas.
3. **Beneficios Principales (4 pilares):**
   - **Señas directo a tu Mercado Pago (0% comisión extra):** credenciales privadas por negocio y verificación criptográfica HMAC.
   - **Agenda 24/7 sin superposiciones:** motor automático de conflictos por duración de servicios y bloqueo temporal de 15 min durante el pago.
   - **Personalización visual real:** editor en vivo con paletas, tipografías, portadas y vista previa en desktop y mobile.
   - **Comprobantes automáticos por email:** confirmación instantánea al cliente y al negocio con tu marca y zona horaria.
4. **Cómo funciona (3 pasos):**
   - `01` Activás tu espacio (`turneado.app/tu-negocio`) y cargás servicios y horarios.
   - `02` Compartís tu enlace o tarjeta QR en Instagram, WhatsApp o tu local.
   - `03` Tus clientes eligen horario, pagan la seña y el turno queda confirmado automáticamente.
5. **Plan Transparente (alineado a `artifacts/src/config/brand.mjs`):**
   - Tarjeta única clara sin letras chicas:
     - **Suscripción mensual:** `$18.000 / mes`
     - **Puesta en marcha única:** `$25.000` *(incluye configuración inicial, dominio `/tu-negocio`, conexión de Mercado Pago y personalización)*
     - Lista de incluidos (turnos ilimitados, 0% comisión por reserva, emails automáticos, editor de apariencia, soporte directo).
     - CTA **`Solicitar alta por WhatsApp`** + enlace secundario **`Explorar Demo`**.
6. **FAQ Resumido (4–5 preguntas clave):**
   - Acordeón limpio con botón **`Ver todas las preguntas en el Centro de Ayuda`** → `/ayuda`.
7. **Footer Institucional:**
   - Reutiliza/extiende [`Footer.tsx`](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/common/Footer/Footer.tsx) con enlaces a `/`, `/demo` y `/ayuda`.

---

## 4. Feature B — Centro de Ayuda (`/ayuda`)

### 4.1 Archivos nuevos
- `src/pages/Help/HelpView.tsx`
- `src/pages/Help/HelpView.module.css`
- `src/texts/pages/Help.ts` (exportado desde `src/texts/index.ts`)

### 4.2 Funcionalidad y experiencia
- **Barra superior:** enlace de retorno (`← Volver a Turneado` a `/` o `← Volver a la agenda` si viene con `location.state.from`), acceso a `/demo` y `ThemeSwitcher`.
- **Buscador instantáneo:** filtra preguntas y respuestas en tiempo real por título, contenido y etiquetas (`aria-label`, botón limpiar búsqueda y estado vacío claro con CTA a soporte).
- **Selector de audiencia (Tabs accesibles `role="tablist"`):**
  - **Para Negocios y Profesionales:**
    - *Primeros pasos:* cómo ingresar a `/:slug/admin`, completar perfil/logo/ubicación y compartir el enlace.
    - *Mercado Pago y cobros:* cómo obtener Access Token, registrar la URL de Webhook y la clave secreta HMAC en Mercado Pago Developers.
    - *Servicios, turnos y recargos:* cómo cargar servicios con adicionales, publicar turnos en lote, configurar recargos en feriados/horarios especiales y asignar turnos manualmente.
    - *Apariencia y difusión:* cómo personalizar colores/portada en vivo y descargar la tarjeta QR del negocio.
  - **Para Clientes:**
    - *Reservas y horarios:* cómo buscar fechas/servicios y elegir adicionales.
    - *Seña y pagos:* cómo funciona el bloqueo temporal de 15 minutos, medios de pago en Mercado Pago y cómo se abona el saldo presencial restante.
    - *Confirmación y cambios:* dónde llega el comprobante por email, qué hacer si el pago queda pendiente y cómo reprogramar o cancelar (aviso de 24 hs).
- **Acordeón categorizado:** accesible por teclado (`button` nativo, `aria-expanded`, `aria-controls`).
- **Tarjeta de Soporte Directo:** al pie de la página, botones de contacto directo por WhatsApp y correo electrónico.
- **Puntos de entrada:** enlace discreto `Ayuda` (`/ayuda`) en [`Footer.tsx`](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/common/Footer/Footer.tsx), en el Navbar de la Landing y en el menú del panel `AdminView`.

---

## 5. Feature C — Tarjetas de Presentación del Negocio (Generador en Admin + Auditoría)

### 5.1 Generador en `AdminView` (100% client-side, 0 backend)
- **Ubicación:** nuevo módulo `src/components/admin/BusinessCardGenerator/` integrado como acción/sección accesible dentro de `AdminView` (junto a *Mi Perfil* / `OwnerSettings` o en el menú de configuración bajo **"Tarjeta y QR"**).
- **Archivos nuevos:**
  - `src/components/admin/BusinessCardGenerator/BusinessCardGenerator.tsx`
  - `src/components/admin/BusinessCardGenerator/BusinessCardGenerator.module.css`
  - `src/utils/qrGenerator.ts` *(generador QR ligero en cliente sin dependencias pesadas o usando librería mínima `qrcode` / matriz SVG/Canvas)*
  - `src/texts/components/admin/BusinessCardGenerator.ts`
- **Datos consumidos (ya disponibles en memoria desde `useTenant` y `useOwnerInfo`):**
  - `businessName`, `role`, `location`, `phone`, `instagram`, `logoUrl`, `slug` (`https://turneado.app/${slug}`) y colores resueltos de `appearance` (`primary`, `surface`, `ink`).
- **Funcionalidades:**
  - **Vista previa en vivo Frente y Dorso** (proporción estándar `16:9` / tarjeta comercial `85×55 mm`):
    - *Frente:* logo del negocio (o monograma fallback), nombre comercial, especialidad/rol y acento de marca del tenant.
    - *Dorso:* código QR nítido apuntando a `https://turneado.app/${slug}`, URL legible, ubicación, WhatsApp e Instagram.
  - **Selector de estilo:** variante *Clara editorial* y variante *Oscura / Acento* (derivadas automáticamente de la paleta del tenant).
  - **Acciones rápidas:**
    - **Copiar enlace público** (`https://turneado.app/${slug}`).
    - **Descargar Frente (PNG @2x)** y **Descargar Dorso con QR (PNG @2x)** renderizados con Canvas nativo (`1600×900` o `1700×1100 px`), con manejo seguro de CORS para logos externos (si el logo no permite canvas export, hace fallback limpio al monograma tipográfico sin error).
    - **Descargar solo QR (PNG)** con margen silencioso (*quiet zone*) listo para imprimir en mostrador o pegar en historias.

### 5.2 Auditoría de tarjetas comerciales de Turneado (`artifacts/src/`)
- Verificar que `npm run artifacts:cards` genere sin errores `public/artifacts/business-cards/turneado-card-front.png`, `turneado-card-back.png` y `turneado-card-print.pdf`.
- Confirmar visualmente resolución `3200×1800 px`, legibilidad del QR hacia `https://turneado.app`, contraste y consistencia de copy/precios con la Landing (`/`).

---

## 6. Feature D — Generador de Placa PNG de Turnos Disponibles para Instagram (Día / Semana / Mes)

### 6.1 Propósito y consumo cero de backend
Permitir que cualquier negocio genere en 1 clic una imagen estética lista para subir a **Instagram Stories** (o Feed) con sus turnos disponibles del **día**, la **semana** o el **mes**, reflejando fielmente su identidad visual configurada en `AppearanceSettings`.

- **0 llamadas a Cloud Functions y 0 lecturas extras de Firestore:** reutiliza los `slots` que `AdminView` ya tiene sincronizados (y usa `fetchAllSlotsOnce` únicamente si el usuario elige un rango fuera del scope actualmente cargado, o reutiliza el rango visible), filtrando con `filterClientAvailableSlots` (`status === 'available'` y horarios futuros en el `timezone` del tenant).
- **Renderizado 100% client-side con Canvas nativo** esperando `document.fonts.ready` para que se apliquen las fuentes reales configuradas por el negocio (`--font-display` y `--font-sans`).

### 6.2 Archivos nuevos
- `src/components/admin/InstagramScheduleGenerator/InstagramScheduleGenerator.tsx`
- `src/components/admin/InstagramScheduleGenerator/InstagramScheduleGenerator.module.css`
- `src/utils/instagramScheduleCanvas.ts` *(motor puro de composición y dibujo en Canvas + helpers de agrupación por día/semana/mes)*
- `src/texts/components/admin/InstagramScheduleGenerator.ts`

### 6.3 Adaptación dinámica a la apariencia de cada negocio (`TenantAppearanceConfig`)
La placa hereda automáticamente las preferencias visuales guardadas en `appearance` (resueltas vía `resolveTenantTheme` en `src/services/themeEngine.ts`):
- **Paleta y modo (`palettePreset`, `customPrimaryHex`, `customAccentHex`, `customBackgroundHex`, `surfaceTemperature`, `defaultMode`):**
  - Fondo de la placa usando `--bg-main` con tratamiento sutil según `backgroundStyle` (sólido editorial, gradiente radial suave con `--color-primary-light`, o trama minimalista).
  - Números de fecha, acentos, flechas `» «` y día destacado en `--color-primary`.
  - Tarjetas de filas/celdas con `--bg-surface` y borde `--border-medium` / `--border-subtle`.
  - Tipografía de título y horarios en `--text-primary` y abreviatura de día en `--text-muted` / `--color-primary` con opacidad controlada.
  - Toggle rápido en el generador para alternar entre versión **Clara** y **Oscura** de su propia paleta antes de exportar.
- **Tipografías (`fontPairing`):** usa la fuente display del negocio (en itálica para el nombre del mes y regular/light para `TURNOS`) y la fuente sans del negocio para `DISPONIBLES`, horarios y pie.
- **Geometría (`shapePreset`):** traduce `sharp` / `soft` / `rounded` / `pill` a radios proporcionales en las filas y tarjetas del calendario dentro del Canvas.

### 6.4 Períodos, formatos y composición visual (inspirada en plantilla editorial de calendario)
- **Formatos exportables:**
  - **Instagram Story (default):** `1080 × 1920 px` (9:16) — respetando márgenes seguros arriba (`220px`) y abajo (`220px`) para que la UI de Instagram (avatar superior / caja de respuesta inferior) nunca tape el título ni el CTA.
  - **Post / Feed (opcional):** `1080 × 1350 px` (4:5).
- **Selector de alcance temporal:**
  1. **Día (`day`):** selector de fecha específica (default: hoy o el próximo día con turnos disponibles). Muestra una ficha central protagonista con el número y día grande (`02 · LUNES`), todos los horarios en cápsulas ordenadas y el título *"TURNOS DE HOY"* / *"TURNOS DISPONIBLES"*.
  2. **Semana (`week` — diseño principal tipo referencia):** selector de semana (actual o siguiente).
     - **Cabecera:** nombre del mes en display itálica/acento (ej. *Noviembre*) + `TURNOS` grande + `DISPONIBLES` con tracking amplio.
     - **Filas por día (hasta 7 días con disponibilidad):** tarjetas horizontales apiladas con borde fino:
       - Izquierda: número del día grande en color primario (`02`) + abreviatura (`LUN`, `MAR`, `MIE`, `JUE`, `VIE`, `SAB`, `DOM`).
       - Derecha: horarios disponibles separados por `|` (`11:30 | 12:00 | 15:00 | 17:00`), con ajuste automático a 2 líneas si un día supera 5 horarios.
     - **Pie:** `» RESERVÁ AHORA «` + `turneado.app/:slug` (y opcionalmente nombre comercial / `@instagram` o mini-logo activables con checkboxes).
  3. **Mes (`month`):** selector de mes (actual o siguiente) con **dos vistas elegibles**:
     - **Grilla Calendario Mensual (7 columnas L–D):** muestra el mes completo en formato almanaque; los días con turnos disponibles se destacan con relleno/borde del color primario del negocio y contador de horarios (o primeros horarios), ideal para mostrar disponibilidad general del mes en una sola placa.
     - **Lista Paginada por Bloques (hasta 6 días por placa):** divide los días disponibles del mes en láminas (`1/2`, `2/2`, etc.) con el mismo diseño limpio de filas horizontales para subir como carrusel o varias historias seguidas sin amontonar texto.
- **Estado vacío claro:** si el período elegido no tiene turnos disponibles, se muestra un aviso amigable en la vista previa con atajo directo para cambiar de período o publicar turnos.
- **Acciones:**
  - Vista previa en vivo escalada dentro del panel.
  - Botón **`Descargar PNG`** (`turnos-disponibles-<slug>-<periodo>.png`).
  - *(Opcional en mobile/navegadores compatibles)* botón **`Compartir`** vía `navigator.share` con el archivo PNG generado.

### 6.5 Integración en `AdminView`
- Agrupar **Tarjeta y QR** (Feature C) y **Placa para Instagram** (Feature D) dentro de una sección coherente de **Difusión / Compartir** en `AdminView`, y añadir además un acceso rápido **"Placa Instagram"** en la barra de la vista de Turnos (`slots`).

---

## 7. Plan de Ejecución y Criterios de Validación

### Orden recomendado de implementación
1. **Slugs reservados y routing base:** actualizar `RESERVED_TENANT_SLUGS` en frontend, Functions y CLI; registrar `/` y `/ayuda` (`/help`) en `src/App.tsx`.
2. **Centro de Ayuda (`/ayuda`):** crear `HelpView`, textos categorizados, buscador y enlace en `Footer.tsx`.
3. **Landing Oficial (`/`):** crear `LandingView`, textos comerciales, secciones responsive y enlaces hacia `/demo` y `/ayuda`.
4. **Kit de Difusión en `AdminView` (Tarjeta/QR + Placa PNG de Turnos para Instagram):**
   - Crear `qrGenerator.ts` y `BusinessCardGenerator`.
   - Crear `instagramScheduleCanvas.ts` y `InstagramScheduleGenerator` (Día, Semana y Mes con calendario + lista paginada, respetando colores, fuentes y formas de `appearance`).
   - Integrar ambos en `AdminView` y auditar `artifacts/src/` (`npm run artifacts:cards`).
5. **Tests y verificación integral:**
   - Tests unitarios para slugs reservados (`ayuda`, `help`), filtrado/búsqueda del Centro de Ayuda, generación de matriz QR y lógica pura de agrupación de turnos por día/semana/mes + paginación para Instagram (`tests/unit/instagramSchedule.test.ts`).
   - Actualizar cualquier test que asuma que `/` redirige a `/demo` (si existiera).

### Criterios de aceptación
- [ ] `npx tsc -b`, `npm run lint`, `npm --prefix functions run build` y `npm run build` en verde sin errores.
- [ ] `npm test` (unitarios) y `npm run test:integration` (emuladores) 100% en verde.
- [ ] `/` carga `LandingView` sin realizar ninguna consulta a Firestore ni Cloud Functions.
- [ ] `/ayuda` (y `/help` → `/ayuda`) funciona con pestañas, búsqueda en tiempo real y acordeón en desktop y mobile sin consultas a Firestore.
- [ ] `/demo` sigue operando normalmente como demo interactiva desde los CTAs de la Landing.
- [ ] En `/:slug/admin`, el negocio puede previsualizar su tarjeta Frente/Dorso con QR válido hacia `https://turneado.app/:slug` y descargar los PNGs correctamente.
- [ ] En `/:slug/admin`, el negocio puede generar y descargar el PNG de turnos disponibles para **Día**, **Semana** y **Mes** (grilla calendario y lista paginada) en formato Instagram Story (`1080×1920`) y Feed (`1080×1350`), reflejando automáticamente su paleta, tipografía y estilo de `appearance`.
- [ ] Intentar crear un tenant con slug `ayuda` o `help` es rechazado por validación en frontend y backend.
