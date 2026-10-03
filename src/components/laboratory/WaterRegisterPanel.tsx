import React, { useState } from 'react';
import { CheckCircle2, Droplets, FlaskConical, Pencil, Trash2, UserCheck } from 'lucide-react';
import { User, WaterIntake, WaterIntakeStatus } from '../../types';
import { formatKes } from '../../waterIntake';
import { Avatar, Button, EmptyState, Panel, SegmentedControl, StatusPill, Tone } from '../common/Dashboard';
import { Select } from '../common/Select';
import { WaterIntakeEdit, WaterIntakeEditModal } from './WaterIntakeEditModal';

/**
 * Water & Environment exhibit register. Picks up where intake stops: only the
 * Head of Water & Environment approves the submitted documents and then assigns
 * the Analysis Officer, and every officer in the department sees who each
 * exhibit is assigned to.
 */

interface WaterRegisterPanelProps {
  intakes: WaterIntake[];
  currentUser: Pick<User, 'id' | 'name' | 'role'>;
  /** Water & Environment officers the Head can assign an exhibit to. */
  officers: Pick<User, 'id' | 'name'>[];
  onApprove: (intakeId: string) => void;
  onAssign: (intakeId: string, officerId: string) => void;
  onComplete: (intakeId: string) => void;
  /** Saves the one allowed edit; resolves true when it was applied. */
  onEdit?: (intakeId: string, edit: WaterIntakeEdit) => Promise<boolean>;
  /** Head of Department only. */
  onDelete?: (intakeId: string) => void;
}

type Filter = 'mine' | 'all' | 'awaiting' | 'approvals';

const STATUS_TONE: Record<WaterIntakeStatus, Tone> = {
  'Awaiting Approval': 'rose',
  'Awaiting Assignment': 'amber',
  'Under Analysis': 'sky',
  'Analysis Complete': 'emerald',
};

