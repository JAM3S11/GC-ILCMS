import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, CheckCheck, Clock, Download, FlaskConical, LogOut, MoonStar, Search, X } from 'lucide-react';
import { LaboratoryDepartment, OfficerVisitor } from '../../types';
import { DESTINATION_LAB_ORDER, departmentLabel } from '../../lib/departments';
import { Avatar, Button, DashboardHeader, DashboardPage, DetailItem, EmptyState, StatusPill, Tone, TONE } from '../common/Dashboard';
import { Select } from '../common/Select';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { VISITOR_STATUS } from './visitorStatus';
import {
  OFFICE_CLOSE_MINUTES,
  OFFICE_OPEN_MINUTES,
  clockMinutes,
  formatClock,
  formatDay,
  formatDuration,
  isoDay,
  minutesOnSite,
  nowMinutes,
} from './visitorTime';

/* ---------------------------------------------------------------------------
 * Check-out desk: everyone still on the premises in one table, with who can
 * leave now, who is still with a laboratory, and who has stayed past closing
 * or overnight. Opening a row slides in a drawer to confirm the handover and
 * record the time out. A second tab lists those already signed out.
 * --------------------------------------------------------------------------- */

interface CheckOutViewProps {
  visitors: OfficerVisitor[];
  onCheckOut: (visitorId: string) => Promise<void>;
  canCheckOutVisits: boolean;
  hasMoreVisitors: boolean;
  isLoadingMoreVisitors: boolean;
  onLoadMoreVisitors: () => Promise<void>;
}

const CHECKOUT_CONFIRMATIONS = [
  'Laboratory service is complete',
  'Exhibit receipt handed to the officer',
  'Visitor badge returned to the desk',
];

type DeskTab = 'on-site' | 'signed-out';
/** Quick filters from the summary tiles. */
type Focus = 'all' | 'ready' | 'with-lab' | 'late';
type DatePreset = 'today' | 'yesterday' | '7d' | 'all';
type TimePreset = 'any' | 'morning' | 'afternoon' | 'after-hours';

const DATE_LABEL: Record<DatePreset, string> = { today: 'Today', yesterday: 'Yesterday', '7d': 'Last 7 days', all: 'Any date' };
const TIME_LABEL: Record<TimePreset, string> = {
  any: 'Any arrival time',
  morning: 'Morning (8–12)',
  afternoon: 'Afternoon (12–5)',
  'after-hours': 'Outside office hours',
};

interface DeskEntry {
  visitor: OfficerVisitor;
  arrived: number | null;
  minutes: number | null;
  /** Still on site from an earlier day. */
  overnight: boolean;
  /** Still on site after the office has closed today. */
  pastClosing: boolean;
  ready: boolean;
}

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

