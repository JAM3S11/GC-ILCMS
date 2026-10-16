import { useCallback, useEffect, useState } from 'react';

const STORAGE_PREFIX = 'gc-ilcms-sidebar-folds:';

/** Which sidebar groups and sub-menus are open, keyed by group title or item id. */
type Folds = Record<string, boolean>;

const readFolds = (userId: string): Folds => {
  try {
    const stored = window.localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (!stored) return {};
    const parsed: unknown = JSON.parse(stored);
    if (!parsed || typeof parsed !== 'object') return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter((entry): entry is [string, boolean] => typeof entry[1] === 'boolean'),
    );
  } catch {
    return {};
  }
};

const writeFolds = (userId: string, folds: Folds) => {
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(folds));
  } catch {
    return;
  }
};

export type SidebarFolds = {
  isOpen: (id: string, fallback?: boolean) => boolean;
  setOpen: (id: string, open: boolean) => void;
};

/**
 * Remembers, per user and per browser, which sidebar sections were folded away,
 * so the sidebar looks the same on the next visit. Storage is a convenience
 * only: when it is unavailable every section simply starts open.
 */
export const useSidebarFolds = (userId: string): SidebarFolds => {
  const [folds, setFolds] = useState<Folds>(() => readFolds(userId));

  // A different user signed in on this browser: load their own layout.
  useEffect(() => setFolds(readFolds(userId)), [userId]);

  const isOpen = useCallback((id: string, fallback = true) => folds[id] ?? fallback, [folds]);

  const setOpen = useCallback((id: string, open: boolean) => {
    setFolds((previous) => {
      const next = { ...previous, [id]: open };
      writeFolds(userId, next);
      return next;
    });
  }, [userId]);

  return { isOpen, setOpen };
};
