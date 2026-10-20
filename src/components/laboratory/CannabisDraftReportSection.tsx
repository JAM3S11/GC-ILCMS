import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Download, FilePlus2, FileSignature, Loader2, Lock, Printer, Save, Send, Unlock } from 'lucide-react';
import { NarcoticsDraftReport, NarcoticsIntake, User } from '../../types';
import { apiRequest } from '../../lib/api';
import {
  CannabisDraftReportFields,
  CannabisResultKey,
  CannabisResults,
  DEFAULT_RESULTS,
  RESULT_LABELS,
  RESULT_OPTIONS,
  cannabisPrefill,
} from '../../narcoticsDraftReport';
import { Button, StatusPill, Tone } from '../common/Dashboard';
import { Portal } from '../common/Portal';
import { Select } from '../common/Select';
import { SignatureInput } from './SignatureInput';
import { Field, Group } from './SampleReceiptFormSection';
import { ScaledPage, downloadA4Pdf, usePrintTarget } from './a4Preview';
import { CannabisDraftReportData, CannabisDraftReportPages } from './CannabisDraftReportPages';

interface DraftReportResponse {
  report: NarcoticsDraftReport | null;
  canWrite: boolean;
  isAnalyst: boolean;
  canApprove: boolean;
  canUnlock: boolean;
}

type Editable = CannabisDraftReportFields & { analystSignature: string | null };

const STATUS: Record<NarcoticsDraftReport['status'] | 'NEW', { label: string; tone: Tone }> = {
  NEW: { label: 'Not started', tone: 'slate' },
  DRAFT: { label: 'Draft', tone: 'teal' },
  SUBMITTED: { label: 'Awaiting check', tone: 'violet' },
  APPROVED: { label: 'Checked and approved', tone: 'emerald' },
};

const RESULT_KEYS = Object.keys(DEFAULT_RESULTS) as CannabisResultKey[];

const fromReport = (report: NarcoticsDraftReport): Editable => ({
  sampleKNo: report.sampleKNo,
  dateReceived: report.dateReceived,
  submittedBy: report.submittedBy,
  dateAnalysed: report.dateAnalysed,
  envelopeMarked: report.envelopeMarked,
  policeStation: report.policeStation,
  crNumber: report.crNumber,
  accused: report.accused,
  containing: report.containing,
  results: { ...DEFAULT_RESULTS, ...(report.results as Partial<CannabisResults>) },
  quantity: report.quantity,
  gckNo: report.gckNo,
  analystSignature: report.analystSignature ?? null,
});

interface CannabisDraftReportSectionProps {
  intake: NarcoticsIntake;
  currentUser: Pick<User, 'id' | 'name' | 'role'>;
  /** Tells the case file where the report stands, so the memo waits for its approval. */
  onStatusChange?: (status: NarcoticsDraftReport['status'] | null) => void;
  /** Submitting the report records the findings and completes the analysis. */
  onIntakeUpdated?: (intake: NarcoticsIntake) => void;
}

/**
 * Draft Report of Analysis (Cannabis), filled in under Findings with a live A4
 * preview beside the form. Pre-filled from the exhibit's intake; the Analysis
 * Officer signs and submits it, the Head of Narcotics signs "Checked By", which
 * approves and locks it (a Super Admin can unlock it).
 */
