# 11 — Única Fuente de Verdad para Fechas (Timezone Multi-Tenant) y Feriados en Picker y Agenda

> **Estado:** Implementado y verificado (`src/utils/dateUtils.ts`, `src/utils/holidays.ts`, `scripts/sync-holidays.mjs`)  
> **Prioridad:** Alta  
> **Ámbito:** Utilitarios de fechas (`src/utils/`), Catálogo estático de feriados (`src/data/holidays.json`), Picker de creación de turnos (`MultiDatePicker`, `CreateSlotModal`), Agenda y panel Admin (`AdminView`, `ConfirmedAgenda`, `agendaTimeline`, `AdminChart`), Vista Cliente (`ClientView`) y Tests unitarios (`tests/unit/`)

---

## 1. Objetivos y Alcance

### Problema que resuelve
Una auditoría sobre el manejo de fechas en `AdminView`, `CreateSlotModal` y `ConfirmedAgenda` reveló dos brechas principales:

1. **Fragmentación temporal (3 modelos de zona horaria coexistiendo) y código repetido:**
   - **Modelo 1 (`tenant.timezone`):** usado correctamente en `ClientView`, `SlotCard`, `useSlotBookingForm` y Cloud Functions (`emailService.ts`).
   - **Modelo 2 (`BUSINESS_TIMEZONE` fijo en Buenos Aires):** usado en `CreateSlotModal`, `AdminChart` y fallback de `MultiDatePicker`, ignorando `useTenant().timezone`.
   - **Modelo 3 (zona horaria local del navegador):** usado en `AdminView` (`getDateRangeForScope`, `shiftAnchorDate`, `formatScopeRangeLabel`, `formatMonthLabel`, `todayStartMs`), `ConfirmedAgenda` (`formatLocalDate`, `getTodayLocalDateString`, `formatHeaderDate`) y `agendaTimeline` (`formatTime24h`, `formatLocalDate`).
   - Esto provoca discrepancias entre pestañas (*Agenda* vs *Turnos* vs *Crear turnos*) si el usuario o el comercio operan en otra zona horaria, además de formateadores `toLocaleDateString('es-AR', ...)` duplicados en más de 8 archivos y utilidades redundantes en `dateUtils.ts`.
2. **Ausencia de visibilidad de feriados nacionales (TODO `feriados-almanaque-y-agenda.md`):**
   - Actualmente el almanaque del selector de creación de turnos (`MultiDatePicker`), la agenda del administrador (`ConfirmedAgenda`) y el selector de días del cliente (`ClientView`) tratan todos los días de forma homogénea, sin advertir visualmente cuando una fecha corresponde a un feriado nacional o día no laborable.

### Qué incluye esta especificación
- **Única Fuente de Verdad (SSOT) para fechas y zonas horarias (`src/utils/dateUtils.ts`):**
  - Toda fecha persistida permanece en **ISO UTC** (`slot.datetime`), y toda interpretación humana (`YYYY-MM-DD`, "hoy", rangos día/semana/mes, encabezados y horas `HH:mm`) se resuelve exclusivamente usando `tenant.timezone` (con fallback a `BUSINESS_TIMEZONE`).
  - Eliminación de la familia browser-local (`formatLocalDate`, `getTodayLocalDateString`, `addDaysLocalDateString`, `getLocalDateKeyFromIso`) y unificación de `formatTime24h` y formateadores `es-AR` en `dateUtils.ts`.
  - Corrección de edge cases detectados en auditoría (`isPastTimeToday` reactivo con `nowMs`, `todayKey` reactivo ante cambio de medianoche, unificación del filtro de búsqueda de confirmados).
