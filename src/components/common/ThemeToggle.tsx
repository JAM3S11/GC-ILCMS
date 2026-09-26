import React, { useEffect, useRef, useState } from 'react';
import { Check, Monitor, Moon, Sun } from 'lucide-react';
import { ThemeMode, useTheme } from '../../theme/ThemeProvider';

const OPTIONS: { mode: ThemeMode; label: string; hint: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { mode: 'light', label: 'Light', hint: 'Always use the light theme', Icon: Sun },
  { mode: 'system', label: 'System', hint: 'Match your device appearance', Icon: Monitor },
  { mode: 'dark', label: 'Dark', hint: 'Always use the dark theme', Icon: Moon },
];

const MODE_LABEL: Record<ThemeMode, string> = {
  light: 'Light',
  system: 'System',
  dark: 'Dark',
};

interface ThemeToggleProps {
  /**
   * `segmented` — full 3-way Light/System/Dark control (used in the public header).
   * `icon`      — compact single button that cycles, for tight toolbars/headers.
   */
  variant?: 'segmented' | 'icon';
  /**
   * `sm` — compact icon footprint (p-1, ≈24px) for bars like PrototypeToolbar;
   *        for the segmented control both sizes render at h-9 so they align
   *        with the public-header CTA buttons.
   * `md` — standard footprint (p-2, ≈32px) matching Header action buttons.
   * Also scales the segmented control typography.
   */
  size?: 'sm' | 'md';
  /** Only affects the `icon` variant chrome. */
  className?: string;
}

/**
 * Three-way theme control (Light / System / Dark).
 *
 * `system` is a first-class option rather than a fallback: it follows the OS
 * live via `matchMedia`, so no reload is needed when the operating system
 * switches between light and dark.
 */
export const ThemeToggle: React.FC<ThemeToggleProps> = ({ variant = 'segmented', size = 'md', className = '' }) => {
  const { mode, resolvedTheme, setMode, cycleMode } = useTheme();

  if (variant === 'icon') {
    const ActiveIcon = resolvedTheme === 'dark' ? Moon : Sun;
    const pad = size === 'sm' ? 'p-1' : 'p-2';
    return (
      <button
        type="button"
        onClick={cycleMode}
        title={`Theme: ${MODE_LABEL[mode]} (${resolvedTheme}) — click to change`}
        aria-label={`Switch theme. Current: ${MODE_LABEL[mode]}. Resolved: ${resolvedTheme}.`}
        className={`relative inline-flex shrink-0 items-center justify-center rounded-lg ${pad} transition-all active:scale-95 cursor-pointer text-slate-500 hover:text-slate-900 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900/60 ${className}`}
      >
        <ActiveIcon className="w-4 h-4" />
        {mode === 'system' && (
          <span
            className={`absolute rounded-full bg-amber-400 ring-1 ring-white dark:ring-slate-950 ${
              size === 'sm' ? 'bottom-0 right-0 w-1 h-1' : 'bottom-0.5 right-0.5 w-1.5 h-1.5'
            }`}
            aria-hidden="true"
          />
        )}
      </button>
    );
  }

  return <SegmentedThemeToggle size={size} className={className} mode={mode} setMode={setMode} />;
};


/**
 * Segmented control. Kept separate so it can own its dropdown/expanded state
 * without re-rendering the compact icon variant.
 */
const SegmentedThemeToggle: React.FC<{
  mode: ThemeMode;
  setMode: (mode: ThemeMode) => void;
  size: 'sm' | 'md';
  className?: string;
}> = ({ mode, setMode, size, className = '' }) => {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Dismiss the mobile dropdown on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const text = size === 'sm' ? 'text-[11px]' : 'text-[12px]';
  const box = 'h-9';
  const active = OPTIONS.find((o) => o.mode === mode) ?? OPTIONS[1];

  const optionClass = (isActive: boolean) =>
    `inline-flex h-full items-center justify-center gap-1.5 rounded-md font-medium transition-colors cursor-pointer ${
      size === 'sm' ? 'px-2' : 'px-2.5'
    } ${
      isActive
        ? 'bg-slate-900 text-amber-300 border border-amber-500/40 dark:bg-amber-500/15 dark:text-amber-300 dark:border-amber-500/40'
        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-200/70 border border-transparent dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800/70'
    }`;

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      {/* Full 3-way segmented control (md and up) */}
      <div
        role="radiogroup"
        aria-label="Colour theme"
        className={`hidden md:inline-flex items-center gap-0.5 rounded-lg border p-0.5 ${box} bg-white border-slate-300 dark:bg-slate-950/70 dark:border-slate-800 ${text}`}
      >
        {OPTIONS.map(({ mode: optionMode, label, hint, Icon }) => {
          const isActive = mode === optionMode;
          return (
            <button
              key={optionMode}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={label}
              title={hint}
              onClick={() => setMode(optionMode)}
              className={optionClass(isActive)}
            >
              <Icon className="w-3.5 h-3.5" />
            </button>
          );
        })}
      </div>

      {/* Compact dropdown trigger (below md) */}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label={`Colour theme: ${MODE_LABEL[mode]}`}
        className={`md:hidden inline-flex items-center gap-1.5 rounded-lg border px-2.5 font-medium transition-colors cursor-pointer bg-white border-slate-300 text-slate-700 hover:bg-slate-100 dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800 ${box} ${text}`}
      >
        <active.Icon className="w-3.5 h-3.5 text-amber-500 dark:text-amber-400" />
      </button>

      {open && (
        <div
          role="menu"
          className="md:hidden absolute right-0 mt-2 w-44 rounded-xl border shadow-2xl z-50 overflow-hidden p-1 bg-white border-slate-200 dark:bg-slate-900 dark:border-slate-800 animate-scale-in origin-top-right"
        >
          {OPTIONS.map(({ mode: optionMode, label, Icon }) => {
            const isActive = mode === optionMode;
            return (
              <button
                key={optionMode}
                type="button"
                role="menuitemradio"
                aria-checked={isActive}
                onClick={() => {
                  setMode(optionMode);
                  setOpen(false);
                }}
                className={`w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-left text-xs font-medium transition-colors cursor-pointer ${
                  isActive
                    ? 'bg-amber-500/10 text-amber-600 dark:text-amber-300'
                    : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span className="flex-1">{label}</span>
                {isActive && <Check className="w-3.5 h-3.5" />}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
};
