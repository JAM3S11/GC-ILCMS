import React, { useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, Copy, History, Hourglass, Info, LucideIcon, MoreHorizontal, X } from 'lucide-react';
import { Button, StatusPill, Tone } from '../common/Dashboard';
import { PANEL_TEXT, PANEL_TEXT_2, SidePanel } from '../common/SidePanel';
import { CaseProgress, CaseStage, DAYS_IN_LAB_WARNING, NextStep, daysInLab } from './CaseFlow';
import { openCaseStep } from './CaseStep';

/* ---------------------------------------------------------------------------
 * CaseFileLayout — the one page every department's case file is built on.
 *
 *   ← Back
 *   REFERENCE  ● Status                              [⋯]  [Main action]
 *   What it is · who it is for · Day n in lab
 *   → Next: who does what (and what still stands in the way)
 *   ━━ five shared stages ━━
 *   ┌ steps (only the current one open) ┐ ┌ Details · On this page · History ┐
 *
 * Departments supply the steps (CaseStep) and the facts; the layout supplies the
 * navigation: a sticky bar while scrolling, [ and ] to move between steps, Esc to
 * go back, and on phones a bottom bar with the main action.
 * --------------------------------------------------------------------------- */

export interface CaseFileDetail {
  label: string;
  value: React.ReactNode;
  /** Shows a copy button that copies this text. */
  copy?: string;
  mono?: boolean;
}

export interface CaseFileSectionLink {
  id: string;
  title: string;
  state: 'done' | 'current' | 'pending';
}

export interface CaseFileMenuAction {
  label: string;
  icon: LucideIcon;
  onClick: () => void;
}

interface CaseFileLayoutProps {
  back: { label: string; onClick: () => void };
  reference: string;
  status: { label: string; tone: Tone };
  /** Short facts under the reference, joined with dots. */
  subtitle: React.ReactNode[];
  next: NextStep;
  stages: CaseStage[];
  /** YYYY-MM-DD the exhibit was received and, once finished, issued. */
  receivedDate?: string | null;
  finishedDate?: string | null;
  /** Secondary actions, kept in the "More" menu. */
  more?: CaseFileMenuAction[];
  details: CaseFileDetail[];
  sections: CaseFileSectionLink[];
  /** The process history, opened in the side panel. */
  history?: { count: number; content: React.ReactNode };
  /** Shown above the steps, e.g. an error from the last action. */
  notice?: React.ReactNode;
  children: React.ReactNode;
}

const isTyping = (target: EventTarget | null) =>
  target instanceof HTMLElement &&
  (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));

const CopyButton: React.FC<{ value: string; label: string }> = ({ value, label }) => {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(value);
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1500);
        } catch {
          /* Clipboard blocked; nothing to do. */
        }
      }}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      title={copied ? 'Copied' : `Copy ${label}`}
      className="inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
    >
      {copied ? <Check className="h-3 w-3 text-emerald-600" /> : <Copy className="h-3 w-3" />}
    </button>
  );
};

