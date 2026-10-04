import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  Beaker,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  FileCheck,
  FileText,
  FlaskConical,
  Gauge,
  Inbox,
  Link2,
  Lock,
  Microscope,
  Package,
  Plus,
  ShieldCheck,
  TestTube,
  UserCheck,
  Wrench,
} from 'lucide-react';
import { ForensicCase, OfficerVisitor, LaboratoryDepartment, ExhibitItem, ExaminationRecord, FoodDrugIntake, User, UserRole, WaterIntake } from '../../types';
import { OfficerVerificationModal } from './OfficerVerificationModal';
import { SubmissionIntakeModal } from './SubmissionIntakeModal';
import { FoodDrugRegisterPanel } from './FoodDrugRegisterPanel';
import { WaterLaboratoryView } from './WaterLaboratoryView';
import { FoodDrugIntakeEdit } from './FoodDrugIntakeEditModal';
import {
  Avatar,
  Button,
  DashboardHeader,
  DashboardPage,
  DetailItem,
  EmptyState,
  KpiCard,
  KpiGrid,
  Panel,
  SearchInput,
  SegmentedControl,
  StatusPill,
  Tone,
  TONE,
  tableClasses as tc,
} from '../common/Dashboard';

interface LaboratoryWorkspaceProps {
  currentDepartment: LaboratoryDepartment;
  activeCase: ForensicCase;
  visitor: OfficerVisitor;
  onOpenCaseFile: (caseId: string) => void;
  onVerifyOfficer: () => void;
  officerVerified: boolean;
  /** Signed-in officer, recorded as the receiver of new submissions. */
  currentUserId?: string;
  currentUserName?: string;
  currentUserRole?: UserRole;
  /** Food & Drugs officers the Head of Section can assign samples to. */
  foodDrugOfficers?: Pick<User, 'id' | 'name'>[];
  onApproveFoodDrugIntake?: (intakeId: string) => void;
  onAssignFoodDrugIntake?: (intakeId: string, analyst: string) => void;
  onReportFoodDrugIntake?: (intakeId: string, reportedBy: string) => void;
  onEditFoodDrugIntake?: (intakeId: string, edit: FoodDrugIntakeEdit) => void;
  onDeleteFoodDrugIntake?: (intakeId: string) => void;
  /** Water & Environment officers the Head can assign exhibits to. */
  waterOfficers?: Pick<User, 'id' | 'name'>[];
  waterIntakes?: WaterIntake[];
  onAssignWaterIntake?: (intakeId: string, officer: string) => void;
  onOpenWaterCaseFile?: (intake: WaterIntake) => void;
  onEditWaterIntake?: (intake: WaterIntake) => void;
  onDeleteWaterIntake?: (intakeId: string) => void;
  /** Opens the department's intake (a full page for Food & Drugs and Water). */
  onOpenIntake?: () => void;
  onRegisterSubmission?: (submissionData: {
    caseNumber: string;
    submissionType: string;
    description: string;
    dateReceived: string;
    receivedFrom: string;
    receivedBy: string;
    department: LaboratoryDepartment;
    storageLocation: string;
    supportingDocuments: string;
    remarks: string;
    exhibits: ExhibitItem[];
    foodDrugIntake?: FoodDrugIntake;
    waterIntake?: WaterIntake;
  }) => void;
}

/* ------------------------------------------------------------------ */
/*  Lab reference data                                                */
/* ------------------------------------------------------------------ */

type InstrumentState = 'running' | 'idle' | 'calibration' | 'maintenance';

const INSTRUMENT_STATE: Record<InstrumentState, { label: string; tone: Tone }> = {
  running: { label: 'Running', tone: 'emerald' },
  idle: { label: 'Idle', tone: 'slate' },
  calibration: { label: 'Calibration due', tone: 'amber' },
  maintenance: { label: 'Maintenance', tone: 'rose' },
};

const INSTRUMENTS: { id: string; model: string; state: InstrumentState; detail: string; utilisation: number }[] = [
  { id: 'GC-MS-01', model: 'Agilent 7890B / 5977A', state: 'running', detail: 'Seq. GCMS-2026-00851 · 6 of 14 vials', utilisation: 82 },
  { id: 'UV-Vis-02', model: 'Shimadzu UV-1800', state: 'running', detail: 'Scan 200–350 nm · ~12 min left', utilisation: 64 },
  { id: 'HPLC-03', model: 'Agilent 1260 Infinity II', state: 'calibration', detail: 'Calibration due in 2 days', utilisation: 41 },
  { id: 'FTIR-01', model: 'PerkinElmer Spectrum Two', state: 'idle', detail: 'Available · last QC pass today 08:10', utilisation: 23 },
];

type QueueStage = 'intake' | 'analysis' | 'results' | 'draft' | 'review';

