import { useEffect, useState } from 'react';
import { apiRequest } from './api';

/** Counts for one register (or the sum of them) from /api/dashboard/summary. */
export interface RegisterSummary {
  total: number;
  thisYear: number;
  registeredToday: number;
  awaitingApproval: number;
  awaitingAllocation: number;
  inAnalysis: number;
  /** Analysis done; the Head still has to check or approve. */
  awaitingSignOff: number;
  issued: number;
  issuedThisWeek: number;
  /** Unfinished and in the laboratory longer than `overdueAfterDays`. */
  overdue: number;
  /** Sum of days in lab for files issued in the last 90 days; divide by turnaroundCount. */
  turnaroundDays: number;
  turnaroundCount: number;
}

export interface DashboardSummary {
  scope: 'institution' | 'department';
  department: string | null;
  overdueAfterDays: number;
  totals: RegisterSummary;
  registers: Record<string, RegisterSummary>;
  /** Institution-wide viewers only. */
  auditEventsToday?: number;
  activeStaff?: number;
}

/** Mean days in lab over the last 90 days, to one decimal; null when nothing was issued. */
export const meanTurnaround = (summary: RegisterSummary) =>
  summary.turnaroundCount ? Math.round((summary.turnaroundDays / summary.turnaroundCount) * 10) / 10 : null;

/** Still in the laboratory: everything registered and not yet issued. */
export const openFiles = (summary: RegisterSummary) => summary.total - summary.issued;

/** The dashboard's real counts, refreshed every minute. `summary` is null until the first load. */
export const useDashboardSummary = () => {
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      try {
        const result = await apiRequest<DashboardSummary>('/api/dashboard/summary');
        if (!cancelled) {
          setSummary(result);
          setError('');
        }
      } catch (cause) {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'The figures could not be loaded.');
      }
    };
    void load();
    const intervalId = window.setInterval(() => void load(), 60_000);
    return () => {
      cancelled = true;
      window.clearInterval(intervalId);
    };
  }, []);

  return { summary, error };
};
