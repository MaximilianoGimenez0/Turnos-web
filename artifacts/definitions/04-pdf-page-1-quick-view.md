# Definición de Artefacto — PDF Comercial: Página 1 (Quick View / Vista Rápida)

> **Archivos de salida objetivo:**
> - Página 1 de `public/artifacts/pdf/turnosweb-dossier-comercial.pdf`
> - Hoja individual `public/artifacts/pdf/turnosweb-page-1-quick-view.pdf`
> - Imagen alta resolución `public/artifacts/images/turnosweb-page-1-quick-view.png` (ideal para compartir directo por WhatsApp)
>
> **Sistema visual base:** [01-design-system-and-css-spec.md](./01-design-system-and-css-spec.md)

---

## 1. Ficha Técnica y Especificaciones de Salida

| Propiedad | Valor |
| :--- | :--- |
| **Nombre del artefacto** | TurnosWeb — Dossier Comercial · Página 1: **Quick View (Vista Rápida)** |
| **Formato** | A4 Vertical (`210 × 297 mm`), 1 página exacta sin desborde |
| **Canvas CSS** | `1240 × 1754 px` (`padding: 34px 40px 30px`, ancho útil `1160px`, alto útil `1690px`) |
| **Resolución PNG final** | `2480 × 3508 px` (`--force-device-scale-factor=2`, equivalente a 300 DPI) |
| **Escala PDF Print** | `@page { size: A4 portrait; margin: 0; }` + `@media print { html { zoom: 0.6398; } }` |
| **Rol dentro del dossier** | **Impacto y comprensión instantánea** (qué es, cómo se ve, cómo funciona y qué resuelve para el cliente y para el negocio) |

---

## 2. Objetivo Comercial e Impacto Esperado

- **Objetivo principal:** Funcionar como una **hoja ejecutiva autosuficiente ("Quick View")** que permita a cualquier profesional o dueño de estudio entender en **15–20 segundos**:
  1. Qué problema resuelve TurnosWeb (reservas 24/7 con seña garantizada directo a su Mercado Pago).
  2. Cómo lo vive un cliente real en el celular (mockup fiel, moderno y sin descargar apps).
  3. Qué lo diferencia radicalmente de apps genéricas (**Estudio de Apariencia con su propia marca**, web + correos sincronizados, y calculadora/agenda en vivo).
  4. Qué gana tanto el cliente final como el dueño en su operación diaria.
- **Impacto buscado:** Generar el efecto *"esto es exactamente lo que necesito, ¿cuánto sale y cómo lo implemento?"* — puente natural hacia la **Página 2 (Details)** o hacia un mensaje inmediato por WhatsApp / escaneo de la demo.

---

## 3. Paleta Aplicada por Sección

| Sección | Superficie / Fondo | Acento / Íconos | Bordes |
| :--- | :--- | :--- | :--- |
| Lienzo `.a4-page` | `--bg-paper` (`#f1e9dc`) + halos blush arriba-der y arena abajo-izq | — | — |
| Header `.doc-header` | Transparente; pill `--bg-blush` (`#f7ecee`) | Isotipo y pill: `--brand-primary` (`#9e4f5e`) | `border-bottom: 1px solid var(--border-subtle)`; pill `--brand-primary-border` |
| Hero pills (×3) | `--bg-surface` (`#faf5ec`) | Íconos: `--brand-primary` | `--border-medium` (`#cdbfa9`) + `--shadow-subtle` |
| Escenario Phone Mockup | `linear-gradient(145deg, #f6ecee 0%, #f3ece3 100%)` | Dispositivo `--bg-paper`, tarjetas `--bg-surface`, CTA y día activo `--brand-primary`, badge vivo y toast confirmación `--color-success-bg` / `--color-success` | Escenario `--brand-primary-border`; marco teléfono `2px solid #d5c7bc` |
| Caja "3 Pasos" `.steps-box` | Contenedor `--bg-surface`; tarjetas internas `--bg-paper` | Números `1 · 2 · 3`: `--bg-blush` + `--brand-primary` | `--border-subtle` |
| Panel izquierdo **"Para tus clientes"** | `--bg-surface` (`#faf5ec`) | Kicker, badge e íconos: `--brand-primary` (`#9e4f5e`) | `--border-subtle` |
| Panel derecho **"Para tu estudio"** | `#fdfbf8` (sutil contraste cálido) | Kicker, badge e íconos: `--brand-accent` (`#8c7258`) sobre `--brand-accent-light` | `--brand-accent-border` (`#d5c7b2`) |
| Franja 4 Highlights | `--bg-surface-subtle` (`#e8dece`) | Íconos: `--brand-primary` | `--border-subtle` |
| Footer + QR | WhatsApp: `--color-success-bg`/`--color-success`; Demo: `--bg-blush`/`--brand-primary`; QR card: `--bg-surface` | QR tinta `#231c19` + finders `#9e4f5e` | `border-top: 1px solid var(--border-subtle)`; QR `--brand-primary-border` |

