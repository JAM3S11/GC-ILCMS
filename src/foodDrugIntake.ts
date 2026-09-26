import { FoodDrugSampleType } from './types';

/**
 * Shared rules for the Food & Drugs sample intake procedure.
 * Used by both the reception desk (which captures the P.O Box when a
 * visitor is routed to Food & Drugs) and the department's own 7-step
 * intake wizard.
 */

export const FOOD_DRUG_SAMPLE_TYPES: FoodDrugSampleType[] = [
  'Aflatoxin',
  'Miscellaneous',
  'Mycotoxins',
];

/** National ID: integers only, maximum 8 digits. */
export const NATIONAL_ID_MAX = 8;

export const isValidNationalId = (value: string): boolean => /^\d{1,8}$/.test(value.trim());

/** Strips non-digits and caps the length as the user types. */
export const sanitizeNationalId = (value: string): string =>
  value.replace(/\D/g, '').slice(0, NATIONAL_ID_MAX);

/**
 * Kenyan P.O Box address, tolerantly formatted:
 * "PO Box 40245", "P.O. Box 40245-00100", "POBOX 40245".
 * Requires the word "box" plus a 1-6 digit box number, optional 6-digit
 * postcode suffix.
 */
export const isValidPoBox = (value: string): boolean =>
  /^\s*p\.?\s*o\.?\s*box\.?\s*\d{1,6}(\s*-\s*\d{1,6})?\s*$/i.test(value);
