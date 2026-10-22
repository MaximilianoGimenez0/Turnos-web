import { Resend } from 'resend';

export interface PriceExtra {
  id?: string;
  name: string;
  price: number;
}

export interface BookedServiceExtra {
  id?: string;
  name: string;
  price: number;
  selected: boolean;
}

export interface BookedServiceItem {
  serviceId?: string;
  name: string;
  basePrice: number;
  durationMinutes?: number;
  extras?: BookedServiceExtra[];
}

export interface BookingEmailPayload {
  slotId: string;
  paymentId: string;
  serviceName: string;
  datetime?: string;
  formattedDate?: string;
  formattedTime?: string;
  depositAmount: number;
  clientName: string;
  clientEmail: string;
  clientPhone?: string;
  clientNotes?: string;
  bookedServices?: BookedServiceItem[];
  selectedServices?: string[];
  selectedRules?: string[];
  selectedExtras?: PriceExtra[];
  basePrice?: number;
  extrasPrice?: number;
  estimatedDurationMinutes?: number;
  estimatedDuration?: string;
  estimatedPrice?: number;
  ownerEmail?: string;
}

export interface SendEmailsResult {
  clientSent: boolean;
  ownerSent: boolean;
  clientError?: string;
  ownerError?: string;
}

const resendApiKey = process.env.RESEND_API_KEY || '';
const resendFromEmail = process.env.RESEND_FROM_EMAIL || 'Turnos Web <onboarding@resend.dev>';
const fallbackOwnerEmail = process.env.BUSINESS_EMAIL || 'macagimenez.nails@hotmail.com';

const resendClient = resendApiKey ? new Resend(resendApiKey) : null;

export const isResendConfigured = (): boolean => {
  return Boolean(resendApiKey) && !resendApiKey.includes('placeholder') && resendApiKey.length > 5;
};

export const formatCurrency = (amount?: number): string => {
  const value = typeof amount === 'number' && !isNaN(amount) ? amount : 0;
  return `$${value.toLocaleString('es-AR')}`;
};

export const formatBookingDate = (datetime?: string, fallbackDate?: string): string => {
  if (datetime) {
    const d = new Date(datetime);
    if (!isNaN(d.getTime())) {
      return d.toLocaleDateString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        weekday: 'long',
        day: 'numeric',
        month: 'long',
        year: 'numeric',
      });
    }
  }
  return fallbackDate || 'A coordinar';
};

export const formatBookingTime = (datetime?: string, fallbackTime?: string): string => {
  if (datetime) {
    const d = new Date(datetime);
    if (!isNaN(d.getTime())) {
      const timeStr = d.toLocaleTimeString('es-AR', {
        timeZone: 'America/Argentina/Buenos_Aires',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      });
      return `${timeStr} hs`;
    }
  }
  if (fallbackTime) {
    const clean = fallbackTime.replace(/\s*hs\.?$/i, '').trim();
    return clean ? `${clean} hs` : 'A coordinar';
  }
  return 'A coordinar';
};

interface FinancialBreakdown {
  totalEstimated: number;
  depositPaid: number;
  salonBalance: number;
  servicesBreakdownHtml: string;
  servicesBreakdownText: string;
}

