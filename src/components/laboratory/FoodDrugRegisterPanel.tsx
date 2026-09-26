import React, { useState } from 'react';
import { ClipboardList, TestTube } from 'lucide-react';
import { FoodDrugIntake, FoodDrugIntakeStatus, User } from '../../types';
import { Button, EmptyState, Panel, StatusPill, Tone } from '../common/Dashboard';
import { Select } from '../common/Select';

/**
 * Food & Drugs sample register. Picks up where registration stops (Receiver):
 * the Head of Section assigns an officer, then the assigned officer (or the
 * Head) records "Reported By" once analysis is done.
 */

interface FoodDrugRegisterPanelProps {
  intakes: FoodDrugIntake[];
  currentUser: Pick<User, 'name' | 'role'>;
  /** Food & Drugs officers the Head can assign a sample to. */
  officers: Pick<User, 'id' | 'name'>[];
  onAssign: (intakeId: string, analyst: string) => void;
  onReport: (intakeId: string, reportedBy: string) => void;
}

const STATUS_TONE: Record<FoodDrugIntakeStatus, Tone> = {
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
  onAssign,
  onReport,
}) => (
  <Panel icon={ClipboardList} tone="amber" title="Food & Drugs samples" flush>
    {intakes.length === 0 ? (
      <EmptyState icon={TestTube} title="No samples registered yet" />
    ) : (
      <ul className="divide-y divide-slate-100 dark:divide-slate-800">
        {intakes.map((intake) => (
          <RegisterRow
            key={intake.id}
            intake={intake}
            currentUser={currentUser}
            officers={officers}
            onAssign={onAssign}
            onReport={onReport}
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
  onAssign,
  onReport,
}) => {
  const [analyst, setAnalyst] = useState('');
  const [reportedBy, setReportedBy] = useState(currentUser.name);

  const isHead = currentUser.role === 'HEAD_OF_DEPARTMENT';
  const canReport = isHead || intake.analystAssigned === currentUser.name;

  const detail =
    intake.status === 'Awaiting Assignment'
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

      {intake.status === 'Awaiting Assignment' && isHead && (
        <div className="flex gap-2">
          <Select
            size="xs"
            className="min-w-0 flex-1"
            aria-label={`Assign officer to ${intake.id}`}
            value={analyst}
            onChange={setAnalyst}
            placeholder="Assign officer…"
            options={officers.map((o) => ({ value: o.name, label: o.name }))}
          />
          <Button size="sm" variant="primary" disabled={!analyst} onClick={() => onAssign(intake.id, analyst)}>
            Assign
          </Button>
        </div>
      )}

      {intake.status === 'Under Analysis' && canReport && (
        <div className="flex gap-2">
          <input
            aria-label={`Reported by for ${intake.id}`}
            value={reportedBy}
            onChange={(e) => setReportedBy(e.target.value)}
            placeholder="Reported by"
            className={fieldCls}
          />
          <Button
            size="sm"
            variant="primary"
            disabled={!reportedBy.trim()}
            onClick={() => onReport(intake.id, reportedBy.trim())}
          >
            Mark reported
          </Button>
        </div>
      )}
    </li>
  );
};
