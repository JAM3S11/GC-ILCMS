import React from 'react';
import {
  AlertTriangle,
  Award,
  BarChart3,
  BookOpen,
  Briefcase,
  ChevronRight,
  ClipboardCheck,
  ClipboardList,
  Clock,
  Droplets,
  FileCheck,
  FileText,
  FlaskConical,
  Inbox,
  Layers,
  Microscope,
  Package,
  Settings,
  Shield,
  ShieldCheck,
  TrendingUp,
  Users,
} from 'lucide-react';
import { User as UserType, UserRole, ForensicCase, OfficerVisitor, LaboratoryDepartment, WaterIntake, FoodDrugIntake, NarcoticsIntake } from '../../types';
import { FoodDrugLabDashboard } from './FoodDrugLabDashboard';
import { NarcoticsLabDashboard } from './NarcoticsLabDashboard';
import {
  Button,
  DashboardHeader,
  DashboardPage,
  EmptyState,
  KpiCard,
  KpiGrid,
  MeterRow,
  Panel,
  StatusPill,
  Tone,
  TONE,
  tableClasses as tc,
} from '../common/Dashboard';
import { departmentLabel } from '../../lib/departments';
import { meanTurnaround, openFiles, useDashboardSummary } from '../../lib/useDashboardSummary';
import { WorkRegister } from '../../lib/useDashboardWork';
import { DashboardWorkSection } from './WorkPanels';

interface RoleDashboardProps {
  currentUser: UserType;
  activeCase: ForensicCase;
  visitors: OfficerVisitor[];
  visitorsLoading?: boolean;
  narcoticsIntakes?: NarcoticsIntake[];
  waterIntakes: WaterIntake[];
  waterIntakesLoading: boolean;
  waterIntakesError: string;
  foodDrugIntakes?: FoodDrugIntake[];
  foodDrugIntakesLoading?: boolean;
  foodDrugIntakesError?: string;
  officerVerified: boolean;
  onNavigate: (view: string) => void;
  onOpenVerifyOfficer: () => void;
  onOpenIntakeModal: () => void;
  onOpenCaseFile: (caseId: string) => void;
  onOpenGCMS: () => void;
  /** Whether the viewer may open a register file from the work list or activity feed. */
  canOpenRegisterFile: (register: WorkRegister, assignedToMe?: boolean) => boolean;
  onOpenRegisterFile: (register: WorkRegister, id: string) => void;
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
  SUPER_ADMIN: 'executive',
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
  SUPER_ADMIN: 'Super Administrator',
};

interface QuickLink {
  label: string;
  hint: string;
  icon: IconType;
  tone: Tone;
  onClick: () => void;
}

/* ------------------------------------------------------------------ */
/*  Dashboard                                                          */
/* ------------------------------------------------------------------ */

