# Definición de Artefacto — PDF Comercial: Página 2 (Details / Propuesta, Tecnología y Precios)

> **Archivos de salida objetivo:**
> - Página 2 de `public/artifacts/pdf/turnosweb-dossier-comercial.pdf`
> - Hoja individual `public/artifacts/pdf/turnosweb-page-2-details.pdf`
> - Imagen alta resolución `public/artifacts/images/turnosweb-page-2-details.png` (ideal para enviar tras el primer contacto por WhatsApp)
>
> **Sistema visual base:** [01-design-system-and-css-spec.md](./01-design-system-and-css-spec.md)

---

## 1. Ficha Técnica y Especificaciones de Salida

| Propiedad | Valor |
| :--- | :--- |
| **Nombre del artefacto** | TurnosWeb — Dossier Comercial · Página 2: **Details (Detalle, Personalización, Plan y Capacidad)** |
| **Formato** | A4 Vertical (`210 × 297 mm`), 1 página exacta sin desborde |
| **Canvas CSS** | `1240 × 1754 px` (`padding: 32px 40px 28px`, ancho útil `1160px`, alto útil `1694px`) |
| **Resolución PNG final** | `2480 × 3508 px` (`--force-device-scale-factor=2`, equivalente a 300 DPI) |
| **Escala PDF Print** | `@page { size: A4 portrait; margin: 0; }` + `@media print { html { zoom: 0.6398; } }` |
| **Rol dentro del dossier** | **Conversión y cierre comercial**: responder objeciones reales, detallar personalización/seguridad, presentar inversión transparente con ROI evidente y mostrar capacidad técnica holgada |

---

## 2. Objetivo Comercial e Impacto Esperado

- **Objetivo principal:** Cerrar la decisión de compra eliminando las 4 objeciones habituales de un estudio o profesional independiente:
  1. **Objeción de costo ("¿me rinde pagarlo?"):** Demostrar con claridad matemática que evitando apenas **1 o 2 ausencias al mes**, el abono mensual ya se paga solo.
  2. **Objeción de marca ("¿se va a ver igual al de todos?"):** Detallar el **Estudio de Apariencia** (24 paletas o color propio, 8 tipografías, 5 portadas Hero y emails sincronizados) que hace que cada sitio parezca hecho a medida.
  3. **Objeción de pagos y confianza ("¿dónde va mi plata?"):** Explicar que la seña se cobra **directo en la cuenta de Mercado Pago del negocio**, con credenciales privadas en servidor, firma HMAC y **0% de comisión de TurnosWeb por turno**.
  4. **Objeción operativa ("¿me va a alcanzar si crezco?"):** Mostrar márgenes amplios (hasta 1.200 turnos/mes, +30.000 visitas/mes, automatización 24/7 con liberación automática de bloqueos cada 10 min).
- **Impacto buscado:** Transparencia total, sensación de solidez técnica y urgencia amable (*"¿Querés tu agenda online funcionando esta semana?"*).

---

## 3. Paleta Aplicada por Sección

| Sección | Superficie / Fondo | Acento / Íconos | Bordes |
| :--- | :--- | :--- | :--- |
| Lienzo `.a4-page` | `--bg-paper` (`#f1e9dc`) + halos radiales sutiles | — | — |
| Header `.doc-header` | Transparente; pill `--bg-blush` (`#f7ecee`) | `--brand-primary` (`#9e4f5e`) | `--border-subtle` / `--brand-primary-border` |
| Hero P2 | Transparente | Titular `--ink-primary`; énfasis *itálica* `--brand-primary` | — |
| Grilla Problemas (`2×3`) | Tarjetas `--bg-surface` (`#faf5ec`) | Badges `--bg-blush` + íconos `--brand-primary` | `--border-subtle` |
| **Banda Detalle Técnico & Marca (3 columnas)** | `--bg-surface-subtle` (`#e8dece`) o cards `--bg-surface` con acento superior sutil | Íconos `--brand-primary` (Apariencia), `--color-success` (Mercado Pago directo), `--brand-accent` (Automatización) | `--border-medium` / `--border-subtle` |
| **Tarjeta de Inversión (`.pricing-wrapper`)** | Columna mensual: `--bg-surface`; Columna alta: `--bg-setup-col` (`#f8f2e8`); ROI banner: degradado `var(--bg-blush) → var(--bg-surface-subtle)` | Mensual: `--brand-primary`; Alta: `--brand-accent`; Checks: `--color-success-bg` / `--color-success` | Contenedor `1.5px solid var(--brand-primary-border)` + `--shadow-pricing` |
| Grilla Capacidad (`3×1`) | `--bg-surface` (`#faf5ec`) | Cifras display `--brand-primary`; íconos `--bg-blush` / `--brand-primary` | `--border-subtle` |
| Footer + QR | Idéntico a Página 1 (WhatsApp verde + Demo mauve + QR) | — | `--border-subtle` |

