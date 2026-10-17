/**
 * Utilidades de formato y manejo de fechas en la zona horaria LOCAL del usuario.
 */

/**
 * Formatea un objeto Date a string 'YYYY-MM-DD' en la zona horaria local del navegador.
 * Evita el desfase de zona horaria que ocurre al usar `.toISOString().split('T')[0]`.
 */
export const formatLocalDate = (date: Date): string => {
  if (!date || isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Obtiene la fecha local de hoy en formato 'YYYY-MM-DD'.
 */
export const getTodayLocalDateString = (): string => {
  return formatLocalDate(new Date());
};

/**
 * Agrega N días a la fecha local de hoy y devuelve 'YYYY-MM-DD'.
 */
export const addDaysLocalDateString = (daysFromToday: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return formatLocalDate(d);
};

/**
 * Obtiene el string 'YYYY-MM-DD' de cualquier string de fecha / ISO en la zona horaria local.
 */
export const getLocalDateKeyFromIso = (isoString?: string): string => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return formatLocalDate(d);
};
