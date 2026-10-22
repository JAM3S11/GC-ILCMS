import React, { useEffect, useState } from 'react';
import {
  FlaskConical,
  PackageCheck,
  TestTube,
  User,
  UserCheck,
  Warehouse,
} from 'lucide-react';
import {
  ExhibitItem,
  FoodDrugIntake,
  FoodDrugIntakeStatus,
  FoodDrugSampleType,
  ForensicCase,
  LaboratoryDepartment,
  OfficerVisitor,
} from '../../types';
import {
  FOOD_DRUG_SAMPLE_TYPES,
  isValidPoBox,
} from '../../foodDrugIntake';
import { Tone } from '../common/Dashboard';
import { Field, Meta, inputCls } from './IntakeFormParts';
import { IntakeCheck, IntakeLayout, IntakeSection } from './IntakeLayout';
import { ReceptionClientDetails } from './ReceptionClientDetails';

/**
 * Food & Drugs sample registration. Registration ends at the Receiver; the
 * Head of Section assigns an officer and "Reported By" is recorded later from
 * the sample register, once analysis is done.
 */

export interface FoodDrugIntakeSubmission {
  caseNumber: string;
  submissionType: string;
  description: string;
  dateReceived: string;
  receivedFrom: string;
  receivedBy: string;
  department: LaboratoryDepartment;
  storageLocation: string;
  supportingDocuments: string;
  remarks: string;
  exhibits: ExhibitItem[];
  foodDrugIntake: FoodDrugIntake;
}

interface FoodDrugIntakePageProps {
  activeCase: ForensicCase;
  /** The visitor sent to Food & Drugs, or null while nobody has been sent. */
  visitor: OfficerVisitor | null;
  receivingAnalystName: string;
  /** Food & Drugs staff offered as suggestions for the Receiver field. */
  staffNames?: string[];
  /** Saves the sample; reject to keep the form open with the error shown. */
  onSaveIntake: (submission: FoodDrugIntakeSubmission) => void | Promise<unknown>;
  /** Live Food & Drugs register, for the "Recent registrations" list. */
  intakes?: FoodDrugIntake[];
  onCancel: () => void;
}

const FD_STORAGE_LOCATION = 'Food & Drugs Sample Store — Store R-01';

const SAMPLE_TYPE_INFO: Record<FoodDrugSampleType, { description: string; examples: string }> = {
  Aflatoxin: {
    description:
      'Testing for aflatoxins B1, B2, G1, G2 and M1, the toxins produced by Aspergillus moulds on stored crops.',
    examples: 'Maize, groundnuts, milk, animal feed',
  },
  Miscellaneous: {
    description:
      'General analysis of foods, drugs and chemical substances that do not fall under the toxin panels.',
    examples: 'Drugs, cosmetics, additives, chemicals',
  },
  Mycotoxins: {
    description:
      'Testing for other fungal toxins, including ochratoxin A, fumonisins, zearalenone and deoxynivalenol (DON).',
    examples: 'Cereals, coffee, flour, beer',
  },
};

const STATUS_TONE: Record<FoodDrugIntakeStatus, Tone> = {
  'Awaiting Approval': 'rose',
  'Awaiting Assignment': 'teal',
  'Under Analysis': 'sky',
  Reported: 'emerald',
};

