import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  Copy,
  CreditCard,
  ExternalLink,
  Eye,
  EyeOff,
  Globe,
  Inbox,
  Link2,
  PauseCircle,
  PlayCircle,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  Shield,
  SlidersHorizontal,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  DEFAULT_TENANT_TIMEZONE,
  TENANT_SLUG_MAX_LENGTH,
} from '../../config/tenantConstants';
import { useAuth } from '../../hooks/useAuth';
import { isCurrentAuthUser } from '../../services/auth';
import { buildTenantPath } from '../../services/tenantService';
import { validateTenantSlug } from '../../utils/validators';
import {
  changeTenantSlug,
  computePlatformMetrics,
  createTenant,
  extractCallableErrorMessage,
  extractSuperAdminReadErrorMessage,
  filterTenants,
  isPermissionDeniedError,
  MIN_INITIAL_OWNER_PASSWORD_LENGTH,
  subscribeToAllTenants,
  subscribeToTenantMembers,
  suggestSlugFromBusinessName,
  SUPERADMIN_TIMEZONE_OPTIONS,
  updateTenant,
  upsertTenantMember,
  validateChangeSlugInput,
  validateCreateTenantInput,
  validateUpdateTenantInput,
  validateUpsertMemberInput,
  type TenantFilterStatus,
} from '../../services/superadminService';
import type {
  OnboardingRequestDoc,
  SuperAdminCreateTenantResponse,
  TenantDoc,
  TenantMemberDoc,
  TenantRole,
  TenantStatus,
} from '../../types';
import { subscribeToOnboardingRequests } from '../../services/onboardingRequestService';
import Button from '../../components/common/Button/Button';
import Input from '../../components/common/Input/Input';
import Loader from '../../components/common/Loader/Loader';
import AlertModal from '../../components/common/AlertModal';
import { OnboardingRequestsSection } from './components/OnboardingRequestsSection';
import { SUPERADMIN_TEXTS } from '../../texts/pages/SuperAdmin';
import styles from './SuperAdminView.module.css';

const getOriginUrl = (): string => {
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin;
  }
  return 'https://turneado.app';
};

const formatDateShort = (iso?: string): string => {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(parsed);
};

interface CreateTenantModalProps {
  onClose: () => void;
  initialOwnerEmail?: string;
}

