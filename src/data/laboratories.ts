import { LaboratoryDepartment } from '../types';
import { DESTINATION_LAB_ORDER, departmentLabel } from '../lib/departments';

/**
 * Laboratories a visitor can be routed to, in display order.
 *
 * `value` is the internal department key used across the system; `label` is
 * the official name shown to users. The labels are NOT written out here on
 * purpose - they come from DEPARTMENT_LABELS so this list can never drift from
 * the wording used in the registration form, staff accounts and notifications.
 */
export const DESTINATION_LABORATORIES: { value: LaboratoryDepartment; label: string }[] =
  DESTINATION_LAB_ORDER.map((value) => ({ value, label: departmentLabel(value) }));

export const laboratoryLabel = (value: LaboratoryDepartment): string => departmentLabel(value);