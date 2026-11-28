# To-Do: Auditoría y Rediseño de Analíticas (`AdminChart` en `AdminView`)

> **Estado:** Implementado (`src/services/analyticsService.ts` + rediseño de `AdminChart.tsx` con distinción de cobros online vs manuales, saldo pendiente y timezone del tenant)

Evaluación técnica y visual de la pestaña **Métricas** (`AdminChart`) en `AdminView`, problemas detectados en la implementación actual y plan completo de mejoras funcionales y de diseño.

---

## 1. Archivos Actuales Involucrados

- [src/components/admin/AdminChart/AdminChart.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/admin/AdminChart/AdminChart.tsx) (254 líneas)
- [src/components/admin/AdminChart/AdminChart.module.css](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/admin/AdminChart/AdminChart.module.css) (263 líneas)
- [src/texts/components/admin/AdminChart.ts](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/texts/components/admin/AdminChart.ts) (24 líneas)
- [src/pages/AdminView/AdminView.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/pages/AdminView/AdminView.tsx#L262-L290) (carga de `chartsSlots` con `fetchAllSlotsOnce(tenantId)`)

---

## 2. Problemas Detectados en la Implementación Actual

### 2.1 Errores de cálculo y datos subutilizados
1. **Solo muestra señas y mezcla cobros online con turnos manuales:**
   - `curr.paidAmount || curr.depositAmount || 0` suma `depositAmount` incluso en turnos asignados manualmente desde el panel (`adminAssignSlot`, sin `paymentId` ni `paidAmount`), inflando las "Señas Cobradas" con dinero que no entró por Mercado Pago.
2. **Ignora la recaudación total estimada y el saldo a cobrar presencialmente:**
   - Cada turno ya guarda `clientData.estimatedPrice`, `clientData.basePrice` y `clientData.extrasPrice`, pero hoy no se calcula ni la **Facturación Total Estimada** ni el **Saldo Pendiente en Local** (`estimatedPrice - seña`).
3. **"Ticket Promedio" engañoso:**
   - Divide las señas cobradas por la cantidad de turnos confirmados; en realidad muestra la *seña promedio*, no el valor promedio real del servicio vendido.
4. **Zona horaria hardcodeada:**
   - `AdminChart.tsx` usa `BUSINESS_TIMEZONE` en vez del `timezone` real del negocio (`useTenant().timezone`), lo que puede desfasar días/horarios en negocios con otra zona horaria.
5. **Código muerto sin mostrar (`cancelledSlots`):**
   - Calcula `cancelledSlots` y `totalCancelled` (y existen `.kpiIconDanger` / `.kpiDangerValue` en CSS), pero nunca se renderizan ni las cancelaciones ni la tasa de cancelación.

### 2.2 Limitaciones funcionales (sin filtros ni insights clave)
6. **Sin filtros de período, servicio ni canal:**
   - `AdminView` carga todo el historial (`fetchAllSlotsOnce`) y `AdminChart` apila todas las fechas históricas juntas. No se puede filtrar por **Últimos 7 días / 30 días / Mes actual / Este año / Todo / Rango personalizado**, ni por **Servicio**, ni por **Origen (Online MP vs. Manual)**.
7. **Faltan analíticas operativas accionables:**
   - No muestra **días de la semana más concurridos** (Lunes a Domingo).
   - No muestra **franjas horarias pico** (mañana / tarde / noche o por hora).
   - No muestra **ranking de servicios y adicionales más reservados** (cantidad y aporte en $).
   - No muestra **tasa de ocupación** (`confirmados / (disponibles + confirmados)`), **tasa de recurrencia de clientes** (nuevos vs. recurrentes) ni **tasa de cancelación**.
8. **Estado vacío bloqueante:**
   - Si `confirmedSlots.length === 0`, reemplaza toda la vista por un texto plano. Cuando se agreguen filtros, un filtro sin resultados debe mantener visible la barra de filtros para poder cambiarlo.

### 2.3 Problemas visuales y de UX
9. **Gráfico SVG estático y poco atractivo:**
   - Declara `<linearGradient id="barGradient">` en `<defs>` pero **nunca lo usa** (`.bar` aplica un color plano `var(--color-primary)`).
   - Usa únicamente `<title>` nativo del navegador como tooltip (lento, sin estilo e inutilizable en móviles táctiles).
   - Si hay muchas fechas, obliga a scrollear horizontalmente una barra rígida; con pocas fechas, las barras quedan aisladas con mucho espacio vacío.
   - Sin estado hover enriquecido, sin línea de promedio ni conmutador de métrica (Señas vs. Recaudación Total vs. Cantidad de Turnos).

---

## 3. Mejoras Propuestas (Funcionalidad y Datos)

### 3.1 Barra de Filtros Interactiva (siempre visible arriba)
- **Período:** pills rápidas (`7 días`, `30 días`, `Mes actual`, `Últimos 3 meses`, `Todo`) + selector opcional `Desde / Hasta`.
- **Comparativa automática vs. período anterior:** badge de tendencia en cada KPI (ej. `+18% vs. período anterior`).
- **Canal de reserva:** `Todos` | `Online (Mercado Pago)` | `Asignados manual`.
- **Servicio:** selector desplegable con todos los servicios detectados en los turnos + botón `Limpiar filtros`.
- **Exportación rápida:** botón opcional `Exportar CSV` con el resumen filtrado para contabilidad.

### 3.2 Tarjetas KPI Rediseñadas (Jerarquía Financiera + Operativa)
1. **Recaudación Total Estimada** (valor completo de los servicios confirmados: `estimatedPrice`, con desglose: *Señas online* + *Saldo presencial*).
2. **Señas Cobradas Online** (solo `paidAmount` real / pagos MP, diferenciando cobro real vs. turnos manuales).
3. **Saldo a Cobrar en Local** (`totalEstimado - señasPagas`).
4. **Turnos Confirmados y Ocupación** (cantidad + `% de ocupación` sobre cupos publicados + mini chip de cancelados si > 0).
5. **Ticket Promedio Real** (promedio sobre `estimatedPrice`, no sobre la seña) y **Clientes Únicos** (con `% de clientes recurrentes`).

### 3.3 Nuevos Bloques de Analíticas Visuales
1. **Gráfico Principal Interactivo (Ingresos y Turnos por Fecha):**
   - Selector de vista dentro de la tarjeta: **Recaudación Total** | **Señas Cobradas** | **Cantidad de Turnos** (o barras apiladas: *Seña cobrada* + *Saldo restante* formando el *Total*).
   - Gradiente real en barras, bordes superiores redondeados, línea punteada de **promedio diario** y **tooltip flotante custom** al hacer hover o tap en mobile (fecha, turnos, señas, total estimado).
   - Agrupación inteligente automática (por día si el rango <= 31 días; por semana/mes si es mayor, evitando scroll infinito).
2. **Días de la Semana Más Concurridos (Lunes → Domingo):**
   - Gráfico de barras horizontales o columnas por día de semana mostrando `% de demanda`, cantidad de turnos y facturación promedio por día, destacando automáticamente el **día pico** (ej. *"Sábado concentra el 34% de tus turnos"*).
3. **Horarios Pico (Mapa de Franjas Horarias):**
   - Distribución por hora o bloque (`Mañana 08–12`, `Mediodía 12–15`, `Tarde 15–19`, `Noche 19+`) con intensidad visual tipo heatmap suave para decidir en qué horarios conviene abrir más turnos.
4. **Top Servicios y Adicionales Más Pedidos:**
   - Ranking con barra de progreso proporcional, cantidad de reservas, participación `%` y facturación generada por cada servicio (leyendo `bookedServices` / `selectedServices` / `serviceName`) + mención de los extras más elegidos.
5. **Salud de Agenda y Clientes:**
   - Embudo/resumen compacto: `Disponibles` · `Confirmados` · `Cancelados` · `En conflicto` + proporción **Clientes nuevos vs. Recurrentes** (más de 1 turno confirmado).

---

## 4. Propuesta de Estilo Visual (Moderno, Editorial y Responsivo)

- **Consistencia con el Design System:** usar exclusivamente variables CSS del tema (`--bg-surface`, `--bg-surface-subtle`, `--border-medium`, `--color-primary`, `--color-accent`, `--color-success-*`, `--radius-lg`, `--font-heading`, `--font-mono`), garantizando soporte perfecto para **modo claro y modo oscuro**.
- **Layout Bento Grid Asimétrico (Desktop 12 cols → Tablet 2 cols → Mobile 1 col):**
  - **Fila 1:** Barra de filtros compacta (sticky/limpia en header de sección) con chips activos.
  - **Fila 2:** Grid de KPIs con acento superior sutil, `font-variant-numeric: tabular-nums`, ícono en badge y pill de variación porcentual (`↗ +12%` / `↘ -5%`).
  - **Fila 3:** Gráfico principal ancho completo con tabs de métrica (`Total` / `Señas` / `Turnos`), barras apiladas con gradiente SVG real, línea de promedio y tooltip flotante interactivo.
  - **Fila 4 (2 columnas 50/50):** *Días más concurridos* (izquierda) + *Top Servicios* (derecha).
  - **Fila 5 (2 columnas 50/50):** *Franjas horarias pico* (izquierda) + *Resumen de clientes y salud de agenda* (derecha).
- **Micro-interacciones:** transiciones suaves (`150ms–200ms`) al cambiar de filtro o hover sobre barras/filas, sin dependencias pesadas de gráficos (SVG nativo + CSS Grid/Flexbox limpio para mantener el bundle liviano).

---

## 5. Orden Sugerido de Implementación

1. **Capa pura de cálculo y agregación (`src/services/analyticsService.ts` + tests unitarios):**
   - Funciones puras tipadas para filtrar `Slot[]`, calcular KPIs (distinguiendo `paidAmount` MP vs. manual, `estimatedPrice`, saldo pendiente), agrupar por fecha/semana, día de semana, franja horaria, servicios/extras y recurrencia de clientes usando `tenant.timezone`.
2. **Textos centralizados (`src/texts/components/admin/AdminChart.ts`):**
   - Mantener voseo argentino amigable y cero tecnicismos.
3. **Componentes visuales (`AdminChart.tsx` + `AdminChart.module.css`):**
   - Subcomponentes internos limpios (barra de filtros, KPI cards, gráfico SVG con tooltip custom, rankings de días/horarios/servicios).
4. **Verificación:**
   - Nuevos tests unitarios en `tests/unit/analyticsService.test.ts` cubriendo turnos MP, turnos manuales, cancelaciones, zonas horarias y filtros.
   - `npm run lint`, `npm run build` y `npm test`.
