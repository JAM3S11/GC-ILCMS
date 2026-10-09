import React from 'react';
import { ClipboardList, FileCheck, FlaskConical, Inbox, Layers, TestTube, TrendingUp, Users } from 'lucide-react';
import { FoodDrugIntake, FoodDrugIntakeStatus, FoodDrugSampleType, User as UserType } from '../../types';
import { FOOD_DRUG_SAMPLE_TYPES } from '../../foodDrugIntake';
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
  tableClasses as tc,
} from '../common/Dashboard';

interface FoodDrugLabDashboardProps {
  currentUser: UserType;
  intakes: FoodDrugIntake[];
  isLoading: boolean;
  error: string;
  onNavigate: (view: string) => void;
}

const STATUS_TONE: Record<FoodDrugIntakeStatus, Tone> = {
  'Awaiting Approval': 'rose',
  'Awaiting Assignment': 'amber',
  'Under Analysis': 'sky',
  Reported: 'emerald',
};

const SAMPLE_TONE: Record<FoodDrugSampleType, Tone> = {
  Aflatoxin: 'amber',
  Mycotoxins: 'violet',
  Miscellaneous: 'sky',
};

/**
 * Food & Drugs dashboard, built only from the department's database records
 * (refreshed every 15 seconds by App), so every number and row is live.
 */
