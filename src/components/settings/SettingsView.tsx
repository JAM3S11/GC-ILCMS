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
  PanelLeftClose,
  RotateCcw,
  ShieldCheck,
  Sun,
  UserRound,
} from 'lucide-react';
import { Avatar, Button, DashboardHeader, DashboardPage, StatusPill } from '../common/Dashboard';
import { useTheme, type ThemeMode } from '../../theme/ThemeProvider';
import type { LaboratoryDepartment, User } from '../../types';
import { apiRequest } from '../../lib/api';
import { Select } from '../common/Select';
import { departmentLabel, departmentsForRole, isLabScopedRole } from '../../lib/departments';
import { roleLabel } from '../admin/roles';

const STORAGE_PREFIX = 'gc-ilcms-user-settings:';

const DEFAULT_SETTINGS = {
  themeMode: 'light' as ThemeMode,
  compactSidebar: false,
  emailNotifications: true,
  desktopNotifications: true,
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
      compactSidebar: bool(parsed.compactSidebar, DEFAULT_SETTINGS.compactSidebar),
      emailNotifications: bool(parsed.emailNotifications, DEFAULT_SETTINGS.emailNotifications),
      desktopNotifications: bool(parsed.desktopNotifications, DEFAULT_SETTINGS.desktopNotifications),
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

const SECTIONS: { id: SectionId; label: string; hint: string; icon: React.ComponentType<{ className?: string }> }[] = [
  { id: 'profile', label: 'My profile', hint: 'Name, role and department', icon: UserRound },
  { id: 'appearance', label: 'Appearance', hint: 'Theme and layout', icon: Palette },
  { id: 'notifications', label: 'Notifications', hint: 'How updates reach you', icon: Bell },
  { id: 'security', label: 'Password & sign-in', hint: 'Password and this session', icon: ShieldCheck },
];

const THEME_OPTIONS: { mode: ThemeMode; label: string; description: string; Icon: React.ComponentType<{ className?: string }> }[] = [
  { mode: 'light', label: 'Light', description: 'Best in bright offices', Icon: Sun },
  { mode: 'dark', label: 'Dark', description: 'Easier on the eyes at night', Icon: Moon },
  { mode: 'system', label: 'Match my device', description: 'Follows your computer setting', Icon: Monitor },
];

/* --------------------------- Shared building blocks --------------------------- */

const SectionCard: React.FC<{ title: string; description: string; children: React.ReactNode; footer?: React.ReactNode }> = ({
  title,
  description,
  children,
  footer,
}) => (
  <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
    <header className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
      <h2 className="text-base font-semibold text-slate-900 dark:text-white">{title}</h2>
      <p className="mt-0.5 text-[13px] text-slate-500 dark:text-slate-400">{description}</p>
    </header>
    <div className="divide-y divide-slate-100 dark:divide-slate-800">{children}</div>
    {footer && <footer className="border-t border-slate-200 bg-slate-50/70 px-5 py-3 text-xs text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">{footer}</footer>}
  </section>
);

/** One setting: what it is on the left, the control on the right (stacked on phones). */
const SettingRow: React.FC<{ title: string; description?: React.ReactNode; children: React.ReactNode; htmlFor?: string }> = ({
  title,
  description,
  children,
  htmlFor,
}) => (
  <div className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:gap-6">
    <div className="min-w-0">
      {htmlFor ? (
        <label htmlFor={htmlFor} className="text-sm font-medium text-slate-900 dark:text-white">{title}</label>
      ) : (
        <div className="text-sm font-medium text-slate-900 dark:text-white">{title}</div>
      )}
      {description && <div className="mt-0.5 text-[13px] leading-relaxed text-slate-500 dark:text-slate-400">{description}</div>}
    </div>
    <div className="shrink-0">{children}</div>
  </div>
);

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

const ReadOnlyValue: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <span className="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200">
    {children}
    <Lock className="h-3.5 w-3.5 text-slate-400" aria-label="Managed by the system administrator" />
  </span>
);

