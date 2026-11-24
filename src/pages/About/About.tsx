import React from 'react';
import { Link } from 'react-router-dom';
import {
  Phone,
  Mail,
  MapPin,
  CalendarCheck,
  Award,
  HeartHandshake,
  ShieldCheck,
  ArrowRight,
  ArrowUpRight,
} from 'lucide-react';
import { useOwnerInfo } from '../../context/OwnerInfoContext';
import { usePortfolio } from '../../context/PortfolioContext';
import { useTenant } from '../../context/TenantContext';
import { buildTenantPath } from '../../services/tenantService';
import { applyImageFallback, DEFAULT_OWNER_ASSETS } from '../../services/ownerDefaults';
import { formatInstagramUrl } from '../../utils/validators';
import PortfolioCard from '../../components/portfolio/PortfolioCard/PortfolioCard';
import Button from '../../components/common/Button/Button';
import { ABOUT_TEXTS } from '../../texts';
import styles from './About.module.css';

const InstagramIcon: React.FC<{ size?: number }> = ({ size = 16 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="1.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    aria-hidden="true"
  >
    <rect width="20" height="20" x="2" y="2" rx="5" ry="5" />
    <path d="M16 11.37A4 4 0 1 1 12.63 8 4 4 0 0 1 16 11.37z" />
    <line x1="17.5" x2="17.51" y1="6.5" y2="6.5" />
  </svg>
);

export const About: React.FC = () => {
  const { slug } = useTenant();
  const { owner, defaults } = useOwnerInfo();
  const { items: portfolioItems } = usePortfolio();
  const homePath = buildTenantPath(slug);

  const getCleanPhoneForWhatsApp = (phone?: string) => {
    if (!phone) return null;
    const digits = phone.replace(/\D/g, '');
    return digits.length >= 8 ? digits : null;
  };

  const waNumber = getCleanPhoneForWhatsApp(owner.phone);
  const instagramUrl = formatInstagramUrl(owner.instagram);

  return (
    <div className={`container ${styles.aboutContainer} animate-fade-in`}>
      <section className={styles.editorialCoverCard}>
        <div className={styles.portraitSection}>
          <div className={styles.portraitFrame}>
            <img
              src={owner.pictureUrl || defaults.pictureUrl || DEFAULT_OWNER_ASSETS.portraitImage}
              alt={owner.name || ABOUT_TEXTS.hero.fallbackOwnerName}
              className={styles.portraitImage}
              decoding="async"
              onError={(e) =>
                applyImageFallback(e, defaults.pictureUrl || DEFAULT_OWNER_ASSETS.portraitImage)
              }
            />
          </div>
          <div className={styles.certifiedBadge}>
            <Award size={16} strokeWidth={1.5} aria-hidden="true" />
            <span>{ABOUT_TEXTS.hero.certifiedBadge}</span>
          </div>
        </div>

        <div className={styles.narrativeSection}>
          <div className={styles.headerGroup}>
            <h1 className={styles.ownerName}>{owner.name || ABOUT_TEXTS.hero.fallbackOwnerName}</h1>
            <h2 className={styles.ownerRole}>{owner.role || ABOUT_TEXTS.hero.fallbackRole}</h2>
          </div>

          <p className={styles.ownerBio}>
            {owner.description || defaults.description}
          </p>

          <div className={styles.contactGrid}>
            {owner.instagram && instagramUrl && (
              <a
                href={instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.contactCard} ${styles.contactCardInteractive}`}
                aria-label={`${ABOUT_TEXTS.contact.instagram}: ${owner.instagram}`}
              >
                <span className={styles.contactIconWrapper} aria-hidden="true">
                  <InstagramIcon size={16} />
                </span>
                <span className={styles.contactInfo}>
                  <span className={styles.contactLabel}>{ABOUT_TEXTS.contact.instagram}</span>
                  <span className={styles.contactValue} title={owner.instagram}>
                    {owner.instagram}
                  </span>
                </span>
                <ArrowUpRight size={15} strokeWidth={1.5} className={styles.contactArrow} aria-hidden="true" />
              </a>
            )}

            {owner.phone && (
              <a
                href={waNumber ? `https://wa.me/${waNumber}` : `tel:${owner.phone}`}
                target="_blank"
                rel="noopener noreferrer"
                className={`${styles.contactCard} ${styles.contactCardInteractive}`}
                aria-label={`${ABOUT_TEXTS.contact.whatsapp}: ${owner.phone}`}
              >
                <span className={styles.contactIconWrapper} aria-hidden="true">
                  <Phone size={16} strokeWidth={1.5} />
                </span>
                <span className={styles.contactInfo}>
                  <span className={styles.contactLabel}>{ABOUT_TEXTS.contact.whatsapp}</span>
                  <span
                    className={`${styles.contactValue} ${styles.contactValueNumeric}`}
                    title={owner.phone}
                  >
                    {owner.phone}
                  </span>
                </span>
                <ArrowUpRight size={15} strokeWidth={1.5} className={styles.contactArrow} aria-hidden="true" />
              </a>
            )}

            {owner.email && (
              <a
                href={`mailto:${owner.email}`}
                className={`${styles.contactCard} ${styles.contactCardInteractive}`}
                aria-label={`${ABOUT_TEXTS.contact.email}: ${owner.email}`}
              >
                <span className={styles.contactIconWrapper} aria-hidden="true">
                  <Mail size={16} strokeWidth={1.5} />
                </span>
                <span className={styles.contactInfo}>
                  <span className={styles.contactLabel}>{ABOUT_TEXTS.contact.email}</span>
                  <span className={styles.contactValue} title={owner.email}>
                    {owner.email}
                  </span>
                </span>
                <ArrowUpRight size={15} strokeWidth={1.5} className={styles.contactArrow} aria-hidden="true" />
              </a>
            )}

            {owner.location && (
              <div className={styles.contactCard}>
                <span className={styles.contactIconWrapper} aria-hidden="true">
                  <MapPin size={16} strokeWidth={1.5} />
                </span>
                <span className={styles.contactInfo}>
                  <span className={styles.contactLabel}>{ABOUT_TEXTS.contact.location}</span>
                  <span className={styles.contactValue} title={owner.location}>
                    {owner.location}
                  </span>
                </span>
              </div>
            )}
          </div>

          <div className={styles.ctaRow}>
            <Link to={homePath}>
              <Button variant="primary" size="lg" rightIcon={<ArrowRight size={16} strokeWidth={1.5} />}>
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
          <div className={styles.pillarCard}>
            <div className={styles.pillarHeader}>
              <span className={styles.pillarIcon} aria-hidden="true">
                <Award size={20} strokeWidth={1.6} />
              </span>
              <h3 className={styles.pillarTitle}>{ABOUT_TEXTS.pillars.supplies.title}</h3>
            </div>
            <p className={styles.pillarDescription}>
              {ABOUT_TEXTS.pillars.supplies.description}
            </p>
          </div>

          <div className={styles.pillarCard}>
            <div className={styles.pillarHeader}>
              <span className={styles.pillarIcon} aria-hidden="true">
                <HeartHandshake size={20} strokeWidth={1.6} />
              </span>
              <h3 className={styles.pillarTitle}>{ABOUT_TEXTS.pillars.personalized.title}</h3>
            </div>
            <p className={styles.pillarDescription}>
              {ABOUT_TEXTS.pillars.personalized.description}
            </p>
          </div>

          <div className={styles.pillarCard}>
            <div className={styles.pillarHeader}>
              <span className={styles.pillarIcon} aria-hidden="true">
                <ShieldCheck size={20} strokeWidth={1.6} />
              </span>
              <h3 className={styles.pillarTitle}>{ABOUT_TEXTS.pillars.punctuality.title}</h3>
            </div>
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
          <Link to={homePath} className={styles.finalCtaLink}>
            <Button variant="primary" size="lg" leftIcon={<CalendarCheck size={16} strokeWidth={1.5} />}>
              {ABOUT_TEXTS.finalCta.button}
            </Button>
          </Link>
        </div>
      </section>
    </div>
  );
};

export default About;