---

## 4. Tipografía Exacta por Elemento (Página 1)

| Elemento | Selector | Familia | Tamaño | Peso / Estilo | Line-height | Tracking / Extras |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Marca header | `.brand-kicker` / `.brand-sub` | `--font-heading` / `--font-body` | `15px` / `13.5px` | `600` / `500` | `1.2` | `0.09em` / `0.08em`, `uppercase` |
| Pill header | `.header-pill` | `--font-heading` | `13.5px` | `600` | `1.1` | `0.08em`, `uppercase` |
| **Hero título** | `.hero-brand-title` | `--font-display` | `74px` | `600` | `0.96` | `-0.02em` |
| **Hero tagline** | `.hero-tagline` | `--font-display` | `38px` | `500 italic` | `1.14` | — |
| Hero copy | `.hero-copy` | `--font-body` | `18.5px` | `400` | `1.5` | `max-width: 650px` |
| Hero pills (×3) | `.soft-pill` | `--font-heading` | `14.5px` | `500` | `1.2` | `white-space: nowrap` |
| Heading "3 pasos" | `.section-heading` | `--font-display` | `36px` | `600` (`em`: `500 italic`) | `1.1` | `-0.01em` |
| Paso título / desc | `.step-title` / `.step-desc` | `--font-heading` / `--font-body` | `17.5px` / `14.8px` | `600` / `400` | `1.25` / `1.42` | — |
| Panel título | `.panel-title` | `--font-display` | `32px` | `600` | `1.05` | — |
| Panel ítem | `.feature-text` (`strong` heading) | `--font-body` (`--font-heading`) | `15.8px` | `400` (`600`) | `1.44` | — |
| Highlights (×4) | `.highlight-chip` | `--font-heading` | `14.8px` | `500` | `1.2` | — |
| Footer CTA | `.footer-cta-title` | `--font-display` | `32px` | `600` (`em`: `500 italic`) | `1.08` | — |

---

## 5. Textos Exactos e Iconografía (Copy Actualizado)

> **Actualizaciones clave respecto a la hoja anterior:** Incorpora explícitamente el **Estudio de Apariencia** (24 paletas, tipografías, portada y correos sincronizados), el **cobro directo a la cuenta propia de Mercado Pago**, la **agenda en línea de tiempo** con huecos libres/turnos en curso, el **editor de servicios con extras y vista previa**, y adopta tono multirrubro elegante (*"tus clientes"*, *"tu estudio o consultorio"*).

### 5.1 Header (`.doc-header`)
- **Isotipo SVG (`54×54`)**
- **Kicker:** `TURNOSWEB · SISTEMA DE RESERVAS & AGENDA ONLINE`
- **Subtítulo:** `ESTÉTICA, BIENESTAR & ESTUDIOS PROFESIONALES`
- **Header Pill:** `(•) SINCRONIZACIÓN EN TIEMPO REAL`

### 5.2 Hero + Phone Mockup (`.hero-grid`)
- **Título (`h1`):** `TurnosWeb`
- **Tagline (*itálica*):** `Tu agenda online abierta 24/7, con seña garantizada y la estética de tu marca.`
- **Copy:** `Una web moderna personalizada al estilo de tu negocio para que tus clientes elijan servicio, día y horario, y aseguren su lugar abonando la seña directo en tu Mercado Pago — sin idas y vueltas por WhatsApp.`
- **3 Hero Pills:**
  1. `[creditCard]` `Seña directo a tu Mercado Pago`
  2. `[palette]` `Web y emails con tu marca`
  3. `[smartphone]` `Sin descargar apps`
