import React, { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { AnimatePresence, motion, type Transition } from 'motion/react';
import { Menu, MenuButton, MenuItems, MenuSeparator } from '@headlessui/react';
import { ArrowLeft, ChevronDown, ChevronUp, Maximize2, Minimize2, MoreHorizontal, X } from 'lucide-react';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

/* ---------------------------------------------------------------------------
 * SidePanel: the app's one drawer. It slides in from the right over the page
 * (full screen on phones) and expands in place into a centred modal (Shift+E).
 * The same element morphs between the two, so scroll position and unsaved
 * edits survive. Panels can stack: a panel opened from another sits on top
 * with a back arrow, and only the top one answers Esc.
 *
 * Colours follow the app theme; dark mode uses the drawer palette (#1C1C1C
 * surface, #2A2A2A lines, #EDEDED / #9A9A9A / #6B6B6B text, #242424 hover,
 * #3A2622 danger). Accents follow the colour chosen in Settings.
 * --------------------------------------------------------------------------- */

const MORPH: Transition = { duration: 0.28, ease: [0.2, 0.8, 0.2, 1] };

export const PANEL_TEXT = 'text-slate-900 dark:text-[#EDEDED]';
export const PANEL_TEXT_2 = 'text-slate-500 dark:text-[#9A9A9A]';
export const PANEL_TEXT_3 = 'text-slate-400 dark:text-[#6B6B6B]';
export const PANEL_LINE = 'border-slate-200 dark:border-[#2A2A2A]';

// Panels open at once share one scroll lock on the page behind.
let openPanels = 0;
let savedOverflow = '';

/** 32×32 icon button with a tooltip, for panel headers. */
export const PanelIconButton: React.FC<{
  label: string;
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}> = ({ label, onClick, disabled, children }) => (
  <Tooltip>
    <TooltipTrigger asChild>
      <button
        type="button"
        aria-label={label}
        onClick={onClick}
        disabled={disabled}
        className={`flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-md ${PANEL_TEXT_2} transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50 disabled:cursor-not-allowed disabled:opacity-30 dark:hover:bg-[#2A2A2A] dark:hover:text-[#EDEDED] [&>svg]:h-[18px] [&>svg]:w-[18px]`}
      >
        {children}
      </button>
    </TooltipTrigger>
    <TooltipContent side="bottom" sideOffset={6}>{label}</TooltipContent>
  </Tooltip>
);

/** A labelled ghost button for the panel header's main action (e.g. "Resend invitation"). */
export const PanelHeaderButton: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick: () => void;
  disabled?: boolean;
}> = ({ icon: Icon, label, onClick, disabled }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={disabled}
    className={`hidden h-8 cursor-pointer items-center gap-1.5 rounded-md px-2.5 text-[13px] font-medium ${PANEL_TEXT_2} transition-colors hover:bg-slate-100 hover:text-slate-900 disabled:opacity-40 sm:inline-flex dark:hover:bg-[#2A2A2A] dark:hover:text-[#EDEDED]`}
  >
    <Icon className="h-4 w-4" />
    {label}
  </button>
);

const menuItemBase =
  'flex w-full cursor-pointer items-center gap-2.5 rounded-md px-2.5 py-1.5 text-left text-[13px] data-[disabled]:cursor-not-allowed data-[disabled]:opacity-40';
export const panelMenuItemClass = `${menuItemBase} text-slate-700 data-[focus]:bg-slate-100 dark:text-[#EDEDED] dark:data-[focus]:bg-[#2A2A2A]`;
export const panelDangerItemClass = `${menuItemBase} text-rose-600 data-[focus]:bg-rose-50 dark:text-[#F2725A] dark:data-[focus]:bg-[#3A2622]`;
export const PanelMenuSeparator: React.FC = () => <MenuSeparator className="my-1 h-px bg-slate-100 dark:bg-[#2A2A2A]" />;

/** The header's "More" (⋯) menu. Children are headless-ui MenuItems styled with panelMenuItemClass. */
export const PanelMoreMenu: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <Menu>
    <MenuButton
      aria-label="More actions"
      className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-md ${PANEL_TEXT_2} transition-colors hover:bg-slate-100 hover:text-slate-900 focus:outline-none data-[focus]:ring-2 data-[focus]:ring-amber-500/50 data-[open]:bg-slate-100 dark:hover:bg-[#2A2A2A] dark:hover:text-[#EDEDED] dark:data-[open]:bg-[#2A2A2A]`}
    >
      <MoreHorizontal className="h-[18px] w-[18px]" />
    </MenuButton>
    <MenuItems
      anchor={{ to: 'bottom end', gap: 4 }}
      transition
      className="z-[80] w-56 rounded-xl border border-slate-200 bg-white p-1 font-sans shadow-xl shadow-slate-900/10 transition duration-100 ease-out focus:outline-none data-[closed]:scale-95 data-[closed]:opacity-0 dark:border-[#2A2A2A] dark:bg-[#1C1C1C]"
    >
      {children}
    </MenuItems>
  </Menu>
);