export const FoodDrugIntakePage: React.FC<FoodDrugIntakePageProps> = ({
  activeCase,
  visitor,
  receivingAnalystName,
  staffNames = [],
  onSaveIntake,
  onCancel,
  intakes = [],
}) => {
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  // Client details always come from the reception record and are read only.
  // Without a visitor sent to Food & Drugs they stay empty; only the P.O Box can
  // be typed, and only when reception left it empty. The sample details can be
  // filled in at any time, but registering waits for reception's notification.
  const reception = visitor && visitor.laboratory === 'Food & Drugs' ? visitor : null;
  const notified = !!reception?.labNotificationSentAt;
  const clientName = reception?.officerName ?? '';
  const [nationalId, setNationalId] = useState('');
  const [poBoxInput, setPoBoxInput] = useState('');
  const poBox = reception?.poBox?.trim() ? reception.poBox : poBoxInput;
  const [sampleType, setSampleType] = useState<FoodDrugSampleType | ''>('');
  const [receiver, setReceiver] = useState(receivingAnalystName);
  const [notes, setNotes] = useState('');

  // A different client clears what belonged to the previous one.
  useEffect(() => {
    setNationalId('');
    setPoBoxInput('');
    setNotes(reception ? reception.exhibitsPresented || reception.purposeOfVisit || '' : '');
  }, [reception?.id]);

  // The sample number is issued by the database when the record is saved.
  const nextId = 'Issued on save';
  const today = new Date().toISOString().split('T')[0];

  const checks: IntakeCheck[] = [
    { label: 'Client', value: clientName.trim(), ok: !!reception, section: 'intake-submitter' },
    // Reception already vetted the ID (it may be a passport number), so it only needs to be present.
    { label: 'National ID', value: reception ? (nationalId ? 'Recorded at reception' : '') : '', ok: !!reception && nationalId.trim() !== '', section: 'intake-submitter' },
    { label: 'P.O Box', value: poBox.trim(), ok: isValidPoBox(poBox), section: 'intake-submitter' },
    { label: 'Lab notified', value: notified ? 'Yes' : 'Not yet', ok: notified, section: 'intake-submitter' },
    { label: 'Sample type', value: sampleType, ok: sampleType !== '', section: 'intake-sample' },
    { label: 'Receiver', value: receiver.trim(), ok: receiver.trim() !== '', section: 'intake-receipt' },
  ];
  const doneCount = checks.filter((c) => c.ok).length;
  const canSubmit = doneCount === checks.length;
  const poBoxInvalid = poBox.trim() !== '' && !isValidPoBox(poBox);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !reception || !sampleType || saving) return;

    const exhibitId = `EXH-${String(activeCase.exhibits.length + 1).padStart(4, '0')}`;
    const name = clientName.trim();
    const box = poBox.trim();
    const receivedBy = receiver.trim();
    const receivedFrom = `${name} (${box})`;
    const description = notes.trim() || `${sampleType} sample submitted by ${name} (${box}).`;

    const exhibit: ExhibitItem = {
      id: exhibitId,
      caseId: activeCase.id,
      description,
      submissionType: 'Regulatory Sample (Food & Drugs)',
      numberOfItems: 1,
      packaging: 'Food-grade Sealed Sample Container',
      sealNumber: `FD-SEAL-${Math.floor(100000 + Math.random() * 900000)}`,
      markings: `Marked "${nextId} / ${name}" on receipt`,
      condition: 'Intact & Sealed',
      storageLocation: FD_STORAGE_LOCATION,
      dateReceived: today,
      receivedFrom,
      receivedBy,
      laboratory: 'Food & Drugs',
      remarks: `Sample type: ${sampleType}. Awaiting officer assignment.`,
    };

    setSaving(true);
    setSaveError('');
    try {
    await onSaveIntake({
      caseNumber: activeCase.caseNumber,
      submissionType: 'Regulatory Sample (Food & Drugs)',
      description,
      dateReceived: today,
      receivedFrom,
      receivedBy,
      department: 'Food & Drugs',
      storageLocation: FD_STORAGE_LOCATION,
      supportingDocuments: reception.documentsPresented || '',
      remarks: `Sample type: ${sampleType}. Received by ${receivedBy}.`,
      exhibits: [exhibit],
      foodDrugIntake: {
        id: nextId,
        caseId: activeCase.id,
        exhibitId,
        clientName: name,
        nationalId,
        poBox: box,
        sampleType,
        receiver: receivedBy,
        intakeDate: today,
        status: 'Awaiting Approval',
      },
    });
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'The sample could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <IntakeLayout
      back={{ label: 'Back to laboratory', onClick: onCancel }}
      reference="Sample no. issued on save"
      status={{ label: 'New registration', tone: 'teal' }}
      subtitle={['Food & Drugs', receiver.trim() && `Received by ${receiver.trim()}`, today]}
      notice={
        reception && notified
          ? { tone: 'info', text: `Client details come from reception record ${reception.visitNumber}, registered by ${reception.receptionistName}, and cannot be edited here.` }
          : {
              tone: 'attention',
              text: 'No client has been sent to Food & Drugs yet. You can fill in the sample details now, but the sample can only be registered once reception has notified this laboratory.',
            }
      }
      sections={[
        { id: 'intake-submitter', title: 'Submitter' },
        { id: 'intake-sample', title: 'Sample' },
        { id: 'intake-receipt', title: 'Receipt' },
      ]}
      checks={checks}
      nextSteps={[
        { title: 'Registered', text: 'You add the record. The sample is stored as Awaiting Approval.' },
        { title: 'Documents approved', text: 'The Head of Section reviews and approves the submitted documents.' },
        { title: 'Officer assigned', text: 'The Head of Section assigns a Food & Drugs officer to analyse it.' },
        { title: 'Analysed and reported', text: 'After analysis, the officer records who reported the result.' },
      ]}
      recent={{
        title: 'Recent registrations',
        caption: `${intakes.length} in the register`,
        empty: 'No samples registered yet.',
        items: intakes.map((intake) => ({
          id: intake.id,
          primary: intake.clientName,
          secondary: `${intake.id} · ${intake.sampleType}`,
          status: { label: intake.status, tone: STATUS_TONE[intake.status] },
        })),
      }}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      submitLabel="Add record"
      saving={saving}
      canSubmit={canSubmit}
      error={saveError}
    >
      <IntakeSection
        id="intake-submitter"
        icon={User}
        title="Submitter"
        description="The person or organisation bringing the sample, as recorded at reception."
      >
        <ReceptionClientDetails
          visitor={reception}
          onNationalId={setNationalId}
          poBox={poBox}
          onPoBoxChange={setPoBoxInput}
          poBoxInvalid={poBoxInvalid}
        />
      </IntakeSection>

      <IntakeSection
        id="intake-sample"
        icon={TestTube}
        title="Sample"
        description="Choose the analysis category the sample is processed under."
      >
        {/* One full-width row per sample type */}
        <div
          className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 sm:col-span-2 dark:divide-slate-800 dark:border-slate-800"
          role="radiogroup"
          aria-label="Sample type"
        >
          {FOOD_DRUG_SAMPLE_TYPES.map((type) => {
            const selected = sampleType === type;
            const info = SAMPLE_TYPE_INFO[type];
            return (
              <button
                key={type}
                type="button"
                role="radio"
                aria-checked={selected}
                onClick={() => setSampleType(type)}
                className={`flex w-full cursor-pointer items-start gap-4 px-4 py-3.5 text-left transition-colors ${
                  selected ? 'bg-teal-500/[0.06]' : 'hover:bg-slate-500/[0.04]'
                }`}
              >
                {/* Radio indicator */}
                <span
                  className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                    selected ? 'border-teal-500 text-teal-600 dark:text-teal-300' : 'border-slate-300 dark:border-slate-600'
                  }`}
                >
                  {selected && <span className="h-2.5 w-2.5 rounded-full bg-current" />}
                </span>

                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                    <span
                      className={`flex items-center gap-1.5 text-sm font-semibold ${
                        selected ? 'text-teal-700 dark:text-teal-300' : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      <FlaskConical className="h-3.5 w-3.5 opacity-70" />
                      {type}
                    </span>
                    <span className="text-[11.5px] text-slate-500 dark:text-slate-400">{info.examples}</span>
                  </span>
                  <span className="mt-1 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">
                    {info.description}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
        <Field label="Sample description" hint="Optional — product, batch number, quantity or packaging" className="sm:col-span-2">
          <textarea
            rows={3}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="e.g. 2 kg maize flour, batch MF-2291, sealed polythene bag"
            className={`${inputCls} resize-y`}
          />
        </Field>
      </IntakeSection>

      <IntakeSection
        id="intake-receipt"
        icon={PackageCheck}
        title="Receipt"
        description="The staff member taking custody of the sample."
      >
        <Field label="Receiver" required icon={UserCheck} hint="Defaults to you">
          <input
            list="fd-receiver-staff"
            value={receiver}
            onChange={(e) => setReceiver(e.target.value)}
            placeholder="Staff member receiving the sample"
            className={inputCls}
          />
          <datalist id="fd-receiver-staff">
            {staffNames.map((n) => (
              <option key={n} value={n} />
            ))}
          </datalist>
        </Field>
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-800">
          <Meta label="Date received" value={today} />
          <Meta label="Record ID" value={nextId} mono />
          <Meta label="Storage" value="Store R-01" icon={Warehouse} />
          <Meta label="Case" value={activeCase.caseNumber} mono />
        </div>
      </IntakeSection>
    </IntakeLayout>
  );
};
