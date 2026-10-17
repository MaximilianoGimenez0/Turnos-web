---
target_identity: "file:D:\\Projects\\turnos-web\\src\\pages\\ClientView\\ClientView.tsx"
target_fingerprint: "sha256:969a9e2b3de5675305ad27a4aa509f16043f1e74b64e7a4411f092794b2b4ca4"
target_path: "D:\\Projects\\turnos-web\\src\\pages\\ClientView\\ClientView.tsx"
timestamp: 2026-09-15T21-12-18Z
slug: src-pages-clientview-clientview-tsx
---
# Design Health Score

| # | Heuristic | Score | Key Issue |
|---|-----------|-------|-----------|
| 1 | Visibility of System Status | 3 | Buenos loaders y filtros reactivos; falta feedback explícito sobre combinación de filtros. |
| 2 | Match System / Real World | 3 | Términos claros en español; el strip de fechas actual es poco intuitivo comparado con un calendario real. |
| 3 | User Control and Freedom | 3 | Búsqueda y modal cancelables; falta atajo para resetear día y franja simultáneamente. |
| 4 | Consistency and Standards | 3 | Estética pastel consistente; inconsistencia en peso entre la tarjeta del Hero y la grilla. |
| 5 | Error Prevention | 3 | Regla de 15 min y bloqueo atómico previenen solapamientos y turnos pasados. |
| 6 | Recognition Rather Than Recall | 2 | Redundancia masiva: fecha y estado "Disponible" repetidos en cada tarjeta; portfolio desconectado de los turnos. |
| 7 | Flexibility and Efficiency | 2 | Sin filtros directos de franja horaria (Mañana / Tarde); escanear 20 turnos requiere scroll exhaustivo. |
| 8 | Aesthetic and Minimalist Design | 2 | Sobrecarga de contenedores apilados (tarjeta dentro de grupo dentro de sección); fatiga visual por repetición. |
| 9 | Error Recovery | 3 | Estado vacío con botón de reinicio y modal ante caídas de conexión. |
| 10 | Help and Documentation | 3 | FAQ y banner de garantía presentes pero enterrados en contenedores masivos al pie. |
| **Total** | | **27/40** | **Acceptable** |

## Design Specificity Verdict

**LLM assessment**: La interfaz posee buenos cimientos de diseño y una paleta limpia, pero su estructura de contenedores se siente como una plantilla genérica tipo "landing page corporativa" adaptada a turnos en lugar de un sistema de reservas de estética y belleza ágil y especializado. La repetición de tarjetas completas de 300px para cada horario crea una barrera de navegación vertical innecesaria, especialmente en dispositivos móviles donde los clientes llegan desde Instagram y esperan ver disponibilidad inmediata.

**Deterministic scan**: El detector estático analizó `src/pages/ClientView/ClientView.tsx` y reportó 0 infracciones mecánicas de reglas de diseño (`[]`). La visualización de navegador no estuvo disponible por falla del entorno de descarga de drivers de Playwright.

## Overall Impression
Una base técnica y funcional sólida con sincronización en tiempo real, pero castigada por un diseño de contenedores rígido, excesivo scroll vertical por tarjetas hiper-redundantes y una distribución que esconde el portfolio visual donde el cliente más necesita inspiración y confianza.

## What's Working
1. **Flujo de reserva y checkout integrado**: El modal de reserva y la integración con Mercado Pago resuelven la transacción sin fricción técnica.
2. **Motor de búsqueda en tiempo real**: Capacidad reactiva para buscar por servicio, día o rango con actualización instantánea de resultados.
3. **Píldoras de confianza claras**: Garantía Mercado Pago, medios de pago y comprobante por correo comunican seguridad en la transacción.

## Priority Issues
- **[P1] Fatiga de Contenedores y Redundancia en la Grilla de Turnos**: Cada tarjeta de turno repite la fecha completa, el estado "Disponible", los badges de servicios y el botón completo, generando un scroll vertical interminable de 15+ tarjetas idénticas por día.
  *Fix*: Implementar una matriz horaria compacta por jornada dividida en franjas (Mañana / Tarde) con horas protagonistas y selección en un clic. (Comando sugerido: `/impeccable layout`)
- **[P1] Hero Asimétrico y Desplazamiento Móvil**: En pantallas móviles, el hero apila título, subtítulo, botón, 3 pills y la tarjeta del próximo turno, empujando la agenda real fuera de la primera pantalla visible.
  *Fix*: Compactar el Hero en móvil, unificar métricas y dar acceso inmediato a la agenda del día. (Comando sugerido: `/impeccable adapt`)
- **[P1] Desconexión entre Portfolio de Trabajos y Agenda**: El portfolio está sepultado al pie de página. El cliente que llega a reservar servicios de belleza no puede apreciar la calidad visual del trabajo antes de elegir horario.
  *Fix*: Reubicar o vincular visualmente los trabajos realizados con la selección de servicios y la reserva. (Comando sugerido: `/impeccable shape`)
- **[P2] Filtro de Fechas Limitado y Ausencia de Filtro por Franjas Horarias**: La tira horizontal de fechas actual no diferencia visualmente días de la semana de forma ergonómica ni ofrece accesos rápidos a "Mañana" o "Tarde".
  *Fix*: Crear un Calendar Strip interactivo con selector segmentado de franja horaria. (Comando sugerido: `/impeccable layout`)

## Persona Red Flags
- **Jordan (Confundido / Primera Vez)**: Ingresa desde Instagram y ve un hero con un único turno flotante de un servicio que quizás no busca. Debe bajar múltiples pantallas para encontrar el portfolio y entender los estilos del estudio.
- **Alex (Usuario Frecuente / Eficiente)**: Desea ver únicamente si hay turnos por la tarde el jueves. Debe hacer scroll por decenas de tarjetas de otros días o escribir manualmente en el buscador porque no hay pastillas de franja horaria.
- **Casey (Móvil con una sola mano)**: La tira de fechas requiere un gesto horizontal impreciso, y las tarjetas ocupan media pantalla cada una, demandando constante desplazamiento con el pulgar.

## Minor Observations
- Los tres contenedores inferiores (*Cómo funciona*, *FAQ*, *Garantía*) tienen un peso visual similar (mismo radio de borde, mismo fondo blanco y paddings masivos), generando monotonía de cajas.
- En resoluciones intermedias (tablets), la grilla de turnos deja huecos asimétricos debido al `minmax(290px, 1fr)`.

## Questions to Consider
- ¿Por qué tratar cada horario como una tarjeta independiente completa si el día y el estado ya son conocidos por el contenedor padre?
- ¿Qué pasaría si la visualización del trabajo del salón fuera el imán que guía directamente al cliente a elegir su horario?
