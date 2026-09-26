import React, { useState } from 'react';
import { AlertTriangle, ArrowUpRight, Award, Building2, Clock, FileCheck, FlaskConical, Layers, TrendingUp } from 'lucide-react';
import { ForensicCase } from '../../types';
import {
  Button,
  DashboardHeader,
  DashboardPage,
  KpiCard,
  KpiGrid,
  Panel,
  SegmentedControl,
  StatusPill,
  Tone,
  tableClasses as tc,
} from '../common/Dashboard';

interface ExecutiveDashboardProps {
  activeCase: ForensicCase;
  onSelectCase: (caseId: string) => void;
}

interface DepartmentWorkload {
  name: string;
  active: number;
  pendingReports: number;
  turnaroundDays: number;
  slaDays: number;
}

const DEPARTMENTS: DepartmentWorkload[] = [
  { name: 'Narcotics', active: 14, pendingReports: 3, turnaroundDays: 3.2, slaDays: 5 },
  { name: 'Food & Drugs', active: 9, pendingReports: 2, turnaroundDays: 4.5, slaDays: 5 },
  { name: 'Criminalistic', active: 11, pendingReports: 4, turnaroundDays: 5.1, slaDays: 7 },
  { name: 'DNA', active: 18, pendingReports: 6, turnaroundDays: 7.8, slaDays: 7 },
  { name: 'Instruments', active: 8, pendingReports: 1, turnaroundDays: 2.1, slaDays: 5 },
  { name: 'Water', active: 6, pendingReports: 1, turnaroundDays: 3.0, slaDays: 5 },
  { name: 'Toxicology', active: 12, pendingReports: 3, turnaroundDays: 4.8, slaDays: 5 },
  { name: 'Procurement', active: 4, pendingReports: 0, turnaroundDays: 1.5, slaDays: 3 },
];

type SortKey = 'active' | 'pendingReports' | 'turnaroundDays';

const slaStatus = (d: DepartmentWorkload): { label: string; tone: Tone } => {
  const ratio = d.turnaroundDays / d.slaDays;
  if (ratio > 1) return { label: 'Over SLA', tone: 'rose' };
  if (ratio > 0.85) return { label: 'At risk', tone: 'amber' };
  return { label: 'On track', tone: 'emerald' };
};

