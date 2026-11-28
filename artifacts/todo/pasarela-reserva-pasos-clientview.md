# TODO — Pasarela de Reserva por Pasos (Stepper Booking Funnel) en ClientView

> **Estado:** Implementado en [specs/15-client-booking-4step-wizard.md](../../specs/15-client-booking-4step-wizard.md)  
> **Prioridad:** Alta (Reestructuración central de UX en reserva para clientes)  
> **Ámbito:** `src/views/ClientView/`, `src/components/BookingModal/`, `src/components/BookingStepper/`, `src/types/`  

---

## 1. Contexto y Justificación
Actualmente la experiencia de reserva en `ClientView` combina selección de horario, servicio y formulario en un único modal o flujo vertical que puede resultar abrumador para el usuario, especialmente en dispositivos móviles o cuando los servicios tienen múltiples extras/adicionales.  
Transformar este flujo en una **pasarela de información guiada paso a paso (stepper)** reduce la carga cognitiva, mejora la conversión y deja en claro los precios, señas y saldos presenciales antes de confirmar.

---

## 2. Arquitectura de la Pasarela (4 Pasos Guiados)

```
[ Paso 1: Elegir Servicio ]
         │
         ▼
[ Paso 2: Elegir Extras / Adicionales ]
         │
         ▼
[ Paso 3: Llenar Información Personal ]
         │
         ▼
[ Paso 4: Resumen & Confirmación (Precios, Seña, Saldo) ] ──▶ [ Botón Ir a Pagar / Confirmar ]
```

### Detalle de cada Paso:
1. **Paso 1 — Elección del Servicio:**
   - Visualización limpia de los servicios disponibles con precio base, duración y descripción clara.
   - Posibilidad de cambiar o reelegir sin perder el horario previamente seleccionado.
2. **Paso 2 — Selección de Extras / Adicionales:**
   - Lista opcional de adicionales asociados al servicio elegido (ej: retiro de esmalte, diseño en uñas, hidratación extra).
   - Checkbox interactivo con impacto inmediato en el subtotal en tiempo real.
   - Si el servicio no cuenta con extras, saltar automáticamente al paso 3 o mostrar estado vacío con botón de continuar.
3. **Paso 3 — Información Personal del Cliente:**
   - Campos mínimos y precisos: Nombre completo, Teléfono/WhatsApp (con prefijo), Email de confirmación, Notas/observaciones opcionales.
   - Validación inline de errores accesible e inmediata.
4. **Paso 4 — Resumen Financiero y Botón de Acción ("Goto Button"):**
   - Resumen desglosado:
     - Servicio principal: `$XX.XXX`
     - Extras seleccionados: `+$X.XXX`
     - Recargo (si aplica por horario/feriado): `+$X.XXX`
     - **Monto Total:** `$XX.XXX`
     - **Seña a abonar online:** `$XX.XXX` *(con Mercado Pago)*
     - **Saldo a pagar en el local:** `$XX.XXX` *(presencial)*
   - Botón primario prominente ("Pagar seña y confirmar turno" / "Confirmar reserva").

---

## 3. Consideraciones de UX y Mobile
- **Barra de Progreso / Indicador de Pasos:** Stepper visual superior claro (`1 · 2 · 3 · 4`) con títulos cortos y estado completado/activo.
- **Navegación Intuitiva:** Botón "Volver" o "Anterior" siempre disponible para corregir elecciones sin reiniciar el proceso.
- **Prevención de Pérdida de Datos:** El estado local debe preservarse mientras el usuario navega entre los pasos.
- **Feedback Háptico / Animaciones de Transición:** Transiciones fluidas en eje X (`slide left/right`) entre pasos.

---

## 4. Componentes y Archivos Afectados
- `src/components/BookingStepper/` *(nuevo componente contenedor)*
- `src/components/BookingStepper/StepService.tsx`
- `src/components/BookingStepper/StepExtras.tsx`
- `src/components/BookingStepper/StepPersonalData.tsx`
- `src/components/BookingStepper/StepSummary.tsx`
- `src/views/ClientView/ClientView.tsx`
- `src/context/BookingContext.tsx` o store local de reserva

---

## 5. Checklist de Tareas (TODO)
- [ ] Diseñar el contrato de estado del Stepper (`currentStep`, `selectedService`, `selectedExtras`, `clientData`).
- [ ] Crear el layout del Stepper con barra de progreso accesible.
- [ ] Implementar Paso 1 (selector de servicio interactivo).
- [ ] Implementar Paso 2 (lista de extras con sumatoria de montos en vivo).
- [ ] Implementar Paso 3 (formulario validado de datos del cliente).
- [ ] Implementar Paso 4 (resumen transparente con desglose de seña vs saldo presencial y botón CTA).
- [ ] Probar flujo completo en mobile y desktop con tests unitarios e integración.
