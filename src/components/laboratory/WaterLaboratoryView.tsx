import React from 'react';
import { CheckCircle2, Droplets, FileText, FlaskConical, Inbox, Plus, Users } from 'lucide-react';
import { OfficerVisitor, User, WaterIntake } from '../../types';
import { formatKes } from '../../waterIntake';
import {
  Button,
  DashboardPage,
  Panel,
  StatusPill,
} from '../common/Dashboard';
import { WaterRegisterPanel } from './WaterRegisterPanel';
import { BreakdownBarChart, OfficerWorkload, OfficerWorkloadGauges } from './WaterLabCharts';

/**
 * Water & Environment laboratory page. Everything here is derived from the
 * Water exhibit register (the database-backed intakes), not sample data.
 */

interface WaterLaboratoryViewProps {
  intakes: WaterIntake[];
  currentUser: Pick<User, 'id' | 'name' | 'role'>;
  officers: Pick<User, 'id' | 'name'>[];
  onOpenIntake?: () => void;
  onAssign: (intakeId: string, officerId: string, remarks: string) => Promise<boolean>;
  onOpenCaseFile?: (intake: WaterIntake) => void;
  onEdit?: (intake: WaterIntake) => void;
  onDelete?: (intakeId: string) => void;
  /** Clients routed to Water that are still on site. */
  clients?: OfficerVisitor[];
  canReceiveClients?: boolean;
  onAcceptClient?: (visitId: string) => void;
  /** Opens the intake form for a client who has been received. */
  onRegisterExhibit?: (visit: OfficerVisitor) => void;
}

const tally = (values: string[]) => {
  const counts = new Map<string, number>();
  values.forEach((v) => counts.set(v, (counts.get(v) ?? 0) + 1));
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
};

