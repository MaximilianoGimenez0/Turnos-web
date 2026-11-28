# TODO — Comercial: Landing Turneado, Centro de Ayuda, Tarjetas de Negocio y Revisión de PDFs

> **Estado:** Implementado en [specs/14-landing-help-center-and-business-cards.md](../../specs/14-landing-help-center-and-business-cards.md) y `artifacts/src/` (revisión comercial continua)  
> **Prioridad:** Media (Expansión comercial, soporte y entregables del producto)  
> **Ámbito:** `src/views/Landing/`, `src/views/Help/`, `src/utils/pdfGenerator.ts`, tarjetas de presentación  

---

## 1. Contexto y Objetivos
Para consolidar la plataforma como un producto SaaS comercial completo (`turneado.app` / `turneado.com`), se requiere la landing page principal del producto, un centro de ayuda estructurado para usuarios finales y profesionales, y una revisión rigurosa de los entregables visuales físicos y digitales (tarjetas de presentación del negocio y comprobantes PDF descargables).

---

## 2. Requerimientos Detallados

### A. Landing Oficial de Producto (`turneado.com/` / `turneado.app/`)
- **Propósito:** Presentar el producto a nuevos profesionales de servicios (peluquerías, barberías, estudios de uñas, tatuadores, consultorios).
- **Secciones Clave:**
  - **Hero:** Propuesta de valor clara ("La plataforma más rápida y elegante para gestionar tus turnos y señas online"). Botón CTA a registro/demo.
  - **Social Proof / Vista Previa:** Mockups interactivos o capturas cuidadas de `ClientView` y `AdminView`.
  - **Beneficios Principales:** Cobro automático de señas con Mercado Pago, agenda 24/7, recordatorios automáticos por WhatsApp/email, personalización visual completa.
  - **Precios / Planes:** Comparativa transparente de planes.
  - **FAQ y Footer Institucional.**

### B. Sección / Centro de Ayuda
- **Propósito:** Reducir tickets de soporte y resolver dudas frecuentes tanto de administradores como de clientes.
- **Contenidos Esenciales:**
  - Guía de inicio rápido para el profesional (cómo conectar Mercado Pago, cómo cargar servicios, cómo definir horarios).
  - Guía para el cliente (cómo reservar un turno, cómo pagar la seña, qué pasa si cancelo o reprogramo).
  - Búsqueda interactiva de artículos o acordeón categorizado.
  - Botón de contacto directo con soporte (vía WhatsApp o email).


### C. Auditoría y Rediseño de Comprobantes PDF
- **Propósito:** Elevar la calidad estética y formal de los comprobantes de turno y recibos generados por el sistema (`pdfGenerator.ts`).
- **Puntos a Revisar:**
  - Layout editorial limpio: cabecera con logo del estudio, datos fiscales/legales (si aplica) y número de comprobante.
  - Detalle minucioso: fecha, hora, duración, profesional a cargo, servicio, extras desglosados, recargos y estado del pago (Señado / Pagado / Saldo presencial).
  - Pie de página con términos de cancelación, dirección del local y enlace directo a la ubicación en Google Maps.
  - Garantizar renderizado perfecto en cualquier lector de PDF sin cortes de página huérfanos.

---

## 3. Componentes y Archivos Afectados
- `src/views/Landing/LandingView.tsx` *(nueva vista institucional)*
- `src/views/Help/HelpView.tsx` *(nueva sección de ayuda)*
- `src/components/BusinessCards/` *(generador y visualizador de tarjetas)*
- `src/utils/pdfGenerator.ts` *(función de generación de comprobantes con jsPDF)*

---

## 4. Checklist de Tareas (TODO)
- [ ] Diseñar wireframe y contenido de la landing page institucional `turneado.com/`.
- [ ] Crear componente de Centro de Ayuda con preguntas frecuentes categorizadas y soporte.
- [ ] Auditar el generador de tarjetas de presentación (QR, resolución, exportación).
- [ ] Rediseñar la plantilla del PDF de comprobante de turno garantizando legibilidad y elegancia tipográfica.
- [ ] Validar flujos de navegación hacia estas nuevas secciones desde el navbar y footer.
