import React, { useState } from 'react';
import {
  Activity,
  ArrowRight,
  Check,
  Clock,
  FileCheck,
  FileText,
  FlaskConical,
  Link2,
  Microscope,
  Package,
  ShieldCheck,
  Users,
} from 'lucide-react';
import { CaseStatus, DraftReport, ExaminationRecord, ForensicCase } from '../../types';
import { formatKes } from '../../waterIntake';
import { GCMSViewer } from './GCMSViewer';
import { UVVisViewer } from './UVVisViewer';
import { DraftReportViewer } from '../report/DraftReportViewer';
import {
  Avatar,
  Button,
  DashboardHeader,
  DashboardPage,
  EmptyState,
  Panel,
  SegmentedControl,
  StatusPill,
  Tone,
  TONE,
  tableClasses as tc,
} from '../common/Dashboard';

interface DigitalCaseFileProps {
  caseData: ForensicCase;
  onUpdateCaseFindings?: (newFindings: any) => void;
  onUpdateDraftReport?: (updatedReport: DraftReport) => void;
}

type Tab = 'overview' | 'exhibits' | 'custody' | 'examinations' | 'instruments' | 'findings' | 'report';

/* ------------------------------------------------------------------ */
/*  Case process                                                       */
/* ------------------------------------------------------------------ */

const STAGES = ['Received', 'Registered', 'Allocated', 'Analysis', 'Findings', 'Report', 'Approved'] as const;

/** Which of the seven process stages a case status sits in. */
const STAGE_OF_STATUS: Record<CaseStatus, number> = {
  RECEIVED: 0,
  REGISTERED: 1,
  AWAITING_ALLOCATION: 1,
  ALLOCATED: 2,
  IN_ANALYSIS: 3,
  RESULTS_AVAILABLE: 3,
  INTERPRETATION: 4,
  REPORT_DRAFT: 5,
  UNDER_REVIEW: 5,
  CORRECTION_REQUIRED: 5,
  APPROVED: 6,
  COMPLETED: 6,
  ARCHIVED: 6,
};

const STATUS_TONE: Partial<Record<CaseStatus, Tone>> = {
  CORRECTION_REQUIRED: 'rose',
  APPROVED: 'emerald',
  COMPLETED: 'emerald',
  ARCHIVED: 'slate',
  REPORT_DRAFT: 'violet',
  UNDER_REVIEW: 'violet',
};

const PRIORITY_TONE: Record<ForensicCase['priority'], Tone> = {
  CRITICAL: 'rose',
  HIGH: 'amber',
  EXPEDITED: 'sky',
  ROUTINE: 'slate',
};

const EXAM_TONE: Record<ExaminationRecord['status'], Tone> = {
  PENDING: 'slate',
  'IN PROGRESS': 'amber',
  PAUSED: 'slate',
  COMPLETED: 'emerald',
  'REQUIRES REVIEW': 'rose',
};

/** "REPORT_DRAFT" → "Report draft" */
const humanise = (s: string) => s.charAt(0) + s.slice(1).toLowerCase().replace(/_/g, ' ');

