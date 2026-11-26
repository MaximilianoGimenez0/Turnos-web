# 13 — Lenguaje Genérico Multirrubro, Imágenes de Stock Neutras y Seed Demo

> **Estado:** Listo para revisión y ejecución  
> **Prioridad:** Alta (posicionamiento comercial SaaS multirrubro de Turneado)  
> **Ámbito:** Diccionarios de textos (`src/texts/**`), Valores por defecto (`src/services/ownerDefaults.ts`, `public/default/info/owner.json`), Apariencia por defecto (`src/config/themePresets.ts`), Correos transaccionales (`functions/src/emailService.ts`), Imágenes de stock (`public/default/images/*`), Seed Demo CLI (`scripts/cli/commands/init.mjs`) y Tests unitarios/integración.

---

## 1. Objetivos y Alcance

### Problema que resuelve
Aunque **Turneado** opera con una arquitectura SaaS multi-tenant apta para cualquier negocio que trabaje con agenda y seña (consultorios, estudios profesionales, barberías, bienestar, talleres, clases, asesorías, servicios técnicos, estética, etc.), todavía arrastra resabios de su origen monousuario orientado a estética y uñas:

1. **Textos con sesgo de género femenino o de rubro estético:** frases como *"Profesional certificada"*, *"¿Lista para consentirte y renovar tu imagen?"*, *"Estudio de estética y belleza"*, *"Turno de Estética"*, *"tipo de piel"*, *"tratamientos"* (en Precios y Portfolio) y placeholders como *"Lifting de Pestañas Deluxe"*, *"Kapping gel"* o *"@tu_estetica"*.
2. **Referencias rígidas a *"salón"* o *"estudio"*:** tanto en el frontend como en los correos transaccionales (`emailService.ts`), los saldos y estados hablan de *"abonar en el salón"* o *"agenda del estudio"*, lo cual no aplica a consultorios, profesionales independientes o servicios a domicilio.
3. **Portada por defecto orientada a belleza:** `DEFAULT_TENANT_APPEARANCE.heroCopyPreset` inicia en `'editorial-beauty'` (*"Tu momento de cuidado y belleza personalizada"*) en lugar de un copy multirrubro.
4. **Imágenes de stock y galería demo de uñas:** `public/default/images/` contiene 4 fotos `demo-nails-*.jpg`, un `logo-fallback.svg` con emblema de flor de loto y fotos de portada/perfil vinculadas a estética.
5. **Seed `/demo` desalineado:** los trabajos precargados en `scripts/cli/commands/init.mjs` son exclusivamente de manicuría (*Francesita Clásica Soft*, *Kapping Gel Natural*, *Nail Art Minimalista*, *Soft Gel Almendra*) y los turnos precargados no muestran variedad de franjas ni un ejemplo del sistema de recargos (Spec 12).

### Qué incluye esta especificación
1. **Estandarización de textos neutros y multirrubro** en vistas públicas, panel admin, SuperAdmin, validadores y correos transaccionales (HTML y texto plano).
2. **Cambio del preset de portada por defecto** a `'modern-studio'` (multirrubro), conservando todos los packs curados por rubro en `AppearanceSettings` como opciones elegibles.
3. **Renovación completa de imágenes de stock** en `public/default/images/` (logo por defecto alineado a Turneado, portada/retrato neutros y 4 nuevas imágenes de portfolio genéricas `demo-work-1..4.jpg` reemplazando `demo-nails-*.jpg`).
4. **Actualización del seed `/demo`** en `scripts/cli/commands/init.mjs`: perfil neutro, 3 servicios escalonados con extras genéricos, 4 trabajos de galería multirrubro y 9 turnos distribuidos en mañana/tarde/horario extendido (incluyendo 1 ejemplo con recargo opcional).
5. **Actualización de tests unitarios e integración** afectados por textos, rutas de imágenes y seed.

### Qué queda fuera de alcance
- Modificación de los **packs curados de Apariencia** (`STYLE_PACKS` y `HERO_COPY_PRESETS` específicos de rubro en `src/config/themePresets.ts` como *Estética & Nail Studio*, *Barbería Clásica*, *Spa & Bienestar*, *Tattoo & Arte*, *Pilates & Movimiento*), ya que son plantillas opt-in elegidas por cada comercio.
- Migración automática de textos o imágenes ya personalizados y guardados por tenants productivos existentes en Firestore/Storage (los datos propios del negocio siempre tienen prioridad sobre los defaults).
- Cambios en nombres internos de campos de Firestore o contratos de API (por ejemplo, la clave interna `salonBalance` en `emailService.ts` o `PAYMENT_SUCCESS_TEXTS.details.salonBalanceLabel` pueden mantener su identificador técnico para no romper interfaces).

