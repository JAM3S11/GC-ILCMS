import React from 'react';
import { AlertTriangle, Check, CheckCircle2, Info, Siren, X } from 'lucide-react';
import { AppNotification } from '../../types';
import { departmentLabel } from '../../lib/departments';

/**
 * Shared notification design, used by the Notifications page and the header
 * popover so both read the same: a round icon, a bold title with an attention
 * dot, one line of detail, an optional next-step button and the time.
 */

export type NotificationFilter = 'all' | 'unread' | 'read' | 'alerts';

/** Urgent and warning alerts are the ones that need someone to act. */
export const needsAttention = (n: AppNotification) => n.type === 'urgent' || n.type === 'warning';

export const filterNotifications = (items: AppNotification[], filter: NotificationFilter) =>
  filter === 'unread'
    ? items.filter((n) => !n.read)
    : filter === 'read'
      ? items.filter((n) => n.read)
      : filter === 'alerts'
        ? items.filter(needsAttention)
        : items;

/** When the notification was raised (ms), or null when only a display string is known. */
export const notificationTime = (n: AppNotification): number | null => {
  const time = Date.parse(n.createdAt ?? n.timestamp);
  return Number.isNaN(time) ? null : time;
};

export type NotificationCategory = 'accounts' | 'reception' | 'laboratory' | 'system';

export const CATEGORY_LABEL: Record<NotificationCategory, string> = {
  accounts: 'Accounts & access',
  reception: 'Reception',
  laboratory: 'Laboratory',
  system: 'System',
};

/** Which part of the organisation a notification comes from. */
export const notificationCategory = (n: AppNotification): NotificationCategory => {
  if (n.linkAction?.startsWith('ADMIN_') || ['account_request', 'department_change_request', 'user'].includes(n.relatedRecordType ?? '')) return 'accounts';
  if (n.linkAction?.startsWith('RECEPTION_') || n.relatedVisitorId) return 'reception';
  if (n.recipientDepartment) return 'laboratory';
  return 'system';
};

