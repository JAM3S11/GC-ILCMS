import React from 'react';
import { ArrowRight, History } from 'lucide-react';
import { WaterIntake, WaterIntakeEvent, WaterIntakeEventType, WaterIntakeStatus } from '../../types';
import { TONE, Tone } from '../common/Dashboard';

/**
 * The process a Water exhibit has been through, read from the server's
 * water_exhibit_intake_events audit rows. Mirrors the chain-of-custody timeline
 * in LaboratoryWorkspace so an officer reads both the same way.
 *
 * Loading and error state are passed in rather than fetched here so the caller
 * can reload the timeline after the officer records findings without remounting
 * the whole page.
 */

const EVENT_ICON_TONE: Partial<Record<WaterIntakeEventType, Tone>> = {
  REGISTERED: 'slate',
  APPROVED: 'emerald',
  ASSIGNED: 'sky',
  TRANSFERRED: 'amber',
  ANALYSIS_COMPLETED: 'violet',
  FINDINGS_RECORDED: 'cyan',
  CERTIFICATE_ISSUED: 'emerald',
  CERTIFICATE_REISSUED: 'amber',
  CERTIFICATE_REVOKED: 'rose',
  EDITED: 'amber',
  DELETED: 'rose',
};

const STATUS_TONE: Record<WaterIntakeStatus, Tone> = {
  'Awaiting Approval': 'rose',
  'Awaiting Assignment': 'amber',
  'Under Analysis': 'sky',
  'Analysis Complete': 'emerald',
};

/**
 * The four steps every exhibit must pass through, so a gap in the timeline shows
 * up as a visible gap. Recording findings is deliberately NOT one of them: an
 * officer may legitimately complete an analysis with nothing to narrate, so it
 * appears in the history when written but is never a required step.
 */
export const PROCESS_STEPS: WaterIntakeEventType[] = [
  'REGISTERED',
  'ASSIGNED',
  'ANALYSIS_COMPLETED',
  // The Head approves the intake documents at the memo stage, after the analysis.
  'APPROVED',
];

interface ExhibitProcessTimelineProps {
  intake: WaterIntake;
  events: WaterIntakeEvent[];
  loading?: boolean;
  error?: { message: string; status?: number } | null;
}

export const ExhibitProcessTimeline: React.FC<ExhibitProcessTimelineProps> = ({
  intake,
  events,
  loading = false,
  error = null,
}) => {
  const reached = new Set(events.map((event) => event.eventType));
  const currentStep = PROCESS_STEPS.filter((step) => reached.has(step)).length;

  return (
    <div>
      <ol className="flex flex-wrap items-center gap-1.5" aria-label="Process progress">
        {PROCESS_STEPS.map((step, index) => {
          const done = reached.has(step);
          const event = events.find((e) => e.eventType === step);
          const tone = EVENT_ICON_TONE[step] ?? 'slate';
          return (
            <li key={step} className="flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset ${
                  done
                    ? TONE[tone].chip
                    : 'bg-slate-100 text-slate-400 ring-slate-200 dark:bg-slate-800 dark:text-slate-500 dark:ring-slate-700'
                }`}
                title={event ? `${event.actor} · ${event.occurredAt}` : 'Not reached yet'}
              >
                {event?.label ?? step}
              </span>
              {index < PROCESS_STEPS.length - 1 && (
                <ArrowRight className="h-3 w-3 text-slate-300 dark:text-slate-600" />
              )}
            </li>
          );
        })}
      </ol>
      <p className="mt-2.5 text-[11px] text-slate-500 dark:text-slate-400">
        Step {currentStep} of {PROCESS_STEPS.length} · currently{' '}
        <span className="font-medium text-slate-700 dark:text-slate-200">{intake.status}</span>
      </p>

      {loading ? (
        <p className="py-8 text-xs text-slate-400">Loading process…</p>
      ) : error ? (
        <div
          role="alert"
          className="mt-4 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200"
        >
          {error.message}
          {error.status === 403 && (
            <span className="mt-0.5 block text-[11px] opacity-80">
              An Analysis Officer can only open an exhibit assigned to them.
            </span>
          )}
        </div>
      ) : events.length === 0 ? (
        <p className="py-8 text-center text-xs text-slate-400">
          No process has been recorded for this exhibit yet.
        </p>
      ) : (
        <ol className="mt-4">
          {events.map((event, index) => {
            const tone = EVENT_ICON_TONE[event.eventType] ?? 'slate';
            return (
              <li key={`${event.occurredAt}-${index}`} className="relative flex gap-3 pb-5 last:pb-0">
                {index < events.length - 1 && (
                  <span className="absolute left-[15px] top-8 h-[calc(100%-24px)] w-px bg-slate-200 dark:bg-slate-800" />
                )}
                <span
                  className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${TONE[tone].chip}`}
                >
                  <History className="h-3.5 w-3.5" />
                </span>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[13px] font-medium text-slate-900 dark:text-white">{event.label}</span>
                    <span className="ml-auto text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{event.occurredAt}</span>
                  </div>
                  <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                    {event.actor}
                    {event.fromStatus && event.fromStatus !== event.toStatus && (
                      <>
                        {' · '}
                        <span className="text-slate-500 dark:text-slate-400">{event.fromStatus}</span>
                        <ArrowRight className="inline h-3 w-3 text-slate-400" />
                        <span className={`ml-1 font-medium ${TONE[STATUS_TONE[event.toStatus]].text}`}>
                          {event.toStatus}
                        </span>
                      </>
                    )}
                  </div>
                  {event.eventType === 'TRANSFERRED' &&
                    typeof event.details.previousOfficer === 'string' &&
                    typeof event.details.analysisOfficer === 'string' && (
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        Transferred from {event.details.previousOfficer} to {event.details.analysisOfficer}.
                      </p>
                    )}
                  {event.eventType === 'FINDINGS_RECORDED' && (
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      The officer recorded their findings for this analysis.
                    </p>
                  )}
                </div>
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
};