import React, { useState } from 'react';
import { ArrowLeft, ArrowRight, Check, CheckCircle2, ClipboardSignature, Copy, Hourglass } from 'lucide-react';
import { FoodDrugIntake, FoodDrugIntakeStatus, User } from '../../types';
import { Avatar, Button, StatusPill, Tone } from '../common/Dashboard';
import { CaseFileContentsSection } from './CaseFileContents';

const STATUS_TONE: Record<FoodDrugIntakeStatus, Tone> = {
  'Awaiting Approval': 'rose',
  'Awaiting Assignment': 'amber',
  'Under Analysis': 'sky',
  Reported: 'emerald',
};

/** A sample still in the laboratory after this many days is flagged amber. */
const DAYS_IN_LAB_WARNING = 14;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

/** "2026-10-07" → "7 Oct 2026"; anything else is shown as given. */
const formatDate = (value?: string) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  if (!match) return value ?? '—';
  return `${Number(match[3])} ${MONTHS[Number(match[2]) - 1]} ${match[1]}`;
};

/** Names typed in capitals at reception ("GITHAIGA JAMES DANIEL") read as "Githaiga James Daniel". */
const displayName = (name?: string) => {
  if (!name) return '';
  if (name !== name.toUpperCase()) return name;
  return name.toLowerCase().replace(/(^|[\s'-])(\p{L})/gu, (_, sep: string, letter: string) => sep + letter.toUpperCase());
};

const dayNumber = (value?: string) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3])) / 86_400_000 : null;
};

/** Day 1 is the day the sample was received; counting stops once it is reported. */
const daysInLab = (intake: FoodDrugIntake) => {
  const start = dayNumber(intake.intakeDate);
  if (start === null) return null;
  const now = new Date();
  const end = dayNumber(intake.reportedDate) ?? Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()) / 86_400_000;
  return Math.max(1, Math.floor(end - start) + 1);
};

interface NextStep {
  text: string;
  /** Section the action lives in; omitted when there is nothing to open. */
  target?: string;
  action?: string;
  done?: boolean;
}

/** What has to happen next on the file, and who does it, phrased for the person viewing. */
const nextStep = (intake: FoodDrugIntake, isHead: boolean, isAssigned: boolean): NextStep => {
  const analyst = isAssigned ? 'You' : displayName(intake.analystAssigned) || 'The analyst';
  const head = isHead ? 'You' : 'The Head of Department';
  if (intake.status === 'Reported') {
    return { text: `Reported${intake.reportedDate ? ` on ${formatDate(intake.reportedDate)}` : ''}; the certificate of analysis is issued.`, target: 'draft-reports', action: 'View certificate', done: true };
  }
  if (intake.status === 'Awaiting Approval') return { text: `${head} to approve the submitted documents.` };
  if (!intake.analystId) return { text: `${head} to allocate an analyst.`, target: 'work-allocation', action: 'Go to allocation' };
  if (!intake.receiptFormSaved) return { text: `${analyst} to fill in the sample receipt form.`, target: 'receipt-form', action: 'Go to receipt form' };
  if (intake.worksheetStatus === 'Awaiting check') return { text: `${head} to check the laboratory worksheet.`, target: 'laboratory-worksheet', action: 'Go to worksheet' };
  if (intake.worksheetStatus === 'Checked') return { text: 'Worksheet checked. Prepare the certificate of analysis.', target: 'draft-reports', action: 'Go to certificate' };
  return {
    text: `${analyst} to ${intake.worksheetStatus === 'Draft' ? 'finish and submit' : 'start'} the laboratory worksheet.`,
    target: 'laboratory-worksheet',
    action: 'Go to worksheet',
  };
};

const CopyButton: React.FC<{ value: string; label: string }> = ({ value, label }) => {
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1500);
    } catch {
      /* Clipboard blocked; nothing to do. */
    }
  };
  return (
    <button
      type="button"
      onClick={copy}
      aria-label={copied ? `${label} copied` : `Copy ${label}`}
      title={copied ? 'Copied' : `Copy ${label}`}
      className="inline-flex h-6 w-6 shrink-0 cursor-pointer items-center justify-center rounded-md text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 dark:hover:bg-slate-800 dark:hover:text-slate-200"
    >
      {copied ? <Check className="h-3.5 w-3.5 text-emerald-600" /> : <Copy className="h-3.5 w-3.5" />}
    </button>
  );
};

