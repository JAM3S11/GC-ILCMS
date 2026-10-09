import React from 'react';
import { ArrowLeft, ChevronRight, ClipboardList, History, IdCard, Shield, X } from 'lucide-react';
import { OfficerVisitor } from '../../types';
import { departmentLabel } from '../../lib/departments';
import { Avatar, Button, StatusPill } from '../common/Dashboard';
import {
  Drawer,
  DrawerClose,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerNested,
  DrawerTitle,
  DrawerTrigger,
} from '@/components/ui/drawer';
import { useIsMobile } from '@/hooks/use-mobile';
import { VISITOR_STATUS } from './visitorStatus';
import { formatDay, formatDuration } from './visitorTime';
import {
  VisitorActions,
  VisitorAlert,
  VisitorEditPrompt,
  VisitorIdentification,
  VisitorJourney,
  VisitorNextStep,
  VisitorNextStepButtons,
  VisitorPurpose,
  VisitorRecord,
  VisitorVisitDetails,
} from './VisitorRecord';

/* ---------------------------------------------------------------------------
 * VisitorDrawer — a Visitor Register entry as a stack of drawers.
 *
 *   1. The entry: alerts, journey, next step, visit details, and links to
 *   2. stacked drawers for identification, purpose & items, and visit history,
 *      from which
 *   3. any earlier visit opens on top as its own full entry.
 *
 * Every level opens from the same edge (right on desktop, bottom with a swipe
 * handle on phones); the drawers behind stay mounted and step back.
 * --------------------------------------------------------------------------- */

export interface VisitorEntry {
  visitor: OfficerVisitor;
  minutes: number | null;
  longWait: boolean;
  overnight: boolean;
}

interface VisitorDrawerProps extends VisitorActions {
  entry: VisitorEntry | null;
  /** Every loaded visit, to find this visitor's earlier visits. */
  allEntries: VisitorEntry[];
  onClose: () => void;
  currentUserName: string;
}

const sameVisitor = (a: OfficerVisitor, b: OfficerVisitor) =>
  a.officerName.trim().toLowerCase() === b.officerName.trim().toLowerCase() &&
  ((!!a.phone && a.phone === b.phone) || (!!a.nationalId && a.nationalId === b.nationalId));

export const VisitorDrawer: React.FC<VisitorDrawerProps> = ({ entry, allEntries, onClose, currentUserName, ...actions }) => {
  const isMobile = useIsMobile();
  const direction = isMobile ? 'bottom' : 'right';

  const visitor = entry?.visitor;
  const history = visitor
    ? allEntries
        .filter((other) => other.visitor.id !== visitor.id && sameVisitor(other.visitor, visitor))
        .sort((a, b) => `${b.visitor.date}${b.visitor.timeIn}`.localeCompare(`${a.visitor.date}${a.visitor.timeIn}`))
    : [];

  return (
    <Drawer open={!!entry} onOpenChange={(open) => !open && onClose()} direction={direction}>
      <StackContent isMobile={isMobile}>
        {entry && visitor && (
          <>
            <EntryHeader eyebrow="Visitor register entry" visitor={visitor} />
            <div className="scroll-fade min-h-0 flex-1 overflow-y-auto">
              <VisitorAlert visitor={visitor} minutes={entry.minutes} longWait={entry.longWait} overnight={entry.overnight} />
              <VisitorJourney visitor={visitor} />
              <VisitorNextStep {...actions} visitor={visitor} />
              <VisitorEditPrompt visitor={visitor} onEditClientDetails={actions.onEditClientDetails} />
              <VisitorVisitDetails visitor={visitor} minutes={entry.minutes} />

              {/* More about this visit: each opens a drawer stacked on top */}
              <nav aria-label="More about this visit" className="p-3">
                <div className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">More about this visit</div>
                <ul className="space-y-1">
                  <li>
                    <NestedSection
                      direction={direction}
                      isMobile={isMobile}
                      icon={IdCard}
                      label="Identification & contact"
                      hint="National ID, phone, badge and station"
                      visitor={visitor}
                    >
                      <VisitorIdentification visitor={visitor} onRevealNationalId={actions.onRevealNationalId} />
                    </NestedSection>
                  </li>
                  <li>
                    <NestedSection
                      direction={direction}
                      isMobile={isMobile}
                      icon={ClipboardList}
                      label="Purpose, documents & exhibits"
                      hint="Why they came and what they brought"
                      visitor={visitor}
                    >
                      <VisitorPurpose visitor={visitor} />
                    </NestedSection>
                  </li>
                  <li>
                    <NestedSection
                      direction={direction}
                      isMobile={isMobile}
                      icon={History}
                      label="Visit history"
                      hint={history.length ? `${history.length} earlier visit${history.length === 1 ? '' : 's'} on record` : 'No earlier visits on record'}
                      visitor={visitor}
                      count={history.length}
                    >
                      <VisitHistory history={history} direction={direction} isMobile={isMobile} actions={actions} />
                    </NestedSection>
                  </li>
                </ul>
              </nav>
            </div>

            <DrawerFooter className="border-t border-slate-200 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/40">
              <VisitorNextStepButtons {...actions} visitor={visitor} fullWidth onDone={onClose} />
              <DrawerClose asChild>
                <Button className="w-full">Close</Button>
              </DrawerClose>
              <p className="text-center text-[11px] text-slate-500 dark:text-slate-400">Viewing as {currentUserName}</p>
            </DrawerFooter>
          </>
        )}
      </StackContent>
    </Drawer>
  );
};

