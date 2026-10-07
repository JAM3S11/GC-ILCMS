import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ClipboardSignature,
  ArrowLeft,
  Ban,
  ExternalLink,
  RotateCcw,
  ShieldCheck,
  CheckCircle2,
  CircleDashed,
  ClipboardCheck,
  Building2,
  Droplets,
  FileText,
  FlaskConical,
  ListChecks,
  Loader2,
  Lock,
  NotebookPen,
  Maximize2,
  Package,
  Pencil,
  Printer,
  X,
  TriangleAlert,
  Users,
} from 'lucide-react';
import { User, WaterIntake, WaterIntakeEvent } from '../../types';
import { apiRequest, ApiError } from '../../lib/api';
import { formatKes } from '../../waterIntake';
import { Avatar, Button, DashboardHeader, DashboardPage, StatusPill, Tone } from '../common/Dashboard';
import { ProcessTracker } from '../case/DigitalCaseFile';
import { Portal } from '../common/Portal';
import { ExhibitProcessTimeline, PROCESS_STEPS } from './ExhibitProcessTimeline';
import { WaterTestResultsForm } from './WaterTestResultsForm';
import { WorkAllocationViewer } from './WorkAllocationForm';
import { WaterTestEntry } from '../../lib/waterTestParameters';
import { CertificateIssue, WaterCertificatePreview } from './WaterCertificatePreview';
import { WaterCertificate, WaterCertificateState, fieldsFromSnapshot } from '../../lib/waterCertificates';
import { canEditWaterIntake, canEditWaterResults, canPrintWaterCertificate, waterEditAccess } from '../../lib/waterIntakeAccess';

const STATUS_TONE: Record<WaterIntake['status'], Tone> = {
  'Awaiting Approval': 'rose',
  'Awaiting Assignment': 'amber',
  'Under Analysis': 'sky',
  'Analysis Complete': 'emerald',
};

/** Plain-language wording for each step an officer has not reached yet. */
const STEP_GUIDANCE: Record<string, string> = {
  REGISTERED: 'The exhibit is logged at reception with its seal and packaging details.',
  ASSIGNED: 'The Head of Department assigns the exhibit to an Analysis Officer.',
  ANALYSIS_COMPLETED: 'You run the analysis, enter the test results, then mark the analysis complete.',
};

const TRACKER_STAGES = ['Registered', 'Assigned', 'Analysis', 'Findings', 'Complete', 'Documents', 'Memo'] as const;

interface ExhibitCaseFileProps {
  intake: WaterIntake;
  currentUser: Pick<User, 'id' | 'name' | 'role' | 'department'>;
  onBack: () => void;
  onComplete: (intakeId: string) => void;
  onIntakeUpdated: (intake: WaterIntake) => void;
  /** Where Back leads; defaults to the officer's own register. */
  backLabel?: string;
  /** Opens the exhibit intake form with this exhibit's details ready to change. */
  onEditIntake?: (intake: WaterIntake) => void;
}

/**
 * The case file an assigned Analysis Officer opens: everything about the exhibit,
 * where the process stands, what is still outstanding, and the findings they
 * record. Replaces the process drawer, which could show the history but left no
 * room to act on it.
 */