---

## 2. Estandarización de Textos (Frontend, Defaults y Correos)

### 2.1 Vista Pública (`ClientView`, `About`, `Prices`, `BookingModal`, `PaymentSuccess`, `TenantStatus`)

| Archivo | Versión actual | Versión nueva |
| :--- | :--- | :--- |
| `src/texts/pages/ClientView.ts` (hero) | `Estudio de estética y belleza`<br>`Tu momento de cuidado y` + `belleza personalizada` | `Reservas online`<br>`Reservá tu próximo turno en` + `cuestión de segundos` |
| `src/texts/pages/ClientView.ts` (studioCard) | `Atención profesional exclusiva`<br>`Seguimiento personalizado, productos importados y espacio climatizado.`<br>`Ver información sobre mí` | `Atención profesional`<br>`Gestión clara, disponibilidad en tiempo real y confirmación inmediata.`<br>`Conocé más sobre nosotros` |
| `src/texts/pages/ClientView.ts` (portfolio/loaders) | `Obteniendo fotos de tratamientos destacados`<br>`Pronto compartiremos fotos de nuestros trabajos y técnicas más recientes.`<br>`Estos son los resultados de algunos de mis trabajos` | `Obteniendo fotos de trabajos destacados`<br>`Pronto compartiremos fotos de nuestros trabajos más recientes.`<br>`Una muestra de algunos de nuestros trabajos recientes` |
| `src/texts/pages/About.ts` (hero) | `Profesional certificada`<br>`Estudio de belleza y estética`<br>`Especialista en belleza`<br>`Especialista en tratamientos estéticos` | `Atención profesional`<br>`Espacio de reservas online`<br>`Equipo profesional`<br>`Servicios profesionales a medida` |
| `src/texts/pages/About.ts` (pillars) | `Insumos de primera línea` — `Productos certificados internacionalmente para garantizar resultados duraderos, seguros y de acabado profesional.`<br>`Diagnóstico previo y adaptación de cada técnica a tu fisonomía, gustos y tipo de piel.` | `Calidad garantizada` — `Estándares profesionales y cuidado en cada etapa del servicio para asegurar la mejor experiencia.`<br>`Atención a medida según tus necesidades, preferencias y objetivos en cada turno.` |
| `src/texts/pages/About.ts` (finalCta) | `¿Lista para consentirte y renovar tu imagen?` | `¿Querés reservar tu próximo turno?` |
| `src/texts/pages/Prices.ts` | `tratamiento` / `tratamientos` (9 ocurrencias)<br>`Estimación de tu sesión`<br>`El saldo restante se abona en el salón el día de tu cita.` | `servicio` / `servicios`<br>`Estimación de tu reserva`<br>`El saldo restante se abona presencialmente el día de tu turno.` |
| `src/texts/components/slots/BookingModal.ts` | `Turno de Estética`<br>`Ej: Lucía Benítez` · `lucia.benitez@ejemplo.com`<br>`Ej: Preferencia de diseño, primera vez...`<br>`Este estudio todavía no tiene habilitado...` | `Turno disponible`<br>`Ej: Alex Gómez` · `nombre@ejemplo.com`<br>`Ej: Primera consulta, aclaraciones o preferencias...`<br>`Este negocio todavía no tiene habilitado...` |
| `src/texts/pages/PaymentSuccess.ts` | `Saldo a abonar en el salón:` | `Saldo a abonar presencialmente:` |
| `src/texts/pages/TenantStatus.ts` | `agenda del estudio` / `información del salón` / `ningún estudio activo` / `contactá directamente al estudio` / `Este estudio pausó...` / `el estudio reactive` | `agenda del negocio` / `información del negocio` / `ningún negocio activo` / `contactá directamente al negocio` / `Este negocio pausó...` / `el negocio reactive` |

### 2.2 Panel de Administración, SuperAdmin y Validadores

