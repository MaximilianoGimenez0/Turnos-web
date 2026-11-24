# TurnosWeb — Especificación del Sistema Visual, Colores y CSS para Todos los Artefactos

> **Alcance:** Especificación maestra compartida por **Business Card (Front & Back)** y **PDF/PNG A4 (Page 1 Quick View & Page 2 Details)**.
> **Base de marca:** Identidad editorial oficial de TurnosWeb (`Rosa Editorial` sobre `Crema Cálida`), alineada con `src/styles/variables.css`, `src/config/themePresets.ts` (`rose-editorial` + `warm`) y `public/favicon.svg`.

---

## 1. Diagnóstico de Colores Actuales y Unificación

En los artefactos previos existía una ligera divergencia entre los archivos CSS:

| Rol | App Oficial (`variables.css`) | PDFs previos (`shared.css`) | Cards previas (`cards.css`) | **Decisión Unificada (Nueva Base)** |
| :--- | :--- | :--- | :--- | :--- |
| Fondo principal | `#f1e9dc` | `#f1e9dc` | `#F5EFE6` | **PDF A4:** `#f1e9dc` (papel editorial cálido)<br>**Card 16:9:** `#f5efe6` (crema luminoso de mayor aire en pantalla/print) — ambos de la misma familia tonal cálida. |
| Superficie tarjeta | `#faf5ec` | `#faf5ec` | `#FAF7F2` | `--surface-base`: `#faf5ec` (A4) / `#faf7f2` (Card) y `--surface-pure`: `#fcfbf9` (QR y elevaciones). |
| Primario de marca | `#9e4f5e` | `#9e4f5e` | `#8F3D4B` | **Unificado en `--brand-primary`: `#9e4f5e`** y **`--brand-primary-deep`: `#843c4a`** (usado en títulos en itálica, badges de alto contraste y acentos en tarjetas para superar WCAG AA ≥ 5.5:1 sobre crema). |
| Acento cálido | `#8c7258` | `#8c7258` | *(no definido)* | `--brand-accent`: `#8c7258` (Bronce taupe editorial para diferenciación de paneles Admin / Alta). |
| Tinta principal | `#231c19` | `#231c19` | `#241F1E` | **Unificado en `--ink-primary`: `#231c19`** (Espresso oscuro cálido; nunca `#000000` puro). |
| Tinta secundaria | `#5c514b` | `#5c514b` | `#6E625E` | **Unificado en `--ink-secondary`: `#5c514b`** y **`--ink-muted`: `#786b64`** (contraste AA verificado). |

---

## 2. Paleta Maestra de Colores (HEX, RGB, HSL y Reglas de Uso)

### 2.1 Fondos y Superficies (Capas Tonales Cálidas)

| Token CSS | HEX | RGB | HSL | Uso Obligatorio |
| :--- | :--- | :--- | :--- | :--- |
| `--bg-paper` | `#f1e9dc` | `241, 233, 220` | `37°, 42%, 90%` | Lienzo base A4 (PDF Page 1 & Page 2) y chips anidados en superficies claras. |
| `--bg-cream` | `#f5efe6` | `245, 239, 230` | `36°, 43%, 93%` | Lienzo base panorámico de Business Cards (Front & Back panel izquierdo). |
| `--bg-surface` | `#faf5ec` | `250, 245, 236` | `39°, 58%, 95%` | Tarjetas principales A4 (paneles, problemas, capacidad, pricing, footer QR). |
| `--bg-surface-card` | `#faf7f2` | `250, 247, 242` | `38°, 44%, 96%` | Tarjeta flotante de vista previa en Business Card Front. |
| `--bg-surface-pure` | `#fcfbf9` | `252, 251, 249` | `40°, 33%, 98%` | Fondo de la tarjeta QR editorial y quiet-zone de máxima escaneabilidad. |
| `--bg-surface-subtle` | `#e8dece` | `232, 222, 206` | `37°, 34%, 86%` | Chips de destacados, píldoras secundarias, contenedores de íconos neutros. |
| `--bg-chip` | `#efe6dc` | `239, 230, 220` | `32°, 37%, 90%` | Chips de funcionalidades en Business Card Front (tonal sin borde). |
| `--bg-chip-deep` | `#e6dacb` | `230, 218, 203` | `33°, 35%, 85%` | Etiquetas de duración (`1h 15m`) y énfasis suave dentro de chips. |
| `--bg-blush` | `#f7ecee` | `247, 236, 238` | `349°, 41%, 95%` | Badges primarios, píldora del header, números de paso, fondos suaves de marca. |
| `--bg-blush-panel` | `#f3e6ea` | `243, 230, 234` | `342°, 35%, 93%` | Panel derecho full-bleed (42%) en Business Card Back. |
| `--bg-step-circle` | `#ead9de` | `234, 217, 222` | `342°, 29%, 88%` | Círculos numerados `1 · 2 · 3` en Business Card Back. |
| `--bg-setup-col` | `#f8f2e8` | `248, 242, 232` | `38°, 50%, 94%` | Columna secundaria de la tarjeta de precios (Alta única / Diferenciación tonal). |

