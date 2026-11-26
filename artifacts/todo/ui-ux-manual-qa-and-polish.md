# To-Do: Auditoría Manual UI/UX, Pruebas Punto a Punto y Pulido de Usabilidad (Mobile + Desktop)

Documento vivo para recorrer manualmente cada pantalla, flujo y estado de **Turneado** en **Desktop** y **Mobile/Tablet**, detectar fricciones de usabilidad, simplificar interacciones y registrar ajustes incrementales hasta lograr una experiencia intuitiva de punta a punta.

---

## 1. Metodología de Prueba y Breakpoints de Referencia

### Viewports recomendados para probar cada bloque
- **Mobile chico:** `360×800` y `390×844` (`<= 640px` — menú móvil, apilado vertical, tarjetas de turnos, sheet flotante de Apariencia casi full-screen).
- **Tablet / Compacto:** `768×1024` y `1024×768` (`641px–1120px` — transición entre `.mobileTabsWrapper` `< 1024px`, sidebar desktop `>= 1024px` y colapso de `AppearanceSettings` `<= 1120px`).
- **Desktop estándar:** `1280×720`, `1366×768` y `1440×900` (`>= 1121px` — doble scroll de Apariencia encuadrado en `100dvh`, grilla Bento, tablas/gráficos).

### Reglas transversales a verificar en **todos** los bloques
- [ ] **Sin scroll horizontal accidental:** `document.documentElement.scrollWidth <= window.innerWidth` en `360px`, `768px` y `1366px`.
- [ ] **Modo Claro y Modo Oscuro:** contraste legible en textos secundarios, bordes de inputs, placeholders, badges y estados hover/disabled.
- [ ] **Áreas táctiles en Mobile:** botones, switches, pills, cierres `X` y controles de carrusel cómodos para el pulgar (idealmente `>= 40–44px` de alto o hit-area).
- [ ] **Claridad inmediata (Intuitividad):** ¿una usuaria nueva entiende qué hacer en menos de 3 segundos sin leer aclaraciones largas? ¿Los labels están en español argentino natural y sin tecnicismos?
- [ ] **Teclado y cierre de overlays:** navegación con `Tab`, foco `:focus-visible` claro y cierre con `Escape` en modales, menú mobile y preview flotante.
- [ ] **Estados de borde:** qué se muestra cuando no hay datos (0 turnos, 0 servicios, 0 trabajos), cuando está cargando (`Loader`) y cuando ocurre un error de red o validación.

### Leyenda de estado
- `[ ]` Pendiente de probar
- `[~]` Probado con fricción detectada (registrar detalle en la **Sección 10**)
- `[x]` Probado, pulido y validado en Desktop + Mobile

---

## 2. Bloque A — Rutas Base, Chrome Compartido y Componentes Comunes

### 2.1 Entrada, Resolución de Tenant y Estados de Error ([App.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/App.tsx), [TenantNotFound.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/pages/TenantStatus/TenantNotFound.tsx))
- [ ] `/` redirige limpio a `/demo` mostrando `<Loader fullScreen />` sin parpadeos bruscos.
- [ ] Un slug inexistente (`/no-existe`) muestra pantalla clara, amigable y con acción de salida comprensible en mobile y desktop.
- [ ] Un tenant suspendido muestra mensaje claro sin filtrar información técnica ni dejar botones rotos.

### 2.2 Navbar Público ([Navbar.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/common/Navbar/Navbar.tsx))
- [ ] Probar variantes `floating`, `solid` y `centered` en `390px` y `1440px`: no tapa contenido superior ni queda pegada contra los bordes laterales.
- [ ] Probar las 4 formas de logo (`rounded`, `square`, `circle`, `frameless`): nunca se recorta mal ni empuja el nombre del negocio fuera de la barra en pantallas de `360px`.
- [ ] Menú hamburguesa en mobile: abre suavemente, marca la ruta activa, incluye cambio de tema Claro/Oscuro (`ThemeSwitcher`) si está habilitado, y cierra al tocar un link, backdrop o `Escape`.

