import React, { useEffect, useId, useState } from 'react';
import { ChevronDown, LucideIcon } from 'lucide-react';
import { StatusPill, Tone } from '../common/Dashboard';

export interface CaseStepFact {
  label: string;
  value: React.ReactNode;
}

interface CaseStepProps {
  /** Anchor id; other steps open and scroll to it with openCaseStep(id). */
  id: string;
  step: number;
  icon: LucideIcon;
  title: string;
  description?: React.ReactNode;
  status?: { label: string; tone: Tone };
  /** Key facts shown when the step is collapsed. */
  summary?: CaseStepFact[];
  /** Open on first show (e.g. the step that needs action); the user's choice wins after that. */
  defaultOpen?: boolean;
  children: React.ReactNode;
}

const OPEN_EVENT = 'case-step:open';

/** Opens a case-file step and scrolls to it. */
export const openCaseStep = (id: string) => {
  window.dispatchEvent(new CustomEvent(OPEN_EVENT, { detail: id }));
  window.setTimeout(() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 50);
};

/**
 * One numbered step of a case file as a collapsible card: the header shows the
 * step, its status and (when collapsed) a one-line summary of what it holds.
 */
export const CaseStep: React.FC<CaseStepProps> = ({ id, step, icon: Icon, title, description, status, summary, defaultOpen = false, children }) => {
  const [chosen, setChosen] = useState<boolean | null>(null);
  const open = chosen ?? defaultOpen;
  const bodyId = useId();

  useEffect(() => {
    const onOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail === id) setChosen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [id]);

  const facts = (summary ?? []).filter((fact) => fact.value !== null && fact.value !== undefined && fact.value !== '');

  return (
    <section id={id} className="scroll-mt-4 overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setChosen(!open)}
        className={`flex w-full cursor-pointer flex-wrap items-start justify-between gap-3 bg-slate-50 px-5 py-3 text-left transition-colors hover:bg-slate-100 dark:bg-slate-950/50 dark:hover:bg-slate-800/60 ${
          open ? 'border-b border-slate-200 dark:border-slate-800' : ''
        }`}
      >
        <div className="flex min-w-0 items-start gap-3">
          <span
            className={`flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-semibold ${
              status?.tone === 'emerald' ? 'bg-emerald-600 text-white' : 'bg-slate-800 text-white dark:bg-slate-700 dark:text-slate-100'
            }`}
          >
            {step}
          </span>
          <div className="min-w-0">
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <Icon className="h-4 w-4 shrink-0 text-slate-400" /> {title}
            </h2>
            {description && <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{description}</div>}
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {status && <StatusPill tone={status.tone} dot={false}>{status.label}</StatusPill>}
          <ChevronDown className={`h-4 w-4 text-slate-500 transition-transform ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
          <span className="sr-only">{open ? 'Collapse' : 'Expand'} {title}</span>
        </div>
      </button>

      {!open && facts.length > 0 && (
        <dl className="grid grid-cols-2 gap-x-6 gap-y-2 px-5 py-3 text-xs sm:grid-cols-4">
          {facts.map((fact) => (
            <div key={fact.label} className="min-w-0">
              <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{fact.label}</dt>
              <dd className="mt-0.5 truncate font-medium text-slate-900 dark:text-white">{fact.value}</dd>
            </div>
          ))}
        </dl>
      )}

      <div id={bodyId} hidden={!open}>
        {children}
      </div>
    </section>
  );
};
