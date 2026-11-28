# 12 — Recargo en Turnos (Creación, Cálculo Autoritativo y Visibilidad Integral)

> **Estado:** Implementado y verificado (`src/utils/surcharge.ts`, `functions/src/surcharge.ts` y visibilidad integral)  
> **Prioridad:** Alta  
> **Ámbito:** Modelo de datos (`src/types/`, `functions/src/`), Utilitarios de cálculo (`src/utils/surcharge.ts`, `functions/src/surcharge.ts`), Creación de turnos (`CreateSlotModal`), Proyección pública (`publicSlots.ts`), Componente reusable (`SurchargeBadge`), Tarjetas y vistas (`SlotCard`, `ClientView`, `BookingModal`, `AssignSlotModal`, `ConfirmedAgenda`, `PaymentSuccess`), Emails transaccionales (`emailService.ts`, `cronJobs.ts`) y Tests unitarios/integración.  
> **TODOs cubiertos:** [recargo-turnos-badges-y-visibilidad.md](../artifacts/todo/recargo-turnos-badges-y-visibilidad.md) y alcance de creación/cálculo de [recargo-turnos-configuracion.md](../artifacts/todo/recargo-turnos-configuracion.md).

---

## 1. Objetivos y Alcance

### Problema que resuelve
Actualmente todos los turnos publicados en un tenant heredan únicamente el precio base de los servicios seleccionados más sus extras, junto con una seña fija (`depositAmount`). Sin embargo, en la operación real los comercios suelen aplicar **recargos por tarifa especial** en feriados, fines de semana, turnos nocturnos o horarios de alta demanda.

Hoy existen dos brechas acopladas:
1. **Creación y cálculo:** `CreateSlotModal` y `adminCreateSlots` no permiten definir un recargo (monto fijo en ARS o porcentaje) ni su motivo al publicar turnos, ni existe cálculo autoritativo en backend (`validateAndNormalizeClientPayload`) que sume el recargo al precio estimado final y al saldo a abonar en el salón.
2. **Transparencia y visibilidad de punta a punta:** Para evitar sorpresas o reclamos al momento de pagar o en el salón, cualquier turno con recargo debe comunicarlo de forma **inmediata, clara e inequívoca** desde la grilla inicial de horarios hasta la agenda del administrador, la pantalla de confirmación y los correos electrónicos.

### Modelo económico real del sistema (decisión arquitectónica clave)
Del análisis del código actual (`CreateSlotModal`, `createPreference`, `useSlotBookingForm`, `emailService`):
- En Turneado, cada `Slot` define una **seña fija en ARS (`depositAmount`)** que el cliente abona online por Mercado Pago. El resto del servicio se abona presencialmente en el salón (`balanceDueAtSalon = Math.max(0, estimatedPrice - depositAmount)`).
- El **recargo del turno** se aplica al **precio total estimado del servicio** (`estimatedPrice`), incrementando de forma transparente el total y el saldo restante en salón:
  - **Recargo fijo (`type: 'fixed'`):** suma un monto entero en ARS (ej. `+$3.000`).
  - **Recargo porcentual (`type: 'percentage'`):** aplica un porcentaje entero sobre el subtotal de servicios + extras seleccionados: `Math.round((basePrice + extrasPrice) * (value / 100))`.
- **La seña online (`depositAmount`) continúa siendo el monto fijo explícito** que el administrador configura en el mismo Paso 01 de `CreateSlotModal`. Si el comercio desea cobrar una seña mayor en turnos con recargo, la ajusta en el campo de seña inmediatamente superior. En la UI de creación se muestra una aclaración explícita para eliminar cualquier ambigüedad.

### Qué incluye esta especificación
1. **Modelo de datos normalizado e inmutable:**
   - Campo opcional `surcharge?: SlotSurcharge | null` en `Slot`, `NewSlotData`, `AdminNewSlotInput` y `PublicSlotProjection`.
   - Snapshot inmutable del recargo aplicado dentro de `ClientData`, `PaymentAttemptDoc`, `PublicVerifiedBookingSummary` y `BookingEmailPayload`.
2. **Única Fuente de Verdad (SSOT) para cálculo y formato de recargos:**
   - `src/utils/surcharge.ts` (frontend) y `functions/src/surcharge.ts` (backend) con reglas idénticas de normalización, validación, cálculo en enteros ARS y formateo de etiquetas.
3. **Configuración de recargo en `CreateSlotModal`:**
   - Tarjeta/sección opcional de recargo en **Paso 01 (`Servicios y seña`)** con toggle activador, selector `Monto fijo ($)` / `Porcentaje (%)`, input numérico validado, campo de motivo visible al cliente con chips rápidos (`Feriado`, `Fin de semana`, `Horario nocturno`, `Tarifa especial`) y selector de alcance en lotes múltiples (`Todos los turnos`, `Solo feriados`, `Solo fines de semana`, `Feriados y fines de semana`).
   - Integración directa con el catálogo de feriados (Spec 11): atajo contextual en `holidayNoticeBox` del Paso 02 para activar recargo solo en feriados con 1 clic.
   - Previsualización por ítem en `Resumen en vivo`, estado en `FormProgressTracker` y resumen en el modal de confirmación de publicación múltiple (`pendingPublish`).
4. **Componente reusable `SurchargeBadge`:**
   - Badge semántica (tokens `--color-warning-*` validados en tema claro y oscuro con contraste WCAG AAA) en tres tamaños (`xs`, `sm`, `md`), tooltip descriptivo y soporte completo de accesibilidad (`aria-label`).