export const CannabisDraftReportSection: React.FC<CannabisDraftReportSectionProps> = ({ intake, currentUser, onStatusChange, onIntakeUpdated }) => {
  const [data, setData] = useState<DraftReportResponse | null>(null);
  const [values, setValues] = useState<Editable | null>(null);
  const [checkerSignature, setCheckerSignature] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const pdfRootRef = useRef<HTMLDivElement>(null);

  const url = `/api/narcotics/intakes/${encodeURIComponent(intake.id)}/draft-report`;
  const load = useCallback(async () => {
    const result = await apiRequest<DraftReportResponse>(url);
    setData(result);
    setValues(result.report ? fromReport(result.report) : { ...cannabisPrefill(intake), analystSignature: null });
    setCheckerSignature(null);
    setConfirmingSubmit(false);
    setUnlockReason('');
    onStatusChange?.(result.report?.status ?? null);
    return result;
    // The prefill only matters when there is no saved report; reload on the exhibit, not every field change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .catch((cause: unknown) => {
        if (!cancelled) setMessage({ tone: 'error', text: cause instanceof Error ? cause.message : 'Could not load the draft report.' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [load, intake.status]);

  const stopPrinting = useCallback(() => setPrinting(false), []);
  usePrintTarget(printing, 'worksheet', stopPrinting);

  const report = data?.report ?? null;
  const preview: CannabisDraftReportData | null = useMemo(
    () =>
      values && {
        ...values,
        analysedBy: report?.analysedBy ?? intake.analysisOfficer ?? '',
        checkedBy: report?.checkedBy ?? (data?.canApprove && report?.status === 'SUBMITTED' ? currentUser.name : ''),
        checkerSignature: report?.checkerSignature ?? checkerSignature,
        checkedDate: report?.checkedDate ?? '',
        approved: report?.status === 'APPROVED',
      },
    [values, report, intake.analysisOfficer, data?.canApprove, currentUser.name, checkerSignature],
  );

  if (loading) {
    return <p className="flex items-center gap-2 py-6 text-sm text-slate-500 dark:text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading the draft report…</p>;
  }
  if (!data || !values || !preview) {
    return <p role="alert" className="py-6 text-sm text-rose-600 dark:text-rose-400">{message?.text || 'The draft report could not be loaded.'}</p>;
  }

  const status = report?.status ?? 'NEW';
  const canEdit = data.canWrite && (!report || report.status === 'DRAFT');
  const update = <K extends keyof Editable>(key: K, value: Editable[K]) =>
    setValues((previous) => (previous ? { ...previous, [key]: value } : previous));
  const setResult = (key: CannabisResultKey, value: string) =>
    setValues((previous) => (previous ? { ...previous, results: { ...previous.results, [key]: value } } : previous));

  const missing = [
    !values.sampleKNo.trim() && 'sample K no.',
    values.dateReceived && values.dateAnalysed && values.dateAnalysed < values.dateReceived && 'a date analysed on or after the date received',
  ].filter(Boolean) as string[];
  const dirty = !report || JSON.stringify(fromReport(report)) !== JSON.stringify(values);
  // Submitting needs the report filled in, not just saved.
  const submitMissing = [
    ...missing,
    !values.dateReceived && 'date received',
    !values.dateAnalysed && 'date analysed',
    !values.submittedBy.trim() && 'submitted by',
    RESULT_KEYS.some((key) => !values.results[key].trim()) && 'every test result',
    !values.analystSignature && 'your signature',
  ].filter(Boolean) as string[];

  const call = async (key: string, action: () => Promise<unknown>, done: string) => {
    setBusy(key);
    setMessage(null);
    try {
      const result = (await action()) as { intake?: NarcoticsIntake } | undefined;
      if (result?.intake) onIntakeUpdated?.(result.intake);
      await load();
      setMessage({ tone: 'ok', text: done });
    } catch (cause) {
      setMessage({ tone: 'error', text: cause instanceof Error ? cause.message : 'The draft report could not be saved.' });
    } finally {
      setBusy(null);
      setConfirmingSubmit(false);
    }
  };
  const body = () => JSON.stringify(values);
  const save = () => call('save', () => apiRequest(url, { method: 'PUT', body: body() }), report ? 'Draft report saved.' : 'Draft report created.');
  const submit = () => call('submit', () => apiRequest(`${url}/submit`, { method: 'POST', body: body() }), 'Submitted to the Head of Narcotics to check. The analysis is now complete.');
  const approve = () =>
    call('approve', () => apiRequest(`${url}/approve`, { method: 'POST', body: JSON.stringify({ checkerSignature }) }), 'Draft report checked, approved and locked.');
  const unlock = () =>
    call('unlock', () => apiRequest(`${url}/unlock`, { method: 'POST', body: JSON.stringify({ reason: unlockReason }) }), 'Draft report unlocked and returned to draft.');

  const downloadPdf = async () => {
    const root = pdfRootRef.current;
    if (!root) return;
    setDownloading(true);
    setMessage(null);
    try {
      await downloadA4Pdf(
        Array.from(root.querySelectorAll<HTMLElement>('.worksheet-page')),
        `${values.sampleKNo.replace(/[^A-Za-z0-9-]+/g, '-') || intake.id}-cannabis-draft-report.pdf`,
      );
    } catch (cause) {
      setMessage({ tone: 'error', text: cause instanceof Error ? cause.message : 'The PDF could not be created.' });
    } finally {
      setDownloading(false);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white';
  const readCls =
    'w-full min-h-[38px] whitespace-pre-wrap break-words rounded-lg border border-slate-200 bg-slate-100 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200';
  type TextKey = Exclude<keyof CannabisDraftReportFields, 'results'>;
  const text = (key: TextKey, rows = 0, placeholder = '') =>
    canEdit ? (
      rows ? (
        <textarea rows={rows} value={values[key]} placeholder={placeholder} onChange={(e) => update(key, e.target.value)} className={inputCls} />
      ) : (
        <input value={values[key]} placeholder={placeholder} onChange={(e) => update(key, e.target.value)} className={inputCls} />
      )
    ) : (
      <div className={readCls}>{values[key] || '—'}</div>
    );
  const date = (key: 'dateReceived' | 'dateAnalysed') =>
    canEdit ? (
      <input type="date" value={values[key]} onChange={(e) => update(key, e.target.value)} className={inputCls} />
    ) : (
      <div className={readCls}>{values[key] || '—'}</div>
    );
  /** A result: pick a common answer, or type over it. */
  const resultInput = (key: CannabisResultKey) => (
    <Field key={key} label={RESULT_LABELS[key]} wide={key === 'uvVis' || key === 'gcms'}>
      {canEdit ? (
        <div className="flex gap-2">
          <input value={values.results[key]} onChange={(e) => setResult(key, e.target.value)} placeholder="Type or choose a result" className={inputCls} />
          <Select
            size="sm"
            className="w-36 shrink-0"
            aria-label={`Common results for ${RESULT_LABELS[key]}`}
            value=""
            placeholder="Choose…"
            onChange={(value) => value && setResult(key, value)}
            options={RESULT_OPTIONS[key].map((option) => ({ value: option, label: option }))}
          />
        </div>
      ) : (
        <div className={readCls}>{values.results[key] || '—'}</div>
      )}
    </Field>
  );

  return (
    <div className="mt-2 rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <FileSignature className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Draft Report of Analysis (Cannabis)</h3>
          <StatusPill tone={STATUS[status].tone} dot={false}>{STATUS[status].label}</StatusPill>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" icon={Printer} onClick={() => setPrinting(true)}>Print</Button>
          <Button size="sm" variant="primaryTeal" icon={Download} disabled={downloading} onClick={() => void downloadPdf()}>
            {downloading ? 'Preparing…' : 'Download PDF'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 p-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        {/* ------------------------------ Form ------------------------------ */}
        <form
          className="min-w-0 space-y-5"
          onSubmit={(event) => {
            event.preventDefault();
            if (!missing.length && dirty) void save();
          }}
        >
          <p className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
            {!report && canEdit && <span>Filled in from the exhibit's intake and findings. Everything can still be edited.</span>}
            {report?.status === 'SUBMITTED' && <span>Locked while the Head of Narcotics checks it.</span>}
            {report?.status === 'APPROVED' && <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Checked and locked. Only an administrator can unlock it.</span>}
            {report?.unlockReason && report.status === 'DRAFT' && <span>Unlocked by an administrator: {report.unlockReason}</span>}
          </p>

          <Group title="Sample">
            <Field label="Sample K no." required={canEdit}>{text('sampleKNo', 0, 'K0001/2026')}</Field>
            <Field label="Date received">{date('dateReceived')}</Field>
            <Field label="Submitted by" wide>{text('submittedBy')}</Field>
            <Field label="Date analysed">{date('dateAnalysed')}</Field>
          </Group>

          <Group title="Description">
            <Field label="A khaki envelope marked" hint="the marking on the envelope">{text('envelopeMarked')}</Field>
            <Field label="Police station">{text('policeStation')}</Field>
            <Field label="CR no.">{text('crNumber')}</Field>
            <Field label="Accused" hint="one name per line" wide>{text('accused', 3)}</Field>
            <Field label="Containing" hint="quantity / description of the plant material" wide>{text('containing', 3)}</Field>
          </Group>

          <Group title="Results — physical tests">
            {(['seedsLeavesStalks', 'odour', 'trichomeStalks', 'cystolithicTrichomes'] as CannabisResultKey[]).map(resultInput)}
          </Group>

          <Group title="Results — chemical tests">
            {(['colorimetric', 'uvVis', 'gcms'] as CannabisResultKey[]).map(resultInput)}
          </Group>

          <Group title="Quantity and sign-off">
            <Field label="Quantity">{text('quantity')}</Field>
            <Field label="G.C.K. no.">{text('gckNo')}</Field>
            <Field label="Analysing officer"><div className={readCls}>{preview.analysedBy || '—'}</div></Field>
            <Field label="Checked by"><div className={readCls}>{preview.checkedBy || '—'}</div></Field>
            <div className="sm:col-span-2">
              <SignatureInput label="Analysing officer's signature" value={values.analystSignature} onChange={(v) => update('analystSignature', v)} disabled={!canEdit} mine={intake.analysisOfficerId === currentUser.id} />
            </div>
            <div className="sm:col-span-2">
              <SignatureInput
                label="Checked by — Head of Narcotics' signature"
                value={report?.checkerSignature ?? checkerSignature}
                onChange={setCheckerSignature}
                mine
                disabled={!(data.canApprove && report?.status === 'SUBMITTED')}
              />
            </div>
          </Group>

          {data.canUnlock && report && report.status !== 'DRAFT' && (
            <div className="flex flex-col gap-2 rounded-lg border border-teal-300 bg-teal-50 p-3 sm:flex-row sm:items-center dark:border-teal-800 dark:bg-teal-950/30">
              <input value={unlockReason} onChange={(e) => setUnlockReason(e.target.value)} maxLength={500} placeholder="Reason for unlocking (required)" className={inputCls} />
              <Button size="sm" icon={Unlock} disabled={unlockReason.trim().length < 5 || !!busy} onClick={() => void unlock()}>
                {busy === 'unlock' ? 'Unlocking…' : 'Unlock (admin)'}
              </Button>
            </div>
          )}

          <div className="sticky bottom-0 z-10 -mx-1 flex flex-col-reverse gap-2 border-t border-slate-200 bg-white/95 px-1 py-3 backdrop-blur sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950/95">
            <span
              className={`text-[11px] ${message?.tone === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`}
              role={message?.tone === 'error' ? 'alert' : undefined}
            >
              {message?.text ||
                (canEdit
                  ? missing.length ? `${missing.length} to fill in: ${missing.join(', ')}.` : dirty ? 'Ready to save.' : `Saved ${report?.updatedAt} by ${report?.updatedBy}.`
                  : data.canApprove && report?.status === 'SUBMITTED' ? 'Check the report, sign, then approve it.'
                  : report ? `Last saved ${report.updatedAt} by ${report.updatedBy}.`
                  : 'Only the assigned Analysis Officer or the Head can prepare this report while the exhibit is in analysis.')}
            </span>
            <div className="flex flex-wrap gap-2">
              {canEdit && (
                <Button type="submit" icon={report ? Save : FilePlus2} disabled={!!missing.length || !!busy || !dirty}>
                  {busy === 'save' ? 'Saving…' : report ? 'Save draft' : 'Create draft report'}
                </Button>
              )}
              {canEdit && data.isAnalyst && (
                confirmingSubmit ? (
                  <Button variant="primaryTeal" icon={Send} disabled={!!busy} onClick={() => void submit()}>
                    {busy === 'submit' ? 'Submitting…' : 'Confirm — send to be checked'}
                  </Button>
                ) : (
                  <Button
                    variant="primaryTeal"
                    icon={FileSignature}
                    disabled={!!submitMissing.length || !!busy}
                    title={submitMissing.length ? `Still needed: ${submitMissing.join(', ')}` : 'Locks the report and sends it to the Head of Narcotics'}
                    onClick={() => setConfirmingSubmit(true)}
                  >
                    Submit to be checked
                  </Button>
                )
              )}
              {data.canApprove && report?.status === 'SUBMITTED' && (
                <Button variant="primaryTeal" icon={CheckCircle2} disabled={!!busy || !checkerSignature} title={!checkerSignature ? 'Sign first' : undefined} onClick={() => void approve()}>
                  {busy === 'approve' ? 'Approving…' : 'Check and approve'}
                </Button>
              )}
            </div>
          </div>
        </form>

        {/* -------------------------- Live A4 preview -------------------------- */}
        <div className="hidden min-w-0 lg:block">
          <div className="sticky top-4 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
              <span>Live A4 preview</span>
              <span>{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
            </div>
            <div className="max-h-[calc(100vh-6rem)] overflow-y-auto">
              <ScaledPage pages={pageCount}>
                <CannabisDraftReportPages data={preview} />
              </ScaledPage>
            </div>
          </div>
        </div>
      </div>

      {/* On smaller screens the preview sits below the form. */}
      <div className="border-t border-slate-200 lg:hidden dark:border-slate-800">
        <ScaledPage pages={pageCount}>
          <CannabisDraftReportPages data={preview} />
        </ScaledPage>
      </div>

      {/* Full-size, unscaled copy used for the PDF and the page count. */}
      <div ref={pdfRootRef} aria-hidden="true" className="pointer-events-none fixed -left-[10000px] top-0 flex flex-col">
        <CannabisDraftReportPages data={preview} shadow={false} onPageCount={setPageCount} />
      </div>
      {printing && (
        <Portal>
          <div className="receipt-print-root worksheet-print-root">
            <CannabisDraftReportPages data={preview} shadow={false} />
          </div>
        </Portal>
      )}
    </div>
  );
};
