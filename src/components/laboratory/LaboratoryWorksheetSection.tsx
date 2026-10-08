import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  CheckCircle2,
  Download,
  Eye,
  FileSignature,
  FlaskConical,
  ImagePlus,
  Link2,
  Loader2,
  Plus,
  Printer,
  Save,
  Search,
  Send,
  Sparkles,
  Trash2,
} from 'lucide-react';
import { FoodDrugIntake, FoodDrugWorksheet, SubSample, User } from '../../types';
import { apiRequest } from '../../lib/api';
import { Button, StatusPill, Tone } from '../common/Dashboard';
import { Portal } from '../common/Portal';
import { SignatureInput } from './SignatureInput';
import { Field, Group, paperDate } from './SampleReceiptFormSection';
import { A4PreviewDialog, downloadA4Pdf, usePrintTarget } from './a4Preview';
import { LaboratoryWorksheetData, LaboratoryWorksheetPages } from './LaboratoryWorksheetPages';
import { CaseStep, CaseStepFact } from './CaseStep';

interface ReceiptPrefill {
  labSampleNo: string;
  subSamples: SubSample[];
  analysisRequired: string;
}

interface WorksheetMeta {
  worksheet: FoodDrugWorksheet | null;
  sampleDescription: string | null;
  fromReceipt: ReceiptPrefill | null;
  intakeDate: string;
  canEdit: boolean;
  canSubmit: boolean;
  canCheck: boolean;
}

interface Editable {
  labSampleNo: string;
  analysisStartedOn: string;
  subSamples: SubSample[];
  analysisRequired: string;
  testMethods: string;
  results: string;
  analystSignature: string | null;
}

const today = () => new Intl.DateTimeFormat('en-CA', { timeZone: 'Africa/Nairobi' }).format(new Date());

const fromWorksheet = (sheet: FoodDrugWorksheet | null, receipt: ReceiptPrefill | null): Editable => ({
  labSampleNo: sheet?.labSampleNo ?? receipt?.labSampleNo ?? '',
  analysisStartedOn: sheet?.analysisStartedOn ?? '',
  subSamples: sheet?.subSamples?.length
    ? sheet.subSamples.map((row) => ({ ...row }))
    : receipt?.subSamples.map((row) => ({ ...row })) ?? [{ subSampleNo: '', description: '' }],
  analysisRequired: sheet?.analysisRequired ?? receipt?.analysisRequired ?? '',
  testMethods: sheet?.testMethods ?? '',
  results: sheet?.results ?? '',
  analystSignature: sheet?.analystSignature ?? null,
});

/** Sample test data, from the paper worksheet this page replaces (docs/laboratory-worksheet.jpeg). */
const PAPER_SAMPLE: Partial<Editable> = {
  labSampleNo: 'F/MISC/47-49/2026',
  subSamples: [
    { subSampleNo: 'F/MISC/47/2026', description: 'KFC soy sauce' },
    { subSampleNo: 'F/MISC/48/2026', description: 'Apples packed in a khaki bag' },
    { subSampleNo: 'F/MISC/49/2026', description: 'Grapes packed in a khaki bag' },
  ],
  analysisRequired: 'Chemically toxic substances',
  testMethods:
    'Gas Chromatography and Mass Spectrometry.\nPrep: samples F/MISC/48/2026 and F/MISC/49/2026 put in 200 ml beakers, anhydrous sodium sulphate added. The extracts were concentrated and injected into the GC-MS.',
  results: 'No toxic substances were detected in the samples analysed.',
};

const MAX_ATTACHMENT_BYTES = 2 * 1024 * 1024;

interface LaboratoryWorksheetSectionProps {
  intake: FoodDrugIntake;
  currentUser: Pick<User, 'id' | 'name' | 'role'>;
  /** Changes when the receipt form is saved, so the worksheet re-reads it. */
  receiptVersion: string;
  onChanged?: () => void;
  /** Jumps to the draft reports, once the worksheet is checked. */
  onCreateDraftReports?: () => void;
}

/**
 * The Laboratory Worksheet (GCD/GL/01/LWG/FOODS/F11), filled in after the
 * analytical sample receipt form and pre-filled from it. The analyst signs and
 * submits it ("Analysed by"); the Head of Department signs it as checked. A pop-up
 * A4 preview runs over as many pages as needed; Print and Download PDF output them.
 */