- **Catálogo estático local de feriados (`src/data/holidays.json`), script manual de sincronización (`scripts/sync-holidays.mjs`) y helpers (`src/utils/holidays.ts`):**
  - **Script específico de ejecución manual (`scripts/sync-holidays.mjs` + `npm run holidays:sync`):**
    - Descarga el dataset oficial en UTF-8 desde `https://www.argentina.gob.ar/sites/default/files/holidays-<year>-es.json` (por defecto `2026`, configurable con `--year <YYYY>` o `--url <url>`).
    - Parsea `mainEntity.itemListElement[]`, valida fechas `YYYY-MM-DD`, normaliza el tipo de feriado, ordena cronológicamente y escribe `src/data/holidays.json` con formato estable y verificación UTF-8 (soporta `--dry-run` para inspeccionar sin escribir).
  - Almacenamiento normalizado en `src/data/holidays.json` para operación 100% offline, cero latencia y sin dependencia de CORS ni disponibilidad de servidores gubernamentales en runtime.
  - Funciones puras indexadas en `O(1)`: `isHoliday(input, timeZone?)`, `getHolidayInfo(input, timeZone?)` y `getHolidaysInMonth(year, monthIndex)`.
- **Visualización de feriados en el DateTimePicker de `AdminView` (`MultiDatePicker` + `CreateSlotModal`):**
  - Resaltado con **color significativo** (tokens semánticos de advertencia/ámbar del sistema de diseño, diferenciable de "hoy" y de "seleccionado") en cada celda feriado del calendario.
  - Indicador visual + tooltip (`title` / leyenda) con el motivo y tipo del feriado (`Feriado inamovible`, `Feriado trasladable`, `Día no laborable`, `Feriado turístico`).
  - Aviso contextual en los botones rápidos ("Hoy", "Mañana", etc.), chips de días seleccionados y lista previa de turnos a publicar cuando incluyen un feriado.
  - Accesibilidad completa (`aria-label` con fecha, estado feriado y motivo).
- **Visualización de feriados en la Agenda del Administrador (`AdminView` + `ConfirmedAgenda`):**
  - En `ConfirmedAgenda`: cada grupo de día feriado muestra un acento/color significativo en su encabezado junto a un badge con el nombre y tipo del feriado (ej. `Feriado · Día del Trabajador`).
  - En `AdminView`: banner/aviso contextual en la vista diaria (`timeScope === 'day'`) cuando la fecha visualizada es feriado (`"Este día es feriado: [Motivo]"`), e indicador en `SlotCard` si aplica.
- **Visualización de feriados en el Almanaque del Cliente (`ClientView`):** *(integrado desde `artifacts/todo/feriados-almanaque-y-agenda.md`)*
  - En la tira horizontal de fechas disponibles (`availableDates`) y en los encabezados de cada día (`groupedSlots`), resaltar las fechas feriado con indicador/badge discreto y tooltip con el motivo, manteniendo habilitada la reserva si el comercio publicó turnos para ese día.

