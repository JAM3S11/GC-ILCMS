import React from 'react';
import { CheckCircle2, Plus } from 'lucide-react';
import { NarcoticsIntake, OfficerVisitor, User } from '../../types';
import { DashboardPage } from '../common/Dashboard';
import { NarcoticsRegisterPanel } from './NarcoticsRegisterPanel';
import { OutlineButton, StatusText } from './workspace/ui';

/**
 * Narcotics laboratory page: a plain title with the one main action, the police
 * officers reception has sent over (only while there are any), then the exhibit
 * register with its details panel. Everything comes from the database.
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
  /** Register tab to open on. */
  initialRegisterView?: string;
  onRegisterViewChange?: (view: string) => void;
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
  initialRegisterView,
  onRegisterViewChange,
}) => (
  <DashboardPage>
    <header className="flex flex-wrap items-end justify-between gap-4">
      <div className="min-w-0">
        <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Laboratory · Narcotics</p>
        <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Exhibit laboratory</h1>
        <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">Receive exhibits, allocate the work and follow each analysis to the memo.</p>
      </div>
      {onOpenIntake && (
        <OutlineButton size="md" tone="accent" icon={Plus} onClick={onOpenIntake} id="btn-open-intake-modal">
          Receive exhibit
        </OutlineButton>
      )}
    </header>

    {error && (
      <div role="alert" className="rounded-xl border border-rose-300 px-4 py-3 text-sm text-rose-700 dark:border-rose-900 dark:text-rose-300">
        Narcotics exhibits could not be refreshed: {error}
      </div>
    )}

    {clients.length > 0 && (
      <section aria-labelledby="narcotics-waiting-officers" className="rounded-xl border border-slate-200 dark:border-slate-800">
        <h2 id="narcotics-waiting-officers" className="border-b border-slate-200 px-4 py-2.5 text-[13px] font-semibold text-slate-900 dark:border-slate-800 dark:text-white">
          Officers waiting to hand in exhibits <span className="font-normal tabular-nums text-slate-400">{clients.length}</span>
        </h2>
        <ul className="divide-y divide-slate-200/70 dark:divide-slate-800/70">
          {clients.map((visit) => {
            const registered = intakes.find((i) => i.receptionVisitId === visit.id);
            const atReception = visit.status === 'Awaiting Laboratory Reception';
            return (
              <li key={visit.id} className="flex flex-wrap items-center gap-3 px-4 py-3 transition-colors hover:bg-slate-500/[0.04]">
                <div className="min-w-0 flex-1">
                  <div className="truncate text-[13px] font-medium text-slate-900 dark:text-white">{visit.officerName}</div>
                  <div className="truncate text-[12px] text-slate-500 dark:text-slate-400">
                    {visit.badgeNumber && <>Badge <span className="font-mono">{visit.badgeNumber}</span> · </>}
                    {visit.station || '—'} · <span className="font-mono">{visit.visitNumber}</span> · in at {visit.timeIn}
                  </div>
                </div>
                <StatusText tone={atReception ? 'sky' : 'teal'}>{atReception ? 'Waiting at reception' : 'In the laboratory'}</StatusText>
                {registered ? (
                  <span className="text-[12px] text-slate-500 dark:text-slate-400">
                    Registered · <span className="font-mono">{registered.labReference}</span>
                  </span>
                ) : atReception ? (
                  canReceiveClients && onAcceptClient ? (
                    <OutlineButton size="xs" tone="accent" icon={CheckCircle2} onClick={() => onAcceptClient(visit.id)}>Accept at laboratory</OutlineButton>
                  ) : (
                    <span className="text-[12px] text-slate-500 dark:text-slate-400">Waiting to be accepted</span>
                  )
                ) : (
                  onRegisterExhibit && (
                    <OutlineButton size="xs" tone="accent" icon={Plus} onClick={() => onRegisterExhibit(visit)}>Register exhibit</OutlineButton>
                  )
                )}
              </li>
            );
          })}
        </ul>
      </section>
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
      initialRegisterView={initialRegisterView}
      onRegisterViewChange={onRegisterViewChange}
    />
  </DashboardPage>
);