5. **Exposición obligatoria en todos los puntos de contacto:**
   - **Grilla de horarios del cliente (`SlotCard` y `ClientView` modo rápido/compacto).**
   - **Modal de reserva (`BookingModal`) y asignación manual (`AssignSlotModal`)** vía `SlotBookingModalFrame` + `PricingReceiptBox` + `useSlotBookingForm`.
   - **Pantalla de confirmación (`PaymentSuccess`)** con desglose completo retornado por `verifyPayment` (`toPublicBookingDetails`).
   - **Panel de administración (`SlotCard` completo y compacto, y `ConfirmedAgenda`).**
   - **Correos transaccionales (HTML y texto plano para cliente y comercio)** en `emailService.ts`, incluyendo el flujo de reintento automático en `cronJobs.ts`.
6. **Seguridad y consistencia backend:**
   - Validación estricta en `adminCreateSlotsCore`, proyección PII-free en `buildPublicSlotProjection`, cálculo autoritativo server-side en `validateAndNormalizeClientPayload` (el cliente no puede manipular el recargo ni el total) y preservación de `slot.surcharge` ante expiración, rechazo de pago o liberación manual del slot.

### Qué queda explícitamente fuera de alcance
- **Reglas automáticas globales persistidas en configuración del tenant** (ej. "siempre cobrar +20% después de las 20:00 en todos los lotes futuros"): el modelo `Slot.surcharge` queda listo para que una iteración futura pueda pre-poblar valores por defecto en `CreateSlotModal` sin migrar datos.
- **Edición masiva de recargos sobre slots ya creados** (actualmente los slots no tienen modal de edición general; se eliminan y recrean si están disponibles).
- **Generador de comprobantes PDF (`src/utils/pdfGenerator.ts`):** mencionado originalmente en `artifacts/todo/recargo-turnos-badges-y-visibilidad.md`, pero **no existe actualmente en el repositorio** (`artifacts/src/build.mjs` genera piezas comerciales, no comprobantes de reserva). El comprobante vigente es `PaymentSuccess` + emails transaccionales vía Amazon SESv2; los campos persistidos en `slot.clientData` dejan listo el insumo si a futuro se incorpora exportación PDF.
- **Cobro dinámico de seña como porcentaje automático del servicio** (hoy Mercado Pago cobra el `depositAmount` fijo definido por slot).

---

## 2. Modelo de Datos y Contratos

### 2.1 Tipos compartidos (`src/types/index.ts` y espejo en `functions/src/surcharge.ts`)

```ts
export type SurchargeType = 'fixed' | 'percentage';

export interface SlotSurcharge {
  type: SurchargeType;
  /** Monto entero en ARS (1..5_000_000) si type === 'fixed'; porcentaje entero (1..200) si type === 'percentage'. */
  value: number;
  /** Etiqueta breve visible para el cliente (ej. "Feriado", "Horario nocturno"). Máx. 60 caracteres. */
  reason?: string;
}
```

> **Por qué un objeto `SlotSurcharge` en `Slot` y campos resueltos en `ClientData`:**
> Usar `value` en la configuración del `Slot` y `surchargeAmount` (siempre en ARS resuelto) en `ClientData` evita la ambigüedad de reutilizar el nombre `surchargeAmount` tanto para `$3.000` como para `20%`. Además, omitir `surcharge` cuando no aplica mantiene limpios los documentos de Firestore y la proyección `public_meta/availability`.

### 2.2 Extensiones a interfaces existentes

| Interfaz / Documento | Campos a agregar | Propósito |
| --- | --- | --- |
| `Slot` (`src/types/index.ts`) | `surcharge?: SlotSurcharge \| null;` | Configuración del recargo del turno. |
| `NewSlotData` (`src/types/index.ts`) y `AdminNewSlotInput` (`functions/src/adminSlots.ts`) | `surcharge?: SlotSurcharge \| null;` | Payload al crear uno o múltiples turnos. |
| `PublicSlotProjection` (`src/types/index.ts`) y `buildPublicSlotProjection` (`functions/src/publicSlots.ts`) | `surcharge?: SlotSurcharge;` (solo cuando existe, en estados `available` y `pending_payment`) | Exponer recargo en `public_meta/availability` sin PII para `ClientView` y `BookingModal`. |
| `ClientData` (`src/types/index.ts`) y `ClientPayload` (`functions/src/bookingValidation.ts`) | `surchargeType?: SurchargeType;`<br>`surchargeValue?: number;`<br>`surchargeAmount?: number;`<br>`surchargeReason?: string;` | Snapshot inmutable del recargo calculado autoritativamente al confirmar/asignar. |
| `PublicVerifiedBookingSummary` (`src/types/index.ts`) y `toPublicBookingDetails` (`functions/src/index.ts`) | `basePrice?: number;`<br>`extrasPrice?: number;`<br>`surchargeType?: SurchargeType;`<br>`surchargeValue?: number;`<br>`surchargeAmount?: number;`<br>`surchargeReason?: string;` | Desglose transparente en `PaymentSuccess` sin exponer PII. |
| `BookingEmailPayload` (`src/types/index.ts` y `functions/src/emailService.ts`) | `surchargeType?: SurchargeType;`<br>`surchargeValue?: number;`<br>`surchargeAmount?: number;`<br>`surchargeReason?: string;` | Desglose en emails HTML y texto plano para cliente y dueño. |

### 2.3 Reglas de cálculo y casos borde (SSOT)

