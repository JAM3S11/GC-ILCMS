import React, { useEffect, useRef, useState } from 'react';
import {
  ArrowRight,
  ArrowRightLeft,
  Hourglass,
  Bell,
  BellOff,
  Check,
  KeyRound,
  Lock,
  LogOut,
  Mail,
  Monitor,
  Moon,
  Palette,
  RotateCcw,
  ShieldCheck,
  Sun,
  UserRound,
} from 'lucide-react';
import { Button, DashboardHeader, DashboardPage, StatusPill, UserAvatar } from '../common/Dashboard';
import { useTheme, type ThemeMode } from '../../theme/ThemeProvider';
import type { LaboratoryDepartment, User, UserRole } from '../../types';
import { apiRequest } from '../../lib/api';
import { Select } from '../common/Select';
import { departmentLabel, departmentsForRole, isLabScopedRole } from '../../lib/departments';
import { roleLabel } from '../admin/roles';
import {
  ACCENT_OPTIONS,
  AVATAR_OPTIONS,
  DEFAULT_APPEARANCE,
  applyAppearance,
  isAccentColor,
  isAvatarColor,
  isDensity,
  isMotionPreference,
  type Density,
  type MotionPreference,
} from '../../lib/appearance';

const STORAGE_PREFIX = 'gc-ilcms-user-settings:';

const DEFAULT_SETTINGS = {
  themeMode: 'light' as ThemeMode,
  emailNotifications: true,
  desktopNotifications: true,
  ...DEFAULT_APPEARANCE,
};

type UserSettings = typeof DEFAULT_SETTINGS;

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'system';

const bool = (value: unknown, fallback: boolean) => (typeof value === 'boolean' ? value : fallback);

export const readUserSettings = (userId: string): UserSettings => {
  try {
    const stored = window.localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (!stored) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(stored) as Partial<UserSettings>;
    return {
      themeMode: isThemeMode(parsed.themeMode) ? parsed.themeMode : DEFAULT_SETTINGS.themeMode,
      emailNotifications: bool(parsed.emailNotifications, DEFAULT_SETTINGS.emailNotifications),
      desktopNotifications: bool(parsed.desktopNotifications, DEFAULT_SETTINGS.desktopNotifications),
      accent: isAccentColor(parsed.accent) ? parsed.accent : DEFAULT_SETTINGS.accent,
      sidebarDensity: isDensity(parsed.sidebarDensity) ? parsed.sidebarDensity : DEFAULT_SETTINGS.sidebarDensity,
      listDensity: isDensity(parsed.listDensity) ? parsed.listDensity : DEFAULT_SETTINGS.listDensity,
      motion: isMotionPreference(parsed.motion) ? parsed.motion : DEFAULT_SETTINGS.motion,
      avatarColor: isAvatarColor(parsed.avatarColor) ? parsed.avatarColor : DEFAULT_SETTINGS.avatarColor,
    };
  } catch {
    return { ...DEFAULT_SETTINGS };
  }
};

const writeUserSettings = (userId: string, settings: UserSettings) => {
  try {
    window.localStorage.setItem(`${STORAGE_PREFIX}${userId}`, JSON.stringify(settings));
  } catch {
    return;
  }
};

/* ------------------------------- Sections ------------------------------- */

type SectionId = 'profile' | 'appearance' | 'notifications' | 'security';

const SECTIONS: Record<SectionId, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  appearance: { label: 'Appearance', icon: Palette },
  profile: { label: 'Profile', icon: UserRound },
  notifications: { label: 'Email & alerts', icon: Bell },
  security: { label: 'Password & sign-in', icon: ShieldCheck },
};

/** The sidebar groups, each under an uppercase caption. */
const NAV_GROUPS: { label: string; items: SectionId[] }[] = [
  { label: 'General', items: ['appearance'] },
  { label: 'Personal', items: ['profile'] },
  { label: 'Notifications', items: ['notifications'] },
  { label: 'Security', items: ['security'] },
];

const NAV_ORDER = NAV_GROUPS.flatMap((group) => group.items);

const THEME_OPTIONS: { mode: ThemeMode; label: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { mode: 'light', label: 'Light', Icon: Sun },
  { mode: 'dark', label: 'Dark', Icon: Moon },
  { mode: 'system', label: 'System', Icon: Monitor },
];

const DENSITY_OPTIONS: { value: Density; label: string }[] = [
  { value: 'comfortable', label: 'Comfortable' },
  { value: 'compact', label: 'Compact' },
];

const MOTION_OPTIONS: { value: MotionPreference; label: string }[] = [
  { value: 'system', label: 'Follow system' },
  { value: 'reduce', label: 'Reduce motion' },
];

/* --------------------------- Shared building blocks --------------------------- */

/** Every settings page opens with the same title and one-line description. */
const PageHeader: React.FC<{ title: string; description: string }> = ({ title, description }) => (
  <header>
    <h2 className="text-2xl font-bold tracking-tight text-slate-900 dark:text-white">{title}</h2>
    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">{description}</p>
  </header>
);

/** A list of settings rows, separated by thin lines. */
const ROWS = 'divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800';

