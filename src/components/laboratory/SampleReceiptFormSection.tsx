import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Download, Eye, FileText, FlaskConical, Loader2, Lock, Plus, Printer, Save, Sparkles, Stamp, Trash2, Upload, X } from 'lucide-react';
import { FoodDrugIntake, FoodDrugReceiptForm, SubSample, User } from '../../types';
import { apiRequest } from '../../lib/api';
import { Button, StatusPill } from '../common/Dashboard';
import { Portal } from '../common/Portal';
import { Select } from '../common/Select';
import { SampleReceiptFormData, SampleReceiptFormPage } from './SampleReceiptFormPage';
import { SignatureInput, readImageFile } from './SignatureInput';
import { A4PreviewDialog, downloadA4Pdf, usePrintTarget } from './a4Preview';
import { CaseStep, CaseStepFact } from './CaseStep';

/** Values the analyst can change; sender, submitter and analyst details come from the record. */
interface Editable {
  labSampleNo: string;
  sendersRefNo: string;
  senderPhysicalAddress: string;
  submitterIdType: 'ID' | 'POWER_OF_ENTRY';
  submitterSignature: string | null;
  subSamples: SubSample[];
  examinationRequired: string;
  feeKes: string;
  invoiceNumber: string;
  receiptNumber: string;
  receiverSignature: string | null;
  receivedDate: string;
  stampImage: string | null;
}

const fromForm = (form: FoodDrugReceiptForm): Editable => ({
  labSampleNo: form.labSampleNo ?? form.intakeId ?? '',
  sendersRefNo: form.sendersRefNo ?? '',
  senderPhysicalAddress: form.senderPhysicalAddress ?? '',
  submitterIdType: form.submitterIdType ?? 'ID',
  submitterSignature: form.submitterSignature ?? null,
  subSamples: form.subSamples?.length
    ? form.subSamples.map((row) => ({ subSampleNo: row.subSampleNo ?? '', description: row.description ?? '' }))
    : [{ subSampleNo: form.intakeId ?? '', description: form.sampleDescription ?? '' }],
  examinationRequired: form.examinationRequired ?? '',
  feeKes: form.feeKes == null ? '' : String(form.feeKes),
  invoiceNumber: form.invoiceNumber ?? '',
  receiptNumber: form.receiptNumber ?? '',
  receiverSignature: form.receiverSignature ?? null,
  receivedDate: form.receivedDate ?? form.analystReceivedDate ?? '',
  stampImage: form.stampImage ?? null,
});

/** Sample test data, taken from the paper form this page replaces (docs/sample-receipt-form.jpeg). */
const PAPER_SAMPLE: Partial<Editable> = {
  labSampleNo: 'F/MISC/47-49/2026',
  sendersRefNo: '',
  senderPhysicalAddress: 'Port Health Services, Nairobi',
  submitterIdType: 'ID',
  subSamples: [
    { subSampleNo: 'F/MISC/49/2026', description: 'KFC soy sauce' },
    { subSampleNo: 'F/MISC/48/2026', description: 'Apples packed in a khaki bag' },
    { subSampleNo: 'F/MISC/47/2026', description: 'Grapes packed in a khaki bag' },
  ],
  examinationRequired: 'Toxically toxic substances',
  feeKes: '0',
  invoiceNumber: '-',
  receiptNumber: '-',
  receivedDate: '2026-05-16',
};

interface SampleReceiptFormSectionProps {
  intake: FoodDrugIntake;
  currentUser: Pick<User, 'id' | 'name' | 'role'>;
  /** Told whenever the form is saved, so dependent sections (the worksheet) can reload. */
  onSaved?: (form: FoodDrugReceiptForm) => void;
  /** Opens the laboratory worksheet, pre-filled from this form. */
  onCreateWorksheet?: () => void;
}

/**
 * The Analytical Sample Receipt Form: the fill-in form on one side and a live
 * A4 preview of the printed form on the other (below it on small screens), with
 * Print and Download PDF of exactly that page. Saved forms reopen with their
 * preview. Sender and submitter details come from reception and are read only.
 */