function buildFinancialBreakdown(booking: BookingEmailPayload): FinancialBreakdown {
  const depositPaid = Number(booking.depositAmount) || 0;

  if (Array.isArray(booking.bookedServices) && booking.bookedServices.length > 0) {
    let calculatedTotal = 0;
    let htmlRows = '';
    const textLines: string[] = [];

    booking.bookedServices.forEach((service, sIndex) => {
      const sBase = Number(service.basePrice) || 0;
      calculatedTotal += sBase;

      htmlRows += `
        <tr style="border-bottom: 1px solid #f1f5f9;">
          <td style="padding: 12px 8px; vertical-align: top;">
            <div style="font-weight: 600; color: #1e293b; font-size: 14px;">${sIndex + 1}. ${service.name}</div>
          </td>
          <td style="padding: 12px 8px; text-align: right; font-weight: 600; color: #1e293b; font-size: 14px; vertical-align: top;">
            ${formatCurrency(sBase)}
          </td>
        </tr>
      `;
      textLines.push(`• ${service.name}: ${formatCurrency(sBase)}`);

      const selectedExtras = (service.extras || []).filter((e) => e.selected);
      if (selectedExtras.length > 0) {
        selectedExtras.forEach((extra) => {
          const ePrice = Number(extra.price) || 0;
          calculatedTotal += ePrice;
          htmlRows += `
            <tr style="background-color: #fafaf9; border-bottom: 1px dashed #e2e8f0;">
              <td style="padding: 8px 8px 8px 24px; color: #64748b; font-size: 13px;">
                ↳ <span style="color: #475569;">+ Extra: ${extra.name}</span>
              </td>
              <td style="padding: 8px 8px; text-align: right; color: #64748b; font-size: 13px;">
                +${formatCurrency(ePrice)}
              </td>
            </tr>
          `;
          textLines.push(`   ↳ + Extra ${extra.name}: +${formatCurrency(ePrice)}`);
        });
      }
    });

    const finalTotal = booking.estimatedPrice && booking.estimatedPrice > 0 ? booking.estimatedPrice : calculatedTotal;
    const salonBalance = Math.max(0, finalTotal - depositPaid);

    return {
      totalEstimated: finalTotal,
      depositPaid,
      salonBalance,
      servicesBreakdownHtml: htmlRows,
      servicesBreakdownText: textLines.join('\n'),
    };
  }

  const basePrice = Number(booking.basePrice) || 0;
  let calculatedTotal = basePrice;
  const sName =
    booking.serviceName ||
    (booking.selectedServices && booking.selectedServices.length > 0
      ? booking.selectedServices.join(', ')
      : 'Servicio general');

  let htmlRows = `
    <tr style="border-bottom: 1px solid #f1f5f9;">
      <td style="padding: 12px 8px; font-weight: 600; color: #1e293b; font-size: 14px;">${sName}</td>
      <td style="padding: 12px 8px; text-align: right; font-weight: 600; color: #1e293b; font-size: 14px;">${formatCurrency(basePrice)}</td>
    </tr>
  `;
  const textLines: string[] = [`• ${sName}: ${formatCurrency(basePrice)}`];

  if (Array.isArray(booking.selectedExtras) && booking.selectedExtras.length > 0) {
    booking.selectedExtras.forEach((extra) => {
      const ePrice = Number(extra.price) || 0;
      calculatedTotal += ePrice;
      htmlRows += `
        <tr style="background-color: #fafaf9; border-bottom: 1px dashed #e2e8f0;">
          <td style="padding: 8px 8px 8px 24px; color: #64748b; font-size: 13px;">
            ↳ + Extra: ${extra.name}
          </td>
          <td style="padding: 8px 8px; text-align: right; color: #64748b; font-size: 13px;">
            +${formatCurrency(ePrice)}
          </td>
        </tr>
      `;
      textLines.push(`   ↳ + Extra ${extra.name}: +${formatCurrency(ePrice)}`);
    });
  }

  const finalTotal = booking.estimatedPrice && booking.estimatedPrice > 0 ? booking.estimatedPrice : calculatedTotal;
  const salonBalance = Math.max(0, finalTotal - depositPaid);

  return {
    totalEstimated: finalTotal,
    depositPaid,
    salonBalance,
    servicesBreakdownHtml: htmlRows,
    servicesBreakdownText: textLines.join('\n'),
  };
}

