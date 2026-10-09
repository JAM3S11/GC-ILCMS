import React from 'react';
import { AlarmClock, Check, CheckCircle2, ClipboardList, FileText, LogOut, Send, Shield } from 'lucide-react';
import { OfficerVisitor } from '../../types';
import { departmentLabel } from '../../lib/departments';
import { Avatar, Button, DetailItem, StatusPill } from '../common/Dashboard';
import { NationalIdReveal } from './NationalIdReveal';
import { LabNotifyButton } from './LabNotifyButton';
import { VISITOR_STATUS } from './visitorStatus';
import { WAIT_LIMIT_MINUTES, formatDay, formatDuration } from './visitorTime';

/* ---------------------------------------------------------------------------
 * A visitor's entry in the Visitor Register: where the visit stands, the one
 * next step for this user, and the visit, identification and purpose details.
 * Each part is its own section so containers can show some or all of them
 * (the register's stacked drawers show one part per drawer).
 * --------------------------------------------------------------------------- */

export interface VisitorActions {
  onCheckOut: (visitorId: string) => Promise<void>;
  onLabReceive: (visitorId: string) => Promise<void>;
  canReceiveVisits: boolean;
  canCheckOutVisits: boolean;
  onRevealNationalId: (visitorId: string) => Promise<string | null>;
  onEditClientDetails?: (visitor: OfficerVisitor) => void;
  onSendLabNotification?: (visitor: OfficerVisitor, resend: boolean) => Promise<void>;
  /** Lab staff: tell reception the visitor's intake is registered and they can be checked out. */
  onNotifyIntakeComplete?: (visitorId: string) => Promise<void>;
}

export type NextStep =
  | { label: string; short: string; icon: React.ComponentType<{ className?: string }>; run: () => void }
  | { note: string };

/** The one thing this user can do for the visitor right now. */
export const nextStepFor = (visitor: OfficerVisitor, actions: VisitorActions): NextStep => {
  // Once the lab has registered the exhibit intake, the visitor can be released.
  if (
    actions.onNotifyIntakeComplete &&
    visitor.labIntakeRegistered &&
    (visitor.status === 'Awaiting Laboratory Reception' || visitor.status === 'In Laboratory')
  ) {
    const notify = actions.onNotifyIntakeComplete;
    return { label: 'Notify reception — ready for checkout', short: 'Ready for checkout', icon: Send, run: () => void notify(visitor.id) };
  }
  if (visitor.status === 'Awaiting Laboratory Reception') {
    return actions.canReceiveVisits
      ? { label: 'Accept at laboratory', short: 'Accept', icon: CheckCircle2, run: () => void actions.onLabReceive(visitor.id) }
      : { note: 'Waiting for the laboratory to accept this client.' };
  }
  if (visitor.status === 'In Laboratory') {
    return { note: 'The client is with the laboratory. Exhibits are handled in the Exhibit Laboratory.' };
  }
  if (visitor.status === 'Completed') {
    return actions.canCheckOutVisits
      ? { label: 'Check out', short: 'Check out', icon: LogOut, run: () => void actions.onCheckOut(visitor.id) }
      : { note: 'Reception checks the client out.' };
  }
  return { note: 'This visit is closed.' };
};

const JOURNEY = ['Arrived', 'Received by lab', 'Service complete', 'Checked out'] as const;
const JOURNEY_STEP: Record<OfficerVisitor['status'], number> = {
  'Awaiting Laboratory Reception': 0,
  'In Laboratory': 1,
  Completed: 2,
  Departed: 3,
};

const sectionTitle = 'mb-3 text-[11px] font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400';

type SectionProps = { visitor: OfficerVisitor; minutes: number | null };

/** The next-step buttons for a visit: the primary action and, while waiting, notifying the lab. */
export const VisitorNextStepButtons: React.FC<VisitorActions & { visitor: OfficerVisitor; onDone?: () => void; fullWidth?: boolean }> = ({
  visitor,
  onDone,
  fullWidth,
  ...actions
}) => {
  const next = nextStepFor(visitor, actions);
  return (
    <>
      {'label' in next && (
        <Button
          variant="primary"
          icon={next.icon}
          className={fullWidth ? 'w-full' : ''}
          onClick={() => {
            next.run();
            onDone?.();
          }}
        >
          {next.label}
        </Button>
      )}
      {actions.onSendLabNotification && visitor.status === 'Awaiting Laboratory Reception' && (
        <LabNotifyButton
          visit={visitor}
          size="sm"
          notifyLabel={`Notify ${departmentLabel(visitor.laboratory)}`}
          onSend={(v, resend) => actions.onSendLabNotification!(v, resend)}
        />
      )}
    </>
  );
};