export const SampleReceiptFormSection: React.FC<SampleReceiptFormSectionProps> = ({ intake, currentUser, onSaved, onCreateWorksheet }) => {
  const [form, setForm] = useState<FoodDrugReceiptForm | null>(null);
  const [prefill, setPrefill] = useState<FoodDrugReceiptForm | null>(null);
  const [canEdit, setCanEdit] = useState(false);
  const [values, setValues] = useState<Editable | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null);
  const [printing, setPrinting] = useState(false);
  const [previewOpen, setPreviewOpen] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const pdfPageRef = useRef<HTMLDivElement>(null);

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

  // Print exactly the A4 page: mount a full-size copy in <body>, flag it as the print target, print.
  const stopPrinting = useCallback(() => setPrinting(false), []);
  usePrintTarget(printing, 'receipt-form', stopPrinting);

  const fixed = form ?? prefill;
  if (loading) {
    return (
      <SectionShell saved={!!form}>
        <p className="flex items-center gap-2 px-5 py-8 text-sm text-slate-500 dark:text-slate-400">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading the form…
        </p>
      </SectionShell>
    );
  }
  if (loadError || !fixed || !values) {
    return (
      <SectionShell saved={!!form}>
        <p role="alert" className="px-5 py-8 text-sm text-rose-600 dark:text-rose-400">{loadError || 'The form could not be loaded.'}</p>
      </SectionShell>
    );
  }

  const update = <K extends keyof Editable>(key: K, value: Editable[K]) =>
    setValues((previous) => (previous ? { ...previous, [key]: value } : previous));
  const updateSample = (index: number, patch: Partial<SubSample>) =>
    update('subSamples', values.subSamples.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const receiverName = fixed.analystReceiving ?? intake.analystAssigned ?? '';
  const preview: SampleReceiptFormData = {
    labSampleNo: values.labSampleNo,
    date: fixed.formDate,
    senderName: fixed.senderName,
    senderPhysicalAddress: values.senderPhysicalAddress,
    senderPostalAddress: fixed.senderPostalAddress,
    senderTelephone: fixed.senderTelephone,
    sendersRefNo: values.sendersRefNo,
    submitterName: fixed.submitterName,
    submitterSignature: values.submitterSignature,
    submitterIdType: values.submitterIdType,
    submitterIdNumber: fixed.submitterIdNumber,
    subSamples: values.subSamples.filter((row) => row.subSampleNo.trim() || row.description.trim()),
    examinationRequired: values.examinationRequired,
    feeKes: values.feeKes,
    invoiceNumber: values.invoiceNumber,
    receiptNumber: values.receiptNumber,
    receiverName,
    receiverSignature: values.receiverSignature,
    receivedDate: values.receivedDate,
    stampImage: values.stampImage,
  };

  const fee = Number(values.feeKes);
  const filledSamples = values.subSamples.filter((row) => row.description.trim().length >= 2);
  const missing = [
    values.senderPhysicalAddress.trim().length < 2 && 'physical address',
    !filledSamples.length && 'at least one sample description',
    values.examinationRequired.trim().length < 3 && 'examination required',
    (values.feeKes.trim() === '' || !Number.isFinite(fee) || fee < 0) && 'fee',
    !values.invoiceNumber.trim() && 'invoice number',
    !values.receiptNumber.trim() && 'receipt number',
  ].filter(Boolean) as string[];
  const dirty = !form || JSON.stringify(fromForm(form)) !== JSON.stringify(values);

  const save = async () => {
    if (missing.length || saving) return;
    setSaving(true);
    setMessage(null);
    try {
      const result = await apiRequest<{ form: FoodDrugReceiptForm }>(
        `/api/food-drug/intakes/${encodeURIComponent(intake.id)}/receipt-form`,
        {
          method: 'PUT',
          body: JSON.stringify({ ...values, feeKes: fee, subSamples: filledSamples }),
        },
      );
      setForm(result.form);
      setValues(fromForm(result.form));
      setMessage({ tone: 'ok', text: `Saved ${result.form.updatedAt}.` });
      onSaved?.(result.form);
    } catch (cause) {
      setMessage({ tone: 'error', text: cause instanceof Error ? cause.message : 'The receipt form could not be saved.' });
    } finally {
      setSaving(false);
    }
  };

  const fileStem = (values.labSampleNo || intake.id).replace(/[^A-Za-z0-9-]+/g, '-');
  const downloadPdf = async () => {
    const page = pdfPageRef.current;
    if (!page) return;
    setDownloading(true);
    setMessage(null);
    try {
      await downloadA4Pdf([page], `${fileStem}-receipt-form.pdf`);
    } catch (cause) {
      setMessage({ tone: 'error', text: cause instanceof Error ? cause.message : 'The PDF could not be created.' });
    } finally {
      setDownloading(false);
    }
  };

  const showSampleData = import.meta.env.DEV || currentUser.role === 'SUPER_ADMIN';
  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white';
  const readCls =
    'w-full truncate rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200';

  return (
    <SectionShell
      saved={!!form}
      summary={form ? [
        { label: 'Lab sample no.', value: values.labSampleNo },
        { label: 'Samples', value: `${filledSamples.length} sub sample${filledSamples.length === 1 ? '' : 's'}` },
        { label: 'Examination', value: values.examinationRequired },
        { label: 'Received', value: values.receivedDate ? `${paperDate(values.receivedDate)} · ${receiverName}` : receiverName },
      ] : [{ label: 'Next', value: 'Fill in and save the receipt form' }]}
    >
      <div className="px-5 py-5">
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          {form && onCreateWorksheet && (
            <Button size="sm" icon={FlaskConical} onClick={onCreateWorksheet} title="Open the laboratory worksheet, filled in from this receipt form">
              Create worksheet
            </Button>
          )}
          <Button size="sm" icon={Eye} onClick={() => setPreviewOpen(true)}>Preview A4</Button>
          <Button size="sm" icon={Printer} onClick={() => setPrinting(true)}>Print</Button>
          <Button size="sm" variant="primary" icon={Download} disabled={downloading} onClick={() => void downloadPdf()}>
            {downloading ? 'Preparing…' : 'Download PDF'}
          </Button>
        </div>
        {/* ------------------------------ Form ------------------------------ */}
        <form
          className="min-w-0 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            void save();
          }}
        >
          {canEdit && showSampleData && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-violet-300 bg-violet-50 px-3 py-2 text-[11px] text-violet-800 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-200">
              <span>Test helper: fill the form with the data from the paper sample form.</span>
              <Button size="xs" icon={Sparkles} onClick={() => setValues((previous) => (previous ? { ...previous, ...PAPER_SAMPLE } : previous))}>
                Fill sample data
              </Button>
            </div>
          )}

          <Group title="Sample">
            <Field label="Lab sample no." hint="e.g. F/MISC/47-49/2026">
              {canEdit ? (
                <input value={values.labSampleNo} onChange={(e) => update('labSampleNo', e.target.value)} maxLength={60} className={`${inputCls} font-mono`} />
              ) : <div className={`${readCls} font-mono`}>{values.labSampleNo || '—'}</div>}
            </Field>
            <Field label="Date"><div className={readCls}>{paperDate(fixed.formDate)}</div></Field>
          </Group>

          <Group title="Sender" locked>
            <Field locked label="Name"><div className={readCls}>{fixed.senderName}</div></Field>
            <Field label="Physical address" required={canEdit}>
              {canEdit ? (
                <input value={values.senderPhysicalAddress} onChange={(e) => update('senderPhysicalAddress', e.target.value)} placeholder="e.g. Industrial Area, Enterprise Road, Nairobi" className={inputCls} />
              ) : <div className={readCls}>{values.senderPhysicalAddress || '—'}</div>}
            </Field>
            <Field locked label="Postal address"><div className={readCls}>{fixed.senderPostalAddress}</div></Field>
            <Field locked label="Tel no."><div className={readCls}>{fixed.senderTelephone}</div></Field>
            <Field label="Sender's ref. no." wide>
              {canEdit ? (
                <input value={values.sendersRefNo} onChange={(e) => update('sendersRefNo', e.target.value)} maxLength={100} placeholder="Optional" className={inputCls} />
              ) : <div className={readCls}>{values.sendersRefNo || '—'}</div>}
            </Field>
          </Group>

          <Group title="Person submitting the sample" locked>
            <Field locked label="Name"><div className={readCls}>{fixed.submitterName}</div></Field>
            <Field label="ID / Power of Entry">
              <div className="flex flex-col gap-2 sm:flex-row">
                {canEdit ? (
                  <Select
                    size="sm"
                    className="w-40 shrink-0"
                    aria-label="Identification type"
                    value={values.submitterIdType}
                    onChange={(value) => update('submitterIdType', value as Editable['submitterIdType'])}
                    options={[
                      { value: 'ID', label: 'National ID' },
                      { value: 'POWER_OF_ENTRY', label: 'Power of Entry' },
                    ]}
                  />
                ) : (
                  <div className={`${readCls} w-40 shrink-0`}>{values.submitterIdType === 'ID' ? 'National ID' : 'Power of Entry'}</div>
                )}
                <div className={`${readCls} font-mono`}>{fixed.submitterIdNumber}</div>
              </div>
            </Field>
            <div className="sm:col-span-2">
              <SignatureInput label="Signature" value={values.submitterSignature} onChange={(v) => update('submitterSignature', v)} disabled={!canEdit} />
            </div>
          </Group>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5 dark:border-slate-800">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                Description of sample(s) <span className="font-normal normal-case tracking-normal text-slate-500 dark:text-slate-400">including source and location</span>
              </h3>
              {canEdit && (
                <Button size="xs" icon={Plus} onClick={() => update('subSamples', [...values.subSamples, { subSampleNo: '', description: '' }])} disabled={values.subSamples.length >= 50}>
                  Add sample
                </Button>
              )}
            </div>
            <ol className="space-y-2">
              {values.subSamples.map((row, index) => (
                <li key={index} className="flex flex-wrap items-start gap-2 sm:flex-nowrap">
                  <span className="mt-2 w-7 shrink-0 text-right font-mono text-xs text-slate-500 dark:text-slate-400">({index + 1})</span>
                  {canEdit ? (
                    <>
                      <input aria-label={`Sub sample no. ${index + 1}`} value={row.subSampleNo} onChange={(e) => updateSample(index, { subSampleNo: e.target.value })} placeholder="F/MISC/49/2026" maxLength={60} className={`${inputCls} min-w-0 flex-1 font-mono sm:w-44 sm:flex-none`} />
                      <input aria-label={`Description ${index + 1}`} value={row.description} onChange={(e) => updateSample(index, { description: e.target.value })} placeholder="e.g. KFC soy sauce" maxLength={300} className={`${inputCls} order-last basis-full pl-3 sm:order-none sm:basis-auto`} />
                      <Button
                        size="sm"
                        variant="ghost"
                        icon={Trash2}
                        aria-label={`Remove sample ${index + 1}`}
                        disabled={values.subSamples.length === 1}
                        onClick={() => update('subSamples', values.subSamples.filter((_, i) => i !== index))}
                      >
                        Remove
                      </Button>
                    </>
                  ) : (
                    <div className={readCls}>{[row.subSampleNo, row.description].filter(Boolean).join(' – ') || '—'}</div>
                  )}
                </li>
              ))}
            </ol>
          </div>

          <Group title="Examination required">
          <Field label="Tests requested" required={canEdit} wide>
            {canEdit ? (
              <textarea rows={3} value={values.examinationRequired} onChange={(e) => update('examinationRequired', e.target.value)} placeholder="e.g. Toxically toxic substances" className={inputCls} />
            ) : <div className={`${readCls} whitespace-pre-wrap !overflow-visible break-words`} style={{ textOverflow: 'clip', whiteSpace: 'pre-wrap' }}>{values.examinationRequired || '—'}</div>}
          </Field>
          </Group>

          <Group title="Payment" columns={3}>
            {(['feeKes', 'invoiceNumber', 'receiptNumber'] as const).map((key) => (
              <Field key={key} label={key === 'feeKes' ? 'Fee (Kshs)' : key === 'invoiceNumber' ? 'Invoice no.' : 'Receipt no.'} required={canEdit}>
                {canEdit ? (
                  <input
                    type={key === 'feeKes' ? 'number' : 'text'}
                    min={key === 'feeKes' ? 0 : undefined}
                    step={key === 'feeKes' ? '0.01' : undefined}
                    value={values[key]}
                    onChange={(e) => update(key, e.target.value)}
                    className={`${inputCls} font-mono`}
                  />
                ) : <div className={`${readCls} font-mono`}>{values[key] || '—'}</div>}
              </Field>
            ))}
          </Group>

          <Group title="Sample received by">
            <Field label="Name"><div className={readCls}>{receiverName || '—'}</div></Field>
            <Field label="Date">
              {canEdit ? (
                <input type="date" value={values.receivedDate} onChange={(e) => update('receivedDate', e.target.value)} className={inputCls} />
              ) : <div className={readCls}>{values.receivedDate ? paperDate(values.receivedDate) : '—'}</div>}
            </Field>
            <div className="sm:col-span-2">
              <SignatureInput label="Signature" value={values.receiverSignature} onChange={(v) => update('receiverSignature', v)} disabled={!canEdit} />
            </div>
            <div className="space-y-1.5 sm:col-span-2">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">Stamp <span className="font-normal text-slate-500 dark:text-slate-400">(optional)</span></span>
              {values.stampImage ? (
                <div className="flex items-center gap-3 rounded-lg border border-slate-200 bg-white p-2 dark:border-slate-700">
                  <img src={values.stampImage} alt="Stamp on file" className="h-16 w-16 object-contain" />
                  {canEdit && <Button size="xs" variant="ghost" icon={X} onClick={() => update('stampImage', null)}>Remove</Button>}
                </div>
              ) : canEdit ? (
                <label className="flex cursor-pointer items-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-3 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800/40">
                  <Stamp className="h-4 w-4" /> <Upload className="h-3.5 w-3.5" /> Upload a stamp image (PNG or JPEG, under 300 KB)
                  <input
                    type="file"
                    accept="image/png,image/jpeg"
                    className="sr-only"
                    onChange={async (event) => {
                      const file = event.target.files?.[0];
                      event.target.value = '';
                      if (!file) return;
                      try {
                        update('stampImage', await readImageFile(file));
                      } catch (cause) {
                        setMessage({ tone: 'error', text: cause instanceof Error ? cause.message : 'The stamp could not be used.' });
                      }
                    }}
                  />
                </label>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">No stamp.</p>
              )}
            </div>
          </Group>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <span className={`text-[11px] ${message?.tone === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`} role={message?.tone === 'error' ? 'alert' : undefined}>
              {message?.text ||
                (!canEdit
                  ? form ? `Saved ${form.updatedAt} by ${form.updatedBy}.` : 'Only the allocated analyst or the Head can fill in this form.'
                  : missing.length ? `Still to fill in: ${missing.join(', ')}.` : dirty ? 'Ready to save.' : `Saved ${form?.updatedAt}.`)}
            </span>
            {canEdit && (
              <Button type="submit" variant="primary" icon={Save} disabled={!!missing.length || saving || !dirty}>
                {saving ? 'Saving…' : form ? 'Update receipt form' : 'Save receipt form'}
              </Button>
            )}
          </div>
        </form>

      </div>

      {previewOpen && (
        <A4PreviewDialog title="Live preview · A4" onClose={() => setPreviewOpen(false)} onPrint={() => setPrinting(true)} onDownload={() => void downloadPdf()} downloading={downloading}>
          <SampleReceiptFormPage data={preview} />
        </A4PreviewDialog>
      )}

      {/* Off-screen full-size copy used for the PDF, so the file is not affected by the on-screen scaling. */}
      <div aria-hidden="true" className="pointer-events-none fixed -left-[10000px] top-0">
        <SampleReceiptFormPage ref={pdfPageRef} data={preview} shadow={false} />
      </div>

      {printing && (
        <Portal>
          <div className="receipt-print-root">
            <SampleReceiptFormPage data={preview} shadow={false} />
          </div>
        </Portal>
      )}
    </SectionShell>
  );
};

