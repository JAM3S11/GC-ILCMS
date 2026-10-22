import React, { useEffect, useRef, useState } from 'react';
import {
  BadgeCheck,
  Calendar,
  Check,
  Clock,
  FileText,
  Hash,
  PackageCheck,
  Phone,
  Pill,
  Shield,
  User,
  UserCheck,
} from 'lucide-react';
import { ExhibitItem, NarcoticsIntake, NarcoticsIntakeDraft, OfficerVisitor, User as StaffUser } from '../../types';

/** The intake fields an edit sends; the officer and the reception visit never change. */
export type NarcoticsIntakeEdit = Omit<NarcoticsIntakeDraft, 'receptionVisitId' | 'documentsConfirmed'>;
import {
  NARCOTICS_DESCRIPTION_MIN,
  NARCOTICS_DOCUMENTS,
  NARCOTICS_EXHIBIT_TYPES,
  NARCOTICS_SEAL_CONDITIONS,
  NARCOTICS_STATUS_TONE,
} from '../../narcoticsIntake';
import { Select } from '../common/Select';
import { Field, inputCls } from './IntakeFormParts';
import { IntakeCheck, IntakeLayout, IntakeSection } from './IntakeLayout';

/**
 * Narcotics exhibit intake. The submitting officer (name, badge ID, mobile and
 * police station) comes read-only from the reception record; the laboratory
 * records the CR number, intake documents, receipt and a detailed description
 * of the exhibit. The K####/YYYY lab reference is issued by the server.
 */

interface NarcoticsIntakePageProps {
  /** The officer routed to Narcotics, or null while nobody has been sent. */
  visitor: OfficerVisitor | null;
  currentUserId: string;
  staffMembers: Pick<StaffUser, 'id' | 'name'>[];
  intakes: NarcoticsIntake[];
  onSaveIntake: (draft: NarcoticsIntakeDraft) => Promise<NarcoticsIntake>;
  onCancel: () => void;
  /** Open a registered exhibit with its details ready to change, instead of registering a new one. */
  editIntake?: NarcoticsIntake;
  /** Saves the changed intake (officer details stay as reception recorded them). */
  onSaveEdit?: (intakeId: string, draft: NarcoticsIntakeEdit) => Promise<void>;
}

const OTHER = 'Other';

const nairobiNow = () => {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Africa/Nairobi',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date());
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? '';
  return { date: `${get('year')}-${get('month')}-${get('day')}`, time: `${get('hour')}:${get('minute')}` };
};

const ReadOnly: React.FC<{ label: string; value: string; icon: React.ComponentType<{ className?: string }>; mono?: boolean }> = ({
  label,
  value,
  icon: Icon,
  mono,
}) => (
  <div className="min-w-0">
    <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
      <Icon className="h-3.5 w-3.5 text-slate-400" />
      {label}
    </div>
    <div
      aria-readonly="true"
      className={`mt-1.5 truncate rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 ${mono ? 'font-mono tracking-wider' : ''}`}
    >
      {value || '—'}
    </div>
  </div>
);

