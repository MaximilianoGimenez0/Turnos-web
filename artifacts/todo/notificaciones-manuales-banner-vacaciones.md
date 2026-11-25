# TODO — Notificaciones y Banners Manuales en Portada (Vacaciones / Avisos del Negocio)

> **Estado:** Pendiente de especificación e implementación  
> **Prioridad:** Alta (* IMPORTANTE — Requerimiento individual)  
> **Ámbito:** `src/views/AdminView/`, `src/views/ClientView/`, Firestore `tenants/{tenantId}/notifications`, Store  

---

## 1. Contexto y Justificación
Los dueños de negocio necesitan comunicar de manera inmediata situaciones extraordinarias a sus clientes desde la portada de su página de turnos (por ejemplo: "Estoy de vacaciones del 1 al 15 de enero", "El local permanecerá cerrado por reformas este viernes", "Demoras por corte de luz").  
Actualmente no disponen de una herramienta ágil para publicar un aviso destacado sin tener que alterar la bio o los títulos de los servicios.

---

## 2. Requerimientos Funcionales
1. **Gestión en el Panel de Administración (`AdminView`):**
   - Nueva tarjeta o sección accesible: **"Avisos y Notificaciones a Clientes"**.
   - Crear aviso:
     - Título o tipo de aviso (ej. `Vacaciones`, `Aviso importante`, `Información general`).
     - Mensaje descriptivo / texto del aviso.
     - Toggle de activación rápida (Activo / Oculto).
     - Rango de fechas opcional (para que se desactive automáticamente al terminar el período, ej. vacaciones).
   - Edición y eliminación instantánea del aviso.
2. **Visualización en la Portada del Cliente (`ClientView`):**
   - Banner superior (top banner) o card flotante prominente inmediatamente visible debajo del Navbar o sobre el Hero.
   - Diseño sobrio y elegante que no rompa la estética del tema seleccionado (respetando paleta y bordes).
   - Iconografía representativa (ej. sombrilla para vacaciones, megáfono o alerta para avisos).
   - Botón de descartar para el cliente (recordado por sesión en localStorage si es descartable).

---

## 3. Modelo de Datos Tentativo (Firestore)
```typescript
export interface BusinessNotice {
  id: string;
  type: 'vacation' | 'alert' | 'info';
  title: string;
  message: string;
  isActive: boolean;
  startDate?: string;
  endDate?: string;
  createdAt: string;
  updatedAt: string;
}
```

---

## 4. Componentes y Archivos Afectados
- `src/types/index.ts` *(definición de `BusinessNotice`)*
- `src/views/AdminView/` *(nueva sección/modal de gestión de avisos)*
- `src/views/ClientView/ClientView.tsx` *(render del banner de aviso)*
- `src/components/ClientNoticeBanner/` *(nuevo componente visual de aviso)*
- `src/services/noticeService.ts` *(CRUD en Firestore)*

---

## 5. Checklist de Tareas (TODO)
- [ ] Definir interfaz `BusinessNotice` en tipos globales.
- [ ] Crear componente `BusinessNoticeBanner` en la vista de cliente con soporte para temas de apariencia.
- [ ] Crear interfaz de administración en `AdminView` (creación, toggle activo/inactivo, edición, borrado).
- [ ] Implementar persistencia en Firestore bajo el tenant correspondiente.
- [ ] Verificar que si hay fechas de vigencia (ej. vacaciones), el banner se muestre solo en el rango estipulado.
