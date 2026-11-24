# TODO / Reporte Técnico — Migración de Mercado Pago: Preferences API → Orders API

> **Estado:** Pendiente (planificado para después de completar la migración al nuevo dominio)
> **Prioridad:** Media (preventiva / evolución tecnológica; no urgente mientras Preferences API siga con soporte operativo)
> **Fecha de relevamiento:** 2026-11-24
> **Ámbito:** Backend (`functions/`), Frontend (`src/`), Textos del panel Admin y Tests

---

## 1. Diagnóstico Actual en el Código

Actualmente **TurnosWeb** integra **Mercado Pago Checkout Pro** mediante el flujo clásico **Preferences API + Payments API** usando el SDK `mercadopago@^2.3.0` (`functions/package.json`):

| Archivo | Líneas | Uso actual |
| :--- | :--- | :--- |
| `functions/src/mercadoPago.ts` | `13–25`, `138–165` | Instancia y cachea `Preference` (`preferenceClient`) y `Payment` (`paymentClient`) por `tenantId` + fingerprint del `accessToken`. |
| `functions/src/index.ts` | `208–460` | `createPreference` bloquea el turno por 15 min (`pending_payment`) y llama a `preferenceClient.create(...)` (endpoint `/checkout/preferences`) devolviendo `initPoint` / `sandboxInitPoint`. |
| `functions/src/index.ts` | `605–606` | Consulta el estado real del cobro vía `paymentClient.get({ id: pid })` (Payments API). |
| `functions/src/index.ts` | `1269–1395` | `mpWebhook` valida firma HMAC (`verifyMercadoPagoSignature`), procesa notificaciones de tipo `payment` y confirma atómicamente el turno. |
| `functions/src/index.ts` | `1398+` | `verifyPayment` permite al frontend verificar el pago al retornar desde `/payment/success` o `/payment/pending`. |
| `functions/src/webhookSecurity.ts` | `27+` | Valida header `x-signature` + `x-request-id` + `data.id` y parsea `external_reference` (`tenantId\|slotId\|lockToken`). |
| `src/pages/PaymentStatus/PaymentSuccess.tsx` | `62–66` | Lee `payment_id` / `collection_id`, `preference_id` y `external_reference` desde los query params de retorno. |
| `src/texts/components/admin/PaymentSettings.ts` | `112–118` | Instruye al dueño del estudio a suscribir el evento `Pagos (payment)` en Mercado Pago Developers. |

---

## 2. Contexto de Mercado Pago y Motivo de la Migración

- **Estado de Preferences API:** No existe apagón inmediato para integraciones ya operativas; las preferencias existentes continúan funcionando.
- **Dirección oficial de Mercado Pago:** `Preferences API` quedó en estado **clásico/legacy** (sin nuevas funcionalidades). Todo el roadmap nuevo de Checkout Pro se desarrolla sobre la **Orders API** (`POST /v1/orders` → devuelve `checkout_url` y unifica ciclo de vida, pagos y reembolsos).
- **Ventajas de migrar a Orders API:**
  - Endpoint unificado (`/v1/orders`) con idempotencia nativa (`X-Idempotency-Key`) alineada con nuestro `lockToken`.
  - Mejor trazabilidad de estados de la orden y sus transacciones asociadas.
  - Compatibilidad garantizada a largo plazo con nuevas funciones y medios de pago de Mercado Pago Argentina/LATAM.

---

## 3. Riesgos y Restricciones Multi-Tenant a Cuidar

1. **Coexistencia durante la transición (Zero-Downtime):**
   - Si hay reservas `pending_payment` creadas con `Preferences API` justo antes del despliegue, `mpWebhook` y `verifyPayment` deben seguir soportando eventos/consultas de `payment` durante al menos 24–48 horas (o como fallback permanente).
2. **Impacto en clientes existentes (`isDemo: false`):**
   - Cada negocio conecta su propia aplicación de Mercado Pago Developers. Si el webhook cambia de tópico `payment` a `order`, **los negocios ya onboardeados deberán habilitar el tópico correspondiente en su panel de Mercado Pago Developers** (o el backend deberá aceptar ambos tópicos en paralelo para no cortar cobros existentes).
