import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Inbox,
  Mail,
  RefreshCw,
  UserPlus,
  X,
} from 'lucide-react';
import { LaboratoryDepartment, UserRole } from '../../types';
import { apiRequest } from '../../lib/api';
import { AuditLogView } from './AuditLogView';
import { Button } from '../common/Dashboard';
import { CreateUserDrawer, NewAccount } from './CreateUserDrawer';
import {
  AccessRequest,
  DepartmentRequestRecord,
  MemberActions,
  MembersTable,
  ProfileRequestRecord,
  RollEntry,
} from './MembersView';
import { MemberDrawer } from './MemberDrawer';
import { MemberProfilePage } from './MemberProfilePage';
import { roleLabel } from './roles';
import { departmentLabel } from '../../lib/departments';

type AuditRecord = {
  id: string;
  actorEmail: string;
  action: string;
  recordType: string;
  recordId?: string;
  details: Record<string, unknown>;
  createdAt: string;
};

/** Members (with the request queues as a second tab) and the audit log. */
export type Tab = 'members' | 'requests' | 'audit';

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value));

/** The account just created from this console, pinned and highlighted in the list. */
type CreatedAccount = NewAccount & {
  id?: string;
  emailSent: boolean;
  message: string;
  inviteExpiresAt?: string;
};

const formatTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(new Date(value));