export const TYPE_META: Record<AppNotification['type'], { icon: React.ComponentType<{ className?: string }>; chip: string; label: string }> = {
  urgent: { icon: Siren, chip: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', label: 'Urgent' },
  warning: { icon: AlertTriangle, chip: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', label: 'Action needed' },
  info: { icon: Info, chip: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', label: 'Update' },
  success: { icon: CheckCircle2, chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', label: 'Completed' },
};

/** What the button on a row says, based on where the alert leads. */
export const actionLabel = (n: AppNotification): string | null => {
  switch (n.linkAction) {
    case 'ADMIN_DEPARTMENT_REQUESTS': return 'Review request';
    case 'ADMIN_USERS': return 'Open accounts';
    case 'RECEPTION_LAB_BAY': return 'Open handover';
    case 'RECEPTION_REGISTER': return 'Open register';
    default:
      if (n.linkAction?.startsWith('ADMIN_')) return 'Review approvals';
      return n.relatedVisitorId ? 'View visit' : null;
  }
};

/** Today / Yesterday / This week / Older. A time that can't be read counts as today while unread. */
export const groupByDay = (items: AppNotification[]) => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const DAY = 86_400_000;
  const bucket = (n: AppNotification) => {
    const time = notificationTime(n);
    if (time === null) return n.read ? 3 : 0;
    if (time >= today.getTime()) return 0;
    if (time >= today.getTime() - DAY) return 1;
    if (time >= today.getTime() - 6 * DAY) return 2;
    return 3;
  };
  return ['Today', 'Yesterday', 'Earlier this week', 'Older']
    .map((label, index) => ({ label, items: items.filter((n) => bucket(n) === index) }))
    .filter((group) => group.items.length > 0);
};

export const NotificationGroup: React.FC<{ label: string; children: React.ReactNode; compact?: boolean }> = ({ label, children, compact }) => (
  <section className={compact ? '' : 'mt-5'}>
    <h3
      className={
        compact
          ? 'sticky top-0 z-10 bg-white/95 px-4 pb-1 pt-3 text-[11px] font-semibold uppercase tracking-wide text-amber-700 backdrop-blur dark:bg-slate-900/95 dark:text-amber-400'
          : 'mb-3 text-xs font-semibold uppercase tracking-wide text-amber-700 dark:text-amber-400'
      }
    >
      {label}
    </h3>
    <ul className={compact ? '' : 'overflow-hidden rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900'}>
      {children}
    </ul>
  </section>
);

export const NotificationRow: React.FC<{
  n: AppNotification;
  onSelect: () => void;
  compact?: boolean;
  /** Hover actions (used in the popover). */
  onToggleRead?: () => void;
  onDismiss?: () => void;
  /** Extra controls under the text, e.g. approve / reject. */
  children?: React.ReactNode;
  /** Bulk selection checkbox (page view). */
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
  /** Extra line under the message, e.g. how long an alert has been open. */
  meta?: React.ReactNode;
}> = ({ n, onSelect, compact = false, onToggleRead, onDismiss, children, checked, onCheckedChange, meta }) => {
  const type = TYPE_META[n.type];
  const Icon = type.icon;
  const action = actionLabel(n);

  return (
    <li
      className={`group relative border-b border-slate-100 last:border-b-0 dark:border-slate-800 ${
        checked ? 'bg-amber-50 dark:bg-amber-400/10' : n.read ? '' : 'bg-amber-500/[0.03]'
      }`}
    >
      {!n.read && !compact && <span aria-hidden="true" className="absolute inset-y-0 left-0 w-0.5 bg-amber-500" />}
      <div className={`flex items-center ${compact ? 'gap-3 px-4 py-3' : 'gap-4 px-5 py-4'}`}>
        {onCheckedChange && (
          <input
            type="checkbox"
            checked={!!checked}
            onChange={(e) => onCheckedChange(e.target.checked)}
            aria-label={`Select: ${n.title}`}
            className="h-4 w-4 shrink-0 cursor-pointer rounded border-slate-300 accent-amber-600"
          />
        )}
        <button type="button" onClick={onSelect} className="flex min-w-0 flex-1 items-center gap-4 text-left" aria-label={`Open: ${n.title}`}>
          <span className={`grid shrink-0 place-items-center rounded-full ${type.chip} ${compact ? 'h-9 w-9' : 'h-10 w-10'}`}>
            <Icon className="h-4 w-4" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="flex items-center gap-2">
              <span className={`truncate text-sm text-slate-950 dark:text-white ${n.read ? 'font-medium' : 'font-semibold'}`}>{n.title}</span>
              {!n.read && needsAttention(n) && <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" aria-label="Needs attention" />}
            </span>
            <span className={`mt-1 block text-sm text-slate-600 dark:text-slate-400 ${compact ? 'line-clamp-2 text-xs' : ''}`}>{n.message}</span>
            {n.recipientDepartment && (
              <span className="mt-1 block text-[11px] text-slate-400">To: {departmentLabel(n.recipientDepartment)}</span>
            )}
            {meta && <span className="mt-1 block text-[11px] text-slate-500 dark:text-slate-400">{meta}</span>}
            {n.resolvedAt && (
              <span className="mt-1 block text-[11px] font-medium text-emerald-600 dark:text-emerald-400">
                Intake registered{n.resolvedBy ? ` by ${n.resolvedBy}` : ''} — marked read for the department
              </span>
            )}
          </span>
        </button>

        <div className="flex shrink-0 items-center gap-3">
          {!compact && (onToggleRead || onDismiss) && (
            <div className="flex gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
              {onToggleRead && (
                <IconAction label={n.read ? 'Mark as unread' : 'Mark as read'} onClick={onToggleRead}>
                  {n.read ? <span className="h-2 w-2 rounded-full border border-current" /> : <Check className="h-3.5 w-3.5" />}
                </IconAction>
              )}
              {onDismiss && (
                <IconAction label="Dismiss" onClick={onDismiss}>
                  <X className="h-3.5 w-3.5" />
                </IconAction>
              )}
            </div>
          )}
          {action && !compact && (
            <button
              type="button"
              onClick={onSelect}
              className="hidden rounded-lg bg-slate-50 px-3 py-2 text-xs font-semibold text-slate-950 hover:bg-slate-100 sm:block dark:bg-slate-800 dark:text-white dark:hover:bg-slate-700"
            >
              {action}
            </button>
          )}
          <span className={`text-right text-xs text-slate-500 dark:text-slate-400 ${compact ? 'hidden' : 'w-28'}`}>{n.timestamp}</span>
        </div>
      </div>

      {compact && (
        <div className="px-4 pb-2.5 pl-[4.25rem] text-[11px] text-slate-400">
          {n.timestamp} · {type.label}
          {action && <span className="ml-2 font-semibold text-amber-700 dark:text-amber-400">{action} →</span>}
        </div>
      )}

      {children && <div className={compact ? 'px-4 pb-3 pl-[4.25rem]' : 'px-5 pb-4 pl-[5.5rem]'}>{children}</div>}

      {compact && (onToggleRead || onDismiss) && (
        <div className="absolute right-2 top-2 flex gap-0.5 opacity-0 transition-opacity focus-within:opacity-100 group-hover:opacity-100 [@media(hover:none)]:opacity-100">
          {onToggleRead && (
            <IconAction label={n.read ? 'Mark as unread' : 'Mark as read'} onClick={onToggleRead}>
              {n.read ? <span className="h-2 w-2 rounded-full border border-current" /> : <Check className="h-3.5 w-3.5" />}
            </IconAction>
          )}
          {onDismiss && (
            <IconAction label="Dismiss" onClick={onDismiss}>
              <X className="h-3.5 w-3.5" />
            </IconAction>
          )}
        </div>
      )}
    </li>
  );
};

const IconAction: React.FC<{ label: string; onClick: () => void; children: React.ReactNode }> = ({ label, onClick, children }) => (
  <button
    type="button"
    onClick={(e) => {
      e.stopPropagation();
      onClick();
    }}
    aria-label={label}
    title={label}
    className="flex h-7 w-7 items-center justify-center rounded-md bg-white text-slate-500 shadow-sm ring-1 ring-slate-200 transition-colors hover:text-slate-900 dark:bg-slate-800 dark:text-slate-300 dark:ring-slate-700 dark:hover:text-white"
  >
    {children}
  </button>
);

/** Underline tabs: All / Unread / Alerts. */
export const NotificationTabs: React.FC<{
  value: NotificationFilter;
  onChange: (value: NotificationFilter) => void;
  counts: Partial<Record<NotificationFilter, number>>;
  compact?: boolean;
}> = ({ value, onChange, counts, compact }) => (
  <div role="tablist" aria-label="Filter notifications" className={`flex ${compact ? 'gap-4 border-b border-slate-200 px-4 dark:border-slate-800' : 'mt-6 gap-7 border-b border-slate-200 dark:border-slate-800'}`}>
    {([
      ['all', 'All'],
      ['unread', 'Unread'],
      ['alerts', 'Alerts'],
    ] as [NotificationFilter, string][]).map(([id, label]) => {
      const active = value === id;
      return (
        <button
          key={id}
          role="tab"
          type="button"
          aria-selected={active}
          onClick={() => onChange(id)}
          className={`-mb-px flex items-center gap-1.5 border-b-2 pb-3 text-sm transition-colors ${compact ? 'pb-2 pt-1 text-xs' : ''} ${
            active
              ? 'border-amber-500 font-semibold text-amber-700 dark:text-amber-400'
              : 'border-transparent text-slate-600 hover:text-slate-950 dark:text-slate-400 dark:hover:text-white'
          }`}
        >
          {label}
          {(counts[id] ?? 0) > 0 && (
            <span className="rounded-full bg-slate-100 px-1.5 text-[10px] tabular-nums text-slate-500 dark:bg-slate-800 dark:text-slate-400">{counts[id]}</span>
          )}
        </button>
      );
    })}
  </div>
);
