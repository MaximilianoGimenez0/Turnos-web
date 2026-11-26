import { withAdminApp, mergePlatformAdminClaims } from '../core/firebase.mjs';
import { colors, printBanner, askText } from '../core/prompt.mjs';

const RESERVED_SLUGS = new Set([
  'superadmin',
  'admin',
  'api',
  'auth',
  'login',
  'logout',
  'register',
  'signup',
  'app',
  'dashboard',
  'static',
  'assets',
  'public',
  'artifacts',
  'health',
  'status',
  'webhook',
  'webhooks',
  'payment',
  'payments',
  'success',
  'failure',
  'pending',
]);

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const SLUG_REGEX = /^[a-z0-9](?:[a-z0-9-]{1,46}[a-z0-9])$/;

export const DEFAULT_DEMO_TENANT_ID = 'tnt_demo';
export const DEFAULT_DEMO_SLUG = 'demo';
export const DEFAULT_DEMO_NAME = 'Estudio Demo';
export const DEFAULT_TIMEZONE = 'America/Argentina/Buenos_Aires';

export const validateSlug = (rawSlug) => {
  const slug = String(rawSlug || '').trim().toLowerCase();
  if (!SLUG_REGEX.test(slug)) {
    throw new Error(
      `El slug "${rawSlug}" es inválido. Usá 3 a 48 caracteres (letras minúsculas, números o guiones).`
    );
  }
  if (RESERVED_SLUGS.has(slug)) {
    throw new Error(`El slug "${slug}" está reservado por el sistema.`);
  }
  return slug;
};

export const validateTimezone = (rawTz) => {
  const tz = String(rawTz || '').trim();
  if (!tz) {
    throw new Error('La zona horaria no puede estar vacía.');
  }
  try {
    Intl.DateTimeFormat(undefined, { timeZone: tz });
    return tz;
  } catch {
    throw new Error(`Zona horaria IANA inválida: "${tz}".`);
  }
};

export const parseInitArgs = (argv) => {
  const options = {
    adminEmail: '',
    adminPassword: '',
    withDemo: false,
    demoSlug: DEFAULT_DEMO_SLUG,
    demoName: DEFAULT_DEMO_NAME,
    timezone: DEFAULT_TIMEZONE,
    emulator: false,
    project: '',
    bucket: '',
    help: false,
  };

  for (let i = 0; i < argv.length; i += 1) {
    const arg = argv[i];
    if (arg === '--help' || arg === '-h') {
      options.help = true;
    } else if (arg === '--with-demo') {
      options.withDemo = true;
    } else if (arg === '--emulator') {
      options.emulator = true;
    } else if (arg === '--admin-email') {
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) {
        throw new Error('La opción --admin-email requiere un correo electrónico.');
      }
      options.adminEmail = next.trim().toLowerCase();
      i += 1;
    } else if (arg.startsWith('--admin-email=')) {
      options.adminEmail = arg.slice('--admin-email='.length).trim().toLowerCase();
    } else if (arg === '--admin-password') {
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) {
        throw new Error('La opción --admin-password requiere un valor.');
      }
      options.adminPassword = next;
      i += 1;
    } else if (arg.startsWith('--admin-password=')) {
      options.adminPassword = arg.slice('--admin-password='.length);
    } else if (arg === '--demo-slug') {
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) {
        throw new Error('La opción --demo-slug requiere un valor.');
      }
      options.demoSlug = next.trim().toLowerCase();
      i += 1;
    } else if (arg.startsWith('--demo-slug=')) {
      options.demoSlug = arg.slice('--demo-slug='.length).trim().toLowerCase();
    } else if (arg === '--demo-name') {
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) {
        throw new Error('La opción --demo-name requiere un valor.');
      }
      options.demoName = next.trim();
      i += 1;
    } else if (arg.startsWith('--demo-name=')) {
      options.demoName = arg.slice('--demo-name='.length).trim();
    } else if (arg === '--timezone') {
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) {
        throw new Error('La opción --timezone requiere una zona horaria IANA.');
      }
      options.timezone = next.trim();
      i += 1;
    } else if (arg.startsWith('--timezone=')) {
      options.timezone = arg.slice('--timezone='.length).trim();
    } else if (arg === '--project' || arg === '-p') {
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) {
        throw new Error('La opción --project requiere un valor.');
      }
      options.project = next.trim();
      i += 1;
    } else if (arg.startsWith('--project=')) {
      options.project = arg.slice('--project='.length).trim();
    } else if (arg === '--bucket') {
      const next = argv[i + 1];
      if (!next || next.startsWith('-')) {
        throw new Error('La opción --bucket requiere un valor.');
      }
      options.bucket = next.trim();
      i += 1;
    } else if (arg.startsWith('--bucket=')) {
      options.bucket = arg.slice('--bucket='.length).trim();
    } else {
      throw new Error(`Argumento desconocido en init: "${arg}". Usá --help para ver opciones.`);
    }
  }

  return options;
};

