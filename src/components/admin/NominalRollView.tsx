import React, { useState } from 'react';
import { ChevronDown, ClipboardList, Inbox, Mail, Pencil, Search, Trash2, UserPlus, UserRoundX, UserCheck, X } from 'lucide-react';
import { LaboratoryDepartment, UserRole } from '../../types';
import { Button, SegmentedControl, StatusPill, Tone } from '../common/Dashboard';
import { departmentLabel } from '../../lib/departments';
import { roleLabel } from './roles';

export type RollEntry = {
  id: string;
  staffNumber: string;
  fullName: string;
  email: string;
  role: UserRole;
  department: LaboratoryDepartment;
  employmentStatus: 'SERVING' | 'LEFT';
  userId: string | null;
  accountStatus: 'ACTIVE' | 'PENDING_INVITE' | 'DISABLED' | null;
  createdAt: string;
};

export type AccessRequest = {
  id: string;
  staffNumber: string;
  fullName: string;
  email: string;
  department: LaboratoryDepartment;
  note: string | null;
  createdAt: string;
};

type RollFilter = 'all' | 'no-account' | 'LEFT';

const ACCOUNT: Record<NonNullable<RollEntry['accountStatus']>, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Active', tone: 'emerald' },
  PENDING_INVITE: { label: 'Invitation pending', tone: 'amber' },
  DISABLED: { label: 'Disabled', tone: 'rose' },
};

// Backfilled entries carry a placeholder until the real staff number is entered.
const isPlaceholder = (staffNumber: string) => staffNumber.startsWith('PENDING-');

/**
 * The nominal roll: every serving officer, with or without an account. It is
 * the only place a staff account can be issued from.
 */
