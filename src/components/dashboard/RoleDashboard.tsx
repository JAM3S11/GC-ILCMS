import React, { useState } from 'react';
import {
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  Briefcase,
  Building2,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileCheck,
  FileText,
  FlaskConical,
  Gauge,
  Inbox,
  Layers,
  Microscope,
  Package,
  Settings,
  Shield,
  ShieldCheck,
  TrendingUp,
  Users,
  Wallet,
} from 'lucide-react';
import { User as UserType, UserRole, ForensicCase, OfficerVisitor } from '../../types';
import {
  Avatar,
  Button,
  DashboardHeader,
  DashboardPage,
  EmptyState,
  KpiCard,
  KpiGrid,
  MeterRow,
  Panel,
  SearchInput,
  SegmentedControl,
  StatusPill,
  Tone,
  TONE,
  tableClasses as tc,
} from '../common/Dashboard';

interface RoleDashboardProps {
  currentUser: UserType;
  activeCase: ForensicCase;
  visitors: OfficerVisitor[];
  officerVerified: boolean;
  onNavigate: (view: string) => void;
  onOpenVerifyOfficer: () => void;
  onOpenIntakeModal: () => void;
  onOpenCaseFile: (caseId: string) => void;
  onOpenGCMS: () => void;
}

type IconType = React.ComponentType<{ className?: string }>;

/* ------------------------------------------------------------------ */
/*  Role profiles — every non-reception role gets its own framing of  */
/*  the same operational data.                                        */
/* ------------------------------------------------------------------ */

type Persona = 'bench' | 'division' | 'quality' | 'executive' | 'registry' | 'corporate';

const PERSONA_BY_ROLE: Record<UserRole, Persona> = {
  ANALYST: 'bench',
  SENIOR_CHEMIST: 'bench',
  INTERN: 'bench',
  ATTACHEE: 'bench',
  HEAD_OF_DEPARTMENT: 'division',
  QUALITY_MANAGER: 'quality',
  CEO: 'executive',
  VICE_CEO: 'executive',
  ADMINISTRATOR: 'executive',
  CLERK: 'registry',
  ACCOUNTANT: 'corporate',
  HR: 'corporate',
  RECEPTIONIST: 'registry',
};

const ROLE_LABEL: Record<UserRole, string> = {
  CEO: 'Chief Executive Officer',
  VICE_CEO: 'Deputy Chief Executive',
  ADMINISTRATOR: 'Administrator',
  CLERK: 'Registry Clerk',
  ACCOUNTANT: 'Accountant',
  HR: 'Human Resources',
  RECEPTIONIST: 'Receptionist',
  HEAD_OF_DEPARTMENT: 'Head of Department',
  SENIOR_CHEMIST: 'Senior Chemist',
  ANALYST: 'Analyst',
  INTERN: 'Intern',
  ATTACHEE: 'Attachée',
  QUALITY_MANAGER: 'Quality Manager',
};

type QueueFilter = 'all' | 'priority' | 'analysis' | 'draft' | 'review';

interface QuickLink {
  label: string;
  hint: string;
  icon: IconType;
  tone: Tone;
  onClick: () => void;
}

/* ------------------------------------------------------------------ */
/*  Static operational snapshot                                       */
/* ------------------------------------------------------------------ */

const DIVISION_LOAD = [
  { name: 'Narcotics', value: 42 },
  { name: 'DNA', value: 38 },
  { name: 'Toxicology', value: 31 },
  { name: 'Food & Drugs', value: 29 },
  { name: 'Water', value: 24 },
  { name: 'Criminalistic', value: 19 },
  { name: 'Instruments', value: 15 },
  { name: 'Procurement', value: 8 },
];
const DIVISION_TOTAL = DIVISION_LOAD.reduce((s, d) => s + d.value, 0);

const PIPELINE: { label: string; value: number; tone: Tone }[] = [
  { label: 'Awaiting intake', value: 37, tone: 'sky' },
  { label: 'In analysis', value: 95, tone: 'amber' },
  { label: 'Draft report', value: 29, tone: 'violet' },
  { label: 'Under review', value: 25, tone: 'cyan' },
  { label: 'Certified', value: 20, tone: 'emerald' },
];