/** Secondary actions behind one button, so the header keeps a single main action. */
const MoreMenu: React.FC<{ actions: CaseFileMenuAction[] }> = ({ actions }) => {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (!open) return undefined;
    const close = (event: MouseEvent | KeyboardEvent) => {
      if (event instanceof KeyboardEvent ? event.key === 'Escape' : !ref.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', close);
    document.addEventListener('keydown', close);
    return () => {
      document.removeEventListener('mousedown', close);
      document.removeEventListener('keydown', close);
    };
  }, [open]);
  if (!actions.length) return null;
  return (
    <div ref={ref} className="relative">
      <Button icon={MoreHorizontal} aria-label="More actions" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="!px-2.5" />
      {open && (
        <div role="menu" className="absolute right-0 z-30 mt-1 min-w-48 overflow-hidden rounded-lg border border-slate-200 bg-white py-1 shadow-lg dark:border-slate-700 dark:bg-slate-900">
          {actions.map((action) => (
            <button
              key={action.label}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                action.onClick();
              }}
              className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-[13px] text-slate-700 transition-colors hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-800"
            >
              <action.icon className="h-4 w-4 text-slate-400" />
              {action.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/** The process history in the app's side panel; it is a record, not a step. */
const HistoryDrawer: React.FC<{ open: boolean; reference: string; count: number; onClose: () => void; children: React.ReactNode }> = ({ open, reference, count, onClose, children }) => (
  <SidePanel
    open={open}
    onClose={onClose}
    section="Process history"
    recordId={reference}
    titleId="process-history-title"
    footer={<p className={`text-[11px] ${PANEL_TEXT_2}`}>Every step is recorded with who did it and when, for the audit trail.</p>}
  >
    <div className="px-4 py-6 sm:px-6">
      <div className="mb-5 flex items-center gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-slate-500 dark:bg-[#2A2A2A] dark:text-[#9A9A9A]">
          <History className="h-5 w-5" />
        </span>
        <div className="min-w-0">
          <h2 id="process-history-title" className={`text-[22px] font-semibold leading-tight ${PANEL_TEXT}`}>Process history</h2>
          <p className={`text-[13px] ${PANEL_TEXT_2}`}>{count} recorded step{count === 1 ? '' : 's'} for {reference}</p>
        </div>
      </div>
      {children}
    </div>
  </SidePanel>
);

const STATE_DOT: Record<CaseFileSectionLink['state'], string> = {
  done: 'bg-emerald-500',
  current: 'bg-amber-500',
  pending: 'bg-slate-300 dark:bg-slate-600',
};

const railHeading = 'px-3.5 pb-1.5 pt-3 text-[11px] font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400';

export const CaseFileLayout: React.FC<CaseFileLayoutProps> = ({
  back,
  reference,
  status,
  subtitle,
  next,
  stages,
  receivedDate,
  finishedDate,
  more = [],
  details,
  sections,
  history,
  notice,
  children,
}) => {
  const headerRef = useRef<HTMLElement>(null);
  const [scrolledPast, setScrolledPast] = useState(false);
  const [inView, setInView] = useState(sections[0]?.id ?? '');
  const [historyOpen, setHistoryOpen] = useState(false);
  const days = daysInLab(receivedDate, finishedDate);
  const overdue = days !== null && days > DAYS_IN_LAB_WARNING && !next.done;
  const sectionIds = sections.map((section) => section.id).join('|');

  // The sticky bar appears once the header has scrolled out of view.
  useEffect(() => {
    const header = headerRef.current;
    if (!header || typeof IntersectionObserver === 'undefined') return undefined;
    const observer = new IntersectionObserver(([entry]) => setScrolledPast(!entry.isIntersecting), { threshold: 0 });
    observer.observe(header);
    return () => observer.disconnect();
  }, []);

  // "On this page" follows the step nearest the top of the reading area.
  useEffect(() => {
    const ids = sectionIds.split('|');
    const elements = ids.map((id) => document.getElementById(id)).filter((el): el is HTMLElement => !!el);
    if (!elements.length || typeof IntersectionObserver === 'undefined') return undefined;
    const visible = new Set<string>();
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => (entry.isIntersecting ? visible.add(entry.target.id) : visible.delete(entry.target.id)));
        const first = ids.find((id) => visible.has(id));
        if (first) setInView(first);
      },
      { rootMargin: '-15% 0px -55% 0px' },
    );
    elements.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [sectionIds]);

  // [ and ] move between steps; Esc goes back when nothing else is open.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [aria-modal="true"], [role="menu"]')) return;
      const ids = sectionIds.split('|').filter(Boolean);
      if (event.key === ']' || event.key === '[') {
        const index = Math.max(0, ids.indexOf(inView));
        const target = ids[Math.min(ids.length - 1, Math.max(0, index + (event.key === ']' ? 1 : -1)))];
        if (target) {
          event.preventDefault();
          setInView(target);
          openCaseStep(target);
        }
      } else if (event.key === 'Escape') {
        back.onClick();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [sectionIds, inView, back]);

  const mainAction = next.action && (
    <Button variant={next.done ? 'secondary' : 'primary'} onClick={() => openCaseStep(next.action!.target)}>
      {next.action.label}
      <ArrowRight className="h-4 w-4" />
    </Button>
  );
  const moreActions: CaseFileMenuAction[] = [...more, ...(history ? [{ label: `Process history (${history.count})`, icon: History, onClick: () => setHistoryOpen(true) }] : [])];

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-4 pb-20 lg:pb-0">
      {/* Sticky bar while scrolling: the reference and the main action stay in reach. */}
      {/* A zero-height anchor, so showing and hiding the bar never moves the page. */}
      <div className="sticky top-0 z-20 h-0 print:hidden">
        <div
          aria-hidden={!scrolledPast}
          className={`absolute -left-4 -right-4 top-0 flex h-11 items-center gap-3 border-b border-slate-200 bg-white/95 px-4 backdrop-blur transition-opacity duration-150 md:-left-6 md:-right-6 md:px-6 lg:-left-8 lg:-right-8 lg:px-8 dark:border-slate-800 dark:bg-slate-950/95 ${
            scrolledPast ? 'opacity-100' : 'pointer-events-none opacity-0'
          }`}
        >
          {scrolledPast && (
            <>
              <span className="truncate font-mono text-[13px] font-semibold text-slate-900 dark:text-white">{reference}</span>
              <StatusPill tone={status.tone}>{status.label}</StatusPill>
              <span className="ml-auto hidden lg:block">{next.action && (
                <Button size="sm" variant={next.done ? 'secondary' : 'primary'} onClick={() => openCaseStep(next.action!.target)}>{next.action.label}</Button>
              )}</span>
            </>
          )}
        </div>
      </div>

      <header ref={headerRef} className="space-y-3">
        <button
          type="button"
          onClick={back.onClick}
          className="-ml-1.5 inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 text-[13px] text-slate-500 transition-colors hover:bg-slate-100 hover:text-slate-900 print:hidden dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
          title="Back (Esc)"
        >
          <ArrowLeft className="h-4 w-4" /> {back.label}
        </button>

        <div className="flex flex-wrap items-start gap-x-4 gap-y-3">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="flex items-center gap-1 break-all font-mono text-[23px] font-semibold leading-tight tracking-[-0.02em] text-slate-900 dark:text-white">
                {reference}
                <span className="print:hidden"><CopyButton value={reference} label="reference" /></span>
              </h1>
              <StatusPill tone={status.tone}>{status.label}</StatusPill>
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-slate-600 dark:text-slate-300">
              {subtitle.filter(Boolean).map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>}
                  <span>{item}</span>
                </React.Fragment>
              ))}
              {days !== null && (
                <>
                  <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
                  <span
                    className={`inline-flex items-center gap-1 tabular-nums ${overdue ? 'font-medium text-rose-600 dark:text-rose-400' : days > DAYS_IN_LAB_WARNING - 4 && !next.done ? 'font-medium text-warning-700 dark:text-warning-300' : ''}`}
                    title={`Counted from the day the exhibit was received; the target is ${DAYS_IN_LAB_WARNING} days`}
                  >
                    <Hourglass className="h-3.5 w-3.5" />
                    {next.done ? `${days} ${days === 1 ? 'day' : 'days'} in lab` : `Day ${days} in lab${overdue ? ' · overdue' : ''}`}
                  </span>
                </>
              )}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 print:hidden">
            <MoreMenu actions={moreActions} />
            <span className="hidden lg:block">{mainAction}</span>
          </div>
        </div>

        {/* Who does what next, in one line; anything still in the way is listed, not hidden in a tooltip. */}
        <div className={`rounded-lg px-3.5 py-2.5 text-[13px] ${next.done ? 'bg-emerald-50 text-emerald-900 dark:bg-emerald-500/10 dark:text-emerald-100' : 'bg-slate-100/70 text-slate-700 dark:bg-slate-800/60 dark:text-slate-200'}`} aria-live="polite">
          <p className="flex items-start gap-2">
            {next.done ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />}
            <span><span className="font-semibold">{next.done ? 'Complete. ' : 'Next: '}</span>{next.text}</span>
          </p>
          {!!next.blockers?.length && (
            <div className="mt-1.5 flex items-start gap-2 pl-6 text-xs text-slate-600 dark:text-slate-300">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Still needed first: {next.blockers.join(' ')}</span>
            </div>
          )}
        </div>

        <CaseProgress stages={stages} onSelect={openCaseStep} />
      </header>

      {notice}

      <div className="grid items-start gap-4 lg:grid-cols-[minmax(0,1fr)_17rem]">
        <div className="min-w-0 space-y-2.5">{children}</div>

        {/* The quiet right rail: facts at a glance, the page's steps and the history. */}
        <aside className="order-first overflow-hidden rounded-[10px] border border-slate-200 bg-white lg:sticky lg:top-14 lg:order-none print:hidden dark:border-slate-800 dark:bg-slate-900">
          <details className="group lg:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-between px-3.5 py-2.5 text-[13px] font-medium text-slate-700 dark:text-slate-200">
              Details and steps
              <ArrowRight className="h-4 w-4 text-slate-400 transition-transform group-open:rotate-90" />
            </summary>
            <RailContent details={details} sections={sections} inView={inView} onSelect={(id) => { setInView(id); openCaseStep(id); }} history={history} onOpenHistory={() => setHistoryOpen(true)} />
          </details>
          <div className="hidden lg:block">
            <RailContent details={details} sections={sections} inView={inView} onSelect={(id) => { setInView(id); openCaseStep(id); }} history={history} onOpenHistory={() => setHistoryOpen(true)} />
          </div>
        </aside>
      </div>

      {/* Phones: the main action in a bottom bar with a full-size touch target. */}
      {next.action && (
        <div className="fixed inset-x-0 bottom-0 z-30 border-t border-slate-200 bg-white/95 px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 backdrop-blur lg:hidden print:hidden dark:border-slate-800 dark:bg-slate-950/95">
          <Button variant={next.done ? 'secondary' : 'primary'} className="h-12 w-full" onClick={() => openCaseStep(next.action!.target)}>
            {next.action.label}
          </Button>
        </div>
      )}

      {history && (
        <HistoryDrawer open={historyOpen} reference={reference} count={history.count} onClose={() => setHistoryOpen(false)}>
          {history.content}
        </HistoryDrawer>
      )}
    </div>
  );
};