export const LaboratoryWorksheetSection: React.FC<LaboratoryWorksheetSectionProps> = ({ intake, currentUser, receiptVersion, onChanged, onCreateDraftReports }) => {
  const [meta, setMeta] = useState<WorksheetMeta | null>(null);
  const [values, setValues] = useState<Editable | null>(null);
  const [checkerSignature, setCheckerSignature] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<'save' | 'submit' | 'check' | 'attach' | 'lookup' | null>(null);
  const [message, setMessage] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const [caption, setCaption] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const pdfRootRef = useRef<HTMLDivElement>(null);

  const url = `/api/food-drug/intakes/${encodeURIComponent(intake.id)}/worksheet`;
  const load = useCallback(async () => {
    const result = await apiRequest<WorksheetMeta>(url);
    setMeta(result);
    setValues(fromWorksheet(result.worksheet, result.fromReceipt));
  }, [url]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .catch((cause: unknown) => {
        if (!cancelled) setMessage({ tone: 'error', text: cause instanceof Error ? cause.message : 'Could not load the worksheet.' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [load, intake.status, receiptVersion]);

  const stopPrinting = useCallback(() => setPrinting(false), []);
  usePrintTarget(printing, 'worksheet', stopPrinting);

  const worksheet = meta?.worksheet ?? null;
  const preview: LaboratoryWorksheetData | null = useMemo(
    () =>
      values && {
        ...values,
        subSamples: values.subSamples.filter((row) => row.subSampleNo.trim() || row.description.trim()),
        analysedBy: worksheet?.analysedBy ?? intake.analystAssigned ?? '',
        analystSignature: values.analystSignature,
        analysedDate: worksheet?.analysedDate ?? '',
        checkedBy: worksheet?.checkedBy ?? (meta?.canCheck ? currentUser.name : ''),
        checkerSignature: worksheet?.checkerSignature ?? checkerSignature,
        checkedDate: worksheet?.checkedDate ?? '',
        attachments: worksheet?.attachments ?? [],
      },
    [values, worksheet, intake.analystAssigned, meta?.canCheck, currentUser.name, checkerSignature],
  );

  const shell = (body: React.ReactNode, stage?: string) => (
    <SectionShell stage={stage} summary={[{ label: 'Status', value: meta && !meta.sampleDescription ? 'Waiting for the receipt form' : 'Loading…' }]}>{body}</SectionShell>
  );
  if (loading) {
    return shell(
      <p className="flex items-center gap-2 px-5 py-8 text-sm text-slate-500 dark:text-slate-400">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading the worksheet…
      </p>,
    );
  }
  if (!meta || !values || !preview) {
    return shell(<p role="alert" className="px-5 py-8 text-sm text-rose-600 dark:text-rose-400">{message?.text || 'The worksheet could not be loaded.'}</p>);
  }
  if (!meta.sampleDescription) {
    return shell(
      <p className="px-5 py-8 text-sm text-slate-500 dark:text-slate-400">
        Fill in and save the analytical sample receipt form first. The worksheet is filled in from it.
      </p>,
    );
  }

  const stage = worksheet?.checkedDate ? 'Checked' : worksheet?.analysedDate ? 'Awaiting check' : worksheet ? 'Draft' : 'Not started';
  const canEdit = meta.canEdit;
  const update = <K extends keyof Editable>(key: K, value: Editable[K]) =>
    setValues((previous) => (previous ? { ...previous, [key]: value } : previous));
  const updateSample = (index: number, patch: Partial<SubSample>) =>
    update('subSamples', values.subSamples.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const max = today();
  const filledSamples = values.subSamples.filter((row) => row.subSampleNo.trim() || row.description.trim());
  const missing = [
    !values.analysisStartedOn && 'date analysis started',
    values.analysisStartedOn && values.analysisStartedOn < meta.intakeDate && `a start date on or after ${paperDate(meta.intakeDate)}`,
    values.analysisStartedOn > max && 'a start date that is not in the future',
    !filledSamples.length && 'at least one sample',
    values.analysisRequired.trim().length < 3 && 'analysis required',
    values.testMethods.trim().length < 3 && 'test method(s)',
  ].filter(Boolean) as string[];
  const dirty = JSON.stringify(fromWorksheet(worksheet, meta.fromReceipt)) !== JSON.stringify(values) || !worksheet;
  const body = () => JSON.stringify({ ...values, subSamples: filledSamples });

  const run = async (action: 'save' | 'submit' | 'check') => {
    setBusy(action);
    setMessage(null);
    try {
      await apiRequest<{ worksheet: FoodDrugWorksheet }>(action === 'save' ? url : `${url}/${action}`, {
        method: action === 'save' ? 'PUT' : 'POST',
        body: action === 'check' ? JSON.stringify({ checkerSignature }) : body(),
      });
      await load();
      setMessage({
        tone: 'ok',
        text: action === 'save' ? 'Worksheet saved.' : action === 'submit' ? 'Submitted to the Head of Department for checking.' : 'Worksheet checked and signed.',
      });
      if (action !== 'save') onChanged?.();
    } catch (cause) {
      setMessage({ tone: 'error', text: cause instanceof Error ? cause.message : 'The worksheet could not be saved.' });
    } finally {
      setBusy(null);
      setConfirmingSubmit(false);
    }
  };

  // Typing a lab sample no. that has a receipt form fills the descriptions and analysis required from it.
  const lookup = async () => {
    const labSampleNo = values.labSampleNo.trim();
    if (!labSampleNo) return;
    setBusy('lookup');
    setMessage(null);
    try {
      const { receipt } = await apiRequest<{ receipt: ReceiptPrefill & { sampleDescription: string } }>(
        `/api/food-drug/receipt-forms/lookup?labSampleNo=${encodeURIComponent(labSampleNo)}`,
      );
      setValues((previous) =>
        previous && {
          ...previous,
          labSampleNo: receipt.labSampleNo,
          subSamples: receipt.subSamples?.length ? receipt.subSamples : [{ subSampleNo: receipt.labSampleNo, description: receipt.sampleDescription }],
          analysisRequired: receipt.analysisRequired ?? previous.analysisRequired,
        },
      );
      setMessage({ tone: 'ok', text: `Filled in from receipt form ${receipt.labSampleNo}. You can still edit it.` });
    } catch (cause) {
      setMessage({ tone: 'error', text: cause instanceof Error ? cause.message : 'No receipt form was found.' });
    } finally {
      setBusy(null);
    }
  };

  const attach = async (file: File) => {
    if (!['image/png', 'image/jpeg'].includes(file.type) || file.size > MAX_ATTACHMENT_BYTES) {
      setMessage({ tone: 'error', text: 'Attach a PNG or JPEG image under 2 MB.' });
      return;
    }
    setBusy('attach');
    setMessage(null);
    try {
      if (dirty) await apiRequest(url, { method: 'PUT', body: body() });
      const image = await new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(String(reader.result));
        reader.onerror = () => reject(new Error('The image could not be read.'));
        reader.readAsDataURL(file);
      });
      await apiRequest(`${url}/attachments`, { method: 'POST', body: JSON.stringify({ image, caption }) });
      setCaption('');
      await load();
      setMessage({ tone: 'ok', text: 'Chart attached. It prints on its own page after the results.' });
    } catch (cause) {
      setMessage({ tone: 'error', text: cause instanceof Error ? cause.message : 'The chart could not be attached.' });
    } finally {
      setBusy(null);
    }
  };

  const removeAttachment = async (id: string) => {
    setMessage(null);
    try {
      await apiRequest(`${url}/attachments/${id}`, { method: 'DELETE' });
      await load();
    } catch (cause) {
      setMessage({ tone: 'error', text: cause instanceof Error ? cause.message : 'The attachment could not be removed.' });
    }
  };

  const downloadPdf = async () => {
    const root = pdfRootRef.current;
    if (!root) return;
    setDownloading(true);
    setMessage(null);
    try {
      const pages = Array.from(root.querySelectorAll<HTMLElement>('.worksheet-page'));
      await downloadA4Pdf(pages, `${(values.labSampleNo || intake.id).replace(/[^A-Za-z0-9-]+/g, '-')}-worksheet.pdf`);
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
    'w-full whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200';
  const attachments = worksheet?.attachments ?? [];

  return (
    <SectionShell
      stage={stage}
      linkedTo={meta.fromReceipt?.labSampleNo}
      defaultOpen={canEdit || meta.canCheck}
      summary={worksheet ? [
        { label: 'Analysis started', value: worksheet.analysisStartedOn ? paperDate(worksheet.analysisStartedOn) : '—' },
        { label: 'Test method', value: (worksheet.testMethods ?? '').split('\n')[0] },
        { label: 'Analysed by', value: worksheet.analysedBy ? `${worksheet.analysedBy} · ${paperDate(worksheet.analysedDate ?? '')}` : 'Not submitted' },
        { label: 'Checked by', value: worksheet.checkedBy ? `${worksheet.checkedBy} · ${paperDate(worksheet.checkedDate ?? '')}` : 'Not checked' },
      ] : [{ label: 'Next', value: 'Fill in the worksheet' }]}
    >
      <div className="px-5 py-5">
        <div className="mb-4 flex flex-wrap items-center justify-end gap-2">
          {worksheet?.checkedDate && onCreateDraftReports && (
            <Button size="sm" icon={FileSignature} onClick={onCreateDraftReports} title="Prepare the Certificate of Analysis draft report for each sub sample">
              Create draft reports
            </Button>
          )}
          <Button size="sm" icon={Eye} onClick={() => setPreviewOpen(true)}>Preview A4</Button>
          <Button size="sm" icon={Printer} onClick={() => setPrinting(true)}>Print</Button>
          <Button size="sm" variant="primary" icon={Download} disabled={downloading} onClick={() => void downloadPdf()}>
            {downloading ? 'Preparing…' : 'Download PDF'}
          </Button>
        </div>

        <form
          className="min-w-0 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!missing.length) void run('save');
          }}
        >
          {canEdit && showSampleData && (
            <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-violet-300 bg-violet-50 px-3 py-2 text-[11px] text-violet-800 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-200">
              <span>Test helper: fill the worksheet with the data from the paper sample worksheet.</span>
              <Button size="xs" icon={Sparkles} onClick={() => setValues((previous) => previous && { ...previous, ...PAPER_SAMPLE, analysisStartedOn: previous.analysisStartedOn || max })}>
                Fill sample data
              </Button>
            </div>
          )}

          <Group title="Sample">
            <Field label="Lab sample no." hint="from the receipt form">
              {canEdit ? (
                <div className="flex gap-2">
                  <input
                    value={values.labSampleNo}
                    onChange={(e) => update('labSampleNo', e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        void lookup();
                      }
                    }}
                    maxLength={60}
                    placeholder="F/MISC/47-49/2026"
                    className={`${inputCls} font-mono`}
                  />
                  <Button size="sm" icon={Search} disabled={busy === 'lookup' || !values.labSampleNo.trim()} onClick={() => void lookup()} title="Fill in from the receipt form with this lab sample no.">
                    Fetch
                  </Button>
                </div>
              ) : <div className={`${readCls} font-mono`}>{values.labSampleNo || '—'}</div>}
            </Field>
            <Field label="Date analysis started" required={canEdit}>
              {canEdit ? (
                <input type="date" min={meta.intakeDate} max={max} value={values.analysisStartedOn} onChange={(e) => update('analysisStartedOn', e.target.value)} className={inputCls} />
              ) : <div className={readCls}>{values.analysisStartedOn ? paperDate(values.analysisStartedOn) : '—'}</div>}
            </Field>
          </Group>

          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 border-b border-slate-200 pb-1.5 dark:border-slate-800">
              <h3 className="text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">Description of sample(s)</h3>
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
                      <input aria-label={`Sub sample no. ${index + 1}`} value={row.subSampleNo} onChange={(e) => updateSample(index, { subSampleNo: e.target.value })} placeholder="F/MISC/47/2026" maxLength={60} className={`${inputCls} min-w-0 flex-1 font-mono sm:w-44 sm:flex-none`} />
                      <Button size="sm" variant="ghost" icon={Trash2} aria-label={`Remove sample ${index + 1}`} disabled={values.subSamples.length === 1} onClick={() => update('subSamples', values.subSamples.filter((_, i) => i !== index))}>
                        Remove
                      </Button>
                      <input aria-label={`Description ${index + 1}`} value={row.description} onChange={(e) => updateSample(index, { description: e.target.value })} placeholder="e.g. KFC soy sauce" maxLength={300} className={`${inputCls} order-last basis-full sm:order-none sm:basis-auto`} />
                    </>
                  ) : (
                    <div className={readCls}>{[row.subSampleNo, row.description].filter(Boolean).join(' — ') || '—'}</div>
                  )}
                </li>
              ))}
            </ol>
          </div>

          <Group title="Analysis">
            <Field label="Analysis required" required={canEdit} wide>
              {canEdit ? (
                <textarea rows={2} value={values.analysisRequired} onChange={(e) => update('analysisRequired', e.target.value)} maxLength={2000} className={inputCls} />
              ) : <div className={readCls}>{values.analysisRequired || '—'}</div>}
            </Field>
            <Field label="Test method(s)" required={canEdit} wide>
              {canEdit ? (
                <textarea rows={5} value={values.testMethods} onChange={(e) => update('testMethods', e.target.value)} maxLength={10000} placeholder="e.g. Gas Chromatography and Mass Spectrometry. Sample preparation…" className={inputCls} />
              ) : <div className={readCls}>{values.testMethods || '—'}</div>}
            </Field>
          </Group>

          <Group title="Results">
            <Field label="Findings and computations" hint="optional until submitted; long results continue on the next page" wide>
              {canEdit ? (
                <textarea rows={10} value={values.results} onChange={(e) => update('results', e.target.value)} maxLength={50000} className={`${inputCls} font-mono text-[13px]`} />
              ) : <div className={readCls}>{values.results || '—'}</div>}
            </Field>
            <div className="space-y-2 sm:col-span-2">
              <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
                Charts and images <span className="font-normal text-slate-500 dark:text-slate-400">(e.g. GC-MS chromatograms; each prints on its own page)</span>
              </span>
              {attachments.length > 0 && (
                <ul className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {attachments.map((item, index) => (
                    <li key={item.id} className="overflow-hidden rounded-lg border border-slate-200 dark:border-slate-700">
                      <img src={item.image} alt={item.caption || `Attachment ${index + 1}`} className="h-24 w-full bg-white object-contain" />
                      <div className="flex items-center justify-between gap-1 px-2 py-1">
                        <span className="truncate text-[11px] text-slate-600 dark:text-slate-300" title={item.caption}>{item.caption || `Attachment ${index + 1}`}</span>
                        {canEdit && (
                          <button type="button" onClick={() => void removeAttachment(item.id)} aria-label={`Remove attachment ${index + 1}`} className="text-slate-400 hover:text-rose-600">
                            <Trash2 className="h-3.5 w-3.5" />
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
              {canEdit && attachments.length < 10 && (
                <div className="flex flex-col gap-2 sm:flex-row">
                  <input value={caption} onChange={(e) => setCaption(e.target.value)} maxLength={200} placeholder="Caption (optional), e.g. GC-MS chromatogram F/MISC/47/2026" className={inputCls} />
                  <label className={`flex shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-slate-300 px-3 py-2 text-xs text-slate-600 hover:bg-slate-50 dark:border-slate-600 dark:text-slate-300 dark:hover:bg-slate-800/40 ${busy === 'attach' || missing.length ? 'pointer-events-none opacity-50' : ''}`}>
                    {busy === 'attach' ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImagePlus className="h-4 w-4" />} Attach chart / image
                    <input
                      type="file"
                      accept="image/png,image/jpeg"
                      className="sr-only"
                      onChange={(event) => {
                        const file = event.target.files?.[0];
                        event.target.value = '';
                        if (file) void attach(file);
                      }}
                    />
                  </label>
                </div>
              )}
              {!canEdit && !attachments.length && <p className="text-xs text-slate-500 dark:text-slate-400">No charts attached.</p>}
            </div>
          </Group>

          <Group title="Analysed by">
            <Field label="Name"><div className={readCls}>{preview.analysedBy || '—'}</div></Field>
            <Field label="Date"><div className={readCls}>{worksheet?.analysedDate ? paperDate(worksheet.analysedDate) : 'Set when submitted'}</div></Field>
            <div className="sm:col-span-2">
              <SignatureInput label="Analyst's signature" value={values.analystSignature} onChange={(v) => update('analystSignature', v)} disabled={!canEdit} />
            </div>
          </Group>

          <Group title="Checked by (Head of Department)">
            <Field label="Name"><div className={readCls}>{preview.checkedBy || '—'}</div></Field>
            <Field label="Date"><div className={readCls}>{worksheet?.checkedDate ? paperDate(worksheet.checkedDate) : 'Set when checked'}</div></Field>
            <div className="sm:col-span-2">
              <SignatureInput
                label="Head of Department's signature"
                value={worksheet?.checkerSignature ?? checkerSignature}
                onChange={setCheckerSignature}
                disabled={!meta.canCheck}
              />
            </div>
          </Group>

          <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <span className={`text-[11px] ${message?.tone === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`} role={message?.tone === 'error' ? 'alert' : undefined}>
              {message?.text ||
                (canEdit
                  ? missing.length ? `Still to fill in: ${missing.join(', ')}.` : dirty ? 'Ready to save.' : `Saved ${worksheet?.updatedAt} by ${worksheet?.updatedBy}.`
                  : meta.canCheck ? 'Review the worksheet, sign, then mark it checked.'
                  : worksheet ? `Last saved ${worksheet.updatedAt} by ${worksheet.updatedBy}.` : 'Only the allocated analyst or the Head can fill in this worksheet.')}
            </span>
            <div className="flex flex-wrap gap-2">
              {canEdit && (
                <Button type="submit" icon={Save} disabled={!!missing.length || !!busy || !dirty}>
                  {busy === 'save' ? 'Saving…' : 'Save draft'}
                </Button>
              )}
              {meta.canSubmit && (
                confirmingSubmit ? (
                  <Button variant="primary" icon={Send} disabled={!!busy} onClick={() => void run('submit')}>
                    {busy === 'submit' ? 'Submitting…' : 'Confirm — submit for checking'}
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    icon={Send}
                    disabled={!!missing.length || !!busy || !values.analystSignature}
                    title={!values.analystSignature ? 'Sign the worksheet first' : 'Locks the worksheet and sends it to the Head of Department'}
                    onClick={() => setConfirmingSubmit(true)}
                  >
                    Submit as analysed
                  </Button>
                )
              )}
              {meta.canCheck && (
                <Button variant="primary" icon={CheckCircle2} disabled={!!busy || !checkerSignature} title={!checkerSignature ? 'Sign first' : undefined} onClick={() => void run('check')}>
                  {busy === 'check' ? 'Checking…' : 'Mark as checked'}
                </Button>
              )}
            </div>
          </div>
        </form>
      </div>

      {previewOpen && (
        <A4PreviewDialog title="Laboratory worksheet · A4" pages={pageCount} onClose={() => setPreviewOpen(false)} onPrint={() => setPrinting(true)} onDownload={() => void downloadPdf()} downloading={downloading}>
          <LaboratoryWorksheetPages data={preview} />
        </A4PreviewDialog>
      )}

      {/* Off-screen full-size pages used for the PDF and to count pages. */}
      <div ref={pdfRootRef} aria-hidden="true" className="pointer-events-none fixed -left-[10000px] top-0 flex flex-col">
        <LaboratoryWorksheetPages data={preview} shadow={false} onPageCount={setPageCount} />
      </div>

      {printing && (
        <Portal>
          <div className="receipt-print-root worksheet-print-root">
            <LaboratoryWorksheetPages data={preview} shadow={false} />
          </div>
        </Portal>
      )}
    </SectionShell>
  );
};

const STAGE_TONE: Record<string, Tone> = { Checked: 'emerald', 'Awaiting check': 'violet', Draft: 'amber', 'Not started': 'slate' };

const SectionShell: React.FC<{ stage?: string; linkedTo?: string; summary?: CaseStepFact[]; defaultOpen?: boolean; children: React.ReactNode }> = ({
  stage = 'Not started',
  linkedTo,
  summary,
  defaultOpen = false,
  children,
}) => (
  <CaseStep
    id="laboratory-worksheet"
    step={3}
    icon={FlaskConical}
    title="Laboratory worksheet"
    description={
      <span className="flex flex-wrap items-center gap-x-2">
        <span>Filled in by the analyst, then checked and signed by the Head of Department.</span>
        {linkedTo && (
          <span className="inline-flex items-center gap-1 font-medium text-slate-700 dark:text-slate-300">
            <Link2 className="h-3 w-3" /> Linked to receipt form <span className="font-mono">{linkedTo}</span>
          </span>
        )}
      </span>
    }
    status={{ label: stage, tone: STAGE_TONE[stage] ?? 'slate' }}
    summary={summary}
    defaultOpen={defaultOpen}
  >
    {children}
  </CaseStep>
);