/* ------------------------------------------------------------------------- */

/** One drawer panel: right-side on desktop, bottom sheet (with swipe handle) on phones. */
const StackContent: React.FC<{ isMobile: boolean; children: React.ReactNode }> = ({ isMobile, children }) => (
  <DrawerContent
    className={
      isMobile
        ? 'max-h-[92dvh] bg-white dark:bg-slate-900'
        : 'bg-white data-[vaul-drawer-direction=right]:w-full data-[vaul-drawer-direction=right]:sm:max-w-xl dark:border-slate-800 dark:bg-slate-900'
    }
  >
    {children}
  </DrawerContent>
);

/** Name, status and visit line, with a close (or back, for stacked drawers) button. */
const EntryHeader: React.FC<{ eyebrow: string; visitor: OfficerVisitor; title?: string; back?: boolean }> = ({ eyebrow, visitor, title, back }) => {
  const status = VISITOR_STATUS[visitor.status];
  return (
    <DrawerHeader className="border-b border-slate-200 px-5 py-4 text-left dark:border-slate-800">
      <div className="flex items-start gap-3">
        {back ? (
          <DrawerClose asChild>
            <button
              type="button"
              aria-label="Back"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:border-slate-700 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
            </button>
          </DrawerClose>
        ) : (
          <Avatar name={visitor.officerName} size="lg" tone={status.tone} />
        )}
        <div className="min-w-0 flex-1 text-left">
          <div className="text-[10px] font-semibold uppercase tracking-[0.12em] text-slate-500 dark:text-slate-400">{eyebrow}</div>
          <DrawerTitle className="mt-0.5 flex flex-wrap items-center gap-2 text-base text-slate-900 dark:text-white">
            {title ?? visitor.officerName}
            {!title && (
              <>
                <StatusPill tone={status.tone} pulse={visitor.status !== 'Departed'}>{status.label}</StatusPill>
                {visitor.visitorType === 'POLICE_OFFICER' && (
                  <StatusPill tone="sky" dot={false}>
                    <Shield className="h-3 w-3" /> Police
                  </StatusPill>
                )}
              </>
            )}
          </DrawerTitle>
          <DrawerDescription className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
            {title ? `${visitor.officerName} · ` : ''}
            <span className="font-mono">{visitor.visitNumber}</span> · {formatDay(visitor.date, 'short')} · {departmentLabel(visitor.laboratory)}
          </DrawerDescription>
        </div>
        {!back && (
          <DrawerClose asChild>
            <button
              type="button"
              aria-label="Close"
              className="flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center rounded-lg text-slate-500 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </DrawerClose>
        )}
      </div>
    </DrawerHeader>
  );
};

