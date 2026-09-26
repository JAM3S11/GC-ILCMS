import { WaterSenderType, WaterSourceCategory, WaterTestType } from './types';

/**
 * Shared rules for the Water & Environment exhibit intake procedure:
 * laboratory reference format, test tariffs and water source definitions.
 */

export const WATER_TEST_TYPES: WaterTestType[] = ['Full Chemical Analysis', 'Specific Chemical Analysis'];

export const WATER_TEST_INFO: Record<WaterTestType, { description: string }> = {
  'Full Chemical Analysis': {
    description:
      'A comprehensive suite of physical and chemical tests used to identify and quantify all major components, minerals and potential contaminants in a water or wastewater sample.',
  },
  'Specific Chemical Analysis': {
    description:
      'Tests a target set of parameters tailored to a particular regulatory, industrial or environmental requirement.',
  },
};

/** Charges in KES, by test type and sender category. */
export const WATER_TEST_CHARGES: Record<WaterTestType, Record<WaterSenderType, number>> = {
  'Full Chemical Analysis': { Organisation: 5000, Individual: 3000 },
  'Specific Chemical Analysis': { Organisation: 1500, Individual: 1000 },
};

export const waterTestCharge = (testType: WaterTestType, senderType: WaterSenderType): number =>
  WATER_TEST_CHARGES[testType][senderType];

/** Target parameters offered for a Specific Chemical Analysis. */
export const WATER_SPECIFIC_PARAMETERS = ['Heavy Metals', 'Pesticides', 'Oil & Grease'];

export const WATER_SOURCE_CATEGORIES: WaterSourceCategory[] = ['Potable Water', 'Effluent Water'];

export const WATER_SOURCE_INFO: Record<WaterSourceCategory, { description: string; sourceTypes: string[] }> = {
  'Potable Water': {
    description: 'Water that has been extensively filtered and disinfected to meet strict public health standards.',
    sourceTypes: ['Municipal / Tap Supply', 'Borehole', 'Well', 'Spring', 'Bottled Water', 'Water Vending Point'],
  },
  'Effluent Water': {
    description: 'Liquid waste pumped out of, or flowing directly out of, a structure (waste water).',
    sourceTypes: ['Industrial', 'Domestic / Municipal Sewage', 'Hospital', 'Agricultural', 'Commercial'],
  },
};

/** Where effluent is discharged to. */
export const WATER_DISCHARGE_DESTINATIONS = ['Public Sewer', 'Environment'];

/** Water & Environment volume shown in the laboratory reference. */
export const WATER_LAB_VOLUME = 'VOL I';

/** Laboratory reference, e.g. GC/MOI/WAT/VOL I/001/2026. */
export const formatWaterLabReference = (sequence: number, year: number): string =>
  `GC/MOI/WAT/${WATER_LAB_VOLUME}/${String(sequence).padStart(3, '0')}/${year}`;

/** Kenyan mobile number: 07XXXXXXXX, 01XXXXXXXX, or +254 / 254 followed by 9 digits. */
export const isValidKenyanMobile = (value: string): boolean =>
  /^(?:\+?254|0)(?:7|1)\d{8}$/.test(value.replace(/[\s-]/g, ''));

export const formatKes = (amount: number): string => `KES ${amount.toLocaleString('en-KE')}`;
