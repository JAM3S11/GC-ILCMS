import React, { useState } from 'react';
import { ArrowLeft, ClipboardSignature } from 'lucide-react';
import { FoodDrugIntake, FoodDrugIntakeStatus, User } from '../../types';
import { Button, StatusPill, Tone } from '../common/Dashboard';
import { WorkAllocationViewer } from './WorkAllocationForm';
import { SampleReceiptFormSection } from './SampleReceiptFormSection';
import { LaboratoryWorksheetSection } from './LaboratoryWorksheetSection';
import { DraftReportSection } from './DraftReportSection';
import { WorkAllocationStep } from './WorkAllocationStep';
import { openCaseStep } from './CaseStep';

const STATUS_TONE: Record<FoodDrugIntakeStatus, Tone> = {
  'Awaiting Approval': 'rose',
  'Awaiting Assignment': 'amber',
  'Under Analysis': 'sky',
  Reported: 'emerald',
};

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

  return (
    <div className="w-full space-y-4 px-4 py-4 sm:px-6 xl:px-8">
      {/* Official file banner */}
      <header className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-white px-5 py-2 text-[11px] font-medium uppercase tracking-[0.14em] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
          <span>Government Chemist · Foods, Drugs &amp; Chemical Substances</span>
          <span>Sample case file</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-4 px-6 py-5">
          <div className="flex min-w-0 items-start gap-4">
            <button
              type="button"
              onClick={onBack}
              aria-label="Back to Exhibit Laboratory"
              title="Back to Exhibit Laboratory"
              className="mt-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
            <div className="min-w-0 space-y-2">
              <p className="font-mono text-[11px] font-medium uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">
                Exhibit {intake.exhibitId}
              </p>
              <h1 className="font-mono text-2xl font-semibold leading-tight text-slate-900 dark:text-white">{intake.id}</h1>
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
                <StatusPill tone={STATUS_TONE[intake.status]}>{intake.status}</StatusPill>
                <span className="text-sm text-slate-600 dark:text-slate-300">{intake.sampleType} sample</span>
              </div>
            </div>
          </div>
          {intake.analystId && (isHead || isAssigned) && (
            <Button icon={ClipboardSignature} onClick={() => setViewingAllocation(true)}>
              {isHead ? 'Allocation form' : 'Allocation form (copy)'}
            </Button>
          )}
        </div>
        <dl className="grid grid-cols-2 gap-px border-t border-slate-200 bg-slate-200 text-xs sm:grid-cols-4 dark:border-slate-800 dark:bg-slate-800">
          {[
            ['Client', intake.clientName],
            ['Received', `${intake.intakeDate} · ${intake.receiver}`],
            ['Analyst', intake.analystAssigned ?? 'Not yet allocated'],
            ['Seal number', intake.sealNumber ?? '—'],
          ].map(([label, value]) => (
            <div key={label} className="bg-white px-5 py-2.5 dark:bg-slate-900">
              <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</dt>
              <dd className="mt-0.5 truncate font-medium text-slate-900 dark:text-white" title={value}>{value}</dd>
            </div>
          ))}
        </dl>
      </header>

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

      {viewingAllocation && (
        <WorkAllocationViewer recordType="FOOD_DRUG_INTAKE" recordId={intake.id} onClose={() => setViewingAllocation(false)} />
      )}
    </div>
  );
};
