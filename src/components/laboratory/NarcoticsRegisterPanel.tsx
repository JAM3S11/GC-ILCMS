import React, { useEffect, useMemo, useState } from 'react';
import {
  ArrowRightLeft,
  BadgeCheck,
  ChevronRight,
  ClipboardList,
  ClipboardSignature,
  FolderOpen,
  Pencil,
  Pill,
  Trash2,
  UserCheck,
} from 'lucide-react';
import { NarcoticsIntake, User } from '../../types';
import { NARCOTICS_STATUS_TONE, canEditNarcoticsIntake } from '../../narcoticsIntake';
import { Avatar, Button, EmptyState, Panel, SearchInput, StatusPill } from '../common/Dashboard';
import { WorkAllocationDialog, WorkAllocationViewer } from './WorkAllocationForm';

/**
 * The Narcotics exhibit register, laid out like the Water register: one row per
 * exhibit with its next action, and the management tools in an expandable row.
 * Only the Head of Narcotics allocates work, transfers and deletes.
 */

interface NarcoticsRegisterPanelProps {
  intakes: NarcoticsIntake[];
  isLoading?: boolean;
  currentUser: Pick<User, 'id' | 'name' | 'role'>;
  /** Narcotics officers the Head can assign an exhibit to. */
  officers: Pick<User, 'id' | 'name'>[];
  onAssign: (intakeId: string, officerId: string, remarks: string) => Promise<boolean>;
  onOpenCaseFile: (intake: NarcoticsIntake) => void;
  onEdit: (intake: NarcoticsIntake) => void;
  onDelete: (intakeId: string) => void;
  /** Register tab to open on ('all', 'mine', 'awaiting', 'analysis', 'complete'), e.g. from the sidebar. */
  initialRegisterView?: string;
  /** Told whenever the open tab changes, so the sidebar can highlight it. */
  onRegisterViewChange?: (view: string) => void;
}

type Stage = 'all' | 'awaiting' | 'analysis' | 'complete';

const STAGES: Stage[] = ['all', 'awaiting', 'analysis', 'complete'];
const stageOf = (view?: string): Stage => (STAGES.includes(view as Stage) ? (view as Stage) : 'all');

const allocationSubject = (intake: NarcoticsIntake) =>
  `${intake.exhibitType} · ${intake.numberOfItems} item${intake.numberOfItems === 1 ? '' : 's'} (${intake.packaging}) · CR ${intake.crNumber} · from ${intake.policeStation}`;

const th = 'sticky top-0 border-b border-slate-200 bg-white px-4 py-3 text-[11px] font-medium uppercase tracking-wide text-slate-400 dark:border-slate-800 dark:bg-slate-900';
const td = 'border-b border-slate-100 px-4 py-4 align-middle dark:border-slate-800/70';

