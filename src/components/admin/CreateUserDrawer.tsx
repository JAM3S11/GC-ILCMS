import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Mail, ScrollText, ShieldCheck, UserPlus, X } from 'lucide-react';
import { LaboratoryDepartment, UserRole } from '../../types';
import { Avatar, Button, StatusPill } from '../common/Dashboard';
import { Select } from '../common/Select';
import { PANEL_TEXT, PANEL_TEXT_2, SidePanel } from '../common/SidePanel';
import { departmentForRole, departmentLabel, departmentsForRole, isLabScopedRole } from '../../lib/departments';
import { ROLE_GROUPS, ROLE_INFO, roleLabel } from './roles';

export interface NewAccount {
  staffNumber: string;
  fullName: string;
  email: string;
  role: UserRole;
  department: LaboratoryDepartment;
  /** Issue the account and email the invitation straight after adding to the roll. */
  issueAccount: boolean;
}

/** A nominal roll entry being edited; its account, once issued, owns email, role and department. */
export interface RollEntryDraft {
  staffNumber: string;
  fullName: string;
  email: string;
  role: UserRole;
  department: LaboratoryDepartment;
  hasAccount: boolean;
}

/** Details an officer sent from the sign-in page's Request access form. */
export interface AccessRequestPrefill {
  staffNumber: string;
  fullName: string;
  email: string;
  department: LaboratoryDepartment;
}

interface CreateUserDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (account: NewAccount) => Promise<void>;
  working: boolean;
  /** Server error from the last attempt; shown inside the drawer so the form stays filled. */
  error: string;
  /** Emails already on the roll or register, to warn before submitting a duplicate. */
  existingEmails: string[];
  /** Staff numbers already on the roll (upper-case). */
  existingStaffNumbers: string[];
  /** When set, the drawer edits this roll entry instead of adding one. */
  editing?: RollEntryDraft | null;
  /** When adding, start from an access request; the role is still the administrator's choice. */
  prefill?: AccessRequestPrefill | null;
  /** Departments that already have a Head of Department. */
  departmentsWithHead: LaboratoryDepartment[];
}

const DEFAULT_ROLE: UserRole = 'ANALYST';

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

/**
 * "Add officer" in the app's side panel (full screen on phones): officer
 * details, role and posting, then a preview of the row exactly as it will
 * appear in Members, so the administrator knows what to look for.
 */