/** A small picture of the workspace in each theme, so the choice is visual. */
const ThemePreview: React.FC<{ mode: ThemeMode }> = ({ mode }) => {
  const pane = (dark: boolean) => (
    <div className={`flex h-full flex-1 gap-1 p-1.5 ${dark ? 'bg-slate-900' : 'bg-slate-100'}`}>
      <div className={`w-1/4 rounded-sm ${dark ? 'bg-slate-800' : 'bg-white'}`} />
      <div className="flex flex-1 flex-col gap-1">
        <div className={`h-1.5 w-2/3 rounded-sm ${dark ? 'bg-slate-700' : 'bg-slate-300'}`} />
        <div className={`flex-1 rounded-sm ${dark ? 'bg-slate-800' : 'bg-white'}`} />
        <div className="h-1.5 w-1/3 rounded-sm bg-amber-500" />
      </div>
    </div>
  );
  return (
    <div className="flex h-16 overflow-hidden rounded-md ring-1 ring-slate-200 dark:ring-slate-700" aria-hidden="true">
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

/* --------------------------------- View --------------------------------- */

interface SettingsViewProps {
  currentUser: User;
  onCompactSidebarChange: (compact: boolean) => void;
  onSignOut: () => void;
}

/** One of the signed-in user's department change requests. */
interface DepartmentRequest {
  id: string;
  currentDepartment: LaboratoryDepartment;
  requestedDepartment: LaboratoryDepartment;
  reason?: string | null;
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  createdAt: string;
  decisionAt?: string | null;
  decidedBy?: string | null;
}

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat('en-GB', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(value));

type BrowserPermission =NotificationPermission | 'unsupported';

const browserPermission = (): BrowserPermission =>
  typeof window !== 'undefined' && 'Notification' in window ? Notification.permission : 'unsupported';

export const SettingsView: React.FC<SettingsViewProps> = ({ currentUser, onCompactSidebarChange, onSignOut }) => {
  const { setMode } = useTheme();
  const [section, setSection] = useState<SectionId>('profile');
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
    onCompactSidebarChange(nextSettings.compactSidebar);
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
    if (typeof patch.compactSidebar === 'boolean') onCompactSidebarChange(patch.compactSidebar);
  };

  const resetSettings = () => {
    setSettings({ ...DEFAULT_SETTINGS });
    writeUserSettings(currentUser.id, { ...DEFAULT_SETTINGS });
    setMode(DEFAULT_SETTINGS.themeMode);
    onCompactSidebarChange(DEFAULT_SETTINGS.compactSidebar);
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
      const { request } = await apiRequest<{ request: { id: string; department: LaboratoryDepartment; status: 'PENDING'; createdAt: string } }>(
        '/api/account/department-change-requests',
        { method: 'POST', body: JSON.stringify({ department: requestedDepartment, reason: departmentReason }) },
      );
      // The pending panel that replaces the form is the confirmation.
      setMyRequests((previous) => [{
        id: request.id,
        currentDepartment: currentUser.department as LaboratoryDepartment,
        requestedDepartment: request.department,
        reason: departmentReason.trim() || null,
        status: request.status,
        createdAt: request.createdAt,
      }, ...(previous ?? [])]);
      setDepartmentReason('');
      setRequestedDepartment('');
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

      <div className="grid items-start gap-5 lg:grid-cols-[15rem_minmax(0,1fr)]">
        {/* Section navigation: a column on desktop, a scrollable row on phones */}
        <nav aria-label="Settings sections" className="lg:sticky lg:top-4">
          <div className="mb-3 hidden items-center gap-3 rounded-xl border border-slate-200 bg-white p-3 lg:flex dark:border-slate-800 dark:bg-slate-900">
            <Avatar name={currentUser.name} tone="amber" />
            <div className="min-w-0">
              <div className="truncate text-sm font-semibold text-slate-900 dark:text-white">{currentUser.name}</div>
              <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">{roleLabel(currentUser.role)}</div>
            </div>
          </div>
          <ul className="no-scrollbar flex gap-1 overflow-x-auto lg:flex-col">
            {SECTIONS.map(({ id, label, hint, icon: Icon }) => {
              const active = section === id;
              return (
                <li key={id} className="shrink-0">
                  <button
                    type="button"
                    aria-current={active ? 'page' : undefined}
                    onClick={() => setSection(id)}
                    className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-3 py-2 text-left transition-colors ${
                      active
                        ? 'bg-amber-50 text-amber-900 ring-1 ring-inset ring-amber-200 dark:bg-amber-500/10 dark:text-amber-100 dark:ring-amber-500/30'
                        : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                    }`}
                  >
                    <Icon className={`h-4 w-4 shrink-0 ${active ? 'text-amber-700 dark:text-amber-400' : 'text-slate-400'}`} />
                    <span className="min-w-0">
                      <span className="block whitespace-nowrap text-[13px] font-medium">{label}</span>
                      <span className="hidden text-[11px] text-slate-500 lg:block dark:text-slate-400">{hint}</span>
                    </span>
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 space-y-5">
          {section === 'profile' && (
            <>
              <SectionCard
                title="My profile"
                description="How you appear across the system, on case files and in the audit log."
                footer={<span className="inline-flex items-center gap-1.5"><Lock className="h-3.5 w-3.5" /> Your name, email and role are managed by the system administrator. Contact them if anything is wrong.</span>}
              >
                <div className="flex items-center gap-4 px-5 py-5">
                  <Avatar name={currentUser.name} size="lg" tone="amber" />
                  <div className="min-w-0">
                    <div className="truncate text-lg font-semibold text-slate-900 dark:text-white">{currentUser.name}</div>
                    <div className="truncate text-[13px] text-slate-500 dark:text-slate-400">{currentUser.email}</div>
                  </div>
                  <span className="ml-auto hidden sm:block"><StatusPill tone="emerald">Active account</StatusPill></span>
                </div>
                <SettingRow title="Full name"><ReadOnlyValue>{currentUser.name}</ReadOnlyValue></SettingRow>
                <SettingRow title="Work email" description="Sign-in, activation and reset links go here."><ReadOnlyValue>{currentUser.email}</ReadOnlyValue></SettingRow>
                <SettingRow title="Role"><ReadOnlyValue>{roleLabel(currentUser.role)}</ReadOnlyValue></SettingRow>
                <SettingRow title="Department"><ReadOnlyValue>{departmentLabel(currentUser.department) || 'Not assigned'}</ReadOnlyValue></SettingRow>
              </SectionCard>

              {canRequestMove && (
                <SectionCard title="Move to another laboratory" description="Ask the Super Admin to transfer you. Nothing changes until they approve.">
                  {myRequests === null ? (
                    <div className="px-5 py-6 text-center text-xs text-slate-500 dark:text-slate-400">Checking for an open request…</div>
                  ) : pendingRequest ? (
                    <div className="px-5 py-4">
                      <div role="status" className="rounded-xl border border-amber-300 bg-amber-50 p-4 dark:border-amber-500/40 dark:bg-amber-500/10">
                        <div className="flex items-start gap-3">
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-amber-500 text-slate-950">
                            <Hourglass className="h-4 w-4" />
                          </span>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-amber-900 dark:text-amber-100">Awaiting Super Admin review</p>
                            <p className="mt-0.5 text-xs text-amber-900/80 dark:text-amber-100/80">
                              Sent {formatDateTime(pendingRequest.createdAt)}. You stay in your current laboratory until it is approved, and you'll get a notification with the decision.
                            </p>
                          </div>
                        </div>
                        <div className="mt-3 flex flex-wrap items-center gap-2 text-[13px]">
                          <span className="rounded-lg bg-white px-2.5 py-1 text-slate-700 ring-1 ring-inset ring-slate-200 dark:bg-slate-900 dark:text-slate-200 dark:ring-slate-700">{departmentLabel(pendingRequest.currentDepartment)}</span>
                          <ArrowRight className="h-4 w-4 text-amber-700 dark:text-amber-400" aria-label="to" />
                          <span className="rounded-lg bg-white px-2.5 py-1 font-semibold text-slate-900 ring-1 ring-inset ring-amber-300 dark:bg-slate-900 dark:text-white dark:ring-amber-500/40">{departmentLabel(pendingRequest.requestedDepartment)}</span>
                        </div>
                        {pendingRequest.reason && (
                          <p className="mt-3 text-xs text-slate-700 dark:text-slate-300"><span className="font-medium">Reason:</span> {pendingRequest.reason}</p>
                        )}
                      </div>
                    </div>
                  ) : (
                  <form onSubmit={submitDepartmentRequest} className="space-y-4 px-5 py-4">
                    <div className="grid gap-4 sm:grid-cols-2">
                      <label className="block space-y-1.5">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Move to</span>
                        <Select
                          placeholder="Choose a laboratory"
                          value={requestedDepartment}
                          onChange={(value) => setRequestedDepartment(value as LaboratoryDepartment)}
                          options={departmentsForRole(currentUser.role)
                            .filter((item) => item !== currentUser.department)
                            .map((item) => ({ value: item, label: departmentLabel(item) }))}
                        />
                      </label>
                      <div className="space-y-1.5">
                        <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Currently in</span>
                        <div className="flex h-[42px] items-center rounded-lg border border-dashed border-slate-300 px-3.5 text-sm text-slate-600 dark:border-slate-700 dark:text-slate-300">
                          {departmentLabel(currentUser.department) || 'Not assigned'}
                        </div>
                      </div>
                    </div>
                    <label className="block space-y-1.5">
                      <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">Reason <span className="font-normal text-slate-500">(optional)</span></span>
                      <textarea
                        maxLength={500}
                        rows={3}
                        value={departmentReason}
                        onChange={(event) => setDepartmentReason(event.target.value)}
                        placeholder="e.g. Posted to the Water and Environment laboratory from 1 November"
                        className="w-full rounded-lg border border-slate-300 bg-white px-3.5 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white"
                      />
                      <span className="block text-right text-[11px] tabular-nums text-slate-400">{departmentReason.length}/500</span>
                    </label>
                    {departmentRequest && (
                      <p role={departmentRequest.tone === 'ok' ? 'status' : 'alert'} className={`rounded-lg px-3 py-2.5 text-xs ${departmentRequest.tone === 'ok' ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950/30 dark:text-emerald-200' : 'bg-rose-50 text-rose-800 dark:bg-rose-950/30 dark:text-rose-200'}`}>
                        {departmentRequest.text}
                      </p>
                    )}
                    <div className="flex justify-end">
                      <Button type="submit" variant="primary" icon={ArrowRightLeft} disabled={departmentRequestSaving || !requestedDepartment}>
                        {departmentRequestSaving ? 'Sending…' : 'Send request'}
                      </Button>
                    </div>
                  </form>
                  )}
                  {decidedRequests.length > 0 && (
                    <div className="px-5 py-4">
                      <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400">Previous requests</h3>
                      <ul className="mt-2 divide-y divide-slate-100 dark:divide-slate-800">
                        {decidedRequests.map((request) => (
                          <li key={request.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                            <div className="min-w-0">
                              <div className="text-[13px] text-slate-800 dark:text-slate-200">
                                {departmentLabel(request.currentDepartment)} <span aria-label="to" className="text-slate-400">→</span> {departmentLabel(request.requestedDepartment)}
                              </div>
                              <div className="text-[11px] text-slate-500 dark:text-slate-400">
                                Sent {formatDateTime(request.createdAt)}
                                {request.decisionAt && <> · decided {formatDateTime(request.decisionAt)}{request.decidedBy ? ` by ${request.decidedBy}` : ''}</>}
                              </div>
                            </div>
                            <StatusPill tone={request.status === 'APPROVED' ? 'emerald' : 'rose'}>
                              {request.status === 'APPROVED' ? 'Approved' : 'Not approved'}
                            </StatusPill>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </SectionCard>
              )}
            </>
          )}

          {section === 'appearance' && (
            <SectionCard
              title="Appearance"
              description="Choose how the workspace looks. Saved for your account on this browser."
              footer={
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <span>{isDefault ? 'You are using the default settings.' : 'Go back to the light theme, full sidebar and all notifications on.'}</span>
                  <Button size="sm" variant="ghost" icon={RotateCcw} disabled={isDefault} onClick={resetSettings}>Reset to defaults</Button>
                </div>
              }
            >
              <fieldset className="px-5 py-4">
                <legend className="text-sm font-medium text-slate-900 dark:text-white">Theme</legend>
                <div className="mt-3 grid gap-3 sm:grid-cols-3">
                  {THEME_OPTIONS.map(({ mode: optionMode, label, description, Icon }) => {
                    const active = settings.themeMode === optionMode;
                    return (
                      <button
                        key={optionMode}
                        type="button"
                        role="radio"
                        aria-checked={active}
                        onClick={() => updateSettings({ themeMode: optionMode })}
                        className={`cursor-pointer rounded-xl border p-2.5 text-left transition-all ${
                          active
                            ? 'border-amber-500 ring-2 ring-amber-500/25'
                            : 'border-slate-200 hover:border-slate-300 dark:border-slate-700 dark:hover:border-slate-600'
                        }`}
                      >
                        <ThemePreview mode={optionMode} />
                        <div className="mt-2.5 flex items-center gap-2">
                          <Icon className={`h-4 w-4 ${active ? 'text-amber-600 dark:text-amber-400' : 'text-slate-400'}`} />
                          <span className="text-[13px] font-medium text-slate-900 dark:text-white">{label}</span>
                          {active && <Check className="ml-auto h-4 w-4 text-amber-600 dark:text-amber-400" />}
                        </div>
                        <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">{description}</div>
                      </button>
                    );
                  })}
                </div>
              </fieldset>
              <SettingRow
                title="Compact sidebar"
                htmlFor="setting-compact"
                description={<>Shrink the menu to icons to give your work more room. You can also press <kbd className="rounded border border-slate-300 px-1 text-[11px] dark:border-slate-600">Ctrl</kbd> + <kbd className="rounded border border-slate-300 px-1 text-[11px] dark:border-slate-600">B</kbd>.</>}
              >
                <span className="flex items-center gap-2">
                  <PanelLeftClose className="h-4 w-4 text-slate-400" aria-hidden="true" />
                  <Switch id="setting-compact" label="Compact sidebar" checked={settings.compactSidebar} onChange={(checked) => updateSettings({ compactSidebar: checked })} />
                </span>
              </SettingRow>
            </SectionCard>
          )}

          {section === 'notifications' && (
            <SectionCard
              title="Notifications"
              description="Choose how you hear about assignments, reviews and visitors."
              footer="Urgent custody and evidence alerts always appear in your Notifications page, whatever you choose here."
            >
              <SettingRow
                title="Email summaries"
                htmlFor="setting-email"
                description={<>Assignment, review and case activity sent to <strong className="font-medium text-slate-700 dark:text-slate-200">{currentUser.email}</strong>.</>}
              >
                <Switch id="setting-email" label="Email summaries" checked={settings.emailNotifications} onChange={(checked) => updateSettings({ emailNotifications: checked })} />
              </SettingRow>
              <SettingRow
                title="Pop-up alerts on this computer"
                htmlFor="setting-desktop"
                description={
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
              </SettingRow>
            </SectionCard>
          )}

          {section === 'security' && (
            <SectionCard title="Password & sign-in" description="Keep your account secure. Never share your password, not even with IT staff.">
              <SettingRow title="Sign-in method" description="You sign in with your work email and a password.">
                <span className="inline-flex items-center gap-1.5 text-sm text-slate-700 dark:text-slate-200"><Mail className="h-4 w-4 text-slate-400" /> Email & password</span>
              </SettingRow>
              <SettingRow
                title="Change password"
                description={
                  resetState
                    ? <span role={resetState.tone === 'ok' ? 'status' : 'alert'} className={resetState.tone === 'ok' ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}>{resetState.text}</span>
                    : 'We email you a secure one-time link to choose a new password.'
                }
              >
                <Button size="sm" icon={KeyRound} disabled={resetSending} onClick={() => void sendPasswordReset()}>
                  {resetSending ? 'Sending…' : resetState?.tone === 'ok' ? 'Send again' : 'Email me a reset link'}
                </Button>
              </SettingRow>
              <SettingRow title="This session" description="You are signed in on this browser. Sign out when you leave a shared computer.">
                <Button size="sm" variant="danger" icon={LogOut} onClick={onSignOut}>Sign out</Button>
              </SettingRow>
            </SectionCard>
          )}
        </div>
      </div>
    </DashboardPage>
  );
};