/** A value the user can see but not edit (the administrator manages it), styled like a form field. */
const ReadOnlyField: React.FC<{ id: string; label: string; value: string; hint?: string }> = ({ id, label, value, hint }) => (
  <div>
    <label htmlFor={id} className="mb-1.5 block text-sm font-medium text-slate-900 dark:text-white">{label}</label>
    <div className="relative">
      <input
        id={id}
        readOnly
        value={value}
        aria-describedby={hint ? `${id}-hint` : undefined}
        className="h-10 w-full cursor-default truncate rounded-lg border border-slate-200 bg-slate-50 pl-3 pr-9 text-sm text-slate-700 focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"
      />
      <Lock className="pointer-events-none absolute right-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" aria-hidden="true" />
    </div>
    {hint && <p id={`${id}-hint`} className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
  </div>
);

/** Editable text inputs and textareas, matching the read-only fields. */
const FIELD_CLASS =
  'w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 placeholder:text-slate-400 transition-colors focus:border-amber-500 focus:outline-none focus:ring-2 focus:ring-amber-500/20 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

/** A labelled form field: label above, the control, then an optional hint or error. */
const Field: React.FC<{ htmlFor?: string; label: string; optional?: boolean; hint?: React.ReactNode; error?: string; children: React.ReactNode }> = ({
  htmlFor,
  label,
  optional,
  hint,
  error,
  children,
}) => (
  <div>
    <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-medium text-slate-900 dark:text-white">
      {label} {optional && <span className="font-normal text-slate-400">(optional)</span>}
    </label>
    {children}
    {error
      ? <p role="alert" className="mt-1.5 text-xs text-rose-600 dark:text-rose-400">{error}</p>
      : hint && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{hint}</p>}
  </div>
);

/** A message under a form: green when it worked, red when it did not. */
const Notice: React.FC<{ tone: 'ok' | 'error'; children: React.ReactNode }> = ({ tone, children }) => (
  <p
    role={tone === 'ok' ? 'status' : 'alert'}
    className={`rounded-lg px-3 py-2.5 text-xs ${tone === 'ok' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200' : 'bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200'}`}
  >
    {children}
  </p>
);

/**
 * A request waiting for the Super Admin: what was asked for, when, and a way to withdraw it
 * (with a confirmation step so it is not withdrawn by accident).
 */
const PendingRequest: React.FC<{
  sentAt: string;
  children: React.ReactNode;
  confirming: boolean;
  withdrawing: boolean;
  onAskWithdraw: () => void;
  onCancelWithdraw: () => void;
  onWithdraw: () => void;
}> = ({ sentAt, children, confirming, withdrawing, onAskWithdraw, onCancelWithdraw, onWithdraw }) => (
  <div role="status" className="rounded-xl border border-amber-300 bg-amber-50/60 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
    <div className="flex items-start gap-3">
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-slate-950">
        <Hourglass className="h-4 w-4" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold text-slate-900 dark:text-white">Awaiting Super Admin review</p>
        <p className="mt-0.5 text-xs text-slate-600 dark:text-slate-300">
          Sent {formatDateTime(sentAt)}. Nothing changes until it is approved, and you'll get a notification with the decision.
        </p>
      </div>
    </div>
    <div className="mt-3">{children}</div>
    <div className="mt-4 flex flex-wrap items-center justify-end gap-2 border-t border-amber-200 pt-3 dark:border-amber-500/30">
      {confirming ? (
        <>
          <span className="mr-auto text-xs font-medium text-slate-700 dark:text-slate-200">Withdraw this request? The Super Admin will no longer see it.</span>
          <Button size="sm" variant="ghost" disabled={withdrawing} onClick={onCancelWithdraw}>Keep it</Button>
          <Button size="sm" variant="danger" disabled={withdrawing} onClick={onWithdraw}>{withdrawing ? 'Withdrawing…' : 'Yes, withdraw'}</Button>
        </>
      ) : (
        <Button size="sm" variant="secondary" onClick={onAskWithdraw}>Withdraw request</Button>
      )}
    </div>
  </div>
);

/** Earlier requests and how they ended. */
const RequestHistory: React.FC<{ items: { id: string; summary: React.ReactNode; meta: React.ReactNode; status: 'APPROVED' | 'REJECTED' | 'WITHDRAWN' | 'PENDING' }[] }> = ({ items }) => (
  <div>
    <h4 className="text-[11px] font-semibold uppercase tracking-wider text-slate-500">Previous requests</h4>
    <ul className={`mt-2 ${ROWS}`}>
      {items.map((item) => (
        <li key={item.id} className="flex flex-wrap items-center justify-between gap-2 py-3">
          <div className="min-w-0">
            <div className="text-[13px] text-slate-800 dark:text-slate-200">{item.summary}</div>
            <div className="text-[11px] text-slate-500 dark:text-slate-400">{item.meta}</div>
          </div>
          <StatusPill tone={item.status === 'APPROVED' ? 'emerald' : item.status === 'WITHDRAWN' ? 'slate' : 'rose'}>
            {item.status === 'APPROVED' ? 'Approved' : item.status === 'WITHDRAWN' ? 'Withdrawn' : 'Not approved'}
          </StatusPill>
        </li>
      ))}
    </ul>
  </div>
);

/** A row of round colour swatches; the chosen one shows a check and its name. */
function SwatchPicker<T extends string>({ labelledBy, options, value, onChange }: {
  labelledBy: string;
  options: { value: T; label: string; swatch: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-labelledby={labelledBy} className="flex flex-wrap items-center gap-3">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            aria-label={option.label}
            title={option.label}
            onClick={() => onChange(option.value)}
            style={{ background: option.swatch }}
            className={`flex h-7 w-7 cursor-pointer items-center justify-center rounded-full transition-transform hover:scale-110 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-slate-400 ${
              active ? 'ring-2 ring-slate-900 ring-offset-2 ring-offset-white dark:ring-white dark:ring-offset-slate-950' : ''
            }`}
          >
            {active && <Check className="h-3.5 w-3.5 text-white" strokeWidth={3} />}
          </button>
        );
      })}
      <span className="ml-1 text-xs font-medium text-slate-600 dark:text-slate-300">
        {options.find((option) => option.value === value)?.label}
      </span>
    </div>
  );
}

const Switch: React.FC<{ id?: string; checked: boolean; onChange: (checked: boolean) => void; label: string }> = ({ id, checked, onChange, label }) => (
  <button
    id={id}
    type="button"
    role="switch"
    aria-checked={checked}
    aria-label={label}
    onClick={() => onChange(!checked)}
    className={`relative inline-flex h-6 w-11 cursor-pointer items-center rounded-full transition-colors focus:outline-none focus-visible:ring-4 focus-visible:ring-amber-500/30 ${
      checked ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-700'
    }`}
  >
    <span className={`inline-block h-5 w-5 rounded-full bg-white shadow transition-transform ${checked ? 'translate-x-[22px]' : 'translate-x-0.5'}`} />
    <span className="sr-only">{checked ? 'On' : 'Off'}</span>
  </button>
);

/**
 * A miniature of the workspace in each theme: sidebar, top bar, cards and a primary button, all in
 * the current accent colour. "System" shows half light, half dark.
 */
