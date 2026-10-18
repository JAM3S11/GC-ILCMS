import React, { useState } from 'react';
import { CircleDot, Clock, FileClock, Hourglass, Inbox, UserCheck, Users } from 'lucide-react';
import { Avatar, EmptyState, Panel } from '../common/Dashboard';
import { WorkActivity, WorkItem, WorkRegister, useDashboardWork } from '../../lib/useDashboardWork';

/* ---------------------------------------------------------------------------
 * The dashboard's "My work" list and activity feed, read from the registers.
 * Rows are light (a hairline between them, no boxes); colour appears only on
 * the days-in-lab count when a file is getting old.
 * --------------------------------------------------------------------------- */

/** Each laboratory's tag: a small square in its colour beside the name. */
const REGISTER_COLOUR: Record<WorkRegister, string> = {
  Water: 'bg-sky-500',
  'Food & Drugs': 'bg-emerald-500',
  Narcotics: 'bg-violet-500',
};

const RegisterTag: React.FC<{ register: WorkRegister }> = ({ register }) => (
  <span className="flex max-w-[140px] shrink-0 items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
    <span className={`h-2 w-2 shrink-0 rounded-[2px] ${REGISTER_COLOUR[register]}`} aria-hidden="true" />
    <span className="truncate">{register}</span>
  </span>
);

/** Days in lab: amber as it nears the limit, red once past it. */
const DaysInLab: React.FC<{ days: number | null; limit: number }> = ({ days, limit }) => {
  if (days === null) return null;
  const tone = days > limit
    ? 'font-medium text-rose-600 dark:text-rose-400'
    : days > limit - 4
      ? 'font-medium text-warning-700 dark:text-warning-300'
      : 'text-slate-500 dark:text-slate-400';
  return (
    <span className={`flex w-16 shrink-0 items-center justify-end gap-1 text-xs tabular-nums ${tone}`} title={days > limit ? `Over the ${limit}-day target` : 'Days since the exhibit was received'}>
      <Hourglass className="h-3 w-3" aria-hidden="true" />
      Day {days}
    </span>
  );
};

const WHOSE_LABEL: Record<WorkItem['whose'], string> = {
  head: 'Head of Department',
  analyst: 'Analysis Officer',
  department: 'Department',
};

const WorkRow: React.FC<{ item: WorkItem; limit: number; onOpen?: (item: WorkItem) => void }> = ({ item, limit, onOpen }) => {
  const who = item.needsMe ? 'You' : item.whose === 'analyst' && item.officer ? item.officer : WHOSE_LABEL[item.whose];
  const body = (
    <>
      <CircleDot className={`h-4 w-4 shrink-0 ${item.needsMe ? 'text-amber-500' : 'text-slate-300 dark:text-slate-600'}`} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="flex min-w-0 items-baseline gap-2">
          <span className="shrink-0 font-mono text-[12px] font-medium text-slate-900 dark:text-white">{item.reference}</span>
          <span className="truncate text-[13px] text-slate-600 dark:text-slate-300">{item.title}</span>
        </span>
        <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
          <span className="font-medium text-slate-700 dark:text-slate-200">{who}</span> · {item.step}
        </span>
      </span>
      <span className="hidden sm:block"><RegisterTag register={item.register} /></span>
      <DaysInLab days={item.daysInLab} limit={limit} />
    </>
  );
  const row = 'flex min-h-[38px] w-full items-center gap-3 px-3.5 py-2 text-left';
  return (
    <li>
      {onOpen ? (
        <button type="button" onClick={() => onOpen(item)} className={`${row} cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50`}>
          {body}
        </button>
      ) : (
        <div className={row}>{body}</div>
      )}
    </li>
  );
};

const GROUP_PREVIEW = 4;

