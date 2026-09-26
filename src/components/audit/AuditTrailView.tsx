import React, { useState } from 'react';
import { Activity, ClipboardList, FileSearch, Layers, Lock, LogOut, Send, Shield, UserCheck, Users } from 'lucide-react';
import { AuditEvent, UserRole } from '../../types';
import {
  Avatar,
  Button,
  DashboardHeader,
  DashboardPage,
  EmptyState,
  KpiCard,
  KpiGrid,
  Panel,
  SearchInput,
  StatusPill,
  Tone,
  tableClasses as tc,
} from '../common/Dashboard';
import { Select } from '../common/Select';

interface AuditTrailViewProps {
  auditLogs: AuditEvent[];
  currentUserRole?: UserRole;
}

const actionTone = (action: string): Tone => {
  if (action.includes('CHECKED_OUT') || action.includes('LOGOUT')) return 'violet';
  if (action.includes('VISITOR')) return 'amber';
  if (action.includes('VERIFIED')) return 'emerald';
  if (action.includes('NOTIFICATION')) return 'sky';
  if (action.includes('EXHIBIT') || action.includes('CUSTODY')) return 'cyan';
  if (action.includes('REPORT')) return 'rose';
  return 'slate';
};

const formatAction = (action: string) => action.replace(/_/g, ' ').toLowerCase().replace(/^\w/, (c) => c.toUpperCase());

