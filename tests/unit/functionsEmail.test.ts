import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  EMAIL_THEME,
  buildAdminPanelUrl,
  buildBookingEmailPayloadFromSlot,
  buildClientEmailHtml,
  buildClientEmailText,
  buildOwnerEmailHtml,
  buildOwnerEmailText,
  buildPaymentIncidentEmailHtml,
  buildPaymentIncidentEmailText,
  buildTenantFromHeader,
  formatCompactEmailDuration,
  formatTimeRange,
  buildWhatsAppLink,
  sendBookingConfirmationEmails,
  sendPaymentIncidentAlertEmail,
  type BookingEmailPayload,
} from '../../functions/src/emailService';
import {
  isSesConfigured,
  resetSesClientForTesting,
  setSesSenderForTesting,
} from '../../functions/src/sesMailer';
import {
  getOwnerProfileCached,
  resetOwnerProfileCache,
  sanitizeEmailLogoUrl,
  normalizeInstagramHandle,
} from '../../functions/src/ownerProfile';

const BASE_BOOKING: BookingEmailPayload = {
  tenantId: 'tnt_linen',
  tenantSlug: 'estudio-linen',
  timezone: 'America/Argentina/Buenos_Aires',
  slotId: 'slot-123',
  paymentId: '99887766',
  serviceName: 'Lifting de Pestañas',
  datetime: '2026-11-22T13:00:00.000Z', // 10:00 America/Argentina/Buenos_Aires
  depositAmount: 5000,
  clientName: 'Ana Pérez',
  clientEmail: 'ana@example.com',
  clientPhone: '+54 9 11 4455-6677',
  clientNotes: 'Primera vez en el estudio',
  bookedServices: [
    {
      name: 'Lifting de Pestañas',
      basePrice: 18000,
      durationMinutes: 60,
      extras: [
        { name: 'Nutrición keratina', price: 6000, selected: true },
        { name: 'No seleccionado', price: 3000, selected: false },
      ],
    },
  ],
  estimatedDurationMinutes: 90,
  estimatedPrice: 24000,
  ownerEmail: 'dueno@estudio.com',
  businessName: 'Estudio Linen',
  businessLocation: 'Palermo, Buenos Aires',
  businessPhone: '5491155551234',
  businessInstagram: '@estudio.linen',
  adminUrl: 'https://turneado.app/',
};

