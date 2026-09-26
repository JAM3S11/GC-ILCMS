import React from 'react';

/** Form building blocks shared by the departmental intake pages. */

export const inputCls =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

export const Section: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  last?: boolean;
  children: React.ReactNode;
}> = ({ icon: Icon, title, description, last, children }) => (
  <fieldset className={`grid grid-cols-1 gap-5 px-5 py-6 md:grid-cols-3 ${last ? '' : 'border-b border-slate-100 dark:border-slate-800'}`}>
    <legend className="sr-only">{title}</legend>
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
        <Icon className="h-4 w-4" />
      </span>
      <div>
        <div className="text-sm font-semibold text-slate-900 dark:text-white">{title}</div>
        <p className="mt-0.5 text-xs leading-relaxed text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:col-span-2">{children}</div>
  </fieldset>
);

export const Field: React.FC<{
  label: string;
  required?: boolean;
  hint?: string;
  error?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
  className?: string;
  children: React.ReactNode;
}> = ({ label, required, hint, error, icon: Icon, className = '', children }) => (
  <label className={`block space-y-1.5 ${className}`}>
    <span className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
      {Icon && <Icon className="h-3.5 w-3.5 text-slate-400" />}
      {label}
      {required && <span className="text-rose-500">*</span>}
    </span>
    {children}
    {hint && <span className={`block text-[11px] ${error ? 'text-rose-500' : 'text-slate-400'}`}>{hint}</span>}
  </label>
);

export const Meta: React.FC<{
  label: string;
  value: string;
  mono?: boolean;
  icon?: React.ComponentType<{ className?: string }>;
}> = ({ label, value, mono, icon: Icon }) => (
  <div className="min-w-0">
    <div className="text-[10px] uppercase tracking-wider text-slate-400">{label}</div>
    <div className={`mt-0.5 flex items-center gap-1 truncate text-slate-700 dark:text-slate-200 ${mono ? 'font-mono' : ''}`}>
      {Icon && <Icon className="h-3 w-3 shrink-0 text-slate-400" />}
      {value}
    </div>
  </div>
);
