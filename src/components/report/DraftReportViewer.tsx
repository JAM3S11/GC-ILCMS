import React, { useState } from 'react';
import {
  FileText,
  Printer,
  Download,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Edit3,
  Save,
  Shield,
  Clock,
  Send,
  Sparkles,
} from 'lucide-react';
import { DraftReport, ForensicCase } from '../../types';
import { LogoPlaceholder } from '../common/LogoPlaceholder';
import { CertificateExportModal } from './CertificateExportModal';

interface DraftReportViewerProps {
  caseData: ForensicCase;
  onSaveDraft?: (updatedReport: DraftReport) => void;
}

export const DraftReportViewer: React.FC<DraftReportViewerProps> = ({
  caseData,
  onSaveDraft,
}) => {
  const [isEditing, setIsEditing] = useState(false);
  const [savedSuccess, setSavedSuccess] = useState(false);
  const [showCertificateModal, setShowCertificateModal] = useState(false);

  // Editable fields initialized from case data without retyping
  const [findingsText, setFindingsText] = useState(
    caseData.draftReport?.sections.findings || ''
  );
  const [conclusionText, setConclusionText] = useState(
    caseData.draftReport?.sections.conclusion || ''
  );
  const [interpretationText, setInterpretationText] = useState(
    caseData.draftReport?.sections.scientificInterpretation || ''
  );

  const report = caseData.draftReport;

  if (!report) {
    return (
      <div className="p-8 text-center text-slate-500 bg-white rounded-2xl border border-slate-200 dark:text-slate-400 dark:bg-slate-900 dark:border-slate-800">
        No draft report compiled yet for case {caseData.caseNumber}.
      </div>
    );
  }

  const handleSave = () => {
    if (onSaveDraft && report) {
      const updated: DraftReport = {
        ...report,
        sections: {
          ...report.sections,
          findings: findingsText,
          conclusion: conclusionText,
          scientificInterpretation: interpretationText,
        },
      };
      onSaveDraft(updated);
    }
    setIsEditing(false);
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="space-y-6">
      {/* Action and Disclaimer Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-4 dark:bg-slate-900 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded text-[11px] font-mono font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30">
              STATUS: DRAFT REPORT (INTERNAL REVIEW)
            </span>
            <span className="text-xs text-slate-500 font-mono dark:text-slate-400">
              Auto-generated from Case {caseData.caseNumber}
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-1 dark:text-slate-400">
            Zero re-typing required. All case metadata, exhibits, spectra, and interpretations auto-transferred.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {isEditing ? (
            <button
              onClick={handleSave}
              className="px-3.5 py-1.5 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              <span>Save Draft Changes</span>
            </button>
          ) : (
            <button
              onClick={() => setIsEditing(true)}
              className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs flex items-center gap-1.5 border border-slate-200 cursor-pointer dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-slate-200 dark:border-slate-700"
            >
              <Edit3 className="w-3.5 h-3.5 text-amber-400" />
              <span>Edit Draft Text</span>
            </button>
          )}

          <button
            onClick={() => setShowCertificateModal(true)}
            className="px-3.5 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 shadow-sm cursor-pointer"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Export Official Certificate</span>
          </button>

          <button
            onClick={handlePrint}
            className="px-3.5 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-900 font-semibold text-xs flex items-center gap-1.5 border border-slate-200 cursor-pointer dark:bg-slate-800 dark:hover:bg-slate-700 dark:text-white dark:border-slate-700"
          >
            <Printer className="w-3.5 h-3.5" />
            <span>Print Draft</span>
          </button>
        </div>
      </div>

      {savedSuccess && (
        <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          <span>Draft report changes saved successfully into the digital case record.</span>
        </div>
      )}

      {/* FORMAL GOVERNMENT CHEMIST CERTIFICATE DRAFT VIEW */}
      <div className="relative p-4 sm:p-8 md:p-12 rounded-2xl bg-white text-slate-900 border border-slate-300 shadow-2xl space-y-8 font-sans max-w-4xl mx-auto overflow-hidden">
        {/* BIG WATERMARK */}
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-5 rotate-[-30deg]">
          <span className="text-8xl md:text-9xl font-bold font-sans uppercase tracking-widest text-slate-900">
            DRAFT
          </span>
        </div>

        {/* OFFICIAL HEADER */}
        <div className="text-center border-b-2 border-slate-900 pb-6 space-y-2">
          <div className="flex justify-center mb-2">
            <LogoPlaceholder size="md" variant="light" />
          </div>
          <h2 className="text-sm font-bold tracking-widest uppercase text-slate-700 font-sans">
            REPUBLIC OF KENYA • MINISTRY OF HEALTH
          </h2>
          <h1 className="text-xl md:text-2xl font-sans font-black tracking-tight text-slate-900 uppercase">
            OFFICE OF THE GOVERNMENT CHEMIST
          </h1>
          <p className="text-xs font-sans italic text-slate-600">
            Forensic Science Laboratories • P.O. Box 20753 - 00202, Nairobi, Kenya
          </p>
          <div className="inline-block px-4 py-1 rounded bg-amber-100 border border-amber-300 text-amber-900 text-xs font-mono font-bold uppercase tracking-wider mt-2">
            PRELIMINARY DRAFT REPORT — FOR INTERNAL PEER REVIEW ONLY
          </div>
        </div>

        {/* METADATA REFERENCE TABLE */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 p-4 rounded-lg bg-slate-50 border border-slate-200 text-xs font-mono">
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Case File Number:</span>
            <strong className="text-slate-900 text-sm font-bold">{report.sections.caseInformation.caseNumber}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Laboratory Reference:</span>
            <strong className="text-slate-900 text-sm font-bold">{report.sections.caseInformation.labRefNumber}</strong>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Date of Examination:</span>
            <span className="text-slate-800 font-medium">{report.sections.caseInformation.dateReceived}</span>
          </div>
          <div>
            <span className="text-slate-500 block text-[10px] uppercase">Report Number:</span>
            <span className="text-slate-800 font-bold">{report.reportNumber}</span>
          </div>
        </div>

        {/* SECTION 1: INVESTIGATING OFFICER & REQUESTING STATION */}
        <div className="space-y-2 text-xs">
          <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
            1. Requesting Authority &amp; Officer Information
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-slate-800">
            <div>
              <span className="text-slate-500 block text-[11px]">Requesting Institution:</span>
              <span className="font-semibold">{report.sections.caseInformation.requestingStation}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Investigating Officer:</span>
              <span className="font-semibold">{report.sections.caseInformation.investigatingOfficer}</span>
            </div>
            <div>
              <span className="text-slate-500 block text-[11px]">Service Badge Number:</span>
              <span className="font-mono font-semibold">{report.sections.caseInformation.badgeNumber}</span>
            </div>
          </div>
        </div>

        {/* SECTION 2: PURPOSE OF REQUEST */}
        <div className="space-y-1.5 text-xs">
          <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
            2. Request for Examination
          </h3>
          <p className="text-slate-800 leading-relaxed">{report.sections.request}</p>
        </div>

        {/* SECTION 3: EXHIBITS & SAMPLES RECEIVED */}
        <div className="space-y-1.5 text-xs">
          <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
            3. Exhibits / Items Received Under Verified Seal
          </h3>
          <ul className="list-disc list-inside space-y-1 text-slate-800">
            {report.sections.itemsReceived.map((item, i) => (
              <li key={i} className="leading-relaxed font-mono text-[11px]">
                {item}
              </li>
            ))}
          </ul>
        </div>

        {/* SECTION 4: EXAMINATION METHODS */}
        <div className="space-y-1.5 text-xs">
          <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
            4. Analytical Methods &amp; Scientific Standard Operating Procedures
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-800">
            {report.sections.examinationMethods.map((method, idx) => (
              <div key={idx} className="p-2 rounded bg-slate-50 border border-slate-200 flex items-center gap-2">
                <span className="w-1.5 h-1.5 rounded-full bg-slate-900"></span>
                <span className="font-medium text-[11px]">{method}</span>
              </div>
            ))}
          </div>
        </div>

        {/* SECTION 5: ANALYTICAL RESULTS */}
        <div className="space-y-1.5 text-xs">
          <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1">
            5. Instrumental &amp; Chemical Results
          </h3>
          <div className="p-3 rounded bg-slate-50 border border-slate-200 text-slate-800 whitespace-pre-line font-mono text-[11px] leading-relaxed">
            {report.sections.results}
          </div>
        </div>

        {/* SECTION 6: SCIENTIFIC INTERPRETATION */}
        <div className="space-y-1.5 text-xs">
          <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
            <span>6. Scientific Interpretation &amp; Forensic Evaluation</span>
            {isEditing && <span className="text-[10px] text-amber-600 lowercase font-normal">(editable)</span>}
          </h3>
          {isEditing ? (
            <textarea
              rows={3}
              value={interpretationText}
              onChange={(e) => setInterpretationText(e.target.value)}
              className="w-full p-2 text-xs border border-amber-400 rounded bg-amber-50"
            />
          ) : (
            <p className="text-slate-800 leading-relaxed italic">{interpretationText}</p>
          )}
        </div>

        {/* SECTION 7: FORMAL FINDINGS */}
        <div className="space-y-1.5 text-xs">
          <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
            <span>7. Findings of Chemical Examination</span>
            {isEditing && <span className="text-[10px] text-amber-600 lowercase font-normal">(editable)</span>}
          </h3>
          {isEditing ? (
            <textarea
              rows={3}
              value={findingsText}
              onChange={(e) => setFindingsText(e.target.value)}
              className="w-full p-2 text-xs border border-amber-400 rounded bg-amber-50"
            />
          ) : (
            <div className="p-3 rounded bg-slate-50 border border-slate-200 font-semibold text-slate-900 whitespace-pre-line">
              {findingsText}
            </div>
          )}
        </div>

        {/* SECTION 8: STATUTORY CONCLUSION */}
        <div className="space-y-1.5 text-xs">
          <h3 className="text-xs font-sans font-bold uppercase tracking-wider text-slate-900 border-b border-slate-200 pb-1 flex items-center justify-between">
            <span>8. Scientific Conclusion &amp; Statutory Certification</span>
            {isEditing && <span className="text-[10px] text-amber-600 lowercase font-normal">(editable)</span>}
          </h3>
          {isEditing ? (
            <textarea
              rows={3}
              value={conclusionText}
              onChange={(e) => setConclusionText(e.target.value)}
              className="w-full p-2 text-xs border border-amber-400 rounded bg-amber-50"
            />
          ) : (
            <p className="text-slate-800 leading-relaxed font-medium">{conclusionText}</p>
          )}
        </div>

        {/* ANALYST SIGNATURE BLOCK & DISCLAIMER */}
        <div className="pt-6 border-t-2 border-slate-900 space-y-6">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 text-xs">
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-mono text-slate-500">Prepared by Reporting Analyst:</div>
              <div className="font-bold text-slate-900 text-sm">{report.analystName}</div>
              <div className="text-slate-600 text-[11px]">{report.analystTitle}</div>
              <div className="text-slate-500 text-[10px] font-mono">Division of Narcotics &amp; Forensic Chemistry</div>
              <div className="text-[10px] font-mono text-slate-400">Date Generated: {report.dateGenerated}</div>
            </div>

            <div className="p-3 rounded border border-dashed border-slate-400 bg-slate-50 text-center sm:text-right">
              <div className="text-[10px] font-mono uppercase text-slate-500 mb-1">
                Forensic Laboratory Quality Stamp
              </div>
              <div className="inline-block px-3 py-1 bg-amber-200 border border-amber-400 text-amber-900 text-[10px] font-mono font-bold rounded">
                DRAFT — PENDING PEER &amp; HoD REVIEW
              </div>
            </div>
          </div>

          <div className="p-3 rounded bg-rose-50 border border-rose-200 text-[10px] text-rose-800 font-mono leading-relaxed">
            <strong className="block mb-0.5">LEGAL DISCLAIMER:</strong>
            {report.sections.disclaimer}
          </div>
        </div>
      </div>

      {/* Official Court Certificate Export Modal */}
      {caseData.draftReport && (
        <CertificateExportModal
          isOpen={showCertificateModal}
          onClose={() => setShowCertificateModal(false)}
          caseData={caseData}
          report={caseData.draftReport}
        />
      )}
    </div>
  );
};
