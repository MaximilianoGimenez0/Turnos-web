import React, { forwardRef } from 'react';
import CharCounter from '../CharCounter/CharCounter';
import styles from './Textarea.module.css';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label?: string;
  labelIcon?: React.ReactNode;
  error?: string;
  helperText?: string;
  showCharCount?: boolean;
}

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(
  (
    {
      label,
      labelIcon,
      error,
      helperText,
      id,
      required,
      className = '',
      maxLength,
      showCharCount = false,
      value,
      defaultValue,
      rows = 3,
      ...props
    },
    ref
  ) => {
    const textareaId = id || (label ? label.toLowerCase().replace(/\s+/g, '-') : undefined);
    const currentLength =
      typeof value === 'string'
        ? value.length
        : typeof value === 'number'
          ? String(value).length
          : typeof defaultValue === 'string'
            ? defaultValue.length
            : 0;

    const shouldShowCounter = Boolean(showCharCount && typeof maxLength === 'number' && maxLength > 0);
    const hasMetaRow = Boolean(error || helperText || shouldShowCounter);

    return (
      <div className={`${styles.wrapper} ${className}`.trim()}>
        {label && (
          <label htmlFor={textareaId} className={styles.label}>
            {labelIcon && <span className={styles.labelIcon} aria-hidden="true">{labelIcon}</span>}
            <span>{label}</span>
            {required && <span className={styles.required}>*</span>}
          </label>
        )}

        <textarea
          id={textareaId}
          ref={ref}
          required={required}
          maxLength={maxLength}
          value={value}
          defaultValue={defaultValue}
          rows={rows}
          className={`${styles.textarea} ${error ? styles.hasError : ''}`.trim()}
          {...props}
        />

        {hasMetaRow && (
          <div className={styles.metaRow}>
            <div className={styles.feedback}>
              {error && <span className={styles.errorMessage}>{error}</span>}
              {!error && helperText && <span className={styles.helperText}>{helperText}</span>}
            </div>
            {shouldShowCounter && maxLength && (
              <CharCounter current={currentLength} max={maxLength} />
            )}
          </div>
        )}
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export default Textarea;
