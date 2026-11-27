import { useCallback, useEffect, useRef, useState } from 'react';

export interface HorizontalScrollState {
  hasOverflow: boolean;
  canScrollLeft: boolean;
  canScrollRight: boolean;
  thumbWidthPct: number;
  thumbShiftPct: number;
}

const INITIAL_SCROLL_STATE: HorizontalScrollState = {
  hasOverflow: false,
  canScrollLeft: false,
  canScrollRight: false,
  thumbWidthPct: 100,
  thumbShiftPct: 0,
};

export const useHorizontalScrollIndicator = <T extends HTMLElement = HTMLDivElement>() => {
  const scrollRef = useRef<T | null>(null);
  const [scrollState, setScrollState] = useState<HorizontalScrollState>(INITIAL_SCROLL_STATE);

  const updateScrollState = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;

    const { scrollLeft, scrollWidth, clientWidth } = el;
    const maxScroll = scrollWidth - clientWidth;
    const hasOverflow = maxScroll > 2;
    const canScrollLeft = hasOverflow && scrollLeft > 2;
    const canScrollRight = hasOverflow && scrollLeft < maxScroll - 2;
    const thumbWidthPct = hasOverflow
      ? Math.min(100, Math.max(20, (clientWidth / scrollWidth) * 100))
      : 100;
    const progress = hasOverflow ? Math.min(1, Math.max(0, scrollLeft / maxScroll)) : 0;
    const thumbShiftPct =
      hasOverflow && thumbWidthPct < 100
        ? progress * ((100 - thumbWidthPct) / thumbWidthPct) * 100
        : 0;

    setScrollState((prev) => {
      if (
        prev.hasOverflow === hasOverflow &&
        prev.canScrollLeft === canScrollLeft &&
        prev.canScrollRight === canScrollRight &&
        Math.abs(prev.thumbWidthPct - thumbWidthPct) < 0.25 &&
        Math.abs(prev.thumbShiftPct - thumbShiftPct) < 0.25
      ) {
        return prev;
      }
      return {
        hasOverflow,
        canScrollLeft,
        canScrollRight,
        thumbWidthPct,
        thumbShiftPct,
      };
    });
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;

    const rafId = window.requestAnimationFrame(updateScrollState);
    const observer =
      typeof ResizeObserver !== 'undefined'
        ? new ResizeObserver(updateScrollState)
        : null;
    observer?.observe(el);
    window.addEventListener('resize', updateScrollState);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer?.disconnect();
      window.removeEventListener('resize', updateScrollState);
    };
  }, [updateScrollState]);

  return {
    scrollRef,
    scrollState,
    updateScrollState,
  };
};