/** Red notice for a long wait at reception or a visit never signed out. */
export const VisitorAlert: React.FC<SectionProps & { longWait: boolean; overnight: boolean }> = ({ visitor, minutes, longWait, overnight }) =>
  longWait || overnight ? (
    <div role="status" className="flex items-start gap-2 border-b border-rose-200 bg-rose-50 px-5 py-2.5 text-xs text-rose-800 dark:border-rose-900 dark:bg-rose-950/30 dark:text-rose-200">
      <AlarmClock className="mt-px h-3.5 w-3.5 shrink-0" />
      {overnight
        ? `Signed in on ${formatDay(visitor.date, 'short')} and not yet signed out. Confirm whether the client is still on the premises.`
        : `Waiting ${formatDuration(minutes ?? 0)} at reception, over the ${WAIT_LIMIT_MINUTES}-minute service standard. Follow up with ${departmentLabel(visitor.laboratory)}.`}
    </div>
  ) : null;

/** Arrived → received by lab → service complete → checked out. */
export const VisitorJourney: React.FC<{ visitor: OfficerVisitor }> = ({ visitor }) => (
  <ol aria-label="Visit progress" className="grid grid-cols-4 gap-1 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
    {JOURNEY.map((step, index) => {
      const current = JOURNEY_STEP[visitor.status];
      const done = index < current || (index === current && visitor.status === 'Departed');
      const isCurrent = index === current && visitor.status !== 'Departed';
      return (
        <li key={step} className="min-w-0" aria-current={isCurrent ? 'step' : undefined}>
          <div className={`h-1.5 rounded-full ${done ? 'bg-emerald-600' : isCurrent ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-800'}`} />
          <div className={`mt-1.5 flex items-center gap-1 truncate text-[11px] ${done || isCurrent ? 'font-medium text-slate-900 dark:text-white' : 'text-slate-500 dark:text-slate-400'}`}>
            {done && <Check className="h-3 w-3 shrink-0 text-emerald-600" aria-hidden="true" />}
            {step}
          </div>
        </li>
      );
    })}
  </ol>
);

/** What happens next; with `withButtons` the action buttons sit beside it. */
export const VisitorNextStep: React.FC<VisitorActions & { visitor: OfficerVisitor; withButtons?: boolean }> = ({ visitor, withButtons, ...actions }) => {
  const next = nextStepFor(visitor, actions);
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200 bg-amber-50/50 px-5 py-3.5 dark:border-slate-800 dark:bg-amber-400/5">
      <div>
        <div className="text-[11px] font-semibold uppercase tracking-wide text-amber-800 dark:text-amber-300">Next step</div>
        <p className={`mt-0.5 text-[13px] ${'note' in next ? 'text-slate-700 dark:text-slate-200' : 'font-medium text-slate-900 dark:text-white'}`}>
          {'note' in next ? next.note : next.label}
        </p>
      </div>
      {withButtons && (
        <div className="flex flex-wrap items-center gap-2">
          <VisitorNextStepButtons {...actions} visitor={visitor} />
        </div>
      )}
    </div>
  );
};

/** Reception and the Water Head can correct the client or exhibit details. */
export const VisitorEditPrompt: React.FC<{ visitor: OfficerVisitor; onEditClientDetails?: (visitor: OfficerVisitor) => void }> = ({
  visitor,
  onEditClientDetails,
}) =>
  onEditClientDetails && visitor.laboratory === 'Water' && visitor.status !== 'Departed' ? (
    <div className="flex items-center justify-between gap-3 border-b border-slate-200 px-5 py-2.5 text-xs dark:border-slate-800">
      <span className="text-slate-500 dark:text-slate-400">Something wrong with the client or exhibit details?</span>
      <Button size="xs" icon={FileText} onClick={() => onEditClientDetails(visitor)}>
        Edit details
      </Button>
    </div>
  ) : null;

export const VisitorVisitDetails: React.FC<SectionProps> = ({ visitor, minutes }) => (
  <div className="border-b border-slate-200 p-5 dark:border-slate-800">
    <h3 className={sectionTitle}>Visit</h3>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
      <DetailItem label="Date">{visitor.date ? formatDay(visitor.date) : '—'}</DetailItem>
      <DetailItem label="Time in / out">
        {visitor.timeIn}
        {visitor.timeOut ? ` – ${visitor.timeOut}` : ''}
      </DetailItem>
      <DetailItem label={visitor.status === 'Departed' ? 'Length of visit' : 'Time on premises'}>
        {minutes !== null ? formatDuration(minutes) : '—'}
      </DetailItem>
      <DetailItem label="Registered by">{visitor.receptionistName || '—'}</DetailItem>
      <DetailItem label="Visitor signature">{visitor.signatureCaptured ? 'Captured' : 'Not captured'}</DetailItem>
      <DetailItem label="Vehicle">{visitor.vehicleRegistration || '—'}</DetailItem>
    </dl>
  </div>
);

