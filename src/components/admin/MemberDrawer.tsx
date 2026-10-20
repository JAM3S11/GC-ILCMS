import React, { useEffect, useRef, useState } from 'react';
import { MenuItem } from '@headlessui/react';
import {
  AlertTriangle,
  BadgeCheck,
  Building2,
  CalendarDays,
  Check,
  Clock,
  ExternalLink,
  Hash,
  Inbox,
  KeyRound,
  Link2,
  Mail,
  Pencil,
  RefreshCw,
  ShieldCheck,
  Trash2,
  UserCheck,
  UserRoundX,
  X,
} from 'lucide-react';
import { LaboratoryDepartment, UserRole } from '../../types';
import { Avatar, Button } from '../common/Dashboard';
import { Select } from '../common/Select';
import {
  PANEL_LINE,
  PANEL_TEXT,
  PANEL_TEXT_2,
  PANEL_TEXT_3,
  PanelBanner,
  PanelHeaderButton,
  PanelIconButton,
  PanelInlineLink,
  PanelMenuSeparator,
  PanelMoreMenu,
  PanelProperties,
  PanelProperty,
  PanelSectionHeading,
  SidePanel,
  panelDangerItemClass,
  panelMenuItemClass,
} from '../common/SidePanel';
import {
  GENERAL_ADMINISTRATION,
  departmentForRole,
  departmentLabel,
  departmentsForRole,
  isLabScopedRole,
} from '../../lib/departments';
import { roleLabel } from './roles';
import {
  DepartmentRequestRecord,
  LastActive,
  MemberActions,
  MemberStatus,
  ProfileRequestRecord,
  RollEntry,
  STATUS,
  formatDate,
  isPlaceholder,
  memberStatus,
} from './MembersView';

/* ---------------------------------------------------------------------------
 * The member profile, in the app's side panel: slides in over the Members list
 * and expands into a centred modal (Shift+E), where the properties move into a
 * right-hand column and previous / next step through the list.
 * --------------------------------------------------------------------------- */

const ALL_ROLES: UserRole[] = [
  'CEO', 'VICE_CEO', 'ADMINISTRATOR', 'CLERK', 'ACCOUNTANT', 'HR',
  'RECEPTIONIST', 'HEAD_OF_DEPARTMENT', 'SENIOR_CHEMIST', 'ANALYST',
  'INTERN', 'ATTACHEE', 'QUALITY_MANAGER', 'SUPER_ADMIN',
];

const STATUS_DOT: Record<MemberStatus, string> = {
  ACTIVE: 'bg-emerald-500',
  INVITED: 'bg-amber-500',
  NO_ACCOUNT: 'border border-slate-400 dark:border-[#6B6B6B]',
  DISABLED: 'bg-rose-500',
  LEFT: 'bg-slate-400 dark:bg-[#6B6B6B]',
};

