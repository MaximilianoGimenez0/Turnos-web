import { useCallback, useEffect, useRef, useState } from 'react';
import { areAppearanceConfigsEqual } from '../../../services/themeEngine';
import type { TenantAppearanceConfig } from '../../../types';

export const MAX_APPEARANCE_HISTORY = 40;
export const HISTORY_COALESCE_WINDOW_MS = 350;

export interface AppearanceHistoryState {
  past: TenantAppearanceConfig[];
  present: TenantAppearanceConfig;
  future: TenantAppearanceConfig[];
  lastCoalesceKey: string | null;
  lastTimestampMs: number;
}

export const createInitialAppearanceHistory = (
  initial: TenantAppearanceConfig
): AppearanceHistoryState => ({
  past: [],
  present: initial,
  future: [],
  lastCoalesceKey: null,
  lastTimestampMs: 0,
});

export type AppearanceHistoryAction =
  | {
      type: 'SET';
      next: TenantAppearanceConfig;
      coalesceKey?: string | null;
      timestampMs?: number;
    }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'RESET'; baseline: TenantAppearanceConfig };

export const reduceAppearanceHistory = (
  state: AppearanceHistoryState,
  action: AppearanceHistoryAction
): AppearanceHistoryState => {
  switch (action.type) {
    case 'RESET':
      return createInitialAppearanceHistory(action.baseline);

    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      return {
        past: state.past.slice(0, -1),
        present: previous,
        future: [state.present, ...state.future].slice(0, MAX_APPEARANCE_HISTORY),
        lastCoalesceKey: null,
        lastTimestampMs: 0,
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      return {
        past: [...state.past, state.present].slice(-MAX_APPEARANCE_HISTORY),
        present: next,
        future: state.future.slice(1),
        lastCoalesceKey: null,
        lastTimestampMs: 0,
      };
    }

    case 'SET': {
      if (areAppearanceConfigsEqual(state.present, action.next)) {
        return state;
      }

      const now = action.timestampMs ?? Date.now();
      const key = action.coalesceKey ?? null;
      const shouldCoalesce =
        Boolean(key) &&
        key === state.lastCoalesceKey &&
        now - state.lastTimestampMs <= HISTORY_COALESCE_WINDOW_MS;

      if (shouldCoalesce) {
        return {
          ...state,
          present: action.next,
          future: [],
          lastTimestampMs: now,
        };
      }

      return {
        past: [...state.past, state.present].slice(-MAX_APPEARANCE_HISTORY),
        present: action.next,
        future: [],
        lastCoalesceKey: key,
        lastTimestampMs: now,
      };
    }

    default:
      return state;
  }
};

export interface UseAppearanceHistoryResult {
  draft: TenantAppearanceConfig;
  canUndo: boolean;
  canRedo: boolean;
  pushDraft: (
    updater: (prev: TenantAppearanceConfig) => TenantAppearanceConfig,
    coalesceKey?: string
  ) => void;
  undo: () => void;
  redo: () => void;
  resetHistory: (baseline: TenantAppearanceConfig) => void;
}

export const useAppearanceHistory = (
  baseline: TenantAppearanceConfig,
  onMutate?: () => void
): UseAppearanceHistoryResult => {
  const [history, setHistory] = useState<AppearanceHistoryState>(() =>
    createInitialAppearanceHistory(baseline)
  );
  const lastBaselineRef = useRef<TenantAppearanceConfig>(baseline);

  useEffect(() => {
    if (!areAppearanceConfigsEqual(lastBaselineRef.current, baseline)) {
      lastBaselineRef.current = baseline;
      setHistory(createInitialAppearanceHistory(baseline));
    }
  }, [baseline]);

  const pushDraft = useCallback(
    (
      updater: (prev: TenantAppearanceConfig) => TenantAppearanceConfig,
      coalesceKey?: string
    ) => {
      onMutate?.();
      setHistory((curr) =>
        reduceAppearanceHistory(curr, {
          type: 'SET',
          next: updater(curr.present),
          coalesceKey: coalesceKey ?? null,
          timestampMs: Date.now(),
        })
      );
    },
    [onMutate]
  );

  const undo = useCallback(() => {
    onMutate?.();
    setHistory((curr) => reduceAppearanceHistory(curr, { type: 'UNDO' }));
  }, [onMutate]);

  const redo = useCallback(() => {
    onMutate?.();
    setHistory((curr) => reduceAppearanceHistory(curr, { type: 'REDO' }));
  }, [onMutate]);

  const resetHistory = useCallback((nextBaseline: TenantAppearanceConfig) => {
    lastBaselineRef.current = nextBaseline;
    setHistory(createInitialAppearanceHistory(nextBaseline));
  }, []);

  return {
    draft: history.present,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    pushDraft,
    undo,
    redo,
    resetHistory,
  };
};
