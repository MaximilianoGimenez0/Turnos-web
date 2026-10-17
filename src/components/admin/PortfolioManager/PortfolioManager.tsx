import React, { useState, useEffect } from 'react';
import {
  Image as ImageIcon,
  Plus,
  Loader2,
  CheckCircle2,
} from 'lucide-react';
import type { PortfolioItem } from '../../../types';
import {
  subscribeToPortfolio,
  addPortfolioItem,
  deletePortfolioItem,
} from '../../../services/ownerService';
import { uploadImageToStorage, deleteImageFromStorage } from '../../../services/storageService';
import { validateImageFile, validateRequiredText } from '../../../utils/validators';
import PortfolioCard from '../../portfolio/PortfolioCard/PortfolioCard';
import Input from '../../common/Input/Input';
import Button from '../../common/Button/Button';
import Loader from '../../common/Loader/Loader';
import AlertModal, { type AlertModalType } from '../../common/AlertModal';
import { PORTFOLIO_MANAGER_TEXTS } from '../../../texts';
import styles from './PortfolioManager.module.css';

export const PortfolioManager: React.FC = () => {
  const [items, setItems] = useState<PortfolioItem[]>([]);
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('');
  const [description, setDescription] = useState('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);

  const [uploading, setUploading] = useState(false);
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
    const unsubscribe = subscribeToPortfolio((data) => {
      setItems(data);
    });
    return () => unsubscribe();
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileValidation = validateImageFile(file, 10, true);
    if (!fileValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: PORTFOLIO_MANAGER_TEXTS.alerts.invalidFileTitle,
        message: fileValidation.error || PORTFOLIO_MANAGER_TEXTS.alerts.invalidFileFallback,
        type: 'warning',
      });
      return;
    }

    setSelectedFile(file);
    setPreviewUrl(URL.createObjectURL(file));
  };

  const handleAddWork = async (e: React.FormEvent) => {
    e.preventDefault();

    // 1. Validar imagen
    const fileValidation = validateImageFile(selectedFile, 10, true);
    if (!fileValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: PORTFOLIO_MANAGER_TEXTS.alerts.imageRequiredTitle,
        message: fileValidation.error || PORTFOLIO_MANAGER_TEXTS.alerts.imageRequiredFallback,
        type: 'warning',
      });
      return;
    }

    // 2. Validar título
    const titleValidation = validateRequiredText(title, PORTFOLIO_MANAGER_TEXTS.fields.titleFieldName, 2, 100);
    if (!titleValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: PORTFOLIO_MANAGER_TEXTS.alerts.titleRequiredTitle,
        message: titleValidation.error || PORTFOLIO_MANAGER_TEXTS.alerts.titleRequiredFallback,
        type: 'warning',
      });
      return;
    }

    // 3. Validar categoría
    const categoryValidation = validateRequiredText(category, PORTFOLIO_MANAGER_TEXTS.fields.categoryFieldName, 2, 50);
    if (!categoryValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: PORTFOLIO_MANAGER_TEXTS.alerts.categoryRequiredTitle,
        message: categoryValidation.error || PORTFOLIO_MANAGER_TEXTS.alerts.categoryRequiredFallback,
        type: 'warning',
      });
      return;
    }

    setUploading(true);
    setSuccessMsg(null);

    try {
      // 1. Subir a Firebase Storage
      const imageUrl = await uploadImageToStorage(selectedFile!, 'portfolio');

      // 2. Guardar registro en Firestore (asegurando strings sin undefined)
      await addPortfolioItem({
        title: title.trim(),
        category: category.trim(),
        description: description.trim() || '',
        imageUrl,
      });

      setSuccessMsg(PORTFOLIO_MANAGER_TEXTS.alerts.uploadSuccess);
      setTitle('');
      setCategory('');
      setDescription('');
      setSelectedFile(null);
      setPreviewUrl(null);
      setTimeout(() => setSuccessMsg(null), 4000);
    } catch (err: unknown) {
      console.error(PORTFOLIO_MANAGER_TEXTS.logs.addError, err);
      setAlertState({
        isOpen: true,
        title: PORTFOLIO_MANAGER_TEXTS.alerts.uploadErrorTitle,
        message: err instanceof Error ? err.message : PORTFOLIO_MANAGER_TEXTS.alerts.uploadErrorFallback,
        type: 'error',
      });
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id: string, imageUrl: string) => {
    if (!window.confirm(PORTFOLIO_MANAGER_TEXTS.alerts.confirmDelete)) {
      return;
    }

    try {
      await deletePortfolioItem(id);
      await deleteImageFromStorage(imageUrl);
      setSuccessMsg(PORTFOLIO_MANAGER_TEXTS.alerts.deleteSuccess);
      setTimeout(() => setSuccessMsg(null), 3000);
    } catch (err: unknown) {
      console.error(PORTFOLIO_MANAGER_TEXTS.logs.deleteError, err);
      setAlertState({
        isOpen: true,
        title: PORTFOLIO_MANAGER_TEXTS.alerts.deleteErrorTitle,
        message: PORTFOLIO_MANAGER_TEXTS.alerts.deleteErrorMessage,
        type: 'error',
      });
    }
  };

  return (
    <div className={styles.container}>
      {/* Formulario de Subida */}
      <form onSubmit={handleAddWork} className={styles.uploadCard}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <ImageIcon size={22} color="var(--color-primary)" />
            {PORTFOLIO_MANAGER_TEXTS.header.title}
          </h2>
          <p className={styles.subtitle}>
            {PORTFOLIO_MANAGER_TEXTS.header.subtitle}
          </p>
        </div>

        {successMsg && (
          <div className={styles.successAlert}>
            <CheckCircle2 size={18} />
            <span>{successMsg}</span>
          </div>
        )}

        <div className={styles.formGrid}>
          {/* Dropzone de Imagen */}
          <label className={styles.imageDropzone}>
            {previewUrl ? (
              <img src={previewUrl} alt={PORTFOLIO_MANAGER_TEXTS.dropzone.previewAlt} className={styles.previewImg} />
            ) : (
              <div className={styles.dropzonePrompt}>
                <ImageIcon size={36} color="var(--color-primary)" />
                <span>
                  <strong>{PORTFOLIO_MANAGER_TEXTS.dropzone.promptClick}</strong> {PORTFOLIO_MANAGER_TEXTS.dropzone.promptDrag}
                </span>
                <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
                  {PORTFOLIO_MANAGER_TEXTS.dropzone.formatHelp}
                </span>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleFileSelect}
              disabled={uploading}
              style={{ display: 'none' }}
            />
          </label>

          {/* Campos de Información */}
          <div className={styles.fieldsColumn}>
            <div className={styles.rowTwo}>
              <Input
                label={PORTFOLIO_MANAGER_TEXTS.fields.titleLabel}
                placeholder={PORTFOLIO_MANAGER_TEXTS.fields.titlePlaceholder}
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />

              <Input
                label={PORTFOLIO_MANAGER_TEXTS.fields.categoryLabel}
                placeholder={PORTFOLIO_MANAGER_TEXTS.fields.categoryPlaceholder}
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                required
              />
            </div>

            <Input
              label={PORTFOLIO_MANAGER_TEXTS.fields.descriptionLabel}
              placeholder={PORTFOLIO_MANAGER_TEXTS.fields.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />

            <div>
              <Button
                type="submit"
                variant="primary"
                size="md"
                disabled={uploading || !selectedFile}
                leftIcon={uploading ? <Loader2 size={16} className="spinner" /> : <Plus size={16} />}
              >
                {uploading ? PORTFOLIO_MANAGER_TEXTS.fields.uploadingButton : PORTFOLIO_MANAGER_TEXTS.fields.submitButton}
              </Button>
            </div>
          </div>
        </div>
      </form>

      {/* Lista de Trabajos Existentes */}
      <div className={styles.itemsSection}>
        <div className={styles.itemsHeader}>
          <h3 className={styles.itemsTitle}>
            {PORTFOLIO_MANAGER_TEXTS.list.title(items.length)}
          </h3>
        </div>

        {items.length === 0 ? (
          <div className={styles.emptyGallery}>
            <p>{PORTFOLIO_MANAGER_TEXTS.list.empty}</p>
          </div>
        ) : (
          <div className={styles.itemsGrid}>
            {items.map((item) => (
              <PortfolioCard
                key={item.id}
                item={item}
                isAdmin={true}
                onDelete={handleDelete}
              />
            ))}
          </div>
        )}
      </div>

      {uploading && (
        <Loader
          fullScreen
          title={PORTFOLIO_MANAGER_TEXTS.loader.title}
          subtitle={PORTFOLIO_MANAGER_TEXTS.loader.subtitle}
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

export default PortfolioManager;
