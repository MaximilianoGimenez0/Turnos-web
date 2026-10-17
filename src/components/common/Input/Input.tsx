import React, { forwardRef } from 'react';
import { sanitizeNumericString, sanitizePhoneString } from '../../../utils/validators';
import styles from './Input.module.css';

export interface InputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  error?: string;
  helperText?: string;
  leftIcon?: React.ReactNode;
  rightIcon?: React.ReactNode;
  /**
   * Bloquea caracteres no numéricos en la entrada (letras, símbolos, +, -, e, etc.)
   */
  numericOnly?: boolean;
  /**
   * Permite únicamente caracteres válidos para números telefónicos (+, dígitos, espacios, guiones)
   */
  phoneOnly?: boolean;
  /**
   * Límite máximo de dígitos numéricos
   */
  maxDigits?: number;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      helperText,
      leftIcon,
      rightIcon,
      id,
      required,
      className = '',
      numericOnly = false,
      phoneOnly = false,
      maxDigits,
      onKeyDown,
      onPaste,
      onChange,
      ...props
    },
    ref
  ) => {
    const inputId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
      // Permitir teclas de control del sistema (Backspace, Delete, Tab, Escape, Enter, Flechas, Inicio/Fin)
      const allowedControlKeys = [
        'Backspace',
        'Delete',
        'Tab',
        'Escape',
        'Enter',
        'ArrowLeft',
        'ArrowRight',
        'ArrowUp',
        'ArrowDown',
        'Home',
        'End',
      ];

      // Permitir combinaciones con Ctrl/Cmd (Ctrl+A, Ctrl+C, Ctrl+V, Ctrl+X, Ctrl+Z)
      if (e.ctrlKey || e.metaKey) {
        if (onKeyDown) onKeyDown(e);
        return;
      }

      if (allowedControlKeys.includes(e.key)) {
        if (onKeyDown) onKeyDown(e);
        return;
      }

      if (numericOnly) {
        // Bloquear explícitamente caracteres de notación científica y signos
        if (['e', 'E', '+', '-', '.', ','].includes(e.key)) {
          e.preventDefault();
          return;
        }

        // Si no es un dígito del 0 al 9, bloquear
        if (!/^\d$/.test(e.key)) {
          e.preventDefault();
          return;
        }

        // Si tiene límite de dígitos
        if (maxDigits) {
          const currentDigits = (e.currentTarget.value || '').replace(/\D/g, '');
          const selectionLength = (window.getSelection()?.toString() || '').length;
          if (currentDigits.length >= maxDigits && selectionLength === 0) {
            e.preventDefault();
            return;
          }
        }
      }

      if (phoneOnly) {
        // Caracteres permitidos para teléfono: dígitos, '+', ' ', '-', '(', ')'
        const allowedPhoneChars = /^[\d+\-\s()]$/;
        if (!allowedPhoneChars.test(e.key)) {
          e.preventDefault();
          return;
        }
      }

      if (onKeyDown) {
        onKeyDown(e);
      }
    };

    const handlePaste = (e: React.ClipboardEvent<HTMLInputElement>) => {
      const pastedText = e.clipboardData.getData('text');

      if (numericOnly) {
        e.preventDefault();
        const sanitized = sanitizeNumericString(pastedText);
        const finalValue = maxDigits ? sanitized.slice(0, maxDigits) : sanitized;
        document.execCommand('insertText', false, finalValue);
      } else if (phoneOnly) {
        e.preventDefault();
        const sanitized = sanitizePhoneString(pastedText);
        document.execCommand('insertText', false, sanitized);
      }

      if (onPaste) {
        onPaste(e);
      }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (numericOnly) {
        let clean = sanitizeNumericString(e.target.value);
        if (maxDigits && clean.length > maxDigits) {
          clean = clean.slice(0, maxDigits);
        }
        e.target.value = clean;
      } else if (phoneOnly) {
        e.target.value = sanitizePhoneString(e.target.value);
      }

      if (onChange) {
        onChange(e);
      }
    };

    return (
      <div className={`${styles.wrapper} ${className}`}>
        {label && (
          <label htmlFor={inputId} className={styles.label}>
            {label}
            {required && <span className={styles.required}>*</span>}
          </label>
        )}

        <div
          className={`${styles.inputContainer} ${leftIcon ? styles.hasLeftIcon : ''} ${
            rightIcon ? styles.hasRightIcon : ''
          }`}
        >
          {leftIcon && <span className={styles.leftIcon}>{leftIcon}</span>}
          <input
            id={inputId}
            ref={ref}
            required={required}
            className={`${styles.input} ${error ? styles.hasError : ''}`}
            onKeyDown={handleKeyDown}
            onPaste={handlePaste}
            onChange={handleChange}
            {...props}
          />
          {rightIcon && <span className={styles.rightIcon}>{rightIcon}</span>}
        </div>

        {error && <span className={styles.errorMessage}>{error}</span>}
        {!error && helperText && <span className={styles.helperText}>{helperText}</span>}
      </div>
    );
  }
);

Input.displayName = 'Input';

export default Input;