| Archivo | Versión actual | Versión nueva |
| :--- | :--- | :--- |
| `src/texts/components/admin/OwnerSettings.ts` | `Perfil e identidad del estudio` / `tu estudio` / `Logo del estudio` / `alt: 'Logo estética'` / `Imagen principal del estudio`<br>`Nombre del estudio` · `Ej. Glow Beauty Studio` · `El nombre del negocio / estética`<br>`Ej. Dra. Florencia Gómez` · `El nombre del profesional / autora`<br>`Ej. Especialista en Estética & Belleza`<br>`@tu_estetica` · `contacto@estetica.com`<br>`Contá la historia de tu estudio...` | `Perfil e identidad del negocio` / `tu negocio` / `Logo del negocio` / `alt: 'Logo del negocio'` / `Imagen principal del negocio`<br>`Nombre del negocio` · `Ej. Espacio Norte` · `El nombre del negocio`<br>`Ej. Martín Pérez` · `El nombre de la persona o equipo responsable`<br>`Ej. Servicios profesionales / Consultoría`<br>`@tu_negocio` · `contacto@tunegocio.com`<br>`Contá la historia de tu negocio, tu experiencia y qué ofrecés...` |
| `src/texts/components/admin/PortfolioManager.ts` | `Título del Tratamiento`<br>`Ej. Lifting de Pestañas Deluxe`<br>`Ej. Pestañas, Uñas, Facial...`<br>`Ej. Realce natural con tinte de queratina y nutrición profunda` | `Título del trabajo`<br>`Ej. Proyecto destacado`<br>`Ej. Categoría, Especialidad...`<br>`Ej. Breve descripción del trabajo realizado y sus detalles` |
| `src/texts/components/admin/ServicesManager.ts` | `Ej: Sesión completa, Corte y perfilado, Kapping gel`<br>`Ej: Diseño personalizado, Baño de nutrición` | `Ej: Consulta inicial, Sesión completa, Servicio estándar`<br>`Ej: Opción extendida, Adicional prioritario` |
| `src/texts/components/slots/CreateSlotModal.ts` | `Ej: Turno Estética / Promo Mirada`<br>`...saldo a abonar en el salón...`<br>`Los servicios determinan los tratamientos disponibles...` | `Ej: Turno estándar / Promo especial`<br>`...saldo a abonar presencialmente...`<br>`Los servicios determinan las opciones disponibles...` |
| `src/texts/components/admin/AssignSlotModal.ts` | `Ej: Sofía Herrera`<br>`Saldo restante en salón:` | `Ej: Alex Gómez`<br>`Saldo restante presencial:` |
| `src/texts/pages/SuperAdmin.ts` | `Ej. Estudio Aura` · `estudio-aura` · `duena@estudioaura.com`<br>`nuevo-slug-del-estudio` · `colaborador@estudio.com` | `Ej. Espacio Norte` · `espacio-norte` · `admin@espacionorte.com`<br>`nuevo-slug-del-negocio` · `colaborador@negocio.com` |
| `src/texts/shared/validators.ts` | `El usuario de Instagram no es válido (ej: @tu_estetica).` | `El usuario de Instagram no es válido (ej: @tu_negocio).` |

### 2.3 Correos Transaccionales (`functions/src/emailService.ts`)

| Contexto | Versión actual | Versión nueva |
| :--- | :--- | :--- |
| Estado de total pendiente | `A confirmar en el salón` | `A confirmar presencialmente` |
| Etiqueta saldo (dueño) | `A cobrar en el salón` | `Saldo a cobrar presencialmente` |
| Resumen total pendiente | `Total final a confirmar en el salón` | `Total final a confirmar presencialmente` |
| Tip de pago (saldo definido) | `El saldo pendiente (...) lo podés abonar en el salón en efectivo o transferencia.` | `El saldo pendiente (...) lo podés abonar presencialmente al asistir.` |
| Tip de pago (saldo a confirmar) | `El saldo final del servicio se confirma y abona en el salón al finalizar tu atención.` | `El saldo final del servicio se confirma y abona presencialmente al finalizar tu atención.` |
| Texto plano (cliente) | `Saldo pendiente en el salón:` | `Saldo pendiente presencial:` |
| Texto plano (dueño) | `Saldo pendiente a cobrar en salón:` | `Saldo pendiente a cobrar presencialmente:` |

### 2.4 Valores por Defecto y Apariencia Inicial

