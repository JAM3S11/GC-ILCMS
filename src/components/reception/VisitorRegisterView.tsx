import React, { useEffect, useMemo, useState } from 'react';
import {
  AlarmClock,
  ArrowDown,
  ArrowUp,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  Clock,
  DoorOpen,
  Download,
  Inbox,
  Loader2,
  Printer,
  Shield,
  X,
} from 'lucide-react';
import { LaboratoryDepartment, OfficerVisitor, VisitorType } from '../../types';
import { departmentLabel } from '../../lib/departments';
import { Avatar, Button, DashboardHeader, DashboardPage, EmptyState, SearchInput, StatusPill, TONE, Tone } from '../common/Dashboard';
import { Select } from '../common/Select';
import { OfficialPrintDocument, printCell, printOfficialDocument } from '../common/print/OfficialPrintDocument';
import { VISITOR_STATUS } from './visitorStatus';
import { VisitorActions, nextStepFor } from './VisitorRecord';
import { VisitorDrawer } from './VisitorDrawer';
import {
  WAIT_LIMIT_MINUTES,
  clockMinutes,
  formatDay,
  formatDuration,
  inputTimeMinutes,
  isoDay,
  minutesOnSite,
  nowMinutes,
} from './visitorTime';

/* ---------------------------------------------------------------------------
 * Visitor Register — the front office's digital visitors' book.
 *
 * One register table of every visit: status tabs with counts, exception
 * shortcuts (long waits, not signed out), filters for date, arrival time,
 * laboratory and visitor type, sortable columns grouped by day, the next
 * action inline on each row, and the full entry in a side panel. Prints as an
 * official A4 register and exports to CSV.
 * --------------------------------------------------------------------------- */

interface VisitorRegisterViewProps extends VisitorActions {
  visitors: OfficerVisitor[];
  initialSelectedVisitorId?: string | null;
  onServiceComplete?: (visitorId: string) => Promise<void>;
  canCompleteVisits?: boolean;
  isLoading: boolean;
  hasMoreVisitors: boolean;
  isLoadingMoreVisitors: boolean;
  onLoadMoreVisitors: () => Promise<void>;
  currentUserName: string;
}

type Status = OfficerVisitor['status'];
type StatusTab = 'all' | Status;
type Exception = 'none' | 'long-wait' | 'overnight' | 'not-notified';
type DatePreset = 'today' | 'yesterday' | '7d' | 'month' | 'all' | 'custom';
type TimePreset = 'any' | 'morning' | 'afternoon' | 'after-hours' | 'custom';
type SortKey = 'arrived' | 'visitor' | 'laboratory' | 'onSite' | 'status';

const STATUS_ORDER: Status[] = ['Awaiting Laboratory Reception', 'In Laboratory', 'Completed', 'Departed'];
const STATUS_TAB_LABEL: Record<Status, string> = {
  'Awaiting Laboratory Reception': 'Awaiting laboratory',
  'In Laboratory': 'In laboratory',
  Completed: 'Ready for check-out',
  Departed: 'Checked out',
};

const DATE_LABEL: Record<DatePreset, string> = {
  today: 'Today',
  yesterday: 'Yesterday',
  '7d': 'Last 7 days',
  month: 'This month',
  all: 'All loaded records',
  custom: 'Custom dates',
};

// Office hours 08:00–17:00.
const TIME_LABEL: Record<TimePreset, string> = {
  any: 'Any time',
  morning: 'Morning (08:00–12:00)',
  afternoon: 'Afternoon (12:00–17:00)',
  'after-hours': 'Outside office hours',
  custom: 'Custom times',
};

const VISITOR_TYPE_LABEL: Record<VisitorType, string> = {
  POLICE_OFFICER: 'Police officers',
  GENERAL_CLIENT: 'General clients',
};

const PAGE_SIZE = 25;

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const timeInput =
  'h-8 rounded-lg border border-slate-200 bg-white px-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

