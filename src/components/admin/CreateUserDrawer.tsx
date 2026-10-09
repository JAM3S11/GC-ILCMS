import React, { useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Mail, ScrollText, ShieldCheck, UserPlus, X } from 'lucide-react';
import { LaboratoryDepartment, UserRole } from '../../types';
import { Avatar, Button, StatusPill } from '../common/Dashboard';
import { Select } from '../common/Select';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { departmentForRole, departmentLabel, departmentsForRole, isLabScopedRole } from '../../lib/departments';
import { ROLE_GROUPS, ROLE_INFO, roleLabel } from './roles';

export interface NewAccount {
  fullName: string;
  email: string;
  role: UserRole;
  department: LaboratoryDepartment;
}

interface CreateUserDrawerProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (account: NewAccount) => Promise<void>;
  working: boolean;
  /** Server error from the last attempt; shown inside the drawer so the form stays filled. */
  error: string;
  /** Emails already on the register, to warn before submitting a duplicate. */
  existingEmails: string[];
  /** Departments that already have a Head of Department. */
  departmentsWithHead: LaboratoryDepartment[];
}

const DEFAULT_ROLE: UserRole = 'ANALYST';

const inputClass =
  'h-10 w-full rounded-lg border border-slate-300 bg-white px-3 text-sm text-slate-900 transition-colors placeholder:text-slate-400 focus:border-amber-500 focus:outline-none focus:ring-4 focus:ring-amber-500/10 dark:border-slate-700 dark:bg-slate-950 dark:text-white';

/**
 * "Create staff account" as a side drawer (bottom sheet on phones): officer
 * details, role and posting, then a preview of the row exactly as it will
 * appear in User accounts, so the administrator knows what to look for.
 */
export const CreateUserDrawer: React.FC<CreateUserDrawerProps> = ({
  open,
  onOpenChange,
  onSubmit,
  working,
  error,
  existingEmails,
  departmentsWithHead,
}) => {
  const isMobile = useIsMobile();
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<UserRole>(DEFAULT_ROLE);
  const [department, setDepartment] = useState<LaboratoryDepartment>(departmentForRole(DEFAULT_ROLE));

  // Start every opening with a clean form.
  useEffect(() => {
    if (!open) return;
    setFullName('');
    setEmail('');
    setRole(DEFAULT_ROLE);
    setDepartment(departmentForRole(DEFAULT_ROLE));
  }, [open]);

  const chooseRole = (next: UserRole) => {
    setRole(next);
    setDepartment(departmentForRole(next, department));
  };

  const trimmedEmail = email.trim().toLowerCase();
  const duplicate = !!trimmedEmail && existingEmails.includes(trimmedEmail);
  const headTaken = role === 'HEAD_OF_DEPARTMENT' && departmentsWithHead.includes(department);
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail);
  const ready = fullName.trim().length >= 2 && emailValid && !duplicate && !headTaken;

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    if (!ready || working) return;
    void onSubmit({ fullName: fullName.trim(), email: trimmedEmail, role, department });
  };

  // Listed in establishment order; the chosen role's duty shows as the field hint.
  const roleOptions = ROLE_GROUPS.flatMap((group) =>
    group.roles.map((item) => ({ value: item, label: `${ROLE_INFO[item].label} — ${group.title}` })),
  );

  return (
    <Drawer open={open} onOpenChange={onOpenChange} direction={isMobile ? 'bottom' : 'right'}>
      <DrawerContent
        className={
          isMobile
            ? 'max-h-[92dvh] bg-white dark:bg-slate-900'
            : 'bg-white data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-lg dark:border-slate-800 dark:bg-slate-900'
        }
      >
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <DrawerHeader className="border-b border-slate-200 px-5 py-4 text-left dark:border-slate-800">
            <div className="flex items-start gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-amber-500/10 text-amber-700 ring-1 ring-inset ring-amber-500/20 dark:text-amber-400">
                <UserPlus className="h-5 w-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="text-[11px] font-semibold uppercase tracking-wider text-amber-700 dark:text-amber-400">Staff account register</p>
                <DrawerTitle className="text-base text-slate-900 dark:text-white">Create staff account</DrawerTitle>
                <DrawerDescription className="text-xs text-slate-500 dark:text-slate-400">
                  The officer is emailed a one-time activation link that expires after 15 minutes.
                </DrawerDescription>
              </div>
              <DrawerClose asChild>
                <button
                  type="button"
                  aria-label="Close"
                  className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </DrawerClose>
            </div>
          </DrawerHeader>

          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-5 py-5">
            <FormSection number={1} title="Officer details">
              <Field label="Full name" hint="As it appears on the staff establishment list.">
                <input required minLength={2} autoFocus value={fullName} onChange={(e) => setFullName(e.target.value)} placeholder="e.g. Jane Wanjiku Mwangi" className={inputClass} />
              </Field>
              <Field
                label="Work email"
                hint={duplicate ? undefined : 'The activation link is sent here. Use the official work address.'}
                warning={duplicate ? 'An account with this email is already on the register.' : undefined}
              >
                <input required type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@gc.go.ke" className={inputClass} aria-invalid={duplicate || undefined} />
              </Field>
            </FormSection>

            <FormSection number={2} title="Role & posting">
              <Field label="Role" hint={ROLE_INFO[role].duty}>
                <Select value={role} onChange={chooseRole} options={roleOptions} />
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
                  disabled={!isLabScopedRole(role)}
                  options={departmentsForRole(role).map((item) => ({ value: item, label: departmentLabel(item) }))}
                />
              </Field>
            </FormSection>

            <FormSection number={3} title="How it will appear in User accounts">
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
                <WhatHappens icon={Mail}>An activation email goes to the work address. If it expires, use <strong>Resend</strong> on the account row.</WhatHappens>
                <WhatHappens icon={CheckCircle2}>The new account is pinned to the top of the register and highlighted.</WhatHappens>
                <WhatHappens icon={ScrollText}>The creation is recorded in the audit log under your name.</WhatHappens>
              </ul>
            </FormSection>

            {error && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-rose-200 bg-rose-50 px-3 py-2.5 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
                <AlertTriangle className="mt-px h-4 w-4 shrink-0" /> {error}
              </div>
            )}
          </div>

          <DrawerFooter className="flex-row items-center justify-end gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
            <DrawerClose asChild>
              <Button variant="ghost">Cancel</Button>
            </DrawerClose>
            <Button type="submit" variant="primary" icon={Mail} disabled={!ready || working}>
              {working ? 'Creating…' : 'Create & send invite'}
            </Button>
          </DrawerFooter>
        </form>
      </DrawerContent>
    </Drawer>
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