const ThemePreview: React.FC<{ mode: ThemeMode }> = ({ mode }) => {
  const pane = (dark: boolean) => {
    const card = dark ? 'bg-slate-900 ring-1 ring-slate-800' : 'bg-white ring-1 ring-slate-200';
    return (
      <div className={`flex h-full min-w-0 flex-1 ${dark ? 'bg-slate-950' : 'bg-slate-50'}`}>
        <div className={`flex w-[30%] flex-col gap-1 border-r p-1.5 ${dark ? 'border-slate-800 bg-slate-900' : 'border-slate-200 bg-white'}`}>
          <div className="mb-1 h-1.5 w-3/4 rounded-full bg-amber-500" />
          {[78, 64, 70, 52].map((width, index) => (
            <div
              key={width}
              className={`h-1 rounded-full ${index === 0 ? (dark ? 'bg-slate-600' : 'bg-slate-300') : dark ? 'bg-slate-800' : 'bg-slate-200'}`}
              style={{ width: `${width}%` }}
            />
          ))}
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-1.5 p-1.5">
          <div className="flex items-center justify-between gap-1">
            <div className={`h-1.5 w-2/5 rounded-full ${dark ? 'bg-slate-700' : 'bg-slate-300'}`} />
            <div className="h-2 w-5 rounded-sm bg-amber-500" />
          </div>
          <div className="grid flex-1 grid-cols-2 gap-1">
            <div className={`rounded ${card}`} />
            <div className={`rounded ${card}`} />
          </div>
          <div className={`h-3 rounded ${card}`} />
        </div>
      </div>
    );
  };
  return (
    <div className="flex h-24 overflow-hidden rounded-lg ring-1 ring-slate-200 dark:ring-slate-800" aria-hidden="true">
      {mode === 'system' ? (
        <>
          {pane(false)}
          {pane(true)}
        </>
      ) : (
        pane(mode === 'dark')
      )}
    </div>
  );
};

/** Two or three mutually exclusive choices shown side by side, e.g. Comfortable | Compact. */
function Segmented<T extends string>({ label, value, options, onChange }: {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-0.5 dark:border-slate-800 dark:bg-slate-950">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => { if (!active) onChange(option.value); }}
            className={`h-8 cursor-pointer rounded-md px-3 text-[13px] font-medium transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 ${
              active
                ? 'bg-white text-slate-900 shadow-sm ring-1 ring-slate-200 dark:bg-slate-800 dark:text-white dark:ring-slate-700'
                : 'text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white'
            }`}
          >
            {option.label}
          </button>
        );
      })}
    </div>
  );
}

