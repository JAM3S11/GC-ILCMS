import React, { useEffect, useRef, useState } from 'react';
import {
  Building2,
  Calendar,
  Check,
  Droplets,
  FileText,
  FlaskConical,
  Hash,
  MapPin,
  PackageCheck,
  Receipt,
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
import { Tone } from '../common/Dashboard';
import { Select } from '../common/Select';
import { Field, Meta, inputCls } from './IntakeFormParts';
import { IntakeCheck, IntakeLayout, IntakeSection } from './IntakeLayout';
import { ReceptionClientDetails } from './ReceptionClientDetails';
import { WaterEditAccess, WaterIntakeEdit, WaterSenderEdit } from '../../lib/waterIntakeAccess';

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
  /** Open an existing exhibit with its details ready to change, instead of registering a new one. */
  editIntake?: WaterIntake;
  /** What this person may change on `editIntake`. */
  editAccess?: WaterEditAccess;
  /** Saves the changed parts; either part is null when it was not changed or not allowed. */
  onSaveEdit?: (intakeId: string, intakeEdit: WaterIntakeEdit | null, senderEdit: WaterSenderEdit | null) => Promise<void>;
  /** Whether this person may tick that the intake documents are approved (Water staff). */
  canConfirmDocuments?: boolean;
  /** Saves the tick straight away when editing an existing exhibit. */
  onSetDocumentsConfirmed?: (intakeId: string, confirmed: boolean) => Promise<void>;
}

const WATER_STORAGE_LOCATION = 'Water & Environment Sample Store — Cold Room W-01';

