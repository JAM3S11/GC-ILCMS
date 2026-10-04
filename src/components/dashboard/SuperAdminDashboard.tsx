import React, { useCallback, useEffect, useState } from 'react';
import {
  ArrowRight,
  Building2,
  CheckCircle2,
  Clock3,
  FlaskConical,
  FolderOpen,
  RefreshCw,
  UserPlus,
  Users,
} from 'lucide-react';
import { OfficerVisitor, User as UserType, WaterIntake } from '../../types';
import { apiRequest } from '../../lib/api';
import { Avatar, DashboardPage, StatusPill } from '../common/Dashboard';

type Overview = {
  pending_requests: number;
  pending_department_requests: number;
  active_users: number;
  invited_users: number;
  audit_events: number;
};

type AccountRecord = {
  id: string;
  fullName: string;
  email: string;
  role: string;
  department?: string;
  status: 'ACTIVE' | 'PENDING_INVITE' | 'DISABLED';
  createdAt: string;
};

type AuditRecord = {
  id: string;
  actorEmail: string;
  action: string;
  recordType: string;
  recordId?: string;
  createdAt: string;
};

interface SuperAdminDashboardProps {
  currentUser: UserType;
  /** Live reception visits and Water intakes already polled by the app. */
  visitors: OfficerVisitor[];
  waterIntakes: WaterIntake[];
  onNavigate: (view: string) => void;
}

const REFRESH_MS = 15_000;