1. **Límites y validación (`src/config/fieldLimits.ts` + backend):**
   - `surcharge.type`: estrictamente `'fixed'` o `'percentage'`.
   - `surcharge.value`: entero positivo estricto:
     - `'fixed'`: `1 <= value <= 5_000_000` (consistente con `depositAmount`).
     - `'percentage'`: `1 <= value <= 200` (permite desde `+1%` hasta `+200%`).
   - `surcharge.reason`: opcional, texto recortado, `min: 2` (si no está vacío) y `max: 60` (`FIELD_LIMITS.slot.surchargeReason`). Si llega vacío o solo espacios, se omite (`undefined`).
2. **Fórmula de cálculo (`calculateSurchargeAmount(subtotal, surcharge)`):**
   - `subtotal = Math.max(0, basePrice) + Math.max(0, extrasPrice)`.
   - Si `!surcharge`: devuelve `0`.
   - Si `surcharge.type === 'fixed'`: devuelve `Math.round(surcharge.value)`.
   - Si `surcharge.type === 'percentage'`:
     - Si `subtotal <= 0`: devuelve `0`.
     - Si `subtotal > 0`: devuelve `Math.round((subtotal * surcharge.value) / 100)`.
3. **Caso borde crítico — Servicios sin precio base (`basePrice === 0 && extrasPrice === 0`):**
   - Si el comercio dejó servicios con `basePrice = 0` ("A confirmar en el salón") y el turno tiene recargo fijo de `$3.000`:
     - `surchargeAmount` se registra como `3000` (y se muestra en badges, recibo y emails como `Recargo: +$3.000 a sumar al servicio`).
     - **`estimatedPrice` permanece en `0`** (no se iguala a `3000`) para evitar que `resolveSlotFinancials` y `buildFinancialBreakdown` calculen falsamente `3000 - 5000 = $0 (Saldado)` cuando el precio real del servicio todavía no fue definido.
   - Cuando `basePrice + extrasPrice > 0`:
     - `estimatedPrice = basePrice + extrasPrice + surchargeAmount`.
     - `balanceDueAtSalon = Math.max(0, estimatedPrice - depositAmount)`.
4. **Retrocompatibilidad:**
   - Slots previos en Firestore sin campo `surcharge` se interpretan como `null` (sin recargo, `$0`).
   - Reservas confirmadas previas sin `clientData.surchargeAmount` mantienen intacto su cálculo y renderizado actual.

---

## 3. Archivos Afectados

### Archivos a crear
- `src/utils/surcharge.ts` — SSOT frontend: `normalizeSlotSurcharge`, `calculateSurchargeAmount`, `resolveBookingSurcharge`, `formatSurchargeValue`, `formatSurchargeLabel`, `formatSurchargeDetail`, `isWeekendDateKey`.
- `functions/src/surcharge.ts` — SSOT backend (mismas reglas puras y validación estricta `validateAdminSlotSurcharge` que lanza `HttpsError('invalid-argument', ...)`).
- `src/components/common/SurchargeBadge/SurchargeBadge.tsx`, `SurchargeBadge.module.css`, `index.ts` — Componente reusable de alta visibilidad y contraste accesible para light/dark mode.
- `tests/unit/surcharge.test.ts` — Suite unitaria de cálculo, normalización, formateo y casos borde.

### Archivos a modificar — Backend (`functions/src/`)
- [`functions/src/adminSlots.ts`](../functions/src/adminSlots.ts)
  - Extender `AdminNewSlotInput` con `surcharge?: SlotSurcharge | null`.
  - Validar y normalizar `item.surcharge` en `adminCreateSlotsCore`; persistirlo en Firestore solo si está presente (`...(item.surcharge ? { surcharge: item.surcharge } : {})`).
  - Pasar `slotSurcharge: normalizeSlotSurcharge(slotData.surcharge)` en `adminAssignSlotCore` al llamar a `validateAndNormalizeClientPayload`.
  - Confirmar que `adminReleaseSlotCore` no borra `slot.surcharge` al limpiar `clientData`.
- [`functions/src/publicSlots.ts`](../functions/src/publicSlots.ts)
  - Incluir `...(surcharge ? { surcharge } : {})` dentro de `commonPublic` en `buildPublicSlotProjection` (estados `available` y `pending_payment`).
- [`functions/src/bookingValidation.ts`](../functions/src/bookingValidation.ts)
  - Extender `ClientPayload` y `ValidateBookingOptions` (`slotSurcharge?: SlotSurcharge | null`).
  - Calcular `surchargeAmount` y `estimatedPrice` autoritativamente en el servidor (tanto en flujo estructurado con catálogo como en fallback legacy) y persistir `surchargeType`, `surchargeValue`, `surchargeAmount`, `surchargeReason` en `clientDataToSave`.
- [`functions/src/index.ts`](../functions/src/index.ts)
  - En `createPreference`: pasar `slotSurcharge` a `validateAndNormalizeClientPayload`; incluir nota de tarifa especial en `items[0].description` de Mercado Pago cuando aplique; guardar `surcharge` en `payment_attempts/{attemptId}` junto con `clientData`.
  - En `buildBookingEmailPayload`: poblar `surchargeType`, `surchargeValue`, `surchargeAmount`, `surchargeReason` desde `clientData` (con fallback seguro a `slotData.surcharge`).
  - En `toPublicBookingDetails`: exponer `basePrice`, `extrasPrice`, `surchargeType`, `surchargeValue`, `surchargeAmount`, `surchargeReason` para `PaymentSuccess`.
  - Confirmar que los rollbacks de `createPreference` y pagos rechazados conservan `slot.surcharge`.