export const NarcoticsRegisterPanel: React.FC<NarcoticsRegisterPanelProps> = (props) => {
  const { intakes, isLoading = false, currentUser, initialRegisterView, onRegisterViewChange } = props;
  const [stage, setStage] = useState<Stage>(() => stageOf(initialRegisterView));
  const [mineOnly, setMineOnly] = useState(initialRegisterView === 'mine');
  const [query, setQuery] = useState('');

  // Report the open tab ("Assigned to me" wins over the stage) to the sidebar.
  useEffect(() => {
    onRegisterViewChange?.(mineOnly ? 'mine' : stage);
  }, [stage, mineOnly, onRegisterViewChange]);

  const byStage: Record<Stage, NarcoticsIntake[]> = {
    all: intakes,
    awaiting: intakes.filter((i) => i.status === 'Awaiting Assignment'),
    analysis: intakes.filter((i) => i.status === 'Under Analysis'),
    complete: intakes.filter((i) => i.status === 'Analysis Complete'),
  };
  const mine = intakes.filter((i) => i.analysisOfficerId === currentUser.id);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return byStage[stage]
      .filter((i) => !mineOnly || i.analysisOfficerId === currentUser.id)
      .filter(
        (i) =>
          !q ||
          [i.labReference, i.crNumber, i.officerName, i.badgeNumber, i.policeStation, i.exhibitType, i.description, i.analysisOfficer]
            .some((value) => value?.toLowerCase().includes(q)),
      );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, mineOnly, query, intakes, currentUser.id]);

  const filtersActive = stage !== 'all' || mineOnly || query.trim() !== '';
  const clearFilters = () => {
    setStage('all');
    setMineOnly(false);
    setQuery('');
  };

  const tabs: { id: Stage; label: string }[] = [
    { id: 'all', label: 'All' },
    { id: 'awaiting', label: 'Awaiting assignment' },
    { id: 'analysis', label: 'Under analysis' },
    { id: 'complete', label: 'Completed' },
  ];

  return (
    <Panel
      icon={ClipboardList}
      tone="violet"
      title="Exhibit register"
      description={`${intakes.length} in the department · ${byStage.awaiting.length} awaiting assignment`}
      actions={<SearchInput value={query} onChange={setQuery} placeholder="Search K-number, CR, officer, station…" />}
      flush
      footer={
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>Showing {rows.length} of {intakes.length} exhibits</span>
          <span>Select a row to see its details and management options.</span>
        </div>
      }
    >
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
                  ? 'border-teal-500 font-semibold text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
              }`}
            >
              {tab.label}
              <span className={`rounded-full px-1.5 text-[11px] tabular-nums ${active ? 'bg-teal-500/15 text-teal-700 dark:text-teal-300' : 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400'}`}>
                {byStage[tab.id].length}
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-4 py-2.5 dark:border-slate-800">
        <button
          type="button"
          aria-pressed={mineOnly}
          onClick={() => setMineOnly((value) => !value)}
          className={`inline-flex h-8 items-center gap-1.5 rounded-lg border px-2.5 text-xs font-medium transition-colors ${
            mineOnly
              ? 'border-violet-500 bg-violet-500/10 text-violet-700 dark:text-violet-300'
              : 'border-slate-300 text-slate-600 hover:bg-slate-50 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800/40'
          }`}
        >
          Assigned to me
          <span className="tabular-nums text-slate-400">{mine.length}</span>
        </button>
        {filtersActive && (
          <button type="button" onClick={clearFilters} className="ml-auto text-xs font-medium text-teal-700 hover:underline dark:text-teal-400">
            Clear filters
          </button>
        )}
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={Pill}
          title={isLoading && intakes.length === 0 ? 'Loading Narcotics exhibits' : filtersActive ? 'No exhibits match these filters' : 'No exhibits registered yet'}
          description={filtersActive ? undefined : 'Exhibits registered from Exhibit Intake will appear here.'}
          action={filtersActive ? <Button size="sm" onClick={clearFilters}>Clear filters</Button> : undefined}
        />
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] border-separate border-spacing-0 text-left text-[13px]">
            <caption className="sr-only">Narcotics exhibit register</caption>
            <thead>
              <tr>
                <th scope="col" className={`${th} w-8 px-0`}><span className="sr-only">Expand</span></th>
                <th scope="col" className={th}>Exhibit</th>
                <th scope="col" className={th}>Officer</th>
                <th scope="col" className={th}>Sample</th>
                <th scope="col" className={th}>Status</th>
                <th scope="col" className={th}>Analysis officer</th>
                <th scope="col" className={`${th} text-right`}>Next action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((intake) => (
                <RegisterRow key={intake.id} {...props} intake={intake} />
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
    <dd className={`mt-0.5 break-words text-[13px] text-slate-800 dark:text-slate-100 ${mono ? 'font-mono' : ''}`}>{children || '—'}</dd>
  </div>
);

const RegisterRow: React.FC<NarcoticsRegisterPanelProps & { intake: NarcoticsIntake }> = ({
  intake,
  currentUser,
  officers,
  onAssign,
  onOpenCaseFile,
  onEdit,
  onDelete,
}) => {
  const [open, setOpen] = useState(false);
  const [allocating, setAllocating] = useState<'assign' | 'transfer' | null>(null);
  const [viewingAllocation, setViewingAllocation] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isHead = currentUser.role === 'HEAD_OF_DEPARTMENT';
  const isMine = intake.analysisOfficerId === currentUser.id;
  const canOpenCase = isMine || isHead || currentUser.role === 'SENIOR_CHEMIST';
  const canEdit = canEditNarcoticsIntake(currentUser, intake);
  const canTransfer = isHead && intake.status === 'Under Analysis';
  const canViewAllocation = !!intake.analysisOfficerId && (isHead || isMine);

  const nextAction =
    intake.status === 'Awaiting Assignment' ? (
      isHead ? (
        <Button size="xs" variant="primaryTeal" icon={UserCheck} onClick={() => setAllocating('assign')}>Allocate work</Button>
      ) : (
        <span className="text-[11px] text-slate-500 dark:text-slate-400">Waiting for Head to assign</span>
      )
    ) : canOpenCase ? (
      <Button
        size="xs"
        variant={(isMine && intake.status === 'Under Analysis') || (isHead && intake.status === 'Analysis Complete' && !intake.memoApprovedDate) ? 'primary' : 'secondary'}
        icon={FolderOpen}
        onClick={() => onOpenCaseFile(intake)}
      >
        Case file
      </Button>
    ) : intake.status === 'Under Analysis' ? (
      <span className="text-[11px] text-slate-500 dark:text-slate-400">With the Analysis Officer</span>
    ) : (
      <span className="text-[11px] text-slate-500 dark:text-slate-400">Completed {intake.completedDate}</span>
    );

  return (
    <>
      <tr
        className={`group cursor-pointer transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40 ${isMine ? 'bg-violet-500/[0.04]' : ''}`}
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
        <td className={td}>
          <div className="font-mono text-[13px] font-semibold text-slate-900 dark:text-white">{intake.labReference}</div>
          <div className="mt-0.5 font-mono text-[11px] text-slate-400">CR {intake.crNumber} · {intake.dateReceived}</div>
        </td>
        <td className={td}>
          <div className="max-w-[180px] truncate font-medium text-slate-900 dark:text-white" title={intake.officerName}>{intake.officerName}</div>
          <div className="flex max-w-[180px] items-center gap-1 truncate text-[11px] text-slate-500 dark:text-slate-400" title={intake.policeStation}>
            <BadgeCheck className="h-3 w-3 shrink-0" />
            <span className="font-mono">{intake.badgeNumber}</span> · {intake.policeStation}
          </div>
        </td>
        <td className={td}>
          <div className="max-w-[220px] truncate" title={intake.description}>{intake.exhibitType}</div>
          <div className="max-w-[220px] truncate text-[11px] text-slate-500 dark:text-slate-400">
            {intake.substanceIdentified ? `Found: ${intake.substanceIdentified}` : `${intake.numberOfItems} item${intake.numberOfItems === 1 ? '' : 's'} · ${intake.sealCondition}`}
          </div>
        </td>
        <td className={td}>
          <StatusPill tone={NARCOTICS_STATUS_TONE[intake.status]}>{intake.status}</StatusPill>
          {intake.memoApprovedDate && <div className="mt-1 text-[10px] text-emerald-600 dark:text-emerald-400">Memo approved</div>}
          {intake.edited && !intake.memoApprovedDate && <div className="mt-1 text-[10px] text-slate-500 dark:text-slate-400">Edited</div>}
        </td>
        <td className={td}>
          {intake.analysisOfficer ? (
            <div className="flex items-center gap-2">
              <Avatar name={intake.analysisOfficer} size="sm" tone={isMine ? 'violet' : 'slate'} />
              <div className="min-w-0">
                <div className="max-w-[150px] truncate font-medium text-slate-900 dark:text-white" title={intake.analysisOfficer}>
                  {intake.analysisOfficer}
                  {isMine && <span className="ml-1.5 rounded bg-violet-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-violet-700 dark:text-violet-300">You</span>}
                </div>
                <div className="text-[11px] text-slate-500 dark:text-slate-400">{intake.assignedDate}</div>
              </div>
            </div>
          ) : (
            <span className="text-[11px] text-slate-500 dark:text-slate-400">Unassigned</span>
          )}
        </td>
        <td className={`${td} text-right`} onClick={(event) => event.stopPropagation()}>
          {nextAction}
        </td>
      </tr>

      {open && (
        <tr className="bg-slate-50/70 dark:bg-slate-950/30">
          <td colSpan={7} className="border-b border-slate-100 px-5 py-4 dark:border-slate-800/70">
            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
              <Detail label="Received by">{`${intake.receivingOfficer} · ${intake.dateReceived} ${intake.timeReceived}`}</Detail>
              <Detail label="Officer mobile" mono>{intake.officerMobile}</Detail>
              <Detail label="Documents">{intake.documentsReceived.join(', ')}</Detail>
              <Detail label="Documents approved">
                {intake.approvedBy ? `${intake.approvedBy} · ${intake.approvedDate}` : intake.documentsConfirmedAt ? 'Confirmed, awaiting the Head' : 'Not yet confirmed'}
              </Detail>
              <Detail label="Packaging and seal">{`${intake.packaging} · ${intake.sealCondition}${intake.sealNumber ? ` (${intake.sealNumber})` : ''}`}</Detail>
              {intake.assignedBy && <Detail label="Assigned by">{`${intake.assignedBy} · ${intake.assignedDate}`}</Detail>}
              {intake.completedBy && <Detail label="Completed by">{`${intake.completedBy} · ${intake.completedDate}`}</Detail>}
              {intake.memoApprovedBy && <Detail label="Memo approved">{`${intake.memoApprovedBy} · ${intake.memoApprovedDate}`}</Detail>}
            </dl>
            <p className="mt-3 whitespace-pre-wrap text-[12px] text-slate-600 dark:text-slate-300">{intake.description}</p>

            {(canViewAllocation || canTransfer || canEdit || isHead || canOpenCase) && (
              <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-slate-200 pt-3 dark:border-slate-800">
                {canOpenCase && intake.status === 'Awaiting Assignment' && (
                  <Button size="xs" icon={FolderOpen} onClick={() => onOpenCaseFile(intake)}>Open case file</Button>
                )}
                {canViewAllocation && (
                  <Button size="xs" icon={ClipboardSignature} onClick={() => setViewingAllocation(true)}>
                    {isHead ? 'Allocation form' : 'Allocation form (copy)'}
                  </Button>
                )}
                {canTransfer && (
                  <Button size="xs" icon={ArrowRightLeft} onClick={() => setAllocating('transfer')}>Transfer</Button>
                )}
                {canEdit && (
                  <Button size="xs" icon={Pencil} onClick={() => onEdit(intake)}>Edit intake</Button>
                )}
                {isHead &&
                  (confirmingDelete ? (
                    <>
                      <span className="text-[11px] text-rose-600 dark:text-rose-400">Delete {intake.labReference}?</span>
                      <Button size="xs" variant="danger" icon={Trash2} onClick={() => onDelete(intake.id)}>Confirm delete</Button>
                      <Button size="xs" variant="ghost" onClick={() => setConfirmingDelete(false)}>Cancel</Button>
                    </>
                  ) : (
                    <Button size="xs" variant="ghost" icon={Trash2} onClick={() => setConfirmingDelete(true)}>Delete</Button>
                  ))}
              </div>
            )}
          </td>
        </tr>
      )}

      {allocating && (
        <WorkAllocationDialog
          department="Narcotics"
          labReference={intake.labReference}
          subject={allocationSubject(intake)}
          officers={officers}
          excludeOfficerId={allocating === 'transfer' ? intake.analysisOfficerId : undefined}
          headName={currentUser.name}
          isTransfer={allocating === 'transfer'}
          onSubmit={(analystId, remarks) => onAssign(intake.id, analystId, remarks)}
          onClose={() => setAllocating(null)}
        />
      )}
      {viewingAllocation && (
        <WorkAllocationViewer recordType="NARCOTICS_INTAKE" recordId={intake.id} onClose={() => setViewingAllocation(false)} />
      )}
    </>
  );
};