const CreateTenantModal: React.FC<CreateTenantModalProps> = ({
  onClose,
  initialOwnerEmail = '',
}) => {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [ownerEmail, setOwnerEmail] = useState(initialOwnerEmail);
  const [ownerPassword, setOwnerPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [timezone, setTimezone] = useState(DEFAULT_TENANT_TIMEZONE);
  const [isDemo, setIsDemo] = useState(false);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [createdResult, setCreatedResult] = useState<{
    name: string;
    data: SuperAdminCreateTenantResponse;
  } | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !isSubmitting) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isSubmitting, onClose]);

  const liveSlugValidation = useMemo(() => {
    const trimmed = slug.trim();
    if (!trimmed) return null;
    return validateTenantSlug(trimmed);
  }, [slug]);

  const origin = getOriginUrl();

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugManuallyEdited) {
      setSlug(suggestSlugFromBusinessName(value));
    }
    if (fieldErrors.name) {
      setFieldErrors((prev) => ({ ...prev, name: '' }));
    }
  };

  const handleSlugChange = (value: string) => {
    setSlugManuallyEdited(true);
    setSlug(value.toLowerCase().replace(/\s+/g, '-'));
    if (fieldErrors.slug) {
      setFieldErrors((prev) => ({ ...prev, slug: '' }));
    }
  };

  const handleResetAutoSlug = () => {
    setSlugManuallyEdited(false);
    setSlug(suggestSlugFromBusinessName(name));
    setFieldErrors((prev) => ({ ...prev, slug: '' }));
  };

  const handleResetForAnother = () => {
    setName('');
    setSlug('');
    setSlugManuallyEdited(false);
    setOwnerEmail('');
    setOwnerPassword('');
    setShowPassword(false);
    setTimezone(DEFAULT_TENANT_TIMEZONE);
    setIsDemo(false);
    setFieldErrors({});
    setSubmitError(null);
    setCreatedResult(null);
  };

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 2000);
    } catch {
      // Clipboard API unavailable
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    const payload = {
      name: name.trim(),
      slug: slug.trim().toLowerCase(),
      ownerEmail: ownerEmail.trim().toLowerCase(),
      ownerPassword: ownerPassword.trim() || undefined,
      timezone,
      isDemo,
    };

    const validation = validateCreateTenantInput(payload);
    if (!validation.isValid) {
      setFieldErrors(validation.errors as Record<string, string>);
      return;
    }

    setFieldErrors({});
    setIsSubmitting(true);

    try {
      const response = await createTenant(payload);
      setCreatedResult({ name: payload.name, data: response });
    } catch (err: unknown) {
      setSubmitError(
        extractCallableErrorMessage(err, SUPERADMIN_TEXTS.errors.genericActionError)
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  const slugError =
    fieldErrors.slug || (liveSlugValidation && !liveSlugValidation.isValid ? liveSlugValidation.error : undefined);

  return (
    <div
      className={styles.modalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="create-tenant-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isSubmitting) {
          onClose();
        }
      }}
    >
      <div className={styles.modalCard}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderText}>
            <h2 id="create-tenant-modal-title" className={styles.modalTitle}>
              {createdResult
                ? SUPERADMIN_TEXTS.createModal.successTitle(createdResult.name)
                : SUPERADMIN_TEXTS.createModal.title}
            </h2>
            <p className={styles.modalSubtitle}>
              {createdResult
                ? SUPERADMIN_TEXTS.createModal.successDescription
                : SUPERADMIN_TEXTS.createModal.subtitle}
            </p>
          </div>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            disabled={isSubmitting}
            aria-label={SUPERADMIN_TEXTS.createModal.closeCta}
          >
            <X size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        {createdResult ? (
          <div className={styles.modalBody}>
            <div className={styles.successBanner}>
              <CheckCircle2 size={18} strokeWidth={1.75} aria-hidden="true" />
              <span>{SUPERADMIN_TEXTS.createModal.successBadge}</span>
            </div>

            <div className={styles.summaryMetaGrid}>
              <div className={styles.summaryMetaItem}>
                <span className={styles.summaryMetaLabel}>
                  {SUPERADMIN_TEXTS.createModal.tenantIdLabel}
                </span>
                <code className={styles.monoCode}>{createdResult.data.tenantId}</code>
              </div>

              <div className={styles.summaryLinkRow}>
                <div className={styles.summaryLinkInfo}>
                  <span className={styles.summaryMetaLabel}>
                    {SUPERADMIN_TEXTS.createModal.publicLinkLabel}
                  </span>
                  <code className={styles.monoCode}>
                    {`${origin}${buildTenantPath(createdResult.data.slug)}`}
                  </code>
                </div>
                <div className={styles.summaryLinkActions}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleCopy('public', `${origin}${buildTenantPath(createdResult.data.slug)}`)
                    }
                    leftIcon={
                      copiedKey === 'public' ? (
                        <Check size={14} strokeWidth={1.75} />
                      ) : (
                        <Copy size={14} strokeWidth={1.75} />
                      )
                    }
                  >
                    {copiedKey === 'public'
                      ? SUPERADMIN_TEXTS.createModal.copiedCta
                      : SUPERADMIN_TEXTS.createModal.copyCta}
                  </Button>
                  <a
                    href={buildTenantPath(createdResult.data.slug)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkReset}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      leftIcon={<ExternalLink size={14} strokeWidth={1.75} />}
                    >
                      {SUPERADMIN_TEXTS.createModal.openCta}
                    </Button>
                  </a>
                </div>
              </div>

              <div className={styles.summaryLinkRow}>
                <div className={styles.summaryLinkInfo}>
                  <span className={styles.summaryMetaLabel}>
                    {SUPERADMIN_TEXTS.createModal.adminLoginLinkLabel}
                  </span>
                  <code className={styles.monoCode}>
                    {`${origin}${buildTenantPath(createdResult.data.slug, '/login')}`}
                  </code>
                </div>
                <div className={styles.summaryLinkActions}>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() =>
                      handleCopy(
                        'login',
                        `${origin}${buildTenantPath(createdResult.data.slug, '/login')}`
                      )
                    }
                    leftIcon={
                      copiedKey === 'login' ? (
                        <Check size={14} strokeWidth={1.75} />
                      ) : (
                        <Copy size={14} strokeWidth={1.75} />
                      )
                    }
                  >
                    {copiedKey === 'login'
                      ? SUPERADMIN_TEXTS.createModal.copiedCta
                      : SUPERADMIN_TEXTS.createModal.copyCta}
                  </Button>
                  <a
                    href={buildTenantPath(createdResult.data.slug, '/login')}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.linkReset}
                  >
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      leftIcon={<ExternalLink size={14} strokeWidth={1.75} />}
                    >
                      {SUPERADMIN_TEXTS.createModal.openCta}
                    </Button>
                  </a>
                </div>
              </div>
            </div>

            <div className={styles.modalFooter}>
              <Button type="button" variant="outline" onClick={handleResetForAnother}>
                {SUPERADMIN_TEXTS.createModal.createAnotherCta}
              </Button>
              <Button type="button" variant="primary" onClick={onClose}>
                {SUPERADMIN_TEXTS.createModal.closeCta}
              </Button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className={styles.modalBody} noValidate>
            {submitError && (
              <div className={styles.errorBanner} role="alert">
                <AlertTriangle size={16} strokeWidth={1.75} aria-hidden="true" />
                <span>{submitError}</span>
              </div>
            )}

            <div className={styles.formGrid}>
              <Input
                label={SUPERADMIN_TEXTS.createModal.businessNameLabel}
                placeholder={SUPERADMIN_TEXTS.createModal.businessNamePlaceholder}
                required
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                maxLength={100}
                error={fieldErrors.name}
                disabled={isSubmitting}
              />

              <div className={styles.fieldStack}>
                <div className={styles.labelRow}>
                  <label htmlFor="create-tenant-slug" className={styles.fieldLabel}>
                    {SUPERADMIN_TEXTS.createModal.slugLabel}
                    <span className={styles.requiredMark}>*</span>
                  </label>
                  {slugManuallyEdited && name.trim() && (
                    <button
                      type="button"
                      className={styles.inlineLinkBtn}
                      onClick={handleResetAutoSlug}
                    >
                      {SUPERADMIN_TEXTS.createModal.slugManualReset}
                    </button>
                  )}
                </div>
                <Input
                  id="create-tenant-slug"
                  placeholder={SUPERADMIN_TEXTS.createModal.slugPlaceholder}
                  required
                  value={slug}
                  onChange={(e) => handleSlugChange(e.target.value)}
                  maxLength={TENANT_SLUG_MAX_LENGTH}
                  error={slugError}
                  helperText={!slugError ? SUPERADMIN_TEXTS.createModal.slugAutoHint : undefined}
                  disabled={isSubmitting}
                  className={styles.monoInput}
                />
                <div className={styles.urlPreviewBox}>
                  <span className={styles.urlPreviewLabel}>
                    {SUPERADMIN_TEXTS.createModal.slugPreviewLabel}:
                  </span>
                  <code className={styles.urlPreviewValue}>
                    {`${origin}/${slug.trim() || 'tu-negocio'}`}
                  </code>
                </div>
              </div>
            </div>

            <div className={styles.formGrid}>
              <Input
                label={SUPERADMIN_TEXTS.createModal.ownerEmailLabel}
                type="email"
                placeholder={SUPERADMIN_TEXTS.createModal.ownerEmailPlaceholder}
                required
                value={ownerEmail}
                onChange={(e) => {
                  setOwnerEmail(e.target.value);
                  if (fieldErrors.ownerEmail) {
                    setFieldErrors((prev) => ({ ...prev, ownerEmail: '' }));
                  }
                }}
                maxLength={120}
                error={fieldErrors.ownerEmail}
                disabled={isSubmitting}
              />

              <div className={styles.fieldStack}>
                <label htmlFor="create-owner-password" className={styles.fieldLabel}>
                  {SUPERADMIN_TEXTS.createModal.ownerPasswordLabel}
                </label>
                <div className={styles.passwordInputWrap}>
                  <Input
                    id="create-owner-password"
                    type={showPassword ? 'text' : 'password'}
                    placeholder={SUPERADMIN_TEXTS.createModal.ownerPasswordPlaceholder}
                    value={ownerPassword}
                    onChange={(e) => {
                      setOwnerPassword(e.target.value);
                      if (fieldErrors.ownerPassword) {
                        setFieldErrors((prev) => ({ ...prev, ownerPassword: '' }));
                      }
                    }}
                    minLength={MIN_INITIAL_OWNER_PASSWORD_LENGTH}
                    maxLength={100}
                    error={fieldErrors.ownerPassword}
                    helperText={
                      !fieldErrors.ownerPassword
                        ? SUPERADMIN_TEXTS.createModal.ownerPasswordHelper
                        : undefined
                    }
                    disabled={isSubmitting}
                    className={styles.passwordInput}
                    autoComplete="new-password"
                  />
                  <button
                    type="button"
                    className={styles.passwordToggleBtn}
                    onClick={() => setShowPassword((prev) => !prev)}
                    disabled={isSubmitting}
                    aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}
                  >
                    {showPassword ? (
                      <EyeOff size={15} strokeWidth={1.75} aria-hidden="true" />
                    ) : (
                      <Eye size={15} strokeWidth={1.75} aria-hidden="true" />
                    )}
                  </button>
                </div>
              </div>
            </div>

            <div className={styles.fieldStack}>
              <label htmlFor="create-tenant-timezone" className={styles.fieldLabel}>
                {SUPERADMIN_TEXTS.createModal.timezoneLabel}
              </label>
              <select
                id="create-tenant-timezone"
                className={styles.selectInput}
                value={timezone}
                onChange={(e) => setTimezone(e.target.value)}
                disabled={isSubmitting}
              >
                {SUPERADMIN_TIMEZONE_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label} — {opt.value}
                  </option>
                ))}
              </select>
              {fieldErrors.timezone && (
                <span className={styles.fieldError}>{fieldErrors.timezone}</span>
              )}
            </div>

            <div className={styles.switchCard}>
              <div className={styles.switchRow}>
                <div className={styles.switchText}>
                  <label htmlFor="create-tenant-demo" className={styles.switchLabel}>
                    {SUPERADMIN_TEXTS.createModal.demoLabel}
                  </label>
                  <p className={styles.switchDescription}>
                    {SUPERADMIN_TEXTS.createModal.demoDescription}
                  </p>
                </div>
                <label className={styles.toggleSwitch}>
                  <input
                    id="create-tenant-demo"
                    type="checkbox"
                    checked={isDemo}
                    onChange={(e) => setIsDemo(e.target.checked)}
                    disabled={isSubmitting}
                  />
                  <span className={styles.toggleTrack} aria-hidden="true" />
                </label>
              </div>

              {isDemo && (
                <div className={styles.warningBanner} role="note">
                  <AlertTriangle size={16} strokeWidth={1.75} aria-hidden="true" />
                  <span>{SUPERADMIN_TEXTS.createModal.demoWarning}</span>
                </div>
              )}
            </div>

            <div className={styles.modalFooter}>
              <Button
                type="button"
                variant="outline"
                onClick={onClose}
                disabled={isSubmitting}
              >
                {SUPERADMIN_TEXTS.createModal.cancelCta}
              </Button>
              <Button
                type="submit"
                variant="primary"
                isLoading={isSubmitting}
                leftIcon={<Plus size={15} strokeWidth={1.8} />}
              >
                {isSubmitting
                  ? SUPERADMIN_TEXTS.createModal.submittingCta
                  : SUPERADMIN_TEXTS.createModal.submitCta}
              </Button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
};

type ManageTab = 'general' | 'slug' | 'members';

interface ManageTenantModalProps {
  tenant: TenantDoc;
  onClose: () => void;
  onRequestToggleStatus: (tenant: TenantDoc) => void;
}