export const WaterLaboratoryView: React.FC<WaterLaboratoryViewProps> = ({
  intakes,
  currentUser,
  officers,
  onOpenIntake,
  onAssign,
  onOpenCaseFile,
  onEdit,
  onDelete,
  clients = [],
  canReceiveClients = false,
  onAcceptClient,
  onRegisterExhibit,
}) => {
  const awaiting = intakes.filter((i) => i.status === 'Awaiting Assignment' || i.status === 'Awaiting Approval').length;
  const underAnalysis = intakes.filter((i) => i.status === 'Under Analysis').length;
  const complete = intakes.filter((i) => i.status === 'Analysis Complete').length;
  const revenue = intakes.reduce((sum, i) => sum + (i.charges || 0), 0);

  const byTest = tally(intakes.map((i) => i.testType));
  const bySource = tally(intakes.map((i) => i.sourceCategory));

  // Workload per Analysis Officer, including officers with nothing on the bench.
  const officerLoads: OfficerWorkload[] = officers.map((officer) => ({
    id: officer.id,
    name: officer.name,
    active: intakes.filter((i) => i.status === 'Under Analysis' && i.analysisOfficerId === officer.id).length,
    done: intakes.filter((i) => i.status === 'Analysis Complete' && i.analysisOfficerId === officer.id).length,
  }));
  const sampleMixContent = intakes.length === 0 ? (
    <p className="py-2 text-xs text-slate-400">No exhibits registered yet.</p>
  ) : (
    <div className="grid gap-6 md:grid-cols-2 md:divide-x md:divide-slate-100 dark:md:divide-slate-800">
      <BreakdownBarChart title="Type of test" entries={byTest} />
      <div className="md:pl-6">
        <BreakdownBarChart title="Source of locality" entries={bySource} />
      </div>
    </div>
  );

  return (
    <DashboardPage>
      {/* Laboratory banner: uses the app's own surface colours, so it follows the light and dark theme */}
      <header className="rounded-2xl border border-slate-200 bg-white px-6 py-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="flex min-w-0 items-start gap-4">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-sky-500/10 text-sky-600 ring-1 ring-inset ring-sky-500/20 dark:text-sky-400">
              <Droplets className="h-5 w-5" />
            </span>
            <div className="min-w-0">
              <p className="text-[12px] font-medium text-slate-500 dark:text-slate-400">Laboratory · Water &amp; Environment</p>
              <h1 className="mt-0.5 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Exhibit laboratory</h1>
              <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
                {intakes.length} {intakes.length === 1 ? 'exhibit' : 'exhibits'} on record · {formatKes(revenue)} in charges
              </p>
            </div>
          </div>
          {onOpenIntake && (
            <Button variant="primary" icon={Plus} onClick={onOpenIntake} id="btn-open-intake-modal">
              Exhibit intake
            </Button>
          )}
        </div>
        <ul aria-label="Stage counts" className="mt-5 flex flex-wrap gap-2 border-t border-slate-100 pt-4 dark:border-slate-800">
          {[
            { label: 'Awaiting assignment', count: awaiting, dot: 'bg-amber-500' },
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

      {clients.length > 0 && (
        <Panel
          icon={Users}
          tone="amber"
          title="Clients at the laboratory"
          description={`${clients.length} ${clients.length === 1 ? 'client' : 'clients'} to receive or register`}
          flush
        >
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {clients.map((visit) => {
              const registered = intakes.find((i) => i.receptionVisitId === visit.id);
              const waiting = visit.status === 'Awaiting Laboratory Reception';
              return (
                <li key={visit.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-slate-900 dark:text-white">{visit.station || visit.officerName}</div>
                    <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {visit.officerName} · <span className="font-mono">{visit.visitNumber}</span> · in at {visit.timeIn}
                    </div>
                  </div>
                  <StatusPill tone={waiting ? 'sky' : 'amber'}>{waiting ? 'Waiting at reception' : 'In the laboratory'}</StatusPill>
                  {waiting ? (
                    canReceiveClients && onAcceptClient ? (
                      <Button size="xs" variant="primary" icon={CheckCircle2} onClick={() => onAcceptClient(visit.id)}>
                        Accept at laboratory
                      </Button>
                    ) : (
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">Waiting to be accepted</span>
                    )
                  ) : registered ? (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Registered · <span className="font-mono">{registered.labReference}</span>
                    </span>
                  ) : (
                    onRegisterExhibit && (
                      <Button size="xs" variant="primary" icon={Plus} onClick={() => onRegisterExhibit(visit)}>
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

      <WaterRegisterPanel
        intakes={intakes}
        currentUser={currentUser}
        officers={officers}
        onAssign={onAssign}
        onOpenCaseFile={onOpenCaseFile}
        onEdit={onEdit}
        onDelete={onDelete}
      />

      {currentUser.role === 'HEAD_OF_DEPARTMENT' ? (
        <Panel
          icon={FlaskConical}
          tone="sky"
          title="Laboratory analytics"
          description={`${intakes.length} ${intakes.length === 1 ? 'exhibit' : 'exhibits'} · workload and sample mix`}
        >
          <div className="space-y-6">
            <section aria-labelledby="officer-workload-heading">
              <h2 id="officer-workload-heading" className="mb-1 text-sm font-semibold text-slate-900 dark:text-white">Officer workload</h2>
              <p className="mb-2 text-xs text-slate-500 dark:text-slate-400">Exhibits per Analysis Officer, busiest first. Select an officer to view details.</p>
              {officerLoads.length === 0 ? (
                <p className="py-2 text-xs text-slate-400">No Analysis Officers to show yet.</p>
              ) : (
                <OfficerWorkloadGauges officers={officerLoads} />
              )}
            </section>
            <section aria-labelledby="sample-mix-heading" className="border-t border-slate-100 pt-5 dark:border-slate-800">
              <div className="mb-3">
                <h2 id="sample-mix-heading" className="text-sm font-semibold text-slate-900 dark:text-white">Sample mix</h2>
                <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">Exhibits received by test type and source of locality.</p>
              </div>
              {sampleMixContent}
            </section>
          </div>
        </Panel>
      ) : (
        <Panel icon={FlaskConical} tone="amber" title="Sample mix" description={`${intakes.length} ${intakes.length === 1 ? 'exhibit' : 'exhibits'} received`}>
          {sampleMixContent}
        </Panel>
      )}
    </DashboardPage>
  );
};
