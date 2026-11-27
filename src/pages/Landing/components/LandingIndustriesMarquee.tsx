import React, { useRef } from 'react';
import {
  motion,
  useAnimationFrame,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
  useVelocity,
} from 'motion/react';
import { LANDING_TEXTS } from '../../../texts/pages/Landing';
import styles from './LandingIndustriesMarquee.module.css';

const BASE_SPEED_PCT_PER_SEC = -2.2;

export const LandingIndustriesMarquee: React.FC = () => {
  const shouldReduceMotion = useReducedMotion();
  const baseX = useMotionValue(0);
  const directionRef = useRef(-1);

  const { scrollY } = useScroll();
  const scrollVelocity = useVelocity(scrollY);
  const smoothVelocity = useSpring(scrollVelocity, {
    damping: 50,
    stiffness: 350,
  });
  const velocityFactor = useTransform(smoothVelocity, [-1800, 0, 1800], [-3.5, 0, 3.5], {
    clamp: true,
  });

  const x = useTransform(baseX, (val) => `${val}%`);

  useAnimationFrame((_, delta) => {
    if (shouldReduceMotion) return;

    const v = velocityFactor.get();
    if (v < -0.15) {
      directionRef.current = 1;
    } else if (v > 0.15) {
      directionRef.current = -1;
    }

    const moveBy =
      directionRef.current * Math.abs(BASE_SPEED_PCT_PER_SEC) * (delta / 1000) +
      directionRef.current * Math.abs(v) * (delta / 1000) * 1.8;

    let next = baseX.get() + moveBy;
    if (next <= -50) next += 50;
    if (next > 0) next -= 50;
    baseX.set(next);
  });

  const items = LANDING_TEXTS.industries.items;

  return (
    <div className={styles.marqueeBand}>
      <span className={styles.label}>{LANDING_TEXTS.industries.label}</span>

      {shouldReduceMotion ? (
        <div className={styles.staticWrap}>
          {items.map((industry) => (
            <span key={industry} className={styles.pill}>
              {industry}
            </span>
          ))}
        </div>
      ) : (
        <div className={styles.viewport} aria-label={LANDING_TEXTS.industries.label}>
          <motion.div className={styles.track} style={{ x }}>
            {[0, 1].map((dup) => (
              <div key={dup} className={styles.group} aria-hidden={dup === 1}>
                {items.map((industry) => (
                  <span key={`${dup}-${industry}`} className={styles.pill}>
                    {industry}
                  </span>
                ))}
              </div>
            ))}
          </motion.div>
        </div>
      )}
    </div>
  );
};