export const RoleDashboard: React.FC<RoleDashboardProps> = ({
  currentUser,
  activeCase,
  visitors,
  visitorsLoading = false,
  narcoticsIntakes = [],
  waterIntakes,
  waterIntakesLoading,
  waterIntakesError,
  foodDrugIntakes = [],
  foodDrugIntakesLoading = false,
  foodDrugIntakesError = '',
  officerVerified,
  onNavigate,
  onOpenVerifyOfficer,
  onOpenIntakeModal,
  onOpenCaseFile,
  onOpenGCMS,
  canOpenRegisterFile,
  onOpenRegisterFile,
}) => {
  const persona = PERSONA_BY_ROLE[currentUser.role] ?? 'bench';
  const department = currentUser.department || 'Narcotics';
  const { summary } = useDashboardSummary();

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
  const firstName = currentUser.name.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s*/, '').split(' ')[0];

  const onSite = visitors.filter((v) => v.status !== 'Departed');
  const awaitingLab = visitors.filter((v) => v.status === 'Awaiting Laboratory Reception');
  const waitingVisitor = visitors[0];
  // Display name for the user's laboratory; `department` stays the internal key
  // for lookups above so only user-facing text changes wording.
  const departmentName = departmentLabel(department);

  /* ---------------- Persona framing ---------------- */
  const header: Record<Persona, { crumb: string; title: string; description: string }> = {
    bench: {
      crumb: 'Bench',
      title: 'My workbench',
      description: `${greeting}, ${firstName}. What needs you next and the files assigned to you in ${departmentName}.`,
    },
    division: {
      crumb: 'Division',
      title: `${departmentName} division`,
      description: `${greeting}, ${firstName}. Allocations, sign-offs and every open file in your laboratory.`,
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

  // What needs this officer next and what has happened lately, from the registers.
  const workSection = <DashboardWorkSection canOpen={canOpenRegisterFile} onOpen={onOpenRegisterFile} />;

  if (department === 'Water' && currentUser.role !== 'SUPER_ADMIN') {
    return (
      <WaterLabDashboard
        currentUser={currentUser}
        intakes={waterIntakes}
        isLoading={waterIntakesLoading}
        error={waterIntakesError}
        onNavigate={onNavigate}
        workSection={workSection}
      />
    );
  }

  if (department === 'Food & Drugs' && currentUser.role !== 'SUPER_ADMIN') {
    return (
      <FoodDrugLabDashboard
        currentUser={currentUser}
        intakes={foodDrugIntakes}
        isLoading={foodDrugIntakesLoading}
        error={foodDrugIntakesError}
        onNavigate={onNavigate}
        workSection={workSection}
      />
    );
  }

  if (department === 'Narcotics' && currentUser.role !== 'SUPER_ADMIN') {
    return (
      <NarcoticsLabDashboard
        currentUser={currentUser}
        visitors={visitors}
        intakes={narcoticsIntakes}
        isLoading={visitorsLoading}
        onNavigate={onNavigate}
        workSection={workSection}
      />
    );
  }

  /* ---------------- Stats strip (real counts from the registers) ---------------- */
  // Every number comes with what it means; colour appears only when something is good or needs attention.
  const totals = summary?.totals;
  const count = (value?: number) => (totals ? (value ?? 0).toLocaleString() : '—');
  const where = summary?.scope === 'department' ? `in ${departmentName}` : 'across all laboratories';
  const overdueAfter = summary?.overdueAfterDays ?? 14;
  const mean = totals ? meanTurnaround(totals) : null;
  const turnaroundCell = (
    <KpiCard
      label="Mean turnaround"
      value={totals ? mean ?? '—' : '—'}
      unit={mean !== null ? 'days' : undefined}
      icon={Clock}
      hint={mean === null ? 'Nothing issued in the last 90 days' : mean <= overdueAfter ? `Within the ${overdueAfter}-day target` : `Over the ${overdueAfter}-day target`}
      status={mean === null ? undefined : mean <= overdueAfter ? 'good' : 'attention'}
    />
  );
  const overdueCell = (
    <KpiCard
      label="Overdue"
      value={count(totals?.overdue)}
      icon={AlertTriangle}
      hint={!totals ? undefined : totals.overdue ? `Over ${overdueAfter} days in the lab · need attention` : `None over ${overdueAfter} days`}
      status={!totals ? undefined : totals.overdue ? 'attention' : 'good'}
    />
  );
  const signOffCell = (label: string) => (
    <KpiCard
      label={label}
      value={count(totals?.awaitingSignOff)}
      icon={ClipboardCheck}
      hint={totals?.awaitingSignOff ? 'Analysis done · Head to check and approve' : 'Nothing waiting'}
      status={totals?.awaitingSignOff ? 'soon' : undefined}
    />
  );
  const inLabCell = (
    <KpiCard label="In the laboratory" value={count(totals ? openFiles(totals) : 0)} icon={FlaskConical} hint={`Not yet issued · ${where}`} />
  );

  const kpis: Record<Persona, React.ReactNode> = {
    bench: (
      <>
        <KpiCard label="Under analysis" value={count(totals?.inAnalysis)} icon={FlaskConical} hint={`Exhibits being analysed ${where}`}
          action={{ label: 'Open the laboratory', onClick: () => onNavigate('laboratory') }} />
        {signOffCell('Awaiting the Head')}
        <KpiCard label="Issued this week" value={count(totals?.issuedThisWeek)} icon={FileCheck} hint="Certificates, reports and memos" />
        {overdueCell}
      </>
    ),
    division: (
      <>
        <KpiCard label="Awaiting allocation" value={count(totals?.awaitingAllocation)} icon={Inbox}
          hint={totals?.awaitingAllocation ? 'Assign an Analysis Officer' : 'Everything is allocated'}
          status={totals?.awaitingAllocation ? 'soon' : undefined}
          action={{ label: 'Open the laboratory', onClick: () => onNavigate('laboratory') }} />
        {signOffCell('Awaiting your sign-off')}
        <KpiCard label="Under analysis" value={count(totals?.inAnalysis)} icon={FlaskConical} hint={`With analysts ${where}`} />
        {overdueCell}
      </>
    ),
    quality: (
      <>
        {signOffCell('Awaiting sign-off')}
        {overdueCell}
        {turnaroundCell}
        <KpiCard label="Audit events today" value={summary?.auditEventsToday?.toLocaleString() ?? '—'} icon={Shield} hint="Every action is recorded"
          action={{ label: 'Open the audit trail', onClick: () => onNavigate('audit') }} />
      </>
    ),
    executive: (
      <>
        <KpiCard label="Registered this year" value={count(totals?.thisYear)} icon={TrendingUp} hint={`${count(totals?.registeredToday)} today · ${where}`} />
        {inLabCell}
        {turnaroundCell}
        {overdueCell}
      </>
    ),
    registry: (
      <>
        <KpiCard label="Registered today" value={count(totals?.registeredToday)} icon={ClipboardList} hint={`${count(totals?.thisYear)} this year`} />
        <KpiCard label="Awaiting allocation" value={count(totals?.awaitingAllocation)} icon={Inbox}
          hint={totals?.awaitingAllocation ? 'With the Heads of Department' : 'Everything is allocated'}
          status={totals?.awaitingAllocation ? 'soon' : undefined} />
        <KpiCard label="Visitors on site" value={visitorsLoading ? '—' : onSite.length} icon={Users}
          hint={awaitingLab.length ? `${awaitingLab.length} waiting for a laboratory` : 'Nobody waiting'}
          status={awaitingLab.length ? 'soon' : undefined}
          action={{ label: 'Open the Visitor Register', onClick: () => onNavigate('lab-bay') }} />
        <KpiCard label="Issued this week" value={count(totals?.issuedThisWeek)} icon={FileCheck} hint="Ready for collection or dispatch" />
      </>
    ),
    corporate: (
      <>
        <KpiCard label="Active staff accounts" value={summary?.activeStaff?.toLocaleString() ?? '—'} icon={Users} hint="On the nominal roll with access" />
        {inLabCell}
        {turnaroundCell}
        <KpiCard label="Issued this week" value={count(totals?.issuedThisWeek)} icon={FileCheck} hint={`${count(totals?.issued)} in total`} />
      </>
    ),
  };

  // The five shared stages, counted from the registers (issued files are left out: the pipeline is what is still open).
  const pipeline: { label: string; value: number; tone: Tone }[] = [
    { label: 'Awaiting document approval', value: totals?.awaitingApproval ?? 0, tone: 'slate' },
    { label: 'Awaiting allocation', value: totals?.awaitingAllocation ?? 0, tone: 'sky' },
    { label: 'Under analysis', value: totals?.inAnalysis ?? 0, tone: 'teal' },
    { label: 'Awaiting the Head', value: totals?.awaitingSignOff ?? 0, tone: 'violet' },
  ];
  const pipelineTotal = pipeline.reduce((sum, stage) => sum + stage.value, 0);
  const registerLoad = Object.entries(summary?.registers ?? {})
    .map(([name, register]) => ({ name, open: openFiles(register), overdue: register.overdue }))
    .sort((a, b) => b.open - a.open);
  const registerLoadMax = Math.max(0, ...registerLoad.map((lab) => lab.open));

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
        <Button variant="primary" icon={FileText} onClick={() => onOpenCaseFile(activeCase.id)} id="dash-quick-open-case" className="!bg-teal-300 !text-[#0b3a42] hover:!bg-teal-200 !shadow-teal-500/20">
          Resume case
        </Button>
      </>
    ) : persona === 'registry' ? (
      <>
        <Button icon={Users} onClick={() => onNavigate('lab-bay')}>
          Visitor Register
        </Button>
        <Button variant="primary" icon={Package} onClick={onOpenIntakeModal} id="dash-quick-intake" className="!bg-teal-300 !text-[#0b3a42] hover:!bg-teal-200 !shadow-teal-500/20">
          Register submission
        </Button>
      </>
    ) : persona === 'executive' ? (
      <>
        <Button icon={Shield} onClick={() => onNavigate('audit')}>
          Audit trail
        </Button>
        <Button variant="primary" icon={Award} onClick={() => onNavigate('executive')} className="!bg-teal-300 !text-[#0b3a42] hover:!bg-teal-200 !shadow-teal-500/20">
          Executive view
        </Button>
      </>
    ) : persona === 'quality' ? (
      <>
        <Button icon={BookOpen} onClick={() => onNavigate('references')}>
          Reference DB
        </Button>
        <Button variant="primary" icon={Shield} onClick={() => onNavigate('audit')} className="!bg-teal-300 !text-[#0b3a42] hover:!bg-teal-200 !shadow-teal-500/20">
          Audit trail
        </Button>
      </>
    ) : (
      <Button icon={Settings} onClick={() => onNavigate('settings')}>
        Settings
      </Button>
    );

  const quickLinks: QuickLink[] = [
    labAccess && { label: 'Laboratory workspace', hint: 'Benches, instruments & intake', icon: FlaskConical, tone: 'teal', onClick: () => onNavigate('laboratory') },
    persona !== 'corporate' && { label: 'GC-MS spectra', hint: `${activeCase.caseNumber}`, icon: Microscope, tone: 'violet', onClick: onOpenGCMS },
    persona !== 'corporate' && persona !== 'registry' && { label: 'Reference database', hint: 'Spectral libraries & methods', icon: BookOpen, tone: 'sky', onClick: () => onNavigate('references') },
    persona !== 'corporate' && persona !== 'registry' && { label: 'Audit trail', hint: 'Chain-of-custody events', icon: Shield, tone: 'slate', onClick: () => onNavigate('audit') },
    persona === 'registry' && { label: 'Notifications', hint: 'Laboratory call-outs', icon: Inbox, tone: 'sky', onClick: () => onNavigate('notifications') },
    persona === 'executive' && { label: 'Executive oversight', hint: 'Division performance', icon: Award, tone: 'emerald', onClick: () => onNavigate('executive') },
    { label: 'Settings', hint: 'Profile & preferences', icon: Settings, tone: 'slate', onClick: () => onNavigate('settings') },
  ].filter(Boolean) as QuickLink[];

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={[h.crumb, 'Overview']}
        title={h.title}
        description={h.description}
        meta={
          <div className="flex items-center gap-2">
            <StatusPill tone="emerald" pulse>Live</StatusPill>
            {currentUser.role === 'HEAD_OF_DEPARTMENT' && <StatusPill tone="emerald">Head of Department</StatusPill>}
          </div>
        }
        actions={headerActions}
      />

      {showAdmission && (
        <div className="flex flex-col gap-3 rounded-xl border border-teal-500/30 bg-teal-500/[0.06] p-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-3">
            <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${TONE.teal.chip}`}>
              <AlertTriangle className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-sm font-semibold text-slate-900 dark:text-white">Evidence admission pending</span>
                <StatusPill tone="rose">Action required</StatusPill>
              </div>
              <p className="mt-0.5 text-[13px] text-slate-600 dark:text-slate-300">
                {waitingVisitor.officerName} ({waitingVisitor.station}
                {waitingVisitor.badgeNumber ? ` · ${waitingVisitor.badgeNumber}` : ''}) is at the {departmentName} receiving bay with exhibits.
              </p>
            </div>
          </div>
          <Button variant="primary" icon={ShieldCheck} onClick={onOpenVerifyOfficer} className="self-start sm:self-auto !bg-teal-300 !text-[#0b3a42] hover:!bg-teal-200 !shadow-teal-500/20">
            Verify officer
          </Button>
        </div>
      )}

      <KpiGrid label="Key metrics">{kpis[persona]}</KpiGrid>

      {workSection}

      <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
        {/* Where every open file stands, from the registers */}
        <Panel className="xl:col-span-4" icon={Layers} title="Stage pipeline" description={totals ? `${count(openFiles(totals))} open files ${where}` : 'Loading…'}>
          <div className="space-y-3.5">
            {pipeline.map((stage) => (
              <MeterRow key={stage.label} label={stage.label} value={stage.value} total={Math.max(pipelineTotal, 1)} tone={stage.tone} />
            ))}
          </div>
        </Panel>

        {/* Open files per laboratory register */}
        <Panel className="xl:col-span-4" icon={BarChart3} title="Open files by laboratory" description="Registered and not yet issued">
          {registerLoad.length === 0 ? (
            <p className="text-xs text-slate-500 dark:text-slate-400">{summary ? 'No laboratory register in your scope yet.' : 'Loading…'}</p>
          ) : (
            <div className="space-y-2.5">
              {registerLoad.map((lab) => (
                <MeterRow key={lab.name} label={departmentLabel(lab.name as LaboratoryDepartment)} value={lab.open} total={Math.max(registerLoadMax, 1)} tone="sky"
                  suffix={lab.overdue ? ` · ${lab.overdue} overdue` : undefined} />
              ))}
            </div>
          )}
        </Panel>

        <Panel className="xl:col-span-4" title="Quick actions" flush>
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {quickLinks.map((link) => (
              <li key={link.label}>
                <button
                  type="button"
                  onClick={link.onClick}
                  className="group flex w-full cursor-pointer items-center gap-3 px-3.5 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <link.icon className="h-4 w-4 shrink-0 text-slate-400" />
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

interface WaterLabDashboardProps {
  currentUser: UserType;
  intakes: WaterIntake[];
  isLoading: boolean;
  error: string;
  onNavigate: (view: string) => void;
  /** The work list and activity feed, shown under the stats strip. */
  workSection?: React.ReactNode;
}

const WaterLabDashboard: React.FC<WaterLabDashboardProps> = ({
  currentUser,
  intakes,
  isLoading,
  error,
  onNavigate,
  workSection,
}) => {
  const awaitingApproval = intakes.filter((intake) => intake.status === 'Awaiting Approval').length;
  const awaiting = intakes.filter((intake) => intake.status === 'Awaiting Assignment').length;
  const inAnalysis = intakes.filter((intake) => intake.status === 'Under Analysis').length;
  const completed = intakes.filter((intake) => intake.status === 'Analysis Complete').length;
  const firstName = currentUser.name.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s*/, '').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weeklyIntakes = Array.from({ length: 8 }, (_, index) => {
    const start = new Date(currentWeekStart);
    start.setDate(start.getDate() - (7 - index) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const value = intakes.filter((intake) => {
      const date = new Date(`${intake.dateReceived}T00:00:00`);
      return !Number.isNaN(date.getTime()) && date >= start && date < end;
    }).length;
    return {
      week: start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }),
      value,
    };
  });
  const maxWeeklyIntakes = Math.max(1, ...weeklyIntakes.map((week) => week.value));
  const recentIntakes = intakes.slice(0, 8);
  const statusRows: { label: string; value: number; tone: Tone }[] = [
    { label: 'Awaiting approval', value: awaitingApproval, tone: 'rose' },
    { label: 'Awaiting assignment', value: awaiting, tone: 'teal' },
    { label: 'Under analysis', value: inAnalysis, tone: 'sky' },
    { label: 'Analysis complete', value: completed, tone: 'emerald' },
  ];

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Water & Environment', 'Overview']}
        title="Water & Environment dashboard"
        description={`${greeting}, ${firstName}. Live exhibit activity from the Water Lab database.`}
        meta={
          <div className="flex items-center gap-2">
            <StatusPill tone="emerald" pulse>Live</StatusPill>
            {currentUser.role === 'HEAD_OF_DEPARTMENT' && <StatusPill tone="emerald">Head of Department</StatusPill>}
          </div>
        }
        actions={<Button icon={Users} onClick={() => onNavigate('laboratory')}>Open Exhibit Laboratory</Button>}
      />

      {error && (
        <div role="alert" className="mb-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          Water Lab data could not be refreshed: {error}
        </div>
      )}

      {!isLoading && awaitingApproval > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/5 px-4 py-3 text-sm text-rose-800 dark:text-rose-200">
          <span>
            <span className="font-semibold">{awaitingApproval}</span> exhibit{awaitingApproval === 1 ? '' : 's'} awaiting your approval of the submitted documents.
          </span>
          <Button size="sm" onClick={() => onNavigate('laboratory')}>Review documents</Button>
        </div>
      )}

      {!isLoading && awaiting > 0 && (
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-500/30 bg-teal-500/5 px-4 py-3 text-sm text-teal-800 dark:text-teal-200">
          <span>
            <span className="font-semibold">{awaiting}</span> exhibit{awaiting === 1 ? '' : 's'} waiting for an Analysis Officer.
          </span>
          <Button size="sm" onClick={() => onNavigate('laboratory')}>Assign in register</Button>
        </div>
      )}

      <KpiGrid label="Water Lab metrics">
        <KpiCard label="Total exhibits" value={isLoading ? '—' : intakes.length} icon={Droplets} hint="Registered in Water & Environment" />
        <KpiCard label="Awaiting approval" value={isLoading ? '—' : awaitingApproval} icon={ClipboardList}
          hint={awaitingApproval ? 'Documents to review' : 'Nothing to review'} status={awaitingApproval ? 'soon' : undefined}
          action={{ label: 'Open the register', onClick: () => onNavigate('laboratory') }} />
        <KpiCard label="Awaiting assignment" value={isLoading ? '—' : awaiting} icon={Inbox}
          hint={awaiting ? 'Waiting for an Analysis Officer' : 'Everything is assigned'} status={awaiting ? 'soon' : undefined}
          action={{ label: 'Open the register', onClick: () => onNavigate('laboratory') }} />
        <KpiCard label="Under analysis" value={isLoading ? '—' : inAnalysis} icon={FlaskConical} hint="Assigned and in progress"
          action={{ label: 'Open the register', onClick: () => onNavigate('laboratory') }} />
        <KpiCard label="Analysis complete" value={isLoading ? '—' : completed} icon={FileCheck} hint="Results saved" status={completed ? 'good' : undefined} />
      </KpiGrid>

      {workSection}

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <Panel
          className="xl:col-span-8"
          icon={TrendingUp}
          tone="sky"
          title="Weekly exhibit intake"
          description={`${weeklyIntakes.reduce((n, w) => n + w.value, 0)} exhibits received in the last 8 weeks`}
        >
          {intakes.length === 0 && isLoading ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading Water Lab records…</p>
          ) : (
            <>
              <div className="grid h-56 grid-cols-8 gap-3 border-b border-slate-200 pt-4 dark:border-slate-800" role="img" aria-label="Water Lab exhibit intake counts by week">
                {weeklyIntakes.map((week) => (
                  <div key={week.week} className="flex h-full min-w-0 flex-col items-center justify-end gap-1.5">
                    <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{week.value}</span>
                    <div className="flex min-h-0 w-full flex-1 items-end justify-center">
                      <div
                        className="w-full max-w-10 rounded-t-md bg-sky-500/75 transition-all"
                        style={{ height: `${Math.max(week.value > 0 ? 8 : 2, (week.value / maxWeeklyIntakes) * 100)}%` }}
                        title={`${week.value} exhibit${week.value === 1 ? '' : 's'}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-8 gap-3 pt-2">
                {weeklyIntakes.map((week) => (
                  <span key={week.week} className="truncate text-center text-[10px] text-slate-400">{week.week}</span>
                ))}
              </div>
            </>
          )}
          <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] text-slate-400 dark:border-slate-800">
            Automatically refreshed from database records every 15 seconds.
          </p>
        </Panel>

        <Panel className="xl:col-span-4" icon={Layers} tone="emerald" title="Exhibit pipeline" description={`${intakes.length} Water Lab exhibits`}>
          <div className="space-y-3.5">
            {statusRows.map((row) => (
              <MeterRow key={row.label} label={row.label} value={row.value} total={Math.max(1, intakes.length)} tone={row.tone} />
            ))}
          </div>
        </Panel>
      </div>

      <Panel icon={ClipboardList} tone="sky" title="Latest Water Lab exhibits" description="Most recent records retrieved from the database" actions={<Button size="sm" onClick={() => onNavigate('lab-bay')}>View all</Button>} flush>
        {recentIntakes.length === 0 ? (
          <EmptyState
            icon={Droplets}
            title={isLoading ? 'Loading Water Lab records' : 'No Water exhibits registered'}
            description={isLoading ? 'The dashboard will show records as soon as they are fetched.' : 'New Water & Environment intake records will appear here.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className={`${tc.table} min-w-[700px]`}>
              <thead className={tc.thead}>
                <tr>
                  <th className={tc.th}>Lab reference</th>
                  <th className={tc.th}>Sender</th>
                  <th className={tc.th}>Test</th>
                  <th className={tc.th}>Source</th>
                  <th className={tc.th}>Received</th>
                  <th className={tc.th}>Analysis officer</th>
                  <th className={tc.th}>Status</th>
                </tr>
              </thead>
              <tbody className={tc.tbody}>
                {recentIntakes.map((intake) => (
                  <tr key={intake.id} className={tc.tr}>
                    <td className={`${tc.td} font-mono font-semibold text-slate-900 dark:text-white`}>{intake.labReference}</td>
                    <td className={tc.td}>{intake.senderName}</td>
                    <td className={tc.td}>{intake.testType}</td>
                    <td className={tc.td}>{intake.sourceCategory}</td>
                    <td className={`${tc.td} whitespace-nowrap tabular-nums`}>{intake.dateReceived}</td>
                    <td className={tc.td}>{intake.analysisOfficer || <span className="text-slate-400">Not assigned</span>}</td>
                    <td className={tc.td}>
                      <StatusPill
                        tone={
                          intake.status === 'Awaiting Approval'
                            ? 'rose'
                            : intake.status === 'Awaiting Assignment'
                              ? 'teal'
                              : intake.status === 'Under Analysis'
                                ? 'sky'
                                : 'emerald'
                        }
                      >
                        {intake.status}
                      </StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </DashboardPage>
  );
};
