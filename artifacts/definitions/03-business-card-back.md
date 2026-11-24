# Definición de Artefacto — Business Card (Dorso / Back)

> **Archivo de salida objetivo:** `public/artifacts/business-cards/turnosweb-card-back.png` (y página 2 de `turnosweb-card-print.pdf` si se genera versión imprenta)
> **Sistema visual base:** [01-design-system-and-css-spec.md](./01-design-system-and-css-spec.md)

---

## 1. Ficha Técnica y Especificaciones de Salida

| Propiedad | Valor |
| :--- | :--- |
| **Nombre del artefacto** | Tarjeta de Presentación TurnosWeb — Dorso (*Split-Screen Editorial & QR*) |
| **Relación de aspecto** | `16:9` panorámica full-bleed |
| **Canvas CSS** | `1600 × 900 px` (`overflow: hidden`) |
| **Resolución PNG final** | `3200 × 1800 px` (`--force-device-scale-factor=2`) |
| **Estructura** | Split-screen asimétrico `58%` (`928px`) izquierda crema cálido / `42%` (`672px`) derecha panel blush rosado full-bleed |
| **Estética dominante** | Contraste arquitectónico cálido (crema vs blush suave), lista editorial espaciada de 3 pasos + QR protagonista en tarjeta marfil pura |

---

## 2. Objetivo Comercial e Impacto Esperado

- **Objetivo principal:** Convertir el interés generado por el frente en una **acción inmediata** (escanear el código QR para probar la demo real en vivo o contactar por WhatsApp/web), demostrando que el flujo completo es tan simple que se explica en 3 pasos.
- **Impacto psicológico deseado:**
  1. **Claridad sin fricción:** *"Si esto se explica en 3 pasos tan claros, mis clientes lo van a saber usar sin escribirme por WhatsApp"*.
  2. **Imán visual hacia el QR:** El cambio de color full-bleed del panel derecho (`#f3e6ea`) y la tarjeta elevada marfil (`#fcfbf9`) conducen automáticamente la vista al QR de `348×348px`, maximizando la tasa de escaneo tanto en pantalla como impreso.
  3. **Respaldo de autoría:** Cierre limpio y directo con el nombre del desarrollador, sitio personal y contacto de WhatsApp (opcional configurable) sin recargar la composición.

---

## 3. Paleta Aplicada por Zona

| Zona / Elemento | Fondo | Texto / Trazo | Borde / Sombra |
| :--- | :--- | :--- | :--- |
| Panel izquierdo `.back-left` (`58%`) | `--bg-cream` (`#f5efe6`) + halo radial arena suave abajo-izq | `--ink-primary` (`#231c19`) | Sin bordes |
| Eyebrow superior | — | `--brand-primary-deep` (`#843c4a`) | — |
| Título `Turno asegurado` | — | `--ink-primary` (`#231c19`) | — |
| Subtítulo `en tres simples pasos.` | — | `--brand-primary-deep` (`#843c4a`) | — |
| Círculos numerados `1 · 2 · 3` | `--bg-step-circle` (`#ead9de`) | `--brand-primary-deep` (`#843c4a`) | Sin borde |
| Títulos de paso | — | `--ink-primary` (`#231c19`) | — |
| Descripciones de paso | — | `--ink-secondary` (`#5c514b`) | — |
| Footer autoría/contacto | — | Base: `--ink-muted` (`#786b64`); nombre: `--ink-primary`; link/host: `--brand-primary-deep` | — |
| Panel derecho `.back-right` (`42%`) | `--bg-blush-panel` (`#f3e6ea`) + halo radial marfil central | — | Full-bleed hasta los bordes |
| Tarjeta QR `.qr-editorial-card` | `--bg-surface-pure` (`#fcfbf9`) | — | `--shadow-editorial` (`border-radius: 34px`) |
| Código QR SVG (`29×29`) | `#fcfbf9` (quiet zone integrada) | Módulos: `--ink-primary` (`#231c19`); centros finders: `--brand-primary-deep` (`#843c4a`) | Sin borde |
| Caption debajo del QR | — | Kicker: `--brand-primary-deep`; URL: `--ink-primary` | — |

