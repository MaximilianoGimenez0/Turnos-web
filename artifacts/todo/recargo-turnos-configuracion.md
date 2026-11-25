# TODO — Recargo en Turno y Configuración del Precio de Recargo

> **Estado:** Pendiente de especificación e implementación  
> **Prioridad:** Alta (* IMPORTANTE — Requerimiento individual)  
> **Ámbito:** `src/types/`, `src/views/AdminView/`, backend Functions (`createPreference`), store/settings  

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
- [ ] Extender interfaces de TypeScript con campos de recargo (`surchargeAmount`, etc.).
- [ ] Diseñar UI en el modal/formulario de creación de slots para activar recargo y setear precio/porcentaje.
- [ ] Validar que el valor del recargo sea positivo y consistente con el precio base del servicio.
- [ ] Integrar recálculo automático de seña y saldo presencial en el store.
- [ ] Asegurar que `createPreference` en Cloud Functions valide que el monto enviado coincide con el precio base + recargo.