---

## 4. Tipografía Exacta por Elemento (Página 2)

| Elemento | Selector | Familia | Tamaño | Peso / Estilo | Line-height | Tracking / Extras |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Hero P2 Título** | `.p2-title` | `--font-display` | `48px` | `600` (`em`: `500 italic`) | `1.04` | `-0.015em` |
| Hero P2 Subtítulo | `.p2-subtitle` | `--font-body` | `17.5px` | `400` | `1.44` | `max-width: 1060px` |
| Eyebrows de sección | `.section-eyebrow` | `--font-heading` | `13px` | `600` | `1.2` | `0.1em`, `uppercase` |
| Problema título / sol. | `.problem-pain` / `.problem-solution` | `--font-heading` / `--font-body` | `15.5px` / `14px` | `600` / `400` | `1.24` / `1.38` | — |
| Detalle técnico título / desc | `.pillar-title` / `.pillar-desc` | `--font-heading` / `--font-body` | `15.5px` / `13.8px` | `600` / `400` | `1.24` / `1.38` | — |
| Badge plan | `.price-badge` | `--font-heading` | `12px` | `600` | `1.1` | `0.08em`, `uppercase` |
| **Cifra precio** | `.price-amount` | `--font-display` | `66px` | `600` | `0.94` | `-0.02em`, `lining-nums tabular-nums` |
| Moneda / período | `.price-currency` / `.price-period` | `--font-display` / `--font-heading` | `38px` / `17.5px` | `600` / `500` | `1.0` | — |
| Ítems checklist plan | `.price-list li` | `--font-body` | `14.5px` | `400` | `1.36` | — |
| ROI banner | `.roi-banner` | `--font-heading` | `15.5px` | `500` (`strong`: `600`) | `1.3` | — |
| **Cifra capacidad** | `.capacity-num` | `--font-display` | `44px` | `600` | `1.0` | `lining-nums tabular-nums` |
| Capacidad label / desc | `.capacity-label` / `.capacity-desc` | `--font-heading` / `--font-body` | `15.5px` / `13.8px` | `600` / `400` | `1.25` / `1.38` | — |

---

## 5. Textos Exactos e Iconografía (Copy Actualizado)

> **Variables de precio editables:** Los montos (`$18.000 / mes` y `$25.000 pago único`) provienen de `BRAND_CONFIG.pricing` en `artifacts/src/config/brand.mjs` para poder ajustarlos en segundos al regenerar sin tocar plantillas.

### 5.1 Header (`.doc-header`)
- **Isotipo SVG (`54×54`)**
- **Kicker:** `TURNOSWEB · PROPUESTA COMERCIAL & DETALLE DEL SISTEMA`
- **Subtítulo:** `ESTÉTICA, BIENESTAR & ESTUDIOS PROFESIONALES`
- **Header Pill:** `(•) PLAN INTEGRAL · TODO INCLUIDO`

### 5.2 Hero Comercial (`.p2-hero`)
- **Título (`h1`):** `Ordená tu agenda y cuidá tu tiempo: ` *`un sistema que se paga solo evitando ausencias.`*
- **Subtítulo:** `Todo lo que tu estudio o consultorio necesita para automatizar reservas, personalizar su estética al detalle y cobrar señas directo en tu Mercado Pago — en un plan simple, claro y llave en mano.`

### 5.3 Sección 1 — `PROBLEMAS REALES QUE ELIMINA DESDE EL DÍA 1` (Grilla `2×3`)
1. `[shield]` **Ausencias y cancelaciones a último momento** — `La seña previa por Mercado Pago asegura el compromiso de cada cliente y protege el valor de tu horario.`
2. `[clock]` **Horas perdidas respondiendo "¿tenés turno?"** — `Un único enlace en tu Instagram o WhatsApp muestra tus horarios libres actualizados al segundo, las 24 h.`
3. `[calendarCheck]` **Superposición de horarios y errores manuales** — `El motor de duraciones bloquea automáticamente horarios en conflicto e impide dobles reservas simultáneas.`
4. `[dollar]` **Confusión con precios, extras y saldo pendiente** — `Cada cliente calcula su presupuesto al reservar y recibe por email cuánto señó y cuánto abona en el local.`
5. `[trendingUp]` **Falta de control sobre señas e ingresos del mes** — `Consultá señas recaudadas, ticket promedio, comprobantes de Mercado Pago y evolución por fecha en un clic.`
6. `[sparkles]` **Depender de apps genéricas que opacan tu marca** — `Tu propia web con tu URL, paleta, tipografías, portada, portfolio y correos diseñados con tu identidad.`

