import React, { useEffect, useRef, useState } from 'react';
import {
  Bell,
  Check,
  ChevronRight,
  CircleHelp,
  PanelLeftClose,
  LogOut,
  Mail,
  Monitor,
  Moon,
  RotateCcw,
  ShieldCheck,
  Sun,
} from 'lucide-react';
import { Button, DashboardHeader, DashboardPage, StatusPill } from '../common/Dashboard';
import { useTheme, type ThemeMode } from '../../theme/ThemeProvider';
import type { LaboratoryDepartment, User } from '../../types';
import { apiRequest } from '../../lib/api';
import { departmentLabel, departmentQualifier, departmentsForRole, isLabScopedRole } from '../../lib/departments';

const STORAGE_PREFIX = 'gc-ilcms-user-settings:';

const DEFAULT_SETTINGS = {
  themeMode: 'light' as ThemeMode,
  compactSidebar: false,
  emailNotifications: true,
  desktopNotifications: true,
};

type UserSettings = typeof DEFAULT_SETTINGS;

const THEME_OPTIONS: {
  mode: ThemeMode;
  label: string;
  description: string;
  Icon: React.ComponentType<{ className?: string }>;
}[] = [
  { mode: 'light', label: 'Light', description: 'Bright workspace', Icon: Sun },
  { mode: 'system', label: 'System', description: 'Follow device', Icon: Monitor },
  { mode: 'dark', label: 'Dark', description: 'Low-light workspace', Icon: Moon },
];

const isThemeMode = (value: unknown): value is ThemeMode =>
  value === 'light' || value === 'dark' || value === 'system';

