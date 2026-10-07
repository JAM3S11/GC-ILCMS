import React, { useMemo, useState } from 'react';
import {
  Activity,
  Check,
  CheckCircle2,
  ClipboardList,
  FileCheck,
  FlaskConical,
  Gauge,
  Inbox,
  Lock,
  Plus,
  TestTube,
  Users,
} from 'lucide-react';
import { FoodDrugIntake, FoodDrugIntakeStatus, FoodDrugSampleType, OfficerVisitor, User } from '../../types';
import {
  Button,
  DashboardHeader,
  DashboardPage,
  KpiCard,
  KpiGrid,
  Panel,
  SearchInput,
  SegmentedControl,
  StatusPill,
  Tone,
  TONE,
} from '../common/Dashboard';
import { Select } from '../common/Select';
import { FoodDrugRegisterPanel } from './FoodDrugRegisterPanel';
import { FoodDrugIntakeEdit } from './FoodDrugIntakeEditModal';

/**
 * Food & Drugs Exhibit Laboratory. Everything on the page — stat cards, Bench
 * work, Instruments, Active case progress and Exhibit storage — is derived from
 * the live Food & Drugs register (database records refreshed every 15 seconds),
 * so it only ever shows this section's own samples.
 */

interface FoodDrugLaboratoryViewProps {
  intakes: FoodDrugIntake[];
  currentUser: Pick<User, 'id' | 'name' | 'role'>;
  officers: Pick<User, 'id' | 'name'>[];
  onOpenIntake?: () => void;
  onApprove: (intakeId: string) => void;
  onAssign: (intakeId: string, analystId: string, remarks: string) => Promise<boolean>;
  onReport: (intakeId: string, reportedBy: string) => void;
  onOpenCaseFile?: (intake: FoodDrugIntake) => void;
  onEdit?: (intakeId: string, edit: FoodDrugIntakeEdit) => void;
  onDelete?: (intakeId: string) => void;
  /** Clients reception has sent to Food & Drugs who are waiting or in the laboratory. */
  clients?: OfficerVisitor[];
  canReceiveClients?: boolean;
  onAcceptClient?: (visitId: string) => void;
  /** Opens the intake form for this client. */
  onRegisterSample?: (visit: OfficerVisitor) => void;
}

type BenchFilter = 'active' | 'mine' | 'approval' | 'assignment' | 'reported' | 'all';

const STATUS_TONE: Record<FoodDrugIntakeStatus, Tone> = {
  'Awaiting Approval': 'rose',
  'Awaiting Assignment': 'amber',
  'Under Analysis': 'sky',
  Reported: 'emerald',
};

/** The analytical technique each sample category is run on. */
const INSTRUMENT_FOR: Record<FoodDrugSampleType, { id: string; name: string; method: string }> = {
  Aflatoxin: { id: 'HPLC-FLD', name: 'HPLC with fluorescence detection', method: 'Aflatoxins B1, B2, G1, G2, M1' },
  Mycotoxins: { id: 'LC-MS/MS', name: 'Liquid chromatography – tandem mass spectrometry', method: 'Ochratoxin A, fumonisins, ZEN, DON' },
  Miscellaneous: { id: 'UV-Vis / GC-MS', name: 'UV-Vis spectrophotometry and GC-MS', method: 'Drugs, cosmetics, additives, chemicals' },
};

const STORAGE_LOCATION = 'Food & Drugs Sample Store — Store R-01';

const PROGRESS_STEPS: { label: string; done: (intake: FoodDrugIntake) => boolean; detail: (intake: FoodDrugIntake) => string }[] = [
  { label: 'Sample registered', done: () => true, detail: (i) => `${i.intakeDate} · received by ${i.receiver}` },
  { label: 'Documents approved', done: (i) => !!i.approvedDate, detail: (i) => (i.approvedBy ? `${i.approvedBy} · ${i.approvedDate}` : 'Waiting for the Head of Section') },
  { label: 'Officer assigned', done: (i) => !!i.analystAssigned, detail: (i) => (i.analystAssigned ? `${i.analystAssigned} · ${i.assignedDate}` : 'Not yet assigned') },
  { label: 'Analysed & reported', done: (i) => i.status === 'Reported', detail: (i) => (i.reportedBy ? `${i.reportedBy} · ${i.reportedDate}` : 'Analysis in progress or not started') },
];

