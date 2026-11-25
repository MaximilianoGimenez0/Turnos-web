import React, { useMemo, useRef, useState } from 'react';
import { ChevronDown, ChevronLeft, ChevronRight, ChevronUp, Image as ImageIcon } from 'lucide-react';
import type { PortfolioItem, PortfolioLayoutId } from '../../../types';
import { PORTFOLIO_GALLERY_TEXTS } from '../../../texts';
import Button from '../../common/Button/Button';
import Loader from '../../common/Loader/Loader';
import PortfolioCard from '../PortfolioCard/PortfolioCard';
import styles from './PortfolioGallery.module.css';

export interface PortfolioGalleryProps {
  items: PortfolioItem[];
  layout: PortfolioLayoutId;
  title: string;
  subtitle: string;
  headerVariant?: 'clean' | 'bordered';
  loading?: boolean;
  loadingTitle?: string;
  loadingSubtitle?: string;
  emptyTitle?: string;
  emptyDescription?: string;
  initialLimit?: number;
  expandable?: boolean;
  showMoreLabel?: (remainingCount: number) => string;
  showLessLabel?: string;
}

export const PortfolioGallery: React.FC<PortfolioGalleryProps> = ({
  items,
  layout,
  title,
  subtitle,
  headerVariant = 'clean',
  loading = false,
  loadingTitle,
  loadingSubtitle,
  emptyTitle,
  emptyDescription,
  initialLimit,
  expandable = false,
  showMoreLabel,
  showLessLabel,
}) => {
  const [showAll, setShowAll] = useState(false);
  const carouselRef = useRef<HTMLDivElement | null>(null);

  const visibleItems = useMemo(() => {
    if (!initialLimit || (expandable && showAll)) {
      return items;
    }
    return items.slice(0, initialLimit);
  }, [items, initialLimit, expandable, showAll]);

  const hasEmptyStateCopy = Boolean(emptyTitle || emptyDescription);

  if (!loading && items.length === 0 && !hasEmptyStateCopy) {
    return null;
  }

  const isBentoActive = layout === 'bento' && visibleItems.length >= 3;
  const isCarouselActive = layout === 'carousel';
  const hasExpandButton = Boolean(expandable && initialLimit && items.length > initialLimit);

  const scrollCarousel = (direction: -1 | 1) => {
    const el = carouselRef.current;
    if (!el) return;
    const step = Math.max(280, Math.round(el.clientWidth * 0.72));
    el.scrollBy({ left: direction * step, behavior: 'smooth' });
  };

  return (
    <section
      className={`${styles.portfolioSection} ${
        headerVariant === 'bordered' ? styles.portfolioSectionSpaced : ''
      }`}
    >
      <div
        className={`${styles.headerRow} ${
          headerVariant === 'bordered' ? styles.headerRowBordered : ''
        }`}
      >
        <div
          className={`${styles.titleGroup} ${
            headerVariant === 'clean' ? styles.titleGroupClean : ''
          }`}
        >
          <h2 className={styles.sectionTitle}>{title}</h2>
          <p
            className={`${styles.sectionSubtitle} ${
              headerVariant === 'bordered' ? styles.sectionSubtitleCompact : ''
            }`}
          >
            {subtitle}
          </p>
        </div>

        {!loading && isCarouselActive && visibleItems.length > 1 && (
          <div className={styles.carouselControls}>
            <button
              type="button"
              className={styles.carouselBtn}
              onClick={() => scrollCarousel(-1)}
              aria-label={PORTFOLIO_GALLERY_TEXTS.carousel.prevAria}
            >
              <ChevronLeft size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
            <button
              type="button"
              className={styles.carouselBtn}
              onClick={() => scrollCarousel(1)}
              aria-label={PORTFOLIO_GALLERY_TEXTS.carousel.nextAria}
            >
              <ChevronRight size={16} strokeWidth={1.75} aria-hidden="true" />
            </button>
          </div>
        )}
      </div>

      {loading && (
        <Loader
          size="md"
          title={loadingTitle}
          subtitle={loadingSubtitle}
          icon="heart"
        />
      )}

      {!loading && items.length === 0 && hasEmptyStateCopy && (
        <div className={styles.emptyPortfolioCard}>
          <div className={styles.emptyPortfolioIcon}>
            <ImageIcon size={28} />
          </div>
          {emptyTitle && <h3>{emptyTitle}</h3>}
          {emptyDescription && <p>{emptyDescription}</p>}
        </div>
      )}

      {!loading && visibleItems.length > 0 && (
        <>
          <div
            ref={carouselRef}
            className={`${styles.portfolioGrid} ${
              isBentoActive
                ? styles.portfolioBento
                : isCarouselActive
                ? styles.portfolioCarousel
                : ''
            }`}
            data-portfolio-layout={layout}
          >
            {visibleItems.map((item, index) => (
              <PortfolioCard
                key={item.id}
                item={item}
                featured={isBentoActive && index === 0}
              />
            ))}
          </div>

          {hasExpandButton && showMoreLabel && showLessLabel && (
            <div className={styles.expandActionWrapper}>
              <Button
                variant="outline"
                size="md"
                onClick={() => setShowAll((prev) => !prev)}
                leftIcon={<ImageIcon size={16} />}
                rightIcon={showAll ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
              >
                {showAll ? showLessLabel : showMoreLabel(items.length - initialLimit!)}
              </Button>
            </div>
          )}
        </>
      )}
    </section>
  );
};

export default PortfolioGallery;