describe('functions/emailService - Identidad visual, multi-tenant, timezone y datos', () => {
  const originalBusinessPhone = process.env.BUSINESS_PHONE;
  const originalOwnerPhone = process.env.OWNER_PHONE;
  const originalFromEmail = process.env.SES_FROM_EMAIL;
  const originalAwsRegion = process.env.AWS_REGION;
  const originalAwsAccessKey = process.env.AWS_ACCESS_KEY_ID;
  const originalAwsSecretKey = process.env.AWS_SECRET_ACCESS_KEY;
  const originalConfigSet = process.env.SES_CONFIGURATION_SET;

  beforeEach(() => {
    delete process.env.BUSINESS_PHONE;
    delete process.env.OWNER_PHONE;
    process.env.SES_FROM_EMAIL = 'Turneado <noreply@turneado.app>';
    process.env.AWS_REGION = 'us-east-1';
    process.env.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLEKEY';
    process.env.AWS_SECRET_ACCESS_KEY = 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY';
    delete process.env.SES_CONFIGURATION_SET;
    resetOwnerProfileCache();
    resetSesClientForTesting();
  });

  afterEach(() => {
    if (originalBusinessPhone !== undefined) {
      process.env.BUSINESS_PHONE = originalBusinessPhone;
    } else {
      delete process.env.BUSINESS_PHONE;
    }
    if (originalOwnerPhone !== undefined) {
      process.env.OWNER_PHONE = originalOwnerPhone;
    } else {
      delete process.env.OWNER_PHONE;
    }
    if (originalFromEmail !== undefined) {
      process.env.SES_FROM_EMAIL = originalFromEmail;
    } else {
      delete process.env.SES_FROM_EMAIL;
    }
    if (originalAwsRegion !== undefined) {
      process.env.AWS_REGION = originalAwsRegion;
    } else {
      delete process.env.AWS_REGION;
    }
    if (originalAwsAccessKey !== undefined) {
      process.env.AWS_ACCESS_KEY_ID = originalAwsAccessKey;
    } else {
      delete process.env.AWS_ACCESS_KEY_ID;
    }
    if (originalAwsSecretKey !== undefined) {
      process.env.AWS_SECRET_ACCESS_KEY = originalAwsSecretKey;
    } else {
      delete process.env.AWS_SECRET_ACCESS_KEY;
    }
    if (originalConfigSet !== undefined) {
      process.env.SES_CONFIGURATION_SET = originalConfigSet;
    } else {
      delete process.env.SES_CONFIGURATION_SET;
    }
    resetOwnerProfileCache();
    resetSesClientForTesting();
  });

  it('formatea duración compacta y rango horario respetando la zona horaria de cada tenant', () => {
    expect(formatCompactEmailDuration(45)).toBe('45 min');
    expect(formatCompactEmailDuration(60)).toBe('1h');
    expect(formatCompactEmailDuration(90)).toBe('1h 30m');
    expect(formatCompactEmailDuration(0, '90 min')).toBe('1h 30m');

    expect(formatTimeRange('2026-11-22T13:00:00.000Z', 90)).toBe('10:00 – 11:30 hs');
    expect(formatTimeRange('2026-11-23T02:30:00.000Z', 90)).toBe('23:30 – 01:00 hs (+1d)');
    expect(formatTimeRange('2026-11-22T13:00:00.000Z', 0)).toBe('10:00 hs');
    // Mexico City (UTC-6 in Nov) -> 13:00Z = 07:00
    expect(
      formatTimeRange('2026-11-22T13:00:00.000Z', 60, undefined, 'America/Mexico_City')
    ).toBe('07:00 – 08:00 hs');
  });

  it('construye remitente dinámico por negocio (ASCII, RFC 2047 UTF-8 y sanitizado) y URL de panel /:tenantSlug/admin', () => {
    expect(buildTenantFromHeader('Estudio Linen')).toBe(
      '"Estudio Linen" <noreply@turneado.app>'
    );
    expect(buildTenantFromHeader('Turneado')).toBe(
      'Turneado <noreply@turneado.app>'
    );
    expect(buildTenantFromHeader('')).toBe('Turneado <noreply@turneado.app>');

    // Nombre con tildes y ñ: codificación RFC 2047 Base64 decodificable exactamente al original
    const utf8Header = buildTenantFromHeader('Estética Sofía Núñez');
    const encodedMatch = utf8Header.match(/^=\?UTF-8\?B\?([A-Za-z0-9+/=]+)\?= <noreply@turneado\.app>$/);
    expect(encodedMatch).not.toBeNull();
    expect(Buffer.from(encodedMatch![1], 'base64').toString('utf8')).toBe('Estética Sofía Núñez');

    // Sanitización de inyección CRLF y ángulos
    const sanitized = buildTenantFromHeader('Estudio\r\nBcc: evil@test.com <hack>');
    expect(sanitized).not.toContain('\r');
    expect(sanitized).not.toContain('\n');
    expect(sanitized).toBe('"Estudio Bcc: evil@test.com hack" <noreply@turneado.app>');

    expect(buildAdminPanelUrl('https://turneado.app/', 'estudio-linen')).toBe(
      'https://turneado.app/estudio-linen/admin'
    );
    expect(
      buildAdminPanelUrl('https://turneado.app/estudio-linen', 'estudio-linen')
    ).toBe('https://turneado.app/estudio-linen/admin');
  });

  it('renderiza marca del tenant y enlace /:tenantSlug/admin con la paleta Warm Linen + Dusty Rose', () => {
    const clientHtml = buildClientEmailHtml(BASE_BOOKING);
    const ownerHtml = buildOwnerEmailHtml(BASE_BOOKING);

    for (const html of [clientHtml, ownerHtml]) {
      expect(html).toContain(EMAIL_THEME.bgBody);
      expect(html).toContain(EMAIL_THEME.primary);
      expect(html).toContain(EMAIL_THEME.warningBg);
      expect(html).toContain(EMAIL_THEME.textPrimary);
      expect(html).toContain('Estudio Linen');
      expect(html).toContain('10:00 – 11:30 hs');
      expect(html).toContain('1h 30m');
      expect(html).toContain('Saldo pendiente');
      expect(html).toContain('$19.000');

      expect(html).not.toContain('#9d174d');
      expect(html).not.toContain('#be185d');
      expect(html).not.toContain('#fef3c7');
      expect(html).not.toContain('font-weight: 900');
      expect(html).not.toContain('border-left: 4px');
      expect(html).not.toContain('Maca Giménez Nails');
      expect(html).not.toContain('No seleccionado');
    }

    expect(clientHtml).toContain('Palermo, Buenos Aires');
    expect(clientHtml).toContain('24 hs de anticipación');
    expect(clientHtml).toContain('Escribir por WhatsApp');
    expect(clientHtml).toContain('https://wa.me/5491155551234');
    expect(clientHtml).toContain('https://instagram.com/estudio.linen');

    // Correo del dueño apunta específicamente a /:tenantSlug/admin
    expect(ownerHtml).toContain('https://wa.me/5491144556677');
    expect(ownerHtml).toContain('Abrir Agenda en el Panel');
    expect(ownerHtml).toContain('https://turneado.app/estudio-linen/admin');
  });

  it('no filtra BUSINESS_PHONE global de entorno a tenants comerciales sin teléfono propio', () => {
    process.env.BUSINESS_PHONE = '+54 9 11 9876-5432';
    const commercialHtml = buildClientEmailHtml({
      ...BASE_BOOKING,
      tenantId: 'tnt_commercial',
      businessPhone: '',
    });
    expect(commercialHtml).not.toContain('5491198765432');

    // Sin tenantId (llamada legacy) mantiene fallback a env
    const legacyHtml = buildClientEmailHtml({
      ...BASE_BOOKING,
      tenantId: undefined,
      businessPhone: '',
    });
    expect(legacyHtml).toContain('https://wa.me/5491198765432');
    expect(buildWhatsAppLink('123')).toBeNull();
  });

  it('resuelve correctamente los 3 estados financieros: pending_balance, paid_in_full y deposit_only', () => {
    const paidInFullHtml = buildClientEmailHtml({
      ...BASE_BOOKING,
      depositAmount: 24000,
      estimatedPrice: 24000,
    });
    expect(paidInFullHtml).toContain('$0 &middot; Saldado');
    expect(paidInFullHtml).toContain(EMAIL_THEME.successBg);
    expect(paidInFullHtml).not.toContain('lo podés abonar en el salón en efectivo o transferencia');

    const depositOnlyHtml = buildClientEmailHtml({
      ...BASE_BOOKING,
      bookedServices: [],
      basePrice: 0,
      estimatedPrice: 0,
      depositAmount: 5000,
    });
    expect(depositOnlyHtml).toContain('Total final a confirmar en el salón');
    expect(depositOnlyHtml).toContain('Seña abonada');
    expect(depositOnlyHtml).not.toContain('Saldo pendiente');
  });

  it('filtra logos SVG o rutas relativas y solo renderiza imágenes raster HTTPS', () => {
    expect(sanitizeEmailLogoUrl('/default/images/logo-fallback.svg')).toBe('');
    expect(sanitizeEmailLogoUrl('https://cdn.example.com/logo.svg')).toBe('');
    expect(sanitizeEmailLogoUrl('http://cdn.example.com/logo.png')).toBe('');
    expect(
      sanitizeEmailLogoUrl(
        'https://firebasestorage.googleapis.com/v0/b/app/o/owner%2Flogo.webp?alt=media&token=123'
      )
    ).toContain('logo.webp');

    const withSvgLogo = buildClientEmailHtml({
      ...BASE_BOOKING,
      businessLogoUrl: 'https://cdn.example.com/brand.svg',
    });
    expect(withSvgLogo).not.toContain('<img');

    const withPngLogo = buildClientEmailHtml({
      ...BASE_BOOKING,
      businessLogoUrl: 'https://cdn.example.com/brand.png',
    });
    expect(withPngLogo).toContain('<img src="https://cdn.example.com/brand.png"');
  });

  it('escapa HTML potencialmente malicioso en todos los campos y genera plain-text limpio', () => {
    const xssBooking: BookingEmailPayload = {
      ...BASE_BOOKING,
      clientName: '<script>alert(1)</script>Ana',
      clientNotes: 'Nota <b>insegura</b>',
      businessName: 'Estudio "A & B"',
      businessLocation: '<img src=x onerror=alert(1)>',
    };

    const html = buildClientEmailHtml(xssBooking);
    expect(html).not.toContain('<script>');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('&lt;script&gt;alert(1)&lt;/script&gt;Ana');
    expect(html).toContain('Estudio &quot;A &amp; B&quot;');

    const clientText = buildClientEmailText(BASE_BOOKING);
    const ownerText = buildOwnerEmailText(BASE_BOOKING);
    expect(clientText).toContain('10:00 – 11:30 hs');
    expect(clientText).toContain('Saldo pendiente en el salón: $19.000');
    expect(clientText).toContain('https://wa.me/5491155551234');
    expect(clientText).not.toContain('<div');

    expect(ownerText).toContain('Ana Pérez');
    expect(ownerText).toContain('Saldo pendiente a cobrar en salón: $19.000');
    expect(ownerText).toContain('https://turneado.app/estudio-linen/admin');
  });

  it('construye correo de incidente con paleta vino, contacto del cliente y enlace /:tenantSlug/admin', () => {
    const incidentHtml = buildPaymentIncidentEmailHtml({
      tenantId: 'tnt_linen',
      tenantSlug: 'estudio-linen',
      kind: 'double_payment_incident',
      slotId: 'slot-99',
      paymentId: '777',
      paidAmount: 5000,
      datetime: '2026-11-22T13:00:00.000Z',
      incomingClientName: 'Laura Gómez',
      incomingClientEmail: 'laura@example.com',
      incomingClientPhone: '5491133332222',
      existingPaymentId: '555',
      existingClientName: 'Ana Pérez',
      ownerEmail: 'dueno@estudio.com',
      businessName: 'Estudio Linen',
      adminUrl: 'https://turneado.app',
    });

    expect(incidentHtml).toContain(EMAIL_THEME.danger);
    expect(incidentHtml).toContain(EMAIL_THEME.dangerBg);
    expect(incidentHtml).toContain('mailto:laura@example.com');
    expect(incidentHtml).toContain('https://wa.me/5491133332222');
    expect(incidentHtml).toContain('https://turneado.app/estudio-linen/admin');

    const incidentText = buildPaymentIncidentEmailText({
      tenantId: 'tnt_linen',
      tenantSlug: 'estudio-linen',
      kind: 'late_payment_conflict',
      slotId: 'slot-99',
      paymentId: '778',
      paidAmount: 5000,
      datetime: '2026-11-22T13:00:00.000Z',
      incomingClientName: 'Laura Gómez',
      incomingClientEmail: 'laura@example.com',
      ownerEmail: 'dueno@estudio.com',
    });
    expect(incidentText).toContain('PAGO TARDÍO CON CONFLICTO');
    expect(incidentText).toContain('#778');
  });

  it('prioriza datos de Firestore por tenant en getOwnerProfileCached y solo usa env fallback en isDemo', async () => {
    expect(normalizeInstagramHandle('https://instagram.com/estudio.linen/')).toBe('@estudio.linen');
    expect(normalizeInstagramHandle('estudio.linen')).toBe('@estudio.linen');

    const docs: Record<string, Record<string, unknown>> = {
      'tenants/tnt_alpha': { name: 'Estudio Alpha', isDemo: false },
      'tenants/tnt_alpha/ownerinfo/profile': {
        businessName: 'Estudio Firestore',
        name: 'Maca',
        email: 'maca@estudio.com',
        phone: '+54 9 11 0000-0000',
        location: 'Recoleta, CABA',
        instagram: 'https://instagram.com/estudio.fs/',
        logoUrl: '/default/images/logo-fallback.svg',
        appearance: {
          palettePreset: 'sage-botanical',
          customPrimaryHex: '#436852',
          fontPairing: 'modern',
        },
      },
      'tenants/tnt_demo': { name: 'Estudio Demo', isDemo: true },
      'tenants/tnt_demo/ownerinfo/profile': {
        businessName: 'Estudio Demo',
        email: '',
        phone: '',
      },
    };

    const fakeDb = {
      collection: (root: string) => ({
        doc: (tenantId: string) => ({
          get: async () => {
            const d = docs[`${root}/${tenantId}`];
            return { exists: Boolean(d), data: () => d };
          },
          collection: (sub: string) => ({
            doc: (docId: string) => ({
              get: async () => {
                const d = docs[`${root}/${tenantId}/${sub}/${docId}`];
                return { exists: Boolean(d), data: () => d };
              },
            }),
          }),
        }),
      }),
    } as unknown as Parameters<typeof getOwnerProfileCached>[0];

    process.env.BUSINESS_PHONE = '5491199998888';
    const commercialProfile = await getOwnerProfileCached(fakeDb, 'tnt_alpha', 1000);
    expect(commercialProfile.ownerPhone).toBe('+54 9 11 0000-0000');
    expect(commercialProfile.ownerLocation).toBe('Recoleta, CABA');
    expect(commercialProfile.ownerInstagram).toBe('@estudio.fs');
    expect(commercialProfile.logoUrl).toBe('');
    expect(commercialProfile.appearance?.palettePreset).toBe('sage-botanical');
    expect(commercialProfile.appearance?.fontPairing).toBe('modern');

    const demoProfile = await getOwnerProfileCached(fakeDb, 'tnt_demo', 1000);
    expect(demoProfile.ownerPhone).toBe('5491199998888');
    expect(demoProfile.appearance).toBeNull();
  });

  it('sincroniza los colores y tipografía del tenant en los correos HTML y protege contra valores maliciosos', () => {
    const botanicalBooking: BookingEmailPayload = {
      ...BASE_BOOKING,
      appearance: {
        palettePreset: 'sage-botanical',
        fontPairing: 'modern',
      },
    };

    const clientHtml = buildClientEmailHtml(botanicalBooking);
    const ownerHtml = buildOwnerEmailHtml(botanicalBooking);

    expect(clientHtml).toContain('#436852');
    expect(clientHtml).not.toContain(EMAIL_THEME.primary);
    expect(clientHtml).not.toContain("Georgia, 'Times New Roman', serif");
    expect(ownerHtml).toContain('#436852');

    // Color extremo (#ffff00) debe calibrarse a un tono legible y sin inyección CSS
    const hostileHtml = buildClientEmailHtml({
      ...BASE_BOOKING,
      appearance: {
        palettePreset: 'ocean-slate',
        customPrimaryHex: 'red; background:url(javascript:alert(1))',
      },
    });
    expect(hostileHtml).not.toContain('javascript:');
    expect(hostileHtml).toContain('#335f78');
  });

  it('refleja shapePreset (sharp/pill), buttonStyle (soft/outline) y customBackgroundHex en el HTML de los correos', () => {
    const sharpOutlineHtml = buildClientEmailHtml({
      ...BASE_BOOKING,
      appearance: {
        palettePreset: 'ocean-slate',
        shapePreset: 'sharp',
        buttonStyle: 'outline',
        customBackgroundHex: '#e8f4ff',
      },
    });
    expect(sharpOutlineHtml).toContain('border-radius: 4px');
    expect(sharpOutlineHtml).toContain('border-radius: 3px');
    expect(sharpOutlineHtml).toContain('background-color: #ffffff; color: #335f78; border: 1.5px solid #335f78');
    expect(sharpOutlineHtml).toContain('#e8f4ff');

    const pillSoftOwnerHtml = buildOwnerEmailHtml({
      ...BASE_BOOKING,
      appearance: {
        palettePreset: 'sage-botanical',
        shapePreset: 'pill',
        buttonStyle: 'soft',
      },
    });
    expect(pillSoftOwnerHtml).toContain('border-radius: 18px');
    expect(pillSoftOwnerHtml).toContain('border-radius: 9999px');
  });

  it('envía correos de confirmación en paralelo vía Amazon SES con ReplyToAddresses, Charset UTF-8 y ConfigurationSetName', async () => {
    process.env.SES_CONFIGURATION_SET = 'turneado-transactional';
    const sentInputs: Array<Record<string, unknown>> = [];

    setSesSenderForTesting(async (command) => {
      sentInputs.push(command.input as unknown as Record<string, unknown>);
      const to = command.input.Destination?.ToAddresses?.[0] || '';
      return {
        $metadata: { httpStatusCode: 200 },
        MessageId: to === BASE_BOOKING.clientEmail ? 'ses-msg-client-1' : 'ses-msg-owner-1',
      };
    });

    const result = await sendBookingConfirmationEmails({
      ...BASE_BOOKING,
      businessName: 'Estética Sofía Núñez',
    });

    expect(result.clientSent).toBe(true);
    expect(result.ownerSent).toBe(true);
    expect(result.clientAttempted).toBe(true);
    expect(result.ownerAttempted).toBe(true);
    expect(result.clientMessageId).toBe('ses-msg-client-1');
    expect(result.ownerMessageId).toBe('ses-msg-owner-1');
    expect(sentInputs).toHaveLength(2);

    const clientCmd = sentInputs.find(
      (i) => (i.Destination as { ToAddresses: string[] }).ToAddresses[0] === BASE_BOOKING.clientEmail
    )!;
    const ownerCmd = sentInputs.find(
      (i) => (i.Destination as { ToAddresses: string[] }).ToAddresses[0] === BASE_BOOKING.ownerEmail
    )!;

    expect(clientCmd.ReplyToAddresses).toEqual([BASE_BOOKING.ownerEmail]);
    expect(ownerCmd.ReplyToAddresses).toEqual([BASE_BOOKING.clientEmail]);
    expect(clientCmd.ConfigurationSetName).toBe('turneado-transactional');
    expect(String(clientCmd.FromEmailAddress)).toMatch(/^=\?UTF-8\?B\?.+\?= <noreply@turneado\.app>$/);

    const content = clientCmd.Content as {
      Simple: {
        Subject: { Charset: string };
        Body: { Html: { Charset: string }; Text: { Charset: string } };
      };
    };
    expect(content.Simple.Subject.Charset).toBe('UTF-8');
    expect(content.Simple.Body.Html.Charset).toBe('UTF-8');
    expect(content.Simple.Body.Text.Charset).toBe('UTF-8');
  });

  it('omite el envío de forma controlada sin lanzar excepción si faltan credenciales o SES_FROM_EMAIL es inválido', async () => {
    delete process.env.AWS_ACCESS_KEY_ID;
    expect(isSesConfigured()).toBe(false);

    const missingCredsResult = await sendBookingConfirmationEmails(BASE_BOOKING);
    expect(missingCredsResult.clientSent).toBe(false);
    expect(missingCredsResult.ownerSent).toBe(false);
    expect(missingCredsResult.clientAttempted).toBe(false);
    expect(missingCredsResult.clientError).toBeTruthy();

    process.env.AWS_ACCESS_KEY_ID = 'AKIAIOSFODNN7EXAMPLEKEY';
    process.env.SES_FROM_EMAIL = 'sin-arroba.app';
    expect(isSesConfigured()).toBe(false);

    const invalidFromResult = await sendBookingConfirmationEmails(BASE_BOOKING);
    expect(invalidFromResult.clientSent).toBe(false);
    expect(invalidFromResult.ownerSent).toBe(false);
  });

  it('maneja rechazo parcial MessageRejected de AWS SES sin interrumpir el correo restante', async () => {
    setSesSenderForTesting(async (command) => {
      const to = command.input.Destination?.ToAddresses?.[0];
      if (to === BASE_BOOKING.clientEmail) {
        const err = new Error('Email address is not verified.');
        err.name = 'MessageRejected';
        throw err;
      }
      return {
        $metadata: { httpStatusCode: 200 },
        MessageId: 'ses-msg-owner-ok',
      };
    });

    const result = await sendBookingConfirmationEmails(BASE_BOOKING);
    expect(result.clientSent).toBe(false);
    expect(result.ownerSent).toBe(true);
    expect(result.ownerMessageId).toBe('ses-msg-owner-ok');
    expect(result.clientError).toContain('Amazon SES rechazó el mensaje');
  });

  it('despacha alerta de incidente de pago con éxito y maneja rechazo controlado', async () => {
    const incidentPayload = {
      tenantId: 'tnt_linen',
      tenantSlug: 'estudio-linen',
      kind: 'double_payment_incident' as const,
      slotId: 'slot-99',
      paymentId: '777',
      paidAmount: 5000,
      datetime: '2026-11-22T13:00:00.000Z',
      incomingClientName: 'Laura Gómez',
      incomingClientEmail: 'laura@example.com',
      ownerEmail: 'dueno@estudio.com',
      businessName: 'Estudio Linen',
    };

    setSesSenderForTesting(async (command) => {
      expect(command.input.Destination?.ToAddresses).toEqual(['dueno@estudio.com']);
      expect(command.input.ReplyToAddresses).toEqual(['laura@example.com']);
      return { $metadata: { httpStatusCode: 200 }, MessageId: 'ses-incident-1' };
    });
    expect(await sendPaymentIncidentAlertEmail(incidentPayload)).toBe(true);

    setSesSenderForTesting(async () => {
      const err = new Error('Account sending is paused');
      err.name = 'AccountSendingPausedException';
      throw err;
    });
    expect(await sendPaymentIncidentAlertEmail(incidentPayload)).toBe(false);
  });

  it('renderiza recargo fijo y porcentual en HTML y texto plano de cliente y dueño y en buildBookingEmailPayloadFromSlot', () => {
    const fixedSurchargeBooking: BookingEmailPayload = {
      ...BASE_BOOKING,
      surchargeType: 'fixed',
      surchargeValue: 3000,
      surchargeAmount: 3000,
      surchargeReason: 'Feriado',
      estimatedPrice: 27000,
    };

    const clientFixedHtml = buildClientEmailHtml(fixedSurchargeBooking);
    const ownerFixedHtml = buildOwnerEmailHtml(fixedSurchargeBooking);
    const clientFixedText = buildClientEmailText(fixedSurchargeBooking);
    const ownerFixedText = buildOwnerEmailText(fixedSurchargeBooking);

    for (const html of [clientFixedHtml, ownerFixedHtml]) {
      expect(html).toContain('Tarifa especial');
      expect(html).toContain('Recargo · Feriado');
      expect(html).toContain('+$3.000');
      expect(html).toContain('$27.000');
      expect(html).toContain('$22.000');
    }
    expect(clientFixedText).toContain('Recargo (Feriado): +$3.000');
    expect(ownerFixedText).toContain('Tarifa especial: +$3.000 (Feriado)');

    const pctBooking: BookingEmailPayload = {
      ...BASE_BOOKING,
      surchargeType: 'percentage',
      surchargeValue: 20,
      surchargeAmount: 4800,
      surchargeReason: 'Horario nocturno',
      estimatedPrice: 28800,
    };

    const clientPctHtml = buildClientEmailHtml(pctBooking);
    const clientPctText = buildClientEmailText(pctBooking);
    expect(clientPctHtml).toContain('Recargo · Horario nocturno');
    expect(clientPctHtml).toContain('+20% sobre servicios y extras');
    expect(clientPctHtml).toContain('+$4.800');
    expect(clientPctText).toContain('Recargo (Horario nocturno · +20%): +$4.800');

    const payloadFromSlot = buildBookingEmailPayloadFromSlot({
      tenantId: 'tnt_linen',
      tenantSlug: 'estudio-linen',
      timezone: 'America/Argentina/Buenos_Aires',
      slotId: 'slot-123',
      paymentId: '99887766',
      slotData: {
        datetime: '2026-11-22T13:00:00.000Z',
        serviceName: 'Lifting',
        surcharge: { type: 'percentage', value: 20, reason: 'Feriado' },
      },
      clientData: {
        name: 'Ana',
        email: 'ana@example.com',
        basePrice: 20000,
        extrasPrice: 3000,
      },
      paidAmount: 5000,
      ownerProfile: { ownerEmail: 'dueno@estudio.com', businessName: 'Estudio Linen' },
    });

    expect(payloadFromSlot.surchargeType).toBe('percentage');
    expect(payloadFromSlot.surchargeValue).toBe(20);
    expect(payloadFromSlot.surchargeAmount).toBe(4600);
    expect(payloadFromSlot.surchargeReason).toBe('Feriado');
  });
});