export const WaterRegisterPanel: React.FC<WaterRegisterPanelProps> = ({
  intakes,
  currentUser,
  officers,
  onApprove,
  onAssign,
  onComplete,
  onEdit,
  onDelete,
}) => {
  const isHead = currentUser.role === 'HEAD_OF_DEPARTMENT';
  const mine = intakes.filter((i) => i.analysisOfficerId === currentUser.id);
  const awaitingApproval = intakes.filter((i) => i.status === 'Awaiting Approval');
  const awaiting = intakes.filter((i) => i.status === 'Awaiting Assignment');
  // Officers land on their own assignments; the Head lands on the full register.
  const [filter, setFilter] = useState<Filter>(!isHead && mine.length > 0 ? 'mine' : 'all');

  const rows =
    filter === 'mine'
      ? mine
      : filter === 'awaiting'
        ? awaiting
        : filter === 'approvals'
          ? awaitingApproval
          : intakes;

  return (
    <Panel
      icon={Droplets}
      tone="sky"
      title="Water & Environment exhibits"
      description={
        isHead
          ? `${awaitingApproval.length} awaiting your approval · ${awaiting.length} awaiting assignment`
          : `${mine.length} assigned to you · ${intakes.length} in the department`
      }
      flush
    >
      <div className="border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
        <SegmentedControl
          ariaLabel="Register view"
          value={filter}
          onChange={setFilter}
          options={[
            ...(isHead ? [] : [{ value: 'mine' as const, label: 'Assigned to me', count: mine.length }]),
            { value: 'all', label: 'All exhibits', count: intakes.length },
            ...(isHead ? [{ value: 'approvals' as const, label: 'Awaiting approval', count: awaitingApproval.length }] : []),
            { value: 'awaiting', label: 'Awaiting assignment', count: awaiting.length },
          ]}
        />
      </div>

      {rows.length === 0 ? (
        <EmptyState
          icon={FlaskConical}
          title={
            filter === 'mine'
              ? 'No exhibits assigned to you yet'
              : filter === 'awaiting'
                ? 'Nothing awaiting assignment'
                : filter === 'approvals'
                  ? 'Nothing awaiting document approval'
                  : 'No exhibits registered yet'
          }
        />
      ) : (
        <ul className="divide-y divide-slate-100 dark:divide-slate-800">
          {rows.map((intake) => (
            <RegisterRow
              key={intake.id}
              intake={intake}
              currentUser={currentUser}
              officers={officers}
              onApprove={onApprove}
              onAssign={onAssign}
              onComplete={onComplete}
              onEdit={onEdit}
              onDelete={onDelete}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
};

const RegisterField: React.FC<{ label: string; children: React.ReactNode }> = ({ label, children }) => (
  <div className="min-w-0">
    <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-400">{label}</dt>
    <dd className="mt-0.5 break-words text-slate-700 dark:text-slate-200">{children}</dd>
  </div>
);

const RegisterRow: React.FC<Omit<WaterRegisterPanelProps, 'intakes'> & { intake: WaterIntake }> = ({
  intake,
  currentUser,
  officers,
  onApprove,
  onAssign,
  onComplete,
  onEdit,
  onDelete,
}) => {
  const [officer, setOfficer] = useState('');
  const [editing, setEditing] = useState(false);
  const [confirmingDelete, setConfirmingDelete] = useState(false);

  const isHead = currentUser.role === 'HEAD_OF_DEPARTMENT';
  const isMine = intake.analysisOfficerId === currentUser.id;
  const canEdit =
    !!onEdit && !intake.edited && (intake.status === 'Awaiting Approval' || intake.status === 'Awaiting Assignment');
  const canDelete = !!onDelete && isHead;
  const test =
    intake.testType === 'Specific Chemical Analysis' && intake.specificParameters?.length
      ? `Specific — ${intake.specificParameters.join(', ')}`
      : intake.testType;
  const source = `${intake.sourceCategory} · ${intake.sourceType}, ${intake.locationFrom}${
    intake.dischargeTo ? ` → ${intake.dischargeTo}` : ''
  }`;

  return (
    <li className={`space-y-3 px-5 py-4 text-xs ${isMine ? 'bg-sky-500/5' : ''}`}>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2.5">
          <span className="font-mono text-sm font-semibold text-slate-900 dark:text-white">{intake.labReference}</span>
          <span className="text-slate-400">{intake.dateReceived}</span>
        </div>
        <StatusPill tone={STATUS_TONE[intake.status]}>{intake.status}</StatusPill>
      </div>

      <dl className="grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 xl:grid-cols-4">
        <RegisterField label="Sender">
          {intake.senderName} <span className="text-slate-400">({intake.senderType})</span>
        </RegisterField>
        <RegisterField label="Test">{test}</RegisterField>
        <RegisterField label="Source">{source}</RegisterField>
        <RegisterField label="Received by">
          {intake.receivingOfficer} · <span className="font-mono">{formatKes(intake.charges)}</span>
        </RegisterField>
      </dl>

      {intake.analysisOfficer && (
        <div className="flex flex-wrap items-center gap-3 rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 dark:border-slate-800 dark:bg-slate-950/50">
          <Avatar name={intake.analysisOfficer} size="sm" tone={isMine ? 'sky' : 'slate'} />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Analysis Officer</div>
            <div className="font-medium text-slate-900 dark:text-white">
              {intake.analysisOfficer}
              {isMine && <span className="ml-1.5 rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">You</span>}
            </div>
          </div>
          <div className="text-[11px] text-slate-400 sm:text-right">
            Assigned by {intake.assignedBy} · {intake.assignedDate}
          </div>
        </div>
      )}

      {intake.approvedBy && intake.status !== 'Awaiting Approval' && (
        <div className="flex items-center gap-2 text-[11px] text-emerald-600 dark:text-emerald-400">
          <CheckCircle2 className="h-3.5 w-3.5" />
          Documents approved by {intake.approvedBy} · {intake.approvedDate}
        </div>
      )}

      {intake.status === 'Awaiting Approval' &&
        (isHead ? (
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-slate-400">Review the submitted documents before assigning an Analysis Officer.</p>
            <Button size="sm" variant="primary" icon={CheckCircle2} onClick={() => onApprove(intake.id)}>
              Approve documents
            </Button>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400">Waiting for the Head of Water & Environment to approve the submitted documents.</p>
        ))}

      {intake.status === 'Awaiting Assignment' &&
        (isHead ? (
          <div className="flex gap-2">
            <Select
              size="xs"
              className="min-w-0 flex-1"
              aria-label={`Assign Analysis Officer to ${intake.labReference}`}
              value={officer}
              onChange={setOfficer}
              placeholder="Assign Analysis Officer…"
              options={officers.map((o) => ({ value: o.id, label: o.name }))}
            />
            <Button size="sm" variant="primary" icon={UserCheck} disabled={!officer} onClick={() => onAssign(intake.id, officer)}>
              Assign
            </Button>
          </div>
        ) : (
          <p className="text-[11px] text-slate-400">Waiting for the Head of Water & Environment to assign an Analysis Officer.</p>
        ))}

      {intake.status === 'Under Analysis' && (isHead || isMine) && (
        <div className="flex justify-end">
          <Button size="sm" onClick={() => onComplete(intake.id)}>
            Mark analysis complete
          </Button>
        </div>
      )}

      {intake.status === 'Analysis Complete' && (
        <p className="text-[11px] text-slate-400">
          Completed {intake.completedDate} by {intake.completedBy}.
        </p>
      )}

      {(canEdit || canDelete || intake.edited) && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 dark:border-slate-800">
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
        <WaterIntakeEditModal intake={intake} officers={officers} onSave={onEdit} onClose={() => setEditing(false)} />
      )}
    </li>
  );
};