### 5.4 Sección 2 — `PERSONALIZACIÓN, COBROS Y RESPALDO TÉCNICO` *(Nuevo bloque de alto valor — 3 columnas compactas)*
1. `[palette]` **Estudio de Apariencia en 6 pasos**
   - `24 paletas curadas o tus colores propios con contraste WCAG AA, 8 tipografías, 5 diseños de portada, modo claro/oscuro y emails sincronizados.`
2. `[lock]` **Cobro directo en tu Mercado Pago**
   - `Conectás tu propia cuenta con credenciales privadas en servidor y firma criptográfica HMAC. 0% comisión extra de TurnosWeb por reserva.`
3. `[zap]` **Operación desatendida 24/7**
   - `Liberación automática de bloqueos vencidos cada 10 min, reintento inteligente de correos, protección de incidentes y URL dedicada (/:tu-negocio).`

### 5.5 Sección 3 — Tarjeta de Inversión + ROI Banner (`.pricing-wrapper`)

#### Columna Izquierda — `ABONO MENSUAL · TODO INCLUIDO`
- **Precio:** `$` **`18.000`** `/ mes` *(configurable en `BRAND_CONFIG.pricing`)*
- **Checklist (4 ítems con `[check]` verde):**
  1. `Web propia activa 24/7 con URL dedicada, hosting, base de datos y almacenamiento en la nube.`
  2. `Integración directa a tu cuenta de Mercado Pago (tarjetas, débito y dinero en cuenta) sin comisiones extra.`
  3. `Envío automático de comprobantes con tu marca por email para tus clientes y tu negocio.`
  4. `Mantenimiento automático de agenda, actualizaciones del sistema y soporte técnico incluidos.`

#### Columna Derecha — `ALTA DEL SERVICIO · UNA SOLA VEZ`
- **Precio:** `$` **`25.000`** `pago único` *(configurable en `BRAND_CONFIG.pricing`)*
- **Checklist (4 ítems con `[check]` verde):**
  1. `Puesta en marcha completa llave en mano lista para recibir reservas online en pocos días.`
  2. `Personalización visual completa: logo, portada, paleta, tipografías, biografía, ubicación y redes.`
  3. `Vinculación guiada de tu Mercado Pago y carga inicial de tus servicios, tarifas y adicionales.`
  4. `Acompañamiento inicial para que domines tu panel administrador y tu agenda en minutos.`

#### Banner ROI (inferior a ancho completo dentro de `.pricing-wrapper`)
- `[sparkles]` `Con evitar apenas ` **`1 o 2 ausencias al mes`**`, el abono mensual ya se paga solo y recuperás horas libres todas las semanas.`

### 5.6 Sección 4 — `CAPACIDAD ESTIMADA INCLUIDA EN EL PLAN` (Grilla `3×1`)
- **Nota derecha:** `Margen holgado para profesionales independientes y estudios de alta demanda`
- **3 Tarjetas:**
  1. **`HASTA 1.200`** `[calendarCheck]` — **`Turnos confirmados / mes`** — `Hasta ~40 turnos por día con cobro de seña, control anti-conflictos y doble comprobante por email.`
  2. **`+30.000`** `[users]` — **`Visitas mensuales a tu web`** — `Clientes entrando desde Instagram, WhatsApp y Google a ver tu agenda, precios y portfolio sin cortes.`
  3. **`24/7`** `[zap]` — **`Reservas en simultáneo`** — `Múltiples reservas a la vez con bloqueo atómico de 15 min y sincronización reactiva en tiempo real.`

### 5.7 Footer Compartido (`.doc-footer`)
- **CTA Title:** `¿Querés tu agenda online ` *`funcionando esta semana?`*
- **Contact Pills:** `[whatsapp] WhatsApp: +54 9 11 4067-5852` · `[globe] turneado.app`
- **Autor:** `Desarrollado por ` **`Maximiliano Giménez`** ` · maxigimenez.com.ar`
- **QR Card:** QR SVG `114×114` + `ESCANEAR DEMO EN VIVO` / **`Probá la plataforma`** / `turneado.app`

---

## 6. Distribución, Layout y Presupuesto Vertical (1240 × 1754 px)

