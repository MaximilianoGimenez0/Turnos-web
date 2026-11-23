import { useEffect, useState } from 'react';

const DEFAULT_MOBILE_OFFSET = 108;
const DEFAULT_DESKTOP_OFFSET = 64;

export interface AdminLayoutMetrics {
  stickyTopOffset: number;
  sidebarLeft: number | null;
  sidebarWidth: number | null;
}

const computeAdminLayoutMetrics = (): AdminLayoutMetrics => {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return {
      stickyTopOffset: DEFAULT_MOBILE_OFFSET,
      sidebarLeft: null,
      sidebarWidth: null,
    };
  }

  let stickyTopOffset =
    window.innerWidth >= 1024 ? DEFAULT_DESKTOP_OFFSET : DEFAULT_MOBILE_OFFSET;

  const tabsEl = document.querySelector<HTMLElement>('[data-admin-sticky-top="tabs"]');
  let foundVisibleTabs = false;

  if (tabsEl) {
    const tabsStyle = window.getComputedStyle(tabsEl);
    if (tabsStyle.display !== 'none' && tabsStyle.visibility !== 'hidden') {
      const stickyTop = Number.parseFloat(tabsStyle.top) || 0;
      const height = tabsEl.getBoundingClientRect().height;
      if (height > 0) {
        stickyTopOffset = Math.round(stickyTop + height);
        foundVisibleTabs = true;
      }
    }
  }

  if (!foundVisibleTabs) {
    const topbarEl = document.querySelector<HTMLElement>('[data-admin-sticky-top="topbar"]');
    if (topbarEl) {
      const wrapperEl = topbarEl.parentElement;
      const wrapperStyle = wrapperEl ? window.getComputedStyle(wrapperEl) : null;
      const borderTop = wrapperStyle ? Number.parseFloat(wrapperStyle.borderTopWidth) || 0 : 0;
      const borderBottom = wrapperStyle
        ? Number.parseFloat(wrapperStyle.borderBottomWidth) || 0
        : 0;
      const height = topbarEl.getBoundingClientRect().height;
      if (height > 0) {
        stickyTopOffset = Math.round(height + borderTop + borderBottom);
      }
    }
  }

  let sidebarLeft: number | null = null;
  let sidebarWidth: number | null = null;
  const sidebarEl = document.querySelector<HTMLElement>('[data-admin-sidebar="true"]');

  if (sidebarEl) {
    const sidebarStyle = window.getComputedStyle(sidebarEl);
    if (sidebarStyle.display !== 'none' && sidebarStyle.visibility !== 'hidden') {
      const rect = sidebarEl.getBoundingClientRect();
      if (rect.width > 0) {
        sidebarLeft = Math.round(rect.left);
        sidebarWidth = Math.round(rect.width);
      }
    }
  }

  return {
    stickyTopOffset,
    sidebarLeft,
    sidebarWidth,
  };
};

export const useAdminLayoutMetrics = (): AdminLayoutMetrics => {
  const [metrics, setMetrics] = useState<AdminLayoutMetrics>(() =>
    computeAdminLayoutMetrics()
  );

  useEffect(() => {
    const updateMetrics = () => {
      const next = computeAdminLayoutMetrics();
      setMetrics((prev) =>
        prev.stickyTopOffset === next.stickyTopOffset &&
        prev.sidebarLeft === next.sidebarLeft &&
        prev.sidebarWidth === next.sidebarWidth
          ? prev
          : next
      );
    };

    const rafId = window.requestAnimationFrame(updateMetrics);

    const observer =
      typeof ResizeObserver !== 'undefined' ? new ResizeObserver(updateMetrics) : null;

    const tabsEl = document.querySelector<HTMLElement>('[data-admin-sticky-top="tabs"]');
    const topbarEl = document.querySelector<HTMLElement>('[data-admin-sticky-top="topbar"]');
    const sidebarEl = document.querySelector<HTMLElement>('[data-admin-sidebar="true"]');

    if (observer) {
      if (tabsEl) observer.observe(tabsEl);
      if (topbarEl) observer.observe(topbarEl);
      if (sidebarEl) observer.observe(sidebarEl);
      observer.observe(document.documentElement);
    }

    window.addEventListener('resize', updateMetrics);

    return () => {
      window.cancelAnimationFrame(rafId);
      observer?.disconnect();
      window.removeEventListener('resize', updateMetrics);
    };
  }, []);

  return metrics;
};
