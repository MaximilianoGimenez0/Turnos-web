# TODO — Apariencia: Mobile, Estilos Curados, Selector, Variantes y Efectos Visuales

> **Estado:** Pendiente de especificación e implementación  
> **Prioridad:** Media / Alta (Agrupación de mejoras estéticas del módulo de Apariencia)  
> **Ámbito:** `src/views/AdminView/components/AppearanceSettings.tsx`, `src/presets/appearancePresets.ts`, presets de estilo, layout mobile  

---

## 1. Contexto y Objetivos
El editor visual de apariencia (`AppearanceSettings`) ha alcanzado una gran madurez técnica con la vista dual de scroll independiente y preview flotante. Sin embargo, persisten detalles de interacción móvil, inconsistencias de texto en badges y cards, superposición de botones de acción y opciones de estilo poco útiles (ej. tarjeta "compacta") que deben refinarse para una experiencia impecable.

---

## 2. Puntos a Implementar y Corregir (Agrupados)

### A. Slider en Mobile para el Selector de Sección de Apariencia
- **Problema:** En pantallas angostas, el selector de secciones (Identidad, Colores, Tipografía, Botones, etc.) se apila o desborda de forma poco fluida.
- **Solución:** Convertir el selector de secciones en un slider / carrusel horizontal con scroll suave (`snap-x`, `overflow-x-auto`, sin scrollbar visible) y botones indicadores o gradiente sutil de desvanecimiento a los lados para denotar scroll disponible.

### B. "00 Estilos Rápidos" en Mobile: Texto en Una Sola Fila y Badge de Estilo
- **Problema:** En mobile, los títulos de los presets se quiebran en múltiples líneas deformando la altura de las tarjetas, y el badge del tipo de estilo curado desalinea el contenedor.
- **Solución:** Ajustar la tipografía a `truncate` o `whitespace-nowrap` con tamaño dinámico (`text-xs` / `text-sm`), garantizando que título y categoría coexistan en una sola fila armoniosa. Ajustar padding y tamaño del badge curado.

### C. Superposición del Botón "Ver Preview" y Botones "Guardar / Descartar"
- **Problema:** En ciertas alturas de viewport móvil o al desplazarse, la barra flotante de "Ver preview" se solapa físicamente con la barra inferior fija de guardar/descartar cambios.
- **Solución:** Unificar la barra de acción inferior en mobile o apilar z-indexes con espaciado seguro (`bottom-[calc(...)]`), o bien integrar el trigger de preview dentro de la misma barra de acciones de guardado.

### D. Depuración de Variantes de Tarjeta: Eliminar "Compacta" y Agregar Opciones Visuales
- **Problema:** La opción de tarjeta "compacta" no aporta valor visual ni funcional real.
- **Solución:** Reemplazar la opción "compacta" por estilos puramente estéticos y de diseño:
  - Borde izquierdo destacado (`border-l-4`).
  - Sin bordes / Minimalista plana (`border-none` + fondo sutil).
  - Elevada / Flotante con sombra suave (`shadow-md`).
  - Clásica con borde perimetral sutil (`border`).

### E. Reducción de Transparencia en Efecto Glass
- **Problema:** El efecto `glass` (vidrio esmerilado) deja pasar demasiada información del fondo, dificultando la lectura y contraste de textos cuando hay fondos oscuros o con imágenes.
- **Solución:** Calibrar `backdrop-blur` (aumentar a `backdrop-blur-md` o `lg`) y aumentar la opacidad base de la capa de color (ej. de `bg-white/40` a `bg-white/75` en claro y `bg-black/80` en oscuro).

### F. Re-diseño del "Centrado Editorial" en Perfil y Portada
- **Problema:** El centrado editorial actual se siente rígido o desbalanceado entre el avatar, textos y badges de confianza.
- **Solución:** Re-balancear espaciados verticales, jerarquía de escala tipográfica y disposición centrada simétrica para que transmita un estilo de publicación de revista o boutique de diseño.

---

## 3. Componentes y Archivos Afectados
- `src/views/AdminView/components/AppearanceSettings.tsx`
- `src/presets/appearancePresets.ts`
- `src/components/ClientHero/ClientHero.tsx`
- `src/components/ServiceCard/ServiceCard.tsx`
- Clases globales de Tailwind / CSS utilities para glassmorphism

---

## 4. Checklist de Tareas (TODO)
- [ ] Implementar slider horizontal táctil en el selector de secciones de apariencia mobile.
- [ ] Corregir layout de "00 Estilos Rápidos" en mobile (una sola fila para título + ajuste de badge).
- [ ] Reestructurar el footer / floating action bar mobile para eliminar superposición entre preview y guardar.
- [ ] Eliminar variante "compacta" y agregar variantes puramente visuales (borde izquierdo, sin borde, con sombra).
- [ ] Incrementar opacidad y blur en el preset/clases de efecto glass.
- [ ] Pulir el centrado editorial de perfil y portada en `ClientHero`.
