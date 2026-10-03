import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  Building2,
  Calendar,
  Check,
  CircleDashed,
  ClipboardList,
  Droplets,
  FileText,
  FlaskConical,
  Hash,
  History,
  MapPin,
  PackageCheck,
  Phone,
  Receipt,
  User,
  UserCheck,
  Warehouse,
} from 'lucide-react';
import {
  ExhibitItem,
  ForensicCase,
  LaboratoryDepartment,
  OfficerVisitor,
  WaterIntake,
  WaterIntakeStatus,
  WaterSenderType,
  WaterSourceCategory,
  WaterTestType,
  User as StaffUser,
} from '../../types';
import { isValidPoBox } from '../../foodDrugIntake';
import {
  WATER_DISCHARGE_DESTINATIONS,
  WATER_SOURCE_CATEGORIES,
  WATER_SOURCE_INFO,
  WATER_SPECIFIC_PARAMETERS,
  WATER_TEST_CHARGES,
  WATER_TEST_INFO,
  WATER_TEST_TYPES,
  formatKes,
  isValidKenyanMobile,
  waterTestCharge,
} from '../../waterIntake';
import { Button, DashboardHeader, DashboardPage, Panel, SegmentedControl, StatusPill, Tone } from '../common/Dashboard';
import { Select } from '../common/Select';
import { Field, Meta, Section, inputCls } from './IntakeFormParts';
import { ReceptionClientDetails } from './ReceptionClientDetails';

/**
 * Water & Environment exhibit intake. Registration ends at Charges; the Head
 * of Water & Environment assigns the Analysis Officer from the register.
 */

export interface WaterIntakeSubmission {
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
  waterIntake: WaterIntake;
}

interface WaterIntakePageProps {
  activeCase: ForensicCase;
  /** The visitor routed to Water, or null while nobody has been sent. */
  visitor: OfficerVisitor | null;
  currentUserId: string;
  staffMembers: Pick<StaffUser, 'id' | 'name'>[];
  intakes: WaterIntake[];
  onSaveIntake: (submission: WaterIntakeSubmission) => Promise<WaterIntake>;
  onCancel: () => void;
}

const WATER_STORAGE_LOCATION = 'Water & Environment Sample Store — Cold Room W-01';

const STATUS_TONE: Record<WaterIntakeStatus, Tone> = {
  'Awaiting Approval': 'rose',
  'Awaiting Assignment': 'amber',
  'Under Analysis': 'sky',
  'Analysis Complete': 'emerald',
};

