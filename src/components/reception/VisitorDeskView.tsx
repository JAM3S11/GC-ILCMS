import React, { useState } from 'react';
import {
  ArrowRight,
  Building2,
  Check,
  ClipboardList,
  FlaskConical,
  LogIn,
  LogOut,
  Send,
  Shield,
  User,
  UserCheck,
  UserPlus,
  Users,
} from 'lucide-react';

import { VisitorDeskViewProps } from './VisitorDeskViewProps';
import { OfficerVisitor } from '../../types';
import { VISITOR_STATUS } from './visitorStatus';
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
  onRegisterVisitor,
  currentUserName,
  onNavigate,
  onSendNotification,
  onSendLabNotification,
  onProceedToLab,
  onCheckOutVisitor,
}) => {
  const [filterText, setFilterText] = useState('');
  const [registerFilter, setRegisterFilter] = useState<RegisterFilter>('all');
  const [notificationSentMap, setNotificationSentMap] = useState<Record<string, boolean>>({});

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

  const query = filterText.trim().toLowerCase();
  const registerRows = byFilter[registerFilter].filter(
    (v) =>
      !query ||
      v.id.toLowerCase().includes(query) ||
      v.officerName.toLowerCase().includes(query) ||
      v.laboratory.toLowerCase().includes(query) ||
      v.station.toLowerCase().includes(query)
  );

  const labCounts = Object.entries(
    onPremises.reduce<Record<string, number>>((acc, v) => {
      acc[v.laboratory] = (acc[v.laboratory] || 0) + 1;
      return acc;
    }, {})
  ).sort((a, b) => b[1] - a[1]);

  const handleNotify = (vis: OfficerVisitor) => {
    const fn = onSendLabNotification ?? onSendNotification;
    if (fn) fn(vis);
    setNotificationSentMap((m) => ({ ...m, [vis.id]: true }));
  };

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

      <KpiGrid label="Daily visitor movement">
        <KpiCard
          label="Visitors today"
          value={visitors.length}
          icon={Users}
          tone="amber"
          hint="Entries recorded in the register"
          action={{ label: 'View register', onClick: () => setRegisterFilter('all') }}
        />
        <KpiCard
          label="Currently on site"
          value={onPremises.length}
          icon={Building2}
          tone="sky"
          progress={visitors.length ? (onPremises.length / visitors.length) * 100 : 0}
          hint="Not yet signed out"
          action={{ label: 'Open departures', onClick: () => onNavigate?.('check-out') }}
        />
        <KpiCard
          label="Awaiting laboratory"
          value={inLabBay.length}
          icon={FlaskConical}
          tone="emerald"
          hint={inLabBay.length === 0 ? 'Queue is clear' : 'Staged in the Lab Bay'}
          action={{ label: 'Open Lab Bay', onClick: () => onNavigate?.('lab-bay') }}
        />
        <KpiCard
          label="Departed today"
          value={signedOut.length}
          icon={LogOut}
          tone="violet"
          progress={visitors.length ? (signedOut.length / visitors.length) * 100 : 0}
          hint="Departure recorded"
          action={{ label: 'View departures', onClick: () => onNavigate?.('check-out') }}
        />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        {/* Visitor register */}
        <Panel
          className="xl:col-span-8"
          icon={ClipboardList}
          tone="amber"
          title="Visitor register"
          description={`${registerRows.length} of ${visitors.length} entries · Responsible officer: ${currentUserName}`}
          flush
          actions={<SearchInput value={filterText} onChange={setFilterText} placeholder="Search name, station, lab…" />}
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
          {registerRows.length === 0 ? (
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
                    const sent = notificationSentMap[vis.id];
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
                                {isOfficer ? 'Police officer' : 'Client'} · {vis.badgeNumber || vis.nationalId || vis.id}
                              </div>
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
                            <Button
                              size="xs"
                              variant={sent ? 'success' : 'secondary'}
                              icon={sent ? Check : Send}
                              onClick={() => handleNotify(vis)}
                              title="Notify the destination laboratory that the visitor is ready"
                            >
                              {sent ? 'Notified' : 'Notify'}
                            </Button>
                            <Button
                              size="xs"
                              variant="ghost"
                              icon={ArrowRight}
                              onClick={() => onProceedToLab(vis)}
                              title="Move the visitor to the laboratory receiving process"
                            >
                              Lab Bay
                            </Button>
                            {!isDeparted && (
                              <Button
                                size="xs"
                                variant="danger"
                                icon={LogOut}
                                onClick={() => onCheckOutVisitor(vis.id)}
                                title="Record the visitor's departure time"
                              >
                                Check out
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
            {recentArrivals.length === 0 ? (
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

    </DashboardPage>
  );
};
