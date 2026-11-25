# 09 — Editor de Apariencia: Doble Scroll Independiente, Preview Flotante Mobile e Insignias de Confianza en Vivo

## 1. Objetivos y Alcance

### Problema que resuelve
Tras la implementación de la Spec 08 ([08-appearance-engine-hardening-and-expansion.md](file:///d:/Projects/Portfolio%20personal/Turnos-web/specs/08-appearance-engine-hardening-and-expansion.md)), el editor de apariencia ([AppearanceSettings.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/admin/AppearanceSettings/AppearanceSettings.tsx)) y su vista previa en vivo ([AppearanceLivePreview.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/admin/AppearanceSettings/AppearanceLivePreview.tsx)) presentan tres fricciones de uso concretas:

1. **Acoplamiento de scroll en Desktop (`> 1120px`):** `.editorGrid` en [AppearanceSettings.module.css](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/admin/AppearanceSettings/AppearanceSettings.module.css#L124-L128) usa `align-items: start` sin restricción de altura y `.previewColumn` usa `position: sticky; top: 76px;` sin `overflow-y: auto`. Al superar la preview el alto del viewport (con Navbar, Hero, `SlotCard`, Portfolio, Formulario, WhatsApp y Email Card), recorrerla obliga a hacer scroll global sobre toda la ventana, arrastrando también las opciones fuera de cuadro.
2. **Preview inaccesible en Mobile y Tablet (`<= 1120px`):** cuando `.editorGrid` colapsa a 1 columna, `.previewColumn` cae al final de todas las configuraciones. Para comprobar cómo impacta un cambio de color, tipografía o diseño, la persona administradora debe bajar múltiples pantallas y volver a subir cada vez.
3. **Toggle `heroShowTrustPills` invisible en la vista previa:** alternar *"Mostrar insignias de confianza en la portada"* en [HeroAndStorefrontSection.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/admin/AppearanceSettings/sections/HeroAndStorefrontSection.tsx#L330-L342) actualiza correctamente la web pública ([ClientHero.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/client/ClientHero/ClientHero.tsx#L78-L93)), pero [AppearanceLivePreview.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/admin/AppearanceSettings/AppearanceLivePreview.tsx#L238-L317) todavía no renderiza esas insignias en la portada ni en el comparador **Borrador vs. Publicado**.

### Qué incluye esta especificación
- **Encuadre completo en `100dvh` y doble scroll independiente en Desktop (`min-width: 1121px`):**
  - El workspace completo de Apariencia (cabecera, pestañas, ambas columnas con scroll y pie con acciones **Guardar apariencia / Descartar / Restaurar**) se ajusta exactamente a la altura disponible de `100dvh` sin provocar scroll externo en `window`.
  - Dos paneles con scroll propio, independiente y contenido (`overscroll-behavior: contain`): uno exclusivo para las configuraciones (`.controlsColumn`) y otro exclusivo para la vista previa (`.previewColumn`).
  - Cabecera fija (`.previewHeader`) dentro del scroll de `.previewColumn` para alternar **Borrador / Publicado** y **Claro / Oscuro** desde cualquier altura de la vista previa.
  - Eliminación de `.stickySaveBar` en desktop (`> 1120px`), ya que `.footer` y `.header` permanecen visibles de forma continua dentro del marco de `100dvh`.
- **Vista previa flotante casi a pantalla completa y botón flotante toggle en `<= 1120px`:**
  - Portal seguro sobre el contenedor raíz de [AdminLayout.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/layouts/AdminLayout/AdminLayout.tsx) para escapar del contexto `transform` de `.viewTransitionBox` en [AdminView.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/pages/AdminView/AdminView.tsx#L999-L1006) sin perder las CSS custom properties propias del panel Admin.
  - Botón flotante toggle en esquina inferior derecha (*"Ver preview"* / *"Ocultar preview"*) con posicionamiento inteligente por encima de `.stickySaveBar` cuando existen cambios sin guardar.
  - Panel flotante casi full-screen (`calc(100vw - 16px)` × `calc(100dvh - 16px)` en mobile, centrado amplio en tablet) con cabecera fija (controles + cierre `X`), cuerpo scrolleable independiente y bloqueo del scroll de fondo mientras esté abierto.
- **Reflejo en vivo de `heroShowTrustPills` en `AppearanceLivePreview`:**
  - Renderizado condicional de las 3 insignias de confianza reales (`CLIENT_VIEW_TEXTS.trustPills`) en todas las variantes de Hero de la preview (`split-right`, `split-left`, `centered`, `minimal-compact` y `overlay-banner`), respetando contraste sobre el scrim oscuro y alineación centrada cuando `heroLayout === 'centered'`.

### Qué queda explícitamente fuera de alcance
- Cambios en las vistas públicas (`ClientView`, `About`, `Prices`) o en Cloud Functions / `firestore.rules`.
- Persistencia nueva en Firestore o ampliación de `TenantAppearanceConfig` (todos los campos requeridos ya forman parte de los 31 campos vigentes de Spec 08).
- Alteración del comportamiento del `Loader` full-screen al guardar/restaurar, toast de confirmación de 5s o atajos de teclado de `useAppearanceHistory`.

---

## 2. Archivos y Recursos Afectados

### Archivos a modificar
- [`src/layouts/AdminLayout/AdminLayout.tsx`](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/layouts/AdminLayout/AdminLayout.tsx)
  - Agregar `data-admin-layout="true"` al elemento raíz `.layout` para proveer un punto de montaje de `createPortal` que herede las variables CSS del Admin y escape de ancestros con `transform`.
- [`src/layouts/AdminLayout/AdminLayout.module.css`](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/layouts/AdminLayout/AdminLayout.module.css)
  - En `@media (min-width: 1121px)` cuando `.layout:has([data-view-mode="appearance"])`, quitar el `padding-bottom: var(--space-12)` de `.mainContent` para no empujar el documento por debajo de `100dvh`.
- [`src/pages/AdminView/AdminView.tsx`](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/pages/AdminView/AdminView.tsx) y [`src/pages/AdminView/AdminView.module.css`](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/pages/AdminView/AdminView.module.css)
  - Exponer `data-view-mode={activeViewMode}` en `.dashboard`. En `min-width: 1121px` para `[data-view-mode="appearance"]`, compactar el padding superior/inferior a `var(--space-3)` (`12px`) y ajustar `.sidebarColumn` a `max-height: calc(100dvh - 88px)` para encuadrar la vista en `100dvh`.
- [`src/texts/components/admin/AppearanceSettings.ts`](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/texts/components/admin/AppearanceSettings.ts)
  - Incorporar dentro de `APPEARANCE_SETTINGS_TEXTS.preview` las etiquetas centralizadas para el modo flotante móvil (`mobileToggle`: `showLabel`, `hideLabel`, `dialogAria`, `closeAria`).
- [`src/components/admin/AppearanceSettings/AppearanceSettings.tsx`](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/admin/AppearanceSettings/AppearanceSettings.tsx)
  - Agregar `controlsColumnRef` para resetear el scroll interno al cambiar de pestaña (`activeTab`) o tras guardar/restaurar.
  - Limitar `.stickySaveBar` a viewports compactos (`isCompactViewport === true`) porque en desktop `.footer` y `.header` permanecen fijos dentro del viewport.
  - Agregar detección responsive (`isCompactViewport` via `matchMedia('(max-width: 1120px)')`), estado `mobilePreviewOpen`, manejo de tecla `Escape`, bloqueo de scroll del `body`, auto-cierre al pasar a desktop o abrir acciones bloqueantes/modales, instancia única de `<AppearanceLivePreview />` y `createPortal` para el diálogo flotante + botón toggle flotante.
- [`src/components/admin/AppearanceSettings/AppearanceLivePreview.tsx`](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/admin/AppearanceSettings/AppearanceLivePreview.tsx)
  - Soportar modo flotante (`isFloating?: boolean`, `onCloseFloating?: () => void`) con botón accesible de cierre en `.previewHeader` sin duplicar la lógica del lienzo.
  - Renderizar condicionalmente las insignias de confianza (`activeConfig.heroShowTrustPills`) usando `ShieldCheck`, `CreditCard`, `MailCheck` y `CLIENT_VIEW_TEXTS.trustPills` tanto en `overlay-banner` como en el Hero estándar.
- [`src/components/admin/AppearanceSettings/AppearanceSettings.module.css`](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/admin/AppearanceSettings/AppearanceSettings.module.css)
  - En `@media (min-width: 1121px)`, bloquear `.container` a `height: calc(100dvh - 88px); min-height: 460px;`, convertir `.card` en columna flex (`height: 100%; overflow: hidden;`), compactar `.header`, `.editorTabsBar` y `.footer` (`flex-shrink: 0`), y gobernar `.editorGrid` mediante `flex: 1; min-height: 0;` para que ambos scrolls absorban exactamente el espacio restante.
  - Reglas del overlay flotante casi full-screen (`.mobilePreviewBackdrop`, `.mobilePreviewDialog`, variante `.previewColumnFloating`), botón toggle flotante (`.mobilePreviewFab`, ajuste de `bottom` ante `[data-has-unsaved="true"]`) y estilos de `.miniTrustPills` / `.miniHeroOverlayTrustPills`.

---

## 3. Metodología de Implementación

### 3.1 Encuadre en `100dvh` y Doble Scroll Independiente en Desktop (`min-width: 1121px`)

1. **Eliminación de padding externo redundante y simetría vertical:**
   - `.topBarWrapper` mide `64px` (`60px` + bordes).
   - En `AdminLayout.module.css` (`@media (min-width: 1121px)`), `.layout:has([data-view-mode="appearance"]) .mainContent` elimina `padding-bottom: var(--space-12)`.
   - En `AdminView.module.css` (`@media (min-width: 1121px)`), `.dashboard[data-view-mode="appearance"]` aplica `padding-top: var(--space-3); padding-bottom: var(--space-3);` (`12px` + `12px` = `24px`), dejando `calc(100dvh - 88px)` libres exactos para la vista, y alinea `.sidebarColumn` (`top: calc(64px + var(--space-3)); max-height: calc(100dvh - 88px);`).
2. **Arquitectura Flex-Lock en `.container`, `.card` y `.editorGrid`:**
   - En `min-width: 1121px`:
     - `.container`: `height: calc(100dvh - 88px); min-height: 460px; gap: 0;`
     - `.card`: `flex: 1; height: 100%; min-height: 0; overflow: hidden;`
     - `.header`, `.editorTabsBar`, `.successAlertBand` y `.footer`: `flex-shrink: 0;` con padding compactado (`var(--space-2-5) var(--space-4)` en cabecera/pie y `var(--space-1-5) var(--space-4)` en tabs) para maximizar el área útil manteniendo siempre visible el botón **Guardar apariencia** en el borde inferior sin scroll externo.
     - `.editorGrid`: reemplaza la altura fija por `flex: 1; min-height: 0; height: auto; align-items: stretch; overflow: hidden;` para que Flexbox entregue exactamente el alto restante entre pestañas y pie, absorbiendo incluso la aparición temporal de `.successAlertBand`.
   - En desktop `.stickySaveBar` no se renderiza porque tanto **Deshacer/Rehacer** (en `.header`) como **Guardar apariencia / Descartar / Restaurar** (en `.footer`) permanecen visibles en todo momento.
2. **Scroll independiente 1 — Opciones (`.controlsColumn`):**
   - `height: 100%; min-height: 0; overflow-y: auto; overscroll-behavior: contain; scrollbar-gutter: stable; scrollbar-width: thin; scrollbar-color: var(--border-medium) transparent;`
   - Con `ref={controlsColumnRef}`, un `useEffect` al cambiar `activeTab` ejecuta `controlsColumnRef.current?.scrollTo({ top: 0 })` para iniciar siempre desde la parte superior de la pestaña elegida sin afectar la posición de scroll de `.previewColumn`.
   - Al completar guardar o restaurar (`pendingScrollToTopRef`), además de `window.scrollTo({ top: 0 })`, se lleva `.controlsColumn` a `top: 0` para que el aviso de éxito y la cabecera queden en cuadro.
3. **Scroll independiente 2 — Vista Previa (`.previewColumn`):**
   - Se elimina `position: sticky; top: 76px;` en la columna en favor de:
     ```css
     height: 100%;
     min-height: 0;
     overflow-y: auto;
     overscroll-behavior: contain;
     scrollbar-gutter: stable;
     scrollbar-width: thin;
     scrollbar-color: var(--border-medium) transparent;
     padding: 0 var(--space-5) var(--space-5);
     ```
   - `.previewHeader` se vuelve sticky respecto al scroll interno de `.previewColumn` (`position: sticky; top: 0; z-index: 2; background: var(--bg-surface); padding: var(--space-4) 0 var(--space-3); border-bottom: 1px solid var(--border-subtle);`), permitiendo alternar **Borrador / Publicado** y **Claro / Oscuro** mientras se inspeccionan secciones inferiores (Galería, Formulario, WhatsApp, Email).
   - `.previewCanvas` mantiene `flex-shrink: 0` y usa `overflow-x: hidden` (en lugar de `overflow: hidden` bloqueante) para que su contenido vertical se despliegue íntegro dentro del scroll de `.previewColumn` y conviva sin recorte con el scroll horizontal del carrusel `.miniPortfolioCarousel`.

---

### 3.2 Preview Flotante Casi a Pantalla Completa y Botón Toggle en Mobile (`max-width: 1120px`)

1. **Detección del breakpoint y prevención de doble instancia:**
   - En `AppearanceSettings.tsx`, `useEffect` sobre `window.matchMedia('(max-width: 1120px)')` sincroniza `isCompactViewport`.
   - Cuando `isCompactViewport === false` (desktop), `<AppearanceLivePreview />` se monta dentro de `.editorGrid` a la derecha de `.controlsColumn`.
   - Cuando `isCompactViewport === true` (mobile/tablet), `.editorGrid` colapsa a `grid-template-columns: 1fr` y **no renderiza** `.previewColumn` al pie de las opciones. En su lugar, `<AppearanceLivePreview />` se monta exclusivamente cuando `mobilePreviewOpen === true` dentro del panel flotante portaleado, eliminando el scroll muerto inferior y evitando cálculos duplicados.
2. **Portal seguro heredando el tema del Admin:**
   - `AdminLayout.tsx` agrega `data-admin-layout="true"` en `<div className={styles.layout} data-admin-layout="true">`.
   - `AppearanceSettings.tsx` resuelve el destino de `createPortal` en `document.querySelector('[data-admin-layout="true"]') ?? document.body`. Así:
     - Escapa de `<motion.div className={styles.viewTransitionBox}>` (evitando que cualquier `transform` rompa `position: fixed`).
     - Mantiene intactas las variables CSS del tema Admin (`--bg-surface`, `--bg-backdrop`, `--color-primary`, `--shadow-lg`, etc.) tanto en modo claro como en modo oscuro.
3. **Geometría del overlay flotante casi full-screen:**
   - **Backdrop (`.mobilePreviewBackdrop`):** `position: fixed; inset: 0; background: var(--bg-backdrop); z-index: var(--z-backdrop, 900); display: flex; align-items: center; justify-content: center; padding: var(--space-2);` (sube a `var(--space-4)` en `641px–1120px`). Un clic sobre el backdrop cierra el diálogo.
   - **Panel flotante (`.mobilePreviewDialog`):**
     - `role="dialog"`, `aria-modal="true"`, `aria-label={APPEARANCE_SETTINGS_TEXTS.preview.mobileToggle.dialogAria}`, `id="appearance-mobile-preview-dialog"`.
     - Ocupa casi la totalidad de la pantalla:
       - En mobile (`<= 640px`): `width: calc(100vw - var(--space-4)); height: calc(100dvh - var(--space-4));` (`8px` de respiro por lado, `border-radius: var(--radius-lg)`).
       - En tablet (`641px–1120px`): `width: min(760px, calc(100vw - var(--space-8))); height: calc(100dvh - var(--space-8));`.
     - Estructura interna en columna flex (`display: flex; flex-direction: column; overflow: hidden; background: var(--bg-surface); border: 1px solid var(--border-medium); box-shadow: var(--shadow-xl);`):
       - `AppearanceLivePreview` con `isFloating` y `onCloseFloating={() => setMobilePreviewOpen(false)}` renderiza `.previewColumnFloating` (`height: 100%; min-height: 0; padding: 0 var(--space-3-5) var(--space-4); overflow-y: auto; -webkit-overflow-scrolling: touch; overscroll-behavior: contain;`).
       - `.previewHeader` queda fijo (`position: sticky; top: 0`) arriba con título, switch **Borrador/Publicado**, switch **Claro/Oscuro** y botón cerrar (`X`) con mínimo táctil cómodo (`32px×32px`).
       - Se deja un `padding-bottom` extra en `.previewColumnFloating` (`68px`) para que el botón flotante toggle de la esquina inferior derecha nunca tape el último renglón de `.miniEmailCard` al llegar al fondo.
4. **Botón flotante toggle (mostrar / ocultar) y jerarquía de capas (`z-index`):**
   - Botón tipo pill en esquina inferior derecha (`position: fixed; right: max(var(--space-4), env(safe-area-inset-right, 0px)); bottom: max(var(--space-4), env(safe-area-inset-bottom, 0px)); min-height: 44px;`):
     - Estado cerrado (`mobilePreviewOpen === false`): muestra ícono `Eye` + `"Ver preview"`, `aria-expanded={false}`, `z-index: calc(var(--z-sticky, 100) + 10)` (`110`). Cuando `hasChanges === true`, eleva `bottom` mediante `[data-has-unsaved="true"]` a `calc(max(var(--space-4), env(safe-area-inset-bottom, 0px)) + 96px)` en `<= 640px` (`+ 64px` en `641px–1120px`) para dejar 100% despejada `.stickySaveBar`.
     - Estado abierto (`mobilePreviewOpen === true`): cambia a ícono `EyeOff` + `"Ocultar preview"`, `aria-expanded={true}`, `z-index: calc(var(--z-modal, 1000) - 20)` (`980`, por encima del panel `950` y del backdrop `900`, y siempre debajo de `AlertModal` `1000` y `Loader` `2147483647`). Al pulsarlo cierra inmediatamente sin obligar a buscar la `X` superior.
5. **Reglas de seguridad e higiene de estado:**
   - Si `mobilePreviewOpen && isCompactViewport`, `document.body.style.overflow = 'hidden'` con limpieza garantizada en unmount/cierre.
   - `window.addEventListener('keydown', ...)` cierra con `Escape` (excepto si `confirmResetOpen || Boolean(errorMessage) || saving || resetting`).
   - `useEffect` cierra automáticamente `mobilePreviewOpen` si `isCompactViewport` pasa a `false`, o si se inicia `saving || resetting`, o si se abre `confirmResetOpen`.

---

### 3.3 Reflejo en Vivo de `heroShowTrustPills` en `AppearanceLivePreview`

1. **Paridad con [ClientHero.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/client/ClientHero/ClientHero.tsx#L78-L93):**
   - `ClientHero` renderiza las insignias cuando `appearance.heroShowTrustPills === true` dentro de `renderNarrative()`, lo que aplica tanto a layouts divididos/centrados/compactos como a `overlay-banner`.
2. **Integración en [AppearanceLivePreview.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/admin/AppearanceSettings/AppearanceLivePreview.tsx):**
   - En `heroLayout === 'overlay-banner'`: debajo de `miniHeroOverlaySubtitle` (y antes o junto a `miniHeroOverlayChip`), cuando `activeConfig.heroShowTrustPills` es `true`, se renderiza `<div className={styles.miniHeroOverlayTrustPills}>` con los 3 ítems (`ShieldCheck`, `CreditCard`, `MailCheck` + textos de `CLIENT_VIEW_TEXTS.trustPills`) en versión compacta legible sobre el scrim oscuro (`rgba(255, 255, 255, 0.92)` con ícono claro).
   - En el Hero estándar (`heroLayout !== 'overlay-banner'`): dentro de `.miniHeroText`, debajo de `.miniHeroSubtitle`, cuando `activeConfig.heroShowTrustPills` es `true`, se renderiza `<div className={styles.miniTrustPills}>` con íconos en `var(--color-primary)` y texto en `var(--text-secondary)` respetando escala compacta (`0.64rem`–`0.66rem`), envolviéndose limpiamente en fila (`flex-wrap: wrap`).
   - Cuando `activeConfig.heroLayout === 'centered'`, `.miniHero[data-mini-hero-layout="centered"] .miniTrustPills` usa `justify-content: center;` para mantener la simetría visual del Hero centrado.
   - Al alternar `heroShowTrustPills` en *Portada y Tienda*, o cambiar entre **Borrador** y **Publicado**, las insignias aparecen/desaparecen instantáneamente tanto en el panel derecho de desktop como en la preview flotante móvil.

---

## 4. Estados Válidos e Invariantes

- **Invariante de encuadre `100dvh` en Desktop (`> 1120px`, alto `>= 548px`):** el editor completo (cabecera, pestañas, columnas duales y footer con acciones de guardado) entra dentro de `100dvh` sin generar barra de scroll vertical en `window` (`document.documentElement.scrollHeight <= window.innerHeight`).
- **Invariante de doble scroll en Desktop (`> 1120px`):** el desplazamiento vertical dentro de `.controlsColumn` no mueve `.previewColumn` ni viceversa (`overscroll-behavior: contain`), y `.previewHeader` permanece accesible arriba dentro de `.previewColumn` durante todo el scroll de la preview.
- **Invariante de instancia única en Mobile/Tablet (`<= 1120px`):** no coexisten dos árboles de `<AppearanceLivePreview />` montados simultáneamente en el DOM; en `<= 1120px` la preview existe solo cuando `mobilePreviewOpen === true`.
- **Invariante de no-colisión con `.stickySaveBar` y modales:** en `<= 1120px`, el botón flotante nunca tapa los botones `Deshacer`, `Descartar` o `Guardar` de `.stickySaveBar`, y su `z-index` siempre queda por debajo de `AlertModal` (`--z-modal`) y `Loader` (`2147483647`).
- **Invariante de herencia de tokens Admin:** el portal hacia `[data-admin-layout="true"]` garantiza que ni el botón flotante ni el marco del diálogo dependan de tokens públicos de `ClientView`, funcionando de forma idéntica en modo Claro y Oscuro del panel Admin.
- **Invariante de fidelidad Hero:** `AppearanceLivePreview` refleja `heroShowTrustPills` tanto en `overlay-banner` como en el resto de `HERO_LAYOUTS`, respetando contraste sobre scrim y alineación en `centered`.

---

## 5. Comprobaciones y Criterios de Aceptación

1. **Calidad estática y tests automatizados:**
   - `npm run lint` $\to$ código `0`.
   - `npm run build` $\to$ código `0` (`tsc -b && vite build`).
   - `npm test` $\to$ todos los suites unitarios pasan sin regresiones.
2. **Criterios funcionales en Desktop (`> 1120px`, ej. `1280×720`, `1366×768`, `1440×900`):**
   - Al entrar en Apariencia, la ventana principal no muestra scroll externo (`scrollHeight <= innerHeight`) y el botón **Guardar apariencia** en el footer es visible de inmediato abajo sin scrollear.
   - Scrollear `.controlsColumn` hasta el fondo (ej. pestaña *Portada y Tienda*) deja a `.previewColumn` fija en su propia posición sin moverse.
   - Scrollear `.previewColumn` hasta el correo de confirmación al fondo deja intacta la posición de `.controlsColumn`, manteniendo visible `.previewHeader` (Borrador/Publicado y Claro/Oscuro).
   - Al cambiar de pestaña (`Estilo` / `Colores` / `Tipografía` / `Portada`), el scroll de `.controlsColumn` vuelve arriba sin alterar `.previewColumn`.
3. **Criterios funcionales en Mobile/Tablet (`<= 1120px`, ej. `390×844` y `768×1024`):**
   - La preview embebida debajo de las opciones no ocupa scroll extra al pie.
   - El botón flotante *"Ver preview"* es accesible desde cualquier posición; con cambios pendientes (`hasChanges === true`), no tapa `.stickySaveBar`.
   - Al tocar *"Ver preview"*, se abre el panel flotante ocupando casi toda la pantalla (`calc(100vw - 16px)` × `calc(100dvh - 16px)` en mobile) con scroll interno suave, el fondo queda bloqueado, el botón flotante pasa a *"Ocultar preview"* y alterna cierre limpiamente (al igual que la `X`, clic en backdrop o `Escape`).
4. **Criterios de fidelidad visual en `AppearanceLivePreview`:**
   - Activar y desactivar *"Mostrar insignias de confianza en la portada"* (`heroShowTrustPills`) muestra u oculta en tiempo real las 3 insignias tanto en `split-right`/`centered` como en `overlay-banner`, así como al alternar entre **Borrador** y **Publicado actual**.
