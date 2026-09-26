import React, { useState } from 'react';
import { Droplets, FlaskConical, UserCheck } from 'lucide-react';
import { User, WaterIntake, WaterIntakeStatus } from '../../types';
import { formatKes } from '../../waterIntake';
import { Avatar, Button, EmptyState, Panel, SegmentedControl, StatusPill, Tone } from '../common/Dashboard';
import { Select } from '../common/Select';

/**
 * Water & Environment exhibit register. Picks up where intake stops: only the
 * Head of Water & Environment assigns the Analysis Officer, and every officer
 * in the department sees who each exhibit is assigned to.
 */

interface WaterRegisterPanelProps {
  intakes: WaterIntake[];
  currentUser: Pick<User, 'name' | 'role'>;
  /** Water & Environment officers the Head can assign an exhibit to. */
  officers: Pick<User, 'id' | 'name'>[];
  onAssign: (intakeId: string, officer: string) => void;
  onComplete: (intakeId: string) => void;
}

type Filter = 'mine' | 'all' | 'awaiting';

const STATUS_TONE: Record<WaterIntakeStatus, Tone> = {
  'Awaiting Assignment': 'amber',
  'Under Analysis': 'sky',
  'Analysis Complete': 'emerald',
};

export const WaterRegisterPanel: React.FC<WaterRegisterPanelProps> = ({
  intakes,
  currentUser,
  officers,
  onAssign,
  onComplete,
}) => {
  const isHead = currentUser.role === 'HEAD_OF_DEPARTMENT';
  const mine = intakes.filter((i) => i.analysisOfficer === currentUser.name);
  const awaiting = intakes.filter((i) => i.status === 'Awaiting Assignment');
  // Officers land on their own assignments; the Head lands on the full register.
  const [filter, setFilter] = useState<Filter>(!isHead && mine.length > 0 ? 'mine' : 'all');

  const rows = filter === 'mine' ? mine : filter === 'awaiting' ? awaiting : intakes;

  return (
    <Panel
      icon={Droplets}
      tone="sky"
      title="Water & Environment exhibits"
      description={
        isHead
          ? `${awaiting.length} awaiting assignment of an Analysis Officer`
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
              onAssign={onAssign}
              onComplete={onComplete}
            />
          ))}
        </ul>
      )}
    </Panel>
  );
};

const RegisterRow: React.FC<Omit<WaterRegisterPanelProps, 'intakes'> & { intake: WaterIntake }> = ({
  intake,
  currentUser,
  officers,
  onAssign,
  onComplete,
}) => {
  const [officer, setOfficer] = useState('');

  const isHead = currentUser.role === 'HEAD_OF_DEPARTMENT';
  const isMine = intake.analysisOfficer === currentUser.name;
  const test =
    intake.testType === 'Specific Chemical Analysis' && intake.specificParameters?.length
      ? `Specific — ${intake.specificParameters.join(', ')}`
      : intake.testType;
  const source = `${intake.sourceCategory} · ${intake.sourceType}, ${intake.locationFrom}${
    intake.dischargeTo ? ` → ${intake.dischargeTo}` : ''
  }`;

  return (
    <li className={`space-y-2.5 px-4 py-3 text-xs ${isMine ? 'bg-sky-500/5' : ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 space-y-0.5">
          <div className="font-mono font-semibold text-slate-900 dark:text-white">{intake.labReference}</div>
          <div className="text-slate-600 dark:text-slate-300">
            {intake.senderName} <span className="text-slate-400">({intake.senderType})</span> · {test}
          </div>
          <div className="text-slate-500 dark:text-slate-400">{source}</div>
          <div className="text-slate-400">
            Received {intake.dateReceived} by {intake.receivingOfficer} · {formatKes(intake.charges)}
          </div>
        </div>
        <StatusPill tone={STATUS_TONE[intake.status]}>{intake.status}</StatusPill>
      </div>

      {intake.analysisOfficer && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg bg-slate-50 px-2.5 py-2 dark:bg-slate-950/50">
          <Avatar name={intake.analysisOfficer} size="sm" tone={isMine ? 'sky' : 'slate'} />
          <div className="min-w-0 flex-1">
            <div className="text-[10px] uppercase tracking-wider text-slate-400">Analysis Officer</div>
            <div className="font-medium text-slate-900 dark:text-white">
              {intake.analysisOfficer}
              {isMine && <span className="ml-1.5 rounded bg-sky-500/15 px-1.5 py-0.5 text-[10px] font-semibold text-sky-700 dark:text-sky-300">You</span>}
            </div>
          </div>
          <div className="text-right text-[11px] text-slate-400">
            Assigned by {intake.assignedBy}
            <br />
            {intake.assignedDate}
          </div>
        </div>
      )}

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
              options={officers.map((o) => ({ value: o.name, label: o.name }))}
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
    </li>
  );
};