| Archivo | Versión actual | Versión nueva |
| :--- | :--- | :--- |
| `src/services/ownerDefaults.ts` y `public/default/info/owner.json` | `name: 'Estudio de Belleza & Estética'`<br>`businessName: 'Estudio de Belleza'`<br>`role: 'Especialista en Belleza y Cuidado Personal'`<br>`description: '...realzar tu belleza natural... relax y confort.'`<br>`instagram: '@turneado.estetica'` | `name: 'Espacio de Reservas'`<br>`businessName: 'Tu Negocio'`<br>`role: 'Servicios Profesionales'`<br>`description: 'Brindamos atención personalizada y profesional. Reservá tu turno online en segundos y gestioná tus horarios de forma simple y segura.'`<br>`instagram: '@turneado.app'` |
| `src/config/themePresets.ts` (`DEFAULT_TENANT_APPEARANCE`) | `heroCopyPreset: 'editorial-beauty'` | `heroCopyPreset: 'modern-studio'` |

---

## 3. Imágenes de Stock Genéricas (`public/default/images/`)

### 3.1 Estrategia de reemplazo y estética visual
Las imágenes de stock deben funcionar como punto de partida elegante para **cualquier rubro** sin parecer de un salón de uñas ni romper la paleta editorial cálida de Turneado (`#954754` / `#F6F3E7` / neutros cálidos):

| Archivo | Estado | Dirección visual propuesta |
| :--- | :--- | :--- |
| `public/default/images/logo-fallback.svg` | **Reemplazar** (misma ruta) | Reemplazar el emblema botánico/loto por el monograma entrelazado de **Turneado** (consistente con `public/favicon.svg`), `aria-label="Logo predeterminado del negocio"`. |
| `public/default/images/hero-fallback.jpg` | **Reemplazar** (misma ruta) | Fotografía editorial luminosa de un **espacio de recepción / estudio profesional minimalista** con madera cálida, luz natural suave y arquitectura limpia (sin elementos de estética ni medicina). Formato optimizado `< 250 KB`. |
| `public/default/images/portrait-fallback.jpg` | **Reemplazar** (misma ruta) | Fotografía editorial neutra de **ambiente de trabajo / escritorio profesional cálido** (cuaderno/agenda, café, iluminación natural suave) apta para la sección *Sobre nosotros* de cualquier negocio. Formato optimizado `< 250 KB`. |
| `public/default/images/demo-work-1.jpg` | **Nuevo** (reemplaza `demo-nails-french.jpg`) | Espacio principal de atención moderno y luminoso (arquitectura interior cálida). |
| `public/default/images/demo-work-2.jpg` | **Nuevo** (reemplaza `demo-nails-kapping.jpg`) | Mesa de consulta / atención 1 a 1 con luz natural y estética editorial. |
| `public/default/images/demo-work-3.jpg` | **Nuevo** (reemplaza `demo-nails-nailart.jpg`) | Detalle de organización, materiales y estándares de calidad en el espacio de trabajo. |
| `public/default/images/demo-work-4.jpg` | **Nuevo** (reemplaza `demo-nails-softgel.jpg`) | Sala preparada para recibir clientes con diseño cálido y minimalista. |
| `public/default/images/demo-nails-*.jpg` (×4) | **Eliminar** | Retirar las 4 fotos de uñas del repositorio una vez actualizadas las referencias en `ownerDefaults.ts`, `init.mjs` y tests. |

### 3.2 Actualización de constantes en `src/services/ownerDefaults.ts`
Renombrar las claves de `DEMO_PORTFOLIO_STOCK_IMAGES` de nombres de uñas (`french`, `kapping`, `nailArt`, `softGel`) a claves neutras:

```ts
export const DEMO_PORTFOLIO_STOCK_IMAGES = {
  space: '/default/images/demo-work-1.jpg',
  session: '/default/images/demo-work-2.jpg',
  quality: '/default/images/demo-work-3.jpg',
  experience: '/default/images/demo-work-4.jpg',
} as const;
```

---

## 4. Datos Precargados del Demo (`scripts/cli/commands/init.mjs`)

### 4.1 Perfil del negocio Demo (`ownerProfile` y `tenantDoc`)
- `DEFAULT_DEMO_NAME`: `'Estudio Demo'` → `'Espacio Demo'`
- `ownerProfile.role`: `'Estudio profesional de demostración'` → `'Espacio de demostración interactiva'`
- `ownerProfile.description`: `'Espacio interactivo de muestra para probar reservas online, selección de servicios, adicionales y confirmación de seña.'`

### 4.2 Servicios precargados (3 servicios escalonados multirrubro)