export const readUserSettings = (userId: string): UserSettings => {
  try {
    const stored = window.localStorage.getItem(`${STORAGE_PREFIX}${userId}`);
    if (!stored) return { ...DEFAULT_SETTINGS };
    const parsed = JSON.parse(stored) as Partial<UserSettings>;
    return {
      themeMode: isThemeMode(parsed.themeMode) ? parsed.themeMode : DEFAULT_SETTINGS.themeMode,
      compactSidebar:
        typeof parsed.compactSidebar === 'boolean'
          ? parsed.compactSidebar
          : DEFAULT_SETTINGS.compactSidebar,
      emailNotifications:
        typeof parsed.emailNotifications === 'boolean'
          ? parsed.emailNotifications
          : DEFAULT_SETTINGS.emailNotifications,
      desktopNotifications:
        typeof parsed.desktopNotifications === 'boolean'
          ? parsed.desktopNotifications
          : DEFAULT_SETTINGS.desktopNotifications,
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

const getInitials = (name: string) =>
  name
    .split(' ')
    .map((part) => part[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase();

const getRoleLabel = (role: User['role']) => {
  switch (role) {
    case 'CEO':
      return 'Chief Executive Officer';
    case 'VICE_CEO':
      return 'Vice CEO (Operations)';
    case 'HEAD_OF_DEPARTMENT':
      return 'Head of Department';
    case 'ANALYST':
      return 'Government Analyst';
    case 'SENIOR_CHEMIST':
      return 'Senior Chemist';
    case 'RECEPTIONIST':
      return 'Evidence Receptionist';
    case 'CLERK':
      return 'Records Clerk';
    case 'ADMINISTRATOR':
      return 'System Administrator';
    case 'SUPER_ADMIN':
      return 'Super Administrator';
    case 'ACCOUNTANT':
      return 'Accountant';
    case 'HR':
      return 'Human Resources';
    case 'INTERN':
      return 'Scientific Intern';
    case 'ATTACHEE':
      return 'Student Attachee';
    case 'QUALITY_MANAGER':
      return 'Quality System Manager';
    default:
      return role;
  }
};

interface SettingsToggleProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const SettingsToggle: React.FC<SettingsToggleProps> = ({
  checked,
  onChange,
  label,
  description,
  icon: Icon,
}) => (
  <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50 p-3.5 dark:border-slate-800 dark:bg-slate-950/60">
    <div className="flex items-start gap-3 min-w-0">
      <span className="mt-0.5 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white text-slate-500 border border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800">
        <Icon className="w-4 h-4" />
      </span>
      <div className="min-w-0">
        <div className="text-xs font-semibold text-slate-900 dark:text-white">{label}</div>
        <div className="mt-0.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
          {description}
        </div>
      </div>
    </div>
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={`mt-0.5 relative h-6 w-11 shrink-0 rounded-full border transition-colors cursor-pointer ${
        checked
          ? 'bg-amber-500 border-amber-500'
          : 'bg-slate-200 border-slate-300 dark:bg-slate-800 dark:border-slate-700'
      }`}
    >
      <span
        className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-transform ${
          checked ? 'left-[22px]' : 'left-0.5'
        }`}
      />
    </button>
  </div>
);

interface SettingsViewProps {
  currentUser: User;
  onCompactSidebarChange: (compact: boolean) => void;
  onSignOut: () => void;
}

export const SettingsView: React.FC<SettingsViewProps> = ({
  currentUser,
  onCompactSidebarChange,
  onSignOut,
}) => {
  const { mode, setMode } = useTheme();
  const [settings, setSettings] = useState<UserSettings>(() => readUserSettings(currentUser.id));
  const [saved, setSaved] = useState(false);
  const [requestedDepartment, setRequestedDepartment] = useState<LaboratoryDepartment | ''>('');
  const [departmentReason, setDepartmentReason] = useState('');
  const [departmentRequestMessage, setDepartmentRequestMessage] = useState('');
  const [departmentRequestError, setDepartmentRequestError] = useState('');
  const [departmentRequestSaving, setDepartmentRequestSaving] = useState(false);
  const savedTimer = useRef<number | null>(null);

  const markSaved = () => {
    if (savedTimer.current !== null) {
      window.clearTimeout(savedTimer.current);
    }
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
    if (patch.themeMode) {
      setMode(patch.themeMode);
    }
    if (typeof patch.compactSidebar === 'boolean') {
      onCompactSidebarChange(patch.compactSidebar);
    }
  };

  const resetSettings = () => {
    setSettings({ ...DEFAULT_SETTINGS });
    writeUserSettings(currentUser.id, { ...DEFAULT_SETTINGS });
    setMode(DEFAULT_SETTINGS.themeMode);
    onCompactSidebarChange(DEFAULT_SETTINGS.compactSidebar);
    markSaved();
  };

  const submitDepartmentRequest = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!requestedDepartment) return;
    setDepartmentRequestSaving(true);
    setDepartmentRequestMessage('');
    setDepartmentRequestError('');
    try {
      await apiRequest('/api/account/department-change-requests', {
        method: 'POST',
        body: JSON.stringify({ department: requestedDepartment, reason: departmentReason }),
      });
      setDepartmentRequestMessage('Your department change request was sent to the Super Admin for review.');
      setDepartmentReason('');
    } catch (cause) {
      setDepartmentRequestError(cause instanceof Error ? cause.message : 'Could not submit the department change request.');
    } finally {
      setDepartmentRequestSaving(false);
    }
  };

  const initials = getInitials(currentUser.name);
  const labQualifier = departmentQualifier(currentUser.department);
  const department = labQualifier ? `${departmentLabel(labQualifier)} Laboratory` : 'Central Operations';

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Account', 'Settings']}
        title="Settings"
        description={`Personal workspace preferences for ${currentUser.name}`}
        meta={<StatusPill tone="emerald">Active profile</StatusPill>}
        actions={
          <>
            {saved && (
              <StatusPill tone="emerald" dot={false}>
                <Check className="w-3 h-3" />
                Saved
              </StatusPill>
            )}
            <Button icon={RotateCcw} onClick={resetSettings}>
              Reset defaults
            </Button>
          </>
        }
      />

      <div className="grid grid-cols-1 xl:grid-cols-12 gap-5">
        <aside className="xl:col-span-4 space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 bg-gradient-to-b from-slate-50 to-white dark:from-slate-950/60 dark:to-slate-900">
              <div className="flex items-center gap-3">
                <div className="h-12 w-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 text-slate-950 flex items-center justify-center text-sm font-bold shadow ring-1 ring-amber-400/30">
                  {initials}
                </div>
                <div className="min-w-0">
                  <div className="text-sm font-bold text-slate-900 truncate dark:text-white">{currentUser.name}</div>
                  <div className="mt-0.5 flex items-center gap-1.5 text-[11px] font-mono text-amber-600 dark:text-amber-400">
                    {getRoleLabel(currentUser.role)}
                    {currentUser.role === 'HEAD_OF_DEPARTMENT' && (
                      <span className="rounded bg-emerald-500/15 px-1 py-px text-[9px] font-bold uppercase tracking-wide text-emerald-600 dark:text-emerald-400">
                        Head
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Email</span>
                <span className="font-medium text-slate-900 text-right dark:text-white truncate">{currentUser.email}</span>
              </div>
              <div className="h-px bg-slate-100 dark:bg-slate-800" />
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Department</span>
                <span className="font-medium text-slate-900 text-right dark:text-white truncate">{department}</span>
              </div>
              <div className="h-px bg-slate-100 dark:bg-slate-800" />
              <div className="flex items-center justify-between gap-3 text-xs">
                <span className="text-slate-500 dark:text-slate-400">Account status</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-300 font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Active
                </span>
              </div>
            </div>
            <div className="px-4 pb-4">
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 text-[11px] leading-relaxed text-slate-500 dark:bg-slate-950/60 dark:border-slate-800 dark:text-slate-400">
                Your work email identifies your account. Preferences on this page are scoped to this account and browser.
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
            <div className="p-4 border-b border-slate-200 dark:border-slate-800 flex items-center gap-2.5">
              <span className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 border border-emerald-500/25 dark:text-emerald-300">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <div>
                <div className="text-xs font-bold text-slate-900 dark:text-white">Session security</div>
                <div className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">Current authenticated workstation</div>
              </div>
            </div>
            <div className="p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Authentication</span>
                <span className="font-semibold text-slate-900 dark:text-white">Email and password</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-500 dark:text-slate-400">Session state</span>
                <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-300 font-semibold">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse" />
                  Signed in
                </span>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="w-full mt-1 inline-flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 hover:text-rose-500 border border-rose-500/25 text-xs font-bold transition-colors cursor-pointer dark:text-rose-300 dark:hover:text-rose-200"
              >
                <LogOut className="w-3.5 h-3.5" />
                Sign out of this session
              </button>
            </div>
          </section>
        </aside>

        <div className="xl:col-span-8 space-y-5">
          <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="p-2 rounded-lg bg-amber-500/10 text-amber-600 border border-amber-500/25 dark:text-amber-300">
                  <Sun className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Appearance</div>
                  <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Choose how the workspace looks on this device</div>
                </div>
              </div>
              <span className="px-2 py-1 rounded-md bg-slate-100 text-slate-500 border border-slate-200 text-[9px] font-mono uppercase tracking-wider dark:bg-slate-950 dark:text-slate-400 dark:border-slate-800">
                {mode}
              </span>
            </div>
            <div className="p-4 sm:p-5 space-y-5">
              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Colour theme</div>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  {THEME_OPTIONS.map(({ mode: optionMode, label, description, Icon }) => {
                    const active = settings.themeMode === optionMode;
                    return (
                      <button
                        key={optionMode}
                        type="button"
                        onClick={() => updateSettings({ themeMode: optionMode })}
                        aria-pressed={active}
                        className={`relative flex items-center gap-3 rounded-xl border p-3 text-left transition-all cursor-pointer ${
                          active
                            ? 'bg-amber-500/10 border-amber-500/40 shadow-sm'
                            : 'bg-slate-50 border-slate-200 hover:border-slate-300 hover:bg-slate-100 dark:bg-slate-950/50 dark:border-slate-800 dark:hover:border-slate-700'
                        }`}
                      >
                        <span className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border ${
                          active
                            ? 'bg-amber-500 text-slate-950 border-amber-500'
                            : 'bg-white text-slate-500 border-slate-200 dark:bg-slate-900 dark:text-slate-300 dark:border-slate-800'
                        }`}>
                          <Icon className="w-4 h-4" />
                        </span>
                        <span className="min-w-0">
                          <span className="block text-xs font-bold text-slate-900 dark:text-white">{label}</span>
                          <span className="block mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">{description}</span>
                        </span>
                        {active && (
                          <span className="absolute top-2 right-2 flex h-4 w-4 items-center justify-center rounded-full bg-amber-500 text-slate-950">
                            <Check className="w-3 h-3" />
                          </span>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="h-px bg-slate-100 dark:bg-slate-800" />

              <div>
                <div className="text-[11px] font-mono uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-2">Workspace layout</div>
                <SettingsToggle
                  checked={settings.compactSidebar}
                  onChange={(checked) => updateSettings({ compactSidebar: checked })}
                  label="Compact navigation"
                  description="Collapse the sidebar to give more room to active work"
                  icon={PanelLeftClose}
                />
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-200 dark:border-slate-800 flex items-start justify-between gap-4">
              <div className="flex items-start gap-3">
                <span className="p-2 rounded-lg bg-sky-500/10 text-sky-600 border border-sky-500/25 dark:text-sky-300">
                  <Bell className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-sm font-bold text-slate-900 dark:text-white">Notifications</div>
                  <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Control which workspace updates reach you</div>
                </div>
              </div>
              <span className="px-2 py-1 rounded-md bg-sky-500/10 text-sky-600 border border-sky-500/25 text-[9px] font-mono uppercase tracking-wider dark:text-sky-300 dark:border-sky-500/25">
                USER SCOPED
              </span>
            </div>
            <div className="p-4 sm:p-5 space-y-3">
              <SettingsToggle
                checked={settings.emailNotifications}
                onChange={(checked) => updateSettings({ emailNotifications: checked })}
                label="Email notifications"
                description="Send assignment, review, and case activity summaries to your staff email"
                icon={Mail}
              />
              <SettingsToggle
                checked={settings.desktopNotifications}
                onChange={(checked) => updateSettings({ desktopNotifications: checked })}
                label="Desktop notifications"
                description="Show live alerts while this workspace is open in the browser"
                icon={Bell}
              />
              <div className="rounded-xl bg-slate-50 border border-slate-200 p-3 flex items-start gap-2.5 text-[11px] leading-relaxed text-slate-500 dark:bg-slate-950/60 dark:border-slate-800 dark:text-slate-400">
                <CircleHelp className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-500" />
                <span>
                  Notification preferences are stored locally for this prototype session. Critical evidence and custody alerts remain visible in the operational workspace.
                </span>
              </div>
            </div>
          </section>

          <section className="rounded-xl border border-slate-200 bg-white shadow-sm dark:bg-slate-900 dark:border-slate-800 overflow-hidden">
            <div className="p-4 sm:p-5 flex items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <span className="p-2 rounded-lg bg-violet-500/10 text-violet-600 border border-violet-500/25 dark:text-violet-300">
                  <ChevronRight className="w-4 h-4" />
                </span>
                <div>
                  <div className="text-xs font-bold text-slate-900 dark:text-white">Need to update your profile?</div>
                  <div className="mt-0.5 text-[11px] text-slate-500 dark:text-slate-400">Contact the system administrator.</div>
                </div>
              </div>
              <button
                type="button"
                onClick={onSignOut}
                className="shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg border border-slate-200 bg-white text-slate-600 hover:text-slate-900 hover:bg-slate-100 text-xs font-semibold transition-colors cursor-pointer dark:bg-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:text-white"
              >
                <LogOut className="w-3.5 h-3.5" />
                End session
              </button>
            </div>
            {isLabScopedRole(currentUser.role) && (
              <form onSubmit={submitDepartmentRequest} className="border-t border-slate-200 p-4 sm:p-5 dark:border-slate-800">
                <h3 className="text-xs font-bold text-slate-900 dark:text-white">Request a department change</h3>
                <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Your request will appear in the Super Admin notification inbox and requires approval.</p>
                <div className="mt-3 grid gap-3 sm:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_auto]">
                  <label className="space-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    New department
                    <select required value={requestedDepartment} onChange={(event) => setRequestedDepartment(event.target.value as LaboratoryDepartment)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-2 text-xs font-normal text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white">
                      <option value="">Choose department</option>
                      {departmentsForRole(currentUser.role).filter((item) => item !== currentUser.department).map((item) => (
                        <option key={item} value={item}>{departmentLabel(item)}</option>
                      ))}
                    </select>
                  </label>
                  <label className="space-y-1 text-[11px] font-semibold text-slate-600 dark:text-slate-300">
                    Reason
                    <input maxLength={500} value={departmentReason} onChange={(event) => setDepartmentReason(event.target.value)} className="h-9 w-full rounded-lg border border-slate-200 bg-white px-3 text-xs font-normal text-slate-900 dark:border-slate-700 dark:bg-slate-950 dark:text-white" placeholder="Optional" />
                  </label>
                  <button disabled={departmentRequestSaving || !requestedDepartment} className="h-9 self-end rounded-lg bg-amber-500 px-3 text-xs font-semibold text-slate-950 disabled:opacity-50">
                    {departmentRequestSaving ? 'Sending…' : 'Submit request'}
                  </button>
                </div>
                {departmentRequestMessage && <p role="status" className="mt-2 text-xs text-emerald-700 dark:text-emerald-300">{departmentRequestMessage}</p>}
                {departmentRequestError && <p role="alert" className="mt-2 text-xs text-rose-700 dark:text-rose-300">{departmentRequestError}</p>}
              </form>
            )}
          </section>
        </div>
      </div>
    </DashboardPage>
  );
};
