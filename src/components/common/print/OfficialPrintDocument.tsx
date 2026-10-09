import React from 'react';
import coatOfArms from '../../../assets/COURTOFARMS-removebg-preview.png';
import { Portal } from '../Portal';

/* ---------------------------------------------------------------------------
 * OfficialPrintDocument — an A4 official document: coat-of-arms letterhead,
 * a title band, the scope line, the body (usually a ruled table), sign-off
 * lines and a records footer. Mounted in <body> and hidden on screen;
 * `printOfficialDocument()` prints only it. Used for the case registers and
 * the reception visitors' register.
 * --------------------------------------------------------------------------- */

/** Prints the mounted official document and nothing else. */
export const printOfficialDocument = (orientation: 'portrait' | 'landscape' = 'landscape') => {
  document.body.dataset.printTarget = 'official-document';
  // The browser only honours an unnamed @page size reliably, so it is set for this print only.
  const pageStyle = document.createElement('style');
  pageStyle.textContent = `@page { size: A4 ${orientation}; margin: 12mm 10mm; }`;
  document.head.appendChild(pageStyle);
  const clear = () => {
    delete document.body.dataset.printTarget;
    pageStyle.remove();
    window.removeEventListener('afterprint', clear);
  };
  window.addEventListener('afterprint', clear);
  window.print();
};

/** Ruled cell for tables inside the document. */
export const printCell = 'border border-slate-400 px-1.5 py-1 align-top';

interface OfficialPrintDocumentProps {
  /** Line under the department, e.g. "Water & Environment Laboratory". */
  office: string;
  /** Title band, e.g. "Case register". */
  title: string;
  /** Left of the meta line, e.g. the filters in force. */
  scope: React.ReactNode;
  entries: number;
  /** Sign-off roles, each gets Name / Signature / Date lines. */
  signOff?: string[];
  /** Notes printed under the body (totals, legends). */
  notes?: React.ReactNode;
  children: React.ReactNode;
}

export const OfficialPrintDocument: React.FC<OfficialPrintDocumentProps> = ({
  office,
  title,
  scope,
  entries,
  signOff = ['Prepared by', 'Verified by (Head of Department)'],
  notes,
  children,
}) => {
  const printedOn = new Date().toLocaleString('en-GB', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' });

  return (
    <Portal>
      <div className="official-print-root bg-white text-[10px] leading-snug text-black" aria-hidden="true">
        <header className="mb-3 flex flex-col items-center text-center">
          <img src={coatOfArms} alt="" className="h-14 w-auto" />
          <div className="mt-1 text-[13px] font-bold tracking-[0.12em]">REPUBLIC OF KENYA</div>
          <div className="text-[11px] font-semibold tracking-[0.08em]">GOVERNMENT CHEMIST DEPARTMENT</div>
          <div className="text-[11px] uppercase tracking-[0.06em]">{office}</div>
          <div className="mt-2 border-y-2 border-black px-6 py-0.5 text-[13px] font-bold uppercase tracking-[0.1em]">{title}</div>
        </header>

        <div className="mb-2 flex justify-between gap-4 text-[9.5px]">
          <span><strong>Scope:</strong> {scope}</span>
          <span className="shrink-0"><strong>Entries:</strong> {entries} · <strong>Printed:</strong> {printedOn}</span>
        </div>

        {children}

        {notes && <div className="mt-2 flex flex-wrap gap-x-4 text-[9.5px]">{notes}</div>}

        {signOff.length > 0 && (
          <div className="mt-8 grid grid-cols-2 gap-10 break-inside-avoid text-[10px]">
            {signOff.map((role) => (
              <div key={role} className="space-y-4">
                <div className="font-semibold">{role}</div>
                {['Name', 'Signature', 'Date'].map((line) => (
                  <div key={line} className="flex gap-2">
                    <span className="w-20">{line}:</span>
                    <span className="flex-1 border-b border-dotted border-black" />
                  </div>
                ))}
              </div>
            ))}
          </div>
        )}

        <footer className="mt-6 border-t border-slate-400 pt-1 text-center text-[8.5px] text-slate-600">
          Generated from GC-ILCMS, the Government Chemist laboratory information system. Official record: handle in accordance with the
          Department's records management procedures.
        </footer>
      </div>
    </Portal>
  );
};
