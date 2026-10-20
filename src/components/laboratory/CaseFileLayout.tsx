import React, { useCallback, useEffect, useRef, useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ChevronLeft, ChevronRight, Circle, CircleDot, Copy, History, Hourglass, Info, LucideIcon, MoreHorizontal } from 'lucide-react';
import { Tone } from '../common/Dashboard';
import { PANEL_TEXT, PANEL_TEXT_2, SidePanel } from '../common/SidePanel';
import { DAYS_IN_LAB_WARNING, NextStep, daysInLab } from './CaseFlow';
import { CaseFolderContext, useCaseStepOpen } from './CaseStep';
import { OutlineButton, StatusText } from './workspace/ui';

/* ---------------------------------------------------------------------------
 * CaseFileLayout — the one page every department's case file is built on,
 * laid out like the paper folder it replaces.
 *
 *   ← Back
 *   REFERENCE  ● Status · Day n in lab                       [⋯]
 *   → Next: who does what                               [Main action]
 *   [‹ Previous document]   2 of 4 · Open document   [Next document ›]
 *   ┌ the open document: form · A4 preview ┐
 *   │ [sticky save / submit bar]           │
 *
 * Departments supply the documents (CaseStep) and the facts; the layout
 * decides which document is open. openCaseStep(id) switches to a document,
 * [ and ] move between them, and Esc goes back. Case details and the process
 * history open from the More (⋯) menu.
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
  /** YYYY-MM-DD the exhibit was received and, once finished, issued. */
  receivedDate?: string | null;
  finishedDate?: string | null;
  /** Secondary actions, kept in the "More" menu. */
  more?: CaseFileMenuAction[];
  /** Key facts, opened from the More menu as "Case details". */
  details: CaseFileDetail[];
  /** The documents in the folder, in order; each id matches a CaseStep. */
  sections: CaseFileSectionLink[];
  /** The process history, opened from the More menu. */
  history?: { count: number; content: React.ReactNode };
  /** Shown above the open document, e.g. an error from the last action. */
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
      className="inline-flex h-5 w-5 shrink-0 cursor-pointer items-center justify-center rounded text-slate-400 transition-colors hover:text-slate-700 dark:hover:text-slate-200"
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
      <OutlineButton size="md" icon={MoreHorizontal} aria-label="More actions" aria-haspopup="menu" aria-expanded={open} onClick={() => setOpen((value) => !value)} className="!px-2.5" />
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
              className="flex w-full cursor-pointer items-center gap-2.5 px-3 py-2 text-left text-[13px] text-slate-700 transition-colors hover:bg-slate-500/[0.06] dark:text-slate-200"
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

const STATE_ICON: Record<CaseFileSectionLink['state'], { icon: LucideIcon; className: string; label: string }> = {
  done: { icon: CheckCircle2, className: 'text-emerald-600 dark:text-emerald-400', label: 'Done' },
  current: { icon: CircleDot, className: 'text-amber-500 dark:text-amber-400', label: 'Needs action' },
  pending: { icon: Circle, className: 'text-slate-300 dark:text-slate-600', label: 'Not reached yet' },
};

