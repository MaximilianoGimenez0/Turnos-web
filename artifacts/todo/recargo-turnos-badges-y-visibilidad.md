# TODO — Visibilidad y Badges de Recargo en Turnos

> **Estado:** Pendiente de especificación e implementación  
> **Prioridad:** Alta (* IMPORTANTE — Requerimiento individual)  
> **Ámbito:** `src/components/ClientView/`, `src/components/SlotCard/`, `src/components/BookingModal/`, `src/views/AdminView/`, Comprobantes y Emails  

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
- [ ] Crear componente reusable `SurchargeBadge` con soporte para diferentes tamaños (compacto para tarjeta, extendido para modal).
- [ ] Integrar badge en cada tarjeta de slot en la vista del cliente.
- [ ] Agregar fila de desglose de recargo en el resumen de precios antes de pagar.
- [ ] Mostrar badge y monto de recargo en la tarjeta de slot del panel admin.
- [ ] Actualizar generador de PDFs y comprobantes para listar el recargo como concepto diferenciado.
- [ ] Verificar contraste y accesibilidad de la badge en temas claros y oscuros.
