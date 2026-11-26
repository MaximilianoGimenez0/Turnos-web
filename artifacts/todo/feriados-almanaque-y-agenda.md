# TODO — Feriados en el Almanaque y en la Agenda

> **Estado:** Implementado en [specs/11-date-ssot-and-holidays-calendar.md](file:///d:/Projects/Portfolio%20personal/Turnos-web/specs/11-date-ssot-and-holidays-calendar.md)  
> **Prioridad:** Alta (* IMPORTANTE — Requerimiento individual)  
> **Ámbito:** `src/components/Calendar/`, `src/views/AdminView/`, `src/views/ClientView/`, utilitarios de fechas (`src/utils/date.ts`)  

---

## 1. Contexto y Justificación
Actualmente la selección de fechas en el almanaque de cliente y en la agenda del administrador trata todos los días laborables de manera homogénea. En Argentina y otros países, los feriados nacionales (o días no laborables) requieren un tratamiento explícito:
- Advertir visualmente al cliente o al administrador que la fecha seleccionada o visualizada es feriado.
- Permitir al negocio decidir si atiende o no en días feriados (o si aplica reglas de excepción).
- Evitar confusiones en la reserva de turnos y sincronizar la percepción de disponibilidad en ambas vistas.

---

## 2. Requerimientos Funcionales
1. **Fuente de Verdad Oficial y Detección de Feriados:**
   - **Fuente de verdad oficial del gobierno nacional:**  
     URL oficial: [`https://www.argentina.gob.ar/sites/default/files/holidays-2026-es.json`](https://www.argentina.gob.ar/sites/default/files/holidays-2026-es.json)
     - Formato: Dataset Schema.org (`mainEntity.itemListElement[]`).
     - Atributos por feriado: `name` (título del feriado), `description` (`Feriado inamovible`, `Feriado trasladable`, `Día no laborable`, `Feriado turístico`), `startDate` (`YYYY-MM-DD`).
   - **Estrategia de consumo recomendada:**
     - Descarga / sincronización y almacenamiento en local (`src/constants/holidays-2026.json` o `.ts`) para garantizar disponibilidad 100% offline, cero latencia y evitar fallos por caídas de servidores gubernamentales o bloqueos CORS en el frontend.
     - Capacidad de actualización manual o script de fetch para años subsiguientes.
   - Capacidad de marcar días como feriado con su motivo (ej. "Feriado Nacional: Día del Trabajador").
2. **Visualización en el Almanaque del Cliente (`Calendar` / `ClientView`):**
   - Resaltar la celda del día feriado con un indicador sutil (ej. badge discreta o punto temático/advertencia).
   - Al posarse o tocar el día, mostrar tooltip o label indicando el feriado.
   - Si el negocio no atiende feriados, el día debe figurar bloqueado/deshabilitado con leyenda clara ("Feriado - Sin atención").
   - Si el negocio sí atiende feriados, permitir la selección pero destacar que es una fecha especial.
3. **Visualización en la Agenda del Administrador (`AdminView` / `Agenda`):**
   - Mostrar indicador de feriado en el selector de fecha y en la vista semanal/mensual.
   - Banner o aviso contextual al abrir la agenda de un día feriado ("Hoy es feriado: [Motivo]").
   - Acciones rápidas para bloquear masivamente turnos de ese día o habilitar slots especiales.

---

## 3. Componentes y Archivos Afectados
- `src/constants/holidays.ts` *(nuevo catálogo de feriados o helper)*
- `src/utils/date.ts` *(funciones `isHoliday(date)`, `getHolidayInfo(date)`)*
- `src/components/Calendar/Calendar.tsx` (o equivalente del datepicker)
- `src/views/ClientView/ClientView.tsx` *(renderizado del carrusel/selector de días)*
- `src/views/AdminView/AdminView.tsx` *(calendario de gestión de slots y agenda)*

---

## 4. Checklist de Tareas (TODO)
- [ ] Ingestar y tipar el JSON oficial de Argentina (`https://www.argentina.gob.ar/sites/default/files/holidays-2026-es.json`) en `src/constants/holidays.ts`.
- [ ] Implementar helpers de validación de feriados en utilitarios de fechas con tests unitarios.
- [ ] Diseñar estilos visuales (modo claro y oscuro, respetando tokens del tema activo) para días feriados en el selector de fechas.
- [ ] Agregar tooltip y badge explicativo en el selector de días de cliente.
- [ ] Añadir banner y badges contextuales en la agenda de administración.
- [ ] Validar accesibilidad (`aria-label` con nombre del feriado y estado de atención).