/** Parses "2026-09-11 01:10 PM" or "2026-09-11 13:10" for sorting. */
const toTime = (s?: string) => {
  const m = s?.match(/(\d{4}-\d{2}-\d{2})(?:\s+(\d{1,2}):(\d{2})\s*(AM|PM)?)?/i);
  if (!m) return 0;
  let h = Number(m[2] ?? 0);
  if (m[4]) h = (h % 12) + (m[4].toUpperCase() === 'PM' ? 12 : 0);
  return new Date(`${m[1]}T${String(h).padStart(2, '0')}:${m[3] ?? '00'}:00`).getTime();
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

export const DigitalCaseFile: React.FC<DigitalCaseFileProps> = ({ caseData, onUpdateDraftReport }) => {
  const [tab, setTab] = useState<Tab>('overview');
  const [instrument, setInstrument] = useState<'gcms' | 'uvvis'>('gcms');

  const stage = STAGE_OF_STATUS[caseData.status] ?? 0;
  const examsDone = caseData.examinations.filter((e) => e.status === 'COMPLETED').length;
  const intakeCount = (caseData.foodDrugIntakes?.length ?? 0) + (caseData.waterIntakes?.length ?? 0);

  const stageDetail = [
    caseData.dateReceived,
    caseData.dateRegistered,
    caseData.assignedAnalyst.split(',')[0],
    `${examsDone}/${caseData.examinations.length} examinations`,
    caseData.findings ? 'Findings recorded' : 'Pending',
    caseData.draftReport?.reportNumber ?? (stage >= 5 ? 'Draft in progress' : 'Pending'),
    stage >= 6 ? 'Certificate issued' : 'Awaiting review',
  ];

  // Everything that has happened on the case, newest first.
  const activity = [
    ...caseData.custodyHistory.map((c) => ({
      id: c.id,
      time: c.timestamp,
      title: `${c.action} · ${c.sampleOrExhibitId}`,
      detail: `${c.officerOrStaffName} — ${c.location}`,
      icon: Link2,
      tone: 'amber' as Tone,
    })),
    ...caseData.examinations.map((e) => ({
      id: e.id,
      time: e.endDate ?? e.startDate,
      title: `${e.examinationType}`,
      detail: `${humanise(e.status.replace(' ', '_'))} by ${e.analystName}`,
      icon: Microscope,
      tone: EXAM_TONE[e.status],
    })),
  ].sort((a, b) => toTime(b.time) - toTime(a.time));

  return (
    <DashboardPage>
      <DashboardHeader
        breadcrumb={['Cases', caseData.caseNumber]}
        title={caseData.natureOfCase}
        meta={<StatusPill tone={STATUS_TONE[caseData.status] ?? 'amber'}>{humanise(caseData.status)}</StatusPill>}
        description={
          <span className="flex flex-wrap items-center gap-x-3 gap-y-1">
            <span className="font-mono">{caseData.caseNumber}</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span className="font-mono">{caseData.labReferenceNumber}</span>
            <span className="text-slate-300 dark:text-slate-600">·</span>
            <span>{caseData.assignedDepartment}</span>
            <StatusPill tone={PRIORITY_TONE[caseData.priority]} dot={false}>
              {humanise(caseData.priority)} priority
            </StatusPill>
          </span>
        }
        actions={
          <Button variant="primary" icon={FileCheck} onClick={() => setTab('report')}>
            Open draft report
          </Button>
        }
      />

      <ProcessTracker stage={stage} details={stageDetail} />

      <SegmentedControl
        ariaLabel="Case file sections"
        value={tab}
        onChange={setTab}
        options={[
          { value: 'overview', label: 'Overview' },
          { value: 'exhibits', label: 'Exhibits', count: caseData.exhibits.length + intakeCount },
          { value: 'custody', label: 'Custody', count: caseData.custodyHistory.length },
          { value: 'examinations', label: 'Examinations', count: caseData.examinations.length },
          { value: 'instruments', label: 'Instruments' },
          { value: 'findings', label: 'Findings' },
          { value: 'report', label: 'Report' },
        ]}
      />

      {/* ------------------------------ Overview ------------------------------ */}
      {tab === 'overview' && (
        <div className="grid grid-cols-1 items-start gap-5 xl:grid-cols-12">
          <div className="space-y-5 xl:col-span-8">
            <Panel
              icon={Activity}
              tone="amber"
              title="Activity"
              description={`${activity.length} events on this case`}
              flush
              footer={
                <button onClick={() => setTab('custody')} className="inline-flex items-center gap-1 font-medium hover:text-slate-900 dark:hover:text-white">
                  View chain of custody <ArrowRight className="h-3 w-3" />
                </button>
              }
            >
              <ol className="divide-y divide-slate-100 dark:divide-slate-800">
                {activity.slice(0, 6).map((a) => (
                  <li key={a.id} className="flex items-start gap-3 px-4 py-3">
                    <span className={`mt-0.5 flex h-7 w-7 shrink-0 items-center justify-center rounded-full ring-1 ring-inset ${TONE[a.tone].chip}`}>
                      <a.icon className="h-3.5 w-3.5" />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-medium text-slate-900 dark:text-white">{a.title}</div>
                      <div className="truncate text-xs text-slate-500 dark:text-slate-400">{a.detail}</div>
                      <time className="mt-0.5 block text-[11px] tabular-nums text-slate-400 sm:hidden">{a.time}</time>
                    </div>
                    <time className="hidden shrink-0 whitespace-nowrap text-[11px] tabular-nums text-slate-400 sm:block">{a.time}</time>
                  </li>
                ))}
              </ol>
            </Panel>

            <Panel icon={FileText} title="Request" description="What the submitting agency asked for">
              <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">{caseData.description}</p>
              <Facts
                className="mt-4 border-t border-slate-100 pt-4 dark:border-slate-800"
                items={[
                  ['Institution', caseData.requestingInstitution],
                  ['Department', caseData.requestingDepartment],
                  ['Legal reference', caseData.legalReference],
                  ['Case category', caseData.caseCategory],
                  ['Date received', caseData.dateReceived],
                  ['Date registered', caseData.dateRegistered],
                  ['Visitor record', caseData.visitorRecordId ?? '—'],
                  ['Statutory act', 'Cap 245, Section 74'],
                ]}
              />
            </Panel>
          </div>

          <div className="space-y-5 xl:col-span-4">
            <Panel icon={Users} title="People" flush>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  { role: 'Investigating officer', name: caseData.investigatingOfficer, sub: `${caseData.officerBadge} · ${caseData.officerPhone}` },
                  { role: 'Reporting chemist', name: caseData.assignedAnalyst, sub: `${caseData.assignedDepartment} laboratory` },
                  ...(caseData.exhibits[0] ? [{ role: 'Received by', name: caseData.exhibits[0].receivedBy, sub: caseData.exhibits[0].dateReceived }] : []),
                ].map((p) => (
                  <li key={p.role} className="flex items-center gap-3 px-4 py-3">
                    <Avatar name={p.name} size="sm" />
                    <div className="min-w-0">
                      <div className="text-[11px] text-slate-500 dark:text-slate-400">{p.role}</div>
                      <div className="truncate text-[13px] font-medium text-slate-900 dark:text-white">{p.name}</div>
                      <div className="truncate text-[11px] text-slate-400">{p.sub}</div>
                    </div>
                  </li>
                ))}
              </ul>
            </Panel>

            <Panel
              icon={Package}
              title="Exhibits"
              description={`${caseData.exhibits.length} registered · ${caseData.samples.length} subsamples`}
              flush
              footer={
                <button onClick={() => setTab('exhibits')} className="inline-flex items-center gap-1 font-medium hover:text-slate-900 dark:hover:text-white">
                  All exhibits <ArrowRight className="h-3 w-3" />
                </button>
              }
            >
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {caseData.exhibits.slice(0, 4).map((e) => (
                  <li key={e.id} className="px-4 py-3">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-mono text-xs font-semibold text-slate-900 dark:text-white">{e.id}</span>
                      <StatusPill tone={e.condition === 'Intact & Sealed' ? 'emerald' : 'rose'}>{e.condition}</StatusPill>
                    </div>
                    <p className="mt-1 line-clamp-2 text-xs text-slate-500 dark:text-slate-400">{e.description}</p>
                  </li>
                ))}
              </ul>
            </Panel>
          </div>
        </div>
      )}

      {/* ------------------------------ Exhibits ------------------------------ */}
      {tab === 'exhibits' && (
        <div className="space-y-5">
          <Panel icon={Package} title="Physical exhibits" description="Items received under seal" flush>
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {caseData.exhibits.map((e) => (
                <li key={e.id} className="space-y-3 px-4 py-4">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-mono text-[13px] font-semibold text-slate-900 dark:text-white">{e.id}</span>
                    <StatusPill tone={e.condition === 'Intact & Sealed' ? 'emerald' : 'rose'}>{e.condition}</StatusPill>
                  </div>
                  <p className="text-[13px] leading-relaxed text-slate-700 dark:text-slate-200">{e.description}</p>
                  <Facts
                    items={[
                      ['Seal no.', e.sealNumber],
                      ['Packaging', e.packaging],
                      ['Storage', e.storageLocation],
                      ['Received', `${e.dateReceived} · ${e.receivedBy}`],
                    ]}
                  />
                </li>
              ))}
            </ul>
          </Panel>

          {!!caseData.waterIntakes?.length && (
            <Panel icon={FlaskConical} tone="sky" title="Water & Environment intakes" flush>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {caseData.waterIntakes.map((wi) => (
                  <li key={wi.id} className="space-y-3 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[13px] font-semibold text-slate-900 dark:text-white">{wi.labReference}</span>
                      <StatusPill tone={wi.status === 'Analysis Complete' ? 'emerald' : wi.status === 'Under Analysis' ? 'sky' : 'amber'}>
                        {wi.status}
                      </StatusPill>
                    </div>
                    <Facts
                      items={[
                        ['Sender', `${wi.senderName} (${wi.senderType})`],
                        ['Address', wi.senderAddress],
                        wi.senderType === 'Individual'
                          ? ['Mobile', wi.senderMobile || '—']
                          : ['Contact person', [wi.contactPerson, wi.contactPersonMobile].filter(Boolean).join(' · ')],
                        ['Received', `${wi.dateReceived} · ${wi.receivingOfficer}`],
                        ['Type of test', wi.specificParameters?.length ? `${wi.testType} (${wi.specificParameters.join(', ')})` : wi.testType],
                        ['Source', `${wi.sourceCategory} · ${wi.sourceType}, ${wi.locationFrom}${wi.dischargeTo ? ` → ${wi.dischargeTo}` : ''}`],
                        ['Charges', `${formatKes(wi.charges)}${wi.receiptNumber ? ` · ${wi.receiptNumber}` : ''}`],
                        ['Analysis officer', wi.analysisOfficer ?? 'Awaiting assignment'],
                      ]}
                    />
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          {!!caseData.foodDrugIntakes?.length && (
            <Panel icon={FlaskConical} title="Food & Drugs intakes" flush>
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {caseData.foodDrugIntakes.map((fdi) => (
                  <li key={fdi.id} className="space-y-3 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[13px] font-semibold text-slate-900 dark:text-white">
                        {fdi.id} <span className="font-sans font-normal text-slate-500">· {fdi.sampleType}</span>
                      </span>
                      <StatusPill tone={fdi.status === 'Reported' ? 'emerald' : fdi.status === 'Under Analysis' ? 'sky' : 'amber'}>
                        {fdi.status}
                      </StatusPill>
                    </div>
                    <Facts
                      items={[
                        ['Submitted by', fdi.clientName],
                        ['National ID', fdi.nationalId],
                        ['P.O Box', fdi.poBox],
                        ['Received', `${fdi.intakeDate} · ${fdi.receiver}`],
                        ['Analyst', fdi.analystAssigned ?? 'Awaiting assignment'],
                        ['Reported by', fdi.reportedBy ?? 'Pending'],
                      ]}
                    />
                  </li>
                ))}
              </ul>
            </Panel>
          )}

          <Panel icon={FlaskConical} title="Subsamples" description="Aliquots prepared for instrumentation" flush>
            {caseData.samples.length === 0 ? (
              <EmptyState icon={FlaskConical} title="No subsamples prepared yet" />
            ) : (
              <ul className="divide-y divide-slate-100 dark:divide-slate-800">
                {caseData.samples.map((s) => (
                  <li key={s.id} className="space-y-3 px-4 py-4">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <span className="font-mono text-[13px] font-semibold text-slate-900 dark:text-white">
                        {s.id} <span className="font-sans font-normal text-slate-500">from {s.exhibitId}</span>
                      </span>
                      <StatusPill tone={s.status === 'Analyzed' ? 'emerald' : s.status === 'In Testing' ? 'amber' : 'slate'}>{s.status}</StatusPill>
                    </div>
                    <p className="text-[13px] text-slate-700 dark:text-slate-200">{s.sampleDescription}</p>
                    <Facts
                      items={[
                        ['Quantity', s.quantityTaken],
                        ['Prepared', s.aliquotDate],
                        ['Prepared by', s.preparedBy],
                        ['Storage', s.storageCondition],
                      ]}
                    />
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      )}

      {/* ------------------------------ Custody ------------------------------- */}
      {tab === 'custody' && (
        <Panel
          icon={Link2}
          tone="amber"
          title="Chain of custody"
          description="Every hand-over of every exhibit, in order"
          actions={<StatusPill tone="emerald">Integrity verified</StatusPill>}
        >
          <ol className="relative space-y-6 pl-6 before:absolute before:bottom-2 before:left-[7px] before:top-2 before:w-px before:bg-slate-200 dark:before:bg-slate-800">
            {caseData.custodyHistory.map((c) => (
              <li key={c.id} className="relative">
                <span className="absolute -left-6 top-1 h-[15px] w-[15px] rounded-full border-2 border-amber-500 bg-white dark:bg-slate-900" />
                <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
                  <div className="text-[13px] font-semibold text-slate-900 dark:text-white">
                    {c.action} <span className="font-mono text-xs font-normal text-slate-500">· {c.sampleOrExhibitId}</span>
                  </div>
                  <time className="flex items-center gap-1 text-[11px] tabular-nums text-slate-400">
                    <Clock className="h-3 w-3" />
                    {c.timestamp}
                  </time>
                </div>
                <div className="mt-1 flex flex-wrap items-center gap-1.5 text-xs text-slate-600 dark:text-slate-300">
                  <span>{c.fromEntity}</span>
                  <ArrowRight className="h-3 w-3 shrink-0 text-slate-400" />
                  <span>{c.toEntity}</span>
                </div>
                <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">{c.location}</div>
                {c.remarks && <p className="mt-1.5 text-xs text-slate-500 dark:text-slate-400">{c.remarks}</p>}
                <div className="mt-1.5 flex items-center gap-1 truncate font-mono text-[10px] text-slate-400">
                  <ShieldCheck className="h-3 w-3 shrink-0 text-emerald-500" />
                  <span className="truncate">{c.signatureHash}</span>
                </div>
              </li>
            ))}
          </ol>
        </Panel>
      )}

      {/* ---------------------------- Examinations ---------------------------- */}
      {tab === 'examinations' && (
        <Panel
          icon={Microscope}
          title="Examinations"
          description={`${examsDone} of ${caseData.examinations.length} complete · SWGDRUG categories A–C`}
          flush
        >
          {caseData.examinations.length === 0 ? (
            <EmptyState icon={Microscope} title="No examinations started" />
          ) : (
            <ul className="divide-y divide-slate-100 dark:divide-slate-800">
              {caseData.examinations.map((e) => (
                <li key={e.id} className="space-y-3 px-4 py-4">
                  <div className="flex flex-wrap items-start justify-between gap-2">
                    <div className="min-w-0">
                      <div className="text-[13px] font-semibold text-slate-900 dark:text-white">{e.examinationType}</div>
                      <div className="font-mono text-[11px] text-slate-400">{e.id}</div>
                    </div>
                    <StatusPill tone={EXAM_TONE[e.status]}>{humanise(e.status.replace(' ', '_'))}</StatusPill>
                  </div>
                  <Facts
                    items={[
                      ['Method', e.method],
                      ['Instrument', e.instrument],
                      ['Analyst', e.analystName],
                      ['Time', e.endDate ? `${e.startDate} – ${e.endDate.split(' ').slice(1).join(' ')}` : e.startDate],
                    ]}
                  />
                  <p className="rounded-lg bg-slate-50 p-3 text-xs leading-relaxed text-slate-600 dark:bg-slate-950/50 dark:text-slate-300">
                    {e.observations}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </Panel>
      )}

      {/* ---------------------------- Instruments ----------------------------- */}
      {tab === 'instruments' && (
        <div className="space-y-4">
          <SegmentedControl
            ariaLabel="Instrument"
            value={instrument}
            onChange={setInstrument}
            options={[
              { value: 'gcms', label: 'GC-MS' },
              { value: 'uvvis', label: 'UV-Vis' },
            ]}
          />
          {instrument === 'gcms' &&
            (caseData.gcmsResults?.[0] ? (
              <GCMSViewer gcmsResult={caseData.gcmsResults[0]} />
            ) : (
              <Panel><EmptyState icon={Activity} title="No GC-MS run recorded" /></Panel>
            ))}
          {instrument === 'uvvis' &&
            (caseData.uvVisResults?.[0] ? (
              <UVVisViewer uvVisResult={caseData.uvVisResults[0]} />
            ) : (
              <Panel><EmptyState icon={Activity} title="No UV-Vis scan recorded" /></Panel>
            ))}
        </div>
      )}

      {/* ------------------------------ Findings ------------------------------ */}
      {tab === 'findings' && (
        <div className="space-y-5">
          <Panel icon={Activity} title="Evidence integration" description="How each technique supports the identification" flush>
            {/* Table on wider screens, stacked rows on phones */}
            <div className="hidden overflow-x-auto md:block">
              <table className={tc.table}>
                <thead className={tc.thead}>
                  <tr>
                    <th className={tc.th}>Technique</th>
                    <th className={tc.th}>Observation</th>
                    <th className={tc.th}>Reference match</th>
                    <th className={tc.th}>Confidence</th>
                  </tr>
                </thead>
                <tbody className={tc.tbody}>
                  {INTEGRATION.map((r) => (
                    <tr key={r.technique} className={tc.tr}>
                      <td className={tc.td}>
                        <div className="font-medium text-slate-900 dark:text-white">{r.technique}</div>
                        <div className="text-[11px] text-slate-400">{r.category}</div>
                      </td>
                      <td className={`${tc.td} max-w-xs`}>{r.observation}</td>
                      <td className={`${tc.td} max-w-xs`}>{r.match}</td>
                      <td className={tc.td}>
                        <StatusPill tone={r.confidence === 'High' ? 'emerald' : 'sky'}>{r.confidence}</StatusPill>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <ul className="divide-y divide-slate-100 md:hidden dark:divide-slate-800">
              {INTEGRATION.map((r) => (
                <li key={r.technique} className="space-y-1.5 px-4 py-3 text-xs">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <div className="text-[13px] font-medium text-slate-900 dark:text-white">{r.technique}</div>
                      <div className="text-[11px] text-slate-400">{r.category}</div>
                    </div>
                    <StatusPill tone={r.confidence === 'High' ? 'emerald' : 'sky'}>{r.confidence}</StatusPill>
                  </div>
                  <p className="text-slate-600 dark:text-slate-300">{r.observation}</p>
                  <p className="text-slate-500 dark:text-slate-400">{r.match}</p>
                </li>
              ))}
            </ul>
          </Panel>

          {caseData.findings ? (
            <Panel
              icon={Check}
              tone="emerald"
              title="Findings & conclusion"
              description={`Prepared by ${caseData.assignedAnalyst}`}
              actions={
                <Button size="sm" icon={FileCheck} onClick={() => setTab('report')}>
                  Draft report
                </Button>
              }
            >
              <dl className="divide-y divide-slate-100 dark:divide-slate-800">
                {[
                  ['Observations', caseData.findings.observationsSummary],
                  ['Analytical results', caseData.findings.analyticalResultsSummary],
                  ['Interpretation', caseData.findings.scientificInterpretation],
                  ['Formal findings', caseData.findings.formalFindings],
                ].map(([label, text]) => (
                  <div key={label} className="grid gap-1 py-3 first:pt-0 md:grid-cols-4 md:gap-4">
                    <dt className="text-xs font-medium text-slate-500 dark:text-slate-400">{label}</dt>
                    <dd className="whitespace-pre-line text-[13px] leading-relaxed text-slate-700 md:col-span-3 dark:text-slate-200">{text}</dd>
                  </div>
                ))}
              </dl>
              <div className="mt-2 rounded-lg border border-emerald-500/20 bg-emerald-500/5 p-4">
                <div className="text-xs font-medium text-emerald-700 dark:text-emerald-400">Conclusion</div>
                <p className="mt-1 text-[13px] font-medium leading-relaxed text-slate-900 dark:text-white">{caseData.findings.conclusion}</p>
              </div>
            </Panel>
          ) : (
            <Panel><EmptyState icon={Check} title="No findings recorded yet" /></Panel>
          )}
        </div>
      )}

      {/* ------------------------------- Report ------------------------------- */}
      {tab === 'report' && (
        <DraftReportViewer caseData={caseData} onSaveDraft={(updated) => onUpdateDraftReport?.(updated)} />
      )}
    </DashboardPage>
  );
};

/* ------------------------------------------------------------------ */
/*  Parts                                                              */
/* ------------------------------------------------------------------ */

const INTEGRATION = [
  {
    technique: 'Chemical spot test',
    category: 'SWGDRUG Category C',
    observation: 'Modified Scott test: immediate blue precipitate, soluble in chloroform layer.',
    match: 'Consistent with cocaine base / HCl standard.',
    confidence: 'Presumptive',
  },
  {
    technique: 'GC-MS (EI)',
    category: 'SWGDRUG Category A',
    observation: 'RT 8.42 min. Base peak m/z 82; fragment ions m/z 182, 303.',
    match: '98.4% match to NIST20 and GC-STD-COC-04.',
    confidence: 'High',
  },
  {
    technique: 'UV-Vis spectrophotometry',
    category: 'SWGDRUG Category B',
    observation: 'λmax at 233 nm and 274 nm in 0.1 M HCl.',
    match: 'Superimposable on certified cocaine HCl reference.',
    confidence: 'High',
  },
];

/** Seven-stage tracker; a compact progress bar on phones. */
export const ProcessTracker: React.FC<{ stage: number; details: string[]; stages?: readonly string[] }> = ({
  stage,
  details,
  stages = STAGES,
}) => (
  <section aria-label="Case progress" className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900">
    {/* Phones */}
    <div className="md:hidden">
      <div className="flex items-baseline justify-between text-xs">
        <span className="font-semibold text-slate-900 dark:text-white">{stages[stage]}</span>
        <span className="text-slate-500 dark:text-slate-400">
          Stage {stage + 1} of {stages.length}
        </span>
      </div>
      <div className="mt-2 flex gap-1">
        {stages.map((s, i) => (
          <span
            key={s}
            className={`h-1.5 flex-1 rounded-full ${i < stage ? 'bg-emerald-500' : i === stage ? 'bg-amber-500' : 'bg-slate-200 dark:bg-slate-800'}`}
          />
        ))}
      </div>
      <p className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">
        {details[stage]}
        {stage < stages.length - 1 && <> · Next: {stages[stage + 1]}</>}
      </p>
    </div>

    {/* Tablets and up */}
    <ol className="hidden md:grid" style={{ gridTemplateColumns: `repeat(${stages.length}, minmax(0, 1fr))` }}>
      {stages.map((s, i) => {
        const done = i < stage;
        const current = i === stage;
        return (
          <li key={s} className="relative flex flex-col items-center px-1 text-center">
            {i > 0 && (
              <span
                className={`absolute right-1/2 top-3 h-px w-full -translate-y-1/2 ${i <= stage ? 'bg-emerald-500/60' : 'bg-slate-200 dark:bg-slate-800'}`}
              />
            )}
            <span
              className={`relative z-10 flex h-6 w-6 items-center justify-center rounded-full text-[11px] font-semibold ring-4 ring-white dark:ring-slate-900 ${
                done
                  ? 'bg-emerald-500 text-white'
                  : current
                    ? 'bg-amber-500 text-slate-950'
                    : 'bg-slate-100 text-slate-400 dark:bg-slate-800'
              }`}
            >
              {done ? <Check className="h-3.5 w-3.5" strokeWidth={3} /> : i + 1}
            </span>
            <span className={`mt-2 text-xs font-medium ${done || current ? 'text-slate-900 dark:text-white' : 'text-slate-400'}`}>{s}</span>
            <span className="mt-0.5 line-clamp-1 text-[11px] text-slate-500 dark:text-slate-400">{done || current ? details[i] : '—'}</span>
          </li>
        );
      })}
    </ol>
  </section>
);

/** Label/value grid that wraps long values instead of truncating them. */
const Facts: React.FC<{ items: [string, string][]; className?: string }> = ({ items, className = '' }) => (
  <dl className={`grid grid-cols-1 gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-4 ${className}`}>
    {items.map(([label, value]) => (
      <div key={label} className="min-w-0">
        <dt className="text-[11px] font-medium text-slate-500 dark:text-slate-400">{label}</dt>
        <dd className="mt-0.5 break-words text-[13px] text-slate-900 dark:text-white">{value}</dd>
      </div>
    ))}
  </dl>
);