---

## 4. Tipografía Exacta por Elemento

| Elemento | Selector | Familia | Tamaño | Peso / Estilo | Line-height | Tracking / Extras |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| Eyebrow | `.back-eyebrow` | `--font-heading` | `15px` | `600` | `1.2` | `0.14em`, `uppercase` |
| **Título principal** | `.back-title` | `--font-display` | `94px` | `500` | `0.94` | `-0.02em` |
| **Subtítulo itálica** | `.back-subtitle` | `--font-display` | `58px` | `400 italic` | `1.1` | — |
| Número de paso (`1–3`) | `.step-circle` | `--font-heading` | `20px` | `600` | `1.0` | `tabular-nums` |
| Título de paso | `.step-title` | `--font-heading` | `25.5px` | `600` | `1.24` | — |
| Descripción de paso | `.step-desc` | `--font-body` | `21px` | `400` | `1.42` | — |
| Footer | `.back-footer` | `--font-body` | `18px` | `400` (`500` bold/host) | `1.3` | `0.01em` |
| QR kicker | `.qr-caption-kicker` | `--font-heading` | `14.5px` | `600` | `1.2` | `0.15em`, `uppercase` |
| QR URL | `.qr-caption-url` | `--font-heading` | `22px` | `600` | `1.2` | `-0.005em`, `white-space: nowrap` |

---

## 5. Textos Exactos (Copy Actualizado)

> **Mejora respecto a la versión previa:** Se precisa que la seña va directo a Mercado Pago con bloqueo de 15 min, que el comprobante llega con la **estética propia del estudio** y se suma el número de WhatsApp en el pie (o se mantiene minimalista según preferencia comercial).

### Panel Izquierdo (58%)
- **Eyebrow:** `TURNOSWEB · EXPERIENCIA DE RESERVA`
- **Título (`h1`):** `Turno asegurado`
- **Subtítulo (*itálica*):** `en tres simples pasos.`
- **Lista de 3 Pasos:**
  1. **Paso 1**
     - **Título:** `Elegí horario, servicios y extras`
     - **Descripción:** `Disponibilidad real 24/7 con duración y presupuesto estimado.`
  2. **Paso 2**
     - **Título:** `Aboná la seña online`
     - **Descripción:** `Bloqueo inmediato por 15 min directo en tu Mercado Pago.`
  3. **Paso 3**
     - **Título:** `Confirmación automática`
     - **Descripción:** `Comprobante con tu marca por email y agenda actualizada al instante.`
- **Footer (opción recomendada con contacto directo):**
  - `Desarrollado por `**`Maximiliano Giménez`**` · maxigimenez.com.ar · WhatsApp +54 9 11 4067-5852`
  - *(Variante minimalista sin teléfono, idéntica a la original: `Desarrollado por `**`Maximiliano Giménez`**` · maxigimenez.com.ar`)*

### Panel Derecho (42% — Bloque QR)
- **QR Destino:** `https://turneado.app` (redirección automática a `/demo`)
- **Kicker:** `ESCANEAR DEMO EN VIVO`
- **URL visible:** `turneado.app`

---

## 6. Distribución y Layout (1600 × 900 px)

```text
+-------------------------------------------------+-----------------------------------+
|  [64px top / 76px left / 64px right]            |  [Full-bleed #f3e6ea · 42% = 672px]|
|  TURNOSWEB · EXPERIENCIA DE RESERVA             |                                   |
|                                                 |      +-----------------------+    |
|  Turno asegurado                                |      |     [504px card]      |    |
|  en tres simples pasos.                         |      |   +---------------+   |    |
|                                                 |      |   |               |   |    |
|  (1)  Elegí horario, servicios y extras         |      |   |   QR SVG      |   |    |
|       Disponibilidad real 24/7 con duración...  |      |   |   348 x 348   |   |    |
|                                                 |      |   |   (finders    |   |    |
|  (2)  Aboná la seña online                      |      |   |    mauve)     |   |    |
|       Bloqueo inmediato por 15 min directo...   |      |   +---------------+   |    |
|                                                 |      |                       |    |
|  (3)  Confirmación automática                   |      |  ESCANEAR DEMO EN VIVO|    |
|       Comprobante con tu marca por email...     |      | turnos-web.maxigi...  |    |
|                                                 |      +-----------------------+    |
|                                                 |                                   |
|  Desarrollado por Maximiliano Giménez · ...     |                                   |
|  [54px bottom]                                  |                                   |
+-------------------------------------------------+-----------------------------------+
                 58% (928px)                                   42% (672px)
```

