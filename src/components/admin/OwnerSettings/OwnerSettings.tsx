import React, { useState, useEffect } from 'react';
import {
  User,
  Upload,
  Save,
  CheckCircle2,
  Loader2,
  Image as ImageIcon,
} from 'lucide-react';
import type { OwnerInfo } from '../../../types';
import { subscribeToOwnerInfo, updateOwnerInfo, DEFAULT_OWNER_INFO } from '../../../services/ownerService';
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

export const OwnerSettings: React.FC = () => {
  const [formData, setFormData] = useState<OwnerInfo>(DEFAULT_OWNER_INFO);
  const [uploadingProfile, setUploadingProfile] = useState(false);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Alerta modal
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

  useEffect(() => {
    const unsubscribe = subscribeToOwnerInfo((data) => {
      setFormData(data);
    });
    return () => unsubscribe();
  }, []);

  // Manejo de subida de Logo a Firebase Storage
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
      setFormData((prev) => ({ ...prev, logoUrl: downloadUrl }));
      await updateOwnerInfo({ logoUrl: downloadUrl });
      setSuccessMsg(OWNER_SETTINGS_TEXTS.logo.successMsg);
      setTimeout(() => setSuccessMsg(null), 4000);
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

  // Manejo de subida de Foto de Perfil a Firebase Storage
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
      setFormData((prev) => ({ ...prev, pictureUrl: downloadUrl }));
      await updateOwnerInfo({ pictureUrl: downloadUrl });
      setSuccessMsg(OWNER_SETTINGS_TEXTS.profilePicture.successMsg);
      setTimeout(() => setSuccessMsg(null), 4000);
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validar nombre de la estética
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

    // 2. Validar nombre del profesional
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

    // 3. Validar email si fue provisto
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

    // 4. Validar teléfono si fue provisto
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

    // 5. Validar biografía
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
      setSuccessMsg(OWNER_SETTINGS_TEXTS.alerts.saveSuccess);
      setTimeout(() => setSuccessMsg(null), 4000);
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

        {successMsg && (
          <div className={styles.successAlert}>
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        {/* 1. SECCIÓN: LOGO DE LA ESTÉTICA (Navbar & Marca) */}
        <div className={styles.pictureRow}>
          <div className={styles.avatarPreview} style={{ borderRadius: 'var(--radius-lg)' }}>
            {formData.logoUrl ? (
              <img
                src={formData.logoUrl}
                alt={OWNER_SETTINGS_TEXTS.logo.alt}
                className={styles.avatarImg}
                style={{ borderRadius: 'var(--radius-md)' }}
              />
            ) : (
              <div className={styles.avatarFallback} style={{ borderRadius: 'var(--radius-md)' }}>
                <ImageIcon size={38} />
              </div>
            )}
          </div>

          <div className={styles.uploadActions}>
            <label className={styles.fileInputLabel}>
              {uploadingLogo ? <Loader2 size={16} className="spinner" /> : <Upload size={16} />}
              <span>{uploadingLogo ? OWNER_SETTINGS_TEXTS.logo.uploadingText : OWNER_SETTINGS_TEXTS.logo.buttonText}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleLogoChange}
                disabled={uploadingLogo}
                className={styles.hiddenFileInput}
              />
            </label>
            <span className={styles.uploadHelp}>
              {OWNER_SETTINGS_TEXTS.logo.helpText}
            </span>
          </div>
        </div>

        {/* 2. SECCIÓN: FOTO DE PERFIL (Página Sobre Mí) */}
        <div className={styles.pictureRow}>
          <div className={styles.avatarPreview}>
            {formData.pictureUrl ? (
              <img
                src={formData.pictureUrl}
                alt={formData.name}
                className={styles.avatarImg}
              />
            ) : (
              <div className={styles.avatarFallback}>
                <User size={42} />
              </div>
            )}
          </div>

          <div className={styles.uploadActions}>
            <label className={styles.fileInputLabel}>
              {uploadingProfile ? <Loader2 size={16} className="spinner" /> : <Upload size={16} />}
              <span>{uploadingProfile ? OWNER_SETTINGS_TEXTS.profilePicture.uploadingText : OWNER_SETTINGS_TEXTS.profilePicture.buttonText}</span>
              <input
                type="file"
                accept="image/*"
                onChange={handleProfileImageChange}
                disabled={uploadingProfile}
                className={styles.hiddenFileInput}
              />
            </label>
            <span className={styles.uploadHelp}>
              {OWNER_SETTINGS_TEXTS.profilePicture.helpText}
            </span>
          </div>
        </div>

        {/* Form Inputs Grid */}
        <div className={styles.formGrid}>
          <div>
            <Input
              label={OWNER_SETTINGS_TEXTS.inputs.businessNameLabel}
              value={formData.businessName || ''}
              onChange={(e) => setFormData({ ...formData, businessName: e.target.value })}
              placeholder={OWNER_SETTINGS_TEXTS.inputs.businessNamePlaceholder}
              required
            />
          </div>

          <div>
            <Input
              label={OWNER_SETTINGS_TEXTS.inputs.nameLabel}
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              placeholder={OWNER_SETTINGS_TEXTS.inputs.namePlaceholder}
              required
            />
          </div>

          <div>
            <Input
              label={OWNER_SETTINGS_TEXTS.inputs.roleLabel}
              value={formData.role || ''}
              onChange={(e) => setFormData({ ...formData, role: e.target.value })}
              placeholder={OWNER_SETTINGS_TEXTS.inputs.rolePlaceholder}
            />
          </div>

          <div>
            <Input
              label={OWNER_SETTINGS_TEXTS.inputs.instagramLabel}
              value={formData.instagram || ''}
              onChange={(e) => setFormData({ ...formData, instagram: e.target.value })}
              placeholder={OWNER_SETTINGS_TEXTS.inputs.instagramPlaceholder}
            />
          </div>

          <div>
            <Input
              label={OWNER_SETTINGS_TEXTS.inputs.phoneLabel}
              type="tel"
              phoneOnly
              value={formData.phone || ''}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              placeholder={OWNER_SETTINGS_TEXTS.inputs.phonePlaceholder}
            />
          </div>

          <div>
            <Input
              label={OWNER_SETTINGS_TEXTS.inputs.emailLabel}
              type="email"
              value={formData.email || ''}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              placeholder={OWNER_SETTINGS_TEXTS.inputs.emailPlaceholder}
            />
          </div>

          <div className={styles.fullWidth}>
            <Input
              label={OWNER_SETTINGS_TEXTS.inputs.locationLabel}
              value={formData.location || ''}
              onChange={(e) => setFormData({ ...formData, location: e.target.value })}
              placeholder={OWNER_SETTINGS_TEXTS.inputs.locationPlaceholder}
            />
          </div>

          <div className={styles.fullWidth}>
            <div className={styles.textareaWrapper}>
              <label className={styles.textareaLabel}>{OWNER_SETTINGS_TEXTS.inputs.bioLabel}</label>
              <textarea
                className={styles.textarea}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder={OWNER_SETTINGS_TEXTS.inputs.bioPlaceholder}
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
            disabled={saving || uploadingProfile || uploadingLogo}
            leftIcon={saving ? <Loader2 size={16} className="spinner" /> : <Save size={16} />}
          >
            {saving ? OWNER_SETTINGS_TEXTS.inputs.savingButton : OWNER_SETTINGS_TEXTS.inputs.saveButton}
          </Button>
        </div>
      </form>

      {(saving || uploadingProfile || uploadingLogo) && (
        <Loader
          fullScreen
          title={
            uploadingProfile
              ? OWNER_SETTINGS_TEXTS.loaders.uploadingProfile
              : uploadingLogo
              ? OWNER_SETTINGS_TEXTS.loaders.uploadingLogo
              : OWNER_SETTINGS_TEXTS.loaders.savingSettings
          }
          subtitle={OWNER_SETTINGS_TEXTS.loaders.subtitle}
          icon="heart"
        />
      )}

      {/* MODAL DE ALERTAS */}
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
