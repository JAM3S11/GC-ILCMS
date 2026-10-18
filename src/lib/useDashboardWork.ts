import { useCallback, useEffect, useState } from 'react';
import { apiRequest } from './api';

/** Which register an open file belongs to; matches the server's register names. */
export type WorkRegister = 'Water' | 'Food & Drugs' | 'Narcotics';

/** One open file from /api/dashboard/work. */
export interface WorkItem {
  register: WorkRegister;
  id: string;
  reference: string;
  title: string;
  /** What has to happen next, e.g. "Approve the memo". */
  step: string;
  /** Whose turn it is. */
  whose: 'head' | 'analyst' | 'department';
  /** The next step is the viewer's to take. */
  needsMe: boolean;
  officer: string | null;
  /** Assigned to the viewer. */
  mine: boolean;
  received: string | null;
  daysInLab: number | null;
}

/** One line of the activity feed: "<actor> <verb> <reference>". */
export interface WorkActivity {
  id: string;
  actor: string;
  verb: string;
  reference: string;
  register: WorkRegister;
  recordId: string;
  occurredAt: string;
}

interface DashboardWork {
  items: WorkItem[];
  activity: WorkActivity[];
  overdueAfterDays: number;
}

/** The viewer's open files and recent register activity, refreshed every minute. */
export const useDashboardWork = () => {
  const [work, setWork] = useState<DashboardWork | null>(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    try {
      setWork(await apiRequest<DashboardWork>('/api/dashboard/work'));
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Your work could not be loaded.');
    }
  }, []);

  useEffect(() => {
    void load();
    const intervalId = window.setInterval(() => void load(), 60_000);
    return () => window.clearInterval(intervalId);
  }, [load]);

  return { work, error, reload: load };
};
