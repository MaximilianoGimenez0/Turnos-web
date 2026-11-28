export const DEFAULT_DEMO_TENANT_ID = 'tnt_demo';
export const DEFAULT_DEMO_SLUG = 'demo';
export const DEFAULT_DEMO_NAME = 'Atelier Bruma';
export const DEFAULT_TIMEZONE = 'America/Argentina/Buenos_Aires';

const pad2 = (n) => String(n).padStart(2, '0');

const formatDurationLabel = (minutes) => {
  if (!minutes || minutes <= 0) return '30 min';
  if (minutes < 60) return `${minutes} min`;
  const h = Math.floor(minutes / 60);
  const rem = minutes % 60;
  return rem > 0 ? `${h}h ${rem}m (${minutes} min)` : `${h}h (${minutes} min)`;
};

const formatDateKeyInTimeZone = (date, timeZone) => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(date);

  const year = parts.find((p) => p.type === 'year')?.value;
  const month = parts.find((p) => p.type === 'month')?.value;
  const day = parts.find((p) => p.type === 'day')?.value;
  return `${year}-${month}-${day}`;
};

const addDaysToDateKey = (dateKey, deltaDays) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  const ref = new Date(Date.UTC(y, m - 1, d + deltaDays, 12, 0, 0));
  return `${ref.getUTCFullYear()}-${pad2(ref.getUTCMonth() + 1)}-${pad2(ref.getUTCDate())}`;
};

const getWeekdayFromDateKey = (dateKey) => {
  const [y, m, d] = dateKey.split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d, 12, 0, 0)).getUTCDay(); // 0=Sun..6=Sat
};

const buildIsoInTimeZone = (dateKey, hour, minute, timeZone) => {
  const [year, month, day] = dateKey.split('-').map(Number);
  const utcGuessMs = Date.UTC(year, month - 1, day, hour, minute, 0, 0);
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(utcGuessMs));

  const tzYear = Number(parts.find((p) => p.type === 'year')?.value);
  const tzMonth = Number(parts.find((p) => p.type === 'month')?.value);
  const tzDay = Number(parts.find((p) => p.type === 'day')?.value);
  const tzHour = Number(parts.find((p) => p.type === 'hour')?.value) % 24;
  const tzMinute = Number(parts.find((p) => p.type === 'minute')?.value);
  const tzSecond = Number(parts.find((p) => p.type === 'second')?.value);

  const representedAsUtcMs = Date.UTC(tzYear, tzMonth - 1, tzDay, tzHour, tzMinute, tzSecond, 0);
  const offsetMs = representedAsUtcMs - utcGuessMs;
  return new Date(utcGuessMs - offsetMs).toISOString();
};

const computeEndIso = (startIso, durationMinutes) =>
  new Date(new Date(startIso).getTime() + durationMinutes * 60 * 1000).toISOString();

const resolveSurchargeAmount = (surcharge, subtotal) => {
  if (!surcharge || subtotal <= 0) return 0;
  if (surcharge.type === 'percentage') {
    return Math.round((subtotal * surcharge.value) / 100);
  }
  return Math.max(0, Math.round(surcharge.value));
};

