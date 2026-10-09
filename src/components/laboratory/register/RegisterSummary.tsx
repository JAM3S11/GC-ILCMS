import React from 'react';
import { AlertTriangle, CalendarDays, UserX } from 'lucide-react';
import { WorkflowSummary } from '../../common/WorkflowSummary';
import { AgedRow, RegisterStatus, TURNAROUND_DAYS } from './types';

/** A case register's workflow stages and the exceptions a Head acts on. */

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

  return (
    <WorkflowSummary<SummaryFilter<S>>
      title="Case workflow"
      description="How the register's files are spread across each stage"
      totalLabel={`${unit}${rows.length === 1 ? '' : 's'}`}
      total={rows.length}
      allId="all"
      active={active}
      onSelect={onSelect}
      stages={statuses.map((status) => {
        const inStage = rows.filter((row) => row.status === status.value);
        const oldest = inStage.reduce<number | null>((max, row) => (row.age !== null && (max === null || row.age > max) ? row.age : max), null);
        return {
          id: status.value,
          label: status.value,
          count: inStage.length,
          tone: status.tone,
          hint: status.hint,
          note: status.closed ? (
            'Closed files'
          ) : oldest === null ? (
            'None waiting'
          ) : (
            <>
              Oldest waiting{' '}
              <span className={`font-semibold ${oldest > TURNAROUND_DAYS ? 'text-rose-700 dark:text-rose-300' : 'text-slate-700 dark:text-slate-200'}`}>
                {oldest} day{oldest === 1 ? '' : 's'}
              </span>
            </>
          ),
        };
      })}
      attentionDescription="Exceptions for the Head of Department"
      attention={[
        {
          id: 'overdue',
          label: `Over ${TURNAROUND_DAYS} days`,
          hint: 'Open files past the turnaround time',
          value: rows.filter((row) => row.overdue).length,
          tone: 'rose',
          icon: AlertTriangle,
        },
        {
          id: 'unassigned',
          label: 'No officer allocated',
          hint: 'Open files without an analysis officer',
          value: rows.filter((row) => !row.officer && !isClosed(row.status)).length,
          tone: 'amber',
          icon: UserX,
        },
        {
          id: 'this-month',
          label: 'Received this month',
          hint: 'New files since the 1st',
          value: receivedThisMonth,
          tone: 'sky',
          icon: CalendarDays,
          neutral: true,
          selected: thisMonthActive,
          onClick: onShowThisMonth,
        },
      ]}
    />
  );
}
