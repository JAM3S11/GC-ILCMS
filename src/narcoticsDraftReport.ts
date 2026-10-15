import { NarcoticsIntake } from './types';

/**
 * Draft Report of Analysis (Cannabis): the fixed template printed on the paper
 * form (docs/cannabis-draft-report.jpeg), the result options offered for each
 * test, and the auto-fill from the Narcotics intake. The procedure wording is
 * copied exactly from the paper form and is not editable.
 * `server.js` keeps its own copy of the result keys; the two must stay in step.
 */

export type CannabisResultKey =
  | 'seedsLeavesStalks'
  | 'odour'
  | 'trichomeStalks'
  | 'cystolithicTrichomes'
  | 'colorimetric'
  | 'uvVis'
  | 'gcms';

export type CannabisResults = Record<CannabisResultKey, string>;

/** 1. PHYSICAL TESTS, row by row as on the paper form. Rows without a key carry no result. */
export const PHYSICAL_ROWS: { key?: CannabisResultKey; label: string; marker?: string }[] = [
  { key: 'seedsLeavesStalks', label: 'Seeds,leaves and stalks' },
  { key: 'odour', label: 'Odour: characteristic bhang smell' },
  { label: 'Microscopic examination:' },
  { key: 'trichomeStalks', marker: '(i)', label: 'Stalks of multicellular trichomes' },
  { key: 'cystolithicTrichomes', marker: '(ii)', label: 'Cystolithic and non chystolithic trichomes' },
];

/** 2. CHEMICAL TESTS, with the numbered procedure steps printed on the paper form. */
export const CHEMICAL_TESTS: { key: CannabisResultKey; letter: string; title: string; steps: string[] }[] = [
  {
    key: 'colorimetric',
    letter: 'a)',
    title: 'Colorimetric Test',
    steps: [
      'Put about 0.1 grams of the sample to be tested in a test tube.',
      'add about 0.5 grams of Fast Blue B salt.',
      'add 25 drops of chloroform and shake for 2 mins.',
      'Finally,add 50 drops of 0.1 N NaOH and shake for 2 mins',
    ],
  },
  {
    key: 'uvVis',
    letter: 'b)',
    title: 'UV/Visible Spectrophotometry',
    steps: [
      'To about 1 gram of plant material, add 2ml of hexane and shake/vortex for 2 mins.',
      'Add 2ml 0.1N sulphuric acid and shake/vortex for 2mins',
      'Collect the aqueous layer for analysis of basic compounds.',
      'To the organic layer add 2ml 0.1N Sodium hydroxide and shake/vortex for 2 mins.',
      'Collect the aqueous layer for analysis of acidic compounds.',
      'Evaporate the organic layer to near dryness and reconstitute with ethanol for analysis of neutral compounds.',
    ],
  },
  {
    key: 'gcms',
    letter: 'c)',
    title: 'Gas Chromatography/Mass Spectrophotometry (GC/MS)',
    steps: [
      'To about 1 gram of plant material, add 2ml of hexane.',
      'Add 2ml of ethyl acetate and shake or vortex for 2 mins.',
      'Collect the upper hexane layer, evaporate to near dryness.',
      'Reconstitute with 1ml of dichloromethane, and run in the GC/MS.',
    ],
  },
];

export const ROMAN = ['i)', 'ii)', 'iii)', 'iv)', 'v)', 'vi)', 'vii)', 'viii)'];

const PHYSICAL_OPTIONS = ['Present', 'Absent', 'Positive', 'Negative'];

/** Common answers per test; every result can also be typed freely. */
export const RESULT_OPTIONS: Record<CannabisResultKey, string[]> = {
  seedsLeavesStalks: PHYSICAL_OPTIONS,
  odour: PHYSICAL_OPTIONS,
  trichomeStalks: PHYSICAL_OPTIONS,
  cystolithicTrichomes: PHYSICAL_OPTIONS,
  colorimetric: ['Pink color', 'No pink color', 'Positive', 'Negative'],
  uvVis: [
    'Wavelength of maximum absorption at 278 ± 5 nm for neutral compounds',
    'No absorption maximum at 278 ± 5 nm',
    'Positive',
    'Negative',
  ],
  gcms: [
    'Presence of DELTA-9-tetrahydrocannabinol',
    'Absence of DELTA-9-tetrahydrocannabinol',
    'Positive',
    'Negative',
  ],
};

/** Defaults: blank physical results, and the usual positive chemical results. */
export const DEFAULT_RESULTS: CannabisResults = {
  seedsLeavesStalks: '',
  odour: '',
  trichomeStalks: '',
  cystolithicTrichomes: '',
  colorimetric: 'Pink color',
  uvVis: 'Wavelength of maximum absorption at 278 ± 5 nm for neutral compounds',
  gcms: 'Presence of DELTA-9-tetrahydrocannabinol',
};

export const RESULT_LABELS: Record<CannabisResultKey, string> = {
  seedsLeavesStalks: 'Seeds, leaves and stalks',
  odour: 'Odour: characteristic bhang smell',
  trichomeStalks: 'Microscopic (i) stalks of multicellular trichomes',
  cystolithicTrichomes: 'Microscopic (ii) cystolithic and non-cystolithic trichomes',
  colorimetric: 'a) Colorimetric test',
  uvVis: 'b) UV/Visible spectrophotometry',
  gcms: 'c) GC/MS',
};

/** Everything on the report the officer fills in. */
export interface CannabisDraftReportFields {
  sampleKNo: string;
  dateReceived: string;
  submittedBy: string;
  dateAnalysed: string;
  envelopeMarked: string;
  policeStation: string;
  crNumber: string;
  accused: string;
  containing: string;
  results: CannabisResults;
  quantity: string;
  gckNo: string;
}

/** Filled in from the exhibit's intake and findings; everything stays editable. */
export const cannabisPrefill = (intake: NarcoticsIntake): CannabisDraftReportFields => ({
  sampleKNo: intake.labReference,
  dateReceived: intake.dateReceived,
  submittedBy: [intake.officerName, intake.badgeNumber && `No. ${intake.badgeNumber}`, intake.policeStation].filter(Boolean).join(', '),
  dateAnalysed: intake.findingsRecordedAt?.slice(0, 10) ?? '',
  envelopeMarked: intake.markings ?? '',
  policeStation: intake.policeStation.replace(/\s*police station\s*$/i, ''),
  crNumber: intake.crNumber,
  accused: '',
  containing: intake.description,
  results: { ...DEFAULT_RESULTS },
  quantity: intake.netWeight ?? intake.declaredWeight ?? '',
  gckNo: '',
});
