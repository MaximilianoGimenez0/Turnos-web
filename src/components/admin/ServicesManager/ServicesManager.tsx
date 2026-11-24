import React, { useMemo, useRef, useState } from 'react';
import {
  Plus,
  Trash2,
  Edit3,
  Layers,
  X,
  Check,
  Clock,
} from 'lucide-react';
import type { ServiceItem } from '../../../types';
import { useServices } from '../../../context/ServicesContext';
import { useTenant } from '../../../context/TenantContext';
import {
  addService,
  updateService,
  deleteService,
} from '../../../services/servicesService';
import { formatEstimatedDuration } from '../../../services/bookingHelper';
import {
  validateOptionalText,
  validatePositiveInteger,
  validateRequiredText,
} from '../../../utils/validators';
import { FIELD_LIMITS } from '../../../config/fieldLimits';
import Input from '../../common/Input/Input';
import Textarea from '../../common/Textarea/Textarea';
import Button from '../../common/Button/Button';
import Loader from '../../common/Loader/Loader';
import AlertModal, { type AlertModalType } from '../../common/AlertModal';
import FormProgressTracker from '../../common/FormProgressTracker';
import { SERVICES_MANAGER_TEXTS } from '../../../texts';
import {
  buildServiceProgressSteps,
  computeServicePriceSummary,
  createEmptyExtraRow,
  evaluateEditableExtraRows,
  mapExtrasToEditableRows,
  SERVICE_DURATION_PRESETS,
  SERVICE_STEP_IDS,
  type EditableExtraRow,
} from './serviceFormUtils';
import styles from './ServicesManager.module.css';

