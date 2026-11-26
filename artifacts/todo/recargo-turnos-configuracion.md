# TODO — Recargo en Turno y Configuración del Precio de Recargo

> **Estado:** Implementado según [Spec 12](../../specs/12-slot-surcharge-and-visibility.md) (reglas globales automáticas por tenant fuera de alcance, ver Spec 12)  
> **Prioridad:** Alta (* IMPORTANTE — Requerimiento individual)  
> **Ámbito:** `src/types/`, `src/utils/surcharge.ts`, `functions/src/surcharge.ts`, `CreateSlotModal`, backend Functions (`adminSlots.ts`, `bookingValidation.ts`, `index.ts`, `publicSlots.ts`)  

---

## 1. Contexto y Justificación
Muchos profesionales y prestadores de servicios aplican recargos en situaciones particulares: turnos fuera de hora, fines de semana, feriados, turnos de urgencia o con requerimientos técnicos especiales.  
El administrador debe poder definir, habilitar y configurar fácilmente el valor del recargo (monto fijo en ARS o porcentaje) aplicable a determinados turnos o reglas de horario.

---

## 2. Requerimientos Funcionales
1. **Configuración en el Panel de Administrador:**
   - Sección de ajustes o modal al crear/editar slots para fijar si tiene recargo.
   - Definir tipo de recargo: **Monto fijo** (ej. `+$3.000`) o **Porcentaje** (ej. `+20%`).
   - Opción de aplicar recargo por slot individual o por franja horaria / día especial (ej. turnos a partir de las 20:00 hs o fines de semana).
2. **Cálculo de Precios y Señas:**
   - El precio total del servicio debe sumar dinámicamente el valor del recargo configurado.
   - Definir si la seña se calcula sobre el precio base o sobre el total con recargo (por defecto: porcentaje de seña sobre el total con recargo).
   - Desglose transparente en el backend antes de generar la preferencia de Mercado Pago (`createPreference`).
3. **Persistencia en Modelo de Datos:**
   - Actualizar interfaz de `Slot` y esquema de base de datos en Firestore:
     ```typescript
     hasSurcharge?: boolean;
     surchargeAmount?: number;
     surchargeType?: 'fixed' | 'percentage';
     surchargeReason?: string; // Ej: "Horario especial" / "Feriado"
     ```

---

## 3. Componentes y Archivos Afectados
- `src/types/index.ts` *(definición de campos en `Slot` y settings)*
- `src/views/AdminView/AdminView.tsx` *(formulario de creación/edición de slots y configuración)*
- `src/components/Admin/SlotManager/` *(inputs de recargo, switch y validación de montos)*
- `functions/src/` *(verificación y cálculo en backend para cobro de seña / total)*

---

## 4. Checklist de Tareas (TODO)
- [x] Extender interfaces de TypeScript con campos de recargo (`SlotSurcharge`, `ClientData`, `PublicSlotProjection`, `PublicVerifiedBookingSummary`, `BookingEmailPayload`).
- [x] Diseñar UI en el modal de creación de slots (`CreateSlotModal`) para activar recargo, elegir monto fijo/porcentaje, motivo y alcance selectivo (`all`, `holidays`, `weekends`, `holidays_and_weekends`) + atajo desde feriados.
- [x] Validar que el valor del recargo sea positivo y consistente tanto en frontend como en backend (`validateAdminSlotSurcharge`).
- [x] Integrar recálculo automático de total estimado y saldo presencial en `useSlotBookingForm` y `bookingHelper` (manteniendo `depositAmount` fijo por slot).
- [x] Asegurar que `createPreference` y `validateAndNormalizeClientPayload` en Cloud Functions calculen autoritativamente el recargo y el total estimado desde el slot del servidor.