- [`functions/src/cronJobs.ts`](../functions/src/cronJobs.ts)
  - En `retryPendingBookingEmails`: propagar `surchargeType`, `surchargeValue`, `surchargeAmount`, `surchargeReason` al construir `BookingEmailPayload` (idealmente extrayendo un helper compartido con `index.ts` para evitar divergencia).
  - Confirmar que `processExpiredSlots` conserva `slot.surcharge` al liberar bloqueos expirados.
- [`functions/src/emailService.ts`](../functions/src/emailService.ts)
  - Extender `BookingEmailPayload` y `FinancialBreakdown` (`surchargeAmount`, `surchargeLabel`, `surchargeMeta`).
  - Renderizar ítem destacado de recargo en la tabla de "Servicios y extras" (HTML y texto plano) + píldora informativa en la tarjeta de cita (cliente y dueño) cuando exista recargo.

### Archivos a modificar — Frontend (`src/`)
- [`src/types/index.ts`](../src/types/index.ts) y [`src/config/fieldLimits.ts`](../src/config/fieldLimits.ts)
  - Nuevas interfaces `SurchargeType`, `SlotSurcharge` y límite `FIELD_LIMITS.slot.surchargeReason = { min: 2, max: 60 }`.
- [`src/services/db.ts`](../src/services/db.ts)
  - Preservar/normalizar `surcharge` al enviar `slotsData` en `createMultipleSlots`.
- [`src/services/bookingHelper.ts`](../src/services/bookingHelper.ts)
  - Actualizar `sanitizeClientData` para preservar los campos de recargo y calcular `estimatedPrice` de forma coherente.
  - Extender `ResolvedSlotFinancials` (`resolveSlotFinancials`) para exponer `surchargeAmount`, `surchargeReason`, `surchargeType`, `surchargeValue` y el subtotal previo al recargo si está disponible.
- [`src/components/slots/CreateSlotModal/CreateSlotModal.tsx`](../src/components/slots/CreateSlotModal/CreateSlotModal.tsx) y `CreateSlotModal.module.css`
  - UI de configuración de recargo en Paso 01, alcance selectivo en lotes múltiples, atajo desde aviso de feriado en Paso 02, badges en `Resumen en vivo`, validación en `FormProgressTracker` y resumen en el modal `pendingPublish`.
- [`src/components/slots/SlotCard/SlotCard.tsx`](../src/components/slots/SlotCard/SlotCard.tsx) y `SlotCard.module.css`
  - Mostrar `SurchargeBadge` en tarjeta cliente (encabezado + línea aclaratoria en bloque financiero) y en tarjeta admin (completa y compacta), más detalle del recargo en el dossier desplegable y en `aria-label`.
- [`src/pages/ClientView/ClientView.tsx`](../src/pages/ClientView/ClientView.tsx) y `ClientView.module.css`
  - Integrar `SurchargeBadge size="xs"` en `quickSlotChip` (modo compacto), realce visual sutil, `aria-label` actualizado y soporte en `searchedSlots` para buscar por motivo o `"recargo"`.
- [`src/components/slots/SlotBookingShared/useSlotBookingForm.ts`](../src/components/slots/SlotBookingShared/useSlotBookingForm.ts), `SlotBookingModalFrame.tsx`, `SlotBookingSections.tsx`, `SlotBookingModal.module.css`
  - Calcular `surchargeAmount`, actualizar `totalFinalEstimatedPrice` y `balanceDueAtSalon`, incluir snapshot en `buildClientDataPayload`.
  - Mostrar `SurchargeBadge` en `contextStrip` de `SlotBookingModalFrame`.
  - Agregar fila destacada de recargo en `PricingReceiptBox` (reutilizada automáticamente por `BookingModal` y `AssignSlotModal`).
- [`src/components/slots/BookingModal/BookingModal.tsx`](../src/components/slots/BookingModal/BookingModal.tsx) y [`src/components/admin/AssignSlotModal/AssignSlotModal.tsx`](../src/components/admin/AssignSlotModal/AssignSlotModal.tsx)
  - Pasar props de recargo a `SlotBookingModalFrame` y `PricingReceiptBox`.
- [`src/components/admin/ConfirmedAgenda/ConfirmedAgenda.tsx`](../src/components/admin/ConfirmedAgenda/ConfirmedAgenda.tsx) y `ConfirmedAgenda.module.css`
  - Mostrar `SurchargeBadge` en las tarjetas confirmadas con recargo e indicarlo en el desglose de `paymentCol`.
- [`src/pages/PaymentStatus/PaymentSuccess.tsx`](../src/pages/PaymentStatus/PaymentSuccess.tsx) y `PaymentStatus.module.css`
  - Renderizar el desglose completo (subtotal servicios/extras, recargo destacado, total estimado, seña abonada y saldo restante en salón) cuando `viewState === 'confirmed'`.
- Textos centralizados (`src/texts/`):
  - `CreateSlotModal.ts`, `SlotCard.ts`, `BookingModal.ts`, `AssignSlotModal.ts`, `ConfirmedAgenda.ts`, `ClientView.ts`, `PaymentSuccess.ts`.

