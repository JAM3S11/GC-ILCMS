import React, { useEffect, useId, useState } from 'react';
import { CheckCircle2, ChevronDown, Circle, CircleDot, LucideIcon } from 'lucide-react';
import { StatusPill, Tone } from '../common/Dashboard';

export interface CaseStepFact {
  label: string;
  value: React.ReactNode;
}

export type CaseStepState = 'done' | 'current' | 'pending';

interface CaseStepProps {
  /** Anchor id; other steps open and scroll to it with openCaseStep(id). */
  id: string;
  /** Kept for the reading order; the row shows a state icon rather than the number. */
  step?: number;
  icon: LucideIcon;
  title: string;
  /** What the step is for; shown only while the step is open. */
  description?: React.ReactNode;
  status?: { label: string; tone: Tone };
  /**
   * Where the step stands. Without it, an emerald status reads as done, a step that
   * opens by default as the current one, and anything else as not reached yet.
   */
  state?: CaseStepState;
  /** Key facts, shown on one line while the step is folded. */
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

const STATE_ICON: Record<CaseStepState, { icon: LucideIcon; className: string; label: string }> = {
  done: { icon: CheckCircle2, className: 'text-emerald-600 dark:text-emerald-400', label: 'Done' },
  current: { icon: CircleDot, className: 'text-amber-500 dark:text-amber-400', label: 'In progress' },
  pending: { icon: Circle, className: 'text-slate-300 dark:text-slate-600', label: 'Not reached yet' },
};

/**
 * One step of a case file. Folded, it is a single quiet row (state, title, the key
 * facts on one line); open, it shows what the step is for and its form or record.
 * Only the step that needs action opens by itself, so finished work stays out of the way.
 */
export const CaseStep: React.FC<CaseStepProps> = ({ id, icon: Icon, title, description, status, state, summary, defaultOpen = false, children }) => {
  const [chosen, setChosen] = useState<boolean | null>(null);
  const open = chosen ?? defaultOpen;
  const bodyId = useId();
  const stepState: CaseStepState = state ?? (status?.tone === 'emerald' ? 'done' : defaultOpen ? 'current' : 'pending');
  const StateIcon = STATE_ICON[stepState].icon;

  useEffect(() => {
    const onOpen = (event: Event) => {
      if ((event as CustomEvent<string>).detail === id) setChosen(true);
    };
    window.addEventListener(OPEN_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_EVENT, onOpen);
  }, [id]);

  const facts = (summary ?? []).filter((fact) => fact.value !== null && fact.value !== undefined && fact.value !== '');

  return (
    <section
      id={id}
      data-case-step={stepState}
      className={`scroll-mt-16 overflow-hidden rounded-[10px] border bg-white transition-shadow dark:bg-slate-900 ${
        open && stepState === 'current'
          ? 'border-amber-300/70 shadow-[0_1px_3px_rgb(15_23_42/0.06)] dark:border-amber-400/30'
          : 'border-slate-200 dark:border-slate-800'
      }`}
    >
      <button
        type="button"
        aria-expanded={open}
        aria-controls={bodyId}
        onClick={() => setChosen(!open)}
        className="group flex min-h-[44px] w-full cursor-pointer items-center gap-3 px-3.5 py-2 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
      >
        <StateIcon className={`h-4 w-4 shrink-0 ${STATE_ICON[stepState].className}`} aria-label={STATE_ICON[stepState].label} />
        <span className="flex min-w-0 flex-1 items-baseline gap-3">
          <span className="flex shrink-0 items-center gap-1.5 text-[13.5px] font-semibold text-slate-900 dark:text-white">
            <Icon className="hidden h-3.5 w-3.5 text-slate-400 sm:block" aria-hidden="true" />
            {title}
          </span>
          {!open && facts.length > 0 && (
            <span className="hidden min-w-0 truncate text-xs text-slate-500 md:block dark:text-slate-400">
              {facts.map((fact, index) => (
                <React.Fragment key={fact.label}>
                  {index > 0 && <span className="mx-1.5 text-slate-300 dark:text-slate-600">·</span>}
                  <span title={fact.label}>{fact.value}</span>
                </React.Fragment>
              ))}
            </span>
          )}
        </span>
        {status && <span className="hidden shrink-0 sm:block"><StatusPill tone={status.tone}>{status.label}</StatusPill></span>}
        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-400 transition-transform group-hover:text-slate-600 ${open ? 'rotate-180' : ''}`} aria-hidden="true" />
        <span className="sr-only">{open ? 'Fold' : 'Open'} {title}</span>
      </button>

      {/* Printing the file prints every step, folded or not. */}
      <div id={bodyId} hidden={!open} data-case-step-body className="border-t border-slate-100 dark:border-slate-800">
        {description && <p className="px-5 pt-3 text-xs text-slate-500 dark:text-slate-400">{description}</p>}
        {children}
      </div>
    </section>
  );
};
