import React, { useEffect, useState } from 'react';
import { ArrowLeft, ChevronRight, ClipboardList, History, IdCard, Shield } from 'lucide-react';
import { OfficerVisitor } from '../../types';
import { departmentLabel } from '../../lib/departments';
import { Avatar, Button, StatusPill } from '../common/Dashboard';
import { PANEL_LINE, PANEL_TEXT, PANEL_TEXT_2, SidePanel } from '../common/SidePanel';
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
 * VisitorDrawer: a Visitor Register entry as a stack of side panels.
 *
 *   1. The entry: alerts, journey, next step, visit details, and links to
 *   2. panels stacked on top for identification, purpose & items, and visit
 *      history, from which
 *   3. any earlier visit opens on top as its own full entry.
 *
 * Every level is the app's side panel; the ones behind stay open, and the back
 * arrow (or Esc) steps down one level while the close button closes them all.
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

type SectionId = 'identification' | 'purpose' | 'history';
type Layer = { kind: 'section'; section: SectionId } | { kind: 'visit'; entry: VisitorEntry };

const SECTION_LABEL: Record<SectionId, string> = {
  identification: 'Identification & contact',
  purpose: 'Purpose, documents & exhibits',
  history: 'Visit history',
};

const sameVisitor = (a: OfficerVisitor, b: OfficerVisitor) =>
  a.officerName.trim().toLowerCase() === b.officerName.trim().toLowerCase() &&
  ((!!a.phone && a.phone === b.phone) || (!!a.nationalId && a.nationalId === b.nationalId));

export const VisitorDrawer: React.FC<VisitorDrawerProps> = ({ entry, allEntries, onClose, currentUserName, ...actions }) => {
  // Layers above the entry. `depth` is how many are open; the closed ones stay so their panel can animate away.
  const [layers, setLayers] = useState<Layer[]>([]);
  const [depth, setDepth] = useState(0);

  const visitor = entry?.visitor;
  useEffect(() => {
    setLayers([]);
    setDepth(0);
  }, [visitor?.id]);

  const history = visitor
    ? allEntries
        .filter((other) => other.visitor.id !== visitor.id && sameVisitor(other.visitor, visitor))
        .sort((a, b) => `${b.visitor.date}${b.visitor.timeIn}`.localeCompare(`${a.visitor.date}${a.visitor.timeIn}`))
    : [];

  const push = (layer: Layer) => {
    setLayers((previous) => [...previous.slice(0, depth), layer]);
    setDepth((value) => value + 1);
  };
  const back = () => setDepth((value) => Math.max(0, value - 1));
  const closeAll = () => {
    setDepth(0);
    onClose();
  };

  return (
    <>
      <SidePanel
        open={!!entry}
        onClose={closeAll}
        section="Visitor register"
        recordId={visitor?.visitNumber}
        titleId="visitor-entry-title"
        active={depth === 0}
        scrollKey={visitor?.id}
        footer={visitor && (
          <div className="space-y-2">
            <VisitorNextStepButtons {...actions} visitor={visitor} fullWidth onDone={closeAll} />
            <div className="flex items-center justify-between gap-2">
              <p className={`text-[11px] ${PANEL_TEXT_2}`}>Viewing as {currentUserName}</p>
              <Button variant="ghost" onClick={closeAll}>Close</Button>
            </div>
          </div>
        )}
      >
        {entry && visitor && (
          <>
            <EntryTitle id="visitor-entry-title" visitor={visitor} />
            <VisitorAlert visitor={visitor} minutes={entry.minutes} longWait={entry.longWait} overnight={entry.overnight} />
            <VisitorJourney visitor={visitor} />
            <VisitorNextStep {...actions} visitor={visitor} />
            <VisitorEditPrompt visitor={visitor} onEditClientDetails={actions.onEditClientDetails} />
            <VisitorVisitDetails visitor={visitor} minutes={entry.minutes} />

            {/* More about this visit: each opens a panel stacked on top */}
            <nav aria-label="More about this visit" className="px-4 pb-6 pt-3 sm:px-6">
              <h3 className={`mb-2 text-[15px] font-semibold ${PANEL_TEXT}`}>More about this visit</h3>
              <ul className="space-y-1.5">
                <li>
                  <StackRow icon={IdCard} label={SECTION_LABEL.identification} hint="National ID, phone, badge and station" onOpen={() => push({ kind: 'section', section: 'identification' })} />
                </li>
                <li>
                  <StackRow icon={ClipboardList} label={SECTION_LABEL.purpose} hint="Why they came and what they brought" onOpen={() => push({ kind: 'section', section: 'purpose' })} />
                </li>
                <li>
                  <StackRow
                    icon={History}
                    label={SECTION_LABEL.history}
                    hint={history.length ? `${history.length} earlier visit${history.length === 1 ? '' : 's'} on record` : 'No earlier visits on record'}
                    count={history.length}
                    onOpen={() => push({ kind: 'section', section: 'history' })}
                  />
                </li>
              </ul>
            </nav>
          </>
        )}
      </SidePanel>

      {visitor && layers.map((layer, index) => {
        const level = index + 1;
        const below = index === 0 ? 'entry' : layers[index - 1].kind === 'section' ? 'visit history' : 'visit';
        const titleId = `visitor-layer-${level}`;
        const layerVisitor = layer.kind === 'visit' ? layer.entry.visitor : visitor;
        return (
          <SidePanel
            key={`${level}-${layer.kind === 'visit' ? layer.entry.visitor.id : layer.section}`}
            open={!!entry && index < depth}
            level={level}
            active={index === depth - 1}
            onBack={back}
            backLabel={`Back to ${below}`}
            onClose={closeAll}
            section={layer.kind === 'visit' ? 'Earlier visit' : SECTION_LABEL[layer.section]}
            recordId={layerVisitor.visitNumber}
            titleId={titleId}
            footer={
              <Button className="w-full" icon={ArrowLeft} onClick={back}>
                Back to {below}
              </Button>
            }
          >
            {layer.kind === 'visit' ? (
              <>
                <EntryTitle id={titleId} visitor={layer.entry.visitor} />
                <VisitorRecord {...actions} layout="drawer" visitor={layer.entry.visitor} minutes={layer.entry.minutes} longWait={layer.entry.longWait} overnight={layer.entry.overnight} />
              </>
            ) : (
              <>
                <EntryTitle id={titleId} visitor={visitor} title={SECTION_LABEL[layer.section]} />
                {layer.section === 'identification' && <VisitorIdentification visitor={visitor} onRevealNationalId={actions.onRevealNationalId} />}
                {layer.section === 'purpose' && <VisitorPurpose visitor={visitor} />}
                {layer.section === 'history' && <VisitHistory history={history} onOpen={(past) => push({ kind: 'visit', entry: past })} />}
              </>
            )}
          </SidePanel>
        );
      })}
    </>
  );
};