export const VisitorRegisterView: React.FC<VisitorRegisterViewProps> = ({
  visitors,
  initialSelectedVisitorId,
  isLoading,
  hasMoreVisitors,
  isLoadingMoreVisitors,
  onLoadMoreVisitors,
  currentUserName,
  ...actions
}) => {
  const today = isoDay();
  const yesterday = isoDay(-1);

  const [tab, setTab] = useState<StatusTab>('all');
  const [exception, setException] = useState<Exception>('none');
  const [datePreset, setDatePreset] = useState<DatePreset>(() => (visitors.some((v) => v.date === today) ? 'today' : 'all'));
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [timePreset, setTimePreset] = useState<TimePreset>('any');
  const [timeFrom, setTimeFrom] = useState('');
  const [timeTo, setTimeTo] = useState('');
  const [lab, setLab] = useState<'all' | LaboratoryDepartment>('all');
  const [visitorType, setVisitorType] = useState<'all' | VisitorType>('all');
  const [query, setQuery] = useState('');
  const [sort, setSort] = useState<{ key: SortKey; desc: boolean }>({ key: 'arrived', desc: true });
  const [page, setPage] = useState(0);
  const [openId, setOpenId] = useState<string | null>(null);

  useEffect(() => {
    if (initialSelectedVisitorId) setOpenId(initialSelectedVisitorId);
  }, [initialSelectedVisitorId]);

  // Times on site tick over every minute.
  const [now, setNow] = useState(nowMinutes);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(nowMinutes()), 60_000);
    return () => window.clearInterval(timer);
  }, []);

  const entries = useMemo(
    () =>
      visitors.map((visitor) => {
        const minutes = minutesOnSite(visitor, now, today);
        return {
          visitor,
          minutes,
          arrivedAt: clockMinutes(visitor.timeIn),
          longWait: visitor.status === 'Awaiting Laboratory Reception' && minutes !== null && minutes > WAIT_LIMIT_MINUTES,
          // Still signed in from an earlier day: a security concern for the premises.
          overnight: visitor.status !== 'Departed' && visitor.date < today,
          notNotified: visitor.status === 'Awaiting Laboratory Reception' && !visitor.labNotificationSentAt,
        };
      }),
    [visitors, now, today],
  );
  type Entry = (typeof entries)[number];

  const laboratories = useMemo(() => Array.from(new Set(visitors.map((v) => v.laboratory))), [visitors]);

  /* ------------------------------ Filtering ------------------------------ */

  const [fromDay, toDay] = (() => {
    switch (datePreset) {
      case 'today':
        return [today, today];
      case 'yesterday':
        return [yesterday, yesterday];
      case '7d':
        return [isoDay(-6), today];
      case 'month':
        return [`${today.slice(0, 7)}-01`, today];
      case 'custom':
        return [dateFrom, dateTo];
      default:
        return ['', ''];
    }
  })();

  const [fromTime, toTime] = (() => {
    switch (timePreset) {
      case 'morning':
        return [8 * 60, 12 * 60 - 1];
      case 'afternoon':
        return [12 * 60, 17 * 60 - 1];
      case 'custom':
        return [inputTimeMinutes(timeFrom), inputTimeMinutes(timeTo)];
      default:
        return [null, null];
    }
  })();

  const q = query.trim().toLowerCase();
  const matchesBase = (entry: Entry) => {
    const v = entry.visitor;
    // Exceptions look across every loaded day, so an old unsigned-out visit is never hidden by the date.
    const dateOk = exception === 'overnight' || ((!fromDay || v.date >= fromDay) && (!toDay || v.date <= toDay));
    const timeOk =
      timePreset === 'any' ||
      (entry.arrivedAt !== null &&
        (timePreset === 'after-hours'
          ? entry.arrivedAt < 8 * 60 || entry.arrivedAt >= 17 * 60
          : (fromTime === null || entry.arrivedAt >= fromTime) && (toTime === null || entry.arrivedAt <= toTime)));
    return (
      dateOk &&
      timeOk &&
      (lab === 'all' || v.laboratory === lab) &&
      (visitorType === 'all' || v.visitorType === visitorType) &&
      (!q ||
        [v.officerName, v.visitNumber, v.station, v.phone, v.badgeNumber, v.vehicleRegistration, v.purposeOfVisit, v.exhibitsPresented].some((field) =>
          (field ?? '').toLowerCase().includes(q),
        ))
    );
  };
  const matchesException = (entry: Entry) =>
    exception === 'none' ||
    (exception === 'long-wait' && entry.longWait) ||
    (exception === 'overnight' && entry.overnight) ||
    (exception === 'not-notified' && entry.notNotified);

  // Everything except the status tab: drives the tab counts.
  const scoped = entries.filter((entry) => matchesBase(entry) && matchesException(entry));
  const filtered = scoped.filter((entry) => tab === 'all' || entry.visitor.status === tab);

  const sorted = useMemo(() => {
    const dir = sort.desc ? -1 : 1;
    const arrival = (e: Entry) => `${e.visitor.date} ${String(e.arrivedAt ?? 0).padStart(4, '0')}`;
    return [...filtered].sort((a, b) => {
      switch (sort.key) {
        case 'visitor':
          return dir * a.visitor.officerName.localeCompare(b.visitor.officerName);
        case 'laboratory':
          return dir * departmentLabel(a.visitor.laboratory).localeCompare(departmentLabel(b.visitor.laboratory));
        case 'onSite':
          return dir * ((a.minutes ?? -1) - (b.minutes ?? -1));
        case 'status':
          return dir * (STATUS_ORDER.indexOf(a.visitor.status) - STATUS_ORDER.indexOf(b.visitor.status));
        default:
          return dir * arrival(a).localeCompare(arrival(b));
      }
    });
  }, [filtered, sort]);

  const pageCount = Math.max(1, Math.ceil(sorted.length / PAGE_SIZE));
  const currentPage = Math.min(page, pageCount - 1);
  const pageRows = sorted.slice(currentPage * PAGE_SIZE, (currentPage + 1) * PAGE_SIZE);
  // Any filter change goes back to the first page.
  useEffect(() => setPage(0), [tab, exception, datePreset, dateFrom, dateTo, timePreset, timeFrom, timeTo, lab, visitorType, query, sort]);

  const open = entries.find((entry) => entry.visitor.id === openId) ?? null;

  /* ---------------------------- Filter summary --------------------------- */

  const chips: { id: string; label: string; clear: () => void }[] = [
    exception !== 'none' && {
      id: 'exception',
      label: exception === 'long-wait' ? `Waiting over ${WAIT_LIMIT_MINUTES} min` : exception === 'overnight' ? 'Not signed out' : 'Laboratory not notified',
      clear: () => setException('none'),
    },
    datePreset !== 'all' &&
      exception !== 'overnight' && {
        id: 'date',
        label:
          datePreset === 'custom'
            ? `Dates: ${dateFrom ? formatDay(dateFrom, 'short') : 'start'} – ${dateTo ? formatDay(dateTo, 'short') : 'today'}`
            : `Date: ${DATE_LABEL[datePreset]}`,
        clear: () => setDatePreset('all'),
      },
    timePreset !== 'any' && {
      id: 'time',
      label: timePreset === 'custom' ? `Arrived ${timeFrom || '00:00'}–${timeTo || '23:59'}` : TIME_LABEL[timePreset],
      clear: () => setTimePreset('any'),
    },
    lab !== 'all' && { id: 'lab', label: departmentLabel(lab), clear: () => setLab('all') },
    visitorType !== 'all' && { id: 'type', label: VISITOR_TYPE_LABEL[visitorType], clear: () => setVisitorType('all') },
    !!q && { id: 'query', label: `“${query.trim()}”`, clear: () => setQuery('') },
  ].filter(Boolean) as { id: string; label: string; clear: () => void }[];

  const clearAll = () => {
    setTab('all');
    setException('none');
    setDatePreset('all');
    setTimePreset('any');
    setLab('all');
    setVisitorType('all');
    setQuery('');
  };

  const scopeText = [tab === 'all' ? 'All statuses' : STATUS_TAB_LABEL[tab], ...chips.map((chip) => chip.label)].join(' · ');

  const exportCsv = () => {
    const header = ['Visit no.', 'Date', 'Time in', 'Time out', 'Minutes on site', 'Name', 'Visitor type', 'Station / organisation', 'Phone', 'Laboratory', 'Purpose', 'Status', 'Registered by'];
    const lines = sorted.map(({ visitor: v, minutes }) =>
      [v.visitNumber, v.date, v.timeIn, v.timeOut ?? '', minutes ?? '', v.officerName, VISITOR_TYPE_LABEL[v.visitorType], v.station, v.phone, departmentLabel(v.laboratory), v.purposeOfVisit, STATUS_TAB_LABEL[v.status], v.receptionistName]
        .map(csvCell)
        .join(','),
    );
    const blob = new Blob([[header.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `visitor-register-${today}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const onPremises = entries.filter((e) => e.visitor.status !== 'Departed').length;
  const exceptions = [
    { id: 'long-wait' as const, label: `Waiting over ${WAIT_LIMIT_MINUTES} min`, icon: AlarmClock, count: entries.filter((e) => matchesBase(e) && e.longWait).length },
    { id: 'not-notified' as const, label: 'Lab not notified', icon: Clock, count: entries.filter((e) => matchesBase(e) && e.notNotified).length },
    { id: 'overnight' as const, label: 'Not signed out', icon: DoorOpen, count: entries.filter((e) => e.overnight).length },
  ];

  /* -------------------------------- Render -------------------------------- */

  const sortHeader = (id: SortKey, children: React.ReactNode) => {
    const active = sort.key === id;
    const Icon = !active ? ArrowUpDown : sort.desc ? ArrowDown : ArrowUp;
    return (
      <th scope="col" aria-sort={active ? (sort.desc ? 'descending' : 'ascending') : 'none'} className="px-3 py-2.5">
        <button
          type="button"
          onClick={() => setSort((s) => ({ key: id, desc: s.key === id ? !s.desc : id === 'arrived' || id === 'onSite' }))}
          className={`inline-flex cursor-pointer items-center gap-1 text-[11px] font-semibold uppercase tracking-wide ${
            active ? 'text-slate-900 dark:text-white' : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          {children}
          <Icon className={`h-3 w-3 ${active ? '' : 'opacity-50'}`} aria-hidden="true" />
        </button>
      </th>
    );
  };

  const groupByDay = sort.key === 'arrived';
  const columnCount = 9;

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Operations', 'Visitor Register']}
        title="Visitor Register"
        description="The front office's record of every client: arrival, handover to the laboratory, and check-out."
        meta={
          <StatusPill tone="emerald" pulse>
            {onPremises} on premises
          </StatusPill>
        }
        actions={
          <>
            <Button icon={Download} onClick={exportCsv} disabled={sorted.length === 0} title="Download the entries shown as a spreadsheet (CSV)">
              Export
            </Button>
            <Button icon={Printer} onClick={() => printOfficialDocument('landscape')} title="Print the register as shown, on A4 with the official letterhead">
              Print register
            </Button>
          </>
        }
      />

      <section aria-label="Visitor register" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        {/* Status tabs + exception shortcuts */}
        <div className="flex flex-wrap items-end justify-between gap-x-6 gap-y-2 border-b border-slate-200 px-4 dark:border-slate-800">
          <div role="tablist" aria-label="Visit status" className="no-scrollbar -mb-px flex max-w-full gap-1 overflow-x-auto">
            {(['all', ...STATUS_ORDER] as StatusTab[]).map((id) => {
              const selected = tab === id;
              const count = id === 'all' ? scoped.length : scoped.filter((e) => e.visitor.status === id).length;
              const tone: Tone = id === 'all' ? 'slate' : VISITOR_STATUS[id].tone;
              return (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  onClick={() => setTab(id)}
                  className={`flex cursor-pointer items-center gap-2 whitespace-nowrap border-b-2 px-3 py-3 text-[13px] transition-colors ${
                    selected
                      ? 'border-amber-500 font-semibold text-slate-900 dark:text-white'
                      : 'border-transparent text-slate-600 hover:border-slate-300 hover:text-slate-900 dark:text-slate-300 dark:hover:border-slate-600 dark:hover:text-white'
                  }`}
                >
                  {id !== 'all' && <span className={`h-2 w-2 rounded-full ${TONE[tone].dot}`} aria-hidden="true" />}
                  {id === 'all' ? 'All visits' : STATUS_TAB_LABEL[id]}
                  <span
                    className={`rounded-full px-1.5 text-[11px] tabular-nums ${
                      selected ? 'bg-amber-100 text-amber-900 dark:bg-amber-400/15 dark:text-amber-200' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                    }`}
                  >
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
          <div className="flex flex-wrap items-center gap-1.5 pb-2.5">
            {exceptions.map(({ id, label, icon: Icon, count }) => {
              const selected = exception === id;
              return (
                <button
                  key={id}
                  type="button"
                  aria-pressed={selected}
                  disabled={count === 0 && !selected}
                  onClick={() => setException(selected ? 'none' : id)}
                  className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset transition-colors disabled:cursor-default disabled:opacity-50 ${
                    selected
                      ? 'bg-rose-600 text-white ring-rose-600'
                      : count > 0
                        ? 'bg-rose-50 text-rose-800 ring-rose-200 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/30'
                        : 'bg-slate-50 text-slate-500 ring-slate-200 dark:bg-slate-900 dark:text-slate-400 dark:ring-slate-700'
                  }`}
                >
                  <Icon className="h-3 w-3" aria-hidden="true" />
                  {label}
                  <span className="tabular-nums">{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters */}
        <div className="space-y-2.5 border-b border-slate-200 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/30">
          <div className="flex flex-wrap items-end gap-2.5">
            <SearchInput value={query} onChange={setQuery} placeholder="Search name, visit no., phone, vehicle…" className="w-full sm:w-72" />
            <FilterField label="Date">
              <Select<DatePreset> size="xs" aria-label="Date" value={datePreset} onChange={setDatePreset} options={(Object.keys(DATE_LABEL) as DatePreset[]).map((value) => ({ value, label: DATE_LABEL[value] }))} />
            </FilterField>
            {datePreset === 'custom' && (
              <>
                <FilterField label="From">
                  <input type="date" value={dateFrom} max={dateTo || undefined} onChange={(e) => setDateFrom(e.target.value)} className={timeInput} />
                </FilterField>
                <FilterField label="To">
                  <input type="date" value={dateTo} min={dateFrom || undefined} onChange={(e) => setDateTo(e.target.value)} className={timeInput} />
                </FilterField>
              </>
            )}
            <FilterField label="Arrival time">
              <Select<TimePreset> size="xs" aria-label="Arrival time" value={timePreset} onChange={setTimePreset} options={(Object.keys(TIME_LABEL) as TimePreset[]).map((value) => ({ value, label: TIME_LABEL[value] }))} />
            </FilterField>
            {timePreset === 'custom' && (
              <>
                <FilterField label="After">
                  <input type="time" value={timeFrom} onChange={(e) => setTimeFrom(e.target.value)} className={timeInput} />
                </FilterField>
                <FilterField label="Before">
                  <input type="time" value={timeTo} onChange={(e) => setTimeTo(e.target.value)} className={timeInput} />
                </FilterField>
              </>
            )}
            {laboratories.length > 1 && (
              <FilterField label="Laboratory">
                <Select<'all' | LaboratoryDepartment>
                  size="xs"
                  aria-label="Laboratory"
                  value={lab}
                  onChange={setLab}
                  options={[{ value: 'all' as const, label: 'All laboratories' }, ...laboratories.map((value) => ({ value, label: departmentLabel(value) }))]}
                />
              </FilterField>
            )}
            <FilterField label="Visitor type">
              <Select<'all' | VisitorType>
                size="xs"
                aria-label="Visitor type"
                value={visitorType}
                onChange={setVisitorType}
                options={[{ value: 'all' as const, label: 'All visitors' }, ...(Object.keys(VISITOR_TYPE_LABEL) as VisitorType[]).map((value) => ({ value, label: VISITOR_TYPE_LABEL[value] }))]}
              />
            </FilterField>
          </div>

          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Filtered by</span>
              {chips.map((chip) => (
                <span key={chip.id} className="inline-flex items-center gap-1 rounded-full bg-white py-0.5 pl-2.5 pr-1 text-[11px] font-medium text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">
                  {chip.label}
                  <button type="button" onClick={chip.clear} aria-label={`Remove filter: ${chip.label}`} className="cursor-pointer rounded-full p-0.5 hover:bg-slate-100 dark:hover:bg-slate-800">
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
              <button type="button" onClick={clearAll} className="ml-1 cursor-pointer text-[11px] font-medium text-amber-800 hover:underline dark:text-amber-300">
                Clear all
              </button>
            </div>
          )}
        </div>

        {/* Register */}
        {isLoading && entries.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-12 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading the register…
          </div>
        ) : sorted.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No visits match"
            description={entries.length === 0 ? 'No visitors have been registered yet.' : `Nothing on the register for: ${scopeText}.`}
            action={chips.length > 0 || tab !== 'all' ? <Button size="sm" onClick={clearAll}>Clear filters</Button> : undefined}
          />
        ) : (
          <>
            <div className="hidden max-h-[calc(100dvh-20rem)] min-h-[20rem] overflow-auto md:block">
              <table className="w-full min-w-[1000px] border-separate border-spacing-0 text-left text-[13px]">
                <caption className="sr-only">Visitor register</caption>
                <thead className="sticky top-0 z-10 bg-white dark:bg-slate-900">
                  <tr className="[&>th]:border-b [&>th]:border-slate-200 dark:[&>th]:border-slate-800">
                    <th scope="col" className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Visit no.</th>
                    {sortHeader('visitor', 'Visitor')}
                    {sortHeader('laboratory', 'Laboratory')}
                    <th scope="col" className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Purpose</th>
                    {sortHeader('arrived', 'Time in')}
                    <th scope="col" className="px-3 py-2.5 text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Time out</th>
                    {sortHeader('onSite', 'On site')}
                    {sortHeader('status', 'Status')}
                    <th scope="col" className="px-3 py-2.5 text-right text-[11px] font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {pageRows.map((entry, index) => {
                    const { visitor: v, minutes, longWait, overnight } = entry;
                    const s = VISITOR_STATUS[v.status];
                    const next = nextStepFor(v, actions);
                    const newDay = groupByDay && (index === 0 || pageRows[index - 1].visitor.date !== v.date);
                    const dayCount = sorted.filter((e) => e.visitor.date === v.date).length;
                    const flagged = longWait || overnight;
                    return (
                      <React.Fragment key={v.id}>
                        {newDay && (
                          <tr>
                            <th colSpan={columnCount} scope="rowgroup" className="border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-left text-[11px] font-semibold text-slate-700 dark:border-slate-800 dark:bg-slate-950/60 dark:text-slate-200">
                              {v.date === today ? 'Today · ' : v.date === yesterday ? 'Yesterday · ' : ''}
                              {formatDay(v.date)}
                              <span className="ml-2 font-normal text-slate-500 dark:text-slate-400">{dayCount} visit{dayCount === 1 ? '' : 's'}</span>
                            </th>
                          </tr>
                        )}
                        <tr
                          onClick={() => setOpenId(v.id)}
                          className={`group cursor-pointer transition-colors [&>td]:border-b [&>td]:border-slate-100 dark:[&>td]:border-slate-800 ${
                            openId === v.id ? 'bg-amber-50 dark:bg-amber-400/10' : flagged ? 'bg-rose-50/50 hover:bg-rose-50 dark:bg-rose-500/5 dark:hover:bg-rose-500/10' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                          }`}
                        >
                          <td className={`px-3 py-2.5 align-middle ${flagged ? 'shadow-[inset_3px_0_0_var(--color-rose-500)]' : ''}`}>
                            <span className="font-mono text-[12px] font-medium text-slate-700 dark:text-slate-300">{v.visitNumber}</span>
                          </td>
                          <td className="px-3 py-2.5 align-middle">
                            <div className="flex items-center gap-2.5">
                              <Avatar name={v.officerName} size="sm" tone={s.tone} />
                              <div className="min-w-0">
                                <div className="flex items-center gap-1.5">
                                  <span className="max-w-[180px] truncate font-medium text-slate-900 dark:text-white">{v.officerName}</span>
                                  {v.visitorType === 'POLICE_OFFICER' && <Shield className="h-3 w-3 shrink-0 text-sky-700 dark:text-sky-300" aria-label="Police officer" />}
                                </div>
                                <div className="max-w-[200px] truncate text-[11px] text-slate-500 dark:text-slate-400">{v.station || 'No station recorded'}</div>
                              </div>
                            </div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 align-middle text-slate-700 dark:text-slate-200">{departmentLabel(v.laboratory)}</td>
                          <td className="px-3 py-2.5 align-middle">
                            <div className="max-w-[200px] truncate text-slate-600 dark:text-slate-300" title={v.purposeOfVisit}>{v.purposeOfVisit || '—'}</div>
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 align-middle tabular-nums text-slate-900 dark:text-white">
                            {v.timeIn}
                            {!groupByDay && <div className="text-[11px] text-slate-500 dark:text-slate-400">{formatDay(v.date, 'short')}</div>}
                          </td>
                          <td className="whitespace-nowrap px-3 py-2.5 align-middle tabular-nums text-slate-600 dark:text-slate-300">{v.timeOut || '—'}</td>
                          <td className="whitespace-nowrap px-3 py-2.5 align-middle tabular-nums">
                            {overnight ? (
                              <span className="inline-flex items-center gap-1 text-[12px] font-medium text-rose-700 dark:text-rose-300">
                                <DoorOpen className="h-3 w-3" /> Since {formatDay(v.date, 'short')}
                              </span>
                            ) : minutes !== null ? (
                              <span className={longWait ? 'inline-flex items-center gap-1 font-semibold text-rose-700 dark:text-rose-300' : 'text-slate-700 dark:text-slate-200'}>
                                {longWait && <AlarmClock className="h-3 w-3" />}
                                {formatDuration(minutes)}
                              </span>
                            ) : (
                              <span className="text-slate-400">—</span>
                            )}
                          </td>
                          <td className="px-3 py-2.5 align-middle">
                            <StatusPill tone={s.tone}>{STATUS_TAB_LABEL[v.status]}</StatusPill>
                          </td>
                          <td className="px-3 py-2.5 text-right align-middle">
                            <div className="flex items-center justify-end gap-1.5">
                              {'label' in next && (
                                <Button
                                  size="xs"
                                  variant="primary"
                                  icon={next.icon}
                                  title={next.label}
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    next.run();
                                  }}
                                >
                                  {next.short}
                                </Button>
                              )}
                              <Button
                                size="xs"
                                variant="ghost"
                                aria-label={`Open register entry for ${v.officerName}`}
                                onClick={(event) => {
                                  event.stopPropagation();
                                  setOpenId(v.id);
                                }}
                              >
                                View
                                <ChevronRight className="h-3 w-3" />
                              </Button>
                            </div>
                          </td>
                        </tr>
                      </React.Fragment>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile: one card per visit */}
            <ul className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
              {pageRows.map(({ visitor: v, minutes, longWait, overnight }) => {
                const s = VISITOR_STATUS[v.status];
                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => setOpenId(v.id)}
                      className={`flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left ${longWait || overnight ? 'bg-rose-50/50 dark:bg-rose-500/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'}`}
                    >
                      <Avatar name={v.officerName} size="sm" tone={s.tone} />
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex items-start justify-between gap-2">
                          <span className="truncate text-[13px] font-medium text-slate-900 dark:text-white">{v.officerName}</span>
                          <StatusPill tone={s.tone}>{STATUS_TAB_LABEL[v.status]}</StatusPill>
                        </div>
                        <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {departmentLabel(v.laboratory)} · {v.station || 'No station'}
                        </div>
                        <div className={`text-[11px] tabular-nums ${longWait || overnight ? 'font-medium text-rose-700 dark:text-rose-300' : 'text-slate-500 dark:text-slate-400'}`}>
                          {formatDay(v.date, 'short')} · in {v.timeIn}
                          {v.timeOut ? ` · out ${v.timeOut}` : ''}
                          {minutes !== null && ` · ${formatDuration(minutes)}`}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>

            {/* Footer: count, paging, older records */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-4 py-2.5 text-[12px] text-slate-600 dark:border-slate-800 dark:text-slate-300">
              <span className="tabular-nums">
                Showing {currentPage * PAGE_SIZE + 1}–{Math.min((currentPage + 1) * PAGE_SIZE, sorted.length)} of {sorted.length} visit{sorted.length === 1 ? '' : 's'}
              </span>
              <div className="flex items-center gap-2">
                {hasMoreVisitors && (
                  <Button size="xs" variant="ghost" disabled={isLoadingMoreVisitors} onClick={() => void onLoadMoreVisitors()}>
                    {isLoadingMoreVisitors ? 'Loading older records…' : 'Load older records'}
                  </Button>
                )}
                {pageCount > 1 && (
                  <nav aria-label="Pages" className="flex items-center gap-1">
                    <Button size="xs" icon={ChevronLeft} disabled={currentPage === 0} onClick={() => setPage(currentPage - 1)} aria-label="Previous page" />
                    <span className="px-1 tabular-nums">Page {currentPage + 1} of {pageCount}</span>
                    <Button size="xs" icon={ChevronRight} disabled={currentPage >= pageCount - 1} onClick={() => setPage(currentPage + 1)} aria-label="Next page" />
                  </nav>
                )}
              </div>
            </div>
          </>
        )}
      </section>

      {/* The entry, as a stack of drawers */}
      <VisitorDrawer {...actions} entry={open} allEntries={entries} onClose={() => setOpenId(null)} currentUserName={currentUserName} />

      {/* Hidden on screen; the only thing printed by "Print register" */}
      <OfficialPrintDocument
        office="Reception & Client Services"
        title="Visitor register"
        scope={scopeText}
        entries={sorted.length}
        signOff={['Receptionist on duty', 'Verified by (Officer in charge)']}
        notes={STATUS_ORDER.map((status) => (
          <span key={status}>
            <strong>{STATUS_TAB_LABEL[status]}:</strong> {sorted.filter((e) => e.visitor.status === status).length}
          </span>
        ))}
      >
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-200">
              {['S/No.', 'Visit no.', 'Date', 'Name', 'ID no.', 'Station / organisation', 'Laboratory', 'Purpose of visit', 'Time in', 'Time out', 'Duration', 'Registered by', 'Signed'].map((heading) => (
                <th key={heading} className={`${printCell} text-left font-semibold`}>{heading}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ visitor: v, minutes }, i) => (
              <tr key={v.id} className="break-inside-avoid">
                <td className={`${printCell} text-center`}>{i + 1}</td>
                <td className={`${printCell} font-mono`}>{v.visitNumber}</td>
                <td className={`${printCell} whitespace-nowrap`}>{v.date}</td>
                <td className={printCell}>{v.officerName}{v.badgeNumber ? <div className="text-[8.5px] text-slate-600">Badge {v.badgeNumber}</div> : null}</td>
                <td className={`${printCell} font-mono`}>{v.nationalId || '—'}</td>
                <td className={printCell}>{v.station || '—'}</td>
                <td className={printCell}>{departmentLabel(v.laboratory)}</td>
                <td className={printCell}>{v.purposeOfVisit || '—'}</td>
                <td className={`${printCell} whitespace-nowrap`}>{v.timeIn}</td>
                <td className={`${printCell} whitespace-nowrap`}>{v.timeOut || (v.status === 'Departed' ? '—' : 'On site')}</td>
                <td className={`${printCell} whitespace-nowrap`}>{v.status === 'Departed' && minutes !== null ? formatDuration(minutes) : '—'}</td>
                <td className={printCell}>{v.receptionistName || '—'}</td>
                <td className={`${printCell} text-center`}>{v.signatureCaptured ? 'Yes' : 'No'}</td>
              </tr>
            ))}
            {sorted.length === 0 && (
              <tr>
                <td className={`${printCell} py-4 text-center`} colSpan={13}>No visitors for this scope.</td>
              </tr>
            )}
          </tbody>
        </table>
      </OfficialPrintDocument>
    </DashboardPage>
  );
};

const FilterField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <label className="flex min-w-[9rem] flex-col gap-1">
    <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{label}</span>
    {children}
  </label>
);
