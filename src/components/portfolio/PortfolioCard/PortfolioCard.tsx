import React from 'react';
import { Trash2, Tag } from 'lucide-react';
import type { PortfolioItem } from '../../../types';
import { PORTFOLIO_CARD_TEXTS } from '../../../texts';
import styles from './PortfolioCard.module.css';

export interface PortfolioCardProps {
  item: PortfolioItem;
  isAdmin?: boolean;
  onDelete?: (id: string, imageUrl: string) => void;
}

export const PortfolioCard: React.FC<PortfolioCardProps> = ({
  item,
  isAdmin = false,
  onDelete,
}) => {
  return (
    <div className={styles.card}>
      <div className={styles.imageWrapper}>
        <img
          src={item.imageUrl}
          alt={item.title}
          className={styles.image}
          loading="lazy"
          onError={(e) => {
            // Fallback en caso de error de carga
            (e.target as HTMLImageElement).src =
              'https://images.unsplash.com/photo-1560066984-138dadb4c035?w=800&auto=format&fit=crop&q=80';
          }}
        />

        {item.category && (
          <span className={styles.categoryBadge}>
            <Tag size={10} style={{ display: 'inline', marginRight: 4 }} />
            {item.category}
          </span>
        )}

        {isAdmin && onDelete && (
          <button
            onClick={() => onDelete(item.id, item.imageUrl)}
            className={styles.deleteButton}
            title={PORTFOLIO_CARD_TEXTS.deleteButtonTitle}
            aria-label={PORTFOLIO_CARD_TEXTS.deleteButtonAriaLabel}
          >
            <Trash2 size={14} />
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