export const printInitUsage = () => {
  console.log(`Uso:
  npm run cli -- init --admin-email <correo> [--admin-password <clave>] [opciones]

Opciones:
  --admin-email <correo>     Email del SuperAdmin inicial (si ya existe, se promueve).
  --admin-password <clave>   Contraseña (mínimo 8 caracteres) si el usuario aún no existe en Auth.
  --with-demo                Siembra además un negocio demo (/demo) con servicios y turnos de prueba.
  --demo-slug <slug>         Slug del negocio demo (default: demo).
  --demo-name <nombre>       Nombre visible del negocio demo (default: "Estudio Demo").
  --timezone <iana>          Zona horaria IANA del negocio demo (default: America/Argentina/Buenos_Aires).
  --emulator                 Ejecuta contra Firebase Emulators locales (9099/8080/9199).
  --project, -p <id>         ID del proyecto Firebase destino.
  --bucket <nombre>          Bucket de Cloud Storage destino.
  --help, -h                 Muestra esta ayuda.`);
};

const pad2 = (n) => String(n).padStart(2, '0');

const generateNextBusinessDaysUtc = (referenceDate, count = 3) => {
  const days = [];
  const cursor = new Date(referenceDate.getTime());
  cursor.setUTCHours(12, 0, 0, 0);

  while (days.length < count) {
    cursor.setUTCDate(cursor.getUTCDate() + 1);
    const weekday = cursor.getUTCDay();
    if (weekday !== 0) {
      days.push(new Date(cursor.getTime()));
    }
  }
  return days;
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

  const ownerProfile = {
    name: demoName,
    businessName: demoName,
    role: 'Estudio profesional de demostración',
    description:
      'Espacio interactivo de muestra para probar reservas online, adicionales por servicio y confirmación de seña.',
    pictureUrl: '',
    heroImageUrl: '',
    logoUrl: '',
    instagram: '',
    phone: '',
    email: ownerEmail,
    location: 'Buenos Aires, Argentina',
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
    email: ownerEmail,
    displayName: demoName,
    role: 'owner',
    active: true,
    createdAt: nowIso,
    updatedAt: nowIso,
  };

  const services = [
    {
      id: 'srv_demo_1',
      name: 'Servicio Esencial',
      basePrice: 18000,
      durationMinutes: 45,
      description: 'Sesión base de 45 minutos con diagnóstico inicial.',
      extras: [
        { id: 'ext_demo_1a', name: 'Tratamiento express', price: 4500 },
        { id: 'ext_demo_1b', name: 'Acabado premium', price: 6000 },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'srv_demo_2',
      name: 'Sesión Completa',
      basePrice: 28000,
      durationMinutes: 60,
      description: 'Servicio integral de 60 minutos con asesoramiento personalizado.',
      extras: [
        { id: 'ext_demo_2a', name: 'Diseño personalizado', price: 5500 },
      ],
      createdAt: nowIso,
      updatedAt: nowIso,
    },
    {
      id: 'srv_demo_3',
      name: 'Experiencia Deluxe',
      basePrice: 38000,
      durationMinutes: 90,
      description: 'Atención extendida de 90 minutos con todos los cuidados incluidos.',
      extras: [],
      createdAt: nowIso,
      updatedAt: nowIso,
    },
  ];

  const publicServices = services.map(({ id, name, basePrice, durationMinutes, extras }) => ({
    id,
    name,
    basePrice,
    durationMinutes,
    ...(extras.length > 0 ? { extras } : {}),
  }));

  const businessDays = generateNextBusinessDaysUtc(now, 3);
  const slotHoursLocal = [
    { hour: 10, minute: 0 },
    { hour: 14, minute: 0 },
    { hour: 16, minute: 30 },
  ];

  const slots = [];
  const availabilitySlots = {};
  let index = 1;

  for (const day of businessDays) {
    const year = day.getUTCFullYear();
    const month = pad2(day.getUTCMonth() + 1);
    const dayNum = pad2(day.getUTCDate());

    for (const { hour, minute } of slotHoursLocal) {
      // Represent local Argentina (-03:00) schedule as clean UTC ISO timestamp
      const slotDate = new Date(`${year}-${month}-${dayNum}T${pad2(hour)}:${pad2(minute)}:00-03:00`);
      const datetimeIso = slotDate.toISOString();
      const slotId = `slot_demo_${pad2(index)}`;
      index += 1;

      const slotDoc = {
        datetime: datetimeIso,
        status: 'available',
        depositAmount: 5000,
        serviceName: services[0].name,
        services: publicServices,
        estimatedDurationMinutes: 45,
        estimatedDuration: '45 min',
        expiresAt: null,
        createdAt: nowIso,
        updatedAt: nowIso,
      };

      slots.push({ id: slotId, data: slotDoc });
      availabilitySlots[slotId] = {
        datetime: datetimeIso,
        status: 'available',
        depositAmount: 5000,
        serviceName: services[0].name,
        services: publicServices,
        estimatedDurationMinutes: 45,
        estimatedDuration: '45 min',
        expiresAt: null,
        updatedAt: nowIso,
      };
    }
  }

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
      title: 'Francesita Clásica Soft',
      category: 'Semipermanente',
      description:
        'Base translúcida natural con punta francesa delicada y brillo protector de larga duración.',
      imageUrl: '/default/images/demo-nails-french.jpg',
      createdAt: new Date(baseCreatedMs).toISOString(),
    },
    {
      id: 'port_demo_2',
      title: 'Kapping Gel Natural',
      category: 'Kapping',
      description:
        'Refuerzo estructural en tono rosado suave ideal para proteger el crecimiento de la uña natural.',
      imageUrl: '/default/images/demo-nails-kapping.jpg',
      createdAt: new Date(baseCreatedMs - 1000).toISOString(),
    },
    {
      id: 'port_demo_3',
      title: 'Nail Art Minimalista',
      category: 'Nail Art',
      description:
        'Diseño sutil con líneas finas y detalles luminosos pensado para un acabado elegante y moderno.',
      imageUrl: '/default/images/demo-nails-nailart.jpg',
      createdAt: new Date(baseCreatedMs - 2000).toISOString(),
    },
    {
      id: 'port_demo_4',
      title: 'Soft Gel Almendra',
      category: 'Esculpidas',
      description:
        'Extensión liviana en formato almendra con esmaltado liso satinado de terminación pareja.',
      imageUrl: '/default/images/demo-nails-softgel.jpg',
      createdAt: new Date(baseCreatedMs - 3000).toISOString(),
    },
  ];

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
  };
};

