import React, { useState } from 'react';
import { CheckCircle2, ClipboardList, ClipboardSignature, FolderOpen, Pencil, TestTube, Trash2 } from 'lucide-react';
import { FoodDrugIntake, FoodDrugIntakeStatus, User } from '../../types';
import { Button, EmptyState, Panel, StatusPill, Tone } from '../common/Dashboard';
import { WorkAllocationDialog, WorkAllocationViewer } from './WorkAllocationForm';
import { FoodDrugIntakeEdit, FoodDrugIntakeEditModal } from './FoodDrugIntakeEditModal';

/**
 * Food & Drugs sample register. Picks up where registration stops (Receiver):
 * the Head of Section approves the submitted documents, assigns an officer,
 * then the assigned officer (or the Head) records "Reported By" once analysis
 * is done.
 */

interface FoodDrugRegisterPanelProps {
  intakes: FoodDrugIntake[];
  currentUser: Pick<User, 'id' | 'name' | 'role'>;
  /** Food & Drugs officers the Head can assign a sample to. */
  officers: Pick<User, 'id' | 'name'>[];
  onApprove: (intakeId: string) => void;
  /** Assigns the sample with a completed work allocation form; resolves true when saved. */
  onAssign: (intakeId: string, analystId: string, remarks: string) => Promise<boolean>;
  onReport: (intakeId: string, reportedBy: string) => void;
  /** Opens the sample's case file (receipt form and reporting). */
  onOpenCaseFile?: (intake: FoodDrugIntake) => void;
  /** Saves the one allowed edit. */
  onEdit?: (intakeId: string, edit: FoodDrugIntakeEdit) => void;
  /** Head of Section only. */
  onDelete?: (intakeId: string) => void;
  /** Panel framing, so the same list can serve as the laboratory's Bench work. */
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  /** Rendered above the list, e.g. filter tabs. */
  toolbar?: React.ReactNode;
  emptyTitle?: string;
}

const STATUS_TONE: Record<FoodDrugIntakeStatus, Tone> = {
  'Awaiting Approval': 'rose',
  'Awaiting Assignment': 'amber',
  'Under Analysis': 'sky',
  Reported: 'emerald',
};

const fieldCls =
  'h-8 min-w-0 flex-1 rounded-lg border border-slate-300 bg-white px-2.5 text-xs text-slate-900 focus:border-amber-500 focus:outline-none dark:border-slate-700 dark:bg-slate-950 dark:text-white';

export const FoodDrugRegisterPanel: React.FC<FoodDrugRegisterPanelProps> = ({
  intakes,
  currentUser,
  officers,
  onApprove,
  onAssign,
  onReport,
  onOpenCaseFile,
  onEdit,
  onDelete,
  title = 'Food & Drugs samples',
  description,
  actions,
  toolbar,
  emptyTitle = 'No samples registered yet',
}) => (
  <Panel icon={ClipboardList} tone="amber" title={title} description={description} actions={actions} flush>
    {toolbar}
    {intakes.length === 0 ? (
      <EmptyState icon={TestTube} title={emptyTitle} />
    ) : (
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {intakes.map((intake) => (
          <RegisterRow
            key={intake.id}
            intake={intake}
            currentUser={currentUser}
            officers={officers}
            onApprove={onApprove}
            onAssign={onAssign}
            onReport={onReport}
            onOpenCaseFile={onOpenCaseFile}
            onEdit={onEdit}
            onDelete={onDelete}
          />
        ))}
      </ul>
    )}
  </Panel>
);

