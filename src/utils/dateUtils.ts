// Evita el desfase de zona horaria provocado por toISOString() en husos con offset negativo
export const formatLocalDate = (date: Date): string => {
  if (!date || isNaN(date.getTime())) return '';
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export const getTodayLocalDateString = (): string => {
  return formatLocalDate(new Date());
};

export const addDaysLocalDateString = (daysFromToday: number): string => {
  const d = new Date();
  d.setDate(d.getDate() + daysFromToday);
  return formatLocalDate(d);
};

export const getLocalDateKeyFromIso = (isoString?: string): string => {
  if (!isoString) return '';
  const d = new Date(isoString);
  if (isNaN(d.getTime())) return '';
  return formatLocalDate(d);
};