export const FoodDrugLaboratoryView: React.FC<FoodDrugLaboratoryViewProps> = ({
  intakes,
  currentUser,
  officers,
  onOpenIntake,
  onApprove,
  onAssign,
  onReport,
  onOpenCaseFile,
  onEdit,
  onDelete,
  clients = [],
  canReceiveClients = false,
  onAcceptClient,
  onRegisterSample,
}) => {
  const isHead = currentUser.role === 'HEAD_OF_DEPARTMENT';
  const awaitingApproval = intakes.filter((i) => i.status === 'Awaiting Approval');
  const awaitingAssignment = intakes.filter((i) => i.status === 'Awaiting Assignment');
  const underAnalysis = intakes.filter((i) => i.status === 'Under Analysis');
  const reported = intakes.filter((i) => i.status === 'Reported');
  const active = intakes.filter((i) => i.status !== 'Reported');
  const mine = intakes.filter((i) => i.analystId === currentUser.id && i.status !== 'Reported');

  /* ---------------- Bench work ---------------- */
  const [filter, setFilter] = useState<BenchFilter>(!isHead && mine.length > 0 ? 'mine' : 'active');
  const [query, setQuery] = useState('');
  const benchRows = useMemo(() => {
    const base =
      filter === 'mine' ? mine
        : filter === 'approval' ? awaitingApproval
          : filter === 'assignment' ? awaitingAssignment
            : filter === 'reported' ? reported
              : filter === 'active' ? active
                : intakes;
    const q = query.trim().toLowerCase();
    if (!q) return base;
    return base.filter((i) =>
      [i.id, i.exhibitId, i.clientName, i.sampleType, i.receiver, i.analystAssigned ?? '']
        .some((value) => value.toLowerCase().includes(q)),
    );
  }, [filter, query, intakes, mine, awaitingApproval, awaitingAssignment, reported, active]);

  /* ---------------- Instruments: live workload per technique ---------------- */
  const instruments = (Object.keys(INSTRUMENT_FOR) as FoodDrugSampleType[]).map((type) => {
    const running = underAnalysis.filter((i) => i.sampleType === type).length;
    const queued = intakes.filter(
      (i) => i.sampleType === type && (i.status === 'Awaiting Approval' || i.status === 'Awaiting Assignment'),
    ).length;
    return { type, ...INSTRUMENT_FOR[type], running, queued };
  });
  const instrumentsInUse = instruments.filter((inst) => inst.running > 0).length;
  const maxLoad = Math.max(1, ...instruments.map((inst) => inst.running + inst.queued));

  /* ---------------- Active case progress ---------------- */
  // Defaults to the officer's own oldest open sample, else the newest open one.
  const defaultProgressId = (mine[mine.length - 1] ?? active[0] ?? intakes[0])?.id ?? '';
  const [progressId, setProgressId] = useState('');
  const progressIntake = intakes.find((i) => i.id === (progressId || defaultProgressId));
  const progressDone = progressIntake ? PROGRESS_STEPS.filter((step) => step.done(progressIntake)).length : 0;

  /* ---------------- Exhibit storage ---------------- */
  const inStore = intakes.length;
  const latestStored = intakes.slice(0, 4);

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Laboratory', 'Food & Drugs']}
        title="Food, Drugs and Chemical Substances laboratory"
        description="Live samples registered, approved and analysed by the Food & Drugs section."
        meta={<StatusPill tone="emerald" pulse>Live register</StatusPill>}
        actions={
          onOpenIntake && (
            <Button variant="primary" icon={Plus} onClick={onOpenIntake}>
              Register sample
            </Button>
          )
        }
      />

      <KpiGrid label="Food & Drugs laboratory metrics">
        <KpiCard
          label="Samples in queue"
          value={active.length}
          icon={TestTube}
          tone="amber"
          hint={`${intakes.length} in the register`}
          action={{ label: 'View queue', onClick: () => setFilter('active') }}
        />
        <KpiCard
          label="Awaiting approval"
          value={awaitingApproval.length}
          icon={ClipboardList}
          tone="rose"
          hint="Documents to review"
          action={{ label: 'Show', onClick: () => setFilter('approval') }}
        />
        <KpiCard
          label="Awaiting assignment"
          value={awaitingAssignment.length}
          icon={Inbox}
          tone="violet"
          hint="Need an officer"
          action={{ label: 'Show', onClick: () => setFilter('assignment') }}
        />
        <KpiCard
          label="Under analysis"
          value={underAnalysis.length}
          icon={FlaskConical}
          tone="sky"
          hint={`${instrumentsInUse} of ${instruments.length} techniques in use`}
          progress={intakes.length ? (underAnalysis.length / intakes.length) * 100 : 0}
        />
        <KpiCard
          label="Reported"
          value={reported.length}
          icon={FileCheck}
          tone="emerald"
          hint="Analysis recorded"
          action={{ label: 'Show', onClick: () => setFilter('reported') }}
        />
      </KpiGrid>

      {clients.length > 0 && (
        <Panel
          icon={Users}
          tone="amber"
          title="Clients at the laboratory"
          description={`${clients.length} ${clients.length === 1 ? 'client' : 'clients'} sent by reception to receive or register`}
          flush
        >
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {clients.map((visit) => {
              const registered = intakes.find((i) => i.receptionVisitId === visit.id);
              const waiting = visit.status === 'Awaiting Laboratory Reception';
              return (
                <li key={visit.id} className="flex flex-wrap items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-slate-900 dark:text-white">{visit.officerName}</div>
                    <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {visit.station} · <span className="font-mono">{visit.visitNumber}</span> · in at {visit.timeIn}
                    </div>
                  </div>
                  <StatusPill tone={waiting ? 'sky' : 'amber'}>{waiting ? 'Waiting at reception' : 'In the laboratory'}</StatusPill>
                  {registered ? (
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Registered · <span className="font-mono">{registered.id}</span>
                    </span>
                  ) : (
                    <div className="flex flex-wrap items-center gap-2">
                      {waiting && canReceiveClients && onAcceptClient && (
                        <Button size="xs" icon={CheckCircle2} onClick={() => onAcceptClient(visit.id)}>
                          Accept at laboratory
                        </Button>
                      )}
                      {onRegisterSample && (
                        <Button size="xs" variant="primary" icon={Plus} onClick={() => onRegisterSample(visit)}>
                          Register sample
                        </Button>
                      )}
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        </Panel>
      )}

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
        {/* Bench work: the live register with its workflow actions */}
        <div className="min-w-0 xl:col-span-8">
          <FoodDrugRegisterPanel
            title="Bench work"
            description={`${benchRows.length} of ${intakes.length} samples in Food & Drugs`}
            actions={<SearchInput value={query} onChange={setQuery} placeholder="Search sample, client, officer…" />}
            toolbar={
              <div className="overflow-x-auto border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
                <SegmentedControl
                  ariaLabel="Bench work view"
                  value={filter}
                  onChange={setFilter}
                  options={[
                    { value: 'active', label: 'In progress', count: active.length },
                    ...(isHead ? [] : [{ value: 'mine' as const, label: 'Assigned to me', count: mine.length }]),
                    { value: 'approval', label: 'Awaiting approval', count: awaitingApproval.length },
                    { value: 'assignment', label: 'Awaiting assignment', count: awaitingAssignment.length },
                    { value: 'reported', label: 'Reported', count: reported.length },
                    { value: 'all', label: 'All', count: intakes.length },
                  ]}
                />
              </div>
            }
            emptyTitle={query.trim() ? 'No samples match your search' : 'No samples in this view'}
            intakes={benchRows}
            currentUser={currentUser}
            officers={officers}
            onApprove={onApprove}
            onAssign={onAssign}
            onReport={onReport}
            onOpenCaseFile={onOpenCaseFile}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        </div>

        {/* Right rail */}
        <div className="space-y-5 xl:col-span-4">
          <Panel
            icon={Activity}
            tone="violet"
            title="Instruments"
            description={`${instrumentsInUse} in use · workload from the live register`}
            flush
          >
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {instruments.map((inst) => {
                const inUse = inst.running > 0;
                return (
                  <li key={inst.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono text-[12px] font-semibold text-slate-900 dark:text-white">{inst.id}</div>
                        <div className="truncate text-[11px] text-slate-500 dark:text-slate-400" title={inst.name}>{inst.name}</div>
                      </div>
                      <StatusPill tone={inUse ? 'sky' : 'emerald'} pulse={inUse}>{inUse ? 'In use' : 'Available'}</StatusPill>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      <Gauge className="h-3 w-3 shrink-0" />
                      <span className="truncate">
                        {inst.type}: {inst.running} under analysis · {inst.queued} waiting
                      </span>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                      <div
                        className={`h-full rounded-full ${inUse ? TONE.sky.bar : TONE.emerald.bar}`}
                        style={{ width: `${((inst.running + inst.queued) / maxLoad) * 100}%` }}
                      />
                    </div>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel
            icon={CheckCircle2}
            tone="emerald"
            title="Active case progress"
            description={progressIntake ? `${progressIntake.id} · ${progressDone} of ${PROGRESS_STEPS.length} steps` : 'No samples yet'}
          >
            {progressIntake ? (
              <>
                <Select
                  size="sm"
                  aria-label="Sample to follow"
                  value={progressIntake.id}
                  onChange={setProgressId}
                  options={intakes.map((i) => ({ value: i.id, label: `${i.id} · ${i.clientName}` }))}
                />
                <div className="my-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                  <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(progressDone / PROGRESS_STEPS.length) * 100}%` }} />
                </div>
                <ul className="space-y-2.5">
                  {PROGRESS_STEPS.map((step) => {
                    const done = step.done(progressIntake);
                    return (
                      <li key={step.label} className="flex items-start gap-2.5 text-[13px]">
                        <span
                          className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full ${
                            done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600'
                          }`}
                        >
                          <Check className="h-3 w-3" />
                        </span>
                        <span className="min-w-0">
                          <span className={done ? 'text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}>{step.label}</span>
                          <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">{step.detail(progressIntake)}</span>
                        </span>
                      </li>
                    );
                  })}
                </ul>
                <div className="mt-3 flex items-center justify-between border-t border-slate-100 pt-3 text-[11px] dark:border-slate-800">
                  <span className="text-slate-500 dark:text-slate-400">{progressIntake.sampleType} · {INSTRUMENT_FOR[progressIntake.sampleType].id}</span>
                  <StatusPill tone={STATUS_TONE[progressIntake.status]}>{progressIntake.status}</StatusPill>
                </div>
              </>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">Register a sample to follow its progress here.</p>
            )}
          </Panel>

          <Panel icon={Lock} tone="slate" title="Exhibit storage" description={STORAGE_LOCATION}>
            <div className="grid grid-cols-3 gap-2 text-center">
              {[
                { label: 'In store', value: inStore },
                { label: 'In progress', value: active.length },
                { label: 'Reported', value: reported.length },
              ].map((cell) => (
                <div key={cell.label} className="rounded-lg bg-slate-50 px-2 py-2 dark:bg-slate-950/50">
                  <div className="text-base font-semibold tabular-nums text-slate-900 dark:text-white">{cell.value}</div>
                  <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400">{cell.label}</div>
                </div>
              ))}
            </div>
            {latestStored.length > 0 && (
              <ul className="mt-4 divide-y divide-slate-100 border-t border-slate-100 dark:divide-slate-800 dark:border-slate-800">
                {latestStored.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 py-2 text-[11px]">
                    <div className="min-w-0">
                      <div className="font-mono font-semibold text-slate-900 dark:text-white">{i.exhibitId}</div>
                      <div className="truncate font-mono text-slate-500 dark:text-slate-400">Seal {i.sealNumber ?? '—'}</div>
                    </div>
                    <StatusPill tone="emerald" dot={false}>Sealed</StatusPill>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </DashboardPage>
  );
};
