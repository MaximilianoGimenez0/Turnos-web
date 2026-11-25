# TODO — Admin: Correcciones de Scroll, Sidebar Fijo, Medios y Nombres Genéricos

> **Estado:** Pendiente de especificación e implementación  
> **Prioridad:** Media / Alta (Operaciones y UX del panel administrativo)  
> **Ámbito:** `src/views/AdminView/`, gestión de servicios, uploader de portfolio y perfil, layout general  

---

## 1. Contexto y Objetivos
El panel de administración presenta fricciones operativas que deterioran la experiencia diaria del profesional:
- Pérdida de foco y saltos de scroll al crear o editar servicios.
- Inestabilidad o saltos de posición en el sidebar de navegación.
- Falta de feedback visual (barra de progreso) al cargar imágenes pesadas en el portfolio.
- Dropzones de subida de imágenes en perfil e identidad poco integrados estéticamente.
- Textos o labels genéricos confusos (ej: "¿Lista? NO").

---

## 2. Requerimientos Detallados por Módulo

### A. Scroll Automático al Crear o Editar un Servicio
- **Problema:** Al pulsar "Crear nuevo servicio" o "Editar", el formulario aparece fuera de la zona visible o la página no scrollea al inicio del formulario/modal, desorientando al usuario.
- **Solución:** Implementar `scrollIntoView({ behavior: 'smooth', block: 'start' })` o foco automático en el primer input del formulario al abrir el modo creación o edición.

### B. Fijar Posición del Sidebar en AdminView
- **Problema:** En desktop, al scrollear contenidos largos de turnos o configuración, el sidebar cambia de posición o scrollea junto con el contenido perdiendo el acceso a la navegación.
- **Solución:** Fijar el sidebar con `sticky top-0 h-screen` o arquitectura de layout fija (`h-screen overflow-hidden` con scroll exclusivo en el área de contenido principal `<main>`).

### C. Armonía Visual en el Div de Subir Imagen (Perfil e Identidad de Estudio)
- **Problema:** La zona de dropzone de imágenes en el perfil de estudio se percibe desarticulada respecto al resto de los inputs (bordes toscos, iconos desproporcionados).
- **Solución:** Rediseñar la dropzone con bordes redondeados consistentes (`rounded-2xl`), estados hover claros, preview redondeada con botón de cambio/eliminación superpuesto y proporciones armónicas con el avatar real.

### D. Barra de Progreso al Subir Trabajo al Portfolio
- **Problema:** Al subir fotos de trabajos al portfolio, si la imagen es pesada o la conexión lenta, no hay indicación de progreso más que un spinner genérico, generando incertidumbre.
- **Solución:** Conectar el upload task de Firebase Storage (`uploadBytesResumable`) para calcular el porcentaje real `(bytesTransferred / totalBytes) * 100` y mostrar una barra de progreso animada con porcentaje visible.

### E. Auditoría y Eliminación de Nombres Genéricos Confusos
- **Problema:** Existen labels internos o textos poco profesionales como "¿Lista? NO", "¿Activo? Sí/No", etc.
- **Solución:** Auditar todo el panel administrativo y reemplazar copy ambiguo por términos claros y profesionales:
  - Cambiar "¿Lista? NO" por toggles descriptivos como "Visualización: En grilla / En lista".
  - Aclarar estados de disponibilidad y switches con labels descriptivos ("Servicio visible para clientes", "Habilitado").

---

## 3. Componentes y Archivos Afectados
- `src/views/AdminView/AdminView.tsx` *(layout, sidebar sticky, gestión de vistas)*
- `src/views/AdminView/components/ServiceManager.tsx` *(scroll al crear/editar, copy)*
- `src/views/AdminView/components/PortfolioManager.tsx` *(upload task con progress bar)*
- `src/views/AdminView/components/ProfileSettings.tsx` *(diseño de uploader de identidad)*

---

## 4. Checklist de Tareas (TODO)
- [ ] Implementar scroll suave y autofocus al crear y editar servicios.
- [ ] Asegurar sidebar fijo/sticky en `AdminView` sin desfasajes de layout en desktop.
- [ ] Rediseñar la zona de carga de avatar e imagen de portada en perfil e identidad de estudio.
- [ ] Reemplazar spinner ciego por barra de progreso porcentual en la subida a portfolio (`Firebase Storage`).
- [ ] Auditar strings de la UI en admin y erradicar labels confusos ("¿Lista? NO", etc.).
