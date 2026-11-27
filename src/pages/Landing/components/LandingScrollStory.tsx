import React, { useMemo, useRef, useState } from 'react';
import {
  motion,
  useMotionValueEvent,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import { Check, CreditCard, MailCheck, ShieldAlert } from 'lucide-react';
import { LANDING_TEXTS } from '../../../texts/pages/Landing';
import { buildQrSvg } from '../../../utils/qrGenerator';
import { EASE_OUT_EXPO, SPRING_SCRUB } from '../motion/motionConfig';
import styles from './LandingScrollStory.module.css';

export const LandingScrollStory: React.FC = () => {
  const trackRef = useRef<HTMLDivElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const [activeAct, setActiveAct] = useState(0);

  const demoQrSvg = useMemo(
    () =>
      buildQrSvg('https://turneado.app/demo', {
        background: '#ffffff',
        moduleColor: '#231c19',
        finderAccentColor: '#9e4f5e',
        label: 'Código QR demo Turneado',
        quietZone: 1,
      }),
    []
  );

  const { scrollYProgress } = useScroll({
    target: trackRef,
    offset: ['start start', 'end end'],
  });

  const progress = useSpring(scrollYProgress, SPRING_SCRUB);

  useMotionValueEvent(progress, 'change', (latest) => {
    const nextAct = latest < 0.34 ? 0 : latest < 0.67 ? 1 : 2;
    setActiveAct((prev) => (prev === nextAct ? prev : nextAct));
  });

  const handleJumpToAct = (index: number) => {
    const el = trackRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const docTop = window.scrollY + rect.top;
    const scrollable = Math.max(1, el.offsetHeight - window.innerHeight);
    const targetRatios = [0.06, 0.5, 0.94];
    window.scrollTo({
      top: docTop + scrollable * targetRatios[index],
      behavior: shouldReduceMotion ? 'auto' : 'smooth',
    });
  };

  // Continuous Act 1 transforms (0.00 -> 0.36)
  const act1Opacity = useTransform(progress, [0, 0.27, 0.36], [1, 1, 0]);
  const act1Y = useTransform(progress, [0, 0.27, 0.36], [0, 0, -42]);
  const act1Scale = useTransform(progress, [0, 0.27, 0.36], [1, 1, 0.93]);
  const act1RotateX = useTransform(progress, [0.24, 0.36], [0, 9]);
  const act1BeamLength = useTransform(progress, [0.02, 0.2], [0.25, 1]);
  const act1MpScale = useTransform(progress, [0.1, 0.24], [0.96, 1]);

  // Continuous Act 2 transforms (0.28 -> 0.72) — Fanned IG Plate + Real QR Card
  const act2Opacity = useTransform(progress, [0.28, 0.38, 0.62, 0.72], [0, 1, 1, 0]);
  const act2Scale = useTransform(progress, [0.28, 0.38, 0.62, 0.72], [0.91, 1, 1, 0.93]);
  const act2RotateX = useTransform(progress, [0.28, 0.38, 0.62, 0.72], [-8, 0, 0, 8]);
  const igCardX = useTransform(progress, [0.3, 0.52], [38, -4]);
  const igCardRotate = useTransform(progress, [0.3, 0.52], [0, -3.5]);
  const qrCardX = useTransform(progress, [0.3, 0.52], [-38, 4]);
  const qrCardRotate = useTransform(progress, [0.3, 0.52], [0, 3.5]);

  // Continuous Act 3 transforms (0.62 -> 1.00) — Lock Ring -> Confirm + Anti-conflict + SES
  const act3Opacity = useTransform(progress, [0.62, 0.73, 1], [0, 1, 1]);
  const act3Y = useTransform(progress, [0.62, 0.74], [42, 0]);
  const act3Scale = useTransform(progress, [0.62, 0.74], [0.92, 1]);
  const act3RotateX = useTransform(progress, [0.62, 0.74], [-8, 0]);
  const lockRingLength = useTransform(progress, [0.68, 0.84], [0.15, 1]);
  const lockBadgeOpacity = useTransform(progress, [0.77, 0.82], [1, 0]);
  const confirmBadgeOpacity = useTransform(progress, [0.79, 0.85], [0, 1]);
  const conflictOpacity = useTransform(progress, [0.76, 0.86], [1, 0.62]);
  const conflictX = useTransform(progress, [0.76, 0.86], [0, 8]);
  const sesOpacity = useTransform(progress, [0.82, 0.93], [0, 1]);
  const sesY = useTransform(progress, [0.82, 0.93], [20, 0]);

  const [step1, step2, step3] = LANDING_TEXTS.howItWorks.steps;

  const renderStaticActVisual = (index: number) => {
    if (index === 0) {
      return (
        <div className={styles.mobileActVisual}>
          <div className={styles.sceneTopRow}>
            <span className={styles.sceneTitle}>{step1.sceneHeader}</span>
            <span className={styles.sceneUrlBadge}>{step1.sceneUrl}</span>
          </div>
          <div className={styles.servicesDeck}>
            {step1.services.map((srv) => (
              <div key={srv.name} className={styles.serviceItem}>
                <div className={styles.serviceLeft}>
                  <span className={styles.serviceName}>{srv.name}</span>
                  <span className={styles.serviceDur}>{srv.duration}</span>
                </div>
                <span className={styles.serviceDeposit}>{srv.deposit}</span>
              </div>
            ))}
          </div>
          <div className={styles.mpConnectedCard}>
            <div className={styles.mpConnectedLeft}>
              <span className={styles.mpIconWrap}>
                <CreditCard size={17} strokeWidth={1.8} />
              </span>
              <div>
                <span className={styles.mpTitle}>{step1.mpNodeTitle}</span>
                <span className={styles.mpMeta}>{step1.mpNodeMeta}</span>
              </div>
            </div>
            <Check size={18} strokeWidth={2.2} />
          </div>
        </div>
      );
    }

    if (index === 1) {
      return (
        <div className={styles.mobileActVisual}>
          <div className={styles.fanDeck}>
            <div className={styles.igStoryCard}>
              <div className={styles.igHeader}>
                <span className={styles.igMonth}>{step2.igMonth}</span>
                <span className={styles.igHeading}>{step2.igTitle}</span>
              </div>
              <div className={styles.igRowList}>
                {step2.igRows.map((row) => (
                  <div key={row.day} className={styles.igRowPill}>
                    <span className={styles.igRowDate}>
                      <span className={styles.igRowDay}>{row.day}</span>
                      <span className={styles.igRowWd}>{row.wd}</span>
                    </span>
                    <span className={styles.igRowTimes}>{row.times}</span>
                  </div>
                ))}
              </div>
              <span className={styles.igFooterCta}>{step2.igFooter}</span>
            </div>

            <div className={styles.qrBizCard}>
              <div
                className={styles.qrSvgFrame}
                dangerouslySetInnerHTML={{ __html: demoQrSvg }}
              />
              <span className={styles.qrCardName}>{step2.qrCardTitle}</span>
              <span className={styles.qrCardSub}>{step2.qrCardSubtitle}</span>
              <span className={styles.qrCardUrl}>{step2.qrCardUrl}</span>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className={styles.mobileActVisual}>
        <div className={styles.slotStatusCard}>
          <div className={styles.slotMainInfo}>
            <span className={styles.ringWrap}>
              <Check size={18} strokeWidth={2.2} />
            </span>
            <div>
              <div className={styles.slotBigTime}>{step3.primarySlot.time}</div>
              <div className={styles.slotServiceSub}>{step3.primarySlot.service}</div>
            </div>
          </div>
          <span className={`${styles.statePillStatic} ${styles.statePillConfirmed}`}>
            {step3.primarySlot.confirmedLabel}
          </span>
        </div>

        <div className={styles.conflictSlotCard}>
          <div>
            <div className={styles.serviceName}>{step3.conflictSlot.time}</div>
            <div className={styles.serviceDur}>{step3.conflictSlot.service}</div>
          </div>
          <span className={styles.conflictBadge}>
            <ShieldAlert size={13} strokeWidth={2} />
            <span>{step3.conflictSlot.badge}</span>
          </span>
        </div>

        <div className={styles.sesReceiptCard}>
          <span className={styles.sesIconBox}>
            <MailCheck size={17} strokeWidth={1.8} />
          </span>
          <div>
            <span className={styles.sesTitle}>{step3.emailCard.title}</span>
            <span className={styles.sesMeta}>{step3.emailCard.meta}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <section className={styles.storySection}>
      <motion.div
        className={styles.sectionHeader}
        initial={shouldReduceMotion ? false : { opacity: 0.4, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
      >
        <h2 className={styles.sectionTitle}>{LANDING_TEXTS.howItWorks.title}</h2>
        <p className={styles.sectionSubtitle}>{LANDING_TEXTS.howItWorks.subtitle}</p>
      </motion.div>

      {shouldReduceMotion ? (
        <div className={styles.reducedTrack}>
          {LANDING_TEXTS.howItWorks.steps.map((step, index) => (
            <article key={step.number} className={styles.mobileActCard}>
              <div className={styles.railStepTop}>
                <span className={styles.railStepNum}>{step.number}</span>
              </div>
              <h3 className={styles.railStepTitle}>{step.title}</h3>
              <p className={styles.railStepDesc}>{step.description}</p>
              {renderStaticActVisual(index)}
            </article>
          ))}
        </div>
      ) : (
        <>
          {/* Desktop Continuous Scroll-Scrubbed Sticky Stage */}
          <div ref={trackRef} className={styles.desktopTrack}>
            <div className={styles.stickyFrame}>
              <div className={styles.railColumn}>
                <svg className={styles.spineSvg} viewBox="0 0 4 300" preserveAspectRatio="none" aria-hidden="true">
                  <line
                    x1="2"
                    y1="0"
                    x2="2"
                    y2="300"
                    stroke="var(--border-subtle)"
                    strokeWidth="2"
                    strokeLinecap="round"
                  />
                  <motion.line
                    x1="2"
                    y1="0"
                    x2="2"
                    y2="300"
                    stroke="var(--color-primary)"
                    strokeWidth="3"
                    strokeLinecap="round"
                    style={{ pathLength: progress }}
                  />
                </svg>

                {LANDING_TEXTS.howItWorks.steps.map((step, index) => {
                  const isActive = activeAct === index;
                  return (
                    <button
                      key={step.number}
                      type="button"
                      className={`${styles.railStepBtn} ${isActive ? styles.railStepActive : ''}`}
                      onClick={() => handleJumpToAct(index)}
                      aria-current={isActive ? 'step' : undefined}
                    >
                      <div className={styles.railStepTop}>
                        <span className={styles.railStepNum}>{step.number}</span>
                        <span className={styles.railStepPill}>{step.sceneStatus}</span>
                      </div>
                      <h3 className={styles.railStepTitle}>{step.title}</h3>
                      <p className={styles.railStepDesc}>{step.description}</p>
                    </button>
                  );
                })}
              </div>

              <div className={styles.stageColumn} aria-hidden="true">
                <div className={styles.stageShell}>
                  <div className={styles.stageBar}>
                    <div className={styles.stageProgressTrack}>
                      <motion.div
                        className={styles.stageProgressFill}
                        style={{ scaleX: progress }}
                      />
                    </div>
                    <span className={styles.stageActTag}>
                      0{activeAct + 1} / 03
                    </span>
                  </div>

                  <div className={styles.stageViewport}>
                    {/* Act 1: Setup & Mercado Pago SVG beam */}
                    <motion.div
                      className={styles.sceneLayer}
                      style={{
                        opacity: act1Opacity,
                        y: act1Y,
                        scale: act1Scale,
                        rotateX: act1RotateX,
                        pointerEvents: activeAct === 0 ? 'auto' : 'none',
                      }}
                    >
                      <div className={styles.sceneTopRow}>
                        <span className={styles.sceneTitle}>{step1.sceneHeader}</span>
                        <span className={styles.sceneUrlBadge}>{step1.sceneUrl}</span>
                      </div>

                      <div className={styles.servicesDeck}>
                        {step1.services.map((srv) => (
                          <div key={srv.name} className={styles.serviceItem}>
                            <div className={styles.serviceLeft}>
                              <span className={styles.serviceName}>{srv.name}</span>
                              <span className={styles.serviceDur}>{srv.duration}</span>
                            </div>
                            <span className={styles.serviceDeposit}>{srv.deposit}</span>
                          </div>
                        ))}
                      </div>

                      <div className={styles.beamConnector}>
                        <svg width="24" height="28" viewBox="0 0 24 28" fill="none">
                          <path
                            d="M12 0V24"
                            stroke="var(--border-medium)"
                            strokeWidth="2"
                            strokeDasharray="3 3"
                          />
                          <motion.path
                            d="M12 0V24M6 18L12 24L18 18"
                            stroke="var(--color-primary)"
                            strokeWidth="2.2"
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            style={{ pathLength: act1BeamLength }}
                          />
                        </svg>
                      </div>

                      <motion.div
                        className={styles.mpConnectedCard}
                        style={{ scale: act1MpScale }}
                      >
                        <div className={styles.mpConnectedLeft}>
                          <span className={styles.mpIconWrap}>
                            <CreditCard size={17} strokeWidth={1.8} />
                          </span>
                          <div>
                            <span className={styles.mpTitle}>{step1.mpNodeTitle}</span>
                            <span className={styles.mpMeta}>{step1.mpNodeMeta}</span>
                          </div>
                        </div>
                        <Check size={18} strokeWidth={2.3} />
                      </motion.div>
                    </motion.div>

                    {/* Act 2: Fanned Instagram Plate + Real Scannable QR Card */}
                    <motion.div
                      className={styles.sceneLayer}
                      style={{
                        opacity: act2Opacity,
                        scale: act2Scale,
                        rotateX: act2RotateX,
                        pointerEvents: activeAct === 1 ? 'auto' : 'none',
                      }}
                    >
                      <div className={styles.sceneTopRow}>
                        <span className={styles.sceneTitle}>{step2.sceneHeader}</span>
                        <span className={styles.sceneUrlBadge}>{step2.sceneStatus}</span>
                      </div>

                      <div className={styles.fanDeck}>
                        <motion.div
                          className={styles.igStoryCard}
                          style={{ x: igCardX, rotate: igCardRotate }}
                        >
                          <div className={styles.igHeader}>
                            <span className={styles.igMonth}>{step2.igMonth}</span>
                            <span className={styles.igHeading}>{step2.igTitle}</span>
                          </div>
                          <div className={styles.igRowList}>
                            {step2.igRows.map((row) => (
                              <div key={row.day} className={styles.igRowPill}>
                                <span className={styles.igRowDate}>
                                  <span className={styles.igRowDay}>{row.day}</span>
                                  <span className={styles.igRowWd}>{row.wd}</span>
                                </span>
                                <span className={styles.igRowTimes}>{row.times}</span>
                              </div>
                            ))}
                          </div>
                          <span className={styles.igFooterCta}>{step2.igFooter}</span>
                        </motion.div>

                        <motion.div
                          className={styles.qrBizCard}
                          style={{ x: qrCardX, rotate: qrCardRotate }}
                        >
                          <div
                            className={styles.qrSvgFrame}
                            dangerouslySetInnerHTML={{ __html: demoQrSvg }}
                          />
                          <span className={styles.qrCardName}>{step2.qrCardTitle}</span>
                          <span className={styles.qrCardSub}>{step2.qrCardSubtitle}</span>
                          <span className={styles.qrCardUrl}>{step2.qrCardUrl}</span>
                        </motion.div>
                      </div>
                    </motion.div>

                    {/* Act 3: Lock Ring -> Confirmed + Anti-conflict + SES */}
                    <motion.div
                      className={styles.sceneLayer}
                      style={{
                        opacity: act3Opacity,
                        y: act3Y,
                        scale: act3Scale,
                        rotateX: act3RotateX,
                        pointerEvents: activeAct === 2 ? 'auto' : 'none',
                      }}
                    >
                      <div className={styles.sceneTopRow}>
                        <span className={styles.sceneTitle}>{step3.sceneHeader}</span>
                        <span className={styles.sceneUrlBadge}>{step3.sceneStatus}</span>
                      </div>

                      <div className={styles.slotStatusCard}>
                        <div className={styles.slotMainInfo}>
                          <span className={styles.ringWrap}>
                            <svg className={styles.ringSvg} width="44" height="44" viewBox="0 0 44 44">
                              <circle
                                cx="22"
                                cy="22"
                                r="19"
                                fill="none"
                                stroke="var(--border-subtle)"
                                strokeWidth="3"
                              />
                              <motion.circle
                                cx="22"
                                cy="22"
                                r="19"
                                fill="none"
                                stroke="var(--color-primary)"
                                strokeWidth="3"
                                strokeLinecap="round"
                                style={{ pathLength: lockRingLength }}
                              />
                            </svg>
                            <Check size={17} strokeWidth={2.2} />
                          </span>
                          <div>
                            <div className={styles.slotBigTime}>{step3.primarySlot.time}</div>
                            <div className={styles.slotServiceSub}>
                              {step3.primarySlot.service}
                            </div>
                          </div>
                        </div>

                        <div className={styles.statePillSlot}>
                          <motion.span
                            className={`${styles.statePillLayer} ${styles.statePillLock}`}
                            style={{ opacity: lockBadgeOpacity }}
                          >
                            {step3.primarySlot.lockingLabel}
                          </motion.span>
                          <motion.span
                            className={`${styles.statePillLayer} ${styles.statePillConfirmed}`}
                            style={{ opacity: confirmBadgeOpacity }}
                          >
                            {step3.primarySlot.confirmedLabel}
                          </motion.span>
                        </div>
                      </div>

                      <motion.div
                        className={styles.conflictSlotCard}
                        style={{ opacity: conflictOpacity, x: conflictX }}
                      >
                        <div>
                          <div className={styles.serviceName}>{step3.conflictSlot.time}</div>
                          <div className={styles.serviceDur}>{step3.conflictSlot.service}</div>
                        </div>
                        <span className={styles.conflictBadge}>
                          <ShieldAlert size={13} strokeWidth={2} />
                          <span>{step3.conflictSlot.badge}</span>
                        </span>
                      </motion.div>

                      <motion.div
                        className={styles.sesReceiptCard}
                        style={{ opacity: sesOpacity, y: sesY }}
                      >
                        <span className={styles.sesIconBox}>
                          <MailCheck size={17} strokeWidth={1.8} />
                        </span>
                        <div>
                          <span className={styles.sesTitle}>{step3.emailCard.title}</span>
                          <span className={styles.sesMeta}>{step3.emailCard.meta}</span>
                        </div>
                      </motion.div>
                    </motion.div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Mobile Viewport-Scrubbed Stack */}
          <div className={styles.mobileStack}>
            {LANDING_TEXTS.howItWorks.steps.map((step, index) => (
              <motion.article
                key={step.number}
                className={styles.mobileActCard}
                initial={{ opacity: 0.4, y: 24, scale: 0.97 }}
                whileInView={{ opacity: 1, y: 0, scale: 1 }}
                viewport={{ once: true, amount: 0.22 }}
                transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
              >
                <div className={styles.railStepTop}>
                  <span className={styles.railStepNum}>{step.number}</span>
                  <span className={styles.sceneUrlBadge}>{step.sceneStatus}</span>
                </div>
                <h3 className={styles.railStepTitle}>{step.title}</h3>
                <p className={styles.railStepDesc}>{step.description}</p>
                {renderStaticActVisual(index)}
              </motion.article>
            ))}
          </div>
        </>
      )}
    </section>
  );
};