export const SuperAdminPage: React.FC<{
  currentUserId: string;
  initialTab?: Tab;
  /** When set, the console shows this member's full profile page (/app/members/<id>). */
  profileId?: string | null;
  onOpenProfile?: (memberId: string) => void;
  onCloseProfile?: () => void;
  /** The profile page's member name, for the top bar. */
  onProfileName?: (name: string) => void;
  /** Opens another workspace view (e.g. Settings for your own profile). */
  onNavigate?: (view: string) => void;
}> = ({ currentUserId, initialTab = 'members', profileId = null, onOpenProfile, onCloseProfile, onProfileName, onNavigate }) => {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [roll, setRoll] = useState<RollEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<RollEntry | null>(null);
  const [accessRequests, setAccessRequests] = useState<AccessRequest[]>([]);
  const [fromRequest, setFromRequest] = useState<AccessRequest | null>(null);
  const [departmentRequests, setDepartmentRequests] = useState<DepartmentRequestRecord[]>([]);
  const [profileRequests, setProfileRequests] = useState<ProfileRequestRecord[]>([]);
  const [events, setEvents] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const [justCreated, setJustCreated] = useState<CreatedAccount | null>(null);
  const [viewingId, setViewingId] = useState<string | null>(null);
  // The Members list as it was shown when a profile was opened, for previous / next in the drawer.
  const [viewingOrder, setViewingOrder] = useState<string[]>([]);
  const createdRowRef = useRef<HTMLTableRowElement | null>(null);
  // Bumped after every action so an open profile page reloads what changed.
  const [reloadKey, setReloadKey] = useState(0);

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
      setError('');
    }
    try {
      const [rollData, accessRequestData, departmentRequestData, profileRequestData, auditData] = await Promise.all([
        apiRequest<{ entries: RollEntry[] }>('/api/admin/nominal-roll'),
        apiRequest<{ requests: AccessRequest[] }>('/api/admin/access-requests'),
        apiRequest<{ requests: DepartmentRequestRecord[] }>('/api/admin/department-change-requests'),
        apiRequest<{ requests: ProfileRequestRecord[] }>('/api/admin/profile-change-requests'),
        apiRequest<{ events: AuditRecord[] }>('/api/admin/audit'),
      ]);
      setRoll(rollData.entries);
      setAccessRequests(accessRequestData.requests);
      setDepartmentRequests(departmentRequestData.requests);
      setProfileRequests(profileRequestData.requests);
      setEvents(auditData.events);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load account administration.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => { setTab(initialTab); }, [initialTab]);
  useEffect(() => { void loadData(); }, [loadData]);
  useEffect(() => {
    const intervalId = window.setInterval(() => {
      void loadData(false);
    }, 15_000);
    return () => window.clearInterval(intervalId);
  }, [loadData]);

  const runAction = async (key: string, action: () => Promise<{ message: string; emailSent?: boolean }>) => {
    setWorkingId(key);
    setError('');
    setNotice('');
    try {
      const result = await action();
      await loadData(false);
      setReloadKey((value) => value + 1);
      if (result.emailSent === false) setError(result.message);
      else setNotice(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The action failed.');
    } finally {
      setWorkingId(null);
    }
  };

  const decideDepartmentRequest = (id: string, decision: 'approve' | 'reject') => runAction(id, () =>
    apiRequest(`/api/admin/department-change-requests/${id}/${decision}`, { method: 'POST', body: '{}' }));
  const decideProfileRequest = (id: string, decision: 'approve' | 'reject') => runAction(id, () =>
    apiRequest(`/api/admin/profile-change-requests/${id}/${decision}`, { method: 'POST', body: '{}' }));

  const openCreate = () => {
    setCreateError('');
    setEditingEntry(null);
    setFromRequest(null);
    setCreateOpen(true);
  };
  const addFromRequest = (request: AccessRequest) => {
    setCreateError('');
    setEditingEntry(null);
    setFromRequest(request);
    setCreateOpen(true);
  };
  const dismissRequest = (request: AccessRequest) => {
    if (!window.confirm(`Dismiss the access request from ${request.fullName}?`)) return;
    return runAction(request.id, () =>
      apiRequest(`/api/admin/access-requests/${request.id}/dismiss`, { method: 'POST', body: '{}' }));
  };

  type IssueResult = { message: string; emailSent: boolean; userId?: string; inviteExpiresAt?: string };

  // Issues the account for a roll entry, then shows the member pinned at the top of the list.
  const issueAccount = async (entryId: string, account: NewAccount) => {
    const result = await apiRequest<IssueResult>(`/api/admin/nominal-roll/${entryId}/account`, { method: 'POST', body: '{}' });
    setTab('members');
    setJustCreated({ ...account, id: entryId, emailSent: result.emailSent, message: result.message, inviteExpiresAt: result.inviteExpiresAt });
    await loadData(false);
  };

  const saveRollEntry = async (account: NewAccount) => {
    setWorkingId('create');
    setCreateError('');
    setError('');
    setNotice('');
    const { issueAccount: issueNow, ...entry } = account;
    try {
      if (editingEntry) {
        const result = await apiRequest<{ message: string }>(`/api/admin/nominal-roll/${editingEntry.id}`, {
          method: 'PATCH',
          body: JSON.stringify(entry),
        });
        setCreateOpen(false);
        setNotice(result.message);
        await loadData(false);
        return;
      }
      const added = await apiRequest<{ id: string; message: string }>('/api/admin/nominal-roll', {
        method: 'POST',
        body: JSON.stringify({ ...entry, accessRequestId: fromRequest?.id }),
      });
      setFromRequest(null);
      setCreateOpen(false);
      if (!issueNow) {
        setTab('members');
        setNotice(added.message);
        await loadData(false);
        return;
      }
      try {
        await issueAccount(added.id, account);
      } catch (cause) {
        // The roll entry stands; the account can be issued from the member's menu once the problem is fixed.
        setTab('members');
        setError(`${added.message} The account was not issued: ${cause instanceof Error ? cause.message : 'unknown error'}`);
        await loadData(false);
      }
    } catch (cause) {
      setCreateError(cause instanceof Error ? cause.message : 'The roll entry could not be saved.');
    } finally {
      setWorkingId(null);
    }
  };

  // Actions on one member (a nominal roll entry, with its account if it has one).
  const memberActions: MemberActions = {
    onOpenProfile: (entry) => {
      setViewingId(null);
      onOpenProfile?.(entry.id);
    },
    onView: (entry, order) => {
      setViewingOrder(order ?? roll.map((item) => item.id));
      setViewingId(entry.id);
    },
    onEdit: (entry) => {
      setViewingId(null);
      setCreateError('');
      setFromRequest(null);
      setEditingEntry(entry);
      setCreateOpen(true);
    },
    onIssue: (entry) => {
      setWorkingId(entry.id);
      setError('');
      setNotice('');
      issueAccount(entry.id, { ...entry, issueAccount: true })
        .catch((cause) => setError(cause instanceof Error ? cause.message : 'The account could not be issued.'))
        .finally(() => setWorkingId(null));
    },
    onResendInvite: (entry) => {
      if (!entry.userId) return;
      void runAction(entry.id, () => apiRequest(`/api/admin/users/${entry.userId}/resend-invite`, { method: 'POST', body: '{}' }));
    },
    // Mails the officer a one-time link to choose their own password. The admin never sets or sees it.
    onResetPassword: (entry) => {
      if (!entry.userId) return;
      if (!window.confirm(`Email ${entry.email} a password reset link? Their current password stops working once they choose a new one.`)) return;
      void runAction(entry.id, () => apiRequest(`/api/admin/users/${entry.userId}/reset-password`, { method: 'POST', body: '{}' }));
    },
    onToggleAccount: (entry) => {
      if (!entry.userId) return;
      const status = entry.accountStatus === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
      if (status === 'DISABLED' && !window.confirm(`Disable ${entry.fullName}'s account? They are signed out and cannot sign in until it is enabled again.`)) return;
      void runAction(entry.id, () => apiRequest(`/api/admin/users/${entry.userId}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }));
    },
    onSetService: (entry, employmentStatus) => {
      if (employmentStatus === 'LEFT' && !window.confirm(
        `Mark ${entry.fullName} as having left?${entry.userId ? ' Their account is disabled and signed out immediately.' : ''}`,
      )) return;
      void runAction(entry.id, () =>
        apiRequest(`/api/admin/nominal-roll/${entry.id}/status`, { method: 'PATCH', body: JSON.stringify({ employmentStatus }) }));
    },
    onDelete: (entry) => {
      if (entry.userId) {
        if (!window.confirm(`Permanently delete ${entry.fullName}'s account (${entry.email})? This cannot be undone. They stay on the nominal roll without an account.`)) return;
        void runAction(entry.id, () => apiRequest(`/api/admin/users/${entry.userId}`, { method: 'DELETE' }));
        return;
      }
      if (!window.confirm(`Remove ${entry.fullName} (${entry.staffNumber}) from the nominal roll?`)) return;
      setViewingId(null);
      if (profileId === entry.id) onCloseProfile?.();
      void runAction(entry.id, () => apiRequest(`/api/admin/nominal-roll/${entry.id}`, { method: 'DELETE' }));
    },
  };

  const saveRole = (entry: RollEntry, role: UserRole, department: LaboratoryDepartment) =>
    runAction(entry.id, () =>
      apiRequest(`/api/admin/users/${entry.userId}/role`, { method: 'PATCH', body: JSON.stringify({ role, department }) }));

  const viewing = roll.find((entry) => entry.id === viewingId) ?? null;
  const viewingIndex = viewing ? viewingOrder.indexOf(viewing.id) : -1;
  const previousId = viewingIndex > 0 ? viewingOrder[viewingIndex - 1] : undefined;
  const nextId = viewingIndex >= 0 && viewingIndex < viewingOrder.length - 1 ? viewingOrder[viewingIndex + 1] : undefined;
  const createdEntry = justCreated ? roll.find((entry) => entry.id === justCreated.id) : undefined;

  // Bring the new member into view once the list has reloaded.
  useEffect(() => {
    if (createdEntry) createdRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [createdEntry?.id]);

  const editingRollDraft = useMemo(() => editingEntry && {
    staffNumber: editingEntry.staffNumber,
    fullName: editingEntry.fullName,
    email: editingEntry.email,
    role: editingEntry.role,
    department: editingEntry.department,
    hasAccount: !!editingEntry.userId,
  }, [editingEntry]);
  const requestPrefill = useMemo(() => fromRequest && {
    staffNumber: fromRequest.staffNumber,
    fullName: fromRequest.fullName,
    email: fromRequest.email,
    department: fromRequest.department,
  }, [fromRequest]);
  const departmentsWithHead = roll
    .filter((entry) => entry.role === 'HEAD_OF_DEPARTMENT' && entry.userId && entry.accountStatus !== 'DISABLED')
    .map((entry) => entry.department);

  const serving = roll.filter((entry) => entry.employmentStatus === 'SERVING').length;
  const invited = roll.filter((entry) => entry.employmentStatus === 'SERVING' && entry.accountStatus === 'PENDING_INVITE').length;
  const requestCount = accessRequests.length + departmentRequests.length + profileRequests.length;

  const sectionTabs: { id: Exclude<Tab, 'audit'>; label: string; count?: number }[] = [
    { id: 'members', label: 'Members' },
    { id: 'requests', label: 'Requests', count: requestCount },
  ];

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 pb-8">
      {profileId ? null : tab === 'audit' ? (
        <header>
          <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Audit log</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Every administrative action, newest first.</p>
        </header>
      ) : (
        <header className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Members</h1>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              {serving} {serving === 1 ? 'person' : 'people'} in GC-ILCMS
              {invited > 0 && <> · {invited} invitation{invited === 1 ? '' : 's'} pending</>}
              {requestCount > 0 && <> · {requestCount} request{requestCount === 1 ? '' : 's'} to review</>}
            </p>
          </div>
          <div className="flex gap-2">
            <Button icon={RefreshCw} onClick={() => void loadData()} disabled={loading}>Refresh</Button>
            <Button variant="primary" icon={UserPlus} onClick={openCreate}>Add officer</Button>
          </div>
        </header>
      )}

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">{notice}</div>}

      <CreateUserDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={saveRollEntry}
        working={workingId === 'create'}
        error={createError}
        existingEmails={[...new Set(roll.map((item) => item.email.toLowerCase()))]}
        existingStaffNumbers={roll.map((entry) => entry.staffNumber.toUpperCase())}
        departmentsWithHead={departmentsWithHead}
        editing={editingRollDraft}
        prefill={requestPrefill}
      />

      <MemberDrawer
        entry={viewing}
        onPrevious={previousId ? () => setViewingId(previousId) : undefined}
        onNext={nextId ? () => setViewingId(nextId) : undefined}
        position={viewingIndex >= 0 ? { index: viewingIndex, total: viewingOrder.length } : undefined}
        onClose={() => setViewingId(null)}
        currentUserId={currentUserId}
        workingId={workingId}
        actions={memberActions}
        departmentRequests={departmentRequests}
        profileRequests={profileRequests}
        onDecideDepartment={(id, decision) => void decideDepartmentRequest(id, decision)}
        onDecideProfile={(id, decision) => void decideProfileRequest(id, decision)}
        onSaveRole={saveRole}
      />

      {profileId ? (
        <MemberProfilePage
          memberId={profileId}
          currentUserId={currentUserId}
          workingId={workingId}
          actions={memberActions}
          reloadKey={reloadKey}
          onOpenPanel={(entry) => memberActions.onView(entry, [entry.id])}
          onEditOwnProfile={() => onNavigate?.('settings')}
          onOpenAudit={() => onNavigate?.('super-admin:audit')}
          onLoaded={(name) => onProfileName?.(name)}
        />
      ) : tab === 'audit' ? (
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
          {loading ? <div className="p-8 text-center text-sm text-slate-500">Loading the audit log…</div> : <AuditLogView events={events} />}
        </div>
      ) : (
        <>
          <nav aria-label="Members sections" className="-mt-2 flex gap-5 border-b border-slate-200 dark:border-slate-800">
            {sectionTabs.map((item) => {
              const active = tab === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  aria-current={active ? 'page' : undefined}
                  onClick={() => setTab(item.id)}
                  className={`-mb-px inline-flex cursor-pointer items-center gap-2 border-b-2 px-0.5 pb-2.5 text-sm font-medium transition-colors ${
                    active
                      ? 'border-slate-900 text-slate-900 dark:border-white dark:text-white'
                      : 'border-transparent text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
                  }`}
                >
                  {item.label}
                  {item.count ? <span className="rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] font-semibold text-slate-950">{item.count}</span> : null}
                </button>
              );
            })}
          </nav>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
            {loading ? (
              <div className="p-8 text-center text-sm text-slate-500">Loading members…</div>
            ) : tab === 'members' ? (
              <>
                {justCreated && (
                  <CreatedReceipt
                    account={justCreated}
                    entry={createdEntry}
                    working={!!createdEntry && workingId === createdEntry.id}
                    onShow={() => createdRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                    onResend={createdEntry ? () => memberActions.onResendInvite(createdEntry) : undefined}
                    onCreateAnother={openCreate}
                    onDismiss={() => setJustCreated(null)}
                  />
                )}
                <MembersTable
                  entries={roll}
                  currentUserId={currentUserId}
                  workingId={workingId}
                  highlightId={justCreated?.id}
                  highlightRef={createdRowRef}
                  actions={memberActions}
                />
              </>
            ) : (
              <RequestsView
                workingId={workingId}
                accessRequests={accessRequests}
                departmentRequests={departmentRequests}
                profileRequests={profileRequests}
                onAddRequest={addFromRequest}
                onDismissRequest={(request) => void dismissRequest(request)}
                onDecideDepartment={(id, decision) => void decideDepartmentRequest(id, decision)}
                onDecideProfile={(id, decision) => void decideProfileRequest(id, decision)}
              />
            )}
          </div>
        </>
      )}
      <p className="flex items-center gap-2 text-[11px] text-slate-500"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Administrator actions are stored in PostgreSQL audit logs.</p>
    </section>
  );
};

/* ------------------------------- Requests ------------------------------- */

const RequestGroup: React.FC<{ title: string; hint: string; count: number; children: React.ReactNode }> = ({ title, hint, count, children }) => (
  <section className="border-b border-slate-200 last:border-b-0 dark:border-slate-800">
    <header className="flex flex-wrap items-baseline gap-x-2 px-4 pb-1 pt-4">
      <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
      <span className="text-xs tabular-nums text-slate-400">{count}</span>
      <p className="w-full text-xs text-slate-500 dark:text-slate-400">{hint}</p>
    </header>
    {count === 0
      ? <p className="px-4 pb-4 pt-2 text-xs text-slate-400">Nothing waiting.</p>
      : <ul className="divide-y divide-slate-100 dark:divide-slate-800">{children}</ul>}
  </section>
);

const DecisionButtons: React.FC<{ busy: boolean; onApprove: () => void; onReject: () => void }> = ({ busy, onApprove, onReject }) => (
  <div className="flex gap-2">
    <Button size="sm" variant="success" icon={Check} disabled={busy} onClick={onApprove}>Approve</Button>
    <Button size="sm" variant="ghost" icon={X} disabled={busy} onClick={onReject}>Reject</Button>
  </div>
);

/** Every queue that waits on the super-admin: access to the roll, department moves and profile changes. */
const RequestsView: React.FC<{
  workingId: string | null;
  accessRequests: AccessRequest[];
  departmentRequests: DepartmentRequestRecord[];
  profileRequests: ProfileRequestRecord[];
  onAddRequest: (request: AccessRequest) => void;
  onDismissRequest: (request: AccessRequest) => void;
  onDecideDepartment: (id: string, decision: 'approve' | 'reject') => void;
  onDecideProfile: (id: string, decision: 'approve' | 'reject') => void;
}> = ({ workingId, accessRequests, departmentRequests, profileRequests, onAddRequest, onDismissRequest, onDecideDepartment, onDecideProfile }) => {
  if (!accessRequests.length && !departmentRequests.length && !profileRequests.length) {
    return (
      <div className="px-6 py-12 text-center">
        <Inbox className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
        <h3 className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">No requests to review</h3>
        <p className="mt-1 text-xs text-slate-500">Access requests, department moves and profile changes appear here.</p>
      </div>
    );
  }
  return (
    <>
      <RequestGroup title="Access requests" hint="Officers asking to be added to the nominal roll from the sign-in page." count={accessRequests.length}>
        {accessRequests.map((request) => (
          <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0 text-xs">
              <div className="text-[13px] font-semibold text-slate-900 dark:text-white">
                {request.fullName} <span className="ml-1 font-mono text-xs font-normal text-slate-500">{request.staffNumber}</span>
              </div>
              <div className="mt-0.5 text-slate-500">{request.email} · {departmentLabel(request.department)} · {formatDate(request.createdAt)}</div>
              {request.note && <p className="mt-1 max-w-2xl text-slate-600 dark:text-slate-300">{request.note}</p>}
            </div>
            <div className="flex gap-2">
              <Button size="sm" variant="primary" icon={UserPlus} disabled={workingId === request.id} onClick={() => onAddRequest(request)}>Add to roll</Button>
              <Button size="sm" variant="ghost" icon={X} disabled={workingId === request.id} onClick={() => onDismissRequest(request)}>Dismiss</Button>
            </div>
          </li>
        ))}
      </RequestGroup>
      <RequestGroup title="Department changes" hint="Staff asking to move to another laboratory." count={departmentRequests.length}>
        {departmentRequests.map((request) => (
          <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0 text-xs">
              <div className="text-[13px] font-semibold text-slate-900 dark:text-white">{request.fullName}</div>
              <div className="mt-0.5 text-slate-500">{request.email} · {roleLabel(request.role)} · {formatDate(request.createdAt)}</div>
              <div className="mt-1 text-slate-600 dark:text-slate-300">
                {departmentLabel(request.currentDepartment)} <span aria-hidden="true">→</span> <strong className="font-semibold text-slate-900 dark:text-white">{departmentLabel(request.requestedDepartment)}</strong>
              </div>
              {request.reason && <p className="mt-1 max-w-2xl text-slate-500">{request.reason}</p>}
            </div>
            <DecisionButtons
              busy={workingId === request.id}
              onApprove={() => onDecideDepartment(request.id, 'approve')}
              onReject={() => onDecideDepartment(request.id, 'reject')}
            />
          </li>
        ))}
      </RequestGroup>
      <RequestGroup title="Profile changes" hint="Staff asking to change their name, title or sign-in email." count={profileRequests.length}>
        {profileRequests.map((request) => (
          <li key={request.id} className="flex flex-wrap items-center justify-between gap-3 px-4 py-3">
            <div className="min-w-0 text-xs">
              <div className="text-[13px] font-semibold text-slate-900 dark:text-white">{request.currentFullName}</div>
              <div className="mt-0.5 text-slate-500">
                {request.currentEmail} · {roleLabel(request.currentRole)}
                {request.department ? ` · ${departmentLabel(request.department as LaboratoryDepartment)}` : ''} · {formatDate(request.createdAt)}
              </div>
              <ul className="mt-1 space-y-0.5 text-slate-600 dark:text-slate-300">
                {request.requestedFullName && <li><span className="font-medium">Name:</span> {request.currentFullName} <span aria-hidden="true">→</span> <strong className="font-semibold text-slate-900 dark:text-white">{request.requestedFullName}</strong></li>}
                {request.requestedRole && <li><span className="font-medium">Title:</span> {roleLabel(request.currentRole)} <span aria-hidden="true">→</span> <strong className="font-semibold text-slate-900 dark:text-white">{roleLabel(request.requestedRole)}</strong></li>}
                {request.requestedEmail && <li><span className="font-medium">Email:</span> {request.currentEmail} <span aria-hidden="true">→</span> <strong className="font-semibold text-slate-900 dark:text-white">{request.requestedEmail}</strong></li>}
              </ul>
              {request.reason && <p className="mt-1 max-w-2xl text-slate-500">{request.reason}</p>}
            </div>
            <DecisionButtons
              busy={workingId === request.id}
              onApprove={() => onDecideProfile(request.id, 'approve')}
              onReject={() => onDecideProfile(request.id, 'reject')}
            />
          </li>
        ))}
      </RequestGroup>
    </>
  );
};

/**
 * Confirmation shown above the members list after issuing an account: who it
 * is for, where the invitation went and when it lapses, and what to do next.
 */
const CreatedReceipt: React.FC<{
  account: CreatedAccount;
  /** The member once the list has reloaded; undefined while it loads. */
  entry?: RollEntry;
  working: boolean;
  onShow: () => void;
  onResend?: () => void;
  onCreateAnother: () => void;
  onDismiss: () => void;
}> = ({ account, entry, working, onShow, onResend, onCreateAnother, onDismiss }) => {
  const sent = account.emailSent;
  return (
    <div
      role="status"
      className={`flex flex-wrap items-start gap-3 border-b px-4 py-3 ${
        sent
          ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-900/60 dark:bg-emerald-950/30'
          : 'border-amber-200 bg-amber-50 dark:border-amber-900/60 dark:bg-amber-950/30'
      }`}
    >
      <span className={`mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-full ${sent ? 'bg-emerald-600 text-white' : 'bg-amber-500 text-slate-950'}`}>
        {sent ? <CheckCircle2 className="h-4 w-4" /> : <Mail className="h-4 w-4" />}
      </span>
      <div className="min-w-0 flex-1">
        <p className={`text-sm font-semibold ${sent ? 'text-emerald-900 dark:text-emerald-100' : 'text-amber-900 dark:text-amber-100'}`}>
          {sent ? 'Account created and invitation sent' : 'Account created, but the invitation email was not delivered'}
        </p>
        <p className="mt-0.5 text-xs text-slate-700 dark:text-slate-300">
          <strong>{account.fullName}</strong> · {roleLabel(account.role)} · {departmentLabel(account.department)}
        </p>
        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-400">
          {sent
            ? <>Activation link emailed to {account.email}{account.inviteExpiresAt ? <> · expires at {formatTime(account.inviteExpiresAt)}</> : ' · expires in 15 minutes'}. The member shows as <em>Invited</em> until the officer activates the account.</>
            : <>Check the mail (SMTP) settings, then resend the invitation to {account.email}.</>}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {entry && <Button size="sm" onClick={onShow}>Show in list</Button>}
        {onResend && (!sent || entry?.accountStatus === 'PENDING_INVITE') && (
          <Button size="sm" icon={RefreshCw} disabled={working} onClick={onResend}>Resend invite</Button>
        )}
        <Button size="sm" variant="primary" icon={UserPlus} onClick={onCreateAnother}>Add another</Button>
        <button type="button" aria-label="Dismiss" onClick={onDismiss} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-black/5 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};