### 2.2 Colores de Marca y Semánticos

| Token CSS | HEX | RGB | Contraste sobre `#faf5ec` | Uso Obligatorio |
| :--- | :--- | :--- | :--- | :--- |
| `--brand-primary` | `#9e4f5e` | `158, 79, 94` | `5.3:1` (AA) | Color de marca principal: isotipo, botones CTA, énfasis en cifras, borde activo, píldoras de marca. |
| `--brand-primary-deep` | `#843c4a` | `132, 60, 74` | `7.1:1` (AAA) | Subtítulos en itálica, kickers pequeños en mayúsculas, textos de acento en Business Cards y estados activos. |
| `--brand-primary-border` | `#e2c3c9` | `226, 195, 201` | — | Bordes finos de contenedores destacados (tarjeta de precios, mockup stage, QR card, badges). |
| `--brand-primary-soft` | `rgba(158, 79, 94, 0.14)` | `158, 79, 94` | — | Halo del indicador en vivo y sombreado sutil del cabezal del isotipo. |
| `--brand-accent` | `#8c7258` | `140, 114, 88` | `4.6:1` (AA) | Acento cálido secundario: panel "Para tu estudio", columna "Alta única", diferenciación administrativa. |
| `--brand-accent-light` | `#efe7dc` | `239, 231, 220` | — | Fondo de badges e íconos del bloque administrativo y alta. |
| `--brand-accent-border` | `#d5c7b2` | `213, 199, 178` | — | Borde de paneles administrativos y badge de alta. |
| `--color-success` | `#2c6e49` | `44, 110, 73` | `5.8:1` (AA) | Confirmaciones, checks de lista de precios, badge "Agenda en vivo" y píldora de WhatsApp. |
| `--color-success-bg` | `#edf5f0` | `237, 245, 240` | — | Fondo de toast de confirmación, checks circulares y botón/pill de WhatsApp. |
| `--color-success-border` | `#bfd9c9` | `191, 217, 201` | — | Borde de elementos semánticos de éxito y WhatsApp. |
| `--color-success-text` | `#225438` | `34, 84, 56` | `8.1:1` (AAA) | Texto secundario sobre `--color-success-bg`. |

### 2.3 Tintas y Bordes Neutros

| Token CSS | HEX / RGBA | Contraste sobre `#f1e9dc` | Uso Obligatorio |
| :--- | :--- | :--- | :--- |
| `--ink-primary` | `#231c19` | `14.1:1` (AAA) | Títulos display, subtítulos principales, horarios, montos, datos fuertes y módulos del QR. |
| `--ink-chip` | `#2f2725` | `12.3:1` (AAA) | Texto dentro de feature chips tonales. |
| `--ink-secondary` | `#5c514b` | `6.6:1` (AA+) | Párrafos descriptivos, ítems de listas y textos de tarjetas. |
| `--ink-muted` | `#786b64` | `4.6:1` (AA) | Subtítulos de marca, pies de página, etiquetas de apoyo, metadatos y URLs secundarias. |
| `--border-subtle` | `#ded3c2` | — | Separadores estándar de tarjetas, header y footer A4. |
| `--border-medium` | `#cdbfa9` | — | Bordes de pills interactivos y controles destacados. |
| `--border-hairline` | `rgba(35, 28, 25, 0.09)` | — | Filete divisor sutil de 1px en Business Card Front (footer y depósito). |