### Tests a crear/actualizar (`tests/`)
- `tests/unit/surcharge.test.ts` (nuevo)
- `tests/unit/bookingHelper.test.ts`
- `tests/unit/slotBookingShared.test.ts`
- `tests/unit/functionsAdminSlots.test.ts`
- `tests/unit/functionsEmail.test.ts`
- `tests/unit/functionsCron.test.ts`
- `tests/integration/cloudFunctions.test.ts` / `tests/integration/db.slots.test.ts` (flujo end-to-end: crear slot con recargo → proyección pública → `createPreference` → `verifyPayment` / emails)

---

## 4. Diseño Detallado por Capa

### 4.1 Creación de Turnos con Recargo (`CreateSlotModal`)

#### Ubicación y jerarquía visual
En `CreateSlotModal`, el **Paso 01 (`Servicios y seña`)** agrupa hoy las condiciones comerciales del lote (servicios habilitados, nombre visible y seña fija). Debajo del `formGrid` (`Nombre visible` + `Monto de seña`), se agrega un bloque compacto y limpio: **Tarjeta de Recargo opcional**.

1. **Estado desactivado (por defecto):**
   - Una fila discreta con switch accesible (`role="switch"`, `aria-checked`):
     - Título: `Aplicar recargo por tarifa especial`
     - Subtítulo: `Opcional · Para feriados, fines de semana u horarios nocturnos.`
   - Mantiene el formulario sin ruido visual para la creación diaria de turnos normales.

2. **Estado activado (`hasSurcharge === true`):**
   - **Control segmentado de tipo (`surchargeType`):**
     - `Monto fijo ($)` | `Porcentaje (%)`
   - **Input numérico (`surchargeValue`):**
     - Si `'fixed'`: prefijo `$`, `numericOnly`, `maxDigits={7}`, placeholder `Ej: 3000`.
     - Si `'percentage'`: sufijo `%`, `numericOnly`, `maxDigits={3}`, placeholder `Ej: 20`.
   - **Motivo visible al cliente (`surchargeReason`, opcional):**
     - Input de texto con `maxLength={60}` y `showCharCount`, placeholder `Ej: Feriado, Horario nocturno`.
     - Fila de **chips de acceso rápido** debajo del input: `Feriado`, `Fin de semana`, `Horario nocturno`, `Tarifa especial` (al hacer clic completan el campo o alternan el valor).
   - **Alcance dentro del lote (`surchargeScope`):**
     - Visible como pills discretas (default: `Todos los turnos`):
       - `all`: **Todos los turnos** del lote.
       - `holidays`: **Solo feriados** (usa `getHolidayInfo(dateStr)` de Spec 11).
       - `weekends`: **Solo fines de semana** (sábado o domingo en `timezone` del tenant).
       - `holidays_and_weekends`: **Feriados y fines de semana**.
     - Si el admin selecciona `holidays` y hoy no hay ningún feriado en `selectedDates`, se muestra un aviso informativo suave (`"Ninguno de los días elegidos es feriado; el recargo no se aplicará hasta que selecciones uno."`).
     - Si `scope === 'holidays'` y `surchargeReason` está vacío, cada slot feriado recibe automáticamente como motivo `"Feriado"` (o el nombre corto del feriado si no excede 60 chars, ej. `"Feriado · Día del Trabajador"` — configurable: usar `"Feriado"` como default claro y predecible o `"Feriado · <nombre>"` truncado a 60 chars).
   - **Nota de transparencia para el admin:**
     - *"El recargo se suma al total del servicio (saldo a abonar en el salón). La seña online sigue siendo el monto fijo ingresado arriba."*

3. **Integración con Paso 02 (`holidayNoticeBox`):**
   - Cuando `selectedHolidays.length > 0` y `!hasSurcharge`, el aviso existente de feriados agrega un botón inline secundario: `"Agregar recargo a feriados"` que activa `hasSurcharge = true`, `surchargeScope = 'holidays'` y sugiere motivo `"Feriado"` (haciendo foco en el input del monto).

4. **Integración con `FormProgressTracker`, `Resumen en vivo` y `pendingPublish`:**
   - **`FormProgressTracker` (Paso 01):** si `hasSurcharge` está activo y el valor numérico es inválido/vacío (o motivo de 1 carácter), marca `step1Status = 'error'` con detalle claro (`"Ingresá un recargo válido"`). Si es válido, agrega el resumen al detalle del paso (ej. `3 servicios · Seña $5.000 · Recargo +$3.000`).
   - **`Resumen en vivo` (columna derecha):**
     - En `summaryHeader`, junto al pill `Seña: $5.000`, mostrar un pill compacto de recargo cuando esté activo y válido (`Recargo: +$3.000` o `Recargo: +20%`).
     - En cada fila de `slotsPreviewList`, si el recargo aplica a esa fecha/turno, mostrar `<SurchargeBadge size="xs" ... />` junto al tag `Feriado` (si corresponde).
   - **Modal de confirmación múltiple (`pendingPublish`):**
     - En `confirmMetaBox`, agregar fila `Recargo:` con el valor, motivo y alcance (ej. `+$3.000 (Feriado) · en 4 de 12 turnos` o `+$3.000 (Horario nocturno) · en todos los turnos`).
     - En la lista expandible de turnos a publicar, mostrar el indicador compacto en cada ítem que lleva recargo.

---

### 4.2 Componente Reusable `SurchargeBadge`

Ubicación: `src/components/common/SurchargeBadge/`

```ts
export interface SurchargeBadgeProps {
  surcharge: SlotSurcharge;
  /** Monto resuelto en ARS (útil cuando type === 'percentage' y ya se conoce el subtotal). */
  resolvedAmount?: number;
  size?: 'xs' | 'sm' | 'md';
  showReason?: boolean;
  className?: string;
}
```