/** 2026-05-16 -> 16/05/2026, as written on the paper form. */
export const paperDate = (value: string) => {
  const match = /^(d{4})-(d{2})-(d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
};

const SectionShell: React.FC<{ saved: boolean; summary?: CaseStepFact[]; children: React.ReactNode }> = ({ saved, summary, children }) => (
  <CaseStep
    id="receipt-form"
    step={2}
    icon={FileText}
    title="Analytical sample receipt form"
    description="Sender and submitter details come from reception and cannot be changed here (marked with a lock). Use Preview A4 to see the printed form."
    status={saved ? { label: 'Saved', tone: 'emerald' } : { label: 'Not saved yet', tone: 'amber' }}
    summary={summary}
    defaultOpen={!saved}
  >
    {children}
  </CaseStep>
);

export const Group: React.FC<{ title: string; locked?: boolean; columns?: 2 | 3; children: React.ReactNode }> = ({ title, locked, columns = 2, children }) => (
  <div className="space-y-3">
    <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5 dark:border-slate-800">
      <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">{title}</h3>
      {locked && (
        <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
          <Lock className="h-3 w-3" /> Partly from reception
        </span>
      )}
    </div>
    <div className={`grid grid-cols-1 gap-3 ${columns === 3 ? 'sm:grid-cols-3' : 'sm:grid-cols-2'}`}>{children}</div>
  </div>
);

export const Field: React.FC<{ label: string; required?: boolean; hint?: string; wide?: boolean; locked?: boolean; children: React.ReactNode }> = ({ label, required, hint, wide, locked, children }) => (
  <div className={`block min-w-0 ${wide ? 'sm:col-span-2' : ''}`}>
    <span className="flex items-center gap-1 text-xs font-medium text-slate-700 dark:text-slate-300">
      {locked && <Lock className="h-3 w-3 text-slate-400" aria-label="From reception" />}
      {label} {required && <span className="text-rose-500">*</span>}
      {hint && <span className="ml-1 font-normal text-slate-500 dark:text-slate-400">{hint}</span>}
    </span>
    <div className="mt-1">{children}</div>
  </div>
);
