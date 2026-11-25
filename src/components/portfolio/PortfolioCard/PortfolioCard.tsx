import React from 'react';
import { Trash2, Tag } from 'lucide-react';
import type { PortfolioItem } from '../../../types';
import { applyImageFallback, DEFAULT_OWNER_ASSETS } from '../../../services/ownerDefaults';
import { PORTFOLIO_CARD_TEXTS } from '../../../texts';
import styles from './PortfolioCard.module.css';

export interface PortfolioCardProps {
  item: PortfolioItem;
  isAdmin?: boolean;
  featured?: boolean;
  onDelete?: (id: string, imageUrl: string) => void;
}

export const PortfolioCard: React.FC<PortfolioCardProps> = ({
  item,
  isAdmin = false,
  featured = false,
  onDelete,
}) => {
  return (
    <div className={`${styles.card} ${featured ? styles.cardFeatured : ''}`}>
      <div className={styles.imageWrapper}>
        <img
          src={item.imageUrl}
          alt={item.title}
          className={styles.image}
          loading="lazy"
          decoding="async"
          onError={(e) => applyImageFallback(e, DEFAULT_OWNER_ASSETS.heroImage)}
        />

        {item.category && (
          <span className={styles.categoryBadge}>
            <Tag size={12} strokeWidth={1.5} aria-hidden="true" />
            <span>{item.category}</span>
          </span>
        )}

        {isAdmin && onDelete && (
          <button
            type="button"
            onClick={() => onDelete(item.id, item.imageUrl)}
            className={styles.deleteButton}
            title={PORTFOLIO_CARD_TEXTS.deleteButtonTitle}
            aria-label={PORTFOLIO_CARD_TEXTS.deleteButtonAriaLabel}
          >
            <Trash2 size={16} strokeWidth={1.5} aria-hidden="true" />
          </button>
        )}
      </div>

      <div className={styles.content}>
        <h4 className={styles.title}>{item.title}</h4>
        {item.description && <p className={styles.description}>{item.description}</p>}
      </div>
    </div>
  );
};

export default PortfolioCard;
