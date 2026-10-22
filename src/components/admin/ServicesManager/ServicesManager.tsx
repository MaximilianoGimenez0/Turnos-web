import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Plus,
  Trash2,
  Edit3,
  Layers,
  DollarSign,
  PlusCircle,
  X,
  Check,
  Clock,
} from 'lucide-react';
import type { ServiceItem, PriceExtra } from '../../../types';
import {
  subscribeToServices,
  addService,
  updateService,
  deleteService,
} from '../../../services/servicesService';
import { validatePositiveInteger, validateRequiredText } from '../../../utils/validators';
import Input from '../../common/Input/Input';
import Button from '../../common/Button/Button';
import Loader from '../../common/Loader/Loader';
import AlertModal, { type AlertModalType } from '../../common/AlertModal';
import { SERVICES_MANAGER_TEXTS } from '../../../texts';
import styles from './ServicesManager.module.css';

export const ServicesManager: React.FC = () => {
  const [services, setServices] = useState<ServiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingText, setActionLoadingText] = useState<string | null>(null);

  const [editingId, setEditingId] = useState<string | null>(null);

  const [name, setName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [durationMinutes, setDurationMinutes] = useState('60');
  const [description, setDescription] = useState('');

  const [extras, setExtras] = useState<PriceExtra[]>([]);
  const [newExtraName, setNewExtraName] = useState('');
  const [newExtraPrice, setNewExtraPrice] = useState('');

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
    const unsubscribe = subscribeToServices(
      (data) => {
        setServices(data);
        setLoading(false);
      },
      (err) => {
        console.error(SERVICES_MANAGER_TEXTS.logs.loadServicesError, err);
        setAlertState({
          isOpen: true,
          title: SERVICES_MANAGER_TEXTS.alerts.connectionErrorTitle,
          message: SERVICES_MANAGER_TEXTS.alerts.connectionErrorMessage,
          type: 'error',
        });
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const handleAddExtra = (e: React.MouseEvent) => {
    e.preventDefault();
    const cleanExtraName = newExtraName.trim();
    if (!cleanExtraName) {
      setAlertState({
        isOpen: true,
        title: SERVICES_MANAGER_TEXTS.alerts.extraNameRequiredTitle,
        message: SERVICES_MANAGER_TEXTS.alerts.extraNameRequiredMessage,
        type: 'warning',
      });
      return;
    }

    const priceValidation = validatePositiveInteger(
      newExtraPrice,
      SERVICES_MANAGER_TEXTS.extrasBuilder.priceField,
      0,
      5000000
    );
    if (!priceValidation.isValid || priceValidation.parsedValue === undefined) {
      setAlertState({
        isOpen: true,
        title: SERVICES_MANAGER_TEXTS.alerts.extraPriceInvalidTitle,
        message:
          priceValidation.error ||
          SERVICES_MANAGER_TEXTS.alerts.extraPriceInvalidMessage,
        type: 'warning',
      });
      return;
    }

    setExtras((prev) => [
      ...prev,
      {
        id: `extra-${Date.now()}-${prev.length}`,
        name: cleanExtraName,
        price: priceValidation.parsedValue!,
      },
    ]);

    setNewExtraName('');
    setNewExtraPrice('');
  };

  const handleRemoveExtra = (indexToRemove: number) => {
    setExtras((prev) => prev.filter((_, idx) => idx !== indexToRemove));
  };

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setBasePrice('');
    setDurationMinutes('60');
    setDescription('');
    setExtras([]);
    setNewExtraName('');
    setNewExtraPrice('');
  };

  const handleEditService = (serviceItem: ServiceItem) => {
    setEditingId(serviceItem.id);
    setName(serviceItem.name);
    setBasePrice(String(serviceItem.basePrice));
    setDurationMinutes(String(serviceItem.durationMinutes || 60));
    setDescription(serviceItem.description || '');
    setExtras(serviceItem.extras || []);
    setNewExtraName('');
    setNewExtraPrice('');

    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const nameValidation = validateRequiredText(name, SERVICES_MANAGER_TEXTS.form.nameField, 2, 80);
    if (!nameValidation.isValid) {
      setAlertState({
        isOpen: true,
        title: SERVICES_MANAGER_TEXTS.alerts.nameRequiredTitle,
        message: nameValidation.error || SERVICES_MANAGER_TEXTS.alerts.nameRequiredMessage,
        type: 'warning',
      });
      return;
    }

    const priceValidation = validatePositiveInteger(basePrice, SERVICES_MANAGER_TEXTS.form.basePriceField, 0, 5000000);
    if (!priceValidation.isValid || priceValidation.parsedValue === undefined) {
      setAlertState({
        isOpen: true,
        title: SERVICES_MANAGER_TEXTS.alerts.basePriceInvalidTitle,
        message:
          priceValidation.error ||
          SERVICES_MANAGER_TEXTS.alerts.basePriceInvalidMessage,
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
          durationValidation.error ||
          SERVICES_MANAGER_TEXTS.alerts.durationInvalidMessage,
        type: 'warning',
      });
      return;
    }

    setActionLoadingText(editingId ? SERVICES_MANAGER_TEXTS.loaders.saving : SERVICES_MANAGER_TEXTS.loaders.creating);

    try {
      const payload = {
        name: name.trim(),
        basePrice: priceValidation.parsedValue,
        durationMinutes: durationValidation.parsedValue,
        extras,
        description: description.trim(),
      };

      if (editingId) {
        await updateService(editingId, payload);
      } else {
        await addService(payload);
      }

      resetForm();
    } catch (err: unknown) {
      console.error(SERVICES_MANAGER_TEXTS.logs.saveServiceError, err);
      setAlertState({
        isOpen: true,
        title: SERVICES_MANAGER_TEXTS.alerts.saveErrorTitle,
        message: err instanceof Error ? err.message : SERVICES_MANAGER_TEXTS.alerts.saveErrorFallback,
        type: 'error',
      });
    } finally {
      setActionLoadingText(null);
    }
  };

  const handleDeleteService = async (serviceItem: ServiceItem) => {
    const confirm = window.confirm(
      SERVICES_MANAGER_TEXTS.catalog.deleteConfirm(serviceItem.name)
    );
    if (!confirm) return;

    setActionLoadingText(SERVICES_MANAGER_TEXTS.loaders.deleting);
    try {
      await deleteService(serviceItem.id);
      if (editingId === serviceItem.id) {
        resetForm();
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

  return (
    <div className={`${styles.container} animate-fade-in`}>
      <div className={styles.createCard}>
        <div className={styles.header}>
          <h2 className={styles.title}>
            <Sparkles size={20} className={styles.titleIcon} />
            {editingId ? SERVICES_MANAGER_TEXTS.header.editTitle : SERVICES_MANAGER_TEXTS.header.createTitle}
          </h2>
          <p className={styles.subtitle}>
            {SERVICES_MANAGER_TEXTS.header.subtitle}
          </p>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.formGrid}>
            <div>
              <Input
                label={SERVICES_MANAGER_TEXTS.form.nameLabel}
                placeholder={SERVICES_MANAGER_TEXTS.form.namePlaceholder}
                value={name}
                onChange={(e) => setName(e.target.value)}
                leftIcon={<Sparkles size={16} />}
                disabled={!!actionLoadingText}
                required
              />
            </div>

            <div>
              <Input
                label={SERVICES_MANAGER_TEXTS.form.basePriceLabel}
                type="text"
                inputMode="numeric"
                numericOnly
                maxDigits={8}
                placeholder={SERVICES_MANAGER_TEXTS.form.basePricePlaceholder}
                value={basePrice}
                onChange={(e) => setBasePrice(e.target.value)}
                leftIcon={<DollarSign size={16} />}
                disabled={!!actionLoadingText}
                required
              />
              <span className={styles.helperText}>{SERVICES_MANAGER_TEXTS.form.basePriceHelper}</span>
            </div>

            <div>
              <Input
                label={SERVICES_MANAGER_TEXTS.form.durationLabel}
                type="text"
                inputMode="numeric"
                numericOnly
                maxDigits={3}
                placeholder={SERVICES_MANAGER_TEXTS.form.durationPlaceholder}
                value={durationMinutes}
                onChange={(e) => setDurationMinutes(e.target.value)}
                leftIcon={<Clock size={16} />}
                disabled={!!actionLoadingText}
                required
              />
              <span className={styles.helperText}>{SERVICES_MANAGER_TEXTS.form.durationHelper}</span>
            </div>
          </div>

          <div>
            <Input
              label={SERVICES_MANAGER_TEXTS.form.descriptionLabel}
              placeholder={SERVICES_MANAGER_TEXTS.form.descriptionPlaceholder}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              disabled={!!actionLoadingText}
            />
          </div>

          <div className={styles.extrasBuilderSection}>
            <div className={styles.extrasHeader}>
              <span className={styles.extrasTitle}>
                <PlusCircle size={15} color="var(--color-primary)" />
                {SERVICES_MANAGER_TEXTS.extrasBuilder.title(extras.length)}
              </span>
              <span className={styles.helperText}>
                {SERVICES_MANAGER_TEXTS.extrasBuilder.subtitle}
              </span>
            </div>

            <div className={styles.extrasInputRow}>
              <div>
                <Input
                  label={SERVICES_MANAGER_TEXTS.extrasBuilder.nameLabel}
                  placeholder={SERVICES_MANAGER_TEXTS.extrasBuilder.namePlaceholder}
                  value={newExtraName}
                  onChange={(e) => setNewExtraName(e.target.value)}
                  disabled={!!actionLoadingText}
                />
              </div>

              <div>
                <Input
                  label={SERVICES_MANAGER_TEXTS.extrasBuilder.priceLabel}
                  type="text"
                  inputMode="numeric"
                  numericOnly
                  maxDigits={7}
                  placeholder={SERVICES_MANAGER_TEXTS.extrasBuilder.pricePlaceholder}
                  value={newExtraPrice}
                  onChange={(e) => setNewExtraPrice(e.target.value)}
                  leftIcon={<DollarSign size={14} />}
                  disabled={!!actionLoadingText}
                />
              </div>

              <Button
                type="button"
                variant="secondary"
                onClick={handleAddExtra}
                disabled={!newExtraName.trim() || !newExtraPrice.trim() || !!actionLoadingText}
                leftIcon={<Plus size={14} />}
              >
                {SERVICES_MANAGER_TEXTS.extrasBuilder.addButton}
              </Button>
            </div>

            {extras.length > 0 && (
              <div className={styles.extrasList}>
                {extras.map((ex, idx) => (
                  <span key={ex.id || idx} className={styles.extraChip}>
                    <span>{ex.name}</span>
                    <span className={styles.extraPriceTag}>
                      +${(ex.price || 0).toLocaleString('es-AR')}
                    </span>
                    <button
                      type="button"
                      className={styles.removeExtraBtn}
                      onClick={() => handleRemoveExtra(idx)}
                      title={SERVICES_MANAGER_TEXTS.extrasBuilder.removeExtraTitle(ex.name)}
                      aria-label={SERVICES_MANAGER_TEXTS.extrasBuilder.removeExtraAriaLabel(ex.name)}
                    >
                      <X size={13} />
                    </button>
                  </span>
                ))}
              </div>
            )}
          </div>

          <div className={styles.formActions}>
            {editingId && (
              <Button
                type="button"
                variant="secondary"
                onClick={resetForm}
                disabled={!!actionLoadingText}
              >
                {SERVICES_MANAGER_TEXTS.form.cancelEditButton}
              </Button>
            )}

            <Button
              type="submit"
              variant="primary"
              isLoading={!!actionLoadingText}
              leftIcon={editingId ? <Check size={16} /> : <Plus size={16} />}
            >
              {editingId ? SERVICES_MANAGER_TEXTS.form.saveChangesButton : SERVICES_MANAGER_TEXTS.form.createServiceButton}
            </Button>
          </div>
        </form>
      </div>

      <div className={styles.sectionsContainer}>
        <div className={styles.catalogHeader}>
          <div className={styles.catalogTitleArea}>
            <h3 className={styles.catalogMainTitle}>
              <Layers size={20} className={styles.catalogTitleIcon} />
              {SERVICES_MANAGER_TEXTS.catalog.title}
            </h3>
            <p className={styles.catalogSubtitle}>
              {SERVICES_MANAGER_TEXTS.catalog.subtitle}
            </p>
          </div>
          {!loading && services.length > 0 && (
            <div className={styles.catalogStats}>
              <span className={styles.catalogStatBadge}>
                {SERVICES_MANAGER_TEXTS.catalog.statsTotal(services.length)}
              </span>
            </div>
          )}
        </div>

        {loading ? (
          <Loader
            size="md"
            title={SERVICES_MANAGER_TEXTS.loaders.loadingCatalogTitle}
            subtitle={SERVICES_MANAGER_TEXTS.loaders.loadingCatalogSubtitle}
            icon="calendar"
          />
        ) : services.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIconCircle}>
              <Layers size={30} className={styles.emptyIcon} />
            </div>
            <h4 className={styles.emptyTitle}>{SERVICES_MANAGER_TEXTS.catalog.emptyTitle}</h4>
            <p className={styles.emptyText}>
              {SERVICES_MANAGER_TEXTS.catalog.emptyText}
            </p>
          </div>
        ) : (
          <div className={styles.servicesGrid}>
            {services.map((serviceItem) => (
              <div key={serviceItem.id} className={styles.serviceCard}>
                <div className={styles.cardMain}>
                  <div className={styles.cardHeader}>
                    <div className={styles.cardTitleGroup}>
                      <h5 className={styles.serviceName}>{serviceItem.name}</h5>
                      {serviceItem.description && (
                        <p className={styles.serviceDesc}>{serviceItem.description}</p>
                      )}
                    </div>
                    <div className={styles.priceBadgeWrapper}>
                      <span className={styles.priceBadgeLabel}>{SERVICES_MANAGER_TEXTS.catalog.basePriceLabel}</span>
                      <div className={styles.badgesRow}>
                        <span className={styles.basePriceBadge}>
                          ${(serviceItem.basePrice || 0).toLocaleString('es-AR')}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <span className={styles.durationBadge}>
                      <Clock size={12} />
                      {serviceItem.durationMinutes || 60} {SERVICES_MANAGER_TEXTS.catalog.durationUnit}
                    </span>
                  </div>

                  {serviceItem.extras && serviceItem.extras.length > 0 ? (
                    <div className={styles.cardExtrasBlock}>
                      <div className={styles.cardExtrasHeader}>
                        <Sparkles size={12} className={styles.cardExtrasIcon} />
                        <span>{SERVICES_MANAGER_TEXTS.catalog.availableExtras(serviceItem.extras.length)}</span>
                      </div>
                      <div className={styles.cardExtrasList}>
                        {serviceItem.extras.map((ex, idx) => (
                          <div key={ex.id || idx} className={styles.cardExtraItem}>
                            <span className={styles.extraItemName}>{ex.name}</span>
                            <span className={styles.extraItemPrice}>
                              +${(ex.price || 0).toLocaleString('es-AR')}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <div className={styles.noExtrasNote}>
                      <span>{SERVICES_MANAGER_TEXTS.catalog.noExtras}</span>
                    </div>
                  )}
                </div>

                <div className={styles.cardFooter}>
                  <span className={styles.extrasCountPill}>
                    <Sparkles size={11} />
                    {SERVICES_MANAGER_TEXTS.catalog.extrasCount(serviceItem.extras?.length || 0)}
                  </span>

                  <div className={styles.cardActions}>
                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.editBtn}`}
                      onClick={() => handleEditService(serviceItem)}
                      title={SERVICES_MANAGER_TEXTS.catalog.editTitle(serviceItem.name)}
                      aria-label={SERVICES_MANAGER_TEXTS.catalog.editTitle(serviceItem.name)}
                      disabled={!!actionLoadingText}
                    >
                      <Edit3 size={13} />
                      <span>{SERVICES_MANAGER_TEXTS.catalog.editButton}</span>
                    </button>

                    <button
                      type="button"
                      className={`${styles.actionBtn} ${styles.deleteBtn}`}
                      onClick={() => handleDeleteService(serviceItem)}
                      title={SERVICES_MANAGER_TEXTS.catalog.deleteTitle(serviceItem.name)}
                      aria-label={SERVICES_MANAGER_TEXTS.catalog.deleteTitle(serviceItem.name)}
                      disabled={!!actionLoadingText}
                    >
                      <Trash2 size={13} />
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {actionLoadingText && (
        <Loader
          fullScreen
          title={actionLoadingText}
          subtitle={SERVICES_MANAGER_TEXTS.loaders.syncSubtitle}
          icon="calendar"
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

export default ServicesManager;