export const CheckOutView: React.FC<CheckOutViewProps> = ({
  visitors, onCheckOut, canCheckOutVisits, hasMoreVisitors, isLoadingMoreVisitors, onLoadMoreVisitors,
}) => {
  const today = isoDay();
  // Re-evaluate time on site and the closing-time flag every minute.
  const [now, setNow] = useState(nowMinutes);
  useEffect(() => {
    const id = window.setInterval(() => setNow(nowMinutes()), 60_000);
    return () => window.clearInterval(id);
  }, []);

  const [tab, setTab] = useState<DeskTab>('on-site');
  const [focus, setFocus] = useState<Focus>('all');
  const [datePreset, setDatePreset] = useState<DatePreset>('all');
  const [timePreset, setTimePreset] = useState<TimePreset>('any');
  const [lab, setLab] = useState<'all' | LaboratoryDepartment>('all');
  const [query, setQuery] = useState('');
  const [openId, setOpenId] = useState<string | null>(null);

  const entries = useMemo<DeskEntry[]>(() => visitors.map((visitor) => {
    const onSite = visitor.status !== 'Departed';
    return {
      visitor,
      arrived: clockMinutes(visitor.timeIn),
      minutes: minutesOnSite(visitor, now, today),
      overnight: onSite && visitor.date < today,
      pastClosing: onSite && visitor.date === today && now >= OFFICE_CLOSE_MINUTES,
      ready: visitor.status === 'Completed',
    };
  }), [visitors, now, today]);

  const onSite = entries.filter((e) => e.visitor.status !== 'Departed');
  const signedOut = entries.filter((e) => e.visitor.status === 'Departed');
  const counts = {
    ready: onSite.filter((e) => e.ready).length,
    withLab: onSite.filter((e) => !e.ready).length,
    late: onSite.filter((e) => e.overnight || e.pastClosing).length,
    signedOutToday: signedOut.filter((e) => e.visitor.date === today).length,
  };

  const dateFrom = datePreset === 'today' ? today : datePreset === 'yesterday' ? isoDay(-1) : datePreset === '7d' ? isoDay(-6) : '';
  const dateTo = datePreset === 'yesterday' ? isoDay(-1) : '';
  const q = query.trim().toLowerCase();

  const shown = (tab === 'on-site' ? onSite : signedOut)
    .filter((e) => tab === 'signed-out' || focus === 'all'
      || (focus === 'ready' && e.ready)
      || (focus === 'with-lab' && !e.ready)
      || (focus === 'late' && (e.overnight || e.pastClosing)))
    .filter((e) => (!dateFrom || e.visitor.date >= dateFrom) && (!dateTo || e.visitor.date <= dateTo))
    .filter((e) => {
      if (timePreset === 'any') return true;
      if (e.arrived === null) return false;
      if (timePreset === 'morning') return e.arrived >= OFFICE_OPEN_MINUTES && e.arrived < 12 * 60;
      if (timePreset === 'afternoon') return e.arrived >= 12 * 60 && e.arrived < OFFICE_CLOSE_MINUTES;
      return e.arrived < OFFICE_OPEN_MINUTES || e.arrived >= OFFICE_CLOSE_MINUTES;
    })
    .filter((e) => lab === 'all' || e.visitor.laboratory === lab)
    .filter((e) => !q || `${e.visitor.officerName} ${e.visitor.visitNumber} ${e.visitor.station} ${e.visitor.phone} ${e.visitor.badgeNumber ?? ''}`.toLowerCase().includes(q))
    .sort((a, b) => tab === 'on-site'
      // Ready to leave first, then whoever has been here longest.
      ? Number(b.ready) - Number(a.ready) || (b.minutes ?? Infinity) - (a.minutes ?? Infinity) || a.visitor.date.localeCompare(b.visitor.date)
      // Most recent departure first.
      : `${b.visitor.date}${String(clockMinutes(b.visitor.timeOut) ?? 0).padStart(4, '0')}`.localeCompare(`${a.visitor.date}${String(clockMinutes(a.visitor.timeOut) ?? 0).padStart(4, '0')}`));

  const filtersActive = (tab === 'on-site' && focus !== 'all') || datePreset !== 'all' || timePreset !== 'any' || lab !== 'all' || q !== '';
  const clearFilters = () => {
    setFocus('all');
    setDatePreset('all');
    setTimePreset('any');
    setLab('all');
    setQuery('');
  };

  const openEntry = entries.find((e) => e.visitor.id === openId) ?? null;

  const exportCsv = () => {
    const header = ['Visit no.', 'Date', 'Name', 'Station / organisation', 'Laboratory', 'Time in', 'Time out', 'Minutes on site', 'Status'];
    const lines = shown.map(({ visitor: v, minutes }) =>
      [v.visitNumber, v.date, v.officerName, v.station, departmentLabel(v.laboratory), v.timeIn, v.timeOut ?? '', minutes ?? '', VISITOR_STATUS[v.status].label]
        .map(csvCell).join(','));
    const blob = new Blob([[header.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${tab === 'on-site' ? 'on-premises' : 'departures'}-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const tiles: { id: Focus; label: string; value: number; hint: string; icon: React.ComponentType<{ className?: string }>; tone: Tone }[] = [
    { id: 'ready', label: 'Ready to leave', value: counts.ready, hint: 'Laboratory has finished', icon: LogOut, tone: 'emerald' },
    { id: 'with-lab', label: 'Still with laboratory', value: counts.withLab, hint: 'Cannot check out yet', icon: FlaskConical, tone: 'sky' },
    { id: 'late', label: 'Past closing / overnight', value: counts.late, hint: `Office closes at ${formatClock(OFFICE_CLOSE_MINUTES)}`, icon: MoonStar, tone: 'rose' },
  ];

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Front Office', 'Check Out']}
        title="Check-out desk"
        description="Everyone still on the premises. Confirm the handover, then sign each client out of the visitor register."
        meta={
          <StatusPill tone={onSite.length ? 'amber' : 'emerald'} pulse={counts.ready > 0}>
            {onSite.length ? `${onSite.length} on premises` : 'Premises clear'}
          </StatusPill>
        }
        actions={
          <Button icon={Download} onClick={exportCsv} disabled={shown.length === 0} title="Download the rows shown as a spreadsheet (CSV)">
            Export
          </Button>
        }
      />

      {/* Summary tiles double as quick filters for the on-site table. */}
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {tiles.map(({ id, label, value, hint, icon: Icon, tone }) => {
          const active = tab === 'on-site' && focus === id;
          const alarm = id === 'late' && value > 0;
          return (
            <button
              key={id}
              type="button"
              aria-pressed={active}
              onClick={() => { setTab('on-site'); setFocus(active ? 'all' : id); }}
              className={`flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-4 text-left shadow-sm transition-colors dark:bg-slate-900 ${
                active
                  ? 'border-amber-500 ring-2 ring-amber-500/20'
                  : alarm
                    ? 'border-rose-300 hover:border-rose-400 dark:border-rose-900'
                    : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
              }`}
            >
              <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONE[tone].soft} ${TONE[tone].text}`}>
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0">
                <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
                <span className={`block text-2xl font-bold tabular-nums ${alarm ? 'text-rose-600 dark:text-rose-400' : 'text-slate-900 dark:text-white'}`}>{value}</span>
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">{hint}</span>
              </span>
            </button>
          );
        })}
        <button
          type="button"
          aria-pressed={tab === 'signed-out'}
          onClick={() => { setTab('signed-out'); setDatePreset('today'); }}
          className={`flex cursor-pointer items-start gap-3 rounded-xl border bg-white p-4 text-left shadow-sm transition-colors dark:bg-slate-900 ${
            tab === 'signed-out' ? 'border-amber-500 ring-2 ring-amber-500/20' : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
          }`}
        >
          <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${TONE.slate.soft} ${TONE.slate.text}`}>
            <CheckCheck className="h-4 w-4" />
          </span>
          <span className="min-w-0">
            <span className="block text-xs font-medium text-slate-500 dark:text-slate-400">Signed out today</span>
            <span className="block text-2xl font-bold tabular-nums text-slate-900 dark:text-white">{counts.signedOutToday}</span>
            <span className="block text-[11px] text-slate-500 dark:text-slate-400">View the departures log</span>
          </span>
        </button>
      </div>

      <section aria-label="Check-out table" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Tabs */}
        <div role="tablist" aria-label="Check-out views" className="flex gap-1 border-b border-slate-200 px-4 dark:border-slate-800">
          {([
            { id: 'on-site', label: 'On premises', count: onSite.length },
            { id: 'signed-out', label: 'Signed out', count: signedOut.length },
          ] as const).map((item) => {
            const selected = tab === item.id;
            return (
              <button
                key={item.id}
                type="button"
                role="tab"
                aria-selected={selected}
                onClick={() => setTab(item.id)}
                className={`-mb-px flex cursor-pointer items-center gap-2 border-b-2 px-3 py-3 text-[13px] ${
                  selected
                    ? 'border-amber-500 font-semibold text-slate-900 dark:text-white'
                    : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white'
                }`}
              >
                {item.label}
                <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${selected ? 'bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'}`}>
                  {item.count}
                </span>
              </button>
            );
          })}
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 bg-slate-50/60 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950/30">
          <label className="flex h-8 min-w-[14rem] flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-2.5 sm:max-w-xs dark:border-slate-700 dark:bg-slate-950">
            <Search className="h-3.5 w-3.5 text-slate-400" />
            <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Name, visit no., badge or phone" aria-label="Search visitors" className="w-full bg-transparent text-xs outline-none dark:text-white" />
          </label>
          <Select<DatePreset>
            size="xs"
            className="w-36"
            aria-label="Date"
            value={datePreset}
            onChange={setDatePreset}
            options={(Object.keys(DATE_LABEL) as DatePreset[]).map((value) => ({ value, label: DATE_LABEL[value] }))}
          />
          <Select<TimePreset>
            size="xs"
            className="w-44"
            aria-label="Arrival time"
            value={timePreset}
            onChange={setTimePreset}
            options={(Object.keys(TIME_LABEL) as TimePreset[]).map((value) => ({ value, label: TIME_LABEL[value] }))}
          />
          <Select<'all' | LaboratoryDepartment>
            size="xs"
            className="w-52"
            aria-label="Laboratory"
            value={lab}
            onChange={setLab}
            options={[{ value: 'all', label: 'All laboratories' }, ...DESTINATION_LAB_ORDER.map((value) => ({ value, label: departmentLabel(value) }))]}
          />
          {filtersActive && <Button variant="ghost" size="sm" icon={X} onClick={clearFilters}>Clear filters</Button>}
          <span className="ml-auto text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{shown.length} shown</span>
        </div>

        {shown.length === 0 ? (
          <EmptyState
            icon={tab === 'on-site' ? CheckCheck : LogOut}
            title={filtersActive ? 'Nothing matches these filters' : tab === 'on-site' ? 'No one is on the premises' : 'No departures recorded'}
            description={filtersActive ? 'Change or clear the filters to see more.' : tab === 'on-site' ? 'Visitors appear here from the moment they are registered.' : 'Clients you check out are listed here.'}
            action={filtersActive ? <Button size="sm" onClick={clearFilters}>Clear filters</Button> : undefined}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden overflow-x-auto md:block">
              <table className="w-full text-left text-[13px]">
                <thead className="bg-slate-50 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-950/50 dark:text-slate-400">
                  {tab === 'on-site' ? (
                    <tr>
                      <th scope="col" className="px-4 py-2.5">Visitor</th>
                      <th scope="col" className="px-3 py-2.5">Laboratory</th>
                      <th scope="col" className="px-3 py-2.5">Arrived</th>
                      <th scope="col" className="px-3 py-2.5">Time on site</th>
                      <th scope="col" className="px-3 py-2.5">Status</th>
                      <th scope="col" className="px-4 py-2.5 text-right">Action</th>
                    </tr>
                  ) : (
                    <tr>
                      <th scope="col" className="px-4 py-2.5">Visitor</th>
                      <th scope="col" className="px-3 py-2.5">Laboratory</th>
                      <th scope="col" className="px-3 py-2.5">Date</th>
                      <th scope="col" className="px-3 py-2.5">In → Out</th>
                      <th scope="col" className="px-3 py-2.5">Time on site</th>
                      <th scope="col" className="px-4 py-2.5 text-right" />
                    </tr>
                  )}
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {shown.map((entry) => {
                    const { visitor: v, minutes, overnight, pastClosing, ready } = entry;
                    const late = overnight || pastClosing;
                    return (
                      <tr
                        key={v.id}
                        onClick={() => setOpenId(v.id)}
                        className={`cursor-pointer transition-colors ${late ? 'bg-rose-50/50 hover:bg-rose-50 dark:bg-rose-500/5 dark:hover:bg-rose-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                      >
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <Avatar name={v.officerName} size="sm" tone={ready ? 'emerald' : late ? 'rose' : 'slate'} />
                            <div className="min-w-0">
                              <div className="truncate font-medium text-slate-900 dark:text-white">{v.officerName}</div>
                              <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                                <span className="font-mono">{v.visitNumber}</span> · {v.station || 'No station'}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{departmentLabel(v.laboratory)}</td>
                        {tab === 'on-site' ? (
                          <>
                            <td className="px-3 py-3 tabular-nums text-slate-600 dark:text-slate-300">
                              {v.timeIn}
                              {v.date !== today && <div className="text-[11px] text-slate-500">{formatDay(v.date, 'short')}</div>}
                            </td>
                            <td className="px-3 py-3">
                              <span className={`tabular-nums ${late ? 'font-medium text-rose-700 dark:text-rose-300' : 'text-slate-600 dark:text-slate-300'}`}>
                                {overnight ? 'Since an earlier day' : minutes !== null ? formatDuration(minutes) : '—'}
                              </span>
                              {late && (
                                <div className="mt-0.5 flex items-center gap-1 text-[11px] font-medium text-rose-700 dark:text-rose-300">
                                  <AlertTriangle className="h-3 w-3" /> {overnight ? 'Not signed out overnight' : 'Past closing time'}
                                </div>
                              )}
                            </td>
                            <td className="px-3 py-3"><StatusPill tone={VISITOR_STATUS[v.status].tone}>{VISITOR_STATUS[v.status].label}</StatusPill></td>
                            <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                              {ready && canCheckOutVisits ? (
                                <Button size="sm" variant="primary" icon={LogOut} onClick={() => setOpenId(v.id)}>Check out</Button>
                              ) : (
                                <Button size="sm" variant="ghost" onClick={() => setOpenId(v.id)}>View</Button>
                              )}
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-3 text-slate-600 dark:text-slate-300">{v.date === today ? 'Today' : formatDay(v.date, 'short')}</td>
                            <td className="px-3 py-3 tabular-nums text-slate-600 dark:text-slate-300">{v.timeIn} → {v.timeOut || '—'}</td>
                            <td className="px-3 py-3 tabular-nums text-slate-600 dark:text-slate-300">{minutes !== null ? formatDuration(minutes) : '—'}</td>
                            <td className="px-4 py-3 text-right"><Button size="sm" variant="ghost">View</Button></td>
                          </>
                        )}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Phone cards */}
            <ul className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
              {shown.map(({ visitor: v, minutes, overnight, pastClosing, ready }) => {
                const late = overnight || pastClosing;
                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(v.id)}
                      className={`flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left ${late ? 'bg-rose-50/50 dark:bg-rose-500/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                    >
                      <Avatar name={v.officerName} size="sm" tone={ready ? 'emerald' : late ? 'rose' : 'slate'} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[13px] font-medium text-slate-900 dark:text-white">{v.officerName}</span>
                          <StatusPill tone={VISITOR_STATUS[v.status].tone}>{VISITOR_STATUS[v.status].label}</StatusPill>
                        </div>
                        <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">{departmentLabel(v.laboratory)}</div>
                        <div className={`text-[11px] tabular-nums ${late ? 'font-medium text-rose-700 dark:text-rose-300' : 'text-slate-500 dark:text-slate-400'}`}>
                          {v.timeIn}{v.timeOut ? ` → ${v.timeOut}` : ''}
                          {overnight ? ' · not signed out overnight' : minutes !== null ? ` · ${formatDuration(minutes)}` : ''}
                          {pastClosing && ' · past closing'}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          </>
        )}
      </section>

      {hasMoreVisitors && (
        <div className="flex justify-center">
          <Button variant="secondary" disabled={isLoadingMoreVisitors} onClick={() => void onLoadMoreVisitors()}>
            {isLoadingMoreVisitors ? 'Loading older records…' : 'Load older visitor records'}
          </Button>
        </div>
      )}

      <CheckOutDrawer
        entry={openEntry}
        now={now}
        canCheckOut={canCheckOutVisits}
        onClose={() => setOpenId(null)}
        onCheckOut={onCheckOut}
      />
    </DashboardPage>
  );
};

/* ------------------------------- Drawer --------------------------------- */

const CheckOutDrawer: React.FC<{
  entry: DeskEntry | null;
  now: number;
  canCheckOut: boolean;
  onClose: () => void;
  onCheckOut: (visitorId: string) => Promise<void>;
}> = ({ entry, now, canCheckOut, onClose, onCheckOut }) => {
  const isMobile = useIsMobile();
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState(false);
  const visitorId = entry?.visitor.id;

  // Each visitor starts with a clean handover checklist.
  useEffect(() => { setConfirmed(new Set()); }, [visitorId]);

  const toggle = (item: string) =>
    setConfirmed((previous) => {
      const next = new Set(previous);
      if (!next.delete(item)) next.add(item);
      return next;
    });

  const v = entry?.visitor;
  const status = v ? VISITOR_STATUS[v.status] : null;
  const departed = v?.status === 'Departed';
  const allConfirmed = confirmed.size === CHECKOUT_CONFIRMATIONS.length;
  const canComplete = !!entry?.ready && canCheckOut;

  const complete = async () => {
    if (!v) return;
    setWorking(true);
    try {
      // The drawer stays open and turns into the departure record as confirmation.
      await onCheckOut(v.id);
    } finally {
      setWorking(false);
    }
  };

  return (
    <Drawer open={!!entry} onOpenChange={(open) => !open && onClose()} direction={isMobile ? 'bottom' : 'right'}>
      <DrawerContent
        className={
          isMobile
            ? 'max-h-[92dvh] bg-white dark:bg-slate-900'
            : 'bg-white data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-lg dark:border-slate-800 dark:bg-slate-900'
        }
      >
        {entry && v && status && (
          <>
            <DrawerHeader className="border-b border-slate-200 px-5 py-4 text-left dark:border-slate-800">
              <div className="flex items-start gap-3">
                <Avatar name={v.officerName} size="lg" tone={status.tone} />
                <div className="min-w-0 flex-1">
                  <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">{departed ? 'Departure record' : 'Check out'}</p>
                  <DrawerTitle className="truncate text-base text-slate-900 dark:text-white">{v.officerName}</DrawerTitle>
                  <DrawerDescription className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono">{v.visitNumber}</span> · {v.station || 'No station'}
                  </DrawerDescription>
                  <div className="mt-2"><StatusPill tone={status.tone}>{status.label}</StatusPill></div>
                </div>
                <DrawerClose asChild>
                  <button type="button" aria-label="Close" className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white">
                    <X className="h-4 w-4" />
                  </button>
                </DrawerClose>
              </div>
            </DrawerHeader>

            <div className="min-h-0 flex-1 space-y-5 overflow-y-auto px-5 py-5">
              {(entry.overnight || entry.pastClosing) && (
                <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                  <AlertTriangle className="mt-px h-4 w-4 shrink-0" />
                  {entry.overnight
                    ? 'This visitor was never signed out on the day they arrived. Confirm they have left the premises, then check them out.'
                    : `The office closed at ${formatClock(OFFICE_CLOSE_MINUTES)}. Confirm whether the visitor is still on the premises.`}
                </div>
              )}

              <dl className="grid grid-cols-2 gap-4 rounded-xl border border-slate-200 p-4 dark:border-slate-800">
                <DetailItem label="Arrived">{v.date ? formatDay(v.date, 'short') : '—'} · {v.timeIn}</DetailItem>
                <DetailItem label={departed ? 'Left' : 'Time on site'}>
                  {departed ? v.timeOut || '—' : entry.overnight ? 'Since an earlier day' : entry.minutes !== null ? formatDuration(entry.minutes) : '—'}
                </DetailItem>
                <DetailItem label="Laboratory">{departmentLabel(v.laboratory)}</DetailItem>
                <DetailItem label="Service badge">{v.badgeNumber || '—'}</DetailItem>
                <DetailItem label="Exhibits brought">{v.exhibitsPresented || '—'}</DetailItem>
                <DetailItem label="Registered by">{v.receptionistName || '—'}</DetailItem>
              </dl>

              {departed ? (
                <p className="flex items-center gap-2 text-xs text-slate-500 dark:text-slate-400">
                  <CheckCheck className="h-4 w-4 text-emerald-500" /> Signed out at {v.timeOut || '—'}{entry.minutes !== null && <> after {formatDuration(entry.minutes)} on site</>}.
                </p>
              ) : entry.ready ? (
                <fieldset>
                  <legend className="text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Confirm the handover</legend>
                  <ul className="mt-3 space-y-2">
                    {CHECKOUT_CONFIRMATIONS.map((item) => (
                      <li key={item}>
                        <label className={`flex items-center gap-2.5 rounded-lg border px-3 py-2.5 text-[13px] ${
                          confirmed.has(item)
                            ? 'border-emerald-300 bg-emerald-50 text-emerald-900 dark:border-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-100'
                            : 'border-slate-200 text-slate-700 dark:border-slate-700 dark:text-slate-200'
                        } ${canCheckOut ? 'cursor-pointer' : 'cursor-not-allowed opacity-60'}`}>
                          <input
                            type="checkbox"
                            disabled={!canCheckOut}
                            checked={confirmed.has(item)}
                            onChange={() => toggle(item)}
                            className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                          />
                          {item}
                        </label>
                      </li>
                    ))}
                  </ul>
                  <p className="mt-3 flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                    <Clock className="h-3.5 w-3.5" /> Time out will be recorded as about {formatClock(now)}.
                  </p>
                </fieldset>
              ) : (
                <div className="flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs text-sky-900 dark:border-sky-900 dark:bg-sky-950/30 dark:text-sky-100">
                  <FlaskConical className="mt-px h-4 w-4 shrink-0" />
                  <span>
                    Not ready to leave yet: {v.status === 'Awaiting Laboratory Reception' ? 'the laboratory has not received this visitor.' : 'the laboratory has not marked the service complete.'}{' '}
                    Check-out opens once {departmentLabel(v.laboratory)} finishes.
                  </span>
                </div>
              )}
            </div>

            <DrawerFooter className="flex-row items-center justify-between gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {departed ? '' : !canCheckOut ? 'Only reception staff can check visitors out.' : !entry.ready ? '' : allConfirmed ? 'Everything is confirmed.' : `${confirmed.size} of ${CHECKOUT_CONFIRMATIONS.length} confirmed`}
              </p>
              <div className="flex items-center gap-2">
                <DrawerClose asChild>
                  <Button variant="ghost">Close</Button>
                </DrawerClose>
                {canComplete && (
                  <Button variant="primary" icon={LogOut} disabled={!allConfirmed || working} onClick={() => void complete()}>
                    {working ? 'Checking out…' : 'Complete check-out'}
                  </Button>
                )}
              </div>
            </DrawerFooter>
          </>
        )}
      </DrawerContent>
    </Drawer>
  );
};
