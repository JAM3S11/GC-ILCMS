import React, { useEffect, useState } from 'react';
import { CheckCircle2, Circle, CircleDot } from 'lucide-react';

/* ---------------------------------------------------------------------------
 * CaseFileContents — the "contents page" of an official case file.
 *
 * A sticky left-hand index listing the file's numbered sections in order, with
 * each section's state (complete / in progress / pending). The section in view
 * is highlighted as the reader scrolls; selecting one jumps to it. Shared by the
 * Water & Environment and Food & Drugs case files.
 * --------------------------------------------------------------------------- */

export type CaseFileSectionState = 'done' | 'current' | 'pending';

export interface CaseFileContentsSection {
  /** DOM id of the section element to scroll to. */
  id: string;
  number: number;
  title: string;
  state?: CaseFileSectionState;
  /** One-line status shown under the title ("Awaiting check", "Approved 12 Mar"). */
  note?: string;
}

interface CaseFileContentsProps {
  /** File reference printed at the top, e.g. the lab reference number. */
  reference: string;
  /** Which register the file belongs to, e.g. "Water & Environment". */
  register: string;
  sections: CaseFileContentsSection[];
  /** Override how a section is opened (e.g. to expand a collapsed step first). */
  onSelect?: (id: string) => void;
  className?: string;
}

const STATE_META: Record<CaseFileSectionState, { label: string; icon: React.ComponentType<{ className?: string }>; className: string }> = {
  done: { label: 'Complete', icon: CheckCircle2, className: 'text-emerald-700 dark:text-emerald-400' },
  current: { label: 'In progress', icon: CircleDot, className: 'text-amber-700 dark:text-amber-300' },
  pending: { label: 'Pending', icon: Circle, className: 'text-slate-400 dark:text-slate-500' },
};

const scrollToSection = (id: string) =>
  document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' });

export const CaseFileContents: React.FC<CaseFileContentsProps> = ({
  reference,
  register,
  sections,
  onSelect = scrollToSection,
  className = '',
}) => {
  const [inView, setInView] = useState<string | null>(sections[0]?.id ?? null);
  const sectionIds = sections.map((section) => section.id).join('|');

  // Highlight the section nearest the top of the reading area.
  useEffect(() => {
    const ids = sectionIds.split('|');
    const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (!elements.length || typeof IntersectionObserver === 'undefined') return;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => (entry.isIntersecting ? visible.add(entry.target.id) : visible.delete(entry.target.id)));
        const first = ids.find((id) => visible.has(id));
        if (first) setInView(first);
      },
      { rootMargin: '-10% 0px -60% 0px' },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sectionIds]);

  const tracked = sections.filter((section) => section.state);
  const done = tracked.filter((section) => section.state === 'done').length;

  return (
    <nav
      aria-label="Case file contents"
      className={`overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm print:hidden dark:border-slate-700 dark:bg-slate-900 ${className}`}
    >
      {/* Folio header, like the cover of a registry file */}
      <div className="border-b border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/50">
        <div className="text-[10px] font-semibold uppercase tracking-[0.14em] text-slate-500 dark:text-slate-400">File contents</div>
        <div className="mt-1 truncate font-mono text-[13px] font-semibold text-slate-900 dark:text-white" title={reference}>
          {reference}
        </div>
        <div className="truncate text-[11px] text-slate-600 dark:text-slate-300">{register} register</div>
      </div>

      <ol className="p-1.5">
        {sections.map((section) => {
          const active = section.id === inView;
          const meta = section.state ? STATE_META[section.state] : null;
          const StateIcon = meta?.icon;
          return (
            <li key={section.id}>
              <button
                type="button"
                onClick={() => {
                  setInView(section.id);
                  onSelect(section.id);
                }}
                aria-current={active ? 'location' : undefined}
                className={`relative flex w-full cursor-pointer items-start gap-2.5 rounded-lg px-2.5 py-2 text-left transition-colors ${
                  active
                    ? 'bg-amber-50 dark:bg-amber-400/10'
                    : 'hover:bg-slate-100 dark:hover:bg-slate-800/70'
                }`}
              >
                {active && <span aria-hidden="true" className="absolute inset-y-2 left-0 w-1 rounded-r bg-amber-500" />}
                <span
                  className={`mt-px flex h-5 w-5 shrink-0 items-center justify-center rounded text-[10px] font-semibold tabular-nums ${
                    section.state === 'done'
                      ? 'bg-emerald-600 text-white'
                      : active
                        ? 'bg-amber-600 text-white'
                        : 'bg-slate-800 text-white dark:bg-slate-700'
                  }`}
                >
                  {section.number}
                </span>
                <span className="min-w-0 flex-1">
                  <span
                    className={`block text-[13px] leading-snug ${
                      active ? 'font-semibold text-amber-900 dark:text-amber-100' : 'font-medium text-slate-800 dark:text-slate-100'
                    }`}
                  >
                    {section.title}
                  </span>
                  {(meta || section.note) && (
                    <span className={`mt-0.5 flex items-center gap-1 text-[11px] ${meta?.className ?? 'text-slate-500 dark:text-slate-400'}`}>
                      {StateIcon && <StateIcon className="h-3 w-3 shrink-0" aria-hidden="true" />}
                      <span className="truncate">{section.note ?? meta?.label}</span>
                    </span>
                  )}
                </span>
              </button>
            </li>
          );
        })}
      </ol>

      {tracked.length > 0 && (
        <div className="border-t border-slate-200 px-4 py-3 dark:border-slate-800">
          <div className="flex items-center justify-between text-[11px] text-slate-600 dark:text-slate-300">
            <span>Sections complete</span>
            <span className="font-semibold tabular-nums">
              {done} of {tracked.length}
            </span>
          </div>
          <div
            className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800"
            role="progressbar"
            aria-valuemin={0}
            aria-valuemax={tracked.length}
            aria-valuenow={done}
            aria-label="Sections complete"
          >
            <div className="h-full rounded-full bg-emerald-600 transition-all" style={{ width: `${(done / tracked.length) * 100}%` }} />
          </div>
        </div>
      )}
    </nav>
  );
};