export const VisitorIdentification: React.FC<{ visitor: OfficerVisitor; onRevealNationalId: VisitorActions['onRevealNationalId'] }> = ({
  visitor,
  onRevealNationalId,
}) => (
  <div className="border-b border-slate-200 p-5 dark:border-slate-800">
    <h3 className={sectionTitle}>Identification</h3>
    <dl className="grid grid-cols-2 gap-x-4 gap-y-4">
      <DetailItem label="National ID">
        <NationalIdReveal visitorId={visitor.id} maskedValue={visitor.nationalId || '—'} onReveal={onRevealNationalId} />
      </DetailItem>
      <DetailItem label="Phone">{visitor.phone || '—'}</DetailItem>
      <DetailItem label="Service badge">{visitor.badgeNumber || '—'}</DetailItem>
      <DetailItem label="Station / organisation">{visitor.station || '—'}</DetailItem>
      {visitor.poBox && <DetailItem label="Postal address">{visitor.poBox}</DetailItem>}
    </dl>
    <p className="mt-3 flex items-start gap-1.5 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
      <Shield className="mt-px h-3 w-3 shrink-0" aria-hidden="true" />
      Personal data is held under the Data Protection Act, 2019. Revealing the full ID number is recorded in the audit log.
    </p>
  </div>
);

export const VisitorPurpose: React.FC<{ visitor: OfficerVisitor }> = ({ visitor }) => (
  <div className="space-y-3 p-5">
    <h3 className={sectionTitle}>Purpose and items</h3>
    {[
      { icon: null, label: 'Purpose of visit', value: visitor.purposeOfVisit || '—' },
      { icon: FileText, label: 'Documents presented', value: visitor.documentsPresented || 'No documents recorded.' },
      { icon: ClipboardList, label: 'Exhibits brought', value: visitor.exhibitsPresented || 'No exhibit details recorded.' },
    ].map(({ icon: Icon, label, value }) => (
      <div key={label} className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950/50">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          {Icon && <Icon className="h-3.5 w-3.5" />} {label}
        </div>
        <p className="text-xs leading-relaxed text-slate-700 dark:text-slate-200">{value}</p>
      </div>
    ))}
    {!!visitor.documentsVerified?.length && (
      <div className="rounded-lg bg-slate-50 p-3 dark:bg-slate-950/50">
        <div className="mb-1.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">Documents verified at reception</div>
        <ul className="space-y-1">
          {visitor.documentsVerified.map((doc) => (
            <li key={doc} className="flex items-center gap-1.5 text-xs text-slate-700 dark:text-slate-200">
              <Check className="h-3 w-3 shrink-0 text-emerald-600" aria-hidden="true" /> {doc}
            </li>
          ))}
        </ul>
      </div>
    )}
  </div>
);

interface VisitorRecordProps extends VisitorActions, SectionProps {
  longWait: boolean;
  overnight: boolean;
  /**
   * 'drawer': the container shows the name and status in its header and the
   * action buttons in its footer, so the record leaves them out.
   */
  layout?: 'panel' | 'drawer';
}

/** The whole entry in one column. */
export const VisitorRecord: React.FC<VisitorRecordProps> = ({ visitor, minutes, longWait, overnight, layout = 'panel', ...actions }) => {
  const status = VISITOR_STATUS[visitor.status];
  return (
    <div className="flex flex-col">
      {layout === 'panel' && (
        <div className="flex items-center gap-3.5 border-b border-slate-200 p-5 dark:border-slate-800">
          <Avatar name={visitor.officerName} size="lg" tone={status.tone} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <h2 className="text-base font-semibold text-slate-900 dark:text-white">{visitor.officerName}</h2>
              <StatusPill tone={status.tone} pulse={visitor.status !== 'Departed'}>{status.label}</StatusPill>
              {visitor.visitorType === 'POLICE_OFFICER' && (
                <StatusPill tone="sky" dot={false}>
                  <Shield className="h-3 w-3" /> Police
                </StatusPill>
              )}
            </div>
            <p className="mt-0.5 text-xs text-slate-500 dark:text-slate-400">
              <span className="font-mono">{visitor.visitNumber}</span> · {visitor.station || 'No station'} · {departmentLabel(visitor.laboratory)}
            </p>
          </div>
        </div>
      )}
      <VisitorAlert visitor={visitor} minutes={minutes} longWait={longWait} overnight={overnight} />
      <VisitorJourney visitor={visitor} />
      <VisitorNextStep {...actions} visitor={visitor} withButtons={layout === 'panel'} />
      <VisitorEditPrompt visitor={visitor} onEditClientDetails={actions.onEditClientDetails} />
      <VisitorVisitDetails visitor={visitor} minutes={minutes} />
      <VisitorIdentification visitor={visitor} onRevealNationalId={actions.onRevealNationalId} />
      <VisitorPurpose visitor={visitor} />
    </div>
  );
};
