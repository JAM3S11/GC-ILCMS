import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { CheckCircle2, Download, FileBadge, Loader2, Lock, Printer, RotateCcw } from 'lucide-react';
import { NarcoticsIntake } from '../../types';
import { apiRequest } from '../../lib/api';
import {
  GovernmentAnalystReportSource,
  buildGovernmentAnalystReport,
  defaultFindings,
  nairobiToday,
} from '../../governmentAnalystReport';
import { Button, StatusPill } from '../common/Dashboard';
import { Portal } from '../common/Portal';
import { ScaledPage, downloadA4Pdf, usePrintTarget } from './a4Preview';
import { GovernmentAnalystReportPages } from './GovernmentAnalystReportPages';

interface AnalystReportResponse {
  report: {
    findings: string;
    snapshot: GovernmentAnalystReportSource & { approvalDate: string };
    approvedBy: string;
    approvedDate: string;
    /** The draft's "Checked By" signature, for reports approved before the snapshot kept it. */
    checkerSignature: string | null;
  } | null;
  source: (GovernmentAnalystReportSource & { draftStatus: 'DRAFT' | 'SUBMITTED' | 'APPROVED' }) | null;
  canApprove: boolean;
}

interface GovernmentAnalystReportSectionProps {
  intake: NarcoticsIntake;
  /** Reloads the preview when the draft report it is built from changes status. */
  draftStatus: string | null;
  /** Tells the case file whether the report is approved, so the memo waits for it. */
  onApprovedChange?: (approved: boolean) => void;
  onIntakeUpdated?: (intake: NarcoticsIntake) => void;
}

/**
 * Report of Government Analyst, under the Memo. Built from the approved Draft Report of Analysis
 * (Cannabis) with a live A4 preview; the Head of Narcotics can edit the Findings, then approves it,
 * which dates and locks it. It can be printed or downloaded as a PDF at any time.
 */