const buildServicesCatalog = (nowIso) => [
  {
    id: 'srv_demo_1',
    name: 'Diagnóstico & Consulta Inicial',
    basePrice: 14000,
    durationMinutes: 30,
    description:
      'Evaluación personalizada de 30 minutos para definir objetivos, rutina recomendada y plan de sesiones.',
    extras: [
      { id: 'ext_demo_1a', name: 'Plan escrito personalizado', price: 3500 },
      { id: 'ext_demo_1b', name: 'Guía digital de cuidado', price: 2500 },
    ],
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: 'srv_demo_2',
    name: 'Sesión Clásica de Bienestar',
    basePrice: 26000,
    durationMinutes: 60,
    description:
      'Atención integral de 60 minutos en cabina privada con técnicas de relajación y cuidado corporal.',
    extras: [
      { id: 'ext_demo_2a', name: 'Aromaterapia botánica', price: 4000 },
      { id: 'ext_demo_2b', name: 'Extensión de 15 minutos', price: 5500 },
    ],
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: 'srv_demo_3',
    name: 'Tratamiento Facial Revitalizante',
    basePrice: 32000,
    durationMinutes: 60,
    description:
      'Limpieza profunda, hidratación intensiva y masaje facial tonificante para piel luminosa.',
    extras: [
      { id: 'ext_demo_3a', name: 'Máscara hidrocalmante', price: 6000 },
      { id: 'ext_demo_3b', name: 'Drenaje linfático facial', price: 5000 },
    ],
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: 'srv_demo_4',
    name: 'Diseño & Perfilado Express',
    basePrice: 16500,
    durationMinutes: 30,
    description:
      'Perfilado de precisión adaptado a la armonía de tu rostro con terminación prolija y natural.',
    extras: [
      { id: 'ext_demo_4a', name: 'Nutrición con keratina', price: 4500 },
      { id: 'ext_demo_4b', name: 'Tinte suave natural', price: 4000 },
    ],
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: 'srv_demo_5',
    name: 'Masaje Descontracturante Profundo',
    basePrice: 29000,
    durationMinutes: 60,
    description:
      'Trabajo focalizado en espalda, cervicales y hombros para liberar tensión acumulada.',
    extras: [
      { id: 'ext_demo_5a', name: 'Piedras calientes', price: 6500 },
      { id: 'ext_demo_5b', name: 'Aceite esencial tibio', price: 3500 },
    ],
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: 'srv_demo_6',
    name: 'Ritual Integral de Renovación',
    basePrice: 44000,
    durationMinutes: 90,
    description:
      'Experiencia extendida de 90 minutos que combina tratamiento facial, masaje corporal y pausa aromática.',
    extras: [
      { id: 'ext_demo_6a', name: 'Infusión artesanal de cierre', price: 3000 },
      { id: 'ext_demo_6b', name: 'Kit de cuidado en casa', price: 8500 },
    ],
    createdAt: nowIso,
    updatedAt: nowIso,
  },
  {
    id: 'srv_demo_7',
    name: 'Control & Mantenimiento',
    basePrice: 21000,
    durationMinutes: 45,
    description:
      'Sesión de seguimiento de 45 minutos para mantener resultados y ajustar el plan según tu evolución.',
    extras: [
      { id: 'ext_demo_7a', name: 'Retoque focal', price: 4500 },
      { id: 'ext_demo_7b', name: 'Seguimiento por WhatsApp', price: 2500 },
    ],
    createdAt: nowIso,
    updatedAt: nowIso,
  },
];

const DEMO_CLIENTS = [
  { name: 'Camila Morales', email: 'camila.morales@ejemplo.demo', phone: '+54 9 11 5120-3341' },
  { name: 'Tomás Herrera', email: 'tomas.herrera@ejemplo.demo', phone: '+54 9 11 6245-1890' },
  { name: 'Lucía Benítez', email: 'lucia.benitez@ejemplo.demo', phone: '+54 9 11 4981-7723' },
  { name: 'Julián Pereyra', email: 'julian.pereyra@ejemplo.demo', phone: '+54 9 11 5832-0944' },
  { name: 'Sofía Roldán', email: 'sofia.roldan@ejemplo.demo', phone: '+54 9 11 6710-4452' },
  { name: 'Mateo Quiroga', email: 'mateo.quiroga@ejemplo.demo', phone: '+54 9 11 3349-8821' },
  { name: 'Florencia Paz', email: 'florencia.paz@ejemplo.demo', phone: '+54 9 11 5402-6619' },
  { name: 'Nicolás Vega', email: 'nicolas.vega@ejemplo.demo', phone: '+54 9 11 6118-2305' },
  { name: 'Martina Silva', email: 'martina.silva@ejemplo.demo', phone: '+54 9 11 4773-9182' },
  { name: 'Bautista Castro', email: 'bautista.castro@ejemplo.demo', phone: '+54 9 11 5994-1276' },
  { name: 'Renata Díaz', email: 'renata.diaz@ejemplo.demo', phone: '+54 9 11 6380-5504' },
  { name: 'Ezequiel Molina', email: 'ezequiel.molina@ejemplo.demo', phone: '+54 9 11 4195-8033' },
  { name: 'Micaela Suárez', email: 'micaela.suarez@ejemplo.demo', phone: '+54 9 11 5261-4908' },
  { name: 'Santiago Luna', email: 'santiago.luna@ejemplo.demo', phone: '+54 9 11 6824-3197' },
];

