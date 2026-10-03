import React, { useEffect, useLayoutEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { AlertTriangle, Bell, BellOff, Check, CheckCheck, CheckCircle2, Info, Siren, X } from 'lucide-react';
import { AppNotification } from '../../types';
import { departmentLabel } from '../../lib/departments';

/**
 * Notification centre: a popover anchored under the header bell (full width
 * on phones), with All / Unread filters, New / Earlier groups and per-item
 * read and dismiss actions.
 */

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  notifications: AppNotification[];
  unreadCount?: number;
  onMarkAllAsRead: () => void;
  onSelectNotification?: (notif: AppNotification) => void;
  /** Toggle a single notification's read state. */
  onToggleRead?: (id: string) => void;
  onDismiss?: (id: string) => void;
}

const TYPE_STYLE: Record<AppNotification['type'], { icon: React.ComponentType<{ className?: string }>; cls: string; label: string }> = {
  urgent: { icon: Siren, cls: 'bg-rose-500/10 text-rose-600 dark:text-rose-400', label: 'Urgent' },
  warning: { icon: AlertTriangle, cls: 'bg-amber-500/10 text-amber-600 dark:text-amber-400', label: 'Action needed' },
  info: { icon: Info, cls: 'bg-sky-500/10 text-sky-600 dark:text-sky-400', label: 'Update' },
  success: { icon: CheckCircle2, cls: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400', label: 'Completed' },
};

type Filter = 'all' | 'unread';

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  notifications,
  unreadCount,
  onMarkAllAsRead,
  onSelectNotification,
  onToggleRead,
  onDismiss,
}) => {
  const [filter, setFilter] = useState<Filter>('all');
  const [anchor, setAnchor] = useState<{ top: number; right: number }>({ top: 64, right: 16 });
  const unread = unreadCount ?? notifications.filter((n) => !n.read).length;

  // Anchor under the header bell.
  useLayoutEffect(() => {
    if (!isOpen) return;
    const place = () => {
      const bell = document.getElementById('notif-toggle-btn')?.getBoundingClientRect();
      // Phones: full width with an 8px gutter. Wider screens: right-aligned under the bell.
      if (bell) setAnchor({ top: bell.bottom + 8, right: window.innerWidth < 640 ? 8 : Math.max(8, window.innerWidth - bell.right - 8) });
    };
    place();
    window.addEventListener('resize', place);
    return () => window.removeEventListener('resize', place);
  }, [isOpen]);

  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [isOpen, onClose]);

  const visible = filter === 'unread' ? notifications.filter((n) => !n.read) : notifications;
  const groups = [
    { title: 'New', items: visible.filter((n) => !n.read) },
    { title: 'Earlier', items: visible.filter((n) => n.read) },
  ].filter((g) => g.items.length > 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <div className="fixed inset-0 z-50">
          {/* Click-away layer; no dimming, like a menu */}
          <div className="absolute inset-0" onClick={onClose} aria-hidden="true" />

          <motion.div
            role="dialog"
            aria-label="Notifications"
            initial={{ opacity: 0, y: -6, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -6, scale: 0.98 }}
            transition={{ duration: 0.16, ease: 'easeOut' }}
            style={{ top: anchor.top, right: anchor.right }}
            className="absolute left-2 flex max-h-[calc(100dvh-5rem)] origin-top-right flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/10 sm:left-auto sm:w-[400px] dark:border-slate-800 dark:bg-slate-900 dark:shadow-black/40"
          >
            {/* Header */}
            <div className="flex items-center justify-between gap-2 px-4 pb-2 pt-3.5">
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Notifications</h2>
                {unread > 0 && (
                  <span className="rounded-full bg-rose-500 px-1.5 py-px text-[10px] font-semibold tabular-nums text-white">{unread}</span>
                )}
              </div>
              <div className="flex items-center gap-1">
                <button
                  onClick={onMarkAllAsRead}
                  disabled={unread === 0}
                  className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:pointer-events-none disabled:opacity-40 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <CheckCheck className="h-3.5 w-3.5" />
                  Mark all as read
                </button>
                <button
                  onClick={onClose}
                  aria-label="Close notifications"
                  className="rounded-md p-1 text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            {/* Filters */}
            <div role="tablist" aria-label="Filter notifications" className="flex gap-4 border-b border-slate-200 px-4 dark:border-slate-800">
              {(['all', 'unread'] as Filter[]).map((f) => {
                const active = filter === f;
                const count = f === 'all' ? notifications.length : unread;
                return (
                  <button
                    key={f}
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(f)}
                    className={`-mb-px flex items-center gap-1.5 border-b-2 pb-2 pt-1 text-xs font-medium transition-colors ${
                      active
                        ? 'border-amber-500 text-slate-900 dark:text-white'
                        : 'border-transparent text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
                    }`}
                  >
                    {f === 'all' ? 'All' : 'Unread'}
                    <span className="rounded-full bg-slate-100 px-1.5 text-[10px] tabular-nums text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                      {count}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* List */}
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              {groups.length === 0 ? (
                <div className="flex flex-col items-center px-6 py-12 text-center">
                  <span className="flex h-11 w-11 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                    {filter === 'unread' ? <Check className="h-5 w-5" /> : <BellOff className="h-5 w-5" />}
                  </span>
                  <div className="mt-3 text-sm font-medium text-slate-900 dark:text-white">
                    {filter === 'unread' ? "You're all caught up" : 'No notifications yet'}
                  </div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                    {filter === 'unread'
                      ? 'New alerts for your laboratory will appear here.'
                      : 'Alerts addressed to your laboratory will appear here.'}
                  </p>
                </div>
              ) : (
                groups.map((g) => (
                  <section key={g.title}>
                    <h3 className="sticky top-0 z-10 bg-white/95 px-4 pb-1 pt-3 text-[11px] font-medium uppercase tracking-wide text-slate-400 backdrop-blur dark:bg-slate-900/95">
                      {g.title}
                    </h3>
                    <ul>
                      {g.items.map((n) => (
                        <NotificationRow
                          key={n.id}
                          n={n}
                          onSelect={() => onSelectNotification?.(n)}
                          onToggleRead={onToggleRead && (() => onToggleRead(n.id))}
                          onDismiss={onDismiss && (() => onDismiss(n.id))}
                        />
                      ))}
                    </ul>
                  </section>
                ))
              )}
            </div>

            {/* Footer */}
            <div className="flex items-center gap-1.5 border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
              <Bell className="h-3 w-3" />
              Showing alerts for your laboratory and role
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

const NotificationRow: React.FC<{
  n: AppNotification;
  onSelect: () => void;
  onToggleRead?: () => void;
  onDismiss?: () => void;
}> = ({ n, onSelect, onToggleRead, onDismiss }) => {
  const style = TYPE_STYLE[n.type];
  const Icon = style.icon;
  return (
    <li className="group relative">
      <button
        onClick={onSelect}
        className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
          n.read ? '' : 'bg-amber-500/[0.04]'
        }`}
      >
        <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${style.cls}`}>
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1 pr-6 [@media(hover:none)]:pr-16">
          <span className={`block text-[13px] leading-snug ${n.read ? 'text-slate-700 dark:text-slate-300' : 'font-semibold text-slate-900 dark:text-white'}`}>
            {n.title}
          </span>
          <span className="mt-0.5 line-clamp-2 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">{n.message}</span>
          {n.linkAction?.startsWith('ADMIN_') && (
            <span className="mt-1 inline-block text-[11px] font-semibold text-amber-700 dark:text-amber-400">
              {n.linkAction === 'ADMIN_DEPARTMENT_REQUESTS' ? 'Review department request' : n.linkAction === 'ADMIN_USERS' ? 'Open user accounts' : 'Review approval requests'} →
            </span>
          )}
          <span className="mt-1 flex flex-wrap items-center gap-x-1.5 text-[11px] text-slate-400">
            <span>{n.timestamp}</span>
            {n.recipientDepartment && (
              <>
                <span aria-hidden="true">·</span>
                <span>{departmentLabel(n.recipientDepartment)}</span>
              </>
            )}
            <span aria-hidden="true">·</span>
            <span>{style.label}</span>
          </span>
        </span>
      </button>

      {/* Unread dot, swapped for actions on hover / focus */}
      {!n.read && (
        <span
          aria-label="Unread"
          className="pointer-events-none absolute right-4 top-4 h-2 w-2 rounded-full bg-amber-500 transition-opacity group-focus-within:opacity-0 group-hover:opacity-0 [@media(hover:none)]:hidden"
        />
      )}
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
    </li>
  );
};

const IconAction: React.FC<{ label: string; onClick: () => void; children: React.ReactNode }> = ({ label, onClick, children }) => (
  <button
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
