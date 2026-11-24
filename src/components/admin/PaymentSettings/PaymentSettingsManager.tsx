import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  CreditCard,
  CheckCircle2,
  AlertTriangle,
  ShieldCheck,
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
import FormProgressTracker, { type FormProgressStep } from '../../common/FormProgressTracker';
import { PAYMENT_SETTINGS_TEXTS } from '../../../texts';
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

  const [accessToken, setAccessToken] = useState('');
  const [webhookSecret, setWebhookSecret] = useState('');
  const [showAccessToken, setShowAccessToken] = useState(false);
  const [showWebhookSecret, setShowWebhookSecret] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<{
    accessToken?: string;
    webhookSecret?: string;
  }>({});

  const [copiedWebhook, setCopiedWebhook] = useState(false);
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
    }, 4500);
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

  const trimmedAccessToken = accessToken.trim();
  const trimmedWebhookSecret = webhookSecret.trim();
  const hasDraftInput = Boolean(trimmedAccessToken || trimmedWebhookSecret);

  const progressSteps = useMemo<FormProgressStep[]>(() => {
    const p = PAYMENT_SETTINGS_TEXTS.progress;

    let tokenStatus: FormProgressStep['status'];
    let tokenDetail: string;
    if (fieldErrors.accessToken) {
      tokenStatus = 'error';
      tokenDetail = p.step1Error;
    } else if (trimmedAccessToken) {
      tokenStatus = 'partial';
      tokenDetail = p.step1Unsaved;
    } else if (summary?.maskedAccessToken) {
      tokenStatus = 'complete';
      tokenDetail = p.step1Complete(summary.maskedAccessToken);
    } else if (summary?.isDemoFallbackActive) {
      tokenStatus = 'partial';
      tokenDetail = p.step1Demo;
    } else {
      tokenStatus = 'pending';
      tokenDetail = p.step1Pending;
    }

    let secretStatus: FormProgressStep['status'];
    let secretDetail: string;
    if (fieldErrors.webhookSecret) {
      secretStatus = 'error';
      secretDetail = p.step2Error;
    } else if (trimmedWebhookSecret) {
      secretStatus = 'partial';
      secretDetail = p.step2Unsaved;
    } else if (summary?.hasWebhookSecret) {
      secretStatus = 'complete';
      secretDetail = p.step2Complete;
    } else {
      secretStatus = 'optional_empty';
      secretDetail = p.step2Pending;
    }

    return [
      {
        id: 'mp-access-token',
        stepNumber: '01',
        label: p.step1Label,
        status: tokenStatus,
        detail: tokenDetail,
        targetId: 'mp-input-access-token',
      },
      {
        id: 'mp-webhook-secret',
        stepNumber: '02',
        label: p.step2Label,
        status: secretStatus,
        optional: true,
        detail: secretDetail,
        targetId: 'mp-input-webhook-secret',
      },
      {
        id: 'mp-webhook-url',
        stepNumber: '03',
        label: p.step3Label,
        status: summary?.webhookUrl ? 'optional_done' : 'optional_empty',
        optional: true,
        detail: p.step3Detail,
        targetId: 'mp-section-webhook',
      },
    ];
  }, [summary, trimmedAccessToken, trimmedWebhookSecret, fieldErrors]);

  const handleCopyWebhookUrl = async () => {
    if (!summary?.webhookUrl) return;
    try {
      await navigator.clipboard.writeText(summary.webhookUrl);
      setCopiedWebhook(true);
      if (copyTimerRef.current) clearTimeout(copyTimerRef.current);
      copyTimerRef.current = setTimeout(() => {
        setCopiedWebhook(false);
        copyTimerRef.current = null;
      }, 2500);
    } catch {
      setAlertState({
        isOpen: true,
        title: PAYMENT_SETTINGS_TEXTS.webhook.sectionTitle,
        message: PAYMENT_SETTINGS_TEXTS.feedback.copyError,
        type: 'warning',
      });
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

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

  const handleClearCredentials = async () => {
    if (!window.confirm(PAYMENT_SETTINGS_TEXTS.form.clearConfirm)) {
      return;
    }

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
          steps={progressSteps}
          readyMessage={PAYMENT_SETTINGS_TEXTS.progress.readyMessage}
          pendingCompactMessage={PAYMENT_SETTINGS_TEXTS.progress.pendingCompact}
          pendingFooterMessage={PAYMENT_SETTINGS_TEXTS.progress.pendingFooter}
          pendingActionLabel={
            hasDraftInput ? PAYMENT_SETTINGS_TEXTS.progress.saveActionLabel : undefined
          }
          pendingActionTargetId={hasDraftInput ? 'mp-form-actions' : undefined}
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

        <section className={styles.sectionBlock} aria-labelledby="mp-status-heading">
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleGroup}>
              <span className={styles.sectionPill}>{PAYMENT_SETTINGS_TEXTS.status.sectionNum}</span>
              <h3 id="mp-status-heading" className={styles.sectionTitle}>
                {PAYMENT_SETTINGS_TEXTS.status.sectionTitle}
              </h3>
            </div>
          </div>

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

        <section
          id="mp-section-webhook"
          className={styles.sectionBlock}
          aria-labelledby="mp-webhook-heading"
        >
          <div className={styles.sectionHeader}>
            <div className={styles.sectionTitleGroup}>
              <span className={styles.sectionPill}>{PAYMENT_SETTINGS_TEXTS.webhook.sectionNum}</span>
              <h3 id="mp-webhook-heading" className={styles.sectionTitle}>
                {PAYMENT_SETTINGS_TEXTS.webhook.sectionTitle}
              </h3>
            </div>
          </div>

          <p className={styles.webhookDescription}>{PAYMENT_SETTINGS_TEXTS.webhook.description}</p>

          <div className={styles.webhookRow}>
            <div className={styles.webhookInputCol}>
              <Input
                id="mp-webhook-url-input"
                label={PAYMENT_SETTINGS_TEXTS.webhook.urlLabel}
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
                ? PAYMENT_SETTINGS_TEXTS.webhook.copiedButton
                : PAYMENT_SETTINGS_TEXTS.webhook.copyButton}
            </Button>
          </div>

          <ol className={styles.stepsList}>
            {PAYMENT_SETTINGS_TEXTS.webhook.steps.map((stepText) => (
              <li key={stepText}>{stepText}</li>
            ))}
          </ol>
        </section>

        <form onSubmit={handleSubmit} noValidate>
          <section className={styles.sectionBlock} aria-labelledby="mp-form-heading">
            <div className={styles.sectionHeader}>
              <div className={styles.sectionTitleGroup}>
                <span className={styles.sectionPill}>{PAYMENT_SETTINGS_TEXTS.form.sectionNum}</span>
                <h3 id="mp-form-heading" className={styles.sectionTitle}>
                  {PAYMENT_SETTINGS_TEXTS.form.sectionTitle}
                </h3>
              </div>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.secretFieldGroup}>
                <div className={styles.secretFieldHeader}>
                  <label htmlFor="mp-input-access-token" className={styles.secretFieldLabel}>
                    {PAYMENT_SETTINGS_TEXTS.form.accessTokenLabel}
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
                        ? PAYMENT_SETTINGS_TEXTS.form.accessTokenPlaceholderSaved(
                            summary.maskedAccessToken
                          )
                        : PAYMENT_SETTINGS_TEXTS.form.accessTokenPlaceholderNew
                    }
                    helperText={PAYMENT_SETTINGS_TEXTS.form.accessTokenHelper}
                    error={fieldErrors.accessToken}
                    disabled={saving}
                    className={styles.secretInput}
                  />
                  <button
                    type="button"
                    className={styles.toggleSecretBtn}
                    onClick={() => setShowAccessToken((prev) => !prev)}
                    disabled={saving}
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

              <div className={styles.secretFieldGroup}>
                <div className={styles.secretFieldHeader}>
                  <label htmlFor="mp-input-webhook-secret" className={styles.secretFieldLabel}>
                    {PAYMENT_SETTINGS_TEXTS.form.webhookSecretLabel}
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
                        ? PAYMENT_SETTINGS_TEXTS.form.webhookSecretPlaceholderSaved
                        : PAYMENT_SETTINGS_TEXTS.form.webhookSecretPlaceholderNew
                    }
                    helperText={PAYMENT_SETTINGS_TEXTS.form.webhookSecretHelper}
                    error={fieldErrors.webhookSecret}
                    disabled={saving}
                    className={styles.secretInput}
                  />
                  <button
                    type="button"
                    className={styles.toggleSecretBtn}
                    onClick={() => setShowWebhookSecret((prev) => !prev)}
                    disabled={saving}
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
            </div>
          </section>

          <footer id="mp-form-actions" className={styles.footer}>
            {!hasDraftInput && (
              <span className={styles.footerHint}>{PAYMENT_SETTINGS_TEXTS.form.noChangesHint}</span>
            )}

            <div className={styles.footerActions}>
              {hasOwnCredentials && (
                <Button
                  type="button"
                  variant="ghost"
                  size="md"
                  disabled={saving}
                  onClick={() => void handleClearCredentials()}
                  leftIcon={<Trash2 size={15} strokeWidth={1.75} />}
                >
                  {PAYMENT_SETTINGS_TEXTS.form.clearButton}
                </Button>
              )}

              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={saving || !hasDraftInput}
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