const RailContent: React.FC<{
  details: CaseFileDetail[];
  sections: CaseFileSectionLink[];
  inView: string;
  onSelect: (id: string) => void;
  history?: { count: number };
  onOpenHistory: () => void;
}> = ({ details, sections, inView, onSelect, history, onOpenHistory }) => (
  <>
    <h2 className={railHeading}>Details</h2>
    <dl className="space-y-2 px-3.5 pb-3">
      {details.filter((detail) => detail.value !== null && detail.value !== undefined && detail.value !== '').map((detail) => (
        <div key={detail.label} className="grid grid-cols-[6.5rem_minmax(0,1fr)] items-baseline gap-2 text-[12.5px]">
          <dt className="text-slate-500 dark:text-slate-400">{detail.label}</dt>
          <dd className={`flex min-w-0 items-center gap-1 text-slate-900 dark:text-white ${detail.mono ? 'font-mono text-[12px]' : ''}`}>
            <span className="min-w-0 break-words">{detail.value}</span>
            {detail.copy && <CopyButton value={detail.copy} label={detail.label.toLowerCase()} />}
          </dd>
        </div>
      ))}
    </dl>

    <h2 className={`${railHeading} border-t border-slate-100 dark:border-slate-800`}>On this page</h2>
    <nav aria-label="Case file steps" className="px-1.5 pb-2">
      {sections.map((section) => {
        const active = section.id === inView;
        return (
          <button
            key={section.id}
            type="button"
            onClick={() => onSelect(section.id)}
            aria-current={active ? 'location' : undefined}
            className={`flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2 py-1.5 text-left text-[13px] transition-colors ${
              active ? 'bg-slate-100 font-medium text-slate-900 dark:bg-slate-800 dark:text-white' : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800/60'
            }`}
          >
            <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${STATE_DOT[section.state]}`} aria-hidden="true" />
            <span className="truncate">{section.title}</span>
            {section.state === 'current' && <span className="ml-auto text-[11px] text-amber-700 dark:text-amber-300">Now</span>}
          </button>
        );
      })}
    </nav>
    <p className="hidden border-t border-slate-100 px-3.5 py-2 text-[11px] text-slate-400 lg:block dark:border-slate-800">
      <kbd className="font-sans">[</kbd> <kbd className="font-sans">]</kbd> move between steps · <kbd className="font-sans">Esc</kbd> back
    </p>

    {history && (
      <button
        type="button"
        onClick={onOpenHistory}
        className="flex w-full cursor-pointer items-center gap-2 border-t border-slate-100 px-3.5 py-2.5 text-left text-[13px] text-slate-600 transition-colors hover:bg-slate-50 hover:text-slate-900 dark:border-slate-800 dark:text-slate-300 dark:hover:bg-slate-800/60"
      >
        <History className="h-4 w-4 text-slate-400" />
        Process history
        <span className="ml-auto tabular-nums text-slate-400">{history.count}</span>
      </button>
    )}
  </>
);
