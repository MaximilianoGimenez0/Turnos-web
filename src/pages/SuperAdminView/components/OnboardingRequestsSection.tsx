import React, { useMemo, useState } from 'react';
import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  Clock,
  Copy,
  Inbox,
  Mail,
  MessageCircle,
  PhoneCall,
  RefreshCw,
  Search,
  Shield,
  X,
} from 'lucide-react';
import {
  computeOnboardingRequestMetrics,
  filterOnboardingRequests,
  updateOnboardingRequestStatus,
  type OnboardingRequestFilterStatus,
} from '../../../services/onboardingRequestService';
import { extractCallableErrorMessage } from '../../../services/superadminService';
import type { OnboardingRequestDoc, OnboardingRequestStatus } from '../../../types';
import Button from '../../../components/common/Button/Button';
import Input from '../../../components/common/Input/Input';
import { SUPERADMIN_TEXTS } from '../../../texts/pages/SuperAdmin';
import styles from '../SuperAdminView.module.css';

interface OnboardingRequestsSectionProps {
  requests: OnboardingRequestDoc[];
  loading: boolean;
  loadError: string | null;
  refreshingPermissions: boolean;
  onRetry: () => void;
  onRefreshPermissions: () => void;
  onCreateTenantFromRequest: (request: OnboardingRequestDoc) => void;
}

const STATUS_OPTIONS: readonly { value: OnboardingRequestStatus; label: string }[] = [
  { value: 'pending', label: SUPERADMIN_TEXTS.requests.statuses.pending },
  { value: 'contacted', label: SUPERADMIN_TEXTS.requests.statuses.contacted },
  { value: 'cancelled', label: SUPERADMIN_TEXTS.requests.statuses.cancelled },
  { value: 'approved', label: SUPERADMIN_TEXTS.requests.statuses.approved },
];

