import React, { useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  AnimatePresence,
  motion,
  useMotionTemplate,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { ArrowRight, ChevronDown, MessageCircle } from 'lucide-react';
import { DEFAULT_DEMO_SLUG } from '../../config/tenantConstants';
import { buildTenantPath } from '../../services/tenantService';
import { LANDING_TEXTS } from '../../texts/pages/Landing';
import Button from '../../components/common/Button/Button';
import ThemeSwitcher from '../../components/common/ThemeSwitcher/ThemeSwitcher';
import Footer from '../../components/common/Footer/Footer';
import { LandingHeroStage } from './components/LandingHeroStage';
import { LandingIndustriesMarquee } from './components/LandingIndustriesMarquee';
import { LandingScrollStory } from './components/LandingScrollStory';
import { LandingBenefitsStack } from './components/LandingBenefitsStack';
import {
  AnimatedPriceRoll,
  AnimatedSvgCheck,
} from './motion/scrollPrimitives';
import {
  EASE_OUT_EXPO,
  SPRING_SCRUB,
  SPRING_TACTILE,
} from './motion/motionConfig';
import { useIsCompactViewport } from './motion/useIsCompactViewport';
import styles from './LandingView.module.css';

export const LandingView: React.FC = () => {
  const [openFaqIdx, setOpenFaqIdx] = useState<number | null>(0);
  const demoPath = buildTenantPath(DEFAULT_DEMO_SLUG);
  const shouldReduceMotion = useReducedMotion();
  const isCompact = useIsCompactViewport(959);
  const disableScrollMotion = Boolean(shouldReduceMotion) || isCompact;

  const pricingRef = useRef<HTMLDivElement | null>(null);
  const finalCtaRef = useRef<HTMLElement | null>(null);

  const { scrollYProgress } = useScroll();
  const scrollScaleX = useSpring(scrollYProgress, {
    stiffness: 280,
    damping: 34,
    restDelta: 0.001,
  });

  // Scroll-scrubbed mask expansion for Pricing card
  const { scrollYProgress: pricingScroll } = useScroll({
    target: pricingRef,
    offset: ['start end', 'center center'],
  });
  const pricingSmooth = useSpring(pricingScroll, SPRING_SCRUB);
  const pricingScale = useTransform(pricingSmooth, [0, 1], [0.94, 1]);
  const pricingInsetV = useTransform(pricingSmooth, [0, 1], [6, 0]);
  const pricingInsetH = useTransform(pricingSmooth, [0, 1], [3, 0]);
  const pricingClipPath = useMotionTemplate`inset(${pricingInsetV}% ${pricingInsetH}% round 24px)`;

  // Scroll-scrubbed expansion for Final CTA
  const { scrollYProgress: ctaScroll } = useScroll({
    target: finalCtaRef,
    offset: ['start end', 'center 75%'],
  });
  const ctaSmooth = useSpring(ctaScroll, SPRING_SCRUB);
  const ctaScale = useTransform(ctaSmooth, [0, 1], [0.93, 1]);
  const ctaY = useTransform(ctaSmooth, [0, 1], [30, 0]);

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div className={styles.headerInner}>
          <a href="#top" className={styles.brandLink}>
            <img src="/favicon.svg" alt="" className={styles.brandIcon} />
            <span className={styles.brandWordmark}>{LANDING_TEXTS.brand.name}</span>
          </a>

          <nav className={styles.headerActions} aria-label="Navegación principal">
            <Link to="/ayuda" className={styles.helpNavLink}>
              {LANDING_TEXTS.nav.help}
            </Link>
            <ThemeSwitcher className={styles.headerThemeBtn} />
            <Link to={demoPath} className={styles.ctaLink}>
              <Button
                variant="primary"
                size="sm"
                className={styles.headerCtaBtn}
                rightIcon={<ArrowRight size={14} className={styles.headerCtaIcon} />}
              >
                {LANDING_TEXTS.nav.demoCta}
              </Button>
            </Link>
          </nav>
        </div>

        <motion.div
          className={styles.scrollProgressBar}
          style={{ scaleX: shouldReduceMotion ? scrollYProgress : scrollScaleX }}
          aria-hidden="true"
        />
      </header>

      <main id="top" className={styles.main}>
        {/* Act 1: 3D Scroll-Driven Hero + Velocity Marquee */}
        <LandingHeroStage demoPath={demoPath} />
        <LandingIndustriesMarquee />

        {/* Act 2: Sticky 310vh Continuous Scrubbed 3-Act Story */}
        <LandingScrollStory />

        {/* Act 3: Sticky Stacking Benefits Cards with Live Micro-Visuals */}
        <LandingBenefitsStack />

        {/* Act 4: Scroll-Masked Pricing Reveal + Number Roll + SVG Checks */}
        <section className={styles.section}>
          <motion.div
            className={styles.sectionHeader}
            initial={shouldReduceMotion ? false : { opacity: 0.4, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          >
            <h2 className={styles.sectionTitle}>{LANDING_TEXTS.pricing.title}</h2>
            <p className={styles.sectionSubtitle}>{LANDING_TEXTS.pricing.subtitle}</p>
          </motion.div>

          <div ref={pricingRef}>
            <motion.div
              className={styles.pricingCard}
              style={
                disableScrollMotion
                  ? undefined
                  : {
                      scale: pricingScale,
                      clipPath: pricingClipPath,
                    }
              }
            >
              <div className={styles.pricingSummary}>
                <span className={styles.planTag}>{LANDING_TEXTS.pricing.planTag}</span>
                <h3 className={styles.planName}>{LANDING_TEXTS.pricing.planName}</h3>
                <p className={styles.monthlyLabel}>{LANDING_TEXTS.pricing.monthlyLabel}</p>

                <div className={styles.priceRow}>
                  <span className={styles.priceCurrency}>
                    {LANDING_TEXTS.pricing.monthlyCurrency}
                  </span>
                  <AnimatedPriceRoll
                    target={LANDING_TEXTS.pricing.monthlyAmountNumber}
                    className={styles.priceAmount}
                  />
                  <span className={styles.pricePeriod}>{LANDING_TEXTS.pricing.monthlyPeriod}</span>
                </div>

                <div className={styles.setupBox}>
                  <strong>{LANDING_TEXTS.pricing.setupLabel}</strong>{' '}
                  <span>{LANDING_TEXTS.pricing.setupAmount}</span>
                  <p className={styles.setupNote}>{LANDING_TEXTS.pricing.setupNote}</p>
                </div>

                <div className={styles.pricingActions}>
                  <a
                    href={LANDING_TEXTS.hero.whatsappHref}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={styles.ctaLink}
                  >
                    <Button
                      variant="primary"
                      size="lg"
                      fullWidth
                      leftIcon={<MessageCircle size={16} />}
                    >
                      {LANDING_TEXTS.pricing.primaryCta}
                    </Button>
                  </a>
                  <Link to={demoPath} className={styles.ctaLink}>
                    <Button
                      variant="outline"
                      size="md"
                      fullWidth
                      rightIcon={<ArrowRight size={15} />}
                    >
                      {LANDING_TEXTS.pricing.secondaryCta}
                    </Button>
                  </Link>
                </div>
              </div>

              <div className={styles.pricingFeatures}>
                <h4 className={styles.featuresTitle}>{LANDING_TEXTS.pricing.includedTitle}</h4>
                <ul className={styles.featuresList}>
                  {LANDING_TEXTS.pricing.features.map((feat, idx) => (
                    <li key={feat} className={styles.featureItem}>
                      <span className={styles.featureCheck}>
                        <AnimatedSvgCheck delay={Math.min(idx * 0.045, 0.32)} />
                      </span>
                      <span>{feat}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </motion.div>
          </div>
        </section>

        {/* Act 5: Tactile Spring FAQ */}
        <section className={styles.section}>
          <motion.div
            className={styles.sectionHeader}
            initial={shouldReduceMotion ? false : { opacity: 0.4, y: 18 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.25 }}
            transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
          >
            <h2 className={styles.sectionTitle}>{LANDING_TEXTS.faq.title}</h2>
          </motion.div>

          <div className={styles.faqCard}>
            {LANDING_TEXTS.faq.items.map((item, idx) => {
              const isOpen = openFaqIdx === idx;
              return (
                <div key={item.q} className={styles.faqItem}>
                  <button
                    type="button"
                    className={styles.faqTrigger}
                    aria-expanded={isOpen}
                    onClick={() => setOpenFaqIdx(isOpen ? null : idx)}
                  >
                    <span>{item.q}</span>
                    <ChevronDown
                      size={18}
                      strokeWidth={1.75}
                      className={`${styles.faqChevron} ${isOpen ? styles.faqChevronOpen : ''}`}
                      aria-hidden="true"
                    />
                  </button>
                  <AnimatePresence initial={false}>
                    {isOpen && (
                      <motion.div
                        key="answer"
                        className={styles.faqAnswerMotion}
                        initial={shouldReduceMotion ? false : { opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: 'auto' }}
                        exit={shouldReduceMotion ? undefined : { opacity: 0, height: 0 }}
                        transition={shouldReduceMotion ? { duration: 0.01 } : SPRING_TACTILE}
                      >
                        <p className={styles.faqAnswer}>{item.a}</p>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            })}
          </div>

          <div className={styles.faqFooter}>
            <Link to="/ayuda" className={styles.ctaLink}>
              <Button
                variant="outline"
                size="md"
                className={styles.faqFooterBtn}
                rightIcon={<ArrowRight size={15} />}
              >
                {LANDING_TEXTS.faq.moreHelpCta}
              </Button>
            </Link>
          </div>
        </section>

        {/* Scroll-Expanding Final CTA */}
        <motion.section
          ref={finalCtaRef}
          className={styles.finalCtaCard}
          style={
            disableScrollMotion
              ? undefined
              : {
                  scale: ctaScale,
                  y: ctaY,
                }
          }
        >
          <div className={styles.finalCtaText}>
            <h2 className={styles.finalCtaTitle}>{LANDING_TEXTS.finalCta.title}</h2>
            <p className={styles.finalCtaSub}>{LANDING_TEXTS.finalCta.subtitle}</p>
          </div>
          <div className={styles.finalCtaActions}>
            <Link to={demoPath} className={styles.ctaLink}>
              <Button variant="primary" size="lg" rightIcon={<ArrowRight size={16} />}>
                {LANDING_TEXTS.finalCta.primaryCta}
              </Button>
            </Link>
            <a
              href={LANDING_TEXTS.hero.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctaLink}
            >
              <Button variant="outline" size="lg" leftIcon={<MessageCircle size={16} />}>
                {LANDING_TEXTS.finalCta.secondaryCta}
              </Button>
            </a>
          </div>
        </motion.section>
      </main>

      <Footer />
    </div>
  );
};

export default LandingView;