// 8 non-overlapping slots per day across morning, midday, afternoon & evening
const DAILY_SCHEDULE_TIMES = [
  { hour: 9, minute: 0, maxMinutes: 60 },
  { hour: 10, minute: 0, maxMinutes: 90 },
  { hour: 11, minute: 30, maxMinutes: 90 },
  { hour: 13, minute: 0, maxMinutes: 90 },
  { hour: 14, minute: 30, maxMinutes: 90 },
  { hour: 16, minute: 0, maxMinutes: 90 },
  { hour: 17, minute: 30, maxMinutes: 90 },
  { hour: 19, minute: 0, maxMinutes: 90 },
];

const getSlotSurchargeForDate = (dateKey, hour) => {
  const wd = getWeekdayFromDateKey(dateKey);
  if (wd === 0 || wd === 6) {
    return { type: 'percentage', value: 15, reason: 'Fin de semana' };
  }
  if (hour >= 19) {
    return { type: 'fixed', value: 3000, reason: 'Horario extendido' };
  }
  return null;
};

const buildClientBookingPayload = ({
  client,
  selectedServices,
  selectedExtraIndexes = {},
  surcharge = null,
  notes = '',
}) => {
  let basePrice = 0;
  let extrasPrice = 0;
  let estimatedDurationMinutes = 0;
  const selectedExtras = [];

  const bookedServices = selectedServices.map((srv, srvIdx) => {
    basePrice += srv.basePrice;
    estimatedDurationMinutes += srv.durationMinutes;
    const chosenIndices = new Set(selectedExtraIndexes[srvIdx] || []);
    const extras = (srv.extras || []).map((ex, exIdx) => {
      const selected = chosenIndices.has(exIdx);
      if (selected) {
        extrasPrice += ex.price;
        selectedExtras.push({ id: ex.id, name: ex.name, price: ex.price });
      }
      return { id: ex.id, name: ex.name, price: ex.price, selected };
    });

    return {
      serviceId: srv.id,
      name: srv.name,
      basePrice: srv.basePrice,
      durationMinutes: srv.durationMinutes,
      extras,
    };
  });

  const subtotal = basePrice + extrasPrice;
  const surchargeAmount = resolveSurchargeAmount(surcharge, subtotal);
  const estimatedPrice = subtotal + surchargeAmount;
  const serviceNames = selectedServices.map((s) => s.name);

  return {
    name: client.name,
    email: client.email,
    phone: client.phone,
    ...(notes ? { notes } : {}),
    bookedServices,
    selectedRules: serviceNames,
    selectedServices: serviceNames,
    selectedService: serviceNames.join(' + '),
    basePrice,
    selectedExtras,
    extrasPrice,
    estimatedDurationMinutes,
    estimatedDuration: formatDurationLabel(estimatedDurationMinutes),
    estimatedPrice,
    ...(surcharge
      ? {
          surchargeType: surcharge.type,
          surchargeValue: surcharge.value,
          surchargeAmount,
          surchargeReason: surcharge.reason,
        }
      : {}),
  };
};

