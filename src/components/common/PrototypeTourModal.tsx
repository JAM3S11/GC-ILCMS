import React, { useState } from 'react';
import {
  X,
  FileCheck,
  Link2,
  Microscope,
  Shield,
  Layers,
  ChevronRight,
  CheckCircle2,
  Award,
  Sparkles,
  ArrowRight,
  Database,
  Building2,
  Users,
} from 'lucide-react';
import { LogoPlaceholder } from './LogoPlaceholder';

interface PrototypeTourModalProps {
  isOpen: boolean;
  onClose: () => void;
  onNavigate: (view: string) => void;
}

export const PrototypeTourModal: React.FC<PrototypeTourModalProps> = ({
  isOpen,
  onClose,
  onNavigate,
}) => {
  const [activeStep, setActiveStep] = useState(0);

  if (!isOpen) return null;

  const tourSteps = [
    {
      title: 'Institutional Mandate & System Purpose',
      category: 'Overview',
      icon: Award,
      badge: 'National Infrastructure',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            The <strong className="text-slate-900 dark:text-white">Government Chemist Integrated Laboratory &amp; Case Management System (GC-ILCMS)</strong> is the centralized digital platform serving the Republic of Kenya's Office of the Government Chemist.
          </p>
          <div className="p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 space-y-2">
            <h4 className="font-semibold text-amber-400 text-xs font-mono uppercase tracking-wider">
              Fundamental Operational Goals:
            </h4>
            <ul className="space-y-1.5 text-xs text-slate-600 dark:text-slate-300">
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Digitize all 8 national forensic departments (Narcotics, Toxicology, DNA, Food &amp; Drugs, Water, Criminalistics, Instruments, Procurement).</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Establish an unbroken, court-admissible Chain of Custody adhering to ISO/IEC 17025 standards.</span>
              </li>
              <li className="flex items-start gap-2">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                <span>Completely eliminate transcription latency and error through zero-retyping statutory draft report generation.</span>
              </li>
            </ul>
          </div>
        </div>
      ),
    },
    {
      title: 'Central Law: Single Digital Case File',
      category: 'Architecture',
      icon: Link2,
      badge: 'Zero Data Retyping',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            Traditional forensic laboratories suffer from file fragmentation where police intake registers, custody logsheets, instrument software runs, and final typed reports exist in separate silos.
          </p>
          <div className="rounded-xl border border-amber-500/30 bg-gradient-to-br from-amber-500/10 via-white to-slate-50 p-4 dark:from-amber-500/10 dark:via-slate-900 dark:to-slate-950 sm:p-5">
            <div className="flex flex-col gap-3 border-b border-amber-500/20 pb-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <span className="font-mono text-[10px] font-bold uppercase tracking-[0.18em] text-amber-400">
                  The GC-ILCMS Architectural Invariant
                </span>
                <h4 className="mt-1 text-sm font-bold text-slate-900 dark:text-white">One case. One digital record. No retyping.</h4>
              </div>
              <span className="inline-flex w-fit items-center gap-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 px-2.5 py-1 text-[9px] font-mono font-bold uppercase tracking-wider text-emerald-500">
                <CheckCircle2 className="h-3 w-3" />
                Traceable by design
              </span>
            </div>
            <p className="mt-4 text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">
              One case record carries the request, evidence, laboratory work, review, and statutory output from submission to release.
            </p>
            <div className="mt-4 flex flex-wrap items-center gap-1.5 rounded-lg border border-slate-200/80 bg-white/70 p-2 text-[9px] font-mono font-semibold text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300">
              {['CASE', 'EXHIBITS', 'EXAMINATIONS', 'RESULTS', 'FINDINGS', 'REPORT'].map((node, index, nodes) => (
                <React.Fragment key={node}>
                  <span className="rounded border border-slate-200 bg-white px-1.5 py-1 dark:border-slate-700 dark:bg-slate-900">{node}</span>
                  {index < nodes.length - 1 && <ArrowRight className="h-3 w-3 text-amber-500" />}
                </React.Fragment>
              ))}
            </div>
            <div className="mt-4 space-y-2">
              {[
                {
                  step: 'Step 1 of 5 • Architecture',
                  title: 'Submit the case',
                  detail: 'The investigating officer submits the request, exhibits, and supporting documents.',
                  icon: FileCheck,
                  color: 'text-amber-400',
                  border: 'border-amber-500/30',
                },
                {
                  step: 'Step 2 of 5 • Architecture',
                  title: 'Register & secure',
                  detail: 'Reception verifies identity, seals the exhibits, and opens the official case record.',
                  icon: Shield,
                  color: 'text-orange-400',
                  border: 'border-orange-500/30',
                },
                {
                  step: 'Step 3 of 5 • Architecture',
                  title: 'Route to a lab',
                  detail: 'The case is assigned to the appropriate specialist department and analyst.',
                  icon: Building2,
                  color: 'text-emerald-400',
                  border: 'border-emerald-500/30',
                },
                {
                  step: 'Step 4 of 5 • Architecture',
                  title: 'Analyse & review',
                  detail: 'Results are recorded, checked by a senior chemist, and protected by the audit trail.',
                  icon: Microscope,
                  color: 'text-sky-400',
                  border: 'border-sky-500/30',
                },
                {
                  step: 'Step 5 of 5 • Architecture',
                  title: 'Approve & release',
                  detail: 'An authorised officer approves the findings and releases the controlled statutory report.',
                  icon: Award,
                  color: 'text-violet-400',
                  border: 'border-violet-500/30',
                },
              ].map((step, index) => {
                const StepIcon = step.icon;
                return (
                <div key={step.step} className="relative flex gap-3">
                  {index < 4 && <div className="absolute bottom-[-0.5rem] left-[1.05rem] top-10 w-px bg-slate-200 dark:bg-slate-700" />}
                  <div className={`relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border ${step.border} bg-white dark:bg-slate-900 ${step.color}`}>
                    <StepIcon className="h-3.5 w-3.5" />
                  </div>
                  <div className={`min-w-0 flex-1 rounded-lg border ${step.border} bg-white/75 px-3 py-2.5 dark:bg-slate-950/50`}>
                    <span className={`block text-[9px] font-mono font-bold uppercase tracking-wider ${step.color}`}>{step.step}</span>
                    <div className="mt-1 flex items-baseline gap-2">
                      <strong className="text-xs text-slate-900 dark:text-white">{step.title}</strong>
                      <span className="hidden text-[9px] font-mono text-slate-400 sm:inline">CONTROLLED HANDOFF</span>
                    </div>
                    <span className="mt-1 block text-[11px] leading-relaxed text-slate-500 dark:text-slate-400">{step.detail}</span>
                  </div>
                </div>
                );
              })}
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Every analytical result, retention time, mass fragment, and custody signature remains connected to the same case file and flows into the controlled report without copying or re-entering data.
          </p>
        </div>
      ),
    },
    {
      title: 'Reception Desk & Officer Verification Bay',
      category: 'Intake Integrity',
      icon: Building2,
      badge: 'Physical Evidence Intake',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            When a police officer arrives from an external station (e.g. Kilindini Port Police Seizure), intake starts at the <strong className="text-slate-900 dark:text-white">Reception Desk</strong>:
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <strong className="text-sky-400 block font-semibold mb-1">Receptionist Logs:</strong>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                Officer badge number, National ID, station OB number, packaging description, and destination laboratory.
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <strong className="text-emerald-400 block font-semibold mb-1">Laboratory Verification:</strong>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                Analyst inspects officer credentials and physical tamper seals in the intake bay prior to custody acceptance.
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      title: 'Scientific Distinction: Observation ≠ Interpretation',
      category: 'Forensic Integrity',
      icon: Microscope,
      badge: 'SWGDRUG Guidelines',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            A crucial forensic integrity principle: <strong className="text-amber-400">automated instrument readings must never be conflated with final scientific conclusions</strong>.
          </p>
          <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-300">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">RAW DATA</span>
              <strong>Chromatogram &amp; Spectra</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-sky-300">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">REFERENCE DB</span>
              <strong>Candidate Match (99.2%)</strong>
            </div>
            <div className="p-2.5 rounded-lg bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 text-amber-300">
              <span className="text-[10px] text-slate-500 dark:text-slate-400 block">HUMAN OPINION</span>
              <strong>Analyst Finding</strong>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            The reporting analyst evaluates raw data against reference standards, documents adulterants (e.g. Phenacetin), and authors the official conclusion.
          </p>
        </div>
      ),
    },
    {
      title: 'Multi-Role Access Control (RBAC) & ISO Audit',
      category: 'Governance',
      icon: Shield,
      badge: 'ISO 17025 Compliance',
      content: (
        <div className="space-y-4 text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
          <p>
            Separation of duties protects court evidence from improper manipulation:
          </p>
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-purple-400 font-bold block mb-1">Executive (CEO/Vice CEO)</span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                Surveillance dashboards, national caseloads, and SLA metrics without lab entry clutter.
              </span>
            </div>
            <div className="p-3 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
              <span className="text-amber-400 font-bold block mb-1">Reporting Analysts</span>
              <span className="text-slate-500 dark:text-slate-400 text-[11px]">
                Work queues, sample preparation, GC-MS runs, and statutory draft report compilation.
              </span>
            </div>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Every user action is recorded into an append-only, tamper-evident audit ledger with timestamps and identity hashes.
          </p>
        </div>
      ),
    },
  ];

  const current = tourSteps[activeStep];
  const StepIcon = current.icon;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-50/85 dark:bg-slate-950/85 backdrop-blur-md animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-2xl bg-white dark:bg-slate-900 border border-slate-300/80 dark:border-slate-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="p-5 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <StepIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono text-amber-400 font-semibold uppercase">
                  Step {activeStep + 1} of {tourSteps.length} • {current.category}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border border-slate-300 dark:border-slate-700">
                  {current.badge}
                </span>
              </div>
              <h3 className="text-base font-bold text-slate-900 dark:text-white font-sans">{current.title}</h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body Content */}
        <div className="p-6 overflow-y-auto max-h-[60vh] space-y-4">
          {current.content}
        </div>

        {/* Step Navigation Footer */}
        <div className="p-4 bg-slate-50 dark:bg-slate-950 border-t border-slate-200 dark:border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-1.5">
            {tourSteps.map((_, i) => (
              <button
                key={i}
                onClick={() => setActiveStep(i)}
                className={`h-2 rounded-full transition-all ${
                  i === activeStep ? 'w-6 bg-amber-400' : 'w-2 bg-slate-300 dark:bg-slate-700 hover:bg-slate-400 dark:hover:bg-slate-500'
                }`}
                title={`Jump to step ${i + 1}`}
              />
            ))}
          </div>

          <div className="flex items-center gap-2">
            {activeStep > 0 && (
              <button
                onClick={() => setActiveStep(activeStep - 1)}
                className="px-3.5 py-1.5 rounded-lg text-xs font-semibold text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors"
              >
                Previous
              </button>
            )}

            {activeStep < tourSteps.length - 1 ? (
              <button
                onClick={() => setActiveStep(activeStep + 1)}
                className="px-4 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Next Step</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            ) : (
              <button
                onClick={() => {
                  onClose();
                  // onNavigate('case-file');
                }}
                className="px-4 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <span>Exit</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
