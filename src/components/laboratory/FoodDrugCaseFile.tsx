import React, { useEffect, useState } from 'react';
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardSignature,
  FileCheck,
  FileText,
  Loader2,
  Lock,
  Save,
  TestTube,
  FlaskConical,
  Paperclip,
  Send,
} from 'lucide-react';
import { FoodDrugIntake, FoodDrugIntakeStatus, FoodDrugReceiptForm, FoodDrugWorksheet, User } from '../../types';
import { apiRequest } from '../../lib/api';
import { Button, StatusPill, Tone } from '../common/Dashboard';
import { WorkAllocationViewer } from './WorkAllocationForm';

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

type EditableFields = Pick<
  FoodDrugReceiptForm,
  'senderPhysicalAddress' | 'sampleDescription' | 'examinationRequired' | 'invoiceNumber' | 'receiptNumber'
> & { feeKes: string };

const emptyEditable: EditableFields = {
  senderPhysicalAddress: '',
  sampleDescription: '',
  examinationRequired: '',
  feeKes: '',
  invoiceNumber: '',
  receiptNumber: '',
};

const fromForm = (form: FoodDrugReceiptForm): EditableFields => ({
  senderPhysicalAddress: form.senderPhysicalAddress ?? '',
  sampleDescription: form.sampleDescription ?? '',
  examinationRequired: form.examinationRequired ?? '',
  feeKes: form.feeKes == null ? '' : String(form.feeKes),
  invoiceNumber: form.invoiceNumber ?? '',
  receiptNumber: form.receiptNumber ?? '',
});

