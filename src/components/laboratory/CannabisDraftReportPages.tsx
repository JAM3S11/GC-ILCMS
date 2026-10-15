import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { MM_PX } from './a4Preview';
import {
  CHEMICAL_TESTS,
  CannabisDraftReportFields,
  PHYSICAL_ROWS,
  ROMAN,
} from '../../narcoticsDraftReport';

/** Everything printed on the Draft Report of Analysis (Cannabis). */
export interface CannabisDraftReportData extends CannabisDraftReportFields {
  analysedBy: string;
  analystSignature?: string | null;
  checkedBy: string;
  checkerSignature?: string | null;
  checkedDate: string;
  approved: boolean;
}

/** 2026-05-16 -> 16/05/2026, as written on the paper form. */
const paperDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
};

// Page geometry (mm).
const PAD_X = 18;
const PAD_TOP = 14;
const PAD_BOTTOM = 10;
const FOOTER = 6;
const BODY_MM = 297 - PAD_TOP - PAD_BOTTOM - FOOTER;
const LINE_MM = 6.5;
const SERIF = "'Times New Roman', Times, serif";

// Same handwriting style as the Certificate of Analysis draft report.
const hand = 'font-[cursive] text-[11pt] text-[#1e3a8a]';
const label = 'shrink-0 text-[10.5pt] font-bold';
const dotted = 'border-b border-dotted border-[#222]';
const cell = 'border border-[#222] px-[1.5mm] py-[0.5mm] align-top';
// The printed "RESULTS" column headings sit in the handwritten column, so they reset to print type.
const printedHeader = 'text-[9.5pt] font-bold not-italic text-[#111] [font-family:"Times_New_Roman",Times,serif]';

/** A bold label with its value written on a dotted line that fills the rest of the row. */
const Line: React.FC<{ title: string; value?: string; className?: string; mono?: boolean }> = ({ title, value, className = '', mono }) => (
  <div className={`flex items-end gap-[1.5mm] ${className}`} style={{ minHeight: `${LINE_MM}mm` }}>
    <span className={label}>{title}</span>
    <span className={`${dotted} ${hand} min-w-0 flex-1 break-words leading-[6mm] ${mono ? 'tracking-wide' : ''}`}>{value || ' '}</span>
  </div>
);

/**
 * Free text written over ruled dotted lines, as on the paper form: the label sits
 * on the first line, the text wraps onto further lines, and at least `minLines`
 * lines are drawn even when it is blank.
 */
const Ruled: React.FC<{ title: string; text: string; minLines: number }> = ({ title, text, minLines }) => {
  const textRef = useRef<HTMLDivElement>(null);
  const labelRef = useRef<HTMLSpanElement>(null);
  const [lines, setLines] = useState(minLines);
  const [indentMm, setIndentMm] = useState(20);
  useLayoutEffect(() => {
    const labelWidth = labelRef.current?.offsetWidth;
    if (labelWidth) {
      const nextIndent = Math.round((labelWidth / MM_PX + 1.5) * 10) / 10;
      setIndentMm((previous) => (previous === nextIndent ? previous : nextIndent));
    }
    const element = textRef.current;
    if (!element) return;
    const next = Math.max(minLines, Math.round(element.offsetHeight / (LINE_MM * MM_PX)));
    setLines((previous) => (previous === next ? previous : next));
  }, [text, minLines, indentMm]);
  return (
    <div className="relative" style={{ height: `${lines * LINE_MM}mm` }}>
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className={`absolute right-0 ${dotted}`}
          style={{ top: `${index * LINE_MM}mm`, height: `${LINE_MM}mm`, left: index === 0 ? `${indentMm}mm` : 0 }}
        />
      ))}
      <span ref={labelRef} className={`${label} absolute left-0 top-0`} style={{ lineHeight: `${LINE_MM}mm` }}>{title}</span>
      <div
        ref={textRef}
        className={`${hand} relative whitespace-pre-wrap break-words`}
        style={{ lineHeight: `${LINE_MM}mm`, textIndent: `${indentMm}mm` }}
      >
        {text || ' '}
      </div>
    </div>
  );
};

/** Column widths of the results table; the two narrow columns on the right stay empty, as on the paper. */
const Columns = () => (
  <colgroup>
    <col style={{ width: '62%' }} />
    <col style={{ width: '26%' }} />
    <col style={{ width: '6%' }} />
    <col style={{ width: '6%' }} />
  </colgroup>
);