const WorkGroup: React.FC<{
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  items: WorkItem[];
  limit: number;
  canOpen: (item: WorkItem) => boolean;
  onOpen: (item: WorkItem) => void;
}> = ({ title, icon: Icon, items, limit, canOpen, onOpen }) => {
  const [expanded, setExpanded] = useState(false);
  if (!items.length) return null;
  const shown = expanded ? items : items.slice(0, GROUP_PREVIEW);
  return (
    <section>
      <h3 className="flex items-center gap-1.5 border-t border-slate-100 bg-slate-50/60 px-3.5 py-1.5 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 first:border-t-0 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400">
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
        {title}
        <span className="font-medium tabular-nums text-slate-400 dark:text-slate-500">{items.length}</span>
      </h3>
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {shown.map((item) => (
          <WorkRow key={`${item.register}:${item.id}`} item={item} limit={limit} onOpen={canOpen(item) ? onOpen : undefined} />
        ))}
      </ul>
      {items.length > GROUP_PREVIEW && (
        <button
          type="button"
          onClick={() => setExpanded((open) => !open)}
          className="w-full cursor-pointer border-t border-slate-100 px-3.5 py-1.5 text-left text-xs font-medium text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white"
        >
          {expanded ? 'Show fewer' : `+${items.length - GROUP_PREVIEW} more`}
        </button>
      )}
    </section>
  );
};

interface MyWorkPanelProps {
  items: WorkItem[] | null;
  overdueAfterDays: number;
  error?: string;
  /** Whether the viewer may open this file's case file. */
  canOpen: (item: WorkItem) => boolean;
  onOpen: (item: WorkItem) => void;
  className?: string;
}

/**
 * Open files grouped by the question an officer actually asks: what needs me now,
 * what is overdue, and what is with someone else. Longest in the lab first.
 */
export const MyWorkPanel: React.FC<MyWorkPanelProps> = ({ items, overdueAfterDays, error, canOpen, onOpen, className = '' }) => {
  const needsMe = (items ?? []).filter((item) => item.needsMe);
  const overdue = (items ?? []).filter((item) => !item.needsMe && (item.daysInLab ?? 0) > overdueAfterDays);
  const others = (items ?? []).filter((item) => !item.needsMe && (item.daysInLab ?? 0) <= overdueAfterDays);
  return (
    <Panel
      className={className}
      icon={Inbox}
      title="My work"
      description={items ? `${needsMe.length} need you · ${items.length} open files` : 'Loading…'}
      flush
    >
      {error ? (
        <p role="alert" className="px-3.5 py-4 text-xs text-rose-600 dark:text-rose-400">{error}</p>
      ) : !items ? (
        <p className="px-3.5 py-6 text-xs text-slate-500 dark:text-slate-400">Loading your work…</p>
      ) : items.length === 0 ? (
        <EmptyState icon={UserCheck} title="Nothing open" description="Every file in your registers has been issued." />
      ) : (
        <>
          <WorkGroup title="Needs me now" icon={CircleDot} items={needsMe} limit={overdueAfterDays} canOpen={canOpen} onOpen={onOpen} />
          <WorkGroup title={`Over ${overdueAfterDays} days`} icon={FileClock} items={overdue} limit={overdueAfterDays} canOpen={canOpen} onOpen={onOpen} />
          <WorkGroup title="Waiting on others" icon={Users} items={others} limit={overdueAfterDays} canOpen={canOpen} onOpen={onOpen} />
          {needsMe.length === 0 && (
            <p className="border-t border-slate-100 px-3.5 py-2 text-xs text-emerald-700 dark:border-slate-800 dark:text-emerald-400">
              Nothing is waiting on you right now.
            </p>
          )}
        </>
      )}
    </Panel>
  );
};

/**
 * The work list beside the activity feed, loaded once for both. Each dashboard places
 * it under its stats strip.
 */
