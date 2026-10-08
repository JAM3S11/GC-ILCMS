import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MM_PX } from './a4Preview';

/** Everything printed on the Certificate of Analysis – Draft Report (GCD/GL/01/LWG/FOODS/F12). */
export interface DraftReportData {
  labSampleNo: string;
  sendersRef: string;
  senderContacts: string;
  dateReceived: string;
  analysisStartedOn: string;
  sampleDescription: string;
  analysisRequired: string;
  testMethods: string;
  analyticalReport: string;
  remarks: string;
  copyType: 'ORIGINAL' | 'DUPLICATE';
  analysedBy: string;
  analystSignature?: string | null;
  analysedDate: string;
  checkedBy: string;
  checkerSignature?: string | null;
  checkedDate: string;
  approved: boolean;
}

const paperDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
};

// Page geometry (mm).
const PAD_X = 18;
const PAD_TOP = 12;
const PAD_BOTTOM = 10;
const FOOTER = 22;
const SIGNATURES = 40;
const BODY_MM = 297 - PAD_TOP - PAD_BOTTOM - FOOTER - 4;

const hand = 'font-[cursive] text-[11.5pt] leading-[6.4mm] text-[#1e3a8a]';
const label = 'shrink-0 text-[10.5pt] font-bold';

/** Long text is cut at word boundaries so it can flow across pages. */
const chunks = (text: string, size = 420) => {
  const out: string[] = [];
  text.split('\n').forEach((paragraph) => {
    let rest = paragraph;
    while (rest.length > size) {
      const cut = rest.lastIndexOf(' ', size);
      const at = cut > size / 2 ? cut : size;
      out.push(rest.slice(0, at));
      rest = rest.slice(at).trimStart();
    }
    out.push(rest);
  });
  return out;
};

type Block = { key: string; node: React.ReactNode };

const buildBlocks = (data: DraftReportData): Block[] => {
  const blocks: Block[] = [];
  // A bold label with the value beside it; long values continue on the lines below.
  const labelled = (key: string, title: string, value: string, gap = '3mm') => {
    const parts = chunks(value || ' ', 300);
    parts.forEach((part, index) =>
      blocks.push({
        key: `${key}-${index}`,
        node: (
          <div className="flex items-baseline gap-[2mm]" style={{ paddingTop: index === 0 ? gap : 0 }}>
            {index === 0 && <span className={label}>{title}</span>}
            <span className={`${hand} min-w-0 flex-1 whitespace-pre-wrap break-words ${index === 0 ? '' : 'pl-[4mm]'}`}>{part || ' '}</span>
          </div>
        ),
      }),
    );
  };

  blocks.push({
    key: 'head',
    node: (
      <div>
        <div className="flex justify-end">
          <div className="border-[1.5px] border-[#333] px-[3mm] py-[1mm] font-mono text-[15pt] font-bold tracking-[0.04em] text-[#333]">
            {data.copyType === 'DUPLICATE' ? 'DUPLICATE COPY' : 'ORIGINAL COPY'}
          </div>
        </div>
        <h1 className="mt-[6mm] border-b-[1.5px] border-[#222] pb-[1mm] text-center text-[11.5pt] font-bold tracking-[0.02em]">
          CERTIFICATE OF ANALYSIS-DRAFT REPORT
        </h1>
        <div className="mt-[2mm] grid grid-cols-2 gap-[8mm]">
          <div className="flex flex-col justify-between gap-[10mm]">
            <div className="flex items-baseline gap-[2mm]">
              <span className={label}>Lab Sample No:</span>
              <span className={`${hand} break-all`}>{data.labSampleNo}</span>
            </div>
            <div className="flex items-baseline gap-[2mm]">
              <span className={label}>Sender&apos;s Ref:</span>
              <span className={`${hand} break-words`}>{data.sendersRef}</span>
            </div>
          </div>
          <div>
            <div className={label}>Sender&apos;s Address/Contacts:</div>
            <div className={`${hand} whitespace-pre-wrap break-words`}>{data.senderContacts}</div>
            <div className="mt-[1mm] flex items-baseline gap-[2mm]">
              <span className={label}>Date received:</span>
              <span className={hand}>{paperDate(data.dateReceived)}</span>
            </div>
          </div>
        </div>
      </div>
    ),
  });
  labelled('started', 'Date Analysis Started:', paperDate(data.analysisStartedOn), '6mm');
  blocks.push({ key: 'desc-label', node: <div className={`${label} pt-[1mm]`}>Description of sample(s):</div> });
  chunks(data.sampleDescription || ' ', 300).forEach((part, index) =>
    blocks.push({ key: `desc-${index}`, node: <div className={`${hand} whitespace-pre-wrap break-words pl-[10mm]`}>{part || ' '}</div> }),
  );
  labelled('analysis', 'Analysis required:', data.analysisRequired);
  labelled('methods', 'Test Method(s):', data.testMethods);
  blocks.push({ key: 'report-label', node: <div className={`${label} pt-[4mm]`}>Analytical Report:</div> });
  chunks(data.analyticalReport || ' ').forEach((part, index) =>
    blocks.push({ key: `report-${index}`, node: <div className={`${hand} whitespace-pre-wrap break-words pt-[2mm] leading-[8mm]`}>{part || ' '}</div> }),
  );
  if (data.remarks.trim()) labelled('remarks', 'Remarks:', data.remarks, '5mm');
  return blocks;
};

