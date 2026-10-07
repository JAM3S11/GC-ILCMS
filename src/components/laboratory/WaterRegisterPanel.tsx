import React, { useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  CheckCircle2,
  ChevronRight,
  Droplets,
  FlaskConical,
  FolderOpen,
  Pencil,
  Trash2,
  UserCheck,
  ClipboardSignature,
} from 'lucide-react';
import { User, WaterIntake, WaterIntakeStatus } from '../../types';
import { formatKes } from '../../waterIntake';
import {
  Avatar,
  Button,
  EmptyState,
  Panel,
  SearchInput,
  StatusPill,
  Tone,
  tableClasses as tc,
} from '../common/Dashboard';
import { Select } from '../common/Select';
import { WorkAllocationDialog, WorkAllocationViewer } from './WorkAllocationForm';
import { canEditWaterIntake, waterEditAccess } from '../../lib/waterIntakeAccess';

/**
 * Water & Environment exhibit register. Picks up where intake stops: only the
 * Head of Water & Environment approves the submitted documents and then assigns
 * the Analysis Officer, and every officer in the department sees who each
 * exhibit is assigned to.
 *
 * Laid out as a data table: one scannable row per exhibit with its next action
 * in the last column, and the full detail and management tools one click away
 * in an expandable row.
 */

interface WaterRegisterPanelProps {
  intakes: WaterIntake[];
  currentUser: Pick<User, 'id' | 'name' | 'role'> & { department?: User['department'] };
  /** Water & Environment officers the Head can assign an exhibit to. */
  officers: Pick<User, 'id' | 'name'>[];
  /** Assigns (or transfers) with a completed work allocation form; resolves true when saved. */
  onAssign: (intakeId: string, officerId: string, remarks: string) => Promise<boolean>;
  /** Opens the exhibit's case file; only the assigned officer can open it. */
  onOpenCaseFile?: (intake: WaterIntake) => void;
  /** Opens the exhibit intake form with this exhibit's details ready to change. */
  onEdit?: (intake: WaterIntake) => void;
  /** Head of Department only. */
  onDelete?: (intakeId: string) => void;
}

/** Where the exhibit is in the process. Ownership ("mine", a specific officer) is a separate filter. */
type Stage = 'all' | 'awaiting' | 'analysis' | 'complete';

const STATUS_TONE: Record<WaterIntakeStatus, Tone> = {
  'Awaiting Approval': 'rose',
  'Awaiting Assignment': 'amber',
  'Under Analysis': 'sky',
  'Analysis Complete': 'emerald',
};

const COLUMNS = 6;

const testLabel = (intake: WaterIntake) =>
  intake.testType === 'Specific Chemical Analysis' && intake.specificParameters?.length
    ? `Specific — ${intake.specificParameters.join(', ')}`
    : intake.testType;

