import React, { useState } from 'react';
import {
  ArrowLeft,
  Check,
  CircleDashed,
  ClipboardList,
  FileText,
  FlaskConical,
  History,
  IdCard,
  MapPin,
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
  NATIONAL_ID_MAX,
  isValidNationalId,
  isValidPoBox,
  sanitizeNationalId,
} from '../../foodDrugIntake';
import { Button, DashboardHeader, DashboardPage, Panel, StatusPill, Tone } from '../common/Dashboard';
import { Field, Meta, Section, inputCls } from './IntakeFormParts';

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
  visitor: OfficerVisitor;
  receivingAnalystName: string;
  /** Food & Drugs staff offered as suggestions for the Receiver field. */
  staffNames?: string[];
  onSaveIntake: (submission: FoodDrugIntakeSubmission) => void;
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
  'Awaiting Assignment': 'amber',
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
}) => {
  // Prefill from a visitor the receptionist routed to Food & Drugs.
  const fromVisitor = visitor.laboratory === 'Food & Drugs';
  const [clientName, setClientName] = useState(fromVisitor ? visitor.officerName : '');
  const [nationalId, setNationalId] = useState(fromVisitor ? sanitizeNationalId(visitor.nationalId || '') : '');
  const [poBox, setPoBox] = useState(fromVisitor ? visitor.poBox || '' : '');
  const [sampleType, setSampleType] = useState<FoodDrugSampleType | ''>('');
  const [receiver, setReceiver] = useState(receivingAnalystName);
  const [notes, setNotes] = useState('');

  const intakes = activeCase.foodDrugIntakes ?? [];
  const nextId = `FDI-${String(intakes.length + 1).padStart(4, '0')}`;
  const today = new Date().toISOString().split('T')[0];

  const checks = [
    { label: 'Full name', value: clientName.trim(), ok: clientName.trim() !== '' },
    { label: 'National ID', value: nationalId, ok: isValidNationalId(nationalId) },
    { label: 'P.O Box', value: poBox.trim(), ok: isValidPoBox(poBox) },
    { label: 'Sample type', value: sampleType, ok: sampleType !== '' },
    { label: 'Receiver', value: receiver.trim(), ok: receiver.trim() !== '' },
  ];
  const doneCount = checks.filter((c) => c.ok).length;
  const canSubmit = doneCount === checks.length;
  const poBoxInvalid = poBox.trim() !== '' && !isValidPoBox(poBox);
  const idTooShort = nationalId !== '' && nationalId.length < 7;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !sampleType) return;

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

    onSaveIntake({
      caseNumber: activeCase.caseNumber,
      submissionType: 'Regulatory Sample (Food & Drugs)',
      description,
      dateReceived: today,
      receivedFrom,
      receivedBy,
      department: 'Food & Drugs',
      storageLocation: FD_STORAGE_LOCATION,
      supportingDocuments: (fromVisitor && visitor.documentsPresented) || '',
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
        status: 'Awaiting Assignment',
      },
    });
  };

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Laboratory', 'Food & Drugs', 'Register sample']}
        title="Register sample"
        meta={<StatusPill tone="amber" dot={false}>{nextId}</StatusPill>}
        description="Record a food, drug or chemical substance sample received by the Foods, Drugs and Chemical Substances Section."
        actions={
          <Button icon={ArrowLeft} onClick={onCancel}>
            Back to laboratory
          </Button>
        }
      />

      <div className="grid grid-cols-1 items-start gap-5 lg:grid-cols-12">
        {/* ------------------------------ Form ------------------------------ */}
        <form
          onSubmit={handleSubmit}
          className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm lg:col-span-8 dark:border-slate-800 dark:bg-slate-900"
        >
          {fromVisitor && (
            <div className="flex items-center gap-2 border-b border-sky-500/20 bg-sky-500/5 px-5 py-2.5 text-xs text-sky-700 dark:text-sky-300">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              Details pre-filled from reception record {visitor.id}, registered by {visitor.receptionistName}.
            </div>
          )}

          <Section
            icon={User}
            title="Submitter"
            description="The person or organisation bringing the sample."
          >
            <Field label="Full name" required className="sm:col-span-2">
              <input
                autoFocus
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
                placeholder="e.g. Jane Wambui"
                autoComplete="off"
                className={inputCls}
              />
            </Field>
            <Field
              label="ID number (National ID)"
              required
              icon={IdCard}
              hint={idTooShort ? 'Most national IDs are 7–8 digits' : `Numbers only · ${nationalId.length}/${NATIONAL_ID_MAX}`}
            >
              <input
                inputMode="numeric"
                maxLength={NATIONAL_ID_MAX}
                value={nationalId}
                onChange={(e) => setNationalId(sanitizeNationalId(e.target.value))}
                placeholder="24891034"
                className={`${inputCls} font-mono tracking-wider`}
              />
            </Field>
            <Field
              label="P.O Box"
              required
              icon={MapPin}
              error={poBoxInvalid}
              hint={poBoxInvalid ? 'Use the format P.O Box 40245-00100' : 'Box number, then postal code'}
            >
              <input
                value={poBox}
                onChange={(e) => setPoBox(e.target.value)}
                placeholder="P.O Box 40245-00100"
                className={inputCls}
              />
            </Field>
          </Section>

          <Section
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
                    className={`flex w-full items-start gap-4 px-4 py-3.5 text-left transition-colors ${
                      selected
                        ? 'bg-amber-500/5'
                        : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                    }`}
                  >
                    {/* Radio indicator */}
                    <span
                      className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                        selected ? 'border-amber-500 bg-amber-500 text-white' : 'border-slate-300 dark:border-slate-600'
                      }`}
                    >
                      {selected && <Check className="h-3 w-3" strokeWidth={3} />}
                    </span>

                    <span className="min-w-0 flex-1">
                      <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span
                          className={`flex items-center gap-1.5 text-sm font-semibold ${
                            selected ? 'text-amber-700 dark:text-amber-400' : 'text-slate-900 dark:text-white'
                          }`}
                        >
                          <FlaskConical className="h-3.5 w-3.5 opacity-70" />
                          {type}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[11px] text-slate-500 dark:bg-slate-800 dark:text-slate-400">
                          {info.examples}
                        </span>
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
          </Section>

          <Section
            icon={PackageCheck}
            title="Receipt"
            description="The staff member taking custody of the sample."
            last
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
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-950/50">
              <Meta label="Date received" value={today} />
              <Meta label="Record ID" value={nextId} mono />
              <Meta label="Storage" value="Store R-01" icon={Warehouse} />
              <Meta label="Case" value={activeCase.caseNumber} mono />
            </div>
          </Section>

          {/* Footer */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div
                  className="h-full rounded-full bg-amber-500 transition-all"
                  style={{ width: `${(doneCount / checks.length) * 100}%` }}
                />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {doneCount} of {checks.length} required fields
              </span>
            </div>
            <div className="flex gap-2">
              <Button onClick={onCancel}>Cancel</Button>
              <Button type="submit" variant="primary" icon={Check} disabled={!canSubmit}>
                Add record
              </Button>
            </div>
          </div>
        </form>

        {/* ------------------------------ Aside ----------------------------- */}
        <aside className="space-y-5 lg:sticky lg:top-4 lg:col-span-4">
          <Panel icon={ClipboardList} tone="amber" title="Record preview" description={`${nextId} · ${today}`}>
            <ul className="space-y-2.5">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2.5 text-xs">
                  {c.ok ? (
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  ) : (
                    <CircleDashed className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" />
                  )}
                  <span className="w-24 shrink-0 text-slate-500 dark:text-slate-400">{c.label}</span>
                  <span className={`min-w-0 break-words font-medium ${c.value ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-slate-600'}`}>
                    {c.value || '—'}
                  </span>
                </li>
              ))}
            </ul>
          </Panel>

          <Panel icon={UserCheck} tone="sky" title="What happens next">
            <ol className="space-y-3 text-xs">
              {[
                { title: 'Registered', text: 'You add the record. The sample is stored as Awaiting Assignment.', active: true },
                { title: 'Officer assigned', text: 'The Head of Section assigns a Food & Drugs officer to analyse it.' },
                { title: 'Analysed & reported', text: 'After analysis, the officer records who reported the result.' },
              ].map((s, i) => (
                <li key={s.title} className="flex gap-3">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                      s.active ? 'bg-amber-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="pt-0.5">
                    <div className="font-medium text-slate-900 dark:text-white">{s.title}</div>
                    <div className="mt-0.5 leading-relaxed text-slate-500 dark:text-slate-400">{s.text}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel icon={History} title="Recent registrations" description={`${intakes.length} on ${activeCase.caseNumber}`} flush>
            {intakes.length === 0 ? (
              <p className="px-4 py-5 text-center text-xs text-slate-400">No samples registered yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {intakes.slice(0, 4).map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-xs">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900 dark:text-white">{i.clientName}</div>
                      <div className="font-mono text-[11px] text-slate-400">
                        {i.id} · {i.sampleType}
                      </div>
                    </div>
                    <StatusPill tone={STATUS_TONE[i.status]}>{i.status}</StatusPill>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </aside>
      </div>
    </DashboardPage>
  );
};
