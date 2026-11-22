import React, { useState, useMemo, useRef, useEffect } from 'react';
import {
  User,
  Upload,
  Save,
  CheckCircle2,
  Loader2,
  Info,
  RotateCcw,
  X,
} from 'lucide-react';
import type { OwnerInfo } from '../../../types';
import { useOwnerInfo } from '../../../context/OwnerInfoContext';
import { updateOwnerInfo } from '../../../services/ownerService';
import {
  applyImageFallback,
  computeOwnerTextPatch,
  DEFAULT_OWNER_ASSETS,
  getDefaultOwnerFieldsSummary,
  hasCustomOwnerField,
  validateOwnerTextPatch,
  type OwnerImageField,
  type OwnerTextField,
} from '../../../services/ownerDefaults';
import { deleteImageFromStorage, uploadImageToStorage } from '../../../services/storageService';
import {
  IMAGE_MIME_TYPES_PHOTO,
  IMAGE_MIME_TYPES_WITH_SVG,
  validateImageFile,
} from '../../../utils/validators';
import Input from '../../common/Input/Input';
import Button from '../../common/Button/Button';
import Loader from '../../common/Loader/Loader';
import AlertModal, { type AlertModalType } from '../../common/AlertModal';
import { OWNER_SETTINGS_TEXTS } from '../../../texts';
import styles from './OwnerSettings.module.css';

const MAX_IMAGE_SIZE_MB = 10;
const LOGO_ACCEPT = 'image/png,image/jpeg,image/webp,image/svg+xml';
const PHOTO_ACCEPT = 'image/png,image/jpeg,image/webp';

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

const getFieldInputId = (field: OwnerTextField) => `owner-field-${field}`;

