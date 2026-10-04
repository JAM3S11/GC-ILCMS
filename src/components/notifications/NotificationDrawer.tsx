import React, { useEffect, useLayoutEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Bell, BellOff, Check, CheckCheck, X } from 'lucide-react';
import { AppNotification } from '../../types';
import {
  NotificationFilter,
  NotificationGroup,
  NotificationRow,
  NotificationTabs,
  filterNotifications,
  groupByDay,
  needsAttention,
} from './NotificationFeed';

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

type Filter = NotificationFilter;

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

  const groups = groupByDay(filterNotifications(notifications, filter));

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
            <NotificationTabs
              compact
              value={filter}
              onChange={setFilter}
              counts={{ all: notifications.length, unread, alerts: notifications.filter(needsAttention).length }}
            />

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
                  <NotificationGroup key={g.label} label={g.label} compact>
                    {g.items.map((n) => (
                      <NotificationRow
                        key={n.id}
                        n={n}
                        compact
                        onSelect={() => onSelectNotification?.(n)}
                        onToggleRead={onToggleRead && (() => onToggleRead(n.id))}
                        onDismiss={onDismiss && (() => onDismiss(n.id))}
                      />
                    ))}
                  </NotificationGroup>
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
