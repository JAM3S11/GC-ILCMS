import React, { useState } from 'react';
import { ArrowLeft, Check, ClipboardSignature, Copy } from 'lucide-react';
import { FoodDrugIntake, FoodDrugIntakeStatus, User } from '../../types';
import { Avatar, Button, StatusPill, Tone } from '../common/Dashboard';
import { CaseStatusCard, NextStep, caseStages } from './CaseFlow';

const STATUS_TONE: Record<FoodDrugIntakeStatus, Tone> = {
  'Awaiting Approval': 'rose',
  'Awaiting Assignment': 'teal',
  'Under Analysis': 'sky',
  Reported: 'emerald',
};

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

/** What has to happen next on the file, and who does it, phrased for the person viewing. */
const nextStep = (intake: FoodDrugIntake, isHead: boolean, isAssigned: boolean): NextStep => {
  const analyst = isAssigned ? 'You' : displayName(intake.analystAssigned) || 'The analyst';
  const head = isHead ? 'You' : 'The Head of Department';
  if (intake.status === 'Reported') {
    return {
      text: `Reported${intake.reportedDate ? ` on ${formatDate(intake.reportedDate)}` : ''}; the certificate of analysis is issued.`,
      action: { label: 'View certificate', target: 'draft-reports' },
      done: true,
    };
  }
  if (intake.status === 'Awaiting Approval') return { text: `${head} to approve the submitted documents from the register.` };
  if (!intake.analystId) return { text: `${head} to allocate an analyst from the register.`, action: { label: 'Go to allocation', target: 'work-allocation' } };
  if (!intake.receiptFormSaved) return { text: `${analyst} to fill in the sample receipt form.`, action: { label: 'Go to receipt form', target: 'receipt-form' } };
  if (intake.worksheetStatus === 'Awaiting check') return { text: `${head} to check the laboratory worksheet.`, action: { label: 'Go to worksheet', target: 'laboratory-worksheet' } };
  if (intake.worksheetStatus === 'Checked') return { text: 'Worksheet checked. Prepare and approve the certificate of analysis.', action: { label: 'Go to certificate', target: 'draft-reports' } };
  return {
    text: `${analyst} to ${intake.worksheetStatus === 'Draft' ? 'finish and submit' : 'start'} the laboratory worksheet.`,
    action: { label: 'Go to worksheet', target: 'laboratory-worksheet' },
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

interface FoodDrugCaseHeaderProps {
  intake: FoodDrugIntake;
  currentUser: Pick<User, 'id' | 'name' | 'role'>;
  onBack: () => void;
  onSelectSection: (id: string) => void;
  /** Shown only to the Head and the assigned analyst once an analyst is allocated. */
  onViewAllocation?: () => void;
}

export const FoodDrugCaseHeader: React.FC<FoodDrugCaseHeaderProps> = ({ intake, currentUser, onBack, onSelectSection, onViewAllocation }) => {
  const isHead = currentUser.role === 'HEAD_OF_DEPARTMENT';
  const isAssigned = !!intake.analystId && intake.analystId === currentUser.id;
  const next = nextStep(intake, isHead, isAssigned);
  const analystName = displayName(intake.analystAssigned);
  const receiverName = displayName(intake.receiver);

  // The five stages every department's case file shares.
  const worksheet = intake.worksheetStatus;
  const analysed = worksheet === 'Awaiting check' || worksheet === 'Checked';
  const reported = intake.status === 'Reported';
  const stages = caseStages(
    [true, !!intake.analystId, analysed, worksheet === 'Checked', reported],
    [
      formatDate(intake.intakeDate),
      intake.analystId ? analystName : 'Awaiting allocation',
      analysed ? 'Worksheet submitted' : !intake.receiptFormSaved ? 'Receipt form' : worksheet === 'Draft' ? 'Worksheet in draft' : 'Worksheet',
      worksheet === 'Checked' ? 'Worksheet checked' : worksheet === 'Awaiting check' ? 'Head to check worksheet' : undefined,
      reported ? `Reported ${formatDate(intake.reportedDate)}` : worksheet === 'Checked' ? 'Certificate in draft' : undefined,
    ],
    [undefined, 'work-allocation', 'laboratory-worksheet', 'laboratory-worksheet', 'draft-reports'],
  );

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

      <CaseStatusCard
        next={next}
        stages={stages}
        onSelect={onSelectSection}
        receivedDate={intake.intakeDate}
        finishedDate={intake.reportedDate}
        header={
          /* Reference, status and the allocation form */
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
        }
        footer={
          <>
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
          </>
        }
      />
    </header>
  );
};
