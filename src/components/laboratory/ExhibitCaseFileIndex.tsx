import React, { useMemo, useState } from 'react';
import { FolderOpen, Inbox } from 'lucide-react';
import { FoodDrugIntake, FoodDrugIntakeStatus, WaterIntake, WaterIntakeStatus } from '../../types';
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
  /** Food & Drugs samples; when given, the page offers a laboratory switch. */
  foodDrugIntakes?: FoodDrugIntake[];
  foodDrugLoading?: boolean;
  onOpenFoodDrugCaseFile?: (intake: FoodDrugIntake) => void;
  laboratory?: Laboratory;
  onLaboratoryChange?: (laboratory: Laboratory) => void;
}

export type Laboratory = 'water' | 'food';

const FOOD_STATUS_TONE: Record<FoodDrugIntakeStatus, Tone> = {
  'Awaiting Approval': 'rose',
  'Awaiting Assignment': 'amber',
  'Under Analysis': 'sky',
  Reported: 'emerald',
};
const FOOD_STATUSES: FoodDrugIntakeStatus[] = ['Awaiting Approval', 'Awaiting Assignment', 'Under Analysis', 'Reported'];

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
  foodDrugIntakes,
  foodDrugLoading = false,
  onOpenFoodDrugCaseFile,
  laboratory = 'water',
  onLaboratoryChange,
}) => {
  const [filter, setFilter] = useState<StatusFilter>('all');
  const [foodFilter, setFoodFilter] = useState<'all' | FoodDrugIntakeStatus>('all');
  const [query, setQuery] = useState('');
  const isFood = laboratory === 'food' && !!foodDrugIntakes;

  const foodRows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return (foodDrugIntakes ?? [])
      .filter((i) => foodFilter === 'all' || i.status === foodFilter)
      .filter(
        (i) =>
          !q ||
          i.id.toLowerCase().includes(q) ||
          i.exhibitId.toLowerCase().includes(q) ||
          i.clientName.toLowerCase().includes(q) ||
          (i.analystAssigned ?? '').toLowerCase().includes(q) ||
          i.sampleType.toLowerCase().includes(q),
      )
      .sort((a, b) => b.intakeDate.localeCompare(a.intakeDate));
  }, [foodDrugIntakes, foodFilter, query]);

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

  const labSwitch = foodDrugIntakes && onLaboratoryChange && (
    <SegmentedControl
      ariaLabel="Laboratory"
      value={laboratory}
      onChange={onLaboratoryChange}
      options={[
        { value: 'water', label: 'Water & Environment', count: intakes.length },
        { value: 'food', label: 'Food & Drugs', count: foodDrugIntakes.length },
      ]}
    />
  );

  if (isFood) {
    const all = foodDrugIntakes ?? [];
    return (
      <DashboardPage>
        <DashboardHeader
          breadcrumb={['Operations', 'Case File']}
          title="Case files"
          description="Open any Food & Drugs sample to see its case file: work allocation, receipt form, laboratory worksheet and draft reports."
          meta={<StatusPill tone="slate">{all.length} samples</StatusPill>}
          actions={labSwitch}
        />
        <Panel
          icon={FolderOpen}
          tone="sky"
          title="Food & Drugs case files"
          description={`${foodRows.length} of ${all.length} entries`}
          flush
          actions={<SearchInput value={query} onChange={setQuery} placeholder="Search sample, client, analyst…" />}
        >
          <div className="border-b border-slate-200 px-4 py-2.5 dark:border-slate-800">
            <SegmentedControl
              ariaLabel="Filter Food & Drugs case files by status"
              value={foodFilter}
              onChange={setFoodFilter}
              options={[
                { value: 'all', label: 'All', count: all.length },
                ...FOOD_STATUSES.map((status) => ({ value: status, label: status, count: all.filter((i) => i.status === status).length })),
              ]}
            />
          </div>
          {foodDrugLoading && !all.length ? (
            <div className="p-8 text-center text-sm text-slate-500">Loading case files…</div>
          ) : foodRows.length === 0 ? (
            <EmptyState
              icon={Inbox}
              title="No case files to show"
              description={query.trim() ? `Nothing matches “${query.trim()}”.` : 'No Food & Drugs samples have been registered yet.'}
            />
          ) : (
            <div className="overflow-x-auto">
              <table className={`${tc.table} min-w-[860px]`}>
                <thead className={tc.thead}>
                  <tr>
                    <th scope="col" className={tc.th}>Sample no.</th>
                    <th scope="col" className={tc.th}>Received</th>
                    <th scope="col" className={tc.th}>Client</th>
                    <th scope="col" className={tc.th}>Sample type</th>
                    <th scope="col" className={tc.th}>Analyst</th>
                    <th scope="col" className={tc.th}>Progress</th>
                    <th scope="col" className={tc.th}>Status</th>
                    <th scope="col" className={`${tc.th} text-right`}>Actions</th>
                  </tr>
                </thead>
                <tbody className={tc.tbody}>
                  {foodRows.map((intake) => (
                    <tr key={intake.id} className={tc.tr}>
                      <td className={tc.td}>
                        <div className="font-mono text-[13px] font-semibold text-slate-900 dark:text-white">{intake.id}</div>
                        <div className="font-mono text-[11px] text-slate-400">{intake.exhibitId}</div>
                      </td>
                      <td className={`${tc.td} whitespace-nowrap`}>{intake.intakeDate}</td>
                      <td className={tc.td}>
                        <div className="max-w-[200px] truncate font-medium text-slate-900 dark:text-white" title={intake.clientName}>{intake.clientName}</div>
                      </td>
                      <td className={tc.td}>{intake.sampleType}</td>
                      <td className={tc.td}>{intake.analystAssigned ?? <span className="text-slate-400">Not assigned</span>}</td>
                      <td className={tc.td}>
                        <div className="text-xs">{intake.receiptFormSaved ? 'Receipt form saved' : <span className="text-slate-400">No receipt form</span>}</div>
                        <div className="text-[11px] text-slate-400">Worksheet: {intake.worksheetStatus ?? 'not started'}</div>
                      </td>
                      <td className={tc.td}>
                        <StatusPill tone={FOOD_STATUS_TONE[intake.status]}>{intake.status}</StatusPill>
                      </td>
                      <td className={`${tc.td} text-right`}>
                        <Button size="xs" icon={FolderOpen} onClick={() => onOpenFoodDrugCaseFile?.(intake)}>
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
  }

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Operations', 'Case File']}
        title="Case files"
        description="Open any Water & Environment exhibit to see its full case file, process and findings."
        meta={<StatusPill tone="slate">{intakes.length} exhibits</StatusPill>}
        actions={labSwitch}
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
