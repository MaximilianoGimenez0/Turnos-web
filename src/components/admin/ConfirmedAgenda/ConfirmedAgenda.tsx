import React, { useMemo } from 'react';
import {
  CalendarCheck2,
  Mail,
  Phone,
  MessageCircle,
  FileText,
  Calendar,
  Ban,
} from 'lucide-react';
import type { Slot } from '../../../types';
import { formatLocalDate, getTodayLocalDateString } from '../../../utils/dateUtils';
import Button from '../../common/Button/Button';
import { CONFIRMED_AGENDA_TEXTS } from '../../../texts';
import styles from './ConfirmedAgenda.module.css';

export interface ConfirmedAgendaProps {
  slots: Slot[];
  searchQuery?: string;
  onCancel?: (slotId: string) => void;
}

export const ConfirmedAgenda: React.FC<ConfirmedAgendaProps> = ({
  slots,
  searchQuery = '',
  onCancel,
}) => {
  // Filtrar solo confirmados y aplicar búsqueda
  const confirmedSlots = useMemo(() => {
    const list = slots.filter((s) => s.status === 'confirmed');

    if (!searchQuery.trim()) {
      return list.sort((a, b) => (a.datetime > b.datetime ? 1 : -1));
    }

    const query = searchQuery.toLowerCase().trim();
    return list
      .filter((s) => {
        return (
          (s.clientData?.name && s.clientData.name.toLowerCase().includes(query)) ||
          (s.clientData?.email && s.clientData.email.toLowerCase().includes(query)) ||
          (s.serviceName && s.serviceName.toLowerCase().includes(query)) ||
          (s.clientData?.phone && s.clientData.phone.includes(query))
        );
      })
      .sort((a, b) => (a.datetime > b.datetime ? 1 : -1));
  }, [slots, searchQuery]);

  // Agrupar por Fecha
  const groupedByDate = useMemo(() => {
    const map = new Map<string, Slot[]>();

    confirmedSlots.forEach((slot) => {
      if (!slot.datetime) return;
      const dateKey = formatLocalDate(new Date(slot.datetime));
      if (!dateKey) return;
      if (!map.has(dateKey)) {
        map.set(dateKey, []);
      }
      map.get(dateKey)!.push(slot);
    });

    return Array.from(map.entries());
  }, [confirmedSlots]);

  const formatHeaderDate = (dateIsoStr: string) => {
    const [year, month, day] = dateIsoStr.split('-').map(Number);
    const date = new Date(year, month - 1, day, 12, 0, 0);
    const todayStr = getTodayLocalDateString();

    const isToday = dateIsoStr === todayStr;
    const formatted = date.toLocaleDateString('es-AR', {
      weekday: 'long',
      day: 'numeric',
      month: 'long',
      year: 'numeric',
    });

    return isToday ? `${CONFIRMED_AGENDA_TEXTS.dateHeader.todayPrefix}${formatted}` : formatted;
  };

  const getCleanPhoneForWhatsApp = (phone?: string) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 8 ? digits : null;
  };

  if (confirmedSlots.length === 0) {
    return (
      <div className={styles.emptyState}>
        <CalendarCheck2 size={36} color="var(--text-muted)" style={{ margin: '0 auto 12px' }} />
        <h3>
          {searchQuery
            ? CONFIRMED_AGENDA_TEXTS.emptyState.titleWithSearch
            : CONFIRMED_AGENDA_TEXTS.emptyState.titleDefault}
        </h3>
        <p>{CONFIRMED_AGENDA_TEXTS.emptyState.description}</p>
      </div>
    );
  }

  return (
    <div className={styles.agendaContainer}>
      <div className={styles.agendaHeader}>
        <div className={styles.agendaTitleGroup}>
          <h2 className={styles.agendaMainTitle}>
            <CalendarCheck2 size={24} color="var(--color-success)" />
            {CONFIRMED_AGENDA_TEXTS.header.mainTitle(confirmedSlots.length)}
          </h2>
          <span className={styles.agendaSubtitle}>
            {CONFIRMED_AGENDA_TEXTS.header.subtitle}
          </span>
        </div>
      </div>

      <div className={styles.agendaGrid}>
        {groupedByDate.map(([dateKey, daySlots]) => (
          <div key={dateKey} className={styles.dateGroup}>
            <div className={styles.dateHeader}>
              <Calendar size={16} />
              {formatHeaderDate(dateKey)} {CONFIRMED_AGENDA_TEXTS.dateHeader.slotCount(daySlots.length)}
            </div>

            {daySlots.map((slot) => {
              const slotDate = new Date(slot.datetime);
              const timeStr = !isNaN(slotDate.getTime())
                ? slotDate.toLocaleTimeString('es-AR', { hour: '2-digit', minute: '2-digit', hour12: false })
                : '';
              const waNumber = getCleanPhoneForWhatsApp(slot.clientData?.phone);

              return (
                <div key={slot.id} className={styles.compactCard}>
                  {/* Columna Horario */}
                  <div className={styles.timeCol}>
                    <span className={styles.timeHour}>{timeStr}</span>
                    <span className={styles.timeLabel}>{CONFIRMED_AGENDA_TEXTS.card.timeSuffix}</span>
                  </div>

                  {/* Columna Cliente y Servicio */}
                  <div className={styles.clientCol}>
                    <div className={styles.clientNameRow}>
                      <span className={styles.clientName}>
                        {slot.clientData?.name || CONFIRMED_AGENDA_TEXTS.card.defaultClientName}
                      </span>
                      <span className={styles.confirmedBadge}>{CONFIRMED_AGENDA_TEXTS.card.confirmedBadge}</span>
                    </div>

                    <span className={styles.serviceText}>
                      {slot.serviceName || CONFIRMED_AGENDA_TEXTS.card.defaultServiceName}
                    </span>

                    {((slot.clientData?.selectedServices && slot.clientData.selectedServices.length > 0) ||
                      (slot.clientData?.selectedRules && slot.clientData.selectedRules.length > 0) ||
                      (slot.services && slot.services.length > 0) ||
                      (slot.rules && slot.rules.length > 0)) && (
                      <div className={styles.rulesRow}>
                        {(
                          slot.clientData?.selectedServices ||
                          slot.clientData?.selectedRules ||
                          slot.services ||
                          slot.rules ||
                          []
                        ).map((r, idx) => (
                          <span key={idx} className={styles.ruleBadge}>
                            {typeof r === 'string' ? r : r.name}
                          </span>
                        ))}
                        {(slot.clientData?.estimatedDuration ||
                          slot.estimatedDuration ||
                          slot.clientData?.estimatedDurationMinutes ||
                          slot.estimatedDurationMinutes) && (
                          <span className={styles.durationBadge}>
                            ⏱️{' '}
                            {slot.clientData?.estimatedDuration ||
                              slot.estimatedDuration ||
                              `${slot.clientData?.estimatedDurationMinutes || slot.estimatedDurationMinutes}m`}
                          </span>
                        )}
                        {slot.clientData?.bookedServices && slot.clientData.bookedServices.length > 0 ? (
                          slot.clientData.bookedServices.map((bs) => {
                            const checkedExtras = (bs.extras || []).filter((e) => e.selected);
                            if (checkedExtras.length === 0) return null;
                            return (
                              <span
                                key={bs.serviceId}
                                className={styles.durationBadge}
                                style={{
                                  background: 'var(--color-primary-light, rgba(236, 72, 153, 0.08))',
                                  borderColor: 'var(--color-primary-border, rgba(236, 72, 153, 0.25))',
                                  color: 'var(--color-primary)',
                                  fontWeight: 600,
                                }}
                              >
                                ✨ {bs.name}: {checkedExtras.map((e) => `${e.name} (+$${(e.price || 0).toLocaleString('es-AR')})`).join(', ')}
                              </span>
                            );
                          })
                        ) : slot.clientData?.selectedExtras && slot.clientData.selectedExtras.length > 0 ? (
                          <span
                            className={styles.durationBadge}
                            style={{
                              background: 'var(--color-primary-light, rgba(236, 72, 153, 0.08))',
                              borderColor: 'var(--color-primary-border, rgba(236, 72, 153, 0.25))',
                              color: 'var(--color-primary)',
                              fontWeight: 600,
                            }}
                          >
                            {CONFIRMED_AGENDA_TEXTS.card.extrasPrefix} {slot.clientData.selectedExtras.map((e) => `${e.name} (+$${(e.price || 0).toLocaleString('es-AR')})`).join(', ')}
                          </span>
                        ) : null}
                        {Boolean(slot.clientData?.estimatedPrice && slot.clientData.estimatedPrice > 0) && (
                          <span
                            className={styles.durationBadge}
                            style={{
                              background: 'var(--color-success-bg, rgba(34, 197, 94, 0.08))',
                              borderColor: 'var(--color-success-border, rgba(34, 197, 94, 0.25))',
                              color: 'var(--color-success-text, #16a34a)',
                            }}
                          >
                            {CONFIRMED_AGENDA_TEXTS.card.estPrefix}{slot.clientData!.estimatedPrice!.toLocaleString('es-AR')}
                          </span>
                        )}
                      </div>
                    )}

                    <div className={styles.contactRow}>
                      {slot.clientData?.email && (
                        <a
                          href={`mailto:${slot.clientData.email}`}
                          className={styles.contactLink}
                          title={CONFIRMED_AGENDA_TEXTS.card.sendEmailTitle}
                        >
                          <Mail size={13} />
                          {slot.clientData.email}
                        </a>
                      )}

                      {slot.clientData?.phone && (
                        <span className={styles.contactLink}>
                          <Phone size={13} />
                          {slot.clientData.phone}
                        </span>
                      )}

                      {waNumber && (
                        <a
                          href={`https://wa.me/${waNumber}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.contactLink}
                          style={{ color: '#16a34a', fontWeight: 'bold' }}
                          title={CONFIRMED_AGENDA_TEXTS.card.openWhatsAppTitle}
                        >
                          <MessageCircle size={13} />
                          {CONFIRMED_AGENDA_TEXTS.card.whatsAppLabel}
                        </a>
                      )}
                    </div>

                    {slot.clientData?.notes && (
                      <div className={styles.notesTag}>
                        <FileText size={11} style={{ display: 'inline', marginRight: 4 }} />
                        "{slot.clientData.notes}"
                      </div>
                    )}
                  </div>

                  {/* Columna Seña y Comprobante */}
                  <div className={styles.paymentCol}>
                    <span className={styles.depositAmount}>
                      +${(slot.paidAmount || slot.depositAmount || 0).toLocaleString('es-AR')}
                    </span>
                    {Boolean(
                      slot.clientData?.estimatedPrice &&
                        slot.clientData.estimatedPrice > (slot.paidAmount || slot.depositAmount || 0)
                    ) && (
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color: 'var(--color-success-text, #16a34a)',
                          textAlign: 'right',
                        }}
                      >
                        {CONFIRMED_AGENDA_TEXTS.card.balancePrefix} ${(slot.clientData!.estimatedPrice! - (slot.paidAmount || slot.depositAmount || 0)).toLocaleString('es-AR')}
                      </span>
                    )}
                    {slot.paymentId && (
                      <span className={styles.mpReceipt}>{CONFIRMED_AGENDA_TEXTS.card.mpReceiptPrefix}{slot.paymentId}</span>
                    )}

                    {onCancel && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => onCancel(slot.id)}
                        leftIcon={<Ban size={12} />}
                        title={CONFIRMED_AGENDA_TEXTS.card.cancelTitle}
                        style={{ marginTop: 'var(--space-1)', color: 'var(--color-danger-text)' }}
                      >
                        {CONFIRMED_AGENDA_TEXTS.card.cancelButton}
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
};

export default ConfirmedAgenda;
