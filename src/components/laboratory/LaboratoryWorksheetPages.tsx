import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { SubSample } from '../../types';
import { MM_PX } from './a4Preview';

/** Everything printed on the Laboratory Worksheet (GCD/GL/01/LWG/FOODS/F11). */
export interface LaboratoryWorksheetData {
  labSampleNo: string;
  analysisStartedOn: string; // YYYY-MM-DD
  subSamples: SubSample[];
  analysisRequired: string;
  testMethods: string;
  results: string;
  analysedBy: string;
  analystSignature?: string | null;
  analysedDate: string;
  checkedBy: string;
  checkerSignature?: string | null;
  checkedDate: string;
  attachments: { id: string; caption: string; image: string }[];
}

const paperDate = (value: string) => {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  return match ? `${match[3]}/${match[2]}/${match[1]}` : value;
};

// Page geometry (mm). The body is what is left between the top margin and the footer box.
const PAD_X = 18;
const PAD_TOP = 14;
const PAD_BOTTOM = 10;
const FOOTER = 30;
const SIGNATURES = 34;
const BODY_MM = 297 - PAD_TOP - PAD_BOTTOM - FOOTER - 4;

const hand = 'font-[cursive] text-[11.5pt] leading-[6.2mm] text-[#1e3a8a]';

/** Long paragraphs are cut at word boundaries so they can flow across pages. */
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

const buildBlocks = (data: LaboratoryWorksheetData): Block[] => {
  const blocks: Block[] = [];
  const heading = (key: string, text: React.ReactNode) =>
    blocks.push({ key, node: <div className="pt-[4mm] text-[11pt] font-bold">{text}</div> });
  const text = (key: string, value: string) =>
    chunks(value || ' ').forEach((part, index) =>
      blocks.push({ key: `${key}-${index}`, node: <div className={`${hand} whitespace-pre-wrap break-words`}>{part || ' '}</div> }),
    );

  blocks.push({
    key: 'head',
    node: (
      <div>
        <h1 className="text-center text-[12.5pt] font-bold tracking-[0.02em]">LABORATORY WORKSHEET</h1>
        <div className="mt-[2mm] flex items-end justify-between gap-[6mm] border-t border-[#222] pt-[1.5mm]">
          <div className="flex min-w-0 items-end gap-[2mm]">
            <span className="shrink-0 text-[10.5pt] font-bold">Lab Sample No.</span>
            <span className={`${hand} truncate`}>{data.labSampleNo}</span>
          </div>
          <div className="flex shrink-0 items-end gap-[2mm]">
            <span className="text-[10.5pt] font-bold">Date Analysis Started:</span>
            <span className={hand}>{paperDate(data.analysisStartedOn)}</span>
          </div>
        </div>
      </div>
    ),
  });
  heading('h-samples', 'Description of Sample(s)');
  const samples = data.subSamples.filter((row) => row.subSampleNo || row.description);
  (samples.length ? samples : [{ subSampleNo: '', description: '' }]).forEach((row, index) =>
    blocks.push({
      key: `sample-${index}`,
      node: <div className={`${hand} break-words`}>{[row.subSampleNo, row.description].filter(Boolean).join(' — ') || ' '}</div>,
    }),
  );
  heading('h-analysis', 'Analysis Required');
  text('analysis', data.analysisRequired);
  heading('h-methods', 'Test Method(s)');
  text('methods', data.testMethods);
  heading(
    'h-results',
    <>Results <span className="font-bold italic">(incorporate findings, computations and attach signed charts where applicable)</span></>,
  );
  text('results', data.results);
  return blocks;
};

/** Greedy page packing from measured block heights; the last text page keeps room for the signatures. */
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
  <div className="absolute inset-x-[18mm] bottom-[10mm]">
    <div className="grid grid-cols-[1fr_auto] border border-[#222] text-[9.5pt]">
      <div className="flex items-center justify-center border-r border-[#222] px-[2mm] font-bold">LABORATORY WORKSHEET</div>
      <div className="min-w-[62mm]">
        <div className="border-b border-[#222] px-[2mm] py-[0.6mm] font-bold">GCD/GL/01/LWG/FOODS/F11</div>
        <div className="border-b border-[#222] px-[2mm] py-[0.6mm]">VERSION: 1</div>
        <div className="px-[2mm] py-[0.6mm]">PAGES: Page {page} of {total}</div>
      </div>
      <div className="col-span-2 border-t border-[#222] px-[2mm] py-[1mm] text-[10pt] font-bold italic">
        Foods, Drugs &amp; Chemical Substances Section
      </div>
    </div>
    <div className="absolute -top-[5mm] right-0 text-[10pt] font-bold italic">Page {page} of {total}</div>
  </div>
);