/** A record (history, case details) in the app's side panel; it is read, not worked on. */
const RecordDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  section: string;
  reference: string;
  icon: LucideIcon;
  title: string;
  subtitle: string;
  footer?: React.ReactNode;
  children: React.ReactNode;
}> = ({ open, onClose, section, reference, icon: Icon, title, subtitle, footer, children }) => {
  const titleId = `case-file-${section.toLowerCase().replace(/\s+/g, '-')}-title`;
  return (
    <SidePanel open={open} onClose={onClose} section={section} recordId={reference} titleId={titleId} footer={footer}>
      <div className="px-4 py-6 sm:px-6">
        <div className="mb-5 flex items-center gap-3">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-slate-500 dark:border-[#2A2A2A] dark:text-[#9A9A9A]">
            <Icon className="h-5 w-5" />
          </span>
          <div className="min-w-0">
            <h2 id={titleId} className={`text-[22px] font-semibold leading-tight ${PANEL_TEXT}`}>{title}</h2>
            <p className={`text-[13px] ${PANEL_TEXT_2}`}>{subtitle}</p>
          </div>
        </div>
        {children}
      </div>
    </SidePanel>
  );
};

export const CaseFileLayout: React.FC<CaseFileLayoutProps> = ({
  back,
  reference,
  status,
  subtitle,
  next,
  receivedDate,
  finishedDate,
  more = [],
  details,
  sections,
  history,
  notice,
  children,
}) => {
  const days = daysInLab(receivedDate, finishedDate);
  const overdue = days !== null && days > DAYS_IN_LAB_WARNING && !next.done;
  const documentIds = sections.map((section) => section.id);
  const known = (id?: string) => !!id && documentIds.includes(id);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);

  // Opens on the document the next step points to, else the first that needs action.
  const [active, setActive] = useState(() =>
    known(next.action?.target) ? next.action!.target : sections.find((section) => section.state === 'current')?.id ?? sections[0]?.id ?? '',
  );
  const idsKey = documentIds.join('|');
  const open = useCallback(
    (id: string) => {
      if (!idsKey.split('|').includes(id)) return;
      setActive(id);
      document.getElementById('main-content')?.scrollTo({ top: 0, behavior: 'smooth' });
    },
    [idsKey],
  );
  useCaseStepOpen(open);

  const activeIndex = documentIds.indexOf(active);
  const step = useCallback(
    (by: 1 | -1) => {
      const ids = idsKey.split('|').filter(Boolean);
      const target = ids[Math.min(ids.length - 1, Math.max(0, ids.indexOf(active) + by))];
      if (target && target !== active) open(target);
    },
    [idsKey, active, open],
  );

  // [ and ] move between documents; Esc goes back when nothing else is open.
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.defaultPrevented || event.metaKey || event.ctrlKey || event.altKey || isTyping(event.target)) return;
      if (document.querySelector('[role="dialog"], [role="alertdialog"], [aria-modal="true"], [role="menu"]')) return;
      if (event.key === ']' || event.key === '[') {
        event.preventDefault();
        step(event.key === ']' ? 1 : -1);
      } else if (event.key === 'Escape') {
        back.onClick();
      }
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [back, step]);

  const nextOnOpenDocument = next.action?.target === active;
  const previousSection = sections[activeIndex - 1];
  const nextSection = sections[activeIndex + 1];
  const current = sections[activeIndex];
  const CurrentIcon = current ? STATE_ICON[current.state].icon : null;
  const shownDetails = details.filter((detail) => detail.value !== null && detail.value !== undefined && detail.value !== '');
  const moreActions: CaseFileMenuAction[] = [
    ...more,
    ...(shownDetails.length ? [{ label: 'Case details', icon: Info, onClick: () => setDetailsOpen(true) }] : []),
    ...(history ? [{ label: `Process history (${history.count})`, icon: History, onClick: () => setHistoryOpen(true) }] : []),
  ];

  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-4">
      <header className="space-y-3">
        <button
          type="button"
          onClick={back.onClick}
          className="-ml-1.5 inline-flex cursor-pointer items-center gap-1.5 rounded-md border border-transparent px-1.5 py-1 text-[13px] text-slate-500 transition-colors hover:border-slate-300 hover:text-slate-900 print:hidden dark:text-slate-400 dark:hover:border-slate-700 dark:hover:text-white"
          title="Back (Esc)"
        >
          <ArrowLeft className="h-4 w-4" /> {back.label}
        </button>

        <div className="flex flex-wrap items-start gap-x-4 gap-y-2">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5">
              <h1 className="flex items-center gap-1 break-all font-mono text-[22px] font-semibold leading-tight tracking-[-0.02em] text-slate-900 dark:text-white">
                {reference}
                <span className="print:hidden"><CopyButton value={reference} label="reference" /></span>
              </h1>
              <StatusText tone={status.tone}>{status.label}</StatusText>
              {days !== null && (
                <span
                  className={`inline-flex items-center gap-1 text-[13px] tabular-nums ${overdue ? 'font-medium text-rose-600 dark:text-rose-400' : days > DAYS_IN_LAB_WARNING - 4 && !next.done ? 'font-medium text-warning-700 dark:text-warning-300' : 'text-slate-500 dark:text-slate-400'}`}
                  title={`Counted from the day the exhibit was received; the target is ${DAYS_IN_LAB_WARNING} days`}
                >
                  <Hourglass className="h-3.5 w-3.5" />
                  {next.done ? `${days} ${days === 1 ? 'day' : 'days'} in lab` : `Day ${days} in lab${overdue ? ' · overdue' : ''}`}
                </span>
              )}
            </div>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[13px] text-slate-500 dark:text-slate-400">
              {subtitle.filter(Boolean).map((item, index) => (
                <React.Fragment key={index}>
                  {index > 0 && <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>}
                  <span>{item}</span>
                </React.Fragment>
              ))}
            </p>
          </div>
          <div className="flex shrink-0 items-center gap-2 print:hidden">
            <MoreMenu actions={moreActions} />
          </div>
        </div>

        {/* Who does what next, in one line, with the button that opens that document. */}
        <div
          className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-lg border px-3.5 py-2 text-[13px] print:hidden ${
            next.done ? 'border-emerald-300/70 text-emerald-900 dark:border-emerald-500/30 dark:text-emerald-100' : 'border-amber-300/70 text-slate-700 dark:border-amber-400/30 dark:text-slate-200'
          }`}
          aria-live="polite"
        >
          <p className="flex min-w-0 flex-1 items-start gap-2">
            {next.done ? <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-600" /> : <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-600 dark:text-amber-400" />}
            <span><span className="font-semibold">{next.done ? 'Complete. ' : 'Next: '}</span>{next.text}</span>
          </p>
          {next.action && !nextOnOpenDocument && (
            <OutlineButton tone={next.done ? 'default' : 'accent'} onClick={() => open(next.action!.target)}>
              {next.action.label}
              <ArrowRight className="h-3.5 w-3.5" />
            </OutlineButton>
          )}
          {!!next.blockers?.length && (
            <p className="flex w-full items-start gap-2 pl-6 text-xs text-slate-600 dark:text-slate-300">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>Still needed first: {next.blockers.join(' ')}</span>
            </p>
          )}
        </div>
      </header>

      {/* Previous / next document, named, with where the open one sits in the file. */}
      <nav aria-label="Move between documents" className="flex items-center gap-2 sm:gap-3 print:hidden">
        <OutlineButton icon={ChevronLeft} onClick={() => step(-1)} disabled={!previousSection} title="Previous document ([)" className="min-w-0">
          <span className="hidden max-w-[12rem] truncate sm:inline">{previousSection?.title ?? 'Previous'}</span>
          <span className="sm:hidden">Back</span>
        </OutlineButton>
        <span className="flex min-w-0 flex-1 items-center justify-center gap-1.5 text-[12px] tabular-nums text-slate-500 sm:flex-none dark:text-slate-400">
          {CurrentIcon && current && <CurrentIcon className={`h-3.5 w-3.5 shrink-0 ${STATE_ICON[current.state].className}`} aria-label={STATE_ICON[current.state].label} />}
          <span className="shrink-0">{activeIndex + 1} of {sections.length}</span>
          <span aria-hidden="true">·</span>
          <span className="truncate font-medium text-slate-800 dark:text-slate-100">{current?.title}</span>
        </span>
        <OutlineButton onClick={() => step(1)} disabled={!nextSection} title="Next document (])" className="min-w-0">
          <span className="hidden max-w-[12rem] truncate sm:inline">{nextSection?.title ?? 'Next'}</span>
          <span className="sm:hidden">Next</span>
          <ChevronRight className="h-4 w-4" />
        </OutlineButton>
      </nav>

      <div className="min-w-0 space-y-3">
        {notice}
        <CaseFolderContext.Provider value={{ active }}>{children}</CaseFolderContext.Provider>
      </div>

      {shownDetails.length > 0 && (
        <RecordDrawer
          open={detailsOpen}
          onClose={() => setDetailsOpen(false)}
          section="Case details"
          reference={reference}
          icon={Info}
          title="Case details"
          subtitle={`Key facts for ${reference}`}
        >
          <dl className="divide-y divide-slate-200 dark:divide-[#2A2A2A]">
            {shownDetails.map((detail) => (
              <div key={detail.label} className="grid grid-cols-[8rem_minmax(0,1fr)] gap-3 py-2.5 text-[13px]">
                <dt className={PANEL_TEXT_2}>{detail.label}</dt>
                <dd className={`flex min-w-0 items-center gap-1 ${PANEL_TEXT} ${detail.mono ? 'font-mono text-[12.5px]' : ''}`}>
                  <span className="min-w-0 break-words">{detail.value}</span>
                  {detail.copy && <CopyButton value={detail.copy} label={detail.label.toLowerCase()} />}
                </dd>
              </div>
            ))}
          </dl>
        </RecordDrawer>
      )}

      {history && (
        <RecordDrawer
          open={historyOpen}
          onClose={() => setHistoryOpen(false)}
          section="Process history"
          reference={reference}
          icon={History}
          title="Process history"
          subtitle={`${history.count} recorded step${history.count === 1 ? '' : 's'} for ${reference}`}
          footer={<p className={`text-[11px] ${PANEL_TEXT_2}`}>Every step is recorded with who did it and when, for the audit trail.</p>}
        >
          {history.content}
        </RecordDrawer>
      )}
    </div>
  );
};