export const AuditTrailView: React.FC<AuditTrailViewProps> = ({ auditLogs, currentUserRole }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('ALL');

  const isReceptionAudit = currentUserRole === 'RECEPTIONIST';
  const roleLogs = isReceptionAudit
    ? auditLogs.filter((log) => log.role === 'RECEPTIONIST' || log.user.toLowerCase().includes('reception'))
    : auditLogs;
  const query = searchTerm.toLowerCase();
  const filteredLogs = roleLogs.filter((log) => {
    const matchesSearch =
      log.user.toLowerCase().includes(query) ||
      log.action.toLowerCase().includes(query) ||
      log.recordId.toLowerCase().includes(query) ||
      log.details.toLowerCase().includes(query);

    if (filterAction === 'ALL') return matchesSearch;
    return matchesSearch && log.action.includes(filterAction);
  });

  const count = (action: string) => roleLogs.filter((log) => log.action === action).length;
  const kpis = isReceptionAudit
    ? [
        { label: 'Visitors registered', value: count('VISITOR_REGISTERED'), icon: ClipboardList, tone: 'amber' as Tone },
        { label: 'Laboratories notified', value: count('LAB_NOTIFICATION_DISPATCHED'), icon: Send, tone: 'sky' as Tone },
        { label: 'Officer verifications', value: count('OFFICER_VERIFIED'), icon: UserCheck, tone: 'emerald' as Tone },
        { label: 'Departures recorded', value: count('VISITOR_CHECKED_OUT'), icon: LogOut, tone: 'violet' as Tone },
      ]
    : [
        { label: 'Total events', value: roleLogs.length, icon: Activity, tone: 'amber' as Tone },
        { label: 'Staff involved', value: new Set(roleLogs.map((l) => l.user)).size, icon: Users, tone: 'sky' as Tone },
        { label: 'Record types', value: new Set(roleLogs.map((l) => l.recordType)).size, icon: Layers, tone: 'emerald' as Tone },
        { label: 'Officer verifications', value: count('OFFICER_VERIFIED'), icon: UserCheck, tone: 'violet' as Tone },
      ];

  const hasFilters = searchTerm.trim() !== '' || filterAction !== 'ALL';

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={isReceptionAudit ? ['Reception', 'Audit Trail'] : ['Compliance', 'Audit Trail']}
        title={isReceptionAudit ? 'Reception activity log' : 'Master audit trail'}
        description={
          isReceptionAudit
            ? 'Visitor registration, laboratory notifications, officer verification and departures handled at reception.'
            : 'Immutable, tamper-evident log of intake, custody changes, instrument runs and reporting events.'
        }
        meta={
          <StatusPill tone="emerald" dot={false}>
            <Lock className="h-3 w-3" /> Append-only
          </StatusPill>
        }
      />

      <KpiGrid label="Activity summary">
        {kpis.map((k) => (
          <KpiCard key={k.label} label={k.label} value={k.value} icon={k.icon} tone={k.tone} hint="Recorded in the activity register" />
        ))}
      </KpiGrid>

      <Panel
        icon={Shield}
        tone="rose"
        title="Event log"
        description={`${filteredLogs.length} of ${roleLogs.length} events`}
        flush
        actions={
          <>
            <SearchInput value={searchTerm} onChange={setSearchTerm} placeholder="Search user, action, record…" />
            <Select
              size="xs"
              className="w-44"
              value={filterAction}
              onChange={setFilterAction}
              aria-label="Filter by action"
              options={[
                { value: 'ALL', label: 'All actions' },
                { value: 'VISITOR', label: 'Visitor intake' },
                { value: 'VERIFIED', label: 'Officer verification' },
                { value: 'EXHIBIT', label: 'Exhibit intake' },
                { value: 'CASE', label: 'Case creation' },
                { value: 'INSTRUMENT', label: 'Instrument run' },
                { value: 'REPORT', label: 'Report compilation' },
              ]}
            />
          </>
        }
        footer={
          <span className="flex items-center gap-1.5">
            <Lock className="h-3 w-3" /> Entries are append-only and cannot be edited or deleted.
          </span>
        }
      >
        {filteredLogs.length === 0 ? (
          <EmptyState
            icon={FileSearch}
            title="No audit records found"
            description={
              searchTerm.trim()
                ? `No activity matches “${searchTerm.trim()}”. Try another name, action or record number.`
                : 'There are no records for the selected activity filter.'
            }
            action={
              hasFilters && (
                <Button
                  size="sm"
                  onClick={() => {
                    setSearchTerm('');
                    setFilterAction('ALL');
                  }}
                >
                  Clear search and filters
                </Button>
              )
            }
          />
        ) : (
          <div className="overflow-x-auto">
            <table className={`${tc.table} min-w-[900px]`}>
              <thead className={tc.thead}>
                <tr>
                  <th className={tc.th}>Time</th>
                  <th className={tc.th}>Staff</th>
                  <th className={tc.th}>{isReceptionAudit ? 'Activity' : 'Action'}</th>
                  <th className={tc.th}>Record</th>
                  <th className={tc.th}>Details</th>
                </tr>
              </thead>
              <tbody className={tc.tbody}>
                {filteredLogs.map((log) => (
                  <tr key={log.id} className={tc.tr}>
                    <td className={`${tc.td} whitespace-nowrap`}>
                      <div className="font-medium tabular-nums text-slate-900 dark:text-white">{log.timestamp.split(' ')[1] || log.timestamp}</div>
                      <div className="text-[11px] tabular-nums text-slate-400">{log.timestamp.split(' ')[0]}</div>
                    </td>
                    <td className={tc.td}>
                      <div className="flex items-center gap-2.5">
                        <Avatar name={log.user} size="sm" />
                        <div className="min-w-0">
                          <div className="max-w-[180px] truncate font-medium text-slate-900 dark:text-white" title={log.user}>
                            {log.user}
                          </div>
                          <div className="text-[11px] text-slate-500 dark:text-slate-400">{log.role.replace(/_/g, ' ').toLowerCase()}</div>
                        </div>
                      </div>
                    </td>
                    <td className={tc.td}>
                      <StatusPill tone={actionTone(log.action)}>{formatAction(log.action)}</StatusPill>
                    </td>
                    <td className={tc.td}>
                      <div className="max-w-[150px] truncate font-mono text-xs font-medium text-slate-900 dark:text-white" title={log.recordId}>
                        {log.recordId}
                      </div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{log.recordType}</div>
                    </td>
                    <td className={tc.td}>
                      <div className="line-clamp-2 max-w-md text-xs leading-relaxed" title={log.details}>
                        {log.details}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Panel>
    </DashboardPage>
  );
};
