import React, { useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownWideNarrow, ArrowUpNarrowWide, ChevronRight, Download, FolderOpen, Inbox, Loader2, Printer, X } from 'lucide-react';
import {
  Button,
  DashboardHeader,
  DashboardPage,
  EmptyState,
  Panel,
  SearchInput,
  StatusPill,
  tableClasses as tc,
} from '../../common/Dashboard';
import { RegisterSummary, SummaryFilter } from './RegisterSummary';
import { RegisterPrint, printRegister } from './RegisterPrint';
import {
  AgedRow,
  PERIOD_LABEL,
  Period,
  RegisterColumns,
  RegisterRow,
  RegisterStatus,
  TURNAROUND_DAYS,
  daysSince,
  formatDate,
  initialsOf,
  periodBounds,
} from './types';

/* ---------------------------------------------------------------------------
 * CaseRegister — a laboratory's official case register: summary of where the
 * files stand, filters (status, officer, date received, search), the numbered
 * register itself, CSV export and an A4 printable copy. Laboratory-agnostic:
 * each lab passes its statuses, column names and rows.
 * --------------------------------------------------------------------------- */

const UNASSIGNED = '__unassigned__';

interface CaseRegisterProps<S extends string> {
  /** Laboratory name, e.g. "Water & Environment". */
  laboratory: string;
  unit: 'exhibit' | 'sample';
  /** Optional control in the page header (e.g. a laboratory switch). */
  headerActions?: React.ReactNode;
  statuses: RegisterStatus<S>[];
  rows: RegisterRow<S>[];
  isLoading?: boolean;
  error?: string;
  columns: RegisterColumns;
  searchPlaceholder: string;
}

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const selectClass =
  'h-8 rounded-lg border border-slate-200 bg-white pl-2.5 pr-7 text-xs text-slate-900 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

