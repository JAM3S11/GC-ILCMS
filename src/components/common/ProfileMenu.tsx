import React from 'react';
import { Popover, PopoverButton, PopoverPanel } from '@headlessui/react';
import { Keyboard, LogOut, Monitor, Moon, Settings, Sun, UserRound } from 'lucide-react';
import { User } from '../../types';
import { departmentLabel } from '../../lib/departments';
import { roleLabel } from '../admin/roles';
import { useTheme, type ThemeMode } from '../../theme/ThemeProvider';
import { UserAvatar } from './Dashboard';
import { Kbd } from './GlobalSearchModal';

/* ---------------------------------------------------------------------------
 * ProfileMenu: the account button in the top bar. Tapping it opens a compact
 * menu: who is signed in, View profile, Account settings, the theme switch,
 * keyboard shortcuts and Sign out.
 * --------------------------------------------------------------------------- */

export type SettingsSection = 'profile' | 'appearance' | 'notifications' | 'security';

interface ProfileMenuProps {
  currentUser: User;
  onOpenSettings: (section?: SettingsSection) => void;
  onOpenShortcuts: () => void;
  onSignOut: () => void;
}

const THEMES: { mode: ThemeMode; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { mode: 'light', label: 'Light', Icon: Sun },
  { mode: 'dark', label: 'Dark', Icon: Moon },
  { mode: 'system', label: 'System', Icon: Monitor },
];

const itemClass =
  'flex w-full cursor-pointer items-center gap-2.5 rounded-lg px-2.5 py-2 text-left text-[13px] text-slate-700 hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800';

/** Light / Dark / System as three small icon buttons, like the Settings page offers. */
const ThemeSwitch: React.FC = () => {
  const { mode, setMode } = useTheme();
  return (
    <div role="radiogroup" aria-label="Theme" className="flex items-center gap-0.5 rounded-lg bg-slate-100 p-0.5 dark:bg-slate-800">
      {THEMES.map(({ mode: value, label, Icon }) => (
        <button
          key={value}
          type="button"
          role="radio"
          aria-checked={mode === value}
          aria-label={label}
          title={label}
          onClick={() => setMode(value)}
          className={`flex h-6 w-7 cursor-pointer items-center justify-center rounded-md transition-colors ${
            mode === value
              ? 'bg-white text-slate-900 shadow-sm dark:bg-slate-950 dark:text-white'
              : 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200'
          }`}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
};

export const ProfileMenu: React.FC<ProfileMenuProps> = ({ currentUser, onOpenSettings, onOpenShortcuts, onSignOut }) => (
  <Popover className="relative">
    <PopoverButton
      aria-label={`Account: ${currentUser.name}`}
      className="flex h-9 cursor-pointer items-center gap-2 rounded-lg px-1 text-slate-700 transition-colors hover:bg-slate-100 focus:outline-none data-[focus]:ring-2 data-[focus]:ring-amber-500/40 data-[open]:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-800 dark:data-[open]:bg-slate-800"
    >
      <UserAvatar name={currentUser.name} size="sm" />
    </PopoverButton>

    <PopoverPanel
      anchor={{ to: 'bottom end', gap: 8 }}
      transition
      className="z-50 w-[min(16.5rem,calc(100vw-1.5rem))] rounded-xl border border-slate-200 bg-white p-1.5 shadow-xl shadow-slate-900/10 transition duration-150 ease-out focus:outline-none data-[closed]:-translate-y-1 data-[closed]:opacity-0 dark:border-slate-800 dark:bg-slate-900"
    >
      {({ close }) => (
        <>
          <div className="px-2.5 pb-2 pt-1.5">
            <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{currentUser.name}</div>
            <div className="truncate text-xs text-slate-500 dark:text-slate-400" title={currentUser.email}>{currentUser.email}</div>
            <div className="mt-1 truncate text-[11px] text-slate-400 dark:text-slate-500">
              {roleLabel(currentUser.role)}
              {currentUser.department ? ` · ${departmentLabel(currentUser.department)}` : ''}
            </div>
          </div>

          <div className="my-1 h-px bg-slate-200 dark:bg-slate-800" />

          <button type="button" onClick={() => { close(); onOpenSettings('profile'); }} className={itemClass}>
            <UserRound className="h-4 w-4 text-slate-400" /> View profile
          </button>
          <button type="button" onClick={() => { close(); onOpenSettings('appearance'); }} className={itemClass}>
            <Settings className="h-4 w-4 text-slate-400" /> Account settings
          </button>

          <div className="my-1 h-px bg-slate-200 dark:bg-slate-800" />

          <div className="flex items-center justify-between gap-2 px-2.5 py-1.5 text-[13px] text-slate-700 dark:text-slate-200">
            <span>Theme</span>
            <ThemeSwitch />
          </div>
          <button type="button" onClick={() => { close(); onOpenShortcuts(); }} className={`${itemClass} justify-between`}>
            <span className="flex items-center gap-2.5"><Keyboard className="h-4 w-4 text-slate-400" /> Keyboard shortcuts</span>
            <Kbd>?</Kbd>
          </button>

          <div className="my-1 h-px bg-slate-200 dark:bg-slate-800" />

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