> **Regla estricta de color:** Prohibido usar negro puro (`#000000`), blanco puro frío (`#ffffff`) como fondo de página, degradados violetas/neón o sombras grises azuladas. Toda sombra se tiñe con tinta cálida `rgba(35, 28, 25, ...)` o con el primario `rgba(158, 79, 94, ...)`.

---

## 3. Sistema Tipográfico

Todos los artefactos cargan exactamente **3 familias de Google Fonts** idénticas a la identidad editorial de la aplicación web:

```html
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link
  href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Plus+Jakarta+Sans:wght@400;500;600;700&family=Inter:wght@400;500;600&display=swap"
  rel="stylesheet"
/>
```

| Token CSS | Familia | Pesos Usados | Rol Editorial | Reglas Clave |
| :--- | :--- | :--- | :--- | :--- |
| `--font-display` | `'Cormorant Garamond', Georgia, serif` | `400`, `500`, `600` + `italic 400/500` | Marca `TurnosWeb`, titulares de sección, frases emocionales en *itálica*, cifras monumentales de precios y capacidad. | Tracking negativo en tamaños grandes (`-0.025em` a `-0.01em`), `line-height: 0.92–1.14`. Usar `font-variant-numeric: lining-nums tabular-nums` en cifras (`$18.000`, `1.200`, `+30.000`). |
| `--font-heading` | `'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif` | `500`, `600`, `700` | Eyebrows/kickers en mayúsculas, títulos de tarjetas y pasos, chips, badges, botones CTA, horarios, montos de seña, URLs principales. | Eyebrows con `text-transform: uppercase`, `letter-spacing: 0.09em–0.15em`. Horarios y precios con `font-variant-numeric: tabular-nums`. |
| `--font-body` | `'Inter', 'Segoe UI', system-ui, sans-serif` | `400`, `500`, `600` | Párrafos explicativos, viñetas descriptivas, pies de página, aclaraciones y textos legales/técnicos. | `line-height: 1.42–1.52`, nunca menor a `13.5px` en A4 ni menor a `14px` en Business Cards. |

---

## 4. Identidad Gráfica: Isotipo, Iconografía y QR Editorial

### 4.1 Isotipo Oficial (Versión Lineal Editorial — Usada en Artefactos)
Calendario minimalista con cabecera tintada en mauve translúcido y check de confirmación centrado:

```xml
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 64 64" fill="none" aria-hidden="true">
  <path fill="#9e4f5e" fill-opacity="0.15" d="M10 24a8 8 0 0 1 8-8h28a8 8 0 0 1 8 8v3H10v-3Z" />
  <g stroke="#9e4f5e" stroke-width="4.4" stroke-linecap="round" stroke-linejoin="round">
    <rect x="10" y="16" width="44" height="39" rx="8" />
    <path d="M21 9.5V16M43 9.5V16" />
    <path d="M22.5 39.5L28.5 45.5L41.5 32.5" />
  </g>
</svg>
```
- **Tamaños estándar:** `54×54px` en header A4; `48×48px` en Business Card Front; `15×15px` (trazo `stroke-width: 6`) dentro del mockup móvil.
- **Versión alternativa (Favicon Squircle):** Disponible en `public/favicon.svg` (degradado `#CC7C88 → #B76573 → #9A4B5A` con ícono blanco) — reservada para íconos de app/navegador, no para papel editorial salvo necesidad de alto contraste en miniatura.

