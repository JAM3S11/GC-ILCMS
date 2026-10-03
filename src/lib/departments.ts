import { LaboratoryDepartment, UserRole } from '../types';

/**
 * Single source of truth for which department a role may belong to.
 *
 * This replaces the four places that previously enumerated the department list
 * independently (SuperAdminPage, SubmissionIntakeModal, LandingPage and
 * server.js). `server.js` keeps its own copy because it cannot import from
 * the React tree; the two must stay in step.
 */

/** The eight working laboratories. Samples and cases are only ever routed here. */
export const LABORATORY_DEPARTMENTS: LaboratoryDepartment[] = [
  'Narcotics',
  'Food & Drugs',
  'Criminalistic',
  'DNA',
  'Instruments',
  'Water',
  'Toxicology',
  'Procurement',
];

/** Institution-wide staff: leadership, registry, finance and quality. */
export const GENERAL_ADMINISTRATION: LaboratoryDepartment = 'General Administration';

export const ALL_DEPARTMENTS: LaboratoryDepartment[] = [
  ...LABORATORY_DEPARTMENTS,
  GENERAL_ADMINISTRATION,
];

/**
 * Roles that belong to exactly one laboratory division. Everything else works
 * institution-wide and takes GENERAL_ADMINISTRATION.
 *
 * QUALITY_MANAGER is deliberately institution-wide: it oversees the whole
 * quality system rather than one bench. Move it up here if that changes.
 */
const LAB_SCOPED_ROLES: UserRole[] = [
  'ANALYST',
  'SENIOR_CHEMIST',
  'INTERN',
  'ATTACHEE',
  'HEAD_OF_DEPARTMENT',
];

export const isLabScopedRole = (role: UserRole): boolean => LAB_SCOPED_ROLES.includes(role);

/**
 * The single Head of a department. Only a head-of-department account (or a
 * super-admin acting on their behalf) may approve submitted documents and
 * assign an Analysis Officer. `server.js` enforces the one-per-department rule.
 */
export const isHeadOfDepartment = (
  user: { role?: UserRole; department?: LaboratoryDepartment | null } | null | undefined,
): boolean => user?.role === 'HEAD_OF_DEPARTMENT';

/** True for staff who should see every department's data, not just one. */
export const isInstitutionWide = (user: { role?: UserRole; department?: LaboratoryDepartment | null } | null | undefined): boolean =>
  // A signed-out session counts as institution-wide so callers can treat this
  // as the single "does not need filtering" check without a separate null guard.
  !user || user.role === 'SUPER_ADMIN' || !user.department || user.department === GENERAL_ADMINISTRATION;

/** The departments a given role is allowed to select. Never empty. */
export const departmentsForRole = (role: UserRole): LaboratoryDepartment[] =>
  isLabScopedRole(role) ? LABORATORY_DEPARTMENTS : [GENERAL_ADMINISTRATION];

/**
 * Keeps the current department if it is still valid for the new role,
 * otherwise falls back to the role's only sensible default. Used when a role
 * changes so a demotion cannot leave an analyst sitting in General Administration.
 */
export const departmentForRole = (
  role: UserRole,
  current?: LaboratoryDepartment | null,
): LaboratoryDepartment => {
  const allowed = departmentsForRole(role);
  return current && allowed.includes(current) ? current : allowed[0];
};

export const isDepartmentValidForRole = (
  role: UserRole,
  department?: LaboratoryDepartment | null,
): boolean => !!department && departmentsForRole(role).includes(department);

/**
 * How to name a department where the surrounding copy already supplies its own
 * word, e.g. "Food & Drugs Lab". Institution-wide staff return null so callers
 * can omit the suffix instead of rendering "General Administration Lab".
 */
export const departmentQualifier = (
  department?: LaboratoryDepartment | null,
): LaboratoryDepartment | null =>
  !department || department === GENERAL_ADMINISTRATION ? null : department;

/**
 * The one place the official name of each department is spelled out. Every
 * dropdown, label, notification and audit line reads from here so the wording
 * cannot drift between screens. `src/data/laboratories.ts` derives its display
 * labels from this map rather than repeating them.
 *
 * The underlying `LaboratoryDepartment` values stay short internal keys: they
 * are persisted in the database and matched in SQL, so renaming them would mean
 * a data migration.
 */
export const DEPARTMENT_LABELS: Record<LaboratoryDepartment, string> = {
  'Narcotics': 'Narcotics',
  'Food & Drugs': 'Food, Drugs and Chemical Substances',
  'Criminalistic': 'Criminalistic',
  'DNA': 'DNA',
  'Instruments': 'Instruments',
  'Water': 'Water and Environment',
  'Toxicology': 'Forensic Toxicology',
  'Procurement': 'Procurement',
  'General Administration': 'General Administration',
};

/**
 * Departments in the order they are offered to a visitor at reception, which
 * is deliberately not alphabetical. Callers that need an option list should
 * build it from this so the ordering matches the rest of the UI.
 */
export const DESTINATION_LAB_ORDER: LaboratoryDepartment[] = [
  'Food & Drugs',
  'Water',
  'Toxicology',
  'Criminalistic',
  'Narcotics',
  'DNA',
  'Instruments',
  'Procurement',
];

/** The official name for any department, falling back to the raw key. */
export const departmentLabel = (department?: LaboratoryDepartment | null): string =>
  (department && DEPARTMENT_LABELS[department]) || department || '';