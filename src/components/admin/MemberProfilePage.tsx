import React, { useEffect, useRef, useState } from 'react';
import { MenuItem } from '@headlessui/react';
import {
  CalendarDays,
  Check,
  Clock,
  Copy,
  Droplets,
  Eye,
  FlaskConical,
  Hash,
  Inbox,
  KeyRound,
  Mail,
  Pencil,
  Pill,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserRoundX,
  X,
} from 'lucide-react';
import { apiRequest } from '../../lib/api';
import { departmentLabel, isLabScopedRole } from '../../lib/departments';
import { DAYS_IN_LAB_WARNING } from '../laboratory/CaseFlow';
import { Button } from '../common/Dashboard';
import {
  PANEL_LINE,
  PANEL_TEXT,
  PANEL_TEXT_2,
  PANEL_TEXT_3,
  PanelMenuSeparator,
  PanelMoreMenu,
  PanelProperties,
  PanelProperty,
  SidePanel,
  panelDangerItemClass,
  panelMenuItemClass,
} from '../common/SidePanel';
import { roleLabel } from './roles';
import { MemberActions, RollEntry, STATUS, formatDate, memberStatus, timeAgo } from './MembersView';

/* ---------------------------------------------------------------------------
 * Member profile: a full page (/app/members/<id>) showing who the officer is,
 * the exhibits they are working on in every laboratory, and what they have
 * done recently (from the audit log). Opened with "View profile" from the
 * Members list or the member drawer; the browser's Back button returns.
 * --------------------------------------------------------------------------- */

type Laboratory = 'Water' | 'Narcotics' | 'Food & Drugs';

/** An exhibit assigned to the member, from any laboratory. */
interface WorkItem {
  laboratory: Laboratory;
  id: string;
  reference: string;
  title: string;
  status: string;
  receivedDate: string;
  assignedAt: string | null;
  completedAt: string | null;
  /** Findings recorded, waiting for the Head's approval. */
  inReview: boolean;
}

interface ActivityItem {
  id: string;
  action: string;
  recordType: string;
  recordId?: string | null;
  details: Record<string, unknown>;
  createdAt: string;
}

interface ProfileData {
  member: RollEntry;
  work: WorkItem[];
  activity: ActivityItem[];
  activityTotal: number;
}

type TaskFilter = 'assigned' | 'completed' | 'overdue';

const DONE = new Set(['Analysis Complete', 'Reported']);
const DAY = 86_400_000;

const LAB_STYLE: Record<Laboratory, { icon: React.ComponentType<{ className?: string }>; dot: string; tile: string }> = {
  Water: { icon: Droplets, dot: 'bg-sky-500', tile: 'bg-sky-500/15 text-sky-600 dark:text-sky-400' },
  Narcotics: { icon: Pill, dot: 'bg-violet-500', tile: 'bg-violet-500/15 text-violet-600 dark:text-violet-400' },
  'Food & Drugs': { icon: FlaskConical, dot: 'bg-amber-500', tile: 'bg-amber-500/15 text-amber-700 dark:text-amber-400' },
};

