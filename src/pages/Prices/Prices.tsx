import React, { useState, useMemo, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Tag,
  CalendarCheck,
  Check,
  Plus,
  Trash2,
  Clock,
  Search,
  X,
  ArrowRight,
  Receipt,
  Info,
  ChevronUp,
} from 'lucide-react';
import type { ServiceItem, PriceExtra } from '../../types';
import { useServices } from '../../context/ServicesContext';
import { useTenant } from '../../context/TenantContext';
import { buildTenantPath } from '../../services/tenantService';
import { FIELD_LIMITS } from '../../config/fieldLimits';
import Button from '../../components/common/Button/Button';
import Loader from '../../components/common/Loader/Loader';
import { PRICES_TEXTS } from '../../texts';
import styles from './Prices.module.css';

interface CalculatorItem {
  serviceId: string;
  name: string;
  basePrice: number;
  durationMinutes: number;
  availableExtras: PriceExtra[];
  selectedExtraIds: string[];
}

export const Prices: React.FC = () => {
  const { slug } = useTenant();
  const { services: prices, loading } = useServices();
  const homePath = buildTenantPath(slug);
  const [searchQuery, setSearchQuery] = useState('');

  const [calculatorItems, setCalculatorItems] = useState<CalculatorItem[]>([]);
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!drawerOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDrawerOpen(false);
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [drawerOpen]);

  const filteredServices = useMemo(() => {
    if (!searchQuery.trim()) return prices;
    const query = searchQuery.toLowerCase().trim();
    return prices.filter((service) => {
      const matchName = service.name.toLowerCase().includes(query);
      const matchDesc = service.description?.toLowerCase().includes(query) ?? false;
      const matchExtra =
        service.extras?.some((ex) => ex.name.toLowerCase().includes(query)) ?? false;
      return matchName || matchDesc || matchExtra;
    });
  }, [prices, searchQuery]);

  const handleToggleService = (service: ServiceItem) => {
    setCalculatorItems((prev) => {
      const exists = prev.some((item) => item.serviceId === service.id);
      if (exists) {
        const next = prev.filter((item) => item.serviceId !== service.id);
        if (next.length === 0) setDrawerOpen(false);
        return next;
      }
      return [
        ...prev,
        {
          serviceId: service.id,
          name: service.name,
          basePrice: service.basePrice || 0,
          durationMinutes: service.durationMinutes || 30,
          availableExtras: service.extras || [],
          selectedExtraIds: [],
        },
      ];
    });
  };

  const handleToggleCardExtra = (service: ServiceItem, extraId: string) => {
    setCalculatorItems((prev) => {
      const itemIndex = prev.findIndex((item) => item.serviceId === service.id);

      if (itemIndex === -1) {
        return [
          ...prev,
          {
            serviceId: service.id,
            name: service.name,
            basePrice: service.basePrice || 0,
            durationMinutes: service.durationMinutes || 30,
            availableExtras: service.extras || [],
            selectedExtraIds: [extraId],
          },
        ];
      }

      return prev.map((item) => {
        if (item.serviceId !== service.id) return item;
        const exists = item.selectedExtraIds.includes(extraId);
        return {
          ...item,
          selectedExtraIds: exists
            ? item.selectedExtraIds.filter((id) => id !== extraId)
            : [...item.selectedExtraIds, extraId],
        };
      });
    });
  };

  const handleToggleExtra = (serviceId: string, extraId: string) => {
    setCalculatorItems((prev) =>
      prev.map((item) => {
        if (item.serviceId !== serviceId) return item;
        const exists = item.selectedExtraIds.includes(extraId);
        return {
          ...item,
          selectedExtraIds: exists
            ? item.selectedExtraIds.filter((id) => id !== extraId)
            : [...item.selectedExtraIds, extraId],
        };
      })
    );
  };

  const handleRemoveFromCalculator = (serviceId: string) => {
    setCalculatorItems((prev) => {
      const next = prev.filter((item) => item.serviceId !== serviceId);
      if (next.length === 0) {
        setDrawerOpen(false);
      }
      return next;
    });
  };

  const handleClearCalculator = () => {
    setCalculatorItems([]);
    setDrawerOpen(false);
  };

  const totals = useMemo(() => {
    let subtotalServices = 0;
    let subtotalExtras = 0;
    let totalDuration = 0;
    let totalExtrasCount = 0;

    calculatorItems.forEach((item) => {
      subtotalServices += item.basePrice || 0;
      totalDuration += item.durationMinutes || 0;
      item.availableExtras.forEach((ex) => {
        if (item.selectedExtraIds.includes(ex.id)) {
          subtotalExtras += ex.price || 0;
          totalExtrasCount += 1;
        }
      });
    });

    return {
      subtotalServices,
      subtotalExtras,
      totalDuration,
      totalExtrasCount,
      totalFinal: subtotalServices + subtotalExtras,
      itemsCount: calculatorItems.length,
    };
  }, [calculatorItems]);

  const formatDuration = (min: number) => {
    if (min <= 0) return PRICES_TEXTS.duration.zeroMin;
    const hours = Math.floor(min / 60);
    const remainingMin = min % 60;
    if (hours > 0 && remainingMin > 0) return PRICES_TEXTS.duration.hoursAndMin(hours, remainingMin);
    if (hours > 0) return PRICES_TEXTS.duration.hoursOnly(hours);
    return PRICES_TEXTS.duration.minOnly(remainingMin);
  };

  return (
    <div className={`${styles.pageWrapper} ${totals.itemsCount > 0 ? styles.pageWrapperWithDock : ''}`}>
      <header className={styles.heroBar}>
        <div className={styles.heroText}>
          <h1 className={styles.heroTitle}>{PRICES_TEXTS.hero.title}</h1>
          <p className={styles.heroSubtitle}>{PRICES_TEXTS.hero.subtitle}</p>
        </div>

        <div className={styles.searchContainer}>
          <div className={styles.searchWrapper}>
            <Search size={16} strokeWidth={1.5} className={styles.searchIcon} aria-hidden="true" />
            <input
              type="text"
              className={styles.searchInput}
              placeholder={PRICES_TEXTS.search.placeholder}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              maxLength={FIELD_LIMITS.search.query.max}
              aria-label={PRICES_TEXTS.search.ariaLabel}
            />
            {searchQuery && (
              <button
                type="button"
                className={styles.clearSearchBtn}
                onClick={() => setSearchQuery('')}
                aria-label={PRICES_TEXTS.search.clearAriaLabel}
              >
                <X size={16} strokeWidth={1.5} aria-hidden="true" />
              </button>
            )}
          </div>
          {searchQuery && (
            <span className={styles.searchResultCount}>
              {filteredServices.length === 1
                ? PRICES_TEXTS.search.foundSingular
                : PRICES_TEXTS.search.foundPlural(filteredServices.length)}
            </span>
          )}
        </div>
      </header>

      <main className={styles.catalogSection}>
        {loading ? (
          <Loader
            size="lg"
            title={PRICES_TEXTS.loader.title}
            subtitle={PRICES_TEXTS.loader.subtitle}
            icon="calendar"
          />
        ) : prices.length === 0 ? (
          <div className={styles.emptyState}>
            <Tag size={24} strokeWidth={1.5} className={styles.emptyIcon} aria-hidden="true" />
            <h3 className={styles.emptyTitle}>{PRICES_TEXTS.emptyState.upcomingTitle}</h3>
            <p className={styles.emptyText}>{PRICES_TEXTS.emptyState.upcomingText}</p>
          </div>
        ) : filteredServices.length === 0 ? (
          <div className={styles.searchEmptyState}>
            <Search size={24} strokeWidth={1.5} className={styles.searchEmptyIcon} aria-hidden="true" />
            <h3 className={styles.searchEmptyTitle}>{PRICES_TEXTS.emptyState.noResultsTitle}</h3>
            <p className={styles.searchEmptyText}>
              {PRICES_TEXTS.emptyState.noResultsText(searchQuery)}
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setSearchQuery('')}
              leftIcon={<X size={16} strokeWidth={1.5} />}
            >
              {PRICES_TEXTS.search.clearSearch}
            </Button>
          </div>
        ) : (
          <div className={styles.servicesGrid}>
            {filteredServices.map((service) => {
              const calcItem = calculatorItems.find((i) => i.serviceId === service.id);
              const isSelectedInCalc = !!calcItem;
              const hasExtras = Boolean(service.extras && service.extras.length > 0);
              const selectedExtrasTotal =
                calcItem?.availableExtras.reduce(
                  (acc, ex) => (calcItem.selectedExtraIds.includes(ex.id) ? acc + (ex.price || 0) : acc),
                  0
                ) ?? 0;

              return (
                <article
                  key={service.id}
                  className={`${styles.serviceCard} ${isSelectedInCalc ? styles.serviceCardSelected : ''}`}
                >
                  <div className={styles.cardMain}>
                    <div className={styles.cardHeader}>
                      <div className={styles.titleArea}>
                        <h2 className={styles.serviceTitle}>{service.name}</h2>
                        {service.durationMinutes > 0 && (
                          <span className={styles.durationBadge}>
                            <Clock size={13} strokeWidth={1.6} aria-hidden="true" />
                            <span>
                              {service.durationMinutes} {PRICES_TEXTS.card.durationUnit}
                            </span>
                          </span>
                        )}
                      </div>

                      <div className={styles.priceContainer}>
                        <span className={styles.priceValue}>
                          ${(service.basePrice || 0).toLocaleString('es-AR')}
                        </span>
                        {selectedExtrasTotal > 0 && (
                          <span className={styles.priceExtrasDelta}>
                            +${selectedExtrasTotal.toLocaleString('es-AR')}
                          </span>
                        )}
                      </div>
                    </div>

                    {service.description && (
                      <p className={styles.serviceDescription}>{service.description}</p>
                    )}

                    {hasExtras && (
                      <div className={styles.cardExtrasSection}>
                        <div className={styles.extrasSectionHeader}>
                          <span className={styles.extrasSectionTitle}>
                            {PRICES_TEXTS.card.optionalExtras}
                          </span>
                          <span className={styles.extrasSectionHint}>
                            {PRICES_TEXTS.card.tapToAddHint}
                          </span>
                        </div>

                        <div className={styles.extrasMenuList}>
                          {service.extras?.map((extra) => {
                            const isExtraChecked =
                              calcItem?.selectedExtraIds.includes(extra.id) ?? false;
                            return (
                              <button
                                key={extra.id}
                                type="button"
                                className={`${styles.extraRow} ${isExtraChecked ? styles.extraRowActive : ''}`}
                                onClick={() => handleToggleCardExtra(service, extra.id)}
                                title={
                                  isExtraChecked
                                    ? PRICES_TEXTS.card.removeExtraTitle(extra.name)
                                    : PRICES_TEXTS.card.addExtraTitle(
                                      extra.name,
                                      `$${(extra.price || 0).toLocaleString('es-AR')}`
                                    )
                                }
                                aria-pressed={isExtraChecked}
                              >
                                <span className={styles.extraRowLeft}>
                                  <span
                                    className={`${styles.extraCheckBox} ${isExtraChecked ? styles.extraCheckBoxActive : ''
                                      }`}
                                    aria-hidden="true"
                                  >
                                    {isExtraChecked ? (
                                      <Check size={12} strokeWidth={2.2} />
                                    ) : (
                                      <Plus size={12} strokeWidth={2} />
                                    )}
                                  </span>
                                  <span className={styles.extraRowName}>{extra.name}</span>
                                </span>
                                <span className={styles.extraRowPrice}>
                                  +${(extra.price || 0).toLocaleString('es-AR')}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>

                  <div className={styles.cardFooter}>
                    <button
                      type="button"
                      className={`${styles.cardActionBtn} ${isSelectedInCalc ? styles.cardActionBtnSelected : ''
                        }`}
                      onClick={() => handleToggleService(service)}
                      aria-label={
                        isSelectedInCalc
                          ? PRICES_TEXTS.card.removeFromCalcLabel(service.name)
                          : PRICES_TEXTS.card.addToCalcLabel(service.name)
                      }
                    >
                      {isSelectedInCalc ? (
                        <>
                          <Check size={15} strokeWidth={2} className={styles.btnIcon} aria-hidden="true" />
                          <span>{PRICES_TEXTS.card.inYourEstimate}</span>
                        </>
                      ) : (
                        <>
                          <Plus size={15} strokeWidth={1.8} className={styles.btnIcon} aria-hidden="true" />
                          <span>{PRICES_TEXTS.card.addToEstimate}</span>
                        </>
                      )}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {totals.itemsCount > 0 && (
        <aside className={styles.floatingDock} aria-label={PRICES_TEXTS.floatingDock.ariaLabel}>
          <div className={styles.floatingDockContent}>
            <div className={styles.dockMetaGroup}>
              <button
                type="button"
                className={styles.dockCountBtn}
                onClick={() => setDrawerOpen(true)}
                aria-label={PRICES_TEXTS.floatingDock.viewDetailAriaLabel}
              >
                <span className={styles.dockBadge}>{totals.itemsCount}</span>
                <span className={styles.dockCountText}>
                  <span className={styles.dockServiceLabel}>
                    {totals.itemsCount === 1
                      ? PRICES_TEXTS.floatingDock.serviceSingular
                      : PRICES_TEXTS.floatingDock.servicePlural}
                  </span>
                  {totals.totalDuration > 0 && (
                    <span className={styles.dockDuration}>
                      <span className={styles.dockSep} aria-hidden="true">·</span>
                      <Clock size={13} strokeWidth={1.7} className={styles.dockClockIcon} aria-hidden="true" />
                      <span>{formatDuration(totals.totalDuration)}</span>
                    </span>
                  )}
                </span>
              </button>

              <div className={styles.dockMobileControls}>
                <button
                  type="button"
                  className={styles.dockClearMobileBtn}
                  onClick={handleClearCalculator}
                  title={PRICES_TEXTS.receipt.clearButton}
                  aria-label={PRICES_TEXTS.receipt.clearButtonAriaLabel}
                >
                  <Trash2 size={15} strokeWidth={1.7} aria-hidden="true" />
                </button>

                <button
                  type="button"
                  className={styles.dockDetailMobileBtn}
                  onClick={() => setDrawerOpen(true)}
                  aria-label={PRICES_TEXTS.floatingDock.viewDetailAriaLabel}
                >
                  <span>{PRICES_TEXTS.floatingDock.viewDetail}</span>
                  <ChevronUp size={15} strokeWidth={1.75} aria-hidden="true" />
                </button>
              </div>
            </div>

            <div className={styles.dockActionsGroup}>
              <button
                type="button"
                className={styles.dockPriceTrigger}
                onClick={() => setDrawerOpen(true)}
                aria-label={PRICES_TEXTS.floatingDock.viewDetailAriaLabel}
              >
                <span className={styles.dockTotalLabel}>
                  {PRICES_TEXTS.receipt.totalEstimatedLabel}
                </span>
                <span className={styles.dockTotalValue}>
                  ${totals.totalFinal.toLocaleString('es-AR')}
                </span>
              </button>

              <div className={styles.dockButtons}>
                <button
                  type="button"
                  className={styles.dockClearDesktopBtn}
                  onClick={handleClearCalculator}
                  title={PRICES_TEXTS.receipt.clearButton}
                  aria-label={PRICES_TEXTS.receipt.clearButtonAriaLabel}
                >
                  <Trash2 size={15} strokeWidth={1.6} aria-hidden="true" />
                  <span>{PRICES_TEXTS.receipt.clearButton}</span>
                </button>

                <button
                  type="button"
                  className={styles.dockDetailDesktopBtn}
                  onClick={() => setDrawerOpen(true)}
                  aria-label={PRICES_TEXTS.floatingDock.viewDetailAriaLabel}
                >
                  <Receipt size={15} strokeWidth={1.6} aria-hidden="true" />
                  <span>{PRICES_TEXTS.floatingDock.viewDetail}</span>
                </button>

                <Link to={homePath} className={styles.dockCtaLink}>
                  <Button
                    variant="primary"
                    size="md"
                    leftIcon={<CalendarCheck size={16} strokeWidth={1.6} />}
                    rightIcon={<ArrowRight size={15} strokeWidth={1.75} />}
                  >
                    {PRICES_TEXTS.receipt.bookButton}
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </aside>
      )}

      {drawerOpen && (
        <div
          className={styles.drawerBackdrop}
          onClick={() => setDrawerOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={PRICES_TEXTS.drawer.ariaLabel}
        >
          <div className={styles.drawerContainer} onClick={(e) => e.stopPropagation()}>
            <div className={styles.drawerHandleBar} />

            <div className={styles.drawerHeader}>
              <div className={styles.drawerHeaderTitle}>
                <span className={styles.drawerIconBox} aria-hidden="true">
                  <Receipt size={16} strokeWidth={1.6} />
                </span>
                <div>
                  <h2 className={styles.drawerTitle}>{PRICES_TEXTS.receipt.title}</h2>
                  <p className={styles.drawerSubtitle}>{PRICES_TEXTS.receipt.subtitle}</p>
                </div>
              </div>
              <button
                type="button"
                className={styles.drawerCloseBtn}
                onClick={() => setDrawerOpen(false)}
                aria-label={PRICES_TEXTS.drawer.closeAriaLabel}
              >
                <X size={18} strokeWidth={1.6} aria-hidden="true" />
              </button>
            </div>

            <div className={styles.drawerScrollable}>
              <div className={styles.receiptItemsList}>
                {calculatorItems.map((item) => (
                  <div key={item.serviceId} className={styles.receiptItem}>
                    <div className={styles.receiptItemHeader}>
                      <div className={styles.receiptItemInfo}>
                        <span className={styles.receiptItemName}>{item.name}</span>
                        <div className={styles.receiptItemMeta}>
                          <span className={styles.receiptItemDuration}>
                            <Clock size={13} strokeWidth={1.6} aria-hidden="true" />{' '}
                            {item.durationMinutes} {PRICES_TEXTS.card.durationUnit}
                          </span>
                          <span className={styles.receiptItemBasePrice}>
                            ${(item.basePrice || 0).toLocaleString('es-AR')}
                          </span>
                        </div>
                      </div>
                      <button
                        type="button"
                        className={styles.receiptItemRemoveBtn}
                        onClick={() => handleRemoveFromCalculator(item.serviceId)}
                        title={PRICES_TEXTS.receipt.itemRemoveTitle(item.name)}
                        aria-label={PRICES_TEXTS.receipt.itemRemoveAriaLabel(item.name)}
                      >
                        <Trash2 size={16} strokeWidth={1.6} aria-hidden="true" />
                      </button>
                    </div>

                    {item.availableExtras.length > 0 && (
                      <div className={styles.receiptExtrasSection}>
                        <span className={styles.receiptExtrasTitle}>
                          {PRICES_TEXTS.receipt.extrasTitle}
                        </span>
                        <div className={styles.receiptExtrasList}>
                          {item.availableExtras.map((extra) => {
                            const isChecked = item.selectedExtraIds.includes(extra.id);
                            return (
                              <button
                                key={extra.id}
                                type="button"
                                className={`${styles.receiptExtraTag} ${isChecked ? styles.receiptExtraTagSelected : ''
                                  }`}
                                onClick={() => handleToggleExtra(item.serviceId, extra.id)}
                                title={
                                  isChecked
                                    ? PRICES_TEXTS.card.removeExtraTitle(extra.name)
                                    : PRICES_TEXTS.card.addExtraTitle(
                                      extra.name,
                                      `$${(extra.price || 0).toLocaleString('es-AR')}`
                                    )
                                }
                              >
                                {isChecked ? (
                                  <Check size={12} strokeWidth={2} aria-hidden="true" />
                                ) : (
                                  <Plus size={12} strokeWidth={1.8} aria-hidden="true" />
                                )}
                                <span>{extra.name}</span>
                                <span className={styles.receiptExtraTagPrice}>
                                  +${(extra.price || 0).toLocaleString('es-AR')}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>

              <div className={styles.receiptSummary}>
                <div className={styles.summaryRow}>
                  <span className={styles.summaryLabel}>
                    {PRICES_TEXTS.receipt.baseServicesLabel}
                  </span>
                  <span className={styles.summaryValue}>
                    ${totals.subtotalServices.toLocaleString('es-AR')}
                  </span>
                </div>

                {totals.subtotalExtras > 0 && (
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>
                      {PRICES_TEXTS.receipt.extrasLabel(totals.totalExtrasCount)}
                    </span>
                    <span className={styles.summaryValueHighlight}>
                      +${totals.subtotalExtras.toLocaleString('es-AR')}
                    </span>
                  </div>
                )}

                {totals.totalDuration > 0 && (
                  <div className={styles.summaryRow}>
                    <span className={styles.summaryLabel}>
                      <Clock size={14} strokeWidth={1.6} className={styles.summaryIcon} aria-hidden="true" />
                      {PRICES_TEXTS.receipt.estimatedTimeLabel}
                    </span>
                    <span className={styles.summaryValue}>
                      {formatDuration(totals.totalDuration)}
                    </span>
                  </div>
                )}

                <div className={styles.summaryDivider} />

                <div className={styles.summaryTotalRow}>
                  <div>
                    <span className={styles.totalLabel}>
                      {PRICES_TEXTS.receipt.totalEstimatedLabel}
                    </span>
                    <span className={styles.totalSubLabel}>
                      {PRICES_TEXTS.receipt.totalFinalSessionSublabel}
                    </span>
                  </div>
                  <span className={styles.totalValue}>
                    ${totals.totalFinal.toLocaleString('es-AR')}
                  </span>
                </div>
              </div>

              <div className={styles.depositNotice}>
                <Info size={16} strokeWidth={1.6} className={styles.depositNoticeIcon} aria-hidden="true" />
                <span>{PRICES_TEXTS.receipt.depositNotice}</span>
              </div>
            </div>

            <div className={styles.drawerFooter}>
              <button
                type="button"
                className={styles.drawerClearBtn}
                onClick={handleClearCalculator}
                aria-label={PRICES_TEXTS.receipt.clearButtonAriaLabel}
              >
                {PRICES_TEXTS.drawer.clearButton}
              </button>
              <Link to={homePath} className={styles.ctaLink}>
                <Button
                  variant="primary"
                  size="lg"
                  fullWidth
                  leftIcon={<CalendarCheck size={16} strokeWidth={1.6} />}
                  rightIcon={<ArrowRight size={16} strokeWidth={1.75} />}
                >
                  {PRICES_TEXTS.drawer.bookButton}
                </Button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Prices;
