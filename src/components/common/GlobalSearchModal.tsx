import React, { useEffect, useMemo, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { CornerDownLeft, Droplets, FileText, FlaskConical, Microscope, Package, Search, TestTube } from 'lucide-react';
import { ForensicCase, User } from '../../types';
import { APP_NAV_GROUPS, SETTINGS_NAV_ITEM, canSeeNavItem } from '../layout/appNav';

/**
 * Command palette (Ctrl / ⌘ + K): jump to any page the user can open, or to
 * a record on the active case. Arrow keys move, Enter opens, Esc closes.
 */

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
  activeCase: ForensicCase;
  /** Limits Pages to what this user can open. */
  currentUser?: Pick<User, 'role' | 'department'> | null;
}

type Result = {
  id: string;
  group: 'Pages' | 'Records';
  title: string;
  subtitle?: string;
  hint?: string;
  icon: React.ComponentType<{ className?: string }>;
  view: string;
  keywords?: string;
};

export const isMacPlatform = () => typeof navigator !== 'undefined' && /mac|iphone|ipad/i.test(navigator.platform);

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
  activeCase,
  currentUser,
}) => {
  const [query, setQuery] = useState('');
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLDivElement>(null);

  // Fresh palette every time it opens.
  useEffect(() => {
    if (isOpen) {
      setQuery('');
      setActive(0);
    }
  }, [isOpen]);

  const pages: Result[] = useMemo(() => {
    const items = [...APP_NAV_GROUPS.flatMap((g) => g.items), SETTINGS_NAV_ITEM];
    return items
      .filter((item) => !currentUser || canSeeNavItem(currentUser, item))
      .map((item) => ({ id: `page-${item.id}`, group: 'Pages', title: item.label, icon: item.icon, view: item.id, hint: 'Page' }));
  }, [currentUser]);

  const records: Result[] = useMemo(() => {
    const c = activeCase;
    return [
      {
        id: `case-${c.id}`,
        group: 'Records',
        title: c.caseNumber,
        subtitle: c.natureOfCase,
        hint: 'Case',
        icon: FileText,
        view: 'case-file',
        keywords: `${c.labReferenceNumber} ${c.investigatingOfficer} ${c.requestingInstitution}`,
      },
      ...(c.draftReport
        ? [{ id: 'report', group: 'Records' as const, title: c.draftReport.reportNumber, subtitle: 'Draft report', hint: 'Report', icon: FileText, view: 'case-file' }]
        : []),
      ...c.exhibits.map((e) => ({
        id: `exh-${e.id}`,
        group: 'Records' as const,
        title: e.id,
        subtitle: e.description,
        hint: 'Exhibit',
        icon: Package,
        view: 'case-file',
        keywords: `${e.sealNumber} ${e.receivedFrom} ${e.laboratory}`,
      })),
      ...c.samples.map((s) => ({
        id: `smp-${s.id}`,
        group: 'Records' as const,
        title: s.id,
        subtitle: s.sampleDescription,
        hint: 'Subsample',
        icon: TestTube,
        view: 'case-file',
      })),
      ...c.examinations.map((e) => ({
        id: `exam-${e.id}`,
        group: 'Records' as const,
        title: e.examinationType,
        subtitle: `${e.id} · ${e.instrument}`,
        hint: 'Examination',
        icon: Microscope,
        view: 'case-file',
        keywords: e.analystName,
      })),
      ...(c.waterIntakes ?? []).map((w) => ({
        id: `wei-${w.id}`,
        group: 'Records' as const,
        title: w.labReference,
        subtitle: `${w.senderName} · ${w.testType}`,
        hint: 'Water intake',
        icon: Droplets,
        view: 'laboratory',
        keywords: `${w.id} ${w.analysisOfficer ?? ''} ${w.sourceType} ${w.locationFrom}`,
      })),
      ...(c.foodDrugIntakes ?? []).map((f) => ({
        id: `fdi-${f.id}`,
        group: 'Records' as const,
        title: f.id,
        subtitle: `${f.clientName} · ${f.sampleType}`,
        hint: 'F&D sample',
        icon: FlaskConical,
        view: 'laboratory',
        keywords: `${f.analystAssigned ?? ''} ${f.nationalId}`,
      })),
    ];
  }, [activeCase]);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    if (!q) return [...pages, ...records.slice(0, 1)]; // pages + the active case as a suggestion
    const match = (r: Result) => `${r.title} ${r.subtitle ?? ''} ${r.hint ?? ''} ${r.keywords ?? ''}`.toLowerCase().includes(q);
    return [...pages.filter(match), ...records.filter(match)];
  }, [q, pages, records]);

  useEffect(() => setActive(0), [q]);

  // Keep the highlighted row in view while arrowing.
  useEffect(() => {
    listRef.current?.querySelector(`[data-index="${active}"]`)?.scrollIntoView({ block: 'nearest' });
  }, [active]);

  const open = (r: Result) => {
    onNavigate(r.view);
    onClose();
  };

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActive((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActive((i) => Math.max(i - 1, 0));
    } else if (e.key === 'Enter' && results[active]) {
      e.preventDefault();
      open(results[active]);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      onClose();
    }
  };

  const groups = (['Pages', 'Records'] as const)
    .map((g) => ({ title: q ? g : g === 'Records' ? 'Suggested' : g, items: results.filter((r) => r.group === g) }))
    .filter((g) => g.items.length > 0);

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="fixed inset-0 z-[60] flex items-start justify-center bg-slate-950/40 px-3 pt-[12vh] backdrop-blur-[2px] dark:bg-slate-950/70"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.12 }}
          onMouseDown={onClose}
        >
          <motion.div
            role="dialog"
            aria-modal="true"
            aria-label="Search"
            initial={{ opacity: 0, scale: 0.97, y: -8 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.97, y: -8 }}
            transition={{ duration: 0.14, ease: 'easeOut' }}
            onMouseDown={(e) => e.stopPropagation()}
            onKeyDown={onKeyDown}
            className="flex max-h-[70vh] w-full max-w-xl flex-col overflow-hidden rounded-xl border border-slate-200 bg-white shadow-2xl shadow-slate-900/20 dark:border-slate-800 dark:bg-slate-900"
          >
            {/* Input */}
            <div className="flex items-center gap-3 border-b border-slate-200 px-4 dark:border-slate-800">
              <Search className="h-4 w-4 shrink-0 text-slate-400" />
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search pages, cases, exhibits, intakes…"
                role="combobox"
                aria-expanded="true"
                aria-controls="search-results"
                aria-activedescendant={results[active] ? `search-${results[active].id}` : undefined}
                // The palette itself is the focus context; skip the global focus ring on the field.
                style={{ outline: 'none' }}
                className="h-12 w-full bg-transparent text-[15px] text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
              />
              <Kbd>Esc</Kbd>
            </div>

            {/* Results */}
            <div ref={listRef} id="search-results" role="listbox" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-2">
              {results.length === 0 ? (
                <div className="px-4 py-10 text-center">
                  <div className="text-sm font-medium text-slate-900 dark:text-white">No results for “{query}”</div>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">Try a case number, exhibit ID, lab reference or name.</p>
                </div>
              ) : (
                groups.map((g) => (
                  <div key={g.title} className="mb-1 last:mb-0">
                    <div className="px-2.5 pb-1 pt-2 text-[11px] font-medium text-slate-400">{g.title}</div>
                    {g.items.map((r) => {
                      const index = results.indexOf(r);
                      const selected = index === active;
                      const Icon = r.icon;
                      return (
                        <div
                          key={r.id}
                          id={`search-${r.id}`}
                          role="option"
                          aria-selected={selected}
                          data-index={index}
                          onMouseMove={() => setActive(index)}
                          onClick={() => open(r)}
                          className={`flex cursor-pointer items-center gap-3 rounded-lg px-2.5 py-2 ${
                            selected ? 'bg-slate-100 dark:bg-slate-800' : ''
                          }`}
                        >
                          <span
                            className={`flex h-8 w-8 shrink-0 items-center justify-center rounded-md border ${
                              selected
                                ? 'border-amber-500/30 bg-amber-500/10 text-amber-600 dark:text-amber-400'
                                : 'border-slate-200 bg-white text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400'
                            }`}
                          >
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0 flex-1">
                            <span className="block truncate text-[13px] font-medium text-slate-900 dark:text-white">
                              <Highlight text={r.title} query={q} />
                            </span>
                            {r.subtitle && (
                              <span className="block truncate text-xs text-slate-500 dark:text-slate-400">
                                <Highlight text={r.subtitle} query={q} />
                              </span>
                            )}
                          </span>
                          {selected ? (
                            <CornerDownLeft className="h-3.5 w-3.5 shrink-0 text-slate-400" />
                          ) : (
                            r.hint && <span className="shrink-0 text-[11px] text-slate-400">{r.hint}</span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer: keyboard hints */}
            <div className="hidden items-center gap-4 border-t border-slate-200 bg-slate-50 px-4 py-2 text-[11px] text-slate-500 sm:flex dark:border-slate-800 dark:bg-slate-950/40 dark:text-slate-400">
              <span className="flex items-center gap-1.5">
                <Kbd>↑</Kbd>
                <Kbd>↓</Kbd> to navigate
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>↵</Kbd> to open
              </span>
              <span className="flex items-center gap-1.5">
                <Kbd>Esc</Kbd> to close
              </span>
              <span className="ml-auto flex items-center gap-1">
                Open anywhere with <Kbd>{isMacPlatform() ? '⌘' : 'Ctrl'}</Kbd>
                <Kbd>K</Kbd>
              </span>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export const Kbd: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <kbd className="inline-flex h-5 min-w-5 items-center justify-center rounded border border-slate-200 bg-white px-1 font-sans text-[10px] font-medium text-slate-500 shadow-[0_1px_0_rgba(15,23,42,0.08)] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400">
    {children}
  </kbd>
);

/** Bolds the part of `text` that matches the query. */
const Highlight: React.FC<{ text: string; query: string }> = ({ text, query }) => {
  const i = query ? text.toLowerCase().indexOf(query) : -1;
  if (i < 0) return <>{text}</>;
  return (
    <>
      {text.slice(0, i)}
      <mark className="rounded-sm bg-amber-500/20 text-inherit">{text.slice(i, i + query.length)}</mark>
      {text.slice(i + query.length)}
    </>
  );
};
