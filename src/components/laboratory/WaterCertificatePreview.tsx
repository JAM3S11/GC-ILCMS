import React, { useLayoutEffect, useRef, useState } from 'react';
import { WaterIntake } from '../../types';
import coatOfArms from '../../assets/COURTOFARMS-removebg-preview.png';
import { CERTIFICATE_LETTERHEAD, certificateInitials } from '../../lib/certificateLetterhead';
import { WATER_TEST_GROUPS, WaterTestEntry, WaterTestParameter, certificateReport } from '../../lib/waterTestParameters';

interface WaterCertificatePreviewProps {
  intake: WaterIntake;
  /** The results as currently typed, saved or not. */
  entries: Record<string, WaterTestEntry>;
  remarks: string;
  /** The copy that gets printed: full A4 size, no scaling and no on-screen ribbons. */
  printMode?: boolean;
}

// A4 at 96 dpi; the pages are laid out at this size and scaled to fit on screen.
const PAGE_WIDTH = 794;
const PAGE_HEIGHT = 1123;
const PAGE_GAP = 24;
const PAGES = 2;

/** Page 1 of the certificate ends with this parameter; the chemical table continues on page 2. */
const LAST_CHEMICAL_ROW_ON_PAGE_1 = 'fluoride';

const SERIF = "'Times New Roman', Times, serif";

/** 2026-09-23 -> 23/09/2026, as on the printed certificate. */
const formatDate = (value?: string) => {
  const match = value?.match(/^(\d{4})-(\d{2})-(\d{2})/);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value || '—';
};

const physicalRows = WATER_TEST_GROUPS[0].parameters;
const chemicalRows = WATER_TEST_GROUPS.slice(1).flatMap((group) => group.parameters);
const splitAt = chemicalRows.findIndex((parameter) => parameter.id === LAST_CHEMICAL_ROW_ON_PAGE_1) + 1;
const chemicalPage1 = chemicalRows.slice(0, splitAt);
const chemicalPage2 = chemicalRows.slice(splitAt);

