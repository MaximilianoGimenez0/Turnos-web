import React, { useEffect, useRef, useState } from 'react';
import { animate, motion, useInView, useReducedMotion } from 'motion/react';
import { EASE_OUT_EXPO } from './motionConfig';

interface MaskedTextLineProps {
  children: React.ReactNode;
  delay?: number;
  className?: string;
}

export const MaskedTextLine: React.FC<MaskedTextLineProps> = ({
  children,
  delay = 0,
  className,
}) => {
  const shouldReduceMotion = useReducedMotion();

  if (shouldReduceMotion) {
    return <span className={className}>{children}</span>;
  }

  return (
    <span
      style={{
        display: 'block',
        overflow: 'hidden',
        paddingBottom: '0.14em',
        marginBottom: '-0.14em',
      }}
    >
      <motion.span
        className={className}
        style={{ display: 'inline-block', willChange: 'transform, clip-path' }}
        initial={{ y: '105%', clipPath: 'inset(0% 0% 100% 0%)' }}
        animate={{ y: '0%', clipPath: 'inset(0% 0% 0% 0%)' }}
        transition={{ duration: 0.72, delay, ease: EASE_OUT_EXPO }}
      >
        {children}
      </motion.span>
    </span>
  );
};

interface AnimatedSvgCheckProps {
  delay?: number;
  size?: number;
}

export const AnimatedSvgCheck: React.FC<AnimatedSvgCheckProps> = ({
  delay = 0,
  size = 14,
}) => {
  const shouldReduceMotion = useReducedMotion();

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 16 16"
      fill="none"
      aria-hidden="true"
    >
      <motion.path
        d="M3.2 8.4L6.4 11.6L12.8 4.8"
        stroke="currentColor"
        strokeWidth="2.1"
        strokeLinecap="round"
        strokeLinejoin="round"
        initial={shouldReduceMotion ? false : { pathLength: 0, opacity: 0.3 }}
        whileInView={{ pathLength: 1, opacity: 1 }}
        viewport={{ once: true, amount: 0.5 }}
        transition={{ duration: 0.42, delay, ease: EASE_OUT_EXPO }}
      />
    </svg>
  );
};

interface AnimatedPriceRollProps {
  target: number;
  className?: string;
}

const formatArsInteger = (value: number): string =>
  Math.round(value).toLocaleString('es-AR');

export const AnimatedPriceRoll: React.FC<AnimatedPriceRollProps> = ({
  target,
  className,
}) => {
  const ref = useRef<HTMLSpanElement | null>(null);
  const isInView = useInView(ref, { once: true, amount: 0.4 });
  const shouldReduceMotion = useReducedMotion();
  const [displayValue, setDisplayValue] = useState(target);

  useEffect(() => {
    if (!isInView || shouldReduceMotion) {
      return;
    }

    const startValue = Math.round(target * 0.65);
    const controls = animate(startValue, target, {
      duration: 0.75,
      ease: EASE_OUT_EXPO,
      onUpdate: (latest) => setDisplayValue(Math.round(latest)),
    });

    return () => {
      controls.stop();
    };
  }, [isInView, shouldReduceMotion, target]);

  return (
    <span ref={ref} className={className}>
      {formatArsInteger(shouldReduceMotion ? target : displayValue)}
    </span>
  );
};