- **Phone UI Mockup (columna derecha):**
  - Topbar: `[mini-logo]` `Estudio de Belleza` | Badge verde `Agenda en vivo`
  - Strip de 3 fechas (con indicador visual activo): `HOY 22 Nov` *(activo)* · `MAÑANA 23 Nov` · `MAR 24 Nov`
  - Tarjeta de turno:
    - Horario `10:30 hs` | Duración `1h 15m`
    - Servicio `Lifting de pestañas`
    - Extras `+ Nutrición keratina` · `+ Tinte`
    - Footer tarjeta: `SEÑA ONLINE` **`$5.000`** | Botón CTA `Reservar →`
  - Toast de confirmación: `[✓]` **`Turno confirmado al instante`** / `Comprobante con tu marca enviado al email`

### 5.3 Franja "Cómo Funciona" (`.steps-box`)
- **Heading:** `Turno asegurado ` *`en tres simples pasos`*
- **Eyebrow derecho:** `EXPERIENCIA SIN FRICCIÓN`
- **3 Tarjetas horizontales:**
  1. **`1` · `Elegí horario y servicios`** — `Disponibilidad real por fecha, franja horaria, tratamientos y adicionales con presupuesto estimado.`
  2. **`2` · `Aboná la seña online`** — `Bloqueo atómico por 15 minutos mientras paga directo en tu Mercado Pago (débito, crédito o saldo).`
  3. **`3` · `Confirmación automática`** — `Comprobante con los colores y logo de tu negocio por email para el cliente y para vos al instante.`

### 5.4 Comparativa 2 Columnas (`.columns-grid`)

#### Columna Izquierda — `SITIO PÚBLICO CON TU MARCA` / **`Para tus clientes`** *(Badge `[sparkles]`)*
1. `[calendar]` **Agenda reactiva 24/7:** buscador inteligente, tira de fechas deslizable, filtros mañana/tarde y vista rápida o en fichas.
2. `[calculator]` **Catálogo y calculadora interactiva:** combinan servicios y adicionales para ver duración y presupuesto estimado antes de reservar.
3. `[image]` **Perfil profesional y Portfolio:** mostrá tus mejores trabajos, biografía, ubicación, Instagram y acceso directo a tu WhatsApp.
4. `[lock]` **Reserva segura sin crear cuentas:** bloqueo temporal de 15 min que evita dobles pagos y cobro protegido vía Mercado Pago.
5. `[mail]` **Comprobantes claros con tu identidad:** email automático con fecha, horario, servicios, seña abonada y saldo restante presencial.

#### Columna Derecha — `PANEL PRIVADO DE GESTIÓN` / **`Para tu estudio`** *(Badge `[calendarCheck]`)*
1. `[clock]` **Agenda en línea de tiempo diaria:** vista por día, semana o mes con ocupación, huecos libres, turno en curso, saldo y botón a WhatsApp.
2. `[layers]` **Carga masiva de turnos y servicios:** generá múltiples fechas y horarios en segundos, y editá tarifas con adicionales inline y vista previa.
3. `[shield]` **Motor inteligente anti-solapamiento:** calcula duraciones combinadas, bloquea horarios en conflicto y los reactiva solos ante cancelaciones.
4. `[palette]` **Estudio de Apariencia en vivo:** elegí entre 24 paletas o tus colores propios, 8 tipografías, 5 portadas y modo claro/oscuro sincronizado con tus emails.
5. `[chart]` **Control manual, Mercado Pago y métricas:** asigná turnos de WhatsApp, conectá tu propio Mercado Pago y medí señas cobradas y ticket promedio.

### 5.5 Franja de 4 Highlights (`.highlights-strip`)
1. `[palette]` `24 paletas y marca propia`
2. `[moon]` `Modo claro y oscuro`
3. `[smartphone]` `100% móvil y escritorio`
4. `[zap]` `Cobro directo a tu MP`

### 5.6 Footer Compartido (`.doc-footer`)
- **CTA Title:** `Probá la experiencia real ` *`y consultame por WhatsApp`*
- **Contact Pills:**
  - `[whatsapp]` `WhatsApp: +54 9 11 4067-5852` (enlace `https://wa.me/5491140675852`)
  - `[globe]` `turneado.app` (enlace `https://turneado.app`)
- **Autor:** `Desarrollado por ` **`Maximiliano Giménez`** ` · maxigimenez.com.ar`
- **QR Card:** QR SVG `114×114` + `ESCANEAR DEMO EN VIVO` / **`Probá la plataforma`** / `turneado.app`