### 2.3 Componentes Base ([Button](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/common/Button/Button.module.css), [Input](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/common/Input/Input.module.css), [Textarea](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/common/Textarea/Textarea.module.css), [Loader](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/common/Loader/Loader.tsx), [FloatingWhatsApp](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/common/FloatingWhatsApp/FloatingWhatsApp.tsx), [AlertModal](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/common/AlertModal/AlertModal.tsx))
- [ ] Bajo `shapePreset: 'pill'` + `density: 'compact'`, ningún `<Input>` con ícono izquierdo ni `<Textarea>` recorta texto ni solapa el ícono con el placeholder.
- [ ] `<Loader fullScreen />` bloquea taps/teclas residuales sin desplazamiento del fondo; `<Loader />` inline respira directo sobre su sección sin verse como "caja dentro de caja".
- [ ] `FloatingWhatsApp` en mobile (`390px`) no tapa controles importantes ni texto del footer; al tocarlo abre WhatsApp con mensaje prearmado del negocio.
- [ ] `AlertModal` en mobile no queda pegado a los bordes de la pantalla y los botones Confirmar / Cancelar tienen jerarquía visual clara para evitar borrados accidentales.

---

## 3. Bloque B — Storefront Público del Cliente (`/:tenantSlug`, `/about`, `/prices`, `/payment/*`)

### 3.1 Portada Pública ([ClientHero.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/client/ClientHero/ClientHero.tsx))
- [ ] En mobile (`360px–390px`) y desktop (`1440px`), probar los 5 layouts (`split-right`, `split-left`, `centered`, `overlay-banner`, `minimal-compact`): jerarquía clara entre título, subtítulo, botones y fotografía.
- [ ] Probar `overlay-banner` con foto clara y foto oscura: validar que el scrim garantice lectura AA del título blanco, botones e insignias de confianza (`heroShowTrustPills`).
- [ ] Verificar que el botón primario (*"Ver días y horarios disponibles"*) lleve suave e inmediatamente a la agenda sin confusión, y que el secundario (*"Ver información sobre mí"*) tenga contraste suficiente en Claro y Oscuro.
- [ ] Probar `polaroid` y `floating-caption` con nombres de estudio largos y ubicaciones largas para verificar truncado/salto de línea limpio en mobile.

### 3.2 Agenda y Reserva de Turnos ([ClientView.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/pages/ClientView/ClientView.tsx), [SlotCard.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/slots/SlotCard/SlotCard.tsx), [BookingModal.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/slots/BookingModal/BookingModal.tsx))
- [ ] **Paso de exploración de fechas:** en `360px`, la tira de fechas (`dateStrip`) se desliza fluido con el dedo, las flechas prev/next se entienden y el badge de cantidad de horarios coincide con lo mostrado.
- [ ] **Filtros (Mañana / Tarde + Buscador + Densidad Fichas/Rápido):** cambiar entre vistas es instantáneo y claro; al no haber coincidencias, el botón *"Restablecer filtros"* saca al usuario del callejón sin salida en 1 toque.
- [ ] **Tarjetas de turno (`SlotCard`):** probar `classic`, `accent-bar` y `compact` combinados con `surfaceStyle` (`bordered`, `elevated`, `flat`, `glass`) en Claro y Oscuro. El horario, la seña y el CTA **Reservar** se leen sin ambigüedad.
- [ ] **Flujo del `BookingModal` (prueba end-to-end):**
  - [ ] En mobile ocupa bien el alto sin quedar cortado ni ocultar el botón de confirmar debajo del teclado virtual al escribir nombre/email/teléfono.
  - [ ] Selección de servicio principal + adicionales muestra de inmediato duración/precio total vs. seña online.
  - [ ] El indicador de progreso (`FormProgressTracker`) ayuda realmente o distrae: evaluar si comunica claro cuánto falta para confirmar.
  - [ ] Mensajes de error inline (mail inválido, campo vacío, teléfono incompleto) guían directo al campo a corregir.
  - [ ] Si el estudio no tiene Mercado Pago habilitado, el fallback de contacto por WhatsApp / Instagram es claro y usable.

### 3.3 Galería de Trabajos ([PortfolioGallery.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/portfolio/PortfolioGallery/PortfolioGallery.tsx))
- [ ] Probar los 3 layouts (`grid`, `bento`, `carousel`) en `/` y en `/about` tanto con `<= 2` trabajos, `4` trabajos y `>= 7` trabajos.
- [ ] En `bento` desktop (`>= 768px`) con `>= 3` items: la primera tarjeta luce protagonista sin deformar la foto ni dejar huecos raros debajo; en mobile (`< 768px`) colapsa limpio a 1 columna.
- [ ] En `carousel`: los botones Anterior/Siguiente funcionan con mouse y en mobile el scroll táctil con `scroll-snap` no choca con el scroll vertical de la página.
- [ ] Botón *"Ver más / Ver menos"* en `/` tras el trabajo N°6 expande y contrae sin perder la ubicación visual del usuario.

