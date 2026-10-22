import React from 'react';
import { AlertTriangle, ArrowRight, ChevronRight, FolderOpen, Loader2 } from 'lucide-react';
import { TONE } from '../../common/Dashboard';
import { OutlineButton, StatusText } from '../workspace/ui';
import { TURNAROUND_DAYS } from './types';
import { CaseFileRegister } from './caseFileDepartments';

/**
 * Case files, before a department is chosen: one row per department that has case files, with
 * its open and overdue files and its own process laid out stage by stage. A department appears
 * here (and in the sidebar) as soon as it has its first case file.
 */
export const CaseRegistryOverview: React.FC<{
  registers: CaseFileRegister[];
  isLoading: boolean;
  onOpen: (departmentId: string) => void;
}> = ({ registers, isLoading, onOpen }) => {
  const total = registers.reduce((sum, register) => sum + register.total, 0);
  const open = registers.reduce((sum, register) => sum + register.open, 0);
  const overdue = registers.reduce((sum, register) => sum + register.overdue, 0);
  const today = new Date().toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' });

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4 animate-fade-in">
      <header>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
          <h1 className="text-[22px] font-semibold leading-tight tracking-[-0.02em] text-slate-900 dark:text-white">Case files</h1>
          {total > 0 && (
            <StatusText tone={overdue ? 'rose' : open ? 'amber' : 'emerald'}>
              {open} open{overdue ? ` · ${overdue} overdue` : ''}
            </StatusText>
          )}
        </div>
        <p className="mt-1 text-[13px] text-slate-500 dark:text-slate-400">
          {today} · {registers.length} {registers.length === 1 ? 'department' : 'departments'} with case files · {total} in all
        </p>
      </header>

      {registers.length === 0 ? (
        <div className="flex flex-col items-center gap-2 rounded-xl border border-dashed border-slate-300 px-6 py-14 text-center dark:border-slate-700">
          {isLoading ? <Loader2 className="h-5 w-5 animate-spin text-slate-400" /> : <FolderOpen className="h-6 w-6 text-slate-300 dark:text-slate-600" />}
          <p className="text-[14px] font-medium text-slate-900 dark:text-white">{isLoading ? 'Loading the case registers…' : 'No case files yet'}</p>
          {!isLoading && (
            <p className="max-w-md text-[12.5px] text-slate-500 dark:text-slate-400">
              A department appears here as soon as it registers its first exhibit or sample.
            </p>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-slate-200 rounded-xl border border-slate-200 dark:divide-slate-800 dark:border-slate-800">
          {registers.map(({ department, total: files, open: openFiles, overdue: late, stageCounts }) => (
            <li key={department.id}>
              <div
                role="button"
                tabIndex={0}
                onClick={() => onOpen(department.id)}
                onKeyDown={(event) => {
                  if (event.key === 'Enter' || event.key === ' ') {
                    event.preventDefault();
                    onOpen(department.id);
                  }
                }}
                className="flex cursor-pointer flex-col gap-3 px-5 py-4 transition-colors hover:bg-slate-500/[0.04] focus:outline-none focus-visible:bg-slate-500/[0.06] lg:flex-row lg:items-center lg:gap-6"
              >
                <div className="min-w-0 lg:w-60 lg:shrink-0">
                  <p className="text-[15px] font-semibold text-slate-900 dark:text-white">{department.label}</p>
                  <p className="mt-0.5 flex flex-wrap items-center gap-x-2 text-[12.5px] text-slate-500 dark:text-slate-400">
                    <span>{files} {department.unit}{files === 1 ? '' : 's'}</span>
                    <span aria-hidden="true">·</span>
                    <span>{openFiles} open</span>
                    {late > 0 && (
                      <span className="inline-flex items-center gap-1 font-medium text-rose-700 dark:text-rose-300" title={`Open longer than ${TURNAROUND_DAYS} days`}>
                        <AlertTriangle className="h-3 w-3" /> {late} overdue
                      </span>
                    )}
                  </p>
                </div>

                {/* The department's own process, stage by stage. */}
                <ol className="flex min-w-0 flex-1 flex-wrap items-center gap-x-1.5 gap-y-2" aria-label={`${department.label} process`}>
                  {stageCounts.map(({ stage, count }, index) => (
                    <li key={stage.value} className="flex items-center gap-1.5" title={stage.hint}>
                      {index > 0 && <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden="true" />}
                      <span className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-2.5 py-1 text-[12px] dark:border-slate-800">
                        <span className={`h-2 w-2 shrink-0 rounded-full ${TONE[stage.tone].dot}`} aria-hidden="true" />
                        <span className="text-slate-600 dark:text-slate-300">{stage.value}</span>
                        <span className={`font-semibold tabular-nums ${count ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{count}</span>
                      </span>
                    </li>
                  ))}
                </ol>

                <OutlineButton
                  tone="accent"
                  onClick={(event) => {
                    event.stopPropagation();
                    onOpen(department.id);
                  }}
                  className="self-start lg:self-auto"
                >
                  Open register <ArrowRight className="h-3.5 w-3.5" />
                </OutlineButton>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
};
