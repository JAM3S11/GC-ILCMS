import React, { useEffect, useState } from 'react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Building2, Clock, LogOut, Settings } from 'lucide-react';
import { User } from '../../types';
import { departmentLabel } from '../../lib/departments';
import { roleLabel } from '../admin/roles';
import { Avatar } from './Dashboard';

/* ---------------------------------------------------------------------------
 * ProfileMenu: the account button in the top bar. Tapping it opens a card
 * with the signed-in officer's name, email, role and department, the current
 * date and time (East Africa Time, as the office keeps it), and shortcuts to
 * Settings and Sign out.
 * --------------------------------------------------------------------------- */

interface ProfileMenuProps {
  currentUser: User;
  onOpenSettings: () => void;
  onSignOut: () => void;
}

const OFFICE_TIME_ZONE = 'Africa/Nairobi';

/** Ticks every second only while the card is open. */
const LiveClock: React.FC = () => {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  const time = new Intl.DateTimeFormat('en-GB', { timeZone: OFFICE_TIME_ZONE, hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true }).format(now);
  const date = new Intl.DateTimeFormat('en-GB', { timeZone: OFFICE_TIME_ZONE, weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' }).format(now);
  return (
    <div className="flex items-center gap-3 rounded-lg bg-slate-50 px-3 py-2.5 dark:bg-slate-950/60">
      <Clock className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      <div className="min-w-0">
        <div className="text-sm font-semibold tabular-nums text-slate-900 dark:text-white" aria-live="off">
          <time dateTime={now.toISOString()}>{time.toUpperCase()}</time>
          <span className="ml-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">EAT</span>
        </div>
        <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">{date}</div>
      </div>
    </div>
  );
};

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ currentUser, onOpenSettings, onSignOut }) => (
  <Popover className="relative">
    <PopoverButton
      aria-label={`Account: ${currentUser.name}`}
      className="flex h-9 cursor-pointer items-center gap-2 rounded-lg px-1 text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none data-[focus]:ring-2 data-[focus]:ring-amber-500/40 data-[open]:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:data-[open]:bg-slate-800"
    >
      <Avatar name={currentUser.name} size="sm" tone="amber" />
    </PopoverButton>

    <PopoverPanel
      anchor={{ to: 'bottom end', gap: 8 }}
      transition
      className="z-50 w-[min(20rem,calc(100vw-1.5rem))] rounded-xl border border-slate-200 bg-white p-2 shadow-xl shadow-slate-900/10 transition duration-150 ease-out focus:outline-none data-[closed]:-translate-y-1 data-[closed]:opacity-0 dark:border-slate-800 dark:bg-slate-900"
    >
      {({ close }) => (
        <>
          <div className="flex items-start gap-3 px-2 pb-3 pt-2">
            <Avatar name={currentUser.name} size="lg" tone="amber" />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{currentUser.name}</div>
              <div className="truncate text-xs text-slate-500 dark:text-slate-400" title={currentUser.email}>{currentUser.email}</div>
              <div className="mt-1.5 inline-flex items-center rounded-full bg-amber-500/10 px-2 py-0.5 text-[11px] font-medium text-amber-800 ring-1 ring-inset ring-amber-500/20 dark:text-amber-300">
                {roleLabel(currentUser.role)}
              </div>
            </div>
          </div>

          {currentUser.department && (
            <div className="mb-2 flex items-center gap-2 px-2 text-xs text-slate-600 dark:text-slate-300">
              <Building2 className="h-3.5 w-3.5 shrink-0 text-slate-400" aria-hidden="true" />
              <span className="truncate">{departmentLabel(currentUser.department)}</span>
            </div>
          )}

          <LiveClock />

          <div className="my-2 h-px bg-slate-200 dark:bg-slate-800" />

          <button
            type="button"
            onClick={() => { close(); onOpenSettings(); }}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <Settings className="h-4 w-4 text-slate-400" /> Settings
          </button>
          <button
            type="button"
            onClick={() => { close(); onSignOut(); }}
            className="flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] font-medium text-rose-700 hover:bg-rose-50 dark:text-rose-300 dark:hover:bg-rose-950/30"
          >
            <LogOut className="h-4 w-4" /> Sign out
          </button>
        </>
      )}
    </PopoverPanel>
  </Popover>
);
