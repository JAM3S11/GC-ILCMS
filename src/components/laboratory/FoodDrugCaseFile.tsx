import React, { useState } from 'react';
import { ClipboardSignature } from 'lucide-react';
import { FoodDrugIntake, User } from '../../types';
import { WorkAllocationViewer } from './WorkAllocationForm';
import { SampleReceiptFormSection } from './SampleReceiptFormSection';
import { LaboratoryWorksheetSection } from './LaboratoryWorksheetSection';
import { DraftReportSection } from './DraftReportSection';
import { WorkAllocationStep } from './WorkAllocationStep';
import { openCaseStep } from './CaseStep';
import { CaseFileLayout, CaseFileSectionLink } from './CaseFileLayout';
import { FOOD_DRUG_STATUS_TONE, displayName, foodDrugNextStep, formatDate } from './foodDrugCaseFlow';

interface FoodDrugCaseFileProps {
  intake: FoodDrugIntake;
  currentUser: Pick<User, 'id' | 'name' | 'role'>;
  onBack: () => void;
  /** Called after the worksheet is submitted or checked, so the register refreshes. */
  onChanged?: () => void;
}

/**
 * The Food & Drugs case file an analyst opens to work a sample: the analytical
 * sample receipt form (sender and submitter come from reception and are read
 * only), then the laboratory worksheet the analyst submits and the Head checks.
 */
export const FoodDrugCaseFile: React.FC<FoodDrugCaseFileProps> = ({ intake, currentUser, onBack, onChanged }) => {
  const [viewingAllocation, setViewingAllocation] = useState(false);
  // Changes when the receipt form is saved, so the worksheet re-reads the sample description.
  const [receiptVersion, setReceiptVersion] = useState('');
  // Changes when the worksheet is submitted or checked, so the draft reports re-read it.
  const [worksheetVersion, setWorksheetVersion] = useState('');

  const isHead = currentUser.role === 'HEAD_OF_DEPARTMENT';
  const isAssigned = !!intake.analystId && intake.analystId === currentUser.id;
  const canViewAllocation = !!intake.analystId && (isHead || isAssigned);

  // The steps on this page, from what the register already knows about the sample.
  const worksheet = intake.worksheetStatus;
  const reported = intake.status === 'Reported';
  const sections: CaseFileSectionLink[] = [
    { id: 'work-allocation', title: 'Allocation form', state: intake.analystId ? 'done' : 'current' },
    { id: 'receipt-form', title: 'Sample receipt form', state: intake.receiptFormSaved ? 'done' : intake.analystId ? 'current' : 'pending' },
    { id: 'laboratory-worksheet', title: 'Laboratory worksheet', state: worksheet === 'Checked' ? 'done' : intake.receiptFormSaved ? 'current' : 'pending' },
    { id: 'draft-reports', title: 'Certificate of analysis', state: reported ? 'done' : worksheet === 'Checked' ? 'current' : 'pending' },
  ];
  const analystName = displayName(intake.analystAssigned);

  return (
    <CaseFileLayout
      back={{ label: 'Exhibit Laboratory', onClick: onBack }}
      reference={intake.id}
      status={{ label: intake.status, tone: FOOD_DRUG_STATUS_TONE[intake.status] }}
      subtitle={[`${intake.sampleType} sample`, displayName(intake.clientName), 'Foods, Drugs & Chemical Substances']}
      next={foodDrugNextStep(intake, isHead, isAssigned)}
      receivedDate={intake.intakeDate}
      finishedDate={intake.reportedDate}
      more={canViewAllocation ? [{ label: isHead ? 'Allocation form' : 'Allocation form (copy)', icon: ClipboardSignature, onClick: () => setViewingAllocation(true) }] : []}
      details={[
        { label: 'Exhibit', value: intake.exhibitId, mono: true, copy: intake.exhibitId },
        { label: 'Client', value: displayName(intake.clientName) },
        { label: 'Received', value: `${formatDate(intake.intakeDate)}${intake.receiver ? ` · ${displayName(intake.receiver)}` : ''}` },
        { label: 'Analyst', value: intake.analystId ? `${analystName}${isAssigned ? ' (you)' : ''}` : 'Not yet allocated' },
        { label: 'Seal', value: intake.sealNumber, mono: true, copy: intake.sealNumber },
      ]}
      sections={sections}
    >
      <WorkAllocationStep intake={intake} canView={canViewAllocation} onView={() => setViewingAllocation(true)} />

      <SampleReceiptFormSection
        intake={intake}
        currentUser={currentUser}
        onSaved={(saved) => setReceiptVersion(saved.updatedAt ?? String(Date.now()))}
        onCreateWorksheet={() => openCaseStep('laboratory-worksheet')}
      />

      <LaboratoryWorksheetSection
        intake={intake}
        currentUser={currentUser}
        receiptVersion={receiptVersion}
        onChanged={() => {
          setWorksheetVersion(String(Date.now()));
          onChanged?.();
        }}
        onCreateDraftReports={() => openCaseStep('draft-reports')}
      />

      <DraftReportSection intake={intake} currentUser={currentUser} worksheetVersion={worksheetVersion} onChanged={onChanged} />

      {viewingAllocation && (
        <WorkAllocationViewer recordType="FOOD_DRUG_INTAKE" recordId={intake.id} onClose={() => setViewingAllocation(false)} />
      )}
    </CaseFileLayout>
  );
};
