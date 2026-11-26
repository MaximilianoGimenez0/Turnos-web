# Definición de Artefacto — Business Card (Frente / Front)

> **Archivo de salida objetivo:** `public/artifacts/business-cards/turneado-card-front.png` (y página 1 de `turneado-card-print.pdf` si se genera versión imprenta)
> **Sistema visual base:** [01-design-system-and-css-spec.md](./01-design-system-and-css-spec.md)

---

## 1. Ficha Técnica y Especificaciones de Salida

| Propiedad | Valor |
| :--- | :--- |
| **Nombre del artefacto** | Tarjeta de Presentación Turneado — Frente (*Editorial Showcase*) |
| **Relación de aspecto** | `16:9` panorámica full-bleed (ideal para envío digital por WhatsApp/LinkedIn, portada de portfolio y recorte horizontal de tarjeta 90×50 mm) |
| **Canvas CSS** | `1600 × 900 px` (`overflow: hidden`) |
| **Resolución PNG final** | `3200 × 1800 px` (`--force-device-scale-factor=2`) |
| **Zona segura (print/margen)** | `padding: 50px 72px 44px` (aire mínimo garantizado de `44px` superior/inferior y `72px` lateral) |
| **Estética dominante** | Editorial cálido crema-sobre-crema, borderless tonal, tipografía serif de alto contraste + UI real minimalista |

---

## 2. Objetivo Comercial e Impacto Esperado

- **Objetivo principal:** Presentar **Turneado** en menos de 3 segundos como una plataforma elegante, moderna y confiable de reservas con seña, logrando que un dueño de estudio o profesional reconozca inmediatamente el valor del producto **y quiera dar vuelta la tarjeta o entrar a la demo**.
- **Audiencia:** Propietarios de estudios de estética, salones de belleza, barberías, spa, consultorios y profesionales independientes que gestionan turnos por WhatsApp o Instagram.
- **Impacto psicológico deseado (Regla de los 3 segundos):**
  1. **0–1s (Emoción y categoría):** *"Esto se ve fino, cuidado y a la altura de mi marca"* → logra confianza por la tipografía Cormorant Garamond + paleta crema/mauve sin ruido visual.
  2. **1–2s (Propuesta de valor tangible):** *"Reservas online con seña garantizada, diseño con mi propia marca y cero ausentismo"* → conecta directo con el dolor #1 del negocio.
  3. **2–3s (Prueba visual instantánea):** La tarjeta mockup derecha demuestra cómo se ve un turno confirmado real (horario, servicio, extras, seña online y comprobante por email) sin saturar de capturas.

---

## 3. Paleta Aplicada por Zona

| Zona / Elemento | Fondo | Texto / Trazo | Borde / Sombra |
| :--- | :--- | :--- | :--- |
| Lienzo `.card-front` | `--bg-cream` (`#f5efe6`) + halos radiales blush arriba-der y arena abajo-izq | `--ink-primary` (`#231c19`) | Sin bordes |
| Header brand lockup | Transparente | Isotipo y kicker: `--brand-primary-deep` (`#843c4a`); subtítulo: `--ink-muted` (`#786b64`) | — |
| Indicador en vivo (arriba der.) | Halo `--brand-primary-soft` + núcleo `--brand-primary-deep` | `--brand-primary-deep` (`#843c4a`) | — |
| Título `Turneado` | — | `--ink-primary` (`#231c19`) | — |
| Subtítulo emocional (*itálica*) | — | `--brand-primary-deep` (`#843c4a`) | — |
| Descripción corta | — | `--ink-secondary` (`#5c514b`) | — |
| Chips 2×2 (`.front-feature-chip`) | `--bg-chip` (`#efe6dc`) | `--ink-chip` (`#2f2725`); punto `--brand-primary-deep` | Sin borde (separación tonal) |
| Tarjeta Preview derecha | `--bg-surface-card` (`#faf7f2`) | `--ink-primary` (`#231c19`) | `--shadow-editorial` |
| Día activo en strip (`Mar 24`) | `--brand-primary-deep` (`#843c4a`) | `--bg-surface-card` (`#faf7f2`) | — |
| Superficie del turno dentro de preview | `--bg-cream` (`#f5efe6`) | Horario/Servicio: `--ink-primary`; duración pill `--bg-chip-deep`; seña: `--brand-primary-deep` | Filete superior de depósito `--border-hairline` |
| Barra "Turno confirmado" | `--bg-blush-soft` (`#f4e9ec`) | Título e ícono check: `--brand-primary-deep`; subtítulo `--ink-secondary` | — |
| Footer integrado | Transparente | Labels: `--ink-muted`; URL: `--brand-primary-deep`; Autor: `--ink-primary` | `border-top: 1px solid var(--border-hairline)` |