export function buildClientEmailHtml(booking: BookingEmailPayload): string {
  const displayDate = formatBookingDate(booking.datetime, booking.formattedDate);
  const displayTime = formatBookingTime(booking.datetime, booking.formattedTime);
  const durationText = booking.estimatedDuration || (booking.estimatedDurationMinutes ? `${booking.estimatedDurationMinutes} min` : 'A coordinar');
  const breakdown = buildFinancialBreakdown(booking);

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmación de Turno</title>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; line-height: 1.5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05), 0 2px 4px -1px rgba(0, 0, 0, 0.03); border: 1px solid #e2e8f0;">
    
    <!-- Encabezado de Marca -->
    <div style="background: linear-gradient(135deg, #9d174d 0%, #be185d 100%); padding: 32px 24px; text-align: center; color: #ffffff;">
      <div style="font-size: 13px; text-transform: uppercase; letter-spacing: 2px; font-weight: 700; color: #fbcfe8; margin-bottom: 8px;">Maca Giménez Nails</div>
      <h1 style="margin: 0; font-size: 24px; font-weight: 800; color: #ffffff;">¡Tu Turno está Confirmado!</h1>
      <p style="margin: 8px 0 0 0; font-size: 15px; color: #fce7f3;">Registramos tu seña exitosamente. Te esperamos.</p>
    </div>

    <!-- Contenido Principal -->
    <div style="padding: 28px 24px;">
      <p style="font-size: 16px; color: #1e293b; margin-top: 0; margin-bottom: 20px;">
        Hola <strong>${booking.clientName || 'Cliente'}</strong>, gracias por tu reserva. A continuación tenés el comprobante detallado con tu horario y el desglose de lo contratado:
      </p>

      <!-- Tarjeta Destacada de Fecha y Horario -->
      <div style="background-color: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 12px; padding: 18px 20px; margin-bottom: 24px;">
        <table style="width: 100%; border-collapse: collapse;">
          <tr>
            <td style="padding: 4px 0; font-size: 14px; color: #831843; font-weight: 600; width: 80px;">📅 Fecha:</td>
            <td style="padding: 4px 0; font-size: 15px; color: #1e293b; font-weight: 700; text-transform: capitalize;">${displayDate}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-size: 14px; color: #831843; font-weight: 600;">⏰ Horario:</td>
            <td style="padding: 4px 0; font-size: 15px; color: #1e293b; font-weight: 700;">${displayTime}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; font-size: 14px; color: #831843; font-weight: 600;">⏳ Duración:</td>
            <td style="padding: 4px 0; font-size: 14px; color: #475569;">${durationText} aprox.</td>
          </tr>
        </table>
      </div>

      <!-- Tabla de Servicios y Adicionales Contratados -->
      <div style="margin-bottom: 24px;">
        <h2 style="font-size: 15px; text-transform: uppercase; letter-spacing: 0.5px; color: #475569; margin: 0 0 12px 0; border-bottom: 2px solid #f1f5f9; padding-bottom: 8px;">
          Servicios y Extras Contratados
        </h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid #cbd5e1; color: #64748b; font-size: 12px; text-transform: uppercase;">
              <th style="padding: 6px 8px; text-align: left;">Detalle</th>
              <th style="padding: 6px 8px; text-align: right;">Precio</th>
            </tr>
          </thead>
          <tbody>
            ${breakdown.servicesBreakdownHtml}
          </tbody>
        </table>
      </div>

      <!-- Desglose Financiero y Saldo en Salón -->
      <div style="margin-bottom: 24px; border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden;">
        <div style="background-color: #f8fafc; padding: 14px 16px; border-bottom: 1px solid #e2e8f0;">
          <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
            <tr>
              <td style="color: #64748b; padding: 4px 0;">Total Estimado del Servicio:</td>
              <td style="text-align: right; color: #1e293b; font-weight: 600; padding: 4px 0;">${formatCurrency(breakdown.totalEstimated)}</td>
            </tr>
            <tr>
              <td style="color: #15803d; padding: 4px 0; font-weight: 600;">Seña Pagada Online (Mercado Pago):</td>
              <td style="text-align: right; color: #15803d; font-weight: 700; padding: 4px 0;">- ${formatCurrency(breakdown.depositPaid)}</td>
            </tr>
          </table>
        </div>

        <!-- Saldo a abonar en el salón destacado -->
        <div style="background: linear-gradient(135deg, #fff1f2 0%, #fdf2f8 100%); padding: 16px 20px; border-top: 1px solid #fbcfe8;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td style="vertical-align: middle;">
                <div style="font-size: 13px; text-transform: uppercase; font-weight: 700; color: #9d174d; letter-spacing: 0.5px;">
                  Saldo a abonar en el Salón:
                </div>
                <div style="font-size: 12px; color: #701a75;">A pagar al finalizar la atención</div>
              </td>
              <td style="text-align: right; vertical-align: middle;">
                <div style="font-size: 24px; font-weight: 900; color: #9d174d;">
                  ${formatCurrency(breakdown.salonBalance)}
                </div>
              </td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Notas o Solicitudes del Cliente -->
      ${booking.clientNotes ? `
        <div style="background-color: #f8fafc; border-left: 4px solid #cbd5e1; padding: 10px 14px; margin-bottom: 24px; font-size: 13px; color: #475569;">
          <strong>Tus notas:</strong> ${booking.clientNotes}
        </div>
      ` : ''}

      <!-- Información Práctica y Políticas del Salón -->
      <div style="background-color: #f8fafc; border-radius: 12px; padding: 16px; margin-bottom: 24px; font-size: 13px; color: #475569; border: 1px solid #e2e8f0;">
        <div style="font-weight: 700; color: #1e293b; margin-bottom: 6px;">📌 Información Importante para tu Cita:</div>
        <ul style="margin: 0; padding-left: 18px; line-height: 1.6;">
          <li>Te pedimos llegar con <strong>5 a 10 minutos de anticipación</strong>.</li>
          <li>El saldo restante (<strong>${formatCurrency(breakdown.salonBalance)}</strong>) lo podés abonar en el salón en efectivo o transferencia.</li>
          <li>En caso de necesitar reprogramar o cancelar, por favor avisanos con al menos 24 hs de anticipación para no perder la seña.</li>
        </ul>
      </div>

      <!-- Datos del Pago Mercado Pago -->
      <div style="font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 16px;">
        ID de Pago MP: <code>#${booking.paymentId}</code> &bull; Ref Turno: <code>${booking.slotId}</code>
      </div>
    </div>

    <!-- Pie de Correo -->
    <div style="background-color: #f1f5f9; padding: 20px; text-align: center; font-size: 12px; color: #64748b;">
      <p style="margin: 0 0 4px 0; font-weight: 600; color: #334155;">Maca Giménez Nails</p>
      <p style="margin: 0;">¡Gracias por confiar en nosotras! Nos vemos pronto.</p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

