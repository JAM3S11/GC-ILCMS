/**
 * The parameters a Water & Environment analysis reports on, grouped as on the
 * laboratory report. This is the form's structure only: the limit is the
 * KS EAS 12:2018 maximum for the parameter, and every result is entered by the
 * Analysis Officer. Parameter ids are stored with the results, so keep them stable.
 */

export interface WaterTestParameter {
  id: string;
  name: string;
  /** KS EAS 12:2018 maximum limit, as printed on the report ('-' when none applies). */
  limit: string;
}

export interface WaterTestGroup {
  category: string;
  parameters: WaterTestParameter[];
}

export const WATER_TEST_GROUPS: WaterTestGroup[] = [
  {
    category: 'A. PHYSICAL TESTS',
    parameters: [
      { id: 'colour', name: 'Colour (TCU)', limit: '15.0' },
      { id: 'deposit', name: 'Deposit', limit: 'Free from foreign matter' },
      { id: 'ph', name: 'pH', limit: '6.5 - 8.5' },
      { id: 'turbidity', name: 'Turbidity (NTU)', limit: '5.0' },
      { id: 'odour', name: 'Odour (TON)', limit: 'No objectionable odour' },
      { id: 'conductivity', name: 'Electrical Conductivity at 25 °C (µmhos/cm)', limit: '1500.0' },
    ],
  },
  {
    category: 'B. CHEMICAL TESTS — ANIONS & NUTRIENTS',
    parameters: [
      { id: 'total_alkalinity', name: 'Total Alkalinity as, CaCO₃', limit: '500.0' },
      { id: 'phenolphthalein', name: 'Phenolphthalein (CO₃)²⁻', limit: '-' },
      { id: 'methyl_orange', name: 'Methyl Orange (HCO₃)⁻', limit: '-' },
      { id: 'chloride', name: 'Chloride (Cl)⁻', limit: '250.0' },
      { id: 'sulphate', name: 'Sulphate (SO₄)²⁻', limit: '400.0' },
      { id: 'phosphate', name: 'Phosphate (PO₄)³⁻', limit: '2.2' },
      { id: 'nitrate', name: 'Nitrate (NO₃)⁻', limit: '45.0' },
      { id: 'nitrite', name: 'Nitrite (NO₂)⁻', limit: '0.9' },
      { id: 'fluoride', name: 'Fluoride (F)⁻', limit: '1.5' },
    ],
  },
  {
    category: 'C. CHEMICAL TESTS — METALS & CATIONS',
    parameters: [
      { id: 'sodium', name: 'Sodium (Na)⁺', limit: '200.0' },
      { id: 'potassium', name: 'Potassium (K)⁺', limit: '50.0' },
      { id: 'calcium', name: 'Calcium (Ca)²⁺', limit: '150.0' },
      { id: 'magnesium', name: 'Magnesium (Mg)²⁺', limit: '100.0' },
      { id: 'iron', name: 'Iron (Total) (Fe)³⁺', limit: '0.3' },
      { id: 'manganese', name: 'Manganese (Mn)²⁺', limit: '0.1' },
    ],
  },
  {
    category: 'D. GENERAL CHEMICAL PARAMETERS & HARDNESS',
    parameters: [
      { id: 'carbonate_hardness', name: 'Carbonate Hardness as, (CaCO₃)', limit: '-' },
      { id: 'non_carbonate_hardness', name: 'Non-Carbonate hardness as, (CaCO₃)', limit: '-' },
      { id: 'total_hardness', name: 'Total Hardness as, (CaCO₃)', limit: '300.0' },
      { id: 'silica', name: 'Silica (SiO₂)', limit: '-' },
      { id: 'oxygen_absorbed', name: 'Oxygen absorbed. 4 hr. at 27°C (P.V.)', limit: '1.0' },
      { id: 'tds', name: 'Total Dissolved Solids, residue dried at 180°C', limit: '1000.0' },
      { id: 'ammonia', name: 'Ammonia', limit: '0.5' },
    ],
  },
];

export const WATER_TEST_PARAMETER_COUNT = WATER_TEST_GROUPS.reduce((sum, group) => sum + group.parameters.length, 0);

/** What the officer may report a result as. '' means not yet reported. */
export const WATER_REPORT_OPTIONS = ['-', 'Acceptable', 'AAL'] as const;
export type WaterReport = (typeof WATER_REPORT_OPTIONS)[number];

export interface WaterTestEntry {
  result: string;
  report: string;
}

export interface WaterTestResults {
  results: Record<string, WaterTestEntry>;
  remarks?: string;
}

const toNumber = (value: string) => {
  const parsed = Number(value.trim().replace(/,/g, ''));
  return value.trim() !== '' && Number.isFinite(parsed) ? parsed : null;
};

/**
 * A starting point for the Report column, so the officer does not have to compare
 * every result with its limit by hand. It only ever pre-fills; the officer can
 * change it, and nothing is suggested when the comparison is not clear.
 */
export const suggestReport = (result: string, limit: string): WaterReport | '' => {
  const text = result.trim();
  if (!text) return '';
  if (limit === '-') return '-';
  const range = limit.match(/^(-?\d+(?:\.\d+)?)\s*-\s*(-?\d+(?:\.\d+)?)$/);
  const value = toNumber(text);
  if (/^(bdl|not detected|nil|absent)$/i.test(text)) return 'Acceptable';
  if (value === null) return '';
  if (range) return value >= Number(range[1]) && value <= Number(range[2]) ? 'Acceptable' : 'AAL';
  const max = toNumber(limit);
  if (max === null) return '';
  return value <= max ? 'Acceptable' : 'AAL';
};

/**
 * The Report column of the certificate. It is worked out from the result and the limit; if the
 * officer chose a different value by hand, that choice wins and is flagged so it is never
 * overwritten silently. When the result cannot be compared with the limit (free text, or no
 * result), the officer's choice is used.
 */
export const certificateReport = (
  result: string,
  limit: string,
  stored: string,
): { value: string; overridden: boolean } => {
  if (!result.trim()) return { value: stored, overridden: false };
  const computed = suggestReport(result, limit);
  if (!computed) return { value: stored || '-', overridden: false };
  if (stored && stored !== computed) return { value: stored, overridden: true };
  return { value: computed, overridden: false };
};
