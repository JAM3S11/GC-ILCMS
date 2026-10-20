import React from 'react';
import { LucideIcon, Search, X } from 'lucide-react';
import { TONE, Tone } from '../../common/Dashboard';

/* ---------------------------------------------------------------------------
 * Building blocks for the Exhibit Laboratory workspace. Surfaces are see-through:
 * they take the page's own background and show only borders, outlines and a light
 * hover tint, so the exhibit data is what stands out.
 * --------------------------------------------------------------------------- */

const buttonBase =
  'inline-flex shrink-0 cursor-pointer items-center justify-center gap-1.5 rounded-lg border font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-500/40 disabled:cursor-not-allowed disabled:opacity-50';
const buttonSize = { xs: 'h-7 px-2.5 text-xs', sm: 'h-8 px-3 text-xs', md: 'h-9 px-3.5 text-[13px]' };
const buttonTone = {
  /** The page's one main action. */
  accent: 'border-teal-500/70 text-teal-700 hover:border-teal-500 hover:bg-teal-500/[0.06] dark:text-teal-300',
  default: 'border-slate-300 text-slate-700 hover:border-slate-400 hover:bg-slate-500/[0.05] dark:border-slate-700 dark:text-slate-200 dark:hover:border-slate-500',
  danger: 'border-rose-300 text-rose-700 hover:border-rose-400 hover:bg-rose-500/[0.05] dark:border-rose-900 dark:text-rose-300',
  ghost: 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-800 dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-slate-100',
};

export const OutlineButton: React.FC<
  React.ButtonHTMLAttributes<HTMLButtonElement> & { icon?: LucideIcon; size?: keyof typeof buttonSize; tone?: keyof typeof buttonTone }
> = ({ icon: Icon, size = 'sm', tone = 'default', className = '', children, type = 'button', ...rest }) => (
  <button type={type} className={`${buttonBase} ${buttonSize[size]} ${buttonTone[tone]} ${className}`} {...rest}>
    {Icon && <Icon className={size === 'xs' ? 'h-3.5 w-3.5' : 'h-4 w-4'} />}
    {children}
  </button>
);

/** A status as a small coloured dot and plain text, never a filled pill. */
export const StatusText: React.FC<{ tone: Tone; children: React.ReactNode }> = ({ tone, children }) => (
  <span className="inline-flex items-center gap-1.5 whitespace-nowrap text-[13px] text-slate-700 dark:text-slate-200">
    <span className={`h-2 w-2 shrink-0 rounded-full ${TONE[tone].dot}`} aria-hidden="true" />
    {children}
  </span>
);

/** Transparent search field with a border. */
export const OutlineSearch: React.FC<{ value: string; onChange: (value: string) => void; placeholder: string; className?: string }> = ({
  value,
  onChange,
  placeholder,
  className = '',
}) => (
  <div className={`relative ${className}`}>
    <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
    <input
      type="search"
      value={value}
      onChange={(event) => onChange(event.target.value)}
      placeholder={placeholder}
      aria-label={placeholder}
      className="h-9 w-full rounded-lg border border-slate-300 bg-transparent pl-8 pr-8 text-[13px] text-slate-900 placeholder:text-slate-400 hover:border-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:text-white dark:hover:border-slate-500"
    />
    {value && (
      <button
        type="button"
        aria-label="Clear search"
        onClick={() => onChange('')}
        className="absolute right-2 top-1/2 flex h-5 w-5 -translate-y-1/2 cursor-pointer items-center justify-center rounded text-slate-400 hover:text-slate-700 dark:hover:text-slate-200"
      >
        <X className="h-3.5 w-3.5" />
      </button>
    )}
  </div>
);

/** Two or more mutually exclusive choices drawn as one outlined group. */
export function OutlineToggle<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: { value: T; label: React.ReactNode }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex h-9 shrink-0 items-stretch overflow-hidden rounded-lg border border-slate-300 dark:border-slate-700">
      {options.map((option, index) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={`flex cursor-pointer items-center gap-1.5 px-3 text-xs font-medium transition-colors ${index ? 'border-l border-slate-300 dark:border-slate-700' : ''} ${
              active
                ? 'text-teal-700 shadow-[inset_0_-2px_0_0] shadow-teal-500 dark:text-teal-300'
                : 'text-slate-500 hover:bg-slate-500/[0.05] hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** One "label / value" pair in the details panel. */
export const DetailRow: React.FC<{ label: string; children: React.ReactNode; mono?: boolean }> = ({ label, children, mono }) => (
  <div className="grid grid-cols-[8.5rem_1fr] gap-3 py-2 text-[13px]">
    <dt className="text-slate-500 dark:text-slate-400">{label}</dt>
    <dd className={`min-w-0 break-words text-slate-900 dark:text-slate-100 ${mono ? 'font-mono' : ''}`}>{children || '—'}</dd>
  </div>
);

/** A titled block inside the details panel, separated by a thin rule. */
export const PanelSection: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
  <section className="border-t border-slate-200 px-5 py-4 first:border-t-0 dark:border-slate-800">
    <h3 className="mb-1 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">{title}</h3>
    {children}
  </section>
);
