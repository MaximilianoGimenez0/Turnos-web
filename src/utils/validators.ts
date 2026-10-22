import { VALIDATION_TEXTS } from '../texts';

export interface ValidationResult {
  isValid: boolean;
  error?: string;
}

export const validateEmail = (email: string, required = true): ValidationResult => {
  const trimmed = (email || '').trim();

  if (!trimmed) {
    if (!required) return { isValid: true };
    return {
      isValid: false,
      error: VALIDATION_TEXTS.email.required,
    };
  }

  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9-]+(?:\.[a-zA-Z0-9-]+)*\.[a-zA-Z]{2,}$/;
  if (!emailRegex.test(trimmed)) {
    return {
      isValid: false,
      error: VALIDATION_TEXTS.email.invalid,
    };
  }

  return { isValid: true };
};

export const validatePhone = (phone: string, required = true): ValidationResult => {
  const trimmed = (phone || '').trim();

  if (!trimmed) {
    if (!required) return { isValid: true };
    return {
      isValid: false,
      error: VALIDATION_TEXTS.phone.required,
    };
  }

  const digitsOnly = trimmed.replace(/\D/g, '');
  if (digitsOnly.length < 6) {
    return {
      isValid: false,
      error: VALIDATION_TEXTS.phone.minDigits,
    };
  }

  if (digitsOnly.length > 18) {
    return {
      isValid: false,
      error: VALIDATION_TEXTS.phone.maxDigits,
    };
  }

  const phoneCharRegex = /^[+]?[\d\s\-()]+$/;
  if (!phoneCharRegex.test(trimmed)) {
    return {
      isValid: false,
      error: VALIDATION_TEXTS.phone.invalidChars,
    };
  }

  return { isValid: true };
};

export const validateRequiredText = (
  text: string,
  fieldName = 'Este campo',
  minLength = 2,
  maxLength = 150
): ValidationResult => {
  const trimmed = (text || '').trim();

  if (!trimmed) {
    return {
      isValid: false,
      error: VALIDATION_TEXTS.text.required(fieldName),
    };
  }

  if (trimmed.length < minLength) {
    return {
      isValid: false,
      error: VALIDATION_TEXTS.text.minLength(fieldName, minLength),
    };
  }

  if (trimmed.length > maxLength) {
    return {
      isValid: false,
      error: VALIDATION_TEXTS.text.maxLength(fieldName, maxLength),
    };
  }

  return { isValid: true };
};

export const validatePositiveInteger = (
  value: string | number,
  fieldName = 'El valor',
  min = 1,
  max = 5000000
): { isValid: boolean; error?: string; parsedValue?: number } => {
  const strVal = String(value ?? '').trim();

  if (!strVal) {
    return {
      isValid: false,
      error: VALIDATION_TEXTS.positiveInteger.required(fieldName),
    };
  }

  if (!/^\d+$/.test(strVal)) {
    return {
      isValid: false,
      error: VALIDATION_TEXTS.positiveInteger.notInteger(fieldName),
    };
  }

  const num = Number(strVal);
  if (isNaN(num)) {
    return {
      isValid: false,
      error: VALIDATION_TEXTS.positiveInteger.invalidNumber(fieldName),
    };
  }

  if (num < min) {
    return {
      isValid: false,
      error: VALIDATION_TEXTS.positiveInteger.minLimit(fieldName, min),
    };
  }

  if (num > max) {
    return {
      isValid: false,
      error: VALIDATION_TEXTS.positiveInteger.maxLimit(fieldName, max),
    };
  }

  return { isValid: true, parsedValue: num };
};

export const validateImageFile = (
  file: File | null | undefined,
  maxSizeMb = 10,
  required = true
): ValidationResult => {
  if (!file) {
    if (!required) return { isValid: true };
    return {
      isValid: false,
      error: VALIDATION_TEXTS.image.required,
    };
  }

  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/svg+xml'];
  if (!validTypes.includes(file.type.toLowerCase()) && !file.type.startsWith('image/')) {
    return {
      isValid: false,
      error: VALIDATION_TEXTS.image.invalidFormat,
    };
  }

  const maxBytes = maxSizeMb * 1024 * 1024;
  if (file.size > maxBytes) {
    return {
      isValid: false,
      error: VALIDATION_TEXTS.image.maxSizeExceeded(
        (file.size / (1024 * 1024)).toFixed(1),
        maxSizeMb
      ),
    };
  }

  return { isValid: true };
};

export const sanitizeNumericString = (value: string): string => {
  return (value || '').replace(/\D/g, '');
};

export const sanitizePhoneString = (value: string): string => {
  const trimmed = (value || '').replace(/[^\d\s\-()+]/g, '');
  if (trimmed.startsWith('+')) {
    return '+' + trimmed.slice(1).replace(/\+/g, '');
  }
  return trimmed.replace(/\+/g, '');
};