/** A results-table row: template text on the left, the officer's result, then the two empty columns. */
const Row: React.FC<{ left: React.ReactNode; result?: React.ReactNode; top: boolean; italic?: boolean }> = ({ left, result, top, italic }) => (
  <tr>
    <td className={`${cell} ${top ? '' : 'border-t-0'}`}>{left}</td>
    <td className={`${cell} ${top ? '' : 'border-t-0'} ${hand} text-[10.5pt] leading-[5mm] ${italic ? 'italic' : ''}`}>{result || ' '}</td>
    <td className={`${cell} ${top ? '' : 'border-t-0'}`} />
    <td className={`${cell} ${top ? '' : 'border-t-0'}`} />
  </tr>
);

/** A page-packable piece of the report; table pieces draw their top border only at the top of a page. */
type Block = { key: string; render: (firstOnPage: boolean) => React.ReactNode };

const buildBlocks = (data: CannabisDraftReportData): Block[] => {
  const result = (key: keyof CannabisDraftReportData['results']) => data.results[key];
  const blocks: Block[] = [
    {
      key: 'head',
      render: () => (
        <div className="space-y-[2mm]">
          <h1 className="pb-[3mm] text-center text-[12pt] font-bold tracking-[0.02em]">DRAFT REPORT OF ANALYSIS (CANNABIS)</h1>
          <div className="grid grid-cols-[1fr_1fr] gap-[10mm]">
            <Line title="Sample  K:" value={data.sampleKNo} mono />
            <Line title="Date Received:" value={paperDate(data.dateReceived)} />
          </div>
          <Line title="Submitted by:" value={data.submittedBy} />
          <Line title="Date analysed" value={paperDate(data.dateAnalysed)} className="w-[60%]" />
        </div>
      ),
    },
    { key: 'description', render: () => <div className={`${label} pb-[2mm] pt-[4mm]`}>DESCRIPTION</div> },
    {
      key: 'envelope',
      render: () => (
        <div className="flex items-end gap-[1.5mm] pb-[2mm]" style={{ minHeight: `${LINE_MM}mm` }}>
          <span className={label}>A khaki envelope marked</span>
          {/* As on the paper: the marking and the station name share one dotted gap before "police station". */}
          <span className={`${dotted} ${hand} min-w-0 flex-[5] break-words leading-[6mm]`}>
            {[data.envelopeMarked, data.policeStation].filter((part) => part.trim()).join(' ') || ' '}
          </span>
          <span className={label}>police station, CR</span>
          <span className={`${dotted} ${hand} min-w-[38mm] flex-[3] break-words leading-[6mm]`}>{data.crNumber || ' '}</span>
        </div>
      ),
    },
    { key: 'accused', render: () => <div className="pb-[2mm]"><Ruled title="Accused;" text={data.accused} minLines={2} /></div> },
    { key: 'containing', render: () => <div><Ruled title="Containing" text={data.containing} minLines={2} /></div> },
    { key: 'plant', render: () => <div className={`${label} pb-[3mm] pt-[2mm]`}>of plant material.</div> },
    { key: 'results', render: () => <div className={`${label} pb-[1.5mm]`}>RESULTS</div> },
    {
      key: 'physical',
      render: () => (
        <table className="w-full table-fixed border-collapse text-[9.5pt] leading-[4mm]">
          <Columns />
          <tbody>
            <Row top left={<span className="font-bold">1.PHYSICAL TESTS</span>} result={<span className={printedHeader}>RESULTS</span>} />
            {PHYSICAL_ROWS.map((row) => (
              <Row
                key={row.label}
                top={false}
                left={
                  row.marker ? (
                    <span className="flex gap-[6mm] pl-[4mm]"><span className="w-[6mm]">{row.marker}</span><span>{row.label}</span></span>
                  ) : row.label
                }
                result={row.key ? result(row.key) : ''}
              />
            ))}
          </tbody>
        </table>
      ),
    },
    ...CHEMICAL_TESTS.map((test, index): Block => ({
      key: test.key,
      render: (firstOnPage) => (
        <table className="w-full table-fixed border-collapse text-[9.5pt] leading-[4mm]">
          <Columns />
          <tbody>
            {index === 0 && (
              <Row top={firstOnPage} left={<span className="font-bold">2. CHEMICAL TESTS</span>} result={<span className={printedHeader}>RESULTS</span>} />
            )}
            <Row
              top={index !== 0 && firstOnPage}
              italic
              left={
                <div className="pl-[3mm]">
                  <div className="flex gap-[3mm]">
                    <span className="w-[5mm] font-bold">{test.letter}</span>
                    <span className="font-bold underline">{test.title}</span>
                  </div>
                  <ol className="pl-[8mm]">
                    {test.steps.map((step, stepIndex) => (
                      <li key={stepIndex} className="flex gap-[2mm]">
                        <span className="w-[6mm] shrink-0">{ROMAN[stepIndex]}</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>
              }
              result={result(test.key)}
            />
          </tbody>
        </table>
      ),
    })),
    {
      key: 'signatures',
      render: () => (
        <div className="relative space-y-[1mm] pt-[3mm]">
          <Line title="QUANTITY:" value={data.quantity} />
          <Line title="G.C.K." value={data.gckNo} className="w-[70%]" />
          <div className="grid grid-cols-2 gap-[6mm]">
            <SignedLine title="Analysing officer:" name={data.analysedBy} signature={data.analystSignature} />
            <SignedLine title="Checked By:" name={data.checkedBy} signature={data.checkerSignature} />
          </div>
          {/* Beside the shorter G.C.K. line, like a stamp, so it never adds height. */}
          {data.approved && (
            <div className="absolute right-[3mm] top-[7mm] -rotate-12 text-right font-[cursive] text-[15pt] leading-tight text-[#1e3a8a]">
              Approved
              <div className="text-[10.5pt]">{paperDate(data.checkedDate)}</div>
            </div>
          )}
        </div>
      ),
    },
  ];
  return blocks;
};

/** A signing line: the name on the dotted line, with the signature image sitting on it. */
const SignedLine: React.FC<{ title: string; name: string; signature?: string | null }> = ({ title, name, signature }) => (
  <div className="flex items-end gap-[1.5mm]">
    <span className={label}>{title}</span>
    <span className={`relative h-[9mm] min-w-0 flex-1 ${dotted}`}>
      {signature && <img src={signature} alt="" className="absolute bottom-[0.5mm] right-[1mm] h-[8.5mm] max-w-[60%] object-contain" />}
      <span className={`${hand} absolute bottom-0 left-[1mm] max-w-full truncate leading-[6mm]`}>{name || ' '}</span>
    </span>
  </div>
);

/** Greedy page packing from measured heights. */
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
  return pages;
};

/**
 * The Draft Report of Analysis (Cannabis) as one or more A4 pages, laid out like
 * the paper form (docs/cannabis-draft-report.jpeg). Content that runs over flows
 * onto the next page. Used for the live preview, printing and the PDF.
 */
export const CannabisDraftReportPages: React.FC<{
  data: CannabisDraftReportData;
  shadow?: boolean;
  onPageCount?: (count: number) => void;
}> = ({ data, shadow = true, onPageCount }) => {
  const blocks = useMemo(() => buildBlocks(data), [data]);
  const measureRef = useRef<HTMLDivElement>(null);
  const [pages, setPages] = useState<number[][]>([blocks.map((_, i) => i)]);

  // Re-pack whenever any block changes height (ruled text grows its own lines after layout).
  useLayoutEffect(() => {
    const root = measureRef.current;
    if (!root) return undefined;
    const repack = () => {
      const next = paginate(Array.from(root.children).map((child) => (child as HTMLElement).offsetHeight));
      setPages((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next));
    };
    repack();
    const observer = new ResizeObserver(repack);
    Array.from(root.children).forEach((child) => observer.observe(child));
    return () => observer.disconnect();
  }, [blocks]);

  useLayoutEffect(() => {
    onPageCount?.(pages.length);
  }, [pages.length, onPageCount]);

  return (
    <>
      <div
        ref={measureRef}
        aria-hidden="true"
        className="pointer-events-none invisible fixed -left-[10000px] top-0 text-[#111]"
        style={{ width: `${210 - PAD_X * 2}mm`, fontFamily: SERIF }}
      >
        {blocks.map((block, index) => <div key={block.key}>{block.render(index === 0)}</div>)}
      </div>

      {pages.map((indices, pageIndex) => {
        const last = pageIndex === pages.length - 1;
        return (
          <div
            key={pageIndex}
            className={`worksheet-page relative box-border h-[297mm] w-[210mm] shrink-0 overflow-hidden bg-white text-[#111] ${
              shadow ? 'shadow-[0_4px_24px_rgba(15,23,42,0.28)]' : ''
            }`}
            style={{ padding: `${PAD_TOP}mm ${PAD_X}mm ${PAD_BOTTOM}mm`, fontFamily: SERIF }}
          >
            <div className="relative" style={{ height: `${BODY_MM}mm` }}>
              {indices.map((index, position) => blocks[index] && <div key={blocks[index].key}>{blocks[index].render(position === 0)}</div>)}
              {!last && <div className="absolute bottom-0 right-0 text-[11pt] font-bold underline">PTO</div>}
            </div>
            {pages.length > 1 && (
              <div className="absolute inset-x-[18mm] bottom-[8mm] text-center text-[9pt]">Page {pageIndex + 1} of {pages.length}</div>
            )}
          </div>
        );
      })}
    </>
  );
};