export const ExhibitCaseFile: React.FC<ExhibitCaseFileProps> = ({
  intake,
  currentUser,
  onBack,
  onComplete,
  onIntakeUpdated,
  backLabel = 'Exhibit Laboratory',
  onEditIntake,
}) => {
  const [events, setEvents] = useState<WaterIntakeEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<{ message: string; status?: number } | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // The results as typed (saved or not), so the document preview follows along.
  const [draft, setDraft] = useState<{ entries: Record<string, WaterTestEntry>; remarks: string }>({
    entries: intake.findingsResults?.results ?? {},
    remarks: intake.findingsResults?.remarks ?? '',
  });
  const [fullscreen, setFullscreen] = useState(false);
  // The Head keeps the original work allocation form; the assigned analyst has a copy.
  const [viewingAllocation, setViewingAllocation] = useState(false);
  const [issuing, setIssuing] = useState(false);
  const [issueError, setIssueError] = useState<string | null>(null);
  // The signed certificates for this exhibit (current version plus history).
  const [certState, setCertState] = useState<WaterCertificateState | null>(null);
  const [certBusy, setCertBusy] = useState(false);
  const [certError, setCertError] = useState<string | null>(null);
  const [reasonMode, setReasonMode] = useState<'reissue' | 'revoke' | null>(null);
  const [reason, setReason] = useState('');
  // The reprint number shown on the printed copy (0 for the original).
  const [copyNumber, setCopyNumber] = useState(0);
  const loadCertificates = useCallback(async () => {
    try {
      setCertState(await apiRequest<WaterCertificateState>(`/api/water/intakes/${intake.id}/certificates`));
    } catch {
      setCertState(null);
    }
  }, [intake.id]);
  useEffect(() => {
    void loadCertificates();
  }, [loadCertificates, intake.certificateIssuedAt, intake.findingsResults]);
  const handleDraftChange = useCallback(
    (entries: Record<string, WaterTestEntry>, remarks: string) => setDraft({ entries, remarks }),
    [],
  );

  const isOwner = intake.analysisOfficerId === currentUser.id;
  const isUnderAnalysis = intake.status === 'Under Analysis';
  const canRecordFindings = isOwner && isUnderAnalysis;
  // Results can be corrected by the assigned officer and the Head; once the certificate is issued, only the Head.
  const canEditResults = canEditWaterResults(currentUser, intake);
  const canPrint = canPrintWaterCertificate(currentUser);
  // Anyone in the Water department, the receiving officer included, can tick that the intake documents are fine.
  const canConfirmDocuments = currentUser.department === 'Water';
  const canEditIntakeDetails = !!onEditIntake && canEditWaterIntake(waterEditAccess(currentUser, intake));

  const loadEvents = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const result = await apiRequest<{ events: WaterIntakeEvent[] }>(
        `/api/water/intakes/${intake.id}/events`,
      );
      setEvents(result.events);
    } catch (cause) {
      setLoadError({
        message: cause instanceof Error ? cause.message : 'Unable to load the exhibit process.',
        status: cause instanceof ApiError ? cause.status : undefined,
      });
    } finally {
      setLoading(false);
    }
  }, [intake.id]);

  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const reached = useMemo(() => new Set(events.map((event) => event.eventType)), [events]);
  const remaining = PROCESS_STEPS.filter((step) => !reached.has(step));

  // The analysis can only be closed from here, once every step before it has
  // happened and the officer's findings are on record.
  // The Head approves the intake documents at the memo stage, after the analysis, so it is not a prerequisite.
  const stepsBeforeCompletion = remaining.filter((step) => step !== 'ANALYSIS_COMPLETED' && step !== 'APPROVED');
  const findingsRecorded = Boolean(intake.findings?.trim());
  const completionBlockers = [
    ...(loading || loadError ? ['the exhibit process is still loading'] : []),
    ...stepsBeforeCompletion.map((step) => STEP_GUIDANCE[step] ?? step),
    ...(findingsRecorded ? [] : ['the test results have not been saved']),
  ];

  const handleSaveFindings = async (payload: { results: Record<string, WaterTestEntry>; remarks: string }) => {
    setSaving(true);
    setSaveError(null);
    try {
      const { intake: updated } = await apiRequest<{ intake: WaterIntake }>(
        `/api/water/intakes/${intake.id}/findings`,
        { method: 'POST', body: JSON.stringify(payload) },
      );
      onIntakeUpdated(updated);
      // Reload so the new FINDINGS_RECORDED entry appears in the history.
      await loadEvents();
    } catch (cause) {
      setSaveError(cause instanceof Error ? cause.message : 'Could not save the test results.');
    } finally {
      setSaving(false);
    }
  };

  const isComplete = intake.status === 'Analysis Complete';
  const parameters = Array.isArray(intake.specificParameters)
    ? intake.specificParameters.join(', ')
    : intake.specificParameters;

  // The checklist the officer works down before the analysis can be closed.
  const checklist = [
    { label: 'Exhibit registered', done: reached.has('REGISTERED') },
    { label: 'Assigned to an Analysis Officer', done: reached.has('ASSIGNED') },
    { label: 'Intake documents confirmed fine', done: !!intake.documentsConfirmedAt },
    { label: 'Findings recorded', done: findingsRecorded },
    { label: 'Analysis marked complete', done: isComplete },
    { label: 'Intake documents approved by the Head', done: !!intake.approvedDate },
    { label: 'Memo approved by the Head', done: !!intake.certificateIssuedAt },
  ];
  const doneCount = checklist.filter((item) => item.done).length;

  // Where the file stands, in the same strip the case file uses.
  const analysisStarted = intake.status === 'Under Analysis' || isComplete;
  const trackerDone = [
    reached.has('REGISTERED'),
    reached.has('ASSIGNED'),
    analysisStarted,
    // Findings are optional, so a completed analysis never stalls on this stage.
    findingsRecorded || isComplete,
    isComplete,
    !!intake.approvedDate,
    !!intake.certificateIssuedAt,
  ];
  const firstOutstanding = trackerDone.findIndex((done) => !done);
  const stage = firstOutstanding === -1 ? TRACKER_STAGES.length - 1 : firstOutstanding;
  const trackerDetails = [
    intake.dateReceived ?? 'Pending',
    intake.analysisOfficer ?? 'Awaiting assignment',
    isComplete ? 'Done' : analysisStarted ? 'In progress' : 'Pending',
    intake.findingsRecordedAt ?? 'Not recorded',
    intake.completedDate ?? 'Pending',
    intake.approvedDate ?? 'Awaiting Head',
    intake.certificateIssuedAt ?? 'Awaiting Head',
  ];

  const people = [
    { role: 'Received by', name: intake.receivingOfficer, sub: intake.dateReceived },
    { role: 'Documents approved by', name: intake.approvedBy, sub: intake.approvedDate },
    {
      role: 'Analysis Officer',
      name: intake.analysisOfficer,
      sub: intake.assignedDate
        ? 'Assigned ' + intake.assignedDate + (intake.assignedBy ? ' by ' + intake.assignedBy : '')
        : undefined,
    },
    { role: 'Sender contact', name: intake.contactPerson || intake.senderName, sub: intake.contactPersonMobile || intake.senderMobile },
  ].filter((person): person is { role: string; name: string; sub: string | undefined } => Boolean(person.name));

  // Compare what is typed with what is saved, ignoring blank rows.
  const normalise = (entries: Record<string, WaterTestEntry>, remarks: string) =>
    JSON.stringify([
      Object.entries(entries)
        .filter(([, entry]) => entry.result.trim() || entry.report)
        .map(([id, entry]) => [id, entry.result.trim(), entry.report])
        .sort(([a], [b]) => String(a).localeCompare(String(b))),
      remarks.trim(),
    ]);
  const savedEntries = intake.findingsResults?.results ?? {};
  const hasSavedResults = Object.values(savedEntries).some((entry) => entry.result.trim() || entry.report);
  const unsavedChanges = normalise(draft.entries, draft.remarks) !== normalise(savedEntries, intake.findingsResults?.remarks ?? '');
  const issued = !!intake.certificateIssuedAt;
  const approveBlocker =
    intake.status !== 'Analysis Complete'
      ? 'The memo can be approved once the analysis is marked complete.'
      : !hasSavedResults
        ? 'Save the test results before approving the memo.'
        : unsavedChanges
          ? 'Save your changes to the results before approving the memo.'
          : !intake.documentsConfirmedAt
            ? 'Tick "Intake documents are approved" first.'
            : '';
  const currentCertificate = certState?.current ?? null;
  const latestCertificate = certState?.history[0] ?? null;
  const printBlocker = !issued
    ? 'Approve the memo first; it can be printed once approved.'
    : unsavedChanges
      ? 'Save your changes to the results before printing.'
      : !currentCertificate
        ? latestCertificate?.status === 'REVOKED'
          ? 'The certificate was revoked. Reissue it to print a valid copy.'
          : 'Sign the certificate before printing it.'
        : certState?.outdated
          ? 'The results changed after this certificate was signed. Reissue it to print the new figures.'
          : '';
  // Once signed, the preview and the print show the signed snapshot, not the live form, unless the
  // results are being changed (then the draft shows, watermarked, until it is reissued).
  const showSigned = !!currentCertificate && !unsavedChanges && !certState?.outdated;
  const issueOf = (certificate: WaterCertificate): CertificateIssue => ({
    serial: certificate.serial,
    version: certificate.version,
    shortCode: certificate.shortCode,
    verifyUrl: certificate.verifyUrl,
  });
  const previewProps = showSigned && currentCertificate
    ? {
        intake: fieldsFromSnapshot(currentCertificate.snapshot),
        entries: currentCertificate.snapshot.document.results,
        remarks: currentCertificate.snapshot.document.remarks,
        issue: issueOf(currentCertificate),
      }
    : { intake, entries: draft.entries, remarks: draft.remarks };

  const focusResults = () => {
    document.getElementById('file-section-2')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    window.setTimeout(() => document.querySelector<HTMLInputElement>('input[id^="result-"]')?.focus(), 400);
  };

  // The Head approves the memo (everything the analysis officer wrote, counter-checked) and saves
  // that approval. Printing comes afterwards, whenever the Head wants a copy.
  const [confirming, setConfirming] = useState(false);
  // The Head's tick that the intake documents are fine; the memo cannot be approved while it is unticked.
  const setDocumentsConfirmed = async (confirmed: boolean) => {
    setConfirming(true);
    setIssueError(null);
    try {
      const { intake: updated } = await apiRequest<{ intake: WaterIntake }>(`/api/water/intakes/${intake.id}/documents-check`, {
        method: 'POST',
        body: JSON.stringify({ confirmed }),
      });
      onIntakeUpdated(updated);
    } catch (cause) {
      setIssueError(cause instanceof Error ? cause.message : 'Could not save the confirmation.');
    } finally {
      setConfirming(false);
    }
  };

  const documentsCheckbox = (
    <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-slate-700 dark:text-slate-200">
      <input
        type="checkbox"
        checked={!!intake.documentsConfirmedAt}
        disabled={confirming}
        onChange={(event) => void setDocumentsConfirmed(event.target.checked)}
        className="mt-0.5 h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
      />
      <span>
        Intake documents are approved
        <span className="block text-[11px] text-slate-500 dark:text-slate-400">
          {intake.documentsConfirmedAt
            ? `Confirmed ${intake.documentsConfirmedAt}${intake.documentsConfirmedBy ? ` by ${intake.documentsConfirmedBy}` : ''}. Untick to stop the memo being approved.`
            : 'Tick once the submitted documents have been checked. The Head cannot approve the memo until this is ticked.'}
        </span>
      </span>
    </label>
  );

  const approveMemo = async () => {
    setIssuing(true);
    setIssueError(null);
    try {
      const { intake: updated, ...state } = await apiRequest<{ intake: WaterIntake } & WaterCertificateState>(`/api/water/intakes/${intake.id}/certificate`, {
        method: 'POST',
        body: '{}',
      });
      setCertState(state);
      onIntakeUpdated(updated);
      await loadEvents();
    } catch (cause) {
      setIssueError(cause instanceof Error ? cause.message : 'Could not approve the memo.');
    } finally {
      setIssuing(false);
    }
  };

  // Reissue (a new signed version) or revoke the current certificate, with the reason recorded.
  const submitReason = async () => {
    if (!reasonMode) return;
    setCertBusy(true);
    setCertError(null);
    try {
      const state = await apiRequest<WaterCertificateState>(`/api/water/intakes/${intake.id}/certificate/${reasonMode}`, {
        method: 'POST',
        body: JSON.stringify({ reason }),
      });
      setCertState(state);
      setReasonMode(null);
      setReason('');
      await loadEvents();
    } catch (cause) {
      setCertError(cause instanceof Error ? cause.message : 'Could not update the certificate.');
    } finally {
      setCertBusy(false);
    }
  };

  // Every print is counted; prints after the first carry a COPY mark.
  const printMemo = async () => {
    setCertError(null);
    try {
      const { printNumber, ...state } = await apiRequest<{ printNumber: number } & WaterCertificateState>(
        `/api/water/intakes/${intake.id}/certificate/printed`,
        { method: 'POST', body: '{}' },
      );
      setCertState(state);
      setCopyNumber(printNumber > 1 ? printNumber - 1 : 0);
    } catch (cause) {
      setCertError(cause instanceof Error ? cause.message : 'Could not record the print.');
      return;
    }
    // Let the print copy re-render with its COPY mark before the dialog opens.
    window.setTimeout(openPrintDialog, 120);
  };

  const openPrintDialog = () => {
    document.body.dataset.printTarget = 'certificate';
    // The browser only honours an unnamed @page size reliably, so A4 is set for the length of this print.
    const pageStyle = document.createElement('style');
    pageStyle.textContent = '@page { size: A4 portrait; margin: 0 }';
    document.head.appendChild(pageStyle);
    const clear = () => {
      delete document.body.dataset.printTarget;
      pageStyle.remove();
      window.removeEventListener('afterprint', clear);
    };
    window.addEventListener('afterprint', clear);
    window.print();
  };

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={[backLabel, intake.exhibitId]}
        title={[intake.testType, intake.sourceType].filter(Boolean).join(' — ') || 'Water exhibit'}
        meta={<StatusPill tone={STATUS_TONE[intake.status]}>{intake.status}</StatusPill>}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono">{intake.exhibitId}</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="font-mono">{intake.labReference}</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span>Water &amp; Environment</span>
          </span>
        }
        actions={
          <span className="flex items-center gap-2 print:hidden">
            <Button icon={ArrowLeft} onClick={onBack}>
              {backLabel}
            </Button>
            {intake.analysisOfficerId &&
              (intake.analysisOfficerId === currentUser.id || currentUser.role === 'HEAD_OF_DEPARTMENT') && (
                <Button icon={ClipboardSignature} onClick={() => setViewingAllocation(true)}>
                  {currentUser.role === 'HEAD_OF_DEPARTMENT' ? 'Allocation form' : 'Allocation form (copy)'}
                </Button>
              )}
            {viewingAllocation && (
              <WorkAllocationViewer recordType="WATER_INTAKE" recordId={intake.id} onClose={() => setViewingAllocation(false)} />
            )}
            <Button variant="primary" icon={Printer} onClick={() => window.print()}>
              Print case file
            </Button>
          </span>
        }
      />

      <ProcessTracker stage={stage} details={trackerDetails} stages={TRACKER_STAGES} />

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_18rem]">
        {/* Main record */}
        <div className="@container min-w-0 space-y-4">
          <FileSection number={1} icon={Droplets} title="Exhibit particulars" description="Recorded at intake. Client details come from reception.">
            <div className="grid gap-x-8 gap-y-6 @2xl:grid-cols-2 @5xl:grid-cols-3">
              <FactGroup title="Reference and dates" icon={FileText}>
                <Fact label="Reference number" mono>{intake.labReference ?? '—'}</Fact>
                <Fact label="Laboratory sample no." mono>{intake.exhibitId ?? '—'}</Fact>
                <Fact label="Date received">{intake.dateReceived ?? '—'}</Fact>
                <Fact label="Date sample taken">{intake.dateSampled ?? '—'}</Fact>
                <Fact label="Document date">{intake.completedDate ?? 'Set when the analysis is complete'}</Fact>
              </FactGroup>

              <FactGroup title="Exhibit and custody" icon={Package}>
                <Fact label="Packaging">{intake.packaging ?? '—'}</Fact>
                <Fact label="Condition">
                  {intake.condition ? (
                    <StatusPill tone={intake.condition === 'Intact & Sealed' ? 'emerald' : 'amber'}>{intake.condition}</StatusPill>
                  ) : (
                    '—'
                  )}
                </Fact>
                <Fact label="Storage location">{intake.storageLocation ?? '—'}</Fact>
                <Fact label="Seal number" mono>{intake.sealNumber ?? '—'}</Fact>
                <Fact label="Received by">{intake.receivingOfficer ?? '—'}</Fact>
                <Fact label="Documents approved">
                  {intake.approvedBy ? `${intake.approvedBy}${intake.approvedDate ? ` · ${intake.approvedDate}` : ''}` : '—'}
                </Fact>
              </FactGroup>

              <FactGroup title="Sender" icon={Building2} note="From reception">
                <Fact label="Sender / Client">{intake.senderName ?? '—'}</Fact>
                <Fact label="Category">{intake.senderType ?? '—'}</Fact>
                <Fact label="Contact person">{intake.contactPerson ?? '—'}</Fact>
                <Fact label="Contact mobile">{intake.contactPersonMobile ?? '—'}</Fact>
                <Fact label="Address">{intake.senderAddress ?? '—'}</Fact>
              </FactGroup>

              <FactGroup title="Test and source" icon={FlaskConical}>
                <Fact label="Test requested">{intake.testType ?? '—'}</Fact>
                {parameters && <Fact label="Parameters">{parameters}</Fact>}
                <Fact label="Source">{[intake.sourceCategory, intake.sourceType].filter(Boolean).join(' · ') || '—'}</Fact>
                <Fact label="Source location">{intake.locationFrom ?? '—'}</Fact>
                {intake.dischargeTo && <Fact label="Discharged to">{intake.dischargeTo}</Fact>}
                <Fact label="Charges" mono>{formatKes(intake.charges)}</Fact>
                <Fact label="Receipt number" mono>{intake.receiptNumber ?? '—'}</Fact>
              </FactGroup>
            </div>
            {intake.remarks && (
              <div className="mt-4 rounded-lg border border-slate-200 bg-slate-50 px-3.5 py-2.5 text-xs leading-relaxed text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                <span className="mr-1.5 text-[10px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">Remarks</span>
                {intake.remarks}
              </div>
            )}
          </FileSection>

          <FileSection number={2} icon={NotebookPen} title="Findings" description="Physical and chemical test results against the KS EAS 12:2018 limits.">
            <WaterTestResultsForm
              intake={intake}
              canEdit={canEditResults}
              onDraftChange={handleDraftChange}
              lockedNote={issued && !canPrint ? 'The memo has been approved, so only the Head of Water & Environment can change the test results.' : undefined}
              saving={saving}
              saveError={saveError}
              onSave={(payload) => void handleSaveFindings(payload)}
            />
          </FileSection>

          <div className="grid items-start gap-4 @5xl:grid-cols-2">
          <FileSection number={3} icon={ClipboardCheck} title="Process history" description="Every recorded step, with who did it and when.">
            {loading ? (
              <p className="flex items-center gap-2 py-6 text-xs text-slate-500 dark:text-slate-400">
                <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading process…
              </p>
            ) : (
              <ExhibitProcessTimeline intake={intake} events={events} loading={loading} error={loadError} />
            )}
          </FileSection>
          </div>

          <FileSection number={4} icon={FileText} title="Memo" description="The Certificate of Analysis of Water, as it will be printed.">
            {canConfirmDocuments && !issued && (
              <div className="mb-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2.5 print:hidden dark:border-slate-800 dark:bg-slate-950/40">{documentsCheckbox}</div>
            )}
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2 print:hidden">
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                {issued
                  ? `Approved ${intake.certificateIssuedAt}${intake.certificateIssuedBy ? ` by ${intake.certificateIssuedBy}` : ''}.`
                  : 'The preview updates as you enter the test results above.'}
              </p>
              <div className="flex flex-wrap items-center gap-2">
                {canEditResults && (
                  <Button size="sm" icon={Pencil} onClick={focusResults}>
                    Edit results
                  </Button>
                )}
                {canEditIntakeDetails && (
                  <Button size="sm" icon={FileText} onClick={() => onEditIntake?.(intake)}>
                    Edit intake details
                  </Button>
                )}
                <Button size="sm" icon={Maximize2} onClick={() => setFullscreen(true)}>
                  Full-screen preview
                </Button>
                {canPrint && !issued && (
                  <Button size="sm" variant="primary" icon={CheckCircle2} disabled={!!approveBlocker || issuing} onClick={() => void approveMemo()}>
                    {issuing ? 'Approving…' : 'Approve memo'}
                  </Button>
                )}
                {canPrint && (
                  <Button size="sm" variant={issued ? 'primary' : 'secondary'} icon={Printer} disabled={!!printBlocker} onClick={() => void printMemo()}>
                    Print / Save as PDF
                  </Button>
                )}
              </div>
            </div>
            {intake.approvedDate && (
              <p className="mb-3 text-[11px] text-slate-500 dark:text-slate-400 print:hidden">
                Intake documents approved {intake.approvedDate}{intake.approvedBy ? ` by ${intake.approvedBy}` : ''}.
              </p>
            )}
            {canPrint && (issued ? printBlocker : approveBlocker || printBlocker) && (
              <p className="mb-3 text-[11px] text-slate-500 dark:text-slate-400 print:hidden">{issued ? printBlocker : approveBlocker || printBlocker}</p>
            )}
            {!canPrint && (
              <p className="mb-3 text-[11px] text-slate-500 dark:text-slate-400 print:hidden">Only the Head of Water &amp; Environment can approve and print the memo.</p>
            )}
            {issueError && (
              <p role="alert" className="mb-3 text-[11px] text-rose-600 dark:text-rose-400 print:hidden">{issueError}</p>
            )}
            {issued && (
              <CertificatePanel
                state={certState}
                canManage={canPrint}
                busy={certBusy || issuing}
                error={certError}
                reasonMode={reasonMode}
                reason={reason}
                onReasonChange={setReason}
                onStart={(mode) => { setReasonMode(mode); setReason(''); setCertError(null); }}
                onCancel={() => setReasonMode(null)}
                onSubmit={() => void submitReason()}
                onSign={() => void approveMemo()}
              />
            )}
            {fullscreen ? (
              <p className="py-6 text-center text-xs text-slate-500 dark:text-slate-400">Shown in full screen.</p>
            ) : (
              <div className="overflow-x-auto rounded-lg bg-slate-100 p-3 dark:bg-slate-950/50">
                <WaterCertificatePreview {...previewProps} />
              </div>
            )}
          </FileSection>
        </div>

        {/* Sidebar: where the file stands and what is left to do */}
        <aside className="space-y-4 lg:sticky lg:top-4">
          <section aria-label="Completion checklist" className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950/50">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <ListChecks className="h-3.5 w-3.5" /> File progress
              </h2>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">
                {doneCount} of {checklist.length}
              </span>
            </div>
            <div className="h-1 bg-slate-100 dark:bg-slate-800">
              <div className="h-full bg-sky-500 transition-all" style={{ width: `${(doneCount / checklist.length) * 100}%` }} />
            </div>
            <ol className="space-y-2.5 px-4 py-4">
              {checklist.map((item) => (
                <li key={item.label} className="flex items-start gap-2.5 text-xs">
                  {item.done ? (
                    <CheckCircle2 className="mt-px h-4 w-4 shrink-0 text-emerald-500" aria-label="Done" />
                  ) : (
                    <CircleDashed className="mt-px h-4 w-4 shrink-0 text-slate-300 dark:text-slate-600" aria-label="Outstanding" />
                  )}
                  <span className={item.done ? 'text-slate-500 dark:text-slate-400' : 'font-medium text-slate-900 dark:text-white'}>
                    {item.label}
                  </span>
                </li>
              ))}
            </ol>
            {canConfirmDocuments && !issued && (
              <div className="border-t border-slate-200 bg-slate-50 px-4 py-3 print:hidden dark:border-slate-800 dark:bg-slate-950/50">{documentsCheckbox}</div>
            )}
            {canPrint && isComplete && !issued && (
              <div className="space-y-2 border-t border-slate-200 bg-slate-50 px-4 py-3 print:hidden dark:border-slate-800 dark:bg-slate-950/50">
                <Button variant="primary" className="w-full" icon={CheckCircle2} disabled={!!approveBlocker || issuing} onClick={() => void approveMemo()}>
                  {issuing ? 'Approving…' : 'Approve memo'}
                </Button>
                <p className="text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
                  {approveBlocker || 'Approves the intake documents and everything the analysis officer wrote. Print it afterwards from the Memo section.'}
                </p>
              </div>
            )}
          </section>

          <section aria-label="People" className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
            <div className="flex items-center gap-2 border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950/50">
              <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
                <Users className="h-3.5 w-3.5" /> People
              </h2>
            </div>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {people.map((person) => (
                <li key={person.role} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={person.name} size="sm" />
                  <div className="min-w-0">
                    <div className="text-[11px] text-slate-500 dark:text-slate-400">{person.role}</div>
                    <div className="truncate text-[13px] font-medium text-slate-900 dark:text-white">{person.name}</div>
                    {person.sub && <div className="truncate text-[11px] text-slate-400">{person.sub}</div>}
                  </div>
                </li>
              ))}
            </ul>
          </section>

          {isOwner && (
            <p className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-[11px] leading-relaxed text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
              Assigned to you on {intake.assignedDate ?? '—'}
              {intake.assignedBy ? ` by ${intake.assignedBy}` : ''}.
            </p>
          )}
        </aside>
      </div>
      {canPrint && currentCertificate && (
        <Portal>
          <div className="certificate-print-root" aria-hidden="true">
            <WaterCertificatePreview
              intake={fieldsFromSnapshot(currentCertificate.snapshot)}
              entries={currentCertificate.snapshot.document.results}
              remarks={currentCertificate.snapshot.document.remarks}
              issue={issueOf(currentCertificate)}
              copyNumber={copyNumber}
              printMode
            />
          </div>
        </Portal>
      )}
      {fullscreen && (
        <Portal>
        <div role="dialog" aria-modal="true" aria-label="Certificate preview" className="fixed inset-0 z-50 flex flex-col bg-slate-950/80 backdrop-blur-sm print:static print:bg-white">
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-900 px-4 py-2.5 text-white print:hidden">
            <span className="text-sm font-semibold">Certificate of Analysis of Water — preview</span>
            <div className="flex items-center gap-2">
              {canEditResults && (
                <Button size="sm" icon={Pencil} onClick={() => { setFullscreen(false); window.setTimeout(focusResults, 50); }}>
                  Edit results
                </Button>
              )}
              {canPrint && !issued && (
                <Button size="sm" variant="primary" icon={CheckCircle2} disabled={!!approveBlocker || issuing} onClick={() => void approveMemo()}>
                  {issuing ? 'Approving…' : 'Approve memo'}
                </Button>
              )}
              {canPrint && (
                <Button size="sm" variant={issued ? 'primary' : 'secondary'} icon={Printer} disabled={!!printBlocker} onClick={() => void printMemo()}>
                  Print / Save as PDF
                </Button>
              )}
              <button type="button" aria-label="Close preview" onClick={() => setFullscreen(false)} className="flex h-8 w-8 items-center justify-center rounded-md hover:bg-slate-800">
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>
          <div className="min-h-0 flex-1 overflow-y-auto p-4 sm:p-8 print:overflow-visible print:p-0">
            <WaterCertificatePreview {...previewProps} />
          </div>
        </div>
        </Portal>
      )}
    </DashboardPage>
  );
};

