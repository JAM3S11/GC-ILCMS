import React from 'react';
import { LayoutDashboard, FlaskConical, TestTube, Droplets, LogOut, Bell, FileText, Settings, ShieldCheck, Building2, ClipboardList, UserCheck, Users, ScrollText, FolderOpen } from 'lucide-react';
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

export const APP_NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Operations',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
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
        // Water handles its clients from the Exhibit Laboratory page.
        hideForDepartments: ['Water'],
      },
      {
        // The department register. Water staff (analysis officers and interns included) find
        // their own exhibits under its "Assigned to me" view.
        id: 'laboratory',
        label: 'Exhibit Laboratory',
        icon: FlaskConical,
        roles: ['ANALYST', 'SENIOR_CHEMIST', 'HEAD_OF_DEPARTMENT'],
        departments: ['Food & Drugs', 'Water'],
      },
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
        id: 'check-out',
        label: 'Check Out',
        icon: LogOut,
        roles: ['RECEPTIONIST', 'ADMINISTRATOR', 'CLERK', 'CEO'],
      },
      {
        id: 'notifications',
        label: 'Notifications',
        icon: Bell,
        roles: ['RECEPTIONIST', 'ADMINISTRATOR', 'CLERK', 'CEO'],
      },
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

export type SuperAdminTab = 'requests' | 'department-requests' | 'users' | 'audit';

/** Prefix of the sidebar ids that open a Super Admin console tab. */
export const SUPER_ADMIN_NAV_PREFIX = 'super-admin:';

/** Prefix of the sidebar ids that open one laboratory's case register ('case-file:water'). */
export const CASE_REGISTER_NAV_PREFIX = 'case-file:';

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
        id: 'case-file',
        label: 'Case files',
        icon: FolderOpen,
        children: [
          { id: `${CASE_REGISTER_NAV_PREFIX}water`, label: 'Water & Environment' },
          { id: `${CASE_REGISTER_NAV_PREFIX}food`, label: 'Food & Drugs' },
        ],
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
      { id: `${SUPER_ADMIN_NAV_PREFIX}users`, label: 'User accounts', icon: Users },
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
  'register-visitor': { section: 'Visitor Register', label: 'Register visitor' },
  'lab-bay': { section: 'Operations', label: 'Visitor Register' },
  reception: { section: 'Operations', label: 'Visitor Register' },
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