// Initials colours, picked from the name so a person always gets the same one.
const AVATAR_COLOURS = [
  'bg-rose-100 text-rose-700 dark:bg-[#4A2530] dark:text-[#E58AA8]',
  'bg-indigo-100 text-indigo-700 dark:bg-[#2B2C55] dark:text-[#A5A6F6]',
  'bg-amber-100 text-amber-800 dark:bg-[#4A3820] dark:text-[#F0B44C]',
  'bg-teal-100 text-teal-800 dark:bg-[#16403B] dark:text-[#5EEAD4]',
  'bg-sky-100 text-sky-800 dark:bg-[#1B3A52] dark:text-[#7CC4F5]',
  'bg-violet-100 text-violet-800 dark:bg-[#3A2852] dark:text-[#C4A1F5]',
];
const avatarColour = (name: string) =>
  AVATAR_COLOURS[[...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % AVATAR_COLOURS.length];
const initials = (name: string) => name.split(' ').map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase();

const CARD = `rounded-[10px] border bg-white dark:bg-[#1C1C1C] ${PANEL_LINE}`;

const dayOf = (iso: string) => new Date(`${iso.slice(0, 10)}T00:00:00`).getTime();
const today = () => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime(); };
/** Exhibits are due back from the bench within the laboratory's warning period. */
const dueDay = (item: WorkItem) => dayOf(item.receivedDate) + DAYS_IN_LAB_WARNING * DAY;
const isOverdue = (item: WorkItem) => !DONE.has(item.status) && dueDay(item) < today();
const daysInLab = (item: WorkItem) => Math.max(0, Math.round(((item.completedAt ? dayOf(item.completedAt) : today()) - dayOf(item.receivedDate)) / DAY));

/** "Thu" within this week, otherwise "9 Oct". */
const shortDay = (time: number) => {
  const offset = Math.round((time - today()) / DAY);
  if (offset === 0) return 'Today';
  if (offset === 1) return 'Tomorrow';
  if (offset === -1) return 'Yesterday';
  if (offset > 1 && offset < 7) return new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(time);
  return new Intl.DateTimeFormat(undefined, { day: 'numeric', month: 'short' }).format(time);
};

/** A calendar date (YYYY-MM-DD) as "9 Oct 2026". */
const formatDay = (iso: string) => new Intl.DateTimeFormat(undefined, { dateStyle: 'medium' }).format(dayOf(iso));

/** To do (empty), in progress (half), in review (three quarters), done (check). */
const StatusIcon: React.FC<{ item: WorkItem }> = ({ item }) => {
  if (DONE.has(item.status)) {
    return (
      <span className="flex h-3.5 w-3.5 items-center justify-center rounded-full bg-emerald-500 text-white" aria-label="Complete">
        <Check className="h-2.5 w-2.5" strokeWidth={3} />
      </span>
    );
  }
  const [label, fill, colour] = item.inReview
    ? ['In review', 270, 'text-violet-500 dark:text-[#A78BFA]']
    : item.status === 'Under Analysis'
      ? ['In progress', 180, 'text-amber-500 dark:text-[#F0B44C]']
      : ['To do', 0, 'text-slate-400 dark:text-[#6B6B6B]'];
  return (
    <svg viewBox="0 0 14 14" className={`h-3.5 w-3.5 shrink-0 ${colour}`} role="img" aria-label={label}>
      <circle cx="7" cy="7" r="6" fill="none" stroke="currentColor" strokeWidth="1.5" />
      {fill > 0 && (
        <path
          d={`M7 7 L7 3 A4 4 0 ${fill > 180 ? 1 : 0} 1 ${7 + 4 * Math.sin((fill * Math.PI) / 180)} ${7 - 4 * Math.cos((fill * Math.PI) / 180)} Z`}
          fill="currentColor"
        />
      )}
    </svg>
  );
};

/** An audit event as a short sentence: "signed in", "approved the department change", … */
const ACTION_PHRASE: Record<string, string> = {
  USER_LOGIN: 'signed in',
  USER_LOGOUT: 'signed out',
  PROFILE_UPDATED: 'updated their profile',
  PROFILE_CHANGE_REQUESTED: 'asked to change their profile',
  PROFILE_CHANGE_WITHDRAWN: 'withdrew a profile change request',
  PROFILE_CHANGE_APPROVED: 'approved a profile change',
  PROFILE_CHANGE_REJECTED: 'rejected a profile change',
  DEPARTMENT_CHANGE_REQUESTED: 'asked to move department',
  DEPARTMENT_CHANGE_WITHDRAWN: 'withdrew a department move',
  DEPARTMENT_CHANGE_APPROVED: 'approved a department move',
  DEPARTMENT_CHANGE_REJECTED: 'rejected a department move',
  PASSWORD_RESET_REQUESTED: 'asked for a password reset',
  USER_ROLE_CHANGED: 'changed a role',
  USER_DELETED: 'deleted an account',
};
const humanise = (value: string) => value.toLowerCase().replace(/_/g, ' ');
const activityPhrase = (item: ActivityItem) => ACTION_PHRASE[item.action] ?? humanise(item.action);

