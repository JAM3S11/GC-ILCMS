import React from 'react';
import { AlertTriangle, CalendarDays, ChevronRight, UserX } from 'lucide-react';
import { TONE } from '../../common/Dashboard';
import { AgedRow, RegisterStatus, TURNAROUND_DAYS } from './types';

/**
 * A case register's process as one strip: each stage of the department's workflow with how many
 * files sit there (click to filter), then the exceptions a Head acts on. Same flat, bordered look
 * as the case file.
 */

export type SummaryFilter<S extends string> = 'all' | 'overdue' | 'unassigned' | 'this-month' | S;

interface RegisterSummaryProps<S extends string> {
  unit: string;
  statuses: RegisterStatus<S>[];
  /** Files after the officer / period / search filters, before the status filter. */
  rows: AgedRow<S>[];
  receivedThisMonth: number;
  active: SummaryFilter<S>;
  onSelect: (filter: SummaryFilter<S>) => void;
  onShowThisMonth: () => void;
  thisMonthActive: boolean;
}

export function RegisterSummary<S extends string>({
  unit,
  statuses,
  rows,
  receivedThisMonth,
  active,
  onSelect,
  onShowThisMonth,
  thisMonthActive,
}: RegisterSummaryProps<S>) {
  const isClosed = (value: S) => !!statuses.find((s) => s.value === value)?.closed;
  const overdue = rows.filter((row) => row.overdue).length;
  const unassigned = rows.filter((row) => !row.officer && !isClosed(row.status)).length;

  const chip = (selected: boolean) =>
    `inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-2.5 py-1 text-[12.5px] transition-colors ${
      selected
        ? 'border-teal-500/70 text-teal-800 dark:text-teal-200'
        : 'border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-500/[0.04] dark:border-slate-800 dark:text-slate-300 dark:hover:border-slate-700'
    }`;

  return (
    <section aria-label="Case process" className="space-y-2.5">
      <div className="flex flex-col overflow-hidden rounded-xl border border-slate-200 sm:flex-row dark:border-slate-800">
        <button
          type="button"
          onClick={() => onSelect('all')}
          aria-pressed={active === 'all'}
          className={`flex shrink-0 cursor-pointer flex-col items-start justify-center gap-0.5 border-b border-slate-200 px-4 py-3 text-left transition-colors sm:w-36 sm:border-b-0 sm:border-r dark:border-slate-800 ${
            active === 'all' ? 'bg-teal-500/[0.06]' : 'hover:bg-slate-500/[0.04]'
          }`}
        >
          <span className="text-[22px] font-semibold tabular-nums leading-none text-slate-900 dark:text-white">{rows.length}</span>
          <span className="text-[12px] text-slate-500 dark:text-slate-400">{unit}{rows.length === 1 ? '' : 's'} in all</span>
        </button>
        <ol className="grid min-w-0 flex-1 grid-cols-2 sm:flex">
          {statuses.map((status, index) => {
            const inStage = rows.filter((row) => row.status === status.value);
            const oldest = inStage.reduce<number | null>((max, row) => (row.age !== null && (max === null || row.age > max) ? row.age : max), null);
            const selected = active === status.value;
            return (
              <li key={status.value} className="min-w-0 flex-1 border-b border-r border-slate-200 last:border-r-0 sm:border-b-0 dark:border-slate-800">
                <button
                  type="button"
                  onClick={() => onSelect(selected ? 'all' : status.value)}
                  aria-pressed={selected}
                  title={status.hint}
                  className={`flex h-full w-full cursor-pointer flex-col gap-1 px-3.5 py-3 text-left transition-colors ${selected ? 'bg-teal-500/[0.06]' : 'hover:bg-slate-500/[0.04]'}`}
                >
                  <span className="flex items-center gap-1.5 text-[11.5px] text-slate-500 dark:text-slate-400">
                    <span className={`h-2 w-2 shrink-0 rounded-full ${TONE[status.tone].dot}`} aria-hidden="true" />
                    <span className="truncate">{status.value}</span>
                    {index < statuses.length - 1 && <ChevronRight className="ml-auto hidden h-3.5 w-3.5 shrink-0 text-slate-300 lg:block dark:text-slate-600" aria-hidden="true" />}
                  </span>
                  <span className="text-[19px] font-semibold tabular-nums leading-none text-slate-900 dark:text-white">{inStage.length}</span>
                  <span className="text-[11px] text-slate-500 dark:text-slate-400">
                    {status.closed ? 'Closed files' : oldest === null ? 'None waiting' : (
                      <>
                        Oldest{' '}
                        <span className={oldest > TURNAROUND_DAYS ? 'font-semibold text-rose-700 dark:text-rose-300' : 'font-medium text-slate-700 dark:text-slate-200'}>
                          {oldest} day{oldest === 1 ? '' : 's'}
                        </span>
                      </>
                    )}
                  </span>
                </button>
              </li>
            );
          })}
        </ol>
      </div>

      <div className="flex flex-wrap items-center gap-2" aria-label="Exceptions for the Head of Department">
        <button type="button" onClick={() => onSelect(active === 'overdue' ? 'all' : 'overdue')} aria-pressed={active === 'overdue'} className={chip(active === 'overdue')} title="Open files past the turnaround time">
          <AlertTriangle className={`h-3.5 w-3.5 ${overdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`} />
          Over {TURNAROUND_DAYS} days <span className="font-semibold tabular-nums">{overdue}</span>
        </button>
        <button type="button" onClick={() => onSelect(active === 'unassigned' ? 'all' : 'unassigned')} aria-pressed={active === 'unassigned'} className={chip(active === 'unassigned')} title="Open files without an analysis officer">
          <UserX className="h-3.5 w-3.5 text-slate-400" />
          No officer allocated <span className="font-semibold tabular-nums">{unassigned}</span>
        </button>
        <button type="button" onClick={onShowThisMonth} aria-pressed={thisMonthActive} className={chip(thisMonthActive)} title="New files since the 1st">
          <CalendarDays className="h-3.5 w-3.5 text-slate-400" />
          Received this month <span className="font-semibold tabular-nums">{receivedThisMonth}</span>
        </button>
      </div>
    </section>
  );
}
