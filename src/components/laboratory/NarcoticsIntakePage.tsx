import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Calendar,
  Check,
  CircleDashed,
  Clock,
  ClipboardList,
  FileText,
  Hash,
  History,
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
import { Button, DashboardHeader, DashboardPage, Panel, StatusPill } from '../common/Dashboard';
import { Select } from '../common/Select';
import { Field, Section, inputCls } from './IntakeFormParts';

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

  const checks = [
    { label: 'Officer', value: sender?.officerName ?? '', ok: !!sender },
    { label: 'Badge ID No.', value: sender?.badgeNumber ?? '', ok: !!sender?.badgeNumber?.trim() },
    { label: 'Police station', value: sender?.station ?? '', ok: !!sender?.station?.trim() },
    { label: 'CR number', value: crNumber.trim(), ok: crNumber.trim().length >= 2 },
    { label: 'Intake documents', value: documents.join(', '), ok: documents.length > 0 },
    { label: 'Receiving officer', value: officerOptions.find((m) => m.id === receivingOfficerId)?.name ?? '', ok: !!receivingOfficerId },
    { label: 'Received', value: dateReceived && timeReceived ? `${dateReceived} at ${timeReceived}` : '', ok: dateReceived !== '' && dateReceived <= today && timeReceived !== '' },
    { label: 'Exhibit type', value: exhibitType, ok: exhibitType.length >= 2 },
    { label: 'Items & packaging', value: itemsValid && packaging.trim() ? `${items} · ${packaging.trim()}` : '', ok: itemsValid && packaging.trim().length >= 2 },
    { label: 'Description', value: descriptionLength ? `${descriptionLength} characters` : '', ok: descriptionLength >= NARCOTICS_DESCRIPTION_MIN },
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

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Laboratory', 'Narcotics', 'Exhibit intake']}
        title={editing ? 'Edit exhibit intake' : 'Exhibit intake'}
        meta={<StatusPill tone="violet" dot={false}>{editIntake?.labReference ?? `K####/${today.slice(0, 4)}`}</StatusPill>}
        description={editing
          ? 'Change the details you need to and save. The officer details come from reception and cannot be changed.'
          : 'Record an exhibit submitted to the Narcotics laboratory by a police officer.'}
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
          {editing ? (
            <div role="status" className="flex items-center gap-2 border-b border-sky-500/20 bg-sky-500/5 px-5 py-2.5 text-xs text-sky-700 dark:text-sky-300">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              {editIntake?.edited
                ? `Already edited on ${editIntake.editedDate}. Only the Head of Narcotics can make further changes.`
                : 'The officer who received this exhibit can edit it once; the Head can edit it until analysis starts.'}
            </div>
          ) : reception ? (
            <div className="flex items-center gap-2 border-b border-sky-500/20 bg-sky-500/5 px-5 py-2.5 text-xs text-sky-700 dark:text-sky-300">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              Officer details come from reception record {reception.visitNumber}, registered by {reception.receptionistName}, and cannot be edited here.
            </div>
          ) : (
            <div role="status" className="flex items-center gap-2 border-b border-teal-500/20 bg-teal-500/5 px-5 py-2.5 text-xs text-teal-700 dark:text-teal-300">
              <FileText className="h-3.5 w-3.5 shrink-0" />
              No officer has been sent to Narcotics yet. You can fill in the exhibit details now, but it can only be registered for an officer reception has sent — open intake from the Exhibit Laboratory.
            </div>
          )}

          {/* 1. Laboratory reference */}
          <Section icon={Hash} title="Laboratory reference" description="The lab reference is issued in sequence for the year received. The CR number is the police case reference.">
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
          </Section>

          {/* 2. Sender */}
          <Section icon={Shield} title="Sender" description="The police officer delivering the exhibit, as recorded at reception.">
            <ReadOnly label="Officer name" value={sender?.officerName ?? ''} icon={User} />
            <ReadOnly label="Badge ID No." value={sender?.badgeNumber ?? ''} icon={BadgeCheck} mono />
            <ReadOnly label="Mobile" value={sender?.phone ?? ''} icon={Phone} mono />
            <ReadOnly label="Police station" value={sender?.station ?? ''} icon={Shield} />
            {reception && !reception.badgeNumber?.trim() && (
              <p role="alert" className="text-xs text-rose-500 sm:col-span-2">
                Reception did not record a badge ID number. Ask reception to add it before registering this exhibit.
              </p>
            )}
          </Section>

          {/* 3. Intake documents */}
          <Section icon={FileText} title="Intake documents" description="Tick every document handed over with the exhibit, then confirm they are in order.">
            <div className="flex flex-wrap gap-2 sm:col-span-2" role="group" aria-label="Documents received">
              {NARCOTICS_DOCUMENTS.map((doc) => {
                const on = documents.includes(doc);
                return (
                  <button
                    key={doc}
                    type="button"
                    aria-pressed={on}
                    onClick={() => toggleDocument(doc)}
                    className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-xs font-medium transition-colors ${
                      on
                        ? 'border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-300'
                        : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/40'
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
                Intake documents are approved
                <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                  Tick once the submitted documents have been checked. The Head cannot approve the memo until this is ticked.
                </span>
              </span>
            </label>
            )}
          </Section>

          {/* 4. Receipt */}
          <Section icon={PackageCheck} title="Receipt" description="The officer taking custody of the exhibit, and when.">
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
          </Section>

          {/* 5. Sample description */}
          <Section icon={Pill} title="Sample description" description="Describe the exhibit exactly as received: what it is, how it is packed and sealed, and how it looks." last>
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
          </Section>

          {/* Footer */}
          <div className="flex flex-col-reverse gap-3 border-t border-slate-200 bg-slate-50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950/40">
            <div className="flex items-center gap-3">
              <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
                <div className="h-full rounded-full bg-violet-500 transition-all" style={{ width: `${(doneCount / checks.length) * 100}%` }} />
              </div>
              <span className="text-xs text-slate-500 dark:text-slate-400">{doneCount} of {checks.length} required fields</span>
            </div>
            <div className="flex gap-2">
              <Button onClick={onCancel}>Cancel</Button>
              <Button type="submit" variant="primaryTeal" icon={Check} disabled={!canSubmit || saving}>
                {saving ? 'Saving…' : editing ? 'Save changes' : 'Register exhibit'}
              </Button>
            </div>
          </div>
          {saveError && (
            <div ref={errorRef} role="alert" className="border-t border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
              {saveError}
            </div>
          )}
        </form>

        {/* ------------------------------ Aside ----------------------------- */}
        <aside className="space-y-5 lg:sticky lg:top-4 lg:col-span-4">
          <Panel icon={ClipboardList} tone="violet" title="Intake preview" description={editIntake?.labReference ?? 'Lab reference issued on registration'}>
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
            </ul>
          </Panel>

          <Panel icon={UserCheck} tone="teal" title="What happens next">
            <ol className="space-y-3 text-xs">
              {[
                { title: 'Registered', text: 'You register the exhibit and it receives its K-number lab reference.', active: true },
                { title: 'Analysis Officer assigned', text: 'The Head of Narcotics assigns an officer to analyse the exhibit.' },
                { title: 'Analysis complete', text: 'The assigned officer records the findings and marks the analysis complete.' },
                { title: 'Documents and memo approved', text: 'The Head approves the intake documents, then the memo, which can then be printed.' },
              ].map((step, i) => (
                <li key={step.title} className="flex gap-3">
                  <span
                    className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-full text-[11px] font-semibold ${
                      step.active ? 'bg-violet-500 text-white' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
                    }`}
                  >
                    {i + 1}
                  </span>
                  <div className="pt-0.5">
                    <div className="font-medium text-slate-900 dark:text-white">{step.title}</div>
                    <div className="mt-0.5 leading-relaxed text-slate-500 dark:text-slate-400">{step.text}</div>
                  </div>
                </li>
              ))}
            </ol>
          </Panel>

          <Panel icon={History} title="Recent intakes" description={`${intakes.length} in the Narcotics register`} flush>
            {intakes.length === 0 ? (
              <p className="px-4 py-5 text-center text-xs text-slate-400">No exhibits registered yet.</p>
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {intakes.slice(0, 4).map((intake) => (
                  <li key={intake.id} className="flex items-center justify-between gap-2 px-4 py-2.5 text-xs">
                    <div className="min-w-0">
                      <div className="truncate font-medium text-slate-900 dark:text-white">{intake.policeStation}</div>
                      <div className="truncate font-mono text-[11px] text-slate-400">{intake.labReference} · {intake.crNumber}</div>
                    </div>
                    <StatusPill tone={NARCOTICS_STATUS_TONE[intake.status]}>{intake.status}</StatusPill>
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