/** One property row: 130px label column (icon + text), then the value, which may be clickable. */
export const PanelProperty: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  onClick?: () => void;
  hint?: string;
  children: React.ReactNode;
}> = ({ icon: Icon, label, onClick, hint, children }) => {
  const value = <span className="flex min-w-0 items-center gap-2 truncate">{children}</span>;
  return (
    <div className="grid min-h-9 grid-cols-[130px_minmax(0,1fr)] items-center rounded-md px-2 text-[13px] transition-colors hover:bg-slate-50 dark:hover:bg-[#242424]">
      <span className={`flex items-center gap-2 ${PANEL_TEXT_2}`}>
        <Icon className="h-4 w-4 shrink-0" />
        {label}
      </span>
      {onClick ? (
        <button
          type="button"
          onClick={onClick}
          title={hint}
          className={`flex min-w-0 cursor-pointer items-center gap-2 rounded px-1 py-1.5 text-left ${PANEL_TEXT} hover:underline focus:outline-none focus-visible:ring-2 focus-visible:ring-amber-500/50`}
        >
          {value}
        </button>
      ) : (
        <span className={`flex min-w-0 items-center gap-2 px-1 py-1.5 ${PANEL_TEXT}`}>{value}</span>
      )}
    </div>
  );
};

/** A list of PanelProperty rows. */
export const PanelProperties: React.FC<{ children: React.ReactNode }> = ({ children }) => (
  <div className="-mx-2 space-y-px">{children}</div>
);

/** Section heading inside a panel body: 15px semibold, optional count and action. */
export const PanelSectionHeading: React.FC<{ id?: string; title: React.ReactNode; count?: React.ReactNode; action?: React.ReactNode }> = ({ id, title, count, action }) => (
  <div className="mb-3 flex items-center justify-between gap-3">
    <h3 id={id} className={`flex items-baseline gap-2 text-[15px] font-semibold ${PANEL_TEXT}`}>
      {title}
      {count !== undefined && <span className={`text-[13px] font-normal ${PANEL_TEXT_2}`}>{count}</span>}
    </h3>
    {action}
  </div>
);

/** Full-width notice: danger (red), attention (accent) or info (sky). */
export const PanelBanner: React.FC<{
  tone: 'danger' | 'attention' | 'info';
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
  action?: React.ReactNode;
}> = ({ tone, icon: Icon, children, action }) => (
  <div
    role={tone === 'danger' ? 'alert' : 'status'}
    className={`flex flex-wrap items-center gap-x-2 gap-y-1 rounded-lg px-4 py-3 text-[13px] ${PANEL_TEXT} ${
      tone === 'danger' ? 'bg-rose-50 dark:bg-[#3A2622]' : tone === 'attention' ? 'bg-amber-50 dark:bg-amber-500/10' : 'bg-sky-50 dark:bg-sky-500/10'
    }`}
  >
    <Icon className={`h-4 w-4 shrink-0 ${tone === 'danger' ? 'text-rose-600 dark:text-[#F2725A]' : tone === 'attention' ? 'text-amber-700 dark:text-amber-400' : 'text-sky-600 dark:text-sky-400'}`} />
    <span className="min-w-0 flex-1">{children}</span>
    {action}
  </div>
);

export const PanelInlineLink: React.FC<{ onClick: () => void; children: React.ReactNode }> = ({ onClick, children }) => (
  <button type="button" onClick={onClick} className="cursor-pointer font-medium text-amber-700 hover:underline dark:text-amber-400">
    {children}
  </button>
);