const formatKsh = (value: number | null | undefined) =>
  value == null ? '—' : `KSh ${value.toLocaleString('en-KE', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

/**
 * The Food & Drugs case file an analyst opens to work a sample: the analytical
 * sample receipt form (sender and submitter come from reception and are read
 * only), then the laboratory worksheet the analyst submits and the Head checks.
 */
export const FoodDrugCaseFile: React.FC<FoodDrugCaseFileProps> = ({ intake, currentUser, onBack, onChanged }) => {
  const [form, setForm] = useState<FoodDrugReceiptForm | null>(null);
  const [prefill, setPrefill] = useState<FoodDrugReceiptForm | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [values, setValues] = useState<EditableFields>(emptyEditable);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState('');
  const [savedNote, setSavedNote] = useState('');
  const [viewingAllocation, setViewingAllocation] = useState(false);

  const isHead = currentUser.role === 'HEAD_OF_DEPARTMENT';
  const isAssigned = !!intake.analystId && intake.analystId === currentUser.id;

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setLoadError('');
    apiRequest<{ form: FoodDrugReceiptForm | null; prefill: FoodDrugReceiptForm; canEdit: boolean }>(
      `/api/food-drug/intakes/${encodeURIComponent(intake.id)}/receipt-form`,
    )
      .then((result) => {
        if (cancelled) return;
        setForm(result.form);
        setPrefill(result.prefill);
        setCanEdit(result.canEdit);
        setValues(fromForm(result.form ?? result.prefill));
      })
      .catch((cause: unknown) => {
        if (!cancelled) setLoadError(cause instanceof Error ? cause.message : 'Could not load the receipt form.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [intake.id, intake.status, intake.analystId]);

  // Fixed details: the saved form once it exists, else what reception recorded.
  const fixed = form ?? prefill;
  const set = (key: keyof EditableFields) => (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setValues((previous) => ({ ...previous, [key]: event.target.value }));

  const fee = Number(values.feeKes);
  const missing = [
    values.senderPhysicalAddress.trim().length < 2 && 'physical address',
    values.sampleDescription.trim().length < 5 && 'description of samples',
    values.examinationRequired.trim().length < 3 && 'examination required',
    (values.feeKes.trim() === '' || !Number.isFinite(fee) || fee < 0) && 'fee',
    !values.invoiceNumber.trim() && 'invoice number',
    !values.receiptNumber.trim() && 'receipt number',
  ].filter(Boolean) as string[];
  const dirty = !form || JSON.stringify(fromForm(form)) !== JSON.stringify(values);

  const save = async () => {
    if (missing.length || saving) return;
    setSaving(true);
    setSaveError('');
    setSavedNote('');
    try {
      const result = await apiRequest<{ form: FoodDrugReceiptForm }>(
        `/api/food-drug/intakes/${encodeURIComponent(intake.id)}/receipt-form`,
        { method: 'PUT', body: JSON.stringify({ ...values, feeKes: fee }) },
      );
      setForm(result.form);
      setValues(fromForm(result.form));
      setSavedNote(`Saved ${result.form.updatedAt}`);
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'The receipt form could not be saved.');
    } finally {
      setSaving(false);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

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

      {/* Analytical sample receipt form */}
      <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/50">
          <div className="flex items-start gap-3">
            <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-800 text-[11px] font-semibold text-white dark:bg-slate-700 dark:text-slate-100">1</span>
            <div>
              <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
                <FileText className="h-4 w-4 text-slate-400" /> Analytical sample receipt form
              </h2>
              <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
                Sender and submitter details come from reception and cannot be changed here.
              </p>
            </div>
          </div>
          <StatusPill tone={form ? 'emerald' : 'amber'} dot={false}>{form ? 'Saved' : 'Not saved yet'}</StatusPill>
        </div>

        {loading ? (
          <p className="flex items-center gap-2 px-5 py-8 text-sm text-slate-500 dark:text-slate-400">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading the form…
          </p>
        ) : loadError || !fixed ? (
          <p role="alert" className="px-5 py-8 text-sm text-rose-600 dark:text-rose-400">{loadError || 'The form could not be loaded.'}</p>
        ) : (
          <form
            onSubmit={(event) => {
              event.preventDefault();
              void save();
            }}
          >
            <div className="grid gap-x-8 gap-y-6 px-5 py-5 lg:grid-cols-2">
              <FormGroup title="Sample">
                <Row label="Lab reference (sample)" value={intake.id} mono />
                <Row label="Date" value={fixed.formDate} />
              </FormGroup>

              <FormGroup title="Sender's details" locked>
                <Row label="Name" value={fixed.senderName} />
                <EditRow label="Physical address" required editable={canEdit} value={values.senderPhysicalAddress} display={fixed.senderPhysicalAddress}>
                  <input value={values.senderPhysicalAddress} onChange={set('senderPhysicalAddress')} placeholder="e.g. Industrial Area, Enterprise Road, Nairobi" className={inputCls} />
                </EditRow>
                <Row label="Postal address" value={fixed.senderPostalAddress} />
                <Row label="Telephone number" value={fixed.senderTelephone} />
              </FormGroup>

              <FormGroup title="Person submitting the sample" locked>
                <Row label="Name" value={fixed.submitterName} />
                <Row label="ID number" value={fixed.submitterIdNumber} mono />
              </FormGroup>

              <FormGroup title="Receiving">
                <Row label="Analyst receiving" value={fixed.analystReceiving ?? intake.analystAssigned ?? '—'} />
                <Row label="Date" value={fixed.analystReceivedDate} />
              </FormGroup>

              <div className="space-y-4 lg:col-span-2">
                <h3 className="border-b border-slate-200 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:border-slate-800 dark:text-slate-400">
                  Samples, examination and payment
                </h3>
                <EditRow label="Description of samples (including source and location)" required editable={canEdit} value={values.sampleDescription} display={fixed.sampleDescription} block>
                  <textarea rows={3} value={values.sampleDescription} onChange={set('sampleDescription')} placeholder="e.g. 2 kg dry maize grain in a sealed sack, taken from store 4, Kitale NCPB depot" className={inputCls} />
                </EditRow>
                <EditRow label="Examination required" required editable={canEdit} value={values.examinationRequired} display={fixed.examinationRequired} block>
                  <textarea rows={2} value={values.examinationRequired} onChange={set('examinationRequired')} placeholder="e.g. Total aflatoxin and aflatoxin B1 by HPLC-FLD" className={inputCls} />
                </EditRow>
                <div className="grid gap-4 sm:grid-cols-3">
                  <EditRow label="Fee (KSh)" required editable={canEdit} value={values.feeKes} display={formatKsh(fixed.feeKes)} block>
                    <input type="number" min={0} step="0.01" inputMode="decimal" value={values.feeKes} onChange={set('feeKes')} placeholder="0.00" className={`${inputCls} font-mono`} />
                  </EditRow>
                  <EditRow label="Invoice number" required editable={canEdit} value={values.invoiceNumber} display={fixed.invoiceNumber} block>
                    <input value={values.invoiceNumber} onChange={set('invoiceNumber')} placeholder="e.g. INV-2026-00481" className={`${inputCls} font-mono`} />
                  </EditRow>
                  <EditRow label="Receipt number" required editable={canEdit} value={values.receiptNumber} display={fixed.receiptNumber} block>
                    <input value={values.receiptNumber} onChange={set('receiptNumber')} placeholder="e.g. RCT-2026-00481" className={`${inputCls} font-mono`} />
                  </EditRow>
                </div>
              </div>
            </div>

            {(saveError || canEdit) && (
              <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950/40">
                <span className={`text-[11px] ${saveError ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`} role={saveError ? 'alert' : undefined}>
                  {saveError ||
                    savedNote ||
                    (missing.length ? `Still to fill in: ${missing.join(', ')}.` : form ? `Last saved ${form.updatedAt} by ${form.updatedBy}.` : 'Ready to save.')}
                </span>
                {canEdit && (
                  <Button type="submit" variant="primary" icon={Save} disabled={!!missing.length || saving || !dirty}>
                    {saving ? 'Saving…' : form ? 'Update receipt form' : 'Save receipt form'}
                  </Button>
                )}
              </div>
            )}
          </form>
        )}
      </section>

      <LaboratoryWorksheetSection
        intake={intake}
        currentUser={currentUser}
        receiptVersion={form?.updatedAt ?? ''}
        onChanged={onChanged}
      />

      {viewingAllocation && (
        <WorkAllocationViewer recordType="FOOD_DRUG_INTAKE" recordId={intake.id} onClose={() => setViewingAllocation(false)} />
      )}
    </div>
  );
};

const FormGroup: React.FC<{ title: string; locked?: boolean; children: React.ReactNode }> = ({ title, locked, children }) => (
  <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
    <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/50">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">{title}</h3>
      {locked && (
        <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
          <Lock className="h-3 w-3" /> From reception
        </span>
      )}
    </div>
    <dl className="divide-y divide-slate-100 dark:divide-slate-800">{children}</dl>
  </div>
);

const Row: React.FC<{ label: string; value?: string | null; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="grid grid-cols-[9rem_minmax(0,1fr)]">
    <dt className="border-r border-slate-100 bg-slate-50/70 px-3 py-2 text-[11px] font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400">{label}</dt>
    <dd className={`min-w-0 break-words px-3 py-2 text-[13px] font-medium text-slate-900 dark:text-white ${mono ? 'font-mono' : ''}`}>{value || '—'}</dd>
  </div>
);

/** A field that is an input while the form can be filled, and plain text otherwise. */
const EditRow: React.FC<{
  label: string;
  required?: boolean;
  editable: boolean;
  value: string;
  display?: string | null;
  /** Full-width label above the control instead of a table row. */
  block?: boolean;
  children: React.ReactNode;
}> = ({ label, required, editable, display, block, children }) =>
  block ? (
    <label className="block">
      <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
        {label} {required && editable && <span className="text-rose-500">*</span>}
      </span>
      <div className="mt-1.5">
        {editable ? children : <p className="whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-100">{display || '—'}</p>}
      </div>
    </label>
  ) : editable ? (
    <div className="grid grid-cols-[9rem_minmax(0,1fr)]">
      <dt className="border-r border-slate-100 bg-slate-50/70 px-3 py-2 text-[11px] font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400">
        {label} {required && <span className="text-rose-500">*</span>}
      </dt>
      <dd className="min-w-0 px-2 py-1.5">{children}</dd>
    </div>
  ) : (
    <Row label={label} value={display} />
  );

interface WorksheetSectionProps {
  intake: FoodDrugIntake;
  currentUser: Pick<User, 'id' | 'name' | 'role'>;
  /** Changes whenever the receipt form is saved, so the description is re-read. */
  receiptVersion: string;
  /** Called after a submit or check so the register reflects the new stage. */
  onChanged?: () => void;
}

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());

/**
 * The laboratory worksheet: lab reference, the date the analysis started, the
 * sample description from the receipt form, test methods and (optional)
 * results. The analyst submits it ("Analysed by" + date) and the Head of
 * Section checks it ("Checked by" + date). GC-MS / UV-Vis charts come later.
 */
const LaboratoryWorksheetSection: React.FC<WorksheetSectionProps> = ({ intake, currentUser, receiptVersion, onChanged }) => {
  const [worksheet, setWorksheet] = useState<FoodDrugWorksheet | null>(null);
  const [meta, setMeta] = useState<{
    sampleDescription: string | null;
    intakeDate: string;
    canEdit: boolean;
    canSubmit: boolean;
    canCheck: boolean;
  } | null>(null);
  const [startedOn, setStartedOn] = useState('');
  const [testMethods, setTestMethods] = useState('');
  const [results, setResults] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'save' | 'submit' | 'check' | null>(null);
  const [error, setError] = useState('');
  const [note, setNote] = useState('');
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);

  const adopt = (sheet: FoodDrugWorksheet | null) => {
    setWorksheet(sheet);
    setStartedOn(sheet?.analysisStartedOn ?? '');
    setTestMethods(sheet?.testMethods ?? '');
    setResults(sheet?.results ?? '');
  };

  const load = async () => {
    const result = await apiRequest<{
      worksheet: FoodDrugWorksheet | null;
      sampleDescription: string | null;
      intakeDate: string;
      canEdit: boolean;
      canSubmit: boolean;
      canCheck: boolean;
    }>(`/api/food-drug/intakes/${encodeURIComponent(intake.id)}/worksheet`);
    adopt(result.worksheet);
    setMeta(result);
  };

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError('');
    load()
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load the worksheet.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [intake.id, intake.status, receiptVersion]);

  const max = today();
  const dateProblem = !startedOn
    ? 'Enter the date the analysis started.'
    : meta && startedOn < meta.intakeDate
      ? `The analysis cannot start before the sample was received (${meta.intakeDate}).`
      : startedOn > max
        ? 'The start date cannot be in the future.'
        : '';
  const methodsProblem = testMethods.trim().length < 3 ? 'Describe the test methods used.' : '';
  const problem = dateProblem || methodsProblem;
  const dirty =
    (worksheet?.analysisStartedOn ?? '') !== startedOn ||
    (worksheet?.testMethods ?? '') !== testMethods ||
    (worksheet?.results ?? '') !== results;

  const run = async (action: 'save' | 'submit' | 'check') => {
    setBusy(action);
    setError('');
    setNote('');
    try {
      const path = `/api/food-drug/intakes/${encodeURIComponent(intake.id)}/worksheet${action === 'save' ? '' : `/${action}`}`;
      const body = action === 'check' ? '{}' : JSON.stringify({ analysisStartedOn: startedOn, testMethods, results });
      const { worksheet: saved } = await apiRequest<{ worksheet: FoodDrugWorksheet }>(path, {
        method: action === 'save' ? 'PUT' : 'POST',
        body,
      });
      adopt(saved);
      await load();
      setNote(action === 'save' ? `Draft saved ${saved.updatedAt}.` : action === 'submit' ? 'Submitted to the Head of Section for checking.' : 'Worksheet checked.');
      if (action !== 'save') onChanged?.();
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The worksheet could not be saved.');
    } finally {
      setBusy(null);
      setConfirmingSubmit(false);
    }
  };

  const fieldCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white';
  const editable = !!meta?.canEdit;
  const stage = worksheet?.checkedDate ? 'Checked' : worksheet?.analysedDate ? 'Awaiting check' : worksheet ? 'Draft' : 'Not started';
  const stageTone: Tone = stage === 'Checked' ? 'emerald' : stage === 'Awaiting check' ? 'violet' : stage === 'Draft' ? 'amber' : 'slate';

  return (
    <section className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
      <div className="flex flex-wrap items-start justify-between gap-3 border-b border-slate-200 bg-slate-50 px-5 py-3 dark:border-slate-800 dark:bg-slate-950/50">
        <div className="flex items-start gap-3">
          <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-800 text-[11px] font-semibold text-white dark:bg-slate-700 dark:text-slate-100">2</span>
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
              <FlaskConical className="h-4 w-4 text-slate-400" /> Laboratory worksheet
            </h2>
            <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">
              Filled in by the analyst after the receipt form, then checked by the Head of Section.
            </p>
          </div>
        </div>
        <StatusPill tone={stageTone} dot={false}>{stage}</StatusPill>
      </div>

      {loading ? (
        <p className="flex items-center gap-2 px-5 py-8 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading the worksheet…
        </p>
      ) : !meta ? (
        <p role="alert" className="px-5 py-8 text-sm text-rose-600 dark:text-rose-400">{error || 'The worksheet could not be loaded.'}</p>
      ) : !meta.sampleDescription ? (
        <p className="flex items-center gap-2 px-5 py-6 text-sm text-slate-500 dark:text-slate-400">
          <Lock className="h-4 w-4" /> Save the analytical sample receipt form first — the worksheet takes the sample description from it.
        </p>
      ) : (
        <>
          <div className="grid gap-x-8 gap-y-5 px-5 py-5 lg:grid-cols-2">
            <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
              <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                <Row label="Lab reference" value={intake.id} mono />
                {editable ? (
                  <div className="grid grid-cols-[9rem_minmax(0,1fr)]">
                    <dt className="border-r border-slate-100 bg-slate-50/70 px-3 py-2 text-[11px] font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400">
                      Date analysis started <span className="text-rose-500">*</span>
                    </dt>
                    <dd className="min-w-0 px-2 py-1.5">
                      <input type="date" min={meta.intakeDate} max={max} value={startedOn} onChange={(event) => setStartedOn(event.target.value)} className={fieldCls} />
                    </dd>
                  </div>
                ) : (
                  <Row label="Date analysis started" value={worksheet?.analysisStartedOn} />
                )}
                <Row label="Sample received" value={meta.intakeDate} />
              </dl>
            </div>
            <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
              <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                <Row label="Analysed by" value={worksheet?.analysedBy ? `${worksheet.analysedBy} · ${worksheet.analysedDate}` : `Pending — ${intake.analystAssigned ?? 'allocated analyst'}`} />
                <Row label="Checked by" value={worksheet?.checkedBy ? `${worksheet.checkedBy} · ${worksheet.checkedDate}` : 'Pending — Head of Section'} />
              </dl>
            </div>

            <div className="space-y-4 lg:col-span-2">
              <div>
                <div className="flex items-center gap-1.5 text-xs font-medium text-slate-700 dark:text-slate-300">
                  Description of samples <span className="flex items-center gap-1 text-[10px] font-normal text-slate-500 dark:text-slate-400"><Lock className="h-3 w-3" /> from the receipt form</span>
                </div>
                <p className="mt-1.5 whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-100">
                  {meta.sampleDescription}
                </p>
              </div>
              <label className="block">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Test methods {editable && <span className="text-rose-500">*</span>}
                </span>
                {editable ? (
                  <textarea rows={3} value={testMethods} onChange={(event) => setTestMethods(event.target.value)} placeholder="e.g. Aflatoxins B1, B2, G1, G2 by HPLC-FLD after immunoaffinity clean-up (AOAC 991.31)" className={`mt-1.5 ${fieldCls}`} />
                ) : (
                  <p className="mt-1.5 whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-800 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-100">{worksheet?.testMethods || '—'}</p>
                )}
              </label>
              <label className="block">
                <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                  Results <span className="font-normal text-slate-500 dark:text-slate-400">(optional — findings and computations)</span>
                </span>
                {editable ? (
                  <textarea rows={6} value={results} onChange={(event) => setResults(event.target.value)} placeholder="Record findings and computations, e.g. Total aflatoxin = 12.4 µg/kg (B1 8.1, B2 1.2, G1 2.6, G2 0.5)…" className={`mt-1.5 font-mono text-[13px] ${fieldCls}`} />
                ) : (
                  <p className="mt-1.5 whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 font-mono text-[13px] text-slate-800 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-100">{worksheet?.results || 'No results recorded.'}</p>
                )}
                <span className="mt-1 flex items-center gap-1.5 text-[11px] text-slate-500 dark:text-slate-400">
                  <Paperclip className="h-3 w-3" /> Attaching GC-MS and UV-Vis charts will be added in a later phase.
                </span>
              </label>
            </div>
          </div>

          <div className="flex flex-col gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950/40">
            <span className={`text-[11px] ${error ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`} role={error ? 'alert' : undefined}>
              {error ||
                note ||
                (editable && problem) ||
                (worksheet?.checkedDate
                  ? `Checked by ${worksheet.checkedBy} on ${worksheet.checkedDate}.`
                  : worksheet?.analysedDate
                    ? `Submitted by ${worksheet.analysedBy} on ${worksheet.analysedDate}; waiting for the Head of Section.`
                    : worksheet
                      ? `Draft last saved ${worksheet.updatedAt} by ${worksheet.updatedBy}.`
                      : editable
                        ? 'Not saved yet.'
                        : 'The allocated analyst has not started the worksheet.')}
            </span>
            <div className="flex flex-wrap items-center gap-2">
              {editable && (
                <Button icon={Save} disabled={!!problem || !dirty || !!busy} onClick={() => void run('save')}>
                  {busy === 'save' ? 'Saving…' : 'Save draft'}
                </Button>
              )}
              {meta.canSubmit &&
                (confirmingSubmit ? (
                  <>
                    <span className="text-[11px] text-slate-600 dark:text-slate-300">Submit as analysed? It can't be changed afterwards.</span>
                    <Button variant="primary" icon={Send} disabled={!!problem || !!busy} onClick={() => void run('submit')}>
                      {busy === 'submit' ? 'Submitting…' : 'Confirm submit'}
                    </Button>
                    <Button variant="ghost" onClick={() => setConfirmingSubmit(false)}>Cancel</Button>
                  </>
                ) : (
                  <Button variant="primary" icon={Send} disabled={!!problem || !!busy} onClick={() => setConfirmingSubmit(true)}>
                    Submit for checking
                  </Button>
                ))}
              {meta.canCheck && (
                <Button variant="primary" icon={CheckCircle2} disabled={!!busy} onClick={() => void run('check')}>
                  {busy === 'check' ? 'Saving…' : 'Mark as checked'}
                </Button>
              )}
            </div>
          </div>
        </>
      )}
    </section>
  );
};