export const GovernmentAnalystReportSection: React.FC<GovernmentAnalystReportSectionProps> = ({
  intake,
  draftStatus,
  onApprovedChange,
  onIntakeUpdated,
}) => {
  const [data, setData] = useState<AnalystReportResponse | null>(null);
  const [findings, setFindings] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [message, setMessage] = useState<{ tone: 'error' | 'ok'; text: string } | null>(null);
  const [printing, setPrinting] = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [pageCount, setPageCount] = useState(1);
  const pdfRootRef = useRef<HTMLDivElement>(null);

  const url = `/api/narcotics/intakes/${encodeURIComponent(intake.id)}/analyst-report`;
  const load = useCallback(async () => {
    const result = await apiRequest<AnalystReportResponse>(url);
    setData(result);
    setFindings(result.report?.findings ?? (result.source ? defaultFindings(result.source.results) : ''));
    setConfirming(false);
    onApprovedChange?.(!!result.report);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [url]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .catch((cause: unknown) => {
        if (!cancelled) setMessage({ tone: 'error', text: cause instanceof Error ? cause.message : 'Could not load the report.' });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [load, draftStatus]);

  const stopPrinting = useCallback(() => setPrinting(false), []);
  usePrintTarget(printing, 'worksheet', stopPrinting);

  const report = data?.report ?? null;
  const preview = useMemo(() => {
    if (report) {
      return buildGovernmentAnalystReport(
        { ...report.snapshot, checkerSignature: report.snapshot.checkerSignature ?? report.checkerSignature },
        report.findings,
        report.snapshot.approvalDate,
      );
    }
    if (data?.source) return buildGovernmentAnalystReport(data.source, findings, nairobiToday());
    return null;
  }, [report, data?.source, findings]);

  if (loading) {
    return <p className="flex items-center gap-2 py-4 text-sm text-slate-500 dark:text-slate-400"><Loader2 className="h-4 w-4 animate-spin" /> Loading the Report of Government Analyst…</p>;
  }
  if (!data) {
    return <p role="alert" className="py-4 text-sm text-rose-600 dark:text-rose-400">{message?.text || 'The report could not be loaded.'}</p>;
  }
  if (!report && data.source?.draftStatus !== 'APPROVED') {
    return (
      <div className="rounded-xl border border-dashed border-slate-300 px-4 py-3 text-[13px] text-slate-500 dark:border-slate-700 dark:text-slate-400">
        <span className="font-semibold text-slate-700 dark:text-slate-200">Report of Government Analyst.</span>{' '}
        It is generated here once the Head checks and approves the Draft Report of Analysis (under Findings).
      </div>
    );
  }
  if (!preview) return null;

  const editable = !report && data.canApprove;
  const approve = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const result = await apiRequest<{ intake?: NarcoticsIntake }>(`${url}/approve`, { method: 'POST', body: JSON.stringify({ findings }) });
      if (result.intake) onIntakeUpdated?.(result.intake);
      await load();
      setMessage({ tone: 'ok', text: 'Report approved and locked. It can now be printed, and the memo approved.' });
    } catch (cause) {
      setMessage({ tone: 'error', text: cause instanceof Error ? cause.message : 'The report could not be approved.' });
    } finally {
      setBusy(false);
      setConfirming(false);
    }
  };

  const downloadPdf = async () => {
    const root = pdfRootRef.current;
    if (!root) return;
    setDownloading(true);
    setMessage(null);
    try {
      await downloadA4Pdf(
        Array.from(root.querySelectorAll<HTMLElement>('.worksheet-page')),
        `${(preview.reportRef || intake.labReference).replace(/[^A-Za-z0-9-]+/g, '-')}-report-of-government-analyst.pdf`,
      );
    } catch (cause) {
      setMessage({ tone: 'error', text: cause instanceof Error ? cause.message : 'The PDF could not be created.' });
    } finally {
      setDownloading(false);
    }
  };

  const inputCls =
    'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 focus:border-teal-500 focus:outline-none focus:ring-2 focus:ring-teal-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white';
  const suggested = data.source ? defaultFindings(data.source.results) : '';

  return (
    <div className="rounded-xl border border-slate-200 dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
        <div className="flex flex-wrap items-center gap-2">
          <FileBadge className="h-4 w-4 text-slate-400" />
          <h3 className="text-sm font-semibold text-slate-900 dark:text-white">Report of Government Analyst</h3>
          <StatusPill tone={report ? 'emerald' : 'violet'} dot={false}>{report ? 'Approved' : 'Awaiting approval'}</StatusPill>
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" icon={Printer} onClick={() => setPrinting(true)}>Print</Button>
          <Button size="sm" variant="primaryTeal" icon={Download} disabled={downloading} onClick={() => void downloadPdf()}>
            {downloading ? 'Preparing…' : 'Download PDF'}
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-5 p-4 lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)]">
        <div className="min-w-0 space-y-4">
          {report ? (
            <p className="flex items-start gap-2 text-[13px] text-slate-600 dark:text-slate-300">
              <Lock className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Approved {report.approvedDate} by {report.approvedBy}, and locked. Reopen it here any time to print or download it.
            </p>
          ) : (
            <p className="text-[13px] text-slate-600 dark:text-slate-300">
              Generated from the approved Draft Report of Analysis. {editable
                ? 'Check the preview and the Findings, then approve: the report is dated today and locked.'
                : 'The Head of Narcotics checks it, edits the Findings if needed, and approves it.'}
            </p>
          )}

          <div>
            <div className="mb-1.5 flex items-center justify-between gap-2">
              <label htmlFor="analyst-report-findings" className="text-xs font-medium text-slate-700 dark:text-slate-300">Findings and Conclusions</label>
              {editable && suggested && findings !== suggested && (
                <button type="button" onClick={() => setFindings(suggested)} className="flex items-center gap-1 text-[11px] text-teal-700 hover:underline dark:text-teal-400">
                  <RotateCcw className="h-3 w-3" /> Use the standard cannabis wording
                </button>
              )}
            </div>
            {editable ? (
              <textarea
                id="analyst-report-findings"
                rows={6}
                maxLength={3000}
                value={findings}
                onChange={(event) => setFindings(event.target.value)}
                placeholder="The GC/MS result does not show delta-9-THC: write the findings and conclusions."
                className={inputCls}
              />
            ) : (
              <p id="analyst-report-findings" className="whitespace-pre-wrap rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-200">
                {findings || '—'}
              </p>
            )}
          </div>

          {message && (
            <p role={message.tone === 'error' ? 'alert' : 'status'} className={`text-[12px] ${message.tone === 'error' ? 'text-rose-600 dark:text-rose-400' : 'text-emerald-700 dark:text-emerald-400'}`}>
              {message.text}
            </p>
          )}

          {editable && (
            confirming ? (
              <div className="space-y-2 rounded-lg border border-teal-300 bg-teal-50 p-3 dark:border-teal-800 dark:bg-teal-950/30">
                <p className="text-[12px] text-teal-900 dark:text-teal-100">
                  Approve the report as shown in the preview? It is dated today and can no longer be changed.
                </p>
                <div className="flex flex-wrap gap-2">
                  <Button size="sm" variant="primaryTeal" icon={CheckCircle2} disabled={busy} onClick={() => void approve()}>
                    {busy ? 'Approving…' : 'Confirm approval'}
                  </Button>
                  <Button size="sm" disabled={busy} onClick={() => setConfirming(false)}>Cancel</Button>
                </div>
              </div>
            ) : (
              <Button variant="primaryTeal" icon={CheckCircle2} disabled={!findings.trim() || busy} title={!findings.trim() ? 'Write the findings first' : undefined} onClick={() => setConfirming(true)}>
                Approve report
              </Button>
            )
          )}
        </div>

        <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
          <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
            <span>{report ? 'Approved report' : 'Live A4 preview'}</span>
            <span>{pageCount} {pageCount === 1 ? 'page' : 'pages'}</span>
          </div>
          <div className="max-h-[calc(100vh-6rem)] overflow-y-auto">
            <ScaledPage pages={pageCount}>
              <GovernmentAnalystReportPages data={preview} />
            </ScaledPage>
          </div>
        </div>
      </div>

      {/* Full-size, unscaled copy used for the PDF and the page count. */}
      <div ref={pdfRootRef} aria-hidden="true" className="pointer-events-none fixed -left-[10000px] top-0 flex flex-col">
        <GovernmentAnalystReportPages data={preview} shadow={false} onPageCount={setPageCount} />
      </div>
      {printing && (
        <Portal>
          <div className="receipt-print-root worksheet-print-root">
            <GovernmentAnalystReportPages data={preview} shadow={false} />
          </div>
        </Portal>
      )}
    </div>
  );
};
