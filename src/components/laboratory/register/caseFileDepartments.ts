import { FoodDrugIntake, NarcoticsIntake, WaterIntake } from '../../../types';
import { NARCOTICS_STATUS_TONE } from '../../../narcoticsIntake';
import { RegisterColumns, RegisterRow, RegisterStatus, TURNAROUND_DAYS, daysSince } from './types';

/* ---------------------------------------------------------------------------
 * The departments whose case files the Super Admin reviews. Each entry is the
 * department's own process (its stages, in order) and how its records read on
 * the case register. The sidebar's Case files menu, the case registry overview
 * and the registers all come from this list, and only list a department once
 * it has case files. A new department appears everywhere by adding its entry.
 * --------------------------------------------------------------------------- */

/** Every department's records, as loaded in App. */
export interface CaseFileSources {
  water: WaterIntake[];
  food: FoodDrugIntake[];
  narcotics: NarcoticsIntake[];
}

export interface CaseFileDepartment {
  /** Used in the sidebar as `case-file:<id>`. */
  id: string;
  /** Short name for the menu and tabs. */
  label: string;
  /** The laboratory's name on its register and the printed copy. */
  laboratory: string;
  unit: 'exhibit' | 'sample';
  /** The department's process, in order; closed stages no longer count against turnaround. */
  stages: RegisterStatus<string>[];
  columns: RegisterColumns;
  searchPlaceholder: string;
  /** The department's records as register rows; `open` opens one record's case file. */
  rows: (sources: CaseFileSources, open: (recordId: string) => void) => RegisterRow<string>[];
}

export const CASE_FILE_DEPARTMENTS: CaseFileDepartment[] = [
  {
    id: 'water',
    label: 'Water & Environment',
    laboratory: 'Water & Environment',
    unit: 'exhibit',
    stages: [
      { value: 'Awaiting Approval', tone: 'rose', hint: 'Intake documents need the Head’s approval' },
      { value: 'Awaiting Assignment', tone: 'teal', hint: 'Not yet allocated to an analysis officer' },
      { value: 'Under Analysis', tone: 'sky', hint: 'With the analysis officer' },
      { value: 'Analysis Complete', tone: 'emerald', hint: 'Findings recorded; certificate and memo follow', closed: true },
    ],
    columns: { reference: 'Lab reference', party: 'Sender', subject: 'Test requested', officer: 'Analysis officer' },
    searchPlaceholder: 'Search reference, sender, officer…',
    rows: (sources, open) =>
      sources.water.map((intake) => ({
        key: intake.id,
        reference: intake.labReference,
        secondaryRef: intake.exhibitId,
        received: intake.dateReceived,
        party: intake.senderName,
        partySub: intake.senderType,
        subject: intake.testType,
        subjectSub: intake.sourceType,
        officer: intake.analysisOfficer,
        status: intake.status,
        onOpen: () => open(intake.id),
      })),
  },
  {
    id: 'food',
    label: 'Food & Drugs',
    laboratory: 'Foods, Drugs & Chemical Substances',
    unit: 'sample',
    stages: [
      { value: 'Awaiting Approval', tone: 'rose', hint: 'Intake documents need the Head’s approval' },
      { value: 'Awaiting Assignment', tone: 'teal', hint: 'Not yet allocated to an analyst' },
      { value: 'Under Analysis', tone: 'sky', hint: 'With the analyst' },
      { value: 'Reported', tone: 'emerald', hint: 'Certificate of analysis issued', closed: true },
    ],
    columns: { reference: 'Sample no.', party: 'Client', subject: 'Sample type', officer: 'Analyst' },
    searchPlaceholder: 'Search sample no., client, analyst…',
    rows: (sources, open) =>
      sources.food.map((intake) => ({
        key: intake.id,
        reference: intake.id,
        secondaryRef: intake.exhibitId,
        received: intake.intakeDate,
        party: intake.clientName,
        subject: intake.sampleType,
        subjectSub: intake.worksheetStatus ? `Worksheet: ${intake.worksheetStatus}` : intake.receiptFormSaved ? 'Receipt form saved' : 'No receipt form yet',
        officer: intake.analystAssigned,
        status: intake.status,
        onOpen: () => open(intake.id),
      })),
  },
  {
    id: 'narcotics',
    label: 'Narcotics',
    laboratory: 'Narcotics',
    unit: 'exhibit',
    stages: [
      { value: 'Awaiting Assignment', tone: NARCOTICS_STATUS_TONE['Awaiting Assignment'], hint: 'Not yet allocated to an analysis officer' },
      { value: 'Under Analysis', tone: NARCOTICS_STATUS_TONE['Under Analysis'], hint: 'With the analysis officer, writing the Draft Report of Analysis' },
      {
        value: 'Analysis Complete',
        tone: NARCOTICS_STATUS_TONE['Analysis Complete'],
        hint: 'Draft report submitted; the Head approves it, the Report of Government Analyst and the memo',
        closed: true,
      },
    ],
    columns: { reference: 'Lab reference', party: 'Police station', subject: 'Exhibit', officer: 'Analysis officer' },
    searchPlaceholder: 'Search K-number, CR, station, officer…',
    rows: (sources, open) =>
      sources.narcotics.map((intake) => ({
        key: intake.id,
        reference: intake.labReference,
        secondaryRef: intake.crNumber,
        received: intake.dateReceived,
        party: intake.policeStation,
        partySub: intake.officerName,
        subject: intake.exhibitType,
        subjectSub: intake.memoApprovedDate ? 'Memo approved' : `${intake.numberOfItems} · ${intake.packaging}`,
        officer: intake.analysisOfficer,
        status: intake.status,
        onOpen: () => open(intake.id),
      })),
  },
];

/** One department's register, worked out from its records. */
export interface CaseFileRegister {
  department: CaseFileDepartment;
  rows: RegisterRow<string>[];
  total: number;
  /** Files not yet at a closed stage. */
  open: number;
  /** Open files past the turnaround time. */
  overdue: number;
  /** Files at each stage, in the department's order. */
  stageCounts: { stage: RegisterStatus<string>; count: number }[];
}

/**
 * The departments that have case files, in registry order, each with its rows and counts.
 * Departments without a single file are left out, so the menu only shows those in use.
 */
export const caseFileRegisters = (
  sources: CaseFileSources,
  open: (departmentId: string, recordId: string) => void,
): CaseFileRegister[] =>
  CASE_FILE_DEPARTMENTS.map((department) => {
    const rows = department.rows(sources, (recordId) => open(department.id, recordId));
    const closed = new Set(department.stages.filter((stage) => stage.closed).map((stage) => stage.value));
    const openRows = rows.filter((row) => !closed.has(row.status));
    return {
      department,
      rows,
      total: rows.length,
      open: openRows.length,
      overdue: openRows.filter((row) => {
        const age = daysSince(row.received);
        return age !== null && age > TURNAROUND_DAYS;
      }).length,
      stageCounts: department.stages.map((stage) => ({ stage, count: rows.filter((row) => row.status === stage.value).length })),
    };
  }).filter((register) => register.total > 0);