export interface SidePanelProps {
  open: boolean;
  /** Closes the panel (and, for a stacked panel, the whole stack). */
  onClose: () => void;
  /** Breadcrumb: section name, then an optional record reference shown in mono. */
  section: string;
  recordId?: React.ReactNode;
  /** id of the element that names the panel, for aria-labelledby. */
  titleId: string;
  /** Extra header controls, placed before expand and close (main action, copy, More menu). */
  actions?: React.ReactNode;
  /** Allow expanding into a centred modal. On by default. */
  expandable?: boolean;
  /** Previous / next record, offered in the expanded header. */
  onPrevious?: () => void;
  onNext?: () => void;
  position?: { index: number; total: number };
  /** A stacked panel shows a back arrow that returns to the panel below. */
  onBack?: () => void;
  backLabel?: string;
  /** How deep in a stack this panel is (0 = bottom). Higher panels sit on top. */
  level?: number;
  /** Only the top panel of a stack answers Esc and Shift+E. */
  active?: boolean;
  /** The body; a function receives whether the panel is expanded. */
  children: React.ReactNode | ((state: { expanded: boolean }) => React.ReactNode);
  /** Shown as a right-hand column when expanded (e.g. properties). */
  aside?: React.ReactNode;
  asideLabel?: string;
  /** Pinned under the body (e.g. form buttons). */
  footer?: React.ReactNode;
  /** Makes the panel a form; the footer's submit button submits it. */
  onSubmit?: (event: React.FormEvent<HTMLFormElement>) => void;
  /** A short message shown at the bottom of the panel (e.g. "Email copied"). */
  toast?: string;
  /** Resets the body scroll when this changes (e.g. moving to another record). */
  scrollKey?: string;
}

