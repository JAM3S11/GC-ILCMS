import React, { useEffect, useState } from 'react';
import {
  Activity,
  Bell,
  BellOff,
  CheckCheck,
  CheckCircle2,
  Check,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileText,
  FlaskConical,
  FolderOpen,
  Inbox,
  List,
  LogIn,
  LogOut,
  Package,
  Printer,
  Shield,
  Users,
  UserPlus,
  X,
} from 'lucide-react';
import { LaboratoryDepartment, OfficerVisitor, AppNotification } from '../../types';
import { VISITOR_STATUS } from './visitorStatus';
import { departmentLabel } from '../../lib/departments';
import { NationalIdReveal } from './NationalIdReveal';
import { Select } from '../common/Select';
import { LabNotifyButton } from './LabNotifyButton';
import {
  NotificationFilter,
  NotificationGroup,
  NotificationRow,
  NotificationTabs,
  filterNotifications,
  groupByDay,
  needsAttention,
} from '../notifications/NotificationFeed';
import {
  Avatar,
  Button,
  DashboardHeader,
  DashboardPage,
  DetailItem,
  EmptyState,
  KpiCard,
  KpiGrid,
  MeterRow,
  Panel,
  SearchInput,
  SegmentedControl,
  StatusPill,
  Tone,
  TONE,
  tableClasses as tc,
} from '../common/Dashboard';

interface LabBayViewProps {
  visitors: OfficerVisitor[];
  initialSelectedVisitorId?: string | null;
  onCheckOut: (visitorId: string) => Promise<void>;
  onLabReceive: (visitorId: string) => Promise<void>;
  onServiceComplete: (visitorId: string) => Promise<void>;
  canReceiveVisits: boolean;
  canCompleteVisits: boolean;
  canCheckOutVisits: boolean;
  isLoading: boolean;
  onRevealNationalId: (visitorId: string) => Promise<string | null>;
  hasMoreVisitors: boolean;
  isLoadingMoreVisitors: boolean;
  onLoadMoreVisitors: () => Promise<void>;
  currentUserName: string;
  /** Opens this visit's Water exhibit in the intake form to change its details; reception and the Water Head. */
  onEditClientDetails?: (visitor: OfficerVisitor) => void;
  onSendLabNotification?: (visitor: OfficerVisitor, resend: boolean) => Promise<void>;
}

interface CheckOutViewProps {
  visitors: OfficerVisitor[];
  onCheckOut: (visitorId: string) => Promise<void>;
  canCheckOutVisits: boolean;
  hasMoreVisitors: boolean;
  isLoadingMoreVisitors: boolean;
  onLoadMoreVisitors: () => Promise<void>;
}

interface NotificationsViewProps {
  notifications: AppNotification[];
  onMarkAllAsRead: () => void;
  onSelect: (notification: AppNotification) => void;
  unreadCount: number;
  description?: string;
  onAdminAction?: (notification: AppNotification, action: 'approve' | 'reject' | 'reset-password') => Promise<void>;
}

type VisitorProcessFilter = 'all' | 'active' | 'awaiting' | 'verified' | 'served';

const visitorStatusByFilter: Record<Exclude<VisitorProcessFilter, 'all'>, OfficerVisitor['status']> = {
  active: 'In Laboratory',
  awaiting: 'Awaiting Laboratory Reception',
  verified: 'Completed',
  served: 'Departed',
};

const processLabels: Record<VisitorProcessFilter, string> = {
  all: 'All',
  active: 'Active',
  awaiting: 'Awaiting',
  verified: 'Verified',
  served: 'Served',
};

type QueueFilter = 'all' | LaboratoryDepartment;

const getFilteredVisitors = (filter: VisitorProcessFilter, source: OfficerVisitor[]) => {
  if (filter === 'all') return source;
  return source.filter((visitor) => visitor.status === visitorStatusByFilter[filter]);
};

const notifTone: Record<AppNotification['type'], Tone> = {
  urgent: 'rose',
  warning: 'amber',
  success: 'emerald',
  info: 'sky',
};

/* ============================================================================
 * LAB BAY
 * ========================================================================== */

