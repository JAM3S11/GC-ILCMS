import React from 'react';
import { LayoutDashboard, FlaskConical, TestTube, Droplets, Pill, LogOut, Bell, FileText, Settings, ShieldCheck, Building2, ClipboardList, UserCheck, Users, ScrollText, FolderOpen } from 'lucide-react';
import { LaboratoryDepartment, User, UserRole } from '../../types';

/**
 * The signed-in workspace navigation. Shared by the sidebar (AppSidebar) and
 * global search, so both always offer the same pages for a given user.
 */

export type NavItem = {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  roles?: UserRole[];
  /** Departments whose every member sees the item, regardless of role. */
  departments?: LaboratoryDepartment[];
  /** Departments that never see the item, even when their role would admit them. */
  hideForDepartments?: LaboratoryDepartment[];
  /** Sub-pages listed under the item in the sidebar (e.g. one register per laboratory). */
  children?: { id: string; label: string }[];
};

/**
 * Department staff sidebar, grouped the same way as the Super Admin's: an
 * overview, the laboratory floor in workflow order (intake, then analysis),
 * the front office, then records. Groups a user has no items in are hidden.
 */
export const APP_NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      {
        id: 'notifications',
        label: 'Notifications',
        icon: Bell,
        roles: ['RECEPTIONIST', 'ADMINISTRATOR', 'CLERK', 'CEO'],
      },
    ],
  },
  {
    title: 'Laboratory',
    items: [
      {
        id: 'food-drug-intake',
        label: 'Exhibit Intake',
        icon: TestTube,
        departments: ['Food & Drugs'],
      },
      {
        id: 'water-intake',
        label: 'Exhibit Intake',
        icon: Droplets,
        departments: ['Water'],
      },
      {
        id: 'narcotics-intake',
        label: 'Exhibit Intake',
        icon: Pill,
        departments: ['Narcotics'],
      },
      {
        // The department register. Water staff (analysis officers and interns included) find
        // their own exhibits under its "Assigned to me" view.
        id: 'laboratory',
        label: 'Exhibit Laboratory',
        icon: FlaskConical,
        roles: ['ANALYST', 'SENIOR_CHEMIST', 'HEAD_OF_DEPARTMENT'],
        departments: ['Food & Drugs', 'Water', 'Narcotics'],
      },
    ],
  },
  {
    title: 'Front Office',
    items: [
      {
        // Not an analysis page: this is the reception/client handover board -
        // who is in the building, which bay, and checking clients out.
        id: 'lab-bay',
        label: 'Visitor Register',
        icon: Building2,
        roles: [
          'RECEPTIONIST', 'ADMINISTRATOR', 'CLERK', 'CEO',
          'ANALYST', 'SENIOR_CHEMIST', 'HEAD_OF_DEPARTMENT',
        ],
        // Water and Narcotics handle their clients from the Exhibit Laboratory page.
        hideForDepartments: ['Water', 'Narcotics'],
      },
      {
        id: 'check-out',
        label: 'Check Out',
        icon: LogOut,
        roles: ['RECEPTIONIST', 'ADMINISTRATOR', 'CLERK', 'CEO'],
      },
    ],
  },
  {
    title: 'Records',
    items: [
      { id: 'case-file', label: 'Case File', icon: FileText, roles: ['ADMINISTRATOR', 'CLERK', 'CEO'] },
    ],
  },
  {
    title: 'System Administration',
    items: [
      { id: 'super-admin', label: 'Super Admin', icon: ShieldCheck, roles: ['SUPER_ADMIN'] },
    ],
  },
];

export const SETTINGS_NAV_ITEM: NavItem = { id: 'settings', label: 'Settings', icon: Settings };

/** Members (people on the nominal roll and their accounts), the review queue, and the audit log. */
export type SuperAdminTab = 'members' | 'requests' | 'audit';

/** The console tab for a section id, including the older ones (users, nominal-roll, …) still used by links. */
export const toSuperAdminTab = (section: string): SuperAdminTab =>
  section === 'audit' ? 'audit'
    : ['requests', 'department-requests', 'profile-requests'].includes(section) ? 'requests'
      : 'members';

/** Prefix of the sidebar ids that open a Super Admin console tab. */
export const SUPER_ADMIN_NAV_PREFIX = 'super-admin:';

/** Prefix of the sidebar ids that open one laboratory's case register ('case-file:water'). */
export const CASE_REGISTER_NAV_PREFIX = 'case-file:';

/** Prefix of the sidebar ids that open one tab of the Exhibit Laboratory register ('laboratory:mine'). */
export const LAB_REGISTER_NAV_PREFIX = 'laboratory:';

/**
 * The shortcuts listed under Exhibit Laboratory: the register's own tabs for
 * the user's department, so the sidebar and the page always agree. Heads of
 * Department allocate rather than analyse, so they get no "Assigned to me".
 */