const STATUS_TONE: Record<WaterIntakeStatus, Tone> = {
  'Awaiting Approval': 'rose',
  'Awaiting Assignment': 'teal',
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
  editIntake,
  editAccess,
  onSaveEdit,
  canConfirmDocuments = true,
  onSetDocumentsConfirmed,
}) => {
  const today = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date());
  // Do not expose sender details until reception has notified Water.
  const reception =
    visitor && visitor.laboratory === 'Water' && visitor.labNotificationSentAt ? visitor : null;
  const notified = !!reception?.labNotificationSentAt;
  const editing = !!editIntake;
  const access: WaterEditAccess = editAccess ?? { intake: true, sender: true, fillInOnly: false };
  const senderType: WaterSenderType = editIntake?.senderType ?? 'Organisation';
  // In edit mode the sender is held on the exhibit and can be changed (if allowed);
  // when registering it always comes from the reception record.
  const [eSenderName, setESenderName] = useState(editIntake?.senderName ?? '');
  const [eAddress, setEAddress] = useState(editIntake?.senderAddress ?? '');
  const [eSenderMobile, setESenderMobile] = useState(editIntake?.senderMobile ?? '');
  const [eContact, setEContact] = useState(editIntake?.contactPerson ?? '');
  const [eContactMobile, setEContactMobile] = useState(editIntake?.contactPersonMobile ?? '');
  const orgName = editing ? eSenderName : reception?.station ?? '';
  const contactPerson = editing ? eContact : reception?.officerName ?? '';
  const contactMobile = editing ? eContactMobile : reception?.phone ?? '';
  const orgAddress = editing ? eAddress : reception?.poBox?.trim() ?? '';

  // Receipt
  const [receivingOfficerId, setReceivingOfficerId] = useState(editIntake?.receivingOfficerId ?? currentUserId);
  const [dateReceived, setDateReceived] = useState(editIntake?.dateReceived ?? today);
  const [dateSampled, setDateSampled] = useState(editIntake?.dateSampled ?? '');
  // New exhibit: held here and saved with it. Existing exhibit: saved the moment it is ticked.
  const [documentsConfirmedNew, setDocumentsConfirmedNew] = useState(false);
  const [confirmingDocuments, setConfirmingDocuments] = useState(false);
  const documentsConfirmed = editing ? !!editIntake?.documentsConfirmedAt : documentsConfirmedNew;

  // Test
  const [testType, setTestType] = useState<WaterTestType | ''>(editIntake?.testType ?? '');
  const [parameters, setParameters] = useState<string[]>(editIntake?.specificParameters ?? []);
  const [otherParameter, setOtherParameter] = useState('');

  // Source of locality
  const [sourceCategory, setSourceCategory] = useState<WaterSourceCategory | ''>(editIntake?.sourceCategory ?? '');
  const [sourceType, setSourceType] = useState(editIntake?.sourceType ?? '');
  const [locationFrom, setLocationFrom] = useState(editIntake?.locationFrom ?? '');
  const [dischargeTo, setDischargeTo] = useState(editIntake?.dischargeTo ?? '');

  // Charges
  const [receiptNumber, setReceiptNumber] = useState(editIntake?.receiptNumber ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');

  const labReference = editIntake?.labReference ?? 'Issued when registered';

  const isEffluent = sourceCategory === 'Effluent Water';
  // Receipt, test and source are locked unless the intake part is editable; once analysis has
  // started only blanks can be filled in (the receiver, date received, test and source stay put).
  const lockIntake = editing && (!access.intake || access.fillInOnly);
  const lockDateSampled = editing && (!access.intake || (access.fillInOnly && !!editIntake?.dateSampled));
  const lockReceipt = editing && (!access.intake || (access.fillInOnly && !!editIntake?.receiptNumber));
  const lockSender = editing && !access.sender;
  const officerOptions = staffMembers.some((m) => m.id === editIntake?.receivingOfficerId) || !editIntake?.receivingOfficerId
    ? staffMembers
    : [{ id: editIntake.receivingOfficerId, name: editIntake.receivingOfficer }, ...staffMembers];
  const allParameters = [...parameters, ...(otherParameter.trim() ? [otherParameter.trim()] : [])];
  const charge = testType ? waterTestCharge(testType, senderType) : 0;

  const poBoxInvalid = orgAddress.trim() !== '' && !isValidPoBox(orgAddress);

  const senderChecks = editing
    ? lockSender
      ? []
      : [
          { label: senderType === 'Individual' ? 'Full name' : 'Organisation / station', value: orgName.trim(), ok: orgName.trim().length >= 2 },
          { label: 'P.O Box', value: orgAddress.trim(), ok: senderType === 'Individual' ? isValidPoBox(orgAddress) : orgAddress.trim().length >= 2 },
          senderType === 'Individual'
            ? { label: 'Mobile', value: eSenderMobile.trim(), ok: isValidKenyanMobile(eSenderMobile) }
            : { label: 'Contact person', value: contactPerson.trim(), ok: contactPerson.trim().length >= 2 },
        ]
    : [
    { label: 'Client', value: contactPerson.trim(), ok: !!reception },
    { label: 'Organisation / station', value: orgName.trim(), ok: orgName.trim() !== '' },
    { label: 'P.O Box', value: orgAddress.trim(), ok: isValidPoBox(orgAddress) },
    { label: 'Lab notified', value: notified ? 'Yes' : 'Not yet', ok: notified },
  ];

  const checks: IntakeCheck[] = [
    ...senderChecks.map((check) => ({ ...check, section: 'intake-sender' })),
    { label: 'Receiving officer', value: staffMembers.find((member) => member.id === receivingOfficerId)?.name ?? '', ok: !!receivingOfficerId, section: 'intake-receipt' },
    { label: 'Date received', value: dateReceived, ok: dateReceived !== '' && dateReceived <= today, section: 'intake-receipt' },
    // Older exhibits were registered before the sampling date existed, so editing may leave it blank.
    { label: 'Date sample taken', value: dateSampled, ok: (editing ? dateSampled === '' : dateSampled !== '') || (dateSampled !== '' && dateSampled <= dateReceived), section: 'intake-receipt' },
    {
      label: 'Type of test',
      value: testType === 'Specific Chemical Analysis' && allParameters.length ? `Specific — ${allParameters.join(', ')}` : testType,
      ok: testType === 'Full Chemical Analysis' || (testType === 'Specific Chemical Analysis' && allParameters.length > 0),
      section: 'intake-test',
    },
    {
      label: 'Source',
      value: [sourceCategory, sourceType].filter(Boolean).join(' · '),
      ok: sourceCategory !== '' && sourceType !== '',
      section: 'intake-source',
    },
    {
      label: 'Location',
      value: [locationFrom.trim(), isEffluent && dischargeTo ? `→ ${dischargeTo}` : ''].filter(Boolean).join(' '),
      ok: locationFrom.trim() !== '' && (!isEffluent || dischargeTo !== ''),
      section: 'intake-source',
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

  const intakeEdit: WaterIntakeEdit | null = testType && sourceCategory
    ? {
        receivingOfficerId,
        dateReceived,
        dateSampled: dateSampled || undefined,
        testType,
        specificParameters: testType === 'Specific Chemical Analysis' ? allParameters : [],
        sourceCategory,
        sourceType,
        locationFrom: locationFrom.trim(),
        dischargeTo: isEffluent ? dischargeTo : undefined,
        receiptNumber: receiptNumber.trim() || undefined,
      }
    : null;
  const senderEdit: WaterSenderEdit = {
    senderName: orgName.trim(),
    senderAddress: orgAddress.trim(),
    senderMobile: senderType === 'Individual' ? eSenderMobile.trim() : undefined,
    contactPerson: senderType === 'Individual' ? undefined : contactPerson.trim(),
    contactPersonMobile: senderType === 'Individual' ? undefined : contactMobile.trim() || undefined,
  };
  const sameList = (a: string[], b: string[]) => JSON.stringify([...a].sort()) === JSON.stringify([...b].sort());
  const intakeChanged =
    !!editIntake && !!intakeEdit &&
    (intakeEdit.receivingOfficerId !== (editIntake.receivingOfficerId ?? '') ||
      intakeEdit.dateReceived !== editIntake.dateReceived ||
      (intakeEdit.dateSampled ?? '') !== (editIntake.dateSampled ?? '') ||
      intakeEdit.testType !== editIntake.testType ||
      !sameList(intakeEdit.specificParameters, editIntake.specificParameters ?? []) ||
      intakeEdit.sourceCategory !== editIntake.sourceCategory ||
      intakeEdit.sourceType !== editIntake.sourceType ||
      intakeEdit.locationFrom !== editIntake.locationFrom ||
      (intakeEdit.dischargeTo ?? '') !== (editIntake.dischargeTo ?? '') ||
      (intakeEdit.receiptNumber ?? '') !== (editIntake.receiptNumber ?? ''));
  const senderChanged =
    !!editIntake &&
    (senderEdit.senderName !== editIntake.senderName ||
      senderEdit.senderAddress !== editIntake.senderAddress ||
      (senderEdit.senderMobile ?? '') !== (editIntake.senderMobile ?? '') ||
      (senderEdit.contactPerson ?? '') !== (editIntake.contactPerson ?? '') ||
      (senderEdit.contactPersonMobile ?? '') !== (editIntake.contactPersonMobile ?? ''));
  const canSaveEdit =
    editing && doneCount === checks.length && ((access.intake && intakeChanged) || (access.sender && senderChanged));

  // Why Save is greyed out, in plain words, so it never just looks broken.
  const saveBlocker = !editing
    ? ''
    : checks.find((c) => !c.ok)
      ? `Complete ${checks.find((c) => !c.ok)?.label.toLowerCase()} to save.`
      : !((access.intake && intakeChanged) || (access.sender && senderChanged))
        ? 'Change a detail to enable Save.'
        : '';
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    // The form is long; bring a failed save into view instead of leaving it below the fold.
    if (saveError) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [saveError]);

  const toggleDocuments = async (confirmed: boolean) => {
    if (!editing || !editIntake) {
      setDocumentsConfirmedNew(confirmed);
      return;
    }
    setConfirmingDocuments(true);
    setSaveError('');
    try {
      await onSetDocumentsConfirmed?.(editIntake.id, confirmed);
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save the confirmation.');
    } finally {
      setConfirmingDocuments(false);
    }
  };
  const showDocumentsCheck = canConfirmDocuments && !(editing && editIntake?.certificateIssuedAt);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing && editIntake) {
      if (!canSaveEdit || saving) return;
      setSaving(true);
      setSaveError('');
      try {
        await onSaveEdit?.(
          editIntake.id,
          access.intake && intakeChanged ? intakeEdit : null,
          access.sender && senderChanged ? senderEdit : null,
        );
      } catch (error) {
        setSaveError(error instanceof Error ? error.message : 'The changes could not be saved.');
      } finally {
        setSaving(false);
      }
      return;
    }
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
          documentsConfirmedAt: documentsConfirmedNew ? today : undefined,
          receivingOfficer: receivedBy,
          receivingOfficerId,
          dateReceived,
          dateSampled,
          testType,
          specificParameters: testType === 'Specific Chemical Analysis' ? allParameters : undefined,
          sourceCategory,
          sourceType,
          locationFrom: locationFrom.trim(),
          dischargeTo: isEffluent ? dischargeTo : undefined,
          charges: charge,
          receiptNumber: receiptNumber.trim() || undefined,
          status: 'Awaiting Assignment',
        },
      });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'The Water exhibit could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const receiverName = officerOptions.find((member) => member.id === receivingOfficerId)?.name;

  return (
    <IntakeLayout
      back={{ label: editing ? 'Back' : 'Back to laboratory', onClick: onCancel }}
      reference={editIntake?.labReference ?? `GC/MOI/WAT/VOL I/###/${today.slice(0, 4)}`}
      status={editing ? { label: 'Editing intake', tone: 'sky' } : { label: 'New intake', tone: 'teal' }}
      subtitle={['Water & Environment', receiverName && `Received by ${receiverName}`, dateReceived]}
      notice={
        editing
          ? {
              tone: 'info',
              text: access.fillInOnly
                ? 'Analysis has started, so you can only fill in details that were left out.'
                : access.intake && access.sender
                  ? 'You can change the client and the exhibit details.'
                  : access.intake
                    ? 'You can change the exhibit details. Client details can be changed by reception or the Head.'
                    : 'You can change the client details. The exhibit details are locked for you.',
            }
          : reception && notified
            ? { tone: 'info', text: `Client details come from reception record ${reception.visitNumber}, registered by ${reception.receptionistName}, and cannot be edited here.` }
            : {
                tone: 'attention',
                text: 'No client has been sent to Water & Environment yet. You can fill in the exhibit details now, but the exhibit can only be registered once reception has notified this laboratory.',
              }
      }
      sections={[
        { id: 'intake-reference', title: 'Laboratory reference' },
        { id: 'intake-sender', title: 'Sender' },
        ...(showDocumentsCheck ? [{ id: 'intake-documents', title: 'Intake documents' }] : []),
        { id: 'intake-receipt', title: 'Receipt' },
        { id: 'intake-test', title: 'Type of test' },
        { id: 'intake-source', title: 'Source of locality' },
        { id: 'intake-charges', title: 'Charges' },
      ]}
      checks={checks}
      previewTitle="Intake preview"
      previewExtra={
        <div className="flex items-center justify-between text-[12.5px]">
          <span className="text-slate-500 dark:text-slate-400">Charges</span>
          <span className="font-mono font-semibold text-slate-900 dark:text-white">{testType ? formatKes(charge) : '—'}</span>
        </div>
      }
      nextSteps={[
        { title: 'Registered', text: 'You register the exhibit. It waits for the Head to assign it.' },
        { title: 'Analysis Officer assigned', text: 'The Head of Water & Environment assigns an officer. Everyone in the department can see who holds it.' },
        { title: 'Analysis complete', text: 'The assigned officer enters the test results and marks the analysis complete.' },
        { title: 'Documents and memo approved', text: 'The Head approves the intake documents, then the memo, which can then be printed.' },
      ]}
      recent={{
        title: 'Recent intakes',
        caption: `${intakes.length} in the register`,
        empty: 'No exhibits registered yet.',
        items: intakes.map((intake) => ({
          id: intake.id,
          primary: intake.senderName,
          secondary: intake.labReference,
          status: { label: intake.status, tone: STATUS_TONE[intake.status] },
        })),
      }}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      submitLabel={editing ? 'Save changes' : 'Register exhibit'}
      saving={saving}
      canSubmit={editing ? canSaveEdit : canSubmit}
      barMessage={editing && saveBlocker ? saveBlocker : undefined}
      error={saveError}
      errorRef={errorRef}
    >
      {/* 1. Laboratory reference */}
      <IntakeSection id="intake-reference" icon={Hash} title="Laboratory reference" description="Issued automatically in sequence for the year received.">
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
      </IntakeSection>

      {/* 2. Sender */}
      <IntakeSection id="intake-sender" icon={Building2} title="Sender" description="The police station or organisation submitting the sample, as recorded at reception.">
        {editing ? (
          <fieldset disabled={lockSender} className="contents">
            <Field label={senderType === 'Individual' ? 'Full name' : 'Organisation / police station'} required className="sm:col-span-2">
              <input value={eSenderName} onChange={(e) => setESenderName(e.target.value)} maxLength={200} className={`${inputCls} disabled:cursor-not-allowed disabled:opacity-60`} />
            </Field>
            <Field label="P.O Box" required error={senderType === 'Individual' && eAddress !== '' && !isValidPoBox(eAddress)} hint={senderType === 'Individual' && eAddress !== '' && !isValidPoBox(eAddress) ? 'Use the form P.O Box 123-30100' : undefined}>
              <input value={eAddress} onChange={(e) => setEAddress(e.target.value)} maxLength={300} className={`${inputCls} disabled:cursor-not-allowed disabled:opacity-60`} />
            </Field>
            {senderType === 'Individual' ? (
              <Field label="Mobile" required error={eSenderMobile !== '' && !isValidKenyanMobile(eSenderMobile)} hint={eSenderMobile !== '' && !isValidKenyanMobile(eSenderMobile) ? 'Enter a valid Kenyan mobile number' : undefined}>
                <input value={eSenderMobile} onChange={(e) => setESenderMobile(e.target.value)} className={`${inputCls} disabled:cursor-not-allowed disabled:opacity-60`} />
              </Field>
            ) : (
              <>
                <Field label="Contact person" required>
                  <input value={eContact} onChange={(e) => setEContact(e.target.value)} maxLength={150} className={`${inputCls} disabled:cursor-not-allowed disabled:opacity-60`} />
                </Field>
                <Field label="Contact mobile" hint="Optional" error={eContactMobile.trim() !== '' && !isValidKenyanMobile(eContactMobile)}>
                  <input value={eContactMobile} onChange={(e) => setEContactMobile(e.target.value)} className={`${inputCls} disabled:cursor-not-allowed disabled:opacity-60`} />
                </Field>
              </>
            )}
          </fieldset>
        ) : (
          <ReceptionClientDetails
            visitor={reception}
            poBox={orgAddress}
            readOnlyPoBox
            poBoxInvalid={poBoxInvalid}
          />
        )}
      </IntakeSection>

      {/* Intake documents: the Head cannot approve the memo until this is ticked */}
      {showDocumentsCheck && (
        <IntakeSection id="intake-documents" icon={FileText} title="Intake documents" description="Confirm the documents submitted with the exhibit are fine.">
          <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-slate-700 sm:col-span-2 dark:text-slate-200">
            <input
              type="checkbox"
              checked={documentsConfirmed}
              disabled={confirmingDocuments || (editing && !onSetDocumentsConfirmed)}
              onChange={(event) => void toggleDocuments(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500"
            />
            <span>
              Documents checked
              <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                {editing && editIntake?.documentsConfirmedAt
                  ? `Confirmed ${editIntake.documentsConfirmedAt}${editIntake.documentsConfirmedBy ? ` by ${editIntake.documentsConfirmedBy}` : ''}. Untick to stop the memo being approved.`
                  : 'Tick once the submitted documents have been checked. The Head cannot approve the memo until this is ticked.'}
              </span>
            </span>
          </label>
        </IntakeSection>
      )}

      {/* 3. Receipt */}
      <IntakeSection id="intake-receipt" icon={PackageCheck} title="Receipt" description="The officer taking custody of the sample, and when.">
        <Field label="Receiving officer" required icon={UserCheck} hint="Defaults to you">
          <Select
            aria-label="Receiving officer"
            value={receivingOfficerId}
            onChange={setReceivingOfficerId}
            placeholder="Select officer…"
            disabled={lockIntake}
            options={officerOptions.map((member) => ({ value: member.id, label: member.name }))}
          />
        </Field>
        <Field label="Date of receiving" required icon={Calendar} error={dateReceived > today} hint={dateReceived > today ? 'Cannot be in the future' : undefined}>
          <input type="date" max={today} value={dateReceived} onChange={(e) => setDateReceived(e.target.value)} disabled={lockIntake} className={`${inputCls} disabled:cursor-not-allowed disabled:opacity-60`} />
        </Field>
        <Field label="Date sample taken" required={!editing} icon={Calendar} error={dateSampled !== '' && dateSampled > dateReceived} hint={dateSampled !== '' && dateSampled > dateReceived ? 'Cannot be after the date received' : undefined}>
          <input type="date" max={dateReceived || today} value={dateSampled} onChange={(e) => setDateSampled(e.target.value)} disabled={lockDateSampled} className={`${inputCls} disabled:cursor-not-allowed disabled:opacity-60`} />
        </Field>
      </IntakeSection>

      {/* 4. Type of test */}
      <fieldset disabled={lockIntake} className="contents">
        <IntakeSection id="intake-test" icon={FlaskConical} title="Type of test" description="Charges shown for an organisation.">
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
                {[...new Set([...WATER_SPECIFIC_PARAMETERS, ...parameters])].map((p) => {
                  const on = parameters.includes(p);
                  return (
                    <button
                      key={p}
                      type="button"
                      aria-pressed={on}
                      onClick={() => toggleParameter(p)}
                      className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                        on
                          ? 'border-teal-500/70 text-teal-700 dark:text-teal-300'
                          : 'border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-500/[0.05] dark:border-slate-700 dark:text-slate-300'
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
        </IntakeSection>
      </fieldset>

      {/* 5. Source of locality */}
      <fieldset disabled={lockIntake} className="contents">
        <IntakeSection id="intake-source" icon={Droplets} title="Source of locality" description="What kind of water it is and where it was taken from.">
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
        </IntakeSection>
      </fieldset>

      {/* 6. Charges */}
      <IntakeSection id="intake-charges" icon={Receipt} title="Charges" description="Calculated from the type of test and the sender category.">
        <div className="overflow-hidden rounded-lg border border-slate-200 text-xs sm:col-span-2 dark:border-slate-800">
          <div className="flex justify-between px-3 py-2 text-slate-500 dark:text-slate-400">
            <span>Type of test</span>
            <span className="text-slate-900 dark:text-white">{testType || '—'}</span>
          </div>
          <div className="flex justify-between border-t border-slate-100 px-3 py-2 text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>Sender category</span>
            <span className="text-slate-900 dark:text-white">{senderType}</span>
          </div>
          <div className="flex items-center justify-between border-t border-slate-200 px-3 py-2.5 dark:border-slate-800">
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
            disabled={lockReceipt}
            className={`${inputCls} font-mono disabled:cursor-not-allowed disabled:opacity-60`}
          />
        </Field>
        <div className="grid grid-cols-2 gap-3 rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-800">
          <Meta label="Exhibit ID" value={editIntake?.exhibitId ?? 'Issued on save'} mono />
          <Meta label="Storage" value="Cold Room W-01" icon={Warehouse} />
        </div>
      </IntakeSection>
    </IntakeLayout>
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
            className={`flex w-full cursor-pointer items-start gap-4 px-4 py-3.5 text-left transition-colors disabled:cursor-not-allowed disabled:opacity-60 ${
              selected ? 'bg-teal-500/[0.06]' : 'hover:bg-slate-500/[0.04]'
            }`}
          >
            <span
              className={`mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full border-2 transition-colors ${
                selected ? 'border-teal-500 text-teal-600 dark:text-teal-300' : 'border-slate-300 dark:border-slate-600'
              }`}
            >
              {selected && <span className="h-2.5 w-2.5 rounded-full bg-current" />}
            </span>
            <span className="min-w-0 flex-1">
              <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
                <span className={`text-sm font-semibold ${selected ? 'text-teal-700 dark:text-teal-300' : 'text-slate-900 dark:text-white'}`}>
                  {opt}
                </span>
                {badge && <span className="font-mono text-[11.5px] text-slate-500 dark:text-slate-400">{badge(opt)}</span>}
              </span>
              <span className="mt-1 block text-xs leading-relaxed text-slate-500 dark:text-slate-400">{describe(opt)}</span>
            </span>
          </button>
        );
      })}
    </div>
  );
}
