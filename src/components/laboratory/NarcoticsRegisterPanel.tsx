import React, { useEffect, useMemo, useState } from 'react';
import { ArrowRightLeft, ClipboardSignature, FolderOpen, Pencil, Pill, Trash2, UserCheck, X } from 'lucide-react';
import { NarcoticsIntake, User } from '../../types';
import { NARCOTICS_STATUS_TONE, canEditNarcoticsIntake } from '../../narcoticsIntake';
import { WorkAllocationDialog, WorkAllocationViewer } from './WorkAllocationForm';
import { DetailRow, OutlineButton, OutlineSearch, OutlineToggle, PanelSection, StatusText } from './workspace/ui';

/**
 * The Narcotics exhibit register as a workspace: one row of status tabs, a toolbar
 * with search and the "All / Assigned to me" scope, a compact table, and the selected
 * exhibit's details in a panel beside it (full screen on phones). Only the Head of
 * Narcotics allocates work, transfers and deletes.
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
  /** Register tab to open on ('all', 'mine', 'awaiting', 'analysis', 'complete'). */
  initialRegisterView?: string;
  /** Told whenever the open tab changes. */
  onRegisterViewChange?: (view: string) => void;
}

type Stage = 'all' | 'awaiting' | 'analysis' | 'complete';
type Scope = 'department' | 'mine';

const STAGES: Stage[] = ['all', 'awaiting', 'analysis', 'complete'];
const stageOf = (view?: string): Stage => (STAGES.includes(view as Stage) ? (view as Stage) : 'all');

const STAGE_TABS: { id: Stage; label: string }[] = [
  { id: 'all', label: 'All exhibits' },
  { id: 'awaiting', label: 'Awaiting assignment' },
  { id: 'analysis', label: 'Under analysis' },
  { id: 'complete', label: 'Complete' },
];

const allocationSubject = (intake: NarcoticsIntake) =>
  `${intake.exhibitType} · ${intake.numberOfItems} item${intake.numberOfItems === 1 ? '' : 's'} (${intake.packaging}) · CR ${intake.crNumber} · from ${intake.policeStation}`;

const itemCount = (intake: NarcoticsIntake) => `${intake.numberOfItems} item${intake.numberOfItems === 1 ? '' : 's'}`;

const th = 'border-b border-slate-200 px-4 py-2.5 text-left text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:border-slate-800 dark:text-slate-400';
const td = 'border-b border-slate-200/70 px-4 py-3 align-top dark:border-slate-800/70';

/** What the signed-in officer may do with an exhibit. */
const permissions = (intake: NarcoticsIntake, currentUser: NarcoticsRegisterPanelProps['currentUser']) => {
  const isHead = currentUser.role === 'HEAD_OF_DEPARTMENT';
  const isMine = intake.analysisOfficerId === currentUser.id;
  return {
    isHead,
    isMine,
    canOpenCase: isMine || isHead || currentUser.role === 'SENIOR_CHEMIST',
    canAllocate: isHead && intake.status === 'Awaiting Assignment',
    canTransfer: isHead && intake.status === 'Under Analysis',
    canViewAllocation: !!intake.analysisOfficerId && (isHead || isMine),
    canEdit: canEditNarcoticsIntake(currentUser, intake),
    // The case file is the officer's next stop when the work is waiting on them.
    caseFileIsNext: (isMine && intake.status === 'Under Analysis') || (isHead && intake.status === 'Analysis Complete' && !intake.memoApprovedDate),
  };
};