---

## 4. Tipografía Exacta por Elemento

| Elemento | Selector | Familia | Tamaño | Peso / Estilo | Line-height | Tracking / Extras |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Kicker header | `.front-brand-kicker` | `--font-heading` | `15px` | `600` | `1.2` | `0.12em`, `uppercase` |
| Sub header | `.front-brand-sub` | `--font-body` | `14px` | `500` | `1.2` | `0.11em`, `uppercase` |
| Indicador en vivo | `.live-indicator-text` | `--font-heading` | `14px` | `600` | `1.2` | `0.14em`, `uppercase` |
| **Título principal** | `.front-title` | `--font-display` | `124px` | `500` | `0.92` | `-0.025em` |
| **Subtítulo valor** | `.front-subtitle` | `--font-display` | `44px` | `400 italic` | `1.14` | `-0.005em` |
| Descripción | `.front-description` | `--font-body` | `22.5px` | `400` | `1.48` | `text-wrap: balance`, `max-width: 690px` |
| Feature chips (×4) | `.front-feature-chip` | `--font-heading` | `18px` | `500` | `1.2` | `white-space: nowrap` |
| Preview horario | `.preview-slot-time` | `--font-heading` | `32px` | `600` | `1.0` | `-0.02em`, `tabular-nums` |
| Preview servicio | `.preview-slot-service` | `--font-heading` | `20px` | `600` | `1.25` | — |
| Preview monto seña | `.preview-deposit-amount` | `--font-heading` | `23px` | `600` | `1.0` | `tabular-nums` |
| Footer label | `.footer-label` | `--font-heading` | `13.5px` | `600` | `1.2` | `0.13em`, `uppercase` |
| Footer value | `.footer-value` | `--font-heading` | `21px` | `500` (`600` URL) | `1.22` | `white-space: nowrap` |

---

## 5. Textos Exactos (Copy Actualizado)

> **Mejora respecto a la versión previa:** El subtítulo superior abre el espectro a estudios y profesionales sin perder el anclaje visual; la descripción y los 4 chips incorporan el nuevo diferencial clave de **estética 100% personalizable** y **cobro directo a Mercado Pago**.

### Header
- **Kicker:** `TURNEADO · SISTEMA DE RESERVAS & AGENDA ONLINE`
- **Subtítulo:** `ESTÉTICA, BIENESTAR & ESTUDIOS PROFESIONALES`
  - *(Variante nicho exclusivo estética: `ESTÉTICA, BELLEZA & ESTUDIOS PROFESIONALES`)*
- **Indicador derecho:** `SINCRONIZACIÓN EN TIEMPO REAL`

### Columna Izquierda (Propuesta de Valor)
- **Título (`h1`):** `Turneado`
- **Subtítulo (*itálica*):** `Reservas online con seña garantizada y cero ausentismo.`
- **Descripción:** `Tu propia web con la estética de tu marca, agenda reactiva 24/7, cobro directo a tu Mercado Pago con bloqueo de 15 min y motor anti-solapamiento.`
- **Grilla 2×2 de Feature Chips (máx. 24 caracteres cada uno para mantener 1 sola línea):**
  1. `Seña con Mercado Pago`
  2. `Estética 100% de tu marca`
  3. `Motor Anti-Conflictos`
  4. `Backoffice, Emails & Métricas`

### Columna Derecha (Mockup de Turno Confirmado)
- **Etiqueta izquierda:** `Agenda en vivo`
- **Etiqueta derecha:** `NOVIEMBRE` *(o mes vigente al generar)*
- **Tira de 3 días:**
  - `LUN` / `23`
  - `MAR` / `24` *(estado activo)*
  - `MIÉ` / `25`
- **Tarjeta del turno:**
  - **Horario:** `10:30 hs` | **Duración:** `1h 15m`
  - **Servicio:** `Lifting de pestañas`
  - **Extras:** `+ Nutrición keratina` · `+ Tinte`
  - **Depósito:** `SEÑA ONLINE ASEGURADA` → `$5.000`
- **Barra de confirmación inferior:**
  - **Título:** `Turno confirmado al instante`
  - **Subtítulo:** `Comprobante con tu marca enviado por email`

### Footer Integrado
- **Izquierda:** Label `PLATAFORMA EN VIVO` → Valor `turneado.app`
- **Centro (opcional para versión comercial directa):** Label `WHATSAPP` → Valor `+54 9 11 4067-5852`
- **Derecha:** Label `DESARROLLO` (o `AUTOR`) → Valor `Maximiliano Giménez`

---

## 6. Distribución y Layout (1600 × 900 px)