### 4.2 Iconografía Funcional
- Estilo **Lucide lineal limpio** (`viewBox="0 0 24 24"`, `fill="none"`, `stroke="currentColor"`, `stroke-width="1.8"`, `stroke-linecap="round"`, `stroke-linejoin="round"`).
- Prohibido usar emojis en los artefactos.
- Tamaños estándar: `17–18px` dentro de pills/listas/problemas; `20–22px` dentro de badges de cabecera o capacidad; `12–15px` (`stroke-width: 2.4–2.6`) para checks dentro de círculos.

### 4.3 Código QR Editorial
- **Destino:** `https://turneado.app` (matriz `25×25` en `qr-matrix.json`).
- **Renderizado SVG crisp:** `shape-rendering="crispEdges"`, `viewBox="-1 -1 31 31"`, cada módulo `width="1.02" height="1.02"` (evita micro-costuras subpíxel en PDF/PNG).
- **Colorización editorial segura para escaneo:**
  - Fondo (`quiet-zone`): `#fcfbf9` (Card Back) o `#ffffff` (A4 Footer).
  - Módulos generales y marcos exteriores de los 3 localizadores (*finders*): `#231c19` (contraste > 15:1).
  - Centros `3×3` de los 3 localizadores (*finder centers*): `#843c4a` (Card Back) o `#9e4f5e` (A4 Footer).
- **Tamaños mínimos:** `348×348px` en Business Card Back; `114×114px` en A4 Footer (ambos con margen interno limpio).

---

## 5. Geometría, Ambientación y Especificaciones de Renderizado

### 5.1 Halos Ambientales (Atmósfera sin Ruido)
Todos los lienzos usan **pseudo-elementos radiales muy suaves** (`pointer-events: none; z-index: 0`) que aportan profundidad de papel artesanal sin líneas duras ni manchas visibles:
- **Esquina superior derecha (Blush):** `radial-gradient(circle, rgba(158, 79, 94, 0.075) 0%, rgba(158, 79, 94, 0) 70%)`
- **Esquina inferior izquierda (Arena cálida):** `radial-gradient(circle, rgba(140, 114, 88, 0.07) 0%, rgba(140, 114, 88, 0) 70%)`

### 5.2 Escala de Radios y Elevación
- **A4 Editorial:** Tarjetas mayores `18–20px`, sub-tarjetas `14–16px`, pills/chips `12–13px`, badges pequeños `8–10px`, círculos/cápsulas `999px`. Bordes `1px solid var(--border-subtle)` (o `1.5px solid var(--brand-primary-border)` en bloque de precios).
- **Business Cards 16:9:** Tarjeta QR `34px`, tarjeta preview `28px`, superficie interna `20px`, bloques de estado/días `14px`, chips `12px`. Estilo **borderless tonal** (separación por capas de color + sombra cálida suave `0 24px 60px rgba(158, 79, 94, 0.09), 0 6px 18px rgba(35, 28, 25, 0.04)`).

### 5.3 Dimensiones de Canvas y Parámetros Headless Chrome

| Artefacto | Viewport CSS | Factor de Escala | Salida PNG | Salida PDF | Regla `@media print` |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Business Card (Front / Back)** | `1600 × 900 px` (16:9) | `--force-device-scale-factor=2` | `3200 × 1800 px` | Opcional (`@page { size: 160mm 90mm; margin: 0; }`) | `-webkit-print-color-adjust: exact; print-color-adjust: exact;` |
| **PDF A4 (Page 1 & Page 2)** | `1240 × 1754 px` (proporción A4 `1:1.4145`) | `--force-device-scale-factor=2` | `2480 × 3508 px` (equiv. 300 DPI A4) | A4 Portrait (`210 × 297 mm`), 1 o 2 páginas exactas | `@page { size: A4 portrait; margin: 0; }` + `html { zoom: 0.6398; }` |

**Flags obligatorios de Headless Chrome / Edge:**
```text
--headless=new --disable-gpu --no-sandbox --hide-scrollbars
--run-all-compositor-stages-before-draw --virtual-time-budget=8000
```
- Para PNG: añadir `--force-device-scale-factor=2 --window-size={W},{H} --screenshot={outPng}`
- Para PDF: añadir `--no-pdf-header-footer --print-to-pdf={outPdf}`

