import React from 'react';
import { BadgeCheck, CheckCircle2, ClipboardList, FlaskConical, Inbox, Layers, Pill, Shield, TrendingUp, Users } from 'lucide-react';
import { NarcoticsIntake, OfficerVisitor, User as UserType } from '../../types';
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

interface NarcoticsLabDashboardProps {
  currentUser: UserType;
  /** Reception visits routed to Narcotics (the server scopes them to the department). */
  visitors: OfficerVisitor[];
  /** Registered Narcotics exhibits. */
  intakes?: NarcoticsIntake[];
  isLoading: boolean;
  onNavigate: (view: string) => void;
}

const STATUS: Record<OfficerVisitor['status'], { label: string; tone: Tone }> = {
  'Awaiting Laboratory Reception': { label: 'Waiting at reception', tone: 'sky' },
  'In Laboratory': { label: 'In the laboratory', tone: 'teal' },
  Completed: { label: 'Ready for check-out', tone: 'emerald' },
  Departed: { label: 'Checked out', tone: 'slate' },
};

/**
 * Narcotics dashboard, laid out like the Water and Food & Drugs dashboards and
 * built only from live reception records: every police officer sent to the
 * Narcotics laboratory, where they are in the handover, and who sent them.
 */
export const NarcoticsLabDashboard: React.FC<NarcoticsLabDashboardProps> = ({
  currentUser,
  visitors,
  intakes = [],
  isLoading,
  onNavigate,
}) => {
  const visits = visitors.filter((visit) => visit.laboratory === 'Narcotics');
  const isHead = currentUser.role === 'HEAD_OF_DEPARTMENT';
  const loadingFirstTime = isLoading && visits.length === 0;
  const loadingValue = (value: number) => (loadingFirstTime ? '…' : value);
  const count = (status: OfficerVisitor['status']) => visits.filter((visit) => visit.status === status).length;
  const atReception = count('Awaiting Laboratory Reception');
  const notifiedAtReception = visits.filter((visit) => visit.status === 'Awaiting Laboratory Reception' && !!visit.labNotificationSentAt).length;
  const inLaboratory = count('In Laboratory');
  const toRegister = visits.filter((visit) => visit.status === 'In Laboratory' && !visit.labIntakeRegistered).length;
  const readyForCheckOut = count('Completed');
  const checkedOut = count('Departed');
  const awaitingAssignment = intakes.filter((intake) => intake.status === 'Awaiting Assignment').length;

  const firstName = currentUser.name.replace(/^(Dr\.|Prof\.|Mr\.|Mrs\.|Ms\.)\s*/, '').split(' ')[0];
  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';

  // Officers received per week for the last 8 weeks (weeks start on Monday).
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const currentWeekStart = new Date(today);
  currentWeekStart.setDate(today.getDate() - ((today.getDay() + 6) % 7));
  const weekly = Array.from({ length: 8 }, (_, index) => {
    const start = new Date(currentWeekStart);
    start.setDate(start.getDate() - (7 - index) * 7);
    const end = new Date(start);
    end.setDate(end.getDate() + 7);
    const value = visits.filter((visit) => {
      const date = new Date(`${visit.date}T00:00:00`);
      return !Number.isNaN(date.getTime()) && date >= start && date < end;
    }).length;
    return { week: start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' }), value };
  });
  const maxWeekly = Math.max(1, ...weekly.map((week) => week.value));
  const arrivedToday = visits.filter((visit) => new Date(`${visit.date}T00:00:00`).getTime() === today.getTime()).length;

  const pipeline: { label: string; value: number; tone: Tone }[] = [
    { label: 'Waiting at reception', value: atReception, tone: 'sky' },
    { label: 'In the laboratory', value: inLaboratory, tone: 'teal' },
    { label: 'Ready for check-out', value: readyForCheckOut, tone: 'emerald' },
    { label: 'Checked out', value: checkedOut, tone: 'slate' },
  ];

  // Busiest police stations first.
  const stationCounts = new Map<string, number>();
  visits.forEach((visit) => {
    const station = visit.station?.trim() || 'Not recorded';
    stationCounts.set(station, (stationCounts.get(station) ?? 0) + 1);
  });
  const byStation = [...stationCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 5);

  const recent = visits.slice(0, 8);

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Narcotics', 'Overview']}
        title="Narcotics dashboard"
        description={`${greeting}, ${firstName}. Live officer and exhibit handover activity for the Narcotics laboratory.`}
        meta={
          <div className="flex items-center gap-2">
            <StatusPill tone="emerald" pulse>Live</StatusPill>
            {isHead && <StatusPill tone="emerald">Head of Department</StatusPill>}
          </div>
        }
        actions={
          <>
            <Button icon={Pill} onClick={() => onNavigate('narcotics-intake')}>Exhibit intake</Button>
            <Button variant="primary" icon={FlaskConical} onClick={() => onNavigate('laboratory')} className="!bg-teal-300 !text-[#0b3a42] hover:!bg-teal-200 !shadow-teal-500/20">Open Exhibit Laboratory</Button>
          </>
        }
      />

      {!loadingFirstTime && notifiedAtReception > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-sky-500/30 bg-sky-500/5 px-4 py-3 text-sm text-sky-800 dark:text-sky-200">
          <span>
            <span className="font-semibold">{notifiedAtReception}</span> officer{notifiedAtReception === 1 ? ' is' : 's are'} waiting at reception to be accepted.
          </span>
          <Button size="sm" onClick={() => onNavigate('laboratory')}>Accept at laboratory</Button>
        </div>
      )}

      {!loadingFirstTime && toRegister > 0 && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-teal-500/30 bg-teal-500/5 px-4 py-3 text-sm text-teal-800 dark:text-teal-200">
          <span>
            <span className="font-semibold">{toRegister}</span> officer{toRegister === 1 ? '' : 's'} in the laboratory with exhibits still to register.
          </span>
          <Button size="sm" onClick={() => onNavigate('laboratory')}>Register exhibits</Button>
        </div>
      )}

      <KpiGrid label="Narcotics metrics">
        <KpiCard label="Officer visits" value={loadingValue(visits.length)} icon={Shield} tone="violet" hint={`${arrivedToday} arrived today`} />
        <KpiCard label="Waiting at reception" value={loadingValue(atReception)} icon={Inbox} tone="sky" hint={`${notifiedAtReception} notified to Narcotics`} />
        <KpiCard label="In the laboratory" value={loadingValue(inLaboratory)} icon={FlaskConical} tone="teal" hint={toRegister > 0 ? `${toRegister} still to register` : 'Accepted at the laboratory'} />
        <KpiCard label="Ready for check-out" value={loadingValue(readyForCheckOut)} icon={CheckCircle2} tone="emerald" hint="Intake complete" />
        <KpiCard label="Exhibits registered" value={loadingValue(intakes.length)} icon={ClipboardList} tone="slate" hint={`${awaitingAssignment} awaiting assignment · ${checkedOut} officers checked out`} />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <Panel
          className="xl:col-span-8"
          icon={TrendingUp}
          tone="violet"
          title="Weekly officer arrivals"
          description={`${weekly.reduce((n, week) => n + week.value, 0)} officers sent to Narcotics in the last 8 weeks`}
        >
          {loadingFirstTime ? (
            <p className="py-8 text-center text-sm text-slate-500 dark:text-slate-400">Loading Narcotics records…</p>
          ) : (
            <>
              <div className="grid h-56 grid-cols-8 gap-3 border-b border-slate-200 pt-4 dark:border-slate-800" role="img" aria-label="Officers sent to Narcotics per week">
                {weekly.map((week) => (
                  <div key={week.week} className="flex h-full min-w-0 flex-col items-center justify-end gap-1.5">
                    <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{week.value}</span>
                    <div className="flex min-h-0 w-full flex-1 items-end justify-center">
                      <div
                        className="w-full max-w-10 rounded-t-md bg-violet-500/75 transition-all"
                        style={{ height: `${Math.max(week.value > 0 ? 8 : 2, (week.value / maxWeekly) * 100)}%` }}
                        title={`${week.value} officer${week.value === 1 ? '' : 's'}`}
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
            Built from reception records for the Narcotics laboratory.
          </p>
        </Panel>

        <div className="space-y-5 xl:col-span-4">
          <Panel icon={Layers} tone="emerald" title="Handover pipeline" description={`${visits.length} officer visits`}>
            <div className="space-y-3.5">
              {pipeline.map((row) => (
                <MeterRow key={row.label} label={row.label} value={row.value} total={Math.max(1, visits.length)} tone={row.tone} />
              ))}
            </div>
          </Panel>
          <Panel icon={Shield} tone="violet" title="By police station" description="Where submitting officers come from">
            {byStation.length === 0 ? (
              <p className="py-2 text-xs text-slate-400">No officers recorded yet.</p>
            ) : (
              <div className="space-y-3.5">
                {byStation.map(([station, value]) => (
                  <MeterRow key={station} label={station} value={value} total={Math.max(1, visits.length)} tone="violet" />
                ))}
              </div>
            )}
          </Panel>
        </div>
      </div>

      <Panel
        icon={ClipboardList}
        tone="violet"
        title="Latest officers"
        description="The most recent police officers sent to Narcotics by reception"
        actions={<Button size="sm" onClick={() => onNavigate('laboratory')}>View all</Button>}
        flush
      >
        {recent.length === 0 ? (
          <EmptyState
            icon={Users}
            title={loadingFirstTime ? 'Loading Narcotics records' : 'No officers sent to Narcotics yet'}
            description={
              loadingFirstTime
                ? 'Records appear here as soon as they are fetched.'
                : 'Officers registered at reception for the Narcotics laboratory will appear here.'
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className={`${tc.table} min-w-[760px]`}>
              <thead className={tc.thead}>
                <tr>
                  <th scope="col" className={tc.th}>Visit no.</th>
                  <th scope="col" className={tc.th}>Officer</th>
                  <th scope="col" className={tc.th}>Police station</th>
                  <th scope="col" className={tc.th}>Arrived</th>
                  <th scope="col" className={tc.th}>Status</th>
                </tr>
              </thead>
              <tbody className={tc.tbody}>
                {recent.map((visit) => (
                  <tr key={visit.id} className={tc.tr}>
                    <td className={`${tc.td} font-mono font-semibold text-slate-900 dark:text-white`}>{visit.visitNumber}</td>
                    <td className={tc.td}>
                      <div className="max-w-[200px] truncate font-medium text-slate-900 dark:text-white" title={visit.officerName}>
                        {visit.officerName}
                      </div>
                      <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                        <BadgeCheck className="h-3 w-3" />
                        <span className="font-mono">{visit.badgeNumber || '—'}</span>
                      </div>
                    </td>
                    <td className={tc.td}>
                      <div className="max-w-[200px] truncate" title={visit.station}>{visit.station || '—'}</div>
                    </td>
                    <td className={`${tc.td} whitespace-nowrap tabular-nums`}>
                      {visit.date}
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{visit.timeIn} · by {visit.receptionistName}</div>
                    </td>
                    <td className={tc.td}>
                      <StatusPill tone={STATUS[visit.status].tone}>{STATUS[visit.status].label}</StatusPill>
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