export const NarcoticsRegisterPanel: React.FC<NarcoticsRegisterPanelProps> = ({
  intakes,
  isLoading = false,
  currentUser,
  officers,
  onAssign,
  onOpenCaseFile,
  onEdit,
  onDelete,
  initialRegisterView,
  onRegisterViewChange,
}) => {
  const [stage, setStage] = useState<Stage>(() => stageOf(initialRegisterView));
  const [scope, setScope] = useState<Scope>(initialRegisterView === 'mine' ? 'mine' : 'department');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [allocating, setAllocating] = useState<{ intake: NarcoticsIntake; transfer: boolean } | null>(null);
  const [viewingAllocation, setViewingAllocation] = useState<string | null>(null);

  // Heads of Department allocate rather than analyse, so they have no "Assigned to me".
  const showScope = currentUser.role !== 'HEAD_OF_DEPARTMENT';

  useEffect(() => {
    onRegisterViewChange?.(scope === 'mine' ? 'mine' : stage);
  }, [stage, scope, onRegisterViewChange]);

  const inScope = scope === 'mine' ? intakes.filter((i) => i.analysisOfficerId === currentUser.id) : intakes;
  const byStage: Record<Stage, NarcoticsIntake[]> = {
    all: inScope,
    awaiting: inScope.filter((i) => i.status === 'Awaiting Assignment'),
    analysis: inScope.filter((i) => i.status === 'Under Analysis'),
    complete: inScope.filter((i) => i.status === 'Analysis Complete'),
  };
  const mineCount = intakes.filter((i) => i.analysisOfficerId === currentUser.id).length;

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return byStage[stage];
    return byStage[stage].filter((i) =>
      [i.labReference, i.crNumber, i.officerName, i.badgeNumber, i.policeStation, i.exhibitType, i.description, i.analysisOfficer]
        .some((value) => value?.toLowerCase().includes(q)),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stage, scope, query, intakes, currentUser.id]);

  const selected = intakes.find((i) => i.id === selectedId) ?? null;

  // Esc closes the details panel (unless a dialog is open on top of it).
  useEffect(() => {
    if (!selected || allocating || viewingAllocation) return undefined;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setSelectedId(null);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [selected, allocating, viewingAllocation]);

  const filtersActive = stage !== 'all' || scope === 'mine' || query.trim() !== '';
  const clearFilters = () => {
    setStage('all');
    setScope('department');
    setQuery('');
  };

  const rowAction = (intake: NarcoticsIntake) => {
    const can = permissions(intake, currentUser);
    if (can.canAllocate) {
      return <OutlineButton size="xs" tone="accent" icon={UserCheck} onClick={() => setAllocating({ intake, transfer: false })}>Allocate</OutlineButton>;
    }
    if (can.canOpenCase && intake.status !== 'Awaiting Assignment') {
      return <OutlineButton size="xs" tone={can.caseFileIsNext ? 'accent' : 'default'} icon={FolderOpen} onClick={() => onOpenCaseFile(intake)}>Open case file</OutlineButton>;
    }
    return (
      <span className="text-[12px] text-slate-500 dark:text-slate-400">
        {intake.status === 'Awaiting Assignment' ? 'Waiting for the Head' : intake.status === 'Under Analysis' ? 'With the analyst' : 'Done'}
      </span>
    );
  };

  return (
    <section aria-label="Exhibit register" className="space-y-4">
      {/* The one status navigation for the register. */}
      <div role="tablist" aria-label="Exhibit status" className="flex gap-6 overflow-x-auto border-b border-slate-200 dark:border-slate-800">
        {STAGE_TABS.map((tab) => {
          const active = stage === tab.id;
          return (
            <button
              key={tab.id}
              role="tab"
              type="button"
              aria-selected={active}
              onClick={() => setStage(tab.id)}
              className={`-mb-px flex shrink-0 cursor-pointer items-center gap-2 border-b-2 pb-2.5 text-[13px] transition-colors ${
                active
                  ? 'border-teal-500 font-semibold text-slate-900 dark:text-white'
                  : 'border-transparent text-slate-500 hover:border-slate-300 hover:text-slate-900 dark:text-slate-400 dark:hover:border-slate-600 dark:hover:text-white'
              }`}
            >
              {tab.label}
              <span className="tabular-nums text-slate-400">{byStage[tab.id].length}</span>
            </button>
          );
        })}
      </div>

      <div className="flex flex-wrap items-center gap-2">
        <OutlineSearch value={query} onChange={setQuery} placeholder="Search K-number, CR, officer, station…" className="min-w-0 flex-1 sm:max-w-sm" />
        {showScope && (
          <OutlineToggle<Scope>
            label="Which exhibits"
            value={scope}
            onChange={setScope}
            options={[
              { value: 'department', label: 'All department exhibits' },
              { value: 'mine', label: <>Assigned to me <span className="tabular-nums text-slate-400">{mineCount}</span></> },
            ]}
          />
        )}
        {filtersActive && (
          <OutlineButton tone="ghost" size="sm" onClick={clearFilters} className="ml-auto">Clear filters</OutlineButton>
        )}
      </div>

      <div className={`grid gap-4 ${selected ? 'lg:grid-cols-[minmax(0,1fr)_24rem]' : ''}`}>
        <div className="min-w-0 overflow-hidden rounded-xl border border-slate-200 dark:border-slate-800">
          {rows.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-14 text-center">
              <Pill className="h-6 w-6 text-slate-300 dark:text-slate-600" />
              <p className="text-sm font-medium text-slate-700 dark:text-slate-200">
                {isLoading && intakes.length === 0 ? 'Loading Narcotics exhibits…' : filtersActive ? 'No exhibits match these filters' : 'No exhibits registered yet'}
              </p>
              {!filtersActive && !isLoading && <p className="text-[13px] text-slate-500 dark:text-slate-400">Exhibits you receive will appear here.</p>}
              {filtersActive && <OutlineButton size="sm" onClick={clearFilters}>Clear filters</OutlineButton>}
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[880px] border-separate border-spacing-0 text-[13px]">
                <caption className="sr-only">Narcotics exhibit register. Select a row to see its details.</caption>
                <thead>
                  <tr>
                    <th scope="col" className={th}>Exhibit</th>
                    <th scope="col" className={th}>Sample</th>
                    <th scope="col" className={th}>Submitting officer</th>
                    <th scope="col" className={th}>Assigned analyst</th>
                    <th scope="col" className={th}>Status</th>
                    <th scope="col" className={th}>Received</th>
                    <th scope="col" className={`${th} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((intake) => {
                    const isSelected = intake.id === selectedId;
                    const isMine = intake.analysisOfficerId === currentUser.id;
                    return (
                      <tr
                        key={intake.id}
                        aria-selected={isSelected}
                        onClick={() => setSelectedId(isSelected ? null : intake.id)}
                        className={`cursor-pointer transition-colors ${
                          isSelected
                            ? 'shadow-[inset_3px_0_0_0] shadow-teal-500 outline outline-1 -outline-offset-1 outline-teal-500/50'
                            : 'hover:bg-slate-500/[0.04]'
                        }`}
                      >
                        <td className={td}>
                          <button
                            type="button"
                            onClick={(event) => {
                              event.stopPropagation();
                              setSelectedId(isSelected ? null : intake.id);
                            }}
                            className="cursor-pointer text-left font-mono text-[13px] font-semibold text-slate-900 hover:underline focus:outline-none focus-visible:underline dark:text-white"
                            aria-label={`${isSelected ? 'Hide' : 'Show'} details for ${intake.labReference}`}
                          >
                            {intake.labReference}
                          </button>
                          <div className="mt-0.5 font-mono text-[12px] text-slate-500 dark:text-slate-400">CR {intake.crNumber}</div>
                        </td>
                        <td className={td}>
                          <div className="max-w-[220px] truncate text-slate-900 dark:text-slate-100" title={intake.description}>{intake.exhibitType}</div>
                          <div className="max-w-[220px] truncate text-[12px] text-slate-500 dark:text-slate-400">
                            {intake.substanceIdentified ? `Found: ${intake.substanceIdentified}` : `${itemCount(intake)} · ${intake.sealCondition}`}
                          </div>
                        </td>
                        <td className={td}>
                          <div className="max-w-[180px] truncate text-slate-900 dark:text-slate-100" title={intake.officerName}>{intake.officerName}</div>
                          <div className="max-w-[180px] truncate text-[12px] text-slate-500 dark:text-slate-400" title={intake.policeStation}>{intake.policeStation}</div>
                        </td>
                        <td className={td}>
                          {intake.analysisOfficer ? (
                            <div className="max-w-[170px] truncate text-slate-900 dark:text-slate-100" title={intake.analysisOfficer}>
                              {intake.analysisOfficer}
                              {isMine && <span className="ml-1.5 rounded border border-teal-500/50 px-1 text-[10px] font-semibold text-teal-700 dark:text-teal-300">You</span>}
                            </div>
                          ) : (
                            <span className="text-slate-500 dark:text-slate-400">Unassigned</span>
                          )}
                        </td>
                        <td className={td}>
                          <StatusText tone={NARCOTICS_STATUS_TONE[intake.status]}>{intake.status}</StatusText>
                          {intake.memoApprovedDate && <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Memo approved</div>}
                        </td>
                        <td className={`${td} whitespace-nowrap text-slate-600 dark:text-slate-300`}>{intake.dateReceived}</td>
                        <td className={`${td} text-right`} onClick={(event) => event.stopPropagation()}>
                          {rowAction(intake)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-200 px-4 py-2.5 text-[12px] text-slate-500 dark:border-slate-800 dark:text-slate-400">
            <span>Showing {rows.length} of {intakes.length} exhibits</span>
            <span className="hidden sm:inline">Select an exhibit to see its details.</span>
          </div>
        </div>

        {selected && (
          <ExhibitDetails
            intake={selected}
            currentUser={currentUser}
            onClose={() => setSelectedId(null)}
            onOpenCaseFile={onOpenCaseFile}
            onAllocate={(transfer) => setAllocating({ intake: selected, transfer })}
            onViewAllocation={() => setViewingAllocation(selected.id)}
            onEdit={onEdit}
            onDelete={(id) => {
              setSelectedId(null);
              onDelete(id);
            }}
          />
        )}
      </div>

      {allocating && (
        <WorkAllocationDialog
          department="Narcotics"
          labReference={allocating.intake.labReference}
          subject={allocationSubject(allocating.intake)}
          officers={officers}
          excludeOfficerId={allocating.transfer ? allocating.intake.analysisOfficerId : undefined}
          headName={currentUser.name}
          isTransfer={allocating.transfer}
          onSubmit={(analystId, remarks) => onAssign(allocating.intake.id, analystId, remarks)}
          onClose={() => setAllocating(null)}
        />
      )}
      {viewingAllocation && (
        <WorkAllocationViewer recordType="NARCOTICS_INTAKE" recordId={viewingAllocation} onClose={() => setViewingAllocation(null)} />
      )}
    </section>
  );
};

/** The selected exhibit beside the register; a full-screen view on phones. */
const ExhibitDetails: React.FC<{
  intake: NarcoticsIntake;
  currentUser: NarcoticsRegisterPanelProps['currentUser'];
  onClose: () => void;
  onOpenCaseFile: (intake: NarcoticsIntake) => void;
  onAllocate: (transfer: boolean) => void;
  onViewAllocation: () => void;
  onEdit: (intake: NarcoticsIntake) => void;
  onDelete: (intakeId: string) => void;
}> = ({ intake, currentUser, onClose, onOpenCaseFile, onAllocate, onViewAllocation, onEdit, onDelete }) => {
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const can = permissions(intake, currentUser);
  useEffect(() => setConfirmingDelete(false), [intake.id]);

  return (
    <aside
      aria-label={`Details for ${intake.labReference}`}
      className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-background lg:z-auto lg:max-h-[calc(100vh-9rem)] lg:rounded-xl lg:border lg:border-slate-200 lg:bg-transparent lg:dark:border-slate-800 lg:sticky lg:top-4"
    >
      <div className="flex items-start justify-between gap-3 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
        <div className="min-w-0">
          <h2 className="font-mono text-base font-semibold text-slate-900 dark:text-white">{intake.labReference}</h2>
          <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
            <StatusText tone={NARCOTICS_STATUS_TONE[intake.status]}>{intake.status}</StatusText>
            <span className="font-mono text-[12px] text-slate-500 dark:text-slate-400">CR {intake.crNumber}</span>
          </div>
        </div>
        <button
          type="button"
          aria-label="Close details"
          onClick={onClose}
          className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-transparent text-slate-400 hover:border-slate-300 hover:text-slate-700 dark:hover:border-slate-700 dark:hover:text-slate-200"
        >
          <X className="h-4 w-4" />
        </button>
      </div>

      {(can.canOpenCase || can.canAllocate) && (
        <div className="flex flex-wrap gap-2 border-b border-slate-200 px-5 py-3 dark:border-slate-800">
          {can.canAllocate && <OutlineButton tone="accent" icon={UserCheck} onClick={() => onAllocate(false)}>Allocate work</OutlineButton>}
          {can.canOpenCase && (
            <OutlineButton tone={can.canAllocate ? 'default' : 'accent'} icon={FolderOpen} onClick={() => onOpenCaseFile(intake)}>Open case file</OutlineButton>
          )}
        </div>
      )}

      <div className="flex-1">
        <PanelSection title="Sample">
          <dl>
            <DetailRow label="Exhibit">{intake.exhibitType}</DetailRow>
            <DetailRow label="Items">{`${itemCount(intake)} · ${intake.sealCondition}`}</DetailRow>
            <DetailRow label="Packaging">{`${intake.packaging}${intake.sealNumber ? ` · seal ${intake.sealNumber}` : ''}`}</DetailRow>
            {intake.substanceIdentified && <DetailRow label="Found">{intake.substanceIdentified}</DetailRow>}
          </dl>
          {intake.description && <p className="mt-2 whitespace-pre-wrap text-[13px] leading-relaxed text-slate-600 dark:text-slate-300">{intake.description}</p>}
        </PanelSection>

        <PanelSection title="Submitting officer">
          <dl>
            <DetailRow label="Name">{intake.officerName}</DetailRow>
            <DetailRow label="Badge" mono>{intake.badgeNumber}</DetailRow>
            <DetailRow label="Station">{intake.policeStation}</DetailRow>
            <DetailRow label="Mobile" mono>{intake.officerMobile}</DetailRow>
          </dl>
        </PanelSection>

        <PanelSection title="Assigned analyst">
          <dl>
            <DetailRow label="Analyst">{intake.analysisOfficer ? `${intake.analysisOfficer}${can.isMine ? ' (you)' : ''}` : 'Unassigned'}</DetailRow>
            {intake.assignedBy && <DetailRow label="Assigned by">{`${intake.assignedBy} · ${intake.assignedDate}`}</DetailRow>}
            {intake.completedBy && <DetailRow label="Completed by">{`${intake.completedBy} · ${intake.completedDate}`}</DetailRow>}
            {intake.memoApprovedBy && <DetailRow label="Memo approved">{`${intake.memoApprovedBy} · ${intake.memoApprovedDate}`}</DetailRow>}
          </dl>
        </PanelSection>

        <PanelSection title="Intake">
          <dl>
            <DetailRow label="Received by">{`${intake.receivingOfficer} · ${intake.dateReceived} ${intake.timeReceived}`}</DetailRow>
            <DetailRow label="Documents">{intake.documentsReceived.join(', ')}</DetailRow>
            <DetailRow label="Documents approved">
              {intake.approvedBy ? `${intake.approvedBy} · ${intake.approvedDate}` : intake.documentsConfirmedAt ? 'Confirmed, awaiting the Head' : 'Not yet confirmed'}
            </DetailRow>
            {intake.edited && <DetailRow label="Edited">Intake edited once (locked)</DetailRow>}
          </dl>
        </PanelSection>
      </div>

      {(can.canViewAllocation || can.canTransfer || can.canEdit || can.isHead) && (
        <div className="flex flex-wrap items-center gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
          {can.canViewAllocation && (
            <OutlineButton size="xs" icon={ClipboardSignature} onClick={onViewAllocation}>{can.isHead ? 'Allocation form' : 'Allocation form (copy)'}</OutlineButton>
          )}
          {can.canTransfer && <OutlineButton size="xs" icon={ArrowRightLeft} onClick={() => onAllocate(true)}>Transfer</OutlineButton>}
          {can.canEdit && <OutlineButton size="xs" icon={Pencil} onClick={() => onEdit(intake)}>Edit intake</OutlineButton>}
          {can.isHead &&
            (confirmingDelete ? (
              <span className="ml-auto flex items-center gap-2">
                <span className="text-[12px] text-rose-600 dark:text-rose-400">Delete {intake.labReference}?</span>
                <OutlineButton size="xs" tone="danger" icon={Trash2} onClick={() => onDelete(intake.id)}>Confirm</OutlineButton>
                <OutlineButton size="xs" tone="ghost" onClick={() => setConfirmingDelete(false)}>Cancel</OutlineButton>
              </span>
            ) : (
              <OutlineButton size="xs" tone="ghost" icon={Trash2} onClick={() => setConfirmingDelete(true)} className="ml-auto">Delete</OutlineButton>
            ))}
        </div>
      )}
    </aside>
  );
};