export const WaterRegisterPanel: React.FC<WaterRegisterPanelProps> = ({
  intakes,
  currentUser,
  officers,
  onAssign,
  onOpenCaseFile,
  onEdit,
  onDelete,
}) => {
  const isHead = currentUser.role === 'HEAD_OF_DEPARTMENT';
  const awaiting = intakes.filter((i) => i.status === 'Awaiting Assignment' || i.status === 'Awaiting Approval');
  const underAnalysis = intakes.filter((i) => i.status === 'Under Analysis');
  const mine = intakes.filter((i) => i.analysisOfficerId === currentUser.id);
  // Analysis Officers that currently have at least one exhibit, for the by-officer view.
  const assignedOfficers = useMemo(() => {
    const seen = new Map<string, string>();
    intakes.forEach((i) => {
      if (i.analysisOfficerId && i.analysisOfficer) seen.set(i.analysisOfficerId, i.analysisOfficer);
    });
    return [...seen.entries()].map(([id, name]) => ({ id, name })).sort((a, b) => a.name.localeCompare(b.name));
  }, [intakes]);
  const complete = intakes.filter((i) => i.status === 'Analysis Complete');
  const [stage, setStage] = useState<Stage>('all');
  const [mineOnly, setMineOnly] = useState(false);
  const [officerFilter, setOfficerFilter] = useState('');
  const [query, setQuery] = useState('');

  const inStage: Record<Stage, WaterIntake[]> = {
    all: intakes,
    awaiting,
    analysis: underAnalysis,
    complete,
  };
  const filtersActive = stage !== 'all' || mineOnly || officerFilter !== '' || query.trim() !== '';
  const clearFilters = () => {
    setStage('all');
    setMineOnly(false);
    setOfficerFilter('');
    setQuery('');
  };

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return inStage[stage]
      .filter((i) => !mineOnly || i.analysisOfficerId === currentUser.id)
      .filter((i) => !officerFilter || i.analysisOfficerId === officerFilter)
      .filter(
        (i) =>
          !q ||
          i.labReference.toLowerCase().includes(q) ||
          i.exhibitId.toLowerCase().includes(q) ||
          i.senderName.toLowerCase().includes(q) ||
          i.sourceType.toLowerCase().includes(q) ||
          i.locationFrom.toLowerCase().includes(q) ||
          (i.analysisOfficer ?? '').toLowerCase().includes(q),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, mineOnly, officerFilter, query, intakes, currentUser.id]);

  const emptyTitle = query.trim()
    ? 'No exhibits match your search'
    : mineOnly || officerFilter
      ? 'No exhibits match these filters'
      : stage === 'awaiting'
        ? 'Nothing awaiting assignment'
        : stage === 'analysis'
          ? 'Nothing under analysis'
          : stage === 'complete'
            ? 'No completed exhibits yet'
            : 'No exhibits registered yet';

  const tabs: { id: Stage; label: string; count: number }[] = [
    { id: 'all', label: 'All', count: intakes.length },
    { id: 'awaiting', label: 'Awaiting assignment', count: awaiting.length },
    { id: 'analysis', label: 'Under analysis', count: underAnalysis.length },
    { id: 'complete', label: 'Completed', count: complete.length },
  ];

  return (
    <Panel
      icon={Droplets}
      tone="sky"
      title="Water & Environment exhibits"
      description={
        `${intakes.length} in the department · ${awaiting.length} awaiting assignment`
      }
      flush
      actions={<SearchInput value={query} onChange={setQuery} placeholder="Search reference, sender, source…" />}
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>
            Showing {rows.length} of {intakes.length} exhibits
          </span>
          <span>Select a row to see its details and management options.</span>
        </div>
      }
    >
      {/* Stage tabs: where the exhibit is in the process */}
      <div role="tablist" aria-label="Exhibit stage" className="flex gap-6 overflow-x-auto border-b border-slate-200 px-4 dark:border-slate-800">
        {tabs.map((tab) => {
          const active = stage === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setStage(tab.id)}
              className={`-mb-px flex shrink-0 items-center gap-1.5 border-b-2 py-3 text-[13px] transition-colors ${
                active
                  ? 'border-amber-500 font-semibold text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {tab.label}
              <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${active ? 'bg-amber-500/15 text-amber-700 dark:text-amber-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                {tab.count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Ownership filters: whose exhibits */}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
        <button
          type="button"
          aria-pressed={mineOnly}
          onClick={() => setMineOnly((value) => !value)}
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
            mineOnly
              ? 'border-sky-500 bg-sky-500/10 text-sky-700 dark:text-sky-300'
              : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/40'
          }`}
        >
          Assigned to me
          <span className="tabular-nums text-slate-400">{mine.length}</span>
        </button>
        <Select
          size="xs"
          className="w-56"
          aria-label="Analysis officer"
          value={officerFilter}
          onChange={setOfficerFilter}
          placeholder="All analysis officers"
          options={[
            { value: '', label: 'All analysis officers' },
            ...assignedOfficers.map((o) => ({
              value: o.id,
              label: `${o.name} (${intakes.filter((i) => i.analysisOfficerId === o.id).length})`,
            })),
          ]}
        />
        {filtersActive && (
          <button type="button" onClick={clearFilters} className="ml-auto text-xs font-medium text-amber-700 hover:underline dark:text-amber-400">
            Clear filters
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title={emptyTitle}
          action={
            filtersActive ? (
              <Button size="sm" onClick={clearFilters}>
                Clear filters
              </Button>
            ) : undefined
          }
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[920px] border-separate border-spacing-0 text-left text-[13px]">
            <caption className="sr-only">Water &amp; Environment exhibit register</caption>
            <thead>
              <tr>
                <th scope="col" className="sticky top-0 w-8 border-b border-slate-200 bg-white px-0 py-3 dark:border-slate-800 dark:bg-slate-900">
                  <span className="sr-only">Expand</span>
                </th>
                <th scope="col" className="sticky top-0 border-b border-slate-200 bg-white px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:bg-slate-900">Exhibit</th>
                <th scope="col" className="sticky top-0 border-b border-slate-200 bg-white px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:bg-slate-900">Sender</th>
                <th scope="col" className="sticky top-0 border-b border-slate-200 bg-white px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:bg-slate-900">Test</th>
                <th scope="col" className="sticky top-0 border-b border-slate-200 bg-white px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:bg-slate-900">Status</th>
                <th scope="col" className="sticky top-0 border-b border-slate-200 bg-white px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:bg-slate-900">Analysis officer</th>
                <th scope="col" className="sticky top-0 border-b border-slate-200 bg-white px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:bg-slate-900 text-right">Next action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((intake) => (
                <RegisterRow
                  key={intake.id}
                  intake={intake}
                  currentUser={currentUser}
                  officers={officers}
                  onAssign={onAssign}
                  onOpenCaseFile={onOpenCaseFile}
                  onEdit={onEdit}
                  onDelete={onDelete}
                />
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Panel>
  );
};

const Detail: React.FC<{ label: string; children: React.ReactNode; mono?: boolean }> = ({ label, children, mono }) => (
  <div className="min-w-0">
    <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">{label}</dt>
    <dd className={`mt-0.5 break-words text-[13px] text-slate-800 dark:text-slate-100 ${mono ? 'font-mono' : ''}`}>{children}</dd>
  </div>
);

const allocationSubject = (intake: WaterIntake) =>
  `${testLabel(intake)} · ${intake.sourceCategory}, ${intake.sourceType} (${intake.locationFrom}) · from ${intake.senderName}`;

/** The one thing this person can do next with an exhibit; used by both the table and the board. */
const ExhibitNextAction: React.FC<
  Pick<WaterRegisterPanelProps, 'currentUser' | 'officers' | 'onAssign' | 'onOpenCaseFile'> & { intake: WaterIntake }
> = ({ intake, currentUser, officers, onAssign, onOpenCaseFile }) => {
  const [allocating, setAllocating] = useState(false);
  const isHead = currentUser.role === 'HEAD_OF_DEPARTMENT';
  const isMine = intake.analysisOfficerId === currentUser.id;
  // The Head and Senior Chemists supervise every exhibit, so they can open any case file.
  const canOpenCase = !!onOpenCaseFile && (isMine || isHead || currentUser.role === 'SENIOR_CHEMIST');

  if (intake.status === 'Awaiting Assignment' || intake.status === 'Awaiting Approval') {
    return isHead ? (
      <>
        <Button size="xs" variant="primary" icon={UserCheck} onClick={() => setAllocating(true)}>
          Allocate work
        </Button>
        {allocating && (
          <WorkAllocationDialog
            department="Water & Environment"
            labReference={intake.labReference}
            subject={allocationSubject(intake)}
            officers={officers}
            headName={currentUser.name}
            onSubmit={(analystId, remarks) => onAssign(intake.id, analystId, remarks)}
            onClose={() => setAllocating(false)}
          />
        )}
      </>
    ) : (
      <span className="text-[11px] text-slate-500 dark:text-slate-400">Waiting for Head to assign</span>
    );
  }
  if (canOpenCase) {
    // The case file is where the officer records findings and closes the analysis.
    return (
      <Button
        size="xs"
        variant={isMine && intake.status === 'Under Analysis' ? 'primary' : 'secondary'}
        icon={FolderOpen}
        onClick={() => onOpenCaseFile?.(intake)}
      >
        Case file
      </Button>
    );
  }
  if (intake.status === 'Under Analysis') {
    return <span className="text-[11px] text-slate-500 dark:text-slate-400">With the Analysis Officer</span>;
  }
  if (intake.status === 'Analysis Complete') {
    return <span className="text-[11px] text-slate-500 dark:text-slate-400">Completed {intake.completedDate}</span>;
  }
  return <span className="text-[11px] text-slate-400">—</span>;
};

const RegisterRow: React.FC<Omit<WaterRegisterPanelProps, 'intakes'> & { intake: WaterIntake }> = ({
  intake,
  currentUser,
  officers,
  onAssign,
  onOpenCaseFile,
  onEdit,
  onDelete,
}) => {
  const [open, setOpen] = useState(false);
  const [transferring, setTransferring] = useState(false);
  const [viewingAllocation, setViewingAllocation] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isHead = currentUser.role === 'HEAD_OF_DEPARTMENT';
  const isMine = intake.analysisOfficerId === currentUser.id;
  // The Head and Senior Chemists supervise every exhibit, so they can open any case file.
  const canOpenCase = !!onOpenCaseFile && (isMine || isHead || currentUser.role === 'SENIOR_CHEMIST');
  // What this person may change is decided in one place and enforced again by the server.
  const access = waterEditAccess(currentUser, intake);
  const canEdit = !!onEdit && canEditWaterIntake(access);
  const canDelete = !!onDelete && isHead;
  const canTransfer = isHead && intake.status === 'Under Analysis';
  // The Head holds the original allocation form; the assigned analyst holds a copy.
  const canViewAllocation = !!intake.analysisOfficerId && (isHead || isMine);
  const source = `${intake.sourceCategory} · ${intake.sourceType}, ${intake.locationFrom}${
    intake.dischargeTo ? ` → ${intake.dischargeTo}` : ''
  }`;

  const nextAction = (
    <ExhibitNextAction
      intake={intake}
      currentUser={currentUser}
      officers={officers}
      onAssign={onAssign}
      onOpenCaseFile={onOpenCaseFile}
    />
  );

  return (
    <>
      <tr
        className={`group cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${isMine ? 'bg-sky-500/[0.04]' : ''}`}
        onClick={() => setOpen((value) => !value)}
      >
        <td className="w-8 border-b border-slate-100 py-4 pl-3 pr-0 align-middle dark:border-slate-800/70">
          <button
            type="button"
            aria-expanded={open}
            aria-label={`${open ? 'Hide' : 'Show'} details for ${intake.labReference}`}
            onClick={(event) => {
              event.stopPropagation();
              setOpen((value) => !value);
            }}
            className="flex h-6 w-6 cursor-pointer items-center justify-center rounded text-slate-400 hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
          >
            <ChevronRight className={`h-4 w-4 transition-transform ${open ? 'rotate-90' : ''}`} />
          </button>
        </td>
        <td className="border-b border-slate-100 px-4 py-4 align-middle dark:border-slate-800/70">
          <div className="font-mono text-[13px] font-semibold text-slate-900 dark:text-white">{intake.labReference}</div>
          <div className="mt-0.5 text-[11px] text-slate-400">
            {intake.exhibitId} · received {intake.dateReceived}
          </div>
        </td>
        <td className="border-b border-slate-100 px-4 py-4 align-middle dark:border-slate-800/70">
          <div className="max-w-[200px] truncate font-medium text-slate-900 dark:text-white" title={intake.senderName}>
            {intake.senderName}
          </div>
          <div className="text-[11px] text-slate-500 dark:text-slate-400">{intake.senderType}</div>
        </td>
        <td className="border-b border-slate-100 px-4 py-4 align-middle dark:border-slate-800/70">
          <div className="max-w-[220px]">{testLabel(intake)}</div>
          <div className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{formatKes(intake.charges)}</div>
        </td>
        <td className="border-b border-slate-100 px-4 py-4 align-middle dark:border-slate-800/70">
          <StatusPill tone={STATUS_TONE[intake.status]}>{intake.status}</StatusPill>
          {intake.edited && <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Edited</div>}
        </td>
        <td className="border-b border-slate-100 px-4 py-4 align-middle dark:border-slate-800/70">
          {intake.analysisOfficer ? (
            <div className="flex items-center gap-2">
              <Avatar name={intake.analysisOfficer} size="sm" tone={isMine ? 'sky' : 'slate'} />
              <div className="min-w-0">
                <div className="max-w-[150px] truncate font-medium text-slate-900 dark:text-white" title={intake.analysisOfficer}>
                  {intake.analysisOfficer}
                  {isMine && (
                    <span className="ml-1.5 rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">
                      You
                    </span>
                  )}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{intake.assignedDate}</div>
              </div>
            </div>
          ) : (
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Unassigned</span>
          )}
        </td>
        <td className="border-b border-slate-100 px-4 py-4 align-middle dark:border-slate-800/70 text-right" onClick={(event) => event.stopPropagation()}>
          {nextAction}
        </td>
      </tr>

      {open && (
        <tr className="bg-slate-50/70 dark:bg-slate-950/30">
          <td colSpan={COLUMNS + 1} className="border-b border-slate-100 px-5 py-4 dark:border-slate-800/70">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
              <Detail label="Source and location">{source}</Detail>
              <Detail label="Received by">{intake.receivingOfficer}</Detail>
              <Detail label="Receipt number" mono>{intake.receiptNumber ?? '—'}</Detail>
              <Detail label="Documents approved">
                {intake.approvedBy ? `${intake.approvedBy}${intake.approvedDate ? ` · ${intake.approvedDate}` : ''}` : 'Not yet approved'}
              </Detail>
              {intake.assignedBy && (
                <Detail label="Assigned by">
                  {intake.assignedBy}
                  {intake.assignedDate ? ` · ${intake.assignedDate}` : ''}
                </Detail>
              )}
              {intake.completedBy && (
                <Detail label="Completed by">
                  {intake.completedBy}
                  {intake.completedDate ? ` · ${intake.completedDate}` : ''}
                </Detail>
              )}
            </dl>

            {(canTransfer || canViewAllocation || canEdit || canDelete || intake.edited || (canOpenCase && !isMine && (intake.status === 'Awaiting Approval' || intake.status === 'Awaiting Assignment'))) && (
              <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 pt-3 dark:border-slate-800">
                <span className="text-[11px] text-slate-500 dark:text-slate-400">
                  {access.fillInOnly
                    ? 'Analysis has started — you can fill in details that were left out'
                    : access.intake && access.sender
                      ? 'Opens the intake form with the exhibit and client details ready to change'
                      : access.intake
                        ? 'You received this exhibit, so you can edit its intake'
                        : access.sender
                          ? 'You can correct the client details'
                          : intake.edited
                            ? `Edited on ${intake.editedDate}`
                            : ''}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  {canViewAllocation && (
                    <Button size="xs" icon={ClipboardSignature} onClick={() => setViewingAllocation(true)}>
                      {isHead ? 'Allocation form' : 'Allocation form (copy)'}
                    </Button>
                  )}
                  {canTransfer && (
                    <Button size="xs" icon={ArrowRightLeft} onClick={() => setTransferring(true)}>
                      Transfer
                    </Button>
                  )}
                  {canOpenCase && (intake.status === 'Awaiting Approval' || intake.status === 'Awaiting Assignment') && (
                    <Button size="xs" icon={FolderOpen} onClick={() => onOpenCaseFile?.(intake)}>
                      Open case file
                    </Button>
                  )}
                  {canEdit && (
                    <Button size="xs" icon={Pencil} onClick={() => onEdit?.(intake)}>
                      {access.fillInOnly ? 'Fill in missing details' : 'Edit intake'}
                    </Button>
                  )}
                  {canDelete &&
                    (confirmingDelete ? (
                      <>
                        <span className="text-[11px] text-rose-600 dark:text-rose-400">Delete this intake?</span>
                        <Button size="xs" variant="danger" icon={Trash2} onClick={() => onDelete?.(intake.id)}>
                          Confirm delete
                        </Button>
                        <Button size="xs" variant="ghost" onClick={() => setConfirmingDelete(false)}>
                          Cancel
                        </Button>
                      </>
                    ) : (
                      <Button size="xs" variant="ghost" icon={Trash2} onClick={() => setConfirmingDelete(true)}>
                        Delete
                      </Button>
                    ))}
                </div>
              </div>
            )}

            {transferring && (
              <WorkAllocationDialog
                department="Water & Environment"
                labReference={intake.labReference}
                subject={allocationSubject(intake)}
                officers={officers}
                excludeOfficerId={intake.analysisOfficerId}
                headName={currentUser.name}
                isTransfer
                onSubmit={(analystId, remarks) => onAssign(intake.id, analystId, remarks)}
                onClose={() => setTransferring(false)}
              />
            )}
            {viewingAllocation && (
              <WorkAllocationViewer recordType="WATER_INTAKE" recordId={intake.id} onClose={() => setViewingAllocation(false)} />
            )}
          </td>
        </tr>
      )}

    </>
  );
};
