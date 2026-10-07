import React, { useEffect, useState } from 'react';
import { ClipboardSignature, Download, FileText, Loader2, Send, X } from 'lucide-react';
import { User, WorkAllocation, WorkAllocationRecordType } from '../../types';
import { apiRequest } from '../../lib/api';
import { Button, SegmentedControl } from '../common/Dashboard';
import { Portal } from '../common/Portal';
import { Select } from '../common/Select';
import {
  WorkAllocationView,
  allocationFileName,
  allocationRows,
  allocationVersionLabel,
  buildWorkAllocationDocx,
  saveBlob,
} from '../../lib/workAllocationDocx';

const REMARKS_MIN = 20;

const todayLong = () =>
  new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Nairobi', day: 'numeric', month: 'long', year: 'numeric' }).format(new Date());

const ModalShell: React.FC<{ label: string; onClose: () => void; busy?: boolean; children: React.ReactNode }> = ({
  label,
  onClose,
  busy = false,
  children,
}) => {
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape' && !busy) onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose, busy]);
  return (
    <Portal>
      <div
        role="dialog"
        aria-modal="true"
        aria-label={label}
        className="fixed inset-0 z-50 flex items-start justify-center overflow-y-auto bg-slate-950/70 p-4 backdrop-blur-sm sm:items-center"
      >
        {children}
      </div>
    </Portal>
  );
};

const ReadOnlyField: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono }) => (
  <div className="min-w-0">
    <div className="text-xs font-medium text-slate-700 dark:text-slate-300">{label}</div>
    <div
      aria-readonly="true"
      className={`mt-1.5 truncate rounded-lg border border-slate-200 bg-slate-100 px-3 py-2.5 text-sm text-slate-700 dark:border-slate-800 dark:bg-slate-800/60 dark:text-slate-200 ${mono ? 'font-mono' : ''}`}
    >
      {value || '—'}
    </div>
  </div>
);

interface WorkAllocationDialogProps {
  department: string;
  labReference: string;
  /** What was brought in, shown so the Head can describe the work precisely. */
  subject: string;
  officers: Pick<User, 'id' | 'name'>[];
  /** Officer who already holds the work (transfer); left out of the list. */
  excludeOfficerId?: string;
  headName: string;
  isTransfer?: boolean;
  /** Assigns the work with this form; resolves true when it was saved. */
  onSubmit: (analystId: string, remarks: string) => Promise<boolean>;
  onClose: () => void;
}

/**
 * The work allocation form the Head of Department fills in before assigning
 * (or transferring) an exhibit. The Head's name and the date are filled in
 * automatically; the stored form is the Head's original and the analyst
 * receives a copy with the task.
 */