/** A row that opens a drawer stacked on top of the current one. */
const NestedSection: React.FC<{
  direction: 'right' | 'bottom';
  isMobile: boolean;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  visitor: OfficerVisitor;
  count?: number;
  children: React.ReactNode;
}> = ({ direction, isMobile, icon: Icon, label, hint, visitor, count, children }) => (
  <DrawerNested direction={direction}>
    <DrawerTrigger asChild>
      <button
        type="button"
        className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/50"
      >
        <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-300">
          <Icon className="h-4 w-4" />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block text-[13px] font-medium text-slate-900 dark:text-white">{label}</span>
          <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">{hint}</span>
        </span>
        {count !== undefined && count > 0 && (
          <span className="rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold tabular-nums text-slate-700 dark:bg-slate-800 dark:text-slate-200">{count}</span>
        )}
        <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
      </button>
    </DrawerTrigger>
    <StackContent isMobile={isMobile}>
      <EntryHeader eyebrow="Visitor register entry" title={label} visitor={visitor} back />
      <div className="scroll-fade min-h-0 flex-1 overflow-y-auto">{children}</div>
      <DrawerFooter className="border-t border-slate-200 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/40">
        <DrawerClose asChild>
          <Button className="w-full" icon={ArrowLeft}>
            Back to entry
          </Button>
        </DrawerClose>
      </DrawerFooter>
    </StackContent>
  </DrawerNested>
);

/** Earlier visits by the same person; each opens its full entry on top. */
const VisitHistory: React.FC<{
  history: VisitorEntry[];
  direction: 'right' | 'bottom';
  isMobile: boolean;
  actions: VisitorActions;
}> = ({ history, direction, isMobile, actions }) =>
  history.length === 0 ? (
    <p className="p-6 text-center text-xs text-slate-500 dark:text-slate-400">
      No earlier visits by this person in the loaded records. Load older records in the register to search further back.
    </p>
  ) : (
    <ol className="space-y-1.5 p-3">
      {history.map((past) => {
        const status = VISITOR_STATUS[past.visitor.status];
        return (
          <li key={past.visitor.id}>
            <DrawerNested direction={direction}>
              <DrawerTrigger asChild>
                <button
                  type="button"
                  className="flex w-full cursor-pointer items-center gap-3 rounded-lg border border-slate-200 px-3 py-2.5 text-left transition-colors hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800 dark:hover:border-slate-700 dark:hover:bg-slate-800/50"
                >
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className="text-[13px] font-medium text-slate-900 dark:text-white">{formatDay(past.visitor.date, 'short')}</span>
                      <span className="font-mono text-[11px] text-slate-500 dark:text-slate-400">{past.visitor.visitNumber}</span>
                    </span>
                    <span className="block truncate text-[11px] text-slate-500 dark:text-slate-400">
                      {departmentLabel(past.visitor.laboratory)} · {past.visitor.timeIn}
                      {past.visitor.timeOut ? `–${past.visitor.timeOut}` : ''}
                      {past.minutes !== null ? ` · ${formatDuration(past.minutes)}` : ''}
                    </span>
                    <span className="block truncate text-[11px] text-slate-600 dark:text-slate-300">{past.visitor.purposeOfVisit || '—'}</span>
                  </span>
                  <StatusPill tone={status.tone}>{status.label}</StatusPill>
                  <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
                </button>
              </DrawerTrigger>
              <StackContent isMobile={isMobile}>
                <EntryHeader eyebrow="Earlier visit" visitor={past.visitor} back />
                <div className="scroll-fade min-h-0 flex-1 overflow-y-auto">
                  <VisitorRecord {...actions} layout="drawer" visitor={past.visitor} minutes={past.minutes} longWait={past.longWait} overnight={past.overnight} />
                </div>
                <DrawerFooter className="border-t border-slate-200 bg-slate-50/70 px-5 py-4 dark:border-slate-800 dark:bg-slate-950/40">
                  <DrawerClose asChild>
                    <Button className="w-full" icon={ArrowLeft}>
                      Back to visit history
                    </Button>
                  </DrawerClose>
                </DrawerFooter>
              </StackContent>
            </DrawerNested>
          </li>
        );
      })}
    </ol>
  );
