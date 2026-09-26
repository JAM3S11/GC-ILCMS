import React from 'react';

/* ---------------------------------------------------------------------------
 * PageHeader — the single, theme-aware page scaffold used by every internal
 * GC-ILCMS workspace view. It gives each page a consistent, well-structured
 * title band (eyebrow + icon chip + title + subtitle on the left, optional
 * mono tag + action buttons on the right) so every view reads as a real,
 * unified government product page instead of an ad-hoc mockup.
 * --------------------------------------------------------------------------- */

const ACCENT_CHIP: Record<string, string> = {
  amber: 'bg-amber-500/10 text-amber-400 border-amber-500/25',
  emerald: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/25',
  sky: 'bg-sky-500/10 text-sky-400 border-sky-500/25',
  cyan: 'bg-cyan-500/10 text-cyan-400 border-cyan-500/25',
  violet: 'bg-violet-500/10 text-violet-400 border-violet-500/25',
  rose: 'bg-rose-500/10 text-rose-400 border-rose-500/25',
  slate: 'bg-slate-500/10 text-slate-300 border-slate-500/25',
};

interface PageHeaderProps {
  icon: React.ComponentType<{ className?: string }>;
  eyebrow?: string;
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  accent?: keyof typeof ACCENT_CHIP | string;
  tag?: React.ReactNode;
  actions?: React.ReactNode;
  className?: string;
}

/** @deprecated Use `DashboardHeader` (inside `DashboardPage`) from './Dashboard' instead. */
export const PageHeader: React.FC<PageHeaderProps> = ({
  icon: Icon,
  eyebrow,
  title,
  subtitle,
  accent = 'amber',
  tag,
  actions,
  className = '',
}) => {
  const chip = ACCENT_CHIP[accent] ?? ACCENT_CHIP.amber;

  return (
    <div
      className={`p-4 sm:p-5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm gc-shine flex flex-col md:flex-row md:items-center justify-between gap-4 ${className}`}
    >
      <div className="flex items-start gap-3 min-w-0">
        <span className={`p-2 rounded-xl shrink-0 border ${chip}`}>
          <Icon className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          {eyebrow && (
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[9px] font-mono uppercase tracking-[0.18em] text-amber-400">
                {eyebrow}
              </span>
              <span className="h-px flex-1 bg-slate-800/60 hidden sm:block" />
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <h1 className="text-lg font-bold text-slate-900 dark:text-white leading-snug">
              {title}
            </h1>
            {tag && <span className="shrink-0">{tag}</span>}
          </div>
          {subtitle && (
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">{subtitle}</p>
          )}
        </div>
      </div>

      {actions && (
        <div className="flex flex-wrap items-center gap-2 shrink-0">{actions}</div>
      )}
    </div>
  );
};
