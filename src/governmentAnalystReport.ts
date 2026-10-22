import { CannabisResults } from './narcoticsDraftReport';

/**
 * Report of Government Analyst (Narcotics): the final report printed once the Head of Narcotics
 * approves it (docs/government-analyst-report.png). The server sends the raw values (live from the
 * approved Draft Report of Analysis until approval, then the stored snapshot); everything printed is
 * worked out from them here, so the preview and the locked report always format the same way.
 */

export interface ReportOfficer {
  fullName: string;
  qualification: string;
  /** Set on the officer's profile; blank falls back to the initials of the name. */
  initials: string;
}

export interface GovernmentAnalystReportSource {
  sampleKNo: string;
  crNumber: string;
  dateReceived: string;
  submittedBy: string;
  envelopeMarked: string;
  policeStation: string;
  accused: string;
  containing: string;
  results: Partial<CannabisResults>;
  gckNo: string;
  analystSignature?: string | null;
  analyst: ReportOfficer;
  /** The officer who received the exhibit at the Narcotics desk. */
  receiver: ReportOfficer;
  /** The Head of Narcotics who approves the report. */
  approver: ReportOfficer;
}

/** Everything printed on the report. */
export interface GovernmentAnalystReportData {
  approvalDate: DateParts;
  reportRef: string;
  crNo: string;
  analystFullName: string;
  analystQualification: string;
  dateReceived: DateParts | null;
  submittedBy: string;
  itemDescription: string;
  testMethods: string[];
  findings: string;
  gckNo: string;
  signatoryName: string;
  analystSignature?: string | null;
  refInitials: string;
}

/** A date as printed: day "06" with its suffix "th" set in superscript, then "October, 2026". */
export interface DateParts {
  day: string;
  suffix: string;
  monthYear: string;
}

const MONTHS = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

const suffixOf = (day: number) => {
  if (day % 100 >= 11 && day % 100 <= 13) return 'th';
  return ({ 1: 'st', 2: 'nd', 3: 'rd' } as Record<number, string>)[day % 10] ?? 'th';
};

/** 2026-10-06 -> { day: '06', suffix: 'th', monthYear: 'October, 2026' }; null when there is no date. */
export const dateParts = (value: string | null | undefined): DateParts | null => {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value ?? '');
  if (!match) return null;
  const day = Number(match[3]);
  return { day: match[3], suffix: suffixOf(day), monthYear: `${MONTHS[Number(match[2]) - 1]}, ${match[1]}` };
};

/** Today in Nairobi as YYYY-MM-DD: the date a report approved now would carry. */
export const nairobiToday = () =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi', year: 'numeric', month: '2-digit', day: '2-digit' }).format(new Date());

const words = (name: string) => name.trim().split(/\s+/).filter(Boolean);

/** "VGM" from the profile, or from "Vivian Gacheri Mpekethu" when the profile has none. */
export const officerInitials = (officer: ReportOfficer) =>
  (officer.initials.trim() || words(officer.fullName).map((word) => word.replace(/[^A-Za-z]/g, '').charAt(0)).join('')).toUpperCase();

/** "Vivian Gacheri Mpekethu" -> "V.G.MPEKETHU": initials of the given names, then the surname. */
export const signatoryName = (fullName: string) => {
  const parts = words(fullName);
  if (!parts.length) return '';
  const surname = parts[parts.length - 1].toUpperCase();
  const given = parts.slice(0, -1).map((part) => `${part.charAt(0).toUpperCase()}.`).join('');
  return `${given}${surname}`;
};

/** "3209/26" -> "K3209/26"; a number already starting with K is kept as it is. */
export const reportReference = (sampleKNo: string) => {
  const value = sampleKNo.trim();
  return !value || /^K/i.test(value) ? value : `K${value}`;
};

/** "273/105/2026" -> "CR: 273/105/2026". */
export const crReference = (crNumber: string) => {
  const value = crNumber.trim().replace(/^CR\s*(no\.?)?\s*:?\s*/i, '');
  return value ? `CR: ${value}` : '';
};