export const WaterIntakePage: React.FC<WaterIntakePageProps> = ({
  activeCase,
  visitor,
  currentUserId,
  staffMembers,
  intakes,
  onSaveIntake,
  onCancel,
}) => {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  // Client details always come from the reception record and are read only.
  // Without a visitor routed to Water they stay empty; only the P.O Box can be
  // typed, and only when reception left it empty.
  const reception = visitor && visitor.laboratory === 'Water' ? visitor : null;
  const notified = !!reception?.labNotificationSentAt;
  const senderType: WaterSenderType = 'Organisation';
  const [poBoxInput, setPoBoxInput] = useState('');
  useEffect(() => {
    setPoBoxInput('');
  }, [reception?.id]);
  const orgName = reception?.station ?? '';
  const contactPerson = reception?.officerName ?? '';
  const contactMobile = reception?.phone ?? '';
  const orgAddress = reception?.poBox?.trim() ? reception.poBox : poBoxInput;

  // Receipt
  const [receivingOfficerId, setReceivingOfficerId] = useState(currentUserId);
  const [dateReceived, setDateReceived] = useState(today);

  // Test
  const [testType, setTestType] = useState<WaterTestType | ''>('');
  const [parameters, setParameters] = useState<string[]>([]);
  const [otherParameter, setOtherParameter] = useState('');

  // Source of locality
  const [sourceCategory, setSourceCategory] = useState<WaterSourceCategory | ''>('');
  const [sourceType, setSourceType] = useState('');
  const [locationFrom, setLocationFrom] = useState('');
  const [dischargeTo, setDischargeTo] = useState('');

  // Charges
  const [receiptNumber, setReceiptNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const labReference = 'Issued when registered';

  const isEffluent = sourceCategory === 'Effluent Water';
  const allParameters = [...parameters, ...(otherParameter.trim() ? [otherParameter.trim()] : [])];
  const charge = testType ? waterTestCharge(testType, senderType) : 0;

  const poBoxInvalid = orgAddress.trim() !== '' && !isValidPoBox(orgAddress);

  const senderChecks = [
    { label: 'Client', value: contactPerson.trim(), ok: !!reception },
    { label: 'Organisation / station', value: orgName.trim(), ok: orgName.trim() !== '' },
    { label: 'P.O Box', value: orgAddress.trim(), ok: isValidPoBox(orgAddress) },
    { label: 'Lab notified', value: notified ? 'Yes' : 'Not yet', ok: notified },
  ];

  const checks = [
    ...senderChecks,
    { label: 'Receiving officer', value: staffMembers.find((member) => member.id === receivingOfficerId)?.name ?? '', ok: !!receivingOfficerId },
    { label: 'Date received', value: dateReceived, ok: dateReceived !== '' && dateReceived <= today },
    {
      label: 'Type of test',
      value: testType === 'Specific Chemical Analysis' && allParameters.length ? `Specific — ${allParameters.join(', ')}` : testType,
      ok: testType === 'Full Chemical Analysis' || (testType === 'Specific Chemical Analysis' && allParameters.length > 0),
    },
    {
      label: 'Source',
      value: [sourceCategory, sourceType].filter(Boolean).join(' · '),
      ok: sourceCategory !== '' && sourceType !== '',
    },
    {
      label: 'Location',
      value: [locationFrom.trim(), isEffluent && dischargeTo ? `→ ${dischargeTo}` : ''].filter(Boolean).join(' '),
      ok: locationFrom.trim() !== '' && (!isEffluent || dischargeTo !== ''),
    },
  ];
  const doneCount = checks.filter((c) => c.ok).length;
  const canSubmit = doneCount === checks.length;

  const toggleParameter = (p: string) =>
    setParameters((prev) => (prev.includes(p) ? prev.filter((x) => x !== p) : [...prev, p]));

  const changeSourceCategory = (c: WaterSourceCategory) => {
    setSourceCategory(c);
    setSourceType('');
    setDischargeTo('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit || !reception || !testType || !sourceCategory || saving) return;

    const exhibitId = `EXH-${String(activeCase.exhibits.length + 1).padStart(4, '0')}`;
    const senderName = orgName.trim();
    const senderAddress = orgAddress.trim();
    const receivedBy = staffMembers.find((member) => member.id === receivingOfficerId)?.name ?? '';
    const receivedFrom = `${senderName} (${senderAddress}) — attn. ${contactPerson.trim()}`;
    const testLabel =
      testType === 'Specific Chemical Analysis' ? `${testType} (${allParameters.join(', ')})` : testType;
    const locality = `${sourceType}, ${locationFrom.trim()}${isEffluent ? ` → ${dischargeTo}` : ''}`;
    const description = `${sourceCategory} sample (${locality}) submitted by ${senderName} for ${testLabel}.`;

    const exhibit: ExhibitItem = {
      id: exhibitId,
      caseId: activeCase.id,
      description,
      submissionType: 'Water & Environment Sample',
      numberOfItems: 1,
      packaging: 'Sealed Water Sampling Bottle',
      sealNumber: '',
      markings: `Marked "${labReference}" on receipt`,
      condition: 'Intact & Sealed',
      storageLocation: WATER_STORAGE_LOCATION,
      dateReceived,
      receivedFrom,
      receivedBy,
      laboratory: 'Water',
      remarks: `${testLabel}. Charges ${formatKes(charge)}. Awaiting Analysis Officer assignment.`,
    };

    setSaving(true);
    setSaveError('');
    try {
      await onSaveIntake({
        caseNumber: activeCase.caseNumber,
        submissionType: 'Water & Environment Sample',
        description,
        dateReceived,
        receivedFrom,
        receivedBy,
        department: 'Water',
        storageLocation: WATER_STORAGE_LOCATION,
        supportingDocuments: reception.documentsPresented || '',
        remarks: `${labReference}. ${reception.purposeOfVisit}. ${reception.exhibitsPresented ? `Reception notes: ${reception.exhibitsPresented}. ` : ''}${testLabel}. Received by ${receivedBy}.`,
        exhibits: [exhibit],
        waterIntake: {
          id: '',
          labReference: '',
          caseId: activeCase.id,
          exhibitId,
          receptionVisitId: reception.id,
          senderType,
          senderName,
          senderAddress,
          contactPerson: contactPerson.trim(),
          contactPersonMobile: contactMobile.trim() || undefined,
          receivingOfficer: receivedBy,
          receivingOfficerId,
          dateReceived,
          testType,
          specificParameters: testType === 'Specific Chemical Analysis' ? allParameters : undefined,
          sourceCategory,
          sourceType,
          locationFrom: locationFrom.trim(),
          dischargeTo: isEffluent ? dischargeTo : undefined,
          charges: charge,
          receiptNumber: receiptNumber.trim() || undefined,
          status: 'Awaiting Approval',
        },
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'The Water exhibit could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Laboratory', 'Water & Environment', 'Exhibit intake']}
        title="Exhibit intake"
        meta={<StatusPill tone="sky" dot={false}>{labReference}</StatusPill>}
        description="Record a water or wastewater sample received by the Water and Environment laboratory."
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
          {reception && notified ? (
            <div className="flex items-center gap-2 border-b border-sky-500/20 bg-sky-500/5 px-5 py-2.5 text-xs text-sky-700 dark:text-sky-300">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              Client details come from reception record {reception.visitNumber}, registered by {reception.receptionistName}, and cannot be edited here.
            </div>
          ) : (
            <div role="status" className="flex items-center gap-2 border-b border-amber-500/20 bg-amber-500/5 px-5 py-2.5 text-xs text-amber-700 dark:text-amber-300">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              No client has been sent to Water & Environment yet. You can fill in the exhibit details now, but the exhibit can only be registered once reception has notified this laboratory.
            </div>
          )}

          {/* 1. Laboratory reference */}
          <Section icon={Hash} title="Laboratory reference" description="Issued automatically in sequence for the year received.">
            <Field label="Laboratory reference" hint="Auto-generated — cannot be edited" className="sm:col-span-2">
              <input
                type="text"
                value={labReference}
                readOnly
                tabIndex={-1}
                aria-readonly="true"
                className={`${inputCls.replace('bg-white', '').replace('dark:bg-slate-950', '')} pointer-events-none select-none bg-slate-100 font-mono font-semibold text-slate-700 dark:bg-slate-800/60 dark:text-slate-200`}
              />
            </Field>
          </Section>

          {/* 2. Sender */}
          <Section icon={Building2} title="Sender" description="The police station or organisation submitting the sample, as recorded at reception.">
            <ReceptionClientDetails
              visitor={reception}
              poBox={orgAddress}
              onPoBoxChange={setPoBoxInput}
              poBoxInvalid={poBoxInvalid}
            />
          </Section>

          {/* 3. Receipt */}
          <Section icon={PackageCheck} title="Receipt" description="The officer taking custody of the sample, and when.">
            <Field label="Receiving officer" required icon={UserCheck} hint="Defaults to you">
              <Select
                aria-label="Receiving officer"
                value={receivingOfficerId}
                onChange={setReceivingOfficerId}
                placeholder="Select officer…"
                options={staffMembers.map((member) => ({ value: member.id, label: member.name }))}
              />
            </Field>
            <Field label="Date of receiving" required icon={Calendar} error={dateReceived > today} hint={dateReceived > today ? 'Cannot be in the future' : undefined}>
              <input type="date" max={today} value={dateReceived} onChange={(e) => setDateReceived(e.target.value)} className={inputCls} />
            </Field>
          </Section>

          {/* 4. Type of test */}
          <Section icon={FlaskConical} title="Type of test" description="Charges shown for an organisation.">
            <RadioRows
              label="Type of test"
              options={WATER_TEST_TYPES}
              value={testType}
              onChange={(t) => setTestType(t)}
              describe={(t) => WATER_TEST_INFO[t].description}
              badge={(t) => formatKes(WATER_TEST_CHARGES[t][senderType])}
            />
            {testType === 'Specific Chemical Analysis' && (
              <div className="space-y-2 sm:col-span-2">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Parameters to test <span className="text-rose-500">*</span>
                </span>
                <div className="flex flex-wrap gap-2">
                  {WATER_SPECIFIC_PARAMETERS.map((p) => {
                    const on = parameters.includes(p);
                    return (
                      <button
                        key={p}
                        type="button"
                        aria-pressed={on}
                        onClick={() => toggleParameter(p)}
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                          on
                            ? 'border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300'
                            : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        {on && <Check className="h-3 w-3" strokeWidth={3} />}
                        {p}
                      </button>
                    );
                  })}
                </div>
                <input
                  value={otherParameter}
                  onChange={(e) => setOtherParameter(e.target.value)}
                  placeholder="Other parameter (optional), e.g. Fluoride"
                  className={inputCls}
                />
              </div>
            )}
          </Section>

          {/* 5. Source of locality */}
          <Section icon={Droplets} title="Source of locality" description="What kind of water it is and where it was taken from.">
            <RadioRows
              label="Source of locality"
              options={WATER_SOURCE_CATEGORIES}
              value={sourceCategory}
              onChange={changeSourceCategory}
              describe={(c) => WATER_SOURCE_INFO[c].description}
            />
            {sourceCategory && (
              <>
                <Field label="Source type" required>
                  <Select
                    aria-label="Source type"
                    value={sourceType}
                    onChange={setSourceType}
                    placeholder="Select source type…"
                    options={WATER_SOURCE_INFO[sourceCategory].sourceTypes.map((s) => ({ value: s, label: s }))}
                  />
                </Field>
                <Field label="Location (from)" required icon={MapPin} hint="Where the sample was collected">
                  <input
                    value={locationFrom}
                    onChange={(e) => setLocationFrom(e.target.value)}
                    placeholder={isEffluent ? 'e.g. Outfall, Athi River EPZ plant' : 'e.g. Borehole No. 3, Ruiru'}
                    className={inputCls}
                  />
                </Field>
                {isEffluent && (
                  <Field label="Discharged to" required hint="Where the effluent flows to" className="sm:col-span-2">
                    <Select
                      aria-label="Discharged to"
                      value={dischargeTo}
                      onChange={setDischargeTo}
                      placeholder="Select destination…"
                      options={WATER_DISCHARGE_DESTINATIONS.map((d) => ({ value: d, label: d }))}
                    />
                  </Field>
                )}
              </>
            )}
          </Section>

          {/* 6. Charges */}
          <Section icon={Receipt} title="Charges" description="Calculated from the type of test and the sender category." last>
            <div className="overflow-hidden rounded-lg border border-slate-200 text-xs sm:col-span-2 dark:border-slate-800">
              <div className="flex justify-between px-3 py-2 text-slate-500 dark:text-slate-400">
                <span>Type of test</span>
                <span className="text-slate-900 dark:text-white">{testType || '—'}</span>
              </div>
              <div className="flex justify-between border-t border-slate-100 px-3 py-2 text-slate-500 dark:border-slate-800 dark:text-slate-400">
                <span>Sender category</span>
                <span className="text-slate-900 dark:text-white">{senderType}</span>
              </div>
              <div className="flex items-center justify-between border-t border-slate-200 bg-slate-50 px-3 py-2.5 dark:border-slate-800 dark:bg-slate-950/50">
                <span className="font-semibold text-slate-700 dark:text-slate-200">Amount payable</span>
                <span className="font-mono text-base font-semibold text-slate-900 dark:text-white">
                  {testType ? formatKes(charge) : '—'}
                </span>
              </div>
            </div>
            <Field label="Payment receipt no." hint="Optional — if already paid">
              <input
                value={receiptNumber}
                onChange={(e) => setReceiptNumber(e.target.value)}
                placeholder="e.g. RCT-2026-00481"
                className={`${inputCls} font-mono`}
              />
            </Field>
            <div className="grid grid-cols-2 gap-3 rounded-lg bg-slate-50 p-3 text-xs dark:bg-slate-950/50">
              <Meta label="Exhibit ID" value="Issued on save" mono />
              <Meta label="Storage" value="Cold Room W-01" icon={Warehouse} />
            </div>
          </Section>

          {/* Footer */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-full rounded-full bg-sky-500 transition-all" style={{ width: `${(doneCount / checks.length) * 100}%` }} />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">
                {doneCount} of {checks.length} required fields
              </span>
            </div>
            <div className="flex gap-2">
              <Button onClick={onCancel}>Cancel</Button>
              <Button type="submit" variant="primary" icon={Check} disabled={!canSubmit || saving}>
                {saving ? 'Saving…' : 'Register exhibit'}
              </Button>
            </div>
          </div>
          {saveError && <div role="alert" className="border-t border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">{saveError}</div>}
        </form>

        {/* ------------------------------ Aside ----------------------------- */}
        <aside className="space-y-5 lg:sticky lg:top-4 lg:col-span-4">
          <Panel icon={ClipboardList} tone="sky" title="Intake preview" description={labReference}>
            <ul className="space-y-2.5">
              {checks.map((c) => (
                <li key={c.label} className="flex items-start gap-2.5 text-xs">
                  {c.ok ? (
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-emerald-500" />
                  ) : (
                    <CircleDashed className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" />
                  )}
                  <span className="w-28 shrink-0 text-slate-500 dark:text-slate-400">{c.label}</span>
                  <span className={`min-w-0 break-words font-medium ${c.value ? 'text-slate-900 dark:text-white' : 'text-slate-300 dark:text-slate-600'}`}>
                    {c.value || '—'}
                  </span>
                </li>
              ))}
              <li className="flex items-start gap-2.5 border-t border-slate-100 pt-2.5 text-xs dark:border-slate-800">
                <Receipt className="mt-0.5 h-3.5 w-3.5 shrink-0 text-slate-400" />
                <span className="w-28 shrink-0 text-slate-500 dark:text-slate-400">Charges</span>
                <span className="font-mono font-semibold text-slate-900 dark:text-white">{testType ? formatKes(charge) : '—'}</span>
              </li>
            </ul>
          </Panel>

          <Panel icon={UserCheck} tone="amber" title="What happens next">
            <ol className="space-y-3 text-xs">
              {[
                { title: 'Registered', text: 'You register the exhibit. It is stored as Awaiting Approval.', active: true },
                { title: 'Documents approved', text: 'The Head of Water & Environment reviews and approves the submitted documents.' },
                { title: 'Analysis Officer assigned', text: 'The Head of Water & Environment assigns an officer. Everyone in the department can see who holds it.' },
                { title: 'Analysis complete', text: 'The assigned officer marks the analysis complete.' },
              ].map((s, i) => (
                <li key={s.title} className="flex gap-3">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                      s.active ? 'bg-sky-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
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

          <Panel icon={History} title="Recent intakes" description={`${intakes.length} in the Water register`} flush>
            {intakes.length === 0 ? (
              <p className="px-4 py-5 text-center text-xs text-slate-400">No exhibits registered yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {intakes.slice(0, 4).map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-xs">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900 dark:text-white">{i.senderName}</div>
                      <div className="truncate font-mono text-[11px] text-slate-400">{i.labReference}</div>
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

/** Full-width radio rows with a description, used for test type and source. */
function RadioRows<T extends string>({
  label,
  options,
  value,
  onChange,
  describe,
  badge,
}: {
  label: string;
  options: T[];
  value: T | '';
  onChange: (value: T) => void;
  describe: (value: T) => string;
  badge?: (value: T) => string;
}) {
  return (
    <div
      className="divide-y divide-slate-200 overflow-hidden rounded-xl border border-slate-200 sm:col-span-2 dark:divide-slate-800 dark:border-slate-800"
      role="radiogroup"
      aria-label={label}
    >
      {options.map((opt) => {
        const selected = value === opt;
        return (
          <button
            key={opt}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt)}
            className={`flex w-full items-start gap-4 px-4 py-3.5 text-left transition-colors ${
              selected ? 'bg-sky-500/5' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
            }`}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                selected ? 'border-sky-500 bg-sky-500 text-white' : 'border-slate-300 dark:border-slate-600'
              }`}
            >
              {selected && <Check className="h-3 w-3" strokeWidth={3} />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className={`text-sm font-semibold ${selected ? 'text-sky-700 dark:text-sky-300' : 'text-slate-900 dark:text-white'}`}>
                  {opt}
                </span>
                {badge && (
                  <span className="rounded-full bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {badge(opt)}
                  </span>
                )}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">{describe(opt)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