/** The four steps of the file as a bar across the header; each step jumps to its section. */
const ProgressTrack: React.FC<{ sections: CaseFileContentsSection[]; onSelect: (id: string) => void }> = ({ sections, onSelect }) => {
  const current = sections.find((s) => s.state === 'current') ?? sections.find((s) => s.state !== 'done');
  return (
    <div>
      {/* Phones: dots and the current step's name */}
      <div className="flex items-center gap-3 sm:hidden">
        <div className="flex items-center gap-1.5" aria-hidden="true">
          {sections.map((s) => (
            <span
              key={s.id}
              className={`h-2 w-2 rounded-full ${s.state === 'done' ? 'bg-emerald-600' : s.state === 'current' ? 'bg-amber-500' : 'bg-slate-300 dark:bg-slate-600'}`}
            />
          ))}
        </div>
        <button type="button" onClick={() => current && onSelect(current.id)} className="cursor-pointer text-xs text-slate-600 dark:text-slate-300">
          {current ? (
            <>
              Step {current.number} of {sections.length}: <span className="font-medium text-slate-900 dark:text-white">{current.title}</span>
            </>
          ) : (
            'All steps complete'
          )}
        </button>
      </div>

      {/* Wider screens: the full track */}
      <ol className="hidden grid-cols-4 gap-2 sm:grid" aria-label="Case progress">
        {sections.map((s) => {
          const done = s.state === 'done';
          const active = s.state === 'current';
          return (
            <li key={s.id}>
              <button
                type="button"
                onClick={() => onSelect(s.id)}
                aria-current={active ? 'step' : undefined}
                className="group w-full cursor-pointer text-left"
              >
                <span
                  className={`block h-1.5 rounded-full transition-colors ${
                    done ? 'bg-emerald-600' : active ? 'bg-amber-500' : 'bg-slate-200 group-hover:bg-slate-300 dark:bg-slate-700 dark:group-hover:bg-slate-600'
                  }`}
                />
                <span className="mt-2 flex items-center gap-1.5 text-xs font-medium text-slate-800 group-hover:text-slate-950 dark:text-slate-100 dark:group-hover:text-white">
                  <span
                    className={`flex h-4 w-4 shrink-0 items-center justify-center rounded text-[9px] font-semibold text-white ${
                      done ? 'bg-emerald-600' : active ? 'bg-amber-600' : 'bg-slate-400 dark:bg-slate-600'
                    }`}
                  >
                    {done ? <Check className="h-2.5 w-2.5" /> : s.number}
                  </span>
                  <span className="truncate">{s.title}</span>
                </span>
                <span
                  className={`mt-0.5 block truncate pl-[1.375rem] text-[11px] ${
                    done ? 'text-emerald-700 dark:text-emerald-400' : active ? 'text-amber-700 dark:text-amber-300' : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {s.note ?? (done ? 'Complete' : active ? 'In progress' : 'Pending')}
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </div>
  );
};

interface FoodDrugCaseHeaderProps {
  intake: FoodDrugIntake;
  currentUser: Pick<User, 'id' | 'name' | 'role'>;
  sections: CaseFileContentsSection[];
  onBack: () => void;
  onSelectSection: (id: string) => void;
  /** Shown only to the Head and the assigned analyst once an analyst is allocated. */
  onViewAllocation?: () => void;
}

export const FoodDrugCaseHeader: React.FC<FoodDrugCaseHeaderProps> = ({ intake, currentUser, sections, onBack, onSelectSection, onViewAllocation }) => {
  const isHead = currentUser.role === 'HEAD_OF_DEPARTMENT';
  const isAssigned = !!intake.analystId && intake.analystId === currentUser.id;
  const next = nextStep(intake, isHead, isAssigned);
  const days = daysInLab(intake);
  const overdue = days !== null && days > DAYS_IN_LAB_WARNING && intake.status !== 'Reported';
  const analystName = displayName(intake.analystAssigned);
  const receiverName = displayName(intake.receiver);

  return (
    <header className="space-y-2">
      <nav aria-label="Breadcrumb" className="flex items-center gap-1.5 text-sm">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex cursor-pointer items-center gap-1.5 rounded-md px-1.5 py-1 font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Exhibit Laboratory
        </button>
        <span className="text-slate-400" aria-hidden="true">/</span>
        <span className="text-slate-500 dark:text-slate-400" aria-current="page">Sample case file</span>
      </nav>

      <div className="overflow-hidden rounded-xl border border-slate-300 bg-white shadow-sm dark:border-slate-700 dark:bg-slate-900">
        <div className="space-y-5 px-5 py-5 sm:px-6">
          {/* Reference, status and the allocation form */}
          <div className="flex flex-wrap items-start justify-between gap-x-6 gap-y-3">
            <div className="min-w-0 space-y-1.5">
              <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                <h1 className="flex items-center gap-1 font-mono text-2xl font-semibold leading-tight text-slate-900 dark:text-white">
                  {intake.id}
                  <CopyButton value={intake.id} label="sample number" />
                </h1>
                <StatusPill tone={STATUS_TONE[intake.status]}>{intake.status}</StatusPill>
              </div>
              <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-slate-600 dark:text-slate-300">
                <span className="font-medium text-slate-800 dark:text-slate-100">{intake.sampleType} sample</span>
                <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
                <span>
                  Exhibit <span className="font-mono">{intake.exhibitId}</span>
                </span>
                <span className="text-slate-300 dark:text-slate-600" aria-hidden="true">·</span>
                <span>Foods, Drugs &amp; Chemical Substances</span>
              </p>
            </div>
            {onViewAllocation && (
              <Button icon={ClipboardSignature} onClick={onViewAllocation}>
                {isHead ? 'Allocation form' : 'Allocation form (copy)'}
              </Button>
            )}
          </div>

          {/* What happens next */}
          <div
            className={`flex flex-wrap items-center justify-between gap-3 rounded-lg border px-4 py-3 ${
              next.done
                ? 'border-emerald-200 bg-emerald-50 dark:border-emerald-500/30 dark:bg-emerald-500/10'
                : 'border-amber-200 bg-amber-50 dark:border-amber-500/30 dark:bg-amber-500/10'
            }`}
          >
            <div className="flex min-w-0 items-start gap-2.5">
              {next.done ? (
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-emerald-700 dark:text-emerald-400" />
              ) : (
                <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-amber-700 dark:text-amber-300" />
              )}
              <p className="text-sm text-slate-800 dark:text-slate-100">
                <span className="font-semibold">{next.done ? 'Complete: ' : 'Next: '}</span>
                {next.text}
              </p>
            </div>
            <div className="flex items-center gap-3">
              {days !== null && (
                <span
                  title={overdue ? `In the laboratory longer than ${DAYS_IN_LAB_WARNING} days` : 'Counted from the day the sample was received'}
                  className={`inline-flex items-center gap-1 text-xs font-medium tabular-nums ${
                    overdue ? 'text-amber-800 dark:text-amber-200' : 'text-slate-600 dark:text-slate-300'
                  }`}
                >
                  <Hourglass className="h-3.5 w-3.5" />
                  {intake.status === 'Reported' ? `${days} ${days === 1 ? 'day' : 'days'} in lab` : `Day ${days} in lab`}
                </span>
              )}
              {next.target && next.action && (
                <Button size="sm" variant={next.done ? 'secondary' : 'primary'} onClick={() => onSelectSection(next.target!)}>
                  {next.action}
                </Button>
              )}
            </div>
          </div>

          <ProgressTrack sections={sections} onSelect={onSelectSection} />
        </div>

        {/* Key facts */}
        <dl className="grid grid-cols-2 gap-px border-t border-slate-200 bg-slate-200 text-sm lg:grid-cols-4 dark:border-slate-800 dark:bg-slate-800">
          <div className="bg-white px-5 py-3 dark:bg-slate-900">
            <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Client</dt>
            <dd className="mt-0.5 break-words font-medium text-slate-900 dark:text-white">{displayName(intake.clientName)}</dd>
          </div>
          <div className="bg-white px-5 py-3 dark:bg-slate-900">
            <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Received</dt>
            <dd className="mt-0.5 font-medium text-slate-900 dark:text-white">{formatDate(intake.intakeDate)}</dd>
            {receiverName && <dd className="break-words text-xs text-slate-500 dark:text-slate-400">by {receiverName}</dd>}
          </div>
          <div className="bg-white px-5 py-3 dark:bg-slate-900">
            <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Analyst</dt>
            <dd className="mt-1 flex items-center gap-2">
              {analystName ? (
                <>
                  <Avatar name={analystName} size="sm" tone="sky" />
                  <span className="min-w-0 break-words font-medium text-slate-900 dark:text-white">{analystName}</span>
                  {isAssigned && (
                    <span className="rounded bg-sky-100 px-1.5 py-0.5 text-[10px] font-semibold text-sky-800 dark:bg-sky-500/15 dark:text-sky-300">You</span>
                  )}
                </>
              ) : (
                <span className="text-slate-500 dark:text-slate-400">Not yet allocated</span>
              )}
            </dd>
          </div>
          <div className="bg-white px-5 py-3 dark:bg-slate-900">
            <dt className="text-[10px] font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">Seal number</dt>
            <dd className="mt-0.5 flex items-center gap-1 font-mono text-[13px] font-medium text-slate-900 dark:text-white">
              {intake.sealNumber ? (
                <>
                  <span className="min-w-0 break-all">{intake.sealNumber}</span>
                  <CopyButton value={intake.sealNumber} label="seal number" />
                </>
              ) : (
                '—'
              )}
            </dd>
          </div>
        </dl>
      </div>
    </header>
  );
};