export const ExecutiveDashboard: React.FC<ExecutiveDashboardProps> = ({ activeCase, onSelectCase }) => {
  const [sortBy, setSortBy] = useState<SortKey>('active');

  const sorted = [...DEPARTMENTS].sort((a, b) => b[sortBy] - a[sortBy]);
  const maxActive = Math.max(...DEPARTMENTS.map((d) => d.active));
  const totalActive = DEPARTMENTS.reduce((s, d) => s + d.active, 0);
  const totalPending = DEPARTMENTS.reduce((s, d) => s + d.pendingReports, 0);
  const atRisk = DEPARTMENTS.filter((d) => slaStatus(d).tone !== 'emerald');

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Oversight', 'Executive']}
        title="Executive overview"
        description="National caseload, departmental turnaround and matters needing executive attention."
        meta={<StatusPill tone="violet" dot={false}>Cycle 2026-Q3</StatusPill>}
        actions={
          <Button variant="primary" icon={ArrowUpRight} onClick={() => onSelectCase(activeCase.id)}>
            Priority case file
          </Button>
        }
      />

      <KpiGrid label="National metrics">
        <KpiCard label="Cases this year" value="1,482" icon={TrendingUp} tone="amber" hint="+8.4% intake efficiency" />
        <KpiCard label="Active in analysis" value={totalActive} icon={FlaskConical} tone="sky" hint={`Across ${DEPARTMENTS.length} departments`} />
        <KpiCard label="Mean turnaround" value="4.2" unit="days" icon={Clock} tone="emerald" hint="Down from 14 days (paper era)" />
        <KpiCard label="Reports pending review" value={totalPending} icon={FileCheck} tone="violet" hint="1 urgent · Narcotics" />
      </KpiGrid>

      <div className="grid grid-cols-1 gap-5 xl:grid-cols-12">
        <Panel
          className="xl:col-span-8"
          icon={Layers}
          tone="sky"
          title="Department performance"
          description="Active cases, reports awaiting review and mean turnaround against SLA"
          flush
          actions={
            <SegmentedControl
              ariaLabel="Sort departments"
              value={sortBy}
              onChange={setSortBy}
              options={[
                { value: 'active', label: 'Caseload' },
                { value: 'pendingReports', label: 'Pending' },
                { value: 'turnaroundDays', label: 'Turnaround' },
              ]}
            />
          }
        >
          <div className="overflow-x-auto">
            <table className={`${tc.table} min-w-[640px]`}>
              <thead className={tc.thead}>
                <tr>
                  <th className={tc.th}>Department</th>
                  <th className={tc.th}>Active cases</th>
                  <th className={`${tc.th} text-right`}>Pending reports</th>
                  <th className={`${tc.th} text-right`}>Mean TAT</th>
                  <th className={tc.th}>SLA</th>
                </tr>
              </thead>
              <tbody className={tc.tbody}>
                {sorted.map((d) => {
                  const status = slaStatus(d);
                  return (
                    <tr key={d.name} className={tc.tr}>
                      <td className={`${tc.td} font-medium text-slate-900 dark:text-white`}>{d.name}</td>
                      <td className={tc.td}>
                        <div className="flex items-center gap-3">
                          <div className="h-1.5 w-28 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
                            <div className="h-full rounded-full bg-sky-500" style={{ width: `${(d.active / maxActive) * 100}%` }} />
                          </div>
                          <span className="font-semibold tabular-nums text-slate-900 dark:text-white">{d.active}</span>
                        </div>
                      </td>
                      <td className={`${tc.td} text-right tabular-nums`}>{d.pendingReports}</td>
                      <td className={`${tc.td} text-right tabular-nums`}>
                        {d.turnaroundDays} <span className="text-slate-400">/ {d.slaDays} d</span>
                      </td>
                      <td className={tc.td}>
                        <StatusPill tone={status.tone}>{status.label}</StatusPill>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Panel>

        <div className="space-y-5 xl:col-span-4">
          <Panel icon={AlertTriangle} tone="amber" title="Needs attention" description={`${atRisk.length} departments at or over SLA`} flush>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {atRisk.map((d) => {
                const status = slaStatus(d);
                return (
                  <li key={d.name} className="flex items-center justify-between gap-3 px-4 py-2.5">
                    <div className="min-w-0">
                      <div className="truncate text-[13px] font-medium text-slate-900 dark:text-white">{d.name}</div>
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">
                        {d.turnaroundDays} days mean · SLA {d.slaDays} days · {d.pendingReports} pending
                      </div>
                    </div>
                    <StatusPill tone={status.tone}>{status.label}</StatusPill>
                  </li>
                );
              })}
            </ul>
          </Panel>

          <Panel icon={Award} tone="violet" title="This quarter">
            <dl className="grid grid-cols-2 gap-4">
              {[
                ['Certificates issued', '312'],
                ['Court attendances', '47'],
                ['Proficiency tests passed', '12/12'],
                ['Chain-of-custody breaks', '0'],
              ].map(([label, value]) => (
                <div key={label}>
                  <dt className="text-[11px] text-slate-500 dark:text-slate-400">{label}</dt>
                  <dd className="mt-0.5 text-lg font-semibold tabular-nums text-slate-900 dark:text-white">{value}</dd>
                </div>
              ))}
            </dl>
          </Panel>
        </div>
      </div>

      <Panel
        icon={AlertTriangle}
        tone="rose"
        title="High-priority cases"
        description="Substantial seizures, expedited court dates or statutory deadlines"
        actions={<StatusPill tone="rose" pulse>1 active</StatusPill>}
        flush
      >
        <div className="overflow-x-auto">
          <table className={`${tc.table} min-w-[860px]`}>
            <thead className={tc.thead}>
              <tr>
                <th className={tc.th}>Case</th>
                <th className={tc.th}>Nature</th>
                <th className={tc.th}>Department</th>
                <th className={tc.th}>Investigating officer</th>
                <th className={tc.th}>Priority</th>
                <th className={tc.th}>Stage</th>
                <th className={`${tc.th} text-right`}>Actions</th>
              </tr>
            </thead>
            <tbody className={tc.tbody}>
              <tr className={tc.tr}>
                <td className={tc.td}>
                  <div className="font-mono text-[12px] font-semibold text-slate-900 dark:text-white">{activeCase.caseNumber}</div>
                  <div className="font-mono text-[11px] text-slate-400">{activeCase.labReferenceNumber}</div>
                </td>
                <td className={tc.td}>
                  <div className="max-w-[220px] truncate font-medium text-slate-800 dark:text-slate-100" title={activeCase.natureOfCase}>
                    {activeCase.natureOfCase}
                  </div>
                  <div className="text-[11px] text-slate-400">248.60 g cocaine HCl seizure</div>
                </td>
                <td className={tc.td}>
                  <span className="inline-flex items-center gap-1.5">
                    <Building2 className="h-3.5 w-3.5 text-slate-400" />
                    {activeCase.assignedDepartment}
                  </span>
                </td>
                <td className={tc.td}>
                  <div className="max-w-[180px] truncate text-slate-800 dark:text-slate-100" title={activeCase.investigatingOfficer}>
                    {activeCase.investigatingOfficer}
                  </div>
                  <div className="font-mono text-[11px] text-slate-400">{activeCase.officerBadge}</div>
                </td>
                <td className={tc.td}>
                  <StatusPill tone="rose">{activeCase.priority}</StatusPill>
                </td>
                <td className={tc.td}>
                  <StatusPill tone="violet" dot={false}>Draft report</StatusPill>
                </td>
                <td className={`${tc.td} text-right`}>
                  <Button size="xs" icon={ArrowUpRight} onClick={() => onSelectCase(activeCase.id)}>
                    Open case
                  </Button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </Panel>
    </DashboardPage>
  );
};
