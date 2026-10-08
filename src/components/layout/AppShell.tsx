import React from 'react';
import {
  Activity,
  AlertTriangle,
  ArrowRight,
  Building2,
  CheckCircle2,
  ChevronRight,
  FileText,
  Gauge,
  LogOut,
  Package,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Search,
  Shield,
  ShieldCheck,
  UserCheck,
  X,
  Zap,
  TestTube,
  Droplets,
} from 'lucide-react';
import {
  User,
  UserRole,
  LaboratoryDepartment,
  AppNotification,
  AuditEvent,
  ForensicCase,
  OfficerVisitor,
} from '../../types';
import { laboratoryLabel } from '../../data/laboratories';
import { departmentQualifier } from '../../lib/departments';
import {
  APP_NAV_GROUPS,
  NavItem,
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

interface AppShellProps {
  currentUser: User;
  activeView: string;
  onNavigate: (view: string) => void;
  onSignOut: () => void;
  unreadNotificationsCount: number;
  notifications: AppNotification[];
  auditLogs: AuditEvent[];
  activeCase: ForensicCase;
  officerVerified: boolean;
  waitingVisitor?: OfficerVisitor;
  onOpenVerifyOfficer: () => void;
  onOpenIntakeModal: () => void;
  onOpenCaseFile: (caseId: string) => void;
  onOpenNotifications: () => void;
  /** Exhibits assigned to the signed-in officer that are still under analysis. */
  myExhibitsCount?: number;
  /** Which Super Admin console section is open; drives the admin sidebar highlight. */
  superAdminTab?: SuperAdminTab;
  /** Pending counts shown as badges on the admin sidebar sections. */
  superAdminCounts?: Partial<Record<SuperAdminTab, number>>;
  sidebarCollapsed: boolean;
  onToggleSidebar: () => void;
  mobileNavOpen: boolean;
  onCloseMobileNav: () => void;
  children: React.ReactNode;
}

export const AppShell: React.FC<AppShellProps> = ({
  currentUser,
  activeView,
  onNavigate,
  onSignOut,
  unreadNotificationsCount,
  notifications,
  auditLogs,
  activeCase,
  officerVerified,
  waitingVisitor,
  onOpenVerifyOfficer,
  onOpenIntakeModal,
  onOpenCaseFile,
  onOpenNotifications,
  myExhibitsCount = 0,
  superAdminTab = 'requests',
  superAdminCounts = {},
  sidebarCollapsed,
  onToggleSidebar,
  mobileNavOpen,
  onCloseMobileNav,
  children,
}) => {

  // Command Center temporarily disabled.
  // const [rightSidebarCollapsed, setRightSidebarCollapsed] = React.useState(true);

  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';
  const navGroups = isSuperAdmin ? SUPER_ADMIN_NAV_GROUPS : APP_NAV_GROUPS;
  // Super Admin groups fold away so the long operations list stays tidy.
  const [foldedGroups, setFoldedGroups] = React.useState<Set<string>>(new Set());
  const toggleGroup = (title: string) =>
    setFoldedGroups((previous) => {
      const next = new Set(previous);
      if (!next.delete(title)) next.add(title);
      return next;
    });

  const navLinkClass = (isActive: boolean, collapsed: boolean) =>
    `group flex w-full cursor-pointer items-center rounded-lg text-left text-[13px] transition-colors ${
      collapsed ? 'h-9 justify-center' : 'h-9 gap-2.5 px-2.5'
    } ${
      isActive
        ? 'bg-white font-medium text-slate-900 shadow-sm ring-1 ring-slate-200/80 dark:bg-slate-800/80 dark:text-white dark:ring-slate-700/60'
        : 'text-slate-600 hover:bg-slate-200/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white'
    }`;

  const notifBadge: Record<AppNotification['type'], string> = {
    urgent: 'bg-rose-500/15 text-rose-600 border-rose-500/30 dark:text-rose-300',
    warning: 'bg-amber-500/15 text-amber-600 border-amber-500/30 dark:text-amber-300',
    success: 'bg-emerald-500/15 text-emerald-600 border-emerald-500/30 dark:text-emerald-300',
    info: 'bg-sky-500/15 text-sky-600 border-sky-500/30 dark:text-sky-300',
  };

  const notifDot: Record<AppNotification['type'], string> = {
    urgent: 'bg-rose-400',
    warning: 'bg-amber-400',
    success: 'bg-emerald-400',
    info: 'bg-sky-400',
  };

  const initials = currentUser.name
    .split(' ')
    .map((p) => p[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

  // Shared sidebar renderer: used for the fixed desktop rail (lg+) and the
  // slide-in mobile drawer (below lg). On mobile the rail is always expanded
  // and the collapse toggle is replaced by a close button.
  const renderSidebar = (mobile: boolean, onToggle: () => void) => {
    const collapsed = mobile ? false : sidebarCollapsed;
    const labQualifier = departmentQualifier(currentUser.department);
    const workspace = isSuperAdmin
      ? 'System Administration'
      : labQualifier ? laboratoryLabel(labQualifier) : 'Government Chemist';
    const roleLabel = humaniseRole(currentUser.role);

    const visible = (item: NavItem) => canSeeNavItem(currentUser, item);

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

    const renderItem = (item: NavItem) => {
      const Icon = item.icon;
      const isActive = item.id.startsWith(SUPER_ADMIN_NAV_PREFIX)
        ? activeView === 'super-admin' && item.id === `${SUPER_ADMIN_NAV_PREFIX}${superAdminTab === 'requests' ? 'users' : superAdminTab}`
        : activeView === item.id;
      const badge = badgeFor(item.id);
      return (
        <li key={item.id}>
          <button
            onClick={() => {
              onNavigate(item.id);
              if (mobile) onToggle();
            }}
            title={collapsed ? item.label : undefined}
            aria-current={isActive ? 'page' : undefined}
            className={navLinkClass(isActive, collapsed)}
          >
            <span className="relative flex shrink-0">
              <Icon
                className={`h-[18px] w-[18px] ${
                  isActive
                    ? 'text-amber-600 dark:text-amber-400'
                    : 'text-slate-400 group-hover:text-slate-600 dark:text-slate-500 dark:group-hover:text-slate-300'
                }`}
              />
              {collapsed && badge > 0 && (
                <span className="absolute -right-1.5 -top-1.5 flex h-3.5 min-w-3.5 items-center justify-center rounded-full bg-rose-500 px-0.5 text-[9px] font-semibold text-white ring-2 ring-slate-50 dark:ring-slate-950">
                  {badge}
                </span>
              )}
            </span>
            {!collapsed && <span className="flex-1 truncate">{item.label}</span>}
            {!collapsed && badge > 0 && (
              <span className="rounded-full bg-rose-500/10 px-1.5 text-[11px] font-semibold tabular-nums text-rose-600 dark:text-rose-400">
                {badge}
              </span>
            )}
          </button>
        </li>
      );
    };

    return (
      <div className="flex min-h-0 w-full flex-1 flex-col overflow-hidden">
        {/* Workspace: which lab you're working in, plus collapse / close */}
        <div className={`flex shrink-0 items-center gap-2.5 p-3 ${collapsed ? 'flex-col' : ''}`}>
          <div
            title={collapsed ? `${workspace} · ${roleLabel}` : undefined}
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-amber-500 text-[13px] font-bold text-slate-950 shadow-sm"
          >
            {isSuperAdmin ? <ShieldCheck className="h-4 w-4" /> : (currentUser.department ?? 'GC').charAt(0)}
          </div>
          {!collapsed && (
            <div className="min-w-0 flex-1">
              <div className="line-clamp-2 text-[13px] font-semibold leading-tight text-slate-900 dark:text-white">{workspace}</div>
              <div className="flex items-center gap-1.5 min-w-0">
                <span className="truncate text-[11px] text-slate-500 dark:text-slate-400">{roleLabel}</span>
                {currentUser.role === 'HEAD_OF_DEPARTMENT' && (
                  <span className="shrink-0 rounded bg-emerald-500/15 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                    Head
                  </span>
                )}
              </div>
            </div>
          )}
          <button
            onClick={onToggle}
            aria-label={mobile ? 'Close menu' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            title={mobile ? 'Close menu' : collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-200/70 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            {mobile ? <X className="h-4 w-4" /> : collapsed ? <PanelLeftOpen className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
          </button>
        </div>

        {/* Navigation */}
        <nav aria-label="Main" className="min-h-0 flex-1 space-y-5 overflow-y-auto px-2 py-2">
          {navGroups.map((group) => {
            const items = group.items.filter(visible);
            if (items.length === 0) return null;
            return (
              <div key={group.title}>
                {collapsed ? (
                  <div className="mx-auto mb-2 h-px w-6 bg-slate-200 first:hidden dark:bg-slate-800" />
                ) : (
                  isSuperAdmin ? (
                    <button
                      type="button"
                      onClick={() => toggleGroup(group.title)}
                      aria-expanded={!foldedGroups.has(group.title)}
                      className="flex w-full items-center justify-between px-2.5 pb-1.5 text-[11px] font-medium text-slate-400 hover:text-slate-600 dark:text-slate-500 dark:hover:text-slate-300"
                    >
                      {group.title}
                      <ChevronRight className={`h-3 w-3 transition-transform ${foldedGroups.has(group.title) ? '' : 'rotate-90'}`} />
                    </button>
                  ) : (
                    <div className="px-2.5 pb-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">{group.title}</div>
                  )
                )}
                {(collapsed || !isSuperAdmin || !foldedGroups.has(group.title)) && (
                  <ul className="space-y-0.5">{items.map(renderItem)}</ul>
                )}
              </div>
            );
          })}
        </nav>

        {/* Footer: settings, system status, account */}
        <div className="shrink-0 space-y-1 border-t border-slate-200 p-2 dark:border-slate-800">
          <ul>{renderItem(SETTINGS_NAV_ITEM)}</ul>

          {!collapsed && (
            <div className="flex items-center gap-1.5 px-2.5 py-1 text-[11px] text-slate-400">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              All systems operational
            </div>
          )}

          <div className={`flex items-center gap-2.5 rounded-lg p-1.5 ${collapsed ? 'flex-col' : ''}`}>
            <div
              title={collapsed ? `${currentUser.name} · ${roleLabel}` : undefined}
              className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-amber-500 to-amber-600 text-[11px] font-bold text-slate-950"
            >
              {initials}
            </div>
            {!collapsed && (
              <div className="min-w-0 flex-1">
                <div className="truncate text-[13px] font-medium text-slate-900 dark:text-white">{currentUser.name}</div>
                <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">{currentUser.email}</div>
              </div>
            )}
            <button
              onClick={onSignOut}
              aria-label="Sign out"
              title="Sign out"
              className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-rose-500/10 hover:text-rose-600 dark:hover:text-rose-400"
            >
              <LogOut className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative flex flex-1 min-h-0 items-stretch w-full animate-fade-in">
      {/* ======================= LEFT SIDEBAR (desktop rail) ======================= */}
      <aside
        className={`hidden lg:flex flex-col shrink-0 min-h-0 overflow-hidden bg-slate-50 border-r border-slate-200 dark:bg-slate-950/60 dark:border-slate-800 transition-[width] duration-300 ${
          sidebarCollapsed ? 'w-16' : 'w-60'
        }`}
      >
        {renderSidebar(false, onToggleSidebar)}
      </aside>

      {/* ======================= LEFT SIDEBAR (mobile drawer) ======================= */}
      <div
        className={`fixed inset-0 z-40 lg:hidden ${
          mobileNavOpen ? '' : 'pointer-events-none'
        }`}
        role="dialog"
        aria-modal="true"
        aria-label="Operational navigation menu"
      >
        <div
          className={`absolute inset-0 bg-slate-950/75 backdrop-blur-sm transition-opacity duration-300 ${
            mobileNavOpen ? 'opacity-100' : 'opacity-0'
          }`}
          onClick={onCloseMobileNav}
        />
        <aside
          className={`absolute left-0 top-0 bottom-0 flex w-72 max-w-[85vw] flex-col shadow-2xl transition-transform duration-300 ease-out ${
            mobileNavOpen ? 'translate-x-0' : '-translate-x-full'
          } bg-white border-r border-slate-200 dark:bg-slate-950 dark:border-slate-800`}
        >
          {renderSidebar(true, onCloseMobileNav)}
        </aside>
      </div>

      {/* ======================= MAIN CONTENT ======================= */}
      <main id="main-content" tabIndex={-1} className="flex-1 min-w-0 min-h-0 overflow-y-auto bg-slate-50/60 focus:outline-none dark:bg-slate-950"><div className="mx-auto w-full max-w-screen-2xl px-4 py-4 md:px-6 md:py-6">{children}</div></main>

    </div>
  );
};