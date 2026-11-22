import React, { useState, useMemo } from 'react';
import {
  User,
  Upload,
  Save,
  CheckCircle2,
  Loader2,
  Info,
  RotateCcw,
} from 'lucide-react';
import type { OwnerInfo } from '../../../types';
import { useOwnerInfo } from '../../../context/OwnerInfoContext';
import { updateOwnerInfo } from '../../../services/ownerService';
import {
  applyImageFallback,
  DEFAULT_OWNER_ASSETS,
  hasAnyCustomOwnerText,
} from '../../../services/ownerDefaults';
import { uploadImageToStorage } from '../../../services/storageService';
import {
  validateEmail,
  validatePhone,
  validateRequiredText,
  validateImageFile,
} from '../../../utils/validators';
import Input from '../../common/Input/Input';
import Button from '../../common/Button/Button';
import Loader from '../../common/Loader/Loader';
import AlertModal, { type AlertModalType } from '../../common/AlertModal';
import { OWNER_SETTINGS_TEXTS } from '../../../texts';
import styles from './OwnerSettings.module.css';

const toFormState = (raw: Partial<OwnerInfo> | null): OwnerInfo => ({
  name: raw?.name ?? '',
  businessName: raw?.businessName ?? '',
  role: raw?.role ?? '',
  description: raw?.description ?? '',
  pictureUrl: raw?.pictureUrl ?? '',
  heroImageUrl: raw?.heroImageUrl ?? '',
  logoUrl: raw?.logoUrl ?? '',
  instagram: raw?.instagram ?? '',
  phone: raw?.phone ?? '',
  email: raw?.email ?? '',
  location: raw?.location ?? '',
});