| ID | Nombre | Duración | Precio base | Descripción | Adicionales (`extras`) |
| :--- | :--- | :---: | :---: | :--- | :--- |
| `srv_demo_1` | **Consulta / Servicio Inicial** | `30 min` | `$15.000` | Atención inicial de 30 minutos con evaluación y asesoramiento personalizado. | `Seguimiento posterior` (`$3.500`)<br>`Material de apoyo` (`$4.500`) |
| `srv_demo_2` | **Sesión Estándar** | `60 min` | `$25.000` | Servicio completo de 60 minutos adaptado a tus necesidades y objetivos. | `Extensión de 15 minutos` (`$5.000`)<br>`Atención prioritaria` (`$6.000`) |
| `srv_demo_3` | **Experiencia Integral** | `90 min` | `$36.000` | Atención extendida de 90 minutos con cobertura completa y seguimiento detallado. | `Resumen personalizado` (`$5.500`) |

### 4.3 Trabajos / Galería precargados (4 ítems multirrubro)

| ID | Título | Categoría | Imagen | Descripción |
| :--- | :--- | :--- | :--- | :--- |
| `port_demo_1` | **Espacio Principal de Atención** | `Instalaciones` | `/default/images/demo-work-1.jpg` | Ambiente luminoso y preparado para brindar comodidad y puntualidad en cada turno. |
| `port_demo_2` | **Atención Personalizada 1 a 1** | `Servicios` | `/default/images/demo-work-2.jpg` | Cada encuentro se adapta a tus necesidades con seguimiento claro de principio a fin. |
| `port_demo_3` | **Estándares de Calidad y Detalle** | `Calidad` | `/default/images/demo-work-3.jpg` | Procesos ordenados y materiales seleccionados para garantizar una experiencia consistente. |
| `port_demo_4` | **Experiencia Integral para Clientes** | `Destacados` | `/default/images/demo-work-4.jpg` | Desde la reserva online hasta el cierre del turno, todo pensado para ahorrar tiempo. |

### 4.4 Turnos (`slots`) precargados
- **Cantidad y distribución:** próximos **3 días hábiles** (lunes a sábado), **3 franjas diarias** (`10:00`, `14:00`, `18:30` hora local `-03:00`) = **9 turnos disponibles**.
- **Configuración base por slot:**
  - `serviceName`: `'Turno disponible'` (genérico en lugar del nombre del primer servicio).
  - `services`: los 3 servicios públicos (`publicServices`).
  - `estimatedDurationMinutes`: `30`, `estimatedDuration`: `'30 min'` (bloque mínimo coincidente con `srv_demo_1`).
  - `depositAmount`: `5000`.
- **Demostración en vivo de recargo (Spec 12):**
  - Los turnos de la franja `18:30` incluyen `surcharge: { type: 'fixed', value: 2500, reason: 'Horario extendido' }` (tanto en `slots/{id}` como en `public_meta/availability`), permitiendo validar visualmente el `SurchargeBadge` y el cálculo de recargo directamente en `/demo` sin configuración previa.

---

## 5. Plan de Ejecución y Criterios de Validación

### Orden de implementación
1. **Generar/optimizar las 6 imágenes raster** (`hero-fallback.jpg`, `portrait-fallback.jpg`, `demo-work-1..4.jpg`) y actualizar `logo-fallback.svg`; eliminar `demo-nails-*.jpg`.
2. **Actualizar textos** en `src/texts/**`, `src/services/ownerDefaults.ts`, `public/default/info/owner.json`, `src/config/themePresets.ts` y `functions/src/emailService.ts`.
3. **Actualizar `buildDemoSeedData`** en `scripts/cli/commands/init.mjs` con el nuevo perfil, servicios, galería y turnos.
4. **Actualizar tests** afectados (`tests/unit/turneadoCli.test.ts`, `tests/integration/turneadoCli.test.ts`, `tests/unit/ownerDefaults.test.ts`, `tests/unit/functionsEmail.test.ts`, `tests/integration/ownerService.test.ts`).

### Criterios de aceptación
- [ ] `npx tsc -b`, `npm run lint`, `npm --prefix functions run build` y `npm run build` en verde sin errores.
- [ ] `npm test` (unitarios) y `npm run test:integration` (emuladores) 100% en verde.
- [ ] Grep de verificación confirmando 0 menciones residuales a `estética`, `uñas`, `pestañas`, `kapping`, `en el salón` o `¿Lista para` en textos de UI y correos (excluyendo `STYLE_PACKS`/`HERO_COPY_PRESETS` opt-in).
- [ ] Validación visual en local (`npm run dev:local`) recorriendo `/demo`, `/demo/prices`, `/demo/about`, `/demo/admin` y comprobando nuevas imágenes de stock, servicios, galería y badge de recargo en el turno de las `18:30`.
