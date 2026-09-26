import { LaboratoryDepartment } from '../types';

/**
 * Laboratories a visitor can be routed to, in display order.
 * `value` is the internal department key used across the system; `label` is the official name shown to users.
 */
export const DESTINATION_LABORATORIES: { value: LaboratoryDepartment; label: string }[] = [
  { value: 'Food & Drugs', label: 'Foods, Drugs and Chemical Substance' },
  { value: 'Water', label: 'Water and Environment' },
  { value: 'Toxicology', label: 'Toxicology' },
  { value: 'Criminalistic', label: 'Criminalistics' },
  { value: 'Narcotics', label: 'Narcotics' },
  { value: 'DNA', label: 'Forensics Biology (DNA)' },
];

export const laboratoryLabel = (value: LaboratoryDepartment): string =>
  DESTINATION_LABORATORIES.find((l) => l.value === value)?.label ?? value;