const formatDateTimeAr = (iso?: string): string => {
  if (!iso) return '—';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return '—';
  return new Intl.DateTimeFormat('es-AR', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(parsed);
};

const buildWaHref = (phone: string, name: string, id: string): string | null => {
  const digits = phone.replace(/\D/g, '');
  if (digits.length < 6) return null;
  const msg = `Hola ${name}! Te escribimos de Turneado por tu solicitud (${id}).`;
  return `https://wa.me/${digits}?text=${encodeURIComponent(msg)}`;
};

const getStatusBadgeClass = (status: OnboardingRequestStatus): string => {
  if (status === 'approved') return styles.badgeActive;
  if (status === 'cancelled') return styles.badgeSuspended;
  if (status === 'contacted') return styles.badgeDemo;
  return styles.badgePending;
};

const getStatusLabel = (status: OnboardingRequestStatus): string =>
  SUPERADMIN_TEXTS.requests.statuses[status];

const getEmailDeliveryMeta = (
  req: OnboardingRequestDoc
): { label: string; badgeClass: string } => {
  if (req.emailStatus === 'sent') {
    return { label: SUPERADMIN_TEXTS.requests.table.emailSent, badgeClass: styles.badgeActive };
  }
  if (req.emailStatus === 'partial') {
    return {
      label: SUPERADMIN_TEXTS.requests.table.emailPartial,
      badgeClass: styles.badgePending,
    };
  }
  return {
    label: SUPERADMIN_TEXTS.requests.table.emailSkipped,
    badgeClass: styles.badgeNeutral,
  };
};

export const OnboardingRequestsSection: React.FC<OnboardingRequestsSectionProps> = ({
  requests,
  loading,
  loadError,
  refreshingPermissions,
  onRetry,
  onRefreshPermissions,
  onCreateTenantFromRequest,
}) => {
  const [statusFilter, setStatusFilter] = useState<OnboardingRequestFilterStatus>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [savedId, setSavedId] = useState<string | null>(null);
  const [rowErrors, setRowErrors] = useState<Record<string, string>>({});
  const [copiedKey, setCopiedKey] = useState<string | null>(null);

  const metrics = useMemo(() => computeOnboardingRequestMetrics(requests), [requests]);
  const filteredRequests = useMemo(
    () => filterOnboardingRequests(requests, searchQuery, statusFilter),
    [requests, searchQuery, statusFilter]
  );

  const handleCopy = async (key: string, value: string) => {
    try {
      await navigator.clipboard.writeText(value);
      setCopiedKey(key);
      window.setTimeout(() => {
        setCopiedKey((current) => (current === key ? null : current));
      }, 2000);
    } catch {
      // Clipboard unavailable
    }
  };

  const handleStatusChange = async (
    req: OnboardingRequestDoc,
    nextStatus: OnboardingRequestStatus
  ) => {
    if (req.status === nextStatus || updatingId === req.id) return;

    setUpdatingId(req.id);
    setRowErrors((prev) => {
      const next = { ...prev };
      delete next[req.id];
      return next;
    });

    try {
      await updateOnboardingRequestStatus({ requestId: req.id, status: nextStatus });
      setSavedId(req.id);
      window.setTimeout(() => {
        setSavedId((current) => (current === req.id ? null : current));
      }, 2000);
    } catch (err: unknown) {
      setRowErrors((prev) => ({
        ...prev,
        [req.id]: extractCallableErrorMessage(err, SUPERADMIN_TEXTS.errors.genericActionError),
      }));
    } finally {
      setUpdatingId((current) => (current === req.id ? null : current));
    }
  };

  if (loading && requests.length === 0) {
    return (
      <section className={styles.panelCard}>
        <div className={styles.emptyState}>
          <h2 className={styles.emptyTitle}>{SUPERADMIN_TEXTS.requests.loadingTitle}</h2>
          <p className={styles.emptyDescription}>{SUPERADMIN_TEXTS.requests.loadingSubtitle}</p>
        </div>
      </section>
    );
  }

  const hasFatalError = Boolean(loadError && requests.length === 0);

  if (hasFatalError) {
    return (
      <section className={styles.panelCard} role="alert" aria-labelledby="requests-load-error-title">
        <div className={styles.errorState}>
          <div className={styles.errorStateIcon} aria-hidden="true">
            <AlertTriangle size={24} strokeWidth={1.75} />
          </div>
          <h2 id="requests-load-error-title" className={styles.emptyTitle}>
            {SUPERADMIN_TEXTS.requests.errorTitle}
          </h2>
          <p className={styles.errorStateDescription}>{loadError}</p>
          <div className={styles.errorStateActions}>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={onRetry}
              leftIcon={<RefreshCw size={14} strokeWidth={1.75} />}
            >
              {SUPERADMIN_TEXTS.dashboard.retryCta}
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              isLoading={refreshingPermissions}
              onClick={onRefreshPermissions}
              leftIcon={<Shield size={14} strokeWidth={1.75} />}
            >
              {SUPERADMIN_TEXTS.dashboard.refreshPermissionsCta}
            </Button>
          </div>
        </div>
      </section>
    );
  }

  return (
    <div className={styles.sectionStack}>
      {loadError && (
        <div className={styles.errorBanner} role="alert">
          <AlertTriangle size={18} strokeWidth={1.75} aria-hidden="true" />
          <div className={styles.errorBannerContent}>
            <div>
              <strong>{SUPERADMIN_TEXTS.requests.errorTitle}: </strong>
              <span>{loadError}</span>
            </div>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={onRetry}
              leftIcon={<RefreshCw size={14} strokeWidth={1.75} />}
            >
              {SUPERADMIN_TEXTS.dashboard.retryCta}
            </Button>
          </div>
        </div>
      )}

      <section className={styles.metricsGrid} aria-label="Métricas de solicitudes">
        <article className={styles.metricCard}>
          <div className={`${styles.metricIcon} ${styles.metricPrimary}`} aria-hidden="true">
            <Inbox size={18} strokeWidth={1.75} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>{SUPERADMIN_TEXTS.requests.metrics.total}</span>
            <strong className={styles.metricValue}>{metrics.total}</strong>
          </div>
        </article>

        <article className={styles.metricCard}>
          <div className={`${styles.metricIcon} ${styles.metricWarning}`} aria-hidden="true">
            <Clock size={18} strokeWidth={1.75} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>{SUPERADMIN_TEXTS.requests.metrics.pending}</span>
            <strong className={styles.metricValue}>{metrics.pending}</strong>
          </div>
        </article>

        <article className={styles.metricCard}>
          <div className={`${styles.metricIcon} ${styles.metricAccent}`} aria-hidden="true">
            <PhoneCall size={18} strokeWidth={1.75} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>{SUPERADMIN_TEXTS.requests.metrics.contacted}</span>
            <strong className={styles.metricValue}>{metrics.contacted}</strong>
          </div>
        </article>

        <article className={styles.metricCard}>
          <div className={`${styles.metricIcon} ${styles.metricSuccess}`} aria-hidden="true">
            <CheckCircle2 size={18} strokeWidth={1.75} />
          </div>
          <div className={styles.metricInfo}>
            <span className={styles.metricLabel}>{SUPERADMIN_TEXTS.requests.metrics.approved}</span>
            <strong className={styles.metricValue}>{metrics.approved}</strong>
          </div>
        </article>
      </section>

      <section className={styles.panelCard}>
        <div className={styles.toolbar}>
          <div className={styles.filterPills} role="group" aria-label="Filtrar solicitudes por estado">
            {(
              [
                { id: 'all', label: SUPERADMIN_TEXTS.requests.filters.all, count: metrics.total },
                {
                  id: 'pending',
                  label: SUPERADMIN_TEXTS.requests.filters.pending,
                  count: metrics.pending,
                },
                {
                  id: 'contacted',
                  label: SUPERADMIN_TEXTS.requests.filters.contacted,
                  count: metrics.contacted,
                },
                {
                  id: 'approved',
                  label: SUPERADMIN_TEXTS.requests.filters.approved,
                  count: metrics.approved,
                },
                {
                  id: 'cancelled',
                  label: SUPERADMIN_TEXTS.requests.filters.cancelled,
                  count: metrics.cancelled,
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
              aria-label={SUPERADMIN_TEXTS.requests.filters.searchAria}
              placeholder={SUPERADMIN_TEXTS.requests.filters.searchPlaceholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              leftIcon={<Search size={15} strokeWidth={1.75} />}
              rightIcon={
                searchQuery ? (
                  <button
                    type="button"
                    className={styles.clearSearchBtn}
                    onClick={() => setSearchQuery('')}
                    aria-label={SUPERADMIN_TEXTS.requests.filters.clearSearch}
                  >
                    <X size={14} strokeWidth={1.75} />
                  </button>
                ) : undefined
              }
            />
          </div>
        </div>

        {filteredRequests.length === 0 ? (
          <div className={styles.emptyState}>
            <div className={styles.emptyIcon} aria-hidden="true">
              <Inbox size={24} strokeWidth={1.6} />
            </div>
            <h2 className={styles.emptyTitle}>
              {requests.length === 0
                ? SUPERADMIN_TEXTS.requests.table.emptyTitle
                : SUPERADMIN_TEXTS.requests.table.emptyFilteredTitle}
            </h2>
            <p className={styles.emptyDescription}>
              {requests.length === 0
                ? SUPERADMIN_TEXTS.requests.table.emptyDescription
                : SUPERADMIN_TEXTS.requests.table.emptyFilteredDescription}
            </p>
            {requests.length > 0 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => {
                  setSearchQuery('');
                  setStatusFilter('all');
                }}
              >
                {SUPERADMIN_TEXTS.requests.table.resetFiltersCta}
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className={styles.requestsDesktopTable}>
              <div className={styles.tableWrapper}>
                <table className={styles.table}>
                  <thead>
                    <tr>
                      <th>{SUPERADMIN_TEXTS.requests.table.applicantCol}</th>
                      <th>{SUPERADMIN_TEXTS.requests.table.contactCol}</th>
                      <th>{SUPERADMIN_TEXTS.requests.table.notesCol}</th>
                      <th>{SUPERADMIN_TEXTS.requests.table.statusCol}</th>
                      <th className={styles.actionsHeader}>
                        {SUPERADMIN_TEXTS.requests.table.actionsCol}
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredRequests.map((req) => {
                      const waHref = buildWaHref(req.phone, req.name, req.id);
                      const emailMeta = getEmailDeliveryMeta(req);
                      const isUpdating = updatingId === req.id;
                      const isSaved = savedId === req.id;
                      const rowError = rowErrors[req.id];

                      return (
                        <tr key={req.id}>
                          <td>
                            <div className={styles.tenantNameCell}>
                              <span className={styles.tenantName}>{req.name}</span>
                              <code className={styles.tenantIdCode}>{req.id}</code>
                              <span className={styles.dateText}>
                                {formatDateTimeAr(req.createdAt)}
                              </span>
                              <span
                                className={`${styles.statusBadge} ${emailMeta.badgeClass} ${styles.compactBadge}`}
                              >
                                <Mail size={11} strokeWidth={1.8} aria-hidden="true" />
                                <span>{emailMeta.label}</span>
                              </span>
                            </div>
                          </td>

                          <td>
                            <div className={styles.contactStack}>
                              <div className={styles.contactRow}>
                                <a href={`mailto:${req.email}`} className={styles.contactLink}>
                                  {req.email}
                                </a>
                                <button
                                  type="button"
                                  className={styles.iconActionBtn}
                                  onClick={() => handleCopy(`email:${req.id}`, req.email)}
                                  title={SUPERADMIN_TEXTS.requests.table.copyEmail}
                                  aria-label={`${SUPERADMIN_TEXTS.requests.table.copyEmail} (${req.email})`}
                                >
                                  {copiedKey === `email:${req.id}` ? (
                                    <Check size={13} strokeWidth={2} />
                                  ) : (
                                    <Copy size={13} strokeWidth={1.75} />
                                  )}
                                </button>
                              </div>

                              <div className={styles.contactRow}>
                                {waHref ? (
                                  <a
                                    href={waHref}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className={styles.waContactLink}
                                    title={SUPERADMIN_TEXTS.requests.table.openWhatsApp}
                                  >
                                    <MessageCircle size={12} strokeWidth={1.85} aria-hidden="true" />
                                    <span>{req.phone}</span>
                                  </a>
                                ) : (
                                  <span className={styles.contactPhoneText}>{req.phone}</span>
                                )}
                                <button
                                  type="button"
                                  className={styles.iconActionBtn}
                                  onClick={() => handleCopy(`phone:${req.id}`, req.phone)}
                                  title={SUPERADMIN_TEXTS.requests.table.copyPhone}
                                  aria-label={`${SUPERADMIN_TEXTS.requests.table.copyPhone} (${req.phone})`}
                                >
                                  {copiedKey === `phone:${req.id}` ? (
                                    <Check size={13} strokeWidth={2} />
                                  ) : (
                                    <Copy size={13} strokeWidth={1.75} />
                                  )}
                                </button>
                              </div>
                            </div>
                          </td>

                          <td className={styles.notesCell}>
                            {req.notes ? (
                              <p className={styles.requestNotesText}>{req.notes}</p>
                            ) : (
                              <span className={styles.mutedText}>
                                {SUPERADMIN_TEXTS.requests.table.noNotes}
                              </span>
                            )}
                          </td>

                          <td>
                            <div className={styles.requestStatusCell}>
                              <span
                                className={`${styles.statusBadge} ${getStatusBadgeClass(req.status)}`}
                              >
                                {getStatusLabel(req.status)}
                              </span>
                              <select
                                aria-label={`Cambiar estado de solicitud de ${req.name}`}
                                className={styles.requestStatusSelect}
                                value={req.status}
                                disabled={isUpdating}
                                onChange={(e) =>
                                  void handleStatusChange(
                                    req,
                                    e.target.value as OnboardingRequestStatus
                                  )
                                }
                              >
                                {STATUS_OPTIONS.map((opt) => (
                                  <option key={opt.value} value={opt.value}>
                                    {opt.label}
                                  </option>
                                ))}
                              </select>
                              {isUpdating && (
                                <span className={styles.statusFeedbackMuted}>
                                  {SUPERADMIN_TEXTS.requests.table.savingStatus}
                                </span>
                              )}
                              {!isUpdating && isSaved && (
                                <span className={styles.statusFeedbackSaved}>
                                  {SUPERADMIN_TEXTS.requests.table.savedStatus}
                                </span>
                              )}
                              {rowError && (
                                <span className={styles.fieldError} role="alert">
                                  {rowError}
                                </span>
                              )}
                            </div>
                          </td>

                          <td>
                            <div className={styles.rowActions}>
                              <Button
                                type="button"
                                variant="secondary"
                                size="sm"
                                onClick={() => onCreateTenantFromRequest(req)}
                                leftIcon={<Building2 size={14} strokeWidth={1.75} />}
                              >
                                {SUPERADMIN_TEXTS.requests.table.createTenantCta}
                              </Button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            <div className={styles.requestsMobileList}>
              {filteredRequests.map((req) => {
                const waHref = buildWaHref(req.phone, req.name, req.id);
                const emailMeta = getEmailDeliveryMeta(req);
                const isUpdating = updatingId === req.id;
                const isSaved = savedId === req.id;
                const rowError = rowErrors[req.id];

                return (
                  <article key={req.id} className={styles.requestMobileCard}>
                    <div className={styles.requestMobileTop}>
                      <div className={styles.tenantNameCell}>
                        <span className={styles.tenantName}>{req.name}</span>
                        <code className={styles.tenantIdCode}>{req.id}</code>
                        <span className={styles.dateText}>{formatDateTimeAr(req.createdAt)}</span>
                      </div>
                      <span className={`${styles.statusBadge} ${getStatusBadgeClass(req.status)}`}>
                        {getStatusLabel(req.status)}
                      </span>
                    </div>

                    <div className={styles.contactStack}>
                      <div className={styles.contactRow}>
                        <a href={`mailto:${req.email}`} className={styles.contactLink}>
                          {req.email}
                        </a>
                        <button
                          type="button"
                          className={styles.iconActionBtn}
                          onClick={() => handleCopy(`m-email:${req.id}`, req.email)}
                          aria-label={`${SUPERADMIN_TEXTS.requests.table.copyEmail} (${req.email})`}
                        >
                          {copiedKey === `m-email:${req.id}` ? (
                            <Check size={13} strokeWidth={2} />
                          ) : (
                            <Copy size={13} strokeWidth={1.75} />
                          )}
                        </button>
                      </div>
                      <div className={styles.contactRow}>
                        {waHref ? (
                          <a
                            href={waHref}
                            target="_blank"
                            rel="noopener noreferrer"
                            className={styles.waContactLink}
                          >
                            <MessageCircle size={12} strokeWidth={1.85} aria-hidden="true" />
                            <span>{req.phone}</span>
                          </a>
                        ) : (
                          <span className={styles.contactPhoneText}>{req.phone}</span>
                        )}
                        <button
                          type="button"
                          className={styles.iconActionBtn}
                          onClick={() => handleCopy(`m-phone:${req.id}`, req.phone)}
                          aria-label={`${SUPERADMIN_TEXTS.requests.table.copyPhone} (${req.phone})`}
                        >
                          {copiedKey === `m-phone:${req.id}` ? (
                            <Check size={13} strokeWidth={2} />
                          ) : (
                            <Copy size={13} strokeWidth={1.75} />
                          )}
                        </button>
                      </div>
                    </div>

                    <div className={styles.requestMobileNotes}>
                      {req.notes ? (
                        <p className={styles.requestNotesText}>{req.notes}</p>
                      ) : (
                        <span className={styles.mutedText}>
                          {SUPERADMIN_TEXTS.requests.table.noNotes}
                        </span>
                      )}
                    </div>

                    <div className={styles.requestMobileFooter}>
                      <div className={styles.requestStatusCell}>
                        <select
                          aria-label={`Cambiar estado de solicitud de ${req.name}`}
                          className={styles.requestStatusSelect}
                          value={req.status}
                          disabled={isUpdating}
                          onChange={(e) =>
                            void handleStatusChange(req, e.target.value as OnboardingRequestStatus)
                          }
                        >
                          {STATUS_OPTIONS.map((opt) => (
                            <option key={opt.value} value={opt.value}>
                              {opt.label}
                            </option>
                          ))}
                        </select>
                        <span
                          className={`${styles.statusBadge} ${emailMeta.badgeClass} ${styles.compactBadge}`}
                        >
                          <Mail size={11} strokeWidth={1.8} aria-hidden="true" />
                          <span>{emailMeta.label}</span>
                        </span>
                        {isUpdating && (
                          <span className={styles.statusFeedbackMuted}>
                            {SUPERADMIN_TEXTS.requests.table.savingStatus}
                          </span>
                        )}
                        {!isUpdating && isSaved && (
                          <span className={styles.statusFeedbackSaved}>
                            {SUPERADMIN_TEXTS.requests.table.savedStatus}
                          </span>
                        )}
                        {rowError && (
                          <span className={styles.fieldError} role="alert">
                            {rowError}
                          </span>
                        )}
                      </div>

                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => onCreateTenantFromRequest(req)}
                        leftIcon={<Building2 size={14} strokeWidth={1.75} />}
                      >
                        {SUPERADMIN_TEXTS.requests.table.createTenantCta}
                      </Button>
                    </div>
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default OnboardingRequestsSection;
