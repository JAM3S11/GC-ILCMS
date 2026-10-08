import React, { useEffect, useState } from 'react';
import {
  ArrowRight,
  Building2,
  Check,
  ClipboardList,
  FolderOpen,
  FlaskConical,
  LogIn,
  LogOut,
  Shield,
  Trash2,
  User,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';

import { VisitorDeskViewProps } from './VisitorDeskViewProps';
import { OfficerVisitor } from '../../types';
import { VISITOR_STATUS } from './visitorStatus';
import { NationalIdReveal } from './NationalIdReveal';
import { LabNotifyButton } from './LabNotifyButton';
import { VisitorCaseProgressDialog } from './VisitorCaseProgressDialog';
import {
  Avatar,
  Button,
  DashboardHeader,
  DashboardPage,
  EmptyState,
  KpiCard,
  KpiGrid,
  MeterRow,
  Panel,
  SearchInput,
  SegmentedControl,
  StatusPill,
  tableClasses as tc,
} from '../common/Dashboard';

type RegisterFilter = 'all' | 'onsite' | 'awaiting' | 'departed';

export const VisitorDeskView: React.FC<VisitorDeskViewProps> = ({
  visitors,
  visitStats,
  visitStatsError,
  visitStatsLoading,
  onRegisterVisitor,
  onSendLabNotification,
  currentUserName,
  onNavigate,
  onRevealNationalId,
  onProceedToLab,
  onCheckOutVisitor,
  onDeleteVisitor,
  isLoading,
  hasMoreVisitors,
  isLoadingMoreVisitors,
  onLoadMoreVisitors,
}) => {
  const [filterText, setFilterText] = useState('');
  const [registerFilter, setRegisterFilter] = useState<RegisterFilter>('all');
  const [caseFileVisit, setCaseFileVisit] = useState<OfficerVisitor | null>(null);
  const [dateFilter, setDateFilter] = useState('');
  // Delete asks for a second press on the same row before it removes the record.
  const [confirmDeleteId, setConfirmDeleteId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const deleteVisitor = async (visitor: OfficerVisitor) => {
    if (!onDeleteVisitor) return;
    if (confirmDeleteId !== visitor.id) {
      setConfirmDeleteId(visitor.id);
      return;
    }
    setDeletingId(visitor.id);
    try {
      await onDeleteVisitor(visitor);
    } finally {
      setDeletingId(null);
      setConfirmDeleteId(null);
    }
  };

  const onPremises = visitors.filter((v) => v.status !== 'Departed');
  const inLabBay = visitors.filter((v) => v.status === 'Awaiting Laboratory Reception');
  const inLab = visitors.filter((v) => v.status === 'In Laboratory');
  const completed = visitors.filter((v) => v.status === 'Completed');
  const signedOut = visitors.filter((v) => v.status === 'Departed');

  const byFilter: Record<RegisterFilter, OfficerVisitor[]> = {
    all: visitors,
    onsite: onPremises,
    awaiting: inLabBay,
    departed: signedOut,
  };

  // The register loads every day, newest first. A picked day may be older than
  // what is loaded so far, so keep paging until it is reached.
  const oldestLoadedDate = visitors.length ? visitors[visitors.length - 1].date : null;
  const needsOlderVisits = !!dateFilter && hasMoreVisitors && !isLoadingMoreVisitors &&
    (!oldestLoadedDate || oldestLoadedDate > dateFilter);
  useEffect(() => {
    if (needsOlderVisits) void onLoadMoreVisitors();
  }, [needsOlderVisits, oldestLoadedDate]);

  const query = filterText.trim().toLowerCase();
  const registerRows = byFilter[registerFilter].filter(
    (v) =>
      (!dateFilter || v.date === dateFilter) &&
      (!query ||
      v.id.toLowerCase().includes(query) ||
      v.visitNumber.toLowerCase().includes(query) ||
      v.officerName.toLowerCase().includes(query) ||
      v.laboratory.toLowerCase().includes(query) ||
      v.station.toLowerCase().includes(query))
  );

  const labCounts = Object.entries(
    onPremises.reduce<Record<string, number>>((acc, v) => {
      acc[v.laboratory] = (acc[v.laboratory] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const recentArrivals = visitors.slice(0, 4);

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Reception', 'Overview']}
        title="Reception Desk"
        description="Register arriving officers and clients, route them to the right laboratory and record departures."
        meta={<StatusPill tone="emerald" pulse>Desk open</StatusPill>}
        actions={
          <>
            <Button icon={FlaskConical} onClick={() => onNavigate?.('lab-bay')}>
              Lab Bay
            </Button>
            <Button variant="primary" icon={UserPlus} onClick={() => onNavigate?.('register-visitor')}>
              Register visitor
            </Button>
          </>
        }
      />

      {visitStatsError && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          Visitor totals could not be refreshed: {visitStatsError}
        </div>
      )}

      <KpiGrid label="All-time visitor totals">
        <KpiCard
          label="Total visitors"
          value={visitStats ? visitStats.totalVisitors : visitStatsLoading ? '…' : '—'}
          icon={Users}
          tone="amber"
          hint="All entries recorded in the register"
          action={{ label: 'View register', onClick: () => setRegisterFilter('all') }}
        />
        <KpiCard
          label="Currently on site"
          value={visitStats ? visitStats.currentlyOnSite : visitStatsLoading ? '…' : '—'}
          icon={Building2}
          tone="sky"
          progress={visitStats?.totalVisitors ? ((visitStats.currentlyOnSite / visitStats.totalVisitors) * 100) : 0}
          hint="All visitors not yet signed out"
          action={{ label: 'Open departures', onClick: () => onNavigate?.('check-out') }}
        />
        <KpiCard
          label="Awaiting laboratory"
          value={visitStats ? visitStats.awaitingLab : visitStatsLoading ? '…' : '—'}
          icon={FlaskConical}
          tone="emerald"
          hint="All visits staged in Lab Bay"
          action={{ label: 'Open Lab Bay', onClick: () => onNavigate?.('lab-bay') }}
        />
        <KpiCard
          label="Total departed"
          value={visitStats ? visitStats.totalDeparted : visitStatsLoading ? '…' : '—'}
          icon={LogOut}
          tone="violet"
          progress={visitStats?.totalVisitors ? ((visitStats.totalDeparted / visitStats.totalVisitors) * 100) : 0}
          hint="All departures recorded"
          action={{ label: 'View departures', onClick: () => onNavigate?.('check-out') }}
        />
      </KpiGrid>

      <section
        aria-label="Today's visitor activity"
        className="overflow-hidden rounded-lg border border-slate-200 bg-white py-2 text-xs text-slate-600 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300"
      >
        <div className="gc-marquee-track" aria-hidden="true">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex shrink-0 items-center gap-8 whitespace-nowrap pr-8">
              <span className="font-semibold uppercase tracking-wide text-slate-500">Today’s activity</span>
              <span>Registered: <strong className="tabular-nums text-slate-900 dark:text-white">{visitStats ? visitStats.todayRegistered : '—'}</strong></span>
              <span>Awaiting lab: <strong className="tabular-nums text-slate-900 dark:text-white">{visitStats ? visitStats.todayAwaitingLab : '—'}</strong></span>
              <span>In laboratory: <strong className="tabular-nums text-slate-900 dark:text-white">{visitStats ? visitStats.todayInLaboratory : '—'}</strong></span>
              <span>Completed: <strong className="tabular-nums text-slate-900 dark:text-white">{visitStats ? visitStats.todayCompleted : '—'}</strong></span>
              <span>Departed: <strong className="tabular-nums text-slate-900 dark:text-white">{visitStats ? visitStats.todayDeparted : '—'}</strong></span>
            </div>
          ))}
        </div>
        <span className="sr-only">
          Today: {visitStats?.todayRegistered ?? '—'} registered, {visitStats?.todayAwaitingLab ?? '—'} awaiting laboratory,
          {visitStats?.todayInLaboratory ?? '—'} in laboratory, {visitStats?.todayCompleted ?? '—'} completed,
          {visitStats?.todayDeparted ?? '—'} departed.
        </span>
      </section>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Visitor register */}
        <Panel
          className="xl:col-span-8"
          icon={ClipboardList}
          tone="amber"
          title="Visitor register"
          description={`${registerRows.length} of ${visitors.length} entries${dateFilter ? ` · ${dateFilter}` : ''} · Responsible officer: ${currentUserName}`}
          flush
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                <input
                  type="date"
                  aria-label="Filter register by date"
                  value={dateFilter}
                  max={new Date().toLocaleDateString('en-CA', { timeZone: 'Africa/Nairobi' })}
                  onChange={(event) => setDateFilter(event.target.value)}
                  className="h-8 rounded-md border border-slate-200 bg-white px-2 text-xs text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                />
                {dateFilter && (
                  <Button size="xs" variant="ghost" onClick={() => setDateFilter('')}>
                    All dates
                  </Button>
                )}
              </div>
              <SearchInput value={filterText} onChange={setFilterText} placeholder="Search name, station, lab…" />
            </div>
          }
          footer={
            <div className="flex items-center gap-1.5">
              <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
              Register synchronised · entries are append-only and audited
            </div>
          }
        >
          <div className="border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
            <SegmentedControl
              ariaLabel="Filter register"
              value={registerFilter}
              onChange={setRegisterFilter}
              options={[
                { value: 'all', label: 'All', count: visitors.length },
                { value: 'onsite', label: 'On site', count: onPremises.length },
                { value: 'awaiting', label: 'Awaiting lab', count: inLabBay.length },
                { value: 'departed', label: 'Departed', count: signedOut.length },
              ]}
            />
          </div>
          {isLoading ? (
            <EmptyState icon={Users} title="Loading visitor register" />
          ) : registerRows.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No visitors found"
              description={query ? `Nothing matches “${filterText.trim()}”.` : 'No entries in this view yet.'}
              action={
                query ? (
                  <Button size="sm" onClick={() => setFilterText('')}>
                    Clear search
                  </Button>
                ) : undefined
              }
            />
          ) : (
            <div className="overflow-x-auto">
              <table className={`${tc.table} min-w-[920px]`}>
                <thead className={tc.thead}>
                  <tr>
                    <th className={tc.th}>Visitor</th>
                    <th className={tc.th}>Station / source</th>
                    <th className={tc.th}>Laboratory</th>
                    <th className={tc.th}>Time</th>
                    <th className={tc.th}>Status</th>
                    <th className={`${tc.th} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={tc.tbody}>
                  {registerRows.map((vis) => {
                    const isOfficer = vis.visitorType === 'POLICE_OFFICER';
                    const isDeparted = vis.status === 'Departed';
                    const status = VISITOR_STATUS[vis.status];
                    return (
                      <tr key={vis.id} className={tc.tr}>
                        <td className={tc.td}>
                          <div className="flex items-center gap-3">
                            <Avatar name={vis.officerName} tone={isOfficer ? 'sky' : 'violet'} />
                            <div className="min-w-0">
                              <div className="max-w-[180px] truncate font-medium text-slate-900 dark:text-white" title={vis.officerName}>
                                {vis.officerName}
                              </div>
                              <div className="flex items-center gap-1 text-[11px] text-slate-500 dark:text-slate-400">
                                {isOfficer ? <Shield className="h-3 w-3" /> : <User className="h-3 w-3" />}
                                {isOfficer ? 'Police officer' : 'Client'} ·{' '}
                                <NationalIdReveal
                                  visitorId={vis.id}
                                  maskedValue={vis.nationalId}
                                  onReveal={onRevealNationalId}
                                />
                              </div>
                              {vis.badgeNumber && <div className="text-[10px] text-slate-400">Badge {vis.badgeNumber}</div>}
                              <div className="text-[10px] text-slate-400">{vis.visitNumber}</div>
                            </div>
                          </div>
                        </td>
                        <td className={tc.td}>
                          <div className="max-w-[170px] truncate" title={vis.station}>
                            {vis.station}
                          </div>
                          {vis.vehicleRegistration && (
                            <div className="font-mono text-[11px] text-slate-400">{vis.vehicleRegistration}</div>
                          )}
                        </td>
                        <td className={tc.td}>
                          <div className="font-medium text-slate-800 dark:text-slate-100">{vis.laboratory}</div>
                          <div className="max-w-[200px] truncate text-[11px] text-slate-400" title={vis.exhibitsPresented}>
                            {vis.exhibitsPresented || vis.purposeOfVisit || '—'}
                          </div>
                        </td>
                        <td className={tc.td}>
                          <div className="flex items-center gap-1 whitespace-nowrap text-xs">
                            <LogIn className="h-3 w-3 text-emerald-500" /> {vis.timeIn}
                          </div>
                          <div className="flex items-center gap-1 whitespace-nowrap text-xs text-slate-400">
                            <LogOut className="h-3 w-3" /> {vis.timeOut ?? 'On site'}
                          </div>
                        </td>
                        <td className={tc.td}>
                          <StatusPill tone={status.tone} pulse={!isDeparted}>
                            {status.label}
                          </StatusPill>
                        </td>
                        <td className={`${tc.td} text-right`}>
                          <div className="flex justify-end gap-1.5">
                            {isDeparted ? (
                              <Button
                                size="xs"
                                variant="ghost"
                                icon={FolderOpen}
                                onClick={() => setCaseFileVisit(vis)}
                                title="See how bench work on this client's samples is progressing"
                              >
                                Case file
                              </Button>
                            ) : (
                            <Button
                              size="xs"
                              variant="ghost"
                              icon={ArrowRight}
                              onClick={() => onProceedToLab(vis)}
                              title="Move the visitor to the laboratory receiving process"
                            >
                              Lab Bay
                            </Button>
                            )}
                            {onSendLabNotification && vis.status !== 'Departed' && (
                              <LabNotifyButton
                                visit={vis}
                                onSend={(visitor, resend) => onSendLabNotification(visitor, resend)}
                              />
                            )}
                            {vis.status === 'Completed' && (
                              <Button
                                size="xs"
                                variant="danger"
                                icon={LogOut}
                                onClick={() => void onCheckOutVisitor(vis.id)}
                                title="Record the visitor's departure time"
                              >
                                Check out
                              </Button>
                            )}
                            {onDeleteVisitor && (
                              <Button
                                size="xs"
                                variant={confirmDeleteId === vis.id ? 'danger' : 'ghost'}
                                icon={Trash2}
                                disabled={deletingId === vis.id}
                                onClick={() => void deleteVisitor(vis)}
                                onBlur={() => setConfirmDeleteId((id) => (id === vis.id ? null : id))}
                                title={confirmDeleteId === vis.id ? 'Press again to delete this visitor record' : 'Delete this visitor record'}
                                aria-label={`Delete visitor record ${vis.visitNumber}`}
                              >
                                {deletingId === vis.id ? 'Deleting…' : confirmDeleteId === vis.id ? 'Confirm delete' : null}
                              </Button>
                            )}
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </Panel>

        {caseFileVisit && <VisitorCaseProgressDialog visit={caseFileVisit} onClose={() => setCaseFileVisit(null)} />}

        {/* Right rail */}
        <div className="space-y-5 xl:col-span-4">
          <Panel title="Visitor flow" description="Where today's visitors are right now">
            <div className="space-y-3.5">
              <MeterRow label="Awaiting laboratory" value={inLabBay.length} total={visitors.length} tone="sky" />
              <MeterRow label="In laboratory" value={inLab.length} total={visitors.length} tone="amber" />
              <MeterRow label="Completed" value={completed.length} total={visitors.length} tone="emerald" />
              <MeterRow label="Departed" value={signedOut.length} total={visitors.length} tone="slate" />
            </div>
            {labCounts.length > 0 && (
              <div className="mt-4 border-t border-slate-100 pt-3 dark:border-slate-800">
                <div className="mb-2 text-[11px] font-medium uppercase tracking-wide text-slate-500 dark:text-slate-400">
                  On site by laboratory
                </div>
                <div className="flex flex-wrap gap-1.5">
                  {labCounts.map(([lab, count]) => (
                    <span
                      key={lab}
                      className="inline-flex items-center gap-1.5 rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700 dark:bg-slate-800 dark:text-slate-200"
                    >
                      {lab}
                      <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{count}</span>
                    </span>
                  ))}
                </div>
              </div>
            )}
          </Panel>

          <Panel
            icon={UserCheck}
            tone="amber"
            title="New arrival"
            description="Single-page registration form"
          >
            <ol className="space-y-2.5">
              {['Officer badge ID or client identity', 'Station, origin & vehicle (clients)', 'Destination laboratory & exhibits'].map((step, i) => (
                <li key={step} className="flex items-center gap-3 text-[13px] text-slate-600 dark:text-slate-300">
                  <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-slate-100 text-[11px] font-semibold text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                    {i + 1}
                  </span>
                  {step}
                </li>
              ))}
            </ol>
            <Button variant="primary" icon={UserPlus} className="mt-4 w-full" onClick={() => onNavigate?.('register-visitor')}>
              Start registration
            </Button>
          </Panel>

          <Panel title="Recent arrivals" flush>
            {isLoading ? (
              <EmptyState icon={Users} title="Loading arrivals" />
            ) : recentArrivals.length === 0 ? (
              <EmptyState icon={Users} title="No arrivals yet" />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {recentArrivals.map((v) => (
                  <li key={v.id} className="flex items-center gap-3 px-4 py-2.5">
                    <Avatar name={v.officerName} size="sm" tone={VISITOR_STATUS[v.status].tone} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-[13px] font-medium text-slate-900 dark:text-white">{v.officerName}</div>
                      <div className="truncate text-[11px] text-slate-500 dark:text-slate-400">
                        {v.laboratory} · {v.station}
                      </div>
                    </div>
                    <span className="whitespace-nowrap text-[11px] tabular-nums text-slate-400">{v.timeIn}</span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
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