/** A setting in a plain list (no card): label and hint on the left, the control on the right. */
const PlainRow: React.FC<{ title: string; hint: React.ReactNode; htmlFor?: string; children: React.ReactNode }> = ({ title, hint, htmlFor, children }) => (
  <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
    <div className="min-w-0">
      {htmlFor
        ? <label htmlFor={htmlFor} className="text-sm font-medium text-slate-900 dark:text-white">{title}</label>
        : <div className="text-sm font-medium text-slate-900 dark:text-white">{title}</div>}
      <div className="mt-0.5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{hint}</div>
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

/** A titled block within a settings page. */
const SettingsGroup: React.FC<{ id: string; title: string; children: React.ReactNode }> = ({ id, title, children }) => (
  <section aria-labelledby={id}>
    <h3 id={id} className="mb-4 text-sm font-semibold text-slate-700 dark:text-slate-300">{title}</h3>
    {children}
  </section>
);

/* --------------------------------- View --------------------------------- */

interface SettingsViewProps {
  currentUser: User;
  onSignOut: () => void;
  /** The server ended every session for this user (e.g. after requesting a move). */
  onSessionEnded: (message: string) => void;
  /** The Super Admin saved their own name or email; the app should show the new details. */
  onProfileUpdated: (user: User) => void;
}

/** One of the signed-in officer's requests to change their name, title or email. */
interface ProfileRequest {
  id: string;
  currentFullName: string;
  currentEmail: string;
  currentRole: UserRole;
  requestedFullName: string | null;
  requestedEmail: string | null;
  requestedRole: UserRole | null;
  reason?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
  createdAt: string;
  decisionAt?: string | null;
  decidedBy?: string | null;
}

/** The changes a profile request asks for, as "Full name: old → new" lines. */
const profileChanges = (request: ProfileRequest) => [
  request.requestedFullName && { label: 'Full name', from: request.currentFullName, to: request.requestedFullName },
  request.requestedRole && { label: 'Title', from: roleLabel(request.currentRole), to: roleLabel(request.requestedRole) },
  request.requestedEmail && { label: 'Email', from: request.currentEmail, to: request.requestedEmail },
].filter((change): change is { label: string; from: string; to: string } => Boolean(change));

/** One of the signed-in user's department change requests. */
interface DepartmentRequest {
  id: string;
  currentDepartment: LaboratoryDepartment;
  requestedDepartment: LaboratoryDepartment;
  reason?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
  createdAt: string;
  decisionAt?: string | null;
  decidedBy?: string | null;
}

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

type BrowserPermission =NotificationPermission | 'unsupported';

const browserPermission = (): BrowserPermission =>
  typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, onSignOut, onSessionEnded, onProfileUpdated }) => {
  const { setMode } = useTheme();
  const [section, setSection] = useState<SectionId>('appearance');
  const [settings, setSettings] = useState<UserSettings>(() => readUserSettings(currentUser.id));
  const [saved, setSaved] = useState(false);
  const savedTimer = useRef<number | null>(null);
  const [permission, setPermission] = useState<BrowserPermission>(browserPermission);

  const [requestedDepartment, setRequestedDepartment] = useState<LaboratoryDepartment | ''>('');
  const [departmentReason, setDepartmentReason] = useState('');
  const [departmentRequest, setDepartmentRequest] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [departmentRequestSaving, setDepartmentRequestSaving] = useState(false);
  const [myRequests, setMyRequests] = useState<DepartmentRequest[] | null>(null);
  const canRequestMove = isLabScopedRole(currentUser.role);
  const isSuperAdmin = currentUser.role === 'SUPER_ADMIN';

  // The Super Admin edits their own name and email directly. Changing the email asks for the password.
  const [profileName, setProfileName] = useState(currentUser.name);
  const [profileEmail, setProfileEmail] = useState(currentUser.email);
  const [profilePassword, setProfilePassword] = useState('');
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileNotice, setProfileNotice] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  useEffect(() => {
    setProfileName(currentUser.name);
    setProfileEmail(currentUser.email);
  }, [currentUser.name, currentUser.email]);
  const emailEdited = profileEmail.trim().toLowerCase() !== currentUser.email.toLowerCase();
  const profileEdited = profileName.trim() !== currentUser.name || emailEdited;

  const saveOwnProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    setProfileSaving(true);
    setProfileNotice(null);
    try {
      const { user, message } = await apiRequest<{ user: User; message: string }>('/api/account/profile', {
        method: 'PATCH',
        body: JSON.stringify({ fullName: profileName, email: profileEmail, currentPassword: emailEdited ? profilePassword : undefined }),
      });
      setProfilePassword('');
      setProfileNotice({ tone: 'ok', text: message });
      onProfileUpdated(user);
    } catch (cause) {
      setProfileNotice({ tone: 'error', text: cause instanceof Error ? cause.message : 'Your profile could not be saved.' });
    } finally {
      setProfileSaving(false);
    }
  };

  // Everyone else asks the Super Admin to change their name, title or email.
  const [profileRequests, setProfileRequests] = useState<ProfileRequest[] | null>(null);
  const [requestableRoles, setRequestableRoles] = useState<UserRole[]>([]);
  const [draftingChange, setDraftingChange] = useState(false);
  const [draftName, setDraftName] = useState(currentUser.name);
  const [draftRole, setDraftRole] = useState<UserRole>(currentUser.role);
  const [draftEmail, setDraftEmail] = useState(currentUser.email);
  const [draftReason, setDraftReason] = useState('');
  const [changeSaving, setChangeSaving] = useState(false);
  const [changeError, setChangeError] = useState('');
  const [confirmChangeWithdraw, setConfirmChangeWithdraw] = useState(false);
  const [changeWithdrawing, setChangeWithdrawing] = useState(false);

  const loadProfileRequests = () =>
    apiRequest<{ requests: ProfileRequest[]; requestableRoles: UserRole[] }>('/api/account/profile-change-requests')
      .then(({ requests, requestableRoles: roles }) => {
        setProfileRequests(requests);
        setRequestableRoles(roles);
      });

  // Reloaded when the account changes, i.e. after an approval.
  useEffect(() => {
    if (isSuperAdmin) return;
    loadProfileRequests().catch(() => setProfileRequests([]));
  }, [isSuperAdmin, currentUser.id, currentUser.name, currentUser.email, currentUser.role]);

  const pendingChange = profileRequests?.find((request) => request.status === 'PENDING');
  const decidedChanges = profileRequests?.filter((request) => request.status !== 'PENDING') ?? [];
  const draftChanged =
    draftName.trim() !== currentUser.name ||
    draftRole !== currentUser.role ||
    draftEmail.trim().toLowerCase() !== currentUser.email.toLowerCase();

  const startDraft = () => {
    setDraftName(currentUser.name);
    setDraftRole(currentUser.role);
    setDraftEmail(currentUser.email);
    setDraftReason('');
    setChangeError('');
    setDraftingChange(true);
  };

  const submitProfileChange = async (event: React.FormEvent) => {
    event.preventDefault();
    setChangeSaving(true);
    setChangeError('');
    try {
      const { request } = await apiRequest<{ request: ProfileRequest }>('/api/account/profile-change-requests', {
        method: 'POST',
        body: JSON.stringify({ fullName: draftName, role: draftRole, email: draftEmail, reason: draftReason }),
      });
      setProfileRequests((previous) => [request, ...(previous ?? [])]);
      setDraftingChange(false);
    } catch (cause) {
      setChangeError(cause instanceof Error ? cause.message : 'The request could not be sent.');
    } finally {
      setChangeSaving(false);
    }
  };

  const withdrawProfileChange = async () => {
    if (!pendingChange) return;
    setChangeWithdrawing(true);
    setChangeError('');
    try {
      await apiRequest(`/api/account/profile-change-requests/${pendingChange.id}/withdraw`, { method: 'POST', body: '{}' });
      const now = new Date().toISOString();
      setProfileRequests((previous) => previous?.map((request) =>
        request.id === pendingChange.id ? { ...request, status: 'WITHDRAWN', decisionAt: now, decidedBy: currentUser.name } : request) ?? null);
      setConfirmChangeWithdraw(false);
    } catch (cause) {
      setChangeError(cause instanceof Error ? cause.message : 'Could not withdraw the request.');
      // It may have been decided meanwhile: reload to show the real state.
      loadProfileRequests().catch(() => undefined);
    } finally {
      setChangeWithdrawing(false);
    }
  };

  // The user's own requests: a pending one replaces the form, decided ones form
  // the history. Reloaded when the department changes, i.e. after an approval.
  useEffect(() => {
    if (!canRequestMove) return;
    let cancelled = false;
    apiRequest<{ requests: DepartmentRequest[] }>('/api/account/department-change-requests')
      .then(({ requests }) => { if (!cancelled) setMyRequests(requests); })
      .catch(() => { if (!cancelled) setMyRequests([]); });
    return () => { cancelled = true; };
  }, [canRequestMove, currentUser.id, currentUser.department]);

  const pendingRequest = myRequests?.find((request) => request.status === 'PENDING');
  const decidedRequests = myRequests?.filter((request) => request.status !== 'PENDING') ?? [];

  const [confirmWithdraw, setConfirmWithdraw] = useState(false);
  const [withdrawing, setWithdrawing] = useState(false);
  const [withdrawError, setWithdrawError] = useState('');

  const withdrawRequest = async () => {
    if (!pendingRequest) return;
    setWithdrawing(true);
    setWithdrawError('');
    try {
      await apiRequest(`/api/account/department-change-requests/${pendingRequest.id}/withdraw`, { method: 'POST', body: '{}' });
      const now = new Date().toISOString();
      // Move it into the history; the form comes back for a new request.
      setMyRequests((previous) => previous?.map((request) =>
        request.id === pendingRequest.id ? { ...request, status: 'WITHDRAWN', decisionAt: now, decidedBy: currentUser.name } : request) ?? null);
      setConfirmWithdraw(false);
    } catch (cause) {
      setWithdrawError(cause instanceof Error ? cause.message : 'Could not withdraw the request.');
      // It may have been decided meanwhile: reload to show the real state.
      apiRequest<{ requests: DepartmentRequest[] }>('/api/account/department-change-requests')
        .then(({ requests }) => setMyRequests(requests))
        .catch(() => undefined);
    } finally {
      setWithdrawing(false);
    }
  };

  const [resetState, setResetState] = useState<{ tone: 'ok' | 'error'; text: string } | null>(null);
  const [resetSending, setResetSending] = useState(false);

  const markSaved = () => {
    if (savedTimer.current !== null) window.clearTimeout(savedTimer.current);
    setSaved(true);
    savedTimer.current = window.setTimeout(() => {
      setSaved(false);
      savedTimer.current = null;
    }, 1800);
  };

  useEffect(() => {
    const nextSettings = readUserSettings(currentUser.id);
    setSettings(nextSettings);
    setMode(nextSettings.themeMode);
    applyAppearance(nextSettings);
    return () => {
      if (savedTimer.current !== null) {
        window.clearTimeout(savedTimer.current);
        savedTimer.current = null;
      }
    };
  }, [currentUser.id]);

  const updateSettings = (patch: Partial<UserSettings>) => {
    const nextSettings = { ...settings, ...patch };
    setSettings(nextSettings);
    writeUserSettings(currentUser.id, nextSettings);
    markSaved();
    if (patch.themeMode) setMode(patch.themeMode);
    if (patch.accent || patch.sidebarDensity || patch.listDensity || patch.motion || patch.avatarColor) applyAppearance(nextSettings);
  };

  const resetSettings = () => {
    setSettings({ ...DEFAULT_SETTINGS });
    writeUserSettings(currentUser.id, { ...DEFAULT_SETTINGS });
    setMode(DEFAULT_SETTINGS.themeMode);
    applyAppearance(DEFAULT_SETTINGS);
    markSaved();
  };

  const isDefault = (Object.keys(DEFAULT_SETTINGS) as (keyof UserSettings)[]).every((key) => settings[key] === DEFAULT_SETTINGS[key]);

  const allowBrowserAlerts = async () => {
    if (permission === 'unsupported') return;
    const result = await Notification.requestPermission();
    setPermission(result);
    if (result === 'granted') updateSettings({ desktopNotifications: true });
  };

  const submitDepartmentRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!requestedDepartment) return;
    setDepartmentRequestSaving(true);
    setDepartmentRequest(null);
    try {
      const { request } = await apiRequest<{ request: { department: LaboratoryDepartment } }>(
        '/api/account/department-change-requests',
        { method: 'POST', body: JSON.stringify({ department: requestedDepartment, reason: departmentReason }) },
      );
      // The server has ended all of this user's sessions; return to sign-in.
      onSessionEnded(`Move to ${departmentLabel(request.department)} requested. You have been signed out on all devices; sign in again to check its status.`);
      return;
    } catch (cause) {
      setDepartmentRequest({ tone: 'error', text: cause instanceof Error ? cause.message : 'Could not submit the department change request.' });
    } finally {
      setDepartmentRequestSaving(false);
    }
  };

  // Uses the same secure flow as "Forgot password": a one-time link to the work email.
  const sendPasswordReset = async () => {
    setResetSending(true);
    setResetState(null);
    try {
      const result = await apiRequest<{ message: string; emailSent?: boolean }>('/api/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: currentUser.email }),
      });
      setResetState(result.emailSent === false
        ? { tone: 'error', text: 'The reset email could not be delivered. Contact your system administrator.' }
        : { tone: 'ok', text: `A password reset link was sent to ${currentUser.email}. Your current password keeps working until you choose a new one.` });
    } catch (cause) {
      setResetState({ tone: 'error', text: cause instanceof Error ? cause.message : 'Could not send the reset link.' });
    } finally {
      setResetSending(false);
    }
  };

  const navItem = (id: SectionId) => {
    const { label, icon: Icon } = SECTIONS[id];
    const active = section === id;
    return (
      <button
        type="button"
        aria-current={active ? 'page' : undefined}
        onClick={() => setSection(id)}
        className={`flex w-full cursor-pointer items-center gap-2.5 whitespace-nowrap rounded-lg px-3 py-1.5 text-left text-[13px] transition-colors ${
          active
            ? 'bg-slate-100 font-medium text-slate-900 dark:bg-slate-800 dark:text-white'
            : 'text-slate-500 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-white'
        }`}
      >
        <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-slate-700 dark:text-slate-200' : 'text-slate-400 dark:text-slate-500'}`} />
        {label}
      </button>
    );
  };

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Account', 'Settings']}
        title="Settings"
        description="Your profile and how GC-ILCMS works for you. Changes save automatically."
        actions={
          <span aria-live="polite">
            {saved && (
              <StatusPill tone="emerald" dot={false}>
                <Check className="h-3 w-3" /> Saved
              </StatusPill>
            )}
          </span>
        }
      />

      <div className="grid items-start gap-6 lg:grid-cols-[15rem_minmax(0,1fr)] lg:gap-10">
        {/* Section navigation: grouped under captions on desktop, one scrollable row on phones */}
        <nav aria-label="Settings sections" className="lg:sticky lg:top-4 lg:min-h-[calc(100dvh-14rem)] lg:border-r lg:border-slate-200 lg:pr-4 dark:lg:border-slate-800">
          <ul className="no-scrollbar flex gap-1 overflow-x-auto lg:hidden">
            {NAV_ORDER.map((id) => (
              <li key={id} className="shrink-0">{navItem(id)}</li>
            ))}
          </ul>
          <div className="hidden space-y-6 lg:block">
            {NAV_GROUPS.map((group) => (
              <div key={group.label}>
                <p className="mb-2 px-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-500">{group.label}</p>
                <ul className="space-y-0.5">
                  {group.items.map((id) => <li key={id}>{navItem(id)}</li>)}
                </ul>
              </div>
            ))}
          </div>
        </nav>

        <div className="min-w-0 space-y-5">
          {section === 'profile' && (
            <div className="space-y-10">
              <PageHeader title="Profile" description="How you appear to others in GC-ILCMS: on case files, worklists and the audit trail." />

              <SettingsGroup id="profile-avatar" title="Avatar color">
                <div className="flex flex-wrap items-center gap-5">
                  <UserAvatar name={currentUser.name} size="xl" />
                  <div className="min-w-0">
                    <SwatchPicker
                      labelledBy="profile-avatar"
                      options={AVATAR_OPTIONS}
                      value={settings.avatarColor}
                      onChange={(value) => updateSettings({ avatarColor: value })}
                    />
                    <p className="mt-2 text-xs text-slate-500 dark:text-slate-400">The colour behind your initials in the sidebar and profile menu.</p>
                  </div>
                </div>
              </SettingsGroup>

              <SettingsGroup id="profile-details" title="Details">
                {isSuperAdmin ? (
                  // The Super Admin manages their own details here.
                  <form onSubmit={saveOwnProfile} className="max-w-xl space-y-5">
                    <Field htmlFor="profile-name" label="Full name">
                      <input
                        id="profile-name"
                        value={profileName}
                        onChange={(event) => setProfileName(event.target.value)}
                        autoComplete="name"
                        minLength={2}
                        maxLength={150}
                        required
                        className={`${FIELD_CLASS} h-10`}
                      />
                    </Field>
                    <ReadOnlyField id="profile-role" label="Title" value={roleLabel(currentUser.role)} />
                    <ReadOnlyField id="profile-department" label="Department" value={departmentLabel(currentUser.department) || 'Not assigned'} />
                    <Field htmlFor="profile-email" label="Email" hint="Your sign-in email. Activation and reset links go here.">
                      <input
                        id="profile-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={profileEmail}
                        onChange={(event) => setProfileEmail(event.target.value)}
                        maxLength={254}
                        required
                        className={`${FIELD_CLASS} h-10`}
                      />
                    </Field>
                    {emailEdited && (
                      <Field htmlFor="profile-password" label="Current password" hint="Needed to change your sign-in email.">
                        <input
                          id="profile-password"
                          type="password"
                          autoComplete="current-password"
                          value={profilePassword}
                          onChange={(event) => setProfilePassword(event.target.value)}
                          required
                          className={`${FIELD_CLASS} h-10`}
                        />
                      </Field>
                    )}
                    {profileNotice && <Notice tone={profileNotice.tone}>{profileNotice.text}</Notice>}
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <Button
                        size="sm"
                        variant="ghost"
                        disabled={!profileEdited || profileSaving}
                        onClick={() => { setProfileName(currentUser.name); setProfileEmail(currentUser.email); setProfilePassword(''); setProfileNotice(null); }}
                      >
                        Cancel
                      </Button>
                      <Button type="submit" size="sm" variant="primary" icon={Check} disabled={!profileEdited || profileSaving}>
                        {profileSaving ? 'Saving…' : 'Save changes'}
                      </Button>
                    </div>
                  </form>
                ) : profileRequests === null ? (
                  <p className="text-xs text-slate-500 dark:text-slate-400">Loading your details…</p>
                ) : pendingChange ? (
                  <div className="max-w-xl space-y-5">
                    {changeError && <Notice tone="error">{changeError}</Notice>}
                    <PendingRequest
                      sentAt={pendingChange.createdAt}
                      confirming={confirmChangeWithdraw}
                      withdrawing={changeWithdrawing}
                      onAskWithdraw={() => { setChangeError(''); setConfirmChangeWithdraw(true); }}
                      onCancelWithdraw={() => setConfirmChangeWithdraw(false)}
                      onWithdraw={() => void withdrawProfileChange()}
                    >
                      <dl className="space-y-1.5 text-[13px]">
                        {profileChanges(pendingChange).map((change) => (
                          <div key={change.label} className="flex flex-wrap items-center gap-x-2 gap-y-1">
                            <dt className="w-20 shrink-0 text-xs font-medium text-slate-500 dark:text-slate-400">{change.label}</dt>
                            <dd className="flex min-w-0 flex-wrap items-center gap-2">
                              <span className="text-slate-500 line-through decoration-slate-300 dark:text-slate-400">{change.from}</span>
                              <ArrowRight className="h-3.5 w-3.5 text-slate-400" aria-label="to" />
                              <span className="font-semibold text-slate-900 dark:text-white">{change.to}</span>
                            </dd>
                          </div>
                        ))}
                      </dl>
                      {pendingChange.reason && (
                        <p className="mt-3 text-xs text-slate-700 dark:text-slate-300"><span className="font-medium">Reason:</span> {pendingChange.reason}</p>
                      )}
                    </PendingRequest>
                    <ReadOnlyField id="profile-department" label="Department" value={departmentLabel(currentUser.department) || 'Not assigned'} />
                  </div>
                ) : draftingChange ? (
                  // Ask the Super Admin to change the name, title or email.
                  <form onSubmit={submitProfileChange} className="max-w-xl space-y-5">
                    <Field htmlFor="profile-name" label="Full name">
                      <input
                        id="profile-name"
                        value={draftName}
                        onChange={(event) => setDraftName(event.target.value)}
                        autoComplete="name"
                        minLength={2}
                        maxLength={150}
                        required
                        className={`${FIELD_CLASS} h-10`}
                      />
                    </Field>
                    <Field htmlFor="profile-role" label="Title" hint="Titles that fit your department. A move to another department is requested below.">
                      <Select<UserRole>
                        id="profile-role"
                        value={draftRole}
                        onChange={setDraftRole}
                        options={(requestableRoles.includes(currentUser.role) ? requestableRoles : [currentUser.role, ...requestableRoles])
                          .map((role) => ({ value: role, label: roleLabel(role) }))}
                      />
                    </Field>
                    <ReadOnlyField id="profile-department" label="Department" value={departmentLabel(currentUser.department) || 'Not assigned'} />
                    <Field htmlFor="profile-email" label="Email" hint="Your new sign-in email. You sign in with it once the change is approved.">
                      <input
                        id="profile-email"
                        type="email"
                        inputMode="email"
                        autoComplete="email"
                        value={draftEmail}
                        onChange={(event) => setDraftEmail(event.target.value)}
                        maxLength={254}
                        required
                        className={`${FIELD_CLASS} h-10`}
                      />
                    </Field>
                    <Field htmlFor="profile-reason" label="Reason" optional>
                      <textarea
                        id="profile-reason"
                        maxLength={500}
                        rows={3}
                        value={draftReason}
                        onChange={(event) => setDraftReason(event.target.value)}
                        placeholder="e.g. Name corrected after marriage; promoted to Senior Chemist on 1 November"
                        className={`${FIELD_CLASS} py-2.5`}
                      />
                      <span className="mt-1 block text-right text-[11px] tabular-nums text-slate-400">{draftReason.length}/500</span>
                    </Field>
                    {changeError && <Notice tone="error">{changeError}</Notice>}
                    <div className="flex flex-wrap items-center justify-end gap-2">
                      <p className="mr-auto text-xs text-slate-500 dark:text-slate-400">Your details change only after the Super Admin approves.</p>
                      <Button size="sm" variant="ghost" disabled={changeSaving} onClick={() => setDraftingChange(false)}>Cancel</Button>
                      <Button type="submit" size="sm" variant="primary" icon={ArrowRight} disabled={changeSaving || !draftChanged}>
                        {changeSaving ? 'Sending…' : 'Send request'}
                      </Button>
                    </div>
                  </form>
                ) : (
                  <div className="max-w-xl space-y-5">
                    <ReadOnlyField id="profile-name" label="Full name" value={currentUser.name} />
                    <ReadOnlyField id="profile-role" label="Title" value={roleLabel(currentUser.role)} />
                    <ReadOnlyField id="profile-department" label="Department" value={departmentLabel(currentUser.department) || 'Not assigned'} />
                    <ReadOnlyField
                      id="profile-email"
                      label="Email"
                      value={currentUser.email}
                      hint="Your sign-in email. Activation and reset links go here."
                    />
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      <p className="flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                        <Lock className="h-3.5 w-3.5 shrink-0" />
                        To change your name, title or email, ask the Super Admin.
                      </p>
                      <Button size="sm" variant="secondary" icon={UserRound} onClick={startDraft}>Request a change</Button>
                    </div>
                  </div>
                )}
                {!isSuperAdmin && decidedChanges.length > 0 && (
                  <div className="mt-8 max-w-xl">
                    <RequestHistory
                      items={decidedChanges.map((request) => ({
                        id: request.id,
                        status: request.status,
                        summary: profileChanges(request).map((change) => `${change.label}: ${change.to}`).join(' · '),
                        meta: (
                          <>
                            Sent {formatDateTime(request.createdAt)}
                            {request.decisionAt && (request.status === 'WITHDRAWN'
                              ? <> · withdrawn by you {formatDateTime(request.decisionAt)}</>
                              : <> · decided {formatDateTime(request.decisionAt)}{request.decidedBy ? ` by ${request.decidedBy}` : ''}</>)}
                          </>
                        ),
                      }))}
                    />
                  </div>
                )}
              </SettingsGroup>

              {canRequestMove && (
                <SettingsGroup id="profile-move" title="Move to another laboratory">
                  <p className="-mt-2 mb-5 text-xs text-slate-500 dark:text-slate-400">Ask the Super Admin to transfer you. Nothing changes until they approve.</p>
                  <div className="max-w-xl space-y-5">
                    {withdrawError && <Notice tone="error">{withdrawError}</Notice>}
                    {myRequests === null ? (
                      <p className="text-xs text-slate-500 dark:text-slate-400">Checking for an open request…</p>
                    ) : pendingRequest ? (
                      <PendingRequest
                        sentAt={pendingRequest.createdAt}
                        confirming={confirmWithdraw}
                        withdrawing={withdrawing}
                        onAskWithdraw={() => { setWithdrawError(''); setConfirmWithdraw(true); }}
                        onCancelWithdraw={() => setConfirmWithdraw(false)}
                        onWithdraw={() => void withdrawRequest()}
                      >
                        <div className="flex flex-wrap items-center gap-2 text-[13px]">
                          <span className="rounded-lg bg-white px-2.5 py-1 text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">{departmentLabel(pendingRequest.currentDepartment)}</span>
                          <ArrowRight className="h-4 w-4 text-slate-400" aria-label="to" />
                          <span className="rounded-lg bg-white px-2.5 py-1 font-semibold text-slate-900 ring-1 ring-inset ring-amber-300 dark:bg-slate-900 dark:text-white dark:ring-amber-500/40">{departmentLabel(pendingRequest.requestedDepartment)}</span>
                        </div>
                        {pendingRequest.reason && (
                          <p className="mt-3 text-xs text-slate-700 dark:text-slate-300"><span className="font-medium">Reason:</span> {pendingRequest.reason}</p>
                        )}
                      </PendingRequest>
                    ) : (
                      <form onSubmit={submitDepartmentRequest} className="space-y-5">
                        <ReadOnlyField id="move-current" label="Currently in" value={departmentLabel(currentUser.department) || 'Not assigned'} />
                        <Field htmlFor="move-to" label="Move to">
                          <Select
                            id="move-to"
                            placeholder="Choose a laboratory"
                            value={requestedDepartment}
                            onChange={(value) => setRequestedDepartment(value as LaboratoryDepartment)}
                            options={departmentsForRole(currentUser.role)
                              .filter((item) => item !== currentUser.department)
                              .map((item) => ({ value: item, label: departmentLabel(item) }))}
                          />
                        </Field>
                        <Field htmlFor="move-reason" label="Reason" optional>
                          <textarea
                            id="move-reason"
                            maxLength={500}
                            rows={3}
                            value={departmentReason}
                            onChange={(event) => setDepartmentReason(event.target.value)}
                            placeholder="e.g. Posted to the Water and Environment laboratory from 1 November"
                            className={`${FIELD_CLASS} py-2.5`}
                          />
                          <span className="mt-1 block text-right text-[11px] tabular-nums text-slate-400">{departmentReason.length}/500</span>
                        </Field>
                        {departmentRequest && <Notice tone={departmentRequest.tone}>{departmentRequest.text}</Notice>}
                        <div className="flex flex-wrap items-center justify-end gap-3">
                          <p className="mr-auto flex items-center gap-1.5 text-xs text-slate-500 dark:text-slate-400">
                            <LogOut className="h-3.5 w-3.5 shrink-0" />
                            Sending the request signs you out on every device.
                          </p>
                          <Button type="submit" size="sm" variant="primary" icon={ArrowRightLeft} disabled={departmentRequestSaving || !requestedDepartment}>
                            {departmentRequestSaving ? 'Sending…' : 'Send request & sign out'}
                          </Button>
                        </div>
                      </form>
                    )}
                    {decidedRequests.length > 0 && (
                      <div className="pt-3">
                        <RequestHistory
                          items={decidedRequests.map((request) => ({
                            id: request.id,
                            status: request.status,
                            summary: <>{departmentLabel(request.currentDepartment)} <span aria-label="to" className="text-slate-400">→</span> {departmentLabel(request.requestedDepartment)}</>,
                            meta: (
                              <>
                                Sent {formatDateTime(request.createdAt)}
                                {request.decisionAt && (request.status === 'WITHDRAWN'
                                  ? <> · withdrawn by you {formatDateTime(request.decisionAt)}</>
                                  : <> · decided {formatDateTime(request.decisionAt)}{request.decidedBy ? ` by ${request.decidedBy}` : ''}</>)}
                              </>
                            ),
                          }))}
                        />
                      </div>
                    )}
                  </div>
                </SettingsGroup>
              )}
            </div>
          )}

          {section === 'appearance' && (
            <div className="space-y-10">
              <PageHeader title="Appearance" description="Customize how GC-ILCMS looks on this device." />

              <SettingsGroup id="appearance-theme" title="Theme">
                <div role="radiogroup" aria-labelledby="appearance-theme" className="grid gap-4 sm:grid-cols-3">
                  {THEME_OPTIONS.map(({ mode: optionMode, label, Icon }) => {
                    const active = settings.themeMode === optionMode;
                    return (
                      <button
                        key={optionMode}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => updateSettings({ themeMode: optionMode })}
                        className={`relative cursor-pointer rounded-xl border bg-white p-2 text-left transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500 dark:bg-slate-900 ${
                          active
                            ? 'border-transparent ring-2 ring-amber-500'
                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
                        }`}
                      >
                        <ThemePreview mode={optionMode} />
                        <span className="flex items-center gap-2 px-1.5 pb-1 pt-3">
                          <Icon className={`h-4 w-4 ${active ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`} />
                          <span className="text-[13px] font-medium text-slate-900 dark:text-white">{label}</span>
                        </span>
                        {active && (
                          <span className="absolute bottom-2.5 right-2.5 flex h-5 w-5 items-center justify-center rounded-full bg-amber-500 text-slate-950">
                            <Check className="h-3 w-3" strokeWidth={3} />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </SettingsGroup>

              <SettingsGroup id="appearance-accent" title="Accent color">
                <p className="mb-3 text-xs text-slate-500 dark:text-slate-400">Accent — Used for primary buttons, focus rings, and selection.</p>
                <SwatchPicker
                  labelledBy="appearance-accent"
                  options={ACCENT_OPTIONS}
                  value={settings.accent}
                  onChange={(value) => updateSettings({ accent: value })}
                />
              </SettingsGroup>

              <SettingsGroup id="appearance-density" title="Density">
                <div className="divide-y divide-slate-200 border-y border-slate-200 dark:divide-slate-800 dark:border-slate-800">
                  <PlainRow
                    title="Sidebar density"
                    hint="Compact uses tighter menu rows and spacing, so more of the menu fits on screen."
                  >
                    <Segmented
                      label="Sidebar density"
                      value={settings.sidebarDensity}
                      options={DENSITY_OPTIONS}
                      onChange={(value) => updateSettings({ sidebarDensity: value })}
                    />
                  </PlainRow>
                  <PlainRow title="Task display" hint="Row height in case registers, worklists, the audit trail and staff lists. Printed documents are not affected.">
                    <Segmented
                      label="Task display"
                      value={settings.listDensity}
                      options={DENSITY_OPTIONS}
                      onChange={(value) => updateSettings({ listDensity: value })}
                    />
                  </PlainRow>
                  <PlainRow title="Motion" htmlFor="setting-motion" hint="Reduce animations for drawers, modals, and transitions.">
                    <Select<MotionPreference>
                      id="setting-motion"
                      size="sm"
                      value={settings.motion}
                      onChange={(value) => updateSettings({ motion: value })}
                      options={MOTION_OPTIONS}
                      className="w-44"
                    />
                  </PlainRow>
                </div>
              </SettingsGroup>

              <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>{isDefault ? 'You are using the default settings.' : 'Go back to the light theme, GC turquoise, comfortable sidebar and tables, a slate avatar and all notifications on.'}</span>
                <Button size="sm" variant="ghost" icon={RotateCcw} disabled={isDefault} onClick={resetSettings}>Reset to defaults</Button>
              </div>
            </div>
          )}

          {section === 'notifications' && (
            <div className="space-y-10">
              <PageHeader title="Email & alerts" description="Choose how you hear about assignments, reviews and visitors." />

              <SettingsGroup id="notifications-delivery" title="Delivery">
                <div className={ROWS}>
                  <PlainRow
                    title="Email summaries"
                    htmlFor="setting-email"
                    hint={<>Assignment, review and case activity sent to <strong className="font-medium text-slate-700 dark:text-slate-200">{currentUser.email}</strong>.</>}
                  >
                    <Switch id="setting-email" label="Email summaries" checked={settings.emailNotifications} onChange={(checked) => updateSettings({ emailNotifications: checked })} />
                  </PlainRow>
                  <PlainRow
                    title="Pop-up alerts on this computer"
                    htmlFor="setting-desktop"
                    hint={
                      permission === 'denied'
                        ? <span className="text-rose-700 dark:text-rose-300">Your browser is blocking alerts from this site. Allow them in the browser's site settings, then come back.</span>
                        : permission === 'unsupported'
                          ? 'This browser does not support pop-up alerts.'
                          : 'Show an alert while GC-ILCMS is open, even in another tab.'
                    }
                  >
                    {permission === 'default' && settings.desktopNotifications ? (
                      <Button size="sm" icon={Bell} onClick={() => void allowBrowserAlerts()}>Allow in browser</Button>
                    ) : (
                      <span className="flex items-center gap-2">
                        {permission === 'denied' && <BellOff className="h-4 w-4 text-rose-500" aria-hidden="true" />}
                        <Switch id="setting-desktop" label="Pop-up alerts" checked={settings.desktopNotifications && permission === 'granted'} onChange={(checked) => updateSettings({ desktopNotifications: checked })} />
                      </span>
                    )}
                  </PlainRow>
                </div>
                <p className="mt-4 text-xs text-slate-500 dark:text-slate-400">
                  Urgent custody and evidence alerts always appear in your Notifications page, whatever you choose here.
                </p>
              </SettingsGroup>
            </div>
          )}

          {section === 'security' && (
            <div className="space-y-10">
              <PageHeader title="Password & sign-in" description="Keep your account secure. Never share your password, not even with IT staff." />

              <SettingsGroup id="security-password" title="Password">
                <div className={ROWS}>
                  <PlainRow title="Sign-in method" hint="You sign in with your work email and a password.">
                    <span className="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200"><Mail className="h-4 w-4 text-slate-400" /> Email & password</span>
                  </PlainRow>
                  <PlainRow
                    title="Change password"
                    hint={
                      resetState
                        ? <span role={resetState.tone === 'ok' ? 'status' : 'alert'} className={resetState.tone === 'ok' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}>{resetState.text}</span>
                        : 'We email you a secure one-time link to choose a new password.'
                    }
                  >
                    <Button size="sm" icon={KeyRound} disabled={resetSending} onClick={() => void sendPasswordReset()}>
                      {resetSending ? 'Sending…' : resetState?.tone === 'ok' ? 'Send again' : 'Email me a reset link'}
                    </Button>
                  </PlainRow>
                </div>
              </SettingsGroup>

              <SettingsGroup id="security-session" title="Session">
                <div className={ROWS}>
                  <PlainRow title="This session" hint="You are signed in on this browser. Sign out when you leave a shared computer.">
                    <Button size="sm" variant="danger" icon={LogOut} onClick={onSignOut}>Sign out</Button>
                  </PlainRow>
                </div>
              </SettingsGroup>
            </div>
          )}
        </div>
      </div>
    </DashboardPage>
  );
};
