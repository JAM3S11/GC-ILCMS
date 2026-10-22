import React, { useEffect, useState } from 'react';
import { Menu, MenuButton, MenuItem, MenuItems, MenuSeparator } from '@headlessui/react';
import {
  Check,
  Eye,
  PanelRight,
  KeyRound,
  Mail,
  MoreHorizontal,
  Pencil,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserRoundX,
  Users,
  X,
} from 'lucide-react';
import { LaboratoryDepartment, UserRole } from '../../types';
import { Avatar, Button, StatusPill, Tone } from '../common/Dashboard';
import { Select } from '../common/Select';
import {
  GENERAL_ADMINISTRATION,
  LABORATORY_DEPARTMENTS,
  departmentLabel,
} from '../../lib/departments';
import { roleLabel } from './roles';

/* ---------------------------------------------------------------------------
 * Members: everyone on the nominal roll, with their staff account (if any) in
 * the same row. The roll is the only place accounts are issued from, so this
 * one list replaces the separate roll and account registers.
 * --------------------------------------------------------------------------- */

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
  lastSignInAt?: string | null;
  signedIn?: boolean;
  /** The owner account: no other administrator can change, disable, delete or reset it. */
  accountProtected?: boolean;
  /** How the officer is named on reports they sign (Report of Government Analyst). */
  qualification?: string;
  reportTitle?: string;
  initials?: string;
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

export type DepartmentRequestRecord = {
  id: string;
  userId: string;
  fullName: string;
  email: string;
  role: UserRole;
  currentDepartment: LaboratoryDepartment;
  requestedDepartment: LaboratoryDepartment;
  reason?: string;
  createdAt: string;
};

/** A pending request to change an officer's name, title (role) or sign-in email. */
export type ProfileRequestRecord = {
  id: string;
  userId: string;
  department?: string;
  currentFullName: string;
  currentEmail: string;
  currentRole: UserRole;
  requestedFullName: string | null;
  requestedEmail: string | null;
  requestedRole: UserRole | null;
  reason?: string | null;
  createdAt: string;
};

/** One status per member, combining their service on the roll and their account. */
export type MemberStatus = 'ACTIVE' | 'INVITED' | 'NO_ACCOUNT' | 'DISABLED' | 'LEFT';

export const memberStatus = (entry: RollEntry): MemberStatus =>
  entry.employmentStatus === 'LEFT' ? 'LEFT'
    : !entry.userId ? 'NO_ACCOUNT'
      : entry.accountStatus === 'PENDING_INVITE' ? 'INVITED'
        : entry.accountStatus === 'DISABLED' ? 'DISABLED'
          : 'ACTIVE';

export const STATUS: Record<MemberStatus, { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Active', tone: 'emerald' },
  INVITED: { label: 'Invited', tone: 'amber' },
  NO_ACCOUNT: { label: 'No account', tone: 'slate' },
  DISABLED: { label: 'Disabled', tone: 'rose' },
  LEFT: { label: 'Left service', tone: 'slate' },
};

type StatusFilter = 'all' | MemberStatus;

// Backfilled entries carry a placeholder until the real staff number is entered.
export const isPlaceholder = (staffNumber: string) => staffNumber.startsWith('PENDING-');

