import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity,
  Check,
  CheckCircle2,
  Clock3,
  Mail,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  KeyRound,
  UserCheck,
  UserRoundX,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import { LaboratoryDepartment, UserRole } from '../../types';
import { apiRequest } from '../../lib/api';
import { AuditLogView } from './AuditLogView';
import { Select } from '../common/Select';
import { Avatar, Button, SegmentedControl, StatusPill, Tone } from '../common/Dashboard';
import { CreateUserDrawer, NewAccount } from './CreateUserDrawer';
import { roleLabel } from './roles';
import {
  GENERAL_ADMINISTRATION,
  departmentForRole,
  departmentLabel,
  departmentsForRole,
  isLabScopedRole,
  LABORATORY_DEPARTMENTS,
} from '../../lib/departments';

type RequestRecord = {
  id: string;
  fullName: string;
  email: string;
  requestedRole: UserRole;
  department?: LaboratoryDepartment;
  status: string;
  createdAt: string;
};

type AccountRecord = {
  id: string;
  fullName: string;
  email: string;
  role: UserRole;
  department?: LaboratoryDepartment;
  status: 'ACTIVE' | 'PENDING_INVITE' | 'DISABLED';
  createdAt: string;
};

type DepartmentRequestRecord = {
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

type AuditRecord = {
  id: string;
  actorEmail: string;
  action: string;
  recordType: string;
  recordId?: string;
  details: Record<string, unknown>;
  createdAt: string;
};

type Overview = {
  pending_requests: number;
  pending_department_requests: number;
  active_users: number;
  invited_users: number;
  audit_events: number;
};

type Tab = 'requests' | 'department-requests' | 'users' | 'audit';

const roles: UserRole[] = [
  'CEO', 'VICE_CEO', 'ADMINISTRATOR', 'CLERK', 'ACCOUNTANT', 'HR',
  'RECEPTIONIST', 'HEAD_OF_DEPARTMENT', 'SENIOR_CHEMIST', 'ANALYST',
  'INTERN', 'ATTACHEE', 'QUALITY_MANAGER', 'SUPER_ADMIN',
];

const formatDate = (value: string) => new Intl.DateTimeFormat(undefined, {
  dateStyle: 'medium',
  timeStyle: 'short',
}).format(new Date(value));

const ACCOUNT_STATUS: Record<AccountRecord['status'], { label: string; tone: Tone }> = {
  ACTIVE: { label: 'Active', tone: 'emerald' },
  PENDING_INVITE: { label: 'Invitation pending', tone: 'amber' },
  DISABLED: { label: 'Disabled', tone: 'rose' },
};

type StatusFilter = 'all' | AccountRecord['status'];

/** The account just created from this console, pinned and highlighted in the register. */
type CreatedAccount = NewAccount & {
  id?: string;
  emailSent: boolean;
  message: string;
  inviteExpiresAt?: string;
};

const isToday = (value: string) => new Date(value).toDateString() === new Date().toDateString();

const formatTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, { timeStyle: 'short' }).format(new Date(value));

