import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Download, Eye, FilePlus2, FileSignature, Loader2, Lock, Printer, Save, Send, Sparkles, Unlock } from 'lucide-react';
import { FoodDrugDraftReport, FoodDrugDraftReportFields, FoodDrugIntake, User } from '../../types';
import { apiRequest } from '../../lib/api';
import { Button, StatusPill, Tone } from '../common/Dashboard';
import { Portal } from '../common/Portal';
import { Select } from '../common/Select';
import { SignatureInput } from './SignatureInput';
import { Field, Group, paperDate } from './SampleReceiptFormSection';
import { A4PreviewDialog, downloadA4Pdf, usePrintTarget } from './a4Preview';
import { DraftReportData, DraftReportPages } from './DraftReportPages';
import { CaseStep, CaseStepFact } from './CaseStep';

interface DraftReportsResponse {
  reports: FoodDrugDraftReport[];
  prefills: FoodDrugDraftReportFields[];
  worksheetChecked: boolean;
  canWrite: boolean;
  isAnalyst: boolean;
  canApprove: boolean;
  canUnlock: boolean;
}

type Editable = FoodDrugDraftReportFields & { analystSignature: string | null };

const FIELDS: (keyof FoodDrugDraftReportFields)[] = [
  'labSampleNo', 'sendersRef', 'senderContacts', 'dateReceived', 'analysisStartedOn', 'sampleDescription',
  'analysisRequired', 'testMethods', 'analyticalReport', 'remarks', 'copyType',
];
const toEditable = (source: Partial<FoodDrugDraftReport> & FoodDrugDraftReportFields): Editable => ({
  ...(Object.fromEntries(FIELDS.map((key) => [key, source[key] ?? ''])) as unknown as FoodDrugDraftReportFields),
  copyType: source.copyType ?? 'ORIGINAL',
  analystSignature: source.analystSignature ?? null,
});

/** Sample test data, from the paper draft report this page replaces (docs/draft-report.jpeg). */
const PAPER_SAMPLE: Partial<Editable> = {
  labSampleNo: 'F/MISC/47/2026',
  senderContacts: 'Port Health Services\nP.O. Box 19072-00501\nNairobi',
  dateReceived: '2026-04-16',
  analysisStartedOn: '2026-05-25',
  sampleDescription: 'KFC soy sauce in a plastic container packaged in a khaki envelope.',
  analysisRequired: 'Toxicology',
  testMethods: 'Gas Chromatography-Mass Spectrometry technique',
  analyticalReport:
    'The submitted soy sauce sample was analysed for the presence of chemically toxic substances. Based on the results of analysis, no chemically toxic substances were detected.',
  copyType: 'ORIGINAL',
};

const STATUS: Record<FoodDrugDraftReport['status'] | 'NEW', { label: string; tone: Tone }> = {
  NEW: { label: 'Not started', tone: 'slate' },
  DRAFT: { label: 'Draft', tone: 'amber' },
  SUBMITTED: { label: 'Awaiting approval', tone: 'violet' },
  APPROVED: { label: 'Approved', tone: 'emerald' },
};

interface DraftReportSectionProps {
  intake: FoodDrugIntake;
  currentUser: Pick<User, 'id' | 'name' | 'role'>;
  /** Changes when the worksheet changes, so this section re-reads it. */
  worksheetVersion: string;
  onChanged?: () => void;
}

/**
 * Certificate of Analysis – Draft Report: one per sub sample, prepared by the
 * analyst once the Head has checked the laboratory worksheet, filled in from the
 * receipt form and worksheet. The analyst signs and submits; the Head of Department
 * signs "Checked by", which approves and locks it (a Super Admin can unlock it).
 */