export const DashboardWorkSection: React.FC<{
  canOpen: (register: WorkRegister, assignedToMe?: boolean) => boolean;
  onOpen: (register: WorkRegister, id: string) => void;
}> = ({ canOpen, onOpen }) => {
  const { work, error } = useDashboardWork();
  return (
    <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
      <MyWorkPanel
        className="xl:col-span-7"
        items={work?.items ?? null}
        overdueAfterDays={work?.overdueAfterDays ?? 14}
        error={error}
        canOpen={(item) => canOpen(item.register, item.mine)}
        onOpen={(item) => onOpen(item.register, item.id)}
      />
      <ActivityPanel
        className="xl:col-span-5"
        activity={error ? [] : work?.activity ?? null}
        canOpen={(entry) => canOpen(entry.register)}
        onOpen={(entry) => onOpen(entry.register, entry.recordId)}
      />
    </div>
  );
};

/** "5 min ago", "3 h ago", "Yesterday", then the date. */
const timeAgo = (iso: string) => {
  const minutes = Math.round((Date.now() - new Date(iso).getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  if (hours < 48) return 'Yesterday';
  return new Date(iso).toLocaleDateString(undefined, { day: 'numeric', month: 'short' });
};

/** Names typed in capitals at reception read as normal names. */
const displayName = (name: string) =>
  name === name.toUpperCase() ? name.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toUpperCase()) : name;

interface ActivityPanelProps {
  activity: WorkActivity[] | null;
  canOpen: (entry: WorkActivity) => boolean;
  onOpen: (entry: WorkActivity) => void;
  className?: string;
}

/** Who did what to which file, newest first, joined into a timeline. */
export const ActivityPanel: React.FC<ActivityPanelProps> = ({ activity, canOpen, onOpen, className = '' }) => (
  <Panel className={className} icon={Clock} title="Recent activity" description="From the register audit trail">
    {!activity ? (
      <p className="text-xs text-slate-500 dark:text-slate-400">Loading…</p>
    ) : activity.length === 0 ? (
      <p className="text-xs text-slate-500 dark:text-slate-400">Nothing recorded yet.</p>
    ) : (
      <ActivityList activity={activity} canOpen={canOpen} onOpen={onOpen} />
    )}
  </Panel>
);

/** The feed itself; the laboratory is named only when the entries come from more than one. */
const ActivityList: React.FC<Omit<ActivityPanelProps, 'activity' | 'className'> & { activity: WorkActivity[] }> = ({ activity, canOpen, onOpen }) => {
  const manyRegisters = new Set(activity.map((entry) => entry.register)).size > 1;
  return (
    <ol className="relative space-y-3 before:absolute before:bottom-3 before:left-[13px] before:top-3 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
      {activity.map((entry) => {
        const actor = displayName(entry.actor);
        return (
          <li key={entry.id} className="relative flex items-start gap-2.5">
            <span className="relative rounded-full ring-2 ring-white dark:ring-slate-900">
              <Avatar name={actor} size="sm" />
            </span>
            <p className="min-w-0 flex-1 pt-1 text-[12.5px] leading-[1.45] text-slate-600 dark:text-slate-300">
              <span className="font-medium text-slate-900 dark:text-white">{actor}</span> {entry.verb}{' '}
              {canOpen(entry) ? (
                <button
                  type="button"
                  onClick={() => onOpen(entry)}
                  className="cursor-pointer font-mono text-[12px] font-medium text-slate-900 underline-offset-[3px] hover:underline dark:text-white"
                >
                  {entry.reference}
                </button>
              ) : (
                <span className="font-mono text-[12px] font-medium text-slate-900 dark:text-white">{entry.reference}</span>
              )}
              {manyRegisters && <span className="ml-1.5 whitespace-nowrap text-slate-400 dark:text-slate-500">· {entry.register}</span>}
            </p>
            <time dateTime={entry.occurredAt} className="shrink-0 pt-1 text-[11px] tabular-nums text-slate-400 dark:text-slate-500" title={new Date(entry.occurredAt).toLocaleString()}>
              {timeAgo(entry.occurredAt)}
            </time>
          </li>
        );
      })}
    </ol>
  );
};