export const NarcoticsIntakePage: React.FC<NarcoticsIntakePageProps> = ({
  visitor,
  currentUserId,
  staffMembers,
  intakes,
  onSaveIntake,
  onCancel,
  editIntake,
  onSaveEdit,
}) => {
  const now = nairobiNow();
  const today = now.date;
  // Do not expose officer details until reception has notified Narcotics.
  const reception =
    visitor && visitor.laboratory === 'Narcotics' && visitor.labNotificationSentAt ? visitor : null;
  const editing = !!editIntake;
  // The submitting officer: held on the exhibit when editing, otherwise from the reception record.
  const sender = editIntake
    ? { officerName: editIntake.officerName, badgeNumber: editIntake.badgeNumber, phone: editIntake.officerMobile, station: editIntake.policeStation }
    : reception
      ? { officerName: reception.officerName, badgeNumber: reception.badgeNumber ?? '', phone: reception.phone, station: reception.station }
      : null;
  const knownType = !editIntake || NARCOTICS_EXHIBIT_TYPES.includes(editIntake.exhibitType);

  const [crNumber, setCrNumber] = useState(editIntake?.crNumber ?? '');
  const [documents, setDocuments] = useState<string[]>(editIntake?.documentsReceived ?? []);
  const [documentsConfirmed, setDocumentsConfirmed] = useState(false);
  const [receivingOfficerId, setReceivingOfficerId] = useState(editIntake?.receivingOfficerId ?? currentUserId);
  const [dateReceived, setDateReceived] = useState(editIntake?.dateReceived ?? today);
  const [timeReceived, setTimeReceived] = useState(editIntake?.timeReceived ?? now.time);
  const [exhibitChoice, setExhibitChoice] = useState(editIntake ? (knownType ? editIntake.exhibitType : OTHER) : '');
  const [otherExhibitType, setOtherExhibitType] = useState(editIntake && !knownType ? editIntake.exhibitType : '');
  const [numberOfItems, setNumberOfItems] = useState(String(editIntake?.numberOfItems ?? 1));
  const [packaging, setPackaging] = useState(editIntake?.packaging ?? '');
  const [sealCondition, setSealCondition] = useState<ExhibitItem['condition']>(editIntake?.sealCondition ?? 'Intact & Sealed');
  const [sealNumber, setSealNumber] = useState(editIntake?.sealNumber ?? '');
  const [markings, setMarkings] = useState(editIntake?.markings ?? '');
  const [declaredWeight, setDeclaredWeight] = useState(editIntake?.declaredWeight ?? '');
  const [colourAppearance, setColourAppearance] = useState(editIntake?.colourAppearance ?? '');
  const [description, setDescription] = useState(editIntake?.description ?? '');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const errorRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (saveError) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [saveError]);

  const exhibitType = exhibitChoice === OTHER ? otherExhibitType.trim() : exhibitChoice;
  const items = Number(numberOfItems);
  const itemsValid = Number.isInteger(items) && items >= 1 && items <= 10000;
  const descriptionLength = description.trim().length;
  const baseOptions = staffMembers.some((m) => m.id === currentUserId)
    ? staffMembers
    : [{ id: currentUserId, name: 'You' }, ...staffMembers];
  // Keep the original receiver selectable even if they have since left the department.
  const officerOptions = editIntake && !baseOptions.some((m) => m.id === editIntake.receivingOfficerId)
    ? [{ id: editIntake.receivingOfficerId, name: editIntake.receivingOfficer }, ...baseOptions]
    : baseOptions;

  const checks: IntakeCheck[] = [
    { label: 'CR number', value: crNumber.trim(), ok: crNumber.trim().length >= 2, section: 'intake-reference' },
    { label: 'Officer', value: sender?.officerName ?? '', ok: !!sender, section: 'intake-sender' },
    { label: 'Badge ID No.', value: sender?.badgeNumber ?? '', ok: !!sender?.badgeNumber?.trim(), section: 'intake-sender' },
    { label: 'Police station', value: sender?.station ?? '', ok: !!sender?.station?.trim(), section: 'intake-sender' },
    { label: 'Intake documents', value: documents.join(', '), ok: documents.length > 0, section: 'intake-documents' },
    { label: 'Receiving officer', value: officerOptions.find((m) => m.id === receivingOfficerId)?.name ?? '', ok: !!receivingOfficerId, section: 'intake-receipt' },
    { label: 'Received', value: dateReceived && timeReceived ? `${dateReceived} at ${timeReceived}` : '', ok: dateReceived !== '' && dateReceived <= today && timeReceived !== '', section: 'intake-receipt' },
    { label: 'Exhibit type', value: exhibitType, ok: exhibitType.length >= 2, section: 'intake-exhibit' },
    { label: 'Items & packaging', value: itemsValid && packaging.trim() ? `${items} · ${packaging.trim()}` : '', ok: itemsValid && packaging.trim().length >= 2, section: 'intake-exhibit' },
    { label: 'Description', value: descriptionLength ? `${descriptionLength} characters` : '', ok: descriptionLength >= NARCOTICS_DESCRIPTION_MIN, section: 'intake-exhibit' },
  ];
  const doneCount = checks.filter((c) => c.ok).length;
  const canSubmit = doneCount === checks.length;

  const toggleDocument = (doc: string) =>
    setDocuments((prev) => (prev.includes(doc) ? prev.filter((d) => d !== doc) : [...prev, doc]));

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!canSubmit || saving || (!editing && !reception)) return;
    setSaving(true);
    setSaveError('');
    const fields: NarcoticsIntakeEdit = {
        crNumber: crNumber.trim(),
        documentsReceived: documents,
        receivingOfficerId,
        dateReceived,
        timeReceived,
        exhibitType,
        numberOfItems: items,
        packaging: packaging.trim(),
        sealCondition,
        sealNumber: sealNumber.trim() || undefined,
        markings: markings.trim() || undefined,
        declaredWeight: declaredWeight.trim() || undefined,
        colourAppearance: colourAppearance.trim() || undefined,
        description: description.trim(),
    };
    try {
      if (editIntake) await onSaveEdit?.(editIntake.id, fields);
      else if (reception) await onSaveIntake({ ...fields, receptionVisitId: reception.id, documentsConfirmed });
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'The Narcotics exhibit could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const receiverName = officerOptions.find((m) => m.id === receivingOfficerId)?.name;

  return (
    <IntakeLayout
      back={{ label: editing ? 'Back' : 'Back to laboratory', onClick: onCancel }}
      reference={editIntake?.labReference ?? `K####/${today.slice(0, 4)}`}
      status={editing ? { label: 'Editing intake', tone: 'sky' } : { label: 'New intake', tone: 'teal' }}
      subtitle={['Narcotics', receiverName && `Received by ${receiverName}`, dateReceived]}
      notice={
        editing
          ? {
              tone: 'info',
              text: editIntake?.edited
                ? `Already edited on ${editIntake.editedDate}. Only the Head of Narcotics can make further changes.`
                : 'The officer who received this exhibit can edit it once; the Head can edit it until analysis starts. Officer details come from reception and cannot be changed.',
            }
          : reception
            ? { tone: 'info', text: `Officer details come from reception record ${reception.visitNumber}, registered by ${reception.receptionistName}, and cannot be edited here.` }
            : {
                tone: 'attention',
                text: 'No officer has been sent to Narcotics yet. You can fill in the exhibit details now, but it can only be registered for an officer reception has sent — open intake from the Exhibit Laboratory.',
              }
      }
      sections={[
        { id: 'intake-reference', title: 'Laboratory reference' },
        { id: 'intake-sender', title: 'Sender' },
        { id: 'intake-documents', title: 'Intake documents' },
        { id: 'intake-receipt', title: 'Receipt' },
        { id: 'intake-exhibit', title: 'Sample description' },
      ]}
      checks={checks}
      previewTitle="Intake preview"
      nextSteps={[
        { title: 'Registered', text: 'You register the exhibit and it receives its K-number lab reference.' },
        { title: 'Analysis Officer assigned', text: 'The Head of Narcotics assigns an officer to analyse the exhibit.' },
        { title: 'Draft Report of Analysis', text: 'The officer fills in and submits the Draft Report of Analysis, which completes the analysis.' },
        { title: 'Draft report approved', text: 'The Head checks, signs and approves the draft report.' },
        { title: 'Report of Government Analyst', text: 'The Head approves the final report generated from the draft; it can then be printed.' },
        { title: 'Memo approved', text: 'The Head approves the intake documents and the memo, which can then be printed.' },
      ]}
      recent={{
        title: 'Recent intakes',
        caption: `${intakes.length} in the register`,
        empty: 'No exhibits registered yet.',
        items: intakes.map((intake) => ({
          id: intake.id,
          primary: intake.policeStation,
          secondary: `${intake.labReference} · ${intake.crNumber}`,
          status: { label: intake.status, tone: NARCOTICS_STATUS_TONE[intake.status] },
        })),
      }}
      onSubmit={handleSubmit}
      onCancel={onCancel}
      submitLabel={editing ? 'Save changes' : 'Register exhibit'}
      saving={saving}
      canSubmit={canSubmit && (editing || !!reception)}
      barMessage={!editing && !reception && canSubmit ? 'waiting for reception to send an officer' : undefined}
      error={saveError}
      errorRef={errorRef}
    >
      {/* 1. Laboratory reference */}
      <IntakeSection id="intake-reference" icon={Hash} title="Laboratory reference" description="The lab reference is issued in sequence for the year received. The CR number is the police case reference.">
        <Field label="Lab reference" hint={`Issued when registered, e.g. K0001/${today.slice(0, 4)}`}>
          <input
            type="text"
            value={editIntake?.labReference ?? 'Issued when registered'}
            readOnly
            tabIndex={-1}
            aria-readonly="true"
            className={`${inputCls.replace('bg-white', '').replace('dark:bg-slate-950', '')} pointer-events-none select-none bg-slate-100 font-mono font-semibold text-slate-700 dark:bg-slate-800/60 dark:text-slate-200`}
          />
        </Field>
        <Field label="CR number" required icon={Hash} hint="As written on the police exhibit memo">
          <input
            value={crNumber}
            onChange={(e) => setCrNumber(e.target.value)}
            maxLength={100}
            placeholder="e.g. CR 123/45/2026"
            className={`${inputCls} font-mono`}
          />
        </Field>
      </IntakeSection>

      {/* 2. Sender */}
      <IntakeSection id="intake-sender" icon={Shield} title="Sender" description="The police officer delivering the exhibit, as recorded at reception.">
        <ReadOnly label="Officer name" value={sender?.officerName ?? ''} icon={User} />
        <ReadOnly label="Badge ID No." value={sender?.badgeNumber ?? ''} icon={BadgeCheck} mono />
        <ReadOnly label="Mobile" value={sender?.phone ?? ''} icon={Phone} mono />
        <ReadOnly label="Police station" value={sender?.station ?? ''} icon={Shield} />
        {reception && !reception.badgeNumber?.trim() && (
          <p role="alert" className="text-xs text-rose-500 sm:col-span-2">
            Reception did not record a badge ID number. Ask reception to add it before registering this exhibit.
          </p>
        )}
      </IntakeSection>

      {/* 3. Intake documents */}
      <IntakeSection id="intake-documents" icon={FileText} title="Intake documents" description="Tick every document handed over with the exhibit, then confirm they are in order.">
        <div className="flex flex-wrap gap-2 sm:col-span-2" role="group" aria-label="Documents received">
          {NARCOTICS_DOCUMENTS.map((doc) => {
            const on = documents.includes(doc);
            return (
              <button
                key={doc}
                type="button"
                aria-pressed={on}
                onClick={() => toggleDocument(doc)}
                className={`inline-flex cursor-pointer items-center gap-1.5 rounded-lg border px-3 py-1.5 text-xs font-medium transition-colors ${
                  on
                    ? 'border-teal-500/70 text-teal-700 dark:text-teal-300'
                    : 'border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-500/[0.05] dark:border-slate-700 dark:text-slate-300'
                }`}
              >
                {on && <Check className="h-3 w-3" strokeWidth={3} />}
                {doc}
              </button>
            );
          })}
        </div>
        {reception?.documentsPresented && (
          <p className="text-[11px] text-slate-500 sm:col-span-2 dark:text-slate-400">
            Recorded at reception: {reception.documentsPresented}
          </p>
        )}
        {!editing && (
          <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-slate-700 sm:col-span-2 dark:text-slate-200">
            <input
              type="checkbox"
              checked={documentsConfirmed}
              onChange={(event) => setDocumentsConfirmed(event.target.checked)}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500"
            />
            <span>
              Documents checked
              <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                Tick once the submitted documents have been checked. The Head cannot approve the memo until this is ticked.
              </span>
            </span>
          </label>
        )}
      </IntakeSection>

      {/* 4. Receipt */}
      <IntakeSection id="intake-receipt" icon={PackageCheck} title="Receipt" description="The officer taking custody of the exhibit, and when.">
        <Field label="Receiving officer" required icon={UserCheck} hint="Defaults to you" className="sm:col-span-2">
          <Select
            aria-label="Receiving officer"
            value={receivingOfficerId}
            onChange={setReceivingOfficerId}
            placeholder="Select officer…"
            options={officerOptions.map((member) => ({ value: member.id, label: member.name }))}
          />
        </Field>
        <Field label="Date received" required icon={Calendar} error={dateReceived > today} hint={dateReceived > today ? 'Cannot be in the future' : undefined}>
          <input type="date" max={today} value={dateReceived} onChange={(e) => setDateReceived(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Time received" required icon={Clock}>
          <input type="time" value={timeReceived} onChange={(e) => setTimeReceived(e.target.value)} className={inputCls} />
        </Field>
      </IntakeSection>

      {/* 5. Sample description */}
      <IntakeSection id="intake-exhibit" icon={Pill} title="Sample description" description="Describe the exhibit exactly as received: what it is, how it is packed and sealed, and how it looks.">
        <Field label="Exhibit type" required>
          <Select
            aria-label="Exhibit type"
            value={exhibitChoice}
            onChange={setExhibitChoice}
            placeholder="Select type…"
            options={[...NARCOTICS_EXHIBIT_TYPES, OTHER].map((type) => ({ value: type, label: type }))}
          />
        </Field>
        {exhibitChoice === OTHER && (
          <Field label="Describe the type" required>
            <input value={otherExhibitType} onChange={(e) => setOtherExhibitType(e.target.value)} maxLength={100} className={inputCls} />
          </Field>
        )}
        <Field label="Number of items / packages" required error={!itemsValid} hint={!itemsValid ? 'Enter a whole number from 1' : undefined}>
          <input type="number" min={1} max={10000} value={numberOfItems} onChange={(e) => setNumberOfItems(e.target.value)} className={inputCls} />
        </Field>
        <Field label="Packaging" required hint="e.g. Khaki envelope, polythene bag, sack">
          <input value={packaging} onChange={(e) => setPackaging(e.target.value)} maxLength={200} className={inputCls} />
        </Field>
        <Field label="Seal condition" required>
          <Select
            aria-label="Seal condition"
            value={sealCondition}
            onChange={(value) => setSealCondition(value as ExhibitItem['condition'])}
            options={NARCOTICS_SEAL_CONDITIONS.map((condition) => ({ value: condition, label: condition }))}
          />
        </Field>
        <Field label="Seal number" hint="Optional">
          <input value={sealNumber} onChange={(e) => setSealNumber(e.target.value)} maxLength={100} className={`${inputCls} font-mono`} />
        </Field>
        <Field label="Markings / labels" hint="Optional — e.g. exhibit A, B; officer's initials">
          <input value={markings} onChange={(e) => setMarkings(e.target.value)} maxLength={300} className={inputCls} />
        </Field>
        <Field label="Declared weight / quantity" hint="Optional — as stated on the memo, e.g. 2.5 kg gross">
          <input value={declaredWeight} onChange={(e) => setDeclaredWeight(e.target.value)} maxLength={100} className={inputCls} />
        </Field>
        <Field label="Colour / appearance" hint="Optional — e.g. greenish-brown dry leaves">
          <input value={colourAppearance} onChange={(e) => setColourAppearance(e.target.value)} maxLength={200} className={inputCls} />
        </Field>
        <Field
          label="Detailed description"
          required
          className="sm:col-span-2"
          error={descriptionLength > 0 && descriptionLength < NARCOTICS_DESCRIPTION_MIN}
          hint={`${descriptionLength} / 4000 characters · at least ${NARCOTICS_DESCRIPTION_MIN}. Describe each item, its contents, condition and anything unusual.`}
        >
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={4000}
            rows={6}
            placeholder="e.g. One khaki envelope sealed with police seal, containing two polythene bags marked A and B, each holding greenish-brown dry plant material with seeds and stems…"
            className={`${inputCls} resize-y leading-relaxed`}
          />
        </Field>
      </IntakeSection>
    </IntakeLayout>
  );
};