const ManageTenantModal: React.FC<ManageTenantModalProps> = ({
  tenant,
  onClose,
  onRequestToggleStatus,
}) => {
  const [activeTab, setActiveTab] = useState<ManageTab>('general');

  // Tab 1: General
  const [name, setName] = useState(tenant.name);
  const [timezone, setTimezone] = useState(tenant.timezone || DEFAULT_TENANT_TIMEZONE);
  const [isDemo, setIsDemo] = useState(tenant.isDemo);
  const [savingGeneral, setSavingGeneral] = useState(false);
  const [generalError, setGeneralError] = useState<string | null>(null);
  const [generalSuccess, setGeneralSuccess] = useState<string | null>(null);

  // Tab 2: Slug
  const [newSlug, setNewSlug] = useState('');
  const [changingSlug, setChangingSlug] = useState(false);
  const [slugError, setSlugError] = useState<string | null>(null);
  const [slugSuccess, setSlugSuccess] = useState<string | null>(null);

  // Tab 3: Members
  const {
    user,
    isPlatformAdmin,
    loading: authLoading,
    isLoggingOut,
    claimsRevision,
    refreshClaims,
  } = useAuth();
  const [membersRetryNonce, setMembersRetryNonce] = useState(0);
  const [isRecoveringMembers, setIsRecoveringMembers] = useState(false);
  const membersRecoveryAttemptsRef = useRef<{ key: string; count: number }>({
    key: '',
    count: 0,
  });
  const [membersState, setMembersState] = useState<{
    key: string | null;
    items: TenantMemberDoc[];
    error: string | null;
  }>({ key: null, items: [], error: null });
  const [memberEmail, setMemberEmail] = useState('');
  const [memberRole, setMemberRole] = useState<TenantRole>('staff');
  const [savingMember, setSavingMember] = useState(false);
  const [busyMemberUid, setBusyMemberUid] = useState<string | null>(null);
  const [memberActionError, setMemberActionError] = useState<string | null>(null);
  const [memberActionSuccess, setMemberActionSuccess] = useState<string | null>(null);

  const origin = getOriginUrl();
  const userUid = user?.uid ?? null;
  const canSubscribeMembers =
    !authLoading && !isLoggingOut && Boolean(userUid) && isPlatformAdmin && !isRecoveringMembers;
  const membersSubKey = canSubscribeMembers
    ? `${tenant.id}:${userUid}:${claimsRevision}:${membersRetryNonce}`
    : null;
  const membersSettled = membersSubKey !== null && membersState.key === membersSubKey;
  const membersLoading = isRecoveringMembers || (canSubscribeMembers && !membersSettled);
  const membersError = membersSettled ? membersState.error : null;
  const members = membersState.items;

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && !savingGeneral && !changingSlug && !savingMember) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [savingGeneral, changingSlug, savingMember, onClose]);

  useEffect(() => {
    if (!isRecoveringMembers) return;

    let active = true;
    let timerId: number | null = null;

    void refreshClaims().then((refreshed) => {
      if (!active) return;
      if (!refreshed?.platformAdmin) {
        setIsRecoveringMembers(false);
        return;
      }
      timerId = window.setTimeout(() => {
        if (!active) return;
        setIsRecoveringMembers(false);
        setMembersRetryNonce((n) => n + 1);
      }, 350);
    });

    return () => {
      active = false;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [isRecoveringMembers, refreshClaims]);

  useEffect(() => {
    if (!canSubscribeMembers || !membersSubKey || !userUid) {
      return;
    }

    let active = true;
    const attemptKey = `${tenant.id}:${userUid}`;

    const unsubscribe = subscribeToTenantMembers(
      tenant.id,
      (list) => {
        if (!active) return;
        membersRecoveryAttemptsRef.current = { key: attemptKey, count: 0 };
        setMembersState({ key: membersSubKey, items: list, error: null });
      },
      (err) => {
        if (!active || isLoggingOut || !isCurrentAuthUser(userUid)) {
          return;
        }

        if (isPermissionDeniedError(err)) {
          const prevCount =
            membersRecoveryAttemptsRef.current.key === attemptKey
              ? membersRecoveryAttemptsRef.current.count
              : 0;
          if (prevCount < 1) {
            membersRecoveryAttemptsRef.current = { key: attemptKey, count: prevCount + 1 };
            setIsRecoveringMembers(true);
            return;
          }

          setMembersState((prev) => ({
            key: membersSubKey,
            items: prev.items,
            error: extractSuperAdminReadErrorMessage(err, {
              fallback: SUPERADMIN_TEXTS.errors.genericActionError,
              hasVerifiedPlatformClaim: true,
              verifiedClaimMessage: SUPERADMIN_TEXTS.errors.membersRulesOrTokenSync,
            }),
          }));
          return;
        }

        setMembersState((prev) => ({
          key: membersSubKey,
          items: prev.items,
          error: extractCallableErrorMessage(err, SUPERADMIN_TEXTS.errors.genericActionError),
        }));
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [canSubscribeMembers, membersSubKey, tenant.id, userUid, isLoggingOut]);

  const timezoneOptions = useMemo(() => {
    const exists = SUPERADMIN_TIMEZONE_OPTIONS.some((opt) => opt.value === timezone);
    if (exists || !timezone) {
      return SUPERADMIN_TIMEZONE_OPTIONS;
    }
    return [{ value: timezone, label: timezone }, ...SUPERADMIN_TIMEZONE_OPTIONS];
  }, [timezone]);

  const liveNewSlugValidation = useMemo(() => {
    const clean = newSlug.trim().toLowerCase();
    if (!clean) return null;
    return validateChangeSlugInput(tenant.id, clean, tenant.slug);
  }, [tenant.id, tenant.slug, newSlug]);

  const handleSaveGeneral = async (e: React.FormEvent) => {
    e.preventDefault();
    setGeneralError(null);
    setGeneralSuccess(null);

    const payload = {
      tenantId: tenant.id,
      name: name.trim(),
      timezone,
      isDemo,
    };

    const validation = validateUpdateTenantInput(payload);
    if (!validation.isValid) {
      const firstErr = Object.values(validation.errors)[0];
      setGeneralError(firstErr || SUPERADMIN_TEXTS.errors.genericActionError);
      return;
    }

    setSavingGeneral(true);
    try {
      await updateTenant(payload, tenant.slug);
      setGeneralSuccess(SUPERADMIN_TEXTS.manageModal.general.savedSuccess);
    } catch (err: unknown) {
      setGeneralError(
        extractCallableErrorMessage(err, SUPERADMIN_TEXTS.errors.genericActionError)
      );
    } finally {
      setSavingGeneral(false);
    }
  };

  const handleChangeSlugSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSlugError(null);
    setSlugSuccess(null);

    const cleanSlug = newSlug.trim().toLowerCase();
    const validation = validateChangeSlugInput(tenant.id, cleanSlug, tenant.slug);
    if (!validation.isValid) {
      setSlugError(validation.errors.newSlug || SUPERADMIN_TEXTS.errors.genericActionError);
      return;
    }

    setChangingSlug(true);
    try {
      const res = await changeTenantSlug(
        {
          tenantId: tenant.id,
          newSlug: cleanSlug,
        },
        tenant.slug
      );
      setNewSlug('');
      setSlugSuccess(
        SUPERADMIN_TEXTS.manageModal.slug.changedSuccess(res.previousSlug, res.newSlug)
      );
    } catch (err: unknown) {
      setSlugError(extractCallableErrorMessage(err, SUPERADMIN_TEXTS.errors.genericActionError));
    } finally {
      setChangingSlug(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    setMemberActionError(null);
    setMemberActionSuccess(null);

    const payload = {
      tenantId: tenant.id,
      email: memberEmail.trim().toLowerCase(),
      role: memberRole,
      active: true,
    };

    const validation = validateUpsertMemberInput(payload);
    if (!validation.isValid) {
      const firstErr = Object.values(validation.errors)[0];
      setMemberActionError(firstErr || SUPERADMIN_TEXTS.errors.genericActionError);
      return;
    }

    setSavingMember(true);
    try {
      await upsertTenantMember(payload);
      setMemberEmail('');
      setMemberActionSuccess(SUPERADMIN_TEXTS.manageModal.members.updatedSuccess);
    } catch (err: unknown) {
      setMemberActionError(
        extractCallableErrorMessage(err, SUPERADMIN_TEXTS.errors.genericActionError)
      );
    } finally {
      setSavingMember(false);
    }
  };

  const handleUpdateExistingMember = async (
    member: TenantMemberDoc,
    nextRole: TenantRole,
    nextActive: boolean
  ) => {
    setMemberActionError(null);
    setMemberActionSuccess(null);
    setBusyMemberUid(member.uid);

    try {
      await upsertTenantMember({
        tenantId: tenant.id,
        email: member.email,
        role: nextRole,
        active: nextActive,
      });
      setMemberActionSuccess(SUPERADMIN_TEXTS.manageModal.members.updatedSuccess);
    } catch (err: unknown) {
      setMemberActionError(
        extractCallableErrorMessage(err, SUPERADMIN_TEXTS.errors.genericActionError)
      );
    } finally {
      setBusyMemberUid(null);
    }
  };

  return (
    <div
      className={styles.modalBackdrop}
      role="dialog"
      aria-modal="true"
      aria-labelledby="manage-tenant-modal-title"
      onClick={(e) => {
        if (e.target === e.currentTarget && !savingGeneral && !changingSlug && !savingMember) {
          onClose();
        }
      }}
    >
      <div className={`${styles.modalCard} ${styles.modalCardWide}`}>
        <div className={styles.modalHeader}>
          <div className={styles.modalHeaderText}>
            <div className={styles.manageTitleRow}>
              <h2 id="manage-tenant-modal-title" className={styles.modalTitle}>
                {SUPERADMIN_TEXTS.manageModal.title(tenant.name)}
              </h2>
              <span
                className={`${styles.statusBadge} ${
                  tenant.status === 'active' ? styles.badgeActive : styles.badgeSuspended
                }`}
              >
                {tenant.status === 'active'
                  ? SUPERADMIN_TEXTS.dashboard.table.statusActive
                  : SUPERADMIN_TEXTS.dashboard.table.statusSuspended}
              </span>
            </div>
            <div className={styles.manageMetaRow}>
              <code className={styles.monoCode}>{tenant.id}</code>
              <span>·</span>
              <code className={styles.monoCode}>/{tenant.slug}</code>
            </div>
          </div>

          <button
            type="button"
            className={styles.closeBtn}
            onClick={onClose}
            aria-label={SUPERADMIN_TEXTS.createModal.closeCta}
          >
            <X size={16} strokeWidth={1.75} aria-hidden="true" />
          </button>
        </div>

        <div className={styles.modalTabs} role="tablist">
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'general'}
            className={`${styles.modalTabBtn} ${
              activeTab === 'general' ? styles.modalTabBtnActive : ''
            }`}
            onClick={() => setActiveTab('general')}
          >
            <SlidersHorizontal size={14} strokeWidth={1.75} aria-hidden="true" />
            <span>{SUPERADMIN_TEXTS.manageModal.tabs.general}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'slug'}
            className={`${styles.modalTabBtn} ${
              activeTab === 'slug' ? styles.modalTabBtnActive : ''
            }`}
            onClick={() => setActiveTab('slug')}
          >
            <Link2 size={14} strokeWidth={1.75} aria-hidden="true" />
            <span>{SUPERADMIN_TEXTS.manageModal.tabs.slug}</span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'members'}
            className={`${styles.modalTabBtn} ${
              activeTab === 'members' ? styles.modalTabBtnActive : ''
            }`}
            onClick={() => setActiveTab('members')}
          >
            <Users size={14} strokeWidth={1.75} aria-hidden="true" />
            <span>{SUPERADMIN_TEXTS.manageModal.tabs.members}</span>
            {!membersLoading && <span className={styles.tabBadge}>{members.length}</span>}
          </button>
        </div>

        <div className={styles.modalBody}>
          {activeTab === 'general' && (
            <div className={styles.tabPanel}>
              <form onSubmit={handleSaveGeneral} className={styles.sectionStack}>
                {generalError && (
                  <div className={styles.errorBanner} role="alert">
                    <AlertTriangle size={16} strokeWidth={1.75} aria-hidden="true" />
                    <span>{generalError}</span>
                  </div>
                )}

                {generalSuccess && (
                  <div className={styles.successBanner} role="status">
                    <CheckCircle2 size={16} strokeWidth={1.75} aria-hidden="true" />
                    <span>{generalSuccess}</span>
                  </div>
                )}

                <div className={styles.formGrid}>
                  <Input
                    label={SUPERADMIN_TEXTS.manageModal.general.nameLabel}
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    maxLength={100}
                    disabled={savingGeneral}
                  />

                  <div className={styles.fieldStack}>
                    <label htmlFor="manage-tenant-timezone" className={styles.fieldLabel}>
                      {SUPERADMIN_TEXTS.manageModal.general.timezoneLabel}
                    </label>
                    <select
                      id="manage-tenant-timezone"
                      className={styles.selectInput}
                      value={timezone}
                      onChange={(e) => setTimezone(e.target.value)}
                      disabled={savingGeneral}
                    >
                      {timezoneOptions.map((opt) => (
                        <option key={opt.value} value={opt.value}>
                          {opt.label} — {opt.value}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className={styles.switchCard}>
                  <div className={styles.switchRow}>
                    <div className={styles.switchText}>
                      <label htmlFor="manage-tenant-demo" className={styles.switchLabel}>
                        {SUPERADMIN_TEXTS.manageModal.general.demoLabel}
                      </label>
                      <p className={styles.switchDescription}>
                        {SUPERADMIN_TEXTS.manageModal.general.demoDescription}
                      </p>
                    </div>
                    <label className={styles.toggleSwitch}>
                      <input
                        id="manage-tenant-demo"
                        type="checkbox"
                        checked={isDemo}
                        onChange={(e) => setIsDemo(e.target.checked)}
                        disabled={savingGeneral}
                      />
                      <span className={styles.toggleTrack} aria-hidden="true" />
                    </label>
                  </div>

                  {isDemo && (
                    <div className={styles.warningBanner} role="note">
                      <AlertTriangle size={16} strokeWidth={1.75} aria-hidden="true" />
                      <span>{SUPERADMIN_TEXTS.manageModal.general.demoWarning}</span>
                    </div>
                  )}
                </div>

                <div className={styles.inlineFooter}>
                  <Button type="submit" variant="primary" isLoading={savingGeneral}>
                    {savingGeneral
                      ? SUPERADMIN_TEXTS.manageModal.general.savingCta
                      : SUPERADMIN_TEXTS.manageModal.general.saveCta}
                  </Button>
                </div>
              </form>

              <div className={styles.statusActionBox}>
                <div className={styles.statusActionText}>
                  <h3 className={styles.subSectionTitle}>
                    {SUPERADMIN_TEXTS.manageModal.general.statusZoneTitle}
                  </h3>
                  <p className={styles.subSectionDescription}>
                    {tenant.status === 'active'
                      ? SUPERADMIN_TEXTS.manageModal.general.statusZoneActiveDesc
                      : SUPERADMIN_TEXTS.manageModal.general.statusZoneSuspendedDesc}
                  </p>
                </div>
                <Button
                  type="button"
                  variant={tenant.status === 'active' ? 'danger' : 'success'}
                  size="sm"
                  onClick={() => onRequestToggleStatus(tenant)}
                  leftIcon={
                    tenant.status === 'active' ? (
                      <PauseCircle size={15} strokeWidth={1.75} />
                    ) : (
                      <PlayCircle size={15} strokeWidth={1.75} />
                    )
                  }
                >
                  {tenant.status === 'active'
                    ? SUPERADMIN_TEXTS.manageModal.general.suspendAction
                    : SUPERADMIN_TEXTS.manageModal.general.reactivateAction}
                </Button>
              </div>
            </div>
          )}

          {activeTab === 'slug' && (
            <div className={styles.tabPanel}>
              <div className={styles.slugInfoGrid}>
                <div className={styles.summaryMetaItem}>
                  <span className={styles.summaryMetaLabel}>
                    {SUPERADMIN_TEXTS.manageModal.slug.currentLabel}
                  </span>
                  <code className={styles.monoCode}>{`${origin}/${tenant.slug}`}</code>
                </div>

                <div className={styles.summaryMetaItem}>
                  <span className={styles.summaryMetaLabel}>
                    {SUPERADMIN_TEXTS.manageModal.slug.previousLabel}
                  </span>
                  {tenant.previousSlugs && tenant.previousSlugs.length > 0 ? (
                    <div className={styles.previousSlugsList}>
                      {tenant.previousSlugs.map((prevSlug) => (
                        <code key={prevSlug} className={styles.previousSlugChip}>
                          /{prevSlug}
                        </code>
                      ))}
                    </div>
                  ) : (
                    <span className={styles.mutedText}>
                      {SUPERADMIN_TEXTS.manageModal.slug.noPrevious}
                    </span>
                  )}
                </div>
              </div>

              <form onSubmit={handleChangeSlugSubmit} className={styles.sectionStack}>
                {slugError && (
                  <div className={styles.errorBanner} role="alert">
                    <AlertTriangle size={16} strokeWidth={1.75} aria-hidden="true" />
                    <span>{slugError}</span>
                  </div>
                )}

                {slugSuccess && (
                  <div className={styles.successBanner} role="status">
                    <CheckCircle2 size={16} strokeWidth={1.75} aria-hidden="true" />
                    <span>{slugSuccess}</span>
                  </div>
                )}

                <Input
                  label={SUPERADMIN_TEXTS.manageModal.slug.newSlugLabel}
                  placeholder={SUPERADMIN_TEXTS.manageModal.slug.newSlugPlaceholder}
                  required
                  value={newSlug}
                  onChange={(e) => {
                    setNewSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'));
                    setSlugError(null);
                  }}
                  maxLength={TENANT_SLUG_MAX_LENGTH}
                  error={
                    liveNewSlugValidation && !liveNewSlugValidation.isValid
                      ? liveNewSlugValidation.errors.newSlug
                      : undefined
                  }
                  disabled={changingSlug}
                  className={styles.monoInput}
                />

                <div className={styles.urlPreviewBox}>
                  <span className={styles.urlPreviewLabel}>
                    {SUPERADMIN_TEXTS.manageModal.slug.previewLabel}:
                  </span>
                  <code className={styles.urlPreviewValue}>
                    {`${origin}/${newSlug.trim() || tenant.slug}`}
                  </code>
                </div>

                <div className={styles.warningBanner} role="note">
                  <AlertTriangle size={16} strokeWidth={1.75} aria-hidden="true" />
                  <span>
                    {SUPERADMIN_TEXTS.manageModal.slug.redirectWarning(
                      tenant.slug,
                      newSlug.trim()
                    )}
                  </span>
                </div>

                <div className={styles.inlineFooter}>
                  <Button
                    type="submit"
                    variant="primary"
                    isLoading={changingSlug}
                    disabled={!newSlug.trim()}
                    leftIcon={<Link2 size={15} strokeWidth={1.75} />}
                  >
                    {changingSlug
                      ? SUPERADMIN_TEXTS.manageModal.slug.submittingCta
                      : SUPERADMIN_TEXTS.manageModal.slug.submitCta}
                  </Button>
                </div>
              </form>
            </div>
          )}

          {activeTab === 'members' && (
            <div className={styles.tabPanel}>
              <div className={styles.sectionHeaderText}>
                <h3 className={styles.subSectionTitle}>
                  {SUPERADMIN_TEXTS.manageModal.members.sectionTitle}
                </h3>
                <p className={styles.subSectionDescription}>
                  {SUPERADMIN_TEXTS.manageModal.members.sectionDescription}
                </p>
              </div>

              {memberActionError && (
                <div className={styles.errorBanner} role="alert">
                  <AlertTriangle size={16} strokeWidth={1.75} aria-hidden="true" />
                  <span>{memberActionError}</span>
                </div>
              )}

              {memberActionSuccess && (
                <div className={styles.successBanner} role="status">
                  <CheckCircle2 size={16} strokeWidth={1.75} aria-hidden="true" />
                  <span>{memberActionSuccess}</span>
                </div>
              )}

              {membersError && (
                <div className={styles.errorBanner} role="alert">
                  <AlertTriangle size={16} strokeWidth={1.75} aria-hidden="true" />
                  <div className={styles.errorBannerContent}>
                    <span>{membersError}</span>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        membersRecoveryAttemptsRef.current = {
                          key: `${tenant.id}:${userUid ?? ''}`,
                          count: 0,
                        };
                        setMembersRetryNonce((n) => n + 1);
                      }}
                      leftIcon={<RefreshCw size={13} strokeWidth={1.75} />}
                    >
                      {SUPERADMIN_TEXTS.dashboard.retryCta}
                    </Button>
                  </div>
                </div>
              )}

              {membersLoading ? (
                <p className={styles.mutedText}>{SUPERADMIN_TEXTS.manageModal.members.loading}</p>
              ) : members.length === 0 ? (
                <p className={styles.mutedText}>{SUPERADMIN_TEXTS.manageModal.members.empty}</p>
              ) : (
                <div className={styles.membersList}>
                  {members.map((member) => {
                    const isBusy = busyMemberUid === member.uid;
                    const nextRole: TenantRole = member.role === 'owner' ? 'staff' : 'owner';

                    return (
                      <div key={member.uid} className={styles.memberRow}>
                        <div className={styles.memberInfo}>
                          <div className={styles.memberIdentity}>
                            <span className={styles.memberEmail}>{member.email || member.uid}</span>
                            <span
                              className={`${styles.statusBadge} ${
                                member.role === 'owner' ? styles.badgeDemo : styles.badgeNeutral
                              }`}
                            >
                              {member.role === 'owner'
                                ? SUPERADMIN_TEXTS.manageModal.members.roleOwner
                                : SUPERADMIN_TEXTS.manageModal.members.roleStaff}
                            </span>
                            <span
                              className={`${styles.statusBadge} ${
                                member.active ? styles.badgeActive : styles.badgeSuspended
                              }`}
                            >
                              {member.active
                                ? SUPERADMIN_TEXTS.manageModal.members.statusActive
                                : SUPERADMIN_TEXTS.manageModal.members.statusRevoked}
                            </span>
                          </div>
                          <code className={styles.memberUid}>{member.uid}</code>
                        </div>

                        <div className={styles.memberActions}>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            isLoading={isBusy}
                            disabled={Boolean(busyMemberUid) && !isBusy}
                            onClick={() =>
                              handleUpdateExistingMember(member, nextRole, member.active)
                            }
                          >
                            {member.role === 'owner'
                              ? SUPERADMIN_TEXTS.manageModal.members.makeStaff
                              : SUPERADMIN_TEXTS.manageModal.members.makeOwner}
                          </Button>

                          <Button
                            type="button"
                            variant={member.active ? 'danger' : 'success'}
                            size="sm"
                            isLoading={isBusy}
                            disabled={Boolean(busyMemberUid) && !isBusy}
                            onClick={() =>
                              handleUpdateExistingMember(member, member.role, !member.active)
                            }
                          >
                            {member.active
                              ? SUPERADMIN_TEXTS.manageModal.members.revokeCta
                              : SUPERADMIN_TEXTS.manageModal.members.reactivateCta}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}

              <form onSubmit={handleAddMember} className={styles.addMemberForm}>
                <h4 className={styles.addMemberTitle}>
                  <UserPlus size={15} strokeWidth={1.75} aria-hidden="true" />
                  <span>{SUPERADMIN_TEXTS.manageModal.members.addTitle}</span>
                </h4>

                <div className={styles.addMemberGrid}>
                  <Input
                    label={SUPERADMIN_TEXTS.manageModal.members.emailLabel}
                    type="email"
                    placeholder={SUPERADMIN_TEXTS.manageModal.members.emailPlaceholder}
                    required
                    value={memberEmail}
                    onChange={(e) => setMemberEmail(e.target.value)}
                    maxLength={120}
                    disabled={savingMember}
                  />

                  <div className={styles.fieldStack}>
                    <label htmlFor="member-role-select" className={styles.fieldLabel}>
                      {SUPERADMIN_TEXTS.manageModal.members.roleLabel}
                    </label>
                    <select
                      id="member-role-select"
                      className={styles.selectInput}
                      value={memberRole}
                      onChange={(e) => setMemberRole(e.target.value as TenantRole)}
                      disabled={savingMember}
                    >
                      <option value="owner">
                        {SUPERADMIN_TEXTS.manageModal.members.roleOwner} (owner)
                      </option>
                      <option value="staff">
                        {SUPERADMIN_TEXTS.manageModal.members.roleStaff} (staff)
                      </option>
                    </select>
                  </div>
                </div>

                <div className={styles.inlineFooter}>
                  <Button
                    type="submit"
                    variant="primary"
                    size="sm"
                    isLoading={savingMember}
                    leftIcon={<UserPlus size={14} strokeWidth={1.75} />}
                  >
                    {savingMember
                      ? SUPERADMIN_TEXTS.manageModal.members.addingCta
                      : SUPERADMIN_TEXTS.manageModal.members.addCta}
                  </Button>
                </div>
              </form>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

type SuperAdminSectionTab = 'tenants' | 'requests';

export const SuperAdminView: React.FC = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeSectionTab: SuperAdminSectionTab =
    searchParams.get('tab') === 'requests' ? 'requests' : 'tenants';

  const {
    user,
    isPlatformAdmin,
    loading: authLoading,
    isLoggingOut,
    claimsRevision,
    refreshClaims,
  } = useAuth();
  const [retryNonce, setRetryNonce] = useState(0);
  const [isRecoveringPermissions, setIsRecoveringPermissions] = useState(false);
  const [refreshingPermissions, setRefreshingPermissions] = useState(false);
  const autoRecoveryAttemptsRef = useRef<{ uid: string; count: number }>({ uid: '', count: 0 });
  const [subscriptionState, setSubscriptionState] = useState<{
    key: string | null;
    uid: string | null;
    tenants: TenantDoc[];
    error: string | null;
  }>({
    key: null,
    uid: null,
    tenants: [],
    error: null,
  });
  const [requestsSubState, setRequestsSubState] = useState<{
    key: string | null;
    uid: string | null;
    requests: OnboardingRequestDoc[];
    error: string | null;
  }>({
    key: null,
    uid: null,
    requests: [],
    error: null,
  });
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<TenantFilterStatus>('all');
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [createInitialEmail, setCreateInitialEmail] = useState('');
  const [selectedTenantId, setSelectedTenantId] = useState<string | null>(null);
  const [pendingStatusTenant, setPendingStatusTenant] = useState<TenantDoc | null>(null);
  const [statusActionError, setStatusActionError] = useState<string | null>(null);

  const userUid = user?.uid ?? null;
  const canSubscribe =
    !authLoading && !isLoggingOut && Boolean(userUid) && isPlatformAdmin && !isRecoveringPermissions;
  const subscriptionKey = canSubscribe ? `${userUid}:${claimsRevision}:${retryNonce}` : null;
  const isCurrentSubSettled = subscriptionKey !== null && subscriptionState.key === subscriptionKey;
  const isRequestsSubSettled =
    subscriptionKey !== null && requestsSubState.key === subscriptionKey;
  const loading = isRecoveringPermissions || (canSubscribe && !isCurrentSubSettled);
  const requestsLoading = isRecoveringPermissions || (canSubscribe && !isRequestsSubSettled);
  const loadError = isCurrentSubSettled ? subscriptionState.error : null;
  const requestsLoadError = isRequestsSubSettled ? requestsSubState.error : null;
  const tenants = useMemo(
    () => (userUid && subscriptionState.uid === userUid ? subscriptionState.tenants : []),
    [userUid, subscriptionState.uid, subscriptionState.tenants]
  );
  const requests = useMemo(
    () => (userUid && requestsSubState.uid === userUid ? requestsSubState.requests : []),
    [userUid, requestsSubState.uid, requestsSubState.requests]
  );
  const pendingRequestsCount = useMemo(
    () => requests.filter((req) => req.status === 'pending').length,
    [requests]
  );

  const handleSelectSectionTab = (nextTab: SuperAdminSectionTab) => {
    setSearchParams(
      (prev) => {
        const next = new URLSearchParams(prev);
        next.set('tab', nextTab);
        return next;
      },
      { replace: true }
    );
  };

  useEffect(() => {
    if (!isRecoveringPermissions) return;

    let active = true;
    let timerId: number | null = null;

    void refreshClaims().then((refreshed) => {
      if (!active) return;
      // If platformAdmin was truly revoked, AuthContext updated user and
      // PlatformProtectedRoute will take over without showing an in-dashboard error.
      if (!refreshed?.platformAdmin) {
        setIsRecoveringPermissions(false);
        return;
      }
      // Give Firestore's internal WebChannel stream time to rotate to the refreshed ID token.
      timerId = window.setTimeout(() => {
        if (!active) return;
        setIsRecoveringPermissions(false);
        setRetryNonce((n) => n + 1);
      }, 350);
    });

    return () => {
      active = false;
      if (timerId !== null) {
        window.clearTimeout(timerId);
      }
    };
  }, [isRecoveringPermissions, refreshClaims]);

  useEffect(() => {
    if (!canSubscribe || !subscriptionKey || !userUid) {
      return;
    }

    let active = true;

    const unsubscribe = subscribeToAllTenants(
      (list) => {
        if (!active) return;
        autoRecoveryAttemptsRef.current = { uid: userUid, count: 0 };
        setSubscriptionState({
          key: subscriptionKey,
          uid: userUid,
          tenants: list,
          error: null,
        });
      },
      (err) => {
        // Ignore transient permission errors triggered during logout or cross-tab account switches.
        if (!active || isLoggingOut || !isCurrentAuthUser(userUid)) {
          return;
        }

        if (isPermissionDeniedError(err)) {
          const prevCount =
            autoRecoveryAttemptsRef.current.uid === userUid
              ? autoRecoveryAttemptsRef.current.count
              : 0;
          if (prevCount < 1) {
            autoRecoveryAttemptsRef.current = { uid: userUid, count: prevCount + 1 };
            setIsRecoveringPermissions(true);
            return;
          }

          setSubscriptionState((prev) => ({
            key: subscriptionKey,
            uid: userUid,
            tenants: prev.uid === userUid ? prev.tenants : [],
            error: extractSuperAdminReadErrorMessage(err, {
              fallback: SUPERADMIN_TEXTS.dashboard.errorFallback,
              hasVerifiedPlatformClaim: true,
            }),
          }));
          return;
        }

        setSubscriptionState((prev) => ({
          key: subscriptionKey,
          uid: userUid,
          tenants: prev.uid === userUid ? prev.tenants : [],
          error: extractCallableErrorMessage(err, SUPERADMIN_TEXTS.dashboard.errorFallback),
        }));
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [canSubscribe, subscriptionKey, userUid, isLoggingOut]);

  useEffect(() => {
    if (!canSubscribe || !subscriptionKey || !userUid) {
      return;
    }

    let active = true;

    const unsubscribe = subscribeToOnboardingRequests(
      (list) => {
        if (!active) return;
        setRequestsSubState({
          key: subscriptionKey,
          uid: userUid,
          requests: list,
          error: null,
        });
      },
      (err) => {
        if (!active || isLoggingOut || !isCurrentAuthUser(userUid)) {
          return;
        }

        if (isPermissionDeniedError(err)) {
          setRequestsSubState((prev) => ({
            key: subscriptionKey,
            uid: userUid,
            requests: prev.uid === userUid ? prev.requests : [],
            error: extractSuperAdminReadErrorMessage(err, {
              fallback: SUPERADMIN_TEXTS.requests.errorFallback,
              hasVerifiedPlatformClaim: true,
              verifiedClaimMessage: SUPERADMIN_TEXTS.requests.rulesOrTokenSync,
            }),
          }));
          return;
        }

        setRequestsSubState((prev) => ({
          key: subscriptionKey,
          uid: userUid,
          requests: prev.uid === userUid ? prev.requests : [],
          error: extractCallableErrorMessage(err, SUPERADMIN_TEXTS.requests.errorFallback),
        }));
      }
    );

    return () => {
      active = false;
      unsubscribe();
    };
  }, [canSubscribe, subscriptionKey, userUid, isLoggingOut]);

  const handleManualRetry = () => {
    autoRecoveryAttemptsRef.current = { uid: userUid ?? '', count: 0 };
    setRetryNonce((n) => n + 1);
  };

  const handleManualRefreshPermissions = async () => {
    setRefreshingPermissions(true);
    autoRecoveryAttemptsRef.current = { uid: userUid ?? '', count: 0 };
    try {
      await refreshClaims();
      setRetryNonce((n) => n + 1);
    } finally {
      setRefreshingPermissions(false);
    }
  };

  const metrics = useMemo(() => computePlatformMetrics(tenants), [tenants]);
  const filteredTenants = useMemo(
    () => filterTenants(tenants, searchQuery, statusFilter),
    [tenants, searchQuery, statusFilter]
  );

  const selectedTenant = useMemo(
    () => tenants.find((item) => item.id === selectedTenantId) ?? null,
    [tenants, selectedTenantId]
  );

  const handleConfirmToggleStatus = async () => {
    if (!pendingStatusTenant) return;
    const target = pendingStatusTenant;
    const nextStatus: TenantStatus = target.status === 'active' ? 'suspended' : 'active';
    setPendingStatusTenant(null);
    setStatusActionError(null);

    try {
      await updateTenant({ tenantId: target.id, status: nextStatus }, target.slug);
    } catch (err: unknown) {
      setStatusActionError(
        extractCallableErrorMessage(err, SUPERADMIN_TEXTS.errors.genericActionError)
      );
    }
  };

  if (loading) {
    return (
      <Loader
        fullScreen
        title={
          isRecoveringPermissions
            ? SUPERADMIN_TEXTS.dashboard.recoveringTitle
            : SUPERADMIN_TEXTS.dashboard.loadingTitle
        }
        subtitle={
          isRecoveringPermissions
            ? SUPERADMIN_TEXTS.dashboard.recoveringSubtitle
            : SUPERADMIN_TEXTS.dashboard.loadingSubtitle
        }
        icon="shield"
      />
    );
  }

  const hasFatalLoadError = Boolean(loadError && tenants.length === 0);

  return (
    <div className={styles.page}>
      <section className={styles.heroHeader}>
        <div className={styles.heroText}>
          <h1 className={styles.pageTitle}>{SUPERADMIN_TEXTS.dashboard.title}</h1>
          <p className={styles.pageSubtitle}>{SUPERADMIN_TEXTS.dashboard.subtitle}</p>
        </div>

        <Button
          type="button"
          variant="primary"
          size="md"
          onClick={() => {
            setCreateInitialEmail('');
            setCreateModalOpen(true);
          }}
          leftIcon={<Plus size={16} strokeWidth={2} />}
        >
          {SUPERADMIN_TEXTS.dashboard.createTenantCta}
        </Button>
      </section>

      <nav className={styles.sectionTabsBar} aria-label={SUPERADMIN_TEXTS.tabs.ariaLabel}>
        <button
          type="button"
          className={`${styles.sectionTabBtn} ${
            activeSectionTab === 'tenants' ? styles.sectionTabBtnActive : ''
          }`}
          onClick={() => handleSelectSectionTab('tenants')}
        >
          <Building2 size={15} strokeWidth={1.8} aria-hidden="true" />
          <span>{SUPERADMIN_TEXTS.tabs.tenants}</span>
          <span className={styles.tabBadge}>{tenants.length}</span>
        </button>
        <button
          type="button"
          className={`${styles.sectionTabBtn} ${
            activeSectionTab === 'requests' ? styles.sectionTabBtnActive : ''
          }`}
          onClick={() => handleSelectSectionTab('requests')}
        >
          <Inbox size={15} strokeWidth={1.8} aria-hidden="true" />
          <span>{SUPERADMIN_TEXTS.tabs.requests}</span>
          {pendingRequestsCount > 0 && (
            <span className={`${styles.tabBadge} ${styles.tabBadgePending}`}>
              {pendingRequestsCount}
            </span>
          )}
        </button>
      </nav>

      {activeSectionTab === 'requests' ? (
        <OnboardingRequestsSection
          requests={requests}
          loading={requestsLoading}
          loadError={requestsLoadError}
          refreshingPermissions={refreshingPermissions}
          onRetry={handleManualRetry}
          onRefreshPermissions={() => void handleManualRefreshPermissions()}
          onCreateTenantFromRequest={(req) => {
            setCreateInitialEmail(req.email);
            setCreateModalOpen(true);
          }}
        />
      ) : (
        <>

      {loadError && !hasFatalLoadError && (
        <div className={styles.errorBanner} role="alert">
          <AlertTriangle size={18} strokeWidth={1.75} aria-hidden="true" />
          <div className={styles.errorBannerContent}>
            <div>
              <strong>{SUPERADMIN_TEXTS.dashboard.errorTitle}: </strong>
              <span>{loadError}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={handleManualRetry}
              leftIcon={<RefreshCw size={14} strokeWidth={1.75} />}
            >
              {SUPERADMIN_TEXTS.dashboard.retryCta}
            </Button>
          </div>
        </div>
      )}

      {statusActionError && (
        <div className={styles.errorBanner} role="alert">
          <AlertTriangle size={18} strokeWidth={1.75} aria-hidden="true" />
          <span>{statusActionError}</span>
        </div>
      )}

      {hasFatalLoadError ? (
        <section className={styles.panelCard} role="alert" aria-labelledby="superadmin-load-error-title">
          <div className={styles.errorState}>
            <div className={styles.errorStateIcon} aria-hidden="true">
              <AlertTriangle size={24} strokeWidth={1.75} />
            </div>
            <h2 id="superadmin-load-error-title" className={styles.emptyTitle}>
              {SUPERADMIN_TEXTS.dashboard.errorTitle}
            </h2>
            <p className={styles.errorStateDescription}>{loadError}</p>
            <div className={styles.errorStateActions}>
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={handleManualRetry}
                leftIcon={<RefreshCw size={14} strokeWidth={1.75} />}
              >
                {SUPERADMIN_TEXTS.dashboard.retryCta}
              </Button>
              <Button
                type="button"
                variant="outline"
                size="sm"
                isLoading={refreshingPermissions}
                onClick={handleManualRefreshPermissions}
                leftIcon={<Shield size={14} strokeWidth={1.75} />}
              >
                {SUPERADMIN_TEXTS.dashboard.refreshPermissionsCta}
              </Button>
            </div>
          </div>
        </section>
      ) : (
        <>
          <section className={styles.metricsGrid} aria-label="Métricas de plataforma">
        <article className={styles.metricCard}>
          <div className={`${styles.metricIcon} ${styles.metricPrimary}`} aria-hidden="true">
            <Building2 size={18} strokeWidth={1.75} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>{SUPERADMIN_TEXTS.dashboard.metrics.total}</span>
            <strong className={styles.metricValue}>{metrics.total}</strong>
          </div>
        </article>

        <article className={styles.metricCard}>
          <div className={`${styles.metricIcon} ${styles.metricSuccess}`} aria-hidden="true">
            <CheckCircle2 size={18} strokeWidth={1.75} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>{SUPERADMIN_TEXTS.dashboard.metrics.active}</span>
            <strong className={styles.metricValue}>{metrics.active}</strong>
          </div>
        </article>

        <article className={styles.metricCard}>
          <div className={`${styles.metricIcon} ${styles.metricWarning}`} aria-hidden="true">
            <PauseCircle size={18} strokeWidth={1.75} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>
              {SUPERADMIN_TEXTS.dashboard.metrics.suspended}
            </span>
            <strong className={styles.metricValue}>{metrics.suspended}</strong>
          </div>
        </article>

        <article className={styles.metricCard}>
          <div className={`${styles.metricIcon} ${styles.metricAccent}`} aria-hidden="true">
            <CreditCard size={18} strokeWidth={1.75} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>
              {SUPERADMIN_TEXTS.dashboard.metrics.mpConfigured}
            </span>
            <strong className={styles.metricValue}>{metrics.mpConfigured}</strong>
          </div>
        </article>
      </section>

      <section className={styles.panelCard}>
        <div className={styles.toolbar}>
          <div className={styles.filterPills} role="group" aria-label="Filtrar negocios por estado">
            {(
              [
                { id: 'all', label: SUPERADMIN_TEXTS.dashboard.filters.all, count: metrics.total },
                {
                  id: 'active',
                  label: SUPERADMIN_TEXTS.dashboard.filters.active,
                  count: metrics.active,
                },
                {
                  id: 'suspended',
                  label: SUPERADMIN_TEXTS.dashboard.filters.suspended,
                  count: metrics.suspended,
                },
                {
                  id: 'demo',
                  label: SUPERADMIN_TEXTS.dashboard.filters.demo,
                  count: metrics.demoCount,
                },
              ] as const
            ).map((item) => (
              <button
                key={item.id}
                type="button"
                className={`${styles.filterPill} ${
                  statusFilter === item.id ? styles.filterPillActive : ''
                }`}
                onClick={() => setStatusFilter(item.id)}
              >
                <span>{item.label}</span>
                <span className={styles.filterCount}>{item.count}</span>
              </button>
            ))}
          </div>

          <div className={styles.searchBox}>
            <Input
              aria-label={SUPERADMIN_TEXTS.dashboard.filters.searchAria}
              placeholder={SUPERADMIN_TEXTS.dashboard.filters.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search size={15} strokeWidth={1.75} />}
              rightIcon={
                searchQuery ? (
                  <button
                    type="button"
                    className={styles.clearSearchBtn}
                    onClick={() => setSearchQuery('')}
                    aria-label={SUPERADMIN_TEXTS.dashboard.filters.clearSearch}
                  >
                    <X size={14} strokeWidth={1.75} />
                  </button>
                ) : undefined
              }
            />
          </div>
        </div>

        {filteredTenants.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon} aria-hidden="true">
              <Building2 size={24} strokeWidth={1.6} />
            </div>
            <h2 className={styles.emptyTitle}>
              {tenants.length === 0
                ? SUPERADMIN_TEXTS.dashboard.table.emptyTitle
                : SUPERADMIN_TEXTS.dashboard.table.emptyFilteredTitle}
            </h2>
            <p className={styles.emptyDescription}>
              {tenants.length === 0
                ? SUPERADMIN_TEXTS.dashboard.table.emptyDescription
                : SUPERADMIN_TEXTS.dashboard.table.emptyFilteredDescription}
            </p>
            {tenants.length === 0 ? (
              <Button
                type="button"
                variant="primary"
                size="sm"
                onClick={() => setCreateModalOpen(true)}
                leftIcon={<Plus size={15} strokeWidth={1.8} />}
              >
                {SUPERADMIN_TEXTS.dashboard.createTenantCta}
              </Button>
            ) : (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
              >
                {SUPERADMIN_TEXTS.dashboard.table.resetFiltersCta}
              </Button>
            )}
          </div>
        ) : (
          <div className={styles.tableWrapper}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>{SUPERADMIN_TEXTS.dashboard.table.businessCol}</th>
                  <th>{SUPERADMIN_TEXTS.dashboard.table.slugCol}</th>
                  <th>{SUPERADMIN_TEXTS.dashboard.table.statusCol}</th>
                  <th>{SUPERADMIN_TEXTS.dashboard.table.paymentsCol}</th>
                  <th>{SUPERADMIN_TEXTS.dashboard.table.timezoneCol}</th>
                  <th className={styles.actionsHeader}>
                    {SUPERADMIN_TEXTS.dashboard.table.actionsCol}
                  </th>
                </tr>
              </thead>
              <tbody>
                {filteredTenants.map((tenant) => {
                  const publicPath = buildTenantPath(tenant.slug);
                  const adminPath = buildTenantPath(tenant.slug, '/admin');
                  const prevCount = tenant.previousSlugs?.length ?? 0;

                  return (
                    <tr key={tenant.id}>
                      <td>
                        <div className={styles.tenantNameCell}>
                          <div className={styles.tenantNameRow}>
                            <span className={styles.tenantName}>{tenant.name}</span>
                            {tenant.isDemo && (
                              <span className={`${styles.statusBadge} ${styles.badgeDemo}`}>
                                {SUPERADMIN_TEXTS.dashboard.table.demoBadge}
                              </span>
                            )}
                          </div>
                          <code className={styles.tenantIdCode}>{tenant.id}</code>
                        </div>
                      </td>

                      <td>
                        <div className={styles.slugCell}>
                          <code className={styles.slugBadge}>/{tenant.slug}</code>
                          {prevCount > 0 && (
                            <span className={styles.prevSlugHint}>
                              {SUPERADMIN_TEXTS.dashboard.table.previousSlugsLabel(prevCount)}
                            </span>
                          )}
                        </div>
                      </td>

                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            tenant.status === 'active'
                              ? styles.badgeActive
                              : styles.badgeSuspended
                          }`}
                        >
                          {tenant.status === 'active'
                            ? SUPERADMIN_TEXTS.dashboard.table.statusActive
                            : SUPERADMIN_TEXTS.dashboard.table.statusSuspended}
                        </span>
                      </td>

                      <td>
                        <span
                          className={`${styles.statusBadge} ${
                            tenant.mpConfigured ? styles.badgeActive : styles.badgePending
                          }`}
                        >
                          {tenant.mpConfigured
                            ? SUPERADMIN_TEXTS.dashboard.table.mpActive
                            : SUPERADMIN_TEXTS.dashboard.table.mpPending}
                        </span>
                      </td>

                      <td>
                        <div className={styles.metaCell}>
                          <span className={styles.timezoneText}>
                            <Globe size={12} strokeWidth={1.75} aria-hidden="true" />
                            <span>{tenant.timezone}</span>
                          </span>
                          <span className={styles.dateText}>
                            {formatDateShort(tenant.createdAt)}
                          </span>
                        </div>
                      </td>

                      <td>
                        <div className={styles.rowActions}>
                          <a
                            href={publicPath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.linkReset}
                            title={`Abrir agenda pública (${publicPath})`}
                          >
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              leftIcon={<ExternalLink size={14} strokeWidth={1.75} />}
                            >
                              {SUPERADMIN_TEXTS.dashboard.table.openPublicCta}
                            </Button>
                          </a>

                          <a
                            href={adminPath}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.linkReset}
                            title={`Abrir backoffice (${adminPath})`}
                          >
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              leftIcon={<Shield size={14} strokeWidth={1.75} />}
                            >
                              {SUPERADMIN_TEXTS.dashboard.table.openAdminCta}
                            </Button>
                          </a>

                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPendingStatusTenant(tenant)}
                            leftIcon={
                              tenant.status === 'active' ? (
                                <PauseCircle size={14} strokeWidth={1.75} />
                              ) : (
                                <PlayCircle size={14} strokeWidth={1.75} />
                              )
                            }
                          >
                            {tenant.status === 'active'
                              ? SUPERADMIN_TEXTS.dashboard.table.suspendCta
                              : SUPERADMIN_TEXTS.dashboard.table.reactivateCta}
                          </Button>

                          <Button
                            type="button"
                            variant="secondary"
                            size="sm"
                            onClick={() => setSelectedTenantId(tenant.id)}
                            leftIcon={<Settings2 size={14} strokeWidth={1.75} />}
                          >
                            {SUPERADMIN_TEXTS.dashboard.table.manageCta}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </section>
        </>
      )}
        </>
      )}

      {createModalOpen && (
        <CreateTenantModal
          key={createInitialEmail || 'empty'}
          initialOwnerEmail={createInitialEmail}
          onClose={() => {
            setCreateModalOpen(false);
            setCreateInitialEmail('');
          }}
        />
      )}

      {selectedTenant && (
        <ManageTenantModal
          key={selectedTenant.id}
          tenant={selectedTenant}
          onClose={() => setSelectedTenantId(null)}
          onRequestToggleStatus={(target) => setPendingStatusTenant(target)}
        />
      )}

      <AlertModal
        isOpen={Boolean(pendingStatusTenant)}
        onClose={() => setPendingStatusTenant(null)}
        type={pendingStatusTenant?.status === 'active' ? 'warning' : 'info'}
        title={
          pendingStatusTenant
            ? pendingStatusTenant.status === 'active'
              ? SUPERADMIN_TEXTS.confirmStatus.suspendTitle(pendingStatusTenant.name)
              : SUPERADMIN_TEXTS.confirmStatus.reactivateTitle(pendingStatusTenant.name)
            : undefined
        }
        message={
          pendingStatusTenant
            ? pendingStatusTenant.status === 'active'
              ? SUPERADMIN_TEXTS.confirmStatus.suspendMessage(pendingStatusTenant.slug)
              : SUPERADMIN_TEXTS.confirmStatus.reactivateMessage(pendingStatusTenant.slug)
            : ''
        }
        confirmText={
          pendingStatusTenant?.status === 'active'
            ? SUPERADMIN_TEXTS.confirmStatus.suspendConfirm
            : SUPERADMIN_TEXTS.confirmStatus.reactivateConfirm
        }
        onConfirm={handleConfirmToggleStatus}
        secondaryText={SUPERADMIN_TEXTS.confirmStatus.cancel}
        onSecondary={() => setPendingStatusTenant(null)}
        closeOnEscape
      />
    </div>
  );
};

export default SuperAdminView;