export const runInit = async (options = {}) => {
  const opts = {
    adminEmail: '',
    adminPassword: '',
    withDemo: false,
    demoSlug: DEFAULT_DEMO_SLUG,
    demoName: DEFAULT_DEMO_NAME,
    timezone: DEFAULT_TIMEZONE,
    emulator: false,
    project: '',
    bucket: '',
    ...options,
  };

  let adminEmail = String(opts.adminEmail || '').trim().toLowerCase();
  if (!adminEmail) {
    adminEmail = (await askText('Email del SuperAdmin inicial: ')).toLowerCase();
  }
  if (!EMAIL_REGEX.test(adminEmail)) {
    throw new Error(`El email "${adminEmail}" no tiene un formato válido.`);
  }

  const demoSlug = opts.withDemo ? validateSlug(opts.demoSlug) : opts.demoSlug;
  const demoName = String(opts.demoName || DEFAULT_DEMO_NAME).trim();
  if (opts.withDemo && (demoName.length < 2 || demoName.length > 100)) {
    throw new Error('El nombre del negocio demo debe tener entre 2 y 100 caracteres.');
  }
  const timezone = validateTimezone(opts.timezone);

  return withAdminApp(
    { project: opts.project, bucket: opts.bucket, emulator: opts.emulator },
    async ({ auth, db, projectId, usingEmulator }) => {
      printBanner(
        'Turneado Init (Configuración Inicial)',
        `Proyecto: ${projectId}${usingEmulator ? ' (Emulador)' : ''} | Demo: ${opts.withDemo ? `Sí (/${demoSlug})` : 'No (instalación limpia)'}`
      );

      // Preflight connectivity check
      await auth.listUsers(1);
      await db.listCollections();

      // 1. Find or create SuperAdmin in Auth
      let userRecord;
      let userCreated = false;

      try {
        userRecord = await auth.getUserByEmail(adminEmail);
      } catch (err) {
        if (err?.code !== 'auth/user-not-found') {
          throw err;
        }
        let password = String(opts.adminPassword || '');
        if (!password) {
          password = await askText('Contraseña para el nuevo SuperAdmin (mín. 8 caracteres): ');
        }
        if (password.length < 8) {
          throw new Error(
            'La contraseña del SuperAdmin inicial debe tener al menos 8 caracteres (pasá --admin-password).'
          );
        }

        userRecord = await auth.createUser({
          email: adminEmail,
          password,
          displayName: 'SuperAdmin',
          emailVerified: true,
        });
        userCreated = true;
      }

      // 2. Assign platformAdmin: true preserving existing claims
      const existingClaims = userRecord.customClaims || {};
      let nextClaims = mergePlatformAdminClaims(existingClaims, false);
      await auth.setCustomUserClaims(userRecord.uid, nextClaims);

      // 3. Optional idempotent demo tenant seed
      let demoStatus = 'skipped';
      let demoSeedStats = null;

      if (opts.withDemo) {
        const tenantRef = db.collection('tenants').doc(DEFAULT_DEMO_TENANT_ID);
        const existingTenantSnap = await tenantRef.get();

        if (existingTenantSnap.exists) {
          demoStatus = 'already-exists';
          const existingTenantData = existingTenantSnap.data() || {};
          demoSeedStats = {
            tenantId: DEFAULT_DEMO_TENANT_ID,
            slug: existingTenantData.slug || demoSlug,
          };
        } else {
          const seed = buildDemoSeedData({
            ownerUid: userRecord.uid,
            ownerEmail: adminEmail,
            demoSlug,
            demoName,
            timezone,
          });

          const slugRef = db.collection('tenant_slugs').doc(demoSlug);

          await db.runTransaction(async (tx) => {
            const slugSnap = await tx.get(slugRef);
            if (slugSnap.exists && slugSnap.data()?.tenantId !== seed.tenantId) {
              throw new Error(
                `El slug "${demoSlug}" ya pertenece a otro negocio (${slugSnap.data()?.tenantId}).`
              );
            }

            tx.set(tenantRef, seed.tenantDoc);
            tx.set(tenantRef.collection('ownerinfo').doc('profile'), seed.ownerProfile);
            tx.set(tenantRef.collection('public_meta').doc('availability'), seed.availabilityDoc);
            tx.set(tenantRef.collection('members').doc(userRecord.uid), seed.memberDoc);
            tx.set(slugRef, seed.slugDoc);
          });

          const batch = db.batch();
          for (const service of seed.services) {
            const { id, ...serviceData } = service;
            batch.set(tenantRef.collection('services').doc(id), serviceData);
          }
          for (const work of seed.portfolio) {
            const { id, ...workData } = work;
            batch.set(tenantRef.collection('portfolio').doc(id), workData);
          }
          for (const slot of seed.slots) {
            batch.set(tenantRef.collection('slots').doc(slot.id), slot.data);
          }
          await batch.commit();

          const currentTenantsClaim =
            nextClaims.tenants && typeof nextClaims.tenants === 'object'
              ? { ...nextClaims.tenants }
              : {};
          currentTenantsClaim[seed.tenantId] = 'owner';
          nextClaims = {
            ...nextClaims,
            tenants: currentTenantsClaim,
          };
          await auth.setCustomUserClaims(userRecord.uid, nextClaims);

          demoStatus = 'created';
          demoSeedStats = {
            tenantId: seed.tenantId,
            slug: seed.demoSlug,
            servicesCount: seed.services.length,
            portfolioCount: seed.portfolio.length,
            slotsCount: seed.slots.length,
          };
        }
      }

      console.log(colors.green('✅ Inicialización completada correctamente.'));
      console.log(
        `   SuperAdmin: ${adminEmail} (UID: ${userRecord.uid}) [${userCreated ? 'creado' : 'promovido'}]`
      );
      console.log(`   Panel SuperAdmin: /superadmin/login`);
      if (demoStatus === 'created' && demoSeedStats) {
        console.log(
          `   Demo creado:      /${demoSeedStats.slug} (${demoSeedStats.servicesCount} servicios, ${demoSeedStats.portfolioCount} trabajos en galería, ${demoSeedStats.slotsCount} turnos disponibles)`
        );
        console.log(`   Admin Demo:       /${demoSeedStats.slug}/admin`);
      } else if (demoStatus === 'already-exists' && demoSeedStats) {
        console.log(
          colors.yellow(
            `   Demo existente:   /${demoSeedStats.slug} (${demoSeedStats.tenantId}) ya estaba creado; se omitió sin sobrescribir.`
          )
        );
      } else {
        console.log('   Negocios creados: 0 (entorno limpio listo para crear tenants desde /superadmin).');
      }
      console.log('');

      return {
        projectId,
        usingEmulator,
        admin: {
          uid: userRecord.uid,
          email: adminEmail,
          created: userCreated,
          claims: nextClaims,
        },
        demoStatus,
        demo: demoSeedStats,
      };
    }
  );
};
