import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
  ShieldAlert,
  Lock,
  Unlock,
  Copy,
  Check,
  Eye,
  EyeOff,
  Save,
  Trash2,
  RefreshCw,
  Info,
} from 'lucide-react';
import type { TenantPaymentSettingsSummary } from '../../../types';
import { useTenant } from '../../../context/TenantContext';
import {
  getPaymentSettingsSummary,
  savePaymentSettings,
} from '../../../services/paymentSettingsService';
import Input from '../../common/Input/Input';
import Button from '../../common/Button/Button';
import Loader from '../../common/Loader/Loader';
import AlertModal, { type AlertModalType } from '../../common/AlertModal';
import FormProgressTracker from '../../common/FormProgressTracker';
import { PAYMENT_SETTINGS_TEXTS } from '../../../texts';
import { buildPaymentProgressModel, PAYMENT_STEP_IDS } from './paymentProgress';
import styles from './PaymentSettingsManager.module.css';

const MP_ACCESS_TOKEN_REGEX = /^(?:APP_USR|TEST)-[A-Za-z0-9_-]{8,}$/;

const formatUpdatedAt = (iso?: string | null): string => {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return parsed.toLocaleString('es-AR', {
    dateStyle: 'short',
    timeStyle: 'short',
  });
};

export const PaymentSettingsManager: React.FC = () => {
  const { tenantId, slug, refreshTenant } = useTenant();

  const [summary, setSummary] = useState<TenantPaymentSettingsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [reloadNonce, setReloadNonce] = useState(0);
  const [saving, setSaving] = useState(false);

  const [isEditingUnlocked, setIsEditingUnlocked] = useState(false);
  const [confirmClearOpen, setConfirmClearOpen] = useState(false);

  const [accessToken, setAccessToken] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    accessToken?: string;
    webhookSecret?: string;
  }>({});

  const [copiedWebhook, setCopiedWebhook] = useState(false);
  const [hasCopiedWebhookInSession, setHasCopiedWebhookInSession] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const copyTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [alertState, setAlertState] = useState<{
    isOpen: boolean;
    title?: string;
    message: string;
    type?: AlertModalType;
  }>({
    isOpen: false,
    message: '',
    type: 'warning',
  });

  useEffect(() => {
    return () => {
      if (successTimerRef.current) clearTimeout(successTimerRef.current);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
    };
  }, []);

  const showTemporarySuccess = (message: string) => {
    if (successTimerRef.current) clearTimeout(successTimerRef.current);
    setSuccessMsg(message);
    successTimerRef.current = setTimeout(() => {
      setSuccessMsg(null);
      successTimerRef.current = null;
    }, 5000);
  };

  useEffect(() => {
    let active = true;
    getPaymentSettingsSummary(tenantId)
      .then((data) => {
        if (!active) return;
        setSummary(data);
        setLoadError(null);
        setLoading(false);
      })
      .catch((err: unknown) => {
        if (!active) return;
        setLoadError(
          err instanceof Error ? err.message : PAYMENT_SETTINGS_TEXTS.feedback.loadErrorFallback
        );
        setLoading(false);
      });

    return () => {
      active = false;
    };
  }, [tenantId, reloadNonce]);

  const handleRetryLoad = () => {
    setLoading(true);
    setLoadError(null);
    setReloadNonce((n) => n + 1);
  };

  const handleLockEditing = () => {
    setIsEditingUnlocked(false);
    setAccessToken('');
    setWebhookSecret('');
    setShowAccessToken(false);
    setShowWebhookSecret(false);
    setFieldErrors({});
  };

  const trimmedAccessToken = accessToken.trim();
  const trimmedWebhookSecret = webhookSecret.trim();
  const hasDraftInput = Boolean(trimmedAccessToken || trimmedWebhookSecret);

  const progressModel = useMemo(
    () =>
      buildPaymentProgressModel({
        summary,
        trimmedAccessToken,
        trimmedWebhookSecret,
        hasCopiedWebhook: hasCopiedWebhookInSession,
        fieldErrors,
      }),
    [summary, trimmedAccessToken, trimmedWebhookSecret, hasCopiedWebhookInSession, fieldErrors]
  );

  const handleCopyWebhookUrl = async () => {
    if (!summary?.webhookUrl) return;
    try {
      await navigator.clipboard.writeText(summary.webhookUrl);
      setCopiedWebhook(true);
      setHasCopiedWebhookInSession(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        setCopiedWebhook(false);
        copyTimerRef.current = null;
      }, 2500);
    } catch {
      setAlertState({
        isOpen: true,
        title: PAYMENT_SETTINGS_TEXTS.step2.sectionTitle,
        message: PAYMENT_SETTINGS_TEXTS.feedback.copyError,
        type: 'warning',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isEditingUnlocked) return;

    const errors: { accessToken?: string; webhookSecret?: string } = {};

    if (!trimmedAccessToken && !trimmedWebhookSecret) {
      setAlertState({
        isOpen: true,
        title: PAYMENT_SETTINGS_TEXTS.feedback.saveErrorTitle,
        message: PAYMENT_SETTINGS_TEXTS.validation.emptySubmission,
        type: 'warning',
      });
      return;
    }

    if (trimmedAccessToken && !MP_ACCESS_TOKEN_REGEX.test(trimmedAccessToken)) {
      errors.accessToken = PAYMENT_SETTINGS_TEXTS.validation.invalidAccessToken;
    }

    if (
      trimmedWebhookSecret &&
      (trimmedWebhookSecret.length < 8 ||
        trimmedWebhookSecret.length > 256 ||
        /\s/.test(trimmedWebhookSecret))
    ) {
      errors.webhookSecret = PAYMENT_SETTINGS_TEXTS.validation.invalidWebhookSecret;
    }

    if (errors.accessToken || errors.webhookSecret) {
      setFieldErrors(errors);
      return;
    }

    setFieldErrors({});
    setSaving(true);
    setSuccessMsg(null);

    try {
      const updated = await savePaymentSettings(
        {
          tenantId,
          ...(trimmedAccessToken ? { mpAccessToken: trimmedAccessToken } : {}),
          ...(trimmedWebhookSecret ? { mpWebhookSecret: trimmedWebhookSecret } : {}),
        },
        slug
      );

      setSummary(updated);
      setAccessToken('');
      setWebhookSecret('');
      setShowAccessToken(false);
      setShowWebhookSecret(false);
      setIsEditingUnlocked(false);
      await refreshTenant();
      showTemporarySuccess(PAYMENT_SETTINGS_TEXTS.feedback.savedSuccess);
    } catch (err: unknown) {
      setAlertState({
        isOpen: true,
        title: PAYMENT_SETTINGS_TEXTS.feedback.saveErrorTitle,
        message:
          err instanceof Error ? err.message : PAYMENT_SETTINGS_TEXTS.feedback.saveErrorFallback,
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleConfirmClearCredentials = async () => {
    setConfirmClearOpen(false);
    setSaving(true);
    setSuccessMsg(null);
    setFieldErrors({});

    try {
      const updated = await savePaymentSettings(
        {
          tenantId,
          clearCredentials: true,
        },
        slug
      );

      setSummary(updated);
      setAccessToken('');
      setWebhookSecret('');
      setShowAccessToken(false);
      setShowWebhookSecret(false);
      setIsEditingUnlocked(false);
      await refreshTenant();
      showTemporarySuccess(PAYMENT_SETTINGS_TEXTS.feedback.clearedSuccess);
    } catch (err: unknown) {
      setAlertState({
        isOpen: true,
        title: PAYMENT_SETTINGS_TEXTS.feedback.saveErrorTitle,
        message:
          err instanceof Error ? err.message : PAYMENT_SETTINGS_TEXTS.feedback.saveErrorFallback,
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <Loader
        size="lg"
        title={PAYMENT_SETTINGS_TEXTS.loader.loadingTitle}
        subtitle={PAYMENT_SETTINGS_TEXTS.loader.loadingSubtitle}
        icon="shield"
      />
    );
  }

  if (loadError || !summary) {
    return (
      <div className={styles.container}>
        <section className={`${styles.card} ${styles.errorCard}`}>
          <AlertTriangle size={28} color="var(--color-danger)" aria-hidden="true" />
          <h3 className={styles.errorTitle}>{PAYMENT_SETTINGS_TEXTS.feedback.loadErrorTitle}</h3>
          <p className={styles.errorMessage}>
            {loadError || PAYMENT_SETTINGS_TEXTS.feedback.loadErrorFallback}
          </p>
          <Button
            variant="outline"
            size="sm"
            onClick={handleRetryLoad}
            leftIcon={<RefreshCw size={15} strokeWidth={1.75} />}
          >
            {PAYMENT_SETTINGS_TEXTS.feedback.retryButton}
          </Button>
        </section>
      </div>
    );
  }

  const hasOwnCredentials = Boolean(summary.maskedAccessToken || summary.hasWebhookSecret);

  const badgeClass = summary.maskedAccessToken
    ? styles.badgeConfigured
    : summary.isDemoFallbackActive
      ? styles.badgeDemo
      : styles.badgeUnconfigured;

  const badgeLabel = summary.maskedAccessToken
    ? PAYMENT_SETTINGS_TEXTS.header.badges.configured
    : summary.isDemoFallbackActive
      ? PAYMENT_SETTINGS_TEXTS.header.badges.demoFallback
      : PAYMENT_SETTINGS_TEXTS.header.badges.unconfigured;

  return (
    <div className={styles.container}>
      <section className={styles.card} aria-labelledby="payment-settings-title">
        <FormProgressTracker
          title={PAYMENT_SETTINGS_TEXTS.progress.title}
          steps={progressModel.steps}
          readyMessage={progressModel.readyMessage}
          readyActionLabel={progressModel.readyActionLabel}
          readyActionTargetId={progressModel.readyActionTargetId}
          pendingCompactMessage={progressModel.pendingCompactMessage}
          pendingFooterMessage={progressModel.pendingFooterMessage}
          pendingActionLabel={progressModel.pendingActionLabel}
          pendingActionTargetId={progressModel.pendingActionTargetId}
          hasUnsavedProgress={hasDraftInput}
          storageKey={`admin_payments_progress_minimized:${tenantId}`}
        />

        <div className={styles.header}>
          <div className={styles.headerTitleGroup}>
            <div className={styles.titleRow}>
              <h2 id="payment-settings-title" className={styles.title}>
                <CreditCard
                  size={20}
                  strokeWidth={1.75}
                  className={styles.titleIcon}
                  aria-hidden="true"
                />
                <span>{PAYMENT_SETTINGS_TEXTS.header.title}</span>
              </h2>
              <span className={`${styles.statusBadge} ${badgeClass}`}>
                {summary.maskedAccessToken ? (
                  <CheckCircle2 size={13} strokeWidth={2} aria-hidden="true" />
                ) : (
                  <ShieldCheck size={13} strokeWidth={2} aria-hidden="true" />
                )}
                <span>{badgeLabel}</span>
              </span>
            </div>
            <p className={styles.subtitle}>{PAYMENT_SETTINGS_TEXTS.header.subtitle}</p>
          </div>
        </div>

        {successMsg && (
          <div className={styles.successAlert} role="status">
            <CheckCircle2 size={18} aria-hidden="true" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Informative Status & Protection Block (No step number so steps 01-03 match FormProgressTracker 1:1) */}
        <section className={styles.sectionBlock} aria-labelledby="mp-status-heading">
          <div className={styles.cautionBanner} role="alert">
            <ShieldAlert size={18} strokeWidth={1.9} className={styles.bannerIcon} aria-hidden="true" />
            <div className={styles.bannerTextCol}>
              <strong className={styles.bannerTitle}>{PAYMENT_SETTINGS_TEXTS.caution.title}</strong>
              <span>{PAYMENT_SETTINGS_TEXTS.caution.description}</span>
            </div>
          </div>

          <div
            className={`${styles.lockBar} ${
              isEditingUnlocked ? styles.lockBarUnlocked : styles.lockBarLocked
            }`}
          >
            <div className={styles.lockBarInfo}>
              {isEditingUnlocked ? (
                <Unlock size={17} strokeWidth={1.9} className={styles.lockIcon} aria-hidden="true" />
              ) : (
                <Lock size={17} strokeWidth={1.9} className={styles.lockIcon} aria-hidden="true" />
              )}
              <div className={styles.lockBarText}>
                <strong className={styles.lockBarTitle}>
                  {isEditingUnlocked
                    ? PAYMENT_SETTINGS_TEXTS.caution.unlockedTitle
                    : PAYMENT_SETTINGS_TEXTS.caution.lockedTitle}
                </strong>
                <span className={styles.lockBarHint}>
                  {isEditingUnlocked
                    ? PAYMENT_SETTINGS_TEXTS.caution.unlockedHint
                    : PAYMENT_SETTINGS_TEXTS.caution.lockedHint}
                </span>
              </div>
            </div>

            {isEditingUnlocked ? (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleLockEditing}
                disabled={saving}
                leftIcon={<Lock size={14} strokeWidth={1.9} />}
              >
                {PAYMENT_SETTINGS_TEXTS.caution.lockButton}
              </Button>
            ) : (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setIsEditingUnlocked(true)}
                disabled={saving}
                leftIcon={<Unlock size={14} strokeWidth={1.9} />}
              >
                {PAYMENT_SETTINGS_TEXTS.caution.unlockButton}
              </Button>
            )}
          </div>

          <h3 id="mp-status-heading" className={styles.statusOverviewHeading}>
            {PAYMENT_SETTINGS_TEXTS.status.heading}
          </h3>

          <div className={styles.summaryGrid}>
            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>
                {PAYMENT_SETTINGS_TEXTS.status.accessTokenLabel}
              </span>
              <span
                className={`${styles.summaryValue} ${
                  summary.maskedAccessToken ? styles.summaryValueMono : ''
                }`}
                title={summary.maskedAccessToken || undefined}
              >
                {summary.maskedAccessToken
                  ? summary.maskedAccessToken
                  : summary.isDemoFallbackActive
                    ? PAYMENT_SETTINGS_TEXTS.status.accessTokenDemoFallback
                    : PAYMENT_SETTINGS_TEXTS.status.accessTokenEmpty}
              </span>
            </div>

            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>
                {PAYMENT_SETTINGS_TEXTS.status.webhookSecretLabel}
              </span>
              <span className={styles.summaryValue}>
                {summary.hasWebhookSecret
                  ? PAYMENT_SETTINGS_TEXTS.status.webhookSecretConfigured
                  : PAYMENT_SETTINGS_TEXTS.status.webhookSecretMissing}
              </span>
            </div>

            <div className={styles.summaryItem}>
              <span className={styles.summaryLabel}>
                {PAYMENT_SETTINGS_TEXTS.status.updatedAtLabel}
              </span>
              <span className={styles.summaryValue}>{formatUpdatedAt(summary.updatedAt)}</span>
            </div>
          </div>

          {summary.isDemoFallbackActive && (
            <div className={`${styles.banner} ${styles.bannerInfo}`} role="note">
              <Info size={16} className={styles.bannerIcon} aria-hidden="true" />
              <span>{PAYMENT_SETTINGS_TEXTS.status.demoBanner}</span>
            </div>
          )}

          {!summary.configured && (
            <div className={`${styles.banner} ${styles.bannerWarning}`} role="alert">
              <AlertTriangle size={16} className={styles.bannerIcon} aria-hidden="true" />
              <span>{PAYMENT_SETTINGS_TEXTS.status.unconfiguredBanner}</span>
            </div>
          )}

          <div className={`${styles.banner} ${styles.bannerInfo}`} role="note">
            <ShieldCheck size={16} className={styles.bannerIcon} aria-hidden="true" />
            <span>{PAYMENT_SETTINGS_TEXTS.status.securityNote}</span>
          </div>
        </section>

        {/* Form containing steps 01, 02, 03 in exact 1:1 order with FormProgressTracker */}
        <form onSubmit={handleSubmit} noValidate>
          {/* STEP 01: Access Token (Required) */}
          <section
            id={PAYMENT_STEP_IDS.accessToken}
            className={styles.sectionBlock}
            aria-labelledby="mp-step-01-heading"
          >
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleGroup}>
                <span className={styles.sectionPill}>{PAYMENT_SETTINGS_TEXTS.step1.sectionNum}</span>
                <h3 id="mp-step-01-heading" className={styles.sectionTitle}>
                  {PAYMENT_SETTINGS_TEXTS.step1.sectionTitle}
                </h3>
              </div>
              <span className={`${styles.requirementBadge} ${styles.requirementRequired}`}>
                {PAYMENT_SETTINGS_TEXTS.badges.required}
              </span>
            </div>

            <div className={styles.guideBox}>
              <div className={styles.guideItem}>
                <strong>{PAYMENT_SETTINGS_TEXTS.guideLabels.what}</strong>{' '}
                <span>{PAYMENT_SETTINGS_TEXTS.step1.guideWhat}</span>
              </div>
              <div className={styles.guideItem}>
                <strong>{PAYMENT_SETTINGS_TEXTS.guideLabels.why}</strong>{' '}
                <span>{PAYMENT_SETTINGS_TEXTS.step1.guideWhy}</span>
              </div>
              <div className={styles.guideItem}>
                <strong>{PAYMENT_SETTINGS_TEXTS.guideLabels.tip}:</strong>{' '}
                <span>{PAYMENT_SETTINGS_TEXTS.step1.guideTip}</span>
              </div>
            </div>

            <div className={styles.secretFieldGroup}>
              <div className={styles.secretFieldHeader}>
                <label htmlFor="mp-input-access-token" className={styles.secretFieldLabel}>
                  {PAYMENT_SETTINGS_TEXTS.step1.inputLabel}
                </label>
              </div>
              <div className={styles.secretInputBox}>
                <Input
                  id="mp-input-access-token"
                  type={showAccessToken ? 'text' : 'password'}
                  autoComplete="off"
                  spellCheck={false}
                  value={accessToken}
                  onChange={(e) => {
                    setAccessToken(e.target.value);
                    if (fieldErrors.accessToken) {
                      setFieldErrors((prev) => ({ ...prev, accessToken: undefined }));
                    }
                  }}
                  placeholder={
                    summary.maskedAccessToken
                      ? PAYMENT_SETTINGS_TEXTS.step1.placeholderSaved(summary.maskedAccessToken)
                      : PAYMENT_SETTINGS_TEXTS.step1.placeholderNew
                  }
                  helperText={PAYMENT_SETTINGS_TEXTS.step1.helper}
                  error={fieldErrors.accessToken}
                  disabled={saving || !isEditingUnlocked}
                  className={styles.secretInput}
                />
                <button
                  type="button"
                  className={styles.toggleSecretBtn}
                  onClick={() => setShowAccessToken((prev) => !prev)}
                  disabled={saving || !isEditingUnlocked}
                  aria-label={
                    showAccessToken
                      ? PAYMENT_SETTINGS_TEXTS.form.hideSecretAria
                      : PAYMENT_SETTINGS_TEXTS.form.showSecretAria
                  }
                >
                  {showAccessToken ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className={`${styles.banner} ${styles.bannerWarning}`} role="note">
              <AlertTriangle size={15} className={styles.bannerIcon} aria-hidden="true" />
              <span>{PAYMENT_SETTINGS_TEXTS.step1.warningNote}</span>
            </div>
          </section>

          {/* STEP 02: Webhook URL (Optional · Recommended) */}
          <section
            id={PAYMENT_STEP_IDS.webhookUrl}
            className={styles.sectionBlock}
            aria-labelledby="mp-step-02-heading"
          >
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleGroup}>
                <span className={styles.sectionPill}>{PAYMENT_SETTINGS_TEXTS.step2.sectionNum}</span>
                <h3 id="mp-step-02-heading" className={styles.sectionTitle}>
                  {PAYMENT_SETTINGS_TEXTS.step2.sectionTitle}
                </h3>
              </div>
              <span className={`${styles.requirementBadge} ${styles.requirementOptional}`}>
                {PAYMENT_SETTINGS_TEXTS.badges.optionalRecommended}
              </span>
            </div>

            <div className={styles.guideBox}>
              <div className={styles.guideItem}>
                <strong>{PAYMENT_SETTINGS_TEXTS.guideLabels.what}</strong>{' '}
                <span>{PAYMENT_SETTINGS_TEXTS.step2.guideWhat}</span>
              </div>
              <div className={styles.guideItem}>
                <strong>{PAYMENT_SETTINGS_TEXTS.guideLabels.why}</strong>{' '}
                <span>{PAYMENT_SETTINGS_TEXTS.step2.guideWhy}</span>
              </div>
            </div>

            <div className={styles.webhookRow}>
              <div className={styles.webhookInputCol}>
                <Input
                  id="mp-webhook-url-input"
                  label={PAYMENT_SETTINGS_TEXTS.step2.urlLabel}
                  value={summary.webhookUrl}
                  readOnly
                  className={styles.monoInput}
                  onFocus={(e) => e.currentTarget.select()}
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="md"
                onClick={() => void handleCopyWebhookUrl()}
                leftIcon={
                  copiedWebhook ? (
                    <Check size={15} strokeWidth={2} />
                  ) : (
                    <Copy size={15} strokeWidth={1.75} />
                  )
                }
              >
                {copiedWebhook
                  ? PAYMENT_SETTINGS_TEXTS.step2.copiedButton
                  : PAYMENT_SETTINGS_TEXTS.step2.copyButton}
              </Button>
            </div>

            <div className={styles.stepsBox}>
              <span className={styles.stepsBoxTitle}>{PAYMENT_SETTINGS_TEXTS.step2.stepsTitle}</span>
              <ol className={styles.stepsList}>
                {PAYMENT_SETTINGS_TEXTS.step2.steps.map((stepText) => (
                  <li key={stepText}>{stepText}</li>
                ))}
              </ol>
            </div>
          </section>

          {/* STEP 03: Webhook Secret (Optional · Recommended) */}
          <section
            id={PAYMENT_STEP_IDS.webhookSecret}
            className={styles.sectionBlock}
            aria-labelledby="mp-step-03-heading"
          >
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleGroup}>
                <span className={styles.sectionPill}>{PAYMENT_SETTINGS_TEXTS.step3.sectionNum}</span>
                <h3 id="mp-step-03-heading" className={styles.sectionTitle}>
                  {PAYMENT_SETTINGS_TEXTS.step3.sectionTitle}
                </h3>
              </div>
              <span className={`${styles.requirementBadge} ${styles.requirementOptional}`}>
                {PAYMENT_SETTINGS_TEXTS.badges.optionalRecommended}
              </span>
            </div>

            <div className={styles.guideBox}>
              <div className={styles.guideItem}>
                <strong>{PAYMENT_SETTINGS_TEXTS.guideLabels.what}</strong>{' '}
                <span>{PAYMENT_SETTINGS_TEXTS.step3.guideWhat}</span>
              </div>
              <div className={styles.guideItem}>
                <strong>{PAYMENT_SETTINGS_TEXTS.guideLabels.why}</strong>{' '}
                <span>{PAYMENT_SETTINGS_TEXTS.step3.guideWhy}</span>
              </div>
            </div>

            <div className={styles.secretFieldGroup}>
              <div className={styles.secretFieldHeader}>
                <label htmlFor="mp-input-webhook-secret" className={styles.secretFieldLabel}>
                  {PAYMENT_SETTINGS_TEXTS.step3.inputLabel}
                </label>
              </div>
              <div className={styles.secretInputBox}>
                <Input
                  id="mp-input-webhook-secret"
                  type={showWebhookSecret ? 'text' : 'password'}
                  autoComplete="off"
                  spellCheck={false}
                  value={webhookSecret}
                  onChange={(e) => {
                    setWebhookSecret(e.target.value);
                    if (fieldErrors.webhookSecret) {
                      setFieldErrors((prev) => ({ ...prev, webhookSecret: undefined }));
                    }
                  }}
                  placeholder={
                    summary.hasWebhookSecret
                      ? PAYMENT_SETTINGS_TEXTS.step3.placeholderSaved
                      : PAYMENT_SETTINGS_TEXTS.step3.placeholderNew
                  }
                  helperText={PAYMENT_SETTINGS_TEXTS.step3.helper}
                  error={fieldErrors.webhookSecret}
                  disabled={saving || !isEditingUnlocked}
                  className={styles.secretInput}
                />
                <button
                  type="button"
                  className={styles.toggleSecretBtn}
                  onClick={() => setShowWebhookSecret((prev) => !prev)}
                  disabled={saving || !isEditingUnlocked}
                  aria-label={
                    showWebhookSecret
                      ? PAYMENT_SETTINGS_TEXTS.form.hideSecretAria
                      : PAYMENT_SETTINGS_TEXTS.form.showSecretAria
                  }
                >
                  {showWebhookSecret ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div className={`${styles.banner} ${styles.bannerWarning}`} role="alert">
              <AlertTriangle size={15} className={styles.bannerIcon} aria-hidden="true" />
              <span>{PAYMENT_SETTINGS_TEXTS.step3.criticalWarning}</span>
            </div>
          </section>

          <footer id={PAYMENT_STEP_IDS.formActions} className={styles.footer}>
            <span className={styles.footerHint}>
              {!isEditingUnlocked
                ? PAYMENT_SETTINGS_TEXTS.form.lockedFooterHint
                : !hasDraftInput
                  ? PAYMENT_SETTINGS_TEXTS.form.noChangesHint
                  : ''}
            </span>

            <div className={styles.footerActions}>
              {isEditingUnlocked && (
                <Button
                  type="button"
                  variant="outline"
                  size="md"
                  disabled={saving}
                  onClick={handleLockEditing}
                >
                  {PAYMENT_SETTINGS_TEXTS.caution.lockButton}
                </Button>
              )}

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={saving || !isEditingUnlocked || !hasDraftInput}
                isLoading={saving}
                leftIcon={<Save size={15} strokeWidth={1.75} />}
              >
                {hasOwnCredentials
                  ? PAYMENT_SETTINGS_TEXTS.form.updateButton
                  : PAYMENT_SETTINGS_TEXTS.form.saveButton}
              </Button>
            </div>
          </footer>
        </form>

        {hasOwnCredentials && isEditingUnlocked && (
          <section className={styles.dangerZone} aria-labelledby="mp-danger-zone-title">
            <div className={styles.dangerZoneInfo}>
              <h4 id="mp-danger-zone-title" className={styles.dangerZoneTitle}>
                <AlertTriangle size={15} strokeWidth={2} aria-hidden="true" />
                <span>{PAYMENT_SETTINGS_TEXTS.form.dangerZoneTitle}</span>
              </h4>
              <p className={styles.dangerZoneDesc}>
                {PAYMENT_SETTINGS_TEXTS.form.dangerZoneDescription}
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={saving}
              onClick={() => setConfirmClearOpen(true)}
              className={styles.dangerClearBtn}
              leftIcon={<Trash2 size={14} strokeWidth={1.85} />}
            >
              {PAYMENT_SETTINGS_TEXTS.form.clearButton}
            </Button>
          </section>
        )}
      </section>

      {saving && (
        <Loader
          fullScreen
          title={PAYMENT_SETTINGS_TEXTS.loader.savingTitle}
          subtitle={PAYMENT_SETTINGS_TEXTS.loader.savingSubtitle}
          icon="shield"
        />
      )}

      <AlertModal
        isOpen={confirmClearOpen}
        onClose={() => setConfirmClearOpen(false)}
        type="error"
        title={PAYMENT_SETTINGS_TEXTS.form.clearModalTitle}
        message={PAYMENT_SETTINGS_TEXTS.form.clearModalMessage}
        confirmText={PAYMENT_SETTINGS_TEXTS.form.clearModalConfirm}
        onConfirm={() => void handleConfirmClearCredentials()}
        secondaryText={PAYMENT_SETTINGS_TEXTS.form.clearModalCancel}
        onSecondary={() => setConfirmClearOpen(false)}
        closeOnBackdropClick
        closeOnEscape
      />

      <AlertModal
        isOpen={alertState.isOpen}
        onClose={() => setAlertState((prev) => ({ ...prev, isOpen: false }))}
        title={alertState.title}
        message={alertState.message}
        type={alertState.type}
      />
    </div>
  );
};

export default PaymentSettingsManager;
