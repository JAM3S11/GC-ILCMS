import React, { useState } from 'react';
import { FoodDrugIntake, User } from '../../types';
import { WorkAllocationViewer } from './WorkAllocationForm';
import { SampleReceiptFormSection } from './SampleReceiptFormSection';
import { LaboratoryWorksheetSection } from './LaboratoryWorksheetSection';
import { DraftReportSection } from './DraftReportSection';
import { WorkAllocationStep } from './WorkAllocationStep';
import { openCaseStep } from './CaseStep';
import { CaseFileContents, CaseFileContentsSection } from './CaseFileContents';
import { FoodDrugCaseHeader } from './FoodDrugCaseHeader';

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

  // The file's contents page, from what the register already knows about the sample.
  const worksheet = intake.worksheetStatus;
  const reported = intake.status === 'Reported';
  const contents: CaseFileContentsSection[] = [
    {
      id: 'work-allocation',
      number: 1,
      title: 'Work allocation',
      state: intake.analystId ? 'done' : 'current',
      note: intake.analystAssigned ? `Allocated to ${intake.analystAssigned}` : 'Awaiting allocation',
    },
    {
      id: 'receipt-form',
      number: 2,
      title: 'Sample receipt form',
      state: intake.receiptFormSaved ? 'done' : intake.analystId ? 'current' : 'pending',
      note: intake.receiptFormSaved ? 'Saved' : undefined,
    },
    {
      id: 'laboratory-worksheet',
      number: 3,
      title: 'Laboratory worksheet',
      state: worksheet === 'Checked' ? 'done' : worksheet ? 'current' : 'pending',
      note: worksheet === 'Checked' ? 'Checked by the Head' : worksheet ?? undefined,
    },
    {
      id: 'draft-reports',
      number: 4,
      title: 'Certificate of analysis',
      state: reported ? 'done' : worksheet === 'Checked' ? 'current' : 'pending',
      note: reported ? 'Reported' : worksheet === 'Checked' ? 'Drafting' : undefined,
    },
  ];

  return (
    <div className="w-full space-y-4 px-4 py-4 sm:px-6 xl:px-8">
      <FoodDrugCaseHeader
        intake={intake}
        currentUser={currentUser}
        sections={contents}
        onBack={onBack}
        onSelectSection={openCaseStep}
        onViewAllocation={intake.analystId && (isHead || isAssigned) ? () => setViewingAllocation(true) : undefined}
      />

      <div className="grid items-start gap-4 lg:grid-cols-[15rem_minmax(0,1fr)]">
        <CaseFileContents
          className="hidden lg:sticky lg:top-4 lg:block"
          reference={intake.id}
          register="Foods, Drugs & Chemical Substances"
          sections={contents}
          onSelect={openCaseStep}
        />

        <div className="min-w-0 space-y-4">
          <WorkAllocationStep intake={intake} canView={isHead || isAssigned} onView={() => setViewingAllocation(true)} />

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
        </div>
      </div>

      {viewingAllocation && (
        <WorkAllocationViewer recordType="FOOD_DRUG_INTAKE" recordId={intake.id} onClose={() => setViewingAllocation(false)} />
      )}
    </div>
  );
};