export const DraftReportSection: React.FC<DraftReportSectionProps> = ({ intake, currentUser, worksheetVersion, onChanged }) => {
  const [data, setData] = useState<DraftReportsResponse | null>(null);
  const [selected, setSelected] = useState('');
  const [values, setValues] = useState<Editable | null>(null);
  const [checkerSignature, setCheckerSignature] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null);
  const [confirmingSubmit, setConfirmingSubmit] = useState(false);
  const [unlockReason, setUnlockReason] = useState('');
  const [previewOpen, setPreviewOpen] = useState(false);
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const pdfRootRef = useRef<HTMLDivElement>(null);

  const listUrl = `/api/food-drug/intakes/${encodeURIComponent(intake.id)}/draft-reports`;
  const load = useCallback(async (keep?: string) => {
    const result = await apiRequest<DraftReportsResponse>(listUrl);
    setData(result);
    const keys = tabKeys(result);
    setSelected((current) => (keep && keys.includes(keep) ? keep : keys.includes(current) ? current : keys[0] ?? ''));
    return result;
  }, [listUrl]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .catch((cause: unknown) => {
        if (!cancelled) setMessage({ tone: 'error', text: cause instanceof Error ? cause.message : 'Could not load the draft reports.' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [load, worksheetVersion, intake.status]);

  const report = data?.reports.find((item) => item.labSampleNo === selected) ?? null;
  const prefill = data?.prefills.find((item) => item.labSampleNo === selected) ?? null;

  // Switching tabs (or reloading) resets the form to that report or its prefill.
  useEffect(() => {
    const source = report ?? prefill;
    setValues(source ? toEditable(source) : null);
    setCheckerSignature(null);
    setConfirmingSubmit(false);
    setUnlockReason('');
  }, [report, prefill]);

  const stopPrinting = useCallback(() => setPrinting(false), []);
  usePrintTarget(printing, 'worksheet', stopPrinting);

  const preview: DraftReportData | null = useMemo(
    () =>
      values && {
        ...values,
        analysedBy: report?.analysedBy ?? intake.analystAssigned ?? '',
        analysedDate: report?.analysedDate ?? '',
        checkedBy: report?.checkedBy ?? (data?.canApprove && report?.status === 'SUBMITTED' ? currentUser.name : ''),
        checkerSignature: report?.checkerSignature ?? checkerSignature,
        checkedDate: report?.checkedDate ?? '',
        approved: report?.status === 'APPROVED',
      },
    [values, report, intake.analystAssigned, data?.canApprove, currentUser.name, checkerSignature],
  );

  if (loading) {
    return (
      <SectionShell>
        <p className="flex items-center gap-2 px-5 py-8 text-sm text-slate-500 dark:text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading draft reports…</p>
      </SectionShell>
    );
  }
  if (!data) {
    return <SectionShell><p role="alert" className="px-5 py-8 text-sm text-rose-600 dark:text-rose-400">{message?.text || 'The draft reports could not be loaded.'}</p></SectionShell>;
  }
  if (!data.worksheetChecked && !data.reports.length) {
    return (
      <SectionShell status={{ label: 'Locked', tone: 'slate' }} summary={[{ label: 'Status', value: 'Waiting for the Head to check the worksheet' }]}>
        <p className="flex items-center gap-2 px-5 py-8 text-sm text-slate-500 dark:text-slate-400">
          <Lock className="h-4 w-4" /> Available once the Head of Department has checked the laboratory worksheet.
        </p>
      </SectionShell>
    );
  }

  const keys = tabKeys(data);
  const status = report?.status ?? 'NEW';
  const canEdit = data.canWrite && (!report || report.status === 'DRAFT');
  const update = <K extends keyof Editable>(key: K, value: Editable[K]) =>
    setValues((previous) => (previous ? { ...previous, [key]: value } : previous));

  const missing = values
    ? ([
        !values.labSampleNo.trim() && 'lab sample no.',
        values.senderContacts.trim().length < 2 && "sender's address/contacts",
        !values.dateReceived && 'date received',
        !values.analysisStartedOn && 'date analysis started',
        values.analysisStartedOn && values.dateReceived && values.analysisStartedOn < values.dateReceived && 'an analysis date on or after the date received',
        values.sampleDescription.trim().length < 2 && 'description of sample',
        values.analysisRequired.trim().length < 2 && 'analysis required',
        values.testMethods.trim().length < 2 && 'test method(s)',
      ].filter(Boolean) as string[])
    : [];
  const dirty = !!values && (!report || JSON.stringify(toEditable(report)) !== JSON.stringify(values));

  const call = async (key: string, action: () => Promise<{ report: FoodDrugDraftReport }>, done: string, notify = false) => {
    setBusy(key);
    setMessage(null);
    try {
      const result = await action();
      await load(result.report.labSampleNo);
      setMessage({ tone: 'ok', text: done });
      if (notify) onChanged?.();
    } catch (cause) {
      setMessage({ tone: 'error', text: cause instanceof Error ? cause.message : 'The draft report could not be saved.' });
    } finally {
      setBusy(null);
      setConfirmingSubmit(false);
    }
  };
  const body = () => JSON.stringify(values);
  const save = () =>
    call('save', () =>
      report
        ? apiRequest(`/api/food-drug/draft-reports/${report.id}`, { method: 'PUT', body: body() })
        : apiRequest(listUrl, { method: 'POST', body: body() }),
    report ? 'Draft report saved.' : 'Draft report created.');
  const submit = () =>
    call('submit', async () => {
      const saved = report ?? (await apiRequest<{ report: FoodDrugDraftReport }>(listUrl, { method: 'POST', body: body() })).report;
      return apiRequest(`/api/food-drug/draft-reports/${saved.id}/submit`, { method: 'POST', body: body() });
    }, 'Submitted to the Head of Department for approval.', true);
  const approve = () =>
    report && call('approve', () => apiRequest(`/api/food-drug/draft-reports/${report.id}/approve`, { method: 'POST', body: JSON.stringify({ checkerSignature }) }), 'Draft report approved and locked.', true);
  const unlock = () =>
    report && call('unlock', () => apiRequest(`/api/food-drug/draft-reports/${report.id}/unlock`, { method: 'POST', body: JSON.stringify({ reason: unlockReason }) }), 'Draft report unlocked and returned to draft.', true);

  const downloadPdf = async () => {
    const root = pdfRootRef.current;
    if (!root || !values) return;
    setDownloading(true);
    setMessage(null);
    try {
      await downloadA4Pdf(Array.from(root.querySelectorAll<HTMLElement>('.worksheet-page')), `${values.labSampleNo.replace(/[^A-Za-z0-9-]+/g, '-') || intake.id}-draft-report.pdf`);
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
  const text = (key: keyof FoodDrugDraftReportFields, rows = 0, extra = '') =>
    canEdit ? (
      rows ? (
        <textarea rows={rows} value={values?.[key] ?? ''} onChange={(e) => update(key, e.target.value as never)} className={`${inputCls} ${extra}`} />
      ) : (
        <input value={values?.[key] ?? ''} onChange={(e) => update(key, e.target.value as never)} className={`${inputCls} ${extra}`} />
      )
    ) : (
      <div className={`${readCls} ${extra}`}>{values?.[key] || '—'}</div>
    );
  const date = (key: 'dateReceived' | 'analysisStartedOn') =>
    canEdit ? (
      <input type="date" value={values?.[key] ?? ''} onChange={(e) => update(key, e.target.value)} className={inputCls} />
    ) : (
      <div className={readCls}>{values?.[key] ? paperDate(values[key]) : '—'}</div>
    );

  const approvedCount = data.reports.filter((r) => r.status === 'APPROVED').length;
  const awaiting = data.reports.filter((r) => r.status === 'SUBMITTED').length;
  const overall = approvedCount === keys.length && keys.length
    ? { label: 'All approved', tone: 'emerald' as Tone }
    : awaiting ? { label: 'Awaiting approval', tone: 'violet' as Tone }
    : data.reports.length ? { label: 'In progress', tone: 'amber' as Tone }
    : { label: 'Not started', tone: 'slate' as Tone };

  return (
    <SectionShell
      status={overall}
      defaultOpen={(data.canWrite && approvedCount < keys.length) || (data.canApprove && awaiting > 0)}
      summary={[
        { label: 'Sub samples', value: keys.join(', ') },
        { label: 'Approved', value: `${approvedCount} of ${keys.length}` },
        { label: 'Awaiting approval', value: String(awaiting) },
        { label: 'Drafts', value: String(data.reports.filter((r) => r.status === 'DRAFT').length) },
      ]}
    >
      <div className="px-5 py-5">
        {/* One draft report per sub sample */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
          <div role="tablist" aria-label="Sub samples" className="flex flex-wrap gap-1.5">
            {keys.map((key) => {
              const item = data.reports.find((r) => r.labSampleNo === key);
              const tone = STATUS[item?.status ?? 'NEW'];
              return (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={key === selected}
                  onClick={() => setSelected(key)}
                  className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 font-mono text-xs transition-colors ${
                    key === selected
                      ? 'border-slate-800 bg-slate-800 text-white dark:border-slate-200 dark:bg-slate-200 dark:text-slate-900'
                      : 'border-slate-300 text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800'
                  }`}
                >
                  {key}
                  <span className="font-sans text-[10px] opacity-80">{tone.label}</span>
                </button>
              );
            })}
          </div>
          {values && (
            <div className="flex flex-wrap gap-2">
              <Button size="sm" icon={Eye} onClick={() => setPreviewOpen(true)}>Preview A4</Button>
              <Button size="sm" icon={Printer} onClick={() => setPrinting(true)}>Print</Button>
              <Button size="sm" variant="primary" icon={Download} disabled={downloading} onClick={() => void downloadPdf()}>
                {downloading ? 'Preparing…' : 'Download PDF'}
              </Button>
            </div>
          )}
        </div>

        {!values ? (
          <p className="text-sm text-slate-500 dark:text-slate-400">Choose a sub sample.</p>
        ) : (
          <form
            className="space-y-5"
            onSubmit={(event) => {
              event.preventDefault();
              if (!missing.length && dirty) void save();
            }}
          >
            <div className="flex flex-wrap items-center gap-2 text-[11px] text-slate-500 dark:text-slate-400">
              <StatusPill tone={STATUS[status].tone} dot={false}>{STATUS[status].label}</StatusPill>
              {!report && <span>Filled in from the receipt form and the checked worksheet. Everything can still be edited.</span>}
              {report?.status === 'SUBMITTED' && <span>Locked while the Head of Department reviews it.</span>}
              {report?.status === 'APPROVED' && <span className="flex items-center gap-1"><Lock className="h-3 w-3" /> Approved and locked. Only an administrator can unlock it.</span>}
            </div>

            {canEdit && showSampleData && (
              <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-dashed border-violet-300 bg-violet-50 px-3 py-2 text-[11px] text-violet-800 dark:border-violet-800 dark:bg-violet-950/30 dark:text-violet-200">
                <span>Test helper: fill the report with the data from the paper draft report.</span>
                <Button size="xs" icon={Sparkles} onClick={() => setValues((previous) => previous && { ...previous, ...PAPER_SAMPLE, labSampleNo: previous.labSampleNo })}>
                  Fill sample data
                </Button>
              </div>
            )}

            <Group title="Sample and sender">
              <Field label="Lab sample no." hint="one sub sample per report">
                <div className={`${readCls} font-mono`}>{values.labSampleNo}</div>
              </Field>
              <Field label="Copy type">
                {canEdit ? (
                  <Select
                    size="sm"
                    aria-label="Copy type"
                    value={values.copyType}
                    onChange={(value) => update('copyType', value as Editable['copyType'])}
                    options={[
                      { value: 'ORIGINAL', label: 'ORIGINAL COPY' },
                      { value: 'DUPLICATE', label: 'DUPLICATE COPY' },
                    ]}
                  />
                ) : <div className={readCls}>{values.copyType === 'DUPLICATE' ? 'DUPLICATE COPY' : 'ORIGINAL COPY'}</div>}
              </Field>
              <Field label="Sender's ref.">{text('sendersRef')}</Field>
              <Field label="Date received" required={canEdit}>{date('dateReceived')}</Field>
              <Field label="Sender's address/contacts" required={canEdit} wide>{text('senderContacts', 3)}</Field>
            </Group>

            <Group title="Analysis">
              <Field label="Date analysis started" required={canEdit}>{date('analysisStartedOn')}</Field>
              <Field label="Analysis required" required={canEdit}>{text('analysisRequired')}</Field>
              <Field label="Description of sample(s)" required={canEdit} wide>{text('sampleDescription', 2)}</Field>
              <Field label="Test method(s)" required={canEdit} wide>{text('testMethods', 3)}</Field>
            </Group>

            <Group title="Analytical report">
              <Field label="Findings and conclusion" hint="required to submit; long reports continue on the next page" wide>{text('analyticalReport', 8)}</Field>
              <Field label="Remarks" hint="optional" wide>{text('remarks', 2)}</Field>
            </Group>

            <Group title="Analysed by">
              <Field label="Name"><div className={readCls}>{preview?.analysedBy || '—'}</div></Field>
              <Field label="Date"><div className={readCls}>{report?.analysedDate ? paperDate(report.analysedDate) : 'Set when submitted'}</div></Field>
              <div className="sm:col-span-2">
                <SignatureInput label="Analyst's signature" value={values.analystSignature} onChange={(v) => update('analystSignature', v)} disabled={!canEdit} />
              </div>
            </Group>

            <Group title="Checked by (Head of Department)">
              <Field label="Name"><div className={readCls}>{preview?.checkedBy || '—'}</div></Field>
              <Field label="Date"><div className={readCls}>{report?.checkedDate ? paperDate(report.checkedDate) : 'Set when approved'}</div></Field>
              <div className="sm:col-span-2">
                <SignatureInput
                  label="Head of Department's signature"
                  value={report?.checkerSignature ?? checkerSignature}
                  onChange={setCheckerSignature}
                  disabled={!(data.canApprove && report?.status === 'SUBMITTED')}
                />
              </div>
            </Group>

            {data.canUnlock && report && report.status !== 'DRAFT' && (
              <div className="flex flex-col gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 sm:flex-row sm:items-center dark:border-amber-800 dark:bg-amber-950/30">
                <input value={unlockReason} onChange={(e) => setUnlockReason(e.target.value)} maxLength={500} placeholder="Reason for unlocking (required)" className={inputCls} />
                <Button size="sm" icon={Unlock} disabled={unlockReason.trim().length < 5 || !!busy} onClick={() => void unlock()}>
                  {busy === 'unlock' ? 'Unlocking…' : 'Unlock (admin)'}
                </Button>
              </div>
            )}

            <div className="flex flex-col-reverse gap-2 border-t border-slate-200 pt-3 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
              <span className={`text-[11px] ${message?.tone === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-slate-500 dark:text-slate-400'}`} role={message?.tone === 'error' ? 'alert' : undefined}>
                {message?.text ||
                  (canEdit
                    ? missing.length ? `Still to fill in: ${missing.join(', ')}.` : dirty ? 'Ready to save.' : `Saved ${report?.updatedAt} by ${report?.updatedBy}.`
                    : data.canApprove && report?.status === 'SUBMITTED' ? 'Review the report, sign, then approve it.'
                    : report ? `Last saved ${report.updatedAt} by ${report.updatedBy}.` : 'Only the allocated analyst can prepare this draft report.')}
              </span>
              <div className="flex flex-wrap gap-2">
                {canEdit && (
                  <Button type="submit" icon={report ? Save : FilePlus2} disabled={!!missing.length || !!busy || !dirty}>
                    {busy === 'save' ? 'Saving…' : report ? 'Save draft' : 'Create draft report'}
                  </Button>
                )}
                {canEdit && data.isAnalyst && (
                  confirmingSubmit ? (
                    <Button variant="primary" icon={Send} disabled={!!busy} onClick={() => void submit()}>
                      {busy === 'submit' ? 'Submitting…' : 'Confirm — send for approval'}
                    </Button>
                  ) : (
                    <Button
                      variant="primary"
                      icon={FileSignature}
                      disabled={!!missing.length || !!busy || !values.analystSignature || !values.analyticalReport.trim()}
                      title={!values.analystSignature ? 'Sign first' : !values.analyticalReport.trim() ? 'Write the analytical report first' : 'Locks the report and sends it to the Head of Department'}
                      onClick={() => setConfirmingSubmit(true)}
                    >
                      Submit for approval
                    </Button>
                  )
                )}
                {data.canApprove && report?.status === 'SUBMITTED' && (
                  <Button variant="primary" icon={CheckCircle2} disabled={!!busy || !checkerSignature} title={!checkerSignature ? 'Sign first' : undefined} onClick={() => void approve()}>
                    {busy === 'approve' ? 'Approving…' : 'Approve'}
                  </Button>
                )}
              </div>
            </div>
          </form>
        )}
      </div>

      {preview && previewOpen && (
        <A4PreviewDialog title="Certificate of analysis – draft report · A4" pages={pageCount} onClose={() => setPreviewOpen(false)} onPrint={() => setPrinting(true)} onDownload={() => void downloadPdf()} downloading={downloading}>
          <DraftReportPages data={preview} />
        </A4PreviewDialog>
      )}
      {preview && (
        <div ref={pdfRootRef} aria-hidden="true" className="pointer-events-none fixed -left-[10000px] top-0 flex flex-col">
          <DraftReportPages data={preview} shadow={false} onPageCount={setPageCount} />
        </div>
      )}
      {preview && printing && (
        <Portal>
          <div className="receipt-print-root worksheet-print-root">
            <DraftReportPages data={preview} shadow={false} />
          </div>
        </Portal>
      )}
    </SectionShell>
  );
};

/** Saved reports and sub samples still to be reported, in lab sample order. */
const tabKeys = (data: DraftReportsResponse) =>
  Array.from(new Set([...data.reports.map((r) => r.labSampleNo), ...data.prefills.map((p) => p.labSampleNo)])).sort();

const SectionShell: React.FC<{ status?: { label: string; tone: Tone }; summary?: CaseStepFact[]; defaultOpen?: boolean; children: React.ReactNode }> = ({
  status,
  summary,
  defaultOpen = false,
  children,
}) => (
  <CaseStep
    id="draft-reports"
    step={4}
    icon={FileSignature}
    title="Certificate of analysis – draft report"
    description="One per sub sample. Prepared by the analyst after the worksheet is checked, then approved and signed by the Head of Department."
    status={status}
    summary={summary}
    defaultOpen={defaultOpen}
  >
    {children}
  </CaseStep>
);
