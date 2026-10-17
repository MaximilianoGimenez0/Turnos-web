export const VALIDATION_TEXTS = {
  email: {
    required: 'Por favor ingresá un correo electrónico.',
    invalid: 'El formato del correo electrónico es inválido (ej: usuario@dominio.com).',
  },
  phone: {
    required: 'Por favor ingresá un número de teléfono o WhatsApp de contacto.',
    minDigits: 'El número de teléfono debe contener al menos 6 dígitos.',
    maxDigits: 'El número de teléfono no puede superar los 18 dígitos.',
    invalidChars: 'El número de teléfono contiene caracteres no permitidos.',
  },
  text: {
    required: (fieldName: string) => `${fieldName} es obligatorio.`,
    minLength: (fieldName: string, min: number) => `${fieldName} debe tener al menos ${min} caracteres.`,
    maxLength: (fieldName: string, max: number) => `${fieldName} no puede exceder los ${max} caracteres.`,
  },
  positiveInteger: {
    required: (fieldName: string) => `${fieldName} es requerido.`,
    notInteger: (fieldName: string) =>
      `${fieldName} debe ser un número entero positivo sin decimales ni caracteres especiales.`,
    invalidNumber: (fieldName: string) => `${fieldName} debe ser un número válido.`,
    minLimit: (fieldName: string, min: number) =>
      `${fieldName} no puede ser menor a ${min.toLocaleString('es-AR')}.`,
    maxLimit: (fieldName: string, max: number) =>
      `${fieldName} no puede superar el límite de ${max.toLocaleString('es-AR')}.`,
  },
  image: {
    required: 'Tenés que seleccionar un archivo de imagen.',
    invalidFormat: 'Formato de imagen no compatible. Por favor subí archivos JPG, PNG, WebP o SVG.',
    maxSizeExceeded: (fileSizeMb: string, maxSizeMb: number) =>
      `La imagen es demasiado pesada (${fileSizeMb} MB). El tamaño máximo permitido es de ${maxSizeMb} MB.`,
  },
} as const;
