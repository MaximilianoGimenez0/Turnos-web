# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
- **Clientes finales (ClientView / Prices / About)**: Personas que buscan agendar citas de estética, belleza y cuidado personal de forma 100% online, revisar la lista de servicios y precios, reservar turnos con disponibilidad en tiempo real y abonar una seña garantizada mediante Mercado Pago.
- **Profesional / Propietario del Estudio (AdminView)**: Especialista independiente o titular de estudio de belleza que gestiona su agenda diaria, crea o genera turnos masivamente, administra servicios y duraciones estimadas, publica su portfolio y consulta métricas de facturación y reservas.

## Product Purpose
Resolver el ausentismo (*no-show*) y la superposición de citas (*double booking*) en estudios de estética y belleza independientes mediante un flujo automatizado de reserva con cobro de seña previa (Mercado Pago Checkout Pro), bloqueo concurrente temporal de 15 minutos y resolución algorítmica de solapamiento de turnos en tiempo real.

## Positioning
Solución integral y especializada para estudios de belleza y estética que combina agenda reactiva en tiempo real (Firestore `onSnapshot`), motor determinista de cálculo de duración y resolución de colisiones por intervalos temporales, pasarela de pago local confiable (Mercado Pago Checkout Pro) y despacho de comprobantes automáticos (Resend vía Cloud Functions), manteniendo la autonomía y marca propia del profesional sin depender de plataformas SaaS de terceros.

## Operating Context
- **Dispositivos móviles y de escritorio**: Los clientes ingresan predominantemente desde teléfonos móviles a través de links en redes sociales (Instagram bio, WhatsApp), requiriendo un flujo ágil de 3 pasos (Elegir turno -> Pagar seña -> Confirmación inmediata).
- **Jornada de trabajo del profesional**: El administrador consulta su agenda desde el móvil o PC durante la jornada, necesitando acceso directo a WhatsApp/teléfono del cliente, estados claros de pago y carga ágil de nuevos turnos o servicios.
- **Pagos localizados en pesos argentinos**: Cobro de seña online mediante Mercado Pago (tarjetas de crédito/débito o dinero en cuenta) con el saldo restante pagadero presencialmente el día de la cita.

## Capabilities and Constraints
- **Bloqueo concurrente temporal**: Transacción atómica de Firestore (`runTransaction`) que bloquea el turno por 15 minutos (`pending_payment`) mientras el cliente completa el pago.
- **Motor de intervalos temporales**: Cálculo dinámico de duraciones acumuladas por combinación de servicios; los turnos solapados en $[start, end)$ pasan a estado `conflict` y se recalculan/reactivan automáticamente si el turno colisionante se libera o cancela.
- **Modelo de negocio monousuario**: Un único profesional/estudio por despliegue, autenticado mediante Firebase Authentication (Email & Password).
- **Sincronización reactiva**: Estado de turnos y agenda sincronizado en tiempo real vía Firebase Firestore (`onSnapshot`).
- **Mantenimiento desatendido**: Tareas serverless en Cloud Scheduler (Cloud Functions v2 cada 30 min) para liberar reservas expiradas y purgar turnos históricos.
- **Idioma y localización**: Español rioplatense/latinoamericano centralizado en `src/texts/`, precios en moneda local (ARS).

## Brand Commitments
- **Nombre**: TurnosWeb.
- **Voz y tono**: Profesional, cálido, confiable y claro ("Realzá tu belleza con una experiencia única", "Turno asegurado en 3 pasos").
- **Identidad visual existente**: Paleta con soporte nativo de modo claro y oscuro basada en tokens HSL (Plus Jakarta Sans para títulos, Inter para cuerpo, microinteracciones con Motion).
- **Transparencia en el proceso**: Información explícita de montos de seña versus saldo restante a pagar presencialmente el día de la cita.

## Evidence on Hand
- Código fuente en producción con suite de tests unitarios para el motor de intervalos (`src/services/schedulingService.test.ts`).
- Copys centralizados y tipados por pantalla en `src/texts/`.
- Módulos de gestión de agenda, portfolio y configuración comercial (`src/components/admin/`).

## Product Principles
1. **Cero fricción para el cliente**: De la selección del horario al comprobante de pago en el menor número de interacciones posibles, con diseño móvil prioritario y feedback visual instantáneo.
2. **Certeza absoluta de agenda**: Ningún turno reservado puede colisionar con otro ni quedar en limbo tras un corte de red; las transacciones son atómicas e idempotentes.
3. **Claridad financiera y operativa**: El cliente sabe con exactitud cuánto paga de seña, cuánto abonará en el local y cómo contactar al profesional. El profesional tiene visibilidad total de turnos e ingresos.
4. **Respeto a la identidad del negocio**: El estudio transmite exclusividad y confianza tanto en la estética pública como en la seriedad del comprobante y la gestión.