export const buildDemoSeedData = ({
  ownerUid = '',
  ownerEmail = '',
  demoSlug = DEFAULT_DEMO_SLUG,
  demoName = DEFAULT_DEMO_NAME,
  timezone = DEFAULT_TIMEZONE,
  now = new Date(),
} = {}) => {
  const tenantId = DEFAULT_DEMO_TENANT_ID;
  const nowIso = now.toISOString();
  const effectiveEmail = ownerEmail || 'hola@atelierbruma.demo';

  const ownerProfile = {
    name: 'Valentina Ferreyra',
    businessName: demoName,
    role: 'Estudio de Bienestar & Cuidado Personal',
    description:
      'Atención personalizada en cabina privada con reserva online, confirmación inmediata y recordatorios claros. Elegí tu servicio, sumá adicionales y asegurá tu horario en minutos.',
    pictureUrl: '/default/images/portrait-fallback.jpg',
    heroImageUrl: '/default/images/hero-fallback.jpg',
    logoUrl: '/favicon.svg',
    instagram: '@atelierbruma.ba',
    phone: '+54 9 11 5432-8910',
    email: effectiveEmail,
    location: 'Palermo Soho, Buenos Aires, Argentina',
    updatedAt: nowIso,
  };

  const tenantDoc = {
    id: tenantId,
    slug: demoSlug,
    previousSlugs: [],
    name: demoName,
    status: 'active',
    isDemo: true,
    mpConfigured: true,
    timezone,
    currency: 'ARS',
    createdAt: nowIso,
    updatedAt: nowIso,
    createdByUid: ownerUid,
  };

  const memberDoc = {
    uid: ownerUid,
    email: effectiveEmail,
    displayName: 'Valentina Ferreyra',
    role: 'owner',
    active: true,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const services = buildServicesCatalog(nowIso);
  const publicServices = services.map(({ id, name, basePrice, durationMinutes, extras }) => ({
    id,
    name,
    basePrice,
    durationMinutes,
    ...(extras.length > 0 ? { extras } : {}),
  }));

  const slots = [];
  const availabilitySlots = {};
  let slotSeq = 1;
  let mpPaymentSeq = 884201;

  const pushSlot = ({
    dateKey,
    hour,
    minute,
    status,
    pastOutcome = null,
    channel = null, // 'online' | 'manual'
    client = null,
    serviceIndices = null,
    extraMap = {},
    notes = '',
    depositAmount = 6000,
    surchargeOverride = undefined,
  }) => {
    const slotId = `slot_demo_${String(slotSeq).padStart(3, '0')}`;
    slotSeq += 1;

    const datetimeIso = buildIsoInTimeZone(dateKey, hour, minute, timezone);
    const surcharge =
      surchargeOverride !== undefined ? surchargeOverride : getSlotSurchargeForDate(dateKey, hour);

    if (status === 'available') {
      const slotDoc = {
        datetime: datetimeIso,
        status: 'available',
        depositAmount,
        serviceName: 'Turno disponible',
        services: publicServices,
        estimatedDurationMinutes: 30,
        estimatedDuration: '30 min',
        ...(surcharge ? { surcharge } : {}),
        expiresAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };
      slots.push({ id: slotId, data: slotDoc });
      availabilitySlots[slotId] = {
        datetime: datetimeIso,
        status: 'available',
        depositAmount,
        serviceName: 'Turno disponible',
        services: publicServices,
        estimatedDurationMinutes: 30,
        estimatedDuration: '30 min',
        ...(surcharge ? { surcharge } : {}),
        expiresAt: null,
        updatedAt: nowIso,
      };
      return;
    }

    const chosenServices = (serviceIndices || [1]).map((idx) => services[idx]);
    const clientData = buildClientBookingPayload({
      client: client || DEMO_CLIENTS[0],
      selectedServices: chosenServices,
      selectedExtraIndexes: extraMap,
      surcharge,
      notes,
    });
    const endDatetime = computeEndIso(datetimeIso, clientData.estimatedDurationMinutes);
    const isOnline = channel === 'online';
    const paymentId = isOnline ? `mp_demo_${mpPaymentSeq++}` : null;
    const paidAmount = isOnline ? depositAmount : null;
    const paymentStatus = isOnline ? 'approved' : 'manual_admin';

    const slotDoc = {
      datetime: datetimeIso,
      endDatetime,
      status,
      ...(pastOutcome ? { pastOutcome } : {}),
      depositAmount,
      serviceName: clientData.selectedService,
      services: publicServices,
      previousDurationMinutes: 30,
      previousDuration: '30 min',
      estimatedDurationMinutes: clientData.estimatedDurationMinutes,
      estimatedDuration: clientData.estimatedDuration,
      ...(surcharge ? { surcharge } : {}),
      clientData,
      confirmedAt: nowIso,
      paymentStatus,
      ...(paymentId ? { paymentId } : {}),
      ...(paidAmount !== null ? { paidAmount } : {}),
      expiresAt: null,
      createdAt: nowIso,
      updatedAt: nowIso,
    };

    slots.push({ id: slotId, data: slotDoc });

    // Strict PII-free projection for public_meta/availability (only confirmed, never past/cancelled)
    if (status === 'confirmed') {
      availabilitySlots[slotId] = {
        datetime: datetimeIso,
        endDatetime,
        status: 'confirmed',
        estimatedDurationMinutes: clientData.estimatedDurationMinutes,
        updatedAt: nowIso,
      };
    }
  };

  const todayKey = formatDateKeyInTimeZone(now, timezone);

  // =========================================================================
  // 1. Active 7-day window starting TODAY (8 slots/day = 56 slots total)
  //    - Day 0 (Today): 5 manual_admin confirmed + 3 available
  //    - Day +1 (Tomorrow): 5 Mercado Pago approved + 3 available
  //    - Days +2..+6: mix of available, confirmed (MP & manual), and cancelled
  // =========================================================================
  const weekPlans = {
    // Day 0: 5 manual confirmed (back-to-back blocks + free gaps) + 3 available
    0: {
      0: {
        status: 'confirmed',
        channel: 'manual',
        client: DEMO_CLIENTS[0],
        serviceIndices: [1], // 60m -> 09:00-10:00 (back-to-back with 10:00)
        extraMap: { 0: [0] },
        notes: 'Pidió turno por WhatsApp. Prefiere música suave.',
      },
      1: {
        status: 'confirmed',
        channel: 'manual',
        client: DEMO_CLIENTS[1],
        serviceIndices: [4], // 60m -> 10:00-11:00 (30m free gap to 11:30)
        extraMap: { 0: [1] },
        notes: 'Contractura cervical, foco en hombros.',
      },
      2: {
        status: 'confirmed',
        channel: 'manual',
        client: DEMO_CLIENTS[2],
        serviceIndices: [5], // 90m -> 11:30-13:00 (back-to-back with 13:00)
        extraMap: { 0: [0] },
        notes: 'Clienta frecuente, abona saldo por transferencia.',
      },
      3: {
        status: 'confirmed',
        channel: 'manual',
        client: DEMO_CLIENTS[3],
        serviceIndices: [6], // 45m -> 13:00-13:45 (free gap before 16:00)
        extraMap: { 0: [0] },
        notes: 'Control mensual agendado en recepción.',
      },
      5: {
        status: 'confirmed',
        channel: 'manual',
        client: DEMO_CLIENTS[4],
        serviceIndices: [2], // 60m -> 16:00-17:00
        extraMap: { 0: [0, 1] },
        notes: 'Viene recomendada por Lucía.',
      },
    },
    // Day +1: 5 Mercado Pago confirmed (back-to-back + free gaps) + 3 available
    1: {
      0: {
        status: 'confirmed',
        channel: 'online',
        client: DEMO_CLIENTS[5],
        serviceIndices: [2], // 60m -> 09:00-10:00 (back-to-back)
        extraMap: { 0: [0] },
        depositAmount: 6000,
        notes: 'Primera visita al estudio.',
      },
      1: {
        status: 'confirmed',
        channel: 'online',
        client: DEMO_CLIENTS[6],
        serviceIndices: [1], // 60m -> 10:00-11:00
        extraMap: { 0: [0, 1] },
        depositAmount: 6000,
      },
      3: {
        status: 'confirmed',
        channel: 'online',
        client: DEMO_CLIENTS[0], // Returning client (Camila)
        serviceIndices: [5], // 90m -> 13:00-14:30 (back-to-back)
        extraMap: { 0: [1] },
        depositAmount: 8000,
        notes: 'Lleva el kit de cuidado al finalizar.',
      },
      4: {
        status: 'confirmed',
        channel: 'online',
        client: DEMO_CLIENTS[7],
        serviceIndices: [4], // 60m -> 14:30-15:30
        extraMap: { 0: [0] },
        depositAmount: 6000,
      },
      7: {
        status: 'confirmed',
        channel: 'online',
        client: DEMO_CLIENTS[8],
        serviceIndices: [2, 3], // 60m + 30m = 90m -> 19:00-20:30 (horario extendido)
        extraMap: { 1: [0] },
        depositAmount: 8000,
        notes: 'Sale de la oficina a las 18:45.',
      },
    },
    // Day +2: 2 confirmed (1 MP + 1 manual), 1 cancelled, 5 available
    2: {
      1: {
        status: 'confirmed',
        channel: 'online',
        client: DEMO_CLIENTS[9],
        serviceIndices: [0, 3], // 60m
        extraMap: { 0: [0] },
        depositAmount: 6000,
      },
      4: {
        status: 'cancelled',
        channel: 'online',
        client: DEMO_CLIENTS[10],
        serviceIndices: [1],
        depositAmount: 6000,
        notes: 'Solicitó reprogramación para la semana próxima.',
      },
      6: {
        status: 'confirmed',
        channel: 'manual',
        client: DEMO_CLIENTS[2], // Returning (Lucía)
        serviceIndices: [6], // 45m
        notes: 'Mantenimiento rápido.',
      },
    },
    // Day +3: 2 confirmed (2 MP), 6 available
    3: {
      2: {
        status: 'confirmed',
        channel: 'online',
        client: DEMO_CLIENTS[11],
        serviceIndices: [4], // 60m
        extraMap: { 0: [0] },
        depositAmount: 6000,
      },
      5: {
        status: 'confirmed',
        channel: 'online',
        client: DEMO_CLIENTS[4], // Returning (Sofía)
        serviceIndices: [2], // 60m
        extraMap: { 0: [1] },
        depositAmount: 6000,
      },
    },
    // Day +4: 2 confirmed (1 MP + 1 manual), 1 cancelled, 5 available
    4: {
      0: {
        status: 'confirmed',
        channel: 'manual',
        client: DEMO_CLIENTS[12],
        serviceIndices: [3], // 30m
        extraMap: { 0: [0, 1] },
      },
      3: {
        status: 'cancelled',
        channel: 'manual',
        client: DEMO_CLIENTS[13],
        serviceIndices: [0],
      },
      6: {
        status: 'confirmed',
        channel: 'online',
        client: DEMO_CLIENTS[6], // Returning (Florencia)
        serviceIndices: [5], // 90m
        extraMap: { 0: [0] },
        depositAmount: 8000,
      },
    },
    // Day +5: 2 confirmed (2 MP), 6 available
    5: {
      1: {
        status: 'confirmed',
        channel: 'online',
        client: DEMO_CLIENTS[10],
        serviceIndices: [2], // 60m
        extraMap: { 0: [0] },
        depositAmount: 6000,
      },
      5: {
        status: 'confirmed',
        channel: 'online',
        client: DEMO_CLIENTS[1], // Returning (Tomás)
        serviceIndices: [4], // 60m
        extraMap: { 0: [0, 1] },
        depositAmount: 6000,
      },
    },
    // Day +6: 1 confirmed (1 MP), 7 available
    6: {
      2: {
        status: 'confirmed',
        channel: 'online',
        client: DEMO_CLIENTS[13],
        serviceIndices: [1], // 60m
        extraMap: { 0: [0] },
        depositAmount: 6000,
      },
    },
  };

  for (let dayOffset = 0; dayOffset < 7; dayOffset += 1) {
    const dateKey = addDaysToDateKey(todayKey, dayOffset);
    const dayOverrides = weekPlans[dayOffset] || {};

    DAILY_SCHEDULE_TIMES.forEach((slotTime, timeIdx) => {
      const plan = dayOverrides[timeIdx];
      if (!plan) {
        pushSlot({
          dateKey,
          hour: slotTime.hour,
          minute: slotTime.minute,
          status: 'available',
          depositAmount: 6000,
        });
        return;
      }

      pushSlot({
        dateKey,
        hour: slotTime.hour,
        minute: slotTime.minute,
        status: plan.status,
        channel: plan.channel,
        client: plan.client,
        serviceIndices: plan.serviceIndices,
        extraMap: plan.extraMap || {},
        notes: plan.notes || '',
        depositAmount: plan.depositAmount || 6000,
      });
    });
  }

  // =========================================================================
  // 2. Historical block (status: 'past') for Analytics trends & previous month
  // =========================================================================
  const [todayYear, todayMonth, todayDay] = todayKey.split('-').map(Number);

  // Earlier days in current calendar month (up to 4 past dates before today)
  const currentMonthPastDays = [];
  if (todayDay > 2) {
    const step = Math.max(1, Math.floor((todayDay - 1) / 4));
    for (let d = 1; d < todayDay && currentMonthPastDays.length < 4; d += step) {
      currentMonthPastDays.push(`${todayYear}-${pad2(todayMonth)}-${pad2(d)}`);
    }
  }

  const currentMonthHistoryTemplates = [
    { hour: 10, minute: 0, channel: 'online', client: DEMO_CLIENTS[0], serviceIndices: [2], extraMap: { 0: [0] }, depositAmount: 6000 },
    { hour: 16, minute: 0, channel: 'manual', client: DEMO_CLIENTS[3], serviceIndices: [4], extraMap: { 0: [1] }, depositAmount: 6000 },
    { hour: 11, minute: 30, channel: 'online', client: DEMO_CLIENTS[2], serviceIndices: [5], extraMap: { 0: [0] }, depositAmount: 8000 },
    { hour: 17, minute: 30, channel: 'online', client: DEMO_CLIENTS[8], serviceIndices: [1], extraMap: { 0: [0] }, depositAmount: 6000 },
    { hour: 14, minute: 30, channel: 'manual', client: DEMO_CLIENTS[11], serviceIndices: [6], extraMap: {}, depositAmount: 6000 },
    { hour: 19, minute: 0, channel: 'online', client: DEMO_CLIENTS[5], serviceIndices: [3], extraMap: { 0: [0] }, depositAmount: 6000 },
    { hour: 10, minute: 0, channel: 'online', client: DEMO_CLIENTS[9], serviceIndices: [2], extraMap: { 0: [1] }, depositAmount: 6000 },
    { hour: 16, minute: 0, channel: 'online', client: DEMO_CLIENTS[12], serviceIndices: [1], extraMap: {}, depositAmount: 6000, cancelled: true },
  ];

  currentMonthPastDays.forEach((dateKey, idx) => {
    const t1 = currentMonthHistoryTemplates[(idx * 2) % currentMonthHistoryTemplates.length];
    const t2 = currentMonthHistoryTemplates[(idx * 2 + 1) % currentMonthHistoryTemplates.length];
    [t1, t2].forEach((tpl) => {
      pushSlot({
        dateKey,
        hour: tpl.hour,
        minute: tpl.minute,
        status: 'past',
        pastOutcome: tpl.cancelled ? 'cancelled' : 'completed',
        channel: tpl.channel,
        client: tpl.client,
        serviceIndices: tpl.serviceIndices,
        extraMap: tpl.extraMap,
        depositAmount: tpl.depositAmount,
      });
    });
  });

  // Previous calendar month (8 completed + 1 cancelled so "Mes actual" shows real deltas)
  const prevMonthRef = new Date(Date.UTC(todayYear, todayMonth - 2, 15, 12, 0, 0));
  const prevYear = prevMonthRef.getUTCFullYear();
  const prevMonth = prevMonthRef.getUTCMonth() + 1;
  const prevMonthHistory = [
    { day: 4, hour: 10, minute: 0, channel: 'online', client: DEMO_CLIENTS[0], serviceIndices: [1], extraMap: { 0: [0] }, depositAmount: 6000 },
    { day: 7, hour: 16, minute: 0, channel: 'manual', client: DEMO_CLIENTS[1], serviceIndices: [4], extraMap: {}, depositAmount: 6000 },
    { day: 11, hour: 11, minute: 30, channel: 'online', client: DEMO_CLIENTS[2], serviceIndices: [2], extraMap: { 0: [0] }, depositAmount: 6000 },
    { day: 14, hour: 14, minute: 30, channel: 'online', client: DEMO_CLIENTS[4], serviceIndices: [5], extraMap: { 0: [1] }, depositAmount: 8000 },
    { day: 18, hour: 17, minute: 30, channel: 'manual', client: DEMO_CLIENTS[6], serviceIndices: [6], extraMap: { 0: [0] }, depositAmount: 6000 },
    { day: 21, hour: 10, minute: 0, channel: 'online', client: DEMO_CLIENTS[7], serviceIndices: [3], extraMap: { 0: [1] }, depositAmount: 6000 },
    { day: 24, hour: 16, minute: 0, channel: 'online', client: DEMO_CLIENTS[8], serviceIndices: [2], extraMap: {}, depositAmount: 6000 },
    { day: 26, hour: 19, minute: 0, channel: 'online', client: DEMO_CLIENTS[10], serviceIndices: [1], extraMap: { 0: [0] }, depositAmount: 6000 },
    { day: 27, hour: 13, minute: 0, channel: 'online', client: DEMO_CLIENTS[12], serviceIndices: [0], extraMap: {}, depositAmount: 6000, cancelled: true },
  ];

  prevMonthHistory.forEach((item) => {
    const dateKey = `${prevYear}-${pad2(prevMonth)}-${pad2(item.day)}`;
    pushSlot({
      dateKey,
      hour: item.hour,
      minute: item.minute,
      status: 'past',
      pastOutcome: item.cancelled ? 'cancelled' : 'completed',
      channel: item.channel,
      client: item.client,
      serviceIndices: item.serviceIndices,
      extraMap: item.extraMap,
      depositAmount: item.depositAmount,
    });
  });

  const availabilityDoc = {
    slots: availabilitySlots,
    updatedAt: nowIso,
  };

  const slugDoc = {
    tenantId,
    slug: demoSlug,
    status: 'active',
    redirectToSlug: null,
    timezone,
    currency: 'ARS',
    mpConfigured: true,
    isDemo: true,
    ownerProfile,
    updatedAt: nowIso,
  };

  const baseCreatedMs = now.getTime();
  const portfolio = [
    {
      id: 'port_demo_1',
      title: 'Cabina Principal de Bienestar',
      category: 'Espacio',
      description:
        'Ambiente cálido con luz natural, aromaterapia y equipamiento listo para cada sesión.',
      imageUrl: '/default/images/demo-work-1.jpg',
      createdAt: new Date(baseCreatedMs).toISOString(),
    },
    {
      id: 'port_demo_2',
      title: 'Tratamiento Facial Revitalizante',
      category: 'Facial',
      description:
        'Protocolo completo de limpieza, hidratación profunda y drenaje facial personalizado.',
      imageUrl: '/default/images/demo-work-2.jpg',
      createdAt: new Date(baseCreatedMs - 1000).toISOString(),
    },
    {
      id: 'port_demo_3',
      title: 'Ritual Integral de 90 Minutos',
      category: 'Rituales',
      description:
        'Combinación de masaje descontracturante, máscara hidrocalmante y cierre con infusión.',
      imageUrl: '/default/images/demo-work-3.jpg',
      createdAt: new Date(baseCreatedMs - 2000).toISOString(),
    },
    {
      id: 'port_demo_4',
      title: 'Diseño & Cuidado Natural',
      category: 'Cuidado',
      description:
        'Terminaciones suaves y seguimiento personalizado para mantener los resultados en casa.',
      imageUrl: '/default/images/demo-work-4.jpg',
      createdAt: new Date(baseCreatedMs - 3000).toISOString(),
    },
  ];

  const stats = {
    servicesCount: services.length,
    portfolioCount: portfolio.length,
    slotsCount: slots.length,
    availableCount: slots.filter((s) => s.data.status === 'available').length,
    confirmedOnlineCount: slots.filter(
      (s) => s.data.status === 'confirmed' && s.data.paymentStatus === 'approved'
    ).length,
    confirmedManualCount: slots.filter(
      (s) => s.data.status === 'confirmed' && s.data.paymentStatus === 'manual_admin'
    ).length,
    cancelledCount: slots.filter((s) => s.data.status === 'cancelled').length,
    pastCount: slots.filter((s) => s.data.status === 'past').length,
  };

  return {
    tenantId,
    demoSlug,
    tenantDoc,
    ownerProfile,
    memberDoc,
    services,
    portfolio,
    slots,
    availabilityDoc,
    slugDoc,
    stats,
  };
};
