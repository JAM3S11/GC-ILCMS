import React, { useRef } from 'react';
import {
  ChevronRight,
  Bell,
  LogOut,
  ChevronDown,
  Search,
  Menu,
  Settings,
} from 'lucide-react';
import { LogoPlaceholder } from './LogoPlaceholder';
import { ThemeToggle } from './ThemeToggle';
import { Kbd, isMacPlatform } from './GlobalSearchModal';
import { User, UserRole } from '../../types';
import { departmentQualifier } from '../../lib/departments';
import { viewBreadcrumb } from '../layout/appNav';


interface HeaderProps {
  currentUser: User;
  /** The open workspace view; drives the breadcrumb. */
  activeView?: string;
  onSignOut: () => void;
  onNavigate?: (view: string) => void;
  unreadNotificationsCount: number;
  onToggleNotifications: () => void;
  onOpenSearch?: () => void;
  onOpenMobileNav?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  currentUser,
  activeView = 'dashboard',
  onSignOut,
  onNavigate,
  unreadNotificationsCount,
  onToggleNotifications,
  onOpenSearch,
  onOpenMobileNav,
}) => {
  const [dropdownOpen, setDropdownOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Scroll-awareness: solidify + shadow once the page has been scrolled
  React.useEffect(() => {
    let ticking = false;
    const update = () => {
      ticking = false;
      setScrolled(window.scrollY > 24);
    };
    const onScroll = () => {
      if (!ticking) {
        requestAnimationFrame(update);
        ticking = true;
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    update();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // Close the user menu on outside click or Escape
  React.useEffect(() => {
    if (!dropdownOpen) return;
    const handleClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDropdownOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    document.addEventListener('keydown', handleKey);
    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('keydown', handleKey);
    };
  }, [dropdownOpen]);

  const getRoleLabel = (role: UserRole): string => {
    switch (role) {
      case 'CEO':
        return 'Chief Executive Officer';
      case 'VICE_CEO':
        return 'Vice CEO (Operations)';
      case 'HEAD_OF_DEPARTMENT':
        return 'Head of Department';
      case 'ANALYST':
        return 'Government Analyst';
      case 'SENIOR_CHEMIST':
        return 'Senior Chemist';
      case 'RECEPTIONIST':
        return 'Evidence Receptionist';
      case 'CLERK':
        return 'Records Clerk';
      case 'ADMINISTRATOR':
        return 'System Administrator';
      case 'SUPER_ADMIN':
        return 'Super Administrator';
      case 'ACCOUNTANT':
        return 'Accountant';
      case 'HR':
        return 'Human Resources';
      case 'INTERN':
        return 'Scientific Intern';
      case 'ATTACHEE':
        return 'Student Attachee';
      case 'QUALITY_MANAGER':
        return 'Quality System Manager';
      default:
        return role;
    }
  };

  const getRoleTextColor = (role: UserRole): string => {
    switch (role) {
      case 'CEO':
      case 'VICE_CEO':
        return 'text-purple-400';
      case 'HEAD_OF_DEPARTMENT':
      case 'SENIOR_CHEMIST':
        return 'text-emerald-400';
      case 'ANALYST':
        return 'text-amber-400';
      case 'RECEPTIONIST':
        return 'text-sky-400';
      case 'ADMINISTRATOR':
      case 'SUPER_ADMIN':
        return 'text-rose-400';
      case 'QUALITY_MANAGER':
        return 'text-teal-400';
      default:
        return 'text-slate-400';
    }
  };

  const initials = currentUser.name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  return (
    <header
      className={`relative z-40 shrink-0 w-full backdrop-blur-xl border-b transition-all duration-300 ${
        scrolled
          ? 'bg-white/95 border-slate-200 shadow-[0_12px_32px_-16px_rgba(15,23,42,0.25)] dark:bg-slate-950/95 dark:border-slate-800/90 dark:shadow-[0_12px_32px_-16px_rgba(0,0,0,0.7)]'
          : 'bg-white/75 border-slate-200/70 dark:bg-slate-950/75 dark:border-slate-800/40'
      }`}
    >
      {/* Government identity strip */}
      <div className="hidden sm:flex h-7 items-center gap-2 border-b border-slate-200 bg-slate-900 px-4 text-[11px] text-slate-300 dark:border-slate-800 dark:bg-black/40">
        <span className="font-medium text-white">Republic of Kenya</span>
        <span className="text-slate-500">·</span>
        <span>Government Chemist Department — Official laboratory information system</span>
        <span className={`ml-auto rounded px-1.5 py-px text-[10px] font-semibold ${
          import.meta.env.VITE_DEMO_MODE === 'true' ? 'bg-amber-500/20 text-amber-300' : 'bg-emerald-500/15 text-emerald-300'
        }`}>
          {import.meta.env.VITE_DEMO_MODE === 'true' ? 'Training environment' : 'Production'}
        </span>
      </div>
      <div className="flex h-14 w-full items-center">
        {/* Brand block — width locked to the expanded left sidebar so the divider line (border-r)
            sits exactly on the sidebar's right edge (kept fixed, not collapsible) */}
        <div className="flex items-center shrink-0 gap-2 sm:gap-3 w-auto sm:w-60 pl-2 sm:pl-4 pr-2 border-r border-slate-200 dark:border-slate-800">
          {/* Mobile navigation toggle (left sidebar is a drawer below lg) */}
          {onOpenMobileNav && (
            <button
              onClick={onOpenMobileNav}
              aria-label="Open navigation menu"
              className="lg:hidden inline-flex items-center justify-center w-8 h-8 -ml-0.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors cursor-pointer active:scale-95 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900/70"
            >
              <Menu className="w-[18px] h-[18px]" />
            </button>
          )}
          <LogoPlaceholder size="sm" variant="dark" showText={false} />
          <div className="hidden sm:block leading-none min-w-0">
            <div className="flex items-center gap-1.5 min-w-0">
              <span className="text-[15px] font-bold tracking-tight truncate whitespace-nowrap text-slate-900 dark:text-white">GC-ILCMS</span>
              <span className="shrink-0 px-1.5 py-0.5 rounded text-[9px] font-semibold tracking-wide uppercase bg-emerald-500/10 text-emerald-600 border border-emerald-500/20 dark:text-emerald-500">
                GoK
              </span>
            </div>
            <div className="mt-1 text-[11px] whitespace-nowrap text-slate-500 dark:text-slate-400">
              Government Chemist
            </div>
          </div>
        </div>

        {/* Breadcrumb */}
        <nav aria-label="Breadcrumb" className="hidden lg:flex items-center gap-1.5 pl-5 min-w-0 text-[13px]">
          {(() => {
            const [section, page] = viewBreadcrumb(currentUser, activeView);
            return (
              <>
                <span className="text-slate-500 truncate dark:text-slate-400">{section}</span>
                <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span aria-current="page" className="font-medium text-slate-900 truncate dark:text-white">{page}</span>
              </>
            );
          })()}
        </nav>

        {/* Right Actions */}
        <div className="flex items-center gap-1 sm:gap-2 ml-auto pr-2 sm:pr-4 md:pr-6">
          {/* Global Search */}
          {onOpenSearch && (
            <>
              {/* Search field (md+): opens the command palette */}
              <button
                onClick={onOpenSearch}
                aria-label="Search"
                aria-keyshortcuts={isMacPlatform() ? 'Meta+K' : 'Control+K'}
                className="hidden h-9 w-56 shrink-0 items-center gap-2 rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-1.5 text-left text-[13px] text-slate-400 transition-colors hover:border-slate-300 hover:bg-white hover:text-slate-500 md:flex lg:w-72 dark:border-slate-800 dark:bg-slate-900/60 dark:hover:border-slate-700 dark:hover:bg-slate-900"
              >
                <Search className="h-4 w-4 shrink-0" />
                <span className="flex-1 truncate">Search…</span>
                <span className="flex shrink-0 items-center gap-0.5">
                  <Kbd>{isMacPlatform() ? '⌘' : 'Ctrl'}</Kbd>
                  <Kbd>K</Kbd>
                </span>
              </button>
              {/* Icon only on small screens */}
              <button
                onClick={onOpenSearch}
                aria-label="Search"
                className="flex shrink-0 items-center justify-center rounded-lg p-2 text-slate-500 transition-all hover:bg-slate-100 hover:text-slate-900 active:scale-95 md:hidden dark:text-slate-400 dark:hover:bg-slate-900/60 dark:hover:text-white"
              >
                <Search className="h-4 w-4" />
              </button>
            </>
          )}

          {/* Notifications */}
          <button
            onClick={onToggleNotifications}
            aria-label="Open notifications"
            className="relative flex items-center justify-center shrink-0 p-2 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-all active:scale-95 dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-900/60"
            id="notif-toggle-btn"
          >
            <Bell className="w-4 h-4" />
            {unreadNotificationsCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 rounded-full bg-rose-500 text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-950">
                {unreadNotificationsCount}
              </span>
            )}
          </button>

          {/* Theme: Light / System / Dark */}
          <ThemeToggle variant="icon" />

          <div className="hidden sm:block h-6 w-px self-center shrink-0 bg-slate-300 dark:bg-slate-800/80 mx-1" />

          {/* User Menu */}
          <div className="relative shrink-0" ref={dropdownRef}>
            <button
              onClick={() => setDropdownOpen(!dropdownOpen)}
              className="flex items-center gap-2.5 rounded-xl py-1.5 pl-1.5 pr-2 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all dark:hover:bg-slate-900/80 dark:hover:border-slate-800"
              aria-haspopup="menu"
              aria-expanded={dropdownOpen}
            >
              <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center text-xs font-bold shadow-inner ring-1 ring-amber-400/30">
                {initials}
              </div>
              <div className="hidden sm:flex flex-col items-start min-w-0">
                <span className="text-[13px] font-semibold text-slate-900 leading-tight dark:text-white truncate max-w-[110px] lg:max-w-[150px] xl:max-w-[220px]">
                  {currentUser.name}
                </span>
                <span className="flex items-center gap-1 min-w-0">
                  <span className="text-[11px] leading-tight truncate max-w-[110px] lg:max-w-[150px] text-slate-500 dark:text-slate-400">
                    {getRoleLabel(currentUser.role)}
                  </span>
                  {currentUser.role === 'HEAD_OF_DEPARTMENT' && (
                    <span className="shrink-0 rounded bg-emerald-500/15 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                      Head
                    </span>
                  )}
                </span>
              </div>
              <ChevronDown
                className={`w-3.5 h-3.5 text-slate-500 transition-transform duration-200 dark:text-slate-400 ${
                  dropdownOpen ? 'rotate-180' : ''
                }`}
              />
            </button>

            {dropdownOpen && (
              <div
                role="menu"
                className="absolute right-0 mt-2 flex flex-col w-[min(20rem,calc(100dvw-1.5rem))] bg-white border border-slate-200 rounded-2xl shadow-2xl z-50 overflow-hidden animate-scale-in origin-top-right dark:bg-slate-900 dark:border-slate-800"
              >
                {/* Profile header */}
                <div className="shrink-0 px-4 pt-4 pb-3 bg-gradient-to-b from-slate-100 to-transparent border-b border-slate-200 dark:from-slate-800/60 dark:border-slate-800/80">
                  <div className="flex items-center gap-3">
                    <div className="h-11 w-11 rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center text-sm font-bold shadow-inner ring-1 ring-amber-400/30">
                      {initials}
                    </div>
                    <div className="min-w-0">
                      <div className="text-sm font-bold text-slate-900 truncate dark:text-white">{currentUser.name}</div>
                      <div className={`flex items-center gap-1.5 text-xs ${getRoleTextColor(currentUser.role)}`}>
                        {getRoleLabel(currentUser.role)}
                        {currentUser.role === 'HEAD_OF_DEPARTMENT' && (
                          <span className="rounded bg-emerald-500/15 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                            Head
                          </span>
                        )}
                      </div>
                      {currentUser.department && (
                        <div className="text-[11px] text-slate-500 mt-0.5 dark:text-slate-400">
                          {departmentQualifier(currentUser.department)
                            ? `${departmentQualifier(currentUser.department)} Laboratory`
                            : 'General Administration'}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    setDropdownOpen(false);
                    onNavigate?.('settings');
                  }}
                  className="w-full px-3 py-2.5 rounded-lg text-left flex items-center gap-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 border border-transparent hover:border-slate-200 transition-all cursor-pointer dark:text-slate-200 dark:hover:bg-slate-800 dark:hover:border-slate-700"
                >
                  <Settings className="w-3.5 h-3.5 text-slate-500 dark:text-slate-300" />
                  <span className="flex-1">Account settings</span>
                  <ChevronDown className="w-3 h-3 text-slate-400 -rotate-90" />
                </button>

                {/* Sign out */}
                <div className="shrink-0 border-t border-slate-200 px-2 py-2 dark:border-slate-800">
                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      onSignOut();
                    }}
                    className="w-full px-3 py-2 rounded-lg text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 flex items-center gap-2 text-xs font-semibold transition-colors"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Sign out</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};