/** "3209/26" + "VGM" -> "GCK 3209/26 VGM", without doubling a "GCK" already written on the draft. */
export const gckMark = (gckNo: string, initials: string) => {
  const number = gckNo.trim().replace(/^G\.?\s*C\.?\s*K\.?\s*/i, '');
  return [number && 'GCK', number, initials].filter(Boolean).join(' ');
};

/** The tests on the draft that were done, under the names the final report uses. */
const TEST_METHODS: { key: keyof CannabisResults; name: string }[] = [
  { key: 'colorimetric', name: 'Fast Blue B Salt Test' },
  { key: 'uvVis', name: 'UV-Visible Spectroscopy' },
  { key: 'gcms', name: 'Gas Chromatography Mass Spectrometry' },
];
export const testMethods = (results: Partial<CannabisResults>) =>
  TEST_METHODS.filter(({ key }) => {
    const value = results[key]?.trim() ?? '';
    return value && !/^(not done|n\/?a|—|-)$/i.test(value);
  }).map(({ name }) => name);

export const CANNABIS_FINDINGS =
  'The plant material was examined and found to be Cannabis, which is listed under the Narcotic Drugs and Psychotropic Substances (Control) Act.';

/** The usual cannabis conclusion when GC/MS found delta-9-THC; otherwise left for the Head to write. */
export const defaultFindings = (results: Partial<CannabisResults>) =>
  /presence of delta-?9|delta-?9-?thc|^positive$/i.test(results.gcms?.trim() ?? '') ? CANNABIS_FINDINGS : '';

/** "A khaki envelope marked 'G', Githumu police station, Peter Gikonyo Wambui containing seven (7) rolls (3.40 grams) of plant material." */
export const itemDescription = (source: Pick<GovernmentAnalystReportSource, 'envelopeMarked' | 'policeStation' | 'accused' | 'containing'>) => {
  const marked = source.envelopeMarked.trim().replace(/^['‘’"]+|['‘’"]+$/g, '');
  const station = source.policeStation.trim().replace(/\s*police station\s*$/i, '');
  const accused = source.accused.split(/\r?\n/).map((name) => name.trim()).filter(Boolean).join(', ');
  const containing = source.containing.trim().replace(/\s*of plant material\.?\s*$/i, '').replace(/\.$/, '');
  return [
    `A khaki envelope marked ‘${marked}’`,
    station && `${station} police station`,
    `${accused}${accused ? ' ' : ''}containing ${containing} of plant material.`,
  ].filter(Boolean).join(', ');
};

/** Receiving / analysing / approving officers' initials, the last in lower case: "ABC/VGM/gn". */
export const referenceInitials = (source: Pick<GovernmentAnalystReportSource, 'receiver' | 'analyst' | 'approver'>) =>
  [officerInitials(source.receiver), officerInitials(source.analyst), officerInitials(source.approver).toLowerCase()]
    .filter(Boolean)
    .join('/');

/** Everything printed on the report, from its source values, the Findings and the approval date. */
export const buildGovernmentAnalystReport = (
  source: GovernmentAnalystReportSource,
  findings: string,
  approvalDate: string,
): GovernmentAnalystReportData => ({
  approvalDate: dateParts(approvalDate) ?? { day: '', suffix: '', monthYear: '' },
  reportRef: reportReference(source.sampleKNo),
  crNo: crReference(source.crNumber),
  analystFullName: source.analyst.fullName,
  analystQualification: source.analyst.qualification,
  dateReceived: dateParts(source.dateReceived),
  submittedBy: source.submittedBy.trim(),
  itemDescription: itemDescription(source),
  testMethods: testMethods(source.results),
  findings,
  gckNo: gckMark(source.gckNo, officerInitials(source.analyst)),
  signatoryName: signatoryName(source.analyst.fullName),
  analystSignature: source.analystSignature,
  refInitials: referenceInitials(source),
});