export const OwnerSettings: React.FC = () => {
  const { rawOwner, defaults, loading } = useOwnerInfo();
  const [draft, setDraft] = useState<Partial<OwnerInfo>>({});
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const formData = useMemo<OwnerInfo>(
    () => ({ ...toFormState(rawOwner), ...draft }),
    [rawOwner, draft]
  );

  const updateFormData = (patch: Partial<OwnerInfo>) => {
    setDraft((prev) => ({ ...prev, ...patch }));
  };

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

  const isUsingDefaultInfo = !loading && !hasAnyCustomOwnerText(rawOwner);
  const hasCustomLogo = Boolean(formData.logoUrl?.trim());
  const hasCustomProfile = Boolean(formData.pictureUrl?.trim());
  const hasCustomHero = Boolean(formData.heroImageUrl?.trim());

  const showTemporarySuccess = (message: string) => {
    setSuccessMsg(message);
    setTimeout(() => setSuccessMsg(null), 4000);
  };

  const handleRestoreImage = async (field: 'logoUrl' | 'pictureUrl' | 'heroImageUrl') => {
    setSaving(true);
    try {
      await updateOwnerInfo({ [field]: '' });
      setDraft((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      showTemporarySuccess(OWNER_SETTINGS_TEXTS.header.restoredImageSuccess);
    } catch (err: unknown) {
      console.error(OWNER_SETTINGS_TEXTS.logs.saveError, err);
      setAlertState({
        isOpen: true,
        title: OWNER_SETTINGS_TEXTS.alerts.saveErrorTitle,
        message: err instanceof Error ? err.message : OWNER_SETTINGS_TEXTS.alerts.saveErrorFallback,
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const handleLogoChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileValidation = validateImageFile(file, 10, true);
    if (!fileValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: OWNER_SETTINGS_TEXTS.alerts.invalidLogoTitle,
        message: fileValidation.error || OWNER_SETTINGS_TEXTS.alerts.invalidLogoFallback,
        type: 'warning',
      });
      return;
    }

    setUploadingLogo(true);

    try {
      const downloadUrl = await uploadImageToStorage(file, 'logo');
      await updateOwnerInfo({ logoUrl: downloadUrl });
      setDraft((prev) => {
        const next = { ...prev };
        delete next.logoUrl;
        return next;
      });
      showTemporarySuccess(OWNER_SETTINGS_TEXTS.logo.successMsg);
    } catch (err: unknown) {
      console.error(OWNER_SETTINGS_TEXTS.logs.uploadLogoError, err);
      setAlertState({
        isOpen: true,
        title: OWNER_SETTINGS_TEXTS.alerts.uploadLogoErrorTitle,
        message: err instanceof Error ? err.message : OWNER_SETTINGS_TEXTS.alerts.uploadLogoErrorFallback,
        type: 'error',
      });
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleProfileImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileValidation = validateImageFile(file, 10, true);
    if (!fileValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: OWNER_SETTINGS_TEXTS.alerts.invalidProfileTitle,
        message: fileValidation.error || OWNER_SETTINGS_TEXTS.alerts.invalidProfileFallback,
        type: 'warning',
      });
      return;
    }

    setUploadingProfile(true);

    try {
      const downloadUrl = await uploadImageToStorage(file, 'profile');
      await updateOwnerInfo({ pictureUrl: downloadUrl });
      setDraft((prev) => {
        const next = { ...prev };
        delete next.pictureUrl;
        return next;
      });
      showTemporarySuccess(OWNER_SETTINGS_TEXTS.profilePicture.successMsg);
    } catch (err: unknown) {
      console.error(OWNER_SETTINGS_TEXTS.logs.uploadProfileError, err);
      setAlertState({
        isOpen: true,
        title: OWNER_SETTINGS_TEXTS.alerts.uploadProfileErrorTitle,
        message: err instanceof Error ? err.message : OWNER_SETTINGS_TEXTS.alerts.uploadProfileErrorFallback,
        type: 'error',
      });
    } finally {
      setUploadingProfile(false);
    }
  };

  const handleHeroImageChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileValidation = validateImageFile(file, 10, true);
    if (!fileValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: OWNER_SETTINGS_TEXTS.alerts.invalidHeroTitle,
        message: fileValidation.error || OWNER_SETTINGS_TEXTS.alerts.invalidHeroFallback,
        type: 'warning',
      });
      return;
    }

    setUploadingHero(true);

    try {
      const downloadUrl = await uploadImageToStorage(file, 'hero');
      await updateOwnerInfo({ heroImageUrl: downloadUrl });
      setDraft((prev) => {
        const next = { ...prev };
        delete next.heroImageUrl;
        return next;
      });
      showTemporarySuccess(OWNER_SETTINGS_TEXTS.heroPicture.successMsg);
    } catch (err: unknown) {
      console.error(OWNER_SETTINGS_TEXTS.logs.uploadHeroError, err);
      setAlertState({
        isOpen: true,
        title: OWNER_SETTINGS_TEXTS.alerts.uploadHeroErrorTitle,
        message: err instanceof Error ? err.message : OWNER_SETTINGS_TEXTS.alerts.uploadHeroErrorFallback,
        type: 'error',
      });
    } finally {
      setUploadingHero(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const businessNameValidation = validateRequiredText(
      formData.businessName || '',
      OWNER_SETTINGS_TEXTS.inputs.businessNameField,
      2,
      80
    );
    if (!businessNameValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: OWNER_SETTINGS_TEXTS.alerts.businessNameRequiredTitle,
        message: businessNameValidation.error || OWNER_SETTINGS_TEXTS.alerts.businessNameRequiredFallback,
        type: 'warning',
      });
      return;
    }

    const nameValidation = validateRequiredText(
      formData.name,
      OWNER_SETTINGS_TEXTS.inputs.nameField,
      2,
      80
    );
    if (!nameValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: OWNER_SETTINGS_TEXTS.alerts.nameRequiredTitle,
        message: nameValidation.error || OWNER_SETTINGS_TEXTS.alerts.nameRequiredFallback,
        type: 'warning',
      });
      return;
    }

    if (formData.email?.trim()) {
      const emailValidation = validateEmail(formData.email, false);
      if (!emailValidation.isValid) {
        setAlertState({
          isOpen: true,
          title: OWNER_SETTINGS_TEXTS.alerts.invalidEmailTitle,
          message: emailValidation.error || OWNER_SETTINGS_TEXTS.alerts.invalidEmailFallback,
          type: 'warning',
        });
        return;
      }
    }

    if (formData.phone?.trim()) {
      const phoneValidation = validatePhone(formData.phone, false);
      if (!phoneValidation.isValid) {
        setAlertState({
          isOpen: true,
          title: OWNER_SETTINGS_TEXTS.alerts.invalidPhoneTitle,
          message: phoneValidation.error || OWNER_SETTINGS_TEXTS.alerts.invalidPhoneFallback,
          type: 'warning',
        });
        return;
      }
    }

    const bioValidation = validateRequiredText(
      formData.description,
      OWNER_SETTINGS_TEXTS.inputs.bioField,
      10,
      3000
    );
    if (!bioValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: OWNER_SETTINGS_TEXTS.alerts.bioRequiredTitle,
        message: bioValidation.error || OWNER_SETTINGS_TEXTS.alerts.bioRequiredFallback,
        type: 'warning',
      });
      return;
    }

    setSaving(true);
    setSuccessMsg(null);

    try {
      await updateOwnerInfo(formData);
      setDraft({});
      showTemporarySuccess(OWNER_SETTINGS_TEXTS.alerts.saveSuccess);
    } catch (err: unknown) {
      console.error(OWNER_SETTINGS_TEXTS.logs.saveError, err);
      setAlertState({
        isOpen: true,
        title: OWNER_SETTINGS_TEXTS.alerts.saveErrorTitle,
        message: err instanceof Error ? err.message : OWNER_SETTINGS_TEXTS.alerts.saveErrorFallback,
        type: 'error',
      });
    } finally {
      setSaving(false);
    }
  };

  const busy = saving || uploadingProfile || uploadingHero || uploadingLogo;

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <User size={22} color="var(--color-primary)" />
            {OWNER_SETTINGS_TEXTS.header.title}
          </h2>
          <p className={styles.subtitle}>
            {OWNER_SETTINGS_TEXTS.header.subtitle}
          </p>
        </div>

        {isUsingDefaultInfo && (
          <div className={styles.defaultInfoBanner} role="status">
            <Info size={16} strokeWidth={1.75} className={styles.defaultInfoIcon} aria-hidden="true" />
            <span>{OWNER_SETTINGS_TEXTS.header.usingDefaultsNotice}</span>
          </div>
        )}

        {successMsg && (
          <div className={styles.successAlert}>
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        <div className={styles.pictureRow}>
          <div className={styles.avatarPreview} style={{ borderRadius: 'var(--radius-lg)' }}>
            <img
              src={formData.logoUrl || defaults.logoUrl || DEFAULT_OWNER_ASSETS.logoImage}
              alt={OWNER_SETTINGS_TEXTS.logo.alt}
              className={styles.avatarImg}
              style={{ borderRadius: 'var(--radius-md)' }}
              onError={(e) =>
                applyImageFallback(e, defaults.logoUrl || DEFAULT_OWNER_ASSETS.logoImage)
              }
            />
          </div>

          <div className={styles.uploadActions}>
            <div className={styles.uploadButtonRow}>
              <label className={styles.fileInputLabel}>
                {uploadingLogo ? <Loader2 size={16} className="spinner" /> : <Upload size={16} />}
                <span>{uploadingLogo ? OWNER_SETTINGS_TEXTS.logo.uploadingText : OWNER_SETTINGS_TEXTS.logo.buttonText}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleLogoChange}
                  disabled={busy}
                  className={styles.hiddenFileInput}
                />
              </label>

              {hasCustomLogo && (
                <button
                  type="button"
                  className={styles.restoreBtn}
                  onClick={() => handleRestoreImage('logoUrl')}
                  disabled={busy}
                >
                  <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />
                  <span>{OWNER_SETTINGS_TEXTS.header.restoreDefaultImage}</span>
                </button>
              )}
            </div>

            {!hasCustomLogo && (
              <span className={styles.defaultImageTag}>
                <Info size={13} strokeWidth={1.75} aria-hidden="true" />
                {OWNER_SETTINGS_TEXTS.header.defaultImageBadge}
              </span>
            )}

            <span className={styles.uploadHelp}>
              {OWNER_SETTINGS_TEXTS.logo.helpText}
            </span>
          </div>
        </div>

        <div className={styles.pictureRow}>
          <div className={styles.avatarPreview}>
            <img
              src={formData.pictureUrl || defaults.pictureUrl || DEFAULT_OWNER_ASSETS.portraitImage}
              alt={formData.name || defaults.name}
              className={styles.avatarImg}
              onError={(e) =>
                applyImageFallback(e, defaults.pictureUrl || DEFAULT_OWNER_ASSETS.portraitImage)
              }
            />
          </div>

          <div className={styles.uploadActions}>
            <div className={styles.uploadButtonRow}>
              <label className={styles.fileInputLabel}>
                {uploadingProfile ? <Loader2 size={16} className="spinner" /> : <Upload size={16} />}
                <span>{uploadingProfile ? OWNER_SETTINGS_TEXTS.profilePicture.uploadingText : OWNER_SETTINGS_TEXTS.profilePicture.buttonText}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleProfileImageChange}
                  disabled={busy}
                  className={styles.hiddenFileInput}
                />
              </label>

              {hasCustomProfile && (
                <button
                  type="button"
                  className={styles.restoreBtn}
                  onClick={() => handleRestoreImage('pictureUrl')}
                  disabled={busy}
                >
                  <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />
                  <span>{OWNER_SETTINGS_TEXTS.header.restoreDefaultImage}</span>
                </button>
              )}
            </div>

            {!hasCustomProfile && (
              <span className={styles.defaultImageTag}>
                <Info size={13} strokeWidth={1.75} aria-hidden="true" />
                {OWNER_SETTINGS_TEXTS.header.defaultImageBadge}
              </span>
            )}

            <span className={styles.uploadHelp}>
              {OWNER_SETTINGS_TEXTS.profilePicture.helpText}
            </span>
          </div>
        </div>

        <div className={styles.pictureRow}>
          <div className={styles.avatarPreview} style={{ borderRadius: 'var(--radius-md)' }}>
            <img
              src={formData.heroImageUrl || defaults.heroImageUrl || DEFAULT_OWNER_ASSETS.heroImage}
              alt={OWNER_SETTINGS_TEXTS.heroPicture.alt}
              className={styles.avatarImg}
              style={{ borderRadius: 'var(--radius-sm)' }}
              onError={(e) =>
                applyImageFallback(e, defaults.heroImageUrl || DEFAULT_OWNER_ASSETS.heroImage)
              }
            />
          </div>

          <div className={styles.uploadActions}>
            <div className={styles.uploadButtonRow}>
              <label className={styles.fileInputLabel}>
                {uploadingHero ? <Loader2 size={16} className="spinner" /> : <Upload size={16} />}
                <span>{uploadingHero ? OWNER_SETTINGS_TEXTS.heroPicture.uploadingText : OWNER_SETTINGS_TEXTS.heroPicture.buttonText}</span>
                <input
                  type="file"
                  accept="image/*"
                  onChange={handleHeroImageChange}
                  disabled={busy}
                  className={styles.hiddenFileInput}
                />
              </label>

              {hasCustomHero && (
                <button
                  type="button"
                  className={styles.restoreBtn}
                  onClick={() => handleRestoreImage('heroImageUrl')}
                  disabled={busy}
                >
                  <RotateCcw size={14} strokeWidth={1.75} aria-hidden="true" />
                  <span>{OWNER_SETTINGS_TEXTS.header.restoreDefaultImage}</span>
                </button>
              )}
            </div>

            {!hasCustomHero && (
              <span className={styles.defaultImageTag}>
                <Info size={13} strokeWidth={1.75} aria-hidden="true" />
                {OWNER_SETTINGS_TEXTS.header.defaultImageBadge}
              </span>
            )}

            <span className={styles.uploadHelp}>
              {OWNER_SETTINGS_TEXTS.heroPicture.helpText}
            </span>
          </div>
        </div>

        <div className={styles.formGrid}>
          <div>
            <Input
              label={OWNER_SETTINGS_TEXTS.inputs.businessNameLabel}
              value={formData.businessName || ''}
              onChange={(e) => updateFormData({ businessName: e.target.value })}
              placeholder={defaults.businessName || OWNER_SETTINGS_TEXTS.inputs.businessNamePlaceholder}
              required
            />
          </div>

          <div>
            <Input
              label={OWNER_SETTINGS_TEXTS.inputs.nameLabel}
              value={formData.name}
              onChange={(e) => updateFormData({ name: e.target.value })}
              placeholder={defaults.name || OWNER_SETTINGS_TEXTS.inputs.namePlaceholder}
              required
            />
          </div>

          <div>
            <Input
              label={OWNER_SETTINGS_TEXTS.inputs.roleLabel}
              value={formData.role || ''}
              onChange={(e) => updateFormData({ role: e.target.value })}
              placeholder={defaults.role || OWNER_SETTINGS_TEXTS.inputs.rolePlaceholder}
            />
          </div>

          <div>
            <Input
              label={OWNER_SETTINGS_TEXTS.inputs.instagramLabel}
              value={formData.instagram || ''}
              onChange={(e) => updateFormData({ instagram: e.target.value })}
              placeholder={defaults.instagram || OWNER_SETTINGS_TEXTS.inputs.instagramPlaceholder}
            />
          </div>

          <div>
            <Input
              label={OWNER_SETTINGS_TEXTS.inputs.phoneLabel}
              type="tel"
              phoneOnly
              value={formData.phone || ''}
              onChange={(e) => updateFormData({ phone: e.target.value })}
              placeholder={defaults.phone || OWNER_SETTINGS_TEXTS.inputs.phonePlaceholder}
            />
          </div>

          <div>
            <Input
              label={OWNER_SETTINGS_TEXTS.inputs.emailLabel}
              type="email"
              value={formData.email || ''}
              onChange={(e) => updateFormData({ email: e.target.value })}
              placeholder={defaults.email || OWNER_SETTINGS_TEXTS.inputs.emailPlaceholder}
            />
          </div>

          <div className={styles.fullWidth}>
            <Input
              label={OWNER_SETTINGS_TEXTS.inputs.locationLabel}
              value={formData.location || ''}
              onChange={(e) => updateFormData({ location: e.target.value })}
              placeholder={defaults.location || OWNER_SETTINGS_TEXTS.inputs.locationPlaceholder}
            />
          </div>

          <div className={styles.fullWidth}>
            <div className={styles.textareaWrapper}>
              <label className={styles.textareaLabel}>{OWNER_SETTINGS_TEXTS.inputs.bioLabel}</label>
              <textarea
                className={styles.textarea}
                value={formData.description}
                onChange={(e) => updateFormData({ description: e.target.value })}
                placeholder={defaults.description || OWNER_SETTINGS_TEXTS.inputs.bioPlaceholder}
                rows={5}
                required
              />
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <Button
            type="submit"
            variant="primary"
            size="md"
            disabled={busy}
            leftIcon={saving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
          >
            {saving ? OWNER_SETTINGS_TEXTS.inputs.savingButton : OWNER_SETTINGS_TEXTS.inputs.saveButton}
          </Button>
        </div>
      </form>

      {busy && (
        <Loader
          fullScreen
          title={
            uploadingProfile
              ? OWNER_SETTINGS_TEXTS.loaders.uploadingProfile
              : uploadingHero
              ? OWNER_SETTINGS_TEXTS.loaders.uploadingHero
              : uploadingLogo
              ? OWNER_SETTINGS_TEXTS.loaders.uploadingLogo
              : OWNER_SETTINGS_TEXTS.loaders.savingSettings
          }
          subtitle={OWNER_SETTINGS_TEXTS.loaders.subtitle}
          icon="heart"
        />
      )}

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

export default OwnerSettings;