const Skeleton: React.FC<{ className?: string }> = ({ className = '' }) => (
  <span className={`block animate-pulse rounded-md bg-slate-200/80 dark:bg-[#2A2A2A] ${className}`} />
);

const ProfileSkeleton: React.FC = () => (
  <div aria-busy="true" aria-label="Loading profile" className="space-y-6">
    <div className="flex items-center gap-4">
      <Skeleton className="h-[72px] w-[72px] rounded-full" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-7 w-56" />
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-4 w-72" />
      </div>
    </div>
    <Skeleton className="h-[88px] w-full rounded-[10px]" />
    <div className="grid gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
      <Skeleton className="h-80 rounded-[10px]" />
      <div className="space-y-4">
        <Skeleton className="h-40 rounded-[10px]" />
        <Skeleton className="h-56 rounded-[10px]" />
      </div>
    </div>
  </div>
);

export const MemberProfilePage: React.FC<{
  memberId: string;
  currentUserId: string;
  workingId: string | null;
  actions: MemberActions;
  /** Changes after any action, so the page reloads what changed. */
  reloadKey: number;
  /** Opens the member's side panel (role & department, requests). */
  onOpenPanel: (entry: RollEntry) => void;
  onEditOwnProfile: () => void;
  onOpenAudit: () => void;
  /** Reports the member's name once loaded, for the top bar's breadcrumb. */
  onLoaded: (name: string) => void;
}> = ({ memberId, currentUserId, workingId, actions, reloadKey, onOpenPanel, onEditOwnProfile, onOpenAudit, onLoaded }) => {
  const [data, setData] = useState<ProfileData | null>(null);
  const [error, setError] = useState('');
  const [filter, setFilter] = useState<TaskFilter>('assigned');
  const [openWork, setOpenWork] = useState<WorkItem | null>(null);
  const [toast, setToast] = useState('');
  const labsRef = useRef<HTMLElement>(null);

  useEffect(() => {
    let cancelled = false;
    setError('');
    apiRequest<ProfileData>(`/api/admin/members/${encodeURIComponent(memberId)}/profile`)
      .then((result) => {
        if (cancelled) return;
        setData(result);
        onLoaded(result.member.fullName);
      })
      .catch((cause) => { if (!cancelled) setError(cause instanceof Error ? cause.message : 'The profile could not be loaded.'); });
    return () => { cancelled = true; };
  }, [memberId, reloadKey]);

  // A new member starts on their assigned work.
  useEffect(() => { setFilter('assigned'); setData(null); }, [memberId]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(''), 1800);
    return () => window.clearTimeout(id);
  }, [toast]);

  if (error) {
    return (
      <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-[#3A2622] dark:text-[#F2725A]">
        {error}
      </div>
    );
  }
  if (!data) return <ProfileSkeleton />;

  const { member, work, activity, activityTotal } = data;
  const isSelf = member.userId === currentUserId;
  const status = memberStatus(member);
  const busy = workingId === member.id;
  const open = work.filter((item) => !DONE.has(item.status));
  const completed = work.filter((item) => DONE.has(item.status));
  const overdue = open.filter(isOverdue);
  const laboratories = [...new Set<Laboratory>([
    ...work.map((item) => item.laboratory),
    ...(isLabScopedRole(member.role) && (['Water', 'Narcotics', 'Food & Drugs'] as string[]).includes(member.department) ? [member.department as Laboratory] : []),
  ])];
  const showBadge = member.role === 'SUPER_ADMIN' || member.role === 'HEAD_OF_DEPARTMENT';

  // Overdue first, then the soonest due; completed work newest first.
  const shown = (filter === 'completed' ? completed : filter === 'overdue' ? overdue : open)
    .slice()
    .sort((a, b) => filter === 'completed'
      ? (b.completedAt ?? '').localeCompare(a.completedAt ?? '')
      : Number(isOverdue(b)) - Number(isOverdue(a)) || dueDay(a) - dueDay(b));

  const copyEmail = async () => {
    try {
      await navigator.clipboard.writeText(member.email);
      setToast('Email copied');
    } catch {
      setToast('Could not copy the email');
    }
  };

  // The member's main account action, in the design's "primary" place.
  const primary =
    status === 'NO_ACCOUNT' ? { label: 'Issue account', icon: Mail, run: () => actions.onIssue(member) }
      : status === 'INVITED' ? { label: 'Resend invitation', icon: RefreshCw, run: () => actions.onResendInvite(member) }
        : status === 'DISABLED' ? { label: 'Enable account', icon: UserCheck, run: () => actions.onToggleAccount(member) }
          : status === 'LEFT' ? { label: 'Reinstate', icon: UserCheck, run: () => actions.onSetService(member, 'SERVING') }
            : { label: 'Send password reset', icon: KeyRound, run: () => actions.onResetPassword(member) };

  const presence = member.signedIn ? 'Online now' : member.lastSignInAt ? `Last seen ${timeAgo(member.lastSignInAt).toLowerCase()}` : 'Never signed in';

  const stats: { id: TaskFilter | 'labs'; label: string; value: number; danger?: boolean }[] = [
    { id: 'labs', label: 'Laboratories', value: laboratories.length },
    { id: 'assigned', label: 'Assigned exhibits', value: open.length },
    { id: 'completed', label: 'Completed', value: completed.length },
    { id: 'overdue', label: 'Overdue', value: overdue.length, danger: overdue.length > 0 },
  ];

  return (
    <div className="space-y-6">
      {/* Profile header */}
      <header className="flex flex-col gap-5 md:flex-row md:items-center md:justify-between">
        <div className="flex min-w-0 items-center gap-4">
          <span className="relative shrink-0">
            <span className={`flex h-[72px] w-[72px] items-center justify-center rounded-full text-2xl font-semibold ${avatarColour(member.fullName)}`}>
              {initials(member.fullName)}
            </span>
            {member.userId && (
              <span
                role="img"
                aria-label={member.signedIn ? 'Online' : 'Offline'}
                className={`absolute bottom-0.5 right-0.5 h-3.5 w-3.5 rounded-full ring-[3px] ring-slate-50 dark:ring-slate-950 ${member.signedIn ? 'bg-[#4CC38A]' : 'bg-slate-400 dark:bg-[#6B6B6B]'}`}
              />
            )}
          </span>
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className={`truncate text-[26px] font-semibold leading-tight ${PANEL_TEXT}`}>
                {member.fullName}{isSelf && <span className={`ml-2 text-base font-normal ${PANEL_TEXT_2}`}>(you)</span>}
              </h1>
              {showBadge && (
                <span className={`rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium dark:bg-[#2A2A2A] ${PANEL_TEXT_2}`}>
                  {member.role === 'SUPER_ADMIN' ? 'Super admin' : 'Head'}
                </span>
              )}
              {status !== 'ACTIVE' && (
                <span className={`rounded px-1.5 py-0.5 text-xs font-medium ${status === 'DISABLED' || status === 'LEFT' ? 'bg-rose-50 text-rose-700 dark:bg-[#3A2622] dark:text-[#F2725A]' : 'bg-amber-50 text-amber-800 dark:bg-amber-500/10 dark:text-[#F0B44C]'}`}>
                  {STATUS[status].label}
                </span>
              )}
            </div>
            <p className={`mt-0.5 text-[15px] ${PANEL_TEXT_2}`}>{roleLabel(member.role)} · {departmentLabel(member.department)}</p>
            <ul className={`mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[13px] ${PANEL_TEXT_2}`}>
              <li className="flex min-w-0 items-center gap-1.5"><Mail className="h-4 w-4 shrink-0" /><span className="truncate">{member.email}</span></li>
              <li className="flex items-center gap-1.5"><Hash className="h-4 w-4 shrink-0" /><span className="font-mono text-xs">{member.staffNumber}</span></li>
              <li className="flex items-center gap-1.5">
                <Clock className="h-4 w-4 shrink-0" />
                <span title={member.lastSignInAt ? formatDate(member.lastSignInAt) : undefined}>{presence}</span>
              </li>
            </ul>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 md:flex-nowrap">
          {isSelf ? (
            <Button icon={Pencil} onClick={onEditOwnProfile}>Edit profile</Button>
          ) : (
            <>
              <Button icon={Copy} onClick={() => void copyEmail()}>Copy email</Button>
              <Button variant="primary" icon={primary.icon} disabled={busy} onClick={primary.run} className="max-md:flex-1">{primary.label}</Button>
              <PanelMoreMenu>
                <MenuItem>
                  <button type="button" className={panelMenuItemClass} onClick={() => onOpenPanel(member)}>
                    <Eye className="h-4 w-4 opacity-60" /> Open side panel
                  </button>
                </MenuItem>
                {member.userId && (
                  <MenuItem>
                    <button type="button" className={panelMenuItemClass} onClick={() => onOpenPanel(member)}>
                      <ShieldCheck className="h-4 w-4 opacity-60" /> Change role
                    </button>
                  </MenuItem>
                )}
                <MenuItem>
                  <button type="button" className={panelMenuItemClass} onClick={() => actions.onEdit(member)}>
                    <Pencil className="h-4 w-4 opacity-60" /> Edit roll details
                  </button>
                </MenuItem>
                {member.userId && (status === 'ACTIVE' || status === 'DISABLED') && (
                  <MenuItem>
                    <button type="button" className={panelMenuItemClass} onClick={() => actions.onToggleAccount(member)}>
                      {status === 'DISABLED'
                        ? <><UserCheck className="h-4 w-4 opacity-60" /> Enable account</>
                        : <><UserRoundX className="h-4 w-4 opacity-60" /> Disable account</>}
                    </button>
                  </MenuItem>
                )}
                <MenuItem>
                  <button type="button" className={panelMenuItemClass} onClick={() => actions.onSetService(member, member.employmentStatus === 'SERVING' ? 'LEFT' : 'SERVING')}>
                    {member.employmentStatus === 'SERVING'
                      ? <><UserRoundX className="h-4 w-4 opacity-60" /> Mark as left service</>
                      : <><UserCheck className="h-4 w-4 opacity-60" /> Reinstate</>}
                  </button>
                </MenuItem>
                <PanelMenuSeparator />
                <MenuItem>
                  <button type="button" className={panelDangerItemClass} onClick={() => actions.onDelete(member)}>
                    <Trash2 className="h-4 w-4" /> {member.userId ? 'Delete user' : 'Remove from roll'}
                  </button>
                </MenuItem>
              </PanelMoreMenu>
            </>
          )}
        </div>
      </header>

      {/* Stats strip: each cell filters the work list below */}
      <div className={`grid grid-cols-2 overflow-hidden md:grid-cols-4 ${CARD}`}>
        {stats.map((stat, index) => {
          const pressed = stat.id !== 'labs' && filter === stat.id;
          return (
            <button
              key={stat.id}
              type="button"
              aria-pressed={stat.id === 'labs' ? undefined : pressed}
              onClick={() => (stat.id === 'labs' ? labsRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }) : setFilter(stat.id))}
              className={`flex min-h-[88px] cursor-pointer flex-col justify-center gap-1 px-5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-[#222] ${PANEL_LINE} ${
                index % 2 === 1 ? 'border-l' : ''
              } ${index >= 2 ? 'border-t md:border-t-0' : ''} ${index === 2 ? 'md:border-l' : ''} ${pressed ? 'bg-slate-50 dark:bg-[#222]' : ''}`}
            >
              <span className={`text-[13px] ${PANEL_TEXT_2}`}>{stat.label}</span>
              <span className={`text-2xl font-bold tabular-nums ${stat.danger ? 'text-rose-600 dark:text-[#F2725A]' : PANEL_TEXT}`}>{stat.value}</span>
            </button>
          );
        })}
      </div>

      <div className="grid items-start gap-6 lg:grid-cols-[minmax(0,3fr)_minmax(0,2fr)]">
        {/* Work card */}
        <section aria-label="Exhibits" className={`overflow-hidden ${CARD}`}>
          <div className={`flex items-center justify-between gap-3 border-b px-4 ${PANEL_LINE}`}>
            <div role="tablist" aria-label="Exhibits" className="flex gap-5">
              {([['assigned', 'Assigned', open.length], ['completed', 'Completed', completed.length]] as const).map(([id, label, count]) => {
                const active = id === 'completed' ? filter === 'completed' : filter !== 'completed';
                return (
                  <button
                    key={id}
                    type="button"
                    role="tab"
                    aria-selected={active}
                    onClick={() => setFilter(id)}
                    className={`-mb-px cursor-pointer border-b-2 py-3 text-sm transition-colors ${
                      active ? `border-slate-900 font-medium dark:border-[#EDEDED] ${PANEL_TEXT}` : `border-transparent ${PANEL_TEXT_2} hover:text-slate-900 dark:hover:text-[#EDEDED]`
                    }`}
                  >
                    {label} · {count}
                  </button>
                );
              })}
            </div>
            {filter === 'overdue' && (
              <button
                type="button"
                onClick={() => setFilter('assigned')}
                className="inline-flex cursor-pointer items-center gap-1 rounded-md bg-rose-50 px-2 py-1 text-xs font-medium text-rose-700 dark:bg-[#3A2622] dark:text-[#F2725A]"
              >
                Overdue only <X className="h-3 w-3" />
              </button>
            )}
          </div>

          {shown.length === 0 ? (
            <div className="flex flex-col items-center gap-2 px-6 py-12 text-center">
              <Inbox className={`h-8 w-8 ${PANEL_TEXT_3}`} />
              <p className={`text-sm font-medium ${PANEL_TEXT}`}>
                {filter === 'completed' ? 'Nothing completed yet' : filter === 'overdue' ? 'Nothing overdue' : 'No assigned exhibits'}
              </p>
              <p className={`max-w-sm text-xs ${PANEL_TEXT_2}`}>
                {filter === 'completed'
                  ? 'Exhibits this officer finishes analysing appear here.'
                  : 'Heads of Department allocate exhibits to analysts from the laboratory workspace.'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-200 dark:divide-[#2A2A2A]">
              {shown.map((item) => {
                const late = isOverdue(item);
                return (
                  <li key={`${item.laboratory}-${item.id}`}>
                    <button
                      type="button"
                      onClick={() => setOpenWork(item)}
                      className="flex h-11 w-full cursor-pointer items-center gap-3 px-4 text-left transition-colors hover:bg-slate-50 dark:hover:bg-[#222]"
                    >
                      <StatusIcon item={item} />
                      <span className="flex min-w-0 flex-1 items-baseline gap-2">
                        <span className={`shrink-0 font-mono text-xs ${PANEL_TEXT_2}`}>{item.reference}</span>
                        <span className={`truncate text-sm ${PANEL_TEXT}`}>{item.title}</span>
                      </span>
                      <span className={`hidden w-32 shrink-0 items-center gap-1.5 text-[13px] sm:flex ${PANEL_TEXT_2}`}>
                        <span className={`h-2 w-2 shrink-0 rounded-full ${LAB_STYLE[item.laboratory].dot}`} aria-hidden="true" />
                        <span className="truncate">{departmentLabel(item.laboratory)}</span>
                      </span>
                      <span className={`hidden w-16 shrink-0 text-right text-[13px] tabular-nums md:block ${PANEL_TEXT_2}`} title="Days in the laboratory">
                        {daysInLab(item)}d
                      </span>
                      <span
                        className={`w-16 shrink-0 text-right text-[13px] tabular-nums ${late ? 'font-medium text-rose-600 dark:text-[#F2725A]' : PANEL_TEXT_2}`}
                        title={filter === 'completed' ? 'Completed' : `Due ${formatDate(new Date(dueDay(item)).toISOString())}`}
                      >
                        {filter === 'completed' && item.completedAt ? shortDay(dayOf(item.completedAt)) : shortDay(dueDay(item))}
                      </span>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        <div className="space-y-4">
          {/* Laboratories card */}
          <section ref={labsRef} aria-labelledby="profile-labs" className={`scroll-mt-6 overflow-hidden ${CARD}`}>
            <h2 id="profile-labs" className={`px-4 pb-2 pt-4 text-[15px] font-semibold ${PANEL_TEXT}`}>Laboratories</h2>
            {laboratories.length === 0 ? (
              <p className={`px-4 pb-4 text-[13px] ${PANEL_TEXT_2}`}>
                {isLabScopedRole(member.role) ? 'No exhibits in any laboratory yet.' : `${roleLabel(member.role)} works institution-wide, in ${departmentLabel(member.department)}.`}
              </p>
            ) : (
              <ul className="pb-2">
                {laboratories.map((laboratory) => {
                  const { icon: Icon, tile } = LAB_STYLE[laboratory];
                  const openHere = open.filter((item) => item.laboratory === laboratory).length;
                  const posted = member.department === laboratory;
                  return (
                    <li key={laboratory} className="flex h-11 items-center gap-3 px-4 transition-colors hover:bg-slate-50 dark:hover:bg-[#222]">
                      <span className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-md ${tile}`}><Icon className="h-4 w-4" /></span>
                      <span className={`min-w-0 flex-1 truncate text-sm ${PANEL_TEXT}`}>{departmentLabel(laboratory)}</span>
                      <span className={`shrink-0 text-[13px] ${PANEL_TEXT_2}`}>
                        {posted ? (member.role === 'HEAD_OF_DEPARTMENT' ? 'Head' : roleLabel(member.role)) : 'Earlier work'}
                        {openHere > 0 && ` · ${openHere} open`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </section>

          {/* Recent activity card */}
          <section aria-labelledby="profile-activity" className={`overflow-hidden ${CARD}`}>
            <h2 id="profile-activity" className={`px-4 pb-2 pt-4 text-[15px] font-semibold ${PANEL_TEXT}`}>Recent activity</h2>
            {activity.length === 0 ? (
              <p className={`px-4 pb-4 text-[13px] ${PANEL_TEXT_2}`}>{member.userId ? 'Nothing recorded yet.' : 'No account, so no activity is recorded.'}</p>
            ) : (
              <ol className="space-y-3 px-4 pb-4 pt-1">
                {activity.map((item) => (
                  <li key={item.id} className="flex items-start gap-2.5">
                    <span className={`mt-px flex h-[22px] w-[22px] shrink-0 items-center justify-center rounded-full text-[9px] font-semibold ${avatarColour(member.fullName)}`}>
                      {initials(member.fullName)}
                    </span>
                    <p className={`line-clamp-2 min-w-0 flex-1 text-[13px] leading-5 ${PANEL_TEXT_2}`}>
                      <span className={`font-medium ${PANEL_TEXT}`}>{member.fullName}</span> {activityPhrase(item)}
                      {item.recordId && item.recordType !== 'session' && (
                        <> · <span className={`font-mono text-xs font-medium ${PANEL_TEXT}`}>{item.recordId.length > 18 ? `${item.recordId.slice(0, 8)}…` : item.recordId}</span></>
                      )}
                    </p>
                    <time dateTime={item.createdAt} title={formatDate(item.createdAt)} className={`shrink-0 text-[13px] ${PANEL_TEXT_3}`}>
                      {shortDay(new Date(item.createdAt).setHours(0, 0, 0, 0))}
                    </time>
                  </li>
                ))}
              </ol>
            )}
            {activityTotal > activity.length && (
              <button
                type="button"
                onClick={onOpenAudit}
                className={`w-full cursor-pointer border-t px-4 py-2.5 text-left text-[13px] font-medium text-amber-700 hover:bg-slate-50 dark:text-amber-400 dark:hover:bg-[#222] ${PANEL_LINE}`}
              >
                View all activity ({activityTotal})
              </button>
            )}
          </section>
        </div>
      </div>

      {/* An exhibit opened from the list */}
      <SidePanel
        open={!!openWork}
        onClose={() => setOpenWork(null)}
        section={openWork ? departmentLabel(openWork.laboratory) : ''}
        recordId={openWork?.reference}
        titleId="profile-exhibit-title"
        scrollKey={openWork?.id}
      >
        {openWork && (
          <div className="space-y-6 px-4 py-6 sm:px-6">
            <div className="flex items-center gap-3">
              <span className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${LAB_STYLE[openWork.laboratory].tile}`}>
                {React.createElement(LAB_STYLE[openWork.laboratory].icon, { className: 'h-5 w-5' })}
              </span>
              <div className="min-w-0">
                <h2 id="profile-exhibit-title" className={`truncate text-[22px] font-semibold leading-tight ${PANEL_TEXT}`}>{openWork.title}</h2>
                <p className={`text-[13px] ${PANEL_TEXT_2}`}>Assigned to {member.fullName}</p>
              </div>
            </div>
            <PanelProperties>
              <PanelProperty icon={Hash} label="Reference"><span className="font-mono text-xs">{openWork.reference}</span></PanelProperty>
              <PanelProperty icon={FlaskConical} label="Laboratory">{departmentLabel(openWork.laboratory)}</PanelProperty>
              <PanelProperty icon={Check} label="Status">
                <StatusIcon item={openWork} /> {openWork.inReview ? 'Findings awaiting approval' : openWork.status}
              </PanelProperty>
              <PanelProperty icon={CalendarDays} label="Received">{formatDay(openWork.receivedDate)}</PanelProperty>
              <PanelProperty icon={UserCheck} label="Assigned">{openWork.assignedAt ? formatDate(openWork.assignedAt) : <span className={PANEL_TEXT_3}>—</span>}</PanelProperty>
              <PanelProperty icon={Clock} label={DONE.has(openWork.status) ? 'Completed' : 'Due'}>
                {DONE.has(openWork.status)
                  ? (openWork.completedAt ? formatDate(openWork.completedAt) : '—')
                  : <span className={isOverdue(openWork) ? 'font-medium text-rose-600 dark:text-[#F2725A]' : ''}>{shortDay(dueDay(openWork))}{isOverdue(openWork) ? ' (overdue)' : ''}</span>}
              </PanelProperty>
              <PanelProperty icon={CalendarDays} label="Days in lab">{daysInLab(openWork)}</PanelProperty>
            </PanelProperties>
          </div>
        )}
      </SidePanel>

      <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center">
        {toast && <div className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-lg dark:bg-[#EDEDED] dark:text-[#1C1C1C]">{toast}</div>}
      </div>
    </div>
  );
};
