import { FoodDrugIntake, FoodDrugIntakeStatus } from '../../types';
import { Tone } from '../common/Dashboard';
import { CaseStage, NextStep, caseStages } from './CaseFlow';

/* Where a Food & Drugs sample's case file stands, for the shared case-file layout. */

export const FOOD_DRUG_STATUS_TONE: Record<FoodDrugIntakeStatus, Tone> = {
  'Awaiting Approval': 'rose',
  'Awaiting Assignment': 'teal',
  'Under Analysis': 'sky',
  Reported: 'emerald',
};

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-07" → "7 Oct 2026"; anything else is shown as given. */
export const formatDate = (value?: string) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value ?? '—';
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
};

/** Names typed in capitals at reception ("GITHAIGA JAMES DANIEL") read as "Githaiga James Daniel". */
export const displayName = (name?: string) => {
  if (!name) return '';
  if (name !== name.toUpperCase()) return name;
  return name.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toUpperCase());
};

/** What has to happen next on the file, and who does it, phrased for the person viewing. */
export const foodDrugNextStep = (intake: FoodDrugIntake, isHead: boolean, isAssigned: boolean): NextStep => {
  const analyst = isAssigned ? 'You' : displayName(intake.analystAssigned) || 'The analyst';
  const head = isHead ? 'You' : 'The Head of Department';
  if (intake.status === 'Reported') {
    return {
      text: `Reported${intake.reportedDate ? ` on ${formatDate(intake.reportedDate)}` : ''}; the certificate of analysis is issued.`,
      action: { label: 'View certificate', target: 'draft-reports' },
      done: true,
    };
  }
  if (intake.status === 'Awaiting Approval') return { text: `${head} to approve the submitted documents from the register.` };
  if (!intake.analystId) return { text: `${head} to allocate an analyst from the register.`, action: { label: 'Go to allocation', target: 'work-allocation' } };
  if (!intake.receiptFormSaved) return { text: `${analyst} to fill in the sample receipt form.`, action: { label: 'Fill in receipt form', target: 'receipt-form' } };
  if (intake.worksheetStatus === 'Awaiting check') return { text: `${head} to check the laboratory worksheet.`, action: { label: 'Check worksheet', target: 'laboratory-worksheet' } };
  if (intake.worksheetStatus === 'Checked') {
    return {
      text: 'Worksheet checked. Prepare and approve the certificate of analysis, then mark the sample as reported.',
      action: { label: 'Go to certificate', target: 'draft-reports' },
    };
  }
  return {
    text: `${analyst} to ${intake.worksheetStatus === 'Draft' ? 'finish and submit' : 'start'} the laboratory worksheet.`,
    action: { label: intake.worksheetStatus === 'Draft' ? 'Finish worksheet' : 'Start worksheet', target: 'laboratory-worksheet' },
  };
};

/** The five stages every department's case file shares. */
export const foodDrugStages = (intake: FoodDrugIntake): CaseStage[] => {
  const worksheet = intake.worksheetStatus;
  const analysed = worksheet === 'Awaiting check' || worksheet === 'Checked';
  const reported = intake.status === 'Reported';
  return caseStages(
    [true, !!intake.analystId, analysed, worksheet === 'Checked', reported],
    [
      formatDate(intake.intakeDate),
      intake.analystId ? displayName(intake.analystAssigned) : 'Awaiting allocation',
      analysed ? 'Worksheet submitted' : !intake.receiptFormSaved ? 'Receipt form' : worksheet === 'Draft' ? 'Worksheet in draft' : 'Worksheet',
      worksheet === 'Checked' ? 'Worksheet checked' : worksheet === 'Awaiting check' ? 'Head to check worksheet' : undefined,
      reported ? `Reported ${formatDate(intake.reportedDate)}` : worksheet === 'Checked' ? 'Certificate in draft' : undefined,
    ],
    [undefined, 'work-allocation', 'laboratory-worksheet', 'laboratory-worksheet', 'draft-reports'],
  );
};