const QUEUE_STAGE: Record<QueueStage, { label: string; tone: Tone }> = {
  intake: { label: 'Awaiting intake', tone: 'sky' },
  analysis: { label: 'In analysis', tone: 'amber' },
  results: { label: 'Results ready', tone: 'cyan' },
  draft: { label: 'Draft report', tone: 'violet' },
  review: { label: 'Peer review', tone: 'emerald' },
};

const EXAM_STATUS: Record<ExaminationRecord['status'], { label: string; tone: Tone }> = {
  PENDING: { label: 'Pending', tone: 'slate' },
  'IN PROGRESS': { label: 'In progress', tone: 'amber' },
  PAUSED: { label: 'Paused', tone: 'slate' },
  COMPLETED: { label: 'Completed', tone: 'emerald' },
  'REQUIRES REVIEW': { label: 'Needs review', tone: 'rose' },
};

type WorkTab = 'queue' | 'examinations' | 'custody';

const CASE_STEPS = ['Exhibit received', 'Sampled', 'Examined', 'Report drafted', 'Peer reviewed'];

/* ------------------------------------------------------------------ */
/*  Workspace                                                          */
/* ------------------------------------------------------------------ */

export const LaboratoryWorkspace: React.FC<LaboratoryWorkspaceProps> = ({
  currentDepartment,
  activeCase,
  visitor,
  currentUserId,
  onOpenCaseFile,
  onVerifyOfficer,
  officerVerified,
  currentUserName = 'Dr. Grace Wanjiku, PhD',
  currentUserRole = 'ANALYST',
  foodDrugOfficers = [],
  onApproveFoodDrugIntake,
  onAssignFoodDrugIntake,
  onReportFoodDrugIntake,
  onEditFoodDrugIntake,
  onDeleteFoodDrugIntake,
  waterOfficers = [],
  waterIntakes = activeCase.waterIntakes ?? [],
  onAssignWaterIntake,
  onOpenWaterCaseFile,
  onEditWaterIntake,
  onDeleteWaterIntake,
  onOpenIntake,
  onRegisterSubmission,
}) => {
  const [showVerificationModal, setShowVerificationModal] = useState(false);
  const [showIntakeModal, setShowIntakeModal] = useState(false);
  const [tab, setTab] = useState<WorkTab>('queue');
  const [query, setQuery] = useState('');
  const [expanded, setExpanded] = useState<Record<string, boolean>>({ [activeCase.id]: true });
  const toggleRow = (id: string) => setExpanded((m) => ({ ...m, [id]: !m[id] }));

  // Food & Drugs and Water register samples on their own page; other labs use the modal.
  const openIntake = () => {
    if ((currentDepartment === 'Food & Drugs' || currentDepartment === 'Water') && onOpenIntake) onOpenIntake();
    else setShowIntakeModal(true);
  };

  const handleConfirmOfficerVerification = (data: { proceedToIntake: boolean }) => {
    onVerifyOfficer();
    setShowVerificationModal(false);
    if (data.proceedToIntake) openIntake();
  };

  const handleSaveIntake = (submissionData: any) => {
    onRegisterSubmission?.(submissionData);
    setShowIntakeModal(false);
  };

  // The Water lab runs entirely off its own register of real intake records.
  if (currentDepartment === 'Water') {
    return (
      <WaterLaboratoryView
        intakes={waterIntakes}
        currentUser={{ id: currentUserId ?? '', name: currentUserName ?? '', role: currentUserRole ?? 'ANALYST' }}
        officers={waterOfficers}
        onOpenIntake={onOpenIntake}
        onAssign={(id, officer) => onAssignWaterIntake?.(id, officer)}
        onOpenCaseFile={onOpenWaterCaseFile}
        onEdit={onEditWaterIntake}
        onDelete={onDeleteWaterIntake}
      />
    );
  }

  /* ---------------- Case progress ---------------- */
  const caseProgress = [
    { label: 'Exhibit received', done: activeCase.exhibits.length > 0 },
    { label: 'Sampled', done: activeCase.samples.length > 0 },
    { label: 'Examined', done: activeCase.examinations.every((e) => e.status === 'COMPLETED') },
    { label: 'Report drafted', done: !!activeCase.draftReport || activeCase.status === 'REPORT_DRAFT' },
    { label: 'Peer reviewed', done: ['APPROVED', 'COMPLETED', 'ARCHIVED'].includes(activeCase.status) },
  ];
  const progressDone = caseProgress.filter((s) => s.done).length;

  /* ---------------- Work queue (active case + department backlog) ---------------- */
  const queue: {
    id: string;
    caseNumber: string;
    labRef: string;
    sample: string;
    agency: string;
    method: string;
    stage: QueueStage;
    analyst: string;
    due: string;
    overdue?: boolean;
    isActive?: boolean;
    stepsDone: number;
    exams: { name: string; instrument: string; status: ExaminationRecord['status'] }[];
    exhibits: { id: string; description: string; location: string; seal: string }[];
  }[] = [
    {
      id: activeCase.id,
      caseNumber: activeCase.caseNumber,
      labRef: activeCase.labReferenceNumber,
      sample: `${activeCase.exhibits.map((e) => e.id).join(', ')} · compressed off-white powder`,
      agency: activeCase.requestingDepartment,
      method: 'Spot test · GC-MS · UV-Vis',
      stage: 'draft',
      analyst: activeCase.assignedAnalyst,
      due: 'Court in 48h',
      overdue: true,
      isActive: true,
      stepsDone: progressDone,
      exams: activeCase.examinations.map((e) => ({
        name: e.examinationType.replace(/s*(.*)$/, ''),
        instrument: e.instrument,
        status: e.status,
      })),
      exhibits: activeCase.exhibits.map((e) => ({
        id: e.id,
        description: e.description,
        location: e.storageLocation,
        seal: e.sealNumber,
      })),
    },
    {
      id: 'LQ-2',
      caseNumber: 'GC/EXM/2026/0011',
      labRef: `GC/${currentDepartment.slice(0, 3).toUpperCase()}/2026/0151`,
      sample: 'EXH-0014 · green plant material, 1.2 kg',
      agency: 'DCI Kilimani',
      method: 'Microscopy · GC-MS',
      stage: 'analysis',
      analyst: 'Mary Chebet',
      due: 'SLA 3 days',
      stepsDone: 2,
      exams: [
        { name: 'Stereo-microscopy', instrument: 'Olympus SZ61', status: 'COMPLETED' },
        { name: 'GC-MS profiling', instrument: 'GC-MS-01', status: 'IN PROGRESS' },
      ],
      exhibits: [{ id: 'EXH-0014', description: 'Green plant material in brown paper sack, 1.2 kg gross', location: 'Vault A · Locker N-07', seal: 'KE-DCI-SEAL-885102' }],
    },
    {
      id: 'LQ-3',
      caseNumber: 'GC/EXM/2026/0012',
      labRef: `GC/${currentDepartment.slice(0, 3).toUpperCase()}/2026/0152`,
      sample: 'EXH-0017 · 38 blister-packed tablets',
      agency: 'Pharmacy & Poisons Board',
      method: 'FTIR · HPLC',
      stage: 'results',
      analyst: 'Dr. Patrick Ochieng',
      due: 'SLA 4 days',
      stepsDone: 3,
      exams: [
        { name: 'FTIR identification', instrument: 'FTIR-01', status: 'COMPLETED' },
        { name: 'HPLC assay', instrument: 'HPLC-03', status: 'REQUIRES REVIEW' },
      ],
      exhibits: [{ id: 'EXH-0017', description: '38 blister-packed white tablets, marked "AMX 500"', location: 'Vault B · Shelf F-02', seal: 'PPB-SEAL-22871' }],
    },
    {
      id: 'LQ-4',
      caseNumber: 'GC/EXM/2026/0013',
      labRef: `GC/${currentDepartment.slice(0, 3).toUpperCase()}/2026/0153`,
      sample: visitor.exhibitsPresented || 'Exhibits at receiving bay',
      agency: visitor.station,
      method: 'Not yet assigned',
      stage: 'intake',
      analyst: 'Unallocated',
      due: 'Arrived today',
      stepsDone: 0,
      exams: [],
      exhibits: [],
    },
    {
      id: 'LQ-5',
      caseNumber: 'GC/EXM/2026/0009',
      labRef: `GC/${currentDepartment.slice(0, 3).toUpperCase()}/2026/0147`,
      sample: 'EXH-0009 · brown crystalline substance',
      agency: 'ANU Mombasa',
      method: 'GC-MS · quantitation',
      stage: 'review',
      analyst: 'Dr. Grace Wanjiku, PhD',
      due: 'SLA 1 day',
      stepsDone: 4,
      exams: [
        { name: 'Colour spot tests', instrument: 'None (spot plate)', status: 'COMPLETED' },
        { name: 'GC-MS quantitation', instrument: 'GC-MS-01', status: 'COMPLETED' },
      ],
      exhibits: [{ id: 'EXH-0009', description: 'Brown crystalline substance in knotted polythene, 54.2 g', location: 'Vault A · Locker N-02', seal: 'KE-ANU-SEAL-40981' }],
    },
  ];

  const q = query.trim().toLowerCase();
  const queueRows = queue.filter(
    (r) =>
      !q ||
      r.caseNumber.toLowerCase().includes(q) ||
      r.sample.toLowerCase().includes(q) ||
      r.analyst.toLowerCase().includes(q) ||
      r.method.toLowerCase().includes(q)
  );

  const allExpanded = queueRows.length > 0 && queueRows.every((r) => expanded[r.id]);

  const running = INSTRUMENTS.filter((i) => i.state === 'running').length;
  const exhibit = activeCase.exhibits[0];

  /* ---------------- Receiving-bay intake steps ---------------- */
  const intakeSteps = [
    { label: 'Arrived', detail: `Reception · ${visitor.timeIn}`, done: true },
    { label: 'Identity verified', detail: officerVerified ? 'Badge & national ID checked' : 'Awaiting analyst', done: officerVerified },
    { label: 'Exhibits received', detail: officerVerified ? 'Record intake form' : 'After verification', done: false },
    { label: 'Case opened', detail: activeCase.caseNumber, done: false },
  ];
  const currentStep = intakeSteps.findIndex((s) => !s.done);

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Laboratory', currentDepartment]}
        title={`${currentDepartment} laboratory`}
        description="Receive exhibits, run examinations and move cases from bench to certified report."
        meta={<StatusPill tone="emerald" pulse>Room 104 · open</StatusPill>}
        actions={
          <>
            <Button icon={Plus} onClick={openIntake} id="btn-open-intake-modal">
              {currentDepartment === 'Food & Drugs' ? 'Register sample' : 'Exhibit intake'}
            </Button>
            <Button variant="primary" icon={FileText} onClick={() => onOpenCaseFile(activeCase.id)} id="btn-open-active-case">
              Open case file
            </Button>
          </>
        }
      />

      <KpiGrid label="Laboratory metrics">
        <KpiCard
          label="Samples in queue"
          value={queue.length}
          icon={TestTube}
          tone="amber"
          hint={`${queue.filter((r) => r.stage === 'intake').length} awaiting intake`}
          action={{ label: 'View queue', onClick: () => setTab('queue') }}
        />
        <KpiCard
          label="Examinations running"
          value={activeCase.examinations.filter((e) => e.status === 'IN PROGRESS').length + 2}
          icon={Beaker}
          tone="sky"
          hint={`${activeCase.examinations.filter((e) => e.status === 'COMPLETED').length} completed on active case`}
          action={{ label: 'View examinations', onClick: () => setTab('examinations') }}
        />
        <KpiCard
          label="Instruments in use"
          value={`${running}/${INSTRUMENTS.length}`}
          icon={Microscope}
          tone="violet"
          progress={(running / INSTRUMENTS.length) * 100}
          hint="1 calibration due this week"
        />
        <KpiCard
          label="Drafts for review"
          value={queue.filter((r) => r.stage === 'draft').length}
          icon={FileCheck}
          tone="emerald"
          hint="Ready for HoD sign-off"
          action={{ label: 'Open draft', onClick: () => onOpenCaseFile(activeCase.id) }}
        />
      </KpiGrid>

      {/* Receiving bay */}
      <Panel
        icon={UserCheck}
        tone="sky"
        title="Receiving bay"
        description={`Transferred from reception by ${visitor.receptionistName} at ${visitor.timeIn}`}
        actions={
          officerVerified ? (
            <>
              <StatusPill tone="emerald">Identity verified</StatusPill>
              <Button size="sm" icon={Package} onClick={openIntake}>
                Intake form
              </Button>
              <Button size="sm" variant="primary" icon={ArrowRight} onClick={() => onOpenCaseFile(activeCase.id)}>
                Enter case file
              </Button>
            </>
          ) : (
            <>
              <StatusPill tone="amber" pulse>Verification required</StatusPill>
              <Button size="sm" variant="primary" icon={ShieldCheck} onClick={() => setShowVerificationModal(true)} id="btn-verify-officer">
                Verify officer
              </Button>
            </>
          )
        }
      >
        <div className="grid grid-cols-1 gap-5 lg:grid-cols-12">
          <div className="lg:col-span-7">
            <div className="flex items-center gap-3">
              <Avatar name={visitor.officerName} tone="sky" size="lg" />
              <div className="min-w-0">
                <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{visitor.officerName}</div>
                <div className="truncate text-xs text-slate-500 dark:text-slate-400">{visitor.station}</div>
              </div>
            </div>
            <dl className="mt-4 grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-4">
              <DetailItem label="Badge">{visitor.badgeNumber || '—'}</DetailItem>
              <DetailItem label="National ID">{visitor.nationalId || '—'}</DetailItem>
              <DetailItem label="Phone">{visitor.phone || '—'}</DetailItem>
              <DetailItem label="Case ref">{activeCase.caseNumber}</DetailItem>
            </dl>
            <div className="mt-4 flex items-start gap-2.5 rounded-lg bg-slate-50 px-3 py-2.5 text-[13px] dark:bg-slate-950/50">
              <Package className="mt-0.5 h-4 w-4 shrink-0 text-slate-400" />
              <span className="text-slate-600 dark:text-slate-300">
                <span className="font-medium text-slate-900 dark:text-white">Exhibits presented: </span>
                {visitor.exhibitsPresented}
              </span>
            </div>
          </div>

          {/* Intake stepper */}
          <ol className="space-y-0 lg:col-span-5 lg:border-l lg:border-slate-100 lg:pl-5 lg:dark:border-slate-800" aria-label="Intake progress">
            {intakeSteps.map((step, i) => {
              const isCurrent = i === currentStep;
              return (
                <li key={step.label} className="relative flex gap-3 pb-4 last:pb-0">
                  {i < intakeSteps.length - 1 && (
                    <span
                      className={`absolute left-[11px] top-6 h-[calc(100%-16px)] w-px ${step.done ? 'bg-emerald-500/50' : 'bg-slate-200 dark:bg-slate-800'}`}
                    />
                  )}
                  <span
                    className={`relative z-10 flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ring-1 ring-inset ${
                      step.done
                        ? TONE.emerald.chip
                        : isCurrent
                          ? TONE.amber.chip
                          : 'bg-slate-100 text-slate-400 ring-slate-200 dark:bg-slate-800 dark:ring-slate-700'
                    }`}
                  >
                    {step.done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                  </span>
                  <div className="min-w-0 pt-0.5">
                    <div className={`text-[13px] font-medium ${step.done || isCurrent ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>
                      {step.label}
                    </div>
                    <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">{step.detail}</div>
                  </div>
                </li>
              );
            })}
          </ol>
        </div>
      </Panel>

      {currentDepartment === 'Food & Drugs' && (
        <FoodDrugRegisterPanel
          intakes={activeCase.foodDrugIntakes ?? []}
          currentUser={{ name: currentUserName, role: currentUserRole }}
          officers={foodDrugOfficers}
          onApprove={(id) => onApproveFoodDrugIntake?.(id)}
          onAssign={(id, analyst) => onAssignFoodDrugIntake?.(id, analyst)}
          onReport={(id, reportedBy) => onReportFoodDrugIntake?.(id, reportedBy)}
          onEdit={onEditFoodDrugIntake}
          onDelete={onDeleteFoodDrugIntake}
        />
      )}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Bench work */}
        <Panel
          className="xl:col-span-8"
          icon={FlaskConical}
          tone="amber"
          title="Bench work"
          description={
            tab === 'queue'
              ? `${queueRows.length} of ${queue.length} cases in ${currentDepartment}`
              : tab === 'examinations'
                ? `${activeCase.examinations.length} examinations on ${activeCase.caseNumber}`
                : `${activeCase.custodyHistory.length} custody events on ${activeCase.caseNumber}`
          }
          flush
          actions={
            tab === 'queue' ? (
              <>
                <SearchInput value={query} onChange={setQuery} placeholder="Search case, sample, method…" />
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setExpanded(allExpanded ? {} : Object.fromEntries(queueRows.map((r) => [r.id, true])))}
                >
                  {allExpanded ? 'Collapse all' : 'Expand all'}
                </Button>
              </>
            ) : undefined
          }
          footer={
            <div className="flex items-center gap-1.5">
              <Lock className="h-3 w-3" />
              Custody and examination entries are signed and cannot be edited after submission
            </div>
          }
        >
          <div className="border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
            <SegmentedControl
              ariaLabel="Bench view"
              value={tab}
              onChange={setTab}
              options={[
                { value: 'queue', label: 'Work queue', count: queue.length },
                { value: 'examinations', label: 'Examinations', count: activeCase.examinations.length },
                { value: 'custody', label: 'Chain of custody', count: activeCase.custodyHistory.length },
              ]}
            />
          </div>

          {tab === 'queue' &&
            (queueRows.length === 0 ? (
              <EmptyState
                icon={Inbox}
                title="No cases found"
                description={`Nothing matches “${query.trim()}”.`}
                action={<Button size="sm" onClick={() => setQuery('')}>Clear search</Button>}
              />
            ) : (
              <div className="overflow-x-auto">
                <table className={`${tc.table} min-w-[880px]`}>
                  <thead className={tc.thead}>
                    <tr>
                      <th className={`${tc.th} w-10 pr-0`}>
                        <span className="sr-only">Expand</span>
                      </th>
                      <th className={tc.th}>Case</th>
                      <th className={tc.th}>Exhibit / sample</th>
                      <th className={tc.th}>Stage</th>
                      <th className={tc.th}>Analyst</th>
                      <th className={tc.th}>Due</th>
                      <th className={`${tc.th} text-right`}>Actions</th>
                    </tr>
                  </thead>
                  <tbody className={tc.tbody}>
                    {queueRows.map((r) => {
                      const open = !!expanded[r.id];
                      const pct = (r.stepsDone / CASE_STEPS.length) * 100;
                      return (
                        <React.Fragment key={r.id}>
                          <tr
                            className={`${tc.tr} cursor-pointer ${open ? 'bg-slate-50 dark:bg-slate-800/30' : r.isActive ? 'bg-amber-500/[0.04]' : ''}`}
                            onClick={() => toggleRow(r.id)}
                          >
                            <td className={`${tc.td} w-10 pr-0`}>
                              <button
                                type="button"
                                aria-expanded={open}
                                aria-controls={`bench-row-${r.id}`}
                                aria-label={open ? `Collapse ${r.caseNumber}` : `Expand ${r.caseNumber}`}
                                onClick={(e) => {
                                  e.stopPropagation();
                                  toggleRow(r.id);
                                }}
                                className="flex h-6 w-6 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-slate-700 dark:hover:text-white"
                              >
                                <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
                              </button>
                            </td>
                            <td className={tc.td}>
                              <div className="flex items-center gap-1.5 font-mono text-[12px] font-semibold text-slate-900 dark:text-white">
                                {r.caseNumber}
                                {r.isActive && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Active case" />}
                              </div>
                              <div className="font-mono text-[11px] text-slate-400">{r.labRef}</div>
                            </td>
                            <td className={tc.td}>
                              <div className="max-w-[230px] truncate font-medium text-slate-800 dark:text-slate-100" title={r.sample}>
                                {r.sample}
                              </div>
                              <div className="max-w-[230px] truncate text-[11px] text-slate-400" title={`${r.agency} · ${r.method}`}>
                                {r.agency} · {r.method}
                              </div>
                            </td>
                            <td className={tc.td}>
                              <StatusPill tone={QUEUE_STAGE[r.stage].tone} dot={false}>{QUEUE_STAGE[r.stage].label}</StatusPill>
                              <div className="mt-1.5 flex items-center gap-2">
                                <div className="h-1 w-20 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                  <div className={`h-full rounded-full ${TONE[QUEUE_STAGE[r.stage].tone].bar}`} style={{ width: `${pct}%` }} />
                                </div>
                                <span className="text-[11px] tabular-nums text-slate-400">
                                  {r.stepsDone}/{CASE_STEPS.length}
                                </span>
                              </div>
                            </td>
                            <td className={tc.td}>
                              {r.analyst === 'Unallocated' ? (
                                <span className="text-xs italic text-slate-400">Unallocated</span>
                              ) : (
                                <div className="flex items-center gap-2">
                                  <Avatar name={r.analyst.replace(/^Dr\.\s*/, '').replace(/,.*$/, '')} size="sm" />
                                  <span className="max-w-[120px] truncate text-slate-800 dark:text-slate-100" title={r.analyst}>
                                    {r.analyst.replace(/,.*$/, '')}
                                  </span>
                                </div>
                              )}
                            </td>
                            <td className={tc.td}>
                              <span
                                className={`inline-flex items-center gap-1 whitespace-nowrap text-xs ${
                                  r.overdue ? 'font-medium text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'
                                }`}
                              >
                                <Clock className="h-3 w-3" /> {r.due}
                              </span>
                            </td>
                            <td className={`${tc.td} text-right`} onClick={(e) => e.stopPropagation()}>
                              {r.stage === 'intake' && !officerVerified ? (
                                <Button size="xs" variant="primary" icon={ShieldCheck} onClick={() => setShowVerificationModal(true)}>
                                  Verify
                                </Button>
                              ) : r.stage === 'intake' ? (
                                <Button size="xs" variant="primary" icon={Package} onClick={openIntake}>
                                  Intake
                                </Button>
                              ) : (
                                <Button size="xs" icon={ArrowRight} onClick={() => onOpenCaseFile(activeCase.id)}>
                                  Open
                                </Button>
                              )}
                            </td>
                          </tr>

                          {open && (
                            <tr id={`bench-row-${r.id}`} className="bg-slate-50/70 dark:bg-slate-950/40">
                              <td colSpan={7} className="px-4 pb-4 pt-1">
                                <div className="grid grid-cols-1 gap-4 rounded-lg border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-12">
                                  {/* Progress */}
                                  <div className="lg:col-span-4">
                                    <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Progress</div>
                                    <div className="mt-2 flex items-center gap-2">
                                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                                        <div className="h-full rounded-full bg-emerald-500" style={{ width: `${pct}%` }} />
                                      </div>
                                      <span className="text-xs font-semibold tabular-nums text-slate-900 dark:text-white">
                                        {r.stepsDone}/{CASE_STEPS.length}
                                      </span>
                                    </div>
                                    <ol className="mt-3 space-y-1.5">
                                      {CASE_STEPS.map((step, i) => {
                                        const done = i < r.stepsDone;
                                        const current = i === r.stepsDone;
                                        return (
                                          <li key={step} className="flex items-center gap-2 text-xs">
                                            <span
                                              className={`flex h-4 w-4 items-center justify-center rounded-full ${
                                                done
                                                  ? 'bg-emerald-500 text-white'
                                                  : current
                                                    ? 'ring-2 ring-inset ring-amber-500'
                                                    : 'bg-slate-100 dark:bg-slate-800'
                                              }`}
                                            >
                                              {done && <Check className="h-2.5 w-2.5" />}
                                            </span>
                                            <span
                                              className={
                                                done
                                                  ? 'text-slate-700 dark:text-slate-200'
                                                  : current
                                                    ? 'font-medium text-slate-900 dark:text-white'
                                                    : 'text-slate-400'
                                              }
                                            >
                                              {step}
                                              {current && <span className="ml-1.5 text-[11px] font-normal text-amber-600 dark:text-amber-400">· next</span>}
                                            </span>
                                          </li>
                                        );
                                      })}
                                    </ol>
                                  </div>

                                  {/* Examinations */}
                                  <div className="lg:col-span-4 lg:border-l lg:border-slate-100 lg:pl-4 lg:dark:border-slate-800">
                                    <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                                      Examinations
                                    </div>
                                    {r.exams.length === 0 ? (
                                      <p className="mt-2 text-xs text-slate-400">None yet. Examinations start after intake and sampling.</p>
                                    ) : (
                                      <ul className="mt-2 space-y-2">
                                        {r.exams.map((ex) => (
                                          <li key={ex.name} className="flex items-start justify-between gap-2">
                                            <div className="min-w-0">
                                              <div className="truncate text-xs font-medium text-slate-800 dark:text-slate-100" title={ex.name}>
                                                {ex.name}
                                              </div>
                                              <div className="flex items-center gap-1 truncate text-[11px] text-slate-400">
                                                <Microscope className="h-3 w-3 shrink-0" />
                                                <span className="truncate">{ex.instrument}</span>
                                              </div>
                                            </div>
                                            <StatusPill tone={EXAM_STATUS[ex.status].tone}>{EXAM_STATUS[ex.status].label}</StatusPill>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                  </div>

                                  {/* Exhibits + actions */}
                                  <div className="flex flex-col lg:col-span-4 lg:border-l lg:border-slate-100 lg:pl-4 lg:dark:border-slate-800">
                                    <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Exhibits</div>
                                    {r.exhibits.length === 0 ? (
                                      <p className="mt-2 text-xs text-slate-400">At the receiving bay: {r.sample}. Not yet logged into storage.</p>
                                    ) : (
                                      <ul className="mt-2 space-y-2">
                                        {r.exhibits.map((ex) => (
                                          <li key={ex.id} className="text-xs">
                                            <div className="flex items-center gap-1.5">
                                              <span className="font-mono font-semibold text-slate-900 dark:text-white">{ex.id}</span>
                                              <span className="inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                                                <Lock className="h-3 w-3" /> Sealed
                                              </span>
                                            </div>
                                            <div className="line-clamp-2 text-[11px] text-slate-500 dark:text-slate-400" title={ex.description}>
                                              {ex.description}
                                            </div>
                                            <div className="mt-0.5 truncate font-mono text-[11px] text-slate-400" title={`${ex.location} · ${ex.seal}`}>
                                              {ex.location} · {ex.seal}
                                            </div>
                                          </li>
                                        ))}
                                      </ul>
                                    )}
                                    <div className="mt-auto flex flex-wrap gap-2 pt-3">
                                      {r.stage === 'intake' ? (
                                        officerVerified ? (
                                          <Button size="sm" variant="primary" icon={Package} onClick={openIntake}>
                                            Record intake
                                          </Button>
                                        ) : (
                                          <Button size="sm" variant="primary" icon={ShieldCheck} onClick={() => setShowVerificationModal(true)}>
                                            Verify officer
                                          </Button>
                                        )
                                      ) : (
                                        <>
                                          <Button size="sm" variant="primary" icon={FileText} onClick={() => onOpenCaseFile(activeCase.id)}>
                                            Open case file
                                          </Button>
                                          <Button size="sm" icon={Link2} onClick={() => setTab('custody')}>
                                            Custody
                                          </Button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                </div>
                              </td>
                            </tr>
                          )}
                        </React.Fragment>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ))}

          {tab === 'examinations' &&
            (activeCase.examinations.length === 0 ? (
              <EmptyState icon={Beaker} title="No examinations yet" description="Examinations appear here once a sample is taken." />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {activeCase.examinations.map((ex) => {
                  const status = EXAM_STATUS[ex.status];
                  return (
                    <li key={ex.id} className="flex flex-col gap-2 px-4 py-3 sm:flex-row sm:items-start sm:justify-between">
                      <div className="flex min-w-0 gap-3">
                        <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${TONE.sky.chip}`}>
                          <Beaker className="h-4 w-4" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[13px] font-medium text-slate-900 dark:text-white">{ex.examinationType}</div>
                          <div className="truncate text-[11px] text-slate-500 dark:text-slate-400" title={ex.method}>{ex.method}</div>
                          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-[11px] text-slate-400">
                            <span className="inline-flex items-center gap-1"><Microscope className="h-3 w-3" />{ex.instrument}</span>
                            <span className="inline-flex items-center gap-1"><TestTube className="h-3 w-3" />{ex.sampleId}</span>
                            <span className="inline-flex items-center gap-1 tabular-nums"><Clock className="h-3 w-3" />{ex.startDate}{ex.endDate ? ` → ${ex.endDate.split(' ').slice(1).join(' ')}` : ''}</span>
                          </div>
                        </div>
                      </div>
                      <div className="shrink-0 pl-11 sm:pl-0">
                        <StatusPill tone={status.tone}>{status.label}</StatusPill>
                      </div>
                    </li>
                  );
                })}
              </ul>
            ))}

          {tab === 'custody' && (
            <ol className="px-4 py-4">
              {activeCase.custodyHistory.map((rec, i) => (
                <li key={rec.id} className="relative flex gap-3 pb-5 last:pb-0">
                  {i < activeCase.custodyHistory.length - 1 && (
                    <span className="absolute left-[15px] top-8 h-[calc(100%-24px)] w-px bg-slate-200 dark:bg-slate-800" />
                  )}
                  <span className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${TONE.violet.chip}`}>
                    <Link2 className="h-3.5 w-3.5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-[13px] font-medium text-slate-900 dark:text-white">{rec.action}</span>
                      <span className="font-mono text-[11px] text-slate-400">{rec.sampleOrExhibitId}</span>
                      <span className="ml-auto text-[11px] tabular-nums text-slate-400">{rec.timestamp}</span>
                    </div>
                    <div className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
                      {rec.fromEntity} <ArrowRight className="inline h-3 w-3 text-slate-400" /> {rec.toEntity}
                    </div>
                    <div className="mt-0.5 truncate text-[11px] text-slate-500 dark:text-slate-400" title={rec.condition}>
                      {rec.location} · {rec.condition}
                    </div>
                    {rec.signatureHash && (
                      <div className="mt-1 inline-flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400">
                        <ShieldCheck className="h-3 w-3" /> Signed
                      </div>
                    )}
                  </div>
                </li>
              ))}
            </ol>
          )}
        </Panel>

        {/* Right rail */}
        <div className="space-y-5 xl:col-span-4">
          <Panel
            icon={Activity}
            tone="violet"
            title="Instruments"
            description={`${running} running · ${INSTRUMENTS.length - running} available or held`}
            flush
          >
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {INSTRUMENTS.map((inst) => {
                const st = INSTRUMENT_STATE[inst.state];
                return (
                  <li key={inst.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="min-w-0">
                        <div className="font-mono text-[12px] font-semibold text-slate-900 dark:text-white">{inst.id}</div>
                        <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">{inst.model}</div>
                      </div>
                      <StatusPill tone={st.tone} pulse={inst.state === 'running'}>{st.label}</StatusPill>
                    </div>
                    <div className="mt-2 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                      {inst.state === 'calibration' ? <Wrench className="h-3 w-3" /> : <Gauge className="h-3 w-3" />}
                      <span className="truncate">{inst.detail}</span>
                    </div>
                    <div className="mt-1.5 flex items-center gap-2">
                      <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                        <div className={`h-full rounded-full ${TONE[st.tone].bar}`} style={{ width: `${inst.utilisation}%` }} />
                      </div>
                      <span className="w-16 text-right text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{inst.utilisation}% today</span>
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
            description={`${activeCase.caseNumber} · ${progressDone} of ${caseProgress.length} steps`}
          >
            <div className="mb-4 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className="h-full rounded-full bg-emerald-500" style={{ width: `${(progressDone / caseProgress.length) * 100}%` }} />
            </div>
            <ul className="space-y-2">
              {caseProgress.map((s) => (
                <li key={s.label} className="flex items-center gap-2.5 text-[13px]">
                  <span
                    className={`flex h-5 w-5 items-center justify-center rounded-full ${
                      s.done ? 'bg-emerald-500 text-white' : 'bg-slate-100 text-slate-300 dark:bg-slate-800 dark:text-slate-600'
                    }`}
                  >
                    <Check className="h-3 w-3" />
                  </span>
                  <span className={s.done ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>{s.label}</span>
                </li>
              ))}
            </ul>
          </Panel>

          {exhibit && (
            <Panel icon={Lock} tone="slate" title="Exhibit storage" description={exhibit.id}>
              <dl className="grid grid-cols-1 gap-3">
                <DetailItem label="Location">{exhibit.storageLocation}</DetailItem>
                <DetailItem label="Seal number">
                  <span className="font-mono">{exhibit.sealNumber}</span>
                </DetailItem>
                <div className="flex items-center justify-between">
                  <DetailItem label="Condition">{exhibit.condition}</DetailItem>
                  <StatusPill tone={exhibit.condition === 'Intact & Sealed' ? 'emerald' : 'amber'}>
                    {exhibit.condition === 'Intact & Sealed' ? 'Seal intact' : 'Check seal'}
                  </StatusPill>
                </div>
              </dl>
            </Panel>
          )}
        </div>
      </div>

      <OfficerVerificationModal
        isOpen={showVerificationModal}
        onClose={() => setShowVerificationModal(false)}
        visitor={visitor}
        currentAnalystName={currentUserName}
        onConfirmVerification={handleConfirmOfficerVerification}
      />

      <SubmissionIntakeModal
        isOpen={showIntakeModal}
        onClose={() => setShowIntakeModal(false)}
        activeCase={activeCase}
        visitor={visitor}
        receivingAnalystName={currentUserName}
        onSaveIntake={handleSaveIntake}
      />
    </DashboardPage>
  );
};