export const NominalRollView: React.FC<{
  entries: RollEntry[];
  workingId: string | null;
  currentUserId: string;
  onIssue: (entry: RollEntry) => void;
  onEdit: (entry: RollEntry) => void;
  onSetStatus: (entry: RollEntry, status: RollEntry['employmentStatus']) => void;
  onRemove: (entry: RollEntry) => void;
  /** Pending requests from the sign-in page's Request access form. */
  requests: AccessRequest[];
  onAddRequest: (request: AccessRequest) => void;
  onDismissRequest: (request: AccessRequest) => void;
}> = ({ entries, workingId, currentUserId, onIssue, onEdit, onSetStatus, onRemove, requests, onAddRequest, onDismissRequest }) => {
  const [filter, setFilter] = useState<RollFilter>('all');
  const [requestsOpen, setRequestsOpen] = useState(true);
  const [query, setQuery] = useState('');

  const counts = {
    all: entries.length,
    'no-account': entries.filter((entry) => entry.employmentStatus === 'SERVING' && !entry.userId).length,
    LEFT: entries.filter((entry) => entry.employmentStatus === 'LEFT').length,
  };
  const shown = entries
    .filter((entry) => filter === 'all'
      || (filter === 'LEFT' ? entry.employmentStatus === 'LEFT' : entry.employmentStatus === 'SERVING' && !entry.userId))
    .filter((entry) =>
      `${entry.staffNumber} ${entry.fullName} ${entry.email} ${roleLabel(entry.role)} ${departmentLabel(entry.department)}`
        .toLowerCase().includes(query.toLowerCase()));

  return (
    <>
      {requests.length > 0 && (
        <div className="border-b border-amber-200 bg-amber-50/60 dark:border-amber-500/30 dark:bg-amber-500/5">
          <button
            type="button"
            aria-expanded={requestsOpen}
            onClick={() => setRequestsOpen((open) => !open)}
            className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-xs font-semibold text-amber-800 dark:text-amber-300"
          >
            <Inbox className="h-4 w-4" />
            Access requests
            <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] text-slate-950">{requests.length}</span>
            <span className="font-normal text-amber-700/80 dark:text-amber-300/70">Officers asking to be added to the roll</span>
            <ChevronDown className={`ml-auto h-4 w-4 transition-transform ${requestsOpen ? 'rotate-180' : ''}`} />
          </button>
          {requestsOpen && (
            <ul className="divide-y divide-amber-100 dark:divide-amber-500/20">
              {requests.map((request) => (
                <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 text-xs">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-white">
                      {request.fullName} <span className="ml-1 font-mono font-normal text-slate-500">{request.staffNumber}</span>
                    </div>
                    <div className="mt-0.5 text-slate-500">
                      {request.email} · {departmentLabel(request.department)} · {new Date(request.createdAt).toLocaleString()}
                    </div>
                    {request.note && <p className="mt-1 max-w-2xl text-slate-600 dark:text-slate-300">{request.note}</p>}
                  </div>
                  <div className="flex gap-1.5">
                    <Button size="xs" variant="primary" icon={UserPlus} disabled={workingId === request.id} onClick={() => onAddRequest(request)}>Add to roll</Button>
                    <Button size="xs" variant="ghost" icon={X} disabled={workingId === request.id} onClick={() => onDismissRequest(request)}>Dismiss</Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
        <SegmentedControl<RollFilter>
          ariaLabel="Filter the nominal roll"
          value={filter}
          onChange={setFilter}
          options={[
            { value: 'all', label: 'All', count: counts.all },
            { value: 'no-account', label: 'No account yet', count: counts['no-account'] },
            { value: 'LEFT', label: 'Left service', count: counts.LEFT },
          ]}
        />
        <label className="ml-auto flex h-8 items-center gap-2 rounded-lg border border-slate-200 px-2.5 dark:border-slate-700">
          <Search className="h-3.5 w-3.5 text-slate-400" />
          <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search staff no., name or email" aria-label="Search the nominal roll" className="w-52 bg-transparent text-xs outline-none dark:text-white" />
        </label>
      </div>
      {shown.length === 0 ? (
        <div className="px-6 py-12 text-center">
          <ClipboardList className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
          <h3 className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">No officers found</h3>
          <p className="mt-1 text-xs text-slate-500">
            {entries.length ? 'No entry matches these filters.' : 'Add officers to the roll before issuing their accounts.'}
          </p>
        </div>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full min-w-[820px] text-left text-xs">
            <thead className="bg-slate-50 text-slate-500 dark:bg-slate-950/50">
              <tr>
                <th className="px-4 py-3 font-semibold">Staff no.</th>
                <th className="px-4 py-3 font-semibold">Officer</th>
                <th className="px-4 py-3 font-semibold">Role / unit</th>
                <th className="px-4 py-3 font-semibold">Service</th>
                <th className="px-4 py-3 font-semibold">Account</th>
                <th className="px-4 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {shown.map((entry) => {
                const busy = workingId === entry.id;
                const serving = entry.employmentStatus === 'SERVING';
                return (
                  <tr key={entry.id} className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40">
                    <td className="px-4 py-3 font-mono text-slate-700 dark:text-slate-200">
                      {isPlaceholder(entry.staffNumber)
                        ? <span className="text-amber-700 dark:text-amber-400" title="Placeholder from the migration. Edit to enter the real staff number.">{entry.staffNumber}</span>
                        : entry.staffNumber}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-900 dark:text-white">
                        {entry.fullName}
                        {entry.userId === currentUserId && <span className="ml-1.5 text-[11px] font-normal text-slate-500">(you)</span>}
                      </div>
                      <div className="mt-0.5 text-slate-500">{entry.email}</div>
                    </td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                      <div>{roleLabel(entry.role)}</div>
                      <div className="mt-0.5 text-slate-500">{departmentLabel(entry.department)}</div>
                    </td>
                    <td className="px-4 py-3">
                      <StatusPill tone={serving ? 'teal' : 'slate'}>{serving ? 'Serving' : 'Left service'}</StatusPill>
                    </td>
                    <td className="px-4 py-3">
                      {entry.accountStatus
                        ? <StatusPill tone={ACCOUNT[entry.accountStatus].tone}>{ACCOUNT[entry.accountStatus].label}</StatusPill>
                        : <span className="text-slate-400">None</span>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-1.5">
                        {serving && !entry.userId && (
                          <Button size="xs" variant="primary" icon={Mail} disabled={busy} onClick={() => onIssue(entry)}>Issue account</Button>
                        )}
                        <Button size="xs" variant="ghost" icon={Pencil} disabled={busy} onClick={() => onEdit(entry)}>Edit</Button>
                        {serving ? (
                          entry.userId !== currentUserId && (
                            <Button size="xs" variant="danger" icon={UserRoundX} disabled={busy} onClick={() => onSetStatus(entry, 'LEFT')}>Mark left</Button>
                          )
                        ) : (
                          <Button size="xs" variant="success" icon={UserCheck} disabled={busy} onClick={() => onSetStatus(entry, 'SERVING')}>Reinstate</Button>
                        )}
                        {!entry.userId && (
                          <Button size="xs" variant="ghost" icon={Trash2} disabled={busy} aria-label={`Remove ${entry.fullName} from the roll`} onClick={() => onRemove(entry)} />
                        )}
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
};
