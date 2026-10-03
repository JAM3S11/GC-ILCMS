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
import { APP_NAV_GROUPS, NavItem, SETTINGS_NAV_ITEM, canSeeNavItem } from './appNav';

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
  sidebarCollapsed,
  onToggleSidebar,
  mobileNavOpen,
  onCloseMobileNav,
  children,
}) => {

  // Command Center temporarily disabled.
  // const [rightSidebarCollapsed, setRightSidebarCollapsed] = React.useState(true);

  const navGroups = APP_NAV_GROUPS;

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

  const instruments = [
    { name: 'Agilent 7890B / 5977B GC-MS', status: 'RUNNING', color: 'text-emerald-600 bg-emerald-500/15 border-emerald-500/30 dark:text-emerald-300', live: true },
    { name: 'Shimadzu Prominence HPLC', status: 'FLUSH', color: 'text-amber-600 bg-amber-500/15 border-amber-500/30 dark:text-amber-300' },
    { name: 'PerkinElmer Spectrum Two FTIR', status: 'STANDBY', color: 'text-slate-600 bg-slate-100 border-slate-300 dark:text-slate-300 dark:bg-slate-800 dark:border-slate-700' },
    { name: 'Cary 60 UV-Vis', status: 'CAL.', color: 'text-sky-600 bg-sky-500/15 border-sky-500/30 dark:text-sky-300' },
  ];

  // Shared sidebar renderer: used for the fixed desktop rail (lg+) and the
  // slide-in mobile drawer (below lg). On mobile the rail is always expanded
  // and the collapse toggle is replaced by a close button.
  const renderSidebar = (mobile: boolean, onToggle: () => void) => {
    const collapsed = mobile ? false : sidebarCollapsed;
    const labQualifier = departmentQualifier(currentUser.department);
    const workspace = labQualifier ? laboratoryLabel(labQualifier) : 'Government Chemist';
    const roleLabel = humaniseRole(currentUser.role);

    const visible = (item: NavItem) => canSeeNavItem(currentUser, item);

    const badgeFor = (id: string) => (id === 'notifications' ? unreadNotificationsCount : 0);

    const renderItem = (item: NavItem) => {
      const Icon = item.icon;
      const isActive = activeView === item.id;
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
            {(currentUser.department ?? 'GC').charAt(0)}
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
                  <div className="px-2.5 pb-1.5 text-[11px] font-medium text-slate-400 dark:text-slate-500">{group.title}</div>
                )}
                <ul className="space-y-0.5">{items.map(renderItem)}</ul>
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
              <span className="ml-auto tabular-nums">v3.4.2</span>
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
    <div className="relative flex flex-1 min-h-0 items-stretch w-full max-w-[1700px] mx-auto animate-fade-in">
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
      <main className="flex-1 min-w-0 min-h-0 overflow-y-auto p-3 md:p-5">{children}</main>

      {/* Command Center temporarily disabled — remove these comment markers to re-enable.
      <button
        onClick={() => setRightSidebarCollapsed(false)}
        aria-label="Show command center"
        title="Show command center"
        className={`absolute right-4 top-3 z-40 hidden xl:flex items-center justify-center h-9 w-9 rounded-lg transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] cursor-pointer ${
          rightSidebarCollapsed
            ? 'opacity-100 scale-100 text-slate-500 hover:text-amber-600 hover:bg-slate-100 dark:text-slate-400 dark:hover:text-amber-300 dark:hover:bg-slate-800'
            : 'opacity-0 scale-50 pointer-events-none'
        }`}
      >
        <PanelRightOpen className="w-4 h-4" />
      </button>

      <aside
        className={`absolute right-4 top-3 bottom-3 z-30 hidden xl:flex flex-col rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.4,0,0.2,1)] will-change-transform ${
          rightSidebarCollapsed
            ? 'w-[300px] 2xl:w-[320px] translate-x-[calc(100%+2rem)] opacity-0 pointer-events-none'
            : 'w-[300px] 2xl:w-[320px] shadow-2xl shadow-slate-900/10 origin-top-right animate-scale-in'
        }`}
      >
        <button
          onClick={() => setRightSidebarCollapsed(true)}
          aria-label="Hide command center"
          title="Hide command center"
          className={`absolute -left-9 top-3 z-20 flex items-center justify-center h-9 w-9 rounded-r-none rounded-tl-lg rounded-bl-lg transition-all duration-300 cursor-pointer ${
            rightSidebarCollapsed
              ? 'opacity-0 pointer-events-none'
              : 'text-slate-600 dark:text-slate-300 hover:text-amber-600 dark:hover:text-amber-300 hover:border-amber-500/40'
          }`}
        >
          <PanelRightClose className="w-4 h-4" />
        </button>
        <div className="flex flex-col flex-1 min-h-0 p-4 bg-slate-50 dark:bg-slate-900/95 rounded-md">
            <div className="shrink-0 flex items-center gap-2">
              <h2 className="text-[13px] font-bold text-slate-900 dark:text-white flex items-center gap-2">
                <Activity className="w-4 h-4 text-amber-500 dark:text-amber-400" />
                Command Center
              </h2>
              <span className="flex items-center gap-1.5 text-[9px] font-mono text-emerald-600 dark:text-emerald-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                LIVE
              </span>
            </div>

            <div className="flex flex-col flex-1 min-h-0 overflow-y-auto space-y-4 mt-4 pr-1">

        {!officerVerified && waitingVisitor && currentUser.role !== 'RECEPTIONIST' && (
          <div className="p-3 rounded-xl bg-gradient-to-r from-amber-500/15 to-white border border-amber-500/40 space-y-2.5 dark:to-slate-950">
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500 text-slate-950 shrink-0">
                <AlertTriangle className="w-3.5 h-3.5" />
              </div>
              <div>
                <div className="text-[11px] font-bold text-slate-900 dark:text-white">Evidence Admission Pending</div>
                <div className="text-[9px] font-mono text-amber-600 dark:text-amber-300">SECTION 8 PROTOCOL</div>
              </div>
            </div>
            <p className="text-[10px] text-slate-600 dark:text-slate-300 leading-relaxed">
              Officer <strong className="text-amber-600 dark:text-amber-400">{waitingVisitor.officerName}</strong> ({waitingVisitor.badgeNumber}) is at the Receiving Bay.
            </p>
            <button
              onClick={onOpenVerifyOfficer}
              className="w-full py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-[11px] flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Verify Officer</span>
            </button>
          </div>
        )}

        {currentUser.role !== 'RECEPTIONIST' && (
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">Notifications</h3>
            <button
              onClick={onOpenNotifications}
              className="text-[10px] font-mono text-amber-600 dark:text-amber-400 hover:underline"
            >
              View all {unreadNotificationsCount > 0 && `(${unreadNotificationsCount} new)`}
            </button>
          </div>
          <div className="space-y-2">
            {notifications.slice(0, 4).map((n) => (
              <div
                key={n.id}
                className={`p-2.5 rounded-lg bg-white border space-y-1 dark:bg-slate-950 ${
                  n.read ? 'border-slate-200 dark:border-slate-800/70' : 'border-amber-500/25'
                }`}
              >
                <div className="flex items-center gap-1.5">
                  <span className={`w-1.5 h-1.5 rounded-full ${notifDot[n.type]} shrink-0`} />
                  <span className="text-[10px] font-semibold text-slate-900 dark:text-white truncate">{n.title}</span>
                  <span className="ml-auto shrink-0 text-[9px] font-mono text-slate-500">{n.timestamp}</span>
                </div>
                <p className="text-[10px] text-slate-600 dark:text-slate-400 leading-snug line-clamp-2">{n.message}</p>
                <span className={`inline-block px-1.5 py-0.5 rounded text-[9px] font-mono uppercase border ${notifBadge[n.type]}`}>
                  {n.type}
                </span>
              </div>
            ))}
          </div>
        </div>
        )}

        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <h3 className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">Chain of Custody</h3>
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-600 dark:text-emerald-400" />
          </div>
          <div className="space-y-2">
            {activeCase.custodyHistory.slice(0, 3).map((c, idx) => (
              <div key={idx} className="relative pl-4 border-l-2 border-slate-200 dark:border-slate-800 pb-1 last:border-transparent">
                <span
                  className={`absolute -left-[5px] top-1 w-2 h-2 rounded-full ${
                    idx === 0 ? 'bg-amber-400' : idx === 1 ? 'bg-sky-400' : 'bg-slate-400 dark:bg-slate-600'
                  }`}
                />
                <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 dark:text-slate-400">
                  <span className="text-amber-600 dark:text-amber-400 font-bold">{c.action}</span>
                  <span>{c.timestamp.slice(-8)}</span>
                </div>
                <div className="mt-0.5 text-[11px] text-slate-900 dark:text-white font-medium truncate">{c.officerOrStaffName}</div>
                <div className="text-[10px] text-slate-500 dark:text-slate-400 line-clamp-2">{c.remarks}</div>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-2.5">
          <h3 className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Zap className="w-3 h-3 text-purple-500 dark:text-purple-400" /> Instrument Telemetry
          </h3>
          <div className="space-y-2">
            {instruments.map((inst) => (
              <div
                key={inst.name}
                className="p-2 rounded-lg bg-white border border-slate-200 flex items-center justify-between gap-2 dark:bg-slate-950 dark:border-slate-800"
              >
                <span className="text-[10px] text-slate-700 dark:text-slate-200 font-medium truncate">{inst.name}</span>
                <span className={`shrink-0 px-1.5 py-0.5 rounded text-[9px] font-mono font-bold border ${inst.color}`}>
                  {inst.status}
                </span>
              </div>
            ))}
          </div>
        </div>

        <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-2 dark:bg-slate-950 dark:border-slate-800">
          <h3 className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 flex items-center gap-1.5">
            <Gauge className="w-3 h-3 text-teal-500 dark:text-teal-400" /> Vault Environment
          </h3>
          <div className="grid grid-cols-2 gap-2 font-mono text-[11px]">
            <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 block text-[9px]">Temp</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">19.4 °C</span>
            </div>
            <div className="p-2 rounded-lg bg-slate-100 border border-slate-200 dark:bg-slate-900 dark:border-slate-800">
              <span className="text-slate-500 dark:text-slate-400 block text-[9px]">Humidity</span>
              <span className="text-emerald-600 dark:text-emerald-400 font-bold">42.1 %</span>
            </div>
          </div>
        </div>

        <div className="space-y-2.5">
          <h3 className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">Live Activity</h3>
          <div className="space-y-2">
            {auditLogs.slice(0, 4).map((log) => (
              <div key={log.id} className="flex items-start gap-2 text-[10px]">
                <CheckCircle2 className="w-3 h-3 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                <div className="min-w-0">
                  <div className="text-slate-700 dark:text-slate-300 font-medium truncate">{log.action.replace(/_/g, ' ')}</div>
                  <div className="text-slate-500 font-mono truncate">{log.user} · {log.timestamp.slice(11, 16)}</div>
                </div>
              </div>
            ))}
          </div>
        </div>

        <div className="pt-1 space-y-2">
          <h3 className="text-[10px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400">Quick Actions</h3>
          <div className="grid grid-cols-2 gap-2">
            <button
              onClick={() => onOpenCaseFile(activeCase.id)}
              className="px-2 py-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-medium flex items-center gap-1.5 justify-center transition-colors cursor-pointer dark:bg-slate-950 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-200"
            >
              <FileText className="w-3 h-3 text-amber-500 dark:text-amber-400" /> Case File
            </button>
            <button
              onClick={onOpenIntakeModal}
              className="px-2 py-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-medium flex items-center gap-1.5 justify-center transition-colors cursor-pointer dark:bg-slate-950 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-200"
            >
              <Package className="w-3 h-3 text-sky-500 dark:text-sky-400" />{' '}
              {currentUser.department === 'Food & Drugs' ? 'Register Sample' : 'Exhibit Intake'}
            </button>
            <button
              onClick={() => onNavigate('reception')}
              className="px-2 py-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-medium flex items-center gap-1.5 justify-center transition-colors cursor-pointer dark:bg-slate-950 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-200"
            >
              <Building2 className="w-3 h-3 text-emerald-500 dark:text-emerald-400" /> Reception
            </button>
            <button
              onClick={() => onNavigate('audit')}
              className="px-2 py-2 rounded-lg bg-white hover:bg-slate-100 border border-slate-200 text-slate-700 text-[10px] font-medium flex items-center gap-1.5 justify-center transition-colors cursor-pointer dark:bg-slate-950 dark:hover:bg-slate-800 dark:border-slate-800 dark:text-slate-200"
            >
              <Shield className="w-3 h-3 text-violet-500 dark:text-violet-400" /> Audit
            </button>
          </div>
          </div>
          </div>
          </div>
      </aside>
      */}
    </div>
  );
};