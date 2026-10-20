import React from 'react';
import { ArrowRight, ChevronRight, Loader2, Search } from 'lucide-react';

/* ---------------------------------------------------------------------------
 * Dashboard primitives — the shared SaaS-style building blocks used by the
 * reception workspace (Dashboard, Lab Bay, Check Out, Audit Trail, Settings).
 * Every page is composed from the same header, KPI cards, panels, pills and
 * controls so the whole workspace reads as one product.
 *
 * HOW TO BUILD A PAGE
 *
 *   import { DashboardPage, DashboardHeader, KpiGrid, KpiCard, Panel, Button,
 *            StatusPill, tableClasses as tc } from '../common/Dashboard';
 *
 *   <DashboardPage>
 *     <DashboardHeader
 *       breadcrumb={['Laboratory', 'Cases']}
 *       title="Cases"
 *       description="One-line explanation of the page."
 *       meta={<StatusPill tone="emerald" pulse>Live</StatusPill>}
 *       actions={<Button variant="primary" icon={Plus}>New case</Button>}
 *     />
 *
 *     <KpiGrid label="Case summary">
 *       <KpiCard label="Open cases" value={12} icon={FileText} tone="amber" hint="Across all labs" />
 *       ...up to 4 cards per row
 *     </KpiGrid>
 *
 *     <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
 *       <Panel className="xl:col-span-8" title="Case list" flush>
 *         <table className={tc.table}>
 *           <thead className={tc.thead}><tr><th className={tc.th}>Case</th></tr></thead>
 *           <tbody className={tc.tbody}><tr className={tc.tr}><td className={tc.td}>…</td></tr></tbody>
 *         </table>
 *       </Panel>
 *       <Panel className="xl:col-span-4" title="Side info">…</Panel>
 *     </div>
 *   </DashboardPage>
 *
 * Rules of thumb
 *  - Colours come from `Tone` (amber, sky, emerald, violet, rose, cyan, slate);
 *    pass a tone instead of writing colour classes by hand.
 *  - Use `flush` on a Panel whose body is a table or edge-to-edge list.
 *  - Use `EmptyState` for "nothing here" messages, `SegmentedControl` for tabs,
 *    `SearchInput` for filters, `MeterRow` for progress breakdowns.
 * --------------------------------------------------------------------------- */

export type Tone = 'amber' | 'teal' | 'sky' | 'emerald' | 'violet' | 'rose' | 'cyan' | 'slate';

export const TONE: Record<Tone, { chip: string; text: string; bar: string; soft: string; dot: string }> = {
  amber: {
    chip: 'bg-amber-500/10 text-amber-600 ring-amber-500/20 dark:text-amber-400',
    text: 'text-amber-600 dark:text-amber-400',
    bar: 'bg-amber-500',
    soft: 'bg-amber-500/10',
    dot: 'bg-amber-500',
  },
  teal: {
    chip: 'bg-teal-500/10 text-teal-700 ring-teal-500/20 dark:text-teal-300',
    text: 'text-teal-700 dark:text-teal-300',
    bar: 'bg-teal-400',
    soft: 'bg-teal-500/10',
    dot: 'bg-teal-400',
  },
  sky: {
    chip: 'bg-sky-500/10 text-sky-600 ring-sky-500/20 dark:text-sky-400',
    text: 'text-sky-600 dark:text-sky-400',
    bar: 'bg-sky-500',
    soft: 'bg-sky-500/10',
    dot: 'bg-sky-500',
  },
  emerald: {
    chip: 'bg-emerald-500/10 text-emerald-600 ring-emerald-500/20 dark:text-emerald-400',
    text: 'text-emerald-600 dark:text-emerald-400',
    bar: 'bg-emerald-500',
    soft: 'bg-emerald-500/10',
    dot: 'bg-emerald-500',
  },
  violet: {
    chip: 'bg-violet-500/10 text-violet-600 ring-violet-500/20 dark:text-violet-400',
    text: 'text-violet-600 dark:text-violet-400',
    bar: 'bg-violet-500',
    soft: 'bg-violet-500/10',
    dot: 'bg-violet-500',
  },
  rose: {
    chip: 'bg-rose-500/10 text-rose-600 ring-rose-500/20 dark:text-rose-400',
    text: 'text-rose-600 dark:text-rose-400',
    bar: 'bg-rose-500',
    soft: 'bg-rose-500/10',
    dot: 'bg-rose-500',
  },
  cyan: {
    chip: 'bg-cyan-500/10 text-cyan-600 ring-cyan-500/20 dark:text-cyan-400',
    text: 'text-cyan-600 dark:text-cyan-400',
    bar: 'bg-cyan-500',
    soft: 'bg-cyan-500/10',
    dot: 'bg-cyan-500',
  },
  slate: {
    chip: 'bg-slate-500/10 text-slate-600 ring-slate-500/20 dark:text-slate-300',
    text: 'text-slate-600 dark:text-slate-300',
    bar: 'bg-slate-400',
    soft: 'bg-slate-500/10',
    dot: 'bg-slate-400',
  },
};

