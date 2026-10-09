import React from 'react';
import { FoodDrugIntake, FoodDrugIntakeStatus, WaterIntake, WaterIntakeStatus } from '../../types';
import { SegmentedControl } from '../common/Dashboard';
import { CaseRegister } from './register/CaseRegister';
import { RegisterStatus } from './register/types';

/**
 * Every exhibit case file in a laboratory, laid out as the laboratory's official
 * case register, for oversight roles that are not tied to one officer's queue.
 * Opening a row shows the same case file the assigned officer works in.
 */

interface ExhibitCaseFileIndexProps {
  intakes: WaterIntake[];
  isLoading?: boolean;
  error?: string;
  onOpenCaseFile: (intake: WaterIntake) => void;
  /** Food & Drugs samples; when given, the page offers a laboratory switch. */
  foodDrugIntakes?: FoodDrugIntake[];
  foodDrugLoading?: boolean;
  onOpenFoodDrugCaseFile?: (intake: FoodDrugIntake) => void;
  laboratory?: Laboratory;
  onLaboratoryChange?: (laboratory: Laboratory) => void;
}

export type Laboratory = 'water' | 'food';

const WATER_STATUSES: RegisterStatus<WaterIntakeStatus>[] = [
  { value: 'Awaiting Approval', tone: 'rose', hint: 'Intake documents need the Head’s approval' },
  { value: 'Awaiting Assignment', tone: 'amber', hint: 'Not yet allocated to an analysis officer' },
  { value: 'Under Analysis', tone: 'sky', hint: 'With the analysis officer' },
  { value: 'Analysis Complete', tone: 'emerald', hint: 'Findings recorded; memo to follow', closed: true },
];

const FOOD_STATUSES: RegisterStatus<FoodDrugIntakeStatus>[] = [
  { value: 'Awaiting Approval', tone: 'rose', hint: 'Intake documents need the Head’s approval' },
  { value: 'Awaiting Assignment', tone: 'amber', hint: 'Not yet allocated to an analyst' },
  { value: 'Under Analysis', tone: 'sky', hint: 'With the analyst' },
  { value: 'Reported', tone: 'emerald', hint: 'Certificate of analysis issued', closed: true },
];

export const ExhibitCaseFileIndex: React.FC<ExhibitCaseFileIndexProps> = ({
  intakes,
  isLoading = false,
  error = '',
  onOpenCaseFile,
  foodDrugIntakes,
  foodDrugLoading = false,
  onOpenFoodDrugCaseFile,
  laboratory = 'water',
  onLaboratoryChange,
}) => {
  const isFood = laboratory === 'food' && !!foodDrugIntakes;

  const labSwitch = foodDrugIntakes && onLaboratoryChange && (
    <SegmentedControl
      ariaLabel="Laboratory register"
      value={laboratory}
      onChange={onLaboratoryChange}
      options={[
        { value: 'water', label: 'Water & Environment', count: intakes.length },
        { value: 'food', label: 'Food & Drugs', count: foodDrugIntakes.length },
      ]}
    />
  );

  if (isFood) {
    return (
      <CaseRegister
        key="food"
        laboratory="Foods, Drugs & Chemical Substances"
        unit="sample"
        headerActions={labSwitch}
        statuses={FOOD_STATUSES}
        isLoading={foodDrugLoading}
        columns={{ reference: 'Sample no.', party: 'Client', subject: 'Sample type', officer: 'Analyst' }}
        searchPlaceholder="Search sample no., client, analyst…"
        rows={(foodDrugIntakes ?? []).map((intake) => ({
          key: intake.id,
          reference: intake.id,
          secondaryRef: intake.exhibitId,
          received: intake.intakeDate,
          party: intake.clientName,
          subject: intake.sampleType,
          subjectSub: intake.worksheetStatus ? `Worksheet: ${intake.worksheetStatus}` : intake.receiptFormSaved ? 'Receipt form saved' : 'No receipt form yet',
          officer: intake.analystAssigned,
          status: intake.status,
          onOpen: () => onOpenFoodDrugCaseFile?.(intake),
        }))}
      />
    );
  }

  return (
    <CaseRegister
      key="water"
      laboratory="Water & Environment"
      unit="exhibit"
      headerActions={labSwitch}
      statuses={WATER_STATUSES}
      isLoading={isLoading}
      error={error}
      columns={{ reference: 'Lab reference', party: 'Sender', subject: 'Test requested', officer: 'Analysis officer' }}
      searchPlaceholder="Search reference, sender, officer…"
      rows={intakes.map((intake) => ({
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
        onOpen: () => onOpenCaseFile(intake),
      }))}
    />
  );
};