export const labRegisterViews = (user: Pick<User, 'role' | 'department'>): { id: string; label: string }[] => {
  const mine = user.role === 'HEAD_OF_DEPARTMENT' ? [] : [{ id: 'mine', label: 'Assigned to me' }];
  if (user.department === 'Food & Drugs') {
    return [
      { id: 'active', label: 'In progress' },
      ...mine,
      { id: 'approval', label: 'Awaiting approval' },
      { id: 'assignment', label: 'Awaiting assignment' },
      { id: 'reported', label: 'Reported' },
      { id: 'all', label: 'All samples' },
    ];
  }
  // Narcotics' page holds its own status tabs and "Assigned to me" scope, so the
  // sidebar keeps a single Exhibit Laboratory link instead of repeating them.
  if (user.department === 'Narcotics') return [];
  if (user.department === 'Water') {
    return [
      { id: 'all', label: 'All exhibits' },
      ...mine,
      { id: 'awaiting', label: 'Awaiting assignment' },
      { id: 'analysis', label: 'Under analysis' },
      { id: 'complete', label: 'Completed' },
    ];
  }
  return [];
};

/** The register tab Exhibit Laboratory opens on when no shortcut was chosen. */
export const defaultLabRegisterView = (user: Pick<User, 'role' | 'department'>, mineCount: number): string => {
  if (user.department !== 'Food & Drugs') return 'all';
  return user.role !== 'HEAD_OF_DEPARTMENT' && mineCount > 0 ? 'mine' : 'active';
};

const appNavItem = (id: string): NavItem => {
  const item = APP_NAV_GROUPS.flatMap((group) => group.items).find((entry) => entry.id === id);
  if (!item) throw new Error(`Unknown nav item: ${id}`);
  return item;
};

/**
 * The Super Admin's own sidebar, laid out like a government records office:
 * an overview, the case registry (one register per laboratory), the front
 * office, then system administration. The laboratory-floor pages (register,
 * intake, officer queue) are for lab staff; the Super Admin reviews that work
 * through the case registers instead.
 */
export const SUPER_ADMIN_NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Overview',
    items: [appNavItem('dashboard'), appNavItem('notifications')],
  },
  {
    title: 'Case Registry',
    items: [
      {
        // Its children are the departments that have case files (caseFileDepartments.ts),
        // filled in by AppSidebar, so a department appears with its first case file.
        id: 'case-file',
        label: 'Case files',
        icon: FolderOpen,
        children: [],
      },
    ],
  },
  {
    title: 'Front Office',
    items: [appNavItem('lab-bay'), appNavItem('check-out')],
  },
  {
    title: 'Administration',
    items: [
      { id: `${SUPER_ADMIN_NAV_PREFIX}members`, label: 'Members', icon: Users },
      { id: `${SUPER_ADMIN_NAV_PREFIX}audit`, label: 'Audit log', icon: ScrollText },
    ],
  },
];

/** Items with no roles/departments are open to everyone. */
export const canSeeNavItem = (user: Pick<User, 'role' | 'department'>, item: NavItem): boolean => {
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.department && item.hideForDepartments?.includes(user.department)) return false;
  if (!item.roles && !item.departments) return true;
  const inDepartment = !!user.department && !!item.departments?.includes(user.department);
  return inDepartment || !!item.roles?.includes(user.role);
};

// Pages reached from inside another page rather than the sidebar.
const DETAIL_VIEWS: Record<string, { section: string; label: string }> = {
  'exhibit-case-file': { section: 'Exhibit Laboratory', label: 'Exhibit case file' },
  'food-drug-case-file': { section: 'Exhibit Laboratory', label: 'Sample case file' },
  'water-intake-edit': { section: 'Exhibit Intake', label: 'Edit submission' },
  'narcotics-intake-edit': { section: 'Exhibit Intake', label: 'Edit submission' },
  'narcotics-case-file': { section: 'Exhibit Laboratory', label: 'Exhibit case file' },
  'register-visitor': { section: 'Visitor Register', label: 'Register visitor' },
  'lab-bay': { section: 'Front Office', label: 'Visitor Register' },
  reception: { section: 'Front Office', label: 'Visitor Register' },
  references: { section: 'Operations', label: 'Reference database' },
  executive: { section: 'Operations', label: 'Executive overview' },
  audit: { section: 'Operations', label: 'Audit trail' },
  settings: { section: 'Account', label: 'Settings' },
};

/** Breadcrumb trail ([section, page]) for the top bar. */
export const viewBreadcrumb = (user: Pick<User, 'role' | 'department'>, view: string): [string, string] => {
  const groups = user.role === 'SUPER_ADMIN' ? SUPER_ADMIN_NAV_GROUPS : APP_NAV_GROUPS;
  for (const group of groups) {
    const item = group.items.find((entry) => entry.id === view && canSeeNavItem(user, entry));
    if (item) return [group.title, item.label];
  }
  const detail = DETAIL_VIEWS[view];
  if (detail) return [detail.section, detail.label];
  const words = view.replace(/[-:]/g, ' ');
  return ['Workspace', words.charAt(0).toUpperCase() + words.slice(1)];
};
