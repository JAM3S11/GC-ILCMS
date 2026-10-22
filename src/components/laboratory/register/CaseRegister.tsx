import React, { useEffect, useMemo, useState } from 'react';
import { AlertTriangle, ArrowDownWideNarrow, ArrowLeft, ArrowUpNarrowWide, ChevronRight, Download, FolderOpen, Inbox, Loader2, Printer, X } from 'lucide-react';
import { tableClasses as tc } from '../../common/Dashboard';
import { OutlineButton, OutlineSearch, StatusText } from '../workspace/ui';
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
 * CaseRegister — a laboratory's official case register, in the same design
 * language as the case file: a plain header, the department tabs, the
 * department's process as one strip, filters, and the numbered register with
 * CSV export and an A4 printable copy. Laboratory-agnostic: each department
 * passes its stages, column names and rows (see caseFileDepartments.ts).
 * --------------------------------------------------------------------------- */

const UNASSIGNED = '__unassigned__';

export interface CaseRegisterTab {
  id: string;
  label: string;
  open: number;
  overdue: number;
}

interface CaseRegisterProps<S extends string> {
  /** Laboratory name, e.g. "Water & Environment". */
  laboratory: string;
  unit: 'exhibit' | 'sample';
  statuses: RegisterStatus<S>[];
  rows: RegisterRow<S>[];
  isLoading?: boolean;
  error?: string;
  columns: RegisterColumns;
  searchPlaceholder: string;
  /** The departments with case files, shown as tabs above the register. */
  tabs?: CaseRegisterTab[];
  activeTab?: string;
  onTabChange?: (id: string) => void;
  /** Back to the case registry overview (Esc). */
  onBack?: () => void;
}

const csvCell = (value: unknown) => `"${String(value ?? '').replace(/"/g, '""')}"`;

const selectClass =
  'h-9 rounded-lg border border-slate-300 bg-transparent pl-2.5 pr-7 text-[13px] text-slate-900 hover:border-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:text-white dark:[color-scheme:dark] dark:hover:border-slate-500';

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