export const SidePanel: React.FC<SidePanelProps> = ({
  open,
  onClose,
  section,
  recordId,
  titleId,
  actions,
  expandable = true,
  onPrevious,
  onNext,
  position,
  onBack,
  backLabel = 'Back',
  level = 0,
  active = true,
  children,
  aside,
  asideLabel = 'Properties',
  footer,
  onSubmit,
  toast,
  scrollKey,
}) => {
  const [expanded, setExpanded] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const bodyRef = useRef<HTMLDivElement>(null);
  const returnFocus = useRef<HTMLElement | null>(null);

  useEffect(() => { bodyRef.current?.scrollTo({ top: 0 }); }, [scrollKey]);

  // Remember where focus was, move it into the panel, give it back on close; the page behind does not scroll.
  useEffect(() => {
    if (!open) return;
    returnFocus.current = document.activeElement as HTMLElement | null;
    if (openPanels++ === 0) {
      savedOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
    }
    const focusId = window.setTimeout(() => panelRef.current?.focus(), 0);
    return () => {
      window.clearTimeout(focusId);
      if (--openPanels === 0) document.body.style.overflow = savedOverflow;
      returnFocus.current?.focus?.();
      setExpanded(false);
    };
  }, [open]);

  // Esc closes (or goes back, in a stack); Shift+E expands or collapses, not while typing.
  useEffect(() => {
    if (!open || !active) return;
    const onKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      const typing = !!target && (target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName));
      if (event.key === 'Escape' && !event.defaultPrevented) {
        // An open menu or list box closes first.
        if (document.querySelector('[role="menu"], [role="listbox"]')) return;
        (onBack ?? onClose)();
      } else if (expandable && event.shiftKey && event.key.toLowerCase() === 'e' && !typing) {
        event.preventDefault();
        setExpanded((value) => !value);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, active, expandable, onBack, onClose]);

  if (typeof document === 'undefined') return null;

  const body = typeof children === 'function' ? children({ expanded }) : children;
  const showAside = expanded && !!aside;
  const stacked = level > 0;

  const inner = (
    <>
      {/* Header: fixed while the body scrolls */}
      <header className={`flex h-14 shrink-0 items-center gap-3 border-b px-4 sm:px-6 ${PANEL_LINE}`}>
        <div className="flex min-w-0 flex-1 items-center gap-2 text-sm">
          {onBack && <PanelIconButton label={backLabel} onClick={onBack}><ArrowLeft /></PanelIconButton>}
          <span className="h-2 w-2 shrink-0 rounded-full bg-amber-500" aria-hidden="true" />
          {expanded ? (
            <button type="button" onClick={onBack ?? onClose} className={`cursor-pointer truncate font-medium ${PANEL_TEXT} hover:underline`}>{section}</button>
          ) : (
            <span className={`truncate font-medium ${PANEL_TEXT}`}>{section}</span>
          )}
          {recordId && (
            <>
              <span className={PANEL_TEXT_3} aria-hidden="true">/</span>
              <span className={`truncate font-mono text-xs ${PANEL_TEXT_2}`}>{recordId}</span>
            </>
          )}
          {expanded && (onPrevious || onNext) && (
            <span className="ml-1 hidden items-center sm:flex">
              <PanelIconButton label="Previous" onClick={() => onPrevious?.()} disabled={!onPrevious}><ChevronUp /></PanelIconButton>
              <PanelIconButton label="Next" onClick={() => onNext?.()} disabled={!onNext}><ChevronDown /></PanelIconButton>
              {position && <span className={`ml-1 text-xs tabular-nums ${PANEL_TEXT_3}`}>{position.index + 1} of {position.total}</span>}
            </span>
          )}
        </div>
        <div className="flex shrink-0 items-center gap-1 sm:gap-2">
          {actions}
          {expandable && (
            <PanelIconButton label={expanded ? 'Collapse to side panel' : 'Expand (Shift+E)'} onClick={() => setExpanded((value) => !value)}>
              {expanded ? <Minimize2 /> : <Maximize2 />}
            </PanelIconButton>
          )}
          <PanelIconButton label="Close (Esc)" onClick={onClose}><X /></PanelIconButton>
        </div>
      </header>

      {/* Body: scrolls on its own. Expanded, the aside becomes a right-hand column. */}
      <div
        ref={bodyRef}
        className={`min-h-0 flex-1 overflow-y-auto [scrollbar-color:rgb(148_163_184/0.35)_transparent] [scrollbar-width:thin] ${
          showAside ? 'grid grid-cols-1 md:grid-cols-[minmax(0,1fr)_340px]' : ''
        }`}
      >
        <div className="min-w-0">{body}</div>
        {showAside && (
          <aside aria-label={asideLabel} className={`min-w-0 border-t px-4 py-6 md:border-l md:border-t-0 md:bg-slate-50/60 md:dark:bg-[#181818] ${PANEL_LINE}`}>
            <h3 className={`mb-3 px-1 text-[11px] font-semibold uppercase tracking-wider ${PANEL_TEXT_2}`}>{asideLabel}</h3>
            {aside}
          </aside>
        )}
      </div>

      {footer && (
        <footer className={`shrink-0 border-t bg-slate-50/70 px-4 py-3 sm:px-6 dark:bg-[#181818] ${PANEL_LINE}`}>{footer}</footer>
      )}

      <div aria-live="polite" className="pointer-events-none absolute inset-x-0 bottom-5 flex justify-center">
        <AnimatePresence>
          {toast && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.15 }}
              className="rounded-lg bg-slate-900 px-3 py-2 text-xs font-medium text-white shadow-lg dark:bg-[#EDEDED] dark:text-[#1C1C1C]"
            >
              {toast}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </>
  );

  return createPortal(
    <TooltipProvider delayDuration={300}>
      <AnimatePresence>
        {open && (
          <div key="side-panel" className="fixed inset-0 font-sans print:hidden" style={{ zIndex: 50 + level * 2 }}>
            {/* The page behind stays visible, dimmed; darker (and blurred) when expanded. A stacked panel dims less. */}
            <motion.div
              aria-hidden="true"
              className="absolute inset-0"
              initial={{ opacity: 0, backgroundColor: 'rgba(0,0,0,0.25)', backdropFilter: 'blur(0px)' }}
              animate={{
                opacity: 1,
                backgroundColor: expanded ? 'rgba(0,0,0,0.6)' : stacked ? 'rgba(0,0,0,0.12)' : 'rgba(0,0,0,0.25)',
                backdropFilter: expanded ? 'blur(4px)' : 'blur(0px)',
              }}
              exit={{ opacity: 0, transition: { duration: 0.18 } }}
              transition={MORPH}
              onClick={onBack ?? onClose}
            />
            <div className={`pointer-events-none absolute inset-0 flex ${expanded ? 'items-center justify-center p-4' : 'justify-end'}`}>
              <motion.div
                ref={panelRef}
                layout
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                tabIndex={-1}
                // The panel takes focus on open so keys reach it; it is a container, so no focus ring
                // (the global :focus-visible rule is unlayered and would win over a utility class).
                style={{ outline: 'none' }}
                initial={{ x: 64, opacity: 0, borderRadius: 0 }}
                animate={{ x: 0, opacity: 1, borderRadius: expanded ? 12 : 0 }}
                exit={{ x: 64, opacity: 0, transition: { duration: 0.18, ease: 'easeIn' } }}
                transition={{ layout: MORPH, borderRadius: MORPH, x: { duration: 0.22, ease: 'easeOut' }, opacity: { duration: 0.22, ease: 'easeOut' } }}
                className={`pointer-events-auto relative flex flex-col overflow-hidden border bg-white outline-none focus:outline-none focus-visible:outline-none ${PANEL_LINE} dark:bg-[#1C1C1C] ${
                  expanded
                    ? 'h-[min(860px,90vh)] w-[min(1100px,92vw)] shadow-[0_32px_80px_-24px_rgba(0,0,0,0.55)]'
                    : 'h-dvh w-full border-y-0 border-r-0 shadow-[-24px_0_48px_-28px_rgba(0,0,0,0.45)] md:w-[clamp(560px,45vw,720px)]'
                }`}
              >
                {onSubmit ? <form onSubmit={onSubmit} className="flex min-h-0 flex-1 flex-col">{inner}</form> : inner}
              </motion.div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </TooltipProvider>,
    document.body,
  );
};