type IconType = React.ComponentType<{ className?: string }>;

/* ----------------------------- Page scaffold ----------------------------- */

export const DashboardPage: React.FC<{ children: React.ReactNode; className?: string }> = ({
  children,
  className = '',
}) => <div className={`mx-auto w-full max-w-[1400px] space-y-5 animate-fade-in ${className}`}>{children}</div>;

interface DashboardHeaderProps {
  /** Trail shown above the title, e.g. ['Reception', 'Lab Bay']. The last item is highlighted. */
  breadcrumb?: string[];
  /** Page title. */
  title: React.ReactNode;
  /** One-line explanation under the title. */
  description?: React.ReactNode;
  /** Shown beside the title — usually a `StatusPill`. */
  meta?: React.ReactNode;
  /** Right-aligned controls — usually `Button`s or a `SegmentedControl`. */
  actions?: React.ReactNode;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({ breadcrumb, title, description, meta, actions }) => (
  <header className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between xl:pr-12">
    <div className="min-w-0">
      {breadcrumb && breadcrumb.length > 0 && (
        <nav aria-label="Breadcrumb" className="mb-1.5 flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
          {breadcrumb.map((crumb, i) => (
            <React.Fragment key={crumb}>
              {i > 0 && <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600" />}
              <span className={i === breadcrumb.length - 1 ? 'font-medium text-slate-700 dark:text-slate-200' : ''}>{crumb}</span>
            </React.Fragment>
          ))}
        </nav>
      )}
      <div className="flex flex-wrap items-center gap-2.5">
        <h1 className="text-[23px] font-semibold leading-tight tracking-[-0.022em] text-balance text-slate-900 dark:text-white">{title}</h1>
        {meta}
      </div>
      {description && <p className="mt-1 max-w-2xl text-[13px] text-slate-500 dark:text-slate-400">{description}</p>}
    </div>
    {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
  </header>
);

/* ------------------------------- Buttons -------------------------------- */

type ButtonVariant = 'primary' | 'primaryTeal' | 'secondary' | 'ghost' | 'danger' | 'success';

const BUTTON_VARIANT: Record<ButtonVariant, string> = {
  primary: 'bg-amber-500 text-slate-950 hover:bg-amber-400 shadow-sm shadow-amber-500/20',
  primaryTeal: 'bg-teal-300 text-[#0b3a42] hover:bg-teal-200 shadow-sm shadow-teal-500/20',
  secondary:
    'bg-white text-slate-700 ring-1 ring-inset ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800',
  ghost: 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white',
  danger: 'bg-rose-500/10 text-rose-600 ring-1 ring-inset ring-rose-500/25 hover:bg-rose-500 hover:text-white dark:text-rose-400',
  success:
    'bg-emerald-500/10 text-emerald-700 ring-1 ring-inset ring-emerald-500/25 hover:bg-emerald-500 hover:text-white dark:text-emerald-400',
};

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  /** primary = main call to action, secondary = default, ghost = low emphasis, danger/success = tinted. */
  variant?: ButtonVariant;
  /** xs for table rows, sm for panel footers, md (default) for page headers. */
  size?: 'xs' | 'sm' | 'md';
  /** Optional lucide-react icon shown before the label. */
  icon?: IconType;
  /** Shows a spinner in place of the icon and disables the button while an action runs. */
  loading?: boolean;
}

export const Button: React.FC<ButtonProps> = ({
  variant = 'secondary',
  size = 'md',
  icon: Icon,
  loading = false,
  className = '',
  children,
  type = 'button',
  disabled,
  ...rest
}) => {
  const ShownIcon = loading ? Loader2 : Icon;
  // Every button shrinks slightly when pressed, so a click always gets feedback.
  const sizing =
    size === 'xs'
      ? 'h-7 gap-1 px-2 text-[11px]'
      : size === 'sm'
        ? 'h-8 gap-1.5 px-2.5 text-xs'
        : 'h-9 gap-2 px-3.5 text-[13px]';
  return (
    <button
      type={type}
      className={`inline-flex shrink-0 cursor-pointer items-center justify-center whitespace-nowrap rounded-lg font-medium transition-[color,background-color,box-shadow,transform] duration-150 active:scale-[.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:active:scale-100 motion-reduce:transition-none motion-reduce:active:scale-100 ${sizing} ${BUTTON_VARIANT[variant]} ${className}`}
      disabled={disabled || loading}
      aria-busy={loading || undefined}
      {...rest}
    >
      {ShownIcon && <ShownIcon className={`${size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5'} ${loading ? 'animate-spin' : ''}`} />}
      {children}
    </button>
  );
};

/* -------------------------------- KPIs ---------------------------------- */

/** Cells passed through fragments and conditionals, so the strip knows how many columns it has. */
const countCells = (children: React.ReactNode): number =>
  React.Children.toArray(children).reduce<number>(
    (sum, child) =>
      sum + (React.isValidElement<{ children?: React.ReactNode }>(child) && child.type === React.Fragment ? countCells(child.props.children) : 1),
    0,
  );

/**
 * The stats strip: one bordered box divided into cells, not separate cards. Cells
 * sit side by side from 900px and two to a row below; a lone last cell spans the row.
 */
export const KpiGrid: React.FC<{ children: React.ReactNode; label?: string }> = ({ children, label }) => (
  <section
    aria-label={label}
    style={{ '--kpi-cols': Math.max(countCells(children), 1) } as React.CSSProperties}
    className="grid grid-cols-2 gap-px overflow-hidden rounded-[10px] border border-slate-200 bg-slate-200 min-[900px]:grid-cols-[repeat(var(--kpi-cols),minmax(0,1fr))] dark:border-slate-800 dark:bg-slate-800 [&>*:last-child:nth-child(odd)]:col-span-2 min-[900px]:[&>*:last-child:nth-child(odd)]:col-span-1"
  >
    {children}
  </section>
);

interface KpiCardProps {
  /** Metric name, e.g. "Visitors today". */
  label: string;
  /** The big number (or text such as "2h 15m"). */
  value: React.ReactNode;
  /** Small suffix after the value, e.g. "hrs". */
  unit?: string;
  /** The context line under the value: what the number means. */
  hint?: React.ReactNode;
  /** Small grey icon beside the label. */
  icon: IconType;
  /** Colour of the progress bar only; numbers stay neutral. Defaults to amber. */
  tone?: Tone;
  /**
   * Colours the context line, only when it matters: 'good' is green, 'soon' amber and
   * 'attention' red. Leave it out for neutral information.
   */
  status?: 'good' | 'soon' | 'attention';
  /** 0–100; renders a thin progress bar under the value. */
  progress?: number;
  /** Makes the whole cell open the related page; the label becomes its accessible name. */
  action?: { label: string; onClick: () => void };
}

const KPI_STATUS: Record<NonNullable<KpiCardProps['status']>, string> = {
  good: 'text-emerald-700 dark:text-emerald-400',
  soon: 'text-warning-700 dark:text-warning-300',
  attention: 'text-rose-600 dark:text-rose-400',
};

/** One cell of the stats strip: label, value, context. */
export const KpiCard: React.FC<KpiCardProps> = ({ label, value, unit, hint, icon: Icon, tone = 'amber', status, progress, action }) => {
  const body = (
    <>
      <span className="flex items-center gap-1.5 text-[12.5px] text-slate-500 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5 shrink-0 text-slate-400 dark:text-slate-500" />
        <span className="truncate">{label}</span>
        {action && (
          <ArrowRight className="ml-auto h-3.5 w-3.5 shrink-0 text-slate-300 opacity-0 transition group-hover:translate-x-0.5 group-hover:opacity-100 group-focus-visible:opacity-100 dark:text-slate-600" />
        )}
      </span>
      <span className="mt-1.5 flex items-baseline gap-1">
        <span className="text-[22px] font-semibold leading-tight tracking-[-0.02em] tabular-nums text-slate-900 dark:text-white">{value}</span>
        {unit && <span className="text-xs font-medium text-slate-400">{unit}</span>}
      </span>
      {progress !== undefined && (
        <span className="mt-2 block h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
          <span
            className={`block h-full origin-left rounded-full ${TONE[tone].bar} transition-transform duration-500 motion-reduce:transition-none`}
            style={{ transform: `scaleX(${Math.max(0, Math.min(progress, 100)) / 100})` }}
          />
        </span>
      )}
      {hint && (
        <span className={`mt-1 block truncate text-xs ${status ? `font-medium ${KPI_STATUS[status]}` : 'text-slate-500 dark:text-slate-400'}`}>{hint}</span>
      )}
    </>
  );
  const cell = 'group flex min-w-0 flex-col bg-white px-4 py-3 text-left dark:bg-slate-900';
  return action ? (
    <button
      type="button"
      onClick={action.onClick}
      aria-label={`${label}: ${typeof value === 'string' || typeof value === 'number' ? value : ''}${unit ? ` ${unit}` : ''}. ${action.label}`}
      title={action.label}
      className={`${cell} cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/60`}
    >
      {body}
    </button>
  ) : (
    <div className={cell}>{body}</div>
  );
};

/* -------------------------------- Panels -------------------------------- */

interface PanelProps {
  /** Heading shown in the panel header. */
  title?: React.ReactNode;
  /** Muted line under the title. */
  description?: React.ReactNode;
  /** Optional icon chip beside the title. */
  icon?: IconType;
  /** Colour of the icon chip. Defaults to slate. */
  tone?: Tone;
  /** Right side of the header — search, filters, tabs or buttons. */
  actions?: React.ReactNode;
  /** Muted strip at the bottom — notes or secondary actions. */
  footer?: React.ReactNode;
  /** Remove body padding (for tables and edge-to-edge lists). */
  flush?: boolean;
  className?: string;
  children: React.ReactNode;
}

export const Panel: React.FC<PanelProps> = ({
  title,
  description,
  icon: Icon,
  tone = 'slate',
  actions,
  footer,
  flush,
  className = '',
  children,
}) => (
  // One shell for every section: hairline border, title on the left, actions pushed right.
  <section
    className={`flex flex-col overflow-hidden rounded-[10px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900 ${className}`}
  >
    {(title || actions) && (
      <div
        className={`flex flex-wrap items-center gap-2 px-3.5 pb-2.5 pt-3 ${flush ? 'border-b border-slate-200 dark:border-slate-800' : ''}`}
      >
        <div className="flex min-w-0 items-center gap-2">
          {/* The icon stays quiet; the tone only shows as a faint tint so titles lead. */}
          {Icon && <Icon className={`h-4 w-4 shrink-0 ${tone === 'slate' ? 'text-slate-400' : TONE[tone].text} opacity-80`} />}
          <div className="min-w-0">
            {title && <h2 className="truncate text-[13.5px] font-semibold text-slate-900 dark:text-white">{title}</h2>}
            {description && <p className="truncate text-xs text-slate-500 dark:text-slate-400">{description}</p>}
          </div>
        </div>
        {actions && <div className="ml-auto flex flex-wrap items-center gap-2">{actions}</div>}
      </div>
    )}
    <div className={`flex-1 ${flush ? '' : title || actions ? 'px-3.5 pb-3.5' : 'p-3.5'}`}>{children}</div>
    {footer && (
      <div className="border-t border-slate-200 bg-slate-50/60 px-4 py-2.5 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
        {footer}
      </div>
    )}
  </section>
);

/* ------------------------------ Small parts ----------------------------- */

export const StatusPill: React.FC<{ tone?: Tone; children: React.ReactNode; dot?: boolean; pulse?: boolean }> = ({
  tone = 'slate',
  children,
  dot = true,
  pulse,
}) => (
  // With a dot the pill stays neutral and the dot carries the colour; without one the pill keeps its tint.
  <span
    className={`inline-flex h-5 items-center gap-1.5 whitespace-nowrap rounded-full px-2 text-[11px] font-medium ring-1 ring-inset ${
      dot ? 'bg-white text-slate-700 ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700' : TONE[tone].chip
    }`}
  >
    {dot && <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${TONE[tone].dot} ${pulse ? 'animate-pulse' : ''}`} />}
    {children}
  </span>
);

export const Avatar: React.FC<{ name: string; tone?: Tone; size?: 'sm' | 'md' | 'lg' }> = ({ name, tone = 'slate', size = 'md' }) => {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const sizing = size === 'sm' ? 'h-7 w-7 text-[10px]' : size === 'lg' ? 'h-11 w-11 text-sm' : 'h-9 w-9 text-xs';
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full font-semibold ring-1 ring-inset ${sizing} ${TONE[tone].chip}`}>
      {initials}
    </span>
  );
};

/** The signed-in user's own avatar, filled with the colour they chose in Settings → Profile. */
export const UserAvatar: React.FC<{ name: string; size?: 'sm' | 'md' | 'lg' | 'xl'; className?: string }> = ({ name, size = 'md', className = '' }) => {
  const initials = name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();
  const sizing = size === 'sm' ? 'h-7 w-7 text-[10px]' : size === 'lg' ? 'h-11 w-11 text-sm' : size === 'xl' ? 'h-16 w-16 text-xl' : 'h-9 w-9 text-xs';
  return (
    <span className={`flex shrink-0 items-center justify-center rounded-full bg-[var(--gc-avatar)] font-semibold text-white transition-colors ${sizing} ${className}`}>
      {initials}
    </span>
  );
};

interface SegmentedOption<T extends string> {
  value: T;
  label: string;
  count?: number;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: SegmentedOption<NoInfer<T>>[];
  value: T;
  onChange: (value: NoInfer<T>) => void;
  ariaLabel?: string;
}) {
  return (
    <div
      role="tablist"
      aria-label={ariaLabel}
      className="no-scrollbar inline-flex max-w-full items-center gap-0.5 overflow-x-auto rounded-lg bg-slate-100 p-0.5 dark:bg-slate-950"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          // The selected option is a raised chip on the grey track; the count says what is inside before clicking.
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`inline-flex h-6 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-md px-2.5 text-xs font-medium transition-colors ${
              active
                ? 'bg-white text-slate-900 shadow-[0_1px_2px_rgb(15_23_42/0.08)] ring-1 ring-slate-200 dark:bg-slate-800 dark:text-white dark:ring-slate-700'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {opt.label}
            {opt.count !== undefined && (
              <span className={`text-[11px] tabular-nums ${active ? 'text-slate-500 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'}`}>
                {opt.count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}

export const SearchInput: React.FC<{
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
}> = ({ value, onChange, placeholder = 'Search…', className = 'w-full sm:w-64' }) => (
  <div className={`relative ${className}`}>
    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
    <input
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="h-8 w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 text-xs text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
    />
  </div>
);

export const EmptyState: React.FC<{
  icon: IconType;
  title: string;
  description?: string;
  action?: React.ReactNode;
}> = ({ icon: Icon, title, description, action }) => (
  <div className="flex flex-col items-center justify-center px-4 py-10 text-center">
    <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800 dark:text-slate-500">
      <Icon className="h-5 w-5" />
    </span>
    <div className="mt-3 text-sm font-medium text-slate-900 dark:text-white">{title}</div>
    {description && <p className="mt-1 max-w-sm text-xs text-slate-500 dark:text-slate-400">{description}</p>}
    {action && <div className="mt-4">{action}</div>}
  </div>
);

/** A label/value row used in detail panels. */
export const DetailItem: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</dt>
    <dd className="mt-0.5 truncate text-[13px] font-medium text-slate-900 dark:text-white">{children}</dd>
  </div>
);

/** A labelled horizontal meter, e.g. share of visitors per status. */
export const MeterRow: React.FC<{ label: string; value: number; total: number; tone?: Tone; suffix?: string }> = ({
  label,
  value,
  total,
  tone = 'amber',
  suffix,
}) => {
  const pct = total > 0 ? Math.round((value / total) * 100) : 0;
  return (
    <div>
      <div className="flex items-center justify-between text-xs">
        <span className="flex items-center gap-2 text-slate-600 dark:text-slate-300">
          <span className={`h-2 w-2 rounded-full ${TONE[tone].dot}`} />
          {label}
        </span>
        <span className="tabular-nums text-slate-500 dark:text-slate-400">
          <span className="font-semibold text-slate-900 dark:text-white">{value}</span>
          {suffix ?? ` · ${pct}%`}
        </span>
      </div>
      <div className="mt-1.5 h-1 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
        <div
          className={`h-full origin-left rounded-full ${TONE[tone].bar} transition-transform duration-500 motion-reduce:transition-none`}
          style={{ transform: `scaleX(${pct / 100})` }}
        />
      </div>
    </div>
  );
};

/* ------------------------------- Tables --------------------------------- */

export const tableClasses = {
  // `gc-list` lets Settings → Appearance → Task display tighten the rows.
  table: 'gc-list w-full text-left text-[13px]',
  thead: 'bg-slate-50 dark:bg-slate-950/50',
  th: 'whitespace-nowrap px-4 py-2.5 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400',
  tbody: 'divide-y divide-slate-100 dark:divide-slate-800',
  tr: 'transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40',
  td: 'px-4 py-3 align-middle text-slate-600 dark:text-slate-300',
};
