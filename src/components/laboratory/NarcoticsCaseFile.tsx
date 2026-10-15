import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeft,
  BadgeCheck,
  Check,
  ClipboardCheck,
  ClipboardSignature,
  FileText,
  History,
  NotebookPen,
  Pencil,
  Pill,
  Printer,
  ShieldCheck,
} from 'lucide-react';
import { NarcoticsDraftReport, NarcoticsIntake, User } from '../../types';
import { apiRequest } from '../../lib/api';
import { NARCOTICS_STATUS_TONE, canEditNarcoticsIntake } from '../../narcoticsIntake';
import { Button, DashboardHeader, DashboardPage, StatusPill } from '../common/Dashboard';
import { printOfficialDocument } from '../common/print/OfficialPrintDocument';
import { CannabisDraftReportSection } from './CannabisDraftReportSection';
import { CaseStep } from './CaseStep';
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
  const draftReportBlocksMemo = draftReportStatus !== 'APPROVED';

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

  const stages = [
    { label: 'Registered', done: true },
    { label: 'Assigned', done: !!intake.analysisOfficerId },
    { label: 'Findings', done: !!intake.findings },
    { label: 'Documents', done: !!intake.approvedDate },
    { label: 'Memo', done: memoApproved },
  ];

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Exhibit Laboratory', intake.labReference]}
        title={`${intake.exhibitType} — ${intake.labReference}`}
        meta={<StatusPill tone={NARCOTICS_STATUS_TONE[intake.status]}>{intake.status}</StatusPill>}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono">{intake.labReference}</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="font-mono">CR {intake.crNumber}</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span>Narcotics</span>
          </span>
        }
        actions={
          <span className="flex flex-wrap items-center gap-2">
            <Button icon={ArrowLeft} onClick={onBack}>Exhibit Laboratory</Button>
            {canViewAllocation && (
              <Button icon={ClipboardSignature} onClick={() => setViewingAllocation(true)}>
                {isHead ? 'Allocation form' : 'Allocation form (copy)'}
              </Button>
            )}
            {canEdit && (
              <Button icon={Pencil} onClick={() => onEdit?.(intake)}>Edit intake</Button>
            )}
            {memoApproved && (
              <Button variant="primaryTeal" icon={Printer} onClick={() => printOfficialDocument('portrait')}>Print memo</Button>
            )}
          </span>
        }
      />

      {/* Where the exhibit stands */}
      <ol aria-label="Process" className="flex flex-wrap gap-2">
        {stages.map((stage, index) => (
          <li
            key={stage.label}
            className={`inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs ${
              stage.done
                ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-300'
                : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'
            }`}
          >
            <span className={`flex h-4 w-4 items-center justify-center rounded-full text-[10px] font-semibold ${stage.done ? 'bg-emerald-500 text-white' : 'bg-slate-300 text-white dark:bg-slate-600'}`}>
              {stage.done ? <Check className="h-2.5 w-2.5" strokeWidth={3} /> : index + 1}
            </span>
            {stage.label}
          </li>
        ))}
      </ol>

      {actionError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          {actionError}
        </div>
      )}

      {/* 1. Exhibit particulars */}
      <CaseStep
        id="narcotics-particulars"
        step={1}
        icon={Pill}
        title="Exhibit particulars"
        description="Recorded at intake. The submitting officer comes from reception."
        status={{ label: 'Registered', tone: 'emerald' }}
        summary={[
          { label: 'Officer', value: intake.officerName },
          { label: 'Station', value: intake.policeStation },
          { label: 'Received', value: intake.dateReceived },
          { label: 'Exhibit', value: intake.exhibitType },
        ]}
        defaultOpen={intake.status === 'Awaiting Assignment'}
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
        step={2}
        icon={ClipboardSignature}
        title="Work allocation"
        description="Issued by the Head of Narcotics when the exhibit is assigned. The Head keeps the original; the analyst gets a copy."
        status={intake.analysisOfficerId ? { label: 'Allocated', tone: 'emerald' } : { label: 'Not allocated', tone: 'teal' }}
        summary={[
          { label: 'Analysis officer', value: intake.analysisOfficer ?? 'Not yet allocated' },
          { label: 'Assigned by', value: intake.assignedBy },
          { label: 'Assigned', value: intake.assignedDate },
        ]}
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
        step={3}
        icon={NotebookPen}
        title="Findings"
        description="The Draft Report of Analysis (Cannabis). Submitting it records the findings and completes the analysis; the Head then checks and approves it."
        status={
          draftReportStatus === 'APPROVED' ? { label: 'Checked and approved', tone: 'emerald' }
            : draftReportStatus === 'SUBMITTED' ? { label: 'Awaiting check', tone: 'violet' }
            : intake.status === 'Under Analysis' ? { label: 'Under analysis', tone: 'sky' }
            : { label: 'Not started', tone: 'slate' }
        }
        summary={[
          { label: 'Substance', value: intake.substanceIdentified },
          { label: 'Net weight', value: intake.netWeight },
          { label: 'Recorded', value: intake.findingsRecordedAt },
          { label: 'By', value: intake.findingsRecordedBy },
        ]}
        defaultOpen={(isMine && intake.status === 'Under Analysis') || (isHead && draftReportStatus === 'SUBMITTED')}
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
        step={4}
        icon={FileText}
        title="Documents and memo"
        description="The intake documents are confirmed by the department and approved by the Head, who then approves the memo."
        status={memoApproved ? { label: 'Memo approved', tone: 'emerald' } : complete ? { label: 'Awaiting approval', tone: 'teal' } : { label: 'After analysis', tone: 'slate' }}
        summary={[
          { label: 'Documents', value: intake.approvedDate ? `Approved ${intake.approvedDate}` : intake.documentsConfirmedAt ? 'Confirmed' : 'Not confirmed' },
          { label: 'Memo', value: memoApproved ? `Approved ${intake.memoApprovedDate}` : 'Not approved' },
        ]}
        defaultOpen={isHead && complete && !memoApproved}
      >
        <div className="space-y-4 px-5 py-4">
          <label className="flex cursor-pointer items-start gap-2.5 text-[13px] text-slate-700 dark:text-slate-200">
            <input
              type="checkbox"
              checked={!!intake.documentsConfirmedAt}
              disabled={!!busy || memoApproved || (!!intake.approvedDate && !!intake.documentsConfirmedAt) || currentUser.department !== 'Narcotics'}
              onChange={(event) => void run('documents', 'documents-check', { confirmed: event.target.checked })}
              className="mt-0.5 h-4 w-4 rounded border-slate-300 text-teal-500 focus:ring-teal-500"
            />
            <span>
              Intake documents are approved
              <span className="block text-[11px] text-slate-500 dark:text-slate-400">
                {intake.documentsConfirmedAt
                  ? `Confirmed ${intake.documentsConfirmedAt}${intake.documentsConfirmedBy ? ` by ${intake.documentsConfirmedBy}` : ''}.`
                  : 'Tick once the submitted documents have been checked. The Head cannot approve the documents or the memo until this is ticked.'}
                {' '}Documents: {intake.documentsReceived.join(', ')}.
              </span>
            </span>
          </label>

          <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2">
            <Fact label="Documents approved by the Head">{intake.approvedBy ? `${intake.approvedBy} · ${intake.approvedDate}` : 'Not yet'}</Fact>
            <Fact label="Memo approved by the Head">{intake.memoApprovedBy ? `${intake.memoApprovedBy} · ${intake.memoApprovedDate}` : 'Not yet'}</Fact>
          </dl>

          {isHead && (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
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
              {!memoApproved && (
                <Button
                  size="sm"
                  variant="primaryTeal"
                  icon={ShieldCheck}
                  disabled={!!busy || !complete || !intake.documentsConfirmedAt || draftReportBlocksMemo}
                  onClick={() => void run('memo', 'memo')}
                  title={
                    !complete ? 'The draft report of analysis must be submitted first'
                      : !intake.documentsConfirmedAt ? 'The documents must be ticked as confirmed first'
                      : draftReportBlocksMemo ? 'Check and approve the cannabis draft report first'
                      : undefined
                  }
                >
                  {busy === 'memo' ? 'Approving…' : 'Approve memo'}
                </Button>
              )}
              {!complete && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">The memo can be approved once the draft report of analysis is submitted and checked.</span>
              )}
              {complete && !memoApproved && draftReportBlocksMemo && (
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  The Draft Report of Analysis (Cannabis) under Findings must be checked and approved first.
                </span>
              )}
            </div>
          )}
          {memoApproved && (
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
              <Button size="sm" variant="primaryTeal" icon={Printer} onClick={() => printOfficialDocument('portrait')}>Print memo</Button>
              <span className="text-[11px] text-slate-500 dark:text-slate-400">Prints on the official A4 letterhead with sign-off lines.</span>
            </div>
          )}
        </div>
      </CaseStep>

      {/* 5. Process history */}
      <CaseStep
        id="narcotics-history"
        step={5}
        icon={History}
        title="Process history"
        description="Every recorded step, with who did it and when."
        summary={[{ label: 'Steps recorded', value: String(events.length) }]}
      >
        <div className="px-5 py-4">
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
        </div>
      </CaseStep>

      {viewingAllocation && (
        <WorkAllocationViewer recordType="NARCOTICS_INTAKE" recordId={intake.id} onClose={() => setViewingAllocation(false)} />
      )}
      {memoApproved && <NarcoticsMemoPrint intake={intake} />}
    </DashboardPage>
  );
};