export const ServicesManager: React.FC = () => {
  const { tenantId } = useTenant();
  const { services, loading } = useServices();
  const [actionLoadingText, setActionLoadingText] = useState<string | null>(null);

  const [isEditorOpen, setIsEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editingOriginalName, setEditingOriginalName] = useState<string>('');

  const [name, setName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [description, setDescription] = useState('');

  const [extraRows, setExtraRows] = useState<EditableExtraRow[]>([]);
  const [showExtraErrors, setShowExtraErrors] = useState(false);

  const [servicePendingDelete, setServicePendingDelete] = useState<ServiceItem | null>(null);

  const editorSectionRef = useRef<HTMLDivElement | null>(null);
  const extraNameInputRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const extraSeqRef = useRef(0);

  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type?: AlertModalType;
    details?: string[];
  }>({
    isOpen: false,
    message: '',
    type: 'warning',
  });

  const closeAlert = () => {
    setAlertState((prev) => ({ ...prev, isOpen: false }));
  };

  const extrasEval = useMemo(() => evaluateEditableExtraRows(extraRows), [extraRows]);

  const priceSummary = useMemo(
    () => computeServicePriceSummary(basePrice, extrasEval.validExtras),
    [basePrice, extrasEval.validExtras]
  );

  const parsedDuration = useMemo(() => {
    const check = validatePositiveInteger(
      durationMinutes,
      SERVICES_MANAGER_TEXTS.form.durationField,
      5,
      480
    );
    return durationMinutes.trim().length > 0 && check.isValid && check.parsedValue !== undefined
      ? check.parsedValue
      : null;
  }, [durationMinutes]);

  const progressSteps = useMemo(
    () =>
      buildServiceProgressSteps({
        name,
        description,
        basePrice,
        durationMinutes,
        extrasEval,
      }),
    [name, description, basePrice, durationMinutes, extrasEval]
  );

  const resetFormState = () => {
    setEditingId(null);
    setEditingOriginalName('');
    setName('');
    setBasePrice('');
    setDurationMinutes('60');
    setDescription('');
    setExtraRows([]);
    setShowExtraErrors(false);
  };

  const handleOpenCreateEditor = () => {
    resetFormState();
    setIsEditorOpen(true);
    window.requestAnimationFrame(() => {
      editorSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
      const nameInput = document.getElementById('service-input-name');
      if (nameInput instanceof HTMLInputElement) {
        nameInput.focus({ preventScroll: true });
      }
    });
  };

  const handleCloseEditor = () => {
    resetFormState();
    setIsEditorOpen(false);
  };

  const handleEditService = (serviceItem: ServiceItem) => {
    setEditingId(serviceItem.id);
    setEditingOriginalName(serviceItem.name);
    setName(serviceItem.name);
    setBasePrice(String(serviceItem.basePrice));
    setDurationMinutes(String(serviceItem.durationMinutes || 60));
    setDescription(serviceItem.description || '');
    setExtraRows(mapExtrasToEditableRows(serviceItem.extras));
    setShowExtraErrors(false);
    setIsEditorOpen(true);

    window.requestAnimationFrame(() => {
      editorSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  };

  const handleAppendExtraRow = () => {
    extraSeqRef.current += 1;
    const nextRow = createEmptyExtraRow(extraSeqRef.current);
    setExtraRows((prev) => [...prev, nextRow]);
    window.requestAnimationFrame(() => {
      extraNameInputRefs.current[nextRow.rowKey]?.focus();
    });
  };

  const handleUpdateExtraRow = (rowKey: string, field: 'name' | 'price', value: string) => {
    const cleanValue =
      field === 'price' ? value.replace(/\D/g, '').slice(0, 7) : value;
    setExtraRows((prev) =>
      prev.map((row) => (row.rowKey === rowKey ? { ...row, [field]: cleanValue } : row))
    );
  };

  const handleRemoveExtraRow = (rowKey: string) => {
    setExtraRows((prev) => prev.filter((row) => row.rowKey !== rowKey));
  };

  const handleExtraKeyDown = (
    e: React.KeyboardEvent<HTMLInputElement>,
    rowIndex: number
  ) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    if (rowIndex === extraRows.length - 1) {
      handleAppendExtraRow();
    } else {
      const nextRow = extraRows[rowIndex + 1];
      if (nextRow) {
        extraNameInputRefs.current[nextRow.rowKey]?.focus();
      }
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameValidation = validateRequiredText(
      name,
      SERVICES_MANAGER_TEXTS.form.nameField,
      FIELD_LIMITS.service.name.min,
      FIELD_LIMITS.service.name.max
    );
    if (!nameValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: SERVICES_MANAGER_TEXTS.alerts.nameRequiredTitle,
        message: nameValidation.error || SERVICES_MANAGER_TEXTS.alerts.nameRequiredMessage,
        type: 'warning',
      });
      return;
    }

    const descriptionValidation = validateOptionalText(
      description,
      SERVICES_MANAGER_TEXTS.form.descriptionLabel,
      FIELD_LIMITS.service.description.min,
      FIELD_LIMITS.service.description.max
    );
    if (!descriptionValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: SERVICES_MANAGER_TEXTS.form.descriptionLabel,
        message: descriptionValidation.error || SERVICES_MANAGER_TEXTS.alerts.saveErrorFallback,
        type: 'warning',
      });
      return;
    }

    const priceValidation = validatePositiveInteger(
      basePrice,
      SERVICES_MANAGER_TEXTS.form.basePriceField,
      0,
      5000000
    );
    if (!priceValidation.isValid || priceValidation.parsedValue === undefined) {
      setAlertState({
        isOpen: true,
        title: SERVICES_MANAGER_TEXTS.alerts.basePriceInvalidTitle,
        message: priceValidation.error || SERVICES_MANAGER_TEXTS.alerts.basePriceInvalidMessage,
        type: 'warning',
      });
      return;
    }

    const durationValidation = validatePositiveInteger(
      durationMinutes,
      SERVICES_MANAGER_TEXTS.form.durationField,
      5,
      480
    );
    if (!durationValidation.isValid || durationValidation.parsedValue === undefined) {
      setAlertState({
        isOpen: true,
        title: SERVICES_MANAGER_TEXTS.alerts.durationInvalidTitle,
        message:
          durationValidation.error || SERVICES_MANAGER_TEXTS.alerts.durationInvalidMessage,
        type: 'warning',
      });
      return;
    }

    if (extrasEval.incompleteCount > 0) {
      setShowExtraErrors(true);
      setAlertState({
        isOpen: true,
        title: SERVICES_MANAGER_TEXTS.alerts.extrasIncompleteTitle,
        message: SERVICES_MANAGER_TEXTS.alerts.extrasIncompleteMessage,
        type: 'warning',
      });
      return;
    }

    setActionLoadingText(
      editingId ? SERVICES_MANAGER_TEXTS.loaders.saving : SERVICES_MANAGER_TEXTS.loaders.creating
    );

    try {
      const payload = {
        name: name.trim(),
        basePrice: priceValidation.parsedValue,
        durationMinutes: durationValidation.parsedValue,
        extras: extrasEval.validExtras,
        description: description.trim(),
      };

      if (editingId) {
        await updateService(tenantId, editingId, payload);
      } else {
        await addService(tenantId, payload);
      }

      handleCloseEditor();
    } catch (err: unknown) {
      console.error(SERVICES_MANAGER_TEXTS.logs.saveServiceError, err);
      setAlertState({
        isOpen: true,
        title: SERVICES_MANAGER_TEXTS.alerts.saveErrorTitle,
        message:
          err instanceof Error ? err.message : SERVICES_MANAGER_TEXTS.alerts.saveErrorFallback,
        type: 'error',
      });
    } finally {
      setActionLoadingText(null);
    }
  };

  const handleConfirmDeleteService = async () => {
    if (!servicePendingDelete) return;
    const target = servicePendingDelete;
    setServicePendingDelete(null);

    setActionLoadingText(SERVICES_MANAGER_TEXTS.loaders.deleting);
    try {
      await deleteService(tenantId, target.id);
      if (editingId === target.id) {
        handleCloseEditor();
      }
    } catch (err: unknown) {
      console.error(SERVICES_MANAGER_TEXTS.logs.deleteServiceError, err);
      setAlertState({
        isOpen: true,
        title: SERVICES_MANAGER_TEXTS.alerts.deleteErrorTitle,
        message: SERVICES_MANAGER_TEXTS.alerts.deleteErrorMessage,
        type: 'error',
      });
    } finally {
      setActionLoadingText(null);
    }
  };

  const trimmedPreviewName = name.trim();
  const trimmedPreviewDesc = description.trim();

  return (
    <div className={`${styles.container} animate-fade-in`}>
      {isEditorOpen && (
        <FormProgressTracker
          title={
            editingId
              ? SERVICES_MANAGER_TEXTS.progress.editTitle
              : SERVICES_MANAGER_TEXTS.progress.createTitle
          }
          steps={progressSteps}
          readyMessage={
            editingId
              ? SERVICES_MANAGER_TEXTS.progress.readyEditMessage
              : SERVICES_MANAGER_TEXTS.progress.readyCreateMessage
          }
          readyActionLabel={
            editingId
              ? SERVICES_MANAGER_TEXTS.progress.readyEditAction
              : SERVICES_MANAGER_TEXTS.progress.readyCreateAction
          }
          readyActionTargetId={SERVICE_STEP_IDS.actions}
          hasUnsavedProgress={isEditorOpen}
          storageKey={`admin_service_progress_minimized:${tenantId}`}
          mobileClassName={styles.mobileProgressBar}
        />
      )}

      {/* Top Page Bar: Clean Catalog Header + Primary "+ Nuevo servicio" Trigger */}
      <header className={styles.pageHeader}>
        <div className={styles.pageHeaderText}>
          <div className={styles.pageTitleRow}>
            <h2 className={styles.pageTitle}>{SERVICES_MANAGER_TEXTS.header.pageTitle}</h2>
            {!loading && services.length > 0 && (
              <span className={styles.catalogCount}>
                {SERVICES_MANAGER_TEXTS.catalog.statsTotal(services.length)}
              </span>
            )}
          </div>
          <p className={styles.pageSubtitle}>{SERVICES_MANAGER_TEXTS.header.pageSubtitle}</p>
        </div>

        <div className={styles.pageHeaderActions}>
          {isEditorOpen ? (
            <Button
              type="button"
              variant="outline"
              size="md"
              onClick={handleCloseEditor}
              disabled={!!actionLoadingText}
              leftIcon={<X size={16} strokeWidth={1.6} />}
            >
              {SERVICES_MANAGER_TEXTS.header.closeEditorButton}
            </Button>
          ) : (
            <Button
              type="button"
              variant="primary"
              size="md"
              onClick={handleOpenCreateEditor}
              disabled={!!actionLoadingText}
              leftIcon={<Plus size={16} strokeWidth={1.75} />}
            >
              {SERVICES_MANAGER_TEXTS.header.newServiceButton}
            </Button>
          )}
        </div>
      </header>

      {/* Collapsible Service Editor (Asymmetric Split: Form + Live Client Preview) */}
      {isEditorOpen && (
        <section
          ref={editorSectionRef}
          className={styles.editorCard}
          aria-labelledby="service-editor-title"
        >
          {editingId && (
            <div className={styles.editingBanner}>
              <span className={styles.editingBannerText}>
                {SERVICES_MANAGER_TEXTS.header.editBannerPrefix}:{' '}
                <strong>{editingOriginalName}</strong>
              </span>
              <button
                type="button"
                className={styles.editingBannerClose}
                onClick={handleCloseEditor}
                disabled={!!actionLoadingText}
              >
                {SERVICES_MANAGER_TEXTS.form.cancelButton}
              </button>
            </div>
          )}

          <div className={styles.editorHeader}>
            <h3 id="service-editor-title" className={styles.editorTitle}>
              {editingId
                ? SERVICES_MANAGER_TEXTS.header.editTitle
                : SERVICES_MANAGER_TEXTS.header.createTitle}
            </h3>
            <p className={styles.editorSubtitle}>
              {editingId
                ? SERVICES_MANAGER_TEXTS.header.editSubtitle
                : SERVICES_MANAGER_TEXTS.header.createSubtitle}
            </p>
          </div>

          <div className={styles.editorSplit}>
            <form onSubmit={handleSubmit} className={styles.form} noValidate>
              {/* STEP 01: Identity */}
              <div id={SERVICE_STEP_IDS.identity} className={styles.stepSection}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepTitleGroup}>
                    <span className={styles.stepNum}>{SERVICES_MANAGER_TEXTS.steps.step1Num}</span>
                    <h4 className={styles.stepTitle}>{SERVICES_MANAGER_TEXTS.steps.step1Title}</h4>
                  </div>
                  <span className={`${styles.stepBadge} ${styles.stepBadgeRequired}`}>
                    {SERVICES_MANAGER_TEXTS.badges.required}
                  </span>
                </div>

                <div className={styles.stepFieldsStack}>
                  <Input
                    id="service-input-name"
                    label={SERVICES_MANAGER_TEXTS.form.nameLabel}
                    placeholder={SERVICES_MANAGER_TEXTS.form.namePlaceholder}
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={FIELD_LIMITS.service.name.max}
                    showCharCount
                    disabled={!!actionLoadingText}
                    required
                  />

                  <Textarea
                    label={SERVICES_MANAGER_TEXTS.form.descriptionLabel}
                    placeholder={SERVICES_MANAGER_TEXTS.form.descriptionPlaceholder}
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    maxLength={FIELD_LIMITS.service.description.max}
                    showCharCount
                    rows={2}
                    disabled={!!actionLoadingText}
                  />
                </div>
              </div>

              {/* STEP 02: Pricing & Duration */}
              <div id={SERVICE_STEP_IDS.pricing} className={styles.stepSection}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepTitleGroup}>
                    <span className={styles.stepNum}>{SERVICES_MANAGER_TEXTS.steps.step2Num}</span>
                    <h4 className={styles.stepTitle}>{SERVICES_MANAGER_TEXTS.steps.step2Title}</h4>
                  </div>
                  <span className={`${styles.stepBadge} ${styles.stepBadgeRequired}`}>
                    {SERVICES_MANAGER_TEXTS.badges.required}
                  </span>
                </div>

                <div className={styles.pricingGrid}>
                  <div className={styles.fieldCell}>
                    <Input
                      id="service-input-price"
                      label={SERVICES_MANAGER_TEXTS.form.basePriceLabel}
                      type="text"
                      inputMode="numeric"
                      numericOnly
                      maxDigits={8}
                      placeholder={SERVICES_MANAGER_TEXTS.form.basePricePlaceholder}
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      leftIcon={<span className={styles.currencyPrefix}>$</span>}
                      helperText={SERVICES_MANAGER_TEXTS.form.basePriceHelper}
                      disabled={!!actionLoadingText}
                      required
                    />
                  </div>

                  <div className={styles.fieldCell}>
                    <Input
                      id="service-input-duration"
                      label={SERVICES_MANAGER_TEXTS.form.durationLabel}
                      type="text"
                      inputMode="numeric"
                      numericOnly
                      maxDigits={3}
                      placeholder={SERVICES_MANAGER_TEXTS.form.durationPlaceholder}
                      value={durationMinutes}
                      onChange={(e) => setDurationMinutes(e.target.value)}
                      leftIcon={<Clock size={15} strokeWidth={1.6} />}
                      helperText={SERVICES_MANAGER_TEXTS.form.durationHelper}
                      disabled={!!actionLoadingText}
                      required
                    />

                    <div
                      className={styles.durationPresetRow}
                      role="group"
                      aria-label={SERVICES_MANAGER_TEXTS.form.durationLabel}
                    >
                      {SERVICE_DURATION_PRESETS.map((minutes) => {
                        const isSelected = durationMinutes.trim() === String(minutes);
                        return (
                          <button
                            key={minutes}
                            type="button"
                            className={`${styles.durationPresetBtn} ${
                              isSelected ? styles.durationPresetBtnActive : ''
                            }`}
                            onClick={() => setDurationMinutes(String(minutes))}
                            disabled={!!actionLoadingText}
                            aria-pressed={isSelected}
                          >
                            {minutes}m
                          </button>
                        );
                      })}
                    </div>
                  </div>
                </div>
              </div>

              {/* STEP 03: Inline Editable Extras */}
              <div id={SERVICE_STEP_IDS.extras} className={styles.stepSection}>
                <div className={styles.stepHeader}>
                  <div className={styles.stepTitleGroup}>
                    <span className={styles.stepNum}>{SERVICES_MANAGER_TEXTS.steps.step3Num}</span>
                    <h4 className={styles.stepTitle}>{SERVICES_MANAGER_TEXTS.steps.step3Title}</h4>
                  </div>
                  <span className={`${styles.stepBadge} ${styles.stepBadgeOptional}`}>
                    {SERVICES_MANAGER_TEXTS.badges.optional}
                  </span>
                </div>

                <p className={styles.stepDescription}>
                  {SERVICES_MANAGER_TEXTS.steps.step3Subtitle}
                </p>

                {extraRows.length === 0 ? (
                  <div className={styles.extrasEmptyBox}>
                    <div className={styles.extrasEmptyCopy}>
                      <span className={styles.extrasEmptyTitle}>
                        {SERVICES_MANAGER_TEXTS.extras.emptyTitle}
                      </span>
                      <span className={styles.extrasEmptyHint}>
                        {SERVICES_MANAGER_TEXTS.extras.emptyHint}
                      </span>
                    </div>
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      onClick={handleAppendExtraRow}
                      disabled={!!actionLoadingText}
                      leftIcon={<Plus size={15} strokeWidth={1.75} />}
                    >
                      {SERVICES_MANAGER_TEXTS.extras.addFirstButton}
                    </Button>
                  </div>
                ) : (
                  <div className={styles.extrasTableWrap}>
                    <div className={styles.extrasColumnsHeader} aria-hidden="true">
                      <span>{SERVICES_MANAGER_TEXTS.extras.columnName}</span>
                      <span>{SERVICES_MANAGER_TEXTS.extras.columnPrice}</span>
                      <span />
                    </div>

                    <div className={styles.extrasRowsList}>
                      {extraRows.map((row, idx) => {
                        const rowError = showExtraErrors ? extrasEval.rowErrors[row.rowKey] : undefined;
                        return (
                          <div key={row.rowKey} className={styles.extraRowItem}>
                            <div className={styles.extraRowInputs}>
                              <div className={styles.extraFieldCol}>
                                <label className={styles.srOnly} htmlFor={`extra-name-${row.rowKey}`}>
                                  {SERVICES_MANAGER_TEXTS.extras.columnName}
                                </label>
                                <input
                                  ref={(el) => {
                                    extraNameInputRefs.current[row.rowKey] = el;
                                  }}
                                  id={`extra-name-${row.rowKey}`}
                                  type="text"
                                  className={`${styles.inlineInput} ${
                                    rowError?.name ? styles.inlineInputError : ''
                                  }`}
                                  value={row.name}
                                  maxLength={FIELD_LIMITS.service.extraName.max}
                                  placeholder={SERVICES_MANAGER_TEXTS.extras.namePlaceholder}
                                  onChange={(e) =>
                                    handleUpdateExtraRow(row.rowKey, 'name', e.target.value)
                                  }
                                  onKeyDown={(e) => handleExtraKeyDown(e, idx)}
                                  disabled={!!actionLoadingText}
                                />
                                {rowError?.name && (
                                  <span className={styles.inlineErrorText}>{rowError.name}</span>
                                )}
                              </div>

                              <div className={styles.extraFieldCol}>
                                <label className={styles.srOnly} htmlFor={`extra-price-${row.rowKey}`}>
                                  {SERVICES_MANAGER_TEXTS.extras.columnPrice}
                                </label>
                                <div
                                  className={`${styles.inlinePriceWrap} ${
                                    rowError?.price ? styles.inlineInputError : ''
                                  }`}
                                >
                                  <span className={styles.inlinePricePrefix} aria-hidden="true">
                                    +$
                                  </span>
                                  <input
                                    id={`extra-price-${row.rowKey}`}
                                    type="text"
                                    inputMode="numeric"
                                    className={styles.inlinePriceInput}
                                    value={row.price}
                                    maxLength={7}
                                    placeholder={SERVICES_MANAGER_TEXTS.extras.pricePlaceholder}
                                    onChange={(e) =>
                                      handleUpdateExtraRow(row.rowKey, 'price', e.target.value)
                                    }
                                    onKeyDown={(e) => handleExtraKeyDown(e, idx)}
                                    disabled={!!actionLoadingText}
                                  />
                                </div>
                                {rowError?.price && (
                                  <span className={styles.inlineErrorText}>{rowError.price}</span>
                                )}
                              </div>

                              <button
                                type="button"
                                className={styles.removeRowBtn}
                                onClick={() => handleRemoveExtraRow(row.rowKey)}
                                disabled={!!actionLoadingText}
                                aria-label={SERVICES_MANAGER_TEXTS.extras.removeAria(row.name.trim())}
                                title={SERVICES_MANAGER_TEXTS.extras.removeAria(row.name.trim())}
                              >
                                <Trash2 size={15} strokeWidth={1.6} aria-hidden="true" />
                              </button>
                            </div>
                          </div>
                        );
                      })}
                    </div>

                    <div className={styles.extrasFooterBar}>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={handleAppendExtraRow}
                        disabled={!!actionLoadingText}
                        leftIcon={<Plus size={14} strokeWidth={1.75} />}
                      >
                        {SERVICES_MANAGER_TEXTS.extras.addAnotherButton}
                      </Button>
                      <span className={styles.extrasKeyboardHint}>
                        {SERVICES_MANAGER_TEXTS.extras.keyboardHint}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              {/* Editor Form Actions */}
              <div id={SERVICE_STEP_IDS.actions} className={styles.formActions}>
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleCloseEditor}
                  disabled={!!actionLoadingText}
                >
                  {SERVICES_MANAGER_TEXTS.form.cancelButton}
                </Button>

                <Button
                  type="submit"
                  variant="primary"
                  isLoading={!!actionLoadingText}
                  leftIcon={
                    editingId ? (
                      <Check size={16} strokeWidth={1.75} />
                    ) : (
                      <Plus size={16} strokeWidth={1.75} />
                    )
                  }
                >
                  {editingId
                    ? SERVICES_MANAGER_TEXTS.form.saveChangesButton
                    : SERVICES_MANAGER_TEXTS.form.createServiceButton}
                </Button>
              </div>
            </form>

            {/* Right Column: Live Client Preview (Product Moment) */}
            <aside className={styles.previewColumn} aria-label={SERVICES_MANAGER_TEXTS.preview.heading}>
              <div className={styles.previewHeader}>
                <span className={styles.previewHeading}>
                  {SERVICES_MANAGER_TEXTS.preview.heading}
                </span>
                <span className={styles.previewSubheading}>
                  {SERVICES_MANAGER_TEXTS.preview.subheading}
                </span>
              </div>

              <div className={styles.previewCard}>
                <div className={styles.previewCardTop}>
                  <div className={styles.previewTitleGroup}>
                    <h4
                      className={`${styles.previewServiceName} ${
                        !trimmedPreviewName ? styles.previewPlaceholder : ''
                      }`}
                    >
                      {trimmedPreviewName || SERVICES_MANAGER_TEXTS.preview.fallbackName}
                    </h4>
                    <span className={styles.previewDuration}>
                      <Clock size={13} strokeWidth={1.6} aria-hidden="true" />
                      <span>
                        {parsedDuration
                          ? formatEstimatedDuration(parsedDuration)
                          : SERVICES_MANAGER_TEXTS.preview.currencyPending}
                      </span>
                    </span>
                  </div>

                  <div className={styles.previewPriceCol}>
                    <span
                      className={`${styles.previewPriceValue} ${
                        priceSummary.parsedBasePrice === null ? styles.previewPlaceholder : ''
                      }`}
                    >
                      {priceSummary.parsedBasePrice !== null
                        ? `$${priceSummary.parsedBasePrice.toLocaleString('es-AR')}`
                        : SERVICES_MANAGER_TEXTS.preview.currencyPending}
                    </span>
                    <span className={styles.previewPriceCaption}>
                      {SERVICES_MANAGER_TEXTS.preview.basePriceCaption}
                    </span>
                  </div>
                </div>

                <p
                  className={`${styles.previewDesc} ${
                    !trimmedPreviewDesc ? styles.previewPlaceholder : ''
                  }`}
                >
                  {trimmedPreviewDesc || SERVICES_MANAGER_TEXTS.preview.fallbackDesc}
                </p>

                <div className={styles.previewExtrasBlock}>
                  <span className={styles.previewExtrasLabel}>
                    {SERVICES_MANAGER_TEXTS.preview.extrasTitle}
                  </span>

                  {extrasEval.validExtras.length > 0 ? (
                    <ul className={styles.previewExtrasList}>
                      {extrasEval.validExtras.map((ex) => (
                        <li key={ex.id} className={styles.previewExtraRow}>
                          <span className={styles.previewExtraName}>{ex.name}</span>
                          <span className={styles.previewExtraPrice}>
                            +${ex.price.toLocaleString('es-AR')}
                          </span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <span className={styles.previewNoExtras}>
                      {SERVICES_MANAGER_TEXTS.preview.noExtrasLabel}
                    </span>
                  )}
                </div>

                <div className={styles.previewSummaryFooter}>
                  <span className={styles.previewRangeLabel}>
                    {extrasEval.validExtras.length > 0
                      ? SERVICES_MANAGER_TEXTS.preview.rangeWithExtras(
                          extrasEval.validExtras.length
                        )
                      : SERVICES_MANAGER_TEXTS.preview.rangeBaseOnly}
                  </span>
                  <span className={styles.previewRangeValue}>
                    {priceSummary.maxTotalWithExtras !== null
                      ? `$${priceSummary.maxTotalWithExtras.toLocaleString('es-AR')}`
                      : '—'}
                  </span>
                </div>
              </div>
            </aside>
          </div>
        </section>
      )}

      {/* Active Services Catalog */}
      <section className={styles.catalogSection} aria-label={SERVICES_MANAGER_TEXTS.header.pageTitle}>
        {loading ? (
          <Loader
            size="md"
            title={SERVICES_MANAGER_TEXTS.loaders.loadingCatalogTitle}
            subtitle={SERVICES_MANAGER_TEXTS.loaders.loadingCatalogSubtitle}
            icon="calendar"
          />
        ) : services.length === 0 ? (
          !isEditorOpen && (
            <div className={styles.emptyState}>
              <div className={styles.emptyIconCircle}>
                <Layers size={22} strokeWidth={1.5} className={styles.emptyIcon} aria-hidden="true" />
              </div>
              <h3 className={styles.emptyTitle}>{SERVICES_MANAGER_TEXTS.catalog.emptyTitle}</h3>
              <p className={styles.emptyText}>{SERVICES_MANAGER_TEXTS.catalog.emptyText}</p>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={handleOpenCreateEditor}
                leftIcon={<Plus size={16} strokeWidth={1.75} />}
              >
                {SERVICES_MANAGER_TEXTS.catalog.emptyCta}
              </Button>
            </div>
          )
        ) : (
          <div className={styles.servicesGrid}>
            {services.map((serviceItem) => {
              const isEditing = editingId === serviceItem.id && isEditorOpen;
              return (
                <article
                  key={serviceItem.id}
                  className={`${styles.serviceCard} ${isEditing ? styles.serviceCardEditing : ''}`}
                >
                  <div className={styles.cardMain}>
                    <div className={styles.cardHeader}>
                      <div className={styles.cardTitleGroup}>
                        <h3 className={styles.serviceName}>{serviceItem.name}</h3>
                        <span className={styles.durationMeta}>
                          <Clock size={14} strokeWidth={1.6} aria-hidden="true" />
                          <span className={styles.durationText}>
                            {formatEstimatedDuration(serviceItem.durationMinutes || 60)}
                          </span>
                        </span>
                      </div>
                      <div className={styles.priceColumn}>
                        <span className={styles.basePriceValue}>
                          ${(serviceItem.basePrice || 0).toLocaleString('es-AR')}
                        </span>
                        <span className={styles.basePriceCaption}>
                          {SERVICES_MANAGER_TEXTS.catalog.basePriceLabel}
                        </span>
                      </div>
                    </div>

                    {serviceItem.description && (
                      <p className={styles.serviceDesc}>{serviceItem.description}</p>
                    )}

                    {serviceItem.extras && serviceItem.extras.length > 0 ? (
                      <div className={styles.cardExtrasSection}>
                        <span className={styles.cardExtrasLabel}>
                          {SERVICES_MANAGER_TEXTS.catalog.availableExtras(serviceItem.extras.length)}
                        </span>
                        <ul className={styles.cardExtrasList}>
                          {serviceItem.extras.map((ex, idx) => (
                            <li key={ex.id || idx} className={styles.cardExtraRow}>
                              <span className={styles.extraItemName}>{ex.name}</span>
                              <span className={styles.extraItemPrice}>
                                +${(ex.price || 0).toLocaleString('es-AR')}
                              </span>
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : (
                      <p className={styles.noExtrasNote}>
                        {SERVICES_MANAGER_TEXTS.catalog.noExtras}
                      </p>
                    )}
                  </div>

                  <div className={styles.cardFooter}>
                    <div className={styles.cardStatusSlot}>
                      {isEditing && (
                        <span className={styles.editingBadge}>
                          {SERVICES_MANAGER_TEXTS.catalog.editingTag}
                        </span>
                      )}
                    </div>

                    <div className={styles.cardActions}>
                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.editBtn}`}
                        onClick={() => handleEditService(serviceItem)}
                        title={SERVICES_MANAGER_TEXTS.catalog.editTitle(serviceItem.name)}
                        aria-label={SERVICES_MANAGER_TEXTS.catalog.editTitle(serviceItem.name)}
                        disabled={!!actionLoadingText}
                      >
                        <Edit3 size={14} strokeWidth={1.6} aria-hidden="true" />
                        <span>{SERVICES_MANAGER_TEXTS.catalog.editButton}</span>
                      </button>

                      <button
                        type="button"
                        className={`${styles.actionBtn} ${styles.deleteBtn}`}
                        onClick={() => setServicePendingDelete(serviceItem)}
                        title={SERVICES_MANAGER_TEXTS.catalog.deleteTitle(serviceItem.name)}
                        aria-label={SERVICES_MANAGER_TEXTS.catalog.deleteTitle(serviceItem.name)}
                        disabled={!!actionLoadingText}
                      >
                        <Trash2 size={14} strokeWidth={1.6} aria-hidden="true" />
                      </button>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </section>

      {actionLoadingText && (
        <Loader
          fullScreen
          title={actionLoadingText}
          subtitle={SERVICES_MANAGER_TEXTS.loaders.syncSubtitle}
          icon="calendar"
        />
      )}

      <AlertModal
        isOpen={Boolean(servicePendingDelete)}
        onClose={() => setServicePendingDelete(null)}
        type="error"
        title={SERVICES_MANAGER_TEXTS.catalog.deleteModalTitle}
        message={
          servicePendingDelete
            ? SERVICES_MANAGER_TEXTS.catalog.deleteModalMessage(servicePendingDelete.name)
            : ''
        }
        confirmText={SERVICES_MANAGER_TEXTS.catalog.deleteModalConfirm}
        onConfirm={() => void handleConfirmDeleteService()}
        secondaryText={SERVICES_MANAGER_TEXTS.catalog.deleteModalCancel}
        onSecondary={() => setServicePendingDelete(null)}
        closeOnBackdropClick
        closeOnEscape
      />

      <AlertModal
        isOpen={alertState.isOpen}
        onClose={closeAlert}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
        details={alertState.details}
      />
    </div>
  );
};

export default ServicesManager;
