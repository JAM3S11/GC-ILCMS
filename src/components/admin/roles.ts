import { UserRole } from '../../types';

/**
 * Plain-language names and duties for each role, grouped the way an
 * establishment list reads: leadership, administration, laboratory, system.
 */
export const ROLE_GROUPS: { title: string; roles: UserRole[] }[] = [
  { title: 'Leadership', roles: ['CEO', 'VICE_CEO'] },
  { title: 'Administration & support', roles: ['ADMINISTRATOR', 'CLERK', 'RECEPTIONIST', 'ACCOUNTANT', 'HR', 'QUALITY_MANAGER'] },
  { title: 'Laboratory', roles: ['HEAD_OF_DEPARTMENT', 'SENIOR_CHEMIST', 'ANALYST', 'INTERN', 'ATTACHEE'] },
  { title: 'System', roles: ['SUPER_ADMIN'] },
];

export const ROLE_INFO: Record<UserRole, { label: string; duty: string }> = {
  CEO: { label: 'Government Chemist (CEO)', duty: 'Institution-wide oversight and executive reports.' },
  VICE_CEO: { label: 'Deputy Government Chemist', duty: 'Deputises for the CEO across all laboratories.' },
  ADMINISTRATOR: { label: 'Administrator', duty: 'Runs registry and front-office operations.' },
  CLERK: { label: 'Registry clerk', duty: 'Opens and maintains case files.' },
  RECEPTIONIST: { label: 'Receptionist', duty: 'Registers visitors and hands clients to laboratories.' },
  ACCOUNTANT: { label: 'Accountant', duty: 'Fees, receipts and finance records.' },
  HR: { label: 'Human resources', duty: 'Staff records and establishment.' },
  QUALITY_MANAGER: { label: 'Quality manager', duty: 'Oversees the quality system across laboratories.' },
  HEAD_OF_DEPARTMENT: { label: 'Head of Department', duty: 'Approves reports and allocates work in one laboratory.' },
  SENIOR_CHEMIST: { label: 'Senior chemist', duty: 'Reviews analysis and supervises analysts.' },
  ANALYST: { label: 'Analyst', duty: 'Carries out analysis on assigned exhibits.' },
  INTERN: { label: 'Intern', duty: 'Supervised bench work in one laboratory.' },
  ATTACHEE: { label: 'Attachee', duty: 'Industrial attachment in one laboratory.' },
  SUPER_ADMIN: { label: 'Super administrator', duty: 'Manages accounts, roles and the audit log.' },
};

export const roleLabel = (role: UserRole) => ROLE_INFO[role]?.label ?? role.replaceAll('_', ' ');