#### Comportamiento visual y tokens
- **Colores semánticos:**
  - `background: var(--color-warning-bg)`
  - `border: 1px solid var(--color-warning-border)`
  - `color: var(--color-warning-text)`
  - Ícono Lucide (`Tag` para monto fijo o `Percent` / `Tag` unificado, `strokeWidth={1.85}`, `color: var(--color-warning)`): sobrio, editorial y libre de íconos decorativos genéricos.
  - `font-variant-numeric: tabular-nums;` para alineación perfecta de cifras.
- **Formatos por tamaño:**
  - `size="xs"`: `+$3.000` o `+20%` (padding compacto `2px 6px`, `font-size: 0.72rem`).
  - `size="sm"` (default): `Recargo +$3.000` o `Recargo +20%` (y si `showReason && surcharge.reason`: `Recargo +$3.000 · Feriado`).
  - `size="md"`: `Recargo +$3.000 · Feriado` o, si es porcentaje con `resolvedAmount > 0`, `Recargo +20% (+$4.600) · Feriado`.
- **Contraste verificado en `src/styles/variables.css`:**
  - Tema claro: `#7d480d` sobre `#fbf4ea` (~7.5:1 — WCAG AAA).
  - Tema oscuro: `#f2c98d` sobre `rgba(230, 173, 99, 0.14)` sobre `#2d241e` (~8.4:1 — WCAG AAA).
- **Accesibilidad:**
  - `title` con detalle completo: ej. `"Recargo de +$3.000 (Feriado). Se suma al total del servicio."` o `"Recargo de +20% (Horario nocturno). Se aplica sobre los servicios y extras seleccionados."`.
  - `aria-label` descriptivo equivalente cuando se usa de forma independiente; `aria-hidden` en el ícono SVG.

---

### 4.3 Visibilidad en Slots, Modales, Confirmación y Agenda

#### 1. `SlotCard` — Vista Cliente (`isAdmin={false}`)
- **Encabezado (`cardHeader`):** Actualmente en modo cliente solo se renderiza `timeMetaGroup` a la izquierda; el lado derecho está libre. Cuando el slot tiene recargo, colocar `<SurchargeBadge surcharge={slot.surcharge} size="sm" />` en la esquina superior derecha del `cardHeader`.
- **Sub-etiqueta de motivo (opcional):** Si `slot.surcharge.reason` está presente, mostrar debajo de la badge o como micro-línea discreta en `contentBody` el motivo (ej. `Tarifa especial: Feriado`) para que el cliente entienda el *por qué* sin siquiera hacer hover.
- **Bloque financiero (`footerSection`):** Justo arriba de la fila `Seña para reservar`, agregar una fila clara de referencia:
  - Si fijo: `Recargo especial` → `+$3.000` (con sub-nota implícita/tooltip "al total del servicio").
  - Si porcentaje: `Recargo especial` → `+20%` (si el slot tiene 1 solo servicio con `basePrice > 0`, puede mostrar `+20% (+$4.000)`).
- **Compatibilidad con `slotCardStyle`:** Verificar en `classic`, `accent-bar` y `compact` que no desborde en anchos de `320px–375px` (`flex-wrap: wrap` seguro en `cardHeader`).
- **Accesibilidad:** Agregar al `aria-label` del `<article>` el texto del recargo (ej. `", con recargo de +$3.000 por Feriado"`).

#### 2. `ClientView` — Modo Rápido/Compacto (`quickSlotChip`)
- En `quickSlotTimeRow`, agregar `<SurchargeBadge surcharge={slot.surcharge} size="xs" />` alineado a la derecha del horario (`18:00 hs` · `+$3.000`).
- Aplicar borde sutil `.quickSlotChipSurcharge` (`border-color: var(--color-warning-border)`) para escaneo instantáneo en la grilla compacta.
- Incluir el recargo y su motivo en `aria-label` y `title` del botón.
- En `searchedSlots`, sumar `slot.surcharge?.reason` y la palabra `"recargo"` al texto indexado por el buscador.

#### 3. `BookingModal` y `AssignSlotModal` (`SlotBookingShared`)
Ambos modales comparten `useSlotBookingForm`, `SlotBookingModalFrame` y `PricingReceiptBox`, garantizando paridad exacta entre reservas online y asignaciones manuales:
- **`SlotBookingModalFrame` (`contextStrip`):**
  - Cuando `slot.surcharge` existe, mostrar una tercera fila/franja compacta en `contextStrip` con `<SurchargeBadge surcharge={slot.surcharge} resolvedAmount={surchargeAmount} size="md" showReason />` + micro-texto aclaratorio (`"Se suma al total estimado del servicio"`).
- **`PricingReceiptBox`:**
  - Mostrar el desglose transparente en orden lógico:
    1. `Precio Base del Servicio:` `$20.000` *(cuando `baseServicePrice > 0`)*
    2. `Extras seleccionados (1):` `+$3.000` *(cuando `selectedExtrasCount > 0`)*
    3. **`Recargo (Feriado):`** `+$3.000` *(o `Recargo (Horario nocturno · +20%): +$4.600` — si es porcentual y aún no se eligió servicio, mostrar `+20% sobre servicios`)*
    4. `Total Estimado:` `$27.600` *(incluyendo el recargo)*
    5. `Seña a pagar online (Mercado Pago):` `$5.000` *(en `AssignSlotModal`: `Seña configurada: $5.000`)*
    6. `Saldo restante a pagar presencialmente:` `$22.600`
  - Si `baseServicePrice === 0 && totalExtrasPrice === 0` pero hay recargo fijo: mostrar la fila del recargo con leyenda `+$3.000 (a sumar al valor del servicio)` sin renderizar un `Total Estimado` engañoso ni un `Saldo restante: $0`.

