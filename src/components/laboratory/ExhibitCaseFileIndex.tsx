import React, { useMemo, useState } from 'react';
import { FolderOpen, Inbox } from 'lucide-react';
import { WaterIntake, WaterIntakeStatus } from '../../types';
import {
  Button,
  DashboardHeader,
  DashboardPage,
  EmptyState,
  Panel,
  SearchInput,
  SegmentedControl,
  StatusPill,
  Tone,
  tableClasses as tc,
} from '../common/Dashboard';

/**
 * Every exhibit case file in the laboratory, for oversight roles that are not
 * tied to one officer's queue. Opening a row shows the same case file the
 * assigned officer works in.
 */

interface ExhibitCaseFileIndexProps {
  intakes: WaterIntake[];
  isLoading?: boolean;
  error?: string;
  onOpenCaseFile: (intake: WaterIntake) => void;
}

type StatusFilter = 'all' | WaterIntakeStatus;

const STATUS_TONE: Record<WaterIntakeStatus, Tone> = {
  'Awaiting Approval': 'rose',
  'Awaiting Assignment': 'amber',
  'Under Analysis': 'sky',
  'Analysis Complete': 'emerald',
};

const STATUSES: WaterIntakeStatus[] = ['Awaiting Approval', 'Awaiting Assignment', 'Under Analysis', 'Analysis Complete'];

export const ExhibitCaseFileIndex: React.FC<ExhibitCaseFileIndexProps> = ({
  intakes,
  isLoading = false,
  error = '',
  onOpenCaseFile,
}) => {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return intakes
      .filter((i) => filter === 'all' || i.status === filter)
      .filter(
        (i) =>
          !q ||
          i.labReference.toLowerCase().includes(q) ||
          i.exhibitId.toLowerCase().includes(q) ||
          i.senderName.toLowerCase().includes(q) ||
          (i.analysisOfficer ?? '').toLowerCase().includes(q) ||
          i.sourceType.toLowerCase().includes(q),
      )
      .sort((a, b) => b.dateReceived.localeCompare(a.dateReceived));
  }, [intakes, filter, query]);

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Operations', 'Case File']}
        title="Case files"
        description="Open any Water & Environment exhibit to see its full case file, process and findings."
        meta={<StatusPill tone="slate">{intakes.length} exhibits</StatusPill>}
      />

      {error && (
        <div role="alert" className="rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
          {error}
        </div>
      )}

      <Panel
        icon={FolderOpen}
        tone="sky"
        title="Exhibit case files"
        description={`${rows.length} of ${intakes.length} entries`}
        flush
        actions={<SearchInput value={query} onChange={setQuery} placeholder="Search reference, sender, officer…" />}
      >
        <div className="border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
          <SegmentedControl
            ariaLabel="Filter case files by status"
            value={filter}
            onChange={setFilter}
            options={[
              { value: 'all', label: 'All', count: intakes.length },
              ...STATUSES.map((status) => ({
                value: status,
                label: status,
                count: intakes.filter((i) => i.status === status).length,
              })),
            ]}
          />
        </div>

        {isLoading ? (
          <div className="p-8 text-center text-sm text-slate-500">Loading case files…</div>
        ) : rows.length === 0 ? (
          <EmptyState
            icon={Inbox}
            title="No case files to show"
            description={query.trim() ? `Nothing matches “${query.trim()}”.` : 'No exhibits have been registered yet.'}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className={`${tc.table} min-w-[860px]`}>
              <thead className={tc.thead}>
                <tr>
                  <th scope="col" className={tc.th}>Lab reference</th>
                  <th scope="col" className={tc.th}>Received</th>
                  <th scope="col" className={tc.th}>Sender</th>
                  <th scope="col" className={tc.th}>Test requested</th>
                  <th scope="col" className={tc.th}>Analysis officer</th>
                  <th scope="col" className={tc.th}>Status</th>
                  <th scope="col" className={`${tc.th} text-right`}>Actions</th>
                </tr>
              </thead>
              <tbody className={tc.tbody}>
                {rows.map((intake) => (
                  <tr key={intake.id} className={tc.tr}>
                    <td className={tc.td}>
                      <div className="font-mono text-[13px] font-semibold text-slate-900 dark:text-white">{intake.labReference}</div>
                      <div className="font-mono text-[11px] text-slate-400">{intake.exhibitId}</div>
                    </td>
                    <td className={`${tc.td} whitespace-nowrap`}>{intake.dateReceived}</td>
                    <td className={tc.td}>
                      <div className="max-w-[200px] truncate font-medium text-slate-900 dark:text-white" title={intake.senderName}>
                        {intake.senderName}
                      </div>
                      <div className="text-[11px] text-slate-400">{intake.senderType}</div>
                    </td>
                    <td className={tc.td}>
                      <div className="max-w-[220px]">{intake.testType}</div>
                      <div className="max-w-[220px] truncate text-[11px] text-slate-400">{intake.sourceType}</div>
                    </td>
                    <td className={tc.td}>{intake.analysisOfficer ?? <span className="text-slate-400">Not assigned</span>}</td>
                    <td className={tc.td}>
                      <StatusPill tone={STATUS_TONE[intake.status]}>{intake.status}</StatusPill>
                    </td>
                    <td className={`${tc.td} text-right`}>
                      <Button size="xs" icon={FolderOpen} onClick={() => onOpenCaseFile(intake)}>
                        Case file
                      </Button>
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
