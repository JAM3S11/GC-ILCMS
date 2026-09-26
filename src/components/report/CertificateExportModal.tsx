import React from 'react';
import {
  X,
  Printer,
  Download,
  CheckCircle2,
  Shield,
  QrCode,
  FileCheck,
  Building2,
  Calendar,
  Lock,
} from 'lucide-react';
import { ForensicCase, DraftReport } from '../../types';
import { LogoPlaceholder } from '../common/LogoPlaceholder';

interface CertificateExportModalProps {
  isOpen: boolean;
  onClose: () => void;
  caseData: ForensicCase;
  report: DraftReport;
}

export const CertificateExportModal: React.FC<CertificateExportModalProps> = ({
  isOpen,
  onClose,
  caseData,
  report,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md overflow-y-auto animate-fade-in"
      onClick={onClose}
    >
      <div
        className="w-full max-w-4xl bg-white border border-slate-200 rounded-2xl shadow-2xl overflow-hidden flex flex-col my-auto dark:bg-slate-900 dark:border-slate-700/80"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Action Header */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex items-center justify-between text-xs dark:bg-slate-950 dark:border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-400">
              <FileCheck className="w-4 h-4" />
            </div>
            <div>
              <span className="font-bold text-slate-900 text-sm dark:text-white">Official Forensic Certificate Preview</span>
              <span className="text-slate-500 block text-[11px] font-mono dark:text-slate-400">
                Statutory Certificate of Chemical Analysis (Cap 245, Laws of Kenya)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Print Certificate</span>
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-500 hover:text-slate-900 hover:bg-slate-100 transition-colors dark:text-slate-400 dark:hover:text-white dark:hover:bg-slate-800"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Certificate Paper Sheet */}
        <div className="p-6 md:p-10 bg-slate-100 text-slate-900 overflow-y-auto max-h-[75vh] font-sans selection:bg-amber-200">
          <div className="relative p-8 md:p-12 bg-white border-2 border-slate-800 shadow-lg rounded space-y-6">
            {/* Watermark */}
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none opacity-5 rotate-[-25deg]">
              <span className="text-8xl font-black uppercase tracking-widest text-slate-900">
                GOVERNMENT CHEMIST
              </span>
            </div>

            {/* Official Header */}
            <div className="text-center border-b-2 border-slate-900 pb-5 space-y-1.5">
              <div className="flex justify-center mb-1">
                <LogoPlaceholder size="md" variant="light" />
              </div>
              <h2 className="text-xs font-bold uppercase tracking-widest text-slate-800">
                REPUBLIC OF KENYA • OFFICE OF THE GOVERNMENT CHEMIST
              </h2>
              <h1 className="text-xl md:text-2xl font-bold uppercase text-slate-950">
                CERTIFICATE OF FORENSIC EXAMINATION &amp; ANALYSIS
              </h1>
              <p className="text-[11px] italic text-slate-600">
                Issued Under Section 77 of the Evidence Act (Cap 80) &amp; The Narcotic Drugs and Psychotropic Substances Control Act
              </p>
            </div>

            {/* Case Registry Meta Bar */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-3 bg-slate-50 border border-slate-300 rounded font-mono text-[11px]">
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">Official Case Number</span>
                <strong className="text-slate-900 text-xs">{caseData.caseNumber}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">Laboratory Reference</span>
                <strong className="text-slate-900 text-xs">{caseData.labReferenceNumber}</strong>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">Police Station / OB</span>
                <span className="text-slate-800 font-semibold">{caseData.requestingInstitution} (Badge {caseData.officerBadge})</span>
              </div>
              <div>
                <span className="text-slate-500 block text-[9px] uppercase">Certificate Number</span>
                <span className="text-slate-800 font-bold">{report.reportNumber}</span>
              </div>
            </div>

            {/* Content Sections */}
            <div className="space-y-4 text-xs leading-relaxed font-sans text-slate-800">
              <div>
                <h3 className="font-sans font-bold uppercase text-xs text-slate-950 border-b border-slate-300 pb-1 mb-1.5">
                  1. Requesting Officer &amp; Submission Credentials
                </h3>
                <p>
                  To the Officer Commanding Station, <strong>{caseData.requestingInstitution}</strong>. I, the undersigned Government Analyst, hereby certify that on{' '}
                  <strong>{caseData.dateReceived}</strong>, exhibits marked <strong>{caseData.exhibits[0]?.sealNumber}</strong> were received by hand from{' '}
                  <strong>{caseData.investigatingOfficer}</strong> (Badge: {caseData.officerBadge}).
                </p>
              </div>

              <div>
                <h3 className="font-sans font-bold uppercase text-xs text-slate-950 border-b border-slate-300 pb-1 mb-1.5">
                  2. Physical Exhibits &amp; Verified Markings
                </h3>
                <ul className="list-disc list-inside space-y-1 font-mono text-[11px]">
                  {report.sections.itemsReceived.map((item, idx) => (
                    <li key={idx}>{item}</li>
                  ))}
                </ul>
              </div>

              <div>
                <h3 className="font-sans font-bold uppercase text-xs text-slate-950 border-b border-slate-300 pb-1 mb-1.5">
                  3. Standard Scientific Examination Methods Applied
                </h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5 font-mono text-[11px]">
                  {report.sections.examinationMethods.map((m, i) => (
                    <div key={i} className="p-1.5 rounded bg-slate-50 border border-slate-200">
                      ✓ {m}
                    </div>
                  ))}
                </div>
              </div>

              <div>
                <h3 className="font-sans font-bold uppercase text-xs text-slate-950 border-b border-slate-300 pb-1 mb-1.5">
                  4. Certified Findings of Examination
                </h3>
                <div className="p-3 bg-slate-50 border border-slate-300 rounded font-semibold text-slate-900 whitespace-pre-line text-xs">
                  {report.sections.findings}
                </div>
              </div>

              <div>
                <h3 className="font-sans font-bold uppercase text-xs text-slate-950 border-b border-slate-300 pb-1 mb-1.5">
                  5. Statutory Certification &amp; Conclusion
                </h3>
                <p className="font-sans italic text-slate-900 leading-normal">
                  "{report.sections.conclusion}"
                </p>
              </div>
            </div>

            {/* Signature Block & Security Stamp */}
            <div className="pt-6 border-t-2 border-slate-900 flex flex-col sm:flex-row justify-between items-start sm:items-end gap-6 text-xs">
              <div className="space-y-1">
                <div className="text-[10px] font-mono uppercase text-slate-500">Certified by Gazetted Analyst:</div>
                <div className="font-sans font-bold text-sm text-slate-950">{report.analystName}</div>
                <div className="text-slate-700 text-xs">{report.analystTitle}</div>
                <div className="text-slate-500 text-[11px]">Department of Forensic Chemistry &amp; Narcotics</div>
                <div className="font-mono text-[10px] text-slate-400 mt-1">Date Signed: {report.dateGenerated}</div>
              </div>

              {/* Quality & Security Seal */}
              <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-400 rounded">
                <div className="p-1.5 bg-white border border-slate-300 rounded">
                  <QrCode className="w-10 h-10 text-slate-800" />
                </div>
                <div className="text-[10px] font-mono space-y-0.5">
                  <div className="font-bold text-emerald-800">ISO/IEC 17025 ACCREDITED</div>
                  <div className="text-slate-500">DIGITAL HASH: e49a..b87c</div>
                  <div className="text-amber-800 font-semibold">CAP 245 FORENSIC STAMP</div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