```text
+-------------------------------------------------------------------+  0 px
| [padding: 32px 40px 28px · ancho útil: 1160px · alto útil: 1694px]|
| [HEADER: Propuesta Comercial & Detalle | Plan integral]     ~71px |
|                                                                   |
| Ordená tu agenda y cuidá tu tiempo: un sistema que se paga solo   | ~142px
| Subtítulo propuesta llave en mano...                              |
|                                                                   |
| PROBLEMAS REALES QUE ELIMINA DESDE EL DÍA 1                       |
| +-----------------------------+  +-----------------------------+  |
| | [1] Ausencias y no-show     |  | [2] Horas en WhatsApp       |  |
| | [3] Superposición horarios  |  | [4] Confusión de precios    |  | ~318px
| | [5] Control de señas        |  | [6] Apps genéricas          |  |
| +-----------------------------+  +-----------------------------+  |
|                                                                   |
| PERSONALIZACIÓN, COBROS Y RESPALDO TÉCNICO                        |
| [ Estudio Apariencia 6p ] [ MP Directo + HMAC ] [ Auto 24/7 ]     | ~148px
|                                                                   |
| +-------------------------------+-------------------------------+ |
| | ABONO MENSUAL · TODO INCLUIDO | ALTA DEL SERVICIO · 1 VEZ     | |
| | $ 18.000 / mes                | $ 25.000 pago único           | | ~398px
| | (✓) 4 ítems clave             | (✓) 4 ítems clave             | |
| +-------------------------------+-------------------------------+ |
| | [✦] Con evitar apenas 1 o 2 ausencias al mes se paga solo...  | |
| +---------------------------------------------------------------+ |
|                                                                   |
| CAPACIDAD ESTIMADA INCLUIDA EN EL PLAN                            |
| [ HASTA 1.200 turnos ] [ +30.000 visitas ] [ 24/7 simultáneo ]    | ~198px
|                                                                   |
| ----------------------------------------------------------------- |
| ¿Querés tu agenda online funcionando esta semana? +------------+  |
| [WhatsApp Pill]  [Demo Web Pill]                  | [QR] Probá |  | ~154px
| Desarrollado por Maximiliano Giménez              +------------+  |
+-------------------------------------------------------------------+ 1754 px
```

### Presupuesto Vertical Verificado
- **Altura total del lienzo:** `1754px` (`padding: 32px 40px 28px` → `1694px` internos).
- **Suma de bloques:** `71 + 142 + 318 + 148 + 398 + 198 + 154 = 1429px`.
- **Espaciado vertical (`gap` mínimo `16px × 6 = 96px`):** `1525px` ocupados → **`169px` de margen de respiro** repartido equilibradamente por `justify-content: space-between` (garantiza 1 sola página A4 impecable, sin desborde ni compresión visual).

---

## 7. Especificación CSS Clave de Página 2 (`pdf-a4.css`)

```css
.p2-page {
  padding: 32px 40px 28px;
  gap: 16px;
}

.problems-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 11px 16px;
}

.problem-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 14px;
  padding: 13px 16px;
  display: flex;
  align-items: flex-start;
  gap: 12px;
}

/* Nuevo bloque: Personalización, Cobros y Respaldo Técnico */
.pillars-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.pillar-card {
  background: var(--bg-surface-subtle);
  border: 1px solid var(--border-medium);
  border-radius: 14px;
  padding: 14px 16px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.pillar-head {
  display: flex;
  align-items: center;
  gap: 9px;
}

.pillar-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  color: var(--brand-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
}

.pricing-wrapper {
  background: var(--bg-surface);
  border: 1.5px solid var(--brand-primary-border);
  border-radius: 20px;
  overflow: hidden;
  box-shadow: var(--shadow-pricing);
}

.pricing-columns {
  display: grid;
  grid-template-columns: 1.06fr 0.94fr;
}

.price-col {
  padding: 22px 28px 20px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.price-col.setup-col {
  background: var(--bg-setup-col);
  border-left: 1px solid var(--border-subtle);
}

.capacity-grid {
  display: grid;
  grid-template-columns: repeat(3, 1fr);
  gap: 14px;
}

.capacity-card {
  background: var(--bg-surface);
  border: 1px solid var(--border-subtle);
  border-radius: 15px;
  padding: 15px 18px;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
```

---

## 8. Checklist de QA Antes de Aprobar el Render

- [ ] El PDF standalone (`turnosweb-page-2-details.pdf`) tiene exactamente **1 página** y el dossier combinado (`turnosweb-dossier-comercial.pdf`) tiene exactamente **2 páginas** (`countPdfPages === 2`).
- [ ] El PNG de Página 2 mide `2480 × 3508 px` sin recortes ni colisión con el footer.
- [ ] Las 6 tarjetas de problemas, las 3 tarjetas de personalización/seguridad y las 3 tarjetas de capacidad mantienen alturas uniformes por fila.
- [ ] Los precios (`$18.000 / mes` y `$25.000 pago único`) alinean correctamente moneda, cifra y período sobre la misma línea base (`align-items: baseline`).
- [ ] Todos los enlaces (`WhatsApp`, `demo`, `portfolio`, `QR`) son funcionales en el PDF exportado y el QR escanea limpiamente.
