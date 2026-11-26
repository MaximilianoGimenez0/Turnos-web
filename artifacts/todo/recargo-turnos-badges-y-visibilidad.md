# TODO — Visibilidad y Badges de Recargo en Turnos

> **Estado:** Implementado según [Spec 12](../../specs/12-slot-surcharge-and-visibility.md) (pendiente de QA visual manual / verificación con emulador si aplica)  
> **Prioridad:** Alta (* IMPORTANTE — Requerimiento individual)  
> **Ámbito:** `src/components/common/SurchargeBadge/`, `SlotCard`, `ClientView`, `SlotBookingShared`, `BookingModal`, `AssignSlotModal`, `ConfirmedAgenda`, `PaymentSuccess` y `functions/src/emailService.ts`  

---

## 1. Contexto y Justificación
Para garantizar total transparencia con el cliente y evitar malentendidos sobre el precio final del servicio, cualquier turno que incluya un recargo debe exponerlo de manera destacada y explícita en **absolutamente todos los lugares** donde se presente el slot.  
El cliente nunca debe enterarse del recargo al momento de pagar: debe verlo desde la grilla de selección de horarios.

---

## 2. Requerimientos Funcionales
1. **Badge Destacada de Recargo:**
   - Diseñar una badge de alta visibilidad pero elegante (ej. fondo sutil de alerta/destacado con borde y tipografía nítida).
   - Contenido de la badge: `Recargo +$X.XXX` o `Tarifa especial (+$X.XXX)`.
2. **Puntos de Exposición Obligatorios:**
   - **Grilla / Carrusel de Horarios (`SlotCard` / `SlotPicker`):** Badge en la tarjeta del horario disponible junto a la hora.
   - **Modal o Pasarela de Reserva (`BookingModal` / Pasarela de Pasos):** Desglose explícito en la pantalla de confirmación:
     - Subtotal Servicio: `$XX.XXX`
     - Recargo por horario especial: `+$X.XXX`
     - Total: `$XX.XXX`
     - Seña requerida / A pagar en el local.
   - **Agenda del Administrador (`AdminView` / `AdminSlotCard`):** Badge distintiva para que el profesional identifique inmediatamente los turnos con tarifa diferencial.
   - **Pantalla de Éxito / Confirmación de Turno:** Detalle visible con el desglose del recargo pagado / a abonar.
   - **Comprobante PDF y Notificaciones por Email / WhatsApp:** Incluir el ítem de recargo en la factura/resumen del turno.

---

## 3. Componentes y Archivos Afectados
- `src/components/SlotPicker/SlotCard.tsx` (o equivalente de tarjeta de horario)
- `src/components/BookingModal/BookingModal.tsx`
- `src/views/ClientView/components/`
- `src/views/AdminView/` (listado y tarjetas de turnos de la agenda)
- `src/utils/pdfGenerator.ts`
- Plantillas de email en Cloud Functions (`functions/src/emailService.ts` / `sesMailer.ts`)

---

## 4. Checklist de Tareas (TODO)
- [x] Crear componente reusable `SurchargeBadge` con soporte para diferentes tamaños (`xs`, `sm`, `md`) y tokens light/dark.
- [x] Integrar badge en cada tarjeta de slot en la vista del cliente (`SlotCard` y `ClientView` modo rápido/compacto).
- [x] Agregar fila de desglose de recargo en el resumen de precios antes de pagar (`SlotBookingModalFrame` + `PricingReceiptBox` para `BookingModal` y `AssignSlotModal`).
- [x] Mostrar badge y monto de recargo en la tarjeta de slot del panel admin (`SlotCard` completo/compacto y `ConfirmedAgenda`).
- [x] Actualizar pantalla de confirmación (`PaymentSuccess`) y emails transaccionales (`functions/src/emailService.ts` y `cronJobs.ts`) para listar el recargo como concepto diferenciado (nota: `src/utils/pdfGenerator.ts` no existe en el repo; ver Spec 12 sección 1).
- [ ] Verificar contraste y accesibilidad de la badge en temas claros y oscuros en QA visual manual (360px y 1280px+).