#### 4. `PaymentSuccess` — Pantalla de Confirmación del Cliente
- Cuando `viewState === 'confirmed'` y `booking` incluye datos financieros (`verifyPayment` → `toPublicBookingDetails`):
  - Mostrar en `detailsBox`:
    - Fecha, Horario, Servicio (ya existentes).
    - Si `booking.surchargeAmount && booking.surchargeAmount > 0`:
      - Si `booking.basePrice || booking.extrasPrice`: fila `Servicios y extras:` `$XX.XXX`.
      - Fila destacada `Recargo${reason ? ` (${reason})` : ''}:` `+$X.XXX` (con estilo warning consistente).
    - Si `booking.estimatedPrice && booking.estimatedPrice > 0`:
      - Fila `Total estimado:` `$XX.XXX`.
    - Fila `Seña abonada:` `$X.XXX` (verde).
    - Si `booking.estimatedPrice && booking.estimatedPrice > 0`:
      - Fila `Saldo a abonar en el salón:` `$XX.XXX` (o `$0 · Saldado`).

#### 5. Panel de Administración (`SlotCard` admin + `ConfirmedAgenda`)
- **`SlotCard` (`isAdmin={true}`, modo completo):**
  - Mostrar `<SurchargeBadge ... size="sm" />` en `timeMetaGroup` (junto a la duración/fecha) tanto en turnos disponibles como confirmados, pendientes o históricos.
  - En `financialBlock` de confirmados (`isAdminConfirmed`): si `financials.surchargeAmount > 0`, mostrar la fila `Recargo aplicado` (`+$X.XXX`, con tooltip del motivo/tipo) antes de `Total estimado` para que el profesional vea claramente el origen del total.
  - En `renderBookedAndPaymentDetails` (dossier desplegable): mostrar `Recargo especial:` con monto, tipo y motivo.
- **`SlotCard` (`isAdmin={true}`, modo compacto):**
  - Mostrar `<SurchargeBadge ... size="xs" />` en `compactMetaRow` (habilitando `showCompactMetaRow` también cuando el slot tiene recargo).
- **`ConfirmedAgenda`:**
  - En `clientNameRow` (o `rulesRow`) de cada tarjeta confirmada con recargo, renderizar `<SurchargeBadge ... size="sm" showReason />`.
  - En `paymentCol`, incluir el recargo en el desglose (`Total $27.600 (incl. recargo +$4.600) · Seña $5.000` o línea compacta dedicada).
  - `totalPendingBalance` diario en `agendaTimeline.ts` ya queda automáticamente sincronizado porque lee `resolveSlotFinancials(slot).pendingBalance`, derivado de `clientData.estimatedPrice`.

---

### 4.4 Correos Transaccionales (`functions/src/emailService.ts`)

1. **Tabla "Servicios y extras" (`buildFinancialBreakdown`):**
   - Después de listar cada servicio y sus extras seleccionados, si existe recargo (`surchargeAmount > 0` o `surchargeType === 'percentage'` con `surchargeValue > 0`):
     - Agregar fila dedicada con fondo `theme.warningBg` y borde inferior `theme.warningBorder`:
       - Columna izquierda: `Recargo · [Motivo]` (fallback: `Recargo por tarifa especial`) + sub-línea si es porcentual (`+${surchargeValue}% sobre servicios y extras`).
       - Columna derecha: `+$X.XXX` en `theme.warningText`, `font-weight: 700`, `font-variant-numeric: tabular-nums`.
     - En texto plano (`servicesBreakdownText`):
       - `• Recargo ([Motivo]): +$X.XXX` (o `• Recargo ([Motivo] · +20%): +$X.XXX`).
   - Sumar `surchargeAmount` dentro de `calculatedTotal` (respetando la regla de servicios sin `basePrice` para evitar falsos `$0 · Saldado`).
2. **Tarjeta resumen de cita (Cliente y Dueño):**
   - Agregar fila condicional `Tarifa especial` cuando hay recargo, mostrando una píldora inline (`background-color: ${theme.warningBg}; border: 1px solid ${theme.warningBorder}; color: ${theme.warningText}`) con `+${formatCurrency(surchargeAmount)}` y el motivo.
3. **Coherencia en reintentos (`functions/src/cronJobs.ts`):**
   - Asegurar que `retryPendingBookingEmails` construya exactamente los mismos campos de recargo que `buildBookingEmailPayload` en `functions/src/index.ts`, extrayendo un helper compartido `buildBookingEmailPayloadFromSlot(...)` para que ambos flujos sean idénticos.

---

## 5. Plan de Acción por Fases

### Fase 1 — Fundaciones, SSOT y Contratos de Datos
1. Agregar `SurchargeType`, `SlotSurcharge` y extender interfaces en `src/types/index.ts` y `FIELD_LIMITS.slot.surchargeReason` en `src/config/fieldLimits.ts`.
2. Implementar `src/utils/surcharge.ts` y `functions/src/surcharge.ts` con normalización, validación, cálculo en enteros ARS, formateo y detección de fines de semana por `timeZone`.
3. Actualizar `src/services/bookingHelper.ts` (`sanitizeClientData` y `resolveSlotFinancials`) y `src/services/db.ts` (`createMultipleSlots`).
4. Escribir `tests/unit/surcharge.test.ts` y ampliar `tests/unit/bookingHelper.test.ts`.