### 3.4 Sobre Mí, Precios y Pantallas de Pago
- [ ] **[About.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/pages/About/About.tsx):** foto editorial + bio + pilares se leen con buen ritmo en mobile; si no hay trabajos publicados en portfolio, la sección se oculta limpiamente sin espacio vacío sobrante.
- [ ] **[Prices.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/pages/Prices/Prices.tsx):** buscador de servicios responde rápido; tarjetas de precios y adicionales no desbordan valores grandes (`$120.000`) en pantallas de `360px`.
- [ ] **[PaymentSuccess.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/pages/PaymentStatus/PaymentSuccess.tsx) y [PaymentFailure.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/pages/PaymentStatus/PaymentFailure.tsx):** en mobile permiten leer de un vistazo estado del pago, día/horario reservado y botón principal de acción sin scrollear de más.

---

## 4. Bloque C — Login y Navegación del Panel Admin (`/:tenantSlug/login` y `/:tenantSlug/admin`)

### 4.1 Login del Negocio ([Login.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/pages/Login/Login.tsx))
- [ ] Aislamiento visual: mantiene la paleta sobria operativa sin mezclarse con colores extremos del storefront del tenant.
- [ ] Toggle mostrar/ocultar contraseña, manejo de tecla `Enter`, spinner en botón al autenticar y error amigable ante credenciales inválidas.

### 4.2 Shell del Panel ([AdminLayout.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/layouts/AdminLayout/AdminLayout.tsx) y [AdminView.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/pages/AdminView/AdminView.tsx))
- [ ] **Desktop (`>= 1024px`):** sidebar izquierdo se entiende de un vistazo con sus grupos (*Operación*, *Tu página pública*, *Avanzado*); badges numéricos de Agenda y Turnos actualizan en vivo; botón *"Ver web"* abre la vista pública correcta.
- [ ] **Mobile/Tablet (`< 1024px`):**
  - [ ] Header superior de `AdminLayout` + menú desplegable no chocan ni duplican confusamente con la barra sticky `.mobileTabsWrapper`.
  - [ ] Barra horizontal de pestañas móviles (`mobileTabsList`): el indicador de progreso + hint *"Deslizá"* comunica bien qué tabs faltan a la derecha, y el tab activo se auto-centra o queda visible al seleccionarlo.
  - [ ] Sección colapsable *Avanzado / Cobros* es fácil de descubrir pero previene toques accidentales.

---

## 5. Bloque D — Módulos Operativos de `AdminView`

### 5.1 Gestión de Turnos y Creación ([CreateSlotModal.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/slots/CreateSlotModal/CreateSlotModal.tsx), `MultiDatePicker`, `TimeSlotPicker`)
- [ ] **KPIs y barra de período (`AdminView` en `slots` y `agenda`):** en `360px` las 4 stat cards y los filtros `Día / Semana / Mes / Todo` + navegación `< Hoy >` quedan ordenados y legibles sin apretar texto.
- [ ] **Crear turnos:** elegir múltiples fechas + múltiples horarios + confirmar se siente ágil con una mano en mobile; si un horario ya existía, la advertencia explica exactamente cuáles se omitieron/crearon.
- [ ] **Eliminar turno disponible:** flujo rápido con confirmación clara cuando corresponde, sin demoras confusas.

### 5.2 Agenda Confirmada y Asignación Manual ([ConfirmedAgenda.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/admin/ConfirmedAgenda/ConfirmedAgenda.tsx), [AssignSlotModal.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/admin/AssignSlotModal/AssignSlotModal.tsx))
- [ ] Buscador en Agenda encuentra rápido por nombre, teléfono o servicio; en mobile la ficha de turno confirmado muestra horario, servicio, clienta, botón de WhatsApp y estado de pago sin amontonarse.
- [ ] Cuando no hay resultados en el período seleccionado pero sí en otros días/meses, el aviso con botón de 1 clic para expandir el período resulta intuitivo.
- [ ] **Asignación manual (`AssignSlotModal`):** completar clienta + servicio manualmente sobre un horario libre es claro y rápido sin pasos innecesarios.