---

## 6. Especificación CSS Maestra (`tokens.css` + Bases Compartidas)

Bloque listo para ser la base única de `artifacts/src/styles/tokens.css`:

```css
/* ==========================================================================
   TURNOSWEB ARTIFACTS — MASTER DESIGN TOKENS (UNIFIED EDITORIAL PALETTE)
   ========================================================================== */
:root {
  /* Backgrounds & Surfaces */
  --bg-paper: #f1e9dc;
  --bg-cream: #f5efe6;
  --bg-surface: #faf5ec;
  --bg-surface-card: #faf7f2;
  --bg-surface-pure: #fcfbf9;
  --bg-surface-subtle: #e8dece;
  --bg-chip: #efe6dc;
  --bg-chip-deep: #e6dacb;
  --bg-blush: #f7ecee;
  --bg-blush-soft: #f4e9ec;
  --bg-blush-panel: #f3e6ea;
  --bg-step-circle: #ead9de;
  --bg-setup-col: #f8f2e8;

  /* Brand & Accents */
  --brand-primary: #9e4f5e;
  --brand-primary-deep: #843c4a;
  --brand-primary-border: #e2c3c9;
  --brand-primary-soft: rgba(158, 79, 94, 0.14);
  --brand-accent: #8c7258;
  --brand-accent-light: #efe7dc;
  --brand-accent-border: #d5c7b2;

  /* Semantic Success (Confirmations & WhatsApp) */
  --color-success: #2c6e49;
  --color-success-bg: #edf5f0;
  --color-success-border: #bfd9c9;
  --color-success-text: #225438;

  /* Inks & Borders */
  --ink-primary: #231c19;
  --ink-chip: #2f2725;
  --ink-secondary: #5c514b;
  --ink-muted: #786b64;
  --border-subtle: #ded3c2;
  --border-medium: #cdbfa9;
  --border-hairline: rgba(35, 28, 25, 0.09);

  /* Typography */
  --font-display: 'Cormorant Garamond', Georgia, serif;
  --font-heading: 'Plus Jakarta Sans', 'Segoe UI', system-ui, sans-serif;
  --font-body: 'Inter', 'Segoe UI', system-ui, sans-serif;

  /* Radii */
  --radius-sm: 10px;
  --radius-md: 14px;
  --radius-lg: 18px;
  --radius-xl: 22px;
  --radius-card: 28px;
  --radius-qr: 34px;
  --radius-pill: 999px;

  /* Warm Shadows */
  --shadow-subtle: 0 2px 6px rgba(35, 28, 25, 0.04);
  --shadow-pricing: 0 8px 24px rgba(158, 79, 94, 0.06);
  --shadow-phone: 0 14px 32px rgba(35, 28, 25, 0.09);
  --shadow-editorial:
    0 24px 60px rgba(158, 79, 94, 0.09),
    0 6px 18px rgba(35, 28, 25, 0.04);
}

*,
*::before,
*::after {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body {
  color: var(--ink-primary);
  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  -webkit-print-color-adjust: exact;
  print-color-adjust: exact;
}

a {
  color: inherit;
  text-decoration: none;
}
```

### 6.1 Variables Globales de Negocio (Configuración Única)
Todos los artefactos consumen un mismo objeto de configuración para actualizar contacto, links o tarifas en segundos:

```js
export const BRAND_CONFIG = {
  productName: 'TurnosWeb',
  demoUrl: 'https://turneado.app',
  demoHost: 'turneado.app',
  authorName: 'Maximiliano Giménez',
  authorSiteUrl: 'https://maxigimenez.com.ar',
  authorSiteHost: 'maxigimenez.com.ar',
  whatsappDisplay: '+54 9 11 4067-5852',
  whatsappUrl: 'https://wa.me/5491140675852',
  pricing: {
    monthlyAmount: '18.000',
    monthlyPeriod: '/ mes',
    setupAmount: '25.000',
    setupPeriod: 'pago único',
    currencySymbol: '$',
  },
};
```