export const CreateUserDrawer: React.FC<CreateUserDrawerProps> = ({
  open,
  onOpenChange,
  onSubmit,
  working,
  error,
  existingEmails,
  existingStaffNumbers,
  departmentsWithHead,
  editing = null,
  prefill = null,
}) => {
  const [staffNumber, setStaffNumber] = useState('');
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(DEFAULT_ROLE);
  const [department, setDepartment] = useState<LaboratoryDepartment>(departmentForRole(DEFAULT_ROLE));
  const [issueAccount, setIssueAccount] = useState(true);
  const locked = !!editing?.hasAccount;

  // Start every opening with a clean form.
  useEffect(() => {
    if (!open) return;
    const source = editing ?? prefill;
    // A request names a department, not a role: laboratories default to analyst, the rest to clerk.
    const startRole = editing?.role
      ?? (prefill ? (departmentsForRole(DEFAULT_ROLE).includes(prefill.department) ? DEFAULT_ROLE : 'CLERK') : DEFAULT_ROLE);
    setStaffNumber(source?.staffNumber ?? '');
    setFullName(source?.fullName ?? '');
    setEmail(source?.email ?? '');
    setRole(startRole);
    setDepartment(departmentForRole(startRole, source?.department));
    setIssueAccount(true);
  }, [open, editing, prefill]);

  const chooseRole = (next: UserRole) => {
    setRole(next);
    setDepartment(departmentForRole(next, department));
  };

  const trimmedEmail = email.trim().toLowerCase();
  const trimmedStaffNumber = staffNumber.trim().toUpperCase();
  const duplicate = !!trimmedEmail && trimmedEmail !== editing?.email.toLowerCase() && existingEmails.includes(trimmedEmail);
  const staffNumberTaken = !!trimmedStaffNumber && trimmedStaffNumber !== editing?.staffNumber.toUpperCase() && existingStaffNumbers.includes(trimmedStaffNumber);
  const staffNumberValid = /^[A-Za-z0-9][A-Za-z0-9/.\- ]{0,39}$/.test(staffNumber.trim());
  const sendsInvite = !editing && issueAccount;
  // Only matters when an account is about to be issued for a head.
  const headTaken = sendsInvite && role === 'HEAD_OF_DEPARTMENT' && departmentsWithHead.includes(department);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const ready = staffNumberValid && !staffNumberTaken && fullName.trim().length >= 2 && emailValid && !duplicate && !headTaken;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready || working) return;
    void onSubmit({ staffNumber: trimmedStaffNumber, fullName: fullName.trim(), email: trimmedEmail, role, department, issueAccount: sendsInvite });
  };

  // Listed in establishment order; the chosen role's duty shows as the field hint.
  const roleOptions = ROLE_GROUPS.flatMap((group) =>
    group.roles.map((item) => ({ value: item, label: `${ROLE_INFO[item].label} — ${group.title}` })),
  );

  return (
    <SidePanel
      open={open}
      onClose={() => onOpenChange(false)}
      section="Nominal roll"
      recordId={editing ? editing.staffNumber : 'New officer'}
      titleId="roll-entry-title"
      onSubmit={submit}
      footer={
        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => onOpenChange(false)}>Cancel</Button>
          <Button type="submit" variant="primary" icon={sendsInvite ? Mail : UserPlus} disabled={!ready || working}>
            {working ? 'Saving…' : editing ? 'Save changes' : sendsInvite ? 'Add & send invite' : 'Add to roll'}
          </Button>
        </div>
      }
    >
          <div className="space-y-6 px-4 py-6 sm:px-6">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400">
                <UserPlus className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <h2 id="roll-entry-title" className={`text-[22px] font-semibold leading-tight ${PANEL_TEXT}`}>{editing ? 'Edit roll entry' : 'Add officer to the roll'}</h2>
                <p className={`text-[13px] ${PANEL_TEXT_2}`}>
                  {editing
                    ? 'Staff accounts are only issued to officers on the nominal roll.'
                    : 'Only officers on the roll can hold an account. Issue it now, or later from Members.'}
                </p>
              </div>
            </div>
            <FormSection number={1} title="Officer details">
              <Field
                label="Staff number"
                hint={staffNumberTaken ? undefined : 'Personal / PF number from the establishment list.'}
                warning={staffNumberTaken ? 'This staff number is already on the roll.' : undefined}
              >
                <input required autoFocus value={staffNumber} onChange={(e) => setStaffNumber(e.target.value)} placeholder="e.g. 2019012345" maxLength={40} className={inputClass} aria-invalid={staffNumberTaken || undefined} />
              </Field>
              <Field label="Full name" hint="As it appears on the staff establishment list.">
                <input required minLength={2} value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Jane Wanjiku Mwangi" className={inputClass} />
              </Field>
              <Field
                label="Work email"
                hint={duplicate ? undefined : locked ? 'Fixed once the account is issued.' : 'The activation link is sent here. Use the official work address.'}
                warning={duplicate ? 'This email is already on the roll or the account register.' : undefined}
              >
                <input required type="email" disabled={locked} value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@gc.go.ke" className={inputClass} aria-invalid={duplicate || undefined} />
              </Field>
            </FormSection>

            <FormSection number={2} title="Role & posting">
              <Field label="Role" hint={locked ? "Change the role from the member's profile; the roll follows it." : ROLE_INFO[role].duty}>
                <Select value={role} onChange={chooseRole} disabled={locked} options={roleOptions} />
              </Field>
              <Field
                label={isLabScopedRole(role) ? 'Laboratory' : 'Department'}
                hint={headTaken ? undefined : isLabScopedRole(role)
                  ? 'This role works in one laboratory division.'
                  : 'This role is institution-wide and sits in General Administration.'}
                warning={headTaken ? `${departmentLabel(department)} already has a Head of Department. Change that account's role first.` : undefined}
              >
                <Select
                  value={department}
                  onChange={(value) => setDepartment(value as LaboratoryDepartment)}
                  disabled={locked || !isLabScopedRole(role)}
                  options={departmentsForRole(role).map((item) => ({ value: item, label: departmentLabel(item) }))}
                />
              </Field>
            </FormSection>

            {!editing && (
              <FormSection number={3} title="Account">
                <label className="flex cursor-pointer items-start gap-2.5 rounded-lg border border-slate-200 p-3 text-xs dark:border-slate-700">
                  <input type="checkbox" checked={issueAccount} onChange={(e) => setIssueAccount(e.target.checked)} className="mt-0.5 h-4 w-4 accent-amber-500" />
                  <span>
                    <span className="block font-semibold text-slate-900 dark:text-white">Issue the account now</span>
                    <span className="text-slate-500 dark:text-slate-400">Creates the account and emails a one-time activation link that expires after 15 minutes.</span>
                  </span>
                </label>
              </FormSection>
            )}

            {sendsInvite && (
            <FormSection number={4} title="How it will appear in Members">
              <div className="flex items-center gap-3 rounded-xl border border-amber-300 bg-amber-50/70 p-3 dark:border-amber-500/40 dark:bg-amber-500/10">
                <Avatar name={fullName.trim() || 'New officer'} tone="amber" />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="truncate text-sm font-semibold text-slate-900 dark:text-white">{fullName.trim() || 'Full name'}</span>
                    <span className="rounded bg-amber-500 px-1.5 py-px text-[10px] font-bold uppercase tracking-wide text-slate-950">New</span>
                  </div>
                  <div className="truncate text-xs text-slate-500 dark:text-slate-400">{trimmedEmail || 'work email'}</div>
                  <div className="mt-0.5 truncate text-xs text-slate-600 dark:text-slate-300">{roleLabel(role)} · {departmentLabel(department)}</div>
                </div>
                <StatusPill tone="amber">Invitation pending</StatusPill>
              </div>
              <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                <WhatHappens icon={ShieldCheck}>The account is created as <strong>Invitation pending</strong>. It cannot sign in until the officer activates it.</WhatHappens>
                <WhatHappens icon={Mail}>An activation email goes to the work address. If it expires, use <strong>Resend invitation</strong> on the member.</WhatHappens>
                <WhatHappens icon={CheckCircle2}>The new member is pinned to the top of Members and highlighted.</WhatHappens>
                <WhatHappens icon={ScrollText}>The creation is recorded in the audit log under your name.</WhatHappens>
              </ul>
            </FormSection>
            )}

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="mt-px h-4 w-4 shrink-0" /> {error}
              </div>
            )}
          </div>

    </SidePanel>
  );
};

