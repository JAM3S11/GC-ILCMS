import React from 'react';
import { LayoutDashboard, FlaskConical, TestTube, Droplets, LogOut, Bell, FileText, Settings, ShieldCheck, Building2, ClipboardList, UserCheck, Users, ScrollText } from 'lucide-react';
import { LaboratoryDepartment, User, UserRole } from '../../types';

/**
 * The signed-in workspace navigation. Shared by the sidebar (AppShell) and
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
        label: 'Reception & Client Handover',
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

const SUPER_ADMIN_HIDDEN_NAV_IDS = new Set(['laboratory', 'food-drug-intake', 'water-intake']);

/**
 * The Super Admin's own sidebar. It replaces the laboratory workspace nav
 * (which has nothing for an institution-wide administrator) with the console
 * sections, so the sidebar and the page read as one admin area.
 */
export const SUPER_ADMIN_NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Administration',
    items: [
      { id: `${SUPER_ADMIN_NAV_PREFIX}users`, label: 'User accounts', icon: Users },
      { id: `${SUPER_ADMIN_NAV_PREFIX}audit`, label: 'Audit log', icon: ScrollText },
    ],
  },
  // Every page any other role can open, so the Super Admin can work as any of
  // them. The two intake pages share a label for staff (each sees only their
  // own lab), so they are disambiguated here.
  ...APP_NAV_GROUPS
    .filter((group) => group.title !== 'System Administration')
    .map((group) => ({
      title: 'Laboratory Operations',
      // The laboratory-floor pages (register, intake, officer queue) are for lab
      // staff; the Super Admin reviews that work through the case files instead.
      items: group.items.filter((item) => !SUPER_ADMIN_HIDDEN_NAV_IDS.has(item.id)),
    })),
];

/** Items with no roles/departments are open to everyone. */
export const canSeeNavItem = (user: Pick<User, 'role' | 'department'>, item: NavItem): boolean => {
  if (user.role === 'SUPER_ADMIN') return true;
  if (user.department && item.hideForDepartments?.includes(user.department)) return false;
  if (!item.roles && !item.departments) return true;
  const inDepartment = !!user.department && !!item.departments?.includes(user.department);
  return inDepartment || !!item.roles?.includes(user.role);
};
