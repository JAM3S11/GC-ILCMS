import React from 'react';
import { LogOut } from 'lucide-react';
import { User } from '../../types';
import { laboratoryLabel } from '../../data/laboratories';
import { departmentQualifier } from '../../lib/departments';
import { LogoPlaceholder } from '../common/LogoPlaceholder';
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarRail,
  SidebarSeparator,
} from '@/components/ui/sidebar';
import { SidebarNav, SidebarNavGroup } from './SidebarNav';
import { Laboratory as CaseRegister } from '../laboratory/ExhibitCaseFileIndex';
import {
  APP_NAV_GROUPS,
  CASE_REGISTER_NAV_PREFIX,
  SETTINGS_NAV_ITEM,
  SUPER_ADMIN_NAV_GROUPS,
  SUPER_ADMIN_NAV_PREFIX,
  SuperAdminTab,
  canSeeNavItem,
} from './appNav';

/** 'HEAD_OF_DEPARTMENT' → 'Head of department' */
const humaniseRole = (role: string) => {
  const words = role.toLowerCase().replace(/_/g, ' ').replace(/\bceo\b/g, 'CEO');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

interface AppSidebarProps {
  currentUser: User;
  activeView: string;
  onNavigate: (view: string) => void;
  onSignOut: () => void;
  unreadNotificationsCount: number;
  myExhibitsCount?: number;
  superAdminTab?: SuperAdminTab;
  superAdminCounts?: Partial<Record<SuperAdminTab, number>>;
  /** Which laboratory's case register is open (Super Admin case files). */
  caseRegister?: CaseRegister;
  /** Number of files in each laboratory's case register. */
  caseRegisterCounts?: Partial<Record<CaseRegister, number>>;
}

/** GC-ILCMS navigation: maps the role-aware nav config onto the generic SidebarNav. */
export const AppSidebar: React.FC<AppSidebarProps> = ({
  currentUser,
  activeView,
  onNavigate,
  onSignOut,
  unreadNotificationsCount,
  myExhibitsCount = 0,
  superAdminTab = 'requests',
  superAdminCounts = {},
  caseRegister = 'water',
  caseRegisterCounts = {},
}) => {
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
  const labQualifier = departmentQualifier(currentUser.department);
  const workspace = isSuperAdmin
    ? 'System Administration'
    : labQualifier ? laboratoryLabel(labQualifier) : 'Government Chemist';
  const roleLabel = humaniseRole(currentUser.role);

  const initials = currentUser.name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  const badgeFor = (id: string) => {
    if (id.startsWith(SUPER_ADMIN_NAV_PREFIX)) {
      return superAdminCounts[id.slice(SUPER_ADMIN_NAV_PREFIX.length) as SuperAdminTab] ?? 0;
    }
    if (id === 'notifications') return unreadNotificationsCount;
    // How many exhibits this officer still has in progress, so the queue is
    // visible from the sidebar without opening the page.
    if (id === 'laboratory') return myExhibitsCount;
    return 0;
  };

  // The Super Admin console and the case registry are each one view with tabs;
  // highlight the open tab's item.
  const activeId = activeView === 'super-admin'
    ? `${SUPER_ADMIN_NAV_PREFIX}${superAdminTab === 'requests' ? 'users' : superAdminTab}`
    : activeView === 'case-file' && isSuperAdmin
      ? `${CASE_REGISTER_NAV_PREFIX}${caseRegister}`
      : activeView;

  const groups: SidebarNavGroup[] = (isSuperAdmin ? SUPER_ADMIN_NAV_GROUPS : APP_NAV_GROUPS).map((group) => ({
    title: group.title,
    // Super Admin groups fold away so the long operations list stays tidy.
    collapsible: isSuperAdmin,
    items: group.items
      .filter((item) => canSeeNavItem(currentUser, item))
      .map((item) => ({
        ...item,
        badge: badgeFor(item.id),
        children: item.children?.map((child) => ({
          ...child,
          badge: caseRegisterCounts[child.id.slice(CASE_REGISTER_NAV_PREFIX.length) as CaseRegister],
          badgeTone: 'count' as const,
        })),
      })),
  }));

  return (
    <Sidebar collapsible="icon" className="absolute h-full border-slate-200 dark:border-slate-800">
      {/* Brand + workspace */}
      <SidebarHeader className="gap-3 px-3 pt-3">
        <div className="flex items-center gap-2.5 group-data-[collapsible=icon]:justify-center">
          <LogoPlaceholder size="sm" variant="dark" showText={false} />
          <div className="min-w-0 leading-none group-data-[collapsible=icon]:hidden">
            <div className="flex items-center gap-1.5">
              <span className="text-[15px] font-bold tracking-tight text-slate-900 dark:text-white">GC-ILCMS</span>
              <span className="rounded border border-emerald-600/25 bg-emerald-50 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-400/10 dark:text-emerald-300">
                GoK
              </span>
            </div>
            <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Government Chemist</div>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-slate-50 px-2.5 py-2 group-data-[collapsible=icon]:hidden dark:border-slate-800 dark:bg-slate-900/60">
          <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Workspace</div>
          <div className="mt-0.5 line-clamp-2 text-[13px] font-semibold leading-tight text-slate-900 dark:text-white">{workspace}</div>
          <div className="mt-0.5 flex items-center gap-1.5">
            <span className="truncate text-[11px] text-slate-600 dark:text-slate-300">{roleLabel}</span>
            {currentUser.role === 'HEAD_OF_DEPARTMENT' && (
              <span className="shrink-0 rounded bg-emerald-100 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-emerald-800 dark:bg-emerald-400/15 dark:text-emerald-300">
                Head
              </span>
            )}
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarNav groups={groups} activeId={activeId} onSelect={onNavigate} />
      </SidebarContent>

      {/* Settings, system status, account */}
      <SidebarFooter className="gap-1 border-t border-slate-200 dark:border-slate-800">
        <SidebarNav groups={[{ items: [SETTINGS_NAV_ITEM] }]} activeId={activeView} onSelect={onNavigate} />
        <SidebarSeparator className="mx-0 group-data-[collapsible=icon]:hidden" />

        <div className="flex items-center gap-2.5 rounded-lg p-1 group-data-[collapsible=icon]:flex-col">
          <div
            title={`${currentUser.name} · ${roleLabel}`}
            className="flex size-8 shrink-0 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white ring-2 ring-amber-500/60 dark:bg-slate-700"
          >
            {initials}
          </div>
          <div className="min-w-0 flex-1 group-data-[collapsible=icon]:hidden">
            <div className="truncate text-[13px] font-semibold text-slate-900 dark:text-white">{currentUser.name}</div>
            <div className="flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
              <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-emerald-500" aria-hidden="true" />
              <span className="truncate">{currentUser.email}</span>
            </div>
          </div>
          <button
            onClick={onSignOut}
            aria-label="Sign out"
            title="Sign out"
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md text-slate-500 transition-colors hover:bg-rose-50 hover:text-rose-700 dark:text-slate-400 dark:hover:bg-rose-500/10 dark:hover:text-rose-300"
          >
            <LogOut className="h-4 w-4" />
          </button>
        </div>
      </SidebarFooter>
      <SidebarRail />
    </Sidebar>
  );
};