export const WorkAllocationDialog: React.FC<WorkAllocationDialogProps> = ({
  department,
  labReference,
  subject,
  officers,
  excludeOfficerId,
  headName,
  isTransfer = false,
  onSubmit,
  onClose,
}) => {
  const [analystId, setAnalystId] = useState('');
  const [remarks, setRemarks] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const options = officers.filter((o) => o.id !== excludeOfficerId);
  const trimmed = remarks.trim();
  const remarksShort = trimmed.length > 0 && trimmed.length < REMARKS_MIN;
  const canSubmit = !!analystId && trimmed.length >= REMARKS_MIN && trimmed.length <= 2000;

  const submit = async () => {
    if (!canSubmit || saving) return;
    setSaving(true);
    setError('');
    try {
      if (await onSubmit(analystId, trimmed)) onClose();
      else setError('The work could not be allocated. Check the details and try again.');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The work could not be allocated.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <ModalShell label="Work allocation form" onClose={onClose} busy={saving}>
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void submit();
        }}
        className="w-full max-w-2xl overflow-hidden rounded-xl border border-slate-200 bg-white shadow-xl dark:border-slate-800 dark:bg-slate-900"
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
              <ClipboardSignature className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">
                Work allocation form{isTransfer ? ' — transfer' : ''}
              </h2>
              <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                Government Chemist · {department}. You keep the original; the analyst receives a copy with the task.
              </p>
            </div>
          </div>
          <button
            type="button"
            aria-label="Close"
            disabled={saving}
            onClick={onClose}
            className="rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600 disabled:opacity-50 dark:hover:bg-slate-800"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-4 px-5 py-5 sm:grid-cols-2">
          <ReadOnlyField label="Lab reference number" value={labReference} mono />
          <ReadOnlyField label="Date" value={todayLong()} />
          <div className="sm:col-span-2">
            <ReadOnlyField label="Exhibit / sample brought" value={subject} />
          </div>

          <label className="block sm:col-span-2">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Remarks — work to be done <span className="text-rose-500">*</span>
            </span>
            <textarea
              value={remarks}
              onChange={(event) => setRemarks(event.target.value)}
              rows={5}
              maxLength={2000}
              autoFocus
              placeholder="Describe the analysis clearly, e.g. Analyse the maize sample for aflatoxins B1, B2, G1 and G2 by HPLC-FLD and report total aflatoxin against the KS EAS 2 limit."
              className={`mt-1.5 w-full rounded-lg border bg-white px-3 py-2.5 text-sm leading-relaxed text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 dark:bg-slate-950 dark:text-white ${
                remarksShort
                  ? 'border-rose-400 focus:border-rose-500 focus:ring-rose-500/20'
                  : 'border-slate-300 focus:border-amber-500 focus:ring-amber-500/20 dark:border-slate-700'
              }`}
            />
            <span className={`mt-1 block text-[11px] ${remarksShort ? 'text-rose-500' : 'text-slate-500 dark:text-slate-400'}`}>
              {remarksShort
                ? `Describe the work in more detail (at least ${REMARKS_MIN} characters).`
                : `${trimmed.length}/2000 characters`}
            </span>
          </label>

          <label className="block">
            <span className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Analyst receiving <span className="text-rose-500">*</span>
            </span>
            <Select
              className="mt-1.5"
              aria-label="Analyst receiving"
              value={analystId}
              onChange={setAnalystId}
              placeholder={options.length ? 'Select analyst…' : 'No active analysts in this department'}
              options={options.map((o) => ({ value: o.id, label: o.name }))}
            />
          </label>
          <ReadOnlyField label="Allocated by (Head of Department)" value={headName} />
        </div>

        {error && (
          <div role="alert" className="border-t border-rose-200 bg-rose-50 px-5 py-3 text-sm text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
            {error}
          </div>
        )}

        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-5 py-3.5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-slate-950/40">
          <span className="text-[11px] text-slate-500 dark:text-slate-400">The form number is issued when you submit.</span>
          <div className="flex gap-2">
            <Button onClick={onClose} disabled={saving}>Cancel</Button>
            <Button type="submit" variant="primary" icon={Send} disabled={!canSubmit || saving}>
              {saving ? 'Allocating…' : isTransfer ? 'Transfer and send copy' : 'Allocate and send copy'}
            </Button>
          </div>
        </div>
      </form>
    </ModalShell>
  );
};

interface WorkAllocationViewerProps {
  recordType: WorkAllocationRecordType;
  recordId: string;
  onClose: () => void;
}

/**
 * Shows the work allocation form as a Word-style page preview with a download
 * of the real .docx. The Head sees the original (and can preview the copy that
 * went to the analyst, plus earlier forms superseded by a transfer); the
 * analyst sees only their copy.
 */