const SignatureRow: React.FC<{ label: string; name: string; signature?: string | null; date: string }> = ({ label, name, signature, date }) => (
  <div className="flex items-end gap-[3mm]">
    <span className="w-[24mm] shrink-0 text-[10.5pt] font-bold">{label}</span>
    <span className={`min-w-0 flex-[3] truncate border-b border-dotted border-[#222] ${hand}`}>{name || ' '}</span>
    <span className="shrink-0 text-[10.5pt] font-bold">Signature:</span>
    <span className="relative h-[10mm] flex-[2] border-b border-dotted border-[#222]">
      {signature && <img src={signature} alt="" className="absolute bottom-[0.5mm] left-[1mm] h-full max-w-full object-contain" />}
    </span>
    <span className="shrink-0 text-[10.5pt] font-bold">Date:</span>
    <span className={`w-[26mm] shrink-0 border-b border-dotted border-[#222] ${hand}`}>{date ? paperDate(date) : ' '}</span>
  </div>
);

const Page: React.FC<{ page: number; total: number; shadow: boolean; children: React.ReactNode }> = ({ page, total, shadow, children }) => (
  <div
    className={`worksheet-page relative box-border h-[297mm] w-[210mm] shrink-0 overflow-hidden bg-white font-serif text-[#111] ${
      shadow ? 'shadow-[0_4px_24px_rgba(15,23,42,0.28)]' : ''
    }`}
    style={{ padding: `${PAD_TOP}mm ${PAD_X}mm ${PAD_BOTTOM}mm` }}
  >
    <div
      aria-hidden="true"
      className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 -rotate-[55deg] select-none whitespace-nowrap text-[54pt] font-bold tracking-[0.15em] text-slate-400/20"
    >
      LABORATORY COPY
    </div>
    {children}
    <Footer page={page} total={total} />
  </div>
);

/**
 * The Laboratory Worksheet as one or more A4 pages laid out like the paper form.
 * Text flows onto extra pages ("PTO") with the footer box repeated and numbered;
 * the Analysed by / Checked by block sits on the last text page; attached charts
 * follow on their own pages. Used for the preview, printing and the PDF.
 */
export const LaboratoryWorksheetPages: React.FC<{ data: LaboratoryWorksheetData; shadow?: boolean; onPageCount?: (count: number) => void }> = ({
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
    const heights = Array.from(root.children).map((child) => (child as HTMLElement).offsetHeight);
    const next = paginate(heights);
    setPages((previous) => (JSON.stringify(previous) === JSON.stringify(next) ? previous : next));
  }, [blocks]);

  const total = pages.length + data.attachments.length;
  useLayoutEffect(() => {
    onPageCount?.(total);
  }, [total, onPageCount]);

  return (
    <>
      {/* Hidden copy at the body width, measured to decide the page breaks. */}
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
          <Page key={`p-${pageIndex}`} page={pageIndex + 1} total={total} shadow={shadow}>
            <div className="relative" style={{ height: `${BODY_MM}mm` }}>
              {indices.map((index) => blocks[index] && <div key={blocks[index].key}>{blocks[index].node}</div>)}
              {last ? (
                <div className="absolute inset-x-0 bottom-0 space-y-[5mm]">
                  <SignatureRow label="Analysed by" name={data.analysedBy} signature={data.analystSignature} date={data.analysedDate} />
                  <SignatureRow label="Checked by" name={data.checkedBy} signature={data.checkerSignature} date={data.checkedDate} />
                </div>
              ) : (
                <div className="absolute bottom-0 right-0 text-[11pt] font-bold underline">PTO</div>
              )}
            </div>
          </Page>
        );
      })}

      {data.attachments.map((attachment, index) => (
        <Page key={attachment.id} page={pages.length + index + 1} total={total} shadow={shadow}>
          <div className="flex flex-col" style={{ height: `${BODY_MM}mm` }}>
            <div className="text-[11pt] font-bold">
              Attachment {index + 1} — {data.labSampleNo}
              {attachment.caption && <span className="font-normal"> · {attachment.caption}</span>}
            </div>
            <div className="mt-[4mm] flex min-h-0 flex-1 items-center justify-center border border-[#ccc]">
              <img src={attachment.image} alt={attachment.caption || `Attachment ${index + 1}`} className="max-h-full max-w-full object-contain" />
            </div>
          </div>
        </Page>
      ))}
    </>
  );
};
