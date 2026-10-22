import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone,
  Mail,
  MapPin,
  CalendarCheck,
  Award,
  HeartHandshake,
  ShieldCheck,
  User,
  ArrowRight,
} from 'lucide-react';
import type { OwnerInfo, PortfolioItem } from '../../types';
import {
  subscribeToOwnerInfo,
  subscribeToPortfolio,
  DEFAULT_OWNER_INFO,
} from '../../services/ownerService';
import PortfolioCard from '../../components/portfolio/PortfolioCard/PortfolioCard';
import Button from '../../components/common/Button/Button';
import { ABOUT_TEXTS } from '../../texts';
import styles from './About.module.css';

const InstagramIcon: React.FC<{ size?: number }> = ({ size = 18 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export const About: React.FC = () => {
  const [owner, setOwner] = useState<OwnerInfo>(DEFAULT_OWNER_INFO);
  const [portfolioItems, setPortfolioItems] = useState<PortfolioItem[]>([]);

  useEffect(() => {
    const unsubOwner = subscribeToOwnerInfo(
      (data) => {
        setOwner(data);
      },
      (err) => {
        console.error(ABOUT_TEXTS.errors.loadOwner, err);
      }
    );

    const unsubPortfolio = subscribeToPortfolio(
      (items) => {
        setPortfolioItems(items);
      },
      (err) => {
        console.error(ABOUT_TEXTS.errors.loadPortfolio, err);
      }
    );

    return () => {
      unsubOwner();
      unsubPortfolio();
    };
  }, []);

  const getCleanPhoneForWhatsApp = (phone?: string) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 8 ? digits : null;
  };

  const waNumber = getCleanPhoneForWhatsApp(owner.phone);

  return (
    <div className={`container ${styles.aboutContainer} animate-fade-in`}>
      <section className={styles.editorialCoverCard}>
        <div className={styles.portraitSection}>
          <div className={styles.portraitFrame}>
            {owner.pictureUrl ? (
              <img
                src={owner.pictureUrl}
                alt={owner.name || ABOUT_TEXTS.hero.fallbackOwnerName}
                className={styles.portraitImage}
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            ) : (
              <div className={styles.fallbackAvatar}>
                <User size={84} />
              </div>
            )}
          </div>
          <div className={styles.certifiedBadge}>
            <Award size={16} />
            <span>{ABOUT_TEXTS.hero.certifiedBadge}</span>
          </div>
        </div>

        <div className={styles.narrativeSection}>
          <div className={styles.headerGroup}>
            <h1 className={styles.ownerName}>{owner.name || ABOUT_TEXTS.hero.fallbackOwnerName}</h1>
            <h2 className={styles.ownerRole}>{owner.role || ABOUT_TEXTS.hero.fallbackRole}</h2>
          </div>

          <p className={styles.ownerBio}>
            {owner.description || DEFAULT_OWNER_INFO.description}
          </p>

          <div className={styles.contactGrid}>
            {owner.instagram && (
              <a
                href={`https://instagram.com/${owner.instagram.replace('@', '')}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.contactCard}
                aria-label={`${ABOUT_TEXTS.contact.instagram}: ${owner.instagram}`}
              >
                <div className={styles.contactIconWrapper}>
                  <InstagramIcon size={18} />
                </div>
                <div className={styles.contactInfo}>
                  <span className={styles.contactLabel}>{ABOUT_TEXTS.contact.instagram}</span>
                  <span className={styles.contactValue}>{owner.instagram}</span>
                </div>
              </a>
            )}

            {owner.phone && (
              <a
                href={waNumber ? `https://wa.me/${waNumber}` : `tel:${owner.phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className={styles.contactCard}
                aria-label={`${ABOUT_TEXTS.contact.whatsapp}: ${owner.phone}`}
              >
                <div className={styles.contactIconWrapper}>
                  <Phone size={18} />
                </div>
                <div className={styles.contactInfo}>
                  <span className={styles.contactLabel}>{ABOUT_TEXTS.contact.whatsapp}</span>
                  <span className={styles.contactValue}>{owner.phone}</span>
                </div>
              </a>
            )}

            {owner.email && (
              <a
                href={`mailto:${owner.email}`}
                className={styles.contactCard}
                aria-label={`${ABOUT_TEXTS.contact.email}: ${owner.email}`}
              >
                <div className={styles.contactIconWrapper}>
                  <Mail size={18} />
                </div>
                <div className={styles.contactInfo}>
                  <span className={styles.contactLabel}>{ABOUT_TEXTS.contact.email}</span>
                  <span className={styles.contactValue}>{owner.email}</span>
                </div>
              </a>
            )}

            {owner.location && (
              <div className={styles.contactCard}>
                <div className={styles.contactIconWrapper}>
                  <MapPin size={18} />
                </div>
                <div className={styles.contactInfo}>
                  <span className={styles.contactLabel}>{ABOUT_TEXTS.contact.location}</span>
                  <span className={styles.contactValue}>{owner.location}</span>
                </div>
              </div>
            )}
          </div>

          <div className={styles.ctaRow}>
            <Link to="/">
              <Button variant="primary" size="lg" rightIcon={<ArrowRight size={18} />}>
                {ABOUT_TEXTS.hero.ctaButton}
              </Button>
            </Link>
          </div>
        </div>
      </section>

      <section className={styles.pillarsSection}>
        <div className={styles.sectionHeader}>
          <h2 className={styles.sectionTitle}>{ABOUT_TEXTS.pillars.title}</h2>
          <p className={styles.sectionSubtitle}>{ABOUT_TEXTS.pillars.subtitle}</p>
        </div>

        <div className={styles.pillarsGrid}>
          <div className={`${styles.pillarCard} ${styles.pillarSupplies}`}>
            <div className={styles.pillarIcon}>
              <Award size={24} />
            </div>
            <h3 className={styles.pillarTitle}>{ABOUT_TEXTS.pillars.supplies.title}</h3>
            <p className={styles.pillarDescription}>
              {ABOUT_TEXTS.pillars.supplies.description}
            </p>
          </div>

          <div className={`${styles.pillarCard} ${styles.pillarPersonalized}`}>
            <div className={styles.pillarIcon}>
              <HeartHandshake size={24} />
            </div>
            <h3 className={styles.pillarTitle}>{ABOUT_TEXTS.pillars.personalized.title}</h3>
            <p className={styles.pillarDescription}>
              {ABOUT_TEXTS.pillars.personalized.description}
            </p>
          </div>

          <div className={`${styles.pillarCard} ${styles.pillarPunctuality}`}>
            <div className={styles.pillarIcon}>
              <ShieldCheck size={24} />
            </div>
            <h3 className={styles.pillarTitle}>{ABOUT_TEXTS.pillars.punctuality.title}</h3>
            <p className={styles.pillarDescription}>
              {ABOUT_TEXTS.pillars.punctuality.description}
            </p>
          </div>
        </div>
      </section>

      {portfolioItems.length > 0 && (
        <section className={styles.portfolioSection}>
          <div className={styles.sectionHeader}>
            <h2 className={styles.sectionTitle}>{ABOUT_TEXTS.portfolio.title}</h2>
            <p className={styles.sectionSubtitle}>
              {ABOUT_TEXTS.portfolio.subtitle}
            </p>
          </div>

          <div className={styles.portfolioGrid}>
            {portfolioItems.slice(0, 6).map((item) => (
              <PortfolioCard key={item.id} item={item} />
            ))}
          </div>
        </section>
      )}

      <section className={styles.finalCtaBanner}>
        <div className={styles.finalCtaContent}>
          <h2 className={styles.finalCtaTitle}>{ABOUT_TEXTS.finalCta.title}</h2>
          <p className={styles.finalCtaSubtitle}>{ABOUT_TEXTS.finalCta.subtitle}</p>
          <Link to="/" className={styles.finalCtaLink}>
            <Button variant="primary" size="lg" leftIcon={<CalendarCheck size={18} />}>
              {ABOUT_TEXTS.finalCta.button}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default About;
