import React, { useMemo, useState } from 'react';
import {
  AlarmClock,
  BellOff,
  BellRing,
  CheckCheck,
  CheckCircle2,
  Inbox,
  MailOpen,
  Siren,
  Trash2,
  TriangleAlert,
  X,
} from 'lucide-react';
import { AppNotification } from '../../types';
import { Button, DashboardHeader, DashboardPage, EmptyState, SearchInput, TONE, Tone } from '../common/Dashboard';
import {
  CATEGORY_LABEL,
  NotificationCategory,
  NotificationFilter,
  NotificationGroup,
  NotificationRow,
  TYPE_META,
  filterNotifications,
  groupByDay,
  needsAttention,
  notificationCategory,
  notificationTime,
} from './NotificationFeed';

/* ---------------------------------------------------------------------------
 * Notifications — a notification centre with four views, each its own small
 * dashboard over the same feed:
 *   All     — the whole feed: totals, mix by type and by source
 *   Unread  — the inbox: what is new, how long the oldest has waited
 *   Read    — the archive: handled items, restorable to unread
 *   Alerts  — the action queue: urgent and action-needed items, oldest first,
 *             split into open and resolved
 * Every view has search, type and source filters, and bulk mark read /
 * unread / dismiss.
 * --------------------------------------------------------------------------- */

type AdminAction = 'approve' | 'reject' | 'reset-password';

interface NotificationsViewProps {
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onSelect: (notification: AppNotification) => void;
  unreadCount: number;
  description?: string;
  onAdminAction?: (notification: AppNotification, action: AdminAction) => Promise<void>;
  onToggleRead?: (id: string, read: boolean) => void;
  onDismiss?: (id: string) => void;
}

type TypeFilter = 'all' | AppNotification['type'];

const VIEWS: { id: NotificationFilter; label: string; icon: React.ComponentType<{ className?: string }>; blurb: string }[] = [
  { id: 'all', label: 'All', icon: Inbox, blurb: 'Everything sent to you' },
  { id: 'unread', label: 'Unread', icon: BellRing, blurb: 'New since you last looked' },
  { id: 'read', label: 'Read', icon: MailOpen, blurb: 'Handled and kept for reference' },
  { id: 'alerts', label: 'Alerts', icon: Siren, blurb: 'Urgent and action-needed' },
];

const TYPE_ORDER: AppNotification['type'][] = ['urgent', 'warning', 'info', 'success'];
const TYPE_TONE: Record<AppNotification['type'], Tone> = { urgent: 'rose', warning: 'amber', info: 'sky', success: 'emerald' };