### Fase 2 — Backend (Cloud Functions, Proyección Pública y Emails)
1. Actualizar `functions/src/adminSlots.ts` (`adminCreateSlotsCore`, `adminAssignSlotCore`).
2. Actualizar `functions/src/publicSlots.ts` (`buildPublicSlotProjection`) para exponer `surcharge` en `public_meta/availability`.
3. Actualizar `functions/src/bookingValidation.ts` (`validateAndNormalizeClientPayload`) para el cálculo autoritativo del recargo y `estimatedPrice`.
4. Actualizar `functions/src/index.ts` (`createPreference`, `buildBookingEmailPayload`, `toPublicBookingDetails`) y `functions/src/cronJobs.ts` (`retryPendingBookingEmails`), unificando el armado del payload de email.
5. Actualizar `functions/src/emailService.ts` (HTML y texto plano para cliente y comercio).
6. Ampliar `tests/unit/functionsAdminSlots.test.ts`, `tests/unit/functionsEmail.test.ts`, `tests/unit/functionsCron.test.ts` y tests de integración.

### Fase 3 — Componente `SurchargeBadge` y Creación de Turnos (`CreateSlotModal`)
1. Crear `src/components/common/SurchargeBadge/` (TSX + CSS con tokens light/dark + accesibilidad).
2. Integrar configuración de recargo en `CreateSlotModal` (Paso 01, alcance en lotes múltiples, atajo en `holidayNoticeBox` de Paso 02, `FormProgressTracker`, `Resumen en vivo` y modal `pendingPublish`) + textos en `src/texts/components/slots/CreateSlotModal.ts`.

### Fase 4 — Visibilidad Integral en Cliente y Admin
1. Integrar `SurchargeBadge` y desglose en `SlotCard` (cliente, admin completo y admin compacto) + `ClientView` (`quickSlotChip` y buscador).
2. Integrar cálculo y desglose en `useSlotBookingForm`, `SlotBookingModalFrame`, `PricingReceiptBox`, `BookingModal` y `AssignSlotModal`.
3. Integrar `SurchargeBadge` y desglose en `ConfirmedAgenda`.
4. Integrar desglose completo en `PaymentSuccess`.
5. Actualizar todos los diccionarios de textos en `src/texts/` y ampliar `tests/unit/slotBookingShared.test.ts`.

### Fase 5 — Verificación y QA Visual
1. Correr suite completa de compilación y tests (frontend + `functions` + emulador).
2. Verificar visualmente contraste y responsividad en mobile (`360px`) y desktop (`1280px+`), en modo claro y oscuro, y en los 3 estilos de tarjeta (`classic`, `accent-bar`, `compact`).
3. Actualizar el estado en `artifacts/todo/recargo-turnos-badges-y-visibilidad.md` y `artifacts/todo/recargo-turnos-configuracion.md` referenciando esta spec.

---

## 6. Criterios de Aceptación y Verificación

### Verificación automatizada
- `npm run build` (TypeScript + Vite) sin errores ni warnings nuevos.
- `npm --prefix functions run build` (TypeScript de Cloud Functions) sin errores.
- `npm run test:unit` (Vitest) con cobertura completa de:
  - Recargo fijo y porcentual (redondeo entero ARS, `subtotal === 0`, límites min/max, motivo vacío/largo).
  - Validación y persistencia en `adminCreateSlotsCore` y preservación de `slot.surcharge` al liberar/expirar/rechazar.
  - Cálculo autoritativo server-side en `validateAndNormalizeClientPayload` (ignorando montos manipulados desde el cliente).
  - Proyección pública en `buildPublicSlotProjection` (incluye `surcharge` en `available`/`pending_payment`, lo omite si es nulo y en `confirmed`).
  - Renderizado HTML y texto plano de emails de cliente y dueño con recargo fijo, porcentual y sin recargo.
  - `useSlotBookingForm` / `bookingHelper` con recargo fijo, porcentual y saldo `$0 · Saldado`.
- `npm run test:integration` (si aplica con Firebase Emulators) validando el flujo `adminCreateSlots` → `public_meta/availability` → `createPreference` → `verifyPayment`.

### Verificación manual / UX
1. Crear un lote en `CreateSlotModal` con días hábiles + 1 feriado aplicando recargo `Solo feriados`: solo los turnos del feriado muestran badge en el resumen y se publican con `surcharge`.
2. En `ClientView` (modo tarjetas y modo compacto), los turnos con recargo muestran la badge desde el primer vistazo sin necesidad de abrir el modal.
3. Al abrir `BookingModal`, el encabezado contextual y la caja de precios muestran el recargo explícitamente y recalculan el total y el saldo en salón en vivo al tildar/destildar servicios y extras (especialmente con recargo porcentual).
4. En `AssignSlotModal`, el admin ve el mismo desglose exacto al asignar manualmente.
5. En `PaymentSuccess` y en ambos emails (cliente y dueño), figuran el concepto de recargo, el total estimado, la seña abonada y el saldo pendiente en salón.
6. En `AdminView` (`SlotCard` completo/compacto y `ConfirmedAgenda`), los turnos con recargo son distinguibles de inmediato tanto en tema claro como oscuro.
