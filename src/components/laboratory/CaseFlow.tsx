import React from 'react';
import { ArrowRight, Check, CheckCircle2, Hourglass, Info } from 'lucide-react';
import { Button } from '../common/Dashboard';
import { CaseFileSectionState } from './CaseFileContents';

/* ---------------------------------------------------------------------------
 * CaseFlow — the part of every department's case file that says where the
 * file stands and what happens next.
 *
 * Every laboratory uses the same five stages so an officer, a Head or an
 * auditor reads any case file the same way. Department-specific steps (a
 * receipt form, a worksheet, a draft report) live inside these stages rather
 * than adding stages of their own.
 * --------------------------------------------------------------------------- */

export const CASE_STAGES = ['Received', 'Allocated', 'Analysis', 'Review', 'Approved & issued'] as const;

export interface CaseStage {
  state: CaseFileSectionState;
  /** One line under the stage name: a date, a name or what is outstanding. */
  note?: string;
  /** Section the stage's work lives in; selecting the stage opens it. */
  target?: string;
}

/**
 * Builds the five stages from whether each is finished. The first unfinished
 * stage is the current one; everything after it is pending.
 */
export const caseStages = (done: boolean[], notes: (string | undefined)[], targets: (string | undefined)[] = []): CaseStage[] => {
  const current = done.findIndex((d) => !d);
  return CASE_STAGES.map((_, i) => ({
    state: done[i] ? 'done' : i === current ? 'current' : 'pending',
    note: notes[i],
    target: targets[i],
  }));
};

/** A file still in the laboratory after this many days is flagged as overdue. */
export const DAYS_IN_LAB_WARNING = 14;

const dayNumber = (value?: string | null) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000 : null;
};

/** Day 1 is the day the exhibit was received; counting stops on the day it is issued. */
export const daysInLab = (received?: string | null, finished?: string | null) => {
  const start = dayNumber(received);
  if (start === null) return null;
  const now = new Date();
  const end = dayNumber(finished) ?? Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000;
  return Math.max(1, Math.floor(end - start) + 1);
};