export function CaseRegister<S extends string>({
  laboratory,
  unit,
  headerActions,
  statuses,
  rows,
  isLoading = false,
  error = '',
  columns,
  searchPlaceholder,
}: CaseRegisterProps<S>) {
  const [status, setStatus] = useState<SummaryFilter<S>>('all');
  const [officer, setOfficer] = useState('');
  const [period, setPeriod] = useState<Period>('any');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');
  const [query, setQuery] = useState('');
  const [newestFirst, setNewestFirst] = useState(true);

  const isClosed = (value: S) => !!statuses.find((s) => s.value === value)?.closed;

  // Age and turnaround flag for every file, worked out once.
  const aged = useMemo<AgedRow<S>[]>(
    () =>
      rows.map((row) => {
        const age = daysSince(row.received);
        return { ...row, age, overdue: !isClosed(row.status) && age !== null && age > TURNAROUND_DAYS };
      }),
    // isClosed only reads `statuses`.
    [rows, statuses],
  );

  const officers = useMemo(
    () => [...new Set(rows.map((row) => row.officer).filter((name): name is string => !!name))].sort((a, b) => a.localeCompare(b)),
    [rows],
  );

  const [from, to] = periodBounds(period, customFrom, customTo);
  const [monthFrom] = periodBounds('month', '', '');

  // Officer, period and search narrow everything (summary included); status narrows the list only.
  const scoped = useMemo(() => {
    const q = query.trim().toLowerCase();
    return aged.filter(
      (row) =>
        (!officer || (officer === UNASSIGNED ? !row.officer : row.officer === officer)) &&
        (!from || row.received >= from) &&
        (!to || row.received <= to) &&
        (!q ||
          [row.reference, row.secondaryRef, row.party, row.officer, row.subject, row.subjectSub].some((field) =>
            (field ?? '').toLowerCase().includes(q),
          )),
    );
  }, [aged, officer, from, to, query]);

  const visible = useMemo(
    () =>
      scoped
        .filter((row) =>
          status === 'all'
            ? true
            : status === 'overdue'
              ? row.overdue
              : status === 'unassigned'
                ? !row.officer && !isClosed(row.status)
                : row.status === status,
        )
        .sort((a, b) => (newestFirst ? b.received.localeCompare(a.received) : a.received.localeCompare(b.received))),
    // isClosed only reads `statuses`.
    [scoped, status, newestFirst, statuses],
  );

  const statusLabel =
    status === 'all' ? 'All statuses' : status === 'overdue' ? `Over ${TURNAROUND_DAYS} days` : status === 'unassigned' ? 'No officer allocated' : status;
  const officerLabel = !officer ? 'All officers' : officer === UNASSIGNED ? 'Not assigned' : officer;
  const periodLabel =
    period === 'custom'
      ? `${customFrom ? formatDate(customFrom) : 'the start'} to ${customTo ? formatDate(customTo) : 'today'}`
      : PERIOD_LABEL[period];
  const scope = [`Status: ${statusLabel}`, `Officer: ${officerLabel}`, `Received: ${periodLabel}`, query.trim() && `Search: “${query.trim()}”`]
    .filter(Boolean)
    .join(' · ');

  const activeFilters = [status !== 'all', !!officer, period !== 'any', !!query.trim()].filter(Boolean).length;
  const clearFilters = () => {
    setStatus('all');
    setOfficer('');
    setPeriod('any');
    setCustomFrom('');
    setCustomTo('');
    setQuery('');
  };

  const exportCsv = () => {
    const header = ['S/No.', columns.reference, 'Exhibit no.', 'Date received', 'Days in laboratory', columns.party, columns.subject, columns.officer, 'Status'];
    const lines = visible.map((row, i) =>
      [i + 1, row.reference, row.secondaryRef, row.received, row.age ?? '', row.party, row.subject, row.officer ?? 'Not assigned', row.status]
        .map(csvCell)
        .join(','),
    );
    const blob = new Blob([[header.map(csvCell).join(','), ...lines].join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${laboratory.replace(/[^A-Za-z]+/g, '-')}-case-register-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const plural = (n: number) => `${n} ${unit}${n === 1 ? '' : 's'}`;

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Case Registry', laboratory]}
        title={`${laboratory} case register`}
        meta={<StatusPill tone="slate" dot={false}>{plural(rows.length)}</StatusPill>}
        description={`The official register of every ${unit} received by the ${laboratory} laboratory. Select a file to open its full record, process history and findings.`}
        actions={
          <>
            {headerActions}
            <Button icon={Printer} onClick={printRegister} title="Print the register as shown, on A4 with the official letterhead">
              Print register
            </Button>
          </>
        }
      />

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      )}

      <RegisterSummary<S>
        unit={unit}
        statuses={statuses}
        rows={scoped}
        receivedThisMonth={aged.filter((row) => row.received >= monthFrom).length}
        active={status}
        onSelect={setStatus}
        thisMonthActive={period === 'month' && status === 'all'}
        onShowThisMonth={() => {
          setPeriod('month');
          setStatus('all');
        }}
      />

      <Panel
        icon={FolderOpen}
        tone="sky"
        title={statusLabel === 'All statuses' ? 'Register entries' : statusLabel}
        description={`Showing ${visible.length} of ${plural(rows.length)}`}
        flush
        actions={
          <>
            <SearchInput value={query} onChange={setQuery} placeholder={searchPlaceholder} />
            <Button
              size="sm"
              icon={newestFirst ? ArrowDownWideNarrow : ArrowUpNarrowWide}
              onClick={() => setNewestFirst((v) => !v)}
              aria-label={`Sort by date received, ${newestFirst ? 'newest' : 'oldest'} first`}
            >
              {newestFirst ? 'Newest first' : 'Oldest first'}
            </Button>
            <Button size="sm" icon={Download} onClick={exportCsv} disabled={visible.length === 0} title="Download the entries shown as a spreadsheet (CSV)">
              Export
            </Button>
          </>
        }
      >
        {/* Filters */}
        <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/30">
          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{columns.officer}</span>
            <select value={officer} onChange={(e) => setOfficer(e.target.value)} className={selectClass}>
              <option value="">All officers</option>
              {officers.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
              <option value={UNASSIGNED}>Not assigned</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">Date received</span>
            <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className={selectClass}>
              {(Object.keys(PERIOD_LABEL) as Period[]).map((key) => (
                <option key={key} value={key}>{PERIOD_LABEL[key]}</option>
              ))}
            </select>
          </label>

          {period === 'custom' && (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">From</span>
                <input type="date" value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} className={`${selectClass} pr-2.5`} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11px] font-medium text-slate-600 dark:text-slate-300">To</span>
                <input type="date" value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)} className={`${selectClass} pr-2.5`} />
              </label>
            </>
          )}

          {activeFilters > 0 && (
            <Button size="sm" variant="ghost" icon={X} onClick={clearFilters} className="ml-auto">
              Clear {activeFilters} filter{activeFilters === 1 ? '' : 's'}
            </Button>
          )}
        </div>

        {isLoading && rows.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading the register…
          </div>
        ) : visible.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No case files to show"
            description={rows.length === 0 ? `No ${unit}s have been registered yet.` : `Nothing on the register matches: ${scope}.`}
            action={activeFilters > 0 && rows.length > 0 ? <Button size="sm" onClick={clearFilters}>Show all files</Button> : undefined}
          />
        ) : (
          <>
            {/* Desktop: the register as a table */}
            <div className="hidden overflow-x-auto md:block">
              <table className={`${tc.table} min-w-[900px]`}>
                <caption className="sr-only">{laboratory} case register</caption>
                <thead className={tc.thead}>
                  <tr>
                    <th scope="col" className={`${tc.th} w-12`}>S/No.</th>
                    <th scope="col" className={tc.th}>{columns.reference}</th>
                    <th scope="col" className={tc.th}>Received</th>
                    <th scope="col" className={tc.th}>{columns.party}</th>
                    <th scope="col" className={tc.th}>{columns.subject}</th>
                    <th scope="col" className={tc.th}>{columns.officer}</th>
                    <th scope="col" className={tc.th}>Status</th>
                    <th scope="col" className={`${tc.th} text-right`}><span className="sr-only">Open</span></th>
                  </tr>
                </thead>
                <tbody className={tc.tbody}>
                  {visible.map((row, i) => (
                    <tr
                      key={row.key}
                      onClick={row.onOpen}
                      className={`${tc.tr} cursor-pointer ${row.overdue ? 'bg-rose-50/40 dark:bg-rose-500/5' : ''}`}
                    >
                      <td className={`${tc.td} tabular-nums text-slate-500 dark:text-slate-400`}>{i + 1}</td>
                      <td className={tc.td}>
                        <div className="font-mono text-[13px] font-semibold text-slate-900 dark:text-white">{row.reference}</div>
                        {row.secondaryRef && <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{row.secondaryRef}</div>}
                      </td>
                      <td className={`${tc.td} whitespace-nowrap`}>
                        <div className="text-slate-900 dark:text-white">{formatDate(row.received)}</div>
                        <AgeNote age={row.age} overdue={row.overdue} />
                      </td>
                      <td className={tc.td}>
                        <div className="max-w-[220px] truncate font-medium text-slate-900 dark:text-white" title={row.party}>{row.party}</div>
                        {row.partySub && <div className="text-[11px] text-slate-500 dark:text-slate-400">{row.partySub}</div>}
                      </td>
                      <td className={tc.td}>
                        <div className="max-w-[220px] truncate" title={row.subject}>{row.subject}</div>
                        {row.subjectSub && <div className="max-w-[220px] truncate text-[11px] text-slate-500 dark:text-slate-400">{row.subjectSub}</div>}
                      </td>
                      <td className={tc.td}><Officer name={row.officer} /></td>
                      <td className={tc.td}>
                        <StatusPill tone={statuses.find((s) => s.value === row.status)?.tone ?? 'slate'}>{row.status}</StatusPill>
                      </td>
                      <td className={`${tc.td} text-right`}>
                        <Button
                          size="xs"
                          icon={FolderOpen}
                          aria-label={`Open case file ${row.reference}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            row.onOpen();
                          }}
                        >
                          Open file
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: one card per file */}
            <ul className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
              {visible.map((row) => (
                <li key={row.key}>
                  <button
                    type="button"
                    onClick={row.onOpen}
                    className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left hover:bg-slate-50 dark:hover:bg-slate-800/40"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="truncate font-mono text-[13px] font-semibold text-slate-900 dark:text-white">{row.reference}</span>
                        <StatusPill tone={statuses.find((s) => s.value === row.status)?.tone ?? 'slate'}>{row.status}</StatusPill>
                      </div>
                      <div className="truncate text-[13px] text-slate-700 dark:text-slate-200">{row.party}</div>
                      <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {row.subject} · {row.officer ?? 'Not assigned'}
                      </div>
                      <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
                        Received {formatDate(row.received)}
                        <AgeNote age={row.age} overdue={row.overdue} inline />
                      </div>
                    </div>
                    <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                  </button>
                </li>
              ))}
            </ul>
          </>
        )}
      </Panel>

      {/* Hidden on screen; the only thing printed by "Print register" */}
      <RegisterPrint laboratory={laboratory} columns={columns} statuses={statuses} rows={visible} scope={scope} />
    </DashboardPage>
  );
}

const AgeNote: React.FC<{ age: number | null; overdue: boolean; inline?: boolean }> = ({ age, overdue, inline }) => {
  if (age === null) return null;
  const text = age === 0 ? 'Today' : `${age} day${age === 1 ? '' : 's'} in lab`;
  return overdue ? (
    <span className={`${inline ? 'inline-flex' : 'mt-0.5 flex'} items-center gap-1 text-[11px] font-medium text-rose-700 dark:text-rose-300`}>
      <AlertTriangle className="h-3 w-3" aria-hidden="true" /> {text}
    </span>
  ) : (
    <span className={`${inline ? '' : 'block'} text-[11px] text-slate-500 dark:text-slate-400`}>{text}</span>
  );
};

const Officer: React.FC<{ name?: string | null }> = ({ name }) =>
  name ? (
    <span className="flex items-center gap-2">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[10px] font-semibold text-slate-700 dark:bg-slate-800 dark:text-slate-200">
        {initialsOf(name)}
      </span>
      <span className="truncate text-slate-900 dark:text-white">{name}</span>
    </span>
  ) : (
    <StatusPill tone="amber" dot={false}>Not assigned</StatusPill>
  );