/* ------------------------------------------------------------------------- */

/** The panel's title block: the visitor (or the section being shown), status and visit line. */
const EntryTitle: React.FC<{ id: string; visitor: OfficerVisitor; title?: string }> = ({ id, visitor, title }) => {
  const status = VISITOR_STATUS[visitor.status];
  return (
    <div className="flex items-center gap-3 px-4 pb-2 pt-6 sm:px-6">
      <Avatar name={visitor.officerName} size="lg" tone={status.tone} />
      <div className="min-w-0 flex-1">
        <h2 id={id} className={`flex flex-wrap items-center gap-2 text-[22px] font-semibold leading-tight ${PANEL_TEXT}`}>
          <span className="truncate">{title ?? visitor.officerName}</span>
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
        </h2>
        <p className={`mt-0.5 truncate text-[13px] ${PANEL_TEXT_2}`}>
          {title ? `${visitor.officerName} · ` : ''}
          {formatDay(visitor.date, 'short')} · {departmentLabel(visitor.laboratory)}
        </p>
      </div>
    </div>
  );
};

/** A row that opens a panel stacked on top of the current one. */
const StackRow: React.FC<{
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  hint: string;
  count?: number;
  onOpen: () => void;
}> = ({ icon: Icon, label, hint, count, onOpen }) => (
  <button
    type="button"
    onClick={onOpen}
    className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-[#242424] ${PANEL_LINE}`}
  >
    <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-600 dark:bg-[#2A2A2A] dark:text-[#9A9A9A]">
      <Icon className="h-4 w-4" />
    </span>
    <span className="min-w-0 flex-1">
      <span className={`block text-[13px] font-medium ${PANEL_TEXT}`}>{label}</span>
      <span className={`block truncate text-[11px] ${PANEL_TEXT_2}`}>{hint}</span>
    </span>
    {count !== undefined && count > 0 && (
      <span className={`rounded-full bg-slate-100 px-1.5 text-[11px] font-semibold tabular-nums dark:bg-[#2A2A2A] ${PANEL_TEXT}`}>{count}</span>
    )}
    <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
  </button>
);

/** Earlier visits by the same person; each opens its full entry on top. */
const VisitHistory: React.FC<{ history: VisitorEntry[]; onOpen: (entry: VisitorEntry) => void }> = ({ history, onOpen }) =>
  history.length === 0 ? (
    <p className={`px-6 py-8 text-center text-xs ${PANEL_TEXT_2}`}>
      No earlier visits by this person in the loaded records. Load older records in the register to search further back.
    </p>
  ) : (
    <ol className="space-y-1.5 px-4 pb-6 pt-3 sm:px-6">
      {history.map((past) => {
        const status = VISITOR_STATUS[past.visitor.status];
        return (
          <li key={past.visitor.id}>
            <button
              type="button"
              onClick={() => onOpen(past)}
              className={`flex w-full cursor-pointer items-center gap-3 rounded-lg border px-3 py-2.5 text-left transition-colors hover:bg-slate-50 dark:hover:bg-[#242424] ${PANEL_LINE}`}
            >
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={`text-[13px] font-medium ${PANEL_TEXT}`}>{formatDay(past.visitor.date, 'short')}</span>
                  <span className={`font-mono text-[11px] ${PANEL_TEXT_2}`}>{past.visitor.visitNumber}</span>
                </span>
                <span className={`block truncate text-[11px] ${PANEL_TEXT_2}`}>
                  {departmentLabel(past.visitor.laboratory)} · {past.visitor.timeIn}
                  {past.visitor.timeOut ? `–${past.visitor.timeOut}` : ''}
                  {past.minutes !== null ? ` · ${formatDuration(past.minutes)}` : ''}
                </span>
                <span className={`block truncate text-[11px] ${PANEL_TEXT}`}>{past.visitor.purposeOfVisit || '—'}</span>
              </span>
              <StatusPill tone={status.tone}>{status.label}</StatusPill>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-400" aria-hidden="true" />
            </button>
          </li>
        );
      })}
    </ol>
  );