/** The three bordered columns, with the parameter names standing outside the box as on the original. */
const ResultsTable: React.FC<{
  title?: string;
  rows: WaterTestParameter[];
  entries: Record<string, WaterTestEntry>;
}> = ({ title, rows, entries }) => (
  <div className="mt-3">
    {title && <p className="mb-0.5 ml-[44%] text-[11px] font-bold">{title}</p>}
    <table className="w-full border-collapse text-[12.5px] leading-[1.3]" style={{ fontFamily: SERIF }}>
      <thead>
        <tr>
          <th className="w-[44%]" />
          <th className="w-[17%] border border-black px-1.5 py-1 text-left text-[10px] font-semibold italic">Results mg/l(ppm)</th>
          <th className="w-[14%] border border-black px-1.5 py-1 text-left font-semibold">Report</th>
          <th className="border border-black px-1.5 py-1 text-left text-[10px] font-semibold italic">
            KS EAS 12:2018
            <br />
            Max. limit in mg/l(ppm)
          </th>
        </tr>
      </thead>
      <tbody>
        {rows.map((parameter) => {
          const entry = entries[parameter.id];
          const { value: report, overridden } = certificateReport(entry?.result ?? '', parameter.limit, entry?.report ?? '');
          const aal = report === 'AAL';
          return (
            <tr key={parameter.id} className={aal ? 'bg-red-100' : ''}>
              <td className="py-[2px] pr-2">{parameter.name}</td>
              <td className="border border-black px-1.5 py-[2px]">{entry?.result?.trim() || '—'}</td>
              <td className={`border border-black px-1.5 py-[2px] ${aal ? 'font-bold' : ''}`}>
                {report || '—'}
                {overridden && (
                  <span className="print:hidden" title="Set by hand, different from what the limit gives">
                    *
                  </span>
                )}
              </td>
              <td className="border border-black px-1.5 py-[2px] font-bold">{parameter.limit}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </div>
);

const PageFooter: React.FC<{ labNo: string; page: number }> = ({ labNo, page }) => (
  <footer className="absolute inset-x-[16mm] bottom-[10mm] text-center text-[10px]" style={{ fontFamily: SERIF }}>
    <p className="text-left font-bold">Lab No:{labNo}</p>
    <p className="text-left italic">{CERTIFICATE_LETTERHEAD.footerDisclaimer}</p>
    <p>
      Page {page} of {PAGES}
    </p>
  </footer>
);

/** One A4 sheet. */
const Sheet: React.FC<{ children: React.ReactNode; last?: boolean }> = ({ children, last }) => (
  <section
    className="certificate-page relative overflow-hidden bg-white text-black shadow-md"
    style={{ width: PAGE_WIDTH, height: PAGE_HEIGHT, padding: '14mm 16mm', fontFamily: SERIF, marginBottom: last ? 0 : PAGE_GAP }}
  >
    {children}
  </section>
);

/**
 * The Certificate of Analysis of Water as an A4 document of exactly two pages, laid out like the
 * official Government Chemist certificate. Everything comes from the exhibit and the results being
 * typed; the letterhead wording comes from `certificateLetterhead.ts`. It is always a white page with
 * black ink (never themed), and on screen it is scaled to the width it is given.
 */
export const WaterCertificatePreview: React.FC<WaterCertificatePreviewProps> = ({ intake, entries, remarks, printMode = false }) => {
  const frame = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const element = frame.current;
    if (printMode || !element) return undefined;
    const fit = () => setScale(Math.min(1, element.clientWidth / PAGE_WIDTH));
    fit();
    const observer = new ResizeObserver(fit);
    observer.observe(element);
    return () => observer.disconnect();
  }, [printMode]);

  const issued = !!intake.certificateIssuedAt;
  // The date is the day the Head approved the analysis officer's work (printing the certificate approves it).
  const documentDate = formatDate(intake.certificateIssuedAt);
  const source = [intake.sourceType, intake.locationFrom, intake.dischargeTo ? `→ ${intake.dischargeTo}` : '']
    .filter(Boolean)
    .join(' ');
  const initials = certificateInitials(intake.analysisOfficer, intake.certificateIssuedBy);
  const totalHeight = PAGE_HEIGHT * PAGES + PAGE_GAP * (PAGES - 1);

  return (
    <div className={printMode ? 'w-full' : 'print-area w-full'} aria-label="Certificate of Analysis of Water">
      {!issued && !printMode && (
        <div className="mb-3 rounded border border-dashed border-amber-400 bg-amber-50 px-3 py-1.5 text-center text-[11px] font-semibold uppercase tracking-wider text-amber-700 print:hidden">
          Draft preview — not yet approved by the Head
        </div>
      )}
      <div ref={frame} className="certificate-frame w-full" style={{ height: totalHeight * scale }}>
        <div className="certificate-scale" style={{ width: PAGE_WIDTH, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
          {/* ------------------------------ Page 1 ------------------------------ */}
          <Sheet>
            <div className="flex justify-center">
              <img src={coatOfArms} alt="Coat of arms of Kenya" className="h-[26mm] w-auto object-contain" />
            </div>
            <div className="mt-1 text-center text-[11px] font-bold leading-tight">
              {CERTIFICATE_LETTERHEAD.officeLines.map((line) => (
                <p key={line}>{line}</p>
              ))}
            </div>

            <div className="mt-3 flex items-start justify-between text-[9.5px] font-bold leading-snug">
              <div>
                {CERTIFICATE_LETTERHEAD.contacts.map((contact) => (
                  <p key={contact.label}>
                    {contact.label}: {contact.value}
                  </p>
                ))}
              </div>
              <div className="text-center">
                {CERTIFICATE_LETTERHEAD.department.map((line) => (
                  <p key={line}>{line}</p>
                ))}
              </div>
            </div>

            <p className="mt-2 text-[10px] italic">{CERTIFICATE_LETTERHEAD.replyNote}</p>
            <div className="mt-1 flex items-baseline justify-between text-[12px]">
              <span>{intake.labReference}</span>
              <span>{documentDate}</span>
            </div>
            <h2 className="mt-1 text-center text-[13px] font-bold underline">CERTIFICATE OF ANALYSIS OF WATER</h2>

            <div className="mt-3 flex justify-between gap-6 text-[12px] leading-snug">
              <div className="min-w-0 flex-1">
                <p>
                  <strong>Laboratory sample No:</strong> {intake.exhibitId}
                </p>
                <p className="mt-2">
                  <strong>Sender:</strong> {intake.senderName}
                </p>
                <p>{intake.senderAddress}</p>
                <p className="mt-1">
                  <strong>Source:</strong> {source || '—'}
                </p>
              </div>
              <div className="shrink-0 pt-4">
                <p>
                  <strong>Date Received:</strong> {formatDate(intake.dateReceived)}
                </p>
                <p className="mt-3">
                  <strong>Date sample taken:</strong> {formatDate(intake.dateSampled)}
                </p>
              </div>
            </div>

            <ResultsTable title="PHYSICAL TESTS" rows={physicalRows} entries={entries} />
            <ResultsTable title="CHEMICAL TESTS" rows={chemicalPage1} entries={entries} />
            <p className="mt-3 text-[11px] font-bold">P.T.O</p>
            <PageFooter labNo={intake.exhibitId} page={1} />
          </Sheet>

          {/* ------------------------------ Page 2 ------------------------------ */}
          <Sheet last>
            <ResultsTable rows={chemicalPage2} entries={entries} />

            <div className="mt-6 space-y-0.5 text-[12px]">
              <p>
                <strong>*BDL-</strong> Below Detection Level of the method
              </p>
              <p>
                <strong>*AAL-</strong> Above the Acceptable Limit
              </p>
            </div>

            <div className="mt-5 space-y-3 text-[12px]">
              {CERTIFICATE_LETTERHEAD.closingStatements.map((line) => (
                <p key={line}>{line}</p>
              ))}
              {remarks.trim() && (
                <p className="whitespace-pre-wrap">
                  <strong>Remarks:</strong> {remarks.trim().slice(0, 600)}
                </p>
              )}
            </div>

            <div className="mt-14 flex items-start justify-between text-[12px]">
              <div>
                <p>Date: {documentDate}</p>
                <p>{initials}</p>
              </div>
              <div className="text-center font-bold">
                <p>{(intake.analysisOfficer ?? '—').toUpperCase()}</p>
                <p>{CERTIFICATE_LETTERHEAD.signatoryTitle}</p>
              </div>
            </div>
            <p className="mt-3 text-center text-[12px] font-bold">‘END’</p>
            <PageFooter labNo={intake.exhibitId} page={2} />
          </Sheet>
        </div>
      </div>
    </div>
  );
};