export const FoodDrugLabDashboard: React.FC<FoodDrugLabDashboardProps> = ({
  currentUser,
  intakes,
  isLoading,
  error,
  onNavigate,
}) => {
  const isHead = currentUser.role === 'HEAD_OF_DEPARTMENT';
  const loadingFirstTime = isLoading && intakes.length === 0;
  const count = (status: FoodDrugIntakeStatus) => intakes.filter((intake) => intake.status === status).length;
  const awaitingApproval = count('Awaiting Approval');
  const awaitingAssignment = count('Awaiting Assignment');
  const underAnalysis = count('Under Analysis');
  const reported = count('Reported');
  const mine = intakes.filter((intake) => intake.analystId === currentUser.id && intake.status === 'Under Analysis').length;

  const firstName = currentUser.name.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s*/, '').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Samples received per week for the last 8 weeks (weeks start on Monday).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekly = Array.from({ length: 8 }, (_, index) => {
    const start = new Date(currentWeekStart);
    start.setDate(start.getDate() - (7 - index) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const value = intakes.filter((intake) => {
      const date = new Date(`${intake.intakeDate}T00:00:00`);
      return !Number.isNaN(date.getTime()) && date >= start && date < end;
    }).length;
    return { week: start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), value };
  });
  const maxWeekly = Math.max(1, ...weekly.map((week) => week.value));
  const receivedToday = intakes.filter((intake) => {
    const date = new Date(`${intake.intakeDate}T00:00:00`);
    return date.getTime() === today.getTime();
  }).length;

  const pipeline: { label: string; value: number; tone: Tone }[] = [
    { label: 'Awaiting approval', value: awaitingApproval, tone: 'rose' },
    { label: 'Awaiting assignment', value: awaitingAssignment, tone: 'amber' },
    { label: 'Under analysis', value: underAnalysis, tone: 'sky' },
    { label: 'Reported', value: reported, tone: 'emerald' },
  ];
  const bySampleType = FOOD_DRUG_SAMPLE_TYPES.map((type) => ({
    type,
    value: intakes.filter((intake) => intake.sampleType === type).length,
  }));
  const recent = intakes.slice(0, 8);
  const loadingValue = (value: number) => (loadingFirstTime ? '…' : value);

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Food & Drugs', 'Overview']}
        title="Food & Drugs dashboard"
        description={`${greeting}, ${firstName}. Live sample activity from the Food & Drugs register.`}
        meta={
          <div className="flex items-center gap-2">
            <StatusPill tone="emerald" pulse>Live</StatusPill>
            {isHead && <StatusPill tone="emerald">Head of Section</StatusPill>}
          </div>
        }
        actions={
          <>
            <Button icon={Users} onClick={() => onNavigate('lab-bay')}>Visitor Register</Button>
            <Button variant="primary" icon={FlaskConical} onClick={() => onNavigate('laboratory')}>Open Exhibit Laboratory</Button>
          </>
        }
      />

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          Food &amp; Drugs data could not be refreshed: {error}
        </div>
      )}

      {isHead && !loadingFirstTime && (awaitingApproval > 0 || awaitingAssignment > 0) && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-500/30 bg-amber-500/5 px-4 py-3 text-sm text-amber-800 dark:text-amber-200">
          <span>
            {awaitingApproval > 0 && (
              <>
                <span className="font-semibold">{awaitingApproval}</span> awaiting your document approval
              </>
            )}
            {awaitingApproval > 0 && awaitingAssignment > 0 && ' · '}
            {awaitingAssignment > 0 && (
              <>
                <span className="font-semibold">{awaitingAssignment}</span> waiting for an officer
              </>
            )}
          </span>
          <Button size="sm" onClick={() => onNavigate('laboratory')}>Open register</Button>
        </div>
      )}

      {!isHead && !loadingFirstTime && mine > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-500/30 bg-sky-500/5 px-4 py-3 text-sm text-sky-800 dark:text-sky-200">
          <span>
            <span className="font-semibold">{mine}</span> sample{mine === 1 ? ' is' : 's are'} assigned to you and under analysis.
          </span>
          <Button size="sm" onClick={() => onNavigate('laboratory')}>Open register</Button>
        </div>
      )}

      <KpiGrid label="Food & Drugs metrics">
        <KpiCard label="Total samples" value={loadingValue(intakes.length)} icon={TestTube} tone="amber" hint={`${receivedToday} received today`} />
        <KpiCard label="Awaiting approval" value={loadingValue(awaitingApproval)} icon={ClipboardList} tone="rose" hint="Documents to review" />
        <KpiCard label="Awaiting assignment" value={loadingValue(awaitingAssignment)} icon={Inbox} tone="violet" hint="Waiting for an officer" />
        <KpiCard label="Under analysis" value={loadingValue(underAnalysis)} icon={FlaskConical} tone="sky" hint={mine > 0 ? `${mine} assigned to you` : 'Assigned and in progress'} />
        <KpiCard label="Reported" value={loadingValue(reported)} icon={FileCheck} tone="emerald" hint="Analysis recorded" />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <Panel
          className="xl:col-span-8"
          icon={TrendingUp}
          tone="amber"
          title="Weekly sample intake"
          description={`${weekly.reduce((n, week) => n + week.value, 0)} samples received in the last 8 weeks`}
        >
          {loadingFirstTime ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading Food &amp; Drugs records…</p>
          ) : (
            <>
              <div className="grid h-56 grid-cols-8 gap-3 border-b border-slate-200 pt-4 dark:border-slate-800" role="img" aria-label="Food & Drugs samples received per week">
                {weekly.map((week) => (
                  <div key={week.week} className="flex h-full min-w-0 flex-col items-center justify-end gap-1.5">
                    <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{week.value}</span>
                    <div className="flex min-h-0 w-full flex-1 items-end justify-center">
                      <div
                        className="w-full max-w-10 rounded-t-md bg-amber-500/75 transition-all"
                        style={{ height: `${Math.max(week.value > 0 ? 8 : 2, (week.value / maxWeekly) * 100)}%` }}
                        title={`${week.value} sample${week.value === 1 ? '' : 's'}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-8 gap-3 pt-2">
                {weekly.map((week) => (
                  <span key={week.week} className="truncate text-center text-[10px] text-slate-500 dark:text-slate-400">{week.week}</span>
                ))}
              </div>
            </>
          )}
          <p className="mt-3 border-t border-slate-100 pt-3 text-[11px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
            Refreshed from the database every 15 seconds.
          </p>
        </Panel>

        <div className="space-y-5 xl:col-span-4">
          <Panel icon={Layers} tone="emerald" title="Sample pipeline" description={`${intakes.length} samples in the register`}>
            <div className="space-y-3.5">
              {pipeline.map((row) => (
                <MeterRow key={row.label} label={row.label} value={row.value} total={Math.max(1, intakes.length)} tone={row.tone} />
              ))}
            </div>
          </Panel>
          <Panel icon={TestTube} tone="amber" title="By sample type">
            <div className="space-y-3.5">
              {bySampleType.map((row) => (
                <MeterRow key={row.type} label={row.type} value={row.value} total={Math.max(1, intakes.length)} tone={SAMPLE_TONE[row.type]} />
              ))}
            </div>
          </Panel>
        </div>
      </div>

      <Panel
        icon={ClipboardList}
        tone="amber"
        title="Latest samples"
        description="The most recent records in the Food & Drugs register"
        actions={<Button size="sm" onClick={() => onNavigate('laboratory')}>View all</Button>}
        flush
      >
        {recent.length === 0 ? (
          <EmptyState
            icon={TestTube}
            title={loadingFirstTime ? 'Loading Food & Drugs records' : 'No samples registered yet'}
            description={
              loadingFirstTime
                ? 'Records appear here as soon as they are fetched.'
                : 'Samples registered from Exhibit Intake will appear here.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className={`${tc.table} min-w-[760px]`}>
              <thead className={tc.thead}>
                <tr>
                  <th scope="col" className={tc.th}>Sample no.</th>
                  <th scope="col" className={tc.th}>Client</th>
                  <th scope="col" className={tc.th}>Sample type</th>
                  <th scope="col" className={tc.th}>Received</th>
                  <th scope="col" className={tc.th}>Officer</th>
                  <th scope="col" className={tc.th}>Status</th>
                </tr>
              </thead>
              <tbody className={tc.tbody}>
                {recent.map((intake) => (
                  <tr key={intake.id} className={tc.tr}>
                    <td className={tc.td}>
                      <div className="font-mono font-semibold text-slate-900 dark:text-white">{intake.id}</div>
                      <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{intake.exhibitId}</div>
                    </td>
                    <td className={tc.td}>
                      <div className="max-w-[200px] truncate font-medium text-slate-900 dark:text-white" title={intake.clientName}>
                        {intake.clientName}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{intake.poBox}</div>
                    </td>
                    <td className={tc.td}>{intake.sampleType}</td>
                    <td className={`${tc.td} whitespace-nowrap tabular-nums`}>
                      {intake.intakeDate}
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">by {intake.receiver}</div>
                    </td>
                    <td className={tc.td}>
                      {intake.analystAssigned || <span className="text-slate-500 dark:text-slate-400">Not assigned</span>}
                    </td>
                    <td className={tc.td}>
                      <StatusPill tone={STATUS_TONE[intake.status]}>{intake.status}</StatusPill>
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
