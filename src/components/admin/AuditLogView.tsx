import React, { useMemo, useState } from 'react';
import { ChevronDown, ScrollText, Search } from 'lucide-react';
import { Avatar } from '../common/Dashboard';
import { Select } from '../common/Select';

export type AuditEntry = {
  id: string;
  actorEmail: string;
  action: string;
  recordType: string;
  recordId?: string;
  details: Record<string, unknown>;
  createdAt: string;
};

const PAGE_SIZE = 25;

const humanise = (value: string) => {
  const words = value.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const dayLabel = (date: Date) => {
  const startOfDay = (d: Date) => new Date(d.getFullYear(), d.getMonth(), d.getDate()).getTime();
  const diffDays = Math.round((startOfDay(new Date()) - startOfDay(date)) / 86_400_000);
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'full' }).format(date);
};

const timeLabel = (date: Date) =>
  new Intl.DateTimeFormat(undefined, { hour: '2-digit', minute: '2-digit' }).format(date);

/** A flat, scannable activity feed: grouped by day, one line per event, details on demand. */
export const AuditLogView: React.FC<{ events: AuditEntry[] }> = ({ events }) => {
  const [query, setQuery] = useState('');
  const [action, setAction] = useState('all');
  const [visible, setVisible] = useState(PAGE_SIZE);
  const [openId, setOpenId] = useState<string | null>(null);

  const actions = useMemo(() => Array.from(new Set(events.map((e) => e.action))).sort(), [events]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events.filter(
      (e) =>
        (action === 'all' || e.action === action) &&
        (!q ||
          e.actorEmail.toLowerCase().includes(q) ||
          e.action.toLowerCase().includes(q) ||
          e.recordType.toLowerCase().includes(q) ||
          (e.recordId ?? '').toLowerCase().includes(q)),
    );
  }, [events, query, action]);

  const shown = filtered.slice(0, visible);
  const groups = shown.reduce<{ label: string; items: AuditEntry[] }[]>((acc, event) => {
    const label = dayLabel(new Date(event.createdAt));
    const last = acc[acc.length - 1];
    if (last?.label === label) last.items.push(event);
    else acc.push({ label, items: [event] });
    return acc;
  }, []);

  return (
    <div>
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <label className="flex h-9 min-w-[14rem] flex-1 items-center gap-2 rounded-lg border border-slate-200 px-2.5 focus-within:border-amber-500 dark:border-slate-700">
          <Search className="h-4 w-4 text-slate-400" />
          <input
            value={query}
            onChange={(e) => { setQuery(e.target.value); setVisible(PAGE_SIZE); }}
            placeholder="Search by person, action or record"
            className="w-full bg-transparent text-xs outline-none dark:text-white"
          />
        </label>
        <Select
          size="xs"
          className="w-44"
          aria-label="Filter by action"
          value={action}
          onChange={(value) => { setAction(value); setVisible(PAGE_SIZE); }}
          options={[
            { value: 'all', label: 'All actions' },
            ...actions.map((item) => ({ value: item, label: humanise(item) })),
          ]}
        />
        <span className="ml-auto text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
          {filtered.length} {filtered.length === 1 ? 'event' : 'events'}
        </span>
      </div>

      {filtered.length === 0 ? (
        <div className="px-6 py-14 text-center">
          <ScrollText className="mx-auto h-6 w-6 text-slate-300 dark:text-slate-600" />
          <p className="mt-3 text-sm font-medium text-slate-900 dark:text-white">
            {events.length === 0 ? 'No activity yet' : 'No events match your filters'}
          </p>
          <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
            {events.length === 0
              ? 'Sign-ins and administrative actions will appear here.'
              : 'Try a different search or action.'}
          </p>
        </div>
      ) : (
        <div>
          {groups.map((group) => (
            <section key={group.label} aria-label={group.label}>
              <h3 className="sticky top-0 z-10 bg-slate-50/95 px-4 py-1.5 text-[11px] font-semibold text-slate-500 backdrop-blur dark:bg-slate-950/90 dark:text-slate-400">
                {group.label}
              </h3>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {group.items.map((event) => {
                  const date = new Date(event.createdAt);
                  const open = openId === event.id;
                  const detailEntries = Object.entries(event.details ?? {});
                  return (
                    <li key={event.id}>
                      <button
                        type="button"
                        onClick={() => setOpenId(open ? null : event.id)}
                        aria-expanded={open}
                        className="flex w-full items-center gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                      >
                        <Avatar name={event.actorEmail} size="sm" />
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-[13px] text-slate-900 dark:text-white">
                            <span className="font-medium">{event.actorEmail}</span>
                            <span className="text-slate-500 dark:text-slate-400"> · {humanise(event.action)}</span>
                          </p>
                          <p className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {event.recordType}
                            {event.recordId ? ` · ${event.recordId}` : ''}
                          </p>
                        </div>
                        <time dateTime={event.createdAt} className="shrink-0 text-[11px] tabular-nums text-slate-400">
                          {timeLabel(date)}
                        </time>
                        <ChevronDown className={`h-4 w-4 shrink-0 text-slate-300 transition-transform dark:text-slate-600 ${open ? 'rotate-180' : ''}`} />
                      </button>
                      {open && (
                        <dl className="grid gap-x-6 gap-y-2 bg-slate-50 px-4 py-3 pl-14 text-xs sm:grid-cols-2 dark:bg-slate-950/40">
                          <div>
                            <dt className="text-[11px] text-slate-500 dark:text-slate-400">Time</dt>
                            <dd className="text-slate-900 dark:text-white">
                              {new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'medium' }).format(date)}
                            </dd>
                          </div>
                          {detailEntries.map(([key, value]) => (
                            <div key={key} className="min-w-0">
                              <dt className="text-[11px] text-slate-500 dark:text-slate-400">{humanise(key)}</dt>
                              <dd className="break-words text-slate-900 dark:text-white">
                                {typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
                                  ? String(value)
                                  : JSON.stringify(value)}
                              </dd>
                            </div>
                          ))}
                        </dl>
                      )}
                    </li>
                  );
                })}
              </ul>
            </section>
          ))}

          {filtered.length > visible && (
            <div className="border-t border-slate-100 p-3 text-center dark:border-slate-800">
              <button
                type="button"
                onClick={() => setVisible((n) => n + PAGE_SIZE)}
                className="rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800"
              >
                Show {Math.min(PAGE_SIZE, filtered.length - visible)} more
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