export function CaseRegister<S extends string>({
  laboratory,
  unit,
  statuses,
  rows,
  isLoading = false,
  error = '',
  columns,
  searchPlaceholder,
  tabs = [],
  activeTab,
  onTabChange,
  onBack,
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

  // Esc goes back to the overview, as in the case file.
  useEffect(() => {
    if (!onBack) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented || isTyping(event.target)) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [aria-modal="true"], [role="menu"], [role="listbox"]')) return;
      onBack();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onBack]);

  const openCount = aged.filter((row) => !isClosed(row.status)).length;
  const overdueCount = aged.filter((row) => row.overdue).length;
  const toneOf = (value: S) => statuses.find((s) => s.value === value)?.tone ?? 'slate';

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4 animate-fade-in">
      <header className="space-y-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            className="-ml-1.5 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-transparent px-1.5 py-1 text-[13px] text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900 print:hidden dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-white"
            title="Back (Esc)"
          >
            <ArrowLeft className="h-4 w-4" /> Case files
          </button>
        )}
        <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-slate-900 dark:text-white">{laboratory}</h1>
              <StatusText tone={overdueCount ? 'rose' : openCount ? 'amber' : 'emerald'}>
                {openCount} open{overdueCount ? ` · ${overdueCount} overdue` : ''}
              </StatusText>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-1.5 gap-y-0.5 text-[13px] text-slate-500 dark:text-slate-400">
              <span>Case register · {plural(rows.length)}</span>
              {/* The department's process; on phones the strip below already shows it. */}
              <span className="hidden flex-wrap items-center gap-x-1.5 sm:inline-flex">
                <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
                {statuses.map((stage, index) => (
                  <React.Fragment key={stage.value}>
                    {index > 0 && <ChevronRight className="h-3 w-3 text-slate-300 dark:text-slate-600" aria-hidden="true" />}
                    <span>{stage.value}</span>
                  </React.Fragment>
                ))}
              </span>
            </p>
          </div>
          <OutlineButton size="md" icon={Printer} onClick={printRegister} title="Print the register as shown, on A4 with the official letterhead" className="print:hidden">
            Print register
          </OutlineButton>
        </div>

        {tabs.length > 1 && (
          <nav aria-label="Departments" className="-mb-px flex gap-1 overflow-x-auto border-b border-slate-200 print:hidden dark:border-slate-800">
            {tabs.map((tab) => {
              const selected = tab.id === activeTab;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => onTabChange?.(tab.id)}
                  aria-current={selected ? 'page' : undefined}
                  className={`inline-flex shrink-0 cursor-pointer items-center gap-2 border-b-2 px-3 py-2 text-[13px] transition-colors ${
                    selected
                      ? 'border-teal-500 font-medium text-slate-900 dark:text-white'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {tab.label}
                  <span className={`text-[11.5px] tabular-nums ${tab.overdue ? 'text-rose-600 dark:text-rose-400' : 'text-slate-400'}`} title={`${tab.open} open${tab.overdue ? `, ${tab.overdue} overdue` : ''}`}>
                    {tab.open}
                  </span>
                </button>
              );
            })}
          </nav>
        )}
      </header>

      {error && (
        <p role="alert" className="flex items-start gap-2 rounded-lg border border-rose-300/70 px-3.5 py-2 text-[13px] text-rose-700 dark:border-rose-500/30 dark:text-rose-300">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" /> {error}
        </p>
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

      <section className="rounded-xl border border-slate-200 dark:border-slate-800" aria-label={`${laboratory} register entries`}>
        {/* Toolbar: what is shown, search, sort, filters, export */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="mr-auto min-w-0">
            <h2 className="text-[14px] font-semibold text-slate-900 dark:text-white">{statusLabel === 'All statuses' ? 'Register entries' : statusLabel}</h2>
            <p className="text-[12px] text-slate-500 dark:text-slate-400">Showing {visible.length} of {plural(rows.length)}</p>
          </div>
          <OutlineSearch value={query} onChange={setQuery} placeholder={searchPlaceholder} className="w-full sm:w-80" />
          <OutlineButton
            size="md"
            icon={newestFirst ? ArrowDownWideNarrow : ArrowUpNarrowWide}
            onClick={() => setNewestFirst((v) => !v)}
            aria-label={`Sort by date received, ${newestFirst ? 'newest' : 'oldest'} first`}
          >
            {newestFirst ? 'Newest' : 'Oldest'}
          </OutlineButton>
          <OutlineButton size="md" icon={Download} onClick={exportCsv} disabled={visible.length === 0} title="Download the entries shown as a spreadsheet (CSV)">
            Export
          </OutlineButton>
        </div>

        <div className="flex flex-wrap items-end gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <label className="flex flex-col gap-1">
            <span className="text-[11.5px] text-slate-500 dark:text-slate-400">{columns.officer}</span>
            <select value={officer} onChange={(e) => setOfficer(e.target.value)} className={selectClass}>
              <option value="">All officers</option>
              {officers.map((name) => (
                <option key={name} value={name}>{name}</option>
              ))}
              <option value={UNASSIGNED}>Not assigned</option>
            </select>
          </label>

          <label className="flex flex-col gap-1">
            <span className="text-[11.5px] text-slate-500 dark:text-slate-400">Date received</span>
            <select value={period} onChange={(e) => setPeriod(e.target.value as Period)} className={selectClass}>
              {(Object.keys(PERIOD_LABEL) as Period[]).map((key) => (
                <option key={key} value={key}>{PERIOD_LABEL[key]}</option>
              ))}
            </select>
          </label>

          {period === 'custom' && (
            <>
              <label className="flex flex-col gap-1">
                <span className="text-[11.5px] text-slate-500 dark:text-slate-400">From</span>
                <input type="date" value={customFrom} max={customTo || undefined} onChange={(e) => setCustomFrom(e.target.value)} className={`${selectClass} pr-2.5`} />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-[11.5px] text-slate-500 dark:text-slate-400">To</span>
                <input type="date" value={customTo} min={customFrom || undefined} onChange={(e) => setCustomTo(e.target.value)} className={`${selectClass} pr-2.5`} />
              </label>
            </>
          )}

          {activeFilters > 0 && (
            <OutlineButton size="md" tone="ghost" icon={X} onClick={clearFilters} className="ml-auto">
              Clear {activeFilters} filter{activeFilters === 1 ? '' : 's'}
            </OutlineButton>
          )}
        </div>

        {isLoading && rows.length === 0 ? (
          <div className="flex items-center justify-center gap-2 p-10 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading the register…
          </div>
        ) : visible.length === 0 ? (
          <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
            <Inbox className="h-6 w-6 text-slate-300 dark:text-slate-600" />
            <p className="text-[14px] font-medium text-slate-900 dark:text-white">No case files to show</p>
            <p className="max-w-md text-[12.5px] text-slate-500 dark:text-slate-400">
              {rows.length === 0 ? `No ${unit}s have been registered yet.` : `Nothing on the register matches: ${scope}.`}
            </p>
            {activeFilters > 0 && rows.length > 0 && <OutlineButton onClick={clearFilters}>Show all files</OutlineButton>}
          </div>
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
                    <tr key={row.key} onClick={row.onOpen} className={`${tc.tr} cursor-pointer`}>
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
                        {row.partySub && <div className="max-w-[220px] truncate text-[11px] text-slate-500 dark:text-slate-400">{row.partySub}</div>}
                      </td>
                      <td className={tc.td}>
                        <div className="max-w-[220px] truncate" title={row.subject}>{row.subject}</div>
                        {row.subjectSub && <div className="max-w-[220px] truncate text-[11px] text-slate-500 dark:text-slate-400">{row.subjectSub}</div>}
                      </td>
                      <td className={tc.td}><Officer name={row.officer} /></td>
                      <td className={tc.td}><StatusText tone={toneOf(row.status)}>{row.status}</StatusText></td>
                      <td className={`${tc.td} text-right`}>
                        <OutlineButton
                          size="xs"
                          icon={FolderOpen}
                          aria-label={`Open case file ${row.reference}`}
                          onClick={(event) => {
                            event.stopPropagation();
                            row.onOpen();
                          }}
                        >
                          Open
                        </OutlineButton>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: one row per file */}
            <ul className="divide-y divide-slate-200 md:hidden dark:divide-slate-800">
              {visible.map((row) => (
                <li key={row.key}>
                  <button
                    type="button"
                    onClick={row.onOpen}
                    className="flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left hover:bg-slate-500/[0.04]"
                  >
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex items-start justify-between gap-2">
                        <span className="truncate font-mono text-[13px] font-semibold text-slate-900 dark:text-white">{row.reference}</span>
                        <StatusText tone={toneOf(row.status)}>{row.status}</StatusText>
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
      </section>

      {/* Hidden on screen; the only thing printed by "Print register" */}
      <RegisterPrint laboratory={laboratory} columns={columns} statuses={statuses} rows={visible} scope={scope} />
    </div>
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
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full border border-slate-200 text-[10px] font-semibold text-slate-600 dark:border-slate-700 dark:text-slate-300">
        {initialsOf(name)}
      </span>
      <span className="truncate text-slate-900 dark:text-white">{name}</span>
    </span>
  ) : (
    <span className="text-[12.5px] text-amber-700 dark:text-amber-400">Not assigned</span>
  );