export function buildOwnerEmailHtml(booking: BookingEmailPayload): string {
  const displayDate = formatBookingDate(booking.datetime, booking.formattedDate);
  const displayTime = formatBookingTime(booking.datetime, booking.formattedTime);
  const durationText = booking.estimatedDuration || (booking.estimatedDurationMinutes ? `${booking.estimatedDurationMinutes} min` : 'A coordinar');
  const breakdown = buildFinancialBreakdown(booking);

  return `
<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Nueva Reserva Confirmada</title>
</head>
<body style="margin: 0; padding: 24px 0; background-color: #f8fafc; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; color: #334155; line-height: 1.5;">
  <div style="max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.05); border: 1px solid #e2e8f0;">
    
    <!-- Encabezado de Notificación Administrador -->
    <div style="background: linear-gradient(135deg, #1e293b 0%, #0f172a 100%); padding: 28px 24px; text-align: center; color: #ffffff;">
      <div style="display: inline-block; background-color: #10b981; color: #ffffff; font-size: 11px; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; padding: 4px 10px; border-radius: 9999px; margin-bottom: 10px;">
        ✓ Pago Seña Acreditado
      </div>
      <h1 style="margin: 0; font-size: 22px; font-weight: 800;">🔔 Nueva Reserva Confirmada</h1>
      <p style="margin: 6px 0 0 0; font-size: 14px; color: #94a3b8;">${booking.clientName || 'Cliente'} reservó un turno</p>
    </div>

    <!-- Contenido Principal -->
    <div style="padding: 24px;">
      
      <!-- Ficha del Cliente -->
      <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <h2 style="font-size: 13px; text-transform: uppercase; color: #64748b; margin: 0 0 10px 0; letter-spacing: 0.5px;">👤 Datos del Cliente</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 4px 0; color: #64748b; width: 90px; font-weight: 600;">Nombre:</td>
            <td style="padding: 4px 0; color: #1e293b; font-weight: 700;">${booking.clientName || 'No especificado'}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b; font-weight: 600;">Email:</td>
            <td style="padding: 4px 0; color: #2563eb;"><a href="mailto:${booking.clientEmail}" style="color: #2563eb; text-decoration: none;">${booking.clientEmail}</a></td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #64748b; font-weight: 600;">Teléfono:</td>
            <td style="padding: 4px 0; color: #1e293b; font-weight: 600;">${booking.clientPhone || 'No especificado'}</td>
          </tr>
          ${booking.clientNotes ? `
            <tr>
              <td style="padding: 4px 0; color: #64748b; font-weight: 600; vertical-align: top;">Notas:</td>
              <td style="padding: 4px 0; color: #475569;">${booking.clientNotes}</td>
            </tr>
          ` : ''}
        </table>
      </div>

      <!-- Datos del Turno -->
      <div style="background-color: #fdf2f8; border: 1px solid #fbcfe8; border-radius: 12px; padding: 16px; margin-bottom: 20px;">
        <h2 style="font-size: 13px; text-transform: uppercase; color: #9d174d; margin: 0 0 10px 0; letter-spacing: 0.5px;">📅 Turno Agendado</h2>
        <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
          <tr>
            <td style="padding: 4px 0; color: #831843; font-weight: 600; width: 90px;">Fecha:</td>
            <td style="padding: 4px 0; color: #1e293b; font-weight: 700; text-transform: capitalize;">${displayDate}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #831843; font-weight: 600;">Horario:</td>
            <td style="padding: 4px 0; color: #1e293b; font-weight: 700;">${displayTime}</td>
          </tr>
          <tr>
            <td style="padding: 4px 0; color: #831843; font-weight: 600;">Duración:</td>
            <td style="padding: 4px 0; color: #475569;">${durationText}</td>
          </tr>
        </table>
      </div>

      <!-- Desglose de Servicios y Adicionales -->
      <div style="margin-bottom: 20px;">
        <h2 style="font-size: 13px; text-transform: uppercase; color: #475569; margin: 0 0 10px 0; letter-spacing: 0.5px;">
          Servicios y Extras Solicitados
        </h2>
        <table style="width: 100%; border-collapse: collapse;">
          <thead>
            <tr style="border-bottom: 1px solid #cbd5e1; color: #64748b; font-size: 12px; text-transform: uppercase;">
              <th style="padding: 6px 8px; text-align: left;">Servicio / Extra</th>
              <th style="padding: 6px 8px; text-align: right;">Monto</th>
            </tr>
          </thead>
          <tbody>
            ${breakdown.servicesBreakdownHtml}
          </tbody>
        </table>
      </div>

      <!-- Resumen de Cobro y Saldo Pendiente en Salón -->
      <div style="border: 1px solid #e2e8f0; border-radius: 12px; overflow: hidden; margin-bottom: 20px;">
        <div style="background-color: #f8fafc; padding: 12px 16px;">
          <table style="width: 100%; border-collapse: collapse; font-size: 13px;">
            <tr>
              <td style="color: #64748b;">Total Presupuestado:</td>
              <td style="text-align: right; font-weight: 600; color: #1e293b;">${formatCurrency(breakdown.totalEstimated)}</td>
            </tr>
            <tr>
              <td style="color: #15803d; font-weight: 600;">Seña Recibida (Mercado Pago):</td>
              <td style="text-align: right; color: #15803d; font-weight: 700;">- ${formatCurrency(breakdown.depositPaid)}</td>
            </tr>
          </table>
        </div>
        <div style="background-color: #ecfdf5; border-top: 1px solid #a7f3d0; padding: 14px 16px;">
          <table style="width: 100%; border-collapse: collapse;">
            <tr>
              <td>
                <div style="font-size: 12px; text-transform: uppercase; font-weight: 700; color: #065f46;">
                  💵 Saldo Pendiente a Cobrar en Salón:
                </div>
              </td>
              <td style="text-align: right;">
                <div style="font-size: 22px; font-weight: 900; color: #065f46;">
                  ${formatCurrency(breakdown.salonBalance)}
                </div>
              </td>
            </tr>
          </table>
        </div>
      </div>

      <!-- Metadatos de Pago -->
      <div style="font-size: 12px; color: #94a3b8; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 12px;">
        ID Pago MP: <code>#${booking.paymentId}</code> &bull; Slot ID: <code>${booking.slotId}</code>
      </div>
    </div>

    <!-- Pie -->
    <div style="background-color: #f1f5f9; padding: 14px; text-align: center; font-size: 12px; color: #64748b;">
      Panel de Control &bull; Turnos Web Maca Nails
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Dispatches booking confirmation emails to both client and owner without throwing blocking errors.
 */
export async function sendBookingConfirmationEmails(
  booking: BookingEmailPayload
): Promise<SendEmailsResult> {
  const result: SendEmailsResult = {
    clientSent: false,
    ownerSent: false,
  };

  if (!isResendConfigured() || !resendClient) {
    console.warn(
      '[Resend] ⚠️ RESEND_API_KEY no está configurada o es inválida en functions/.env. Se omite el envío de correos.'
    );
    return result;
  }

  const cleanClientEmail = booking.clientEmail ? booking.clientEmail.trim() : '';
  const cleanOwnerEmail = (booking.ownerEmail || fallbackOwnerEmail).trim();
  const displayDate = formatBookingDate(booking.datetime, booking.formattedDate);
  const displayTime = formatBookingTime(booking.datetime, booking.formattedTime);

  if (cleanClientEmail && cleanClientEmail.includes('@') && !cleanClientEmail.includes('placeholder')) {
    try {
      console.log(`[Resend] Enviando comprobante al CLIENTE (${cleanClientEmail})...`);
      const { data, error } = await resendClient.emails.send({
        from: resendFromEmail,
        to: [cleanClientEmail],
        subject: `¡Turno Confirmado! Detalle de tu reserva para el ${displayDate} (${displayTime})`,
        html: buildClientEmailHtml(booking),
      });

      if (error) {
        console.error('[Resend] ❌ Error al enviar email al cliente:', error);
        if (error.name === 'validation_error' || (error as unknown as { statusCode?: number }).statusCode === 403) {
          console.warn(
            `[Resend] ⚠️ ATENCIÓN: Resend rechazó el envío a "${cleanClientEmail}" porque estás usando "${resendFromEmail}" (modo pruebas/onboarding). ` +
            `Resend solo permite enviar correos a la casilla registrada en tu cuenta (${cleanOwnerEmail}). ` +
            `Para enviar a clientes reales, debes verificar un dominio propio en resend.com/domains y configurar RESEND_FROM_EMAIL.`
          );
        }
        result.clientError = error.message;
      } else {
        console.log(`[Resend] ✅ Correo al cliente enviado exitosamente. ID: ${data?.id}`);
        result.clientSent = true;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Resend] ❌ Excepción al enviar correo al cliente:', msg);
      result.clientError = msg;
    }
  } else {
    console.warn(`[Resend] Dirección de correo del cliente inválida o ausente: "${cleanClientEmail}"`);
  }

  if (cleanOwnerEmail && cleanOwnerEmail.includes('@')) {
    try {
      console.log(`[Resend] Enviando notificación al NEGOCIO (${cleanOwnerEmail})...`);
      const { data, error } = await resendClient.emails.send({
        from: resendFromEmail,
        to: [cleanOwnerEmail],
        subject: `🔔 Nueva Reserva: ${booking.clientName || 'Cliente'} - ${displayDate} (${displayTime})`,
        html: buildOwnerEmailHtml(booking),
      });

      if (error) {
        console.error('[Resend] ❌ Error al enviar email al negocio:', error);
        result.ownerError = error.message;
      } else {
        console.log(`[Resend] ✅ Correo al negocio enviado exitosamente. ID: ${data?.id}`);
        result.ownerSent = true;
      }
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error('[Resend] ❌ Excepción al enviar correo al negocio:', msg);
      result.ownerError = msg;
    }
  } else {
    console.warn(`[Resend] Dirección de correo del negocio ausente o inválida: "${cleanOwnerEmail}"`);
  }

  return result;
}
