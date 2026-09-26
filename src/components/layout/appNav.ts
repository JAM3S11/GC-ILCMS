import React from 'react';
import { LayoutDashboard, FlaskConical, TestTube, Droplets, LogOut, Bell, FileText, Award, BookOpen, Shield, Settings } from 'lucide-react';
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
};

export const APP_NAV_GROUPS: { title: string; items: NavItem[] }[] = [
  {
    title: 'Operations',
    items: [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    {
      id: 'laboratory',
      label: 'Laboratory',
        icon: FlaskConical,
        roles: ['ANALYST', 'HEAD_OF_DEPARTMENT'],
        departments: ['Food & Drugs'],
      },
      {
        id: 'food-drug-intake',
        label: 'Register F&D Sample',
        icon: TestTube,
        departments: ['Food & Drugs'],
      },
      {
        id: 'water-intake',
        label: 'Water Exhibit Intake',
        icon: Droplets,
        departments: ['Water'],
      },
      {
        id: 'lab-bay',
        label: 'Lab Bay',
        icon: FlaskConical,
        roles: ['RECEPTIONIST', 'ADMINISTRATOR', 'CLERK', 'CEO'],
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
        roles: ['ADMINISTRATOR', 'CLERK', 'CEO'],
      },
      { id: 'case-file', label: 'Case File', icon: FileText, roles: ['ADMINISTRATOR', 'CLERK', 'CEO'] },
    ],
  },
  {
    title: 'Reference & Compliance',
    items: [
      {
        id: 'executive',
        label: 'Executive',
        icon: Award,
        roles: ['CEO', 'VICE_CEO', 'ADMINISTRATOR'],
      },
      { id: 'references', label: 'Reference DB', icon: BookOpen, roles: ['ADMINISTRATOR', 'QUALITY_MANAGER', 'HEAD_OF_DEPARTMENT', 'SENIOR_CHEMIST', 'ANALYST', 'CEO', 'VICE_CEO'] },
      { id: 'audit', label: 'Audit Trail', icon: Shield, roles: ['RECEPTIONIST', 'ADMINISTRATOR', 'QUALITY_MANAGER', 'HEAD_OF_DEPARTMENT', 'SENIOR_CHEMIST', 'ANALYST', 'CEO', 'VICE_CEO'] },
    ],
  },
];

export const SETTINGS_NAV_ITEM: NavItem = { id: 'settings', label: 'Settings', icon: Settings };

/** Items with no roles/departments are open to everyone. */
export const canSeeNavItem = (user: Pick<User, 'role' | 'department'>, item: NavItem): boolean => {
  if (!item.roles && !item.departments) return true;
  const inDepartment = !!user.department && !!item.departments?.includes(user.department);
  return inDepartment || !!item.roles?.includes(user.role);
};
