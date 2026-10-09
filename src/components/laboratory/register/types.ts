import { Tone } from '../../common/Dashboard';

/** One status of a case register, in workflow order. */
export interface RegisterStatus<S extends string> {
  value: S;
  tone: Tone;
  /** Plain-English line explaining what the status means. */
  hint: string;
  /** The file has left the laboratory's hands, so it no longer counts against turnaround. */
  closed?: boolean;
}

/** One file on a case register, already mapped from the laboratory's own record. */
export interface RegisterRow<S extends string> {
  key: string;
  reference: string;
  secondaryRef?: string;
  /** ISO date (YYYY-MM-DD). */
  received: string;
  party: string;
  partySub?: string;
  subject: string;
  subjectSub?: string;
  officer?: string | null;
  status: S;
  onOpen: () => void;
}

/** A register row with its age worked out. */
export type AgedRow<S extends string> = RegisterRow<S> & { age: number | null; overdue: boolean };

export interface RegisterColumns {
  reference: string;
  party: string;
  subject: string;
  officer: string;
}

/** Open files older than this are flagged against the service charter turnaround. */
export const TURNAROUND_DAYS = 14;

const DAY_MS = 86_400_000;

const startOfToday = () => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return today;
};

export const toIsoDate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;

export const daysSince = (isoDate: string) => {
  const then = new Date(`${isoDate}T00:00:00`);
  if (Number.isNaN(then.getTime())) return null;
  return Math.max(0, Math.round((startOfToday().getTime() - then.getTime()) / DAY_MS));
};

export const formatDate = (isoDate: string) => {
  const date = new Date(`${isoDate}T00:00:00`);
  return Number.isNaN(date.getTime())
    ? isoDate
    : date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' });
};

export const initialsOf = (name: string) =>
  name.split(' ').map((p) => p[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

/* ------------------------------ Date periods ------------------------------ */

export type Period = 'any' | '7d' | '30d' | 'month' | 'year' | 'custom';

export const PERIOD_LABEL: Record<Period, string> = {
  any: 'Any time',
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  month: 'This month',
  year: 'This year',
  custom: 'Custom range',
};

/** Inclusive [from, to] ISO bounds for a period; empty strings mean unbounded. */
export const periodBounds = (period: Period, customFrom: string, customTo: string): [string, string] => {
  const today = startOfToday();
  switch (period) {
    case '7d':
    case '30d': {
      const from = new Date(today);
      from.setDate(from.getDate() - (period === '7d' ? 6 : 29));
      return [toIsoDate(from), ''];
    }
    case 'month':
      return [toIsoDate(new Date(today.getFullYear(), today.getMonth(), 1)), ''];
    case 'year':
      return [`${today.getFullYear()}-01-01`, ''];
    case 'custom':
      return [customFrom, customTo];
    default:
      return ['', ''];
  }
};
