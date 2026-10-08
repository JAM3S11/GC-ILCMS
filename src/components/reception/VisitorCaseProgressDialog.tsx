import React, { useEffect, useState } from 'react';
import { Check, Circle, FlaskConical, Loader2, X } from 'lucide-react';
import { OfficerVisitor } from '../../types';
import { apiRequest } from '../../lib/api';
import { StatusPill } from '../common/Dashboard';
import { Portal } from '../common/Portal';

interface ProgressSample {
  laboratory: 'Water' | 'Food & Drugs';
  reference: string;
  status: string;
  analyst: string | null;
  steps: { label: string; at: string | null }[];
}

const when = (value: string) =>
  new Date(value).toLocaleString('en-KE', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' });

const statusTone = (status: string) =>
  status === 'Reported' || status === 'Analysis Complete' ? 'emerald' : status === 'Under Analysis' ? 'amber' : 'sky';

/**
 * Read-only case file for reception: how bench work on a visitor's samples is
 * progressing after they have left. Shows milestones only, never results.
 */
export const VisitorCaseProgressDialog: React.FC<{ visit: OfficerVisitor; onClose: () => void }> = ({ visit, onClose }) => {
  const [samples, setSamples] = useState<ProgressSample[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    const load = () =>
      apiRequest<{ samples: ProgressSample[] }>(`/api/reception/visits/${visit.id}/case-progress`)
        .then((result) => active && (setSamples(result.samples), setError('')))
        .catch((cause) => active && setError(cause instanceof Error ? cause.message : 'The case file could not be loaded.'));
    void load();
    const timer = window.setInterval(load, 15000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [visit.id]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => event.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <Portal>
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 p-4" onClick={onClose}>
        <div
          role="dialog"
          aria-modal="true"
          aria-label={`Case file for ${visit.officerName}`}
          className="flex max-h-[90vh] w-full max-w-2xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-700 dark:bg-slate-900"
          onClick={(event) => event.stopPropagation()}
        >
          <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
            <div className="min-w-0">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">Case file — {visit.officerName}</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {visit.visitNumber} · {visit.laboratory} · Bench-work progress (results stay with the laboratory)
              </p>
            </div>
            <button type="button" onClick={onClose} aria-label="Close" className="rounded-md p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800">
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="space-y-4 overflow-y-auto px-5 py-4">
            {error && <p role="alert" className="text-sm text-rose-600 dark:text-rose-400">{error}</p>}
            {!samples && !error && (
              <p className="flex items-center gap-2 text-sm text-slate-500"><Loader2 className="h-4 w-4 animate-spin" /> Loading case file…</p>
            )}
            {samples?.length === 0 && (
              <p className="text-sm text-slate-500 dark:text-slate-400">The laboratory has not registered a sample for this visit.</p>
            )}
            {samples?.map((sample) => {
              const firstPending = sample.steps.findIndex((step) => !step.at);
              return (
                <section key={sample.reference} className="rounded-lg border border-slate-200 p-4 dark:border-slate-700">
                  <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <FlaskConical className="h-4 w-4 text-slate-400" />
                      <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{sample.reference}</span>
                      <span className="text-xs text-slate-500 dark:text-slate-400">{sample.laboratory}</span>
                    </div>
                    <StatusPill tone={statusTone(sample.status)}>{sample.status}</StatusPill>
                  </div>
                  <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Analyst: {sample.analyst ?? 'Not yet assigned'}</p>
                  <ol className="space-y-2.5">
                    {sample.steps.map((step, index) => {
                      const current = index === firstPending;
                      return (
                        <li key={step.label} className="flex items-start gap-3">
                          <span
                            className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                              step.at
                                ? 'bg-emerald-500 text-white'
                                : current
                                  ? 'border-2 border-amber-500 text-amber-500'
                                  : 'border border-slate-300 text-slate-300 dark:border-slate-600'
                            }`}
                          >
                            {step.at ? <Check className="h-3 w-3" /> : <Circle className="h-2 w-2 fill-current" />}
                          </span>
                          <div className="min-w-0">
                            <div className={`text-sm ${step.at || current ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{step.label}</div>
                            <div className="text-[11px] text-slate-500 dark:text-slate-400">
                              {step.at ? when(step.at) : current ? 'In progress' : 'Pending'}
                            </div>
                          </div>
                        </li>
                      );
                    })}
                  </ol>
                </section>
              );
            })}
          </div>
        </div>
      </div>
    </Portal>
  );
};