const CERT_STATUS: Record<WaterCertificate['status'], { label: string; tone: Tone }> = {
  CURRENT: { label: 'Valid', tone: 'emerald' },
  SUPERSEDED: { label: 'Superseded', tone: 'amber' },
  REVOKED: { label: 'Revoked', tone: 'rose' },
};

const formatStamp = (value: string | null) => (value ? new Date(value).toLocaleString() : '—');

/**
 * The signed certificate behind the memo: its serial, short code and verify link, how often it was
 * printed, and (for the Head) reissue and revoke, each with a recorded reason.
 */
const CertificatePanel: React.FC<{
  state: WaterCertificateState | null;
  canManage: boolean;
  busy: boolean;
  error: string | null;
  reasonMode: 'reissue' | 'revoke' | null;
  reason: string;
  onReasonChange: (value: string) => void;
  onStart: (mode: 'reissue' | 'revoke') => void;
  onCancel: () => void;
  onSubmit: () => void;
  onSign: () => void;
}> = ({ state, canManage, busy, error, reasonMode, reason, onReasonChange, onStart, onCancel, onSubmit, onSign }) => {
  const current = state?.current ?? null;
  const latest = state?.history[0] ?? null;
  const shown = current ?? latest;
  return (
    <div className="mb-3 overflow-hidden rounded-lg border border-slate-200 print:hidden dark:border-slate-800">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/50">
        <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
          <ShieldCheck className="h-3.5 w-3.5 text-slate-400" /> Signed certificate
        </h3>
        {shown && <StatusPill tone={CERT_STATUS[shown.status].tone}>{CERT_STATUS[shown.status].label}</StatusPill>}
      </div>
      {!shown ? (
        <div className="flex flex-wrap items-center justify-between gap-3 px-3 py-3 text-[12px] text-slate-600 dark:text-slate-300">
          <span>This memo was approved before certificates were signed. Sign it to give it a serial and QR code.</span>
          {canManage && (
            <Button size="sm" variant="primary" icon={ShieldCheck} disabled={busy} onClick={onSign}>
              Sign certificate
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-3 px-3 py-3">
          <dl className="grid grid-cols-2 gap-x-4 gap-y-2 text-[12px] sm:grid-cols-4">
            <div>
              <dt className="text-[11px] text-slate-500 dark:text-slate-400">Serial</dt>
              <dd className="font-mono font-medium text-slate-900 dark:text-white">{shown.serial}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-slate-500 dark:text-slate-400">Short code</dt>
              <dd className="font-mono font-medium text-slate-900 dark:text-white">{shown.shortCode}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-slate-500 dark:text-slate-400">Version</dt>
              <dd className="font-medium text-slate-900 dark:text-white">{shown.version}</dd>
            </div>
            <div>
              <dt className="text-[11px] text-slate-500 dark:text-slate-400">Printed</dt>
              <dd className="font-medium text-slate-900 dark:text-white">
                {shown.printCount ? `${shown.printCount} ${shown.printCount === 1 ? 'time' : 'times'}` : 'Not yet'}
              </dd>
            </div>
          </dl>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Signed {formatStamp(shown.issuedAt)} by {shown.issuedBy}
            {shown.reissueReason ? ` · Reissued: ${shown.reissueReason}` : ''}
            {shown.status === 'REVOKED' ? ` · Revoked ${formatStamp(shown.revokedAt)}${shown.revokedBy ? ` by ${shown.revokedBy}` : ''}: ${shown.revokeReason}` : ''}
          </p>
          {state?.outdated && (
            <p className="flex items-start gap-1.5 rounded-md bg-amber-50 px-2.5 py-2 text-[11px] text-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
              <TriangleAlert className="mt-px h-3.5 w-3.5 shrink-0" />
              The results or exhibit details changed after this certificate was signed. The verify page still shows the signed figures; reissue to sign the new ones.
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2">
            <a
              href={shown.verifyUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 rounded-md border border-slate-200 px-2.5 py-1.5 text-[12px] font-medium text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <ExternalLink className="h-3.5 w-3.5" /> Open verify page
            </a>
            {canManage && reasonMode === null && (
              <>
                <Button size="sm" icon={RotateCcw} disabled={busy} onClick={() => onStart('reissue')}>
                  Reissue
                </Button>
                {current && (
                  <Button size="sm" variant="danger" icon={Ban} disabled={busy} onClick={() => onStart('revoke')}>
                    Revoke
                  </Button>
                )}
              </>
            )}
          </div>
          {canManage && reasonMode && (
            <div className="space-y-2 rounded-md border border-slate-200 p-2.5 dark:border-slate-700">
              <label htmlFor="certificate-reason" className="block text-[12px] font-medium text-slate-700 dark:text-slate-200">
                {reasonMode === 'reissue'
                  ? 'Why is it being reissued? The current version is marked superseded.'
                  : 'Why is it being revoked? The verify page shows it as invalid at once.'}
              </label>
              <textarea
                id="certificate-reason"
                value={reason}
                onChange={(event) => onReasonChange(event.target.value)}
                rows={2}
                maxLength={500}
                className="w-full rounded-md border border-slate-300 bg-white px-2.5 py-1.5 text-[13px] text-slate-900 outline-none focus:border-sky-500 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
              />
              <div className="flex justify-end gap-2">
                <Button size="sm" variant="ghost" onClick={onCancel} disabled={busy}>
                  Cancel
                </Button>
                <Button
                  size="sm"
                  variant={reasonMode === 'revoke' ? 'danger' : 'primary'}
                  disabled={busy || reason.trim().length < 3}
                  onClick={onSubmit}
                >
                  {busy ? 'Saving…' : reasonMode === 'revoke' ? 'Revoke certificate' : 'Reissue certificate'}
                </Button>
              </div>
            </div>
          )}
          {error && <p role="alert" className="text-[11px] text-rose-600 dark:text-rose-400">{error}</p>}
        </div>
      )}
    </div>
  );
};

/** A titled, ruled block of facts, laid out like a line on an official form. */
const FactGroup: React.FC<{
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  /** Where the facts came from, shown as a lock badge. */
  note?: string;
  children: React.ReactNode;
}> = ({ title, icon: Icon, note, children }) => (
  <div className="min-w-0 overflow-hidden rounded-lg border border-slate-200 dark:border-slate-800">
    <div className="flex items-center justify-between gap-2 border-b border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/50">
      <h3 className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-600 dark:text-slate-300">
        <Icon className="h-3.5 w-3.5 text-slate-400" /> {title}
      </h3>
      {note && (
        <span className="flex items-center gap-1 text-[10px] font-medium text-slate-500 dark:text-slate-400">
          <Lock className="h-3 w-3" /> {note}
        </span>
      )}
    </div>
    <dl className="divide-y divide-slate-100 dark:divide-slate-800">{children}</dl>
  </div>
);

/** One label and value row; the label sits in a tinted cell and long values wrap. */
const Fact: React.FC<{ label: string; mono?: boolean; children: React.ReactNode }> = ({ label, mono, children }) => (
  <div className="grid grid-cols-[8rem_minmax(0,1fr)]">
    <dt className="border-r border-slate-100 bg-slate-50/70 px-3 py-2 text-[11px] font-medium text-slate-500 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-400">
      {label}
    </dt>
    <dd className={`min-w-0 break-words px-3 py-2 text-[13px] font-medium text-slate-900 dark:text-white ${mono ? 'font-mono' : ''}`}>
      {children}
    </dd>
  </div>
);

/** A numbered section of the official file, so the record reads in a fixed order. */
const FileSection: React.FC<{
  number: number;
  icon: React.ComponentType<{ className?: string }>;
  title: string;
  description: string;
  children: React.ReactNode;
}> = ({ number, icon: Icon, title, description, children }) => (
  <section
    aria-labelledby={`file-section-${number}`}
    className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm print:break-inside-avoid dark:border-slate-700 dark:bg-slate-900"
  >
    <div className="flex items-start gap-3 border-b border-slate-200 bg-slate-50 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950/50">
      <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded bg-slate-800 text-[11px] font-semibold text-white dark:bg-slate-700 dark:text-slate-100">
        {number}
      </span>
      <div className="min-w-0">
        <h2 id={`file-section-${number}`} className="flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
          <Icon className="h-4 w-4 text-slate-400" /> {title}
        </h2>
        <p className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{description}</p>
      </div>
    </div>
    <div className="px-4 py-3.5">{children}</div>
  </section>
);