### Reglas de Distribución Exactas
- **Contenedor raíz (`.card-back`):** `width: 1600px; height: 900px; display: grid; grid-template-columns: 58% 42%; overflow: hidden;`.
- **Columna izquierda (`.back-left`):** `padding: 64px 64px 54px 76px; display: flex; flex-direction: column; justify-content: space-between;`.
- **Bloque de pasos (`.back-steps`):** `margin-top: 44px; display: flex; flex-direction: column; gap: 30px;`. Cada paso usa `gap: 22px` con `.step-circle` de `48×48px` (`flex-shrink: 0; margin-top: 2px;`).
- **Columna derecha (`.back-right`):** `display: flex; align-items: center; justify-content: center; padding: 50px;`.
- **Tarjeta QR (`.qr-editorial-card`):** `width: 504px; border-radius: 34px; padding: 44px 40px 38px; display: flex; flex-direction: column; align-items: center;`.
- **Caja QR (`.qr-box`):** `width: 348px; height: 348px;` + margen `margin-top: 26px` antes de `.qr-caption`.

---

## 7. Especificación CSS Específica (`.card-back`)

```css
.card-back {
  width: 1600px;
  height: 900px;
  display: grid;
  grid-template-columns: 58% 42%;
  overflow: hidden;
  position: relative;
}

.back-left {
  background: var(--bg-cream);
  position: relative;
  overflow: hidden;
  padding: 64px 64px 54px 76px;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.back-left::before {
  content: '';
  position: absolute;
  bottom: -220px;
  left: -160px;
  width: 720px;
  height: 720px;
  border-radius: 50%;
  background: radial-gradient(
    circle,
    rgba(140, 114, 88, 0.085) 0%,
    rgba(140, 114, 88, 0) 70%
  );
  pointer-events: none;
  z-index: 0;
}

.back-left > * {
  position: relative;
  z-index: 1;
}

.back-right {
  background: var(--bg-blush-panel);
  position: relative;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 50px;
}

.back-right::before {
  content: '';
  position: absolute;
  inset: -80px;
  background: radial-gradient(
    circle at 50% 48%,
    rgba(255, 252, 249, 0.55) 0%,
    rgba(158, 79, 94, 0.04) 52%,
    rgba(158, 79, 94, 0) 76%
  );
  pointer-events: none;
  z-index: 0;
}

.qr-editorial-card {
  position: relative;
  z-index: 1;
  width: 504px;
  background: var(--bg-surface-pure);
  border-radius: var(--radius-qr);
  padding: 44px 40px 38px;
  display: flex;
  flex-direction: column;
  align-items: center;
  box-shadow: var(--shadow-editorial);
}

.qr-box {
  width: 348px;
  height: 348px;
}
```

---

## 8. Checklist de QA Antes de Aprobar el Render

- [ ] Resolución exacta `3200 × 1800 px`, división limpia `58% / 42%` sin línea gris artificial entre columnas.
- [ ] **Prueba real de escaneo QR:** escanear la imagen generada desde la pantalla con cámara móvil y confirmar apertura instantánea de `https://turneado.app`.
- [ ] Las 3 descripciones de paso entran en 1 o máximo 2 líneas limpias sin acercarse al footer (`min-gap ≥ 40px` entre el paso 3 y el pie).
- [ ] La URL debajo del QR (`turneado.app`) no se corta ni toca los bordes laterales de la tarjeta marfil.
- [ ] Si se incluye WhatsApp en el footer izquierdo, verificar que la línea no haga wrap indeseado dentro de los `788px` útiles (`928 - 76 - 64`).
