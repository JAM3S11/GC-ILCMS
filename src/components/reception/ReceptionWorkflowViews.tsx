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
import { LabNotifyButton } from './LabNotifyButton';
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
  SegmentedControl,
  StatusPill,
  Tone,
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
  onOpenIntake?: (visitor: OfficerVisitor) => void;
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

export const LabBayView: React.FC<LabBayViewProps> = ({
  visitors,
  initialSelectedVisitorId,
  onCheckOut,
  onLabReceive,
  onServiceComplete,
  canReceiveVisits,
  canCompleteVisits,
  canCheckOutVisits,
  isLoading,
  onRevealNationalId,
  hasMoreVisitors,
  isLoadingMoreVisitors,
  onLoadMoreVisitors,
  currentUserName,
  onOpenIntake,
  onSendLabNotification,
}) => {
  const staged = visitors.filter((v) => v.status === 'Awaiting Laboratory Reception');
  const inLab = visitors.filter((v) => v.status === 'In Laboratory');
  const verifiedDocs = visitors.filter((v) => v.documentsVerified && v.documentsVerified.length > 0);
  const labBreakdown = Object.entries(
    inLab.reduce<Record<string, number>>((acc, v) => {
      acc[v.laboratory] = (acc[v.laboratory] || 0) + 1;
      return acc;
    }, {})
  );
  const bayCapacity = [
    { name: 'Narcotics Lab · Bay 4', used: Math.min(inLab.filter((v) => v.laboratory === 'Narcotics').length, 4), total: 4, tone: 'amber' as Tone },
    { name: 'Toxicology Lab · Bay 2', used: Math.min(inLab.filter((v) => v.laboratory === 'Toxicology').length, 3), total: 3, tone: 'cyan' as Tone },
  ];

  const [visitorFilter, setVisitorFilter] = useState<VisitorProcessFilter>('all');
  const [queueFilter, setQueueFilter] = useState<QueueFilter>('all');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  useEffect(() => {
    if (initialSelectedVisitorId) setSelectedId(initialSelectedVisitorId);
  }, [initialSelectedVisitorId]);

  const filteredVisitors = getFilteredVisitors(visitorFilter, visitors);
  const selectedDossier = filteredVisitors.find((v) => v.id === selectedId) ?? filteredVisitors[0];
  const queueVisitors = queueFilter === 'all' ? visitors : visitors.filter((v) => v.laboratory === queueFilter);
  const queueLaboratories = Array.from(new Set(visitors.map((v) => v.laboratory)));

  const selectVisitor = (vis: OfficerVisitor) => {
    setSelectedId(vis.id);
    if (!getFilteredVisitors(visitorFilter, visitors).some((v) => v.id === vis.id)) setVisitorFilter('all');
  };

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Reception', 'Lab Bay']}
        title="Lab Bay"
        description="Monitor exhibits staged at the receiving bay and hand visitors over to laboratory reception."
        meta={<StatusPill tone="emerald" pulse>Receiving bay open</StatusPill>}
        actions={
          <SegmentedControl
            ariaLabel="Filter by process stage"
            value={visitorFilter}
            onChange={setVisitorFilter}
            options={(Object.keys(processLabels) as VisitorProcessFilter[]).map((f) => ({
              value: f,
              label: processLabels[f],
              count: getFilteredVisitors(f, visitors).length,
            }))}
          />
        }
      />

      <KpiGrid label="Lab Bay summary">
        <KpiCard
          label="Awaiting triage"
          value={staged.length}
          icon={Clock}
          tone="sky"
          hint={staged.length === 0 ? 'Zero pending bay backlog' : `${staged.length} awaiting reception`}
        />
        <KpiCard
          label="In laboratory"
          value={inLab.length}
          icon={FlaskConical}
          tone="amber"
          hint={labBreakdown.length ? labBreakdown.map(([l, c]) => `${l} (${c})`).join(' · ') : 'No active analysis'}
        />
        <KpiCard
          label="Documents verified"
          value={verifiedDocs.length}
          icon={CheckCircle2}
          tone="emerald"
          progress={visitors.length ? (verifiedDocs.length / visitors.length) * 100 : 0}
          hint="Chain of custody authenticated"
        />
        <KpiCard label="Avg turnaround" value="2.4" unit="hrs" icon={Activity} tone="cyan" progress={60} hint="Target under 4 hours" />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Intake dossier */}
        <Panel
          className="xl:col-span-8"
          icon={FileText}
          tone="amber"
          title="Intake dossier"
          description={selectedDossier ? `Visit ${selectedDossier.visitNumber}` : 'No record selected'}
          actions={
            selectedDossier && (
              <StatusPill tone={VISITOR_STATUS[selectedDossier.status].tone} pulse={selectedDossier.status !== 'Departed'}>
                {VISITOR_STATUS[selectedDossier.status].label}
              </StatusPill>
            )
          }
          flush
          footer={
            selectedDossier && (
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex flex-wrap gap-2">
                  {canReceiveVisits && selectedDossier.status === 'Awaiting Laboratory Reception' && (
                    <Button size="sm" variant="primary" icon={CheckCircle2} onClick={() => void onLabReceive(selectedDossier.id)}>
                      Accept at laboratory
                    </Button>
                  )}
                  {canCompleteVisits && selectedDossier.status === 'In Laboratory' && (
                    <Button size="sm" variant="success" icon={CheckCheck} onClick={() => void onServiceComplete(selectedDossier.id)}>
                      Mark service complete
                    </Button>
                  )}
                  {onOpenIntake && selectedDossier.status === 'In Laboratory' &&
                    ['Food & Drugs', 'Water'].includes(selectedDossier.laboratory) && (
                      <Button size="sm" variant="primary" icon={FileText} onClick={() => onOpenIntake(selectedDossier)}>
                        Open {selectedDossier.laboratory === 'Food & Drugs' ? 'Food & Drugs' : 'Water'} intake
                      </Button>
                    )}
                </div>
                <div className="flex flex-wrap gap-2">
                  {onSendLabNotification && selectedDossier.status === 'Awaiting Laboratory Reception' && (
                    <LabNotifyButton
                      visit={selectedDossier}
                      size="sm"
                      notifyLabel={`Notify ${selectedDossier.laboratory}`}
                      onSend={(visitor, resend) => onSendLabNotification(visitor, resend)}
                    />
                  )}
                  <Button size="sm" variant="ghost" icon={Printer}>
                    Print tag
                  </Button>
                  {canCheckOutVisits && selectedDossier.status === 'Completed' && (
                    <Button size="sm" variant="danger" icon={LogOut} onClick={() => void onCheckOut(selectedDossier.id)}>
                      Check out
                    </Button>
                  )}
                </div>
              </div>
            )
          }
        >
          {isLoading ? (
            <EmptyState icon={Inbox} title="Loading visitor records" />
          ) : !selectedDossier ? (
            <EmptyState icon={Inbox} title="No visitor at this stage" description="Choose a different stage filter above." />
          ) : (
            <>
              <div className="flex flex-wrap items-center gap-3.5 border-b border-slate-200 p-4 dark:border-slate-800">
                <Avatar name={selectedDossier.officerName} size="lg" tone="sky" />
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="text-base font-semibold text-slate-900 dark:text-white">{selectedDossier.officerName}</h3>
                    {selectedDossier.visitorType === 'POLICE_OFFICER' && (
                      <StatusPill tone="sky" dot={false}>
                        <Shield className="h-3 w-3" /> Police
                      </StatusPill>
                    )}
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {selectedDossier.station} · {selectedDossier.laboratory} Laboratory
                  </p>
                </div>
              </div>

              <dl className="grid grid-cols-2 gap-x-4 gap-y-4 border-b border-slate-200 p-4 sm:grid-cols-3 dark:border-slate-800">
                <DetailItem label="Intake date / time">
                  {selectedDossier.date || '—'} · {selectedDossier.timeIn}
                </DetailItem>
                <DetailItem label="National ID">
                  <NationalIdReveal
                    visitorId={selectedDossier.id}
                    maskedValue={selectedDossier.nationalId || '—'}
                    onReveal={onRevealNationalId}
                  />
                </DetailItem>
                <DetailItem label="Official contact">{selectedDossier.phone || '—'}</DetailItem>
                <DetailItem label="Originating station">{selectedDossier.station || '—'}</DetailItem>
                <DetailItem label="Service badge">
                  <span className="text-amber-600 dark:text-amber-400">{selectedDossier.badgeNumber || '—'}</span>
                </DetailItem>
                <DetailItem label="Escort vehicle">{selectedDossier.vehicleRegistration || '—'}</DetailItem>
              </dl>

              <div className="space-y-3 p-4">
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950/50">
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      <FileText className="h-3.5 w-3.5" /> Documents presented
                    </div>
                    <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">
                      {selectedDossier.documentsPresented || 'No documents recorded.'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950/50">
                    <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
                      <ClipboardList className="h-3.5 w-3.5" /> Exhibits / samples summary
                    </div>
                    <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">
                      {selectedDossier.exhibitsPresented || 'No exhibit details recorded.'}
                    </p>
                  </div>
                  <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950/50 md:col-span-2">
                    <div className="mb-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">Purpose of visit</div>
                    <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">{selectedDossier.purposeOfVisit}</p>
                  </div>
                </div>
              </div>
            </>
          )}
        </Panel>

        {/* Queue + capacity */}
        <div className="space-y-5 xl:col-span-4">
          <Panel
            icon={List}
            tone="cyan"
            title="Reception queue"
            description={`${queueVisitors.length} client${queueVisitors.length === 1 ? '' : 's'}`}
            flush
          >
            <div className="border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
              <SegmentedControl
                ariaLabel="Filter queue by laboratory"
                value={queueFilter}
                onChange={setQueueFilter}
                options={[
                  { value: 'all' as QueueFilter, label: 'All', count: visitors.length },
                  ...queueLaboratories.map((lab) => ({
                    value: lab as QueueFilter,
                    label: lab,
                    count: visitors.filter((v) => v.laboratory === lab).length,
                  })),
                ]}
              />
            </div>
            {queueVisitors.length === 0 ? (
              <EmptyState icon={Inbox} title="Queue is empty" />
            ) : (
              <ul className="max-h-[420px] divide-y divide-slate-100 overflow-y-auto dark:divide-slate-800">
                {queueVisitors.map((vis) => {
                  const active = selectedDossier?.id === vis.id;
                  const status = VISITOR_STATUS[vis.status];
                  return (
                    <li key={vis.id}>
                      <button
                        type="button"
                        onClick={() => selectVisitor(vis)}
                        className={`flex w-full cursor-pointer items-start gap-3 px-4 py-3 text-left transition-colors ${
                          active ? 'bg-amber-500/5 shadow-[inset_3px_0_0_var(--gc-amber-500)]' : 'hover:bg-slate-50 dark:hover:bg-slate-800/40'
                        }`}
                      >
                        <Avatar name={vis.officerName} size="sm" tone={status.tone} />
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center justify-between gap-2">
                            <span className="truncate text-[13px] font-medium text-slate-900 dark:text-white">{vis.officerName}</span>
                            <span className="whitespace-nowrap text-[11px] tabular-nums text-slate-400">{vis.timeIn}</span>
                          </div>
                          <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                            {vis.laboratory} · {vis.station}
                          </div>
                          <div className="mt-1.5">
                            <StatusPill tone={status.tone}>{status.label}</StatusPill>
                          </div>
                        </div>
                      </button>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>

          <Panel title="Bay capacity" description="Benches currently occupied" actions={<StatusPill tone="emerald">Nominal</StatusPill>}>
            <div className="space-y-3.5">
              {bayCapacity.map((bay) => (
                <MeterRow key={bay.name} label={bay.name} value={bay.used} total={bay.total} tone={bay.tone} suffix={` / ${bay.total} in use`} />
              ))}
            </div>
          </Panel>
        </div>
      </div>

      {/* Visitors at this stage */}
      <Panel
        icon={Users}
        tone="emerald"
        title={`Visitors · ${processLabels[visitorFilter]}`}
        description="Select a row to open the intake dossier"
        flush
        footer={
          <span className="flex items-center gap-1.5">
            <Package className="h-3.5 w-3.5 text-amber-500" />
            Staged by <strong className="font-medium text-slate-700 dark:text-slate-200">{currentUserName}</strong> under Section 8
            (Evidence Admission). All exhibits sealed before lab reception.
          </span>
        }
      >
        {filteredVisitors.length === 0 ? (
          <EmptyState icon={Users} title="No visitors match this stage" />
        ) : (
          <div className="overflow-x-auto">
            <table className={`${tc.table} min-w-[760px]`}>
              <thead className={tc.thead}>
                <tr>
                  <th className={tc.th}>Visitor</th>
                  <th className={tc.th}>Reference</th>
                  <th className={tc.th}>Laboratory</th>
                  <th className={tc.th}>Exhibits</th>
                  <th className={tc.th}>Arrived</th>
                  <th className={tc.th}>Status</th>
                  {onSendLabNotification && <th className={`${tc.th} text-right`}>Lab notification</th>}
                </tr>
              </thead>
              <tbody className={tc.tbody}>
                {filteredVisitors.map((vis) => (
                  <tr
                    key={vis.id}
                    onClick={() => selectVisitor(vis)}
                    className={`${tc.tr} cursor-pointer ${selectedDossier?.id === vis.id ? 'bg-amber-500/5' : ''}`}
                  >
                    <td className={tc.td}>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={vis.officerName} size="sm" />
                        <div className="min-w-0">
                          <div className="truncate font-medium text-slate-900 dark:text-white">{vis.officerName}</div>
                          <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">{vis.station}</div>
                        </div>
                      </div>
                    </td>
                    <td className={`${tc.td} font-mono text-xs`}>{vis.visitNumber}</td>
                    <td className={tc.td}>{vis.laboratory}</td>
                    <td className={tc.td}>
                      <div className="max-w-[240px] truncate" title={vis.exhibitsPresented}>
                        {vis.exhibitsPresented || '—'}
                      </div>
                    </td>
                    <td className={`${tc.td} whitespace-nowrap`}>
                      {vis.date || '—'} · {vis.timeIn}
                    </td>
                    <td className={tc.td}>
                      <StatusPill tone={VISITOR_STATUS[vis.status].tone}>{VISITOR_STATUS[vis.status].label}</StatusPill>
                    </td>
                    {onSendLabNotification && (
                      <td className={`${tc.td} text-right`}>
                        {vis.status === 'Departed' ? (
                          <span className="text-[11px] text-slate-400">Visit closed</span>
                        ) : (
                          <LabNotifyButton
                            visit={vis}
                            notifyLabel="Notify lab"
                            stopPropagation
                            onSend={(visitor, resend) => onSendLabNotification(visitor, resend)}
                          />
                        )}
                      </td>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
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
 * CHECK OUT
 * ========================================================================== */

export const CheckOutView: React.FC<CheckOutViewProps> = ({
  visitors, onCheckOut, canCheckOutVisits, hasMoreVisitors, isLoadingMoreVisitors, onLoadMoreVisitors,
}) => {
  const checkOutEligible = visitors.filter((v) => v.status === 'Completed');
  const awaitingReceipt = visitors.filter((v) => v.status === 'Awaiting Laboratory Reception');
  const departed = visitors.filter((v) => v.status === 'Departed');
  const exhibitsAccountedFor = departed.filter((v) => v.exhibitsPresented.trim().length > 0);
  const visitDurations = departed
    .map((visitor) => getDurationInMinutes(visitor.timeIn, visitor.timeOut))
    .filter((duration): duration is number => duration !== null);
  const averageVisitDuration =
    visitDurations.length > 0 ? Math.round(visitDurations.reduce((sum, d) => sum + d, 0) / visitDurations.length) : null;
  const [queueTab, setQueueTab] = useState<'pending' | 'scheduled'>('pending');
  const queueItems = queueTab === 'pending' ? checkOutEligible : awaitingReceipt;
  const isPending = queueTab === 'pending';

  const checklist = [
    'Laboratory confirms service is complete',
    'Exhibit receipt handed to the officer',
    'Visitor badge returned to the desk',
    'Departure time recorded in the register',
  ];

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Reception', 'Check Out']}
        title="Check Out"
        description="Record officer and client departures and close their visitor register entries."
        meta={
          <StatusPill tone={checkOutEligible.length ? 'amber' : 'emerald'} pulse={checkOutEligible.length > 0}>
            {checkOutEligible.length ? `${checkOutEligible.length} ready to leave` : 'All clear'}
          </StatusPill>
        }
      />

      <KpiGrid label="Checkout operations summary">
        <KpiCard label="Ready for departure" value={checkOutEligible.length} icon={Clock} tone="amber" hint="Laboratory service completed" />
        <KpiCard
          label="Departed today"
          value={departed.length}
          icon={CheckCircle2}
          tone="emerald"
          progress={visitors.length ? (departed.length / visitors.length) * 100 : 0}
          hint={`${departed.length} of ${visitors.length} visitors signed out`}
        />
        <KpiCard label="Exhibits accounted for" value={exhibitsAccountedFor.length} icon={Package} tone="cyan" hint="Exhibit details retained with register" />
        <KpiCard
          label="Avg visit duration"
          value={averageVisitDuration === null ? '—' : formatDuration(averageVisitDuration)}
          icon={Activity}
          tone="violet"
          hint={averageVisitDuration === null ? 'Awaiting completed visits' : 'From entry and departure times'}
        />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <Panel
          className="xl:col-span-8"
          icon={List}
          tone="amber"
          title="Check-out queue"
          description={isPending ? 'Visitors cleared to leave the facility' : 'Visitors still awaiting laboratory receipt'}
          flush
          actions={
            <SegmentedControl
              ariaLabel="Queue view"
              value={queueTab}
              onChange={setQueueTab}
              options={[
                { value: 'pending', label: 'Ready', count: checkOutEligible.length },
                { value: 'scheduled', label: 'Scheduled', count: awaitingReceipt.length },
              ]}
            />
          }
        >
          {queueItems.length === 0 ? (
            <EmptyState
              icon={CheckCheck}
              title={isPending ? 'No visitors ready for departure' : 'Nothing scheduled'}
              description={isPending ? 'Visitors appear here once the laboratory has finished with them.' : 'No visitors are waiting for laboratory receipt.'}
            />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {queueItems.map((v) => (
                <li key={v.id} className="flex flex-wrap items-center gap-3 px-4 py-3.5 sm:flex-nowrap">
                  <Avatar name={v.officerName} tone={isPending ? 'amber' : 'sky'} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="truncate text-[13px] font-medium text-slate-900 dark:text-white">{v.officerName}</span>
                      <StatusPill tone={VISITOR_STATUS[v.status].tone}>{VISITOR_STATUS[v.status].label}</StatusPill>
                    </div>
                    <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {v.badgeNumber || v.visitNumber} · {v.station} · {v.laboratory}
                    </div>
                    <div className="truncate text-[11px] text-slate-400" title={v.exhibitsPresented}>
                      {v.exhibitsPresented || 'No exhibit details recorded'}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1 whitespace-nowrap text-xs text-slate-500 dark:text-slate-400">
                      <LogIn className="h-3 w-3 text-emerald-500" /> {v.timeIn}
                    </span>
                    {isPending && canCheckOutVisits && (
                      <Button size="sm" variant="danger" icon={LogOut} onClick={() => void onCheckOut(v.id)}>
                        Record departure
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Panel>

        <Panel className="xl:col-span-4" icon={ClipboardCheck} tone="emerald" title="Departure checklist" description="Confirm before signing a visitor out">
          <ul className="space-y-2.5">
            {checklist.map((item) => (
              <li key={item} className="flex items-start gap-2.5 text-[13px] text-slate-600 dark:text-slate-300">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />
                {item}
              </li>
            ))}
          </ul>
          <div className="mt-4 space-y-3 border-t border-slate-100 pt-4 dark:border-slate-800">
            <MeterRow label="Signed out" value={departed.length} total={visitors.length} tone="emerald" />
            <MeterRow label="Still on site" value={visitors.length - departed.length} total={visitors.length} tone="amber" />
          </div>
        </Panel>
      </div>

      <Panel
        icon={ClipboardList}
        tone="emerald"
        title="Departures register"
        description={`${departed.length} ${departed.length === 1 ? 'visitor' : 'visitors'} signed out today`}
        flush
        footer={
          <div className="flex flex-wrap items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Register updated from recorded departures
            </span>
            <span>Status: current</span>
          </div>
        }
      >
        {departed.length === 0 ? (
          <EmptyState icon={LogOut} title="No departures yet" description="Departures recorded today will be listed here." />
        ) : (
          <div className="overflow-x-auto">
            <table className={`${tc.table} min-w-[720px]`}>
              <thead className={tc.thead}>
                <tr>
                  <th className={tc.th}>Visitor</th>
                  <th className={tc.th}>Station / source</th>
                  <th className={tc.th}>Exhibits / purpose</th>
                  <th className={tc.th}>Time in</th>
                  <th className={tc.th}>Time out</th>
                  <th className={`${tc.th} text-right`}>Status</th>
                </tr>
              </thead>
              <tbody className={tc.tbody}>
                {departed.map((v) => (
                  <tr key={v.id} className={tc.tr}>
                    <td className={tc.td}>
                      <div className="font-medium text-slate-900 dark:text-white">{v.officerName}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{v.badgeNumber || v.visitNumber}</div>
                    </td>
                    <td className={tc.td}>{v.station || 'Not recorded'}</td>
                    <td className={tc.td}>
                      <div className="max-w-[260px] truncate" title={v.exhibitsPresented}>
                        {v.exhibitsPresented || v.purposeOfVisit || 'No details recorded'}
                      </div>
                    </td>
                    <td className={`${tc.td} whitespace-nowrap`}>{v.timeIn}</td>
                    <td className={`${tc.td} whitespace-nowrap font-medium text-slate-900 dark:text-white`}>{v.timeOut || '—'}</td>
                    <td className={`${tc.td} text-right`}>
                      <StatusPill tone="emerald">Signed out</StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
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
  const [tab, setTab] = useState<'all' | 'unread'>('all');
  const [workingId, setWorkingId] = useState<string | null>(null);
  const rows = tab === 'unread' ? notifications.filter((n) => !n.read) : notifications;

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
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Workspace', 'Notifications']}
        title="Notifications"
        description={description ?? 'Lab alerts, exhibit admissions and departmental dispatches.'}
        meta={unreadCount > 0 ? <StatusPill tone="amber" pulse>{unreadCount} unread</StatusPill> : undefined}
        actions={
          unreadCount > 0 && (
            <Button icon={CheckCheck} onClick={onMarkAllAsRead}>
              Mark all read
            </Button>
          )
        }
      />

      <Panel
        icon={Bell}
        tone="rose"
        title="Inbox"
        flush
        actions={
          <SegmentedControl
            value={tab}
            onChange={setTab}
            options={[
              { value: 'all', label: 'All', count: notifications.length },
              { value: 'unread', label: 'Unread', count: unreadCount },
            ]}
          />
        }
      >
        {rows.length === 0 ? (
          <EmptyState icon={BellOff} title="You're all caught up" description="New alerts will appear here." />
        ) : (
          <ul className="divide-y divide-slate-100 dark:divide-slate-800">
            {rows.map((n) => (
              <li key={n.id} className={`px-4 py-3.5 ${n.read ? '' : 'bg-amber-500/[0.03]'}`}>
                <button
                  type="button"
                  onClick={() => onSelect(n)}
                  className="flex w-full cursor-pointer items-start gap-3 text-left transition-colors hover:bg-slate-50 dark:hover:bg-slate-800/40"
                >
                  <span className={`mt-1.5 h-2 w-2 shrink-0 rounded-full ${n.read ? 'bg-transparent' : 'bg-amber-500'}`} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className={`text-[13px] text-slate-900 dark:text-white ${n.read ? 'font-medium' : 'font-semibold'}`}>{n.title}</span>
                      <StatusPill tone={notifTone[n.type]} dot={false}>
                        {n.type}
                      </StatusPill>
                    </div>
                    <p className="mt-0.5 text-xs leading-relaxed text-slate-600 dark:text-slate-400">{n.message}</p>
                    {n.linkAction?.startsWith('ADMIN_') && (
                      <span className="mt-1.5 inline-block text-[11px] font-semibold text-amber-700 dark:text-amber-400">
                        {n.linkAction === 'ADMIN_DEPARTMENT_REQUESTS' ? 'Review department request' : n.linkAction === 'ADMIN_USERS' ? 'Open user accounts' : 'Review approval requests'} →
                      </span>
                    )}
                    {n.recipientDepartment && (
                      <span className="mt-1.5 inline-block text-[11px] text-slate-400">To: {departmentLabel(n.recipientDepartment)}</span>
                    )}
                  </div>
                  <span className="whitespace-nowrap text-[11px] text-slate-400">{n.timestamp}</span>
                </button>
                {n.persisted && n.relatedRecordId && onAdminAction && (
                  ((n.relatedRecordType === 'account_request' || n.relatedRecordType === 'department_change_request') ||
                    (n.relatedRecordType === 'user' && n.title === 'Password reset requested')) && (
                    <div className="ml-5 mt-2 flex flex-wrap gap-2" aria-label="Request actions">
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
                  )
                )}
              </li>
            ))}
          </ul>
        )}
      </Panel>
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