export const formatDate = (value: string) =>
  new Intl.DateTimeFormat(undefined, { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

/** "Just now", "22m ago", "4h ago", "3d ago", then the date. */
export const timeAgo = (value: string) => {
  const minutes = Math.round((Date.now() - new Date(value).getTime()) / 60_000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.round(hours / 24);
  if (days < 30) return `${days}d ago`;
  return new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(new Date(value));
};

export const LastActive: React.FC<{ entry: RollEntry }> = ({ entry }) =>
  entry.signedIn ? (
    <span className="inline-flex items-center gap-1.5 text-slate-700 dark:text-slate-200">
      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" aria-hidden="true" /> Signed in
    </span>
  ) : entry.lastSignInAt ? (
    <span title={formatDate(entry.lastSignInAt)}>{timeAgo(entry.lastSignInAt)}</span>
  ) : (
    <span className="text-slate-400">—</span>
  );

/** Everything the super-admin can do to a member, wired up by the console. */
export interface MemberActions {
  /** Opens the member's profile; `order` is the list as shown, for previous / next. */
  onView: (entry: RollEntry, order?: string[]) => void;
  /** Opens the member's full profile page. */
  onOpenProfile: (entry: RollEntry) => void;
  onEdit: (entry: RollEntry) => void;
  onIssue: (entry: RollEntry) => void;
  onResendInvite: (entry: RollEntry) => void;
  onResetPassword: (entry: RollEntry) => void;
  onToggleAccount: (entry: RollEntry) => void;
  onSetService: (entry: RollEntry, status: RollEntry['employmentStatus']) => void;
  /** Deletes the staff account, or removes the roll entry when there is no account. */
  onDelete: (entry: RollEntry) => void;
}

/* ------------------------------- Row menu ------------------------------- */

const menuItemBase =
  'flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40';
const menuItemClass = `${menuItemBase} text-slate-700 data-[focus]:bg-slate-100 dark:text-slate-200 dark:data-[focus]:bg-slate-800`;
const dangerItemClass = `${menuItemBase} text-rose-600 data-[focus]:bg-rose-50 dark:text-rose-400 dark:data-[focus]:bg-rose-950/40`;

const MemberMenu: React.FC<{ entry: RollEntry; isSelf: boolean; busy: boolean; actions: MemberActions; order: string[] }> = ({ entry, isSelf, busy, actions, order }) => {
  const status = memberStatus(entry);
  const serving = entry.employmentStatus === 'SERVING';
  const protectedOther = !!entry.accountProtected && !isSelf;
  const locked = isSelf || protectedOther;
  return (
    <Menu>
      <MenuButton
        aria-label={`Actions for ${entry.fullName}`}
        disabled={busy}
        className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none data-[focus]:ring-2 data-[focus]:ring-amber-500/40 data-[open]:bg-slate-100 data-[open]:text-slate-900 disabled:opacity-40 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white dark:data-[open]:bg-slate-800 dark:data-[open]:text-white"
      >
        <MoreHorizontal className="h-4 w-4" />
      </MenuButton>
      <MenuItems
        anchor={{ to: 'bottom end', gap: 4 }}
        transition
        className="z-50 w-56 rounded-xl border border-slate-200 bg-white p-1 shadow-xl shadow-slate-900/10 transition duration-100 ease-out focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0 dark:border-slate-800 dark:bg-slate-900"
      >
        <MenuItem>
          <button type="button" className={menuItemClass} onClick={() => actions.onOpenProfile(entry)}>
            <Eye className="h-4 w-4 text-slate-400" /> View profile
          </button>
        </MenuItem>
        <MenuItem>
          <button type="button" className={menuItemClass} onClick={() => actions.onView(entry, order)}>
            <PanelRight className="h-4 w-4 text-slate-400" /> Quick view
          </button>
        </MenuItem>
        <MenuItem>
          <button type="button" className={menuItemClass} onClick={() => actions.onEdit(entry)}>
            <Pencil className="h-4 w-4 text-slate-400" /> Edit roll details
          </button>
        </MenuItem>
        {status === 'NO_ACCOUNT' && (
          <MenuItem>
            <button type="button" className={menuItemClass} onClick={() => actions.onIssue(entry)}>
              <Mail className="h-4 w-4 text-slate-400" /> Issue account
            </button>
          </MenuItem>
        )}
        {status === 'INVITED' && (
          <MenuItem>
            <button type="button" className={menuItemClass} onClick={() => actions.onResendInvite(entry)}>
              <RefreshCw className="h-4 w-4 text-slate-400" /> Resend invitation
            </button>
          </MenuItem>
        )}
        {status === 'ACTIVE' && !protectedOther && (
          <MenuItem>
            <button type="button" className={menuItemClass} onClick={() => actions.onResetPassword(entry)}>
              <KeyRound className="h-4 w-4 text-slate-400" /> Send password reset
            </button>
          </MenuItem>
        )}
        {!locked && entry.userId && (status === 'ACTIVE' || status === 'DISABLED') && (
          <MenuItem>
            <button type="button" className={menuItemClass} onClick={() => actions.onToggleAccount(entry)}>
              {status === 'DISABLED'
                ? <><UserCheck className="h-4 w-4 text-slate-400" /> Enable account</>
                : <><UserRoundX className="h-4 w-4 text-slate-400" /> Disable account</>}
            </button>
          </MenuItem>
        )}
        {!locked && (
          <MenuItem>
            <button type="button" className={menuItemClass} onClick={() => actions.onSetService(entry, serving ? 'LEFT' : 'SERVING')}>
              {serving
                ? <><UserRoundX className="h-4 w-4 text-slate-400" /> Mark as left service</>
                : <><UserCheck className="h-4 w-4 text-slate-400" /> Reinstate</>}
            </button>
          </MenuItem>
        )}
        {!locked && (
          <>
            <MenuSeparator className="my-1 h-px bg-slate-100 dark:bg-slate-800" />
            <MenuItem>
              <button
                type="button"
                className={dangerItemClass}
                onClick={() => actions.onDelete(entry)}
              >
                <Trash2 className="h-4 w-4" /> {entry.userId ? 'Delete user' : 'Remove from roll'}
              </button>
            </MenuItem>
          </>
        )}
      </MenuItems>
    </Menu>
  );
};

/* -------------------------------- Table -------------------------------- */

export const MembersTable: React.FC<{
  entries: RollEntry[];
  currentUserId: string;
  workingId: string | null;
  /** The member whose account was just issued: pinned to the top and highlighted. */
  highlightId?: string | null;
  highlightRef?: React.Ref<HTMLTableRowElement>;
  actions: MemberActions;
}> = ({ entries, currentUserId, workingId, highlightId, highlightRef, actions }) => {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [departmentFilter, setDepartmentFilter] = useState<'all' | LaboratoryDepartment>('all');
  const [query, setQuery] = useState('');

  // Show the new member even when a filter would hide them.
  useEffect(() => {
    if (!highlightId) return;
    setStatusFilter('all');
    setDepartmentFilter('all');
    setQuery('');
  }, [highlightId]);

  const counts = entries.reduce<Record<StatusFilter, number>>(
    (total, entry) => ({ ...total, all: total.all + 1, [memberStatus(entry)]: total[memberStatus(entry)] + 1 }),
    { all: 0, ACTIVE: 0, INVITED: 0, NO_ACCOUNT: 0, DISABLED: 0, LEFT: 0 },
  );
  const filters: { value: StatusFilter; label: string }[] = [
    { value: 'all', label: 'All' },
    { value: 'ACTIVE', label: 'Active' },
    { value: 'INVITED', label: 'Invited' },
    { value: 'NO_ACCOUNT', label: 'No account' },
    { value: 'DISABLED', label: 'Disabled' },
    { value: 'LEFT', label: 'Left service' },
  ];

  const shown = entries
    .filter((entry) => statusFilter === 'all' || memberStatus(entry) === statusFilter)
    .filter((entry) => departmentFilter === 'all' || entry.department === departmentFilter)
    .filter((entry) =>
      `${entry.staffNumber} ${entry.fullName} ${entry.email} ${roleLabel(entry.role)} ${departmentLabel(entry.department)}`
        .toLowerCase().includes(query.trim().toLowerCase()))
    .sort((a, b) => Number(b.id === highlightId) - Number(a.id === highlightId));
  const order = shown.map((entry) => entry.id);
  const filtersActive = statusFilter !== 'all' || departmentFilter !== 'all' || query !== '';

  return (
    <>
      <div className="flex flex-wrap items-center gap-3 px-4 py-3">
        <label className="flex h-9 min-w-0 flex-1 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 sm:max-w-xs dark:border-slate-700 dark:bg-slate-950">
          <Search className="h-4 w-4 shrink-0 text-slate-400" />
          <input
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by name, email or staff no."
            aria-label="Search members"
            className="w-full min-w-0 bg-transparent text-[13px] text-slate-900 outline-none placeholder:text-slate-400 dark:text-white"
          />
        </label>
        <div role="radiogroup" aria-label="Filter by status" className="no-scrollbar flex gap-1 overflow-x-auto">
          {filters.map((filter) => {
            const active = statusFilter === filter.value;
            return (
              <button
                key={filter.value}
                type="button"
                role="radio"
                aria-checked={active}
                onClick={() => setStatusFilter(filter.value)}
                className={`inline-flex h-8 shrink-0 cursor-pointer items-center gap-1.5 rounded-full px-3 text-xs font-medium transition-colors ${
                  active
                    ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900'
                    : 'text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white'
                }`}
              >
                {filter.label}
                <span className={`tabular-nums ${active ? 'opacity-70' : 'text-slate-400'}`}>{counts[filter.value]}</span>
              </button>
            );
          })}
        </div>
        <Select<'all' | LaboratoryDepartment>
          size="xs"
          className="w-48 sm:ml-auto"
          aria-label="Filter by department"
          value={departmentFilter}
          onChange={setDepartmentFilter}
          options={[
            { value: 'all', label: 'All departments' },
            ...[...LABORATORY_DEPARTMENTS, GENERAL_ADMINISTRATION].map((item) => ({ value: item, label: departmentLabel(item) })),
          ]}
        />
      </div>

      {shown.length === 0 ? (
        <div className="border-t border-slate-200 px-6 py-12 text-center dark:border-slate-800">
          <Users className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
          <h3 className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">No members found</h3>
          <p className="mt-1 text-xs text-slate-500">
            {entries.length ? 'No one matches these filters.' : 'Add officers to the nominal roll to get started.'}
          </p>
          {filtersActive && (
            <Button
              size="sm"
              variant="ghost"
              className="mt-3"
              onClick={() => { setStatusFilter('all'); setDepartmentFilter('all'); setQuery(''); }}
            >
              Clear filters
            </Button>
          )}
        </div>
      ) : (
        <div className="overflow-x-auto border-t border-slate-200 dark:border-slate-800">
          <table className="gc-list w-full min-w-[860px] text-left text-[13px]">
            <thead className="text-xs text-slate-500 dark:text-slate-400">
              <tr className="border-b border-slate-200 dark:border-slate-800">
                <th className="px-4 py-2.5 font-medium">Member</th>
                <th className="px-4 py-2.5 font-medium">Role</th>
                <th className="px-4 py-2.5 font-medium">Department</th>
                <th className="px-4 py-2.5 font-medium">Staff no.</th>
                <th className="px-4 py-2.5 font-medium">Last active</th>
                <th className="px-4 py-2.5 font-medium">Status</th>
                <th className="w-12 px-2 py-2.5"><span className="sr-only">Actions</span></th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
              {shown.map((entry) => {
                const isSelf = entry.userId === currentUserId;
                const highlighted = entry.id === highlightId;
                const status = memberStatus(entry);
                return (
                  <tr
                    key={entry.id}
                    ref={highlighted ? highlightRef : undefined}
                    aria-current={highlighted ? 'true' : undefined}
                    className={highlighted
                      ? 'bg-amber-50/80 shadow-[inset_3px_0_0_var(--color-amber-500)] dark:bg-amber-500/10'
                      : 'transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40'}
                  >
                    <td className="px-4 py-3">
                      <button type="button" onClick={() => actions.onView(entry, order)} className="group flex cursor-pointer items-center gap-3 text-left">
                        <Avatar name={entry.fullName} size="sm" tone={status === 'DISABLED' ? 'rose' : status === 'INVITED' ? 'amber' : 'slate'} />
                        <span className="min-w-0">
                          <span className="block font-semibold text-slate-900 group-hover:underline dark:text-white">
                            {entry.fullName}
                            {isSelf && <span className="ml-1.5 text-xs font-normal text-slate-500">(you)</span>}
                            {highlighted && <span className="ml-1.5 rounded bg-amber-500 px-1.5 py-px align-middle text-[10px] font-bold uppercase tracking-wide text-slate-950">New</span>}
                          </span>
                          <span className="block text-xs text-slate-500">{entry.email}</span>
                        </span>
                      </button>
                    </td>
                    <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{roleLabel(entry.role)}</td>
                    <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{departmentLabel(entry.department)}</td>
                    <td className="px-4 py-3 font-mono text-xs text-slate-600 dark:text-slate-300">
                      {isPlaceholder(entry.staffNumber)
                        ? <span className="text-amber-700 dark:text-amber-400" title="Placeholder from the migration. Edit to enter the real staff number.">{entry.staffNumber}</span>
                        : entry.staffNumber}
                    </td>
                    <td className="px-4 py-3 text-slate-500 dark:text-slate-400"><LastActive entry={entry} /></td>
                    <td className="px-4 py-3"><StatusPill tone={STATUS[status].tone}>{STATUS[status].label}</StatusPill></td>
                    <td className="px-2 py-3 text-right">
                      <MemberMenu entry={entry} isSelf={isSelf} busy={workingId === entry.id} actions={actions} order={order} />
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
