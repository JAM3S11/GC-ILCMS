import React, { useCallback, useEffect, useState } from 'react';
import {
  BadgeCheck,
  ClipboardCheck,
  ClipboardSignature,
  FileText,
  NotebookPen,
  Pencil,
  Pill,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import { NarcoticsDraftReport, NarcoticsIntake, User } from '../../types';
import { apiRequest } from '../../lib/api';
import { NARCOTICS_STATUS_TONE, canEditNarcoticsIntake } from '../../narcoticsIntake';
import { Button } from '../common/Dashboard';
import { printOfficialDocument } from '../common/print/OfficialPrintDocument';
import { CannabisDraftReportSection } from './CannabisDraftReportSection';
import { CaseStep } from './CaseStep';
import { GovernmentAnalystReportSection } from './GovernmentAnalystReportSection';
import { CaseFileLayout, CaseFileSectionLink } from './CaseFileLayout';
import { NextStep } from './CaseFlow';
import { NarcoticsMemoPrint } from './NarcoticsMemoPrint';
import { WorkAllocationViewer } from './WorkAllocationForm';

/**
 * A Narcotics exhibit's case file, laid out like the Water case file: the
 * exhibit particulars, the work allocation, the findings (which complete the
 * analysis), the documents and memo approvals, and the process history.
 */

interface NarcoticsCaseFileProps {
  intake: NarcoticsIntake;
  currentUser: Pick<User, 'id' | 'name' | 'role'> & { department?: User['department'] };
  onBack: () => void;
  onEdit?: (intake: NarcoticsIntake) => void;
  onIntakeUpdated: (intake: NarcoticsIntake) => void;
}

interface NarcoticsEvent {
  eventType: string;
  label: string;
  actor: string;
  occurredAt: string;
  details?: Record<string, unknown>;
}

const Fact: React.FC<{ label: string; mono?: boolean; wide?: boolean; children: React.ReactNode }> = ({ label, mono, wide, children }) => (
  <div className={`min-w-0 ${wide ? 'sm:col-span-2 lg:col-span-4' : ''}`}>
    <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</dt>
    <dd className={`mt-0.5 break-words text-[13px] text-slate-800 dark:text-slate-100 ${mono ? 'font-mono' : ''} ${wide ? 'whitespace-pre-wrap' : ''}`}>
      {children || '—'}
    </dd>
  </div>
);

export const NarcoticsCaseFile: React.FC<NarcoticsCaseFileProps> = ({ intake, currentUser, onBack, onEdit, onIntakeUpdated }) => {
  const isHead = currentUser.role === 'HEAD_OF_DEPARTMENT';
  const isMine = intake.analysisOfficerId === currentUser.id;
  const memoApproved = !!intake.memoApprovedDate;
  const complete = intake.status === 'Analysis Complete';
  const canEdit = !!onEdit && canEditNarcoticsIntake(currentUser, intake);
  const canViewAllocation = !!intake.analysisOfficerId && (isHead || isMine);
  // The Head and Senior Chemists supervise every exhibit (the server allows the same).
  const isSupervisor = isHead || currentUser.role === 'SENIOR_CHEMIST' || currentUser.role === 'SUPER_ADMIN';
  // Where the cannabis draft report stands; an unapproved report holds back the memo.
  const [draftReportStatus, setDraftReportStatus] = useState<NarcoticsDraftReport['status'] | null>(null);
  // The Report of Government Analyst (under Memo) is approved before the memo.
  const [analystReportApproved, setAnalystReportApproved] = useState(false);
  const draftReportBlocksMemo = draftReportStatus !== 'APPROVED' || !analystReportApproved;

  /* ------------------------------ Actions ------------------------------- */
  const [busy, setBusy] = useState('');
  const [actionError, setActionError] = useState('');
  const run = async (key: string, path: string, body: unknown = {}) => {
    setBusy(key);
    setActionError('');
    try {
      const { intake: updated } = await apiRequest<{ intake: NarcoticsIntake }>(
        `/api/narcotics/intakes/${encodeURIComponent(intake.id)}/${path}`,
        { method: 'POST', body: JSON.stringify(body) },
      );
      onIntakeUpdated(updated);
      void loadEvents();
      return true;
    } catch (cause) {
      setActionError(cause instanceof Error ? cause.message : 'The change could not be saved.');
      return false;
    } finally {
      setBusy('');
    }
  };

  /* ------------------------------ History ------------------------------- */
  const [events, setEvents] = useState<NarcoticsEvent[]>([]);
  const [eventsError, setEventsError] = useState('');
  const loadEvents = useCallback(async () => {
    try {
      const result = await apiRequest<{ events: NarcoticsEvent[] }>(`/api/narcotics/intakes/${encodeURIComponent(intake.id)}/events`);
      setEvents(result.events);
      setEventsError('');
    } catch (cause) {
      setEventsError(cause instanceof Error ? cause.message : 'The process history could not be loaded.');
    }
  }, [intake.id]);
  useEffect(() => {
    void loadEvents();
  }, [loadEvents]);

  const [viewingAllocation, setViewingAllocation] = useState(false);

  /* ------------------------- Where the file stands ------------------------ */
  const draftApproved = draftReportStatus === 'APPROVED' || memoApproved;
  // What the Head still needs before the memo can be approved; shown as a list, not a hover tooltip.
  const memoBlockers = [
    !complete && 'The Draft Report of Analysis is submitted by the Analysis Officer.',
    !draftApproved && complete && 'The Head checks and approves the Draft Report of Analysis (under Findings).',
    !memoApproved && !analystReportApproved && complete && 'The Head approves the Report of Government Analyst (under Memo).',
    !intake.documentsConfirmedAt && 'The department ticks "Documents checked" (under Documents and memo).',
  ].filter((item): item is string => !!item);

  const analyst = isMine ? 'You' : intake.analysisOfficer || 'The Analysis Officer';
  const head = isHead ? 'You' : 'The Head of Narcotics';
  const next: NextStep = memoApproved
    ? { text: `Memo approved ${intake.memoApprovedDate}${intake.memoApprovedBy ? ` by ${intake.memoApprovedBy}` : ''}; it can be printed.`, done: true, action: { label: 'View memo', target: 'narcotics-memo' } }
    : intake.status === 'Awaiting Assignment'
      ? { text: `${head} to allocate an Analysis Officer from the exhibit register.`, action: { label: 'Go to allocation', target: 'narcotics-allocation' } }
      : !complete
        ? { text: `${analyst} to complete and submit the Draft Report of Analysis.`, action: { label: 'Go to findings', target: 'narcotics-findings' } }
        : draftReportStatus === 'SUBMITTED'
          ? { text: `${head} to check and approve the Draft Report of Analysis.`, action: { label: 'Go to findings', target: 'narcotics-findings' } }
          : draftReportStatus === 'APPROVED' && !analystReportApproved
            ? { text: `${head} to check and approve the Report of Government Analyst.`, action: { label: 'Go to report', target: 'narcotics-memo' } }
          : !intake.documentsConfirmedAt
            ? { text: 'The Narcotics department to check the intake documents and tick "Documents checked".', action: { label: 'Go to documents', target: 'narcotics-memo' } }
            : {
                text: `${head} to approve the ${intake.approvedDate ? '' : 'intake documents and the '}memo.`,
                action: { label: 'Go to memo', target: 'narcotics-memo' },
                blockers: memoBlockers,
              };

  const sections: CaseFileSectionLink[] = [
    { id: 'narcotics-particulars', title: 'Exhibit particulars', state: 'done' },
    { id: 'narcotics-allocation', title: 'Allocation form', state: intake.analysisOfficerId ? 'done' : 'current' },
    { id: 'narcotics-findings', title: 'Draft report of analysis', state: draftApproved ? 'done' : intake.analysisOfficerId ? 'current' : 'pending' },
    { id: 'narcotics-memo', title: 'Memo', state: memoApproved ? 'done' : complete ? 'current' : 'pending' },
  ];

  // The process history opens in a drawer: it is the record of what happened, not a step.
  const historyContent = (
    <>
      {eventsError ? (
        <p role="alert" className="text-xs text-rose-500">{eventsError}</p>
      ) : events.length === 0 ? (
        <p className="text-xs text-slate-400">Loading…</p>
      ) : (
        <ol className="space-y-3">
          {events.map((event, index) => (
            <li key={`${event.occurredAt}-${index}`} className="flex gap-3 text-xs">
              <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-violet-500/10 text-violet-600 dark:text-violet-400">
                <BadgeCheck className="h-3 w-3" />
              </span>
              <div className="min-w-0">
                <div className="font-medium text-slate-900 dark:text-white">{event.label}</div>
                <div className="text-slate-500 dark:text-slate-400">
                  {event.actor} · {event.occurredAt}
                  {typeof event.details?.analysisOfficer === 'string' && ` · to ${event.details.analysisOfficer}`}
                  {typeof event.details?.allocationForm === 'string' && ` · form ${event.details.allocationForm}`}
                </div>
              </div>
            </li>
          ))}
        </ol>
      )}
    </>
  );

  return (
    <CaseFileLayout
      back={{ label: 'Exhibit Laboratory', onClick: onBack }}
      reference={intake.labReference}
      status={{ label: intake.status, tone: NARCOTICS_STATUS_TONE[intake.status] }}
      subtitle={[intake.exhibitType, /^CR/i.test(intake.crNumber) ? intake.crNumber : `CR ${intake.crNumber}`, intake.policeStation]}
      next={next}
      receivedDate={intake.dateReceived}
      finishedDate={intake.memoApprovedDate}
      more={[
        ...(memoApproved ? [{ label: 'Print memo', icon: Printer, onClick: () => printOfficialDocument('portrait') }] : []),
        ...(canViewAllocation ? [{ label: isHead ? 'Allocation form' : 'Allocation form (copy)', icon: ClipboardSignature, onClick: () => setViewingAllocation(true) }] : []),
        ...(canEdit ? [{ label: 'Edit intake', icon: Pencil, onClick: () => onEdit?.(intake) }] : []),
      ]}
      details={[
        { label: 'Lab reference', value: intake.labReference, mono: true, copy: intake.labReference },
        { label: 'CR number', value: intake.crNumber, mono: true, copy: intake.crNumber },
        { label: 'Officer', value: `${intake.officerName}${intake.badgeNumber ? ` · ${intake.badgeNumber}` : ''}` },
        { label: 'Station', value: intake.policeStation },
        { label: 'Received', value: `${intake.dateReceived} ${intake.timeReceived}${intake.receivingOfficer ? ` · ${intake.receivingOfficer}` : ''}` },
        { label: 'Analyst', value: intake.analysisOfficer ? `${intake.analysisOfficer}${isMine ? ' (you)' : ''}` : 'Not yet allocated' },
        { label: 'Seal', value: [intake.sealCondition, intake.sealNumber].filter(Boolean).join(' · ') },
      ]}
      sections={sections}
      history={{ count: events.length, content: historyContent }}
      notice={actionError && (
        <div role="alert" className="rounded-[10px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          {actionError}
        </div>
      )}
    >
      {/* 1. Exhibit particulars */}
      <CaseStep
        id="narcotics-particulars"
        step={1}
        icon={Pill}
        title="Exhibit particulars"
        description="Recorded at intake. The submitting officer comes from reception."
        status={{ label: 'Registered', tone: 'emerald' }}
      >
        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 px-5 py-4 sm:grid-cols-2 lg:grid-cols-4">
          <Fact label="Lab reference" mono>{intake.labReference}</Fact>
          <Fact label="CR number" mono>{intake.crNumber}</Fact>
          <Fact label="Officer name">{intake.officerName}</Fact>
          <Fact label="Badge ID No." mono>{intake.badgeNumber}</Fact>
          <Fact label="Mobile" mono>{intake.officerMobile}</Fact>
          <Fact label="Police station">{intake.policeStation}</Fact>
          <Fact label="Received">{`${intake.dateReceived} at ${intake.timeReceived}`}</Fact>
          <Fact label="Receiving officer">{intake.receivingOfficer}</Fact>
          <Fact label="Exhibit type">{intake.exhibitType}</Fact>
          <Fact label="Items and packaging">{`${intake.numberOfItems} · ${intake.packaging}`}</Fact>
          <Fact label="Seal">{[intake.sealCondition, intake.sealNumber].filter(Boolean).join(' · ')}</Fact>
          <Fact label="Markings">{intake.markings}</Fact>
          <Fact label="Declared weight">{intake.declaredWeight}</Fact>
          <Fact label="Colour / appearance">{intake.colourAppearance}</Fact>
          <Fact label="Documents received">{intake.documentsReceived.join(', ')}</Fact>
          <Fact label="Edited">{intake.edited ? intake.editedDate : 'No'}</Fact>
          <Fact label="Detailed description" wide>{intake.description}</Fact>
        </dl>
      </CaseStep>

      {/* 2. Work allocation */}
      <CaseStep
        id="narcotics-allocation"
        state={intake.analysisOfficerId ? 'done' : 'current'}
        step={2}
        icon={ClipboardSignature}
        title="Allocation form"
        description="Issued by the Head of Narcotics when the exhibit is assigned. The Head keeps the original; the analyst gets a copy."
        status={intake.analysisOfficerId ? { label: 'Allocated', tone: 'emerald' } : { label: 'Not allocated', tone: 'teal' }}
      >
        <div className="space-y-3 px-5 py-4">
          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-3">
            <Fact label="Analysis officer">{intake.analysisOfficer ?? 'Not yet allocated'}</Fact>
            <Fact label="Assigned by">{intake.assignedBy}</Fact>
            <Fact label="Assigned">{intake.assignedDate}</Fact>
          </dl>
          {canViewAllocation && (
            <Button size="sm" icon={ClipboardSignature} onClick={() => setViewingAllocation(true)}>Open allocation form</Button>
          )}
          {!intake.analysisOfficerId && (
            <p className="text-xs text-slate-500 dark:text-slate-400">The Head of Narcotics allocates the work from the exhibit register.</p>
          )}
        </div>
      </CaseStep>

      {/* 3. Findings */}
      <CaseStep
        id="narcotics-findings"
        state={draftApproved ? 'done' : intake.analysisOfficerId ? 'current' : 'pending'}
        step={3}
        icon={NotebookPen}
        title="Draft report of analysis"
        description="The Draft Report of Analysis (Cannabis). Submitting it records the findings and completes the analysis; the Head then checks and approves it."
        status={
          draftReportStatus === 'APPROVED' ? { label: 'Checked and approved', tone: 'emerald' }
            : draftReportStatus === 'SUBMITTED' ? { label: 'Awaiting check', tone: 'violet' }
            : intake.status === 'Under Analysis' ? { label: 'Under analysis', tone: 'sky' }
            : { label: 'Not started', tone: 'slate' }
        }
      >
        <div className="px-5 pb-5 pt-4">
          {intake.status === 'Awaiting Assignment' ? (
            <p className="text-sm text-slate-500 dark:text-slate-400">The draft report of analysis is filled in once the Head assigns this exhibit to an Analysis Officer.</p>
          ) : isMine || isSupervisor ? (
            <CannabisDraftReportSection
              intake={intake}
              currentUser={currentUser}
              onStatusChange={setDraftReportStatus}
              onIntakeUpdated={(updated) => {
                onIntakeUpdated(updated);
                void loadEvents();
              }}
            />
          ) : (
            <p className="text-sm text-slate-500 dark:text-slate-400">Only the assigned Analysis Officer and supervisors can open the draft report of analysis.</p>
          )}
        </div>
      </CaseStep>

      {/* 4. Documents and memo */}
      <CaseStep
        id="narcotics-memo"
        state={memoApproved ? 'done' : complete ? 'current' : 'pending'}
        step={4}
        icon={FileText}
        title="Memo"
        description="The intake documents are confirmed by the department and approved by the Head, who then approves the memo."
        footer={isHead && !memoApproved ? (
          <>
            {!intake.approvedDate && (
              <Button
                size="sm"
                icon={ClipboardCheck}
                disabled={!!busy || !intake.documentsConfirmedAt}
                onClick={() => void run('approve', 'approve')}
                title={intake.documentsConfirmedAt ? undefined : 'The documents must be ticked as confirmed first'}
              >
                {busy === 'approve' ? 'Approving…' : 'Approve documents'}
              </Button>
            )}
            <Button
              size="sm"
              variant="primaryTeal"
              icon={ShieldCheck}
              disabled={!!busy || !complete || !intake.documentsConfirmedAt || draftReportBlocksMemo}
              onClick={() => void run('memo', 'memo')}
              title={
                !complete ? 'The draft report of analysis must be submitted first'
                  : !intake.documentsConfirmedAt ? 'The documents must be ticked as confirmed first'
                  : draftReportStatus !== 'APPROVED' ? 'Check and approve the cannabis draft report first'
                  : draftReportBlocksMemo ? 'Approve the Report of Government Analyst first'
                  : undefined
              }
            >
              {busy === 'memo' ? 'Approving…' : 'Approve memo'}
            </Button>
            {memoBlockers.length > 0 && (
              <div className="w-full text-[11px] text-slate-600 dark:text-slate-300">
                <span className="font-semibold">Before the memo can be approved:</span>
                <ul className="mt-1 space-y-0.5 pl-4">
                  {memoBlockers.map((blocker) => <li key={blocker} className="list-disc">{blocker}</li>)}
                </ul>
              </div>
            )}
          </>
        ) : memoApproved ? (
          <>
            <Button size="sm" variant="primaryTeal" icon={Printer} onClick={() => printOfficialDocument('portrait')}>Print memo</Button>
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Prints on the official A4 letterhead with sign-off lines.</span>
          </>
        ) : undefined}
        status={memoApproved ? { label: 'Memo approved', tone: 'emerald' } : complete ? { label: 'Awaiting approval', tone: 'teal' } : { label: 'After analysis', tone: 'slate' }}
      >
        <div className="space-y-4 px-5 py-4">
          {(isMine || isSupervisor) && intake.status !== 'Awaiting Assignment' && (
            <GovernmentAnalystReportSection
              intake={intake}
              draftStatus={draftReportStatus}
              onApprovedChange={setAnalystReportApproved}
              onIntakeUpdated={(updated) => {
                onIntakeUpdated(updated);
                void loadEvents();
              }}
            />
          )}
          <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={!!intake.documentsConfirmedAt}
              disabled={!!busy || memoApproved || (!!intake.approvedDate && !!intake.documentsConfirmedAt) || currentUser.department !== 'Narcotics'}
              onChange={(event) => void run('documents', 'documents-check', { confirmed: event.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500"
            />
            <span>
              Documents checked
              <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                {intake.documentsConfirmedAt
                  ? `Checked ${intake.documentsConfirmedAt}${intake.documentsConfirmedBy ? ` by ${intake.documentsConfirmedBy}` : ''}.`
                  : 'Tick once the submitted documents have been checked against the exhibit. The Head then approves them; nothing can be approved until this is ticked.'}
                {' '}Documents: {intake.documentsReceived.join(', ')}.
              </span>
            </span>
          </label>

          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            <Fact label="Documents approved by the Head">{intake.approvedBy ? `${intake.approvedBy} · ${intake.approvedDate}` : 'Not yet'}</Fact>
            <Fact label="Memo approved by the Head">{intake.memoApprovedBy ? `${intake.memoApprovedBy} · ${intake.memoApprovedDate}` : 'Not yet'}</Fact>
          </dl>
        </div>
      </CaseStep>

      {viewingAllocation && (
        <WorkAllocationViewer recordType="NARCOTICS_INTAKE" recordId={intake.id} onClose={() => setViewingAllocation(false)} />
      )}
      {memoApproved && <NarcoticsMemoPrint intake={intake} />}
    </CaseFileLayout>
  );
};