### 5.3 Servicios y Portfolio ([ServicesManager](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/admin/ServicesManager/ServicesManager.tsx), [PortfolioManager](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/admin/PortfolioManager/PortfolioManager.tsx))
- [ ] Crear/editar un servicio y sus adicionales (duración, precio base, seña) en mobile: campos numéricos cómodos, sin botones cortados y feedback instantáneo al guardar.
- [ ] Subir un trabajo nuevo en `PortfolioManager`: vista previa de imagen antes de subir, contador de caracteres en título/descripción y estado de subida comprensible.

### 5.4 Métricas ([AdminChart.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/admin/AdminChart/AdminChart.tsx))
- [ ] Evaluar lectura de KPIs y barras tanto en `390px` como en `1440px`; anotar fricciones de tooltip táctil, falta de filtros o métricas faltantes para cruzarlas con [`analytics-dashboard-redesign.md`](file:///d:/Projects/Portfolio%20personal/Turnos-web/artifacts/todo/analytics-dashboard-redesign.md).

### 5.5 Mi Perfil y Configuración de Cobros ([OwnerSettings](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/admin/OwnerSettings/OwnerSettings.tsx), [PaymentSettingsManager](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/admin/PaymentSettings/PaymentSettingsManager.tsx))
- [ ] Subir logo, retrato y foto de portada en mobile y desktop: crop/aspecto legible en preview, botón quitar/reemplazar claro y loader bloqueante correcto.
- [ ] Conectar/desconectar Mercado Pago: estado visual inequívoco (Conectado / Desconectado / Error de token), indicador `PaymentProgress` entendible sin jerga de API.

---

## 6. Bloque E — Editor de Apariencia ([AppearanceSettings.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/admin/AppearanceSettings/AppearanceSettings.tsx), [AppearanceLivePreview.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/components/admin/AppearanceSettings/AppearanceLivePreview.tsx))

### 6.1 Ergonomía en Desktop (`1280×720`, `1366×768`, `1440×900`, `>= 1121px`)
- [ ] Al entrar a la pestaña *Apariencia*, toda la card entra en `100dvh` sin scroll vertical externo en `window` (`Guardar apariencia`, `Descartar`, `Restaurar`, `Deshacer/Rehacer` visibles de entrada).
- [ ] **Scroll izquierdo (`.controlsColumn`)** y **scroll derecho (`.previewColumn`)** se mueven de forma 100% independiente sin arrastrarse entre sí (`overscroll-behavior: contain`).
- [ ] Al cambiar de tab (*Estilos rápidos* / *Colores* / *Tipografía* / *Portada*), el panel izquierdo vuelve arriba automáticamente sin perder la posición en que estabas inspeccionando la preview.
- [ ] La cabecera de preview (`Borrador` | `Publicado`, `Claro` | `Oscuro`) se mantiene fija arriba al scrollear la preview hasta el bloque de correo electrónico.

### 6.2 Ergonomía en Mobile y Tablet (`360px`, `390px`, `768px`, `<= 1120px`)
- [ ] La barra de 4 pestañas horizontales de Apariencia se entiende y desliza fácil sin confundirse con las pestañas del `AdminView`.
- [ ] El botón flotante **"Ver preview"** permanece cómodo arriba a la derecha de la zona inferior sin tapar inputs ni cards; cuando hay cambios sin guardar (`.stickySaveBar` visible), se eleva por encima y deja libres `Deshacer`, `Descartar` y `Guardar`.
- [ ] Al tocar **"Ver preview"**, se abre el diálogo flotante casi a pantalla completa con scroll fluido, el fondo queda bloqueado, el botón alterna a **"Ocultar preview"** y cierra limpio con `X`, backdrop, `Escape` o el propio botón.

### 6.3 Controles Internos y Fidelidad de Preview
- [ ] Aplicar cualquiera de los 7 **Packs rápidos** y deshacer con **Deshacer / Ctrl+Z** restaura exactamente todos los parámetros previos.
- [ ] **Colores y Semáforo WCAG AA Dual:** al poner un fondo oscuro en modo claro se muestra el aviso inteligente con botón *"Usar modo Oscuro como inicial"*.
- [ ] **Portada y Tienda:** verificar compatibilidad `polaroid` + formas curvas (`arch`/`circle`/`organic`), bloqueo informativo en `overlay-banner`, toggle **"Mostrar insignias de confianza en la portada"** reflejado en vivo en la preview, **Galería (`grid`/`bento`/`carousel`)**, **WhatsApp flotante** y **Correo sincronizado**.
- [ ] Guardar cambios muestra `Loader fullScreen`, vuelve arriba, muestra toast de confirmación de 5s y se refleja de inmediato en `/:tenantSlug` y `/:tenantSlug/about`.

---

## 7. Bloque F — Consola SuperAdmin (`/superadmin/login` y `/superadmin`)

- [ ] **[SuperAdminLogin.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/pages/SuperAdminLogin/SuperAdminLogin.tsx):** login limpio, manejo de permisos no autorizados claro.
- [ ] **[SuperAdminView.tsx](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/pages/SuperAdminView/SuperAdminView.tsx):** alta de nuevo tenant, edición de slug/estado, filtros y navegación en pantalla de `390px` vs. `1440px` sin desbordes de tabla/tarjetas.

---

## 8. Bloque G — Comprobación y Curación de Todos los Presets de Apariencia ([themePresets.ts](file:///d:/Projects/Portfolio%20personal/Turnos-web/src/config/themePresets.ts))

Checklist completo para validar cada preset en **vista pública (`/`, `/about`, `/prices`, `BookingModal`)**, en **Claro + Oscuro** y en **Desktop + Mobile**, decidiendo si el equilibrio cromático, tipográfico y de contraste se siente real o requiere curación.

> **Criterios rápidos de curación:**
> - ¿Las superficies Claro/Oscuro se distinguen bien entre fondo (`--bg-body`), tarjetas (`--bg-surface`) y sutiles (`--bg-surface-subtle`)?
> - ¿El botón primario (`solid`, `soft`, `outline`), los links y los badges mantienen contraste cómodo a simple vista además de cumplir WCAG AA?
> - ¿El pairing tipográfico funciona bien tanto en títulos largos de Hero en `360px` como en horarios/precios compactos?
> - ¿Las tramas de fondo en intensidad `vivid` respetan la lectura sin generar ruido visual?

### 8.1 Los 7 Packs de Estilo Completos (`STYLE_PACKS`)
- [ ] **`nail-lash-atelier` (*Atelier Uñas & Pestañas*):** revisar `blush-peony` + `blush` + `editorial` + `rounded` + `elevated` + `arch` / `minimal-border` + `bento` en Claro/Oscuro.
- [ ] **`barber-classic` (*Barbería Clásica*):** revisar `cocoa-mocha` + `warm` (`defaultMode: dark`) + `classic` + `sharp` + `diagonal` + `double-line` + `accent-bar` en Oscuro y al pasar a Claro.
- [ ] **`spa-botanical` (*Spa & Bienestar Botánico*):** revisar `sage-botanical` + `sage` + `atelier` + `pill` + `glass` + `buttonStyle: soft` + `mesh-glow` + `centered` / `organic` / `editorial-mat` + `carousel` + WhatsApp flotante.
- [ ] **`clinical-studio` (*Consultorio Clínico*):** revisar `clinical-teal` + `paper` + `clinical` + `soft` + `bordered` + `square` / `minimal-border` + `compact` + `motionPreset: subtle`.
- [ ] **`urban-minimal` (*Estudio Minimal Urbano*):** revisar `noir-minimal` + `paper` + `minimal` + `sharp` + `flat` + `outline` + `grid` + `compact` + `minimal-compact` / `landscape` / `offset-accent` + logo `frameless`.
- [ ] **`tattoo-art` (*Tattoo & Arte*):** revisar `burgundy-noir` + `neutral` (`defaultMode: dark`) + `expressive` (`Syne`) + `sharp` + `elevated` + `dots` + `overlay-banner` + `bento` + `accent-bar` (chequear legibilidad del título `Syne` sobre foto en mobile).
- [ ] **`pilates-wellness` (*Pilates & Movimiento*):** revisar `pilates-sand` + `warm` + `friendly` + `rounded` + `elevated` + `soft` + `soft-gradient` + `arch` / `floating-caption` + `carousel`.

### 8.2 Las 24 Paletas (`PALETTE_PRESETS`) en Claro + Oscuro + Botones + Email
- **Estética & Editorial:**
  - [ ] `rose-editorial` (*Rosa Editorial*, default `warm`)
  - [ ] `blush-peony` (*Peonía Suave*, default `blush`)
  - [ ] `burgundy-noir` (*Borgoña Atelier*, default `warm`)
  - [ ] `plum-velvet` (*Ciruela Terciopelo*, default `neutral`)
- **Tierra & Boutique:**
  - [ ] `terracotta-warm` (*Terracota Cálida*, default `warm`)
  - [ ] `champagne-bronze` (*Bronce Champagne*, default `warm`)
  - [ ] `cocoa-mocha` (*Cacao & Moka*, default `warm`)
  - [ ] `amber-honey` (*Ámbar Dorado*, default `warm`)
- **Botánica & Spa:**
  - [ ] `sage-botanical` (*Salvia Botánica*, default `sage`)
  - [ ] `eucalyptus-mist` (*Eucalipto Spa*, default `cool`)
  - [ ] `olive-grove` (*Oliva Orgánica*, default `warm`)
  - [ ] `ocean-slate` (*Pizarra Marina*, default `cool`)
- **Minimal & Estudios:**
  - [ ] `noir-minimal` (*Noir Minimal*, default `paper` — verificar distinción de estados hover/outline en negro/blanco)
  - [ ] `midnight-indigo` (*Índigo Nocturno*, default `cool`)
  - [ ] `lavender-silk` (*Lavanda Seda*, default `neutral`)
  - [ ] `crimson-studio` (*Carmín Estudio*, default `paper`)
- **Vibrante & Creativo:**
  - [ ] `coral-sunset` (*Coral Atardecer*, default `warm`)
  - [ ] `electric-cobalt` (*Cobalto Eléctrico*, default `paper`)
  - [ ] `emerald-jewel` (*Esmeralda Joya*, default `sage`)
  - [ ] `orchid-vivid` (*Orquídea Intensa*, default `blush`)
- **Clínico & Bienestar:**
  - [ ] `clinical-teal` (*Turquesa Clínico*, default `paper`)
  - [ ] `nordic-blue` (*Azul Nórdico*, default `cool`)
  - [ ] `pilates-sand` (*Arena Pilates*, default `warm`)
  - [ ] `titanium-slate` (*Grafito Titanio*, default `paper`)

### 8.3 Superficies, Temperaturas y Fondos
- [ ] **6 Temperaturas (`SURFACE_TEMPERATURES`):** `warm` (*Cálida*), `neutral` (*Neutra*), `cool` (*Fría*), `paper` (*Galería Pura*), `blush` (*Seda Rosada*), `sage` (*Lino Botánico*) — curar contraste de `--bg-body` vs `--bg-surface` en Oscuro.
- [ ] **4 Estilos de Tarjeta (`SURFACE_STYLES`):** `bordered`, `elevated`, `flat`, `glass` — verificar diferencia clara en Claro y Oscuro sobre `SlotCard`, `PortfolioCard`, `About` y `BookingModal`.
- [ ] **6 Fondos × 3 Intensidades (`BACKGROUND_STYLES` × `BACKGROUND_INTENSITIES`):** `solid`, `soft-gradient`, `mesh-glow`, `dots`, `grid`, `diagonal` en `subtle` / `balanced` / `vivid`. Confirmar que `vivid` en Claro y Oscuro no compita con textos sueltos fuera de tarjetas.

### 8.4 Tipografía, Escalas, Geometría y Botones
- [ ] **8 Pairings Tipográficos (`FONT_PAIRINGS`):** `editorial` (*Cormorant Garamond*), `classic` (*Playfair*), `modern` (*Outfit*), `minimal` (*Space Grotesk*), `atelier` (*Fraunces*), `clinical` (*Manrope*), `expressive` (*Syne*), `friendly` (*Lora + Nunito Sans*) — chequear carga real de Google Fonts, pesos, saltos de línea en `360px` y legibilidad de cifras/precios.
- [ ] **3 Escalas de Texto (`TEXT_SCALES`) × 3 Densidades (`DENSITY_SCALES`):** `sm`/`md`/`lg` × `compact`/`comfortable`/`spacious` — verificar que `lg + compact` ni `sm + spacious` rompan tarjetas o inputs.
- [ ] **4 Formas (`SHAPE_PRESETS`) × 3 Botones (`BUTTON_STYLES`):** `sharp`, `soft`, `rounded`, `pill` × `solid`, `soft`, `outline` — probar `pill + outline` en Oscuro, `sharp + soft` y emails transaccionales.

### 8.5 Portada, Textos Curados y Storefront
- [ ] **5 Layouts Hero (`HERO_LAYOUTS`):** `split-right`, `split-left`, `centered`, `overlay-banner`, `minimal-compact`.
- [ ] **6 Siluetas (`HERO_IMAGE_SHAPES`) × 6 Marcos (`HERO_IMAGE_FRAMES`):** `portrait`, `arch`, `circle`, `square`, `landscape`, `organic` × `editorial-mat`, `minimal-border`, `double-line`, `offset-accent`, `polaroid`, `floating-caption` (curar recorte de `floating-caption` y proporcionalidad de `offset-accent`).
- [ ] **8 Presets de Copy (`HERO_COPY_PRESETS`) × 3 Resaltados (`HERO_HIGHLIGHT_STYLES`):** `editorial-beauty`, `modern-studio`, `wellness-calm`, `barber-craft`, `clinical-trust`, `boutique-luxury`, `direct-action`, `warm-welcome` × `accent` / `italic` / `underline` — revisar tono natural y extensión en mobile.
- [ ] **Storefront y Ritmo:** `navbarStyle` (`floating`, `solid`, `centered`), `logoShape` (`rounded`, `square`, `circle`, `frameless`), `portfolioLayout` (`grid`, `bento`, `carousel`), `slotCardStyle` (`classic`, `accent-bar`, `compact`), `motionPreset` (`fluid`, `subtle`, `none`).

---

## 9. Registro de Pruebas por Pasada (Bitácora de Sesiones)

| Fecha | Viewport / Dispositivo | Bloque probado | Modo (Claro/Oscuro) | Resultado | Notas rápidas |
| :--- | :--- | :--- | :--- | :--- | :--- |
| _AAAA-MM-DD_ | `1440×900` Desktop | _Ej. Bloque E - Apariencia_ | Claro + Oscuro | `[ ]` | _Completar al probar_ |
| _AAAA-MM-DD_ | `390×844` Mobile | _Ej. Bloque B - Reserva_ | Claro + Oscuro | `[ ]` | _Completar al probar_ |
| _AAAA-MM-DD_ | `768×1024` Tablet | _Ej. Bloque G - Presets_ | Claro + Oscuro | `[ ]` | _Completar al probar_ |

---

## 10. Backlog Vivo de Fricciones UI y Curación de Presets

A medida que pruebes cada ítem anterior, anotá acá cualquier incomodidad, preset desbalanceado, paso de más, texto poco claro o problema visual para atacarlo en tandas cortas:

- **Prioridad:**
  - `P0` — Bloqueante / rompe layout o impide completar acción en mobile o desktop.
  - `P1` — Fricción alta / obliga a scrollear de más, confunde al usuario o preset con mala legibilidad.
  - `P2` — Pulido visual / ajuste fino de tono en preset / microcopy / espaciado.

| ID | Prioridad | Bloque / Archivo / Preset | Viewport | Fricción u observación de curación | Solución propuesta | Estado |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `UI-01` | `P1` | _Ej. BookingModal / ClientView_ | Mobile `390px` | _Completar al probar_ | _Completar cambio concreto_ | `[ ]` |
| `PRE-01` | `P2` | _Ej. Pack / Paleta / FontPairing_ | Claro + Oscuro | _Completar evaluación de contraste o proporción_ | _Ajustar tokens en themePresets.ts_ | `[ ]` |

---

## 11. Flujo Sugerido de Trabajo Iterativo
1. Elegí **1 bloque por sesión** (recomendado empezar por **Bloque B** como cliente final en Mobile `390×844`, luego **Bloque E** y **Bloque G** en Desktop + Mobile, y luego **Bloques D / C / F**).
2. Marcá los checkboxes `[ ]` $\to$ `[x]` o `[~]` y registrá cada hallazgo o ajuste de preset en la tabla de la **Sección 10**.
3. Al juntar 3–5 mejoras concretas de `P0`/`P1` o ajustes en `themePresets.ts`, implementalas en una pasada focalizada, validá en navegador y ejecutá `npm run lint`, `npm run build` y `npm test` antes de pasar al siguiente bloque.
