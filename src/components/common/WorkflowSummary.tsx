import React from 'react';
import { ChevronRight } from 'lucide-react';
import { TONE, Tone } from './Dashboard';

/* ---------------------------------------------------------------------------
 * WorkflowSummary — where a queue or register stands, in two panels:
 *  - Workflow: the stages an item moves through, left to right, each with its
 *    count, share and a note (e.g. "Oldest waiting 12 days"). A stacked bar
 *    shows the whole set at a glance.
 *  - Needs attention: the exceptions a supervisor acts on.
 * Every figure is a filter: selecting it narrows the list below.
 * Used by the case registers and the reception visitors' register.
 * --------------------------------------------------------------------------- */

export interface WorkflowStage<F extends string> {
  id: F;
  label: string;
  count: number;
  tone: Tone;
  /** Shown on hover. */
  hint?: string;
  /** Line under the count, e.g. "Oldest waiting 3 days". */
  note?: React.ReactNode;
}

export interface AttentionItem<F extends string> {
  id: F;
  label: string;
  hint: string;
  value: number;
  tone: Tone;
  icon: React.ComponentType<{ className?: string }>;
  /** Informational figure, not a problem: no warning colour when non-zero. */
  neutral?: boolean;
  /** Overrides `active === id` when selecting it sets something other than the filter. */
  selected?: boolean;
  /** Overrides `onSelect(id)`. */
  onClick?: () => void;
}

interface WorkflowSummaryProps<F extends string> {
  title: string;
  description: string;
  /** e.g. "files", "clients". */
  totalLabel: string;
  total: number;
  /** The filter id meaning "everything". */
  allId: F;
  stages: WorkflowStage<F>[];
  attentionTitle?: string;
  attentionDescription?: string;
  attention: AttentionItem<F>[];
  active: F;
  onSelect: (filter: F) => void;
}

export function WorkflowSummary<F extends string>({
  title,
  description,
  totalLabel,
  total,
  allId,
  stages,
  attentionTitle = 'Needs attention',
  attentionDescription,
  attention,
  active,
  onSelect,
}: WorkflowSummaryProps<F>) {
  const stageTotal = stages.reduce((sum, stage) => sum + stage.count, 0);

  return (
    <section aria-label={title} className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_17rem]">
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <div>
            <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{title}</h2>
            <p className="text-xs text-slate-500 dark:text-slate-400">{description}</p>
          </div>
          <button
            type="button"
            onClick={() => onSelect(allId)}
            aria-pressed={active === allId}
            className={`flex cursor-pointer items-baseline gap-1.5 rounded-lg px-3 py-1.5 transition-colors ${
              active === allId ? 'bg-amber-50 ring-1 ring-amber-500/40 dark:bg-amber-400/10' : 'hover:bg-slate-100 dark:hover:bg-slate-800'
            }`}
          >
            <span className="text-xl font-semibold tabular-nums text-slate-900 dark:text-white">{total}</span>
            <span className="text-xs text-slate-600 dark:text-slate-300">{totalLabel} · show all</span>
          </button>
        </div>

        <div className="px-4 pt-4">
          <div
            className="flex h-2.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
            role="img"
            aria-label={stages.map((s) => `${s.label}: ${s.count}`).join(', ')}
          >
            {stages.map((stage) =>
              stage.count > 0 ? (
                <span
                  key={stage.id}
                  className={`${TONE[stage.tone].bar} border-r-2 border-white last:border-r-0 dark:border-slate-900`}
                  style={{ width: `${(stage.count / Math.max(stageTotal, 1)) * 100}%` }}
                />
              ) : null,
            )}
          </div>
        </div>

        <ol className="grid grid-cols-2 gap-2 p-4 md:grid-cols-4 md:gap-0">
          {stages.map((stage, index) => {
            const selected = active === stage.id;
            const share = stageTotal ? Math.round((stage.count / stageTotal) * 100) : 0;
            return (
              <li key={stage.id} className="relative flex md:pr-5">
                <button
                  type="button"
                  onClick={() => onSelect(stage.id)}
                  aria-pressed={selected}
                  title={stage.hint}
                  className={`flex w-full cursor-pointer flex-col rounded-lg border p-3 text-left transition-colors ${
                    selected
                      ? 'border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/20 dark:border-amber-400 dark:bg-amber-400/10'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/40'
                  }`}
                >
                  <span className="flex items-center gap-1.5 text-[11px] font-medium text-slate-600 dark:text-slate-300">
                    <span className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-bold text-white ${TONE[stage.tone].bar}`}>
                      {index + 1}
                    </span>
                    <span className="truncate">{stage.label}</span>
                  </span>
                  <span className="mt-1.5 flex items-baseline gap-1.5">
                    <span className={`text-2xl font-semibold tabular-nums ${stage.count ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'}`}>
                      {stage.count}
                    </span>
                    <span className="text-[11px] tabular-nums text-slate-500 dark:text-slate-400">{share}%</span>
                  </span>
                  {stage.note && <span className="mt-1 text-[11px] leading-snug text-slate-500 dark:text-slate-400">{stage.note}</span>}
                </button>
                {index < stages.length - 1 && (
                  <ChevronRight aria-hidden="true" className="absolute right-0.5 top-1/2 hidden h-4 w-4 -translate-y-1/2 text-slate-300 md:block dark:text-slate-600" />
                )}
              </li>
            );
          })}
        </ol>
      </div>

      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="border-b border-slate-200 px-4 py-3 dark:border-slate-800">
          <h2 className="text-sm font-semibold text-slate-900 dark:text-white">{attentionTitle}</h2>
          {attentionDescription && <p className="text-xs text-slate-500 dark:text-slate-400">{attentionDescription}</p>}
        </div>
        <div className="space-y-1 p-2">
          {attention.map((item) => (
            <AttentionRow
              key={item.id}
              item={item}
              selected={item.selected ?? active === item.id}
              onClick={item.onClick ?? (() => onSelect(item.id))}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function AttentionRow<F extends string>({ item, selected, onClick }: { item: AttentionItem<F>; selected: boolean; onClick: () => void }) {
  const { icon: Icon, tone, label, hint, value, neutral } = item;
  const alarming = !neutral && value > 0;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`flex w-full cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 text-left transition-colors ${
        selected ? 'bg-amber-50 ring-1 ring-amber-500/40 dark:bg-amber-400/10' : 'hover:bg-slate-100 dark:hover:bg-slate-800/60'
      }`}
    >
      <span className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-lg ring-1 ring-inset ${value > 0 ? TONE[tone].chip : TONE.slate.chip}`}>
        <Icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[13px] font-medium text-slate-900 dark:text-white">{label}</span>
        <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">{hint}</span>
      </span>
      <span
        className={`text-lg font-semibold tabular-nums ${
          alarming
            ? tone === 'rose'
              ? 'text-rose-700 dark:text-rose-300'
              : 'text-amber-700 dark:text-amber-300'
            : value
              ? 'text-slate-900 dark:text-white'
              : 'text-slate-400 dark:text-slate-500'
        }`}
      >
        {value}
      </span>
    </button>
  );
}