```text
+---------------------------------------------------------------------------------+
| [50px padding top]                                                              |
|  [SVG 48] TURNEADO · SISTEMA DE RESERVAS...     (•) SINCRONIZACIÓN EN VIVO     |
|                                                                                 |
|  +---------------------------------------+   +-------------------------------+  |
|  |  Turneado  (124px serif)             |   |  • Agenda en vivo   NOVIEMBRE |  |
|  |  Reservas online con seña             |   |  [LUN 23] [MAR 24*] [MIÉ 25]  |  |
|  |  garantizada y cero ausentismo.       |   |  +-------------------------+  |  |
|  |                                       |   |  | 10:30 hs         1h 15m |  |  |
|  |  Tu propia web con la estética de tu  |   |  | Lifting de pestañas     |  |  |
|  |  marca, agenda reactiva 24/7...       |   |  | [+ Keratina] [+ Tinte]  |  |  |
|  |                                       |   |  | ----------------------- |  |  |
|  |  [• Seña con MP  ] [• Estética propia]|   |  | SEÑA ASEGURADA   $5.000 |  |  |
|  |  [• Anti-Conflic.] [• Backoffice/Mail]|   |  +-------------------------+  |  |
|  |                                       |   |  [(✓) Turno confirmado... ]   |  |
|  +---------------------------------------+   +-------------------------------+  |
|          62% ancho (1.66fr)          54px gap         38% ancho (1fr, max 504)  |
| ------------------------------------------------------------------------------- |
|  PLATAFORMA EN VIVO                                                      AUTOR  |
|  turneado.app                             Maximiliano Giménez  |
| [44px padding bottom]                                                           |
+---------------------------------------------------------------------------------+
```

### Reglas de Distribución Exactas
- **Contenedor raíz (`.card-front`):** `width: 1600px; height: 900px; padding: 50px 72px 44px; display: flex; flex-direction: column; justify-content: space-between;`.
- **Bloque central (`.front-main`):** `display: grid; grid-template-columns: minmax(0, 1.66fr) minmax(0, 1fr); gap: 54px; align-items: center; margin: auto 0;`.
- **Grilla de chips (`.front-features-grid`):** `margin-top: 30px; max-width: 710px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px 14px;`.
- **Tarjeta preview (`.preview-card`):** `width: 100%; max-width: 504px; border-radius: 28px; padding: 26px 28px; gap: 16px;`.

---

## 7. Especificación CSS Específica (`.card-front`)

```css
.card-front {
  width: 1600px;
  height: 900px;
  background: var(--bg-cream);
  position: relative;
  overflow: hidden;
  padding: 50px 72px 44px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.card-front::before {
  content: '';
  position: absolute;
  top: -180px;
  right: -120px;
  width: 920px;
  height: 920px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(158, 79, 94, 0.075) 0%,
    rgba(158, 79, 94, 0.025) 42%,
    rgba(158, 79, 94, 0) 72%
  );
  pointer-events: none;
  z-index: 0;
}

.card-front::after {
  content: '';
  position: absolute;
  bottom: -240px;
  left: -140px;
  width: 780px;
  height: 780px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(140, 114, 88, 0.085) 0%,
    rgba(140, 114, 88, 0) 70%
  );
  pointer-events: none;
  z-index: 0;
}

.card-front > * {
  position: relative;
  z-index: 1;
}

.front-main {
  display: grid;
  grid-template-columns: minmax(0, 1.66fr) minmax(0, 1fr);
  gap: 54px;
  align-items: center;
  margin: auto 0;
  padding: 8px 0;
}

.preview-card {
  width: 100%;
  max-width: 504px;
  background: var(--bg-surface-card);
  border-radius: var(--radius-card);
  padding: 26px 28px;
  display: flex;
  flex-direction: column;
  gap: 16px;
  box-shadow: var(--shadow-editorial);
}

.front-footer {
  padding-top: 22px;
  border-top: 1px solid var(--border-hairline);
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 32px;
}
```

---

## 8. Checklist de QA Antes de Aprobar el Render

- [ ] Resolución exacta `3200 × 1800 px` sin scrollbars ni recorte de sombra en la tarjeta derecha.
- [ ] Ningún chip de la grilla 2×2 se parte en dos líneas ni desborda el contenedor.
- [ ] Contraste de `--brand-primary-deep` (`#843c4a`) sobre `--bg-cream` (`#f5efe6`) y de texto blanco sobre `MAR 24` verificado ≥ 6:1.
- [ ] Alineación vertical equilibrada entre el bloque editorial izquierdo y la tarjeta de turno derecha (respiración homogénea arriba y abajo).
- [ ] Fuentes `Cormorant Garamond`, `Plus Jakarta Sans` e `Inter` completamente cargadas (sin fallback a Times/Segoe UI).