const ageText = (time: number | null) => {
  if (time === null) return null;
  const minutes = Math.max(0, Math.round((Date.now() - time) / 60_000));
  if (minutes < 60) return `${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 48) return `${hours} h`;
  return `${Math.round(hours / 24)} days`;
};

export const NotificationsView: React.FC<NotificationsViewProps> = ({
  notifications,
  onMarkAllAsRead,
  onSelect,
  unreadCount,
  description,
  onAdminAction,
  onToggleRead,
  onDismiss,
}) => {
  const [view, setView] = useState<NotificationFilter>('all');
  const [type, setType] = useState<TypeFilter>('all');
  const [category, setCategory] = useState<'all' | NotificationCategory>('all');
  const [query, setQuery] = useState('');
  const [showResolved, setShowResolved] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [workingId, setWorkingId] = useState<string | null>(null);

  const changeView = (next: NotificationFilter) => {
    setView(next);
    setSelected(new Set());
    setType('all');
  };

  // The view, before the type / source / search filters: drives the view's own figures.
  const inView = useMemo(() => {
    const rows = filterNotifications(notifications, view);
    return view === 'alerts' ? rows.filter((n) => showResolved || !n.resolvedAt) : rows;
  }, [notifications, view, showResolved]);

  const q = query.trim().toLowerCase();
  const rows = useMemo(
    () =>
      inView
        .filter((n) => type === 'all' || n.type === type)
        .filter((n) => category === 'all' || notificationCategory(n) === category)
        .filter((n) => !q || `${n.title} ${n.message}`.toLowerCase().includes(q)),
    [inView, type, category, q],
  );

  // Alerts read as a queue: most severe first, then oldest first.
  const alertQueue = useMemo(
    () =>
      [...rows].sort(
        (a, b) =>
          TYPE_ORDER.indexOf(a.type) - TYPE_ORDER.indexOf(b.type) || (notificationTime(a) ?? 0) - (notificationTime(b) ?? 0),
      ),
    [rows],
  );

  const counts: Record<NotificationFilter, number> = {
    all: notifications.length,
    unread: unreadCount,
    read: notifications.filter((n) => n.read).length,
    alerts: notifications.filter((n) => needsAttention(n) && !n.resolvedAt).length,
  };

  const categories = (Object.keys(CATEGORY_LABEL) as NotificationCategory[]).filter((c) => inView.some((n) => notificationCategory(n) === c));

  /* ------------------------------ Bulk actions ----------------------------- */

  const selectedRows = rows.filter((n) => selected.has(n.id));
  const allSelected = rows.length > 0 && selectedRows.length === rows.length;
  const toggle = (id: string, on: boolean) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (on) next.add(id);
      else next.delete(id);
      return next;
    });
  const bulk = (fn: (n: AppNotification) => void) => {
    selectedRows.forEach(fn);
    setSelected(new Set());
  };

  const runAdminAction = async (notification: AppNotification, action: AdminAction) => {
    if (!onAdminAction) return;
    setWorkingId(notification.id);
    try {
      await onAdminAction(notification, action);
    } finally {
      setWorkingId(null);
    }
  };

  /* --------------------------- View dashboards ---------------------------- */

  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const todayStart = now.getTime();
  const isToday = (n: AppNotification) => (notificationTime(n) ?? 0) >= todayStart;
  const oldest = (items: AppNotification[]) =>
    items.reduce<number | null>((min, n) => {
      const t = notificationTime(n);
      return t !== null && (min === null || t < min) ? t : min;
    }, null);

  const openAlerts = notifications.filter((n) => needsAttention(n) && !n.resolvedAt);
  const unread = notifications.filter((n) => !n.read);

  const tiles: { label: string; value: React.ReactNode; hint: string; tone: Tone; icon: React.ComponentType<{ className?: string }> }[] =
    view === 'unread'
      ? [
          { label: 'Unread', value: unread.length, hint: 'Waiting for you', tone: 'amber', icon: BellRing },
          { label: 'Need action', value: unread.filter(needsAttention).length, hint: 'Urgent or action needed', tone: 'rose', icon: TriangleAlert },
          { label: 'Arrived today', value: unread.filter(isToday).length, hint: 'New since midnight', tone: 'sky', icon: Inbox },
          { label: 'Oldest unread', value: ageText(oldest(unread)) ?? '—', hint: 'How long it has waited', tone: 'slate', icon: AlarmClock },
        ]
      : view === 'read'
        ? [
            { label: 'Read', value: counts.read, hint: 'Kept for reference', tone: 'slate', icon: MailOpen },
            { label: 'Read today', value: notifications.filter((n) => n.read && isToday(n)).length, hint: 'Raised and handled today', tone: 'sky', icon: CheckCheck },
            { label: 'Resolved', value: notifications.filter((n) => n.resolvedAt).length, hint: 'Closed by the department', tone: 'emerald', icon: CheckCircle2 },
            { label: 'Alerts handled', value: notifications.filter((n) => n.read && needsAttention(n)).length, hint: 'Urgent or action-needed, now read', tone: 'amber', icon: Siren },
          ]
        : view === 'alerts'
          ? [
              { label: 'Urgent', value: openAlerts.filter((n) => n.type === 'urgent').length, hint: 'Open, act now', tone: 'rose', icon: Siren },
              { label: 'Action needed', value: openAlerts.filter((n) => n.type === 'warning').length, hint: 'Open, act soon', tone: 'amber', icon: TriangleAlert },
              { label: 'Oldest open alert', value: ageText(oldest(openAlerts)) ?? '—', hint: 'How long it has waited', tone: 'slate', icon: AlarmClock },
              { label: 'Resolved', value: notifications.filter((n) => needsAttention(n) && n.resolvedAt).length, hint: 'Closed by the department', tone: 'emerald', icon: CheckCircle2 },
            ]
          : [
              { label: 'All notifications', value: counts.all, hint: 'In your feed', tone: 'slate', icon: Inbox },
              { label: 'Unread', value: counts.unread, hint: 'Not yet opened', tone: 'amber', icon: BellRing },
              { label: 'Open alerts', value: counts.alerts, hint: 'Urgent or action needed', tone: 'rose', icon: Siren },
              { label: 'Today', value: notifications.filter(isToday).length, hint: 'Raised since midnight', tone: 'sky', icon: CheckCheck },
            ];

  const typeCounts = TYPE_ORDER.map((t) => ({ type: t, count: inView.filter((n) => n.type === t).length }));

  /* -------------------------------- Render -------------------------------- */

  const renderRow = (n: AppNotification, meta?: React.ReactNode) => {
    const isAdminRecord =
      n.persisted &&
      n.relatedRecordId &&
      onAdminAction &&
      (n.relatedRecordType === 'account_request' ||
        n.relatedRecordType === 'department_change_request' ||
        (n.relatedRecordType === 'user' && n.title === 'Password reset requested'));
    return (
      <NotificationRow
        key={n.id}
        n={n}
        onSelect={() => onSelect(n)}
        checked={selected.has(n.id)}
        onCheckedChange={(on) => toggle(n.id, on)}
        onToggleRead={onToggleRead ? () => onToggleRead(n.id, !n.read) : undefined}
        onDismiss={onDismiss ? () => onDismiss(n.id) : undefined}
        meta={meta}
      >
        {isAdminRecord && (
          <div className="flex flex-wrap gap-2" aria-label="Request actions">
            {n.relatedRecordType === 'user' ? (
              <Button size="sm" variant="primary" icon={CheckCircle2} disabled={workingId === n.id} onClick={() => void runAdminAction(n, 'reset-password')}>
                Send password reset link
              </Button>
            ) : (
              <>
                <Button size="sm" variant="success" icon={CheckCircle2} disabled={workingId === n.id} onClick={() => void runAdminAction(n, 'approve')}>
                  {n.relatedRecordType === 'account_request' ? 'Approve & invite' : 'Approve change'}
                </Button>
                <Button size="sm" variant="danger" icon={X} disabled={workingId === n.id} onClick={() => void runAdminAction(n, 'reject')}>
                  Reject
                </Button>
              </>
            )}
          </div>
        )}
      </NotificationRow>
    );
  };

  const activeView = VIEWS.find((v) => v.id === view)!;

  return (
    <DashboardPage className="max-w-6xl">
      <DashboardHeader
        breadcrumb={['Workspace', 'Notifications']}
        title="Notifications"
        description={
          description ??
          (unreadCount === 0 ? 'You’re all caught up.' : `${unreadCount} unread · ${counts.alerts} open alert${counts.alerts === 1 ? '' : 's'}`)
        }
        actions={
          unreadCount > 0 && (
            <Button icon={CheckCheck} onClick={onMarkAllAsRead}>
              Mark all as read
            </Button>
          )
        }
      />

      {/* View switcher */}
      <nav aria-label="Notification views" className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {VIEWS.map(({ id, label, icon: Icon, blurb }) => {
          const active = view === id;
          return (
            <button
              key={id}
              type="button"
              onClick={() => changeView(id)}
              aria-pressed={active}
              className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3 text-left transition-colors ${
                active
                  ? 'border-amber-500 bg-amber-50 ring-2 ring-amber-500/20 dark:border-amber-400 dark:bg-amber-400/10'
                  : 'border-slate-200 bg-white hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900 dark:hover:border-slate-700'
              }`}
            >
              <span
                className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg ${
                  active ? 'bg-amber-500 text-slate-950' : 'bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
                }`}
              >
                <Icon className="h-4 w-4" />
              </span>
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className={`text-[13px] ${active ? 'font-semibold text-slate-900 dark:text-white' : 'font-medium text-slate-700 dark:text-slate-200'}`}>{label}</span>
                  <span
                    className={`rounded-full px-1.5 text-[11px] font-semibold tabular-nums ${
                      id === 'alerts' && counts.alerts > 0 ? 'bg-rose-600 text-white' : 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-200'
                    }`}
                  >
                    {counts[id]}
                  </span>
                </span>
                <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">{blurb}</span>
              </span>
            </button>
          );
        })}
      </nav>

      {/* The view's dashboard */}
      <section aria-label={`${activeView.label} summary`} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="grid grid-cols-2 divide-slate-200 lg:grid-cols-4 lg:divide-x dark:divide-slate-800">
          {tiles.map(({ label, value, hint, tone, icon: Icon }) => (
            <div key={label} className="flex items-start gap-3 p-4">
              <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${TONE[tone].chip}`}>
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0">
                <div className="text-[11px] font-medium text-slate-600 dark:text-slate-300">{label}</div>
                <div className="text-xl font-semibold tabular-nums text-slate-900 dark:text-white">{value}</div>
                <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">{hint}</div>
              </div>
            </div>
          ))}
        </div>

        {/* Mix by type: bar + filter chips */}
        <div className="space-y-2.5 border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="flex h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800" role="img" aria-label={typeCounts.map((t) => `${TYPE_META[t.type].label}: ${t.count}`).join(', ')}>
            {typeCounts.map(({ type: t, count }) =>
              count > 0 ? (
                <span key={t} className={`${TONE[TYPE_TONE[t]].bar} border-r-2 border-white last:border-r-0 dark:border-slate-900`} style={{ width: `${(count / Math.max(inView.length, 1)) * 100}%` }} />
              ) : null,
            )}
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            <Chip active={type === 'all'} onClick={() => setType('all')}>
              All types <span className="tabular-nums">{inView.length}</span>
            </Chip>
            {typeCounts.map(({ type: t, count }) => (
              <Chip key={t} active={type === t} onClick={() => setType(type === t ? 'all' : t)} disabled={count === 0}>
                <span className={`h-2 w-2 rounded-full ${TONE[TYPE_TONE[t]].dot}`} aria-hidden="true" />
                {TYPE_META[t].label} <span className="tabular-nums">{count}</span>
              </Chip>
            ))}
          </div>
        </div>
      </section>

      {/* List */}
      <section aria-label={`${activeView.label} notifications`} className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center gap-2.5 border-b border-slate-200 bg-slate-50/60 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/30">
          <input
            type="checkbox"
            checked={allSelected}
            ref={(el) => {
              if (el) el.indeterminate = selectedRows.length > 0 && !allSelected;
            }}
            onChange={(e) => setSelected(e.target.checked ? new Set(rows.map((n) => n.id)) : new Set())}
            aria-label="Select all shown"
            disabled={rows.length === 0}
            className="h-4 w-4 cursor-pointer rounded border-slate-300 accent-amber-600"
          />
          {selectedRows.length > 0 ? (
            <>
              <span className="text-[12px] font-medium text-slate-700 dark:text-slate-200">{selectedRows.length} selected</span>
              {onToggleRead && (
                <>
                  <Button size="xs" icon={CheckCheck} onClick={() => bulk((n) => !n.read && onToggleRead(n.id, true))}>
                    Mark read
                  </Button>
                  <Button size="xs" icon={BellRing} onClick={() => bulk((n) => n.read && onToggleRead(n.id, false))}>
                    Mark unread
                  </Button>
                </>
              )}
              {onDismiss && (
                <Button size="xs" variant="danger" icon={Trash2} onClick={() => bulk((n) => onDismiss(n.id))}>
                  Dismiss
                </Button>
              )}
              <button type="button" onClick={() => setSelected(new Set())} className="cursor-pointer text-[11px] font-medium text-slate-500 hover:underline dark:text-slate-400">
                Clear selection
              </button>
            </>
          ) : (
            <>
              <SearchInput value={query} onChange={setQuery} placeholder="Search notifications…" className="w-full sm:w-64" />
              {categories.length > 1 && (
                <div className="flex flex-wrap items-center gap-1.5">
                  <Chip active={category === 'all'} onClick={() => setCategory('all')}>All sources</Chip>
                  {categories.map((c) => (
                    <Chip key={c} active={category === c} onClick={() => setCategory(category === c ? 'all' : c)}>
                      {CATEGORY_LABEL[c]}
                    </Chip>
                  ))}
                </div>
              )}
              {view === 'alerts' && (
                <label className="ml-auto flex cursor-pointer items-center gap-2 text-[12px] text-slate-600 dark:text-slate-300">
                  <input type="checkbox" checked={showResolved} onChange={(e) => setShowResolved(e.target.checked)} className="h-4 w-4 rounded accent-amber-600" />
                  Include resolved
                </label>
              )}
            </>
          )}
        </div>

        {rows.length === 0 ? (
          <EmptyState
            icon={view === 'alerts' ? CheckCircle2 : BellOff}
            title={
              q || type !== 'all' || category !== 'all'
                ? 'Nothing matches these filters'
                : view === 'unread'
                  ? 'You’re all caught up'
                  : view === 'read'
                    ? 'Nothing read yet'
                    : view === 'alerts'
                      ? 'No open alerts'
                      : 'No notifications yet'
            }
            description={
              q || type !== 'all' || category !== 'all'
                ? 'Try another type or source, or clear the search.'
                : view === 'alerts'
                  ? 'Urgent and action-needed notifications will queue here until they are handled.'
                  : 'New notifications will appear here.'
            }
            action={
              q || type !== 'all' || category !== 'all' ? (
                <Button size="sm" onClick={() => { setQuery(''); setType('all'); setCategory('all'); }}>
                  Clear filters
                </Button>
              ) : undefined
            }
          />
        ) : view === 'alerts' ? (
          // Action queue: grouped by severity, oldest first within each.
          TYPE_ORDER.filter((t) => alertQueue.some((n) => n.type === t)).map((t) => (
            <NotificationGroup key={t} label={`${TYPE_META[t].label} · ${alertQueue.filter((n) => n.type === t).length}`} compact>
              {alertQueue
                .filter((n) => n.type === t)
                .map((n) => {
                  const age = ageText(notificationTime(n));
                  return renderRow(
                    n,
                    n.resolvedAt ? null : age ? (
                      <span className="inline-flex items-center gap-1 font-medium text-rose-700 dark:text-rose-300">
                        <AlarmClock className="h-3 w-3" aria-hidden="true" /> Open for {age}
                      </span>
                    ) : null,
                  );
                })}
            </NotificationGroup>
          ))
        ) : (
          groupByDay(rows).map((group) => (
            <NotificationGroup key={group.label} label={`${group.label} · ${group.items.length}`} compact>
              {group.items.map((n) => renderRow(n))}
            </NotificationGroup>
          ))
        )}
      </section>
    </DashboardPage>
  );
};

const Chip: React.FC<{ active: boolean; onClick: () => void; disabled?: boolean; children: React.ReactNode }> = ({ active, onClick, disabled, children }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    aria-pressed={active}
    className={`inline-flex cursor-pointer items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium ring-1 ring-inset transition-colors disabled:cursor-default disabled:opacity-40 ${
      active
        ? 'bg-slate-900 text-white ring-slate-900 dark:bg-white dark:text-slate-900 dark:ring-white'
        : 'bg-white text-slate-700 ring-slate-200 hover:bg-slate-50 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700 dark:hover:bg-slate-800'
    }`}
  >
    {children}
  </button>
);