3. **Verificación HMAC (`x-signature`):**
   - Confirmar el formato exacto de `manifest` (`id:{data.id};request-id:{x-request-id};ts:{ts};`) para notificaciones de `order` en Mercado Pago antes de desplegar a producción.
4. **Expiración de 15 minutos (`LOCK_DURATION_MS`):**
   - Asegurar que el `expiration_time` enviado en la orden de MP coincida exactamente con el bloqueo atómico de 15 minutos en Firestore para evitar pagos tardíos (`late_payment_conflict`).

---

## 4. Plan de Implementación por Fases (TODO)

### Fase 1 — Investigación y prueba de concepto en Sandbox MP
- [ ] Revisar documentación vigente de Mercado Pago Argentina para **Checkout Pro con Orders API** (payload de `POST /v1/orders`, `checkout_url`, `back_urls`, `expiration_time`, `external_reference`, query params de retorno y formato de webhook `order`).
- [ ] Verificar si la versión más reciente del SDK Node `mercadopago` incluye soporte estable de `Order` o si conviene usar cliente HTTP tipado sobre `/v1/orders` con `X-Idempotency-Key`.
- [ ] Probar en cuenta Sandbox de Mercado Pago un ciclo completo (creación de orden → pago aprobado/rechazado/pendiente → recepción de webhook firmado HMAC → consulta por `GET /v1/orders/{id}`).

### Fase 2 — Backend (`functions/`) con compatibilidad dual
- [ ] Actualizar `mercadopago` en `functions/package.json` y exponer cliente de órdenes en `functions/src/mercadoPago.ts` manteniendo `paymentClient` como respaldo de transición.
- [ ] Migrar la creación de checkout en `functions/src/index.ts` para generar una Orden online con:
  - `X-Idempotency-Key` derivado del `lockToken` del intento (`payment_attempts`).
  - `external_reference` preservando el formato `tenantId|slotId|lockToken`.
  - `expiration_time` sincronizado con los 15 minutos de bloqueo.
  - Guardado de `orderId` (junto o en reemplazo progresivo de `preferenceId`) en `slots/{slotId}` y `payment_attempts/{attemptId}`.
- [ ] Adaptar `mpWebhook` y `functions/src/webhookSecurity.ts` para procesar notificaciones de **Orders** (y mantener soporte a notificaciones `payment` legadas sin romper webhooks ya configurados).
- [ ] Adaptar `verifyPayment` para aceptar `orderId` y/o `paymentId`, devolviendo el mismo contrato `PublicVerifiedBookingSummary` al frontend.

### Fase 3 — Frontend (`src/`) y guía de configuración de tenants
- [ ] Actualizar `src/pages/PaymentStatus/PaymentSuccess.tsx` para leer tanto los parámetros nuevos de retorno de Orders (`order_id`, etc.) como los clásicos (`payment_id`, `collection_id`).
- [ ] Actualizar `src/types/index.ts` (`Slot`, `PaymentAttemptDoc`, `VerifyPaymentPayload`) si se incorporan campos `orderId`.
- [ ] Actualizar las instrucciones paso a paso en `src/texts/components/admin/PaymentSettings.ts` para indicar el/los eventos exactos de Webhook a tildar en Mercado Pago Developers.

### Fase 4 — Testing y Certificación
- [ ] Actualizar tests unitarios (`tests/unit/functionsSecurity.test.ts` y tests de mapeo de orden/pago).
- [ ] Actualizar tests de integración con Firebase Emulators (`tests/integration/cloudFunctions.test.ts`, `tests/integration/tenantSyncAndPayments.test.ts`, `tests/integration/crossTenantIsolation.test.ts`).
- [ ] Ejecutar pruebas manuales de `BKG-01` a `BKG-10` en `artifacts/manualtest.html` con tarjetas de prueba de Mercado Pago.

### Fase 5 — Despliegue y Limpieza Posterior
- [ ] Desplegar en rama dedicada / entorno demo (`/demo`) y validar cobro real de prueba + comprobante por email (Resend).
- [ ] Comunicar a tenants activos (si aplica) la activación del tópico `order` en sus Webhooks de Mercado Pago Developers.
- [ ] Una vez estabilizado en producción, evaluar la remoción de código legacy de `preferenceClient`.
