import { describe, it, expect } from 'vitest';
import {
  validateEmail,
  validatePhone,
  validateRequiredText,
  validatePositiveInteger,
  validateImageFile,
  sanitizeNumericString,
  sanitizePhoneString,
} from '../../src/utils/validators';

describe('validators - Validación y sanitización de formularios', () => {
  describe('validateEmail', () => {
    it('acepta emails con formato estándar válido', () => {
      expect(validateEmail('test@example.com').isValid).toBe(true);
      expect(validateEmail('lucia.perez+1@turnos.com.ar').isValid).toBe(true);
    });

    it('falla con emails sin @, sin dominio o con caracteres inválidos', () => {
      expect(validateEmail('invalido').isValid).toBe(false);
      expect(validateEmail('invalido@').isValid).toBe(false);
      expect(validateEmail('@dominio.com').isValid).toBe(false);
      expect(validateEmail('test@dominio').isValid).toBe(false);
    });

    it('requiere email por defecto si está vacío', () => {
      const result = validateEmail('');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('permite email vacío si required es false', () => {
      expect(validateEmail('', false).isValid).toBe(true);
      expect(validateEmail('   ', false).isValid).toBe(true);
    });

    it('hace trim al email antes de validar', () => {
      expect(validateEmail('  usuario@mail.com  ').isValid).toBe(true);
    });
  });

  describe('validatePhone', () => {
    it('acepta teléfonos válidos con formato nacional e internacional', () => {
      expect(validatePhone('+54 9 11 2345-6789').isValid).toBe(true);
      expect(validatePhone('1123456789').isValid).toBe(true);
      expect(validatePhone('(011) 4567-8901').isValid).toBe(true);
    });

    it('falla si contiene menos de 6 dígitos numéricos', () => {
      const result = validatePhone('12345');
      expect(result.isValid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('falla si contiene más de 18 dígitos numéricos', () => {
      const result = validatePhone('1234567890123456789');
      expect(result.isValid).toBe(false);
    });

    it('falla si contiene letras o caracteres no permitidos', () => {
      expect(validatePhone('11223344abc').isValid).toBe(false);
      expect(validatePhone('11-22-33#44').isValid).toBe(false);
    });

    it('permite teléfono vacío si required es false', () => {
      expect(validatePhone('', false).isValid).toBe(true);
    });
  });

  describe('validateRequiredText', () => {
    it('acepta textos de longitud permitida', () => {
      expect(validateRequiredText('Lifting de pestañas', 'Servicio').isValid).toBe(true);
    });

    it('falla si está vacío o sólo contiene espacios', () => {
      const result = validateRequiredText('   ', 'Nombre');
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('Nombre');
    });

    it('valida la longitud mínima configurada', () => {
      const result = validateRequiredText('a', 'Título', 3);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('3 caracteres');
    });

    it('valida la longitud máxima configurada', () => {
      const result = validateRequiredText('Texto muy largo', 'Título', 1, 5);
      expect(result.isValid).toBe(false);
      expect(result.error).toContain('5 caracteres');
    });
  });

  describe('validatePositiveInteger', () => {
    it('parsea enteros positivos válidos', () => {
      const result = validatePositiveInteger('15000', 'Precio');
      expect(result.isValid).toBe(true);
      expect(result.parsedValue).toBe(15000);
    });

    it('acepta números nativos', () => {
      const result = validatePositiveInteger(45, 'Duración');
      expect(result.isValid).toBe(true);
      expect(result.parsedValue).toBe(45);
    });

    it('falla con números decimales o caracteres no numéricos', () => {
      expect(validatePositiveInteger('15.5', 'Precio').isValid).toBe(false);
      expect(validatePositiveInteger('15,000', 'Precio').isValid).toBe(false);
      expect(validatePositiveInteger('abc', 'Precio').isValid).toBe(false);
    });

    it('falla si es menor al mínimo o mayor al máximo', () => {
      expect(validatePositiveInteger(0, 'Precio', 1, 1000).isValid).toBe(false);
      expect(validatePositiveInteger(1500, 'Precio', 1, 1000).isValid).toBe(false);
    });
  });

  describe('validateImageFile', () => {
    it('acepta archivos de imagen válidos dentro del límite', () => {
      const mockFile = new File(['dummy content'], 'foto.jpg', { type: 'image/jpeg' });
      expect(validateImageFile(mockFile, 5).isValid).toBe(true);
    });

    it('rechaza archivos que no sean imágenes', () => {
      const pdfFile = new File(['pdf content'], 'doc.pdf', { type: 'application/pdf' });
      const result = validateImageFile(pdfFile);
      expect(result.isValid).toBe(false);
    });

    it('rechaza archivos que excedan el tamaño máximo en MB', () => {
      // Creamos un Blob simulado mayor a 2MB
      const bigBuffer = new Uint8Array(3 * 1024 * 1024);
      const bigFile = new File([bigBuffer], 'heavy.png', { type: 'image/png' });
      const result = validateImageFile(bigFile, 2);
      expect(result.isValid).toBe(false);
    });

    it('permite archivo vacío o null si required es false', () => {
      expect(validateImageFile(null, 5, false).isValid).toBe(true);
      expect(validateImageFile(undefined, 5, false).isValid).toBe(true);
    });

    it('falla si es null y required es true', () => {
      expect(validateImageFile(null, 5, true).isValid).toBe(false);
    });
  });

  describe('sanitizeNumericString', () => {
    it('elimina todo lo que no sea dígito', () => {
      expect(sanitizeNumericString('$ 15.000,00')).toBe('1500000');
      expect(sanitizeNumericString('abc-123_456')).toBe('123456');
    });

    it('maneja strings vacíos o undefined de forma segura', () => {
      expect(sanitizeNumericString('')).toBe('');
      expect(sanitizeNumericString(null as unknown as string)).toBe('');
    });
  });

  describe('sanitizePhoneString', () => {
    it('conserva el prefijo + inicial y remueve otros caracteres extraños', () => {
      expect(sanitizePhoneString('+54 9 (11) 2345-6789')).toBe('+54 9 (11) 2345-6789');
      expect(sanitizePhoneString('++54++9 11')).toBe('+549 11');
      expect(sanitizePhoneString('11-2233-4455')).toBe('11-2233-4455');
    });
  });
});