export const OwnerSettings: React.FC = () => {
  const { rawOwner, defaults, loading } = useOwnerInfo();
  const [draft, setDraft] = useState<Partial<OwnerInfo>>({});
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<OwnerTextField, string>>>({});
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);
  const successTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    return () => {
      if (successTimerRef.current) {
        clearTimeout(successTimerRef.current);
      }
    };
  }, []);

  const formData = useMemo<OwnerInfo>(
    () => ({ ...toFormState(rawOwner), ...draft }),
    [rawOwner, draft]
  );

  const pendingPatch = useMemo(
    () => computeOwnerTextPatch(rawOwner, draft),
    [rawOwner, draft]
  );
  const dirtyFields = useMemo(
    () => Object.keys(pendingPatch) as OwnerTextField[],
    [pendingPatch]
  );
  const dirtyCount = dirtyFields.length;

  const defaultsSummary = useMemo(
    () => getDefaultOwnerFieldsSummary(rawOwner),
    [rawOwner]
  );

  const updateField = (field: OwnerTextField, value: string) => {
    setDraft((prev) => ({ ...prev, [field]: value }));
    setFieldErrors((prev) => {
      if (!prev[field]) return prev;
      const next = { ...prev };
      delete next[field];
      return next;
    });
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

  const hasCustomLogo = hasCustomOwnerField(rawOwner, 'logoUrl');
  const hasCustomProfile = hasCustomOwnerField(rawOwner, 'pictureUrl');
  const hasCustomHero = hasCustomOwnerField(rawOwner, 'heroImageUrl');

  const showTemporarySuccess = (message: string) => {
    if (successTimerRef.current) {
      clearTimeout(successTimerRef.current);
    }
    setSuccessMsg(message);
    successTimerRef.current = setTimeout(() => {
      setSuccessMsg(null);
      successTimerRef.current = null;
    }, 4000);
  };

  const handleRestoreImage = async (field: OwnerImageField) => {
    const previousUrl = rawOwner?.[field];
    setSaving(true);
    try {
      await updateOwnerInfo({ [field]: '' });
      setDraft((prev) => {
        const next = { ...prev };
        delete next[field];
        return next;
      });
      if (previousUrl) {
        void deleteImageFromStorage(previousUrl);
      }
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

  const handleImageUpload = async (
    e: React.ChangeEvent<HTMLInputElement>,
    config: {
      field: OwnerImageField;
      folder: 'logo' | 'profile' | 'hero';
      allowedTypes: readonly string[];
      setUploading: React.Dispatch<React.SetStateAction<boolean>>;
      invalidTitle: string;
      invalidFallback: string;
      uploadErrorTitle: string;
      uploadErrorFallback: string;
      logLabel: string;
      successMsg: string;
    }
  ) => {
    const input = e.currentTarget;
    const file = input.files?.[0];
    input.value = '';
    if (!file) return;

    const fileValidation = validateImageFile(file, MAX_IMAGE_SIZE_MB, true, config.allowedTypes);
    if (!fileValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: config.invalidTitle,
        message: fileValidation.error || config.invalidFallback,
        type: 'warning',
      });
      return;
    }

    const previousUrl = rawOwner?.[config.field];
    config.setUploading(true);

    let uploadedUrl: string | null = null;
    try {
      uploadedUrl = await uploadImageToStorage(file, config.folder);
      await updateOwnerInfo({ [config.field]: uploadedUrl });
      setDraft((prev) => {
        const next = { ...prev };
        delete next[config.field];
        return next;
      });
      if (previousUrl && previousUrl !== uploadedUrl) {
        void deleteImageFromStorage(previousUrl);
      }
      showTemporarySuccess(config.successMsg);
    } catch (err: unknown) {
      if (uploadedUrl) {
        void deleteImageFromStorage(uploadedUrl);
      }
      console.error(config.logLabel, err);
      setAlertState({
        isOpen: true,
        title: config.uploadErrorTitle,
        message: err instanceof Error ? err.message : config.uploadErrorFallback,
        type: 'error',
      });
    } finally {
      config.setUploading(false);
    }
  };

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    handleImageUpload(e, {
      field: 'logoUrl',
      folder: 'logo',
      allowedTypes: IMAGE_MIME_TYPES_WITH_SVG,
      setUploading: setUploadingLogo,
      invalidTitle: OWNER_SETTINGS_TEXTS.alerts.invalidLogoTitle,
      invalidFallback: OWNER_SETTINGS_TEXTS.alerts.invalidLogoFallback,
      uploadErrorTitle: OWNER_SETTINGS_TEXTS.alerts.uploadLogoErrorTitle,
      uploadErrorFallback: OWNER_SETTINGS_TEXTS.alerts.uploadLogoErrorFallback,
      logLabel: OWNER_SETTINGS_TEXTS.logs.uploadLogoError,
      successMsg: OWNER_SETTINGS_TEXTS.logo.successMsg,
    });

  const handleProfileImageChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    handleImageUpload(e, {
      field: 'pictureUrl',
      folder: 'profile',
      allowedTypes: IMAGE_MIME_TYPES_PHOTO,
      setUploading: setUploadingProfile,
      invalidTitle: OWNER_SETTINGS_TEXTS.alerts.invalidProfileTitle,
      invalidFallback: OWNER_SETTINGS_TEXTS.alerts.invalidProfileFallback,
      uploadErrorTitle: OWNER_SETTINGS_TEXTS.alerts.uploadProfileErrorTitle,
      uploadErrorFallback: OWNER_SETTINGS_TEXTS.alerts.uploadProfileErrorFallback,
      logLabel: OWNER_SETTINGS_TEXTS.logs.uploadProfileError,
      successMsg: OWNER_SETTINGS_TEXTS.profilePicture.successMsg,
    });

  const handleHeroImageChange = (e: React.ChangeEvent<HTMLInputElement>) =>
    handleImageUpload(e, {
      field: 'heroImageUrl',
      folder: 'hero',
      allowedTypes: IMAGE_MIME_TYPES_PHOTO,
      setUploading: setUploadingHero,
      invalidTitle: OWNER_SETTINGS_TEXTS.alerts.invalidHeroTitle,
      invalidFallback: OWNER_SETTINGS_TEXTS.alerts.invalidHeroFallback,
      uploadErrorTitle: OWNER_SETTINGS_TEXTS.alerts.uploadHeroErrorTitle,
      uploadErrorFallback: OWNER_SETTINGS_TEXTS.alerts.uploadHeroErrorFallback,
      logLabel: OWNER_SETTINGS_TEXTS.logs.uploadHeroError,
      successMsg: OWNER_SETTINGS_TEXTS.heroPicture.successMsg,
    });

  const handleDiscard = () => {
    setDraft({});
    setFieldErrors({});
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (dirtyCount === 0) return;

    const validationErrors = validateOwnerTextPatch(pendingPatch);
    const errorKeys = Object.keys(validationErrors) as OwnerTextField[];
    if (errorKeys.length > 0) {
      setFieldErrors(validationErrors);
      const firstInput = document.getElementById(getFieldInputId(errorKeys[0]));
      firstInput?.focus();
      return;
    }

    setSaving(true);
    setSuccessMsg(null);

    try {
      await updateOwnerInfo(pendingPatch);
      setDraft({});
      setFieldErrors({});
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

  const renderFieldHeader = (field: OwnerTextField, label: string) => {
    const isSaved = hasCustomOwnerField(rawOwner, field);
    const isDirty = field in pendingPatch;

    return (
      <div className={styles.fieldHeader}>
        <label htmlFor={getFieldInputId(field)} className={styles.fieldLabel}>
          {label}
        </label>

        {isDirty ? (
          <span className={styles.unsavedFieldTag}>
            {OWNER_SETTINGS_TEXTS.header.unsavedFieldBadge}
          </span>
        ) : !isSaved ? (
          <span className={styles.defaultFieldTag}>
            <Info size={12} strokeWidth={1.75} aria-hidden="true" />
            {OWNER_SETTINGS_TEXTS.header.defaultFieldBadge}
          </span>
        ) : (
          <button
            type="button"
            className={styles.fieldRestoreBtn}
            onClick={() => updateField(field, '')}
            disabled={busy}
          >
            <RotateCcw size={11} strokeWidth={1.75} aria-hidden="true" />
            <span>{OWNER_SETTINGS_TEXTS.header.restoreFieldAction}</span>
          </button>
        )}
      </div>
    );
  };

  const getRestoreHint = (field: OwnerTextField): string | undefined => {
    const isSaved = hasCustomOwnerField(rawOwner, field);
    const isDirty = field in pendingPatch;
    if (isSaved && isDirty && pendingPatch[field] === '') {
      return OWNER_SETTINGS_TEXTS.header.willRestoreDefaultHint;
    }
    return undefined;
  };

  const bannerMessage = defaultsSummary.allUsingDefaults
    ? OWNER_SETTINGS_TEXTS.header.usingAllDefaultsNotice
    : OWNER_SETTINGS_TEXTS.header.usingPartialDefaultsNotice(
        defaultsSummary.defaultTextCount,
        defaultsSummary.totalTextCount,
        defaultsSummary.defaultImageCount,
        defaultsSummary.totalImageCount
      );

  const descriptionRestoreHint = getRestoreHint('description');

  return (
    <div className={styles.container}>
      <form onSubmit={handleSubmit} noValidate className={styles.card}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <User size={22} color="var(--color-primary)" />
            {OWNER_SETTINGS_TEXTS.header.title}
          </h2>
          <p className={styles.subtitle}>
            {OWNER_SETTINGS_TEXTS.header.subtitle}
          </p>
        </div>

        {!loading && defaultsSummary.hasAnyDefault && (
          <div className={styles.defaultInfoBanner} role="status">
            <Info size={16} strokeWidth={1.75} className={styles.defaultInfoIcon} aria-hidden="true" />
            <span>{bannerMessage}</span>
          </div>
        )}

        {successMsg && (
          <div className={styles.successAlert} role="status">
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
                  accept={LOGO_ACCEPT}
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
                  accept={PHOTO_ACCEPT}
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
                  accept={PHOTO_ACCEPT}
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
          <div className={styles.fieldGroup}>
            {renderFieldHeader('businessName', OWNER_SETTINGS_TEXTS.inputs.businessNameLabel)}
            <Input
              id={getFieldInputId('businessName')}
              value={formData.businessName || ''}
              onChange={(e) => updateField('businessName', e.target.value)}
              placeholder={defaults.businessName || OWNER_SETTINGS_TEXTS.inputs.businessNamePlaceholder}
              maxLength={80}
              error={fieldErrors.businessName}
              helperText={getRestoreHint('businessName')}
            />
          </div>

          <div className={styles.fieldGroup}>
            {renderFieldHeader('name', OWNER_SETTINGS_TEXTS.inputs.nameLabel)}
            <Input
              id={getFieldInputId('name')}
              value={formData.name}
              onChange={(e) => updateField('name', e.target.value)}
              placeholder={defaults.name || OWNER_SETTINGS_TEXTS.inputs.namePlaceholder}
              maxLength={80}
              error={fieldErrors.name}
              helperText={getRestoreHint('name')}
            />
          </div>

          <div className={styles.fieldGroup}>
            {renderFieldHeader('role', OWNER_SETTINGS_TEXTS.inputs.roleLabel)}
            <Input
              id={getFieldInputId('role')}
              value={formData.role || ''}
              onChange={(e) => updateField('role', e.target.value)}
              placeholder={defaults.role || OWNER_SETTINGS_TEXTS.inputs.rolePlaceholder}
              maxLength={100}
              error={fieldErrors.role}
              helperText={getRestoreHint('role')}
            />
          </div>

          <div className={styles.fieldGroup}>
            {renderFieldHeader('instagram', OWNER_SETTINGS_TEXTS.inputs.instagramLabel)}
            <Input
              id={getFieldInputId('instagram')}
              value={formData.instagram || ''}
              onChange={(e) => updateField('instagram', e.target.value)}
              placeholder={defaults.instagram || OWNER_SETTINGS_TEXTS.inputs.instagramPlaceholder}
              maxLength={100}
              error={fieldErrors.instagram}
              helperText={getRestoreHint('instagram')}
            />
          </div>

          <div className={styles.fieldGroup}>
            {renderFieldHeader('phone', OWNER_SETTINGS_TEXTS.inputs.phoneLabel)}
            <Input
              id={getFieldInputId('phone')}
              type="tel"
              phoneOnly
              value={formData.phone || ''}
              onChange={(e) => updateField('phone', e.target.value)}
              placeholder={defaults.phone || OWNER_SETTINGS_TEXTS.inputs.phonePlaceholder}
              maxLength={25}
              error={fieldErrors.phone}
              helperText={getRestoreHint('phone')}
            />
          </div>

          <div className={styles.fieldGroup}>
            {renderFieldHeader('email', OWNER_SETTINGS_TEXTS.inputs.emailLabel)}
            <Input
              id={getFieldInputId('email')}
              type="email"
              value={formData.email || ''}
              onChange={(e) => updateField('email', e.target.value)}
              placeholder={defaults.email || OWNER_SETTINGS_TEXTS.inputs.emailPlaceholder}
              maxLength={120}
              error={fieldErrors.email}
              helperText={getRestoreHint('email')}
            />
          </div>

          <div className={`${styles.fieldGroup} ${styles.fullWidth}`}>
            {renderFieldHeader('location', OWNER_SETTINGS_TEXTS.inputs.locationLabel)}
            <Input
              id={getFieldInputId('location')}
              value={formData.location || ''}
              onChange={(e) => updateField('location', e.target.value)}
              placeholder={defaults.location || OWNER_SETTINGS_TEXTS.inputs.locationPlaceholder}
              maxLength={150}
              error={fieldErrors.location}
              helperText={getRestoreHint('location')}
            />
          </div>

          <div className={styles.fullWidth}>
            <div className={styles.textareaWrapper}>
              {renderFieldHeader('description', OWNER_SETTINGS_TEXTS.inputs.bioLabel)}
              <textarea
                id={getFieldInputId('description')}
                className={`${styles.textarea} ${fieldErrors.description ? styles.textareaError : ''}`}
                value={formData.description}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder={defaults.description || OWNER_SETTINGS_TEXTS.inputs.bioPlaceholder}
                maxLength={3000}
                rows={5}
              />
              <div className={styles.textareaMetaRow}>
                <div className={styles.textareaFeedback}>
                  {fieldErrors.description ? (
                    <span className={styles.fieldErrorText}>{fieldErrors.description}</span>
                  ) : descriptionRestoreHint ? (
                    <span className={styles.fieldHintText}>{descriptionRestoreHint}</span>
                  ) : null}
                </div>
                <span className={styles.charCounter}>
                  {OWNER_SETTINGS_TEXTS.inputs.charCount(formData.description.length, 3000)}
                </span>
              </div>
            </div>
          </div>
        </div>

        <div className={styles.footer}>
          <div className={styles.footerStatus}>
            {dirtyCount === 0 && (
              <span className={styles.noChangesText}>
                {OWNER_SETTINGS_TEXTS.inputs.noChangesHint}
              </span>
            )}
          </div>

          <div className={styles.footerActions}>
            {dirtyCount > 0 && (
              <Button
                type="button"
                variant="outline"
                size="md"
                disabled={busy}
                onClick={handleDiscard}
                leftIcon={<X size={15} />}
              >
                {OWNER_SETTINGS_TEXTS.inputs.discardButton}
              </Button>
            )}

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={busy || dirtyCount === 0}
              leftIcon={saving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
            >
              {saving
                ? OWNER_SETTINGS_TEXTS.inputs.savingButton
                : dirtyCount > 0
                ? OWNER_SETTINGS_TEXTS.inputs.saveChangesCount(dirtyCount)
                : OWNER_SETTINGS_TEXTS.inputs.saveButton}
            </Button>
          </div>
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