export const MemberDrawer: React.FC<{
  entry: RollEntry | null;
  onClose: () => void;
  currentUserId: string;
  workingId: string | null;
  actions: MemberActions;
  departmentRequests: DepartmentRequestRecord[];
  profileRequests: ProfileRequestRecord[];
  onDecideDepartment: (id: string, decision: 'approve' | 'reject') => void;
  onDecideProfile: (id: string, decision: 'approve' | 'reject') => void;
  onSaveRole: (entry: RollEntry, role: UserRole, department: LaboratoryDepartment) => Promise<void>;
  /** Previous / next member in the list as shown, for moving between them without closing. */
  onPrevious?: () => void;
  onNext?: () => void;
  position?: { index: number; total: number };
}> = ({
  entry,
  onClose,
  currentUserId,
  workingId,
  actions,
  departmentRequests,
  profileRequests,
  onDecideDepartment,
  onDecideProfile,
  onSaveRole,
  onPrevious,
  onNext,
  position,
}) => {
  const [roleDraft, setRoleDraft] = useState<UserRole>('ANALYST');
  const [departmentDraft, setDepartmentDraft] = useState<LaboratoryDepartment>(GENERAL_ADMINISTRATION);
  const [toast, setToast] = useState('');
  const requestsRef = useRef<HTMLElement>(null);
  const roleRef = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!entry) return;
    setRoleDraft(entry.role);
    setDepartmentDraft(entry.department);
  }, [entry?.id, entry?.role, entry?.department]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(''), 1800);
    return () => window.clearTimeout(id);
  }, [toast]);

  const isSelf = !!entry && entry.userId === currentUserId;
  const busy = !!entry && workingId === entry.id;
  const status: MemberStatus = entry ? memberStatus(entry) : 'NO_ACCOUNT';
  const pendingDepartment = entry?.userId ? departmentRequests.filter((request) => request.userId === entry.userId) : [];
  const pendingProfile = entry?.userId ? profileRequests.filter((request) => request.userId === entry.userId) : [];
  const pendingCount = pendingDepartment.length + pendingProfile.length;
  const roleChanged = !!entry && (roleDraft !== entry.role || departmentDraft !== entry.department);
  const canEditRole = !!entry?.userId && !isSelf;

  const copyEmail = async () => {
    if (!entry) return;
    try {
      await navigator.clipboard.writeText(entry.email);
      setToast('Email copied');
    } catch {
      setToast('Could not copy the email');
    }
  };

  // Keep the department only while the new role still allows it, otherwise fall back to that role's default.
  const chooseRole = (next: UserRole) => {
    setRoleDraft(next);
    setDepartmentDraft(departmentForRole(next, departmentDraft));
  };

  const scrollTo = (section: React.RefObject<HTMLElement | null>) =>
    section.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });

  // The one action that matters most for this member's state, shown as a labelled button in the header.
  const primary = !entry ? null
    : status === 'NO_ACCOUNT' ? { label: 'Issue account', icon: Mail, run: () => actions.onIssue(entry) }
      : status === 'INVITED' ? { label: 'Resend invitation', icon: RefreshCw, run: () => actions.onResendInvite(entry) }
        : status === 'DISABLED' && !isSelf ? { label: 'Enable account', icon: UserCheck, run: () => actions.onToggleAccount(entry) }
          : status === 'LEFT' && !isSelf ? { label: 'Reinstate', icon: UserCheck, run: () => actions.onSetService(entry, 'SERVING') }
            : status === 'ACTIVE' ? { label: 'Send password reset', icon: KeyRound, run: () => actions.onResetPassword(entry) }
              : null;

  const properties = entry && (
    <PanelProperties>
      <PanelProperty icon={BadgeCheck} label="Status">
        <span className={`inline-block h-2.5 w-2.5 shrink-0 rounded-full ${STATUS_DOT[status]}`} aria-hidden="true" />
        {STATUS[status].label}
      </PanelProperty>
      <PanelProperty icon={ShieldCheck} label="Title" onClick={canEditRole ? () => scrollTo(roleRef) : undefined} hint="Change role">
        {roleLabel(entry.role)}
      </PanelProperty>
      <PanelProperty icon={Building2} label="Department" onClick={canEditRole ? () => scrollTo(roleRef) : undefined} hint="Change department">
        {departmentLabel(entry.department)}
      </PanelProperty>
      <PanelProperty icon={Mail} label="Email" onClick={() => void copyEmail()} hint="Copy email">
        {entry.email}
      </PanelProperty>
      <PanelProperty icon={Hash} label="Staff no." onClick={() => actions.onEdit(entry)} hint="Edit roll details">
        <span className={`font-mono text-xs ${isPlaceholder(entry.staffNumber) ? 'text-amber-700 dark:text-amber-400' : ''}`}>{entry.staffNumber}</span>
      </PanelProperty>
      <PanelProperty icon={Clock} label="Last active">
        {entry.signedIn || entry.lastSignInAt ? <LastActive entry={entry} /> : <span className={PANEL_TEXT_3}>Never signed in</span>}
      </PanelProperty>
      <PanelProperty icon={UserCheck} label="Service">
        {entry.employmentStatus === 'SERVING' ? 'Serving' : <span className={PANEL_TEXT_3}>Left service</span>}
      </PanelProperty>
      <PanelProperty icon={CalendarDays} label="On the roll">
        {formatDate(entry.createdAt)}
      </PanelProperty>
    </PanelProperties>
  );

  const banners = entry && (
    <div className="space-y-2 empty:hidden">
      {status === 'DISABLED' && (
        <PanelBanner tone="danger" icon={AlertTriangle} action={!isSelf ? <PanelInlineLink onClick={() => actions.onToggleAccount(entry)}>Enable</PanelInlineLink> : undefined}>
          This account is disabled and cannot sign in.
        </PanelBanner>
      )}
      {status === 'LEFT' && (
        <PanelBanner tone="danger" icon={AlertTriangle} action={!isSelf ? <PanelInlineLink onClick={() => actions.onSetService(entry, 'SERVING')}>Reinstate</PanelInlineLink> : undefined}>
          Marked as having left service.
        </PanelBanner>
      )}
      {status === 'INVITED' && (
        <PanelBanner tone="attention" icon={Mail} action={<PanelInlineLink onClick={() => actions.onResendInvite(entry)}>Resend invitation</PanelInlineLink>}>
          The invitation has not been accepted yet.
        </PanelBanner>
      )}
      {pendingCount > 0 && (
        <PanelBanner tone="attention" icon={Inbox} action={<PanelInlineLink onClick={() => scrollTo(requestsRef)}>Review</PanelInlineLink>}>
          {pendingCount} request{pendingCount === 1 ? '' : 's'} waiting for your review.
        </PanelBanner>
      )}
    </div>
  );

  const requests = entry && pendingCount > 0 && (
    <section ref={requestsRef} aria-labelledby="member-requests" className="scroll-mt-4">
      <PanelSectionHeading id="member-requests" title="Waiting for your review" count={pendingCount} />
      <ul className="space-y-2">
        {pendingDepartment.map((request) => (
          <li key={request.id} className={`rounded-lg border p-3 ${PANEL_LINE}`}>
            <p className={`text-[13px] font-medium ${PANEL_TEXT}`}>Department move</p>
            <p className={`mt-0.5 text-xs ${PANEL_TEXT_2}`}>
              {departmentLabel(request.currentDepartment)} → <strong className={`font-semibold ${PANEL_TEXT}`}>{departmentLabel(request.requestedDepartment)}</strong> · {formatDate(request.createdAt)}
            </p>
            {request.reason && <p className={`mt-1 text-xs ${PANEL_TEXT_2}`}>{request.reason}</p>}
            <div className="mt-2.5 flex gap-2">
              <Button size="xs" variant="success" icon={Check} disabled={workingId === request.id} onClick={() => onDecideDepartment(request.id, 'approve')}>Approve</Button>
              <Button size="xs" variant="ghost" icon={X} disabled={workingId === request.id} onClick={() => onDecideDepartment(request.id, 'reject')}>Reject</Button>
            </div>
          </li>
        ))}
        {pendingProfile.map((request) => (
          <li key={request.id} className={`rounded-lg border p-3 ${PANEL_LINE}`}>
            <p className={`text-[13px] font-medium ${PANEL_TEXT}`}>Profile change <span className={`font-normal ${PANEL_TEXT_2}`}>· {formatDate(request.createdAt)}</span></p>
            <ul className={`mt-1 space-y-0.5 text-xs ${PANEL_TEXT_2}`}>
              {request.requestedFullName && <li>Name → <strong className={`font-semibold ${PANEL_TEXT}`}>{request.requestedFullName}</strong></li>}
              {request.requestedRole && <li>Title → <strong className={`font-semibold ${PANEL_TEXT}`}>{roleLabel(request.requestedRole)}</strong></li>}
              {request.requestedEmail && <li>Email → <strong className={`font-semibold ${PANEL_TEXT}`}>{request.requestedEmail}</strong></li>}
            </ul>
            {request.reason && <p className={`mt-1 text-xs ${PANEL_TEXT_2}`}>{request.reason}</p>}
            <div className="mt-2.5 flex gap-2">
              <Button size="xs" variant="success" icon={Check} disabled={workingId === request.id} onClick={() => onDecideProfile(request.id, 'approve')}>Approve</Button>
              <Button size="xs" variant="ghost" icon={X} disabled={workingId === request.id} onClick={() => onDecideProfile(request.id, 'reject')}>Reject</Button>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );

  const roleEditor = entry && canEditRole && (
    <section ref={roleRef} aria-labelledby="member-role" className="scroll-mt-4">
      <PanelSectionHeading id="member-role" title="Role & department" />
      <div className="grid gap-3 sm:grid-cols-2">
        <Select<UserRole>
          aria-label="Role"
          value={roleDraft}
          onChange={chooseRole}
          options={ALL_ROLES.map((item) => ({ value: item, label: roleLabel(item) }))}
        />
        <Select<LaboratoryDepartment>
          aria-label="Department"
          value={departmentDraft}
          onChange={setDepartmentDraft}
          disabled={!isLabScopedRole(roleDraft)}
          options={departmentsForRole(roleDraft).map((item) => ({ value: item, label: departmentLabel(item) }))}
        />
      </div>
      <div className="mt-3 flex items-center justify-end gap-2">
        {!roleChanged && <span className={`mr-auto text-xs ${PANEL_TEXT_3}`}>Pick a new role or department to change it.</span>}
        <Button size="sm" variant="ghost" disabled={!roleChanged || busy} onClick={() => { setRoleDraft(entry.role); setDepartmentDraft(entry.department); }}>Cancel</Button>
        <Button size="sm" variant="primary" icon={ShieldCheck} disabled={!roleChanged || busy} onClick={() => void onSaveRole(entry, roleDraft, departmentDraft)}>Save role</Button>
      </div>
    </section>
  );

  const headerActions = entry && (
    <>
      {primary && <PanelHeaderButton icon={primary.icon} label={primary.label} onClick={primary.run} disabled={busy} />}
      <PanelIconButton label="Open full profile" onClick={() => actions.onOpenProfile(entry)}><ExternalLink /></PanelIconButton>
      <PanelIconButton label="Copy email" onClick={() => void copyEmail()}><Link2 /></PanelIconButton>
      <PanelMoreMenu>
        <MenuItem>
          <button type="button" className={panelMenuItemClass} onClick={() => actions.onEdit(entry)}>
            <Pencil className="h-4 w-4 opacity-60" /> Edit roll details
          </button>
        </MenuItem>
        {status === 'ACTIVE' && (
          <MenuItem>
            <button type="button" className={panelMenuItemClass} onClick={() => actions.onResetPassword(entry)}>
              <KeyRound className="h-4 w-4 opacity-60" /> Send password reset
            </button>
          </MenuItem>
        )}
        {!isSelf && entry.userId && (status === 'ACTIVE' || status === 'DISABLED') && (
          <MenuItem>
            <button type="button" className={panelMenuItemClass} onClick={() => actions.onToggleAccount(entry)}>
              {status === 'DISABLED'
                ? <><UserCheck className="h-4 w-4 opacity-60" /> Enable account</>
                : <><UserRoundX className="h-4 w-4 opacity-60" /> Disable account</>}
            </button>
          </MenuItem>
        )}
        {!isSelf && (
          <MenuItem>
            <button type="button" className={panelMenuItemClass} onClick={() => actions.onSetService(entry, entry.employmentStatus === 'SERVING' ? 'LEFT' : 'SERVING')}>
              {entry.employmentStatus === 'SERVING'
                ? <><UserRoundX className="h-4 w-4 opacity-60" /> Mark as left service</>
                : <><UserCheck className="h-4 w-4 opacity-60" /> Reinstate</>}
            </button>
          </MenuItem>
        )}
        {!isSelf && (
          <>
            <PanelMenuSeparator />
            <MenuItem>
              <button type="button" className={panelDangerItemClass} onClick={() => actions.onDelete(entry)}>
                <Trash2 className="h-4 w-4" /> {entry.userId ? 'Delete user' : 'Remove from roll'}
              </button>
            </MenuItem>
          </>
        )}
      </PanelMoreMenu>
    </>
  );

  return (
    <SidePanel
      open={!!entry}
      onClose={onClose}
      section="Members"
      recordId={entry?.staffNumber}
      titleId="member-drawer-title"
      actions={headerActions}
      onPrevious={onPrevious}
      onNext={onNext}
      position={position}
      aside={properties}
      toast={toast}
      scrollKey={entry?.id}
    >
      {({ expanded }) => entry && (
        <div className="space-y-8 px-4 py-6 sm:px-6">
          <div className="space-y-5">
            {banners}
            <div className="flex items-center gap-3">
              <Avatar name={entry.fullName} size="lg" tone={status === 'DISABLED' ? 'rose' : status === 'INVITED' ? 'amber' : 'slate'} />
              <div className="min-w-0">
                <h2 id="member-drawer-title" className={`truncate text-[22px] font-semibold leading-tight ${PANEL_TEXT}`}>
                  {entry.fullName}
                  {isSelf && <span className={`ml-2 text-sm font-normal ${PANEL_TEXT_2}`}>(you)</span>}
                </h2>
                <p className={`truncate text-[13px] ${PANEL_TEXT_2}`}>{roleLabel(entry.role)} · {departmentLabel(entry.department)}</p>
              </div>
            </div>
          </div>
          {!expanded && properties}
          {requests}
          {roleEditor}
        </div>
      )}
    </SidePanel>
  );
};
