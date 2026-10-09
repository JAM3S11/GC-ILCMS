import React from 'react';
import { Bell, ChevronRight, Search } from 'lucide-react';
import { ThemeToggle } from './ThemeToggle';
import { ProfileMenu } from './ProfileMenu';
import { Kbd, isMacPlatform } from './GlobalSearchModal';
import { User } from '../../types';
import { viewBreadcrumb } from '../layout/appNav';
import { SidebarTrigger } from '@/components/ui/sidebar';

/* ---------------------------------------------------------------------------
 * Header — the workspace top bar that sits above the main content (inside
 * DashboardLayout's right pane). Sidebar toggle + breadcrumb on the left;
 * search, notifications, theme and the profile menu on the right. The brand
 * lives in the sidebar.
 * --------------------------------------------------------------------------- */

interface HeaderProps {
  currentUser: User;
  /** The open workspace view; drives the breadcrumb. */
  activeView?: string;
  unreadNotificationsCount: number;
  onToggleNotifications: () => void;
  onOpenSearch?: () => void;
  onOpenSettings: () => void;
  onSignOut: () => void;
}

const iconButton =
  'relative flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white';

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeView = 'dashboard',
  unreadNotificationsCount,
  onToggleNotifications,
  onOpenSearch,
  onOpenSettings,
  onSignOut,
}) => {
  const [section, page] = viewBreadcrumb(currentUser, activeView);

  return (
    <header className="sticky top-0 z-30 flex h-14 shrink-0 items-center gap-2 border-b border-slate-200 bg-white/90 px-3 backdrop-blur-xl md:px-4 dark:border-slate-800 dark:bg-slate-950/90">
      {/* Collapses the rail to icons on desktop, opens the drawer on mobile (also Ctrl/Cmd+B) */}
      <SidebarTrigger
        aria-label="Toggle navigation"
        title={`Toggle navigation (${isMacPlatform() ? '⌘' : 'Ctrl'}+B)`}
        className={`${iconButton} cursor-pointer`}
      />
      <div className="h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-800" aria-hidden="true" />

      <nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-[13px]">
        <span className="hidden truncate text-slate-500 sm:inline dark:text-slate-400">{section}</span>
        <ChevronRight className="hidden h-3.5 w-3.5 shrink-0 text-slate-400 sm:block" aria-hidden="true" />
        <span aria-current="page" className="truncate font-semibold text-slate-900 dark:text-white">{page}</span>
      </nav>

      <div className="ml-auto flex items-center gap-1 sm:gap-1.5">
        {onOpenSearch && (
          <>
            <button
              onClick={onOpenSearch}
              aria-label="Search"
              aria-keyshortcuts={isMacPlatform() ? 'Meta+K' : 'Control+K'}
              className="hidden h-9 w-56 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-1.5 text-left text-[13px] text-slate-500 transition-colors hover:border-slate-300 hover:bg-white md:flex lg:w-72 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400 dark:hover:border-slate-700"
            >
              <Search className="h-4 w-4 shrink-0" />
              <span className="flex-1 truncate">Search cases, exhibits, pages…</span>
              <span className="flex shrink-0 items-center gap-0.5">
                <Kbd>{isMacPlatform() ? '⌘' : 'Ctrl'}</Kbd>
                <Kbd>K</Kbd>
              </span>
            </button>
            <button onClick={onOpenSearch} aria-label="Search" className={`${iconButton} md:hidden`}>
              <Search className="h-4 w-4" />
            </button>
          </>
        )}

        <button
          id="notif-toggle-btn"
          onClick={onToggleNotifications}
          aria-label={unreadNotificationsCount > 0 ? `Notifications, ${unreadNotificationsCount} unread` : 'Notifications'}
          className={iconButton}
        >
          <Bell className="h-4 w-4" />
          {unreadNotificationsCount > 0 && (
            <span className="absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-600 px-1 text-[9px] font-bold text-white ring-2 ring-white dark:ring-slate-950">
              {unreadNotificationsCount > 99 ? '99+' : unreadNotificationsCount}
            </span>
          )}
        </button>

        <ThemeToggle variant="icon" />
        <div className="mx-0.5 h-5 w-px shrink-0 bg-slate-200 dark:bg-slate-800" aria-hidden="true" />
        <ProfileMenu currentUser={currentUser} onOpenSettings={onOpenSettings} onSignOut={onSignOut} />
      </div>
    </header>
  );
};