/** The five stages as a bar; each stage jumps to the section its work lives in. */
const CaseProgress: React.FC<{ stages: CaseStage[]; onSelect: (id: string) => void }> = ({ stages, onSelect }) => {
  const currentIndex = stages.findIndex((s) => s.state === 'current');
  const current = currentIndex === -1 ? null : stages[currentIndex];
  return (
    <div>
      {/* Phones: dots and the current stage's name */}
      <div className="flex items-center gap-3 sm:hidden">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {stages.map((s, i) => (
            <span
              key={CASE_STAGES[i]}
              className={`h-2 w-2 rounded-full ${s.state === 'done' ? 'bg-emerald-600' : s.state === 'current' ? 'bg-teal-300' : 'bg-slate-300 dark:bg-slate-600'}`}
            />
          ))}
        </div>
        <span className="text-xs text-slate-600 dark:text-slate-300">
          {current ? (
            <>
              Stage {currentIndex + 1} of {stages.length}: <span className="font-medium text-slate-900 dark:text-white">{CASE_STAGES[currentIndex]}</span>
            </>
          ) : (
            'All stages complete'
          )}
        </span>
      </div>

      {/* Wider screens: the full track */}
      <ol className="hidden grid-cols-5 gap-2 sm:grid" aria-label="Case progress">
        {stages.map((s, i) => {
          const done = s.state === 'done';
          const active = s.state === 'current';
          const label = CASE_STAGES[i];
          const body = (
            <>
              <span
                className={`block h-1.5 rounded-full transition-colors ${
                  done ? 'bg-emerald-600' : active ? 'bg-teal-300' : 'bg-slate-200 group-hover:bg-slate-300 dark:bg-slate-700 dark:group-hover:bg-slate-600'
                }`}
              />
              <span className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-800 dark:text-slate-100">
                <span
                  className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-semibold text-white ${
                    done ? 'bg-emerald-600' : active ? 'bg-teal-300 !text-[#0b3a42]' : 'bg-slate-400 dark:bg-slate-600'
                  }`}
                >
                  {done ? <Check className="h-2.5 w-2.5" /> : i + 1}
                </span>
                <span className="truncate">{label}</span>
              </span>
              <span
                className={`mt-0.5 block truncate pl-[1.375rem] text-[11px] ${
                  done ? 'text-emerald-700 dark:text-emerald-400' : active ? 'text-teal-700 dark:text-teal-300' : 'text-slate-500 dark:text-slate-400'
                }`}
                title={s.note}
              >
                {s.note ?? (done ? 'Complete' : active ? 'In progress' : 'Pending')}
              </span>
            </>
          );
          return (
            <li key={label} aria-current={active ? 'step' : undefined}>
              {s.target ? (
                <button type="button" onClick={() => onSelect(s.target!)} className="group w-full cursor-pointer text-left">
                  {body}
                </button>
              ) : (
                <div className="group">{body}</div>
              )}
            </li>
          );
        })}
      </ol>
    </div>
  );
};

export interface NextStep {
  /** Who does what, phrased for the person viewing ("You to …", "The Head of Department to …"). */
  text: string;
  /** The file is finished; the banner turns green. */
  done?: boolean;
  /** Button that takes the officer to where the work is done. */
  action?: { label: string; target: string };
  /** What still stands in the way, shown as a list rather than hidden in a tooltip. */
  blockers?: string[];
}

interface CaseStatusCardProps {
  next: NextStep;
  stages: CaseStage[];
  /** Opens and scrolls to a section; usually openCaseStep. */
  onSelect: (id: string) => void;
  /** YYYY-MM-DD the exhibit was received, for the days-in-lab count. */
  receivedDate?: string | null;
  /** YYYY-MM-DD it was issued; stops the count. */
  finishedDate?: string | null;
  /** Rendered inside the card above the banner (e.g. the file reference). */
  header?: React.ReactNode;
  /** Rendered inside the card, flush, under the progress bar (e.g. key facts). */
  footer?: React.ReactNode;
  className?: string;
}

/**
 * "Next:" banner plus the five-stage progress bar, in one card. Shown at the top
 * of every department's case file so the officer never has to work out where
 * the file is or whose turn it is.
 */
export const CaseStatusCard: React.FC<CaseStatusCardProps> = ({ next, stages, onSelect, receivedDate, finishedDate, header, footer, className = '' }) => {
  const days = daysInLab(receivedDate, finishedDate);
  const overdue = days !== null && days > DAYS_IN_LAB_WARNING && !next.done;
  const blockers = (next.blockers ?? []).filter(Boolean);

  return (
    <section aria-label="Where this file stands" className={`overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm print:hidden dark:border-slate-700 dark:bg-slate-900 ${className}`}>
      <div className="space-y-4 px-5 py-4 sm:px-6">
        {header}
        <div
          className={`rounded-lg border px-4 py-3 ${
            next.done
              ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
              : 'border-teal-200 bg-teal-50 dark:border-teal-500/30 dark:bg-teal-500/10'
          }`}
        >
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex min-w-0 items-start gap-2.5">
              {next.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
              ) : (
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-teal-700 dark:text-teal-300" />
              )}
              <p className="text-sm text-slate-800 dark:text-slate-100" aria-live="polite">
                <span className="font-semibold">{next.done ? 'Complete: ' : 'Next: '}</span>
                {next.text}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {days !== null && (
                <span
                  title={overdue ? `In the laboratory longer than ${DAYS_IN_LAB_WARNING} days` : 'Counted from the day the exhibit was received'}
                  className={`inline-flex items-center gap-1 text-xs font-medium tabular-nums ${
                    overdue ? 'rounded bg-amber-100 px-1.5 py-0.5 text-amber-900 dark:bg-amber-500/15 dark:text-amber-200' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Hourglass className="h-3.5 w-3.5" />
                  {next.done ? `${days} ${days === 1 ? 'day' : 'days'} in lab` : `Day ${days} in lab${overdue ? ' · overdue' : ''}`}
                </span>
              )}
              {next.action && (
                <Button size="sm" variant={next.done ? 'secondary' : 'primary'} onClick={() => onSelect(next.action!.target)}>
                  {next.action.label}
                </Button>
              )}
            </div>
          </div>
          {blockers.length > 0 && (
            <div className="mt-2.5 border-t border-teal-200/70 pt-2.5 dark:border-teal-500/20">
              <p className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <Info className="h-3.5 w-3.5" /> Still needed first
              </p>
              <ul className="mt-1.5 space-y-1 pl-5 text-xs text-slate-700 dark:text-slate-200">
                {blockers.map((blocker) => (
                  <li key={blocker} className="list-disc">{blocker}</li>
                ))}
              </ul>
            </div>
          )}
        </div>

        <CaseProgress stages={stages} onSelect={onSelect} />
      </div>
      {footer}
    </section>
  );
};