const FormSection: React.FC<{ number: number; title: string; children: React.ReactNode }> = ({ number, title, children }) => (
  <fieldset className="space-y-3">
    <legend className="mb-3 flex items-center gap-2 text-sm font-semibold text-slate-900 dark:text-white">
      <span className="flex h-5 w-5 items-center justify-center rounded-full bg-slate-900 text-[11px] font-bold text-white dark:bg-white dark:text-slate-900">{number}</span>
      {title}
    </legend>
    {children}
  </fieldset>
);

const Field: React.FC<{ label: string; hint?: string; warning?: string; children: React.ReactNode }> = ({ label, hint, warning, children }) => (
  <label className="block space-y-1.5">
    <span className="text-xs font-semibold text-slate-700 dark:text-slate-300">{label}</span>
    {children}
    {warning ? (
      <span className="flex items-start gap-1 text-[11px] font-medium text-rose-700 dark:text-rose-300">
        <AlertTriangle className="mt-px h-3.5 w-3.5 shrink-0" /> {warning}
      </span>
    ) : hint ? (
      <span className="block text-[11px] text-slate-500 dark:text-slate-400">{hint}</span>
    ) : null}
  </label>
);

const WhatHappens: React.FC<{ icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }> = ({ icon: Icon, children }) => (
  <li className="flex items-start gap-2">
    <Icon className="mt-px h-3.5 w-3.5 shrink-0 text-slate-400" />
    <span>{children}</span>
  </li>
);