export const WorkAllocationViewer: React.FC<WorkAllocationViewerProps> = ({ recordType, recordId, onClose }) => {
  const [allocations, setAllocations] = useState<WorkAllocation[]>([]);
  const [access, setAccess] = useState<WorkAllocationView>('COPY');
  const [version, setVersion] = useState<WorkAllocationView>('COPY');
  const [selectedId, setSelectedId] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloading, setDownloading] = useState(false);
  const [downloadError, setDownloadError] = useState('');

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    apiRequest<{ allocations: WorkAllocation[]; view: WorkAllocationView }>(
      `/api/work-allocations?recordType=${recordType}&recordId=${encodeURIComponent(recordId)}`,
    )
      .then((result) => {
        if (cancelled) return;
        setAllocations(result.allocations);
        setAccess(result.view);
        setVersion(result.view);
      })
      .catch((cause: unknown) => {
        if (!cancelled) setError(cause instanceof Error ? cause.message : 'Could not load the work allocation form.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [recordType, recordId]);

  const latest = allocations.find((a) => !a.supersededAt) ?? allocations[0];
  const current = allocations.find((a) => a.id === selectedId) ?? latest;
  const fileName = current ? allocationFileName(current, version) : 'work-allocation.docx';

  const download = async () => {
    if (!current) return;
    setDownloading(true);
    setDownloadError('');
    try {
      saveBlob(await buildWorkAllocationDocx(current, version), fileName);
    } catch (cause) {
      setDownloadError(cause instanceof Error ? cause.message : 'The Word document could not be created.');
    } finally {
      setDownloading(false);
    }
  };

  return (
    <ModalShell label="Work allocation form" onClose={onClose} busy={downloading}>
      <div className="flex max-h-[calc(100vh-2rem)] w-full max-w-4xl flex-col overflow-hidden rounded-xl border border-slate-300 bg-white shadow-2xl dark:border-slate-700 dark:bg-slate-900">
        {/* Word-style title bar */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
          <div className="flex min-w-0 items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded bg-[#2b579a] text-white">
              <FileText className="h-4 w-4" />
            </span>
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{fileName}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">Word document preview · read only</div>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {access === 'ORIGINAL' && current && (
              <SegmentedControl
                ariaLabel="Version"
                value={version}
                onChange={setVersion}
                options={[
                  { value: 'ORIGINAL', label: 'Original' },
                  { value: 'COPY', label: 'Copy sent to analyst' },
                ]}
              />
            )}
            {current && (
              <Button variant="primary" icon={Download} disabled={downloading} onClick={() => void download()}>
                {downloading ? 'Preparing…' : 'Download (.docx)'}
              </Button>
            )}
            <button
              type="button"
              aria-label="Close"
              onClick={onClose}
              className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:hover:bg-slate-800"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {downloadError && (
          <div role="alert" className="border-b border-rose-200 bg-rose-50 px-4 py-2 text-xs text-rose-700 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-300">
            {downloadError}
          </div>
        )}

        {/* Canvas with the A4 page on it */}
        <div className="min-h-0 flex-1 overflow-auto bg-slate-200 px-3 py-6 sm:px-8 dark:bg-slate-950">
          {loading ? (
            <p className="flex items-center justify-center gap-2 py-16 text-sm text-slate-600 dark:text-slate-300">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading the form…
            </p>
          ) : error ? (
            <p role="alert" className="py-16 text-center text-sm text-rose-600 dark:text-rose-400">{error}</p>
          ) : !current ? (
            <p className="py-16 text-center text-sm text-slate-600 dark:text-slate-300">No work allocation form has been issued for this record yet.</p>
          ) : (
            <WorkAllocationPage allocation={current} version={version} />
          )}

          {access === 'ORIGINAL' && allocations.length > 1 && (
            <div className="mx-auto mt-5 max-w-[794px] rounded-lg border border-slate-300 bg-white p-3 text-xs dark:border-slate-700 dark:bg-slate-900">
              <div className="mb-1.5 font-semibold text-slate-700 dark:text-slate-200">All forms for this record</div>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {allocations.map((a) => (
                  <li key={a.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(a.id)}
                      className={`flex w-full flex-wrap items-center justify-between gap-2 px-1 py-1.5 text-left hover:bg-slate-50 dark:hover:bg-slate-800/50 ${
                        a.id === current?.id ? 'font-semibold text-slate-900 dark:text-white' : 'text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <span className="font-mono">{a.formNumber}</span>
                      <span>
                        {a.analystName} · {a.allocatedAt}
                        {a.supersededAt ? ' · superseded by transfer' : ' · current'}
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>
    </ModalShell>
  );
};

/**
 * The form drawn as a printed A4 page. Paper stays white in both themes, the
 * way a document preview does, and mirrors the downloaded .docx.
 */
const WorkAllocationPage: React.FC<{ allocation: WorkAllocation; version: WorkAllocationView }> = ({ allocation, version }) => {
  const original = version === 'ORIGINAL';
  return (
    <article
      aria-label={`Work allocation form ${allocation.formNumber}`}
      className="relative mx-auto aspect-[210/297] w-full max-w-[794px] overflow-hidden bg-white px-[7%] py-[7%] font-serif text-[#111] shadow-[0_2px_12px_rgba(15,23,42,0.25)]"
    >
      {/* Watermark */}
      <div
        aria-hidden="true"
        className={`pointer-events-none absolute inset-0 flex select-none items-center justify-center text-[clamp(48px,12vw,120px)] font-bold tracking-[0.2em] ${
          original ? 'text-emerald-700/[0.07]' : 'text-sky-700/[0.08]'
        }`}
        style={{ transform: 'rotate(-30deg)' }}
      >
        {original ? 'ORIGINAL' : 'COPY'}
      </div>

      <div className="relative flex h-full flex-col text-[clamp(9px,1.6vw,13px)] leading-relaxed">
        <header className="text-center">
          <div className="font-bold uppercase tracking-wide">Republic of Kenya</div>
          <div>Ministry of Interior and National Administration</div>
          <div className="text-[1.15em] font-bold">Government Chemist Department</div>
          <div>{allocation.department}</div>
          <div className="mt-[1.2em] text-[1.4em] font-bold uppercase tracking-wider">Work Allocation Form</div>
          <div
            className={`mt-[0.8em] border-y-2 py-[0.35em] text-[0.9em] font-bold uppercase tracking-wide ${
              original ? 'border-emerald-700 text-emerald-800' : 'border-sky-700 text-sky-800'
            }`}
          >
            {allocationVersionLabel(allocation, version)}
          </div>
        </header>

        <table className="mt-[1.6em] w-full border-collapse">
          <tbody>
            {allocationRows(allocation).map(([label, value]) => (
              <tr key={label}>
                <th scope="row" className="w-[35%] border border-[#808080] bg-[#f2f2f2] px-[0.7em] py-[0.4em] text-left align-top font-bold">
                  {label}
                </th>
                <td className="break-words border border-[#808080] px-[0.7em] py-[0.4em] align-top">{value}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="mt-[1.6em] text-[0.9em] font-bold uppercase tracking-wide">Remarks — work to be done</div>
        <div className="mt-[0.5em] whitespace-pre-wrap break-words border border-[#808080] px-[0.8em] py-[0.7em]">{allocation.remarks}</div>

        <div className="mt-[2.4em] space-y-[1.8em]">
          {[
            ['Allocated by (Head of Department)', allocation.headName],
            ['Received by (Analyst)', allocation.analystName],
          ].map(([role, name]) => (
            <div key={role} className="flex flex-wrap items-end gap-x-[1.5em] gap-y-[0.4em]">
              <span>
                <span className="font-bold">{role}:</span> {name}
              </span>
              <span className="flex-1 whitespace-nowrap">Signature: <span className="inline-block w-[10em] border-b border-[#111]" /></span>
              <span className="whitespace-nowrap">Date: <span className="inline-block w-[6em] border-b border-[#111]" /></span>
            </div>
          ))}
        </div>

        <p className="mt-auto pt-[2em] text-[0.8em] italic text-[#444]">
          Issued electronically on {allocation.allocatedAt} (Africa/Nairobi). The original is retained by the Head of
          Department; a copy accompanies the task issued to the analyst.
        </p>
        <footer className="mt-[0.6em] border-t border-[#ccc] pt-[0.4em] text-center text-[0.75em] italic text-[#555]">
          {allocation.formNumber} · {allocationVersionLabel(allocation, version)} · Generated by GC-ILCMS
        </footer>
      </div>
    </article>
  );
};