const HANDOVER_STAGES: {
  id: Exclude<VisitorProcessFilter, 'all'>;
  label: string;
  hint: string;
  icon: React.ComponentType<{ className?: string }>;
  tone: Tone;
}[] = [
  { id: 'awaiting', label: 'Awaiting laboratory', hint: 'Arrived, not yet received', icon: Clock, tone: 'sky' },
  { id: 'active', label: 'In laboratory', hint: 'Being served', icon: FlaskConical, tone: 'amber' },
  { id: 'verified', label: 'Ready for check-out', hint: 'Service complete', icon: CheckCircle2, tone: 'emerald' },
  { id: 'served', label: 'Checked out', hint: 'Has left the premises', icon: LogOut, tone: 'slate' },
];

const JOURNEY = ['Arrived', 'Received by lab', 'Service complete', 'Checked out'] as const;
const JOURNEY_STEP: Record<OfficerVisitor['status'], number> = {
  'Awaiting Laboratory Reception': 0,
  'In Laboratory': 1,
  Completed: 2,
  Departed: 3,
};

export const LabBayView: React.FC<LabBayViewProps> = ({
  visitors,
  initialSelectedVisitorId,
  onCheckOut,
  onLabReceive,
  canReceiveVisits,
  canCheckOutVisits,
  isLoading,
  onRevealNationalId,
  hasMoreVisitors,
  isLoadingMoreVisitors,
  onLoadMoreVisitors,
  currentUserName,
  onEditClientDetails,
  onSendLabNotification,
}) => {
  const [stageFilter, setStageFilter] = useState<VisitorProcessFilter>('all');
  const [labFilter, setLabFilter] = useState<QueueFilter>('all');
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (initialSelectedVisitorId) setSelectedId(initialSelectedVisitorId);
  }, [initialSelectedVisitorId]);

  const laboratories = Array.from(new Set(visitors.map((v) => v.laboratory)));
  const count = (stage: Exclude<VisitorProcessFilter, 'all'>) => getFilteredVisitors(stage, visitors).length;

  const q = query.trim().toLowerCase();
  const list = getFilteredVisitors(stageFilter, visitors)
    .filter((v) => labFilter === 'all' || v.laboratory === labFilter)
    .filter(
      (v) =>
        !q ||
        v.officerName.toLowerCase().includes(q) ||
        v.visitNumber.toLowerCase().includes(q) ||
        (v.station ?? '').toLowerCase().includes(q) ||
        (v.exhibitsPresented ?? '').toLowerCase().includes(q),
    );
  const selected = list.find((v) => v.id === selectedId) ?? list[0];
  const status = selected ? VISITOR_STATUS[selected.status] : null;

  // The one thing this person can do for the selected client right now.
  const nextStep = (() => {
    if (!selected) return null;
    if (selected.status === 'Awaiting Laboratory Reception') {
      return canReceiveVisits
        ? { label: 'Accept at laboratory', icon: CheckCircle2, variant: 'primary' as const, run: () => void onLabReceive(selected.id) }
        : { note: 'Waiting for the laboratory to accept this client.' };
    }
    if (selected.status === 'In Laboratory') {
      return { note: 'The client is with the laboratory. Exhibits are handled in the Exhibit Laboratory.' };
    }
    if (selected.status === 'Completed') {
      return canCheckOutVisits
        ? { label: 'Check out', icon: LogOut, variant: 'primary' as const, run: () => void onCheckOut(selected.id) }
        : { note: 'Reception checks the client out.' };
    }
    return { note: 'This visit is closed.' };
  })();

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Operations', 'Reception & Client Handover']}
        title="Reception & Client Handover"
        description="Follow each client from arrival at reception, through the laboratory, to check-out."
        meta={<StatusPill tone="emerald" pulse>Live</StatusPill>}
      />

      {/* The handover pipeline: click a stage to filter the list. */}
      <section aria-label="Handover stages" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {HANDOVER_STAGES.map((stage) => {
          const active = stageFilter === stage.id;
          return (
            <button
              key={stage.id}
              type="button"
              aria-pressed={active}
              onClick={() => setStageFilter(active ? 'all' : stage.id)}
              className={`rounded-xl border bg-white p-4 text-left shadow-sm transition-all dark:bg-slate-900 ${
                active
                  ? 'border-amber-500 ring-2 ring-amber-500/20'
                  : 'border-slate-200 hover:border-slate-300 dark:border-slate-800 dark:hover:border-slate-700'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="text-sm text-slate-500 dark:text-slate-400">{stage.label}</span>
                <span className={`flex h-7 w-7 items-center justify-center rounded-lg ring-1 ring-inset ${TONE[stage.tone].chip}`}>
                  <stage.icon className="h-3.5 w-3.5" />
                </span>
              </div>
              <div className="mt-2 text-3xl font-semibold tabular-nums text-slate-900 dark:text-white">{count(stage.id)}</div>
              <div className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">{stage.hint}</div>
            </button>
          );
        })}
      </section>

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* Client list */}
        <section aria-label="Clients" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="space-y-2 border-b border-slate-200 p-3 dark:border-slate-800">
            <SearchInput value={query} onChange={setQuery} placeholder="Search name, visit no. or station" className="w-full" />
            <div className="flex items-center gap-2">
              {laboratories.length > 1 && (
                <Select
                  size="xs"
                  className="min-w-0 flex-1"
                  aria-label="Filter by laboratory"
                  value={labFilter}
                  onChange={(value) => setLabFilter(value as QueueFilter)}
                  options={[
                    { value: 'all' as QueueFilter, label: 'All laboratories' },
                    ...laboratories.map((lab) => ({ value: lab as QueueFilter, label: departmentLabel(lab) })),
                  ]}
                />
              )}
              <span className="ml-auto whitespace-nowrap text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                {list.length} {list.length === 1 ? 'client' : 'clients'}
                {stageFilter !== 'all' && (
                  <button type="button" onClick={() => setStageFilter('all')} className="ml-2 font-medium text-amber-700 hover:underline dark:text-amber-400">
                    Clear
                  </button>
                )}
              </span>
            </div>
          </div>

          {isLoading ? (
            <EmptyState icon={Inbox} title="Loading clients" />
          ) : list.length === 0 ? (
            <EmptyState icon={Users} title="No clients here" description={q ? `Nothing matches “${query.trim()}”.` : 'No clients at this stage.'} />
          ) : (
            <ul className="max-h-[560px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {list.map((vis) => {
                const s = VISITOR_STATUS[vis.status];
                const isSelected = selected?.id === vis.id;
                return (
                  <li key={vis.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(vis.id)}
                      aria-current={isSelected ? 'true' : undefined}
                      className={`flex w-full items-start gap-3 px-4 py-3 text-left transition-colors ${
                        isSelected ? 'bg-amber-500/5 shadow-[inset_3px_0_0_var(--gc-amber-500)]' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <Avatar name={vis.officerName} size="sm" tone={s.tone} />
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="truncate text-[13px] font-medium text-slate-900 dark:text-white">{vis.officerName}</span>
                          <span className="shrink-0 text-[11px] tabular-nums text-slate-400">{vis.timeIn}</span>
                        </div>
                        <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {departmentLabel(vis.laboratory)} · {vis.station || 'No station'}
                        </div>
                        <div className="mt-1.5 flex items-center justify-between gap-2">
                          <StatusPill tone={s.tone}>{s.label}</StatusPill>
                          <span className="font-mono text-[10px] text-slate-400">{vis.visitNumber}</span>
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
          {hasMoreVisitors && (
            <div className="border-t border-slate-100 p-3 text-center dark:border-slate-800">
              <Button size="sm" variant="ghost" disabled={isLoadingMoreVisitors} onClick={() => void onLoadMoreVisitors()}>
                {isLoadingMoreVisitors ? 'Loading older records…' : 'Load older records'}
              </Button>
            </div>
          )}
        </section>

        {/* Selected client */}
        <section aria-label="Client details" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900 lg:sticky lg:top-4">
          {!selected || !status || !nextStep ? (
            <EmptyState icon={Inbox} title="Select a client" description="Choose someone from the list to see their details and next step." />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3.5 border-b border-slate-200 p-5 dark:border-slate-800">
                <Avatar name={selected.officerName} size="lg" tone={status.tone} />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-base font-semibold text-slate-900 dark:text-white">{selected.officerName}</h2>
                    <StatusPill tone={status.tone} pulse={selected.status !== 'Departed'}>{status.label}</StatusPill>
                    {selected.visitorType === 'POLICE_OFFICER' && (
                      <StatusPill tone="sky" dot={false}><Shield className="h-3 w-3" /> Police</StatusPill>
                    )}
                  </div>
                  <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono">{selected.visitNumber}</span> · {selected.station || 'No station'} · {departmentLabel(selected.laboratory)}
                  </p>
                </div>
              </div>

              {onEditClientDetails && selected.laboratory === 'Water' && selected.status !== 'Departed' && (
                <div className="flex items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-950/40">
                  <span className="text-slate-500 dark:text-slate-400">Something wrong with the client or exhibit details?</span>
                  <Button size="xs" variant="secondary" icon={FileText} onClick={() => onEditClientDetails(selected)}>
                    Edit details
                  </Button>
                </div>
              )}

              {/* Journey */}
              <ol aria-label="Visit progress" className="grid grid-cols-4 gap-1 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
                {JOURNEY.map((step, index) => {
                  const current = JOURNEY_STEP[selected.status];
                  const done = index < current || (index === current && selected.status === 'Departed');
                  const isCurrent = index === current && selected.status !== 'Departed';
                  return (
                    <li key={step} className="min-w-0">
                      <div className={`h-1 rounded-full ${done ? 'bg-emerald-500' : isCurrent ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
                      <div className={`mt-1.5 truncate text-[11px] ${done || isCurrent ? 'font-medium text-slate-900 dark:text-white' : 'text-slate-400'}`}>{step}</div>
                    </li>
                  );
                })}
              </ol>

              {/* Next step */}
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-slate-50/70 px-5 py-3.5 dark:border-slate-800 dark:bg-slate-950/40">
                <div>
                  <div className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Next step</div>
                  {'note' in nextStep && <p className="mt-0.5 text-[13px] text-slate-600 dark:text-slate-300">{nextStep.note}</p>}
                  {'label' in nextStep && <p className="mt-0.5 text-[13px] font-medium text-slate-900 dark:text-white">{nextStep.label}</p>}
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {onSendLabNotification && selected.status === 'Awaiting Laboratory Reception' && (
                    <LabNotifyButton
                      visit={selected}
                      size="sm"
                      notifyLabel={`Notify ${departmentLabel(selected.laboratory)}`}
                      onSend={(visitor, resend) => onSendLabNotification(visitor, resend)}
                    />
                  )}
                  {'label' in nextStep && (
                    <Button variant={nextStep.variant} icon={nextStep.icon} onClick={nextStep.run}>
                      {nextStep.label}
                    </Button>
                  )}
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-b border-slate-200 p-5 sm:grid-cols-3 dark:border-slate-800">
                <DetailItem label="Arrived">{selected.date || '—'} · {selected.timeIn}</DetailItem>
                <DetailItem label="National ID">
                  <NationalIdReveal visitorId={selected.id} maskedValue={selected.nationalId || '—'} onReveal={onRevealNationalId} />
                </DetailItem>
                <DetailItem label="Phone">{selected.phone || '—'}</DetailItem>
                <DetailItem label="Station">{selected.station || '—'}</DetailItem>
                <DetailItem label="Service badge">{selected.badgeNumber || '—'}</DetailItem>
                <DetailItem label="Vehicle">{selected.vehicleRegistration || '—'}</DetailItem>
              </dl>

              <div className="grid gap-3 p-5 md:grid-cols-2">
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950/50">
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <FileText className="h-3.5 w-3.5" /> Documents presented
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">{selected.documentsPresented || 'No documents recorded.'}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950/50">
                  <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                    <ClipboardList className="h-3.5 w-3.5" /> Exhibits brought
                  </div>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">{selected.exhibitsPresented || 'No exhibit details recorded.'}</p>
                </div>
                <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950/50 md:col-span-2">
                  <div className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Purpose of visit</div>
                  <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">{selected.purposeOfVisit || '—'}</p>
                </div>
              </div>

              <div className="border-t border-slate-100 bg-slate-50/60 px-5 py-2.5 text-[11px] text-slate-500 dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
                Viewing as {currentUserName}
              </div>
            </>
          )}
        </section>
      </div>
    </DashboardPage>
  );
};

/* ============================================================================
 * CHECK OUT
 * ========================================================================== */

const CHECKOUT_CONFIRMATIONS = [
  'Laboratory service is complete',
  'Exhibit receipt handed to the officer',
  'Visitor badge returned to the desk',
];

export const CheckOutView: React.FC<CheckOutViewProps> = ({
  visitors, onCheckOut, canCheckOutVisits, hasMoreVisitors, isLoadingMoreVisitors, onLoadMoreVisitors,
}) => {
  const ready = visitors.filter((v) => v.status === 'Completed');
  const departed = visitors.filter((v) => v.status === 'Departed');
  const stillWaiting = visitors.filter((v) => v.status === 'Awaiting Laboratory Reception' || v.status === 'In Laboratory').length;

  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [confirmed, setConfirmed] = useState<Set<string>>(new Set());
  const [working, setWorking] = useState(false);

  const selected = ready.find((v) => v.id === selectedId) ?? ready[0];
  const allConfirmed = confirmed.size === CHECKOUT_CONFIRMATIONS.length;

  // A new client starts with a clean set of confirmations.
  useEffect(() => { setConfirmed(new Set()); }, [selected?.id]);

  const toggle = (item: string) =>
    setConfirmed((previous) => {
      const next = new Set(previous);
      if (!next.delete(item)) next.add(item);
      return next;
    });

  const complete = async () => {
    if (!selected) return;
    setWorking(true);
    try {
      await onCheckOut(selected.id);
    } finally {
      setWorking(false);
    }
  };

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Operations', 'Check Out']}
        title="Check out"
        description="Confirm the handover, then sign the client out of the visitor register."
        meta={
          <StatusPill tone={ready.length ? 'amber' : 'emerald'} pulse={ready.length > 0}>
            {ready.length ? `${ready.length} ready to leave` : 'All clear'}
          </StatusPill>
        }
      />

      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
        {/* Step 1: who is leaving */}
        <section aria-label="Ready to check out" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Ready to check out</h2>
            <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{ready.length}</span>
          </div>
          {ready.length === 0 ? (
            <EmptyState
              icon={CheckCheck}
              title="No one is ready to leave"
              description={stillWaiting > 0 ? `${stillWaiting} ${stillWaiting === 1 ? 'client is' : 'clients are'} still with reception or the laboratory.` : 'Clients appear here when the laboratory has finished with them.'}
            />
          ) : (
            <ul className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
              {ready.map((v) => {
                const isSelected = selected?.id === v.id;
                return (
                  <li key={v.id}>
                    <button
                      type="button"
                      onClick={() => setSelectedId(v.id)}
                      aria-current={isSelected ? 'true' : undefined}
                      className={`flex w-full items-center gap-3 px-4 py-3 text-left transition-colors ${
                        isSelected ? 'bg-amber-500/5 shadow-[inset_3px_0_0_var(--gc-amber-500)]' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                      }`}
                    >
                      <Avatar name={v.officerName} size="sm" tone="amber" />
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-[13px] font-medium text-slate-900 dark:text-white">{v.officerName}</div>
                        <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                          {v.station || 'No station'} · in at {v.timeIn}
                        </div>
                      </div>
                    </button>
                  </li>
                );
              })}
            </ul>
          )}
        </section>

        {/* Step 2: confirm and complete */}
        <section aria-label="Check-out summary" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          {!selected ? (
            <EmptyState icon={LogOut} title="Nothing to check out" description="Select a client once they are ready to leave." />
          ) : (
            <>
              <div className="flex items-center gap-3.5 border-b border-slate-200 p-5 dark:border-slate-800">
                <Avatar name={selected.officerName} size="lg" tone="amber" />
                <div className="min-w-0">
                  <h2 className="text-base font-semibold text-slate-900 dark:text-white">{selected.officerName}</h2>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    <span className="font-mono">{selected.visitNumber}</span> · {selected.station || 'No station'} · {departmentLabel(selected.laboratory)}
                  </p>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-4 border-b border-slate-200 p-5 sm:grid-cols-3 dark:border-slate-800">
                <DetailItem label="Arrived">{selected.date || '—'} · {selected.timeIn}</DetailItem>
                <DetailItem label="Service badge">{selected.badgeNumber || '—'}</DetailItem>
                <DetailItem label="Exhibits brought">{selected.exhibitsPresented || '—'}</DetailItem>
              </dl>

              <fieldset className="border-b border-slate-200 p-5 dark:border-slate-800">
                <legend className="text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">Confirm before check-out</legend>
                <ul className="mt-3 space-y-2">
                  {CHECKOUT_CONFIRMATIONS.map((item) => (
                    <li key={item}>
                      <label className="flex cursor-pointer items-center gap-2.5 text-[13px] text-slate-700 dark:text-slate-200">
                        <input
                          type="checkbox"
                          checked={confirmed.has(item)}
                          onChange={() => toggle(item)}
                          className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-500"
                        />
                        {item}
                      </label>
                    </li>
                  ))}
                </ul>
              </fieldset>

              <div className="flex flex-wrap items-center justify-between gap-3 bg-slate-50/70 px-5 py-4 dark:bg-slate-950/40">
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {canCheckOutVisits
                    ? allConfirmed ? 'Everything is confirmed.' : 'Tick each item to continue.'
                    : 'Only reception staff can complete a check-out.'}
                </p>
                {canCheckOutVisits && (
                  <Button variant="primary" icon={LogOut} disabled={!allConfirmed || working} onClick={() => void complete()}>
                    {working ? 'Checking out…' : 'Complete check-out'}
                  </Button>
                )}
              </div>
            </>
          )}
        </section>
      </div>

      {/* Recent departures */}
      <section aria-label="Recent departures" className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">Recent departures</h2>
          <span className="text-xs tabular-nums text-slate-500 dark:text-slate-400">{departed.length} signed out</span>
        </div>
        {departed.length === 0 ? (
          <EmptyState icon={LogOut} title="No departures yet" description="Clients you check out will be listed here." />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {departed.slice(0, 10).map((v) => {
              const minutes = getDurationInMinutes(v.timeIn, v.timeOut);
              return (
                <li key={v.id} className="flex items-center gap-3 px-4 py-3">
                  <Avatar name={v.officerName} size="sm" />
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-[13px] font-medium text-slate-900 dark:text-white">{v.officerName}</div>
                    <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">{v.station || 'No station'}</div>
                  </div>
                  <div className="text-right text-[11px] tabular-nums text-slate-500 dark:text-slate-400">
                    {v.timeIn} → {v.timeOut || '—'}
                    {minutes !== null && <div className="text-slate-400">{formatDuration(minutes)} on site</div>}
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </section>
      {hasMoreVisitors && (
        <div className="flex justify-center">
          <Button variant="secondary" disabled={isLoadingMoreVisitors} onClick={() => void onLoadMoreVisitors()}>
            {isLoadingMoreVisitors ? 'Loading older records…' : 'Load older visitor records'}
          </Button>
        </div>
      )}
    </DashboardPage>
  );
};

/* ============================================================================
 * NOTIFICATIONS
 * ========================================================================== */

export const NotificationsView: React.FC<NotificationsViewProps> = ({ notifications, onMarkAllAsRead, onSelect, unreadCount, description, onAdminAction }) => {
  const [tab, setTab] = useState<NotificationFilter>('all');
  const [workingId, setWorkingId] = useState<string | null>(null);
  const rows = filterNotifications(notifications, tab);
  const groups = groupByDay(rows);
  const attentionCount = notifications.filter((n) => !n.read && needsAttention(n)).length;

  const runAdminAction = async (notification: AppNotification, action: 'approve' | 'reject' | 'reset-password') => {
    if (!onAdminAction) return;
    setWorkingId(notification.id);
    try {
      await onAdminAction(notification, action);
    } finally {
      setWorkingId(null);
    }
  };

  return (
    <DashboardPage className="max-w-5xl">
      <header className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 dark:text-white">Notifications</h1>
          <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
            {unreadCount === 0
              ? 'You’re all caught up.'
              : `You have ${unreadCount} unread ${unreadCount === 1 ? 'notification' : 'notifications'}${attentionCount ? ` · ${attentionCount} need your attention` : ''}`}
          </p>
          {description && <p className="mt-1 max-w-2xl text-xs text-slate-500 dark:text-slate-400">{description}</p>}
        </div>
        {unreadCount > 0 && (
          <button type="button" onClick={onMarkAllAsRead} className="shrink-0 text-sm font-semibold text-amber-700 hover:text-amber-600 dark:text-amber-400">
            Mark all as read
          </button>
        )}
      </header>

      <NotificationTabs
        value={tab}
        onChange={setTab}
        counts={{ all: notifications.length, unread: unreadCount, alerts: notifications.filter(needsAttention).length }}
      />

      {groups.length === 0 ? (
        <div className="mt-5 rounded-2xl border border-slate-100 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <EmptyState
            icon={BellOff}
            title={tab === 'all' ? 'No notifications yet' : 'Nothing here'}
            description={tab === 'alerts' ? 'Alerts that need action will appear here.' : 'New alerts will appear here.'}
          />
        </div>
      ) : (
        groups.map((group) => (
          <NotificationGroup key={group.label} label={group.label}>
            {group.items.map((n) => {
              const isAdminRecord =
                n.persisted && n.relatedRecordId && onAdminAction &&
                (n.relatedRecordType === 'account_request' || n.relatedRecordType === 'department_change_request' ||
                  (n.relatedRecordType === 'user' && n.title === 'Password reset requested'));
              return (
                <NotificationRow key={n.id} n={n} onSelect={() => onSelect(n)}>
                  {isAdminRecord && (
                    <div className="flex flex-wrap gap-2" aria-label="Request actions">
                      {n.relatedRecordType === 'user' ? (
                        <button
                          type="button"
                          disabled={workingId === n.id}
                          onClick={() => void runAdminAction(n, 'reset-password')}
                          className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-amber-500 px-3 text-xs font-semibold text-slate-950 disabled:opacity-60"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" /> Send password reset link
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            disabled={workingId === n.id}
                            onClick={() => void runAdminAction(n, 'approve')}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg bg-emerald-600 px-3 text-xs font-semibold text-white disabled:opacity-60"
                          >
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            {n.relatedRecordType === 'account_request' ? 'Approve & invite' : 'Approve change'}
                          </button>
                          <button
                            type="button"
                            disabled={workingId === n.id}
                            onClick={() => void runAdminAction(n, 'reject')}
                            className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-rose-200 px-3 text-xs font-semibold text-rose-700 hover:bg-rose-50 disabled:opacity-60 dark:border-rose-900 dark:text-rose-300 dark:hover:bg-rose-950/30"
                          >
                            <X className="h-3.5 w-3.5" /> Reject
                          </button>
                        </>
                      )}
                    </div>
                  )}
                </NotificationRow>
              );
            })}
          </NotificationGroup>
        ))
      )}
    </DashboardPage>
  );
};

function getDurationInMinutes(timeIn: string, timeOut?: string): number | null {
  if (!timeOut) return null;

  const parseTime = (value: string) => {
    const match = value.trim().match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
    if (!match) return null;
    let hours = Number(match[1]);
    const minutes = Number(match[2]);
    const period = match[3].toUpperCase();
    if (hours < 1 || hours > 12 || minutes > 59) return null;
    if (period === 'AM' && hours === 12) hours = 0;
    if (period === 'PM' && hours !== 12) hours += 12;
    return hours * 60 + minutes;
  };

  const start = parseTime(timeIn);
  const end = parseTime(timeOut);
  if (start === null || end === null) return null;
  const duration = end >= start ? end - start : end + 24 * 60 - start;
  return duration > 0 ? duration : null;
}

function formatDuration(minutes: number): string {
  const hours = Math.floor(minutes / 60);
  const remainingMinutes = minutes % 60;
  if (hours === 0) return `${remainingMinutes}m`;
  return `${hours}h ${remainingMinutes}m`;
}
