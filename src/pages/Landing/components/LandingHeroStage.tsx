import React, { useRef } from 'react';
import { Link } from 'react-router-dom';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import {
  ArrowRight,
  Clock,
  CreditCard,
  MailCheck,
  MessageCircle,
  ShieldCheck,
} from 'lucide-react';
import { LANDING_TEXTS } from '../../../texts/pages/Landing';
import Button from '../../../components/common/Button/Button';
import { MaskedTextLine } from '../motion/scrollPrimitives';
import { EASE_OUT_EXPO, SPRING_SCRUB } from '../motion/motionConfig';
import { useIsCompactViewport } from '../motion/useIsCompactViewport';
import styles from './LandingHeroStage.module.css';

interface LandingHeroStageProps {
  demoPath: string;
}

export const LandingHeroStage: React.FC<LandingHeroStageProps> = ({ demoPath }) => {
  const heroRef = useRef<HTMLElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const isCompact = useIsCompactViewport(959);
  const disableScrollMotion = Boolean(shouldReduceMotion) || isCompact;

  const { scrollYProgress } = useScroll({
    target: heroRef,
    offset: ['start start', 'end start'],
  });
  const smoothScroll = useSpring(scrollYProgress, SPRING_SCRUB);

  // Continuous scroll-scrubbed 3D transforms (desktop only)
  const copyY = useTransform(smoothScroll, [0, 1], [0, -32]);
  const stageRotateX = useTransform(smoothScroll, [0, 0.5, 1], [8, 0, -4]);
  const stageRotateY = useTransform(smoothScroll, [0, 0.5, 1], [-7, 0, 3]);
  const stageScale = useTransform(smoothScroll, [0, 0.45, 1], [0.98, 1.02, 0.97]);
  const stageY = useTransform(smoothScroll, [0, 1], [0, 28]);
  const slotLiftY = useTransform(smoothScroll, [0, 0.6, 1], [0, -4, -6]);

  // Differential satellite chip parallax (desktop only)
  const chipLockY = useTransform(smoothScroll, [0, 1], [0, -36]);
  const chipPaymentY = useTransform(smoothScroll, [0, 1], [8, -24]);
  const chipEmailY = useTransform(smoothScroll, [0, 1], [12, -18]);

  // Pointer micro-tilt (desktop only)
  const pointerX = useMotionValue(0);
  const pointerY = useMotionValue(0);
  const tiltY = useSpring(useTransform(pointerX, [-0.5, 0.5], [-4.5, 4.5]), {
    stiffness: 200,
    damping: 26,
  });
  const tiltX = useSpring(useTransform(pointerY, [-0.5, 0.5], [4.5, -4.5]), {
    stiffness: 200,
    damping: 26,
  });

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (disableScrollMotion || e.pointerType !== 'mouse') return;
    const rect = e.currentTarget.getBoundingClientRect();
    pointerX.set((e.clientX - rect.left) / rect.width - 0.5);
    pointerY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handlePointerLeave = () => {
    pointerX.set(0);
    pointerY.set(0);
  };

  const { preview } = LANDING_TEXTS.hero;

  return (
    <section ref={heroRef} className={styles.heroSection}>
      <div className={styles.heroGrid}>
        <motion.div
          className={styles.heroContent}
          style={disableScrollMotion ? undefined : { y: copyY }}
        >
          <h1 className={styles.heroTitle}>
            <MaskedTextLine delay={0.04}>{LANDING_TEXTS.hero.titleLine1}</MaskedTextLine>
            <MaskedTextLine delay={0.11}>{LANDING_TEXTS.hero.titleLine2}</MaskedTextLine>
            <MaskedTextLine delay={0.18} className={styles.heroHighlight}>
              {LANDING_TEXTS.hero.titleHighlight}
            </MaskedTextLine>
          </h1>

          <motion.p
            className={styles.heroSubtitle}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.22, ease: EASE_OUT_EXPO }}
          >
            {LANDING_TEXTS.hero.subtitle}
          </motion.p>

          <motion.div
            className={styles.heroActions}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.28, ease: EASE_OUT_EXPO }}
          >
            <Link to={demoPath} className={styles.ctaLink}>
              <Button variant="primary" size="lg" rightIcon={<ArrowRight size={16} />}>
                {LANDING_TEXTS.hero.primaryCta}
              </Button>
            </Link>
            <a
              href={LANDING_TEXTS.hero.whatsappHref}
              target="_blank"
              rel="noopener noreferrer"
              className={styles.ctaLink}
            >
              <Button variant="outline" size="lg" leftIcon={<MessageCircle size={16} />}>
                {LANDING_TEXTS.hero.secondaryCta}
              </Button>
            </a>
          </motion.div>

          <motion.ul
            className={styles.trustList}
            initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.55, delay: 0.34, ease: EASE_OUT_EXPO }}
          >
            {LANDING_TEXTS.hero.trustItems.map((item) => (
              <li key={item} className={styles.trustItem}>
                <ShieldCheck
                  size={15}
                  strokeWidth={1.8}
                  className={styles.trustIcon}
                  aria-hidden="true"
                />
                <span>{item}</span>
              </li>
            ))}
          </motion.ul>
        </motion.div>

        <div
          className={styles.heroStageCol}
          aria-hidden="true"
          onPointerMove={handlePointerMove}
          onPointerLeave={handlePointerLeave}
        >
          <div className={styles.stageOrbitWrap}>
            <div className={styles.stagePerspectiveBox}>
              <motion.div
                style={
                  disableScrollMotion
                    ? undefined
                    : {
                      rotateX: tiltX,
                      rotateY: tiltY,
                    }
                }
              >
                <motion.div
                  className={styles.stageScrollPlane}
                  style={
                    disableScrollMotion
                      ? undefined
                      : {
                        rotateX: stageRotateX,
                        rotateY: stageRotateY,
                        scale: stageScale,
                        y: stageY,
                      }
                  }
                  initial={shouldReduceMotion ? false : { opacity: 0, y: 24, scale: 0.96 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.72, delay: 0.14, ease: EASE_OUT_EXPO }}
                >
                  <div className={styles.previewWindow}>
                    <div className={styles.previewBrowserBar}>
                      <span className={styles.previewUrl}>{preview.urlLabel}</span>
                    </div>

                    <div className={styles.previewBody}>
                      <div className={styles.previewBrandRow}>
                        <img
                          src="/favicon.svg"
                          alt=""
                          className={styles.previewMiniLogo}
                        />
                        <div>
                          <div className={styles.previewBizName}>{preview.businessName}</div>
                          <div className={styles.previewBizSub}>{preview.businessSub}</div>
                        </div>
                      </div>

                      <div className={styles.previewDayStrip}>
                        {preview.days.map((d) => (
                          <div
                            key={d.num}
                            className={`${styles.previewDayPill} ${d.active ? styles.previewDayPillActive : ''
                              }`}
                          >
                            <span className={styles.previewDayWd}>{d.wd}</span>
                            <span className={styles.previewDayNum}>{d.num}</span>
                          </div>
                        ))}
                      </div>

                      <motion.div
                        className={styles.previewSlotCard}
                        style={disableScrollMotion ? undefined : { y: slotLiftY }}
                      >
                        <div className={styles.previewSlotTop}>
                          <div>
                            <div className={styles.previewSlotTime}>{preview.slotTime}</div>
                            <div className={styles.previewSlotService}>{preview.slotService}</div>
                          </div>
                          <span className={styles.previewDurationBadge}>{preview.slotDuration}</span>
                        </div>
                        <div className={styles.previewExtras}>{preview.slotExtras}</div>
                        <div className={styles.previewDepositRow}>
                          <span>{preview.depositLabel}</span>
                          <strong>{preview.depositAmount}</strong>
                        </div>
                      </motion.div>

                      <div className={styles.previewAdminStrip}>
                        <span className={styles.previewAdminBadge}>{preview.adminBadge}</span>
                        <div className={styles.previewAdminInfo}>
                          <strong>{preview.adminTitle}</strong>
                          <span>{preview.adminSubtitle}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            </div>

            <div className={styles.mobileChipTray}>
              <motion.div
                className={`${styles.chipSlot} ${styles.chipLockPos}`}
                style={disableScrollMotion ? undefined : { y: chipLockY }}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.28, ease: EASE_OUT_EXPO }}
              >
                <div className={`${styles.satelliteChip} ${styles.chipFloatA}`}>
                  <span className={`${styles.chipIcon} ${styles.chipIconPrimary}`}>
                    <Clock size={14} strokeWidth={1.8} />
                  </span>
                  <span className={styles.chipText}>
                    <span className={styles.chipTitle}>{preview.chips.lock.title}</span>
                    <span className={styles.chipMeta}>{preview.chips.lock.meta}</span>
                  </span>
                </div>
              </motion.div>

              <motion.div
                className={`${styles.chipSlot} ${styles.chipPaymentPos}`}
                style={disableScrollMotion ? undefined : { y: chipPaymentY }}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.34, ease: EASE_OUT_EXPO }}
              >
                <div className={`${styles.satelliteChip} ${styles.chipFloatB}`}>
                  <span className={`${styles.chipIcon} ${styles.chipIconSuccess}`}>
                    <CreditCard size={14} strokeWidth={1.8} />
                  </span>
                  <span className={styles.chipText}>
                    <span className={styles.chipTitle}>{preview.chips.payment.title}</span>
                    <span className={styles.chipMeta}>{preview.chips.payment.meta}</span>
                  </span>
                </div>
              </motion.div>

              <motion.div
                className={`${styles.chipSlot} ${styles.chipEmailPos}`}
                style={disableScrollMotion ? undefined : { y: chipEmailY }}
                initial={shouldReduceMotion ? false : { opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.55, delay: 0.4, ease: EASE_OUT_EXPO }}
              >
                <div className={`${styles.satelliteChip} ${styles.chipFloatC}`}>
                  <span className={`${styles.chipIcon} ${styles.chipIconPrimary}`}>
                    <MailCheck size={14} strokeWidth={1.8} />
                  </span>
                  <span className={styles.chipText}>
                    <span className={styles.chipTitle}>{preview.chips.email.title}</span>
                    <span className={styles.chipMeta}>{preview.chips.email.meta}</span>
                  </span>
                </div>
              </motion.div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};