export const SuperAdminPage: React.FC<{
  currentUserId: string;
  initialTab?: Tab;
  /** The sidebar already switches sections, so the in-page tab strip is redundant. */
  hideTabs?: boolean;
}> = ({ currentUserId, initialTab = 'requests', hideTabs = false }) => {
  const [tab, setTab] = useState<Tab>(initialTab);
  const [usersView, setUsersView] = useState<'accounts' | 'requests'>(initialTab === 'requests' ? 'requests' : 'accounts');
  // With the sidebar driving sections, approval requests live inside User accounts.
  const shownTab: Tab = hideTabs && tab === 'requests' ? 'users' : tab;
  const [overview, setOverview] = useState<Overview | null>(null);
  const [requests, setRequests] = useState<RequestRecord[]>([]);
  const [departmentRequests, setDepartmentRequests] = useState<DepartmentRequestRecord[]>([]);
  const [users, setUsers] = useState<AccountRecord[]>([]);
  const [events, setEvents] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [workingId, setWorkingId] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [query, setQuery] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [createError, setCreateError] = useState('');
  const [justCreated, setJustCreated] = useState<CreatedAccount | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [departmentFilter, setDepartmentFilter] = useState<'all' | LaboratoryDepartment>('all');
  const createdRowRef = useRef<HTMLTableRowElement | null>(null);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);
  const [roleDraft, setRoleDraft] = useState<UserRole>('ANALYST');
  const [departmentDraft, setDepartmentDraft] = useState<LaboratoryDepartment>(GENERAL_ADMINISTRATION);
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);

  const loadData = useCallback(async (showLoading = true) => {
    if (showLoading) {
      setLoading(true);
      setError('');
    }
    try {
      const [summary, requestData, departmentRequestData, userData, auditData] = await Promise.all([
        apiRequest<Overview>('/api/admin/overview'),
        apiRequest<{ requests: RequestRecord[] }>('/api/admin/requests'),
        apiRequest<{ requests: DepartmentRequestRecord[] }>('/api/admin/department-change-requests'),
        apiRequest<{ users: AccountRecord[] }>('/api/admin/users'),
        apiRequest<{ events: AuditRecord[] }>('/api/admin/audit'),
      ]);
      setOverview(summary);
      setRequests(requestData.requests);
      setDepartmentRequests(departmentRequestData.requests);
      setUsers(userData.users);
      setEvents(auditData.events);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load account administration.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => { setTab(initialTab); setUsersView(initialTab === 'requests' ? 'requests' : 'accounts'); }, [initialTab]);
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
      await loadData();
      if (result.emailSent === false) setError(result.message);
      else setNotice(result.message);
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'The action failed.');
    } finally {
      setWorkingId(null);
    }
  };

  const approve = (id: string) => runAction(id, () =>
    apiRequest(`/api/admin/requests/${id}/approve`, { method: 'POST', body: '{}' }));
  const reject = (id: string) => runAction(id, () =>
    apiRequest(`/api/admin/requests/${id}/reject`, { method: 'POST', body: '{}' }));
  const decideDepartmentRequest = (id: string, decision: 'approve' | 'reject') => runAction(id, () =>
    apiRequest(`/api/admin/department-change-requests/${id}/${decision}`, { method: 'POST', body: '{}' }));
  const resendInvite = (id: string) => runAction(id, () =>
    apiRequest(`/api/admin/users/${id}/resend-invite`, { method: 'POST', body: '{}' }));
  // Mails the user a one-time link to choose their own password. The admin
  // never sets or sees the new value.
  const resetPassword = (user: AccountRecord) => {
    if (!window.confirm(`Email ${user.email} a password reset link? Their current password stops working once they choose a new one.`)) return;
    return runAction(user.id, () =>
      apiRequest(`/api/admin/users/${user.id}/reset-password`, { method: 'POST', body: '{}' }));
  };
  const changeStatus = (user: AccountRecord) => {
    const status = user.status === 'DISABLED' ? 'ACTIVE' : 'DISABLED';
    return runAction(user.id, () =>
      apiRequest(`/api/admin/users/${user.id}/status`, { method: 'PATCH', body: JSON.stringify({ status }) }));
  };

  // Editing and deleting are mutually exclusive per row so the action cell
  // never shows a save button next to a delete confirmation.
  const beginRoleEdit = (user: AccountRecord) => {
    setRoleDraft(user.role);
    setDepartmentDraft(user.department ?? GENERAL_ADMINISTRATION);
    setEditingRoleId(user.id);
    setConfirmDeleteId(null);
  };
  // Keep the department only while the new role still allows it, otherwise fall
  // back to that role's default so the pair can never be submitted invalid.
  const chooseRoleDraft = (next: UserRole) => {
    setRoleDraft(next);
    setDepartmentDraft(departmentForRole(next, departmentDraft));
  };
  const saveRole = async (user: AccountRecord) => {
    await runAction(user.id, () =>
      apiRequest(`/api/admin/users/${user.id}/role`, { method: 'PATCH', body: JSON.stringify({ role: roleDraft, department: departmentDraft }) }));
    setEditingRoleId(null);
  };
  const beginDelete = (user: AccountRecord) => {
    setConfirmDeleteId(user.id);
    setEditingRoleId(null);
  };
  const deleteUser = async (user: AccountRecord) => {
    await runAction(user.id, () =>
      apiRequest(`/api/admin/users/${user.id}`, { method: 'DELETE' }));
    setConfirmDeleteId(null);
  };

  const openCreate = () => {
    setCreateError('');
    setCreateOpen(true);
  };

  const createUser = async (account: NewAccount) => {
    setWorkingId('create');
    setCreateError('');
    setError('');
    setNotice('');
    try {
      const result = await apiRequest<{ message: string; emailSent: boolean; userId?: string; inviteExpiresAt?: string }>('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(account),
      });
      setCreateOpen(false);
      // Clear anything that could hide the new row, then land on the register.
      setQuery('');
      setStatusFilter('all');
      setDepartmentFilter('all');
      setTab('users');
      setUsersView('accounts');
      setJustCreated({ ...account, id: result.userId, emailSent: result.emailSent, message: result.message, inviteExpiresAt: result.inviteExpiresAt });
      await loadData(false);
    } catch (cause) {
      setCreateError(cause instanceof Error ? cause.message : 'The account could not be created.');
    } finally {
      setWorkingId(null);
    }
  };

  // Older servers do not return the id, so fall back to the email.
  const isJustCreated = (user: AccountRecord) =>
    !!justCreated && (justCreated.id ? user.id === justCreated.id : user.email.toLowerCase() === justCreated.email);
  const createdRecord = justCreated ? users.find(isJustCreated) : undefined;

  // Bring the new row into view once it has loaded.
  useEffect(() => {
    if (createdRecord) createdRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [createdRecord?.id]);

  const showCreatedRow = () => createdRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });

  const statusCounts = users.reduce<Record<StatusFilter, number>>(
    (counts, user) => ({ ...counts, all: counts.all + 1, [user.status]: counts[user.status] + 1 }),
    { all: 0, ACTIVE: 0, PENDING_INVITE: 0, DISABLED: 0 },
  );
  const departmentsWithHead = users
    .filter((user) => user.role === 'HEAD_OF_DEPARTMENT' && user.department)
    .map((user) => user.department as LaboratoryDepartment);

  const filteredUsers = users
    .filter((user) => statusFilter === 'all' || user.status === statusFilter)
    .filter((user) => departmentFilter === 'all' || (user.department ?? GENERAL_ADMINISTRATION) === departmentFilter)
    .filter((user) =>
      `${user.fullName} ${user.email} ${user.role} ${roleLabel(user.role)} ${departmentLabel(user.department)}`.toLowerCase().includes(query.toLowerCase()))
    // The account just created always leads the list.
    .sort((a, b) => Number(isJustCreated(b)) - Number(isJustCreated(a)));
  const filtersActive = statusFilter !== 'all' || departmentFilter !== 'all' || query !== '';
  const clearFilters = () => {
    setStatusFilter('all');
    setDepartmentFilter('all');
    setQuery('');
  };

  const metrics = [
    { label: 'Account requests', value: overview?.pending_requests ?? '—', icon: Clock3, tone: 'amber' },
    { label: 'Department changes', value: overview?.pending_department_requests ?? '—', icon: Pencil, tone: 'violet' },
    { label: 'Active users', value: overview?.active_users ?? '—', icon: UserCheck, tone: 'emerald' },
    { label: 'Invitations pending', value: overview?.invited_users ?? '—', icon: Mail, tone: 'sky' },
    { label: 'Audit events', value: overview?.audit_events ?? '—', icon: Activity, tone: 'amber' },
  ];
  const tabs: { id: Tab; label: string; count?: number }[] = [
    { id: 'requests', label: 'Approval requests', count: overview?.pending_requests },
    { id: 'department-requests', label: 'Department changes', count: overview?.pending_department_requests },
    { id: 'users', label: 'User accounts' },
    { id: 'audit', label: 'Audit log' },
  ];

  const renderRequests = () => (
    requests.length === 0 ? <EmptyState title="No pending account requests" detail="New staff registrations will appear here for approval." /> : (
      <div className="divide-y divide-slate-100 dark:divide-slate-800">
        {requests.filter((request) => request.status === 'PENDING').map((request) => (
          <article key={request.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
            <div className="min-w-0">
              <div className="font-semibold text-slate-900 dark:text-white">{request.fullName}</div>
              <div className="mt-1 text-xs text-slate-500">{request.email}</div>
              <div className="mt-1 text-xs text-slate-500">{request.requestedRole.replaceAll('_', ' ')}{request.department ? ` · ${departmentLabel(request.department)}` : ''} · {formatDate(request.createdAt)}</div>
            </div>
            <div className="flex gap-2">
              <button type="button" disabled={workingId === request.id} onClick={() => void approve(request.id)} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white disabled:opacity-60"><Check className="h-4 w-4" /> Approve & invite</button>
              <button type="button" disabled={workingId === request.id} onClick={() => void reject(request.id)} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/30"><X className="h-4 w-4" /> Reject</button>
            </div>
          </article>
        ))}
      </div>
    )
  );

  return (
    <section className="mx-auto w-full max-w-7xl space-y-6 pb-8">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.15em] text-amber-700 dark:text-amber-400">
            <ShieldCheck className="h-4 w-4" /> System administration
          </div>
          <h1 className="mt-2 text-2xl font-bold tracking-tight text-slate-950 dark:text-white">Super-admin console</h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Approve staff access, manage account invitations, assign roles, and review administrative activity.
          </p>
          <p className="mt-1 text-xs text-slate-400 dark:text-slate-500">
            Data refreshes from PostgreSQL every 15 seconds. New sign-up requests appear under Approval requests; users created here appear under User accounts.
          </p>
        </div>
        <div className="flex gap-2">
          <button type="button" onClick={() => void loadData()} className="inline-flex h-10 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
          </button>
          <Button variant="primary" icon={UserPlus} onClick={openCreate}>Create user</Button>
        </div>
      </header>

      {error && <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">{error}</div>}
      {notice && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-200">{notice}</div>}

      <CreateUserDrawer
        open={createOpen}
        onOpenChange={setCreateOpen}
        onSubmit={createUser}
        working={workingId === 'create'}
        error={createError}
        existingEmails={users.map((user) => user.email.toLowerCase())}
        departmentsWithHead={departmentsWithHead}
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
        {metrics.map(({ label, value, icon: Icon, tone }) => (
          <div key={label} className="rounded-2xl border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-900">
            <div className="flex items-center justify-between">
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</span>
              <Icon className={`h-4 w-4 ${tone === 'amber' ? 'text-amber-500' : tone === 'emerald' ? 'text-emerald-500' : tone === 'sky' ? 'text-sky-500' : 'text-violet-500'}`} />
            </div>
            <div className="mt-3 text-2xl font-bold tabular-nums text-slate-950 dark:text-white">{value}</div>
          </div>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="flex flex-wrap gap-1">
            {hideTabs && (
              <h2 className="px-1 text-sm font-semibold text-slate-900 dark:text-white">
                {tabs.find((item) => item.id === shownTab)?.label}
              </h2>
            )}
            {!hideTabs && tabs.map((item) => (
              <button key={item.id} type="button" onClick={() => setTab(item.id)} className={`rounded-lg px-3 py-2 text-sm font-semibold ${tab === item.id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}>
                {item.label}{item.count ? <span className="ml-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] text-slate-950">{item.count}</span> : null}
              </button>
            ))}
          </div>
        </div>

        {loading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading administration data…</div>
        ) : shownTab === 'requests' ? (
          renderRequests()
        ) : shownTab === 'department-requests' ? (
          departmentRequests.length === 0 ? <EmptyState title="No pending department changes" detail="Staff requests to move to another department will appear here." /> : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800">
              {departmentRequests.map((request) => (
                <article key={request.id} className="flex flex-wrap items-center justify-between gap-4 px-4 py-4">
                  <div className="min-w-0">
                    <div className="font-semibold text-slate-900 dark:text-white">{request.fullName}</div>
                    <div className="mt-1 text-xs text-slate-500">{request.email} · {request.role.replaceAll('_', ' ')}</div>
                    <div className="mt-1 text-xs text-slate-600 dark:text-slate-300">{departmentLabel(request.currentDepartment)} <span aria-hidden="true">→</span> {departmentLabel(request.requestedDepartment)} · {formatDate(request.createdAt)}</div>
                    {request.reason && <p className="mt-2 max-w-2xl text-xs text-slate-500">{request.reason}</p>}
                  </div>
                  <div className="flex gap-2">
                    <button type="button" disabled={workingId === request.id} onClick={() => void decideDepartmentRequest(request.id, 'approve')} className="inline-flex h-9 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white disabled:opacity-60"><Check className="h-4 w-4" /> Approve change</button>
                    <button type="button" disabled={workingId === request.id} onClick={() => void decideDepartmentRequest(request.id, 'reject')} className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/30"><X className="h-4 w-4" /> Reject</button>
                  </div>
                </article>
              ))}
            </div>
          )
        ) : shownTab === 'users' ? (
          <>
          {hideTabs && (
            <div role="tablist" aria-label="User accounts sections" className="flex gap-1 border-b border-slate-200 px-4 py-2 dark:border-slate-800">
              {([
                { id: 'accounts', label: 'Accounts', count: undefined },
                { id: 'requests', label: 'Approval requests', count: overview?.pending_requests ?? requests.length },
              ] as const).map((item) => (
                <button
                  key={item.id}
                  type="button"
                  role="tab"
                  aria-selected={usersView === item.id}
                  onClick={() => setUsersView(item.id)}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${usersView === item.id ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800'}`}
                >
                  {item.label}{item.count ? <span className="ml-2 rounded-full bg-amber-500 px-1.5 py-0.5 text-[10px] text-slate-950">{item.count}</span> : null}
                </button>
              ))}
            </div>
          )}
          {!(hideTabs && usersView === 'requests') && (
            <>
              {justCreated && (
                <CreatedReceipt
                  account={justCreated}
                  record={createdRecord}
                  working={!!createdRecord && workingId === createdRecord.id}
                  onShow={showCreatedRow}
                  onResend={createdRecord ? () => void resendInvite(createdRecord.id) : undefined}
                  onCreateAnother={openCreate}
                  onDismiss={() => setJustCreated(null)}
                />
              )}
              <div className="flex flex-wrap items-center gap-2 border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
                <SegmentedControl<StatusFilter>
                  ariaLabel="Filter by account status"
                  value={statusFilter}
                  onChange={setStatusFilter}
                  options={[
                    { value: 'all', label: 'All', count: statusCounts.all },
                    { value: 'ACTIVE', label: 'Active', count: statusCounts.ACTIVE },
                    { value: 'PENDING_INVITE', label: 'Invitation pending', count: statusCounts.PENDING_INVITE },
                    { value: 'DISABLED', label: 'Disabled', count: statusCounts.DISABLED },
                  ]}
                />
                <Select<'all' | LaboratoryDepartment>
                  size="xs"
                  className="w-52"
                  aria-label="Filter by department"
                  value={departmentFilter}
                  onChange={setDepartmentFilter}
                  options={[
                    { value: 'all', label: 'All departments' },
                    ...[...LABORATORY_DEPARTMENTS, GENERAL_ADMINISTRATION].map((item) => ({ value: item, label: departmentLabel(item) })),
                  ]}
                />
                <label className="ml-auto flex h-8 items-center gap-2 rounded-lg border border-slate-200 px-2.5 dark:border-slate-700">
                  <Search className="h-3.5 w-3.5 text-slate-400" />
                  <input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search name, email or role" aria-label="Search staff" className="w-48 bg-transparent text-xs outline-none dark:text-white" />
                </label>
                {filtersActive && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear</Button>}
              </div>
            </>
          )}
          {hideTabs && usersView === 'requests' ? renderRequests() : filteredUsers.length === 0 ? <EmptyState title="No staff accounts found" detail={filtersActive ? 'No account matches these filters. Clear them to see the full register.' : 'Create the first staff account to get started.'} /> : (
            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-xs">
                <thead className="bg-slate-50 text-slate-500 dark:bg-slate-950/50"><tr><th className="px-4 py-3 font-semibold">Staff member</th><th className="px-4 py-3 font-semibold">Role / unit</th><th className="px-4 py-3 font-semibold">Status</th><th className="px-4 py-3 font-semibold">Added</th><th className="px-4 py-3 text-right font-semibold">Actions</th></tr></thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {filteredUsers.map((user) => {
                    const created = isJustCreated(user);
                    return (
                    <tr
                      key={user.id}
                      ref={created ? createdRowRef : undefined}
                      aria-current={created ? 'true' : undefined}
                      className={created
                        ? 'bg-amber-50/80 shadow-[inset_3px_0_0_var(--color-amber-500)] dark:bg-amber-500/10'
                        : 'transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40'}
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <Avatar name={user.fullName} size="sm" tone={created ? 'amber' : user.status === 'DISABLED' ? 'rose' : 'slate'} />
                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5">
                              <span className="font-semibold text-slate-900 dark:text-white">{user.fullName}</span>
                              {created && <span className="rounded bg-amber-500 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-slate-950">New</span>}
                              {user.id === currentUserId && <span className="text-[11px] text-slate-500">(you)</span>}
                            </div>
                            <div className="mt-0.5 text-slate-500">{user.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">
                        {editingRoleId === user.id ? (
                          <div className="flex flex-wrap items-center gap-1.5">
                            <Select
                              size="xs"
                              className="w-44"
                              aria-label="Role"
                              value={roleDraft}
                              onChange={chooseRoleDraft}
                              options={roles.map((item) => ({ value: item, label: roleLabel(item) }))}
                            />
                            <Select
                              size="xs"
                              className="w-40"
                              aria-label="Department"
                              value={departmentDraft}
                              onChange={(value) => setDepartmentDraft(value as LaboratoryDepartment)}
                              disabled={!isLabScopedRole(roleDraft)}
                              options={departmentsForRole(roleDraft).map((item) => ({ value: item, label: departmentLabel(item) }))}
                            />
                            <button type="button" title="Save role" disabled={workingId === user.id || (roleDraft === user.role && departmentDraft === user.department)} onClick={() => void saveRole(user)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-600 text-white disabled:opacity-40"><Check className="h-3.5 w-3.5" /></button>
                            <button type="button" title="Cancel" onClick={() => setEditingRoleId(null)} className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-slate-200 text-slate-600 dark:border-slate-700 dark:text-slate-300"><X className="h-3.5 w-3.5" /></button>
                          </div>
                        ) : (
                          <>
                            <div className="flex items-center gap-2">
                              <span className="font-medium text-slate-800 dark:text-slate-200">{roleLabel(user.role)}</span>
                              {user.id !== currentUserId && (
                                <button type="button" title="Change role" onClick={() => beginRoleEdit(user)} className="text-slate-400 transition-colors hover:text-amber-600 dark:hover:text-amber-400"><Pencil className="h-3.5 w-3.5" /></button>
                              )}
                            </div>
                            <div className="mt-0.5 text-slate-500">{departmentLabel(user.department) || '—'}</div>
                          </>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <StatusPill tone={ACCOUNT_STATUS[user.status].tone}>{ACCOUNT_STATUS[user.status].label}</StatusPill>
                        {user.status === 'PENDING_INVITE' && <div className="mt-1 text-[11px] text-slate-500">Awaiting activation by the officer</div>}
                      </td>
                      <td className="px-4 py-3 text-slate-500">{isToday(user.createdAt) ? <><span className="font-medium text-slate-700 dark:text-slate-200">Today</span>, {formatTime(user.createdAt)}</> : formatDate(user.createdAt)}</td>
                      <td className="px-4 py-3"><div className="flex flex-wrap items-center justify-end gap-2">
                        {confirmDeleteId === user.id ? (
                          <>
                            <span className="self-center text-[11px] font-semibold text-rose-700 dark:text-rose-300">Delete this account?</span>
                            <button type="button" disabled={workingId === user.id} onClick={() => void deleteUser(user)} className="inline-flex h-8 items-center gap-1 rounded-lg bg-rose-600 px-2 text-xs font-semibold text-white disabled:opacity-60"><Trash2 className="h-3.5 w-3.5" /> Yes, delete</button>
                            <button type="button" onClick={() => setConfirmDeleteId(null)} className="inline-flex h-8 items-center rounded-lg border border-slate-200 px-2 text-xs text-slate-600 dark:border-slate-700 dark:text-slate-300">Cancel</button>
                          </>
                        ) : (
                          <>
                            {user.status === 'PENDING_INVITE' && <button type="button" disabled={workingId === user.id} onClick={() => void resendInvite(user.id)} title="Resend 15-minute activation email" className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2 text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><RefreshCw className="h-3.5 w-3.5" /><span>Resend</span></button>}
                            {user.id !== currentUserId && user.status !== 'PENDING_INVITE' && <button type="button" disabled={workingId === user.id} onClick={() => void changeStatus(user)} className={`inline-flex h-8 items-center gap-1 rounded-lg border px-2 ${user.status === 'DISABLED' ? 'border-emerald-200 text-emerald-700 dark:border-emerald-900 dark:text-emerald-300' : 'border-rose-200 text-rose-700 dark:border-rose-900 dark:text-rose-300'}`}>{user.status === 'DISABLED' ? <><UserCheck className="h-3.5 w-3.5" /> Enable</> : <><UserRoundX className="h-3.5 w-3.5" /> Disable</>}</button>}
                            {user.status === 'ACTIVE' && <button type="button" disabled={workingId === user.id} onClick={() => void resetPassword(user)} title="Email this user a link to set a new password" className="inline-flex h-8 items-center gap-1 rounded-lg border border-slate-200 px-2 text-slate-600 hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:text-slate-300 dark:hover:bg-slate-800"><KeyRound className="h-3.5 w-3.5" /><span>Reset password</span></button>}
                            {user.id !== currentUserId && <button type="button" disabled={workingId === user.id} onClick={() => beginDelete(user)} title="Delete this account permanently" className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-600 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-900 dark:text-rose-400 dark:hover:bg-rose-950/30"><Trash2 className="h-3.5 w-3.5" /></button>}
                          </>
                        )}
                      </div></td>
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
          </>
        ) : (
          <AuditLogView events={events} />
        )}
      </div>
      <p className="flex items-center gap-2 text-[11px] text-slate-500"><CheckCircle2 className="h-4 w-4 text-emerald-500" /> Administrator actions are stored in PostgreSQL audit logs.</p>
    </section>
  );
};

/**
 * Confirmation shown above the register after creating an account: who was
 * created, where the invitation went and when it lapses, and what to do next.
 */
const CreatedReceipt: React.FC<{
  account: CreatedAccount;
  /** The row once the register has reloaded; undefined while it loads. */
  record?: AccountRecord;
  working: boolean;
  onShow: () => void;
  onResend?: () => void;
  onCreateAnother: () => void;
  onDismiss: () => void;
}> = ({ account, record, working, onShow, onResend, onCreateAnother, onDismiss }) => {
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
            ? <>Activation link emailed to {account.email}{account.inviteExpiresAt ? <> · expires at {formatTime(account.inviteExpiresAt)}</> : ' · expires in 15 minutes'}. The account shows as <em>Invitation pending</em> until the officer activates it.</>
            : <>Check the mail (SMTP) settings, then resend the invitation to {account.email}.</>}
        </p>
      </div>
      <div className="flex flex-wrap items-center gap-2">
        {record && <Button size="sm" onClick={onShow}>Show in list</Button>}
        {onResend && (!sent || record?.status === 'PENDING_INVITE') && (
          <Button size="sm" icon={RefreshCw} disabled={working} onClick={onResend}>Resend invite</Button>
        )}
        <Button size="sm" variant="primary" icon={UserPlus} onClick={onCreateAnother}>Create another</Button>
        <button type="button" aria-label="Dismiss" onClick={onDismiss} className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-black/5 hover:text-slate-900 dark:hover:bg-white/10 dark:hover:text-white">
          <X className="h-4 w-4" />
        </button>
      </div>
    </div>
  );
};

const EmptyState: React.FC<{ title: string; detail: string }> = ({ title, detail }) => (
  <div className="px-6 py-12 text-center">
    <Users className="mx-auto h-8 w-8 text-slate-300 dark:text-slate-600" />
    <h3 className="mt-3 text-sm font-semibold text-slate-800 dark:text-slate-100">{title}</h3>
    <p className="mt-1 text-xs text-slate-500">{detail}</p>
  </div>
);