/** Greedy page packing from measured heights; the last page keeps room for the signatures. */
const paginate = (heights: number[]) => {
  const limit = BODY_MM * MM_PX;
  const pages: number[][] = [[]];
  let used = 0;
  heights.forEach((height, index) => {
    if (used + height > limit && pages[pages.length - 1].length) {
      pages.push([]);
      used = 0;
    }
    pages[pages.length - 1].push(index);
    used += height;
  });
  if (used + SIGNATURES * MM_PX > limit) pages.push([]);
  return pages;
};

const Footer: React.FC<{ page: number; total: number }> = ({ page, total }) => (
  <div className="absolute inset-x-[18mm] bottom-[10mm] grid grid-cols-[1fr_auto] border border-[#222] text-[9.5pt]">
    <div className="flex items-end border-r border-[#222] px-[2mm] py-[1.5mm] font-bold">CERTIFICATE OF ANALYSIS DRAFT REPORT</div>
    <div className="min-w-[62mm]">
      <div className="border-b border-[#222] px-[2mm] py-[0.6mm] font-bold">GCD/GL/01/LWG/FOODS/F12</div>
      <div className="border-b border-[#222] px-[2mm] py-[0.6mm]">VERSION: 1</div>
      <div className="px-[2mm] py-[0.6mm]">PAGES: Page {page} of {total}</div>
    </div>
  </div>
);

const SignatureRow: React.FC<{ title: string; name: string; signature?: string | null; date: string }> = ({ title, name, signature, date }) => (
  <div className="flex items-end gap-[2.5mm]">
    <span className={`${label} w-[24mm]`}>{title}</span>
    <span className={`min-w-0 flex-[3] truncate border-b border-dotted border-[#222] ${hand}`}>{name || ' '}</span>
    <span className={label}>Signature:</span>
    <span className="relative h-[10mm] flex-[2] border-b border-dotted border-[#222]">
      {signature && <img src={signature} alt="" className="absolute bottom-[0.5mm] left-[1mm] h-full max-w-full object-contain" />}
    </span>
    <span className={label}>Date:</span>
    <span className={`w-[24mm] shrink-0 border-b border-dotted border-[#222] ${hand}`}>{date ? paperDate(date) : ' '}</span>
  </div>
);

/**
 * The Certificate of Analysis – Draft Report as one or more A4 pages, laid out
 * like the paper draft. The copy-type stamp and header sit on page 1; text flows
 * onto further pages with the footer repeated and numbered; the signatures and the
 * "Approved" mark sit on the last page. Used for the preview, printing and the PDF.
 */
export const DraftReportPages: React.FC<{ data: DraftReportData; shadow?: boolean; onPageCount?: (count: number) => void }> = ({
  data,
  shadow = true,
  onPageCount,
}) => {
  const blocks = useMemo(() => buildBlocks(data), [data]);
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<number[][]>([blocks.map((_, i) => i)]);

  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return;
    const next = paginate(Array.from(root.children).map((child) => (child as HTMLElement).offsetHeight));
    setPages((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next));
  }, [blocks]);

  useLayoutEffect(() => {
    onPageCount?.(pages.length);
  }, [pages.length, onPageCount]);

  return (
    <>
      <div
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none invisible fixed -left-[10000px] top-0 font-serif text-[#111]"
        style={{ width: `${210 - PAD_X * 2}mm` }}
      >
        {blocks.map((block) => <div key={block.key}>{block.node}</div>)}
      </div>

      {pages.map((indices, pageIndex) => {
        const last = pageIndex === pages.length - 1;
        return (
          <div
            key={pageIndex}
            className={`worksheet-page relative box-border h-[297mm] w-[210mm] shrink-0 overflow-hidden bg-white font-serif text-[#111] ${
              shadow ? 'shadow-[0_4px_24px_rgba(15,23,42,0.28)]' : ''
            }`}
            style={{ padding: `${PAD_TOP}mm ${PAD_X}mm ${PAD_BOTTOM}mm` }}
          >
            <div className="relative" style={{ height: `${BODY_MM}mm` }}>
              {indices.map((index) => blocks[index] && <div key={blocks[index].key}>{blocks[index].node}</div>)}
              {last ? (
                <div className="absolute inset-x-0 bottom-0 space-y-[5mm]">
                  {data.approved && (
                    <div className="flex justify-end">
                      <div className="-rotate-12 text-right font-[cursive] text-[16pt] leading-tight text-[#1e3a8a]">
                        Approved
                        <div className="text-[11pt]">{paperDate(data.checkedDate)}</div>
                      </div>
                    </div>
                  )}
                  <SignatureRow title="Analysed by" name={data.analysedBy} signature={data.analystSignature} date={data.analysedDate} />
                  <SignatureRow title="Checked by" name={data.checkedBy} signature={data.checkerSignature} date={data.checkedDate} />
                </div>
              ) : (
                <div className="absolute bottom-0 right-0 text-[11pt] font-bold underline">PTO</div>
              )}
            </div>
            <Footer page={pageIndex + 1} total={pages.length} />
          </div>
        );
      })}
    </>
  );
};