const RegisterRow: React.FC<Omit<FoodDrugRegisterPanelProps, 'intakes'> & { intake: FoodDrugIntake }> = ({
  intake,
  currentUser,
  officers,
  onApprove,
  onAssign,
  onReport,
  onOpenCaseFile,
  onEdit,
  onDelete,
}) => {
  const [allocating, setAllocating] = useState(false);
  const [viewingAllocation, setViewingAllocation] = useState(false);
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);
  const [reportedBy, setReportedBy] = useState(currentUser.name);

  const isHead = currentUser.role === 'HEAD_OF_DEPARTMENT';
  const canReport = isHead || (intake.analystId ? intake.analystId === currentUser.id : intake.analystAssigned === currentUser.name);
  const canEdit =
    !!onEdit && !intake.edited && (intake.status === 'Awaiting Approval' || intake.status === 'Awaiting Assignment');
  const canDelete = !!onDelete && isHead;
  // The Head holds the original allocation form; the assigned analyst holds a copy.
  const isAssignedToMe = !!intake.analystId && intake.analystId === currentUser.id;
  const canViewAllocation = !!intake.analystId && (isHead || isAssignedToMe);

  const detail =
    intake.status === 'Awaiting Approval'
      ? `Received by ${intake.receiver} · awaiting Head approval`
      : intake.status === 'Awaiting Assignment'
        ? `Received by ${intake.receiver}`
        : intake.status === 'Under Analysis'
          ? `Analyst: ${intake.analystAssigned}`
          : `Reported by ${intake.reportedBy}`;

  return (
    <li className="space-y-2 px-4 py-3 text-xs">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="min-w-0 truncate">
          <span className="font-mono font-semibold text-slate-900 dark:text-white">{intake.id}</span>
          <span className="text-slate-500 dark:text-slate-400">
            {' '}· {intake.clientName} · {intake.sampleType} · {detail}
          </span>
        </div>
        <StatusPill tone={STATUS_TONE[intake.status]}>{intake.status}</StatusPill>
      </div>

      {intake.status === 'Awaiting Approval' && (
        isHead ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-slate-400">Review the submitted documents before assigning an officer.</p>
            <Button size="sm" variant="primary" icon={CheckCircle2} onClick={() => onApprove(intake.id)}>
              Approve documents
            </Button>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400">
            Waiting for the Head of Section to approve the submitted documents.
          </p>
        )
      )}

      {intake.approvedBy && intake.status !== 'Awaiting Approval' && (
        <div className="flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Documents approved by {intake.approvedBy} · {intake.approvedDate}
        </div>
      )}

      {intake.status === 'Awaiting Assignment' && isHead && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">Fill in a work allocation form to assign this sample to an analyst.</p>
          <Button size="sm" variant="primary" icon={ClipboardSignature} onClick={() => setAllocating(true)}>
            Allocate work
          </Button>
        </div>
      )}

      {canViewAllocation && (
        <div className="flex justify-end">
          <Button size="xs" icon={ClipboardSignature} onClick={() => setViewingAllocation(true)}>
            {isHead ? 'Allocation form' : 'Allocation form (copy)'}
          </Button>
        </div>
      )}

      {allocating && (
        <WorkAllocationDialog
          department="Food & Drugs"
          labReference={intake.id}
          subject={`${intake.sampleType} sample · from ${intake.clientName}${intake.notes ? ` · ${intake.notes}` : ''}`}
          officers={officers}
          headName={currentUser.name}
          onSubmit={(analystId, remarks) => onAssign(intake.id, analystId, remarks)}
          onClose={() => setAllocating(false)}
        />
      )}
      {viewingAllocation && (
        <WorkAllocationViewer recordType="FOOD_DRUG_INTAKE" recordId={intake.id} onClose={() => setViewingAllocation(false)} />
      )}

      {(intake.status === 'Under Analysis' || intake.status === 'Reported') && canReport && onOpenCaseFile && (
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            {intake.status !== 'Under Analysis'
              ? 'The receipt form and laboratory worksheet are in the case file.'
              : !intake.receiptFormSaved
                ? 'Next: fill in the analytical sample receipt form in the case file.'
                : intake.worksheetStatus === 'Checked'
                  ? `Worksheet checked by the Head of Section.`
                  : intake.worksheetStatus === 'Awaiting check'
                    ? 'Worksheet submitted — waiting for the Head of Section to check it.'
                    : 'Next: fill in the laboratory worksheet in the case file.'}
          </p>
          <Button
            size="sm"
            variant={intake.status === 'Under Analysis' ? 'primary' : 'secondary'}
            icon={FolderOpen}
            onClick={() => onOpenCaseFile(intake)}
          >
            Case file
          </Button>
        </div>
      )}

      {(canEdit || canDelete || intake.edited) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-2 dark:border-slate-800">
          <span className="text-[11px] text-slate-400">
            {intake.edited ? `Edited once on ${intake.editedDate} — locked` : 'Can be edited once before analysis starts'}
          </span>
          <div className="flex items-center gap-2">
            {canEdit && (
              <Button size="xs" icon={Pencil} onClick={() => setEditing(true)}>
                Edit
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

      {editing && onEdit && (
        <FoodDrugIntakeEditModal intake={intake} onSave={onEdit} onClose={() => setEditing(false)} />
      )}
    </li>
  );
};