const humanise = (value: string) => {
  const words = value.toLowerCase().replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

const timeAgo = (value: string) => {
  const minutes = Math.max(0, Math.round((Date.now() - new Date(value).getTime()) / 60_000));
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.round(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.round(hours / 24);
  return days === 1 ? 'Yesterday' : `${days} days ago`;
};

const greeting = () => {
  const hour = new Date().getHours();
  return hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
};

export const SuperAdminDashboard: React.FC<SuperAdminDashboardProps> = ({
  currentUser,
  visitors,
  waterIntakes,
  onNavigate,
}) => {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [users, setUsers] = useState<AccountRecord[]>([]);
  const [events, setEvents] = useState<AuditRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState('');

  const load = useCallback(async (showLoading = true) => {
    if (showLoading) setLoading(true);
    try {
      const [summary, userData, auditData] = await Promise.all([
        apiRequest<Overview>('/api/admin/overview'),
        apiRequest<{ users: AccountRecord[] }>('/api/admin/users'),
        apiRequest<{ events: AuditRecord[] }>('/api/admin/audit'),
      ]);
      setOverview(summary);
      setUsers(userData.users);
      setEvents(auditData.events);
      setError('');
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : 'Unable to load live system data.');
    } finally {
      if (showLoading) setLoading(false);
    }
  }, []);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    const id = window.setInterval(() => { void load(false); }, REFRESH_MS);
    return () => window.clearInterval(id);
  }, [load]);

  const refresh = async () => {
    setRefreshing(true);
    await load(false);
    setRefreshing(false);
  };

  const firstName = currentUser.name.split(' ')[0];
  const onSite = visitors.filter((v) => v.status !== 'Departed');
  const awaitingLab = visitors.filter((v) => v.status === 'Awaiting Laboratory Reception');
  const underAnalysis = waterIntakes.filter((i) => i.status === 'Under Analysis').length;

  const pendingRequests = overview?.pending_requests ?? 0;
  const pendingInvites = overview?.invited_users ?? 0;

  // Only what genuinely needs the admin; an empty list reads as "all caught up".
  const attention = [
    pendingRequests > 0 && {
      icon: UserPlus,
      text: `${pendingRequests} ${pendingRequests === 1 ? 'person is' : 'people are'} waiting for account approval`,
      action: 'Review',
      onClick: () => onNavigate('super-admin:requests'),
    },
    (overview?.pending_department_requests ?? 0) > 0 && {
      icon: Building2,
      text: `${overview?.pending_department_requests} department change ${overview?.pending_department_requests === 1 ? 'request needs' : 'requests need'} a decision`,
      action: 'Review',
      onClick: () => onNavigate('super-admin:department-requests'),
    },
    pendingInvites > 0 && {
      icon: Clock3,
      text: `${pendingInvites} ${pendingInvites === 1 ? 'invitation has' : 'invitations have'} not been accepted yet`,
      action: 'View',
      onClick: () => onNavigate('super-admin:users'),
    },
    awaitingLab.length > 0 && {
      icon: Users,
      text: `${awaitingLab.length} ${awaitingLab.length === 1 ? 'client is' : 'clients are'} waiting at reception for the laboratory`,
      action: 'Open',
      onClick: () => onNavigate('lab-bay'),
    },
  ].filter(Boolean) as { icon: React.ComponentType<{ className?: string }>; text: string; action: string; onClick: () => void }[];

  const disabledUsers = users.filter((u) => u.status === 'DISABLED').length;
  const inLab = onSite.length - awaitingLab.length;
  const completedExhibits = waterIntakes.filter((i) => i.status === 'Analysis Complete').length;

  const stats = [
    {
      label: 'Active users',
      value: overview?.active_users,
      detail: `${pendingInvites} invited · ${disabledUsers} disabled`,
      icon: Users,
      chip: 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400',
      onClick: () => onNavigate('super-admin:users'),
    },
    {
      label: 'Clients on site',
      value: loading ? undefined : onSite.length,
      detail: `${awaitingLab.length} waiting · ${inLab} in the laboratory`,
      icon: Building2,
      chip: 'bg-sky-500/10 text-sky-600 dark:text-sky-400',
      onClick: () => onNavigate('lab-bay'),
    },
    {
      label: 'Exhibits under analysis',
      value: loading ? undefined : underAnalysis,
      detail: `${completedExhibits} completed · ${waterIntakes.length} total`,
      icon: FlaskConical,
      chip: 'bg-violet-500/10 text-violet-600 dark:text-violet-400',
      onClick: () => onNavigate('case-file'),
    },
  ];

  // Events per day for the last seven days, oldest first (one series, one hue).
  const days = Array.from({ length: 7 }, (_, i) => {
    const date = new Date();
    date.setHours(0, 0, 0, 0);
    date.setDate(date.getDate() - (6 - i));
    return { date, count: 0 };
  });
  events.forEach((event) => {
    const day = new Date(event.createdAt);
    day.setHours(0, 0, 0, 0);
    const bucket = days.find((d) => d.date.getTime() === day.getTime());
    if (bucket) bucket.count += 1;
  });
  const weekTotal = days.reduce((sum, d) => sum + d.count, 0);
  const peak = Math.max(1, ...days.map((d) => d.count));

  const roleCounts = Object.entries(
    users.filter((u) => u.status === 'ACTIVE').reduce<Record<string, number>>((acc, u) => {
      acc[u.role] = (acc[u.role] ?? 0) + 1;
      return acc;
    }, {}),
  ).sort((a, b) => b[1] - a[1]);

  const card = 'rounded-xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900';

  return (
    <DashboardPage className="max-w-5xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">
            {greeting()}, {firstName}
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Here’s what’s happening across the system today.</p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <button
            type="button"
            onClick={() => onNavigate('case-file')}
            className="hidden h-9 items-center gap-2 rounded-lg border border-slate-200 bg-white px-3 text-sm font-medium text-slate-700 hover:bg-slate-50 sm:inline-flex dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800"
          >
            <FolderOpen className="h-4 w-4 text-slate-400" /> Case files
          </button>
          <button
            type="button"
            onClick={() => onNavigate('super-admin:users')}
            className="inline-flex h-9 items-center gap-2 rounded-lg bg-amber-500 px-3 text-sm font-semibold text-slate-950 shadow-sm hover:bg-amber-400"
          >
            <UserPlus className="h-4 w-4" /> Invite user
          </button>
          <button
            type="button"
            onClick={() => void refresh()}
            aria-label="Refresh"
            title="Refresh"
            className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          >
            <RefreshCw className={`h-4 w-4 ${refreshing ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </header>

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      )}

      {/* Needs attention */}
      <section aria-label="Needs your attention" className={card}>
        <h2 className="border-b border-slate-100 px-5 py-3 text-sm font-semibold text-slate-900 dark:border-slate-800 dark:text-white">
          Needs your attention
        </h2>
        {loading ? (
          <p className="px-5 py-6 text-sm text-slate-500">Loading…</p>
        ) : attention.length === 0 ? (
          <p className="flex items-center gap-2 px-5 py-6 text-sm text-slate-600 dark:text-slate-300">
            <CheckCircle2 className="h-4 w-4 text-emerald-500" /> You’re all caught up — nothing is waiting on you.
          </p>
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {attention.map((item) => (
              <li key={item.text} className="flex items-center gap-3 px-5 py-3">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-600 dark:text-amber-400">
                  <item.icon className="h-4 w-4" />
                </span>
                <span className="min-w-0 flex-1 text-sm text-slate-700 dark:text-slate-200">{item.text}</span>
                <button
                  type="button"
                  onClick={item.onClick}
                  className="inline-flex shrink-0 items-center gap-1 text-sm font-medium text-amber-700 hover:text-amber-600 dark:text-amber-400"
                >
                  {item.action} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Key numbers */}
      <section aria-label="Key numbers" className="grid gap-3 sm:grid-cols-3">
        {stats.map((stat) => (
          <button
            key={stat.label}
            type="button"
            onClick={stat.onClick}
            className={`${card} group p-5 text-left shadow-sm transition-all hover:-translate-y-px hover:border-slate-300 hover:shadow dark:hover:border-slate-700`}
          >
            <div className="flex items-center justify-between">
              <span className="text-sm text-slate-500 dark:text-slate-400">{stat.label}</span>
              <span className={`flex h-8 w-8 items-center justify-center rounded-lg ${stat.chip}`}>
                <stat.icon className="h-4 w-4" />
              </span>
            </div>
            <div className="mt-3 text-3xl font-semibold tabular-nums text-slate-900 dark:text-white">{stat.value ?? '—'}</div>
            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{stat.detail}</div>
          </button>
        ))}
      </section>

      <div className="grid gap-4 lg:grid-cols-3">
        {/* Activity, last 7 days */}
        <section aria-label="Activity over the last 7 days" className={`${card} shadow-sm lg:col-span-2`}>
          <div className="flex items-start justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
            <div>
              <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Activity</h2>
              <p className="text-xs text-slate-500 dark:text-slate-400">Administrative and sign-in events, last 7 days</p>
            </div>
            <div className="text-right">
              <div className="text-2xl font-semibold tabular-nums text-slate-900 dark:text-white">{weekTotal}</div>
              <div className="text-[11px] text-slate-500 dark:text-slate-400">events</div>
            </div>
          </div>
          <div className="px-5 pb-4 pt-5">
            <div className="flex h-32 items-end gap-3" role="img" aria-label={`Events per day: ${days.map((d) => `${d.date.toLocaleDateString(undefined, { weekday: 'short' })} ${d.count}`).join(', ')}`}>
              {days.map((d) => (
                <div key={d.date.toISOString()} className="group relative flex h-full flex-1 flex-col justify-end" title={`${d.date.toLocaleDateString(undefined, { dateStyle: 'medium' })}: ${d.count} ${d.count === 1 ? 'event' : 'events'}`}>
                  <span className="mb-1 text-center text-[11px] tabular-nums text-slate-500 opacity-0 transition-opacity group-hover:opacity-100 dark:text-slate-400">{d.count}</span>
                  <div
                    className="w-full rounded-t-[4px] bg-amber-500 transition-colors group-hover:bg-amber-400"
                    style={{ height: `${Math.max(d.count === 0 ? 2 : 6, (d.count / peak) * 100)}%`, opacity: d.count === 0 ? 0.25 : 1 }}
                  />
                </div>
              ))}
            </div>
            <div className="mt-2 flex gap-3 border-t border-slate-100 pt-2 dark:border-slate-800">
              {days.map((d) => (
                <span key={d.date.toISOString()} className="flex-1 text-center text-[11px] text-slate-400">
                  {d.date.toLocaleDateString(undefined, { weekday: 'short' })}
                </span>
              ))}
            </div>
          </div>
        </section>

        {/* Team by role */}
        <section aria-label="Team by role" className={`${card} shadow-sm`}>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Team by role</h2>
            <span className="text-xs text-slate-500 dark:text-slate-400">{overview?.active_users ?? '—'} active</span>
          </div>
          {roleCounts.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">{loading ? 'Loading…' : 'No active users yet.'}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {roleCounts.slice(0, 6).map(([role, count]) => (
                <li key={role} className="flex items-center justify-between px-5 py-2.5 text-[13px]">
                  <span className="text-slate-700 dark:text-slate-200">{humanise(role)}</span>
                  <span className="font-medium tabular-nums text-slate-900 dark:text-white">{count}</span>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label="Recent activity" className={card}>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recent activity</h2>
            <button type="button" onClick={() => onNavigate('super-admin:audit')} className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white">
              View all
            </button>
          </div>
          {events.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">{loading ? 'Loading…' : 'No activity yet.'}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {events.slice(0, 5).map((event) => (
                <li key={event.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={event.actorEmail} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] text-slate-900 dark:text-white">{humanise(event.action)}</div>
                    <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">{event.actorEmail}</div>
                  </div>
                  <span className="shrink-0 text-[11px] text-slate-400">{timeAgo(event.createdAt)}</span>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section aria-label="Newest team members" className={card}>
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-3 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Newest team members</h2>
            <button type="button" onClick={() => onNavigate('super-admin:users')} className="text-xs font-medium text-slate-500 hover:text-slate-900 dark:hover:text-white">
              Manage
            </button>
          </div>
          {users.length === 0 ? (
            <p className="px-5 py-6 text-sm text-slate-500">{loading ? 'Loading…' : 'No accounts yet.'}</p>
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {users.slice(0, 5).map((u) => (
                <li key={u.id} className="flex items-center gap-3 px-5 py-3">
                  <Avatar name={u.fullName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-slate-900 dark:text-white">{u.fullName}</div>
                    <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">{humanise(u.role)}</div>
                  </div>
                  <StatusPill tone={u.status === 'ACTIVE' ? 'emerald' : u.status === 'DISABLED' ? 'rose' : 'amber'} dot>
                    {u.status === 'PENDING_INVITE' ? 'Invited' : humanise(u.status)}
                  </StatusPill>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </DashboardPage>
  );
};
