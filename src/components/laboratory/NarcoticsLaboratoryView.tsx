import React from 'react';
import { CheckCircle2, Pill, Plus, Users } from 'lucide-react';
import { NarcoticsIntake, OfficerVisitor, User } from '../../types';
import { Button, DashboardPage, Panel, StatusPill } from '../common/Dashboard';
import { NarcoticsRegisterPanel } from './NarcoticsRegisterPanel';

/**
 * Narcotics laboratory page. Laid out like the Water & Environment page: a
 * banner with stage counts, the police officers sent over by reception, then
 * the exhibit register. Everything comes from the database.
 */

interface NarcoticsLaboratoryViewProps {
  intakes: NarcoticsIntake[];
  isLoading?: boolean;
  error?: string;
  currentUser: Pick<User, 'id' | 'name' | 'role'>;
  /** Narcotics officers the Head can assign an exhibit to. */
  officers: Pick<User, 'id' | 'name'>[];
  onAssign: (intakeId: string, officerId: string, remarks: string) => Promise<boolean>;
  onOpenCaseFile: (intake: NarcoticsIntake) => void;
  onEdit: (intake: NarcoticsIntake) => void;
  onDelete: (intakeId: string) => void;
  /** Officers routed to Narcotics who are still on site. */
  clients?: OfficerVisitor[];
  canReceiveClients?: boolean;
  onOpenIntake?: () => void;
  onAcceptClient?: (visitId: string) => void;
  /** Opens the intake form for an officer who has been received. */
  onRegisterExhibit?: (visit: OfficerVisitor) => void;
}

export const NarcoticsLaboratoryView: React.FC<NarcoticsLaboratoryViewProps> = ({
  intakes,
  isLoading = false,
  error = '',
  currentUser,
  officers,
  onAssign,
  onOpenCaseFile,
  onEdit,
  onDelete,
  clients = [],
  canReceiveClients = false,
  onOpenIntake,
  onAcceptClient,
  onRegisterExhibit,
}) => {
  const awaiting = intakes.filter((i) => i.status === 'Awaiting Assignment').length;
  const underAnalysis = intakes.filter((i) => i.status === 'Under Analysis').length;
  const complete = intakes.filter((i) => i.status === 'Analysis Complete').length;

  return (
    <DashboardPage>
      <header className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-500/10 text-violet-600 ring-1 ring-inset ring-violet-500/20 dark:text-violet-400">
              <Pill className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Laboratory · Narcotics</p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Exhibit laboratory</h1>
              <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
                {intakes.length} {intakes.length === 1 ? 'exhibit' : 'exhibits'} on record · {clients.length} {clients.length === 1 ? 'officer' : 'officers'} at the laboratory
              </p>
            </div>
          </div>
          {onOpenIntake && (
            <Button variant="primaryTeal" icon={Plus} onClick={onOpenIntake} id="btn-open-intake-modal">
              Exhibit intake
            </Button>
          )}
        </div>
        <ul aria-label="Stage counts" className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          {[
            { label: 'Awaiting assignment', count: awaiting, dot: 'bg-teal-300' },
            { label: 'Under analysis', count: underAnalysis, dot: 'bg-sky-500' },
            { label: 'Complete', count: complete, dot: 'bg-emerald-500' },
          ].map((stage) => (
            <li key={stage.label} className="inline-flex items-center gap-2 rounded-full bg-slate-100 px-3 py-1.5 text-xs text-slate-600 dark:bg-slate-800 dark:text-slate-300">
              <span className={`h-2 w-2 rounded-full ${stage.dot}`} />
              <span className="font-mono text-sm font-semibold tabular-nums text-slate-900 dark:text-white">{stage.count}</span>
              {stage.label}
            </li>
          ))}
        </ul>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          Narcotics exhibits could not be refreshed: {error}
        </div>
      )}

      {clients.length > 0 && (
        <Panel
          icon={Users}
          tone="teal"
          title="Officers at the laboratory"
          description={`${clients.length} ${clients.length === 1 ? 'officer' : 'officers'} to receive or register`}
          flush
        >
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {clients.map((visit) => {
              const registered = intakes.find((i) => i.receptionVisitId === visit.id);
              const atReception = visit.status === 'Awaiting Laboratory Reception';
              return (
                <li key={visit.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-slate-900 dark:text-white">{visit.officerName}</div>
                    <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {visit.badgeNumber && <>Badge <span className="font-mono">{visit.badgeNumber}</span> · </>}
                      {visit.station || '—'} · <span className="font-mono">{visit.visitNumber}</span> · in at {visit.timeIn}
                    </div>
                  </div>
                  <StatusPill tone={atReception ? 'sky' : 'teal'}>{atReception ? 'Waiting at reception' : 'In the laboratory'}</StatusPill>
                  {registered ? (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Registered · <span className="font-mono">{registered.labReference}</span>
                    </span>
                  ) : atReception ? (
                    canReceiveClients && onAcceptClient ? (
                      <Button size="xs" variant="primaryTeal" icon={CheckCircle2} onClick={() => onAcceptClient(visit.id)}>
                        Accept at laboratory
                      </Button>
                    ) : (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Waiting to be accepted</span>
                    )
                  ) : (
                    onRegisterExhibit && (
                      <Button size="xs" variant="primaryTeal" icon={Plus} onClick={() => onRegisterExhibit(visit)}>
                        Register exhibit
                      </Button>
                    )
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      <NarcoticsRegisterPanel
        intakes={intakes}
        isLoading={isLoading}
        currentUser={currentUser}
        officers={officers}
        onAssign={onAssign}
        onOpenCaseFile={onOpenCaseFile}
        onEdit={onEdit}
        onDelete={onDelete}
      />
    </DashboardPage>
  );
};