const WEEKLY_INTAKE = [
  { week: 'W1', value: 18 },
  { week: 'W2', value: 22 },
  { week: 'W3', value: 19 },
  { week: 'W4', value: 26 },
  { week: 'W5', value: 24 },
  { week: 'W6', value: 28 },
  { week: 'W7', value: 27 },
  { week: 'W8', value: 31 },
];

type Stage = 'WAITING_RECEIVING' | 'IN_ANALYSIS' | 'REPORT_DRAFT' | 'UNDER_REVIEW';

const STAGE: Record<Stage, { label: string; tone: Tone }> = {
  WAITING_RECEIVING: { label: 'Intake screening', tone: 'sky' },
  IN_ANALYSIS: { label: 'In analysis', tone: 'amber' },
  REPORT_DRAFT: { label: 'Draft report', tone: 'violet' },
  UNDER_REVIEW: { label: 'Under review', tone: 'cyan' },
};

type Urgency = 'urgent' | 'high' | 'standard';

const URGENCY: Record<Urgency, { label: string; tone: Tone }> = {
  urgent: { label: 'Urgent', tone: 'rose' },
  high: { label: 'High', tone: 'amber' },
  standard: { label: 'Standard', tone: 'slate' },
};

interface QueueRow {
  id: string;
  caseNumber: string;
  labRef: string;
  department: string;
  officer: string;
  agency: string;
  exhibits: number;
  sample: string;
  stage: Stage;
  progressNote: string;
  urgency: Urgency;
  urgencyNote: string;
  analyst: string;
  received: string;
}

/* ------------------------------------------------------------------ */
/*  Weekly intake chart — one measure, one axis, hover per bar        */
/* ------------------------------------------------------------------ */

const IntakeChart: React.FC<{ data: { week: string; value: number }[] }> = ({ data }) => {
  const [hover, setHover] = useState<number | null>(null);
  const W = 560;
  const H = 180;
  const pad = { l: 28, r: 8, t: 16, b: 24 };
  const max = Math.ceil(Math.max(...data.map((d) => d.value)) / 10) * 10;
  const slot = (W - pad.l - pad.r) / data.length;
  const barW = Math.min(36, slot - 12);
  const y = (v: number) => pad.t + (H - pad.t - pad.b) * (1 - v / max);
  const ticks = [0, max / 2, max];

  return (
    <div className="relative">
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label="Weekly exhibit intakes, last 8 weeks">
        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={pad.l}
              x2={W - pad.r}
              y1={y(t)}
              y2={y(t)}
              className={t === 0 ? 'stroke-slate-300 dark:stroke-slate-700' : 'stroke-slate-100 dark:stroke-slate-800'}
              strokeWidth={1}
            />
            <text x={pad.l - 6} y={y(t) + 3} textAnchor="end" fontSize="10" className="fill-slate-400">
              {t}
            </text>
          </g>
        ))}
        {data.map((d, i) => {
          const cx = pad.l + slot * i + slot / 2;
          const top = y(d.value);
          const isLast = i === data.length - 1;
          const active = hover === i;
          return (
            <g key={d.week} onMouseEnter={() => setHover(i)} onMouseLeave={() => setHover(null)}>
              {/* Hit target larger than the mark */}
              <rect x={pad.l + slot * i} y={pad.t} width={slot} height={H - pad.t - pad.b} fill="transparent" />
              <path
                d={`M${cx - barW / 2},${y(0)} V${top + 4} Q${cx - barW / 2},${top} ${cx - barW / 2 + 4},${top} H${cx + barW / 2 - 4} Q${cx + barW / 2},${top} ${cx + barW / 2},${top + 4} V${y(0)} Z`}
                className={`transition-opacity ${isLast ? 'fill-amber-500' : 'fill-amber-500/45'} ${hover !== null && !active ? 'opacity-60' : ''}`}
              />
              {isLast && (
                <text x={cx} y={top - 6} textAnchor="middle" fontSize="11" fontWeight={600} className="fill-slate-700 dark:fill-slate-200">
                  {d.value}
                </text>
              )}
              <text x={cx} y={H - 6} textAnchor="middle" fontSize="10" className="fill-slate-400">
                {d.week}
              </text>
            </g>
          );
        })}
      </svg>
      {hover !== null && (
        <div
          className="pointer-events-none absolute -translate-x-1/2 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs shadow-lg dark:border-slate-700 dark:bg-slate-900"
          style={{
            left: `${((pad.l + slot * hover + slot / 2) / W) * 100}%`,
            top: `${(y(data[hover].value) / H) * 100 - 4}%`,
            transform: 'translate(-50%, -100%)',
          }}
        >
          <div className="text-[11px] text-slate-500 dark:text-slate-400">Week {hover + 1}</div>
          <div className="font-semibold tabular-nums text-slate-900 dark:text-white">{data[hover].value} intakes</div>
        </div>
      )}
    </div>
  );
};

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */

export const RoleDashboard: React.FC<RoleDashboardProps> = ({
  currentUser,
  activeCase,
  visitors,
  officerVerified,
  onNavigate,
  onOpenVerifyOfficer,
  onOpenIntakeModal,
  onOpenCaseFile,
  onOpenGCMS,
}) => {
  const persona = PERSONA_BY_ROLE[currentUser.role] ?? 'bench';
  const department = currentUser.department || 'Narcotics';
  const [queueFilter, setQueueFilter] = useState<QueueFilter>(
    persona === 'quality' ? 'review' : persona === 'division' ? 'draft' : 'all'
  );
  const [query, setQuery] = useState('');

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = currentUser.name.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s*/, '').split(' ')[0];

  /* ---------------- Work queue ---------------- */
  const queue: QueueRow[] = [
    {
      id: activeCase.id,
      caseNumber: activeCase.caseNumber,
      labRef: activeCase.labReferenceNumber,
      department: activeCase.assignedDepartment,
      officer: activeCase.investigatingOfficer,
      agency: activeCase.requestingDepartment,
      exhibits: activeCase.exhibits.length,
      sample: 'Suspected cocaine HCl — compressed block',
      stage: 'REPORT_DRAFT',
      progressNote: 'GC-MS complete · 98.4% match',
      urgency: 'urgent',
      urgencyNote: 'Court date in 48h',
      analyst: activeCase.assignedAnalyst,
      received: activeCase.dateReceived,
    },
    {
      id: 'GC-CASE-2026-0002',
      caseNumber: 'GC/EXM/2026/0002',
      labRef: 'GC/F&D/2026/0149',
      department: 'Food & Drugs',
      officer: 'Sgt. David Kiprotich',
      agency: 'Pharmacy & Poisons Board',
      exhibits: 3,
      sample: 'Counterfeit amoxicillin 500mg capsules',
      stage: 'IN_ANALYSIS',
      progressNote: 'HPLC assay running',
      urgency: 'standard',
      urgencyNote: 'SLA 5 days',
      analyst: 'Dr. Patrick Ochieng',
      received: '2026-09-10',
    },
    {
      id: 'GC-CASE-2026-0003',
      caseNumber: 'GC/EXM/2026/0003',
      labRef: 'GC/TOX/2026/0088',
      department: 'Toxicology',
      officer: 'Chief Insp. Mercy Chebet',
      agency: 'DCI Homicide · Nairobi',
      exhibits: 2,
      sample: 'Post-mortem gastric contents & blood',
      stage: 'WAITING_RECEIVING',
      progressNote: 'Pending GC-MS volatiles screen',
      urgency: 'high',
      urgencyNote: 'Homicide',
      analyst: 'Dr. Grace Wanjiku',
      received: '2026-09-11',
    },
    {
      id: 'GC-CASE-2026-0004',
      caseNumber: 'GC/EXM/2026/0004',
      labRef: 'GC/CRI/2026/0031',
      department: 'Criminalistic',
      officer: 'Cpl. Joseph Kariuki',
      agency: 'DCI Document Fraud Unit',
      exhibits: 5,
      sample: 'Questioned signatures & ink samples',
      stage: 'UNDER_REVIEW',
      progressNote: 'ESDA exam complete',
      urgency: 'standard',
      urgencyNote: 'SLA 7 days',
      analyst: 'Insp. Dennis Mutisya',
      received: '2026-09-08',
    },
    {
      id: 'GC-CASE-2026-0005',
      caseNumber: 'GC/EXM/2026/0005',
      labRef: 'GC/WAT/2026/0212',
      department: 'Water',
      officer: 'Envt. Insp. Faith Njunguna',
      agency: 'NEMA Enforcement Unit',
      exhibits: 4,
      sample: 'Industrial effluent — suspected cyanide',
      stage: 'IN_ANALYSIS',
      progressNote: 'Cyanide presumptive positive',
      urgency: 'high',
      urgencyNote: 'Public health',
      analyst: 'Mary Chebet',
      received: '2026-09-12',
    },
  ];

  const byFilter: Record<QueueFilter, QueueRow[]> = {
    all: queue,
    priority: queue.filter((c) => c.urgency !== 'standard'),
    analysis: queue.filter((c) => c.stage === 'IN_ANALYSIS'),
    draft: queue.filter((c) => c.stage === 'REPORT_DRAFT'),
    review: queue.filter((c) => c.stage === 'UNDER_REVIEW'),
  };
  const q = query.trim().toLowerCase();
  const rows = byFilter[queueFilter].filter(
    (c) =>
      !q ||
      c.caseNumber.toLowerCase().includes(q) ||
      c.sample.toLowerCase().includes(q) ||
      c.department.toLowerCase().includes(q) ||
      c.analyst.toLowerCase().includes(q) ||
      c.officer.toLowerCase().includes(q)
  );

  const draftCount = officerVerified ? 1 : 2;
  const onSite = visitors.filter((v) => v.status !== 'Departed');
  const awaitingLab = visitors.filter((v) => v.status === 'Awaiting Laboratory Reception');
  const waitingVisitor = visitors[0];
  const myDivisionLoad = DIVISION_LOAD.find((d) => d.name === department)?.value ?? 0;

  /* ---------------- Persona framing ---------------- */
  const header: Record<Persona, { crumb: string; title: string; description: string }> = {
    bench: {
      crumb: 'Bench',
      title: 'My workbench',
      description: `${greeting}, ${firstName}. Your assigned cases, instruments and draft certificates in ${department}.`,
    },
    division: {
      crumb: 'Division',
      title: `${department} division`,
      description: `${greeting}, ${firstName}. Caseload, allocations and reports awaiting your sign-off.`,
    },
    quality: {
      crumb: 'Quality',
      title: 'Quality & compliance',
      description: `${greeting}, ${firstName}. Reports in review, corrections and turnaround compliance across all labs.`,
    },
    executive: {
      crumb: 'Oversight',
      title: 'Operations overview',
      description: `${greeting}, ${firstName}. National caseload, turnaround and high-priority matters at a glance.`,
    },
    registry: {
      crumb: 'Registry',
      title: 'Case registry',
      description: `${greeting}, ${firstName}. Register submissions, track allocation and dispatch certificates.`,
    },
    corporate: {
      crumb: 'Corporate',
      title: 'Organisation overview',
      description: `${greeting}, ${firstName}. A read-only view of laboratory activity for corporate services.`,
    },
  };
  const h = header[persona];

  const kpis: Record<Persona, React.ReactNode> = {
    bench: (
      <>
        <KpiCard label="Assigned cases" value={queue.length} icon={FileText} tone="amber" hint="+1 since yesterday"
          action={{ label: 'View queue', onClick: () => setQueueFilter('all') }} />
        <KpiCard label="Exhibits in custody" value={12} icon={Package} tone="sky" hint="Vault lockers V-04 · sealed" />
        <KpiCard label="Instruments online" value="3/4" icon={Microscope} tone="violet" progress={75} hint="GC-MS run in progress" />
        <KpiCard label="Draft certificates" value={draftCount} icon={FileCheck} tone="emerald" hint="Ready for HoD review"
          action={{ label: 'Show drafts', onClick: () => setQueueFilter('draft') }} />
      </>
    ),
    division: (
      <>
        <KpiCard label="Division caseload" value={myDivisionLoad} icon={Layers} tone="amber"
          progress={(myDivisionLoad / DIVISION_LOAD[0].value) * 100} hint={`${department} · active cases`} />
        <KpiCard label="Awaiting allocation" value={3} icon={Inbox} tone="sky" hint="Assign to an analyst"
          action={{ label: 'Open laboratory', onClick: () => onNavigate('laboratory') }} />
        <KpiCard label="Drafts to approve" value={draftCount} icon={FileCheck} tone="violet" hint="Oldest: 1 day"
          action={{ label: 'Show drafts', onClick: () => setQueueFilter('draft') }} />
        <KpiCard label="SLA compliance" value="98.4" unit="%" icon={Gauge} tone="emerald" progress={98.4} hint="Target 95% · last 30 days" />
      </>
    ),
    quality: (
      <>
        <KpiCard label="Reports in review" value={byFilter.review.length + 11} icon={ClipboardCheck} tone="cyan" hint="Across 8 laboratories"
          action={{ label: 'Show reviews', onClick: () => setQueueFilter('review') }} />
        <KpiCard label="Corrections required" value={4} icon={AlertTriangle} tone="rose" hint="Returned to analysts" />
        <KpiCard label="SLA compliance" value="98.4" unit="%" icon={Gauge} tone="emerald" progress={98.4} hint="Target 95% · last 30 days" />
        <KpiCard label="Audit events today" value={57} icon={Shield} tone="violet" hint="All entries hash-chained"
          action={{ label: 'Open audit trail', onClick: () => onNavigate('audit') }} />
      </>
    ),
    executive: (
      <>
        <KpiCard label="Cases this year" value="1,482" icon={TrendingUp} tone="amber" hint="+8.4% vs last year" />
        <KpiCard label="Active in analysis" value={82} icon={FlaskConical} tone="sky" hint="Across 8 divisions" />
        <KpiCard label="Mean turnaround" value="4.2" unit="days" icon={Clock} tone="emerald" hint="Down from 14 days (paper era)" />
        <KpiCard label="Reports pending review" value={20} icon={FileCheck} tone="violet" hint="1 urgent · Narcotics"
          action={{ label: 'Executive view', onClick: () => onNavigate('executive') }} />
      </>
    ),
    registry: (
      <>
        <KpiCard label="Registered today" value={9} icon={ClipboardList} tone="amber" hint="New case files opened"
          action={{ label: 'Open case file', onClick: () => onNavigate('case-file') }} />
        <KpiCard label="Awaiting allocation" value={3} icon={Inbox} tone="sky" hint="Pending HoD assignment" />
        <KpiCard label="Visitors on site" value={onSite.length} icon={Users} tone="violet"
          hint={`${awaitingLab.length} awaiting a laboratory`} action={{ label: 'Open Lab Bay', onClick: () => onNavigate('lab-bay') }} />
        <KpiCard label="Certificates to dispatch" value={6} icon={FileCheck} tone="emerald" hint="Signed and sealed" />
      </>
    ),
    corporate: (
      <>
        <KpiCard label="Staff on duty" value={64} icon={Users} tone="amber" progress={86} hint="of 74 rostered today" />
        <KpiCard label="Active cases" value={82} icon={FlaskConical} tone="sky" hint="Across 8 divisions" />
        <KpiCard label="Open requisitions" value={4} icon={Wallet} tone="violet" hint="Reagents & consumables" />
        <KpiCard label="Mean turnaround" value="4.2" unit="days" icon={Clock} tone="emerald" hint="Organisation-wide" />
      </>
    ),
  };

  const labAccess =
    currentUser.role === 'ANALYST' ||
    currentUser.role === 'HEAD_OF_DEPARTMENT' ||
    currentUser.department === 'Food & Drugs';
  const showAdmission = (persona === 'bench' || persona === 'division') && !officerVerified && !!waitingVisitor;

  // Food & Drugs staff register samples on their own page, not the exhibit form.
  const intakeLabel = currentUser.department === 'Food & Drugs' ? 'Register sample' : 'Exhibit intake';

  const headerActions =
    persona === 'bench' || persona === 'division' ? (
      <>
        <Button icon={Package} onClick={onOpenIntakeModal} id="dash-quick-intake">
          {intakeLabel}
        </Button>
        <Button variant="primary" icon={FileText} onClick={() => onOpenCaseFile(activeCase.id)} id="dash-quick-open-case">
          Resume case
        </Button>
      </>
    ) : persona === 'registry' ? (
      <>
        <Button icon={Users} onClick={() => onNavigate('lab-bay')}>
          Lab Bay
        </Button>
        <Button variant="primary" icon={Package} onClick={onOpenIntakeModal} id="dash-quick-intake">
          Register submission
        </Button>
      </>
    ) : persona === 'executive' ? (
      <>
        <Button icon={Shield} onClick={() => onNavigate('audit')}>
          Audit trail
        </Button>
        <Button variant="primary" icon={Award} onClick={() => onNavigate('executive')}>
          Executive view
        </Button>
      </>
    ) : persona === 'quality' ? (
      <>
        <Button icon={BookOpen} onClick={() => onNavigate('references')}>
          Reference DB
        </Button>
        <Button variant="primary" icon={Shield} onClick={() => onNavigate('audit')}>
          Audit trail
        </Button>
      </>
    ) : (
      <Button icon={Settings} onClick={() => onNavigate('settings')}>
        Settings
      </Button>
    );

  const quickLinks: QuickLink[] = [
    labAccess && { label: 'Laboratory workspace', hint: 'Benches, instruments & intake', icon: FlaskConical, tone: 'amber', onClick: () => onNavigate('laboratory') },
    persona !== 'corporate' && { label: 'GC-MS spectra', hint: `${activeCase.caseNumber}`, icon: Microscope, tone: 'violet', onClick: onOpenGCMS },
    persona !== 'corporate' && persona !== 'registry' && { label: 'Reference database', hint: 'Spectral libraries & methods', icon: BookOpen, tone: 'sky', onClick: () => onNavigate('references') },
    persona !== 'corporate' && persona !== 'registry' && { label: 'Audit trail', hint: 'Chain-of-custody events', icon: Shield, tone: 'slate', onClick: () => onNavigate('audit') },
    persona === 'registry' && { label: 'Notifications', hint: 'Laboratory call-outs', icon: Inbox, tone: 'sky', onClick: () => onNavigate('notifications') },
    persona === 'executive' && { label: 'Executive oversight', hint: 'Division performance', icon: Award, tone: 'emerald', onClick: () => onNavigate('executive') },
    { label: 'Settings', hint: 'Profile & preferences', icon: Settings, tone: 'slate', onClick: () => onNavigate('settings') },
  ].filter(Boolean) as QuickLink[];

  const queueTitle: Record<Persona, string> = {
    bench: 'My work queue',
    division: `${department} work queue`,
    quality: 'Review queue',
    executive: 'Priority cases',
    registry: 'Registered cases',
    corporate: 'Active cases',
  };

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={[h.crumb, 'Overview']}
        title={h.title}
        description={h.description}
        meta={<StatusPill tone="emerald" pulse>Live</StatusPill>}
        actions={headerActions}
      />

      {showAdmission && (
        <div className="flex flex-col gap-3 rounded-xl border border-amber-500/30 bg-amber-500/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${TONE.amber.chip}`}>
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">Evidence admission pending</span>
                <StatusPill tone="rose">Action required</StatusPill>
              </div>
              <p className="mt-0.5 text-[13px] text-slate-600 dark:text-slate-300">
                {waitingVisitor.officerName} ({waitingVisitor.station}
                {waitingVisitor.badgeNumber ? ` · ${waitingVisitor.badgeNumber}` : ''}) is at the {department} receiving bay with exhibits.
              </p>
            </div>
          </div>
          <Button variant="primary" icon={ShieldCheck} onClick={onOpenVerifyOfficer} className="self-start sm:self-auto">
            Verify officer
          </Button>
        </div>
      )}

      <KpiGrid label="Key metrics">{kpis[persona]}</KpiGrid>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Work queue */}
        <Panel
          className="xl:col-span-8"
          icon={Inbox}
          tone="amber"
          title={queueTitle[persona]}
          description={`${rows.length} of ${queue.length} cases${persona === 'bench' ? ` · assigned to ${currentUser.name}` : ''}`}
          flush
          actions={<SearchInput value={query} onChange={setQuery} placeholder="Search case, sample, analyst…" />}
          footer={
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Queue synchronised · every change is recorded in the audit trail
            </div>
          }
        >
          <div className="border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
            <SegmentedControl
              ariaLabel="Filter work queue"
              value={queueFilter}
              onChange={setQueueFilter}
              options={[
                { value: 'all', label: 'All', count: byFilter.all.length },
                { value: 'priority', label: 'Priority', count: byFilter.priority.length },
                { value: 'analysis', label: 'In analysis', count: byFilter.analysis.length },
                { value: 'draft', label: 'Drafts', count: byFilter.draft.length },
                { value: 'review', label: 'In review', count: byFilter.review.length },
              ]}
            />
          </div>
          {rows.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No cases in this view"
              description={q ? `Nothing matches “${query.trim()}”.` : 'Try another filter.'}
              action={q ? <Button size="sm" onClick={() => setQuery('')}>Clear search</Button> : undefined}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className={`${tc.table} min-w-[860px]`}>
                <thead className={tc.thead}>
                  <tr>
                    <th className={tc.th}>Case</th>
                    <th className={tc.th}>Sample</th>
                    <th className={tc.th}>Priority</th>
                    <th className={tc.th}>Stage</th>
                    <th className={tc.th}>Analyst</th>
                    <th className={`${tc.th} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={tc.tbody}>
                  {rows.map((c) => {
                    const isActive = c.id === activeCase.id;
                    return (
                      <tr key={c.id} className={`${tc.tr} ${isActive ? 'bg-amber-500/[0.04]' : ''}`}>
                        <td className={tc.td}>
                          <div className="flex items-center gap-1.5 font-mono text-[12px] font-semibold text-slate-900 dark:text-white">
                            {c.caseNumber}
                            {isActive && <span className="h-1.5 w-1.5 rounded-full bg-amber-500" title="Active case" />}
                          </div>
                          <div className="font-mono text-[11px] text-slate-400">{c.labRef}</div>
                        </td>
                        <td className={tc.td}>
                          <div className="max-w-[240px] truncate font-medium text-slate-800 dark:text-slate-100" title={c.sample}>
                            {c.sample}
                          </div>
                          <div className="flex max-w-[240px] items-center gap-1 truncate text-[11px] text-slate-500 dark:text-slate-400" title={`${c.agency} · ${c.department}`}>
                            <Building2 className="h-3 w-3 shrink-0" />
                            <span className="truncate">{c.agency} · {c.exhibits} exhibit{c.exhibits === 1 ? '' : 's'}</span>
                          </div>
                        </td>
                        <td className={tc.td}>
                          <StatusPill tone={URGENCY[c.urgency].tone}>{URGENCY[c.urgency].label}</StatusPill>
                          <div className="mt-1 text-[11px] text-slate-400">{c.urgencyNote}</div>
                        </td>
                        <td className={tc.td}>
                          <StatusPill tone={STAGE[c.stage].tone} dot={false}>{STAGE[c.stage].label}</StatusPill>
                          <div className="mt-1 max-w-[170px] truncate text-[11px] text-slate-400" title={c.progressNote}>
                            {c.progressNote}
                          </div>
                        </td>
                        <td className={tc.td}>
                          <div className="flex items-center gap-2">
                            <Avatar name={c.analyst.replace(/^(Dr\.|Insp\.)\s*/, '')} size="sm" />
                            <div className="min-w-0">
                              <div className="max-w-[140px] truncate text-slate-800 dark:text-slate-100" title={c.analyst}>{c.analyst}</div>
                              <div className="text-[11px] tabular-nums text-slate-400">Rcv {c.received}</div>
                            </div>
                          </div>
                        </td>
                        <td className={`${tc.td} text-right`}>
                          <div className="flex justify-end gap-1.5">
                            {isActive && persona !== 'corporate' && (
                              <Button size="xs" variant="ghost" icon={Microscope} onClick={onOpenGCMS} title="View GC-MS spectra">
                                GC-MS
                              </Button>
                            )}
                            <Button size="xs" icon={ChevronRight} onClick={() => onOpenCaseFile(c.id)}>
                              Open
                            </Button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {/* Right rail */}
        <div className="space-y-5 xl:col-span-4">
          <Panel icon={Layers} tone="emerald" title="Case pipeline" description="National workload by stage" actions={<StatusPill tone="emerald">On track</StatusPill>}>
            <div className="space-y-3.5">
              {PIPELINE.map((s) => (
                <MeterRow key={s.label} label={s.label} value={s.value} total={PIPELINE.reduce((a, b) => a + b.value, 0)} tone={s.tone} />
              ))}
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3 border-t border-slate-100 pt-3 dark:border-slate-800">
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">SLA compliance</div>
                <div className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">98.4%</div>
              </div>
              <div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">Mean turnaround</div>
                <div className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white">3.2 days</div>
              </div>
            </div>
          </Panel>

          <Panel title="Quick actions" flush>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {quickLinks.map((link) => (
                <li key={link.label}>
                  <button
                    type="button"
                    onClick={link.onClick}
                    className="group flex w-full cursor-pointer items-center gap-3 px-4 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${TONE[link.tone].chip}`}>
                      <link.icon className="h-4 w-4" />
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block truncate text-[13px] font-medium text-slate-900 dark:text-white">{link.label}</span>
                      <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">{link.hint}</span>
                    </span>
                    <ChevronRight className="h-4 w-4 text-slate-300 transition-transform group-hover:translate-x-0.5 dark:text-slate-600" />
                  </button>
                </li>
              ))}
            </ul>
          </Panel>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <Panel
          className="xl:col-span-8"
          icon={TrendingUp}
          tone="amber"
          title="Weekly exhibit intakes"
          description="Last 8 weeks · all laboratories"
          actions={
            <span className="text-xs text-slate-500 dark:text-slate-400">
              <span className="font-semibold tabular-nums text-slate-900 dark:text-white">+72%</span> since W1
            </span>
          }
        >
          <IntakeChart data={WEEKLY_INTAKE} />
        </Panel>

        <Panel
          className="xl:col-span-4"
          icon={BarChart3}
          tone="sky"
          title="Caseload by division"
          description={`${DIVISION_TOTAL} active cases`}
        >
          <div className="space-y-2.5">
            {DIVISION_LOAD.map((d) => {
              const mine = persona !== 'executive' && persona !== 'corporate' && d.name === department;
              return (
                <div key={d.name} title={`${d.name}: ${d.value} active cases`}>
                  <div className="flex items-center justify-between text-xs">
                    <span className={`flex items-center gap-1.5 ${mine ? 'font-medium text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'}`}>
                      {d.name}
                      {mine && <StatusPill tone="amber" dot={false}>Yours</StatusPill>}
                    </span>
                    <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{d.value}</span>
                  </div>
                  <div className="mt-1 h-1.5 w-full overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                    <div
                      className={`h-full rounded-full transition-all ${mine ? 'bg-amber-500' : 'bg-sky-500/70'}`}
                      style={{ width: `${(d.value / DIVISION_LOAD[0].value) * 100}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </Panel>
      </div>

      {persona === 'corporate' && (
        <Panel icon={Briefcase} tone="slate" title="Corporate services" description="Case data is read-only for this role">
          <p className="text-[13px] text-slate-600 dark:text-slate-300">
            You're signed in as {ROLE_LABEL[currentUser.role]}. Case files and exhibits are visible for reporting only; changes are made
            by laboratory staff.
          </p>
        </Panel>
      )}
    </DashboardPage>
  );
};
