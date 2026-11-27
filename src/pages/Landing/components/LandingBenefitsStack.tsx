import React, { useRef, useState } from 'react';
import {
  motion,
  type MotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'motion/react';
import {
  ArrowRight,
  CalendarCheck2,
  CreditCard,
  Image as ImageIcon,
  MailCheck,
  Palette,
  QrCode,
} from 'lucide-react';
import { LANDING_TEXTS } from '../../../texts/pages/Landing';
import { EASE_OUT_EXPO, SPRING_SCRUB } from '../motion/motionConfig';
import { useIsCompactViewport } from '../motion/useIsCompactViewport';
import styles from './LandingBenefitsStack.module.css';

const AUTO_ICONS = [MailCheck, ImageIcon, QrCode] as const;

interface StackCardProps {
  index: number;
  total: number;
  progress: MotionValue<number>;
  disableScale: boolean;
  shouldReduceMotion: boolean | null;
  children: React.ReactNode;
}

const StackCardShell: React.FC<StackCardProps> = ({
  index,
  total,
  progress,
  disableScale,
  shouldReduceMotion,
  children,
}) => {
  const rangeStart = index / total;
  const targetScale = 1 - (total - 1 - index) * 0.04;
  const scale = useTransform(progress, [rangeStart, 1], [1, targetScale]);
  const topPx = 94 + index * 22;

  return (
    <motion.div
      className={styles.cardWrapper}
      style={
        {
          '--stack-top': `${topPx}px`,
          zIndex: index + 1,
          scale: disableScale ? 1 : scale,
        } as React.CSSProperties
      }
      initial={shouldReduceMotion ? false : { opacity: 0.45, y: 20 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.48, ease: EASE_OUT_EXPO }}
    >
      {children}
    </motion.div>
  );
};

export const LandingBenefitsStack: React.FC = () => {
  const stackRef = useRef<HTMLDivElement | null>(null);
  const shouldReduceMotion = useReducedMotion();
  const isCompact = useIsCompactViewport(880);
  const disableScale = Boolean(shouldReduceMotion) || isCompact;
  const [selectedPaletteIdx, setSelectedPaletteIdx] = useState(0);

  const { scrollYProgress } = useScroll({
    target: stackRef,
    offset: ['start start', 'end end'],
  });
  const smoothProgress = useSpring(scrollYProgress, SPRING_SCRUB);

  const [mpPillar, agendaPillar, brandingPillar, autoPillar] = LANDING_TEXTS.benefits.items;
  const activeSwatch = brandingPillar.visual.palettes[selectedPaletteIdx];
  const isNoirSwatch = activeSwatch.name === 'Noir';

  return (
    <section className={styles.section}>
      <motion.div
        className={styles.header}
        initial={shouldReduceMotion ? false : { opacity: 0.4, y: 18 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, amount: 0.25 }}
        transition={{ duration: 0.5, ease: EASE_OUT_EXPO }}
      >
        <h2 className={styles.title}>{LANDING_TEXTS.benefits.title}</h2>
        <p className={styles.subtitle}>{LANDING_TEXTS.benefits.subtitle}</p>
      </motion.div>

      <div ref={stackRef} className={styles.stackTrack}>
        {/* 01: Direct Mercado Pago */}
        <StackCardShell
          index={0}
          total={4}
          progress={smoothProgress}
          disableScale={disableScale}
          shouldReduceMotion={shouldReduceMotion}
        >
          <article className={styles.card}>
            <div className={styles.copyCol}>
              <div className={styles.topMeta}>
                <span className={styles.iconBox} aria-hidden="true">
                  <CreditCard size={20} strokeWidth={1.75} />
                </span>
                <span className={styles.cardIndex}>{mpPillar.number}</span>
              </div>
              <h3 className={styles.cardTitle}>{mpPillar.title}</h3>
              <p className={styles.cardDesc}>{mpPillar.description}</p>
            </div>

            <div className={styles.visualCol} aria-hidden="true">
              <div className={styles.flowRow}>
                <span className={styles.flowNode}>{mpPillar.visual.fromLabel}</span>
                <ArrowRight size={15} className={styles.flowArrow} />
                <span className={styles.flowNode}>{mpPillar.visual.midLabel}</span>
                <ArrowRight size={15} className={styles.flowArrow} />
                <span className={`${styles.flowNode} ${styles.flowNodeAccent}`}>
                  {mpPillar.visual.toLabel}
                </span>
              </div>
              <div className={styles.metricStrip}>
                <span className={styles.metricValue}>{mpPillar.visual.metricValue}</span>
                <span className={styles.metricLabel}>{mpPillar.visual.metricLabel}</span>
              </div>
            </div>
          </article>
        </StackCardShell>

        {/* 02: Anti-conflict Agenda */}
        <StackCardShell
          index={1}
          total={4}
          progress={smoothProgress}
          disableScale={disableScale}
          shouldReduceMotion={shouldReduceMotion}
        >
          <article className={styles.card}>
            <div className={styles.copyCol}>
              <div className={styles.topMeta}>
                <span className={styles.iconBox} aria-hidden="true">
                  <CalendarCheck2 size={20} strokeWidth={1.75} />
                </span>
                <span className={styles.cardIndex}>{agendaPillar.number}</span>
              </div>
              <h3 className={styles.cardTitle}>{agendaPillar.title}</h3>
              <p className={styles.cardDesc}>{agendaPillar.description}</p>
            </div>

            <div className={styles.visualCol} aria-hidden="true">
              <div className={styles.agendaRows}>
                {agendaPillar.visual.rows.map((row) => (
                  <div
                    key={row.time}
                    className={`${styles.agendaRow} ${
                      row.state === 'conflict' ? styles.agendaRowConflict : ''
                    }`}
                  >
                    <span className={styles.agendaLeft}>
                      <span className={styles.agendaTime}>{row.time}</span>
                      <span className={styles.agendaLabel}>{row.label}</span>
                    </span>
                    <span
                      className={
                        row.state === 'confirmed'
                          ? styles.tagConfirmed
                          : row.state === 'conflict'
                            ? styles.tagConflict
                            : styles.tagAvailable
                      }
                    >
                      {row.tag}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </article>
        </StackCardShell>

        {/* 03: Live Interactive Branding */}
        <StackCardShell
          index={2}
          total={4}
          progress={smoothProgress}
          disableScale={disableScale}
          shouldReduceMotion={shouldReduceMotion}
        >
          <article className={styles.card}>
            <div className={styles.copyCol}>
              <div className={styles.topMeta}>
                <span className={styles.iconBox} aria-hidden="true">
                  <Palette size={20} strokeWidth={1.75} />
                </span>
                <span className={styles.cardIndex}>{brandingPillar.number}</span>
              </div>
              <h3 className={styles.cardTitle}>{brandingPillar.title}</h3>
              <p className={styles.cardDesc}>{brandingPillar.description}</p>
            </div>

            <div className={styles.visualCol}>
              <div
                className={styles.themeMiniCard}
                style={{
                  backgroundColor: activeSwatch.bg,
                  color: isNoirSwatch ? '#f5ede3' : '#231c19',
                  borderColor: `${activeSwatch.primary}55`,
                }}
              >
                <div className={styles.themeMiniTop}>
                  <span className={styles.themeMiniBrand}>
                    {brandingPillar.visual.previewName}
                  </span>
                  <span
                    className={styles.themeMiniBtn}
                    style={{ backgroundColor: activeSwatch.primary }}
                  >
                    Reservar
                  </span>
                </div>
                <span className={styles.themeMiniSub}>
                  {brandingPillar.visual.previewSub}
                </span>
              </div>

              <div className={styles.swatchRow} role="group" aria-label="Vista previa de paletas">
                {brandingPillar.visual.palettes.map((pal, idx) => (
                  <button
                    key={pal.name}
                    type="button"
                    className={`${styles.swatchBtn} ${
                      selectedPaletteIdx === idx ? styles.swatchBtnActive : ''
                    }`}
                    onClick={() => setSelectedPaletteIdx(idx)}
                  >
                    <span
                      className={styles.swatchDot}
                      style={{ backgroundColor: pal.primary }}
                      aria-hidden="true"
                    />
                    <span>{pal.name}</span>
                  </button>
                ))}
              </div>
            </div>
          </article>
        </StackCardShell>

        {/* 04: Automated Emails & Diffusion */}
        <StackCardShell
          index={3}
          total={4}
          progress={smoothProgress}
          disableScale={disableScale}
          shouldReduceMotion={shouldReduceMotion}
        >
          <article className={styles.card}>
            <div className={styles.copyCol}>
              <div className={styles.topMeta}>
                <span className={styles.iconBox} aria-hidden="true">
                  <MailCheck size={20} strokeWidth={1.75} />
                </span>
                <span className={styles.cardIndex}>{autoPillar.number}</span>
              </div>
              <h3 className={styles.cardTitle}>{autoPillar.title}</h3>
              <p className={styles.cardDesc}>{autoPillar.description}</p>
            </div>

            <div className={styles.visualCol} aria-hidden="true">
              <div className={styles.autoList}>
                {autoPillar.visual.items.map((item, idx) => {
                  const ItemIcon = AUTO_ICONS[idx] ?? MailCheck;
                  return (
                    <div key={item.title} className={styles.autoItem}>
                      <span className={styles.autoIcon}>
                        <ItemIcon size={15} strokeWidth={1.9} />
                      </span>
                      <div>
                        <span className={styles.autoTitle}>{item.title}</span>
                        <span className={styles.autoDetail}>{item.detail}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </article>
        </StackCardShell>
      </div>
    </section>
  );
};