### Qué queda explícitamente fuera de alcance
- Peticiones HTTP en tiempo de ejecución desde el navegador o Cloud Functions hacia `argentina.gob.ar`.
- Recargos monetarios automáticos en feriados (planificados por separado en [recargo-turnos-configuracion.md](file:///d:/Projects/Portfolio%20personal/Turnos-web/artifacts/todo/recargo-turnos-configuracion.md) y [recargo-turnos-badges-y-visibilidad.md](file:///d:/Projects/Portfolio%20personal/Turnos-web/artifacts/todo/recargo-turnos-badges-y-visibilidad.md)).
- Bloqueo masivo destructivo de turnos existentes o flag persistido en Firestore de "atiende feriados sí/no" *(hoy el comercio ya controla si atiende publicando o no turnos en esa fecha; la base `holidays.ts` deja listo el hook para agregar reglas de bloqueo/recargo después)*.
- Catálogos multi-país automáticos fuera de Argentina (el JSON incluye `country` y `timezone` para futura extensión).

---

## 2. Archivos y Recursos Afectados

### Archivos a crear
- `src/data/holidays.json` — Catálogo estático normalizado con todos los feriados oficiales 2026 obtenidos una única vez en UTF-8 desde `https://www.argentina.gob.ar/sites/default/files/holidays-2026-es.json`.
- `src/utils/holidays.ts` — Tipos (`HolidayType`, `HolidayInfo`, `HolidaysDataset`), índice `Map<string, HolidayInfo>` por `YYYY-MM-DD`, y helpers `isHoliday`, `getHolidayInfo`, `getHolidaysInMonth` y `formatHolidaySummary`.
- `scripts/sync-holidays.mjs` — Script CLI específico ejecutable manualmente (`npm run holidays:sync -- [--year 2026] [--url <url>] [--dry-run]`), sin dependencias externas (usa `fetch` y `node:fs` nativos), encargado de descargar, validar, normalizar en UTF-8 y rellenar `src/data/holidays.json`.
- `tests/unit/holidays.test.ts` — Suite unitaria para validación de integridad de `holidays.json`, codificación UTF-8 (tildes/`ñ`), función de transformación del script `sync-holidays.mjs`, `isHoliday`, `getHolidayInfo` con `dateKey` y con ISO UTC en distintas zonas horarias.

### Archivos a modificar
- [`package.json`](file:///d:/Projects/Portfolio%20personal/Turnos-web/package.json)
  - Agregar script `"holidays:sync": "node scripts/sync-holidays.mjs"` para ejecución manual directa.
- [`src/utils/dateUtils.ts`](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/utils/dateUtils.ts)
  - Eliminar helpers dependientes del huso local del navegador (`formatLocalDate`, `getTodayLocalDateString`, `addDaysLocalDateString`, `getLocalDateKeyFromIso`).
  - Refactorizar `getDateRangeForScope`, `shiftAnchorDate` → `shiftAnchorDateKey`, `formatScopeRangeLabel` y `formatMonthLabel` para operar sobre `dateKey` (`YYYY-MM-DD`) + `timeZone`.
  - Centralizar formateadores `es-AR` (`formatDateKeyLong`, `formatDateKeyShort`, `formatDateKeyParts`, normalizando puntos y espacios antes de coma) y mantener `formatBusinessTime` como único formateador `HH:mm`.
- [`src/components/common/MultiDatePicker/MultiDatePicker.tsx`](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/common/MultiDatePicker/MultiDatePicker.tsx) y `MultiDatePicker.module.css`
  - Recibir `timeZone` opcional (o prop `getHoliday` / consumo directo de `getHolidayInfo`), marcar celdas feriado con color significativo, punto/etiqueta, tooltip `title` y `aria-label` accesible, más leyenda discreta al pie del calendario si el mes visible contiene feriados.
- [`src/components/slots/CreateSlotModal/CreateSlotModal.tsx`](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/slots/CreateSlotModal/CreateSlotModal.tsx) y `CreateSlotModal.module.css`
  - Consumir `timezone` desde `useTenant()` y pasarlo a todos los cálculos (`todayStr`, `addDaysBusinessDateString`, `buildBusinessIsoFromInputs`, `MultiDatePicker`).
  - Usar `nowMs` en `isPastTimeToday`.
  - Formatear chips de fechas seleccionadas con `formatDateKeyShort` (eliminando `new Date(y, m - 1, d)` local).
  - Mostrar badge/indicador de feriado en botones rápidos, chips de días seleccionados y resumen de turnos a crear cuando una fecha elegida es feriado.
- [`src/pages/AdminView/AdminView.tsx`](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/pages/AdminView/AdminView.tsx) y `AdminView.module.css`
  - Leer `timezone` de `useTenant()`.
  - Reemplazar `anchorDate: Date` por `anchorDateKey: string` (`YYYY-MM-DD` en `timezone`), eliminando `todayStartMs` congelado en `useMemo(..., [])`.
  - Pasar `timezone` a `ConfirmedAgenda` y `AdminChart`.
  - Mostrar banner contextual de feriado cuando `timeScope === 'day'` y `anchorDateKey` es feriado.
  - Extraer/reutilizar helper compartido para filtrar slots confirmados por búsqueda evitando duplicación con `ConfirmedAgenda`.
- [`src/components/admin/ConfirmedAgenda/ConfirmedAgenda.tsx`](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/admin/ConfirmedAgenda/ConfirmedAgenda.tsx) y `ConfirmedAgenda.module.css`
  - Recibir `timezone` (o resolverlo desde `useOptionalTenant()?.timezone || BUSINESS_TIMEZONE`).
  - Reemplazar `formatLocalDate`, `getTodayLocalDateString` y `formatHeaderDate` local por `formatBusinessDateKey`, `getTodayBusinessDateString` y `formatDateKeyLong`.
  - Resaltar con color significativo y pill/badge informativo los encabezados de días feriados (`getHolidayInfo(day.dateKey)`).
- [`src/services/agendaTimeline.ts`](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/services/agendaTimeline.ts)
  - Aceptar `timeZone = BUSINESS_TIMEZONE` en `options`, eliminar `formatTime24h` duplicado y usar `formatBusinessTime` + `formatBusinessDateKey` de `dateUtils.ts`.
- [`src/components/admin/AdminChart/AdminChart.tsx`](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/admin/AdminChart/AdminChart.tsx)
  - Usar `timezone` del tenant en lugar de `BUSINESS_TIMEZONE` fijo y delegar el formateo de etiquetas a `dateUtils.ts`.
- [`src/pages/ClientView/ClientView.tsx`](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/pages/ClientView/ClientView.tsx) y `ClientView.module.css`
  - Delegar formateo de etiquetas repetidas a `dateUtils.ts`.
  - Resaltar días feriados en `availableDates` (tira de días) y en el encabezado de `groupedSlots` con badge/tooltip accesible mostrando el motivo del feriado.
- [`src/components/slots/SlotCard/SlotCard.tsx`](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/slots/SlotCard/SlotCard.tsx) y [`src/components/slots/SlotBookingShared/useSlotBookingForm.ts`](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/slots/SlotBookingShared/useSlotBookingForm.ts)
  - Reemplazar llamadas manuales a `toLocaleDateString` por helpers centralizados de `dateUtils.ts`.
- Tests unitarios y textos:
  - [`tests/unit/dateUtils.test.ts`](file:///d:/Projects/Portfolio%20personal/Turnos-web/tests/unit/dateUtils.test.ts) — Actualizar y ampliar con escenarios multi-timezone (`America/Argentina/Buenos_Aires`, `America/Mexico_City`, `Europe/Madrid`).
  - [`tests/unit/agendaTimeline.test.ts`](file:///d:/Projects/Portfolio%20personal/Turnos-web/tests/unit/agendaTimeline.test.ts) — Verificar consistencia horaria y cruce de medianoche respetando `timeZone`.
  - Textos centralizados en `src/texts/` (`AdminView.ts`, `ConfirmedAgenda.ts`, `CreateSlotModal.ts`, `ClientView.ts`) para etiquetas y avisos de feriados.
  - Actualizar [`artifacts/todo/feriados-almanaque-y-agenda.md`](file:///d:/Projects/Portfolio%20personal/Turnos-web/artifacts/todo/feriados-almanaque-y-agenda.md) marcando referencia a `specs/11-date-ssot-and-holidays-calendar.md`.

---

## 3. Metodología de Implementación

### 3.1 Script Manual de Sincronización (`scripts/sync-holidays.mjs`), Catálogo `src/data/holidays.json` y Helpers (`src/utils/holidays.ts`)

1. **Script manual dedicado (`scripts/sync-holidays.mjs` + `npm run holidays:sync`):**
   - Ejecución manual esperada:
     ```bash
     # Rellenar/actualizar con los feriados oficiales 2026 (default)
     npm run holidays:sync

     # Para años futuros o URL personalizada, y modo simulación sin sobrescribir
     npm run holidays:sync -- --year 2027
     npm run holidays:sync -- --url https://www.argentina.gob.ar/sites/default/files/holidays-2026-es.json --dry-run
     ```
   - **Comportamiento del script:**
     1. Descarga el JSON usando `fetch` nativo de Node con timeout y decodificación estricta en **UTF-8** (`await response.text()` / `JSON.parse(...)`, evitando corrupción de tildes y `ñ` como `Año Nuevo`, `Día`, `Soberanía`).
     2. Valida la estructura Schema.org (`Array.isArray(raw?.mainEntity?.itemListElement)` y que contenga al menos 1 feriado válido; si falla la descarga o el formato es inválido, aborta con código de salida distinto de `0` **sin sobrescribir** el `src/data/holidays.json` existente).
     3. Extrae y normaliza cada ítem (`item.startDate`, `item.name`, `item.description`, `item.additionalProperty?.value`):
        - Valida que `startDate` cumpla `/^\d{4}-\d{2}-\d{2}$/`.
        - Mapea el tipo (`inamovible`, `trasladable`, `no_laborable`, `turistico`, `otro`) normalizando minúsculas, espacios y tildes (ej. `"puente"`/`"turístico"` → `turistico`, `"nolaborable"`/`"no laborable"` → `no_laborable`).
        - Deduplica si hubiera entradas repetidas para una misma fecha `YYYY-MM-DD` (combinando nombres si difieren) y ordena ascendentemente por `date`.
     4. Escribe `src/data/holidays.json` con JSON formateado (`JSON.stringify(..., null, 2) + '\n'`) y muestra un resumen en consola (año, cantidad de feriados escritos, primer/último feriado y ruta destino). En `--dry-run`, imprime el resumen sin tocar disco.
     5. Exporta la función pura `transformOfficialHolidaysDataset(raw, options)` para poder testearla directamente en `tests/unit/holidays.test.ts` sin llamadas a red.
   - **Estructura normalizada resultante en `src/data/holidays.json`:**
     ```json
     {
       "source": "https://www.argentina.gob.ar/sites/default/files/holidays-2026-es.json",
       "country": "AR",
       "timezone": "America/Argentina/Buenos_Aires",
       "year": 2026,
       "holidays": [
         {
           "date": "2026-01-01",
           "name": "Año Nuevo",
           "description": "Feriado inamovible",
           "type": "inamovible"
         }
       ]
     }
     ```

2. **API de consulta en `src/utils/holidays.ts`:**
   ```ts
   export type HolidayType =
     | 'inamovible'
     | 'trasladable'
     | 'no_laborable'
     | 'turistico'
     | 'otro';

   export interface HolidayInfo {
     date: string; // YYYY-MM-DD
     name: string;
     description: string;
     type: HolidayType;
   }

   export function getHolidayInfo(
     input: Date | string | undefined | null,
     timeZone?: string
   ): HolidayInfo | null;

   export function isHoliday(
     input: Date | string | undefined | null,
     timeZone?: string
   ): boolean;

   export function getHolidaysInMonth(year: number, monthIndex: number): HolidayInfo[];
   ```
   - Si `input` ya es una clave `YYYY-MM-DD` (`/^\d{4}-\d{2}-\d{2}$/`), busca directo en el `Map<string, HolidayInfo>` en `O(1)`.
   - Si `input` es un `Date` o un string ISO completo, primero resuelve el día calendario con `formatBusinessDateKey(input, timeZone)` y luego consulta el `Map`.
   - Cuando el tenant tenga un `timezone` fuera de Argentina, se puede seguir consultando el catálogo actual (o filtrar a futuro por país del tenant sin romper la API).

---

### 3.2 Única Fuente de Verdad para Fechas (`src/utils/dateUtils.ts`)

1. **Modelo canónico de representación:**
   - **Instante exacto (persistencia y comparaciones):** ISO UTC string (`slot.datetime`) / epoch `number` (`ms`).
   - **Día calendario (UI, selección, agrupación, navegación):** `DateKey` en formato `YYYY-MM-DD` resuelto siempre en `tenant.timezone`.
2. **Rangos y navegación timezone-aware:**
   - `getDateRangeForScope(scope: AdminTimeScope, anchorDateKey: string, timeZone = BUSINESS_TIMEZONE): DateRange | null`:
     - Calcula `startDateKey` y `endDateKey` (para `day`: el mismo día; para `week`: lunes a domingo a partir de `anchorDateKey` usando aritmética UTC al mediodía; para `month`: primer y último día del mes).
     - Convierte `startDateKey 00:00` y `(endDateKey + 1 día) 00:00` a milisegundos exactos en `timeZone` vía `buildBusinessIsoFromInputs`, devolviendo `{ startMs, endMs: nextDayStartMs - 1, startDateKey, endDateKey }`.
     - Garantiza que un turno a las `23:30` en `tenant.timezone` siempre caiga en el día/semana/mes correcto aunque el navegador del admin esté en UTC+2 o UTC-6.
   - `shiftAnchorDateKey(scope: Exclude<AdminTimeScope, 'all'>, anchorDateKey: string, delta: number): string`: opera en aritmética pura de calendario (UTC mediodía) sin depender del reloj local.
   - `formatScopeRangeLabel(scope, anchorDateKey, timeZone, todayKey?)` y `formatMonthLabel(anchorDateKey)`: formatean desde `dateKey` usando `Date.UTC(y, m - 1, d, 12, 0, 0)` con `timeZone: 'UTC'`.
3. **Formateadores centralizados (eliminando duplicación en componentes):**
   - `formatDateKeyLong(dateKey)` → `"Jueves, 26 de noviembre de 2026"` *(normalizando `\s+,` → `,` y capitalización consistente)*.
   - `formatDateKeyShort(dateKey)` → `"jue, 26 nov"` *(sin puntos sueltos, consistente entre chips, preview y tarjetas)*.
   - `formatDateKeyParts(dateKey)` → `{ weekdayShort, weekdayLong, dayNum, monthShort, monthLong }`.
   - `formatBusinessTime(input, timeZone)` → `"10:30"` *(única implementación 24h en todo el frontend)*.
4. **Limpieza:**
   - Eliminar `formatLocalDate`, `getTodayLocalDateString`, `addDaysLocalDateString` y `getLocalDateKeyFromIso` una vez migrados todos sus consumidores (`ConfirmedAgenda`, `agendaTimeline`, `dateUtils.test.ts`).

---

### 3.3 DateTimePicker en `AdminView` (`MultiDatePicker` y `CreateSlotModal`)

1. **`MultiDatePicker.tsx` y `MultiDatePicker.module.css`:**
   - Para cada celda `cell.dateStr`, consultar `const holiday = getHolidayInfo(cell.dateStr)`.
   - Aplicar clase semántica `.dayHoliday` (usando tokens del tema: fondo tintado cálido/ámbar `--color-warning-bg`, borde `--color-warning-border`, texto `--color-warning-text` o equivalente temático) + un indicador visual diferenciado del punto de "hoy" (ej. indicador superior o estilo de borde/acento).
   - Cuando la celda es **feriado y seleccionada a la vez**, mantener la legibilidad del estado seleccionado (`--color-primary`) conservando un borde/indicador de feriado para que no pierda la señal visual.
   - Agregar `title={`${holiday.name} (${holiday.description})`}` y enriquecer `aria-label` con `${cell.dateStr}${isToday ? ' (hoy)' : ''}${holiday ? ` — ${holiday.description}: ${holiday.name}` : ''}`.
   - Si el mes visible tiene uno o más feriados (`getHolidaysInMonth(viewMonth.year, viewMonth.monthIndex)`), mostrar una franja/leyenda compacta al pie del calendario listando las fechas feriado del mes (ej. `25 may · Día de la Revolución de Mayo`) para que el administrador vea el motivo sin tener que hacer hover en cada celda (crucial en móvil/touch).
2. **`CreateSlotModal.tsx`:**
   - Obtener `{ tenantId, timezone }` desde `useTenant()`.
   - Reemplazar todas las llamadas sin timezone por `getTodayBusinessDateString(timezone)`, `addDaysBusinessDateString(item.days, timezone)` y `buildBusinessIsoFromInputs(dateStr, timeStr, timezone)`.
   - Reemplazar `Date.now()` por `nowMs` en `isPastTimeToday`.
   - En los botones rápidos (`RECOMMENDED_DAYS`), chips de días seleccionados y filas del resumen lateral (`generatedSlots`): mostrar una insignia compacta de feriado (con `title` del motivo) cuando `getHolidayInfo(dateStr)` exista.
   - Si entre los días seleccionados hay al menos un feriado, mostrar un aviso informativo no bloqueante (ej. `"Incluye fecha(s) feriado: ... — Verificá si vas a atender ese día."`).

---

### 3.4 Agenda del Administrador (`AdminView`, `ConfirmedAgenda`, `agendaTimeline`, `AdminChart`)

1. **`AdminView.tsx`:**
   - Leer `{ tenantId, timezone }` desde `useTenant()`.
   - Mantener `anchorDateKey` (`useState(() => getTodayBusinessDateString(timezone))`) en lugar de `anchorDate: Date`.
   - Calcular `todayKey` en `timezone` sin congelarlo en `useMemo(..., [])`.
   - En la barra de período / cabecera de `agenda` y `slots`, cuando `timeScope === 'day'` y `getHolidayInfo(anchorDateKey)` existe, mostrar un banner contextual con color significativo:
     `"Feriado · {holiday.name} ({holiday.description})"`.
   - Pasar `timezone` a `ConfirmedAgenda` y `AdminChart`.
2. **`ConfirmedAgenda.tsx` y `ConfirmedAgenda.module.css`:**
   - Usar `formatBusinessDateKey(slot.datetime, timezone)` para agrupar turnos por día y `getTodayBusinessDateString(timezone)` para `todayStr`.
   - Reemplazar `formatHeaderDate` por `formatDateKeyLong(day.dateKey)`.
   - Para cada grupo `day`, consultar `const holiday = getHolidayInfo(day.dateKey)`:
     - Aplicar clase `.dateGroupHoliday` al contenedor/encabezado del día con un color significativo (borde izquierdo/acento y fondo suave usando tokens semánticos de advertencia/feriado, garantizando contraste AA en cualquier paleta del motor de temas).
     - Renderizar un pill/badge legible junto a la fecha: `Feriado · {holiday.name}` (con `title={holiday.description}`).
3. **`agendaTimeline.ts`:**
   - Recibir `timeZone = BUSINESS_TIMEZONE` en `options`, reemplazar `formatTime24h` por `formatBusinessTime(ms, timeZone)` y `formatLocalDate` por `formatBusinessDateKey(ms, timeZone)`.
4. **`AdminChart.tsx`:**
   - Leer `timezone` de `useOptionalTenant()?.timezone || BUSINESS_TIMEZONE` y usar `formatBusinessDateKey` + `formatDateKeyParts` de `dateUtils.ts`.

---

### 3.5 Vista Pública del Cliente (`ClientView`)

1. En `availableDates` (tira horizontal de días) y `groupedSlots` (encabezado de cada jornada):
   - Consultar `getHolidayInfo(dateKey)`.
   - Si es feriado, aplicar clase `.dateChipHoliday` / `.dayHeaderHoliday` con indicador discreto y `title`/`aria-label` anunciando el nombre del feriado.
   - Mostrar un badge compacto (`Feriado · {holiday.name}`) en el encabezado del grupo de turnos de ese día, manteniendo la reserva habilitada si el comercio publicó horarios.
2. Reemplazar los formateos manuales duplicados por los helpers centralizados de `dateUtils.ts`.

---

## 4. Estados Válidos e Invariantes

- **Invariante de Única Fuente de Verdad Temporal:** Ningún componente de `AdminView`, `CreateSlotModal`, `MultiDatePicker`, `ConfirmedAgenda`, `agendaTimeline`, `AdminChart` ni `ClientView` calcula claves de día, horas `HH:mm` ni rangos día/semana/mes usando la zona horaria local del navegador (`getFullYear`/`getMonth`/`getDate` sobre `new Date(iso)` sin `timeZone`).
- **Invariante Multi-Tenant Timezone:** Para cualquier tenant con `timezone` configurado (ej. `America/Argentina/Buenos_Aires`, `America/Mexico_City`, `Europe/Madrid`), un turno creado desde `CreateSlotModal` aparece exactamente en el mismo día y hora en `ConfirmedAgenda`, `SlotCard`, `AdminChart`, `ClientView` y los correos de Amazon SES.
- **Invariante Offline y UTF-8 de Feriados:** `src/data/holidays.json` se importa estáticamente en el bundle (cero requests externos en runtime), conserva caracteres UTF-8 intactos (`Año Nuevo`, `Día`, `Soberanía`) y todas sus entradas tienen fecha válida `YYYY-MM-DD`.
- **Invariante de No-Bloqueo Administrativo:** Marcar un día como feriado en `MultiDatePicker` y `ConfirmedAgenda` es informativo y visualmente inequívoco, pero nunca impide que un negocio que trabaja en feriados publique o gestione turnos ese día.
- **Invariante de Accesibilidad y Contraste:** Todo día feriado en el picker, agenda y vista cliente expone su motivo vía `aria-label` y texto visible/leyenda (no depende únicamente del color ni de `:hover`, garantizando usabilidad en dispositivos táctiles), y utiliza tokens CSS del tema activo para preservar contraste en todas las paletas.

---

## 5. Comprobaciones y Criterios de Aceptación

1. **Verificación de ausencia de código temporal duplicado/local:**
   - Búsqueda en `src/` por `formatLocalDate`, `getTodayLocalDateString`, `addDaysLocalDateString` y `formatTime24h` → **0 coincidencias**.
   - Búsqueda de usos directos de `BUSINESS_TIMEZONE` en componentes UI → restringidos únicamente a fallback cuando `tenant?.timezone` no existe.
2. **Validación del script `holidays:sync`, `src/data/holidays.json` y `src/utils/holidays.ts`:**
   - `npm run holidays:sync` descarga correctamente `holidays-2026-es.json`, genera `src/data/holidays.json` ordenado y válido con código `0`, y `npm run holidays:sync -- --dry-run` no modifica archivos en disco.
   - `src/data/holidays.json` contiene todos los feriados oficiales 2026 con codificación UTF-8 limpia (sin mojibake `Ã±` / `Ã­`).
   - `isHoliday('2026-01-01') === true`, `getHolidayInfo('2026-05-25')?.name` coincide con el catálogo oficial, y `getHolidayInfo('2026-05-25T02:00:00.000Z', 'America/Argentina/Buenos_Aires')` resuelve al `2026-05-24` (no feriado) mientras que en `Europe/Madrid` resuelve al `2026-05-25`.
3. **Suite de calidad y tests:**
   - `npm run lint` → código `0`.
   - `npm run build` → código `0`.
   - `npm test` → 100% de suites unitarias en verde (incluyendo `dateUtils.test.ts`, `agendaTimeline.test.ts` y la nueva suite `holidays.test.ts`).
4. **Verificación visual (desktop y móvil):**
   - En `AdminView → Crear turnos`: los días feriados del mes se distinguen con color significativo en `MultiDatePicker`, muestran leyenda legible debajo del calendario en móvil/desktop y reflejan el badge de feriado en chips y vista previa.
   - En `AdminView → Agenda`: los días feriados con turnos confirmados muestran encabezado resaltado con badge del motivo, y en vista diaria (`Día`) muestran el banner contextual de feriado.
   - En `ClientView`: los días feriados publicados muestran indicador y motivo sin obstaculizar el flujo de reserva.
