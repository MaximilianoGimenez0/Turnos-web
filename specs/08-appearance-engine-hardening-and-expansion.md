# 08 — Motor de Apariencia v2: Corrección de Contradicciones, Packs por Rubro y Expansión del Storefront

## 1. Objetivos y Alcance

### Problema que resuelve
El sistema actual de personalización visual de **Turneado** ya soporta 23 parámetros configurables en [AppearanceSettings.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/admin/AppearanceSettings/AppearanceSettings.tsx), [themePresets.ts](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/config/themePresets.ts), [themeEngine.ts](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/services/themeEngine.ts) y [functions/src/tenantAppearance.ts](file:///d:/Projects/Portfolio%20personal/Turnos-web/functions/src/tenantAppearance.ts). Sin embargo, una auditoría integral del código detectó contradicciones estructurales que rompen componentes en producción o vuelven inoperantes ciertas opciones:

1. **Contaminación de radios en `shapePreset: 'pill'`:** `pill` asigna `9999px` a los tokens genéricos `--radius-xs` y `--radius-sm`, los cuales son compartidos por `<input>`, `<textarea>`, buscadores, logos y fotografías (`ClientHero`, `About`, `Navbar`). Esto convierte los `<textarea>` en cápsulas ovaladas que recortan el texto, hace chocar texto e íconos en `<input>`, y redondea fotos rectangulares dentro de marcos cuadrados.
2. **Estilos de superficie (`surfaceStyle`) rotos o incompletos:** más de 15 hojas CSS públicas contienen `[data-theme="dark"] { box-shadow: none; }` hardcodeado, anulando `elevated` en modo oscuro; `glass` solo aplica `backdrop-filter` a 3 elementos; y `data-surface-style="flat"` se escribe en `<html>` pero ningún selector CSS lo consume.
3. **Combinaciones conflictivas en `ClientHero`:** `polaroid` choca con `circle`/`arch`/`organic`, `double-line` se deforma bajo `pill`, `floating-caption` desborda en formas curvas y `overlay-banner` mantiene habilitados los controles de forma/marco aunque los ignora.
4. **Vista previa desfasada de la realidad:** no incluye campos de formulario (`Input`/`Textarea`), usa dimensiones fijas que ocultan cambios de `density`/`textScale`, renderiza 7 de las 8 tarjetas tipográficas con fuentes fallback del sistema, pinta muestras de botones con la paleta del Admin y difiere del motor real de correos en Cloud Functions.
5. **Casos borde de contraste y densidad:** `density: 'compact'` reduce `--space-10` y aprieta el texto contra el ícono izquierdo de `<input>`; `customBackgroundHex` oscuro en modo claro se aclara silenciosamente sin aviso ni sugerencia; y la verificación WCAG AA no expone el estado simultáneo en modo Claro y Oscuro ni el contraste de `buttonStyle: 'soft'`.
6. **Fatiga de scroll y mantenimiento:** `AppearanceSettings.tsx` concentra 1.851 líneas y 23 controles en un único scroll vertical, obligando a bajar hasta el final para guardar cambios.

Adicionalmente, el producto necesita acelerar el onboarding visual de nuevos negocios y ampliar la identidad del storefront con **packs curados por rubro**, **personalización de barra superior, logo y galería**, **control de movimiento, variantes de tarjetas y paridad real en correos**, y **herramientas de edición segura (Antes/Después, Undo/Redo y semáforo WCAG AA dual)**.

### Qué incluye esta fase
- **Corrección integral de las 6 contradicciones detectadas (Fixes #1–#6):**
  - Tokens semánticos de radio (`--radius-button`, `--radius-button-sm`, `--radius-chip`, `--radius-input`, `--radius-textarea`, `--radius-card`, `--radius-media`) manteniendo `--radius-xs`/`--radius-sm` acotados.
  - Eliminación de `box-shadow: none` hardcodeado en `[data-theme="dark"]` de componentes públicos + implementación completa de `surfaceStyle` (`flat`, `bordered`, `elevated`, `glass`) en todas las tarjetas y modales públicos.
  - Matriz de compatibilidad explícita para `ClientHero` (`heroLayout` × `heroImageShape` × `heroImageFrame`) y corrección de `floating-caption` y `double-line`.
  - Desacople de `--input-icon-gutter` respecto de `--space-*`, carga real de previews tipográficos, swatches con la paleta del borrador y muestra de formulario (`Input` + `Textarea`) dentro de la vista previa.
- **Propuesta A — Packs de Estilo Completos por Rubro ("Estilos listos en 1 clic"):** 7 packs curados de punta a punta aplicables en un clic y 100% editables posteriormente.
- **Propuesta C — Personalización de Header, Logo, Galería y Bloques Públicos:** `navbarStyle` (`floating` | `solid` | `centered`), `logoShape` (`rounded` | `square` | `circle` | `frameless`), `portfolioLayout` (`grid` | `bento` | `carousel`), `heroShowTrustPills` y `showFloatingWhatsApp`.
- **Propuesta D — Personalidad de Movimiento, Tarjetas de Turno y Paridad Total en Correos:** `motionPreset` (`fluid` | `subtle` | `none`), `heroHighlightStyle` (`accent` | `italic` | `underline`), `slotCardStyle` (`classic` | `accent-bar` | `compact`) en vista pública, y traslado de `shapePreset`, `buttonStyle` y `customBackgroundHex` al motor HTML de [emailService.ts](file:///d:/Projects/Portfolio%20personal/Turnos-web/functions/src/emailService.ts) vía [functions/src/tenantAppearance.ts](file:///d:/Projects/Portfolio%20personal/Turnos-web/functions/src/tenantAppearance.ts).
- **Propuesta E + Renovación del Editor:** refactor modular de `AppearanceSettings` en 4 pestañas + barra `sticky` inferior de guardado, historial **Deshacer/Rehacer** (`Ctrl/Cmd+Z`, `Ctrl/Cmd+Shift+Z`), comparador **Borrador vs. Publicado actual** en la vista previa y **Semáforo de Contraste WCAG AA Dual** (Claro + Oscuro simultáneos) con detección de fondo oscuro en modo claro.
- **Suite de tests unitarios y de integración con Firebase Emulators** validando tokens semánticos, compatibilidad de Hero, packs, paridad total frontend $\leftrightarrow$ backend, HTML de emails y sincronización `ownerinfo/profile` $\to$ `/tenant_slugs/{slug}`.

### Qué queda explícitamente fuera de alcance
- **Propuesta B (Simulador multi-pantalla de 4 pestañas, switch Desktop/Mobile y apertura de borrador en pestaña nueva `?previewAppearance=1`):** explícitamente descartada para esta spec; la vista previa conserva el formato de columna derecha mejorado (con muestra de `Input`/`Textarea` y comparador Antes/Después).
- Modificación visual del panel operativo `/:tenantSlug/admin` ni de `/superadmin` (deben permanecer aislados en la paleta propia de Turneado).
- Subida de fuentes tipográficas personalizadas (`.woff2`) o CSS arbitrario ingresado por el usuario.
- Cambios en `firestore.rules` o `storage.rules` (la escritura de `ownerinfo/profile` ya está protegida por `isTenantOwner(tenantId)` y el sanitizador backend limpia `appearance` antes de replicar en `/tenant_slugs/{slug}`).

---

## 2. Archivos y Recursos Afectados

### Archivos a crear
- `src/components/admin/AppearanceSettings/useAppearanceHistory.ts` — hook puro de pila `Undo / Redo` (capacidad máx. 40 entradas, debounce para color pickers/inputs de texto y atajos de teclado).
- `src/components/admin/AppearanceSettings/sections/StylePacksSection.tsx` — selector de los 7 Packs de Estilo por rubro (Propuesta A) con previsualización de paleta, tipografía y etiquetas.
- `src/components/admin/AppearanceSettings/sections/ColorsAndBackgroundSection.tsx` — paletas curadas, colores HEX personalizados, **Semáforo WCAG AA Dual (Claro + Oscuro)**, base de superficie, fondo personalizado con aviso inteligente claro/oscuro, textura de fondo y modo inicial.
- `src/components/admin/AppearanceSettings/sections/TypographyAndGeometrySection.tsx` — las 8 tarjetas tipográficas con fuentes reales cargadas, escala de texto, curvatura de bordes, estilo de tarjetas, estilo de botones (con swatches en la paleta del borrador) y densidad.
- `src/components/admin/AppearanceSettings/sections/HeroAndStorefrontSection.tsx` — configuración de portada (`heroLayout`, `heroImageShape`, `heroImageFrame` con matriz de compatibilidad, `heroHighlightStyle`, `heroCopyPreset`, `heroShowCaption`, `heroShowTrustPills`), barra superior (`navbarStyle`, `logoShape`), galería (`portfolioLayout`), WhatsApp flotante (`showFloatingWhatsApp`), movimiento (`motionPreset`) y tarjetas de turno (`slotCardStyle`).
- `src/components/admin/AppearanceSettings/AppearanceLivePreview.tsx` — vista previa en vivo con alternador Claro/Oscuro, **Comparador Borrador vs. Publicado actual**, Navbar/Logo, Hero, `SlotCard` (reflejando `slotCardStyle`), muestra real de formulario (`Input` con ícono + `Textarea` + botón), bloque de **Galería de Trabajos** reflejando `portfolioLayout` (`grid`, `bento`, `carousel` con controles y fallback visual cuando no hay trabajos cargados) y correo de confirmación sincronizado con `shapePreset` y `buttonStyle`.
- `src/components/common/FloatingWhatsApp/FloatingWhatsApp.tsx` y `FloatingWhatsApp.module.css` — botón flotante accesible de WhatsApp para rutas públicas cuando `showFloatingWhatsApp === true` y `owner.phone` es válido.
- `tests/unit/appearanceHistoryAndPacks.test.ts` — tests unitarios de `useAppearanceHistory`, integridad de los 7 `STYLE_PACKS`, matriz de compatibilidad de Hero y semáforo WCAG AA dual.

### Archivos a modificar
- **Contratos de tipos y textos:**
  - `src/types/index.ts` — agregar los nuevos tipos unión (`NavbarStyleId`, `LogoShapeId`, `PortfolioLayoutId`, `MotionPresetId`, `HeroHighlightStyleId`, `SlotCardStyleId`, `StylePackPreset`) y extender `TenantAppearanceConfig` con los 8 nuevos campos opcionales/normalizados.
  - `src/texts/components/admin/AppearanceSettings.ts` — textos en español argentino (voseo, sin tecnicismos internos) para pestañas, packs por rubro, nuevas secciones, avisos de compatibilidad de Hero, barra sticky, Undo/Redo, comparador Antes/Después y semáforo WCAG AA dual.
- **Motor de presets y temas (Frontend):**
  - `src/config/themePresets.ts` — separar radios estructurales vs. tokens semánticos por control en `SHAPE_PRESETS`, definir `STYLE_PACKS`, opciones de Propuestas C y D, matriz `HERO_FRAME_ALLOWED_SHAPES` / `isHeroCombinationCompatible` / `coerceCompatibleHeroSettings`, y actualizar `DEFAULT_TENANT_APPEARANCE`.
  - `src/services/themeEngine.ts` — emitir tokens semánticos (`--radius-button`, `--radius-button-sm`, `--radius-chip`, `--radius-input`, `--radius-textarea`, `--radius-card`, `--radius-media`, `--motion-*`, `--input-icon-gutter`), ampliar `getThemeContrastSummary` (contraste sobre `bgBody`, `primaryLight` en botón `soft`, `accent`, bandera `wasBackgroundClamped`), agregar `ensureAllFontPairingPreviewsLoaded()`, y normalizar los 8 nuevos campos.
  - `src/components/common/TenantThemeApplier/TenantThemeApplier.tsx` — emitir y limpiar en `document.documentElement.dataset` los atributos `shapePreset`, `surfaceStyle`, `buttonStyle`, `motionPreset`, `navbarStyle`, `logoShape` y `slotCardStyle` exclusivamente en rutas públicas.
- **Tokens globales y componentes públicos (Fixes #1–#5 + Propuestas C y D):**
  - `src/styles/variables.css` — declarar valores por defecto de los nuevos tokens semánticos (`--radius-button`, `--radius-button-sm`, `--radius-chip`, `--radius-input`, `--radius-textarea`, `--radius-card`, `--radius-media`, `--input-icon-gutter`, `--motion-duration-*`).
  - `src/styles/globals.css` — reglas globales de `[data-motion-preset="subtle" | "none"]`, respeto estricto de `@media (prefers-reduced-motion: reduce)` y reglas base para `[data-surface-style="flat"]`.
  - `src/components/common/Button/Button.module.css` — migrar a `var(--radius-button)` y `var(--radius-button-sm)`.
  - `src/components/common/Input/Input.module.css` — migrar a `var(--radius-input)` y `var(--input-icon-gutter)`, más padding e íconos adaptativos bajo `:global([data-shape-preset="pill"])`.
  - `src/components/common/Textarea/Textarea.module.css` — migrar a `var(--radius-textarea)` (nunca `9999px`).
  - `src/components/common/Navbar/Navbar.tsx` y `Navbar.module.css` — soportar `navbarStyle` (`floating`, `solid`, `centered`), `logoShape` (`rounded`, `square`, `circle`, `frameless`), usar `--radius-media` en logo y eliminar `[data-theme="dark"] .navbarScrolled { box-shadow: none; }`.
  - `src/layouts/ClientLayout/ClientLayout.tsx` — montar `<FloatingWhatsApp />` en vistas públicas (excepto páginas sin navbar como `/payment/*`).
  - `src/components/client/ClientHero/ClientHero.tsx` y `ClientHero.module.css` — soportar `heroShowTrustPills`, `heroHighlightStyle` (`accent`, `italic`, `underline`), corregir `double-line` (`--radius-media`), corregir `floating-caption` en `circle`/`organic`, y eliminar los `[data-theme="dark"] { box-shadow: none; }` públicos.
  - `src/components/slots/SlotCard/SlotCard.tsx` y `SlotCard.module.css` — aplicar variante pública `slotCardStyle` (`classic`, `accent-bar`, `compact`) solo cuando `!isAdmin`, eliminar `[data-theme="dark"] .slotCard { box-shadow: none; }` y asegurar soporte completo de `flat` y `glass`.
  - `src/components/portfolio/PortfolioGallery/PortfolioGallery.tsx` / `PortfolioGallery.module.css`, `src/components/portfolio/PortfolioCard/PortfolioCard.tsx` / `PortfolioCard.module.css`, `src/pages/ClientView/ClientView.tsx` y `src/pages/About/About.tsx` — unificar la galería pública (`grid`, `bento` con expansión de altura en tarjeta destacada, `carousel` con controles accesibles), usar `--radius-media` en retratos, habilitar `backdrop-filter: var(--surface-backdrop-filter, none)` y `flat`, y eliminar `box-shadow: none` hardcodeado en dark mode.
  - `src/pages/ClientView/ClientView.module.css`, `src/pages/Prices/Prices.module.css`, `src/components/slots/SlotBookingShared/SlotBookingModal.module.css`, `src/pages/PaymentStatus/PaymentStatus.module.css` — eliminar `box-shadow: none` hardcodeado en `[data-theme="dark"]`, migrar `.searchWrapper` a `--radius-input` con padding seguro en `pill`, y habilitar `backdrop-filter: var(--surface-backdrop-filter, none)` y `flat` en tarjetas y modales públicos.
- **Editor de Apariencia (Admin):**
  - `src/components/admin/AppearanceSettings/AppearanceSettings.tsx` y `AppearanceSettings.module.css` — migrar a arquitectura modular de 4 pestañas + barra `sticky` inferior de guardado, manteniendo intacto el `Loader` de pantalla completa al guardar/restaurar, scroll al tope y toast de 5 segundos ya implementados.
- **Backend (Cloud Functions — auto-contenido en `functions/src/`):**
  - `functions/src/tenantAppearance.ts` — aceptar y sanitizar los 8 nuevos campos en `SanitizedTenantAppearance`, portar la derivación de superficie clara desde `customBackgroundHex`, y enriquecer `EmailThemePalette` con `cardRadiusPx`, `innerRadiusPx`, `buttonRadiusPx`, `buttonStyle`, `buttonBg`, `buttonColor`, `buttonBorder`.
  - `functions/src/emailService.ts` — consumir los nuevos tokens de radio y botón en `buildEmailLayout`, `renderFinancialCardHtml`, cajas informativas y CTAs (`buildClientEmailHtml`, `buildOwnerEmailHtml`, `buildPaymentIncidentEmailHtml`).
- **Tests:**
  - `tests/unit/themeEngine.test.ts` — actualizar la aserción de `--radius-sm` en `pill` por tokens semánticos y sumar pruebas de paridad exhaustiva frontend $\leftrightarrow$ `functions/src/tenantAppearance.ts` para los 31 campos.
  - `tests/unit/functionsEmail.test.ts` — verificar que `shapePreset` (`sharp`, `pill`), `buttonStyle` (`solid`, `soft`, `outline`) y `customBackgroundHex` se reflejen correctamente en el HTML generado por `buildClientEmailHtml` y `buildOwnerEmailHtml`.
  - `tests/integration/tenantSyncAndPayments.test.ts` — verificar que los nuevos campos de `appearance` escritos en `ownerinfo/profile` se sanitizan y replican correctamente en `/tenant_slugs/{slug}` mediante `onTenantOwnerInfoWritten`.

---

## 3. Metodología de Implementación

### 3.1 Contrato de Datos y Retrocompatibilidad (`TenantAppearanceConfig` v2)
Se amplía `TenantAppearanceConfig` de 23 a **31 campos** con defaults exactos al comportamiento vigente para garantizar retrocompatibilidad total con tenants ya persistidos en Firestore:

| Campo nuevo | Tipo | Default | Propuesta |
| :--- | :--- | :--- | :--- |
| `navbarStyle` | `'floating' \| 'solid' \| 'centered'` | `'floating'` | C |
| `logoShape` | `'rounded' \| 'square' \| 'circle' \| 'frameless'` | `'rounded'` | C |
| `portfolioLayout` | `'grid' \| 'bento' \| 'carousel'` | `'grid'` | C |
| `heroShowTrustPills` | `boolean` | `true` | C |
| `showFloatingWhatsApp` | `boolean` | `false` | C |
| `motionPreset` | `'fluid' \| 'subtle' \| 'none'` | `'fluid'` | D |
| `heroHighlightStyle` | `'accent' \| 'italic' \| 'underline'` | `'accent'` | D |
| `slotCardStyle` | `'classic' \| 'accent-bar' \| 'compact'` | `'classic'` | D |

*Nota sobre arquitectura Firebase Functions:* dado que [firebase.json](file:///d:/Projects/Portfolio%20personal/Turnos-web/firebase.json) despliega únicamente `functions/` con `functions/tsconfig.json` acotado a `include: ["src"]`, [functions/src/tenantAppearance.ts](file:///d:/Projects/Portfolio%20personal/Turnos-web/functions/src/tenantAppearance.ts) permanece auto-contenido y la sincronización estricta de presets, enums y defaults contra `src/config/themePresets.ts` se blinda mediante tests unitarios automatizados en `tests/unit/themeEngine.test.ts`.

### 3.2 Blindaje del Motor de Tokens CSS y Corrección de Contradicciones (Fixes #1–#5)

#### A. Tokens semánticos de radio (Fix #1)
En `themePresets.ts` y `themeEngine.ts`, ningún preset asigna `9999px` a `--radius-xs` ni `--radius-sm`. Se emite la matriz semántica completa:

| Token CSS | `sharp` | `soft` *(default)* | `rounded` | `pill` | Elementos consumidores |
| :--- | :--- | :--- | :--- | :--- | :--- |
| `--radius-xs` / `--radius-sm` | `2px` / `3px` | `6px` / `8px` | `8px` / `12px` | `8px` / `12px` | Contenedores menores estructurales |
| `--radius-button` / `-sm` | `3px` / `2px` | `8px` / `6px` | `12px` / `10px` | `9999px` / `9999px` | `Button` (`.md`, `.lg` / `.sm`) |
| `--radius-chip` | `3px` | `9999px` | `9999px` | `9999px` | Badges de estado, filtros y pills |
| `--radius-input` | `3px` | `8px` | `12px` | `22px` | `Input`, buscador en `Prices` |
| `--radius-textarea` | `3px` | `8px` | `12px` | `16px` | `Textarea` (nunca cápsula) |
| `--radius-card` | `4px` | `12px` | `18px` | `24px` | Tarjetas públicas y modales |
| `--radius-media` | `2px` | `8px` | `14px` | `16px` | Fotos `ClientHero`, retratos `About`, logo `rounded` |

Además, bajo `:global([data-shape-preset="pill"])`, `Input.module.css` y `.searchWrapper` amplían `padding-inline` a `18px`, `.leftIcon`/`.rightIcon` se separan `16px` del borde y `--input-icon-gutter` pasa de `40px` a `44px`, eliminando cualquier recorte o superposición.

#### B. Superficies coherentes en Claro y Oscuro (Fix #2)
1. En `variables.css`, el modo oscuro por defecto mantiene `--shadow-sm: none; --shadow-md: none; --shadow-lg: none;` para preservar intacto el aspecto plano del Admin.
2. En todos los módulos CSS **públicos** (`SlotCard`, `PortfolioCard`, `ClientHero`, `Navbar`, `SlotBookingModal`, `About`, `ClientView`, `Prices`, `PaymentStatus`), se eliminan los overrides `[data-theme="dark"] { box-shadow: none; }` para que las tarjetas obedezcan directamente a `var(--shadow-sm | --shadow-md)` inyectados por `TenantThemeApplier`.
3. Todas las tarjetas y modales públicos incorporan `backdrop-filter: var(--surface-backdrop-filter, none); -webkit-backdrop-filter: var(--surface-backdrop-filter, none);` para que `glass` sea uniforme en todo el sitio.
4. En `themeEngine.ts`, `surfaceStyle: 'flat'` emite `--surface-border-subtle: transparent`, `--surface-border-medium: var(--border-subtle)` y fondo diferenciado (`bgSubtle`/`bgSurface`), consumidos por `[data-surface-style="flat"]` para distinguir visualmente `flat` de `bordered`.

#### C. Matriz de compatibilidad de `ClientHero` (Fix #3)
En `themePresets.ts` se define:
- `HERO_FRAME_ALLOWED_SHAPES`:
  - `polaroid`: `['portrait', 'square', 'landscape']`
  - `editorial-mat`, `minimal-border`, `double-line`, `offset-accent`, `floating-caption`: las 6 formas.
- Helper `coerceCompatibleHeroSettings(config)` utilizado al cambiar marco o forma en el editor (si el usuario selecciona `polaroid` teniendo `circle`/`arch`/`organic`, ajusta suavemente la forma a `portrait` e informa por micro-aviso, o marca con etiqueta *"No compatible con Polaroid"*).
- Cuando `heroLayout === 'overlay-banner'`, los bloques de Forma y Marco se muestran colapsados/bloqueados (`aria-disabled`) con un banner claro en lugar de botones clickeables sin efecto.
- En `ClientHero.module.css`:
  - `double-line` usa `border-radius: var(--radius-media)` en `.heroImage` (nunca `--radius-sm`).
  - `.heroFigure[data-hero-shape="circle"] .floatingCaption` y `[data-hero-shape="organic"] .floatingCaption` pasan a placa centrada (`left: 50%; right: auto; transform: translateX(-50%); width: max-content; max-width: 84%; text-align: center;`).

#### D. Fidelidad de Vista Previa, Fuentes Reales y Gutter de Inputs (Fixes #4 y #5)
1. **Carga real de fuentes en el selector:** `ensureAllFontPairingPreviewsLoaded()` inyecta un único `<link id="turnos-font-previews" rel="stylesheet">` con las familias display/body de los 8 pairings (pesos 400 y 600) al abrir la pestaña *Tipografía y Formas* sin destruir el `<link>` principal del tenant.
2. **Swatches fieles al borrador:** los previews de `buttonStyle`, `shapePreset` y `surfaceStyle` dentro del editor aplican inline las CSS vars del borrador (`previewVars`), nunca la paleta del Admin.
3. **Desacople de `--input-icon-gutter`:** `Input.module.css` usa `padding-left: var(--input-icon-gutter, 40px)` y `padding-right: var(--input-icon-gutter, 40px)` en lugar de `var(--space-10)`, blindando el espaciado de íconos cuando `density === 'compact'`.

### 3.3 Propuesta A — Packs de Estilo Completos por Rubro (`STYLE_PACKS`)
Se definen **7 packs curados** en `src/config/themePresets.ts` (todos validados WCAG AA en Claro y Oscuro por test automatizado):

| Pack ID | Nombre | Configuración núcleo (Paleta · Fuente · Forma · Superficie · Botón · Portada · Storefront) |
| :--- | :--- | :--- |
| `nail-lash-atelier` | Atelier Uñas & Pestañas | `blush-peony` · `blush` · `editorial` · `rounded` · `elevated` · `solid` · `split-right` / `arch` / `minimal-border` · `floating` / `circle` / `bento` |
| `barber-classic` | Barbería Clásica | `cocoa-mocha` · `warm` · `classic` · `sharp` · `bordered` · `solid` · `defaultMode: dark` · `split-left` / `portrait` / `double-line` · `solid` / `square` / `accent-bar` |
| `spa-botanical` | Spa & Bienestar Botánico | `sage-botanical` · `sage` · `atelier` · `pill` · `glass` · `soft` · `mesh-glow` · `centered` / `organic` / `editorial-mat` · `centered` / `circle` / `carousel` |
| `clinical-studio` | Consultorio Clínico | `clinical-teal` · `paper` · `clinical` · `soft` · `bordered` · `solid` · `split-right` / `square` / `minimal-border` · `solid` / `rounded` / `compact` |
| `urban-minimal` | Estudio Minimal Urbano | `noir-minimal` · `paper` · `minimal` · `sharp` · `flat` · `outline` · `grid` · `minimal-compact` / `landscape` / `offset-accent` · `solid` / `frameless` / `grid` |
| `tattoo-art` | Tattoo & Arte | `burgundy-noir` · `neutral` · `expressive` · `sharp` · `elevated` · `solid` · `defaultMode: dark` · `overlay-banner` · `solid` / `frameless` / `bento` |
| `pilates-wellness` | Pilates & Movimiento | `pilates-sand` · `warm` · `friendly` · `rounded` · `elevated` · `soft` · `soft-gradient` · `split-right` / `arch` / `floating-caption` · `floating` / `rounded` / `carousel` |

- El pack activo se infiere dinámicamente comparando el borrador contra cada pack (`areAppearanceConfigsEqual`), evitando persistir metadatos redundantes que quedarían desactualizados tras ediciones manuales.
- Al aplicar un pack se registra en la pila `Undo/Redo`, permitiendo volver exactamente al estado anterior con un clic.

### 3.4 Propuesta C — Personalización de Header, Logo, Galería y Bloques Públicos
1. **`navbarStyle` en [Navbar.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/common/Navbar/Navbar.tsx):**
   - `floating`: comportamiento actual (`stickyBehavior = 'transform'`).
   - `solid`: barra fija opaca de ancho completo sin transformación al scrollear (`data-navbar-style="solid"`).
   - `centered`: en desktop (`>= 768px`) marca + enlaces con distribución editorial centrada y separador inferior sutil; en mobile mantiene el botón menú compacto.
2. **`logoShape` en `Navbar.tsx` + `Navbar.module.css`:**
   - Atributo `data-logo-shape={appearance.logoShape}` en la etiqueta `<img>` del logo (`rounded` usa `--radius-media`, `square` usa `2px`, `circle` usa `9999px`, `frameless` quita borde/fondo y aplica `object-fit: contain; width: auto; max-width: 48px`).
3. **`portfolioLayout` unificado mediante [PortfolioGallery.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/portfolio/PortfolioGallery/PortfolioGallery.tsx) en [ClientView.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/pages/ClientView/ClientView.tsx) (`/`) y [About.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/pages/About/About.tsx) (`/about`):**
   - `grid`: grilla uniforme (`repeat(auto-fill, minmax(260px, 1fr))`).
   - `bento`: en desktop (`>= 768px`), cuando hay $\ge 3$ trabajos, la primera tarjeta ocupa `grid-column: span 2; grid-row: span 2` con altura de imagen ampliada (`featured` en `PortfolioCard` expandiendo `.imageWrapper`); en mobile colapsa a 1 columna.
   - `carousel`: pista horizontal con `scroll-snap-type: x mandatory`, `overflow-x: auto`, padding seguro y botones accesibles *Anterior / Siguiente*.
   - `ClientView` conserva estado de carga, estado vacío y expansión *"Ver más / Ver menos"* a partir de 6 trabajos; `About` mantiene la vista acotada a 6 trabajos sin estado vacío cuando no hay obras cargadas.
   - En `AppearanceLivePreview.tsx`, se renderiza el mini bloque **Trabajos recientes** usando hasta 4 trabajos reales de `usePortfolio()` (o completando con las imágenes de muestra de `DEMO_PORTFOLIO_STOCK_IMAGES` si el negocio tiene menos de 4 trabajos cargados) para visualizar en vivo los 3 layouts (`grid`, `bento`, `carousel`).
4. **`heroShowTrustPills` en [ClientHero.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/client/ClientHero/ClientHero.tsx):** renderiza `.trustPills` condicionalmente según `appearance.heroShowTrustPills`.
5. **`showFloatingWhatsApp` en [ClientLayout.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/layouts/ClientLayout/ClientLayout.tsx):**
   - Nuevo componente `FloatingWhatsApp` visible solo si `showNavbar` es `true`, `appearance.showFloatingWhatsApp === true` y `owner.phone` tiene $\ge 8$ dígitos.
   - Abre `https://wa.me/${digits}?text=...` en nueva pestaña (`rel="noopener noreferrer"`), con `aria-label` claro, respetando `--radius-button`, `safe-area-inset-bottom` y `z-index` inferior a modales (`calc(var(--z-sticky) - 5)`).
   - En el editor de Apariencia, si el dueño activa el toggle sin tener teléfono cargado en *Mi Perfil*, muestra un aviso amigable indicando que el botón aparecerá en cuanto cargue su número de WhatsApp.

### 3.5 Propuesta D — Movimiento, Tarjetas de Turno y Paridad Real en Correos
1. **`motionPreset` (`fluid` | `subtle` | `none`):**
   - `themeEngine.ts` emite `--motion-duration-fast`, `--motion-duration-base`, `--motion-duration-slow` y `TenantThemeApplier` escribe `data-motion-preset` en `<html>`.
   - En `globals.css`:
     - `[data-motion-preset="subtle"]`: reduce duraciones y desactiva desplazamientos `translateY` en animaciones de entrada.
     - `[data-motion-preset="none"]`: fuerza `animation-duration: 0.01ms !important; transition-duration: 0.01ms !important; scroll-behavior: auto !important;` dentro de la vista pública (y `@media (prefers-reduced-motion: reduce)` siempre prevalece).
2. **`heroHighlightStyle` (`accent` | `italic` | `underline`):**
   - Atributo `data-hero-highlight` sobre `<span className={styles.heroHighlight}>` en `ClientHero.tsx`, estilizado en `ClientHero.module.css` con color de acento (`accent`), cursiva editorial (`italic`) o subrayado suave con degradado de `var(--color-primary-light)` (`underline`).
3. **`slotCardStyle` (`classic` | `accent-bar` | `compact`):**
   - Aplicado exclusivamente sobre `.cardClient` (nunca afecta `SlotCard` en `AdminView`) mediante `:global([data-slot-card-style="accent-bar"]) .cardClient` (banda lateral izquierda de `4px solid var(--color-primary)` y cabecera sutil) y `:global([data-slot-card-style="compact"]) .cardClient` (padding y ritmo vertical más compacto para agendas con alta cantidad de horarios diarios).
4. **Paridad real en correos ([functions/src/tenantAppearance.ts](file:///d:/Projects/Portfolio%20personal/Turnos-web/functions/src/tenantAppearance.ts) y [functions/src/emailService.ts](file:///d:/Projects/Portfolio%20personal/Turnos-web/functions/src/emailService.ts)):**
   - Portar `deriveSurfaceFromCustomBackground(customBackgroundHex, 'light')` a `functions/src/tenantAppearance.ts` para que el fondo personalizado se refleje también en el email.
   - Resolver en `EmailThemePalette`:
     - `cardRadiusPx`: `sharp: 4`, `soft: 12`, `rounded: 16`, `pill: 18`
     - `innerRadiusPx`: `sharp: 2`, `soft: 10`, `rounded: 12`, `pill: 14`
     - `buttonRadiusPx`: `sharp: 3`, `soft: 8`, `rounded: 12`, `pill: 9999`
     - `buttonStyle`: `'solid' | 'soft' | 'outline'`
     - `buttonBg`, `buttonColor`, `buttonBorder`: calculados cumpliendo contraste $\ge 4.5:1$ (`solid` usa `primary` + `primaryForeground`; `soft` usa `primaryLight` + `primaryDark` + borde `primaryBorder`; `outline` usa `bgSurface` + `primary` + borde `1.5px solid primary`).
   - Aplicar estos tokens en `buildEmailLayout`, `renderFinancialCardHtml`, cajas de cita/notas y botones CTA de `emailService.ts`.

### 3.6 Propuesta E + Refactor del Editor (`AppearanceSettings`)
1. **Organización en 4 pestañas limpias:**
   - **Estilos rápidos:** Packs por rubro (Propuesta A) + acceso rápido a restaurar diseño original.
   - **Colores y Fondo:** Paletas curadas por categoría, HEX personalizados, **Semáforo WCAG AA Dual**, base de superficie, fondo personalizado con detección claro/oscuro, textura/intensidad y modo inicial.
   - **Tipografía y Formas:** 8 tarjetas con fuentes reales, escala de texto, curvatura de bordes, estilo de tarjetas, estilo de botones (con swatches del borrador) y densidad.
   - **Portada y Tienda:** Portada (`heroLayout`, `heroImageShape`, `heroImageFrame` con reglas de compatibilidad, `heroHighlightStyle`, `heroCopyPreset`, caption y trust pills), Barra superior y Logo (`navbarStyle`, `logoShape`), Galería (`portfolioLayout`), WhatsApp flotante (`showFloatingWhatsApp`), Movimiento (`motionPreset`) y Tarjetas de turno (`slotCardStyle`).
2. **Barra inferior `sticky` de acciones:** visible siempre que `hasChanges === true`, mostrando badge *"Tenés cambios sin guardar"*, controles **Deshacer / Rehacer**, **Descartar** y **Guardar apariencia** sin necesidad de scrollear al fondo. Mantiene el `Loader` full-screen, scroll al tope y toast de 5 segundos al guardar/restaurar.
3. **Historial `Undo / Redo` (`useAppearanceHistory.ts`):**
   - Pila inmutable de hasta 40 snapshots con `canUndo`, `canRedo`, `undo()`, `redo()`, `resetHistory(baseline)`.
   - Coalescing/debounce de `350 ms` para cambios consecutivos del mismo campo (`customPrimaryHex`, `customBackgroundHex`, textos del Hero) para que arrastrar un selector de color genere 1 solo paso de deshacer.
   - Atajos `Ctrl/Cmd + Z` y `Ctrl/Cmd + Shift + Z` / `Ctrl + Y` cuando el foco no esté editando un texto nativo.
4. **Comparador "Antes vs. Después" en `AppearanceLivePreview.tsx`:**
   - Control segmentado en la cabecera de la vista previa: **Borrador** | **Publicado actual** (habilitado cuando `hasChanges === true`), permitiendo ver en vivo cualquier diferencia de color, forma, tarjeta, input o correo respecto del diseño publicado.
5. **Semáforo de Contraste WCAG AA Dual (Claro + Oscuro):**
   - `getThemeContrastSummary(config, mode)` calcula y devuelve: `primaryOnSurfaceRatio`, `primaryOnBodyRatio`, `textOnPrimaryRatio`, `softButtonRatio`, `accentOnSurfaceRatio`, `wasPrimaryAdjusted`, `wasAccentAdjusted`, `wasBackgroundClamped`, `passesAA`.
   - La tarjeta de contraste muestra dos insignias lado a lado (**Claro** y **Oscuro**) con ratio numérico real (`AA 6.4:1`), aclara si el motor calibró automáticamente algún color extremo y, cuando `wasBackgroundClamped === true` en modo `light` con un HEX oscuro (`l < 45`), ofrece un botón de 1 clic: **"Usar modo Oscuro como inicial"**.

---

## 4. Estados Válidos e Invariantes

- **Invariante de Legibilidad en Controles de Formulario:** Bajo cualquiera de los 4 `shapePreset` (`sharp`, `soft`, `rounded`, `pill`) y cualquiera de las 3 densidades (`compact`, `comfortable`, `spacious`), `--radius-textarea` nunca supera `16px`, `--radius-media` nunca supera `16px`, `--radius-input` nunca supera `22px` y `--input-icon-gutter` nunca cae por debajo de `40px`.
- **Invariante de Aislamiento Admin:** Al navegar a `/:tenantSlug/admin` o `/superadmin`, `TenantThemeApplier` remueve todas las variables CSS inyectadas y todos los `data-*` (`surfaceStyle`, `buttonStyle`, `shapePreset`, `motionPreset`, `navbarStyle`, `logoShape`, `slotCardStyle`) del `<html>`. Las clases `.cardClient` y `FloatingWhatsApp` nunca se montan en `AdminLayout`.
- **Invariante WCAG AA Transversal:** Los 24 presets de paleta y los 7 `STYLE_PACKS` cumplen ratio $\ge 4.5:1$ en modo Claro y modo Oscuro para texto sobre superficie, color primario sobre superficie, texto sobre botón sólido y texto sobre botón suave (`buttonStyle: 'soft'`).
- **Invariante de Accesibilidad de Movimiento:** `@media (prefers-reduced-motion: reduce)` siempre prevalece sobre `motionPreset: 'fluid'` o `'subtle'`.
- **Invariante de Retrocompatibilidad y Sanitización Zero-Trust:** Documentos existentes de `ownerinfo/profile` sin los 8 campos nuevos se normalizan automáticamente a los defaults exactos previos; cualquier valor desconocido o intento de inyección CSS/HTML en cualquiera de los 31 campos es rechazado tanto en frontend (`normalizeTenantAppearance`) como en backend (`sanitizeTenantAppearance`).
- **Invariante de Paridad Frontend $\leftrightarrow$ Backend:** El conjunto de claves, valores válidos de enums, defaults y paletas entre `src/config/themePresets.ts` y `functions/src/tenantAppearance.ts` debe coincidir al 100%, verificado por tests unitarios en cada build.

---

## 5. Comprobaciones y Criterios de Aceptación

1. **Calidad Estática y Compilación:**
   - `npm run lint` $\to$ código `0`.
   - `npm run build` y `npm --prefix functions run build` $\to$ código `0`.
2. **Tests Unitarios (`npm test`):**
   - `tests/unit/themeEngine.test.ts`:
     - Los 24 presets y los 7 `STYLE_PACKS` pasan `getThemeContrastSummary(config, 'light').passesAA === true` y `('dark').passesAA === true` (incluyendo `softButtonRatio >= 4.5`).
     - En `shapePreset: 'pill'`: `--radius-button === '9999px'`, `--radius-input === '22px'`, `--radius-textarea === '16px'`, `--radius-media === '16px'`, `--radius-sm === '12px'`.
     - `density: 'compact'` mantiene `--input-icon-gutter` $\ge 40\text{px}$.
     - `customBackgroundHex` oscuro en modo claro marca `wasBackgroundClamped === true` y deriva superficies accesibles en claro y oscuro.
     - Paridad 100% entre `normalizeTenantAppearance` (frontend) y `sanitizeTenantAppearance` (backend) para los 31 campos, incluyendo rechazo de payloads hostiles y retrocompatibilidad con documentos parciales legacy.
   - `tests/unit/appearanceHistoryAndPacks.test.ts`:
     - `useAppearanceHistory`: push, coalescing de ediciones repetidas, undo, redo, truncado de rama futura tras nueva edición y límite máximo de 40 estados.
     - Matriz `isHeroCombinationCompatible` y `coerceCompatibleHeroSettings` (ej. `polaroid` + `circle` $\to$ `portrait`; `overlay-banner` reporta forma/marco inaplicables).
   - `tests/unit/functionsEmail.test.ts`:
     - `buildClientEmailHtml` y `buildOwnerEmailHtml` aplican `border-radius: 3px` en CTAs con `shapePreset: 'sharp'` y `border-radius: 9999px` con `shapePreset: 'pill'`.
     - `buttonStyle: 'outline'` renderiza botón con fondo de superficie y borde primario; `buttonStyle: 'soft'` renderiza fondo `primaryLight` y texto `primaryDark` con contraste AA.
     - `customBackgroundHex` se refleja en `bgBody` del email HTML generado.
3. **Tests de Integración con Firebase Emulators (`npm run test:integration`):**
   - `tests/integration/tenantSyncAndPayments.test.ts`: escribir en `/tenants/{tenantId}/ownerinfo/profile` una configuración `appearance` con los 8 campos nuevos (`navbarStyle`, `logoShape`, `portfolioLayout`, `heroShowTrustPills`, `showFloatingWhatsApp`, `motionPreset`, `heroHighlightStyle`, `slotCardStyle`) más valores inválidos intercalados, y verificar que el trigger `onTenantOwnerInfoWritten` replica únicamente valores sanitizados válidos en `/tenant_slugs/{slug}`.
4. **Verificación Manual / Visual en Navegador:**
   - Activar `shapePreset: 'pill'` + `density: 'compact'` y comprobar que `Input` (con ícono izquierdo), `Textarea` (en modal de reserva), buscador de `Prices` y fotos de `ClientHero`/`About` se ven íntegros y legibles sin recortes.
   - Alternar `surfaceStyle` (`bordered`, `elevated`, `flat`, `glass`) tanto en modo Claro como en modo Oscuro y comprobar que las 4 variantes se distinguen claramente en ambos modos.
   - Probar los 7 `STYLE_PACKS`, deshacer con `Ctrl+Z`, comparar **Borrador vs. Publicado**, guardar (verificando loader + scroll al tope + toast de 5s) y recorrer `/demo`, `/demo/about`, `/demo/prices` y `/demo/admin` (confirmando aislamiento total del Admin).