---

## 6. Distribución, Layout y Presupuesto Vertical (1240 × 1754 px)

```text
+-------------------------------------------------------------------+  0 px
| [padding-top: 34px · lateral: 40px · ancho útil: 1160px]          |
| [HEADER: Brand Lockup izq | Header Pill der]                ~71px |
|                                                                   |
| +-----------------------------------+  +-----------------------+  |
| | HERO COPY (1.28fr = ~668px)       |  | PHONE STAGE (0.88fr)  |  |
| | TurnosWeb / Tagline / Copy        |  |  Estudio · En vivo    |  |
| | [Pill 1] [Pill 2] [Pill 3]        |  |  [22] [23] [24]       |  | ~415px
| |                                   |  |  10:30 hs · $5.000    |  |
| |                                   |  |  (✓) Confirmado       |  |
| +-----------------------------------+  +-----------------------+  |
|                                                                   |
| +---------------------------------------------------------------+ |
| | TURNO ASEGURADO EN TRES SIMPLES PASOS      SIN FRICCIÓN       | | ~205px
| | [ (1) Elegí... ]   [ (2) Aboná... ]   [ (3) Confirmación... ] | |
| +---------------------------------------------------------------+ |
|                                                                   |
| +-----------------------------+  +-----------------------------+  |
| | PARA TUS CLIENTES (1fr)     |  | PARA TU ESTUDIO (1fr)       |  |
| | • Item 1                    |  | • Item 1                    |  |
| | • Item 2                    |  | • Item 2                    |  | ~585px
| | • Item 3                    |  | • Item 3                    |  |
| | • Item 4                    |  | • Item 4                    |  |
| | • Item 5                    |  | • Item 5                    |  |
| +-----------------------------+  +-----------------------------+  |
|                                                                   |
| [Chip 1]         [Chip 2]         [Chip 3]         [Chip 4] ~52px |
| ----------------------------------------------------------------- |
| Probá la experiencia real y consultame...       +--------------+  |
| [WhatsApp Pill]  [Demo Web Pill]                | [QR] Probá   |  | ~156px
| Desarrollado por Maximiliano Giménez            +--------------+  |
| [padding-bottom: 30px]                                            |
+-------------------------------------------------------------------+ 1754 px
```

### Presupuesto Vertical Verificado
- **Altura total del lienzo:** `1754px` (`padding: 34px 40px 30px` → `1690px` internos).
- **Suma de bloques:** `71 + 415 + 205 + 585 + 52 + 156 = 1484px`.
- **Espaciado vertical (`gap` mínimo `20px × 5 = 100px`):** `1584px` ocupados → **`106px` de margen de seguridad** distribuidos armónicamente por `justify-content: space-between` (cero riesgo de salto a una segunda hoja PDF).

---

## 7. Especificación CSS Clave de Página 1 (`pdf-a4.css`)

```css
.a4-page {
  width: 1240px;
  height: 1754px;
  background: var(--bg-paper);
  position: relative;
  overflow: hidden;
  padding: 34px 40px 30px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  gap: 20px;
  page-break-after: always;
  break-after: page;
}

.hero-grid {
  display: grid;
  grid-template-columns: 1.28fr 0.88fr;
  gap: 28px;
  align-items: center;
}

.steps-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 16px;
}

.columns-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 20px;
}

.feature-panel {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: var(--radius-lg);
  padding: 24px 26px;
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.feature-panel.admin-panel {
  background: #fdfbf8;
  border-color: var(--brand-accent-border);
}

.highlights-strip {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 14px;
}
```

---

## 8. Checklist de QA Antes de Aprobar el Render

- [ ] El PDF standalone (`turnosweb-page-1-quick-view.pdf`) cuenta exactamente **1 página** y el PNG mide `2480 × 3508 px`.
- [ ] Las 2 columnas ("Para tus clientes" y "Para tu estudio") tienen altura visual balanceada (diferencia de líneas ≤ 1 renglón).
- [ ] Los 3 pills del hero entran en una sola fila horizontal sin provocar una segunda fila huérfana (ajustar texto si excede `668px`).
- [ ] El mockup del teléfono conserva sombras suaves sin cortarse contra el borde de `.phone-stage`.
- [ ] Los enlaces del footer (`WhatsApp`, `demo`, `portfolio`, `QR`) son clickeables en el PDF resultante.